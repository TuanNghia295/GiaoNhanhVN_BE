import { Exclude, Expose } from 'class-transformer';
import { UserResDto } from 'src/api/users/dto/user.res.dto';
import { AbstractResDto } from 'src/database/dto/abstract.res.dto';
import {
  ClassField,
  NumberField,
  NumberFieldOptional,
} from 'src/decorators/field.decorators';

@Exclude()
export class RatingsResDto extends AbstractResDto {
  @NumberField()
  @Expose()
  orderId: number;

  @NumberFieldOptional()
  @Expose()
  storeId?: number;

  @NumberFieldOptional()
  @Expose()
  deliverId?: number;

  @NumberFieldOptional()
  @Expose()
  storeRate?: number;

  @NumberFieldOptional()
  @Expose()
  deliverRate?: number;

  @NumberField()
  @Expose()
  userId: number;

  @ClassField(() => UserResDto)
  @Expose()
  userComment: UserResDto;
}
