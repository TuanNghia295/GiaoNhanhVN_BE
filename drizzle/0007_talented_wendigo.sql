ALTER TABLE "stores" ADD COLUMN "location_map" geometry(point);--> statement-breakpoint
CREATE INDEX "spatial_index" ON "stores" USING gist ("location_map");