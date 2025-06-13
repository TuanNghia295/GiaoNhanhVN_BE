ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-13 13:42:35.000';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-13 13:42:35.000';--> statement-breakpoint
CREATE INDEX "products_store_id_idx" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "stores_user_id_idx" ON "stores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stores_area_id_idx" ON "stores" USING btree ("area_id");