import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateRatingReqDto } from '@/api/ratings/dto/create-rating.req.dto';
import { RatingsResDto } from '@/api/ratings/dto/rating.req.dto';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Roles(RoleEnum.USER)
  @Post()
  @ApiAuth({
    summary: 'Tạo đánh giá',
    type: RatingsResDto,
  })
  async create(
    @Body() reqDto: CreateRatingReqDto,
    @CurrentUser() payload: JwtPayloadType,
  ) {
    return await this.ratingsService.create(reqDto, payload);
  }

  @ApiPublic({
    summary: 'Lấy danh sách đánh giá của một cửa hàng',
    type: RatingsResDto,
  })
  @Get('store/:storeId')
  async getRatingsByStoreId(@Param('storeId', ParseIntPipe) storeId: number) {
    return await this.ratingsService.getRatingsByStoreId(storeId);
  }
}
