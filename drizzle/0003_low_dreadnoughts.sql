ALTER TABLE "managers" DROP CONSTRAINT "managers_areaId_areas_fk";
--> statement-breakpoint
ALTER TABLE "vouchers" ALTER COLUMN "min_order_value" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "vouchers" ALTER COLUMN "max_order_value" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_areaId_areas_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE no action;