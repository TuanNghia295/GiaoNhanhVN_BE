CREATE TABLE "fcm_tokens" (
	"token" text NOT NULL,
	"platform" text DEFAULT 'unknown',
	"device_info" text,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fcm_tokens_user_id_token_pk" PRIMARY KEY("user_id","token")
);
