ALTER TABLE "ratings" ALTER COLUMN "store_rate" SET DATA TYPE integer USING "store_rate"::integer;
ALTER TABLE "ratings" ALTER COLUMN "deliver_rate" SET DATA TYPE integer USING "deliver_rate"::integer;
