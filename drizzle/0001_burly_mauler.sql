ALTER TABLE "locations" DROP CONSTRAINT "locations_deliver_id_unique";--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-30 08:17:49.486';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-30 08:17:49.486';