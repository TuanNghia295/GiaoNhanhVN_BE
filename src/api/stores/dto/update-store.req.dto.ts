import {
  BooleanFieldOptional,
  DateFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class UpdateStoreReqDto {
  @StringFieldOptional({
    maxLength: 100,
    minLength: 1,
  })
  name?: string;

  @StringFieldOptional()
  description?: string;

  @StringFieldOptional()
  address?: string;

  @StringFieldOptional({
    default: '0,0',
  })
  location?: string;

  @DateFieldOptional({
    format: 'HH:mm:ss',
    default: new Date(),
  })
  openTime?: Date;

  @DateFieldOptional({
    format: 'HH:mm:ss',
    default: new Date(),
  })
  closeTime?: Date;

  @DateFieldOptional({
    format: 'HH:mm:ss',
    default: new Date(),
  })
  openSecondTime?: Date;

  @DateFieldOptional({
    format: 'HH:mm:ss',
    default: new Date(),
  })
  closeSecondTime?: Date;

  @BooleanFieldOptional()
  isLocked?: boolean;

  @BooleanFieldOptional()
  status?: boolean;

  @NumberFieldOptional({ nullable: true })
  storeServiceFee?: number | null;
}
