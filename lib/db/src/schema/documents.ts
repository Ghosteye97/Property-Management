import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { complexesTable } from "./complexes";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  complexId: integer("complex_id").notNull().references(() => complexesTable.id, { onDelete: "cascade" }),
  unitId: integer("unit_id"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  sourceType: text("source_type").notNull().default("upload"),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  formData: text("form_data"),
  fileUrl: text("file_url"),
  fileSize: text("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, uploadedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
