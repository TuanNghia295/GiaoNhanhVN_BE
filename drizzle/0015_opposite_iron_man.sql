ALTER TABLE "products" ADD COLUMN "quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "end_date" timestamp;