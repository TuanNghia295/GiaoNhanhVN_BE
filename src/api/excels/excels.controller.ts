import { ImportProductReqDto } from '@/api/excels/dto/import-product.req.dto';
import { ApiPublic } from '@/decorators/http.decorators';
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ExcelsService } from './excels.service';

@Controller('excel')
export class ExcelsController {
  constructor(private readonly excelsService: ExcelsService) {}

  @ApiPublic({
    summary: 'import sản phẩm từ file excel',
    description: 'import sản phẩm từ file excel',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
          return cb(
            new BadRequestException('Only .xlsx or .xls files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @Post('import-product')
  async importProduct(
    @Body() _reqDto: ImportProductReqDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.excelsService.importProduct(file);
  }
}
