import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateDeliveryRegionsReqDto } from '@/api/delivery-regions/dto/create-delivery-regions.req.dto';
import { PageDeliveryRegionReqDto } from '@/api/delivery-regions/dto/page-delivery-region.req.dto';
import { UpdateDeliveryRegionsReqDto } from '@/api/delivery-regions/dto/update-delivery-regions.req.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Order } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { deliveryRegions, RoleEnum } from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, isNull, sql } from 'drizzle-orm';

@Injectable()
export class DeliveryRegionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async existByName(name: string) {
    return this.db
      .select()
      .from(deliveryRegions)
      .where(
        and(eq(deliveryRegions.name, name), isNull(deliveryRegions.deletedAt)),
      )
      .then((res) => res[0]);
  }

  async create(reqDto: CreateDeliveryRegionsReqDto, payload: JwtPayloadType) {
    const existRegion = await this.existByName(reqDto.name);
    if (existRegion) {
      throw new ValidationException(ErrorCode.AR001);
    }

    const [newRegion] = await this.db
      .insert(deliveryRegions)
      .values({
        ...reqDto,
        areaId: payload.areaId,
      })
      .returning();

    return newRegion;
  }

  async existsById(deliveryRegionId: number) {
    return this.db
      .select()
      .from(deliveryRegions)
      .where(
        and(
          eq(deliveryRegions.id, deliveryRegionId),
          isNull(deliveryRegions.deletedAt),
        ),
      )
      .then((res) => res[0]);
  }

  async updateById(
    deliveryRegionId: number,
    reqDto: UpdateDeliveryRegionsReqDto,
  ) {
    if (!(await this.existsById(deliveryRegionId))) {
      throw new ValidationException(ErrorCode.AR001);
    }
    const [updatedRegion] = await this.db
      .update(deliveryRegions)
      .set(reqDto)
      .where(eq(deliveryRegions.id, deliveryRegionId))
      .returning();
    return updatedRegion;
  }

  async getPageDeliveryRegions(
    reqDto: PageDeliveryRegionReqDto,
    payload: JwtPayloadType,
  ) {
    const baseConfig: FindManyQueryConfig<
      typeof this.db.query.deliveryRegions
    > = {
      where: and(
        eq(deliveryRegions.areaId, reqDto.areaId),
        isNull(deliveryRegions.deletedAt),
        ...(reqDto.q ? [ilike(deliveryRegions.name, `%${reqDto.q}%`)] : []),
        ...(payload.role === RoleEnum.MANAGEMENT
          ? [eq(deliveryRegions.areaId, payload.areaId)]
          : []),
      ),

      limit: reqDto.limit,
      offset: reqDto.offset,
    };

    const qCount = this.db.query.deliveryRegions.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.deliveryRegions.findMany({
        ...baseConfig,
        orderBy: [
          ...(reqDto.order === Order.DESC
            ? [desc(deliveryRegions.createdAt)]
            : [desc(deliveryRegions.createdAt)]),
        ],
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entities, meta);
  }

  async getById(deliveryRegionId: number) {
    const [region] = await this.db
      .select()
      .from(deliveryRegions)
      .where(
        and(
          eq(deliveryRegions.id, deliveryRegionId),
          isNull(deliveryRegions.deletedAt),
        ),
      )
      .execute();

    if (!region) {
      throw new ValidationException(ErrorCode.AR001);
    }

    return region;
  }

  async softDelete(deliveryRegionId: number) {
    const [region] = await this.db
      .update(deliveryRegions)
      .set({ deletedAt: new Date() })
      .where(eq(deliveryRegions.id, deliveryRegionId))
      .returning();

    if (!region) {
      throw new ValidationException(ErrorCode.AR001);
    }

    return region;
  }
}
