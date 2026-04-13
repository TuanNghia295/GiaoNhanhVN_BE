import { BooleanField } from '../../../decorators/field.decorators';

export class DeleteProductReqDto {
  @BooleanField()
  deletedAt: boolean;
}
