ALTER TABLE "comments_to_ratings" RENAME COLUMN "commentId" TO "comment_id";--> statement-breakpoint
ALTER TABLE "comments_to_ratings" RENAME COLUMN "ratingId" TO "rating_id";--> statement-breakpoint
ALTER TABLE "comments_to_ratings" DROP CONSTRAINT "comments_to_ratings_commentId_comments_id_fk";
--> statement-breakpoint
ALTER TABLE "comments_to_ratings" DROP CONSTRAINT "comments_to_ratings_ratingId_ratings_id_fk";
--> statement-breakpoint
ALTER TABLE "comments_to_ratings" ADD CONSTRAINT "comments_to_ratings_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments_to_ratings" ADD CONSTRAINT "comments_to_ratings_rating_id_ratings_id_fk" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE no action ON UPDATE no action;