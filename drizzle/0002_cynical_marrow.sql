ALTER TABLE "managers" DROP CONSTRAINT "managers_areaId_area_fk";
--> statement-breakpoint
ALTER TABLE "delivers" ADD CONSTRAINT "delivers_areaId_areas_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_areaId_areas_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE cascade;