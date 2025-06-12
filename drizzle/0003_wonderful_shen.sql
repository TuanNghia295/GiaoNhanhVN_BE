ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 10:09:49.675';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 10:09:49.675';--> statement-breakpoint
ALTER TABLE "comments_to_ratings" ADD COLUMN "id" integer;