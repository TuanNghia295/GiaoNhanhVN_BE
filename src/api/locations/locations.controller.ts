import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateLocationReqDto } from '@/api/locations/dto/create-location.req.dto';
import { LocationResDto } from '@/api/locations/dto/location.res.dto';
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
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Thêm địa chỉ cho của bạn (user)',
    type: LocationResDto,
  })
  @Post()
  async create(
    @Body() reqDto: CreateLocationReqDto,
    @CurrentUser() payload: JwtPayloadType,
  ) {
    return await this.locationsService.create(payload, reqDto);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Danh sách địa chỉ của bạn [USER]',
    type: LocationResDto,
  })
  @Get()
  async getLocations(@CurrentUser() payload: JwtPayloadType) {
    return await this.locationsService.getLocationsByUserId(payload.id);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Xóa địa chỉ của người dùng [USER]',
  })
  @Delete(':locationId')
  async deleteUserLocation(
    @Param('locationId', ParseIntPipe) locationId: number,
  ) {
    return this.locationsService.remove(locationId);
  }
}
