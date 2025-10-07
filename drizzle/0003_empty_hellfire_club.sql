ALTER TABLE "deployment" ALTER COLUMN "logs" SET DEFAULT '{}'::jsonb[];--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "metadata_extraction_config" jsonb;--> statement-breakpoint
ALTER TABLE "snapshot" ADD COLUMN "extracted_metadata" jsonb;