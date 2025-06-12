ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 10:20:13.666';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 10:20:13.666';--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "rating" numeric(2, 1) DEFAULT 0;