import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UploadImageOrderReqDto {
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Upload nhiều ảnh',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: Express.Multer.File[];
}
