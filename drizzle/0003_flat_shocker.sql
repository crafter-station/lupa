ALTER TABLE "deployment" ADD COLUMN "name" text;
UPDATE "deployment" SET "name" = 'Deployment ' || "id" WHERE "name" IS NULL;
ALTER TABLE "deployment" ALTER COLUMN "name" SET NOT NULL;