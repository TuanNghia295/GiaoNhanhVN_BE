import { WrapperType } from '@/common/types/types';
import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { StoreRequestStatusEnum } from '@/database/schemas/store-request.schema';
import { ClassField, EnumField } from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';
import { UserResDto } from '../../users/dto/user.res.dto';

export class StoreRequestResDto extends AbstractResDto {
  @ClassField(() => UserResDto)
  @Expose()
  user?: WrapperType<UserResDto>;

  @EnumField(() => StoreRequestStatusEnum)
  status: StoreRequestStatusEnum;
}
