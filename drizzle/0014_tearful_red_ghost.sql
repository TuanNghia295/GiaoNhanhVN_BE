ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 14:19:26.506';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 14:19:26.506';--> statement-breakpoint
CREATE INDEX "stores_name_idx" ON "stores" USING btree ("name");--> statement-breakpoint
CREATE INDEX "stores_location_idx" ON "stores" USING btree ("location");