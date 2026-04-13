import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { OrdersService } from '@/api/orders/orders.service';
import { CreateRatingReqDto } from '@/api/ratings/dto/create-rating.req.dto';
import { StoresService } from '@/api/stores/stores.service';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, increment } from '@/database/global';
import { orders, users } from '@/database/schemas';
import { commentsToRatings } from '@/database/schemas/comments-to-ratings.schema';
import { ratings } from '@/database/schemas/rating.schema';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { isArray } from 'class-validator';
import { eq } from 'drizzle-orm';

@Injectable()
export class RatingsService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly storesService: StoresService,
    @Inject(DRIZZLE) private readonly drizzle: DrizzleDB,
  ) {}

  async create(reqDto: CreateRatingReqDto, payload: JwtPayloadType) {
    if (!(await this.ordersService.existById(reqDto.orderId))) {
      throw new ValidationException(ErrorCode.CM003, HttpStatus.BAD_REQUEST);
    }

    // nếu đơn hàng đã được đánh giá rồi thì không được đánh giá nữa
    if (await this.ordersService.isRated(reqDto.orderId)) {
      throw new ValidationException(ErrorCode.CM002, HttpStatus.BAD_REQUEST);
    }

    if (reqDto.storeId && !(await this.storesService.existById(reqDto.storeId))) {
      throw new ValidationException(ErrorCode.CM003, HttpStatus.BAD_REQUEST);
    }

    return await this.drizzle.transaction(async (tx) => {
      const result = await tx
        .insert(ratings)
        .values({
          ...reqDto,
          storeRate: reqDto?.ratingStore,
          deliverRate: reqDto?.ratingDeliver,
          userId: payload.id,
        })
        .returning();

      // check if storeComment is an array
      if (isArray(reqDto.storeComment) && reqDto.storeComment.length > 0) {
        const comments = reqDto.storeComment.map((comment) => ({
          commentId: comment.id,
          ratingId: result[0].id,
        }));
        await tx.insert(commentsToRatings).values(comments);
      }

      if (isArray(reqDto.deliverComment) && reqDto.deliverComment.length > 0) {
        const comments = reqDto.deliverComment.map((comment) => ({
          commentId: comment.id,
          ratingId: result[0].id,
        }));
        await tx.insert(commentsToRatings).values(comments);
      }

      // đánh giá sẽ + 500 xu
      await tx
        .update(users)
        .set({
          coin: increment(users.coin, 500),
        })
        .where(eq(users.id, payload.id));

      // cập nhật lại trạng thái  đánh giá của đơn hàng
      await tx
        .update(orders)
        .set({
          isRated: true,
        })
        .where(eq(orders.id, reqDto.orderId));

      return result[0];
    });
  }

  async getRatingsByStoreId(storeId: number) {
    return this.drizzle.query.ratings.findMany({
      where: eq(ratings.storeId, storeId),
      with: {
        commentUsed: {
          with: {
            comment: true,
          },
        },
        userComment: true,
      },
    });
  }
}
