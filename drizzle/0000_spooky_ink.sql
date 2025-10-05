CREATE TYPE "public"."deployment_log_level_enum" AS ENUM('info', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."deployment_status_enum" AS ENUM('cancelled', 'queued', 'building', 'error', 'ready');--> statement-breakpoint
CREATE TYPE "public"."source_snapshot_status_enum" AS ENUM('queued', 'error', 'running', 'success');--> statement-breakpoint
CREATE TYPE "public"."source_snapshot_type_enum" AS ENUM('website', 'upload');--> statement-breakpoint
CREATE TABLE "bucket" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deployment" (
	"id" text PRIMARY KEY NOT NULL,
	"bucket_id" text NOT NULL,
	"vector_index_id" text,
	"status" "deployment_status_enum" NOT NULL,
	"logs" jsonb[] DEFAULT '{}' NOT NULL,
	"changes_detected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"bucket_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "source_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"url" text NOT NULL,
	"status" "source_snapshot_status_enum" NOT NULL,
	"type" "source_snapshot_type_enum" NOT NULL,
	"chunks_count" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "source_snapshot_and_deployment_rel" (
	"snapshot_id" text NOT NULL,
	"deployment_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_snapshot_and_deployment_rel_snapshot_id_deployment_id_pk" PRIMARY KEY("snapshot_id","deployment_id")
);
--> statement-breakpoint
CREATE TABLE "vector_index" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "source_snapshot_and_deployment_rel" ADD CONSTRAINT "source_snapshot_and_deployment_rel_snapshot_id_source_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."source_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_snapshot_and_deployment_rel" ADD CONSTRAINT "source_snapshot_and_deployment_rel_deployment_id_deployment_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployment"("id") ON DELETE cascade ON UPDATE no action;