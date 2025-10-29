DROP INDEX "deployment_one_production_per_project";--> statement-breakpoint
DROP INDEX "deployment_one_staging_per_project";--> statement-breakpoint
CREATE UNIQUE INDEX "deployment_project_environment_unique" ON "deployment" USING btree ("project_id","environment") WHERE "deployment"."environment" IS NOT NULL;