ALTER TABLE "deployment" ADD COLUMN "org_id" text DEFAULT 'org_34BFPGUSQRdk04TPnXuKoTwR4Fh' NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "org_id" text DEFAULT 'org_34BFPGUSQRdk04TPnXuKoTwR4Fh' NOT NULL;--> statement-breakpoint
ALTER TABLE "snapshot" ADD COLUMN "org_id" text DEFAULT 'org_34BFPGUSQRdk04TPnXuKoTwR4Fh' NOT NULL;--> statement-breakpoint
ALTER TABLE "snapshot_and_deployment_rel" ADD COLUMN "org_id" text DEFAULT 'org_34BFPGUSQRdk04TPnXuKoTwR4Fh' NOT NULL;