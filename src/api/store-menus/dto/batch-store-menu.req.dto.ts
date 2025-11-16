import {
  ClassField,
  EnumField,
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export enum StoreMenuActionEnum {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SORT = 'sort',
}

export class StoreMenuBatchItemReqDto {
  @EnumField(() => StoreMenuActionEnum, { enumName: 'StoreMenuActionEnum' })
  action: StoreMenuActionEnum;

  @NumberFieldOptional({
    int: true,
    description: 'Id của menu (bắt buộc với action = update|delete)',
  })
  id?: number;

  @StringFieldOptional({
    description: 'Tên menu (bắt buộc với action = create|update)',
  })
  name?: string;

  @NumberFieldOptional({
    int: true,
    description: 'Thứ tự menu (bắt buộc với action = sort)',
  })
  index?: number;
}

export class StoreMenuBatchReqDto {
  @ClassField(() => StoreMenuBatchItemReqDto, { isArray: true })
  items: StoreMenuBatchItemReqDto[];
}
