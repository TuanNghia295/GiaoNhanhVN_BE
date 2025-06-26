ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-26 06:41:57.307';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-26 06:41:57.307';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_income_tax" numeric(15, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total_product_tax" numeric(15, 2) DEFAULT 0 NOT NULL;