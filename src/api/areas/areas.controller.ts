import { AreaResDto } from '@/api/areas/dto/area.res.dto';
import { CreateAreaReqDto } from '@/api/areas/dto/create-area.req.dto';
import { UpdateAreaReqDto } from '@/api/areas/dto/update-area.req.dto';
import { UpdatePointAreaReqDto } from '@/api/areas/dto/update-point-area.req.dto';
import { RoleEnum } from '@/database/schemas';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AreasService } from './areas.service';

@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Tạo mới một khu vực [ADMIN]',
    type: AreaResDto,
  })
  async create(@Body() dto: CreateAreaReqDto) {
    return this.areasService.create(dto);
  }

  @Put(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Cập nhật khu vực (Admin)',
    type: UpdatePointAreaReqDto,
  })
  async update(@Param('id') areaId: number, @Body() reqDto: UpdateAreaReqDto) {
    return this.areasService.update(areaId, reqDto);
  }

  @Get()
  @ApiPublic({
    summary: 'Lấy danh sách tất cả khu vực [PUBLIC]',
    type: AreaResDto,
  })
  async getAreas() {
    return this.areasService.getAreas();
  }

  @Get(':id')
  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Lấy danh sách khu vực theo id(all role)',
    type: AreaResDto,
  })
  async getAreaById(@Param('id') id: number) {
    return this.areasService.getById(id);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Xóa khu vực(admin)',
    type: AreaResDto,
  })
  async remove(@Param('id') areaId: number) {
    return await this.areasService.remove(areaId);
  }
}
