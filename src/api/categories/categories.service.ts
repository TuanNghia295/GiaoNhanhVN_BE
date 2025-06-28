import { CategoryResDto } from '@/api/categories/dto/category.res.dto';
import { DRIZZLE } from '@/database/global';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getCategories() {
    const result = await this.db.query.categories.findMany({
      with: {
        categoryItems: true,
      },
    });
    // sắp xếp theo thứ tự Đồ ăn, Vận chuyển , Shop lhacs , tiện ích
    const codes = ['DA', 'VC', 'SK', 'TI'];
    const sortedResult = result.sort((a, b) => {
      return codes.indexOf(a.code) - codes.indexOf(b.code);
    });
    return sortedResult.map((entity) => plainToInstance(CategoryResDto, entity));
  }
}
