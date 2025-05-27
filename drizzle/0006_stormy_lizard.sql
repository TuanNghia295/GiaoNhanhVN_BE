CREATE TABLE "banks" (
	"id" integer PRIMARY KEY NOT NULL,
	"name_bank" varchar(255),
	"account_number" varchar(255),
	"account_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"author_id" integer NOT NULL,
	CONSTRAINT "banks_author_id_unique" UNIQUE("author_id")
);
