ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-26 06:27:36.730';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-26 06:27:36.730';--> statement-breakpoint
CREATE INDEX "orders_code_index" ON "orders" USING btree ("code");--> statement-breakpoint
CREATE INDEX "orders_status_index" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_user_id_index" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_deliver_id_index" ON "orders" USING btree ("deliver_id");--> statement-breakpoint
CREATE INDEX "orders_store_id_index" ON "orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "orders_area_id_index" ON "orders" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_index" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_type_index" ON "orders" USING btree ("type");