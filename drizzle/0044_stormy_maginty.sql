CREATE TABLE "option_group_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"option_group_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" numeric(15, 2) DEFAULT 0 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(150),
	"is_required" boolean DEFAULT true NOT NULL,
	"min_select" integer DEFAULT 1 NOT NULL,
	"max_select" integer DEFAULT 1 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "option_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "option_group_options" ADD CONSTRAINT "option_group_options_option_group_id_option_groups_id_fk" FOREIGN KEY ("option_group_id") REFERENCES "public"."option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_option_group_options_group_id" ON "option_group_options" USING btree ("option_group_id");--> statement-breakpoint
CREATE INDEX "idx_option_groups_product_id" ON "option_groups" USING btree ("product_id");