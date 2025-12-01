CREATE INDEX "store_menus_store_id_deleted_at_idx" ON "store_menus" USING btree ("store_id","deleted_at");--> statement-breakpoint
CREATE INDEX "store_menus_store_id_deleted_at_index_created_at_idx" ON "store_menus" USING btree ("store_id","deleted_at","index","created_at");--> statement-breakpoint
CREATE INDEX "store_menus_store_id_deleted_at_name_idx" ON "store_menus" USING btree ("store_id","deleted_at","name");--> statement-breakpoint
CREATE INDEX "store_menus_store_id_deleted_at_created_at_idx" ON "store_menus" USING btree ("store_id","deleted_at","created_at");