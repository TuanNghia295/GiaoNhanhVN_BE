ALTER TABLE "banners" ALTER COLUMN "link_store" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "store_id" integer;