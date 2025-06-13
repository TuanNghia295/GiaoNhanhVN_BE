ALTER TABLE "bank_records" DROP CONSTRAINT "bank_records_author_id_unique";--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-13 00:38:37.498';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-13 00:38:37.498';--> statement-breakpoint
ALTER TABLE "bank_records" DROP COLUMN "author_id";