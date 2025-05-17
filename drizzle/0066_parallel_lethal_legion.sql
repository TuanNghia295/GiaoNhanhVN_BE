ALTER TABLE "orders" ALTER COLUMN "income_deliver" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "geometry" geometry(point);--> statement-breakpoint
CREATE INDEX "spatial_index" ON "stores" USING gist ("geometry");