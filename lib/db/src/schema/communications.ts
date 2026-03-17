import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { complexesTable } from "./complexes";

export const communicationsTable = pgTable("communications", {
  id: serial("id").primaryKey(),
  complexId: integer("complex_id").notNull().references(() => complexesTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull(),
  sentTo: text("sent_to").notNull(),
  recipientCount: integer("recipient_count").default(0),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunicationSchema = createInsertSchema(communicationsTable).omit({ id: true, createdAt: true });
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communicationsTable.$inferSelect;
