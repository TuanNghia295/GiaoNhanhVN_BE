ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-07-07 15:46:26.730';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-07-07 15:46:26.730';--> statement-breakpoint
ALTER TABLE "stores"
    ALTER COLUMN "open_time" SET DATA TYPE timestamp USING TIMESTAMP '2014-01-01' + "open_time";

ALTER TABLE "stores"
    ALTER COLUMN "close_time" SET DATA TYPE timestamp USING TIMESTAMP '2014-01-01' + "close_time";

ALTER TABLE "stores"
    ALTER COLUMN "open_second_time" SET DATA TYPE timestamp USING TIMESTAMP '2014-01-01' + "open_second_time";

ALTER TABLE "stores"
    ALTER COLUMN "close_second_time" SET DATA TYPE timestamp USING TIMESTAMP '2014-01-01' + "close_second_time";