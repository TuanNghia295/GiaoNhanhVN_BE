CREATE TABLE "store_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"user_id" integer NOT NULL,
	"area_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
