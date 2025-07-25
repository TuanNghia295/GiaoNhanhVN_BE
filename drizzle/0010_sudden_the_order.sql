ALTER TABLE "orders" ADD COLUMN "total_voucher_store" numeric(15, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total_voucher_app" numeric(15, 2) DEFAULT 0 NOT NULL;