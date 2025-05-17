ALTER TABLE "settings"
    ALTER COLUMN "open_time" SET DATA TYPE timestamp USING (CURRENT_DATE + "open_time"),
    ALTER COLUMN "close_time" SET DATA TYPE timestamp USING (CURRENT_DATE + "close_time");
