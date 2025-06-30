import { AreasService } from '@/api/areas/areas.service';
import { LoginResDto } from '@/api/auth/dto/login.res.dto';
import { CreateManagerReqDto } from '@/api/managers/dto/create-manager.req.dto';
import { ManagerResDto } from '@/api/managers/dto/manager.res.dto';
import { PageManagerReqDto } from '@/api/managers/dto/page-manager.req.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import {
  areas,
  distances,
  managers,
  OrderTypeEnum,
  RoleEnum,
  serviceFees,
  settings,
} from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { generateCodeFromName } from '@/utils/util';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';

@Injectable()
export class ManagersService {
  constructor(
    private readonly areaService: AreasService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

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

  async existByUsername(username: string) {
    return this.db
      .select({
        id: managers.id,
        areaId: managers.areaId,
      })
      .from(managers)
      .where(eq(managers.username, username))
      .then((res) => res[0]);
  }

  async create(reqDto: CreateManagerReqDto) {
    console.log('Create manager with reqDto:', reqDto);
    const existManager = await this.existByUsername(reqDto.username);
    if (existManager) {
      throw new ValidationException(ErrorCode.M002);
    }

    if (await this.areaService.existByNameAndParent(reqDto.name, reqDto.parent)) {
      throw new ValidationException(ErrorCode.AR002);
    }

    return this.db.transaction(async (tx) => {
      const [createArea] = await tx
        .insert(areas)
        .values({
          name: reqDto.name,
          parent: reqDto.parent,
          code: generateCodeFromName(reqDto.name),
        })
        .returning({
          id: areas.id,
        });

      const [createdManager] = await tx
        .insert(managers)
        .values({
          ...reqDto,
          areaId: createArea.id,
          role: RoleEnum.MANAGEMENT,
        })
        .returning();

      // Tạo setting cho khu vực đó
      const [createdSetting] = await tx
        .insert(settings)
        .values({
          areaId: createArea.id,
        })
        .returning({
          id: settings.id,
        });
      const orderType = Object.values(OrderTypeEnum);
      for (const type of orderType) {
        const [createdServiceFee] = await tx
          .insert(serviceFees)
          .values({
            settingId: createdSetting.id,
            type,
          })
          .returning({
            id: serviceFees.id,
          });

        const DEFAULT_DISTANCE = [
          { minDistance: 0, maxDistance: 1, rate: 8000 },
          { minDistance: 1, maxDistance: 2, rate: 0 },
          { minDistance: 2, maxDistance: 3, rate: 3000 },
          { minDistance: 3, maxDistance: 4, rate: 3000 },
          { minDistance: 4, maxDistance: 5, rate: 3000 },
          { minDistance: 5, maxDistance: 6, rate: 5000 },
          { minDistance: 6, maxDistance: 7, rate: 5000 },
          { minDistance: 7, maxDistance: 8, rate: 5000 },
          { minDistance: 8, maxDistance: 9, rate: 5000 },
          { minDistance: 9, maxDistance: 10, rate: 5000 },
        ];
        await tx.insert(distances).values(
          DEFAULT_DISTANCE.map((d) => ({
            serviceFeeId: createdServiceFee.id,
            minDistance: d.minDistance,
            maxDistance: d.maxDistance,
            rate: d.rate,
          })),
        );
      }
      return plainToInstance(LoginResDto, createdManager);
    });
  }

  async getPageManagers(reqDto: PageManagerReqDto) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.managers> = {
      where: and(
        eq(managers.role, RoleEnum.MANAGEMENT),
        ...(reqDto.q
          ? [or(ilike(managers.username, `%${reqDto.q}%`), ilike(managers.phone, `%${reqDto.q}%`))]
          : []),
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
    return new OffsetPaginatedDto(entities, meta);
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
