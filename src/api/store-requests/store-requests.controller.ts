import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateStoreReqDto } from '@/api/store-requests/dto/create-store-req.dto';
import { PageStoreRequestReqDto } from '@/api/store-requests/dto/page-store-request-req.dto';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { StoreRequestsService } from './store-requests.service';

@Controller('store-requests')
export class StoreRequestsController {
  constructor(private readonly storeRequestsService: StoreRequestsService) {}

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy danh sách yêu cầu',
  })
  @Get()
  async getPageStoreRequests(
    @Query() reqDto: PageStoreRequestReqDto,
    @CurrentUser() payload: JwtPayloadType,
  ) {
    return await this.storeRequestsService.getPageStoreRequests(
      reqDto,
      payload,
    );
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy số lượng yêu cầu [MANAGEMENT, ADMIN]',
  })
  @Get('count')
  async getStoreRequestsCount(@CurrentUser() payload: JwtPayloadType) {
    return await this.storeRequestsService.getCount(payload);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Đăng ký cửa hàng [USER]',
  })
  @Post()
  async registerStore(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: CreateStoreReqDto,
  ) {
    return await this.storeRequestsService.registerStore(payload, reqDto);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Chấp nhận yêu cầu',
  })
  @Post('accept')
  async approveStoreRequest(
    @Query('storeRequestId', ParseIntPipe) storeRequestId: number,
  ) {
    return await this.storeRequestsService.approve(storeRequestId);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Từ chối yêu cầu',
  })
  @Post('reject')
  async rejectStoreRequest(
    @Query('storeRequestId', ParseIntPipe) storeRequestId: number,
  ) {
    return await this.storeRequestsService.reject(storeRequestId);
  }
}
