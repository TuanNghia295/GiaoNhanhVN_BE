import { BannerResDto } from '@/api/banners/dto/banner.res.dto';
import { CreateBannerReqDto } from '@/api/banners/dto/create-banner.req.dto';
import { PageBannerReqDto } from '@/api/banners/dto/page-banner-req.dto';
import { UploadBannerReqDto } from '@/api/banners/dto/upload-banner.req.dto';
import { RoleEnum } from '@/database/schemas';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { BannersService } from './banners.service';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy danh sách banner (admin, management)',
    type: BannerResDto,
  })
  @Get('list')
  async getPageBanners(@Query() reqDto: PageBannerReqDto) {
    return await this.bannersService.getPageBanners(reqDto);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Tạo banner (admin, management)',
    type: BannerResDto,
  })
  @Post()
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
  async create(
    @UploadedFile() image: Express.Multer.File,
    @Body() reqDto: CreateBannerReqDto,
  ) {
    return await this.bannersService.create(reqDto, image);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Xóa banner [admin, management]',
  })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.remove(id);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Cập nhật banner (admin, management)',
  })
  @Patch(':id')
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
  async updateBanner(
    @Param('id', ParseIntPipe) id: number,
    @Body() reqDto: UploadBannerReqDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return await this.bannersService.update(id, reqDto, image);
  }

  @ApiPublic({
    summary: 'Lấy banner theo id',
  })
  @Get('detail/:id')
  async getBannerById(@Param('id', ParseIntPipe) id: number) {
    return await this.bannersService.getBannerById(id);
  }

  @ApiPublic({
    summary: 'Lấy danh sách banner theo type',
    type: BannerResDto,
  })
  @Get(':type/:areaId')
  async getBannersWithType(
    @Param('areaId', ParseIntPipe) areaId: number,
    @Param('type') type: string,
  ) {
    return await this.bannersService.getBannersWithTypeAreaId(areaId, type);
  }
}
