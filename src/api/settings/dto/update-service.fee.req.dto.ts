import { UpdateDistanceSettingReqDto } from '@/api/settings/dto/update-distance-setting.req.dto';
import { WrapperType } from 'src/common/types/types';
import {
  ClassFieldOptional,
  NumberField,
  NumberFieldOptional,
} from 'src/decorators/field.decorators';

export class UpdateServiceFeeReqDto {
  @NumberFieldOptional()
  price: number;

  @NumberFieldOptional()
  pricePct: number;

  @NumberFieldOptional()
  userServiceFee: number;

  @NumberFieldOptional()
  userServiceFeePct: number;

  @NumberFieldOptional()
  deliverFee: number;

  @NumberFieldOptional()
  deliverFeePct: number;

  @NumberFieldOptional()
  distancePct: number;

  @NumberField()
  id: number;

  @ClassFieldOptional(() => UpdateDistanceSettingReqDto, {
    isArray: true,
  })
  distances: WrapperType<UpdateDistanceSettingReqDto>[];
}
