import { BannerResDto } from '@/api/banners/dto/banner.res.dto';
import { CreateBannerReqDto } from '@/api/banners/dto/create-banner.req.dto';
import { PageBannerReqDto } from '@/api/banners/dto/page-banner-req.dto';
import { UploadBannerReqDto } from '@/api/banners/dto/upload-banner.req.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Order } from '@/constants/app.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { banners, RoleEnum } from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { deleteIfExists, normalizeImagePath } from '@/utils/util';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';

@Injectable()
export class BannersService implements OnModuleInit {
  private basePath = `uploads/banners/`;

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  onModuleInit() {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
      console.log(`Đã tạo thư mục upload: ${this.basePath}`);
    }
  }

  async getPageBanners(reqDto: PageBannerReqDto, payload: JwtPayloadType) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.banners> = {
      where: and(
        ...(payload.role === RoleEnum.MANAGEMENT
          ? [eq(banners.areaId, payload.areaId)]
          : []),
        ...(reqDto.type ? [eq(banners.type, reqDto.type)] : []),
        ...(reqDto.areaId ? [eq(banners.areaId, reqDto.areaId)] : []),
        // ilike(banners.title, `%${reqDto.q ?? ''}%`),
      ),
      with: {
        area: true, // Assuming you want to include area details
      },
    };

    const qCount = this.db.query.banners.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.banners.findMany({
        ...baseConfig,
        orderBy: [
          reqDto.order === Order.DESC
            ? desc(banners.createdAt)
            : asc(banners.createdAt),
        ],
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(
      entities.map((e) => plainToInstance(BannerResDto, e)),
      meta,
    );
  }

  private async buildFileName(prefix: string): Promise<string> {
    const uniqueId = uuidv4();
    return `${prefix}_${uniqueId}.jpeg`;
  }

  async create(reqDto: CreateBannerReqDto, image: Express.Multer.File) {
    const fileName = await this.buildFileName('banner');
    const fullImagePath = join(this.basePath, fileName);

    await sharp(image.buffer)
      .rotate()
      .jpeg({ quality: 80 })
      .toFile(fullImagePath); // Use fullImagePath
    const normalizedPath = normalizeImagePath(fullImagePath);

    const banner = await this.db
      .insert(banners)
      .values({
        ...reqDto,
        image: normalizedPath,
      })
      .returning();

    return plainToInstance(BannerResDto, banner[0]);
  }

  async existById(bannerId: number) {
    return await this.db
      .select({
        bannerId: banners.id,
        image: banners.image,
      })
      .from(banners)
      .where(eq(banners.id, bannerId))
      .then((result) => result[0]);
  }

  async remove(bannerId: number) {
    const banner = await this.existById(bannerId);
    if (!banner) {
      throw new ValidationException(ErrorCode.B001);
    }
    //------------------------------------------------------------
    //- Xoá ảnh cũ nếu có
    //-----------------------------------------------------------
    if (banner.image) {
      deleteIfExists(banner.image, this.basePath);
    }
    await this.db.delete(banners).where(eq(banners.id, bannerId));
  }

  async update(
    bannerId: number,
    reqDto: UploadBannerReqDto,
    image?: Express.Multer.File,
  ) {
    const banner = await this.existById(bannerId);
    if (!banner) {
      throw new ValidationException(ErrorCode.B001);
    }
    let normalizedPath = banner.image; // Keep old image if new one isn't provided
    if (image?.buffer) {
      const fileName = await this.buildFileName('banner');
      const fullImagePath = join(this.basePath, fileName);
      await sharp(image.buffer)
        .rotate()
        .jpeg({ quality: 80 })
        .toFile(fullImagePath);
      normalizedPath = normalizeImagePath(fullImagePath);
    }

    //------------------------------------------------------------
    //- Xoá ảnh cũ nếu có
    //-----------------------------------------------------------
    if (banner.image && banner.image !== normalizedPath) {
      deleteIfExists(banner.image, this.basePath);
    }

    const updatedBanner = await this.db
      .update(banners)
      .set({
        ...reqDto,
        image: normalizedPath,
      })
      .where(eq(banners.id, bannerId))
      .returning();

    return plainToInstance(BannerResDto, updatedBanner[0]);
  }

  async getBannerById(bannerId: number) {
    const banner = await this.db
      .select()
      .from(banners)
      .where(eq(banners.id, bannerId))
      .then((result) => result[0]);
    if (!banner) {
      throw new ValidationException(ErrorCode.B001);
    }
    return plainToInstance(BannerResDto, banner);
  }

  async getBannersWithTypeAreaId(areaId: number, type: string) {
    const bannersList = await this.db
      .select()
      .from(banners)
      .where(
        and(
          ...(areaId ? [eq(banners.areaId, areaId)] : []),
          ...(type ? [eq(banners.type, type)] : []),
        ),
      )
      .then((result) => result);
    return bannersList.map((banner) => plainToInstance(BannerResDto, banner));
  }
}
