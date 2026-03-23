CREATE TABLE "email_accounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "complex_id" integer NOT NULL REFERENCES "complexes"("id") ON DELETE cascade,
  "provider" text NOT NULL,
  "email_address" text NOT NULL,
  "display_name" text,
  "sync_status" text DEFAULT 'Pending Provider Connection' NOT NULL,
  "connected_at" timestamp DEFAULT now() NOT NULL,
  "last_synced_at" timestamp
);

CREATE TABLE "email_activities" (
  "id" serial PRIMARY KEY NOT NULL,
  "complex_id" integer NOT NULL REFERENCES "complexes"("id") ON DELETE cascade,
  "unit_id" integer REFERENCES "units"("id") ON DELETE set null,
  "account_id" integer REFERENCES "email_accounts"("id") ON DELETE set null,
  "direction" text NOT NULL,
  "subject" text NOT NULL,
  "body_preview" text,
  "contact_email" text NOT NULL,
  "participants" text,
  "mailbox_address" text,
  "thread_id" text,
  "provider_message_id" text,
  "is_unread" boolean DEFAULT true NOT NULL,
  "matched_status" text DEFAULT 'matched' NOT NULL,
  "received_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
