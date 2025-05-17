import { AreasService } from '@/api/areas/areas.service';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { DeliversService } from '@/api/delivers/delivers.service';
import { ManagersService } from '@/api/managers/managers.service';
import { AddPointDeliverReqDto } from '@/api/transactions/dto/add-point-deliver.req.dto';
import { AddPointReqDto } from '@/api/transactions/dto/add-point.req.dto';
import { PagingTransaction } from '@/api/transactions/dto/page-transaction.req.dto';
import { TransactionResDto } from '@/api/transactions/dto/transaction.res.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE } from '@/database/global';
import {
  RoleEnum,
  TransactionMethodEnum,
  transactions,
  TransactionStatus,
  TransactionType,
} from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, count, desc, eq, not, sql } from 'drizzle-orm';

@Injectable()
export class TransactionsService {
  constructor(
    private deliversService: DeliversService,
    private managersService: ManagersService,
    private areasService: AreasService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  async getCount(payload: JwtPayloadType) {
    const [{ totalCount }] = await this.db
      .select({ totalCount: count() })
      .from(transactions)
      .where(and(eq(transactions.status, TransactionStatus.PENDING)))
      .execute();

    return totalCount;
  }

  async addPointsForDeliver(
    reqDto: AddPointDeliverReqDto,
    payload: JwtPayloadType,
  ) {
    return await this.db.transaction(async (tx) => {
      //---------------------------------------------------
      // Check deliver exists
      //----------------------------------------------------
      const existDeliver = await this.deliversService.existById(
        reqDto.deliverId,
      );
      if (!existDeliver) {
        throw new ValidationException(ErrorCode.D001);
      }

      const [transaction] = await tx
        .insert(transactions)
        .values({
          amount: reqDto.point,
          type: reqDto.type,
          status: TransactionStatus.APPROVED,
          role: RoleEnum.DELIVER,
          method: TransactionMethodEnum.TRANSFER,
          deliverId: reqDto.deliverId,
          approvedBy: payload.id,
        })
        .returning();

      switch (reqDto.type) {
        case TransactionType.DEPOSIT:
          // Nếu là admin thì trừ điểm của khu vực
          if (payload.role === RoleEnum.MANAGEMENT) {
            const area = await this.areasService.existById(payload.areaId);
            if (!area) {
              throw new ValidationException(ErrorCode.A001);
            }
            // nếu điểm khu vực nhỏ hơn điểm cần cộng
            if (area.point < reqDto.point) {
              throw new ValidationException(ErrorCode.TR002);
            }
            await this.areasService.subtractPoint(
              payload.areaId,
              reqDto.point,
              tx,
            );
          }
          await this.deliversService.addPoint(
            reqDto.deliverId,
            reqDto.point,
            tx,
          );
          break;
        case TransactionType.WITHDRAW:
          // Nếu là admin thì cộng điểm cho khu vực
          if (payload.role === RoleEnum.MANAGEMENT) {
            if (existDeliver.point < reqDto.point) {
              throw new ValidationException(ErrorCode.TR002);
            }

            await this.areasService.addPoint(payload.areaId, reqDto.point, tx);
          }
          await this.deliversService.subtractPoint(
            reqDto.deliverId,
            reqDto.point,
            tx,
          );
          break;
        default:
          throw new ValidationException(ErrorCode.CM001);
      }
      return plainToInstance(TransactionResDto, transaction);
    });
  }

  async getRecordTransaction(
    reqDto: PagingTransaction,
    payload: JwtPayloadType,
  ) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.transactions> = {
      where: and(
        ...(reqDto.deliverId
          ? [eq(transactions.deliverId, reqDto.deliverId)]
          : []),
        not(eq(transactions.status, TransactionStatus.PENDING)),
      ),
    };

    const qCount = this.db.query.transactions.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.transactions.findMany({
        ...baseConfig,
        orderBy: desc(transactions.createdAt),
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(
      entities.map((e) => plainToInstance(TransactionResDto, e)),
      meta,
    );
  }

  async addPointsForArea(reqDto: AddPointReqDto, payload: JwtPayloadType) {
    return await this.db.transaction(async (tx) => {
      const manager = await this.managersService.existById(reqDto.managerId);
      if (!manager) {
        throw new ValidationException(ErrorCode.M001);
      }
      //---------------------------------------------------
      // Check area exists
      //-----------------------------------------------------
      const [transaction] = await tx
        .insert(transactions)
        .values({
          amount: reqDto.point,
          type: reqDto.type,
          role: RoleEnum.MANAGEMENT,
          status: TransactionStatus.APPROVED,
          method: TransactionMethodEnum.TRANSFER,
          managerId: reqDto.managerId,
          approvedBy: payload.id,
          areaId: manager.areaId,
        })
        .returning();

      switch (reqDto.type) {
        case TransactionType.DEPOSIT:
          console.log('manager.areaId', manager.areaId, reqDto.point);
          await this.areasService.addPoint(manager.areaId, reqDto.point, tx);
          break;
        case TransactionType.WITHDRAW:
          if (manager.point < reqDto.point) {
            throw new ValidationException(ErrorCode.TR002);
          }
          await this.areasService.subtractPoint(
            manager.areaId,
            reqDto.point,
            tx,
          );
          break;
        default:
          throw new ValidationException(ErrorCode.CM001);
      }
      return plainToInstance(TransactionResDto, transaction);
    });
  }

  async getPageTransactions(
    reqDto: PagingTransaction,
    payload: JwtPayloadType,
  ) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.transactions> = {
      where: eq(transactions.method, TransactionMethodEnum.REQUEST),
    };

    const qCount = this.db.query.transactions.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.transactions.findMany({
        ...baseConfig,
        orderBy: desc(transactions.createdAt),
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(
      entities.map((e) => plainToInstance(TransactionResDto, e)),
      meta,
    );
  }
}
