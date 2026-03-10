ALTER TABLE "documents" RENAME COLUMN "file_url" TO "s3_key";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "original_name" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "content_type" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "size_bytes" numeric(12, 0);