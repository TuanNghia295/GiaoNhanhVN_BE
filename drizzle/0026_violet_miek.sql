CREATE INDEX "order_details_order_id_idx" ON "order_details" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_details_product_id_idx" ON "order_details" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_details_option_id_idx" ON "order_details" USING btree ("option_id");