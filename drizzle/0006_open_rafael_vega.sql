ALTER TABLE "orders" ALTER COLUMN "delivery_income_tax" SET DATA TYPE numeric(15, 3);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "total_product_tax" SET DATA TYPE numeric(15, 3);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "night_fee" SET DATA TYPE numeric(15, 3);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payfor_shop" SET DATA TYPE numeric(15, 3);--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-07-07 01:28:58.162';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-07-07 01:28:58.162';