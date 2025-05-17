ALTER TABLE "areas" ALTER COLUMN "name" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "areas" ALTER COLUMN "code" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "parent" varchar;