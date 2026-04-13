import { StringField } from '@/decorators/field.decorators';

export class CreateCommentInRatingDto {
  @StringField()
  comment: string;

  // @EnumField(() => CommentTypeEnum)
  // type: CommentTypeEnum;
}
