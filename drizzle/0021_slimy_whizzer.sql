CREATE TABLE "ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_rate" varchar(255) NOT NULL,
	"deliver_rate" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"store_id" varchar(255) NOT NULL,
	"deliver_id" varchar(255) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "spatial_index";--> statement-breakpoint
ALTER TABLE "stores" DROP COLUMN "location_map";