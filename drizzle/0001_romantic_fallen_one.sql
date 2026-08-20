ALTER TABLE "users" ADD COLUMN "byok_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "byok_provider" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "byok_model" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "byok_key_cipher" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "byok_key_hint" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "byok_verified_at" timestamp;