import { AreasService } from '@/api/areas/areas.service';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateLocationReqDto } from '@/api/locations/dto/create-location.req.dto';
import { LocationResDto } from '@/api/locations/dto/location.res.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { locations } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, desc, eq } from 'drizzle-orm';

@Injectable()
export class LocationsService {
  constructor(
    private readonly areasService: AreasService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  async create(payload: JwtPayloadType, reqDto: CreateLocationReqDto) {
    const provinceName = reqDto.province?.replace(/'/g, '').trim();
    const existArea = await this.areasService.existByName(provinceName);
    if (!existArea) {
      throw new ValidationException(ErrorCode.AR001);
    }

    const [existLocation] = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.geometry, reqDto.geometry),
          eq(locations.userId, payload.id),
        ),
      )
      .execute();

    if (existLocation) {
      return plainToInstance(LocationResDto, existLocation);
    }

    const [newLocation] = await this.db
      .insert(locations)
      .values({
        ...reqDto,
        userId: payload.id,
        areaId: existArea.id,
      })
      .returning();

    return plainToInstance(LocationResDto, newLocation);
  }

  async getLocationsByUserId(userId: number) {
    return this.db.query.locations
      .findMany({
        where: eq(locations.userId, userId),
        with: {
          Area: true,
        },
        orderBy: desc(locations.createdAt),
      })
      .then((locations) =>
        locations.map((location) => {
          return plainToInstance(LocationResDto, location);
        }),
      );
  }

  async remove(locationId: number) {
    return this.db.delete(locations).where(eq(locations.id, locationId));
  }
}
