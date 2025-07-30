CREATE TABLE "viewed_stores" (
	"user_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"last_viewed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "viewed_stores_store_id_user_id_pk" PRIMARY KEY("store_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "vouchers" DROP COLUMN "percent";