ALTER TABLE "category_item_on_products" RENAME COLUMN "product_id" TO "productId";--> statement-breakpoint
ALTER TABLE "category_item_on_products" RENAME COLUMN "category_item_id" TO "categoryItemId";--> statement-breakpoint
ALTER TABLE "category_item_on_products" DROP CONSTRAINT "category_item_on_products_product_id_category_item_id_pk";--> statement-breakpoint
ALTER TABLE "category_item_on_products" ADD CONSTRAINT "category_item_on_products_productId_categoryItemId_pk" PRIMARY KEY("productId","categoryItemId");