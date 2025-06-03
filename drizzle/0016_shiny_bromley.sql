ALTER TABLE "settings" ALTER COLUMN "night_fee" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "start_night_time" timestamp;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "end_night_time" timestamp;--> statement-breakpoint
-- ALTER TABLE "settings" ADD COLUMN "hotline" varchar(20) DEFAULT '' NOT NULL;--> statement-breakpoint
-- ALTER TABLE "settings" ADD COLUMN "fanpage" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "rain_fee" numeric(10, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "is_holiday";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "holiday_percent";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "rain_moring";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "rain_night";
