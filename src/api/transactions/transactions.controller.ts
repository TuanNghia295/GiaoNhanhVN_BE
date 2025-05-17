import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { AddPointDeliverReqDto } from '@/api/transactions/dto/add-point-deliver.req.dto';
import { AddPointReqDto } from '@/api/transactions/dto/add-point.req.dto';
import { PagingTransaction } from '@/api/transactions/dto/page-transaction.req.dto';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy tổng số giao dịch [ADMIN , MANAGEMENT]',
  })
  @Get('total')
  async getCount(@CurrentUser() payload: JwtPayloadType) {
    return await this.transactionsService.getCount(payload);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Admin nạp/rút điểm cho khu vực',
  })
  @Post('add-point-for-deliver')
  async transactionPointsForDeliver(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: AddPointDeliverReqDto,
  ) {
    return this.transactionsService.addPointsForDeliver(reqDto, payload);
  }

  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Admin nạp/rút điểm cho khu vực',
  })
  @Post('add-point-for-area')
  async transactionPointsForArea(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: AddPointReqDto,
  ) {
    return this.transactionsService.addPointsForArea(reqDto, payload);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGEMENT, RoleEnum.DELIVER)
  @ApiAuth({
    summary: 'Lịch sử nạp/rút điểm',
  })
  @Get('record')
  async getRecordTransaction(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PagingTransaction,
  ) {
    return this.transactionsService.getRecordTransaction(reqDto, payload);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGEMENT, RoleEnum.DELIVER)
  @ApiAuth({
    summary: 'Lấy yêu cầu nạp rút',
  })
  @Get()
  async getPageTransactions(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PagingTransaction,
  ) {
    return this.transactionsService.getPageTransactions(reqDto, payload);
  }
}
