ALTER TABLE "service_fees" ALTER COLUMN "price_percent" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-07-08 03:08:24.178';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-07-08 03:08:24.178';