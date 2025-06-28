import { AreasService } from '@/api/areas/areas.service';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateLocationReqDto } from '@/api/locations/dto/create-location.req.dto';
import { LocationResDto } from '@/api/locations/dto/location.res.dto';
import { DRIZZLE } from '@/database/global';
import { areas, locations, users } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
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
    console.log('create location', reqDto);

    const [existLocation] = await this.db
      .select()
      .from(locations)
      .where(and(eq(locations.address, reqDto.address), eq(locations.userId, payload.id)))
      .execute();

    const area = await this.db.query.areas.findFirst({
      where: and(eq(areas.name, reqDto.province), eq(areas.parent, reqDto.parent)),
      columns: {
        id: true,
      },
    });
    await this.db
      .update(users)
      .set({
        areaId: area?.id ?? null,
      })
      .where(eq(users.id, payload.id));

    if (existLocation) return existLocation;

    const [createdLocation] = await this.db
      .insert(locations)
      .values({
        ...reqDto,
        ...(area ? { areaId: area.id } : {}),
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
