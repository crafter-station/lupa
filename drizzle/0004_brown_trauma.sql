ALTER TABLE "document" ADD COLUMN "metadata_schema" jsonb;--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "metadata_extraction_config";