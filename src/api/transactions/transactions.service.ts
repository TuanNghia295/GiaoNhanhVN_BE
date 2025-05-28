import { AreasService } from '@/api/areas/areas.service';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { DeliversService } from '@/api/delivers/delivers.service';
import { ManagersService } from '@/api/managers/managers.service';
import { AddPointDeliverReqDto } from '@/api/transactions/dto/add-point-deliver.req.dto';
import { AddPointReqDto } from '@/api/transactions/dto/add-point.req.dto';
import { CreateTransactionReqDto } from '@/api/transactions/dto/create-transaction.req.dto';
import { PagingTransaction } from '@/api/transactions/dto/page-transaction.req.dto';
import { TransactionResDto } from '@/api/transactions/dto/transaction.res.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { DRIZZLE, Transaction } from '@/database/global';
import {
  areas,
  delivers,
  RoleEnum,
  TransactionMethodEnum,
  transactions,
  TransactionStatus,
  TransactionType,
  TransactionTypeEnum,
} from '@/database/schemas';
import { DrizzleDB, FindManyQueryConfig } from '@/database/types/drizzle';
import { ValidationException } from '@/exceptions/validation.exception';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { and, count, desc, eq, isNotNull, not, sql } from 'drizzle-orm';

@Injectable()
export class TransactionsService {
  constructor(
    private deliversService: DeliversService,
    private managersService: ManagersService,
    private areasService: AreasService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  async getCount(payload: JwtPayloadType) {
    const qb = this.db
      .select({ totalCount: count() })
      .from(transactions)
      .$dynamic();

    switch (payload.role) {
      case RoleEnum.ADMIN:
        qb.where(
          and(
            eq(transactions.method, TransactionMethodEnum.REQUEST),
            eq(transactions.status, TransactionStatus.PENDING),
            isNotNull(transactions.managerId),
          ),
        );
        break;
      case RoleEnum.MANAGEMENT:
        qb.where(
          and(
            eq(transactions.method, TransactionMethodEnum.REQUEST),
            eq(transactions.status, TransactionStatus.PENDING),
            eq(transactions.areaId, payload.areaId),
            isNotNull(transactions.deliverId),
          ),
        );
        break;
    }

    const [{ totalCount }] = await qb.execute();

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
          deliverId: reqDto.deliverId,
          status: TransactionStatus.APPROVED,
          method: TransactionMethodEnum.TRANSFER,
          ...(payload.role === RoleEnum.MANAGEMENT && {
            areaId: payload.areaId,
          }),
        })
        .returning();

      console.log('transaction', transaction);

      switch (reqDto.type) {
        case TransactionTypeEnum.DEPOSIT:
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
        case TransactionTypeEnum.WITHDRAW:
          if (existDeliver.point < reqDto.point) {
            throw new ValidationException(ErrorCode.TR002);
          }
          // Nếu là admin thì cộng điểm cho khu vực
          if (payload.role === RoleEnum.MANAGEMENT) {
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
    const baseConfig: FindManyQueryConfig<typeof this.db.query.transactions> =
      {};

    switch (payload.role) {
      case RoleEnum.ADMIN:
        baseConfig.where = and(
          not(eq(transactions.status, TransactionStatus.PENDING)),
          isNotNull(transactions.managerId),
          // Lọc ra các giao dịch của shipper đó
          ...(reqDto.deliverId
            ? [eq(transactions.deliverId, reqDto.deliverId)]
            : []),
          // Lọc ra các giao dịch của khu vực đó
          ...(reqDto.managerId
            ? [eq(transactions.managerId, reqDto.managerId)]
            : []),
        );
        break;
      case RoleEnum.MANAGEMENT:
        baseConfig.where = and(
          not(eq(transactions.status, TransactionStatus.PENDING)),
          // Lọc ra các giao dịch shipper của khu vực mình
          ...(reqDto.deliverId
            ? [eq(transactions.deliverId, reqDto.deliverId)]
            : []),
        );
        break;
      case RoleEnum.DELIVER:
        // chỉ lấy ra giao dịch của mình
        baseConfig.where = and(
          not(eq(transactions.status, TransactionStatus.PENDING)),
          eq(transactions.deliverId, payload.id),
        );
        break;
    }

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
    return new OffsetPaginatedDto(entities, meta);
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
        case TransactionTypeEnum.DEPOSIT:
          console.log('manager.areaId', manager.areaId, reqDto.point);
          await this.areasService.addPoint(manager.areaId, reqDto.point, tx);
          break;
        case TransactionTypeEnum.WITHDRAW:
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
      with: {
        manager: true,
        deliver: true,
      },
    };

    switch (payload.role) {
      case RoleEnum.ADMIN:
        // lấy ra yêu cầu nạp/rút của khu vực
        baseConfig.where = and(
          eq(transactions.method, TransactionMethodEnum.REQUEST),
          isNotNull(transactions.managerId),
        );
        break;
      case RoleEnum.MANAGEMENT:
        // chỉ lấy ra yêu cầu nạp/rút shipper của khu vực mình
        baseConfig.where = and(
          eq(transactions.method, TransactionMethodEnum.REQUEST),
          eq(transactions.areaId, payload.areaId),
          isNotNull(transactions.deliverId),
        );
        break;
      case RoleEnum.DELIVER:
        // chỉ lấy ra yêu cầu nạp/rút của mình
        baseConfig.where = and(
          eq(transactions.method, TransactionMethodEnum.REQUEST),
          eq(transactions.deliverId, payload.id),
        );
    }

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

  async create(reqDto: CreateTransactionReqDto, payload: JwtPayloadType) {
    return await this.db.transaction(async (tx) => {
      const [createdTransaction] = await tx
        .insert(transactions)
        .values({
          ...reqDto,
          status: TransactionStatus.PENDING,
          role: RoleEnum.DELIVER,
          method: TransactionMethodEnum.REQUEST,
          ...(payload.role === RoleEnum.MANAGEMENT && {
            areaId: payload.areaId,
            managerId: payload.id,
          }),
          ...(payload.role === RoleEnum.DELIVER && {
            deliverId: payload.id,
            areaId: payload.areaId,
          }),
        })
        .returning();

      return plainToInstance(TransactionResDto, createdTransaction);
    });
  }

  async existById(transactionId: number) {
    return await this.db
      .select({
        id: transactions.id,
        status: transactions.status,
        areaPoint: areas.point,
        deliverPoint: delivers.point,
        areaId: transactions.areaId,
      })
      .from(transactions)
      .leftJoin(areas, eq(transactions.areaId, areas.id))
      .leftJoin(delivers, eq(transactions.deliverId, delivers.id))
      .where(eq(transactions.id, transactionId))
      .then((result) => result[0]);
  }

  async approve(transactionId: number, payload: JwtPayloadType) {
    return await this.db.transaction(async (tx) => {
      const transaction = await this.existById(transactionId);
      if (!transaction) {
        throw new ValidationException(ErrorCode.TR001);
      }
      if (transaction.status !== TransactionStatus.PENDING) {
        throw new ValidationException(ErrorCode.TR003);
      }
      const [updatedTransaction] = await tx
        .update(transactions)
        .set({
          status: TransactionStatus.APPROVED,
          approvedBy: payload.id,
        })
        .where(eq(transactions.id, transactionId))
        .returning();

      switch (payload.role) {
        case RoleEnum.ADMIN:
          await this.doApproveTransactionByAdmin(updatedTransaction, tx);
          break;
        case RoleEnum.MANAGEMENT:
          await this.doApproveTransactionByManager(updatedTransaction, tx);
          break;
        default:
          throw new UnauthorizedException('Invalid role');
      }
      return plainToInstance(TransactionResDto, updatedTransaction);
    });
  }

  /*
    Xử lý approve giao dịch của admin
    - Nếu là khu vực nạp tiền thì cộng điểm cho khu vực
    - Nếu là khu vực rút tiền thì trừ điểm khu vực
   */
  private async doApproveTransactionByAdmin(
    updatedTransaction: TransactionType,
    tx: Transaction,
  ) {
    const area = await this.areasService.existById(updatedTransaction.areaId);
    if (!area) {
      throw new ValidationException(ErrorCode.A001);
    }
    switch (updatedTransaction.type) {
      case TransactionTypeEnum.DEPOSIT:
        await this.areasService.addPoint(
          area.id,
          updatedTransaction.amount,
          tx,
        );
        break;
      case TransactionTypeEnum.WITHDRAW:
        //----------------------------------------------------
        // Nếu điểm khu vực nhỏ hơn số tiền rút thì báo lỗi
        //----------------------------------------------------
        if (area.point < updatedTransaction.amount) {
          throw new ValidationException(ErrorCode.TR002);
        }
        await this.areasService.subtractPoint(
          area.id,
          updatedTransaction.amount,
          tx,
        );
        break;
    }
  }

  private async doApproveTransactionByManager(
    updatedTransaction: TransactionType,
    tx: Transaction,
  ) {
    const deliver = await this.deliversService.existById(
      updatedTransaction.deliverId,
    );
    if (!deliver) {
      throw new ValidationException(ErrorCode.D001);
    }
    const area = await this.areasService.existById(updatedTransaction.areaId);
    if (!area) {
      throw new ValidationException(ErrorCode.A001);
    }
    switch (updatedTransaction.type) {
      case TransactionTypeEnum.DEPOSIT: {
        if (area.point < updatedTransaction.amount) {
          throw new ValidationException(ErrorCode.TR002);
        }
        //----------------------------------------------------
        // Trừ điểm khu vực
        //----------------------------------------------------
        await this.areasService.subtractPoint(
          area.id,
          updatedTransaction.amount,
          tx,
        );
        //----------------------------------------------------
        // Cộng điểm cho shipper
        //----------------------------------------------------
        await this.deliversService.addPoint(
          updatedTransaction.deliverId,
          updatedTransaction.amount,
          tx,
        );
        break;
      }
      case TransactionTypeEnum.WITHDRAW: {
        if (deliver.point < updatedTransaction.amount) {
          throw new ValidationException(ErrorCode.TR002);
        }
        //----------------------------------------------------
        // Cộng điểm khu vực
        //----------------------------------------------------
        await this.areasService.addPoint(
          area.id,
          updatedTransaction.amount,
          tx,
        );
        //----------------------------------------------------
        // Trừ điểm cho shipper
        //----------------------------------------------------
        await this.deliversService.subtractPoint(
          updatedTransaction.deliverId,
          updatedTransaction.amount,
          tx,
        );
        break;
      }
    }
  }

  async rejectTransaction(transactionId: number, payload: JwtPayloadType) {
    return await this.db.transaction(async (tx) => {
      const transaction = await this.existById(transactionId);
      if (!transaction) {
        throw new ValidationException(ErrorCode.TR001);
      }
      if (transaction.status !== TransactionStatus.PENDING) {
        throw new ValidationException(ErrorCode.TR003);
      }
      const [updatedTransaction] = await tx
        .update(transactions)
        .set({
          status: TransactionStatus.REJECTED,
          approvedBy: payload.id,
        })
        .where(eq(transactions.id, transactionId))
        .returning();
      return plainToInstance(TransactionResDto, updatedTransaction);
    });
  }
}
