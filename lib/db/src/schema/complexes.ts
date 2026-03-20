import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complexesTable = pgTable("complexes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  currencyCode: text("currency_code").notNull().default("ZAR"),
  registrationNumber: text("registration_number"),
  address: text("address").notNull(),
  numberOfUnits: integer("number_of_units").notNull(),
  agentName: text("agent_name"),
  agentEmail: text("agent_email"),
  agentPhone: text("agent_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertComplexSchema = createInsertSchema(complexesTable).omit({ id: true, createdAt: true });
export type InsertComplex = z.infer<typeof insertComplexSchema>;
export type Complex = typeof complexesTable.$inferSelect;
