ALTER TABLE "delivers" ALTER COLUMN "rating" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "delivers" ALTER COLUMN "point" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-17 16:30:16.418';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-17 16:30:16.418';