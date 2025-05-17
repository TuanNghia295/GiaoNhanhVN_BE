CREATE TABLE "extras_to_order_details" (
	"extra_id" serial NOT NULL,
	"order_detail_id" serial NOT NULL,
	CONSTRAINT "extras_to_order_details_extra_id_order_detail_id_pk" PRIMARY KEY("extra_id","order_detail_id")
);
--> statement-breakpoint
CREATE TABLE "order_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"quantity" integer NOT NULL,
	"total" numeric(15, 2) DEFAULT 0 NOT NULL,
	"option_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extras_to_order_details" ADD CONSTRAINT "extras_to_order_details_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extras_to_order_details" ADD CONSTRAINT "extras_to_order_details_order_detail_id_products_id_fk" FOREIGN KEY ("order_detail_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;