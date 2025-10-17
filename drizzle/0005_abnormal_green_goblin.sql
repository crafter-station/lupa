ALTER TABLE "deployment" ALTER COLUMN "org_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "document" ALTER COLUMN "org_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "snapshot" ALTER COLUMN "org_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "snapshot_and_deployment_rel" ALTER COLUMN "org_id" DROP DEFAULT;