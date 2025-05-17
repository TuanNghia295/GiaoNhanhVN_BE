import { ServiceFeeResDto } from '@/api/settings/dto/service.fee.res.dto';
import { SettingResDto } from '@/api/settings/dto/setting.res.dto';
import { UpdateServiceFeeReqDto } from '@/api/settings/dto/update-service.fee.req.dto';
import { DRIZZLE } from '@/database/global';
import { distances, serviceFees, settings } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { UpdateSettingReqDto } from './dto/update-setting.req.dto';

@Injectable()
export class SettingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getSettings(areaId: number) {
    const results = await this.db
      .select()
      .from(settings)
      .where(
        and(
          ...(areaId
            ? [eq(settings.areaId, areaId)]
            : [isNull(settings.areaId)]),
        ),
      );

    return results.map((result) => plainToInstance(SettingResDto, result));
  }

  async getServiceFees(settingId: number) {
    console.log('settingId', settingId);
    const results = await this.db.query.serviceFees.findMany({
      where: eq(serviceFees.settingId, settingId),
      with: {
        distance: true,
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
      where: and(
        eq(serviceFees.type, type),
        eq(serviceFees.settingId, settingId),
      ),
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
              .where(
                and(
                  eq(distances.id, distance.id),
                  eq(distances.serviceFeeId, serviceFeeId),
                ),
              )
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
}
