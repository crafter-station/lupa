ALTER TABLE "project" ADD COLUMN "vector_index_id" text;--> statement-breakpoint
ALTER TABLE "deployment" DROP COLUMN "vector_index_id";