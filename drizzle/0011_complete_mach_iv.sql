ALTER TABLE "orders" ADD COLUMN "coin_used" numeric(15, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "count";