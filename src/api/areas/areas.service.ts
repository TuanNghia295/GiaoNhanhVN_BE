import { CreateAreaReqDto } from '@/api/areas/dto/create-area.req.dto';
import { UpdateAreaReqDto } from '@/api/areas/dto/update-area.req.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, Transaction } from '@/database/global';
import { areas } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { and, eq, or, sql } from 'drizzle-orm';

@Injectable()
export class AreasService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  async existByNameOrCodeAndParent({
    name,
    code,
    parent,
  }: {
    name: string;
    code: string;
    parent: string;
  }) {
    return this.db
      .select({
        id: areas.id,
      })
      .from(areas)
      .where(
        and(
          eq(areas.parent, parent),
          or(eq(areas.name, name), eq(areas.code, code)),
        ),
      )
      .then((result) => result[0] ?? null);
  }

  async create(reqDto: CreateAreaReqDto) {
    if (
      await this.existByNameOrCodeAndParent({
        name: reqDto.name,
        code: reqDto.code,
        parent: reqDto.parent,
      })
    ) {
      throw new ValidationException(ErrorCode.AR002, HttpStatus.CONFLICT);
    }

    return this.db
      .insert(areas)
      .values({
        ...reqDto,
      })
      .returning()
      .then((result) => result[0]);
  }

  async existByIdOrNameParent({
    areaId,
    name,
    parent,
  }: {
    areaId: number;
    name: string;
    parent: string;
  }): Promise<{ id: number }> {
    console.log(`areaId`, areaId);
    console.log('name', name);
    console.log('padding', parent);
    return this.db
      .select({
        id: areas.id,
      })
      .from(areas)
      .where(and(or(eq(areas.id, areaId), eq(areas.name, name))))
      .then((result) => result[0] ?? null);
  }

  async existById(areaId: number) {
    return this.db
      .select({
        id: areas.id,
        point: areas.point,
      })
      .from(areas)
      .where(eq(areas.id, areaId))
      .then((result) => result[0] ?? null);
  }

  async existByName(name: string): Promise<{ id: number }> {
    return this.db
      .select({
        id: areas.id,
      })
      .from(areas)
      .where(eq(areas.name, name))
      .then((result) => result[0] ?? null);
  }

  async getAreas() {
    return this.db.query.areas.findMany();
  }

  async subtractPoint(areaId: number, point: number, tx: Transaction) {
    await tx
      .update(areas)
      .set({
        point: sql`${areas.point} -
        ${point}`,
      })
      .where(eq(areas.id, areaId));
  }

  async addPoint(areaId: number, point: number, tx: Transaction) {
    await tx
      .update(areas)
      .set({
        point: sql`${areas.point} +
        ${point}`,
      })
      .where(eq(areas.id, areaId));
  }

  async getById(areaId: number) {
    const [result] = await this.db
      .select()
      .from(areas)
      .where(eq(areas.id, areaId))
      .limit(1);
    if (!result) {
      throw new ValidationException(ErrorCode.AR001, HttpStatus.NOT_FOUND);
    }
    return result;
  }

  async update(areaId: number, reqDto: UpdateAreaReqDto) {
    const result = await this.db
      .update(areas)
      .set({
        ...reqDto,
      })
      .where(eq(areas.id, areaId))
      .returning();
    return result[0];
  }
}
