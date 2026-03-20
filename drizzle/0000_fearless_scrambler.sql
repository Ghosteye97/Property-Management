CREATE TABLE "complexes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"registration_number" text,
	"address" text NOT NULL,
	"number_of_units" integer NOT NULL,
	"agent_name" text,
	"agent_email" text,
	"agent_phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"complex_id" integer NOT NULL,
	"unit_number" text NOT NULL,
	"floor" text,
	"size" real,
	"status" text DEFAULT 'Vacant' NOT NULL,
	"owner_name" text,
	"owner_email" text,
	"owner_phone" text,
	"tenant_name" text,
	"tenant_email" text,
	"tenant_phone" text,
	"monthly_levy" real,
	"outstanding_balance" real DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"complex_id" integer NOT NULL,
	"unit_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" real NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_date" timestamp,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"complex_id" integer NOT NULL,
	"unit_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"assigned_to" text,
	"resolved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"complex_id" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"type" text NOT NULL,
	"sent_to" text NOT NULL,
	"recipient_count" integer DEFAULT 0,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"complex_id" integer NOT NULL,
	"unit_id" integer,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"file_url" text,
	"file_size" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_complex_id_complexes_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_complex_id_complexes_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_complex_id_complexes_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_complex_id_complexes_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_complex_id_complexes_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE cascade ON UPDATE no action;