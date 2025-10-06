ALTER TABLE "order_details"
ADD COLUMN "user_used" integer[] DEFAULT '{}';
--> statement-breakpoint