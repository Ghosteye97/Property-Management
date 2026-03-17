import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { complexesTable } from "./complexes";
import { unitsTable } from "./units";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  complexId: integer("complex_id").notNull().references(() => complexesTable.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("Pending"),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
