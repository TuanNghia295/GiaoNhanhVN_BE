CREATE TABLE "reason_deliver_cancel_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(255) NOT NULL,
	"reason" varchar(255) NOT NULL,
	"order_id" integer NOT NULL,
	"deliver_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
