ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-13 02:16:27.612';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-13 02:16:27.612';--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "address" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE stores
    ALTER COLUMN best_seller TYPE INTEGER
        USING best_seller::INTEGER;
