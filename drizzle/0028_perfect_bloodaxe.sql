ALTER TABLE "products" ADD COLUMN "used_sale_quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "sale_quantity";