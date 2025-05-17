ALTER TABLE "products" ALTER COLUMN "name" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "name_normalized" varchar;