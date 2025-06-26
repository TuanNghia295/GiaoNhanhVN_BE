DROP INDEX "orders_status_index";--> statement-breakpoint
DROP INDEX "orders_user_id_index";--> statement-breakpoint
DROP INDEX "orders_deliver_id_index";--> statement-breakpoint
DROP INDEX "orders_store_id_index";--> statement-breakpoint
DROP INDEX "orders_area_id_index";--> statement-breakpoint
DROP INDEX "orders_created_at_index";--> statement-breakpoint
DROP INDEX "orders_type_index";--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-26 06:31:36.191';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-26 06:31:36.191';--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_deliver_id_idx" ON "orders" USING btree ("deliver_id");--> statement-breakpoint
CREATE INDEX "orders_area_status_created_idx" ON "orders" USING btree ("area_id","status","created_at");--> statement-breakpoint
CREATE INDEX "orders_store_status_idx" ON "orders" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_type_idx" ON "orders" USING btree ("type");