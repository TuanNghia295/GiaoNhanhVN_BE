ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-30 08:21:22.831';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-30 08:21:22.831';--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "is_recommended" boolean DEFAULT false NOT NULL;