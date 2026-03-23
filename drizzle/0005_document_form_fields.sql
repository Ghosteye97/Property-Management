ALTER TABLE "documents"
ADD COLUMN "source_type" text DEFAULT 'upload' NOT NULL,
ADD COLUMN "file_name" text,
ADD COLUMN "mime_type" text,
ADD COLUMN "form_data" text;
