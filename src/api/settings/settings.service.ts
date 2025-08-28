import { HotlineReqDto } from '@/api/settings/dto/hotline.req.dto';
import { ServiceFeeResDto } from '@/api/settings/dto/service.fee.res.dto';
import { SettingResDto } from '@/api/settings/dto/setting.res.dto';
import { UpdateDistanceReqDto } from '@/api/settings/dto/update-distance.req.dto';
import { UpdateServiceFeeReqDto } from '@/api/settings/dto/update-service.fee.req.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { areas, distances, RoleEnum, serviceFees, settings } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, asc, eq } from 'drizzle-orm';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { UpdateSettingReqDto } from './dto/update-setting.req.dto';

@Injectable()
export class SettingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getSettingByAreaId(areaId: number, payload: JwtPayloadType) {
    return this.db.query.settings.findFirst({
      where: and(
        ...(payload.role === RoleEnum.MANAGEMENT ? [eq(settings.areaId, payload.areaId)] : []),
        eq(settings.areaId, areaId),
      ),
      with: {
        serviceFees: {
          with: {
            distance: {
              orderBy: asc(distances.minDistance),
            },
          },
        },
      },
    });
  }

  async getServiceFees(settingId: number) {
    const results = await this.db.query.serviceFees.findMany({
      where: eq(serviceFees.settingId, settingId),
      with: {
        distance: {
          orderBy: asc(distances.minDistance),
        },
      },
    });
    return results.map((result) => plainToInstance(ServiceFeeResDto, result));
  }

  async updateSetting(reqDto: UpdateSettingReqDto) {
    const [setting] = await this.db
      .update(settings)
      .set({
        ...reqDto,
      })
      .where(eq(settings.id, reqDto.id))
      .returning()
      .execute();
    return plainToInstance(SettingResDto, setting);
  }

  async getServiceFeesByTypeAndSettingId(type: string, settingId: number) {
    const result = await this.db.query.serviceFees.findFirst({
      where: and(eq(serviceFees.type, type), eq(serviceFees.settingId, settingId)),
      with: {
        distance: {
          orderBy: asc(distances.minDistance),
        },
      },
    });
    return plainToInstance(ServiceFeeResDto, result);
  }

  async updateServiceFeesByType(type: string, reqDto: UpdateServiceFeeReqDto) {
    const { id: serviceFeeId, distances: distanceUpdates, ...payload } = reqDto;
    return this.db.transaction(async (tx) => {
      if (distanceUpdates) {
        await Promise.all(
          distanceUpdates.map(async (distance) => {
            await tx
              .update(distances)
              .set({
                rate: distance.rate,
              })
              .where(and(eq(distances.id, distance.id), eq(distances.serviceFeeId, serviceFeeId)))
              .execute();
          }),
        );
      }

      const [serviceFee] = await tx
        .update(serviceFees)
        .set({
          ...payload,
        })
        .where(eq(serviceFees.id, serviceFeeId))
        .returning();
      return plainToInstance(ServiceFeeResDto, serviceFee);
    });
  }

  async checkAreaActive(areaId: number) {
    const setting = await this.db.query.settings.findFirst({
      where: eq(settings.areaId, areaId),
      columns: {
        id: true,
        openFullTime: true,
      },
    });
    if (!setting) {
      throw new ValidationException(ErrorCode.ST001);
    }
    console.log('setting', setting);
    if (!setting.openFullTime) {
      throw new ValidationException(ErrorCode.ST003);
    }
  }

  async getHotline(reqDto: HotlineReqDto) {
    const [setting] = await this.db
      .select({
        hotline: settings.hotline,
        fanpage: settings.fanpage,
      })
      .from(settings)
      .leftJoin(areas, eq(settings.areaId, areas.id))
      .where(
        and(
          ...(reqDto.parentName ? [eq(areas.parent, reqDto.parentName)] : []),
          eq(areas.name, reqDto.provinceName),
        ),
      )
      .execute();

    if (!setting) {
      throw new ValidationException(ErrorCode.AR001);
    }

    return setting;
  }

  async getSettingById(settingId: number) {
    const [setting] = await this.db
      .select()
      .from(settings)
      .where(eq(settings.id, settingId))
      .execute();

    if (!setting) {
      throw new ValidationException(ErrorCode.ST001);
    }

    return setting;
  }

  async updateDistance({ items }: UpdateDistanceReqDto) {
    console.log('items', items);
    return this.db.transaction(async (tx) => {
      await Promise.all(
        items.map(async (item) => {
          await tx
            .update(distances)
            .set({
              rate: item.rate,
            })
            .where(eq(distances.id, item.id))
            .execute();
        }),
      );
      return true;
    });
  }
}
