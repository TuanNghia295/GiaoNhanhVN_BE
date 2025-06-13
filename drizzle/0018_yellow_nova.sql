ALTER TABLE "bank_records" ALTER COLUMN "transaction_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-13 00:39:20.982';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-13 00:39:20.982';