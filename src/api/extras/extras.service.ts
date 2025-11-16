import { CreateExtraReqDto } from '@/api/extras/dto/create-extra.req.dto';
import { UpdateExtraReqDto } from '@/api/extras/dto/update-extra.req.dto';
import {
  ExistingExtra,
  ExtraInsertPayload,
  ExtraUpdatePayload,
} from '@/api/extras/types/extras.types';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, Transaction } from '@/database/global';
import { extras } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

@Injectable()
export class ExtrasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async createForProduct(
    productId: number,
    items: CreateExtraReqDto[],
    tx: Transaction,
  ): Promise<void> {
    await tx.insert(extras).values(
      items.map((item) => ({
        name: item.name,
        price: item.price,
        productId,
      })),
    );
  }

  async updateForProduct(
    productId: number,
    items: CreateExtraReqDto[],
    tx: Transaction,
  ): Promise<void> {
    // Lấy toàn bộ extras đang gắn với sản phẩm để so sánh với payload mới
    const existingExtras = await tx.query.extras.findMany({
      where: eq(extras.productId, productId),
    });

    // Dùng Map<id, extra> để tra cứu nhanh các extra hiện có
    const existingMap = new Map<number, ExistingExtra>();
    for (const extra of existingExtras) {
      if (extra.id != null) {
        existingMap.set(extra.id, extra);
      }
    }

    // Gom tạm các extra cần thêm mới hoặc cập nhật
    const extrasToInsert: ExtraInsertPayload[] = [];
    const extrasToUpdate: ExtraUpdatePayload[] = [];

    for (const item of items) {
      // Trường hợp FE gửi kèm id của extra đã tồn tại
      if (item.id != null && existingMap.has(item.id)) {
        const current = existingMap.get(item.id)!;
        const requiresUpdate =
          current.name !== item.name || Number(current.price) !== Number(item.price);

        // Nếu tên/giá thay đổi thì đưa vào danh sách cập nhật
        if (requiresUpdate) {
          extrasToUpdate.push({
            id: item.id,
            name: item.name,
            price: item.price,
          });
        }

        // Xóa khỏi map để đánh dấu đã xử lý, tránh bị detach ở cuối hàm
        existingMap.delete(item.id);
      } else {
        // Không có id hoặc id không tồn tại => xem là extra mới cần chèn
        extrasToInsert.push({
          name: item.name,
          price: item.price,
          productId,
        });
      }
    }

    // Thêm mới các extra chưa có trong DB
    if (extrasToInsert.length > 0) {
      await tx.insert(extras).values(extrasToInsert);
    }

    // Cập nhật những extra chỉ thay đổi tên hoặc giá
    for (const extra of extrasToUpdate) {
      await tx
        .update(extras)
        .set({
          name: extra.name,
          price: extra.price,
        })
        .where(eq(extras.id, extra.id));
    }

    // Những extra còn lại trong map là không xuất hiện trong payload => gỡ khỏi sản phẩm
    const extrasToDetach = Array.from(existingMap.keys());
    if (extrasToDetach.length > 0) {
      await tx.update(extras).set({ productId: null }).where(inArray(extras.id, extrasToDetach));
    }
  }

  async updateById(extraId: number, reqDto: UpdateExtraReqDto) {
    if (!(await this.existsById(extraId))) {
      throw new ValidationException(ErrorCode.E001);
    }

    return this.db
      .update(extras)
      .set({
        ...reqDto,
      })
      .where(eq(extras.id, extraId))
      .returning();
  }

  async existsById(extraId: number) {
    return this.db.query.extras.findFirst({
      where: eq(extras.id, extraId),
      columns: { id: true },
    });
  }
}
