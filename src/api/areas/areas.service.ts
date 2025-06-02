import { CreateAreaReqDto } from '@/api/areas/dto/create-area.req.dto';
import { UpdateAreaReqDto } from '@/api/areas/dto/update-area.req.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { decrement, DRIZZLE, increment, Transaction } from '@/database/global';
import { areas } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, isNull, or } from 'drizzle-orm';

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
          isNull(areas.deletedAt),
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

  async existById(areaId: number) {
    return this.db
      .select({
        id: areas.id,
        point: areas.point,
      })
      .from(areas)
      .where(
        and(
          eq(areas.id, areaId),
          isNull(areas.deletedAt), // Ensure the area is not deleted
        ),
      )
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

  async getAreas(q?: string) {
    return this.db.query.areas.findMany({
      where: and(
        q
          ? or(ilike(areas.name, `%${q}%`), ilike(areas.code, `%${q}%`))
          : undefined,
      ),
      orderBy: [asc(areas.parent)],
    });
  }

  async subtractPoint(areaId: number, point: number, tx: Transaction) {
    await tx
      .update(areas)
      .set({
        point: decrement(areas.point, point),
      })
      .where(eq(areas.id, areaId));
  }

  async addPoint(areaId: number, point: number, tx: Transaction) {
    await tx
      .update(areas)
      .set({
        point: increment(areas.point, point),
      })
      .where(eq(areas.id, areaId));
  }

  async getById(areaId: number) {
    const [result] = await this.db
      .select()
      .from(areas)
      .where(
        and(
          eq(areas.id, areaId),
          isNull(areas.deletedAt), // Ensure the area is not deleted
        ),
      )
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

  async remove(areaId: number) {
    if (!(await this.existById(areaId))) {
      throw new ValidationException(ErrorCode.AR001, HttpStatus.NOT_FOUND);
    }

    return this.db.transaction(async (tx) => {
      // trức khi xóa khu vực thì sẽ xóa các ảnh của shipper thuộc khu vực đó
      // const images = await this.db
      //   .select({
      //     avatar: delivers.avatar,
      //   })
      //   .from(delivers)
      //   .where(and(eq(delivers.areaId, areaId)))
      //   .then((result) => result.map((item) => item.avatar));
      // if (images.length > 0) {
      //   for (const image of images) {
      //     if (fs.existsSync(image)) {
      //       fs.unlinkSync(image);
      //     }
      //   }
      // }
      await tx.delete(areas).where(eq(areas.id, areaId));
    });
  }
}
