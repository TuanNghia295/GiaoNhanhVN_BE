import { UpdateExtraReqDto } from '@/api/extras/dto/update-extra.req.dto';
import { RoleEnum } from '@/database/schemas';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ExtrasService } from './extras.service';

@Controller('extras')
export class ExtrasController {
  constructor(private readonly extrasService: ExtrasService) {}

  @Roles(RoleEnum.USER)
  @ApiAuth({
    description: 'Cập nhật extra theo ID',
  })
  @Patch(':extraId')
  async updateOptions(
    @Param('extraId', ParseIntPipe) extraId: number,
    @Body() reqDto: UpdateExtraReqDto,
  ) {
    return this.extrasService.updateById(extraId, reqDto);
  }
}
