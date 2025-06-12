ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 10:06:25.449';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 10:06:25.449';--> statement-breakpoint
ALTER TABLE "banks" ADD COLUMN "area_id" integer;