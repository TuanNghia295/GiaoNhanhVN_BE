ALTER TABLE "managers" DROP CONSTRAINT "managers_area_id_areas_id_fk";
--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_areaId_area_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE cascade;