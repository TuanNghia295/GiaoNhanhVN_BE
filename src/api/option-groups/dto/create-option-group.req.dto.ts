import { CreateOptionGroupOptionReqDto } from '@/api/option-groups/dto/create-option-group-option.req.dto';
import {
  BooleanFieldOptional,
  ClassField,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CreateOptionGroupReqDto {
  @NumberFieldOptional({
    description: 'ID của option group khi cập nhật (để diff theo ID)',
  })
  id?: number;

  @StringField({
    maxLength: 100,
  })
  name!: string;

  @StringFieldOptional({
    maxLength: 150,
  })
  displayName?: string;

  @BooleanFieldOptional()
  isRequired?: boolean = true;

  @NumberFieldOptional()
  minSelect?: number = 1;

  @NumberFieldOptional()
  maxSelect?: number = 1;

  @NumberFieldOptional()
  orderIndex?: number;

  @ClassField(() => CreateOptionGroupOptionReqDto)
  options!: CreateOptionGroupOptionReqDto[];
}
