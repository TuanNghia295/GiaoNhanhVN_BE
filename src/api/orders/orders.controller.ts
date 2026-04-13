import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CalculateOrderReqDto } from '@/api/orders/dto/calculate-order.req.dto';
import { CountOrderReqDto } from '@/api/orders/dto/count-order.req.dto';
import { OrderCreateReqDto } from '@/api/orders/dto/order-create.req.dto';
import { OrderResDto } from '@/api/orders/dto/order.res.dto';
import { PageMyOrderReqDto } from '@/api/orders/dto/page-my-order.req.dto';
import { PageOrderReqDto } from '@/api/orders/dto/query-order.req.dto';
import { UpdateStatusOrderReqDto } from '@/api/orders/dto/update-status-order.req.dto';
import { UploadImageOrderReqDto } from '@/api/orders/dto/upload-image-order.req.dto';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('calculate')
  @ApiPublic({
    summary: 'Tính toán giá đơn hàng',
    type: OrderResDto,
  })
  async calculate(@Body() reqDto: CalculateOrderReqDto) {
    return await this.ordersService.calculate(reqDto);
  }

  @Get('debug/store-service-fee')
  @ApiPublic({
    summary: 'Debug tính phí dịch vụ cửa hàng (tạm thời)',
  })
  async debugStoreServiceFee(
    @Query('storeId') storeId?: string,
    @Query('totalProduct') totalProduct?: string,
    @Query('basePct') basePct?: string,
  ) {
    const parsedStoreId = storeId ? Number(storeId) : null;
    const parsedTotalProduct = Number(totalProduct ?? 0);
    const parsedBasePct = Number(basePct ?? 0);

    return await this.ordersService.debugStoreServiceFee(
      parsedStoreId,
      parsedTotalProduct,
      parsedBasePct,
    );
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Thống kê đếm số lượng đơn hàng theo trạng thái',
  })
  @Get('count-by-status')
  async countOrdersByStatus(
    @Query() reqDto: CountOrderReqDto,
    @CurrentUser() payload: JwtPayloadType,
  ) {
    return await this.ordersService.countOrdersByStatus(reqDto, payload);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Lấy danh sách đơn hàng [ALL]',
    type: OrderResDto,
  })
  @Get()
  async getPageOrders(@Query() reqDto: PageOrderReqDto, @CurrentUser() payload: JwtPayloadType) {
    return await this.ordersService.getPageOrders(reqDto, payload);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Tạo đơn hàng',
    type: OrderResDto,
  })
  @Post()
  async createOrder(@CurrentUser() payload: JwtPayloadType, @Body() reqDto: OrderCreateReqDto) {
    return await this.ordersService.create(payload, reqDto);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Cập nhật banner (admin, management)',
  })
  @Patch(':orderId/images')
  @UseInterceptors(
    FilesInterceptor('images', 100, {
      fileFilter: (req, file, callback) => {
        const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (fileTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type'), false);
        }
      },
      storage: memoryStorage(),
    }),
  )
  @ApiConsumes('multipart/form-data')
  async updateImages(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() reqDto: UploadImageOrderReqDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    console.log(images);
    return await this.ordersService.updateImages(orderId, images);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Hủy và clone đơn hàng (management)',
    type: OrderResDto,
  })
  @Patch('clone')
  async cloneOrder(@CurrentUser() payload: JwtPayloadType, @Query('orderId') orderId: number) {
    return await this.ordersService.cloneOrder(orderId, payload);
  }

  @ApiPublic({
    summary: 'Lấy chi tiết đơn hàng (public)',
    type: OrderResDto,
  })
  @Get('detail')
  async getOrderDetail(@Query('orderId') orderId: number) {
    return await this.ordersService.getDetailById(orderId);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Lấy danh sách đơn hàng của user(hiển thị trên app)',
    type: OrderResDto,
  })
  @Get('my')
  async getMyOrders(@CurrentUser() payload: JwtPayloadType, @Query() reqDto: PageMyOrderReqDto) {
    return await this.ordersService.getPageByUserId(payload.id, reqDto);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Cập nhật trạng thái đơn hàng (user, admin, management)',
    type: OrderResDto,
  })
  @Patch('status')
  async updateOrderStatus(
    @CurrentUser() payload: JwtPayloadType,
    @Query('orderId') orderId: number,
    @Body() reqDto: UpdateStatusOrderReqDto,
  ) {
    return await this.ordersService.updateOrderStatus(orderId, reqDto, payload);
  }
}
