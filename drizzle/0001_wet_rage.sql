CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" serial NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"image" text,
	"description" text,
	"is_locked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" text,
	"store_id" integer NOT NULL,
	"store_menu_id" integer
);
