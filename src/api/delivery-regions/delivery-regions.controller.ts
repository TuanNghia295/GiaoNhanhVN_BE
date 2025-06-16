import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateDeliveryRegionsReqDto } from '@/api/delivery-regions/dto/create-delivery-regions.req.dto';
import { PageDeliveryRegionReqDto } from '@/api/delivery-regions/dto/page-delivery-region.req.dto';
import { UpdateDeliveryRegionsReqDto } from '@/api/delivery-regions/dto/update-delivery-regions.req.dto';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { DeliveryRegionsService } from './delivery-regions.service';

@Controller('delivery-regions')
export class DeliveryRegionsController {
  constructor(
    private readonly deliveryRegionsService: DeliveryRegionsService,
  ) {}

  @Roles(RoleEnum.MANAGEMENT) // Ensure only ADMIN can access this route
  @ApiAuth({
    summary: 'Tạo mới khu vực shop đặt đơn',
  })
  @Post()
  async create(
    @CurrentUser() payload: JwtPayloadType, // Ensure you have a decorator to get the current user
    @Body() reqDto: CreateDeliveryRegionsReqDto, // Replace with actual DTO type
  ) {
    // Logic to create an area
    switch (payload.role) {
      case RoleEnum.MANAGEMENT:
        return this.deliveryRegionsService.create(reqDto, payload);
      default:
        throw new ForbiddenException(
          'You do not have permission to create a delivery region.',
        );
    }
  }

  @Put(':deliveryRegionId')
  async updateById(
    @Body() reqDto: UpdateDeliveryRegionsReqDto, // Replace with actual DTO type
    @Param('deliveryRegionId', ParseIntPipe) deliveryRegionId: number, // Ensure areaId is a number
  ) {
    // Logic to update an area
    return this.deliveryRegionsService.updateById(deliveryRegionId, reqDto);
  }

  @Roles(RoleEnum.STORE) // Ensure only ADMIN can access this route
  @ApiAuth({
    summary: 'Lấy danh sách khu vực shop đặt đơn',
    description: 'Lấy danh sách khu vực shop đặt đơn',
  })
  @Get()
  async getDeliveryRegions(
    @CurrentUser() payload: JwtPayloadType, // Ensure you have a decorator to get the current user
    @Query() reqDto: PageDeliveryRegionReqDto,
  ) {
    // Logic to get all areas
    return this.deliveryRegionsService.getPageDeliveryRegions(reqDto, payload);
  }

  @Get(':deliveryRegionId')
  async getById(
    @Param('deliveryRegionId', ParseIntPipe) deliveryRegionId: number, // Ensure areaId is a number
  ) {
    // Logic to get an area by ID
    return this.deliveryRegionsService.getById(deliveryRegionId);
  }

  @Delete(':deliveryRegionId')
  async softDelete(
    @Param('deliveryRegionId', ParseIntPipe) deliveryRegionId: number, // Ensure areaId is a number
  ) {
    // Logic to delete an area
    return this.deliveryRegionsService.softDelete(deliveryRegionId);
  }
}
