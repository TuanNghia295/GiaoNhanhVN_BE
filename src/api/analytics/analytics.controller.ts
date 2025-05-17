import { AdminRevenueReqDto } from '@/api/analytics/dto/admin-revenue.req.dto';
import { AdminRevenueResDto } from '@/api/analytics/dto/admin-revenue.res.dto';
import { ApiAuth } from '@/decorators/http.decorators';
import { Controller, Get, Query } from '@nestjs/common';
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
}
