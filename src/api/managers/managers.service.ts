import { LoginResDto } from '@/api/auth/dto/login.res.dto';
import { CreateManagerReqDto } from '@/api/managers/dto/create-manager.req.dto';
import { ManagerResDto } from '@/api/managers/dto/manager.res.dto';
import { PageManagerReqDto } from '@/api/managers/dto/page-manager.req.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { areas, managers, RoleEnum } from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, count, desc, eq, ilike, sql } from 'drizzle-orm';

@Injectable()
export class ManagersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getInfo(managerId: number) {
    const manager = await this.db.query.managers.findFirst({
      where: eq(managers.id, managerId),
      with: {
        area: true,
      },
    });

    if (!manager) {
      throw new ValidationException(ErrorCode.M001);
    }

    return plainToInstance(ManagerResDto, manager);
  }

  async create(dto: CreateManagerReqDto) {
    const [manager] = await this.db
      .insert(managers)
      .values({
        ...dto,
        role: RoleEnum.MANAGEMENT,
      })
      .returning();
    return plainToInstance(LoginResDto, manager);
  }

  async getPageManagers(
    reqDto: PageManagerReqDto,
  ): Promise<OffsetPaginatedDto<ManagerResDto>> {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.managers> = {
      where: and(
        eq(managers.role, RoleEnum.MANAGEMENT),
        ilike(managers.phone, `%${reqDto.q ?? ''}%`),
      ),
      with: {
        area: true,
      },
    };

    const qCount = this.db.query.managers.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.managers.findMany({
        ...baseConfig,
        orderBy: desc(managers.createdAt),
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(
      entities.map((e) => plainToInstance(ManagerResDto, e)),
      meta,
    );
  }

  async existById(managerId: number) {
    return this.db
      .select({
        id: managers.id,
        point: areas.point,
        areaId: managers.areaId,
      })
      .from(managers)
      .leftJoin(areas, eq(managers.areaId, areas.id))
      .where(eq(managers.id, managerId))
      .then((res) => res[0]);
  }
}
