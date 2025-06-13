CREATE TABLE "bank_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_bank" varchar(255),
	"account_number" varchar(255),
	"account_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"transaction_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"author_id" integer NOT NULL,
	CONSTRAINT "bank_records_author_id_unique" UNIQUE("author_id")
);
--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-13 00:36:20.428';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-13 00:36:20.428';