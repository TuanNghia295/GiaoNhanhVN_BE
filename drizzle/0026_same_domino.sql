ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-14 02:00:10.001';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-14 02:00:10.001';--> statement-breakpoint
CREATE INDEX "store_menus_name_idx" ON "store_menus" USING btree ("name");--> statement-breakpoint
CREATE INDEX "store_menus_store_id_idx" ON "store_menus" USING btree ("store_id");