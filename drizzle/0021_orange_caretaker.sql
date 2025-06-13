ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-13 02:11:50.240';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-13 02:11:50.240';-->
ALTER TABLE stores
    ALTER COLUMN best_seller TYPE INTEGER
        USING best_seller::INTEGER;
