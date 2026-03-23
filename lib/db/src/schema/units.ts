import { pgTable, serial, text, integer, timestamp, real, boolean } from "drizzle-orm/pg-core";
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
  primaryUse: text("primary_use"),
  ownershipStartDate: text("ownership_start_date"),
  correspondencePreference: text("correspondence_preference"),
  correspondenceAddress: text("correspondence_address"),
  participationQuota: real("participation_quota"),
  parkingBay: text("parking_bay"),
  storeroomNumber: text("storeroom_number"),
  utilityMeterNumber: text("utility_meter_number"),
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  ownerPhone: text("owner_phone"),
  tenantName: text("tenant_name"),
  tenantEmail: text("tenant_email"),
  tenantPhone: text("tenant_phone"),
  isTrustee: boolean("is_trustee").notNull().default(false),
  trusteeRole: text("trustee_role"),
  trusteeStartDate: text("trustee_start_date"),
  trusteeNotes: text("trustee_notes"),
  monthlyLevy: real("monthly_levy"),
  outstandingBalance: real("outstanding_balance").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUnitSchema = createInsertSchema(unitsTable).omit({ id: true, createdAt: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof unitsTable.$inferSelect;
