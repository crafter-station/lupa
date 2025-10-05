ALTER TABLE "bucket" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bucket" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "source_snapshot" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "source_snapshot" ALTER COLUMN "updated_at" SET NOT NULL;