ALTER TABLE "units"
ADD COLUMN "is_trustee" boolean DEFAULT false NOT NULL,
ADD COLUMN "trustee_role" text,
ADD COLUMN "trustee_start_date" text,
ADD COLUMN "trustee_notes" text;
