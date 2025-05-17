CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_full_time" boolean DEFAULT false NOT NULL,
	"open_time" time,
	"close_time" time,
	"is_rain" boolean DEFAULT false NOT NULL,
	"is_night" boolean DEFAULT false NOT NULL,
	"is_holiday" boolean DEFAULT false NOT NULL,
	"holiday_pct" integer DEFAULT 0 NOT NULL,
	"rain_morning_pct" integer DEFAULT 0 NOT NULL,
	"rain_night_pct" integer DEFAULT 0 NOT NULL,
	"night_fee_pct" integer DEFAULT 0 NOT NULL,
	"area_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
