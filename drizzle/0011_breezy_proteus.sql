CREATE TABLE "point_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"deliver_id" integer,
	"manager_id" integer,
	"type" text NOT NULL,
	"point" numeric(10, 2) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-30 01:27:57.763';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-30 01:27:57.763';