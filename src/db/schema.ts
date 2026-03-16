import { sql } from "drizzle-orm";
import { text, integer, real, sqliteTable } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "supervisor", "agent"] }).notNull().default("agent"),
  phone: text("phone"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  product: text("product"),
  minInvestment: integer("min_investment"),
  maxInvestment: integer("max_investment"),
  riskProfile: text("risk_profile"),
  horizon: text("horizon"),
  currency: text("currency").default("CZK"),
  commissionAgent: real("commission_agent"),
  commissionSupervisor: real("commission_supervisor"),
  commissionCompany: real("commission_company"),
  status: text("status").default("active"),
  description: text("description"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  phone: text("phone"),
  phoneAlt: text("phone_alt"),
  email: text("email"),
  dob: text("dob"),
  gender: text("gender"),
  address: text("address"),
  city: text("city"),
  zip: text("zip"),
  country: text("country").default("CZ"),
  projectId: text("project_id").references(() => projects.id),
  agentId: text("agent_id").references(() => users.id),
  databaseId: text("database_id").references(() => databases.id),
  pipelineStage: text("pipeline_stage").default("novy"),
  hotCold: text("hot_cold").default("warm"),
  potentialValue: integer("potential_value").default(0),
  occupation: text("occupation"),
  competitiveIntel: text("competitive_intel"),
  note: text("note"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  lastContactDate: text("last_contact_date"),
});

export const deals = sqliteTable("deals", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").references(() => contacts.id),
  agentId: text("agent_id").references(() => users.id),
  projectId: text("project_id").references(() => projects.id),
  product: text("product"),
  amount: integer("amount"),
  type: text("type"),
  signDate: text("sign_date"),
  note: text("note"),
  commissionAgent: integer("commission_agent"),
  commissionSupervisor: integer("commission_supervisor"),
  commissionCompany: integer("commission_company"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const calls = sqliteTable("calls", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").references(() => contacts.id),
  agentId: text("agent_id").references(() => users.id),
  projectId: text("project_id").references(() => projects.id),
  date: text("date"),
  time: text("time"),
  duration: integer("duration"),
  type: text("type"),
  result: text("result"),
  note: text("note"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const callbacks = sqliteTable("callbacks", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").references(() => contacts.id),
  agentId: text("agent_id").references(() => users.id),
  date: text("date"),
  time: text("time"),
  note: text("note"),
  completed: integer("completed", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const databases = sqliteTable("databases", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source"),
  projectId: text("project_id").references(() => projects.id),
  agentId: text("agent_id").references(() => users.id),
  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadDate: text("upload_date"),
  active: integer("active", { mode: "boolean" }).default(true),
  contactCount: integer("contact_count").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const databaseNotes = sqliteTable("database_notes", {
  id: text("id").primaryKey(),
  databaseId: text("database_id").references(() => databases.id),
  text: text("text").notNull(),
  author: text("author"),
  date: text("date"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").references(() => contacts.id),
  dealId: text("deal_id").references(() => deals.id),
  name: text("name").notNull(),
  category: text("category").default("ostatni"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadDate: text("upload_date"),
  note: text("note"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const documentNotes = sqliteTable("document_notes", {
  id: text("id").primaryKey(),
  documentId: text("document_id").references(() => documents.id),
  text: text("text").notNull(),
  author: text("author"),
  date: text("date"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const contactActivity = sqliteTable("contact_activity", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").references(() => contacts.id),
  agentId: text("agent_id").references(() => users.id),
  type: text("type").notNull(), // call, stage_change, deal, note, assigned
  detail: text("detail"),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const agentStatus = sqliteTable("agent_status", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => users.id).unique(),
  status: text("status").notNull().default("offline"), // ready, busy, wrap_up, pause, offline
  lastChange: text("last_change").default(sql`CURRENT_TIMESTAMP`),
  currentContactId: text("current_contact_id").references(() => contacts.id),
  todayCalls: integer("today_calls").default(0),
  todayDeals: integer("today_deals").default(0),
  todayInterested: integer("today_interested").default(0),
  sessionStart: text("session_start"),
});

export const googleTokens = sqliteTable("google_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: text("expires_at"),
  calendarId: text("calendar_id").default("primary"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const calendarNotes = sqliteTable("calendar_notes", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(),
  text: text("text").notNull(),
  color: text("color").default("accent"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const complianceLog = sqliteTable("compliance_log", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").references(() => contacts.id),
  agentId: text("agent_id").references(() => users.id),
  type: text("type"),
  detail: text("detail"),
  date: text("date"),
  status: text("status"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
