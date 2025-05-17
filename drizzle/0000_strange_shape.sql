CREATE TABLE "areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50) NOT NULL,
	"point" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"category_id" serial NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"phone" varchar(255) NOT NULL,
	"refresh_token" varchar(255),
	"role" varchar DEFAULT 'MANAGEMENT' NOT NULL,
	"area_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "managers_username_unique" UNIQUE("username"),
	CONSTRAINT "managers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"hash" varchar(255) NOT NULL,
	"authorId" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100),
	"description" varchar(255),
	"address" varchar(255),
	"location" varchar(255),
	"avatar" varchar(255),
	"background" varchar(255),
	"rating" numeric(2, 1) DEFAULT '0.0',
	"open_time" time,
	"close_time" time,
	"open_second_time" time,
	"close_second_time" time,
	"is_locked" boolean DEFAULT false NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"area_id" integer,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores_to_category_items" (
	"store_id" integer NOT NULL,
	"category_item_id" integer NOT NULL,
	CONSTRAINT "stores_to_category_items_store_id_category_item_id_pk" PRIMARY KEY("store_id","category_item_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"role" varchar DEFAULT 'USER' NOT NULL,
	"password" varchar(255),
	"avatar" varchar(255),
	"date_of_birth" timestamp,
	"gender" varchar(255),
	"email" varchar(255),
	"is_locked" boolean DEFAULT false NOT NULL,
	"fcm_token" varchar(255),
	"refresh_token" varchar(255),
	"deleted_at" timestamp,
	"count" integer DEFAULT 0 NOT NULL,
	"coin" integer DEFAULT 0 NOT NULL,
	"area_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "zalo" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" varchar(255) NOT NULL,
	"app_secret" varchar(255) NOT NULL,
	"access_token" varchar(255) NOT NULL,
	"refresh_token" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores_to_category_items" ADD CONSTRAINT "stores_to_category_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores_to_category_items" ADD CONSTRAINT "stores_to_category_items_category_item_id_category_items_id_fk" FOREIGN KEY ("category_item_id") REFERENCES "public"."category_items"("id") ON DELETE no action ON UPDATE no action;