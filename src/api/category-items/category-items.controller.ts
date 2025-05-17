import { CategoryItemResDto } from '@/api/category-items/dto/category-item.res.dto';
import { ApiPublic } from '@/decorators/http.decorators';
import { Controller, Get, Query } from '@nestjs/common';
import { CategoryItemsService } from './category-items.service';

@Controller('category-items')
export class CategoryItemsController {
  constructor(private readonly categoryItemsService: CategoryItemsService) {}

  @ApiPublic({
    summary: 'Lấy danh sách danh mục con theo id danh mục cha',
    isPaginated: false,
    type: CategoryItemResDto,
  })
  @Get()
  async getCategoryItems(
    @Query('category_id') categoryId: number,
  ): Promise<CategoryItemResDto[]> {
    return await this.categoryItemsService.getCategoryItems(categoryId);
  }
}
