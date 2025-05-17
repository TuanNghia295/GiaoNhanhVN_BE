import { AbstractResDto } from '@/database/dto/abstract.res.dto';
import { TransactionStatus, TransactionType } from '@/database/schemas';
import {
  ClassField,
  EnumField,
  NumberField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { AreaResDto } from '../../areas/dto/area.res.dto';
import { DeliverResDto } from '../../delivers/dto/deliver.res.dto';
import { ManagerResDto } from '../../managers/dto/manager.res.dto';

@Exclude()
export class TransactionResDto extends AbstractResDto {
  @EnumField(() => TransactionType)
  @Expose()
  type: TransactionType;

  @NumberField()
  @Expose()
  amount: number;

  @EnumField(() => TransactionStatus)
  @Expose()
  status: TransactionStatus;

  @NumberField()
  @Expose()
  approvedBy: number;

  @NumberField()
  @Expose()
  areaId: number;

  @ClassField(() => ManagerResDto)
  @Expose()
  manager: ManagerResDto;

  @ClassField(() => AreaResDto)
  @Expose()
  area: AreaResDto;

  @ClassField(() => DeliverResDto)
  @Expose()
  deliver: DeliverResDto;
}
