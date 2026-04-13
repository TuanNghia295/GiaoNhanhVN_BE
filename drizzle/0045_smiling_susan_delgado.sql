CREATE TABLE "order_detail_selected_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_detail_id" integer NOT NULL,
	"option_group_id" integer NOT NULL,
	"option_group_option_id" integer NOT NULL,
	"price" numeric(15, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_detail_selected_options" ADD CONSTRAINT "order_detail_selected_options_order_detail_id_order_details_id_fk" FOREIGN KEY ("order_detail_id") REFERENCES "public"."order_details"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_detail_selected_options" ADD CONSTRAINT "order_detail_selected_options_option_group_id_option_groups_id_fk" FOREIGN KEY ("option_group_id") REFERENCES "public"."option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_detail_selected_options" ADD CONSTRAINT "order_detail_selected_options_option_group_option_id_option_group_options_id_fk" FOREIGN KEY ("option_group_option_id") REFERENCES "public"."option_group_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_detail_selected_options_detail_id_idx" ON "order_detail_selected_options" USING btree ("order_detail_id");--> statement-breakpoint
CREATE INDEX "order_detail_selected_options_option_idx" ON "order_detail_selected_options" USING btree ("option_group_option_id");