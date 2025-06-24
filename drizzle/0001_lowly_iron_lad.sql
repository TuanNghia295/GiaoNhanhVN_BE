ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-24 06:05:37.719';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-24 06:05:37.719';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "night_fee" numeric(15, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rain_fee" numeric(15, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "is_holiday";