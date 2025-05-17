import { CategoryItemResDto } from '@/api/category-items/dto/category-item.res.dto';
import { DRIZZLE } from '@/database/global';
import { categoryItems } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { eq } from 'drizzle-orm';

@Injectable()
export class CategoryItemsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getCategoryItems(categoryId: number) {
    const entities = await this.db
      .select()
      .from(categoryItems)
      .where(eq(categoryItems.categoryId, categoryId))
      .execute();
    return entities.map((entity) =>
      plainToInstance(CategoryItemResDto, entity),
    );
  }

  async existById(categoryItemId: number): Promise<{
    categoryItemId: number;
  } | null> {
    return await this.db
      .select({
        categoryItemId: categoryItems.id,
      })
      .from(categoryItems)
      .where(eq(categoryItems.id, categoryItemId))
      .then((result) => result[0] || null);
  }
}
