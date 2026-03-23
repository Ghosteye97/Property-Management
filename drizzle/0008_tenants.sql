CREATE TABLE "tenants" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "status" text DEFAULT 'Active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" ("slug");

INSERT INTO "tenants" ("name", "slug", "status")
VALUES ('Default Portfolio', 'default-portfolio', 'Active');

ALTER TABLE "users"
ADD COLUMN "tenant_id" integer REFERENCES "tenants"("id") ON DELETE set null;

ALTER TABLE "complexes"
ADD COLUMN "tenant_id" integer REFERENCES "tenants"("id") ON DELETE cascade;

UPDATE "complexes"
SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'default-portfolio' LIMIT 1)
WHERE "tenant_id" IS NULL;

ALTER TABLE "complexes"
ALTER COLUMN "tenant_id" SET NOT NULL;
