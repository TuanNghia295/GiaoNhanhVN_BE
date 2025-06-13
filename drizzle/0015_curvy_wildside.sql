ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 15:06:28.262';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 15:06:28.262';--> statement-breakpoint
CREATE INDEX "products_name_idx" ON "products" USING btree ("name");