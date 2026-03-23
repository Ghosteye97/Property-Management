import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { complexesTable } from "./complexes";

export const meetingsTable = pgTable("meetings", {
  id: serial("id").primaryKey(),
  complexId: integer("complex_id")
    .notNull()
    .references(() => complexesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  meetingType: text("meeting_type").notNull(),
  status: text("status").notNull().default("Scheduled"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  venue: text("venue"),
  agenda: text("agenda"),
  minutes: text("minutes"),
  attendanceCount: integer("attendance_count").notNull().default(0),
  quorumReached: boolean("quorum_reached").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetingResolutionsTable = pgTable("meeting_resolutions", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id")
    .notNull()
    .references(() => meetingsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("Proposed"),
  notes: text("notes"),
  effectiveDate: timestamp("effective_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMeetingSchema = createInsertSchema(meetingsTable).omit({
  id: true,
  createdAt: true,
});
export const insertMeetingResolutionSchema = createInsertSchema(
  meetingResolutionsTable,
).omit({
  id: true,
  createdAt: true,
});

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type InsertMeetingResolution = z.infer<typeof insertMeetingResolutionSchema>;
export type Meeting = typeof meetingsTable.$inferSelect;
export type MeetingResolution = typeof meetingResolutionsTable.$inferSelect;
