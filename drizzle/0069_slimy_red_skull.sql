ALTER TABLE "areas" ALTER COLUMN "point" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "vouchers" ALTER COLUMN "status" SET DEFAULT 'INACTIVE';--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" DROP COLUMN "updated_at";