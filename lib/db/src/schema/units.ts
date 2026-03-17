import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { complexesTable } from "./complexes";

export const unitsTable = pgTable("units", {
  id: serial("id").primaryKey(),
  complexId: integer("complex_id").notNull().references(() => complexesTable.id, { onDelete: "cascade" }),
  unitNumber: text("unit_number").notNull(),
  floor: text("floor"),
  size: real("size"),
  status: text("status").notNull().default("Vacant"),
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  ownerPhone: text("owner_phone"),
  tenantName: text("tenant_name"),
  tenantEmail: text("tenant_email"),
  tenantPhone: text("tenant_phone"),
  monthlyLevy: real("monthly_levy"),
  outstandingBalance: real("outstanding_balance").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUnitSchema = createInsertSchema(unitsTable).omit({ id: true, createdAt: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof unitsTable.$inferSelect;
