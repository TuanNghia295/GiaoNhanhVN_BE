ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-16 09:09:10.955';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-16 09:09:10.955';--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "is_recommended" boolean DEFAULT false NOT NULL;