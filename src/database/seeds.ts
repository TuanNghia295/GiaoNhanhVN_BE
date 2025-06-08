import { config } from 'dotenv';
import 'dotenv/config';
import { eq, isNull } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';
import { CommentTypeEnum, managers, RoleEnum, settings } from './schemas';

config({ path: `.env.${process.env.NODE_ENV}` });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;

async function main() {
  const existAmin = await db
    .select()
    .from(managers)
    .where(eq(managers.role, RoleEnum.ADMIN));

  if (existAmin.length === 0) {
    await db.insert(managers).values({
      username: 'admin',
      role: RoleEnum.ADMIN,
      phone: '0123456789',
      password: '123456',
    });
  }

  const existSettingsAdmin = await db
    .select()
    .from(settings)
    .where(isNull(settings.areaId));
  if (existSettingsAdmin.length === 0) {
    await db.insert(settings).values({
      areaId: null,
    });
  }

  const listComments = await db.$count(schema.comments);
  if (listComments === 0) {
    await db.insert(schema.comments).values([
      {
        comment: 'Món ăn ngon',
        type: CommentTypeEnum.STORE,
      },
      {
        comment: 'Shop làm nhanh',
        type: CommentTypeEnum.STORE,
      },
      {
        comment: 'Đóng gói không kỹ',
        type: CommentTypeEnum.STORE,
      },
      {
        comment: 'Shop làm lâu',
        type: CommentTypeEnum.STORE,
      },
      {
        comment: 'Giao nhanh',
        type: CommentTypeEnum.DELIVER,
      },
      {
        comment: 'Nhiệt tình',
        type: CommentTypeEnum.DELIVER,
      },
      {
        comment: 'Thân thiện',
        type: CommentTypeEnum.DELIVER,
      },
      {
        comment: 'Nóng tính',
        type: CommentTypeEnum.DELIVER,
      },
      {
        comment: 'Khó chịu',
        type: CommentTypeEnum.DELIVER,
      },
      {
        comment: 'Giao chậm',
        type: CommentTypeEnum.DELIVER,
      },
    ]);
  }

  await db.transaction(async (tx) => {
    const categoryCount = await tx.$count(schema.categories);
    if (categoryCount === 0) {
      await tx.insert(schema.categories).values([
        {
          id: 1,
          name: 'Tiện Ích',
          code: 'TI',
        },
        {
          id: 2,
          name: 'Vận chuyển',
          code: 'VC',
        },
        {
          id: 3,
          name: 'Đồ ăn',
          code: 'DA',
        },
        {
          id: 4,
          name: 'Cửa hàng khác',
          code: 'SK',
        },
      ]);
    }

    const categoryItemCount = await tx.$count(schema.categoryItems);
    if (categoryItemCount === 0) {
      await tx.insert(schema.categoryItems).values([
        {
          id: 1,
          name: 'Trà Sữa',
          code: 'TS',
          categoryId: 3,
        },
        {
          id: 2,
          name: 'Đồ Uống',
          code: 'DU',
          categoryId: 3,
        },
        {
          id: 3,
          name: 'Đồ Ăn Nhanh',
          code: 'DAN',
          categoryId: 3,
        },
        {
          id: 4,
          name: 'Ăn vặt',
          code: 'AV',
          categoryId: 3,
        },
        {
          id: 5,
          name: 'Bữa Sáng',
          code: 'BS',
          categoryId: 3,
        },
        {
          id: 6,
          name: 'Bữa Trưa',
          code: 'BT',
          categoryId: 3,
        },
        {
          id: 7,
          name: 'Món Nhậu',
          code: 'MN',
          categoryId: 3,
        },
        {
          id: 8,
          name: 'Món Khác',
          code: 'MK',
          categoryId: 3,
        },
        //Vận chuyển
        {
          id: 9,
          name: 'Giao Hàng',
          code: 'GH',
          categoryId: 2,
        },
        {
          id: 10,
          name: 'Xe Ôm',
          code: 'XO',
          categoryId: 2,
        },
        //Cửa hàng khác
        {
          id: 11,
          name: 'Mỹ Phẩm',
          code: 'MP',
          categoryId: 4,
        },
        {
          id: 12,
          name: 'Phụ Kiện',
          code: 'PK',
          categoryId: 4,
        },
        {
          id: 13,
          name: 'Pet',
          code: 'PT',
          categoryId: 4,
        },
        {
          id: 14,
          name: 'Mẹ và Bé',
          code: 'MB',
          categoryId: 4,
        },
        {
          id: 15,
          name: 'Tạp Hóa',
          code: 'TH',
          categoryId: 4,
        },
      ]);
    }
  });
}

main()
  .then(() => {
    console.log('insert database successfully');
  })
  .catch((err) => {
    console.error(err);
  });
