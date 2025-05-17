ALTER TABLE "stores"
    ALTER COLUMN "open_time" TYPE timestamp without time zone USING timestamp '1970-01-01' + open_time,
    ALTER COLUMN "close_time" TYPE timestamp without time zone USING timestamp '1970-01-01' + close_time,
    ALTER COLUMN "open_second_time" TYPE timestamp without time zone USING timestamp '1970-01-01' + open_second_time,
    ALTER COLUMN "close_second_time" TYPE timestamp without time zone USING timestamp '1970-01-01' + close_second_time;
