import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { SortStoreMenuReqDto } from '@/api/products/dto/sort-store-menu.req.dto';
import { CreateStoreMenuReqDto } from '@/api/store-menus/dto/create-store-menu-req.dto';
import { PageStoreMenuReqDto } from '@/api/store-menus/dto/page-store-menu-req.dto';
import { StoreMenuResDto } from '@/api/store-menus/dto/store-menu.res.dto';
import { UpdateStoreMenuReqDto } from '@/api/store-menus/dto/update-store-menu-req.dto';
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
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { StoreMenusService } from './store-menus.service';

@Controller('store-menus')
export class StoreMenusController {
  constructor(private readonly storeMenusService: StoreMenusService) {}

  @ApiAuth({
    summary: 'Lấy danh sách menu của cửa hàng theo storeId [PUBLIC]',
    type: StoreMenuResDto,
  })
  @Get()
  async getStoreMenus(
    @Query() reqDto: PageStoreMenuReqDto,
    @CurrentUser() payload: JwtPayloadType,
  ) {
    return await this.storeMenusService.getPageStoreMenus(reqDto, payload.id);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Tạo menu cho cửa hàng [USER]',
    type: StoreMenuResDto,
  })
  @Post()
  async createStoreMenu(
    @Query('storeId', ParseIntPipe) storeId: number,
    @Body() dto: CreateStoreMenuReqDto,
  ) {
    return await this.storeMenusService.create(storeId, dto);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Sắp xếp lại thứ tự menu của cửa hàng [STORE]',
  })
  @Patch('sort')
  async sortStoreMenus(
    @Query('storeId', ParseIntPipe) storeId: number,
    @Body() reqDto: SortStoreMenuReqDto,
  ) {
    return await this.storeMenusService.sort(storeId, reqDto);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Chỉnh sửa menu cho cửa hàng [USER]',
    type: StoreMenuResDto,
  })
  @Patch()
  async updateStoreMenu(
    @CurrentUser() payload: JwtPayloadType,
    @Query('menuId', ParseIntPipe) menuId: number,
    @Body() reqDto: UpdateStoreMenuReqDto,
  ) {
    return await this.storeMenusService.update(payload, menuId, reqDto);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Xóa menu của cửa hàng theo và menuId',
    type: StoreMenuResDto,
  })
  @Delete(':id')
  async deleteStoreMenu(
    @Query('storeId', ParseIntPipe) storeId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.storeMenusService.softDelete(storeId, id);
  }
}
