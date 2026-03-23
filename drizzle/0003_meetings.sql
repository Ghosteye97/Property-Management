CREATE TABLE "meetings" (
  "id" serial PRIMARY KEY NOT NULL,
  "complex_id" integer NOT NULL,
  "title" text NOT NULL,
  "meeting_type" text NOT NULL,
  "status" text DEFAULT 'Scheduled' NOT NULL,
  "scheduled_at" timestamp NOT NULL,
  "venue" text,
  "agenda" text,
  "minutes" text,
  "attendance_count" integer DEFAULT 0 NOT NULL,
  "quorum_reached" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_resolutions" (
  "id" serial PRIMARY KEY NOT NULL,
  "meeting_id" integer NOT NULL,
  "title" text NOT NULL,
  "status" text DEFAULT 'Proposed' NOT NULL,
  "notes" text,
  "effective_date" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meetings"
ADD CONSTRAINT "meetings_complex_id_complexes_id_fk"
FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "meeting_resolutions"
ADD CONSTRAINT "meeting_resolutions_meeting_id_meetings_id_fk"
FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
