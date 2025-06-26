ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-26 07:45:32.906';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-26 07:45:32.906';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provider" varchar(255);
