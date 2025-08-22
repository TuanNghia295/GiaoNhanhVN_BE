import { CreateProductReqDto } from '@/api/products/dto/create-product.req.dto';
import { LockProductReqDto } from '@/api/products/dto/lock-product.req.dto';
import { PageProductReqDto } from '@/api/products/dto/page-product-req.dto';
import { ProductResDto } from '@/api/products/dto/product.res.dto';
import { SortProductReqDto } from '@/api/products/dto/sort-product.req.dto';
import { UpdateProductReqDto } from '@/api/products/dto/update-product.req.dto';
import { UploadImageReqDto } from '@/api/products/dto/upload-image.req.dto';
import { RoleEnum } from '@/database/schemas';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiPublic({
    summary: 'Lấy danh sách sản phẩm [PUBLIC]',
    isPaginated: true,
    type: ProductResDto,
  })
  @Get()
  async getProducts(@Query() reqDto: PageProductReqDto) {
    return await this.productsService.getPageProducts(reqDto);
  }

  @ApiPublic({
    summary: 'Lấy thông tin sản phẩm',
    type: ProductResDto,
  })
  @Get(':productId')
  async getProductById(
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<ProductResDto> {
    return await this.productsService.getProductById(productId);
  }

  // api sắp xếp sản phẩm index
  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Sắp xếp sản phẩm [STORE]',
    type: ProductResDto,
  })
  @Patch('sort')
  async sortProducts(@Body() reqDto: SortProductReqDto) {
    return await this.productsService.sortProducts(reqDto);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Tạo sản phẩm [STORE]',
    type: ProductResDto,
  })
  @Post()
  async createProduct(@Body() reqDto: CreateProductReqDto): Promise<any> {
    return await this.productsService.create(reqDto);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Cập nhật thông tin sản phẩm',
    type: ProductResDto,
  })
  @Patch('update/:productId')
  async updateProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() reqDto: UpdateProductReqDto,
  ) {
    return await this.productsService.update(productId, reqDto);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Cập nhật ảnh sản phẩm [STORE]',
    type: ProductResDto,
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (req, file, callback) => {
        const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (fileTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type'), false);
        }
      },
      storage: memoryStorage(),
    }),
  )
  @Patch(':productId/image')
  async updateProductImage(
    @Param('productId') productId: number,
    @Body() _reqDto: UploadImageReqDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return await this.productsService.updateImageById(productId, image);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Xóa sản phẩm [STORE]',
    type: ProductResDto,
  })
  @Delete('delete/:productId')
  async softDelete(@Param('productId') productId: number) {
    return await this.productsService.softDelete(productId);
  }

  @Roles(RoleEnum.STORE)
  @ApiAuth({
    summary: 'Mở/Khóa sản phẩm',
    type: ProductResDto,
  })
  @Patch('lock/:productId')
  async lockProduct(@Param('productId') productId: number, @Body() reqDto: LockProductReqDto) {
    return await this.productsService.lock(productId, reqDto);
  }
}
