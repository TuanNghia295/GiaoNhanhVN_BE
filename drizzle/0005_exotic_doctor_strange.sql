CREATE TABLE "category_item_on_products" (
	"product_id" integer NOT NULL,
	"category_item_id" integer NOT NULL,
	CONSTRAINT "category_item_on_products_product_id_category_item_id_pk" PRIMARY KEY("product_id","category_item_id")
);
