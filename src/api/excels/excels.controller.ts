import { AnalyticsService } from '@/api/analytics/analytics.service';
import { AdminRevenueReqDto } from '@/api/analytics/dto/admin-revenue.req.dto';
import { DeliverRevenueReqDto } from '@/api/analytics/dto/deliver-revenue.req.dto';
import { StoreRevenueReqDto } from '@/api/analytics/dto/store-revenue.req.dto';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { ImportProductReqDto } from '@/api/excels/dto/import-product.req.dto';
import { OrdersService } from '@/api/orders/orders.service';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { ExcelsService } from './excels.service';

@Controller('excel')
export class ExcelsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly ordersService: OrdersService,
    private readonly excelsService: ExcelsService,
  ) {}

  @ApiPublic({
    summary: 'import sản phẩm từ file excel',
    description: 'import sản phẩm từ file excel',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
          return cb(
            new BadRequestException('Only .xlsx or .xls files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @Post('import-product')
  async importProduct(
    @Body() _reqDto: ImportProductReqDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.excelsService.importProduct(file);
  }

  @ApiPublic({
    summary: 'Lấy báo cáo doanh thu của admin',
  })
  @Get('admin-report')
  async getAdminReport(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: AdminRevenueReqDto,
    @Res() res: Response,
  ) {
    // Dữ liệu mẫu
    const analyticTotalRevenue = await this.analyticsService.getAdminRevenue(
      reqDto,
      payload,
    );
    console.log('analyticTotalRevenue', analyticTotalRevenue);

    const workbook = new ExcelJS.Workbook();
    await this.excelsService.createMainSheet(
      workbook.addWorksheet('Tổng hợp doanh thu'),
      analyticTotalRevenue,
    );
    await this.excelsService.createMainDetailSheet(
      workbook.addWorksheet('Chi tiết'),
      analyticTotalRevenue.all,
    );
    const orders = await this.ordersService.getOrdersByDateRange(
      reqDto.from,
      reqDto.to,
      reqDto.areaId,
    );
    await this.excelsService.createOrdersSheet(
      workbook.addWorksheet('Đơn hàng'),
      orders,
    );
    // Set the response headers for Excel file download
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="admin-report-${Math.floor(Date.now() / 1000)}.xlsx"`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'xuất báo cáo doanh thu của cửa hàng',
    description: 'xuất báo cáo doanh thu của cửa hàng',
  })
  @Get('store-report')
  async getStoreReport(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: StoreRevenueReqDto,
    @Res() res: Response,
  ) {
    const analyticStoreRevenue = await this.analyticsService.getStoreRevenue(
      reqDto,
      payload,
    );

    const workbook = new ExcelJS.Workbook();
    await this.excelsService.createMainStoreSheet(
      workbook.addWorksheet('Tổng hợp doanh thu'),
      analyticStoreRevenue,
    );

    // Set the response headers for Excel file download
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="admin-report-${Math.floor(Date.now() / 1000)}.xlsx"`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'xuất báo cáo doanh thu của shipper',
    description: 'xuất báo cáo doanh thu của shipper',
  })
  @Get('deliver-report')
  async getDeliverReport(
    @Query() reqDto: DeliverRevenueReqDto,
    @CurrentUser() payload: JwtPayloadType,
    @Res() res: Response,
  ) {
    const analyticDeliverRevenue =
      await this.analyticsService.getDeliverRevenue(reqDto, payload);
    const workbook = new ExcelJS.Workbook();
    await this.excelsService.createMainDeliverSheet(
      workbook.addWorksheet('Tổng hợp doanh thu'),
      analyticDeliverRevenue,
    );

    // Set the response headers for Excel file download
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="admin-report-${Math.floor(Date.now() / 1000)}.xlsx"`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }
}
