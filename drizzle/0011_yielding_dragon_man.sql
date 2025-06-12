ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 10:30:18.706';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 10:30:18.706';--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "used_count" integer DEFAULT 0 NOT NULL;