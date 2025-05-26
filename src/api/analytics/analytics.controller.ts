import { AdminRevenueReqDto } from '@/api/analytics/dto/admin-revenue.req.dto';
import { AdminRevenueResDto } from '@/api/analytics/dto/admin-revenue.res.dto';
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

  // @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Thống kê doanh thu của admin management (admin, management)',
    type: AdminRevenueResDto,
  })
  @Get('admin')
  async getAdminRevenue(@Query() reqDto: AdminRevenueReqDto) {
    return this.analyticsService.getAdminRevenue(reqDto);
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
        return this.analyticsService.getStoreRevenue(reqDto, payload);
      default:
        throw new ForbiddenException(
          'You do not have permission to access this resource.',
        );
    }
  }
}
