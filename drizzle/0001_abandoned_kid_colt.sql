CREATE TYPE "public"."refresh_frequency_enum" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "refresh_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "refresh_frequency" "refresh_frequency_enum";--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "refresh_schedule_id" text;