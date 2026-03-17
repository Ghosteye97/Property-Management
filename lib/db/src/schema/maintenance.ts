import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { complexesTable } from "./complexes";
import { unitsTable } from "./units";

export const maintenanceRequestsTable = pgTable("maintenance_requests", {
  id: serial("id").primaryKey(),
  complexId: integer("complex_id").notNull().references(() => complexesTable.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("Medium"),
  status: text("status").notNull().default("Open"),
  assignedTo: text("assigned_to"),
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceSchema = createInsertSchema(maintenanceRequestsTable).omit({ id: true, createdAt: true });
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type MaintenanceRequest = typeof maintenanceRequestsTable.$inferSelect;
