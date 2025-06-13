ALTER TABLE "settings" ALTER COLUMN "start_night_time" SET DEFAULT '2025-06-13 02:10:50.138';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "end_night_time" SET DEFAULT '2025-06-13 02:10:50.138';--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "open_time" SET DATA TYPE time;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "close_time" SET DATA TYPE time;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "open_second_time" SET DATA TYPE time;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "close_second_time" SET DATA TYPE time;