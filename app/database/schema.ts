import { pgTable, uuid, text, timestamp, date, numeric } from "drizzle-orm/pg-core";

// -------------------- Documents --------------------
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // passport | visa | payslip | letter | bank | etc.
  notes: text("notes"),
  fileUrl: text("file_url"),
  issuedAt: date("issued_at"),
  expiresAt: date("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -------------------- Invoices --------------------
export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: text("invoice_number").notNull(), // e.g. INV-2026-02-001
  clientName: text("client_name").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  currency: text("currency").notNull(), // AUD, USD
  status: text("status").notNull(), // draft | sent | paid
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -------------------- Invoice Items --------------------
export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull(), // GET from invoices.id TODO: add foreign key constraint
  date: date("date").notNull(),
  description: text("description").notNull(),
  ticketRef: text("ticket_ref"), 
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull().default("0"),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
