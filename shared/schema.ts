import { z } from "zod";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Tests Schema
export const testSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string().optional(),
  normalRange: z.string().optional(),
  price: z.number().optional(),
  testType: z.enum(["standard", "urine"]).default("standard"),
  createdAt: z.string(),
});

export const insertTestSchema = testSchema.omit({ id: true, createdAt: true });
export type Test = z.infer<typeof testSchema>;
export type InsertTest = z.infer<typeof insertTestSchema>;

// Patients Schema
export const patientSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  createdAt: z.string(),
});

export const insertPatientSchema = patientSchema.omit({ id: true, createdAt: true });
export type Patient = z.infer<typeof patientSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

// Visits Schema
export const visitSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  visitDate: z.string(),
  totalCost: z.number(),
  testIds: z.array(z.string()),
  createdAt: z.string(),
});

export const insertVisitSchema = visitSchema.omit({ id: true, createdAt: true });
export type Visit = z.infer<typeof visitSchema>;
export type InsertVisit = z.infer<typeof insertVisitSchema>;

// Urine Test Data Schema
export const urineDataSchema = z.object({
  // Physical Examination
  colour: z.string().optional(),
  aspect: z.string().optional(),
  reaction: z.string().optional(),
  specificGravity: z.string().optional(),
  // Chemical Examination
  glucose: z.string().optional(),
  protein: z.string().optional(),
  bilirubin: z.string().optional(),
  ketones: z.string().optional(),
  nitrite: z.string().optional(),
  leukocyte: z.string().optional(),
  blood: z.string().optional(),
  // Microscopical Examination
  pusCells: z.string().optional(),
  redCells: z.string().optional(),
  epithelialCell: z.string().optional(),
  bacteria: z.string().optional(),
  crystals: z.string().optional(),
  amorphous: z.string().optional(),
  mucus: z.string().optional(),
  other: z.string().optional(),
});

export type UrineData = z.infer<typeof urineDataSchema>;

// Test Results Schema
export const testResultSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  testId: z.string(),
  testName: z.string(),
  result: z.string().optional(),
  unit: z.string().optional(),
  normalRange: z.string().optional(),
  price: z.number().optional(),
  testType: z.enum(["standard", "urine"]).default("standard"),
  urineData: urineDataSchema.optional(),
  createdAt: z.string(),
});

export const insertTestResultSchema = testResultSchema.omit({ id: true, createdAt: true });
export type TestResult = z.infer<typeof testResultSchema>;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;

// Expenses Schema
export const expenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  date: z.string(),
  createdAt: z.string(),
});

export const insertExpenseSchema = expenseSchema.omit({ id: true, createdAt: true });
export type Expense = z.infer<typeof expenseSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Settings Schema
export const settingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
});

export const insertSettingSchema = settingSchema.omit({ id: true });
export type Setting = z.infer<typeof settingSchema>;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

// Dashboard Layout Schema
export const dashboardLayoutSchema = z.object({
  id: z.string(),
  sectionName: z.string(),
  displayName: z.string(),
  positionX: z.number(),
  positionY: z.number(),
  width: z.number(),
  height: z.number(),
  color: z.string().optional(),
  route: z.string(),
});

export const insertDashboardLayoutSchema = dashboardLayoutSchema.omit({ id: true });
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;
export type InsertDashboardLayout = z.infer<typeof insertDashboardLayoutSchema>;

// Login Schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Print Template Schema (deprecated - keeping for backward compatibility)
export const printTemplateSchema = z.object({
  text: z.string(),
  position: z.enum(["top", "bottom", "left", "right"]),
  orientation: z.enum(["horizontal", "vertical"]),
  textColor: z.string(),
  backgroundColor: z.string(),
  fontSize: z.number(),
});

export type PrintTemplate = z.infer<typeof printTemplateSchema>;

// Custom Print Section Schema
export const customPrintSectionSchema = z.object({
  id: z.string(),
  text: z.string(),
  position: z.enum(["top", "bottom"]),
  alignment: z.enum(["center", "left", "right"]),
  textColor: z.string(),
  backgroundColor: z.string(),
  fontSize: z.number().min(8).max(72).default(16),
});

export type CustomPrintSection = z.infer<typeof customPrintSectionSchema>;

// Drizzle ORM Table Definitions
export const tests = sqliteTable("tests", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit"),
  normalRange: text("normal_range"),
  price: real("price"),
  testType: text("test_type").default("standard").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
  gender: text("gender"),
  phone: text("phone"),
  source: text("source"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const visits = sqliteTable("visits", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  patientName: text("patient_name").notNull(),
  visitDate: text("visit_date").notNull(),
  totalCost: real("total_cost").notNull(),
  testIds: text("test_ids", { mode: "json" }).$type<string[]>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const testResults = sqliteTable("test_results", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull(),
  testId: text("test_id").notNull(),
  testName: text("test_name").notNull(),
  result: text("result"),
  unit: text("unit"),
  normalRange: text("normal_range"),
  price: real("price"),
  testType: text("test_type").default("standard").notNull(),
  urineData: text("urine_data", { mode: "json" }).$type<UrineData | undefined>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const dashboardLayouts = sqliteTable("dashboard_layouts", {
  id: text("id").primaryKey(),
  sectionName: text("section_name").notNull().unique(),
  displayName: text("display_name").notNull(),
  positionX: integer("position_x").notNull(),
  positionY: integer("position_y").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  color: text("color"),
  route: text("route").notNull(),
});
