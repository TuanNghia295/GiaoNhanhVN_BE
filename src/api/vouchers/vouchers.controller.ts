import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateVoucherReqDto } from '@/api/vouchers/dto/create-voucher.req.dto';
import { PageVouchersReqDto } from '@/api/vouchers/dto/page-vouchers-req.dto';
import { UpdateVoucherReqDto } from '@/api/vouchers/dto/update-voucher.req.dto';
import { VoucherResDto } from '@/api/vouchers/dto/voucher.res.dto';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Tạo mới voucher (admin, store, management)',
    type: VoucherResDto,
  })
  @Post('create')
  async create(
    @Body() reqDto: CreateVoucherReqDto,
    @CurrentUser() payload: JwtPayloadType,
  ) {
    return await this.vouchersService.create(reqDto, payload);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Lấy danh sách voucher (admin, store, management)',
    type: VoucherResDto,
    isPaginated: true,
  })
  @Get()
  async getPageVouchers(
    @Query() reqDto: PageVouchersReqDto,
    @CurrentUser() payload: JwtPayloadType,
  ) {
    return await this.vouchersService.getPageVouchers(reqDto, payload);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Cập nhật voucher (admin, store, management)',
    type: VoucherResDto,
  })
  @Patch('update/:id')
  async update(
    @Param('id') voucherId: number,
    @Body() reqDto: UpdateVoucherReqDto,
  ) {
    return await this.vouchersService.update(voucherId, reqDto);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.STORE, RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Xóa voucher (admin, store, management)',
  })
  @Delete(':id')
  async softDelete(@Param('id') voucherId: number) {
    return await this.vouchersService.softDelete(voucherId);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Lấy chi tiết voucher (admin, store, management)',
    type: VoucherResDto,
  })
  @Get('detail/:id')
  async getDetailById(@Param('id') voucherId: number) {
    return await this.vouchersService.getDetailById(voucherId);
  }

  @Roles(RoleEnum.USER, RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Lấy danh sách voucher cho user',
    type: VoucherResDto,
  })
  @Get('user')
  async getVouchersForUser(
    @Query('storeId') storeId: number,
    @Query('areaId') areaId: number,
    @Query('isHidden') isHidden: boolean,
    @Query('code') code: string,
    @CurrentUser() payload: JwtPayloadType,
  ) {
    return await this.vouchersService.getVouchersForUser(
      storeId,
      areaId,
      isHidden,
      code,
      payload,
    );
  }
}
