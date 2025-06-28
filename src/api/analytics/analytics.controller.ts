import { AdminRevenueReqDto } from '@/api/analytics/dto/admin-revenue.req.dto';
import { AdminRevenueResDto } from '@/api/analytics/dto/admin-revenue.res.dto';
import { DeliverRevenueReqDto } from '@/api/analytics/dto/deliver-revenue.req.dto';
import { DeliverRevenueResDto } from '@/api/analytics/dto/deliver-revenue.res.dto';
import { StoreRevenueReqDto } from '@/api/analytics/dto/store-revenue.req.dto';
import { StoreRevenueResDto } from '@/api/analytics/dto/store-revenue.res.dto';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Thống kê doanh thu của admin management (admin, management)',
    type: AdminRevenueResDto,
  })
  @Get('admin')
  async getAdminRevenue(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: AdminRevenueReqDto,
  ) {
    return this.analyticsService.getAdminRevenue(reqDto, payload);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Thống kê doanh thu của cửa hàng (admin)',
    type: StoreRevenueResDto,
  })
  @Get('store')
  async getStoreRevenue(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: StoreRevenueReqDto,
  ) {
    return this.analyticsService.getStoreRevenue(reqDto, payload);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Thống kê doanh thu của shipper (admin)',
    type: DeliverRevenueResDto,
  })
  @Get('deliver')
  async getDeliverRevenue(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: DeliverRevenueReqDto,
  ) {
    return this.analyticsService.getDeliverRevenue(reqDto, payload);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Thống kê doanh thu của cửa hàng (store)',
    type: StoreRevenueResDto,
  })
  @Get('store/my')
  async getMyStoreRevenue(
    @Query() reqDto: StoreRevenueReqDto,
    @CurrentUser() payload: JwtPayloadType,
  ) {
    switch (payload.role) {
      case RoleEnum.STORE:
        return this.analyticsService.getMyStoreRevenue(reqDto, payload);
      default:
        throw new ForbiddenException('You do not have permission to access this resource.');
    }
  }
}
