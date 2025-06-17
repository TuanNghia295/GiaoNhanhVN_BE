import { ServiceFeeResDto } from '@/api/settings/dto/service.fee.res.dto';
import { SettingResDto } from '@/api/settings/dto/setting.res.dto';
import { UpdateServiceFeeReqDto } from '@/api/settings/dto/update-service.fee.req.dto';
import { UpdateSettingReqDto } from '@/api/settings/dto/update-setting.req.dto';
import { RoleEnum } from '@/database/schemas';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
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
  async getSettings(@Query('areaId') areaId: number) {
    return await this.settingsService.getSettings(areaId);
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
  async getServiceFeesByType(
    @Param('type') type: string,
    @Param('settingId') settingId: number,
  ) {
    return await this.settingsService.getServiceFeesByTypeAndSettingId(
      type,
      settingId,
    );
  }

  @ApiPublic({
    summary: 'Lấy cài đặt giá trị môi trường',
    isPaginated: false,
    type: SettingResDto,
  })
  @Get('hotline')
  async getHotline(@Query('provinceName') provinceName: string) {
    return await this.settingsService.getHotline(provinceName);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @Patch('type/:type')
  @ApiAuth({
    summary: 'Cập nhật cài đặt giá trị theo loại',
    type: ServiceFeeResDto,
  })
  async updateDistanceSettings(
    @Param('type') type: string,
    @Body() dto: UpdateServiceFeeReqDto,
  ) {
    return await this.settingsService.updateServiceFeesByType(type, dto);
  }
}
