import { WrapperType } from 'src/common/types/types';
import {
  ClassFieldOptional,
  NumberField,
  NumberFieldOptional,
} from 'src/decorators/field.decorators';

export class CommentDto {
  @NumberField()
  id: number;
}

export class CreateRatingReqDto {
  @NumberField()
  orderId: number;

  @NumberFieldOptional()
  ratingStore: number;

  @NumberFieldOptional()
  storeId: number;

  @ClassFieldOptional(() => CommentDto, {
    isArray: true,
  })
  storeComment: CommentDto[];

  @NumberFieldOptional()
  ratingDeliver: number;

  @NumberFieldOptional()
  deliverId: number;

  @ClassFieldOptional(() => CommentDto, { isArray: true })
  deliverComment: WrapperType<CommentDto>[];
}
