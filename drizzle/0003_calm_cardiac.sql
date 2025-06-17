ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-17 16:59:53.102';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-17 16:59:53.102';--> statement-breakpoint
ALTER TABLE "stores"
    ALTER COLUMN "open_time" SET DATA TYPE timestamp USING CURRENT_DATE + "open_time";

ALTER TABLE "stores"
    ALTER COLUMN "close_time" SET DATA TYPE timestamp USING CURRENT_DATE + "close_time";

ALTER TABLE "stores"
    ALTER COLUMN "open_second_time" SET DATA TYPE timestamp USING CURRENT_DATE + "open_second_time";

ALTER TABLE "stores"
    ALTER COLUMN "close_second_time" SET DATA TYPE timestamp USING CURRENT_DATE + "close_second_time";
