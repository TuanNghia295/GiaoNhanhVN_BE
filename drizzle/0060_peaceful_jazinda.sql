CREATE TABLE "distances" (
	"id" serial PRIMARY KEY NOT NULL,
	"min_distance" integer NOT NULL,
	"max_distance" integer NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"service_fee_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
