import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { complexesTable } from "./complexes";
import { unitsTable } from "./units";

export const emailAccountsTable = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  complexId: integer("complex_id")
    .notNull()
    .references(() => complexesTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  emailAddress: text("email_address").notNull(),
  displayName: text("display_name"),
  syncStatus: text("sync_status").notNull().default("Pending Provider Connection"),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
});

export const emailActivitiesTable = pgTable("email_activities", {
  id: serial("id").primaryKey(),
  complexId: integer("complex_id")
    .notNull()
    .references(() => complexesTable.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => unitsTable.id, { onDelete: "set null" }),
  accountId: integer("account_id").references(() => emailAccountsTable.id, { onDelete: "set null" }),
  direction: text("direction").notNull(),
  subject: text("subject").notNull(),
  bodyPreview: text("body_preview"),
  contactEmail: text("contact_email").notNull(),
  participants: text("participants"),
  mailboxAddress: text("mailbox_address"),
  threadId: text("thread_id"),
  providerMessageId: text("provider_message_id"),
  isUnread: boolean("is_unread").notNull().default(true),
  matchedStatus: text("matched_status").notNull().default("matched"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
