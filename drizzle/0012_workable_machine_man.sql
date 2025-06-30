ALTER TABLE "point_transactions" RENAME TO "transaction_logs";--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-30 03:10:58.470';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-30 03:10:58.470';