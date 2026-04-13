DROP INDEX "products_name_idx";--> statement-breakpoint
DROP INDEX "products_store_id_idx";--> statement-breakpoint
DROP INDEX "products_category_item_id_idx";--> statement-breakpoint
DROP INDEX "products_store_menu_id_deleted_at_locked_idx";--> statement-breakpoint
DROP INDEX "products_store_menu_id_created_at_idx";--> statement-breakpoint
CREATE INDEX "idx_products_store_id" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_products_category_item_id" ON "products" USING btree ("category_item_id");--> statement-breakpoint
CREATE INDEX "idx_products_store_menu_id" ON "products" USING btree ("store_menu_id");