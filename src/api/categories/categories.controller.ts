import { CategoryResDto } from '@/api/categories/dto/category.res.dto';
import { ApiPublic } from '@/decorators/http.decorators';
import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiPublic({
    summary: 'Lấy danh sách danh mục lớn của app [Public]',
    isPaginated: false,
    type: CategoryResDto,
  })
  @Get()
  async getCategories(): Promise<CategoryResDto[]> {
    return await this.categoriesService.getCategories();
  }
}
