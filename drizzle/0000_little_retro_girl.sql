CREATE TYPE "public"."deployment_log_level_enum" AS ENUM('info', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."deployment_status_enum" AS ENUM('cancelled', 'queued', 'building', 'error', 'ready');--> statement-breakpoint
CREATE TYPE "public"."snapshot_status_enum" AS ENUM('queued', 'error', 'running', 'success');--> statement-breakpoint
CREATE TYPE "public"."snapshot_type_enum" AS ENUM('website', 'upload');--> statement-breakpoint
CREATE TABLE "deployment" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"vector_index_id" text,
	"status" "deployment_status_enum" NOT NULL,
	"logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"changes_detected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"folder" text DEFAULT '/' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_id" text NOT NULL,
	"metadata_schema" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"url" text NOT NULL,
	"status" "snapshot_status_enum" NOT NULL,
	"type" "snapshot_type_enum" NOT NULL,
	"markdown_url" text,
	"chunks_count" integer,
	"metadata" jsonb,
	"extracted_metadata" jsonb,
	"changes_detected" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshot_and_deployment_rel" (
	"snapshot_id" text NOT NULL,
	"deployment_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snapshot_and_deployment_rel_snapshot_id_deployment_id_pk" PRIMARY KEY("snapshot_id","deployment_id")
);
--> statement-breakpoint
ALTER TABLE "snapshot_and_deployment_rel" ADD CONSTRAINT "snapshot_and_deployment_rel_snapshot_id_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_and_deployment_rel" ADD CONSTRAINT "snapshot_and_deployment_rel_deployment_id_deployment_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployment"("id") ON DELETE cascade ON UPDATE no action;