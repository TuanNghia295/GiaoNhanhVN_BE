CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment" text,
	"type" varchar NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments_to_ratings" (
	"commentId" integer NOT NULL,
	"ratingId" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments_to_ratings" ADD CONSTRAINT "comments_to_ratings_commentId_comments_id_fk" FOREIGN KEY ("commentId") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments_to_ratings" ADD CONSTRAINT "comments_to_ratings_ratingId_ratings_id_fk" FOREIGN KEY ("ratingId") REFERENCES "public"."ratings"("id") ON DELETE no action ON UPDATE no action;