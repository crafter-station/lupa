CREATE TYPE "public"."deployment_log_level_enum" AS ENUM('info', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."deployment_status_enum" AS ENUM('cancelled', 'queued', 'building', 'error', 'ready');--> statement-breakpoint
CREATE TYPE "public"."refresh_frequency_enum" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."snapshot_status_enum" AS ENUM('queued', 'error', 'running', 'success');--> statement-breakpoint
CREATE TYPE "public"."snapshot_type_enum" AS ENUM('website', 'upload');--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_preview" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_key_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "deployment" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"project_id" text NOT NULL,
	"vector_index_id" text,
	"status" "deployment_status_enum" NOT NULL,
	"logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"folder" text DEFAULT '/' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_id" text NOT NULL,
	"metadata_schema" jsonb,
	"refresh_enabled" boolean DEFAULT false NOT NULL,
	"refresh_frequency" "refresh_frequency_enum",
	"refresh_schedule_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"document_id" text NOT NULL,
	"url" text NOT NULL,
	"status" "snapshot_status_enum" NOT NULL,
	"type" "snapshot_type_enum" NOT NULL,
	"markdown_url" text,
	"chunks_count" integer,
	"enhance" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"extracted_metadata" jsonb,
	"changes_detected" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshot_and_deployment_rel" (
	"org_id" text NOT NULL,
	"snapshot_id" text NOT NULL,
	"deployment_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snapshot_and_deployment_rel_snapshot_id_deployment_id_pk" PRIMARY KEY("snapshot_id","deployment_id")
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_and_deployment_rel" ADD CONSTRAINT "snapshot_and_deployment_rel_snapshot_id_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_and_deployment_rel" ADD CONSTRAINT "snapshot_and_deployment_rel_deployment_id_deployment_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployment"("id") ON DELETE cascade ON UPDATE no action;