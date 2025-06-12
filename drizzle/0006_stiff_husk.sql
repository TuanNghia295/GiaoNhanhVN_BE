ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 10:20:52.095';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 10:20:52.095';--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "best_seller" varchar(255);