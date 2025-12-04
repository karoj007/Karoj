import {
  type Test,
  type InsertTest,
  type Patient,
  type InsertPatient,
  type Visit,
  type InsertVisit,
  type TestResult,
  type InsertTestResult,
  type Expense,
  type InsertExpense,
  type Setting,
  type InsertSetting,
  type DashboardLayout,
  type InsertDashboardLayout,
  type User,               // Added
  type InsertUser,         // Added
  tests,
  patients,
  visits,
  testResults,
  expenses,
  settings,
  dashboardLayouts,
  users,                   // Added
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm"; // Added desc

export interface IStorage {
  // Users (NEW)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Tests
  getAllTests(): Promise<Test[]>;
  getTestById(id: string): Promise<Test | undefined>;
  createTest(test: InsertTest): Promise<Test>;
  updateTest(id: string, test: Partial<InsertTest>): Promise<Test | undefined>;
  deleteTest(id: string): Promise<boolean>;

  // Patients
  getAllPatients(): Promise<Patient[]>;
  getPatientById(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;

  // Visits
  getAllVisits(): Promise<Visit[]>;
  getVisitById(id: string): Promise<Visit | undefined>;
  getVisitsByPatientId(patientId: string): Promise<Visit[]>;
  getVisitsByDate(date: string): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: string, visit: Partial<InsertVisit>): Promise<Visit | undefined>;
  deleteVisit(id: string): Promise<boolean>;

  // Test Results
  getAllTestResults(): Promise<TestResult[]>;
  getTestResultsByVisitId(visitId: string): Promise<TestResult[]>;
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  updateTestResult(id: string, result: Partial<InsertTestResult>): Promise<TestResult | undefined>;
  deleteTestResult(id: string): Promise<boolean>;

  // Expenses
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByDate(date: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Settings
  getAllSettings(): Promise<Setting[]>;
  getSettingByKey(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;

  // Dashboard Layouts
  getAllDashboardLayouts(): Promise<DashboardLayout[]>;
  getDashboardLayoutByName(sectionName: string): Promise<DashboardLayout | undefined>;
  upsertDashboardLayout(layout: InsertDashboardLayout): Promise<DashboardLayout>;
  initializeDefaultLayouts(): Promise<void>;

  // Data Management
  deleteAllData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private tests: Map<string, Test>;
  private patients: Map<string, Patient>;
  private visits: Map<string, Visit>;
  private testResults: Map<string, TestResult>;
  private expenses: Map<string, Expense>;
  private settings: Map<string, Setting>;
  private users: Map<string, User>; // Added

  constructor() {
    this.tests = new Map();
    this.patients = new Map();
    this.visits = new Map();
    this.testResults = new Map();
    this.expenses = new Map();
    this.settings = new Map();
    this.users = new Map(); // Added
  }

  // Users Implementation (MemStorage)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, createdAt: new Date().toISOString(), permissions: insertUser.permissions || undefined };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, insertUser: Partial<InsertUser>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error("User not found");
    const updated = { ...existing, ...insertUser };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  // Tests
  async getAllTests(): Promise<Test[]> {
    return Array.from(this.tests.values());
  }

  async getTestById(id: string): Promise<Test | undefined> {
    return this.tests.get(id);
  }

  async createTest(insertTest: InsertTest): Promise<Test> {
    const id = randomUUID();
    const test: Test = {
      ...insertTest,
      id,
      createdAt: new Date().toISOString(),
    };
    this.tests.set(id, test);
    return test;
  }

  async updateTest(id: string, insertTest: Partial<InsertTest>): Promise<Test | undefined> {
    const existing = this.tests.get(id);
    if (!existing) return undefined;
    
    const updated: Test = { ...existing, ...insertTest };
    this.tests.set(id, updated);
    
    // Bidirectional sync: Update all test results that reference this test
    if (insertTest.normalRange !== undefined) {
      const resultsToUpdate = Array.from(this.testResults.values()).filter(r => r.testId === id);
      for (const result of resultsToUpdate) {
        result.normalRange = insertTest.normalRange;
        this.testResults.set(result.id, result);
      }
    }
    
    return updated;
  }

  async deleteTest(id: string): Promise<boolean> {
    return this.tests.delete(id);
  }

  // Patients
  async getAllPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async getPatientById(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const patient: Patient = {
      ...insertPatient,
      id,
      createdAt: new Date().toISOString(),
    };
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: string, insertPatient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const existing = this.patients.get(id);
    if (!existing) return undefined;
    
    const updated: Patient = { ...existing, ...insertPatient };
    this.patients.set(id, updated);
    
    // If patient name changed, update all visits with the new name
    if (insertPatient.name) {
      const patientVisits = Array.from(this.visits.values()).filter(v => v.patientId === id);
      for (const visit of patientVisits) {
        visit.patientName = insertPatient.name;
        this.visits.set(visit.id, visit);
      }
    }
    
    return updated;
  }

  async deletePatient(id: string): Promise<boolean> {
    // Get all visits for this patient
    const patientVisits = Array.from(this.visits.values()).filter(v => v.patientId === id);
    
    // Delete all test results for each visit
    for (const visit of patientVisits) {
      const visitResults = Array.from(this.testResults.values()).filter(r => r.visitId === visit.id);
      for (const result of visitResults) {
        this.testResults.delete(result.id);
      }
    }
    
    // Delete all visits for this patient
    for (const visit of patientVisits) {
      this.visits.delete(visit.id);
    }
    
    // Finally, delete the patient
    return this.patients.delete(id);
  }

  // Visits
  async getAllVisits(): Promise<Visit[]> {
    return Array.from(this.visits.values());
  }

  async getVisitById(id: string): Promise<Visit | undefined> {
    return this.visits.get(id);
  }

  async getVisitsByPatientId(patientId: string): Promise<Visit[]> {
    return Array.from(this.visits.values()).filter(v => v.patientId === patientId);
  }

  async getVisitsByDate(date: string): Promise<Visit[]> {
    return Array.from(this.visits.values()).filter(v => v.visitDate === date);
  }

  async createVisit(insertVisit: InsertVisit): Promise<Visit> {
    const id = randomUUID();
    const visit: Visit = {
      ...insertVisit,
      id,
      createdAt: new Date().toISOString(),
    };
    this.visits.set(id, visit);
    return visit;
  }

  async updateVisit(id: string, insertVisit: Partial<InsertVisit>): Promise<Visit | undefined> {
    const existing = this.visits.get(id);
    if (!existing) return undefined;
    
    const updated: Visit = { ...existing, ...insertVisit };
    this.visits.set(id, updated);
    return updated;
  }

  async deleteVisit(id: string): Promise<boolean> {
    return this.visits.delete(id);
  }

  // Test Results
  async getAllTestResults(): Promise<TestResult[]> {
    return Array.from(this.testResults.values());
  }

  async getTestResultsByVisitId(visitId: string): Promise<TestResult[]> {
    return Array.from(this.testResults.values()).filter(r => r.visitId === visitId);
  }

  async createTestResult(insertResult: InsertTestResult): Promise<TestResult> {
    const id = randomUUID();
    const result: TestResult = {
      ...insertResult,
      id,
      createdAt: new Date().toISOString(),
    };
    this.testResults.set(id, result);
    return result;
  }

  async updateTestResult(id: string, insertResult: Partial<InsertTestResult>): Promise<TestResult | undefined> {
    const existing = this.testResults.get(id);
    if (!existing) return undefined;
    
    const updated: TestResult = { ...existing, ...insertResult };
    this.testResults.set(id, updated);
    
    // Bidirectional sync: Update test's normal range if changed
    if (insertResult.normalRange && updated.testId) {
      const test = this.tests.get(updated.testId);
      if (test) {
        test.normalRange = insertResult.normalRange;
        this.tests.set(test.id, test);
      }
    }
    
    return updated;
  }

  async deleteTestResult(id: string): Promise<boolean> {
    return this.testResults.delete(id);
  }

  // Expenses
  async getAllExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }

  async getExpensesByDate(date: string): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(e => e.date === date);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const expense: Expense = {
      ...insertExpense,
      id,
      createdAt: new Date().toISOString(),
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: string, insertExpense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const existing = this.expenses.get(id);
    if (!existing) return undefined;
    
    const updated: Expense = { ...existing, ...insertExpense };
    this.expenses.set(id, updated);
    return updated;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Settings
  async getAllSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  async getSettingByKey(key: string): Promise<Setting | undefined> {
    return Array.from(this.settings.values()).find(s => s.key === key);
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    const existing = await this.getSettingByKey(insertSetting.key);
    
    if (existing) {
      const updated: Setting = { ...existing, value: insertSetting.value };
      this.settings.set(existing.id, updated);
      return updated;
    }
    
    const id = randomUUID();
    const setting: Setting = { ...insertSetting, id };
    this.settings.set(id, setting);
    return setting;
  }

  // Dashboard Layouts (not implemented for MemStorage)
  async getAllDashboardLayouts(): Promise<DashboardLayout[]> {
    return [];
  }

  async getDashboardLayoutByName(_sectionName: string): Promise<DashboardLayout | undefined> {
    return undefined;
  }

  async upsertDashboardLayout(_layout: InsertDashboardLayout): Promise<DashboardLayout> {
    throw new Error("Dashboard layouts not supported in MemStorage");
  }

  async initializeDefaultLayouts(): Promise<void> {
    // No-op for MemStorage
  }

  // Data Management
  async deleteAllData(): Promise<void> {
    this.patients.clear();
    this.visits.clear();
    this.testResults.clear();
    this.expenses.clear();
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // Helper function to convert timestamp to ISO string
  private toISOString(date: Date | null): string {
    return date ? date.toISOString() : new Date().toISOString();
  }

  // Helper function to convert null to undefined for optional fields
  private nullToUndefined<T>(value: T | null): T | undefined {
    return value === null ? undefined : value;
  }

  // --- USERS (NEW) ---
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    return {
      ...user,
      permissions: user.permissions || undefined,
      createdAt: this.toISOString(user.createdAt)
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return undefined;
    return {
      ...user,
      permissions: user.permissions || undefined,
      createdAt: this.toISOString(user.createdAt)
    };
  }

  async getAllUsers(): Promise<User[]> {
    const results = await db.select().from(users).orderBy(desc(users.createdAt));
    return results.map(user => ({
      ...user,
      permissions: user.permissions || undefined,
      createdAt: this.toISOString(user.createdAt)
    }));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const [user] = await db.insert(users).values({
      id,
      ...insertUser,
    }).returning();
    return {
      ...user,
      permissions: user.permissions || undefined,
      createdAt: this.toISOString(user.createdAt)
    };
  }

  async updateUser(id: string, updateUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users)
      .set(updateUser)
      .where(eq(users.id, id))
      .returning();
    return {
      ...user,
      permissions: user.permissions || undefined,
      createdAt: this.toISOString(user.createdAt)
    };
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Tests
  async getAllTests(): Promise<Test[]> {
    const results = await db.select().from(tests);
    return results.map(r => ({
      id: r.id,
      name: r.name,
      unit: this.nullToUndefined(r.unit),
      normalRange: this.nullToUndefined(r.normalRange),
      price: this.nullToUndefined(r.price),
      testType: (r.testType as "standard" | "urine") || "standard",
      createdAt: this.toISOString(r.createdAt),
    }));
  }

  async getTestById(id: string): Promise<Test | undefined> {
    const [result] = await db.select().from(tests).where(eq(tests.id, id));
    if (!result) return undefined;
    return {
      id: result.id,
      name: result.name,
      unit: this.nullToUndefined(result.unit),
      normalRange: this.nullToUndefined(result.normalRange),
      price: this.nullToUndefined(result.price),
      testType: (result.testType as "standard" | "urine") || "standard",
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async createTest(insertTest: InsertTest): Promise<Test> {
    const id = randomUUID();
    const [result] = await db.insert(tests).values({
      id,
      ...insertTest,
    }).returning();
    return {
      id: result.id,
      name: result.name,
      unit: this.nullToUndefined(result.unit),
      normalRange: this.nullToUndefined(result.normalRange),
      price: this.nullToUndefined(result.price),
      testType: (result.testType as "standard" | "urine") || "standard",
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async updateTest(id: string, insertTest: Partial<InsertTest>): Promise<Test | undefined> {
    const [result] = await db.update(tests)
      .set(insertTest)
      .where(eq(tests.id, id))
      .returning();
    
    if (!result) return undefined;

    // Bidirectional sync: Update all test results that reference this test
    if (insertTest.normalRange !== undefined) {
      await db.update(testResults)
        .set({ normalRange: insertTest.normalRange })
        .where(eq(testResults.testId, id));
    }

    return {
      id: result.id,
      name: result.name,
      unit: this.nullToUndefined(result.unit),
      normalRange: this.nullToUndefined(result.normalRange),
      price: this.nullToUndefined(result.price),
      testType: (result.testType as "standard" | "urine") || "standard",
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async deleteTest(id: string): Promise<boolean> {
    const result = await db.delete(tests).where(eq(tests.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Patients
  async getAllPatients(): Promise<Patient[]> {
    const results = await db.select().from(patients);
    return results.map(r => ({
      id: r.id,
      name: r.name,
      age: this.nullToUndefined(r.age),
      gender: this.nullToUndefined(r.gender),
      phone: this.nullToUndefined(r.phone),
      source: this.nullToUndefined(r.source),
      createdAt: this.toISOString(r.createdAt),
    }));
  }

  async getPatientById(id: string): Promise<Patient | undefined> {
    const [result] = await db.select().from(patients).where(eq(patients.id, id));
    if (!result) return undefined;
    return {
      id: result.id,
      name: result.name,
      age: this.nullToUndefined(result.age),
      gender: this.nullToUndefined(result.gender),
      phone: this.nullToUndefined(result.phone),
      source: this.nullToUndefined(result.source),
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const [result] = await db.insert(patients).values({
      id,
      ...insertPatient,
    }).returning();
    return {
      id: result.id,
      name: result.name,
      age: this.nullToUndefined(result.age),
      gender: this.nullToUndefined(result.gender),
      phone: this.nullToUndefined(result.phone),
      source: this.nullToUndefined(result.source),
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async updatePatient(id: string, insertPatient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [result] = await db.update(patients)
      .set(insertPatient)
      .where(eq(patients.id, id))
      .returning();
    if (!result) return undefined;
    
    // If patient name changed, update all visits with the new name
    if (insertPatient.name) {
      await db.update(visits)
        .set({ patientName: insertPatient.name })
        .where(eq(visits.patientId, id));
    }
    
    return {
      id: result.id,
      name: result.name,
      age: this.nullToUndefined(result.age),
      gender: this.nullToUndefined(result.gender),
      phone: this.nullToUndefined(result.phone),
      source: this.nullToUndefined(result.source),
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async deletePatient(id: string): Promise<boolean> {
    // First, get all visits for this patient
    const patientVisits = await db.select().from(visits).where(eq(visits.patientId, id));
    
    // Delete all test results for each visit
    for (const visit of patientVisits) {
      await db.delete(testResults).where(eq(testResults.visitId, visit.id));
    }
    
    // Delete all visits for this patient
    await db.delete(visits).where(eq(visits.patientId, id));
    
    // Finally, delete the patient
    const result = await db.delete(patients).where(eq(patients.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Visits
  async getAllVisits(): Promise<Visit[]> {
    const results = await db.select().from(visits);
    return results.map(r => ({
      ...r,
      createdAt: this.toISOString(r.createdAt),
    }));
  }

  async getVisitById(id: string): Promise<Visit | undefined> {
    const [result] = await db.select().from(visits).where(eq(visits.id, id));
    if (!result) return undefined;
    return {
      ...result,
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async getVisitsByPatientId(patientId: string): Promise<Visit[]> {
    const results = await db.select().from(visits).where(eq(visits.patientId, patientId));
    return results.map(r => ({
      ...r,
      createdAt: this.toISOString(r.createdAt),
    }));
  }

  async getVisitsByDate(date: string): Promise<Visit[]> {
    const results = await db.select().from(visits).where(eq(visits.visitDate, date));
    return results.map(r => ({
      ...r,
      createdAt: this.toISOString(r.createdAt),
    }));
  }

  async createVisit(insertVisit: InsertVisit): Promise<Visit> {
    const id = randomUUID();
    const [result] = await db.insert(visits).values({
      id,
      ...insertVisit,
    }).returning();
    return {
      ...result,
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async updateVisit(id: string, insertVisit: Partial<InsertVisit>): Promise<Visit | undefined> {
    const [result] = await db.update(visits)
      .set(insertVisit)
      .where(eq(visits.id, id))
      .returning();
    if (!result) return undefined;
    return {
      ...result,
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async deleteVisit(id: string): Promise<boolean> {
    const result = await db.delete(visits).where(eq(visits.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Test Results
  async getAllTestResults(): Promise<TestResult[]> {
    const results = await db.select().from(testResults);
    return results.map(r => ({
      id: r.id,
      visitId: r.visitId,
      testId: r.testId,
      testName: r.testName,
      result: this.nullToUndefined(r.result),
      unit: this.nullToUndefined(r.unit),
      normalRange: this.nullToUndefined(r.normalRange),
      price: this.nullToUndefined(r.price),
      testType: (r.testType as "standard" | "urine") || "standard",
      urineData: r.urineData || undefined,
      createdAt: this.toISOString(r.createdAt),
    }));
  }

  async getTestResultsByVisitId(visitId: string): Promise<TestResult[]> {
    const results = await db.select().from(testResults).where(eq(testResults.visitId, visitId));
    return results.map(r => ({
      id: r.id,
      visitId: r.visitId,
      testId: r.testId,
      testName: r.testName,
      result: this.nullToUndefined(r.result),
      unit: this.nullToUndefined(r.unit),
      normalRange: this.nullToUndefined(r.normalRange),
      price: this.nullToUndefined(r.price),
      testType: (r.testType as "standard" | "urine") || "standard",
      urineData: r.urineData || undefined,
      createdAt: this.toISOString(r.createdAt),
    }));
  }

  async createTestResult(insertResult: InsertTestResult): Promise<TestResult> {
    const id = randomUUID();
    const [result] = await db.insert(testResults).values({
      id,
      ...insertResult,
    }).returning();
    return {
      id: result.id,
      visitId: result.visitId,
      testId: result.testId,
      testName: result.testName,
      result: this.nullToUndefined(result.result),
      unit: this.nullToUndefined(result.unit),
      normalRange: this.nullToUndefined(result.normalRange),
      price: this.nullToUndefined(result.price),
      testType: (result.testType as "standard" | "urine") || "standard",
      urineData: result.urineData || undefined,
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async updateTestResult(id: string, insertResult: Partial<InsertTestResult>): Promise<TestResult | undefined> {
    const [result] = await db.update(testResults)
      .set(insertResult)
      .where(eq(testResults.id, id))
      .returning();
    if (!result) return undefined;

    // Bidirectional sync: Update test's normal range if changed
    if (insertResult.normalRange && result.testId) {
      await db.update(tests)
        .set({ normalRange: insertResult.normalRange })
        .where(eq(tests.id, result.testId));
    }

    return {
      id: result.id,
      visitId: result.visitId,
      testId: result.testId,
      testName: result.testName,
      result: this.nullToUndefined(result.result),
      unit: this.nullToUndefined(result.unit),
      normalRange: this.nullToUndefined(result.normalRange),
      price: this.nullToUndefined(result.price),
      testType: (result.testType as "standard" | "urine") || "standard",
      urineData: result.urineData || undefined,
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async deleteTestResult(id: string): Promise<boolean> {
    const result = await db.delete(testResults).where(eq(testResults.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Expenses
  async getAllExpenses(): Promise<Expense[]> {
    const results = await db.select().from(expenses);
    return results.map(r => ({
      ...r,
      createdAt: this.toISOString(r.createdAt),
    }));
  }

  async getExpensesByDate(date: string): Promise<Expense[]> {
    const results = await db.select().from(expenses).where(eq(expenses.date, date));
    return results.map(r => ({
      ...r,
      createdAt: this.toISOString(r.createdAt),
    }));
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const [result] = await db.insert(expenses).values({
      id,
      ...insertExpense,
    }).returning();
    return {
      ...result,
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async updateExpense(id: string, insertExpense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [result] = await db.update(expenses)
      .set(insertExpense)
      .where(eq(expenses.id, id))
      .returning();
    if (!result) return undefined;
    return {
      ...result,
      createdAt: this.toISOString(result.createdAt),
    };
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Settings
  async getAllSettings(): Promise<Setting[]> {
    const results = await db.select().from(settings);
    return results;
  }

  async getSettingByKey(key: string): Promise<Setting | undefined> {
    const [result] = await db.select().from(settings).where(eq(settings.key, key));
    return result || undefined;
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    const existing = await this.getSettingByKey(insertSetting.key);
    
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ value: insertSetting.value })
        .where(eq(settings.key, insertSetting.key))
        .returning();
      return updated;
    }
    
    const id = randomUUID();
    const [created] = await db.insert(settings).values({
      id,
      ...insertSetting,
    }).returning();
    return created;
  }

  // Dashboard Layouts
  async getAllDashboardLayouts(): Promise<DashboardLayout[]> {
    const results = await db.select().from(dashboardLayouts);
    return results.map(r => ({
      ...r,
      color: this.nullToUndefined(r.color),
    }));
  }

  async getDashboardLayoutByName(sectionName: string): Promise<DashboardLayout | undefined> {
    const [result] = await db.select().from(dashboardLayouts).where(eq(dashboardLayouts.sectionName, sectionName));
    if (!result) return undefined;
    return {
      ...result,
      color: this.nullToUndefined(result.color),
    };
  }

  async upsertDashboardLayout(insertLayout: InsertDashboardLayout): Promise<DashboardLayout> {
    try {
      const id = randomUUID();
      const [result] = await db
        .insert(dashboardLayouts)
        .values({
          id,
          ...insertLayout,
        })
        .onConflictDoUpdate({
          target: dashboardLayouts.sectionName,
          set: {
            displayName: insertLayout.displayName,
            positionX: insertLayout.positionX,
            positionY: insertLayout.positionY,
            width: insertLayout.width,
            height: insertLayout.height,
            color: insertLayout.color,
            route: insertLayout.route,
          },
        })
        .returning();
      
      return {
        ...result,
        color: this.nullToUndefined(result.color),
      };
    } catch (error) {
      console.error("Error upserting dashboard layout:", error);
      throw error;
    }
  }

  async initializeDefaultLayouts(): Promise<void> {
    const defaultLayouts: InsertDashboardLayout[] = [
      { sectionName: "tests", displayName: "Tests & Prices", positionX: 0, positionY: 0, width: 1, height: 1, color: "from-blue-500/10 to-blue-500/5", route: "/tests" },
      { sectionName: "patients", displayName: "Patients", positionX: 1, positionY: 0, width: 1, height: 1, color: "from-green-500/10 to-green-500/5", route: "/patients" },
      { sectionName: "results", displayName: "Results", positionX: 2, positionY: 0, width: 1, height: 1, color: "from-purple-500/10 to-purple-500/5", route: "/results" },
      { sectionName: "reports", displayName: "Reports", positionX: 0, positionY: 1, width: 1, height: 1, color: "from-amber-500/10 to-amber-500/5", route: "/reports" },
      { sectionName: "settings", displayName: "Settings", positionX: 1, positionY: 1, width: 1, height: 1, color: "from-gray-500/10 to-gray-500/5", route: "/settings" },
    ];

    for (const layout of defaultLayouts) {
      await this.upsertDashboardLayout(layout);
    }
  }

  // Data Management
  async deleteAllData(): Promise<void> {
    await db.delete(testResults);
    await db.delete(visits);
    await db.delete(patients);
    await db.delete(expenses);
  }
}

export const storage = new DatabaseStorage();
