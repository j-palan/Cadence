WITH "ranked_resumes" AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "user_id", lower(btrim("name"))
			ORDER BY "created_at", "id"
		) AS "duplicate_number"
	FROM "resumes"
)
UPDATE "resumes"
SET "name" = btrim("resumes"."name") || ' [' || "resumes"."id"::text || ']'
FROM "ranked_resumes"
WHERE "resumes"."id" = "ranked_resumes"."id"
	AND "ranked_resumes"."duplicate_number" > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "resumes_user_name_unique" ON "resumes" USING btree ("user_id",lower(btrim("name")));
