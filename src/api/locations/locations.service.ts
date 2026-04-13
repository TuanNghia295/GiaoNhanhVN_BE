import { AreasService } from '@/api/areas/areas.service';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateLocationReqDto } from '@/api/locations/dto/create-location.req.dto';
import { LocationResDto } from '@/api/locations/dto/location.res.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import { locations, users } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, desc, eq } from 'drizzle-orm';

@Injectable()
export class LocationsService {
  constructor(
    private readonly areasService: AreasService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  async create(payload: JwtPayloadType, reqDto: CreateLocationReqDto) {
    console.log('create location', reqDto);

    const [existLocation] = await this.db
      .select()
      .from(locations)
      .where(and(eq(locations.address, reqDto.address), eq(locations.userId, payload.id)))
      .execute();

    let areaId: number | null = null;
    if (reqDto.geometry) {
      console.log('reqDto.origins', reqDto.origins);
      const [latitude, longitude] = reqDto.geometry.split(',').map(Number);
      console.log('latitude', latitude, 'longitude', longitude);
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new ValidationException(ErrorCode.CV000, HttpStatus.BAD_REQUEST);
      }
      areaId = await this.areasService.getNearestAreaId(latitude, longitude);
      console.log('location areaId', areaId);
      if (areaId) {
        await this.db
          .update(users)
          .set({
            areaId: areaId,
          })
          .where(eq(users.id, payload.id));
      }
    }

    if (existLocation) {
      return this.db
        .update(locations)
        .set({
          ...(areaId ? { areaId } : {}),
        })
        .where(eq(locations.id, existLocation.id))
        .returning();
    }

    console.log('create location with areaId', areaId);
    const [createdLocation] = await this.db
      .insert(locations)
      .values({
        ...reqDto,
        ...(areaId ? { areaId } : {}),
        userId: payload.id,
      })
      .returning();

    return createdLocation;
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
