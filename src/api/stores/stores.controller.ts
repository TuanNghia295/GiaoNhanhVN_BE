import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { LockStoreReqDto } from '@/api/stores/dto/lock-store.req.dto';
import { PageStoreManagerReqDto } from '@/api/stores/dto/page-store-manager.req.dto';
import { PageStoreReqDto } from '@/api/stores/dto/page-store.req.dto';
import { QueryListStore } from '@/api/stores/dto/query-list-store.req.dto';
import { SearchPageStoresReqDto } from '@/api/stores/dto/search-page-stores-req.dto';
import { StoreResDto } from '@/api/stores/dto/store.res.dto';
import { UpdateAvatarReqDto } from '@/api/stores/dto/update-avatar.req.dto';
import { UpdateBackgroundReqDto } from '@/api/stores/dto/update-background.req.dto';
import { UpdateStatusStoreReqDto } from '@/api/stores/dto/update-status-store.req.dto';
import { UpdateStoreReqDto } from '@/api/stores/dto/update-store.req.dto';
import { RoleEnum } from '@/database/schemas';
import { AuthOptional } from '@/decorators/auth-optional.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @ApiPublic()
  @ApiAuth({
    summary: 'Lấy danh sách cửa hàng [PUBLIC]',
    isPaginated: true,
    type: StoreResDto,
  })
  @Get('test')
  async getAllStores() {
    // return await this.storesService.checkStoreActive(14);
  }

  @AuthOptional()
  @ApiAuth({
    summary: 'Lấy danh sách cửa hàng (optional auth)',
  })
  @Get()
  async getPageStores(@CurrentUser() payload: JwtPayloadType, @Query() reqDto: PageStoreReqDto) {
    return await this.storesService.getPageStores(reqDto, payload);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy danh sách cửa hàng theo quản lý (ADMIN, MANAGEMENT)',
    type: StoreResDto,
    isPaginated: true,
  })
  @Get('manager')
  async getPageStoresByManager(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PageStoreManagerReqDto,
  ) {
    return await this.storesService.getPageStoresByManager(reqDto, payload);
  }

  @AuthOptional()
  @ApiAuth({
    summary:
      'Lấy danh sách 15 cửa  hàng săp xếp từ gần đến xa và có số lượng voucher shop lớn nhất',
    type: StoreResDto,
  })
  @Get('nearby/with-most-vouchers')
  async getNearbyStoresWithMostVouchers(@Query('origins') origins: string) {
    return await this.storesService.getNearbyStoresWithMostVouchers(origins);
  }

  @AuthOptional()
  @ApiAuth({
    summary:
      'Random 15 sản phẩm từ 15 cửa hàng khác nhau, sắp xếp từ gần đến xa và có số lượng voucher shop lớn nhất',
    type: StoreResDto,
  })
  @Get('nearby/products-with-most-vouchers-random')
  async getNearbyProductsWithMostVouchersRandom(@Query('origins') origins: string) {
    return await this.storesService.getNearbyProductsWithMostOrdersRandom(origins);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Cập nhật trạng thái cửa hàng (STORE, ADMIN , MANAGEMENT)',
  })
  @Put('lock')
  async lockStore(@Body() reqDto: LockStoreReqDto) {
    return await this.storesService.lock(reqDto);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Ghi nhận cửa hàng đã xem gần đây tối đa 15 cửa hàng',
  })
  @Put('recently-viewed')
  async recentlyViewedStore(
    @CurrentUser() payload: JwtPayloadType,
    @Query('storeId', ParseIntPipe) storeId: number,
  ) {
    return await this.storesService.recentlyViewedStore(payload.id, storeId);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Lấy danh sách 15 cửa hàng đã xem gần đây',
  })
  @Get('recently-viewed')
  async getRecentlyViewedStores(@CurrentUser() payload: JwtPayloadType) {
    return this.storesService.getRecentlyViewedStores(payload.id);
  }

  @ApiPublic({
    summary: 'Lấy thông tin cửa hàng theo id (public)',
    type: StoreResDto,
  })
  @Get('detail/:id')
  async getStoreById(@Param('id', ParseIntPipe) id: number) {
    return await this.storesService.getStoreById(id);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Cập nhật thông tin cửa hàng theo id (ADMIN)',
    type: StoreResDto,
  })
  @Patch('update/:id')
  async updateInfoStoreWithId(
    @Param('id', ParseIntPipe) storeId: number,
    @Body() reqDto: UpdateStoreReqDto,
  ) {
    return await this.storesService.update(storeId, reqDto);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Cập nhật Trạng thái hoạt động của cửa hàng',
    type: StoreResDto,
  })
  @Put('status')
  async updateStatusStore(
    @CurrentUser() payload: JwtPayloadType,
    @Body() dto: UpdateStatusStoreReqDto,
  ) {
    switch (payload.role) {
      case RoleEnum.STORE:
        return await this.storesService.updateByUserId(payload.id, dto);
      default:
        // không có quền cập nhật
        throw new ForbiddenException();
    }
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Cập nhật background cửa hàng (STORE)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('background', {
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
  @Patch('background')
  async updateBackground(
    @CurrentUser() payload: JwtPayloadType,
    @Body() _reqDto: UpdateBackgroundReqDto,
    @UploadedFile() background: Express.Multer.File,
  ) {
    switch (payload.role) {
      case RoleEnum.STORE:
        return await this.storesService.updateBackgroundByUserId(payload.id, background);
      default:
        // không có quền cập nhật
        throw new ForbiddenException();
    }
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Cập nhật avatar cửa hàng (STORE)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('avatar', {
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
  @Patch('avatar')
  async updateAvatar(
    @CurrentUser() payload: JwtPayloadType,
    @Body() _reqDto: UpdateAvatarReqDto,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    switch (payload.role) {
      case RoleEnum.STORE:
        return await this.storesService.updateAvatarByUserId(payload.id, avatar);
      default:
        // không có quền cập nhật
        throw new ForbiddenException();
    }
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Cập nhật thông tin cửa hàng (STORE)',
    type: StoreResDto,
  })
  @Patch()
  async updateInfoStore(@CurrentUser() payload: JwtPayloadType, @Body() reqDto: UpdateStoreReqDto) {
    switch (payload.role) {
      case RoleEnum.STORE:
        return await this.storesService.updateByUserId(payload.id, reqDto);
      default:
        // không có quền cập nhật
        throw new ForbiddenException();
    }
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Cập nhật Trạng thái hoạt động của cửa hàng',
    type: StoreResDto,
  })
  @Put('status')
  async updateStatus(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: UpdateStatusStoreReqDto,
  ) {
    switch (payload.role) {
      case RoleEnum.STORE:
        return await this.storesService.updateByUserId(payload.id, reqDto);
      default:
        // không có quền cập nhật
        throw new ForbiddenException();
    }
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Lấy thông tin cửa hàng của tôi',
    type: StoreResDto,
  })
  @Get('me')
  async getMyStore(@CurrentUser() payload: JwtPayloadType) {
    return await this.storesService.getStoreByUserId(payload.id);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy danh sách cửa hàng để hiển thị trong list (admin)',
    type: StoreResDto,
  })
  @Get('manager/list')
  async getStoresForList(@CurrentUser() payload: JwtPayloadType, @Query() reqDto: QueryListStore) {
    return await this.storesService.getStoresForList(reqDto, payload);
  }

  @Get('search')
  @ApiPublic({
    summary: 'Tìm kiếm sản phẩm kèm theo thông tin store (public)',
    type: StoreResDto,
  })
  async searchStore(@Query() reqDto: SearchPageStoresReqDto) {
    return await this.storesService.searchStore(reqDto);
  }
}
