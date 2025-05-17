CREATE TABLE "vouchers_on_orders" (
	"id" integer,
	"created_at" timestamp,
	"updated_at" timestamp,
	"order_id" integer NOT NULL,
	"voucher_id" integer NOT NULL,
	CONSTRAINT "vouchers_on_orders_order_id_voucher_id_pk" PRIMARY KEY("order_id","voucher_id")
);
