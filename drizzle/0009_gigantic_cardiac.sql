ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 10:24:28.127';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 10:24:28.127';--> statement-breakpoint
ALTER TABLE "voucher_usages" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "voucher_usages" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "voucher_usages" ADD COLUMN "id" integer;--> statement-breakpoint
ALTER TABLE "voucher_usages" ADD COLUMN "updated_at" timestamp;