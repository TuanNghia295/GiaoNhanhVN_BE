CREATE TABLE "private_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"number_stores" integer,
	"number_radius" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
