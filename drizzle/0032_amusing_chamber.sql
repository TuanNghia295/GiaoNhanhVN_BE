ALTER TABLE "vouchers_on_orders" DROP CONSTRAINT "vouchers_on_orders_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" DROP CONSTRAINT "vouchers_on_orders_voucher_id_vouchers_id_fk";
--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" ADD CONSTRAINT "vouchers_on_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" ADD CONSTRAINT "vouchers_on_orders_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;