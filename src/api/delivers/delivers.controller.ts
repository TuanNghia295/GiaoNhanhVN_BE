import { AuthService } from '@/api/auth/auth.service';
import { LoginReqDto } from '@/api/auth/dto/login.req.dto';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateDeliverReqDto } from '@/api/delivers/dto/create-deliver.req.dto';
import { DeliverResDto } from '@/api/delivers/dto/deliver.res.dto';
import { PageDeliverReqDto } from '@/api/delivers/dto/page-deliver.req.dto';
import { RevenueReqDto } from '@/api/delivers/dto/revenue.req.dto';
import { UpdateDeliverReqDto } from '@/api/delivers/dto/update-deliver.req.dto';
import { UpdateImageReqDto } from '@/api/delivers/dto/update-image.req.dto';
import { OrderResDto } from '@/api/orders/dto/order.res.dto';
import { OrdersService } from '@/api/orders/orders.service';
import { OrderStatusEnum, RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { UAParser } from 'ua-parser-js';
import { LoginResDto } from '../auth/dto/login.res.dto';
import { DeliversService } from './delivers.service';

@Controller('delivers')
export class DeliversController {
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly authService: AuthService,
    private readonly deliversService: DeliversService,
  ) {}

  @ApiPublic({
    type: LoginResDto,
    summary: 'Đăng nhập bằng phone và password (deliver)',
  })
  @Post('login')
  async loginDeliver(@Req() req: Request, @Body() reqDto: LoginReqDto): Promise<LoginResDto> {
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent); // ✅ đúng cách
    const result = parser.getResult();

    console.log(result);
    return await this.authService.loginDeliver(reqDto);
  }

  @Roles(RoleEnum.DELIVER)
  @ApiAuth({
    summary: 'Đăng xuất (deliver)',
    type: DeliverResDto,
  })
  @Patch('logout')
  async logout(@CurrentUser() payload: JwtPayloadType) {
    return await this.deliversService.logout(payload.id);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Tạo mới deliver (admin, management)',
    type: DeliverResDto,
  })
  @Post()
  async create(@Body() reqDto: CreateDeliverReqDto) {
    return await this.deliversService.create(reqDto);
  }

  @Roles(RoleEnum.DELIVER)
  @ApiAuth({
    summary: 'Lấy thông tin của deliver hiện tại (deliver)',
    type: DeliverResDto,
  })
  @Get('info')
  async getInfo(@CurrentUser() payload: JwtPayloadType) {
    return await this.deliversService.getInfoById(payload.id);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy danh sách delivers [MANAGEMENT, ADMIN]',
    type: DeliverResDto,
    isPaginated: true,
  })
  @Get()
  async getPageDelivers(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PageDeliverReqDto,
  ) {
    return this.deliversService.getPageDelivers(reqDto, payload);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Cập nhật ảnh đại diện cho deliver (admin)',
    type: DeliverResDto,
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
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
  @Patch('admin/avatar/:deliverId')
  async updateImageForAdmin(
    @Param('deliverId') deliverId: number,
    @Body() dto: UpdateImageReqDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return await this.deliversService.updateImage(deliverId, image);
  }

  @Roles(RoleEnum.DELIVER)
  @Get('traditional/orders')
  @ApiAuth({
    summary: 'Lấy danh đơn hàng shipper có thể nhận (deliver) - phân đơn truyền thống',
    type: OrderResDto,
    isPaginated: false,
  })
  async getPendingOrders(@CurrentUser() payload: JwtPayloadType) {
    return this.deliversService.getPendingOrders(payload);
  }

  @Roles(RoleEnum.DELIVER)
  @Patch('traditional/orders/:orderId')
  @ApiAuth({
    summary: 'Nhận đơn hàng (deliver) - phân đơn truyền thống',
    type: OrderResDto,
  })
  async assignOrder(@CurrentUser() payload: JwtPayloadType, @Param('orderId') orderId: number) {
    return await this.ordersService.assignOrderToShipper(orderId, payload);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy thông tin deliver với id tương ứng (admin)',
    type: DeliverResDto,
  })
  @Get('detail/:deliverId')
  async getDeliverById(@Param('deliverId') deliverId: number) {
    return await this.deliversService.getDetail(deliverId);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Cập nhật thông tin shipper',
    type: DeliverResDto,
  })
  @Patch('update/:deliverId')
  async update(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: UpdateDeliverReqDto,
    @Param('deliverId') deliverId: number,
  ) {
    return await this.deliversService.update(deliverId, reqDto, payload);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Xóa deliver (admin)',
    type: DeliverResDto,
  })
  @Delete('delete/:deliverId')
  async softDelete(@Param('deliverId') deliverId: number) {
    return await this.deliversService.softDelete(deliverId);
  }

  @Roles(RoleEnum.DELIVER)
  @ApiAuth({
    summary: 'Lấy danh sách đơn hàng hiện tại của deliver hiện tại (deliver)',
    type: OrderResDto,
    isPaginated: false,
  })
  @Get('list-orders')
  async getAcceptedOrders(@CurrentUser() payload: JwtPayloadType) {
    return this.deliversService.getAcceptedOrders(payload);
  }

  @Roles(RoleEnum.DELIVER)
  @ApiAuth({
    summary: 'Cập nhật trạng thái đơn hàng (deliver)',
    type: OrderResDto,
  })
  @Patch('traditional/orders/:orderId/:status')
  async updateOrderStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('status') status: OrderStatusEnum,
    @Body('reason') reason: string,
  ) {
    return await this.ordersService.updateOrderStatusByDeliver(orderId, status, 'abc');
  }

  @Roles(RoleEnum.DELIVER)
  @ApiAuth({
    summary: 'Thống kê doanh thu của deliver hiện tại (deliver)',
    type: OrderResDto,
  })
  @Get('revenue')
  async getRevenue(@CurrentUser() payload: JwtPayloadType, @Query() reqDto: RevenueReqDto) {
    return await this.deliversService.getRevenue(payload.id, reqDto);
  }

  @Roles(RoleEnum.DELIVER)
  @ApiAuth({
    summary: 'Cập nhật thông tin deliver hiện tại (deliver)',
    type: DeliverResDto,
  })
  @Patch('my')
  async updateMyInfo(@CurrentUser() payload: JwtPayloadType, @Body() reqDto: UpdateDeliverReqDto) {
    return await this.deliversService.update(payload.id, reqDto, payload);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.STORE, RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy danh sách deliver để hiển thị dạng list (admin)',
    type: DeliverResDto,
  })
  @Get('list')
  async getDelivers(@Query('input') input: string, @Query('areaId') areaId: number) {
    return this.deliversService.getDeliversByPhoneOrName(input, areaId);
  }
}
