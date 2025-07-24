ALTER TABLE "vouchers" ADD COLUMN "percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "discount_type" varchar(50) DEFAULT 'FIXED_AMOUNT' NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" DROP COLUMN "max_order_value";