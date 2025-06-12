ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-12 12:23:15.486';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-12 12:23:15.486';--> statement-breakpoint
ALTER TABLE "stores"
    ALTER COLUMN "open_time" SET DATA TYPE timestamp USING (current_date + "open_time"); -- statement-breakpoint

ALTER TABLE "stores"
    ALTER COLUMN "close_time" SET DATA TYPE timestamp USING (current_date + "close_time"); -- statement-breakpoint

ALTER TABLE "stores"
    ALTER COLUMN "open_second_time" SET DATA TYPE timestamp USING (current_date + "open_second_time"); -- statement-breakpoint

ALTER TABLE "stores"
    ALTER COLUMN "close_second_time" SET DATA TYPE timestamp USING (current_date + "close_second_time"); -- statement-breakpoint
