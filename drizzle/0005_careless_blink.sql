ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-30 09:52:02.151';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-30 09:52:02.151';--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_deliver_id_unique" UNIQUE("deliver_id");