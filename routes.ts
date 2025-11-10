import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertTestSchema,
  insertPatientSchema,
  insertVisitSchema,
  insertTestResultSchema,
  insertExpenseSchema,
  insertSettingSchema,
  insertDashboardLayoutSchema,
  loginSchema,
  type InsertTest,
  type Test,
  type TestResult,
} from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
    username?: string;
  }
}

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.authenticated) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Login
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      if (username === "KAROZH" && password === "Karoj1996") {
        req.session.authenticated = true;
        req.session.username = username;
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ success: false, message: "Invalid username or password" });
      }
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  // Session validation
  app.get("/api/session", (req, res) => {
    if (req.session?.authenticated) {
      res.json({ authenticated: true, username: req.session.username });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Logout
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Failed to logout" });
      } else {
        res.json({ success: true });
      }
    });
  });

  // Tests Routes
  app.get("/api/tests", requireAuth, async (req, res) => {
    const tests = await storage.getAllTests();
    res.json(tests);
  });

  app.get("/api/tests/:id", requireAuth, async (req, res) => {
    const test = await storage.getTestById(req.params.id);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }
    res.json(test);
  });

  app.post("/api/tests", requireAuth, async (req, res) => {
    try {
      const data = insertTestSchema.parse(req.body);
      const test = await storage.createTest(data);
      res.json(test);
    } catch (error) {
      res.status(400).json({ error: "Invalid test data" });
    }
  });

  app.put("/api/tests/:id", requireAuth, async (req, res) => {
    try {
      const data = insertTestSchema.partial().parse(req.body);
      const test = await storage.updateTest(req.params.id, data);
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      res.status(400).json({ error: "Invalid test data" });
    }
  });

  app.delete("/api/tests/:id", requireAuth, async (req, res) => {
    const success = await storage.deleteTest(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Test not found" });
    }
    res.json({ success: true });
  });

  app.post("/api/tests/add-urine-test", requireAuth, async (_req, res) => {
    try {
      const allTests = await storage.getAllTests();
      const urinePayload = {
        name: "Urine",
        unit: "",
        normalRange: "",
        price: 4,
        testType: "urine" as const,
      };

      const existing = allTests.find(
        (t) => t.testType === "urine" || t.name.toLowerCase() === "urine"
      );

      if (existing) {
        const updated = await storage.updateTest(existing.id, urinePayload);
        return res.json({
          success: true,
          message: "Urine Analysis test refreshed successfully",
          test: updated ?? existing,
        });
      }

      const urineTest = await storage.createTest(urinePayload);

      res.json({
        success: true,
        message: "Urine Analysis test added successfully",
        test: urineTest,
      });
    } catch (error) {
      console.error("Error adding urine test:", error);
      res.status(500).json({ error: "Failed to add urine test" });
    }
  });

  app.post("/api/tests/initialize-defaults", requireAuth, async (_req, res) => {
    try {
      const existingTests = await storage.getAllTests();
      const existingMap = new Map(
        existingTests.map((test) => [test.name.trim().toLowerCase(), test])
      );

        const defaultTests: Array<Omit<InsertTest, "testType">> = [
        { name: "CBC Blood Count", unit: "cells/μL", normalRange: "4500-11000", price: 8 },
        { name: "Glucose (Fasting)", unit: "mg/dL", normalRange: "70-100", price: 3 },
        { name: "BUN", unit: "mg/dL", normalRange: "7-20", price: 4 },
        { name: "Creatinine", unit: "mg/dL", normalRange: "0.6-1.2", price: 4 },
        { name: "Uric Acid", unit: "mg/dL", normalRange: "3.5-7.2", price: 5 },
        { name: "Total Cholesterol", unit: "mg/dL", normalRange: "<200", price: 5 },
        { name: "Triglycerides", unit: "mg/dL", normalRange: "<150", price: 5 },
        { name: "HDL Cholesterol", unit: "mg/dL", normalRange: ">40", price: 6 },
        { name: "LDL Cholesterol", unit: "mg/dL", normalRange: "<100", price: 6 },
        { name: "VLDL Cholesterol", unit: "mg/dL", normalRange: "<30", price: 6 },
        { name: "AST (SGOT)", unit: "U/L", normalRange: "10-40", price: 5 },
        { name: "ALT (SGPT)", unit: "U/L", normalRange: "7-56", price: 5 },
        { name: "ALP", unit: "U/L", normalRange: "44-147", price: 5 },
        { name: "Total Bilirubin", unit: "mg/dL", normalRange: "0.1-1.2", price: 5 },
        { name: "Direct Bilirubin", unit: "mg/dL", normalRange: "0.0-0.3", price: 5 },
        { name: "Indirect Bilirubin", unit: "mg/dL", normalRange: "0.1-1.0", price: 5 },
        { name: "Total Protein", unit: "g/dL", normalRange: "6.0-8.3", price: 4 },
        { name: "Albumin", unit: "g/dL", normalRange: "3.5-5.5", price: 4 },
        { name: "Globulin", unit: "g/dL", normalRange: "2.0-3.5", price: 4 },
        { name: "A/G Ratio", unit: "ratio", normalRange: "1.0-2.5", price: 4 },
        { name: "TSH", unit: "μIU/mL", normalRange: "0.4-4.0", price: 15 },
        { name: "T3", unit: "ng/dL", normalRange: "80-200", price: 15 },
        { name: "T4", unit: "μg/dL", normalRange: "5.0-12.0", price: 15 },
        { name: "Free T3", unit: "pg/mL", normalRange: "2.3-4.2", price: 18 },
        { name: "Free T4", unit: "ng/dL", normalRange: "0.8-1.8", price: 18 },
        { name: "FSH", unit: "mIU/mL", normalRange: "Varies", price: 20 },
        { name: "LH", unit: "mIU/mL", normalRange: "Varies", price: 20 },
        { name: "Testosterone", unit: "ng/dL", normalRange: "Varies", price: 25 },
        { name: "Estradiol", unit: "pg/mL", normalRange: "Varies", price: 25 },
        { name: "Progesterone", unit: "ng/mL", normalRange: "Varies", price: 20 },
        { name: "Prolactin", unit: "ng/mL", normalRange: "2-18", price: 20 },
        { name: "Cortisol", unit: "μg/dL", normalRange: "5-25", price: 20 },
        { name: "Vitamin D", unit: "ng/mL", normalRange: "30-100", price: 30 },
        { name: "Vitamin B12", unit: "pg/mL", normalRange: "200-900", price: 25 },
        { name: "Folate", unit: "ng/mL", normalRange: "2.7-17.0", price: 20 },
        { name: "Iron", unit: "μg/dL", normalRange: "60-170", price: 8 },
        { name: "TIBC", unit: "μg/dL", normalRange: "250-450", price: 8 },
        { name: "Ferritin", unit: "ng/mL", normalRange: "12-300", price: 15 },
        { name: "Transferrin", unit: "mg/dL", normalRange: "200-360", price: 10 },
        { name: "Calcium", unit: "mg/dL", normalRange: "8.5-10.5", price: 5 },
        { name: "Phosphorus", unit: "mg/dL", normalRange: "2.5-4.5", price: 5 },
        { name: "Magnesium", unit: "mg/dL", normalRange: "1.7-2.2", price: 6 },
        { name: "Sodium", unit: "mEq/L", normalRange: "136-145", price: 5 },
        { name: "Potassium", unit: "mEq/L", normalRange: "3.5-5.0", price: 5 },
        { name: "Chloride", unit: "mEq/L", normalRange: "98-107", price: 5 },
        { name: "HbA1c", unit: "%", normalRange: "<5.7", price: 15 },
        { name: "CRP", unit: "mg/L", normalRange: "<3.0", price: 10 },
        { name: "ESR", unit: "mm/hr", normalRange: "<20", price: 6 },
        { name: "PSA", unit: "ng/mL", normalRange: "<4.0", price: 20 },
        { name: "CEA", unit: "ng/mL", normalRange: "<3.0", price: 25 },
        { name: "CA 19-9", unit: "U/mL", normalRange: "<37", price: 30 },
        { name: "CA 125", unit: "U/mL", normalRange: "<35", price: 30 },
        { name: "AFP", unit: "ng/mL", normalRange: "<10", price: 25 },
        { name: "HBsAg", unit: "", normalRange: "Negative", price: 10 },
        { name: "Anti-HCV", unit: "", normalRange: "Negative", price: 12 },
        { name: "HIV", unit: "", normalRange: "Negative", price: 15 },
        { name: "VDRL", unit: "", normalRange: "Non-Reactive", price: 8 },
        { name: "Widal Test", unit: "", normalRange: "Negative", price: 10 },
        { name: "CK", unit: "U/L", normalRange: "30-200", price: 10 },
        { name: "CK-MB", unit: "U/L", normalRange: "<25", price: 15 },
        { name: "Troponin I", unit: "ng/mL", normalRange: "<0.04", price: 25 },
        { name: "LDH", unit: "U/L", normalRange: "140-280", price: 8 },
        { name: "Amylase", unit: "U/L", normalRange: "30-110", price: 8 },
        { name: "Lipase", unit: "U/L", normalRange: "0-160", price: 10 },
        { name: "PTH", unit: "pg/mL", normalRange: "10-65", price: 20 },
        { name: "PT Urine", unit: "", normalRange: "Positive/Negative", price: 5 },
        { name: "PT Serum", unit: "", normalRange: "Positive/Negative", price: 5 }
      ];

        const createdTests: Test[] = [];
        const updatedTests: Test[] = [];

      for (const test of defaultTests) {
        const key = test.name.trim().toLowerCase();
        const payload = { ...test, testType: "standard" as const };

        if (existingMap.has(key)) {
          const existing = existingMap.get(key)!;
          const updated = await storage.updateTest(existing.id, payload);
          updatedTests.push(updated ?? existing);
        } else {
          const created = await storage.createTest(payload);
          createdTests.push(created);
          existingMap.set(key, created);
        }
      }

      // Add special Urine Analysis test
      const urineKey = "urine";
      const urinePayload = {
        name: "Urine",
        unit: "",
        normalRange: "",
        price: 4,
        testType: "urine" as const,
      };

      if (existingMap.has(urineKey)) {
        const existing = existingMap.get(urineKey)!;
        const updated = await storage.updateTest(existing.id, urinePayload);
        updatedTests.push(updated ?? existing);
      } else {
        const urineTest = await storage.createTest(urinePayload);
        createdTests.push(urineTest);
        existingMap.set(urineKey, urineTest);
      }

      res.json({
        success: true,
        message: `Default tests processed: ${createdTests.length} added, ${updatedTests.length} refreshed`,
        created: createdTests.length,
        updated: updatedTests.length,
      });
    } catch (error) {
      console.error("Error initializing default tests:", error);
      res.status(500).json({ error: "Failed to initialize default tests" });
    }
  });

  // Patients Routes
  app.get("/api/patients", requireAuth, async (req, res) => {
    const patients = await storage.getAllPatients();
    res.json(patients);
  });

  app.get("/api/patients/:id", requireAuth, async (req, res) => {
    const patient = await storage.getPatientById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    res.json(patient);
  });

  app.post("/api/patients", requireAuth, async (req, res) => {
    try {
      const data = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(data);
      res.json(patient);
    } catch (error) {
      res.status(400).json({ error: "Invalid patient data" });
    }
  });

  app.put("/api/patients/:id", requireAuth, async (req, res) => {
    try {
      const data = insertPatientSchema.partial().parse(req.body);
      const patient = await storage.updatePatient(req.params.id, data);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(400).json({ error: "Invalid patient data" });
    }
  });

  app.delete("/api/patients/:id", requireAuth, async (req, res) => {
    const success = await storage.deletePatient(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Patient not found" });
    }
    res.json({ success: true });
  });

  // Visits Routes
  app.get("/api/visits", requireAuth, async (req, res) => {
    const { date, patientId } = req.query;
    
    if (date) {
      const visits = await storage.getVisitsByDate(date as string);
      return res.json(visits);
    }
    
    if (patientId) {
      const visits = await storage.getVisitsByPatientId(patientId as string);
      return res.json(visits);
    }
    
    const visits = await storage.getAllVisits();
    res.json(visits);
  });

  app.get("/api/visits/:id", requireAuth, async (req, res) => {
    const visit = await storage.getVisitById(req.params.id);
    if (!visit) {
      return res.status(404).json({ error: "Visit not found" });
    }
    res.json(visit);
  });

  app.post("/api/visits", requireAuth, async (req, res) => {
    try {
      const data = insertVisitSchema.parse(req.body);
      const visit = await storage.createVisit(data);
      res.json(visit);
    } catch (error: any) {
      console.error("Visit validation error:", error);
      res.status(400).json({ 
        error: "Invalid visit data",
        details: error.errors || error.message 
      });
    }
  });

  app.put("/api/visits/:id", requireAuth, async (req, res) => {
    try {
      const data = insertVisitSchema.partial().parse(req.body);
      const visit = await storage.updateVisit(req.params.id, data);
      if (!visit) {
        return res.status(404).json({ error: "Visit not found" });
      }
      res.json(visit);
    } catch (error) {
      res.status(400).json({ error: "Invalid visit data" });
    }
  });

  app.delete("/api/visits/:id", requireAuth, async (req, res) => {
    const success = await storage.deleteVisit(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Visit not found" });
    }
    res.json({ success: true });
  });

  // Test Results Routes
  app.get("/api/test-results", requireAuth, async (req, res) => {
    const { visitId } = req.query;
    
    if (visitId) {
      const results = await storage.getTestResultsByVisitId(visitId as string);
      return res.json(results);
    }
    
    const results = await storage.getAllTestResults();
    res.json(results);
  });

  app.post("/api/test-results", requireAuth, async (req, res) => {
    try {
      const data = insertTestResultSchema.parse(req.body);
      const result = await storage.createTestResult(data);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: "Invalid test result data" });
    }
  });

  // Batch update endpoint for better performance
  app.put("/api/test-results/batch", requireAuth, async (req, res) => {
    try {
      const updates = z.array(z.object({
        id: z.string(),
        data: insertTestResultSchema.partial()
      })).parse(req.body);

        const updatedResults: TestResult[] = [];
      const testUpdates = new Map<string, { unit?: string; normalRange?: string }>();

      // Process all test result updates
      for (const update of updates) {
        const result = await storage.updateTestResult(update.id, update.data);
        if (result) {
          updatedResults.push(result);

          // Collect test updates to batch them
          if ((update.data.unit !== undefined || update.data.normalRange !== undefined) && result.testId) {
            const existingUpdate = testUpdates.get(result.testId) || {};
            if (update.data.unit !== undefined) {
              existingUpdate.unit = update.data.unit;
            }
            if (update.data.normalRange !== undefined) {
              existingUpdate.normalRange = update.data.normalRange;
            }
            testUpdates.set(result.testId, existingUpdate);
          }
        }
      }

      // Batch update all affected tests
      for (const [testId, updateData] of Array.from(testUpdates.entries())) {
        try {
          const updatedTest = await storage.updateTest(testId, updateData);
          if (!updatedTest) {
            console.warn(`Warning: Test ${testId} not found when trying to auto-update from batch`);
          }
        } catch (testUpdateError) {
          console.error(`Error auto-updating test ${testId} from batch:`, testUpdateError);
        }
      }

      res.json({ success: true, updated: updatedResults.length });
    } catch (error) {
      console.error("Batch update error:", error);
      res.status(400).json({ error: "Invalid batch update data" });
    }
  });

  app.put("/api/test-results/:id", requireAuth, async (req, res) => {
    try {
      const data = insertTestResultSchema.partial().parse(req.body);
      const result = await storage.updateTestResult(req.params.id, data);
      if (!result) {
        return res.status(404).json({ error: "Test result not found" });
      }

      // Auto-update the original test if unit or normalRange changed
      if ((data.unit !== undefined || data.normalRange !== undefined) && result.testId) {
        const testUpdateData: any = {};
        if (data.unit !== undefined) {
          testUpdateData.unit = data.unit;
        }
        if (data.normalRange !== undefined) {
          testUpdateData.normalRange = data.normalRange;
        }
        
        try {
          // Update the original test in the tests table
          const updatedTest = await storage.updateTest(result.testId, testUpdateData);
          if (!updatedTest) {
            console.warn(`Warning: Test ${result.testId} not found when trying to auto-update from test result ${req.params.id}`);
          }
        } catch (testUpdateError) {
          console.error(`Error auto-updating test ${result.testId} from test result:`, testUpdateError);
          // Continue - test result was already saved successfully
        }
      }

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: "Invalid test result data" });
    }
  });

  app.delete("/api/test-results/:id", requireAuth, async (req, res) => {
    const success = await storage.deleteTestResult(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Test result not found" });
    }
    res.json({ success: true });
  });

  // Expenses Routes
  app.get("/api/expenses", requireAuth, async (req, res) => {
    const { date } = req.query;
    
    if (date) {
      const expenses = await storage.getExpensesByDate(date as string);
      return res.json(expenses);
    }
    
    const expenses = await storage.getAllExpenses();
    res.json(expenses);
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const data = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(data);
      res.json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid expense data" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const data = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, data);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid expense data" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    const success = await storage.deleteExpense(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json({ success: true });
  });

  // Settings Routes
  app.get("/api/settings", requireAuth, async (req, res) => {
    const { key } = req.query;
    
    if (key) {
      const setting = await storage.getSettingByKey(key as string);
      return res.json(setting || null);
    }
    
    const settings = await storage.getAllSettings();
    res.json(settings);
  });

  app.post("/api/settings", requireAuth, async (req, res) => {
    try {
      const data = insertSettingSchema.parse(req.body);
      const setting = await storage.setSetting(data);
      res.json(setting);
    } catch (error) {
      res.status(400).json({ error: "Invalid setting data" });
    }
  });

  // Dashboard Layouts Routes
  app.get("/api/dashboard-layouts", requireAuth, async (req, res) => {
    const layouts = await storage.getAllDashboardLayouts();
    res.json(layouts);
  });

  app.post("/api/dashboard-layouts/init", requireAuth, async (req, res) => {
    await storage.initializeDefaultLayouts();
    const layouts = await storage.getAllDashboardLayouts();
    res.json({ success: true, layouts });
  });

  app.put("/api/dashboard-layouts/:sectionName", requireAuth, async (req, res) => {
    try {
      const data = insertDashboardLayoutSchema.parse(req.body);
      const layout = await storage.upsertDashboardLayout(data);
      res.json(layout);
    } catch (error) {
      res.status(400).json({ error: "Invalid layout data" });
    }
  });

  // Data Management
  app.delete("/api/data", requireAuth, async (req, res) => {
    await storage.deleteAllData();
    res.json({ success: true, message: "All data deleted successfully" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
