CREATE INDEX "idx_extras_product_id" ON "extras" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_etod_extra_id" ON "extras_to_order_details" USING btree ("extra_id");--> statement-breakpoint
CREATE INDEX "idx_etod_order_detail_id" ON "extras_to_order_details" USING btree ("order_detail_id");--> statement-breakpoint
CREATE INDEX "idx_options_product_id" ON "options" USING btree ("product_id");