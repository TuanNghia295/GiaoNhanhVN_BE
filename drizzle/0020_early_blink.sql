CREATE INDEX "idx_products_store_menu_id_deleted_at_locked" ON "products" USING btree ("store_menu_id","deleted_at","is_locked");--> statement-breakpoint
CREATE INDEX "idx_products_index_created_at" ON "products" USING btree ("index","created_at");--> statement-breakpoint
CREATE INDEX "idx_products_deleted_at" ON "products" USING btree ("deleted_at");