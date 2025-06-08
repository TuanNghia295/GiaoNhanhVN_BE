CREATE TABLE "areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"code" varchar(100) NOT NULL,
	"parent" varchar,
	"point" numeric(15, 2) DEFAULT 0 NOT NULL,
	"location" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_bank" varchar(255),
	"account_number" varchar(255),
	"account_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"author_id" integer NOT NULL,
	CONSTRAINT "banks_author_id_unique" UNIQUE("author_id")
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"image" varchar(255) NOT NULL,
	"area_id" integer,
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
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment" text,
	"type" varchar NOT NULL,
	"commentUsedId" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments_to_ratings" (
	"comment_id" integer NOT NULL,
	"rating_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivers" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar DEFAULT 'DELIVER' NOT NULL,
	"id_card" varchar NOT NULL,
	"phone" varchar NOT NULL,
	"email" varchar,
	"full_name" varchar NOT NULL,
	"avatar" varchar,
	"password" varchar NOT NULL,
	"gender" varchar(255),
	"date_of_birth" date,
	"cancel_order_count" integer DEFAULT 0,
	"rating" numeric(10, 2),
	"point" numeric(10, 2) DEFAULT 0,
	"status" boolean DEFAULT true,
	"activated" boolean DEFAULT false,
	"fcm_token" varchar,
	"refresh_token" varchar,
	"area_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"area_id" integer NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distances" (
	"id" serial PRIMARY KEY NOT NULL,
	"min_distance" integer NOT NULL,
	"max_distance" integer NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"service_fee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extras" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" numeric(15, 2) DEFAULT 0 NOT NULL,
	"product_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extras_to_order_details" (
	"quantity" integer NOT NULL,
	"extra_id" integer NOT NULL,
	"order_detail_id" integer NOT NULL,
	CONSTRAINT "extras_to_order_details_extra_id_order_detail_id_pk" PRIMARY KEY("extra_id","order_detail_id")
);
--> statement-breakpoint
CREATE TABLE "fcm_tokens" (
	"token" text NOT NULL,
	"platform" text DEFAULT 'unknown',
	"device_info" text,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fcm_tokens_user_id_token_pk" PRIMARY KEY("user_id","token")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" varchar(255) NOT NULL,
	"geometry" varchar(255) NOT NULL,
	"user_id" integer,
	"area_id" integer,
	"deliver_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "locations_deliver_id_unique" UNIQUE("deliver_id")
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
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" varchar(255) NOT NULL,
	"image" varchar(255),
	"user_id" integer,
	"type" varchar(50),
	"area_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications_to_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" numeric(15, 2) DEFAULT 0 NOT NULL,
	"product_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"quantity" integer NOT NULL,
	"total" numeric(15, 2) DEFAULT 0 NOT NULL,
	"option_id" integer,
	"product_id" integer,
	"order_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(20) DEFAULT 'FOOD' NOT NULL,
	"code" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"is_holiday" boolean DEFAULT false NOT NULL,
	"is_night" boolean DEFAULT false NOT NULL,
	"is_rain" boolean DEFAULT false NOT NULL,
	"distance" numeric(15, 2) DEFAULT 0 NOT NULL,
	"total_delivery" numeric(15, 2) DEFAULT 0 NOT NULL,
	"total_product" numeric(15, 2) DEFAULT 0 NOT NULL,
	"total_voucher" numeric(15, 2) DEFAULT 0 NOT NULL,
	"user_service_fee" numeric(15, 2) DEFAULT 0 NOT NULL,
	"store_service_fee" numeric(15, 2) DEFAULT 0 NOT NULL,
	"total" numeric(15, 2) DEFAULT 0 NOT NULL,
	"income_deliver" numeric(15, 2) DEFAULT 0 NOT NULL,
	"payfor_shop" numeric(15, 2) DEFAULT 0 NOT NULL,
	"is_rated" boolean DEFAULT false NOT NULL,
	"address_from" varchar(255) NOT NULL,
	"geometry_from" varchar(255) NOT NULL,
	"address_to" varchar(255) NOT NULL,
	"geometry_to" varchar(255) NOT NULL,
	"user_for_contact" varchar(255),
	"phone_for_contact" varchar(20),
	"note" text,
	"user_id" integer,
	"deliver_id" integer,
	"store_id" integer,
	"area_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_item_on_products" (
	"productId" integer NOT NULL,
	"categoryItemId" integer NOT NULL,
	CONSTRAINT "category_item_on_products_productId_categoryItemId_pk" PRIMARY KEY("productId","categoryItemId")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar,
	"name_normalized" varchar,
	"price" numeric(15, 2) NOT NULL,
	"image" text,
	"description" text,
	"is_locked" boolean DEFAULT false,
	"category_item_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"store_id" integer,
	"store_menu_id" integer
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_rate" integer,
	"deliver_rate" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"order_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"store_id" integer,
	"deliver_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reason_deliver_cancel_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(255) DEFAULT 'CANCELED' NOT NULL,
	"reason" varchar(255) NOT NULL,
	"order_id" integer NOT NULL,
	"deliver_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_fees" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"price" numeric(15, 2) DEFAULT 0 NOT NULL,
	"price_percent" integer DEFAULT 0 NOT NULL,
	"user_service_fee" numeric(15, 2) DEFAULT 0 NOT NULL,
	"user_service_fee_pct" integer DEFAULT 0 NOT NULL,
	"deliver_fee" numeric(15, 2) DEFAULT 0 NOT NULL,
	"deliver_percent" integer DEFAULT 0 NOT NULL,
	"distance_percent" numeric(5, 2) DEFAULT 0 NOT NULL,
	"settingId" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_full_time" boolean DEFAULT false NOT NULL,
	"start_night_time" timestamp DEFAULT '2025-06-05 02:57:15.156' NOT NULL,
	"end_night_time" timestamp DEFAULT '2025-06-05 02:57:15.156' NOT NULL,
	"hotline" varchar(20) DEFAULT '' NOT NULL,
	"fanpage" text DEFAULT '' NOT NULL,
	"is_rain" boolean DEFAULT false NOT NULL,
	"is_night" boolean DEFAULT false NOT NULL,
	"night_fee" numeric(10, 2) DEFAULT 0 NOT NULL,
	"rain_fee" numeric(10, 2) DEFAULT 0 NOT NULL,
	"area_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"deleted_at" timestamp,
	"store_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"user_id" integer,
	"area_id" integer,
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
	"open_time" timestamp,
	"close_time" timestamp,
	"open_second_time" timestamp,
	"close_second_time" timestamp,
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
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"method" varchar(50),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"rejected_reason" text,
	"approved_by" integer,
	"role" varchar(50),
	"area_id" integer,
	"manager_id" integer,
	"deliver_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "voucher_usages" (
	"order_id" integer NOT NULL,
	"voucher_id" integer NOT NULL,
	"usage_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_usages_order_id_voucher_id_unique" UNIQUE("order_id","voucher_id")
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"type" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"max_uses" integer NOT NULL,
	"use_per_user" integer NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"description" varchar(255),
	"manager_id" integer,
	"user_id" integer,
	"deleted_at" timestamp,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"min_order_value" numeric(10, 2) DEFAULT 0,
	"max_order_value" numeric(10, 2) DEFAULT 0,
	"area_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vouchers_on_orders" (
	"order_id" integer NOT NULL,
	"voucher_id" integer NOT NULL,
	CONSTRAINT "vouchers_on_orders_order_id_voucher_id_pk" PRIMARY KEY("order_id","voucher_id")
);
--> statement-breakpoint
CREATE TABLE "zalo" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" varchar(255) NOT NULL,
	"app_secret" varchar(255) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments_to_ratings" ADD CONSTRAINT "comments_to_ratings_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments_to_ratings" ADD CONSTRAINT "comments_to_ratings_rating_id_ratings_id_fk" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivers" ADD CONSTRAINT "delivers_areaId_areas_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extras" ADD CONSTRAINT "extras_productId_products_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extras_to_order_details" ADD CONSTRAINT "extras_to_order_details_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extras_to_order_details" ADD CONSTRAINT "extras_to_order_details_order_detail_id_order_details_id_fk" FOREIGN KEY ("order_detail_id") REFERENCES "public"."order_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_areaId_areas_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "products_productId_options_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_details" ADD CONSTRAINT "order_details_order_id_orders_pk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores_to_category_items" ADD CONSTRAINT "stores_to_category_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores_to_category_items" ADD CONSTRAINT "stores_to_category_items_category_item_id_category_items_id_fk" FOREIGN KEY ("category_item_id") REFERENCES "public"."category_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_usages" ADD CONSTRAINT "voucher_usages_order_id_users_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_usages" ADD CONSTRAINT "voucher_usages_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" ADD CONSTRAINT "vouchers_on_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers_on_orders" ADD CONSTRAINT "vouchers_on_orders_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;