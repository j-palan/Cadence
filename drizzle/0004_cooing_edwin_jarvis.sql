CREATE TABLE "job_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"checked_at" timestamp,
	"attempted_at" timestamp DEFAULT now() NOT NULL,
	"lease_until" timestamp DEFAULT now() NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"location" text NOT NULL,
	"countries" text[] NOT NULL,
	"remote" boolean DEFAULT false NOT NULL,
	"term" text NOT NULL,
	"description" text NOT NULL,
	"url" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_jobs_user_id_job_id_pk" PRIMARY KEY("user_id","job_id")
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_source_id_job_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."job_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_source_idx" ON "jobs" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "jobs_active_idx" ON "jobs" USING btree ("active","checked_at");