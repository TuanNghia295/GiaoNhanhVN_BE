ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 10:28:08.425';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 10:28:08.425';--> statement-breakpoint
ALTER TABLE "voucher_usages" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "voucher_usages" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" ADD COLUMN "id" integer;--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" ADD COLUMN "created_at" timestamp;--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "voucher_usages" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "voucher_usages" DROP COLUMN "updated_at";