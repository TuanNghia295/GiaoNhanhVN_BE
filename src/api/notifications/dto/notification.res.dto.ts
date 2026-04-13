import { DateField, NumberField, StringField } from 'src/decorators/field.decorators';

export class NotificationResDto {
  @NumberField()
  id: number;

  @StringField()
  title: string;

  @StringField()
  body: string;

  @StringField()
  image: string;

  @DateField()
  createdAt: Date;
}
