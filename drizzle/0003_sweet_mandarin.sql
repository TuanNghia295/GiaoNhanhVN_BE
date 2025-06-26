ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-26 06:11:03.866';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-26 06:11:03.866';--> statement-breakpoint
CREATE INDEX "products_category_item_id_idx" ON "products" USING btree ("category_item_id");--> statement-breakpoint
CREATE INDEX "products_store_menu_id_deleted_at_locked_idx" ON "products" USING btree ("store_menu_id","deleted_at","is_locked");--> statement-breakpoint
CREATE INDEX "products_store_menu_id_created_at_idx" ON "products" USING btree ("store_menu_id","created_at");--> statement-breakpoint
CREATE INDEX "store_menus_deleted_at_idx" ON "store_menus" USING btree ("deleted_at");