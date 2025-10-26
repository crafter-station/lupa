ALTER TABLE "api_key" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "api_key" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_key_hash_unique" UNIQUE("key_hash");