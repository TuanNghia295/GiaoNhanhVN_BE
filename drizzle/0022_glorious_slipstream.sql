ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-04 12:34:30.226';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-04 12:34:30.226';--> statement-breakpoint
ALTER TABLE "delivery_regions" ADD COLUMN "area_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_regions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_night" boolean DEFAULT false NOT NULL;