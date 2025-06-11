ALTER TABLE "voucher_usages" RENAME COLUMN "order_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "voucher_usages" DROP CONSTRAINT "voucher_usages_order_id_voucher_id_unique";--> statement-breakpoint
ALTER TABLE "voucher_usages" DROP CONSTRAINT "voucher_usages_order_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-11 09:28:22.820';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-11 09:28:22.820';--> statement-breakpoint
ALTER TABLE "voucher_usages" ADD CONSTRAINT "voucher_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_usages" ADD CONSTRAINT "voucher_usages_user_id_voucher_id_unique" UNIQUE("user_id","voucher_id");