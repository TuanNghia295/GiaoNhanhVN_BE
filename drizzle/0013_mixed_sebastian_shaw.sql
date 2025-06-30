ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-30 06:03:11.592';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-30 06:03:11.592';--> statement-breakpoint
ALTER TABLE "transaction_logs" ADD COLUMN "area_id" integer;--> statement-breakpoint
ALTER TABLE "transaction_logs" DROP COLUMN "deliver_id";--> statement-breakpoint
ALTER TABLE "transaction_logs" DROP COLUMN "manager_id";