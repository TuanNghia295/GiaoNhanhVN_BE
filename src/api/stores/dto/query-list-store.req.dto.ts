import {
  NumberFieldOptional,
  StringFieldOptional,
} from 'src/decorators/field.decorators';

export class QueryListStore {
  @StringFieldOptional()
  input?: string;

  @NumberFieldOptional()
  areaId?: number;
}
