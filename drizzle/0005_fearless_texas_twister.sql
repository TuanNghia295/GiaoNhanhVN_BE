ALTER TABLE "extras_to_order_details" DROP CONSTRAINT "extras_to_order_details_order_detail_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "extras_to_order_details" ADD CONSTRAINT "extras_to_order_details_order_detail_id_order_details_id_fk" FOREIGN KEY ("order_detail_id") REFERENCES "public"."order_details"("id") ON DELETE no action ON UPDATE no action;