import { UpdateOptionReqDto } from '@/api/options/dto/update-option.req.dto';
import { RoleEnum } from '@/database/schemas';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { OptionsService } from './options.service';

@Controller('options')
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Roles(RoleEnum.USER)
  @ApiAuth({
    description: 'Cập nhật tùy chọn sản phẩm',
  })
  @Patch(':optionId')
  async updateOptions(
    @Param('optionId', ParseIntPipe) optionId: number,
    @Body() reqDto: UpdateOptionReqDto,
  ) {
    return this.optionsService.updateById(optionId, reqDto);
  }
}
