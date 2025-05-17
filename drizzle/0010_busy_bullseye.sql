ALTER TABLE "products"
    ALTER COLUMN "deleted_at" TYPE timestamp
        USING "deleted_at"::timestamp;