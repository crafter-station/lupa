CREATE INDEX "api_key_hash_active_idx" ON "api_key" USING btree ("key_hash","is_active");--> statement-breakpoint
CREATE INDEX "deployment_project_env_status_idx" ON "deployment" USING btree ("project_id","environment","status");--> statement-breakpoint
ALTER TABLE "document" DROP COLUMN "refresh_enabled";