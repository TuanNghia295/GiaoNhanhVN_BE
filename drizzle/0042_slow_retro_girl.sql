ALTER TABLE "coin_logs" ALTER COLUMN "coin" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "coin_logs" ALTER COLUMN "coin" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "coin_logs" ADD CONSTRAINT "coin_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coin_logs" ADD CONSTRAINT "coin_logs_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "coin_logs_user_id_idx" ON "coin_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coin_logs_area_id_idx" ON "coin_logs" USING btree ("area_id");