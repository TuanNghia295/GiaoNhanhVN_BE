import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { HotlineReqDto } from '@/api/settings/dto/hotline.req.dto';
import { ResetStoreServiceFeeReqDto } from '@/api/settings/dto/reset-store-service-fee.req.dto';
import { ServiceFeeResDto } from '@/api/settings/dto/service.fee.res.dto';
import { SettingResDto } from '@/api/settings/dto/setting.res.dto';
import { UpdateDistanceReqDto } from '@/api/settings/dto/update-distance.req.dto';
import { UpdateServiceFeeReqDto } from '@/api/settings/dto/update-service.fee.req.dto';
import { UpdateSettingReqDto } from '@/api/settings/dto/update-setting.req.dto';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { UpdateShopDistanceReqDto } from './dto/update-shop-distance.req.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy cài đặt giá trị môi trường',
    isPaginated: false,
    type: SettingResDto,
  })
  @Get('env')
  async getSettingByAreaId(
    @CurrentUser() payload: JwtPayloadType,
    @Query('areaId') areaId: number,
  ) {
    return this.settingsService.getSettingByAreaId(areaId, payload);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy cài đặt theo settingId',
    isPaginated: false,
    type: SettingResDto,
  })
  @Get('one/:settingId')
  async getSettingById(@Param('settingId') settingId: number) {
    return await this.settingsService.getSettingById(settingId);
  }

  @ApiPublic({
    summary: 'Lấy cài đặt giá trị môi trường toàn bộ',
    isPaginated: false,
    type: ServiceFeeResDto,
  })
  @Get('all')
  async getServiceFees(@Query('settingId') settingId: number) {
    return await this.settingsService.getServiceFees(settingId);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @Patch('env')
  @ApiAuth({
    summary: 'Cập nhật cài đặt giá trị môi trường [admin, management]',
    type: SettingResDto,
  })
  async updateSetting(@Body() reqDto: UpdateSettingReqDto) {
    return await this.settingsService.updateSetting(reqDto);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy cài đặt giá trị theo loại',
    isPaginated: false,
    type: ServiceFeeResDto,
  })
  @Get('type/:type/:settingId')
  async getServiceFeesByType(@Param('type') type: string, @Param('settingId') settingId: number) {
    return await this.settingsService.getServiceFeesByTypeAndSettingId(type, settingId);
  }

  @ApiPublic({
    summary: 'Lấy cài đặt giá trị môi trường',
    isPaginated: false,
    type: SettingResDto,
  })
  @Get('hotline')
  async getHotline(@Query() reqDto: HotlineReqDto) {
    return await this.settingsService.getHotline(reqDto);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @Patch('type/:type')
  @ApiAuth({
    summary: 'Cập nhật cài đặt giá trị theo loại',
    type: ServiceFeeResDto,
  })
  async updateDistanceSettings(@Param('type') type: string, @Body() dto: UpdateServiceFeeReqDto) {
    return await this.settingsService.updateServiceFeesByType(type, dto);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @Patch('distance')
  @ApiAuth({
    summary: 'Cập nhật cài đặt khoảng cách',
  })
  async updateDistance(@Body() reqDto: UpdateDistanceReqDto) {
    console.log('reqDto', reqDto);
    return await this.settingsService.updateDistance(reqDto);
  }

  @Roles(RoleEnum.ADMIN)
  @Patch('shop-distance')
  @ApiAuth({
    summary: 'Cập nhật số lượng shop và bán kính tìm kiếm shop',
  })
  async updateNumberShopByDistance(@Body() reqDto: UpdateShopDistanceReqDto) {
    return await this.settingsService.updateShopDistance(reqDto);
  }

  @Roles(RoleEnum.ADMIN)
  @Get('shop-distance')
  @ApiAuth({
    summary: 'Hiển thị số lượng shop theo bán kính',
  })
  async getShopByDistance() {
    return await this.settingsService.getShopByDistance();
  }

  @Roles(RoleEnum.ADMIN)
  @Patch('store-service-fee/reset')
  @ApiAuth({
    summary: 'Reset storeServiceFee for all stores',
  })
  async resetStoreServiceFee(@Query() reqDto: ResetStoreServiceFeeReqDto) {
    return await this.settingsService.resetStoreServiceFee(reqDto.areaId);
  }
}
