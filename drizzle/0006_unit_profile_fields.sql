ALTER TABLE "units"
ADD COLUMN "primary_use" text,
ADD COLUMN "ownership_start_date" text,
ADD COLUMN "correspondence_preference" text,
ADD COLUMN "correspondence_address" text,
ADD COLUMN "participation_quota" real,
ADD COLUMN "parking_bay" text,
ADD COLUMN "storeroom_number" text,
ADD COLUMN "utility_meter_number" text;
