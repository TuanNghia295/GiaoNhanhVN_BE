CREATE TABLE "service_fees" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"price_percent" integer NOT NULL,
	"user_service_fee" numeric(15, 2) NOT NULL,
	"user_service_fee_pct" integer NOT NULL,
	"deliver_fee" numeric(15, 2) NOT NULL,
	"deliver_percent" integer NOT NULL,
	"distance_percent" numeric(5, 2) NOT NULL,
	"setting_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
