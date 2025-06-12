ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 10:18:22.584';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 10:18:22.584';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "hotline" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "fanpage" DROP NOT NULL;