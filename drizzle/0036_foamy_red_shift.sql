ALTER TABLE "banners" ADD COLUMN "link_store" integer;--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "number_stores";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "number_radius";