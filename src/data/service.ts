import { db, generateId, PrintCustomization } from "./db";

type TestInput = Partial<{
  id: string;
  name: string;
  unit: string;
  normalRange: string;
  price: number;
  createdAt: string;
}>;

export async function createTest(partial: TestInput = {}) {
  const record = buildTestRecord(partial);
  await db.tests.add(record);
  return record;
}

export async function updateTest(id: string, updates: Partial<TestInput>) {
  const now = new Date().toISOString();
  await db.tests.update(id, {
    ...updates,
    updatedAt: now,
  });

  if (updates.normalRange !== undefined) {
    await db.patientTests
      .where("testId")
      .equals(id)
      .modify((item) => {
        item.normalRange = updates.normalRange;
        item.updatedAt = now;
      });
  }
}

export async function deleteTest(id: string) {
  await db.transaction("rw", db.tests, db.patientTests, async () => {
    await db.tests.delete(id);
    await db.patientTests.where("testId").equals(id).delete();
  });
}

export interface PatientPayload {
  id?: string;
  name?: string;
  age?: string;
  gender?: string;
  phone?: string;
  source?: string;
  date: string;
  total?: number;
}

export interface SelectedTestPayload {
  testId?: string;
  testName?: string;
  unit?: string;
  normalRange?: string;
  price?: number;
}

export async function savePatientWithTests(patient: PatientPayload, tests: SelectedTestPayload[]) {
  const now = new Date().toISOString();
  const patientId = patient.id ?? generateId();

  const patientRecord = {
    id: patientId,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    source: patient.source,
    date: patient.date,
    total: patient.total,
    createdAt: patient.id ? await getCreatedAt("patients", patient.id) : now,
    updatedAt: now,
  };

  await db.transaction("rw", db.patients, db.patientTests, async () => {
    await db.patients.put(patientRecord);
    await db.patientTests.where("patientId").equals(patientId).delete();

    for (const entry of tests) {
      await db.patientTests.add(buildPatientTestRecord(patientId, patient.date, entry, now));
    }
  });

  return patientId;
}

export async function updatePatientTestResult(
  patientTestId: string,
  updates: Partial<{ result: string; unit: string; normalRange: string; price: number }>,
) {
  const now = new Date().toISOString();

  await db.transaction("rw", db.patientTests, db.tests, async () => {
    const current = await db.patientTests.get(patientTestId);
    if (!current) {
      return;
    }

    await db.patientTests.update(patientTestId, {
      ...updates,
      updatedAt: now,
    });

    if (updates.normalRange !== undefined && current.testId) {
      await db.tests.update(current.testId, {
        normalRange: updates.normalRange,
        updatedAt: now,
      });
      await db.patientTests.where("testId").equals(current.testId).modify((item) => {
        item.normalRange = updates.normalRange;
        item.updatedAt = now;
      });
    }

    if (updates.unit !== undefined && current.testId) {
      await db.tests.update(current.testId, {
        unit: updates.unit,
        updatedAt: now,
      });
    }

    if (updates.price !== undefined) {
      // price is stored on patientTests only
    }
  });
}

export async function deletePatient(patientId: string) {
  await db.transaction("rw", db.patients, db.patientTests, async () => {
    await db.patientTests.where("patientId").equals(patientId).delete();
    await db.patients.delete(patientId);
  });
}

export async function createExpense(name: string, amount: number, date: string) {
  const now = new Date().toISOString();
  await db.expenses.add({
    id: generateId(),
    name,
    amount,
    date,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateExpense(expenseId: string, updates: Partial<{ name: string; amount: number; date: string }>) {
  const now = new Date().toISOString();
  await db.expenses.update(expenseId, {
    ...updates,
    updatedAt: now,
  });
}

export async function deleteExpense(expenseId: string) {
  await db.expenses.delete(expenseId);
}

export async function persistLayout(sectionName: string, updates: Partial<{ positionX: number; positionY: number; width: number; height: number; color: string; displayName: string }>) {
  const now = new Date().toISOString();
  await db.layouts.update(sectionName, {
    ...updates,
    updatedAt: now,
  });
}

export async function renameSection(sectionName: string, displayName: string) {
  await persistLayout(sectionName, { displayName });
}

export async function recolorSection(sectionName: string, color: string) {
  await persistLayout(sectionName, { color });
}

export async function updatePrintCustomization(key: "print.results" | "print.reports", customization: PrintCustomization) {
  await db.settings.put({
    key,
    value: JSON.stringify(customization),
    updatedAt: new Date().toISOString(),
  });
}

export async function readPrintCustomization(key: "print.results" | "print.reports"): Promise<PrintCustomization> {
  const record = await db.settings.get(key);
  if (!record) {
    return {
      text: "",
      position: "bottom",
      orientation: "horizontal",
      textColor: "#0f172a",
      backgroundColor: "#ffffff",
      fontSize: 14,
    };
  }

  try {
    const parsed = JSON.parse(record.value) as PrintCustomization;
    return parsed;
  } catch {
    return {
      text: "",
      position: "bottom",
      orientation: "horizontal",
      textColor: "#0f172a",
      backgroundColor: "#ffffff",
      fontSize: 14,
    };
  }
}

export async function updateThemeSetting(theme: "light" | "dark") {
  await db.settings.put({
    key: "theme",
    value: theme,
    updatedAt: new Date().toISOString(),
  });
}

export async function readThemeSetting(): Promise<"light" | "dark"> {
  const record = await db.settings.get("theme");
  if (record?.value === "dark") {
    return "dark";
  }
  return "light";
}

export async function deleteAllData() {
  await db.transaction("rw", db.tests, db.patients, db.patientTests, db.expenses, async () => {
    await db.tests.clear();
    await db.patients.clear();
    await db.patientTests.clear();
    await db.expenses.clear();
  });
}

export interface LabDataExport {
  version: string;
  generatedAt: string;
  tests: unknown[];
  patients: unknown[];
  patientTests: unknown[];
  expenses: unknown[];
  settings: unknown[];
  layouts: unknown[];
}

export async function exportAllData(): Promise<LabDataExport> {
  const [tests, patients, patientTests, expenses, settings, layouts] = await Promise.all([
    db.tests.toArray(),
    db.patients.toArray(),
    db.patientTests.toArray(),
    db.expenses.toArray(),
    db.settings.toArray(),
    db.layouts.toArray(),
  ]);

  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    tests,
    patients,
    patientTests,
    expenses,
    settings,
    layouts,
  };
}

export async function importAllData(payload: LabDataExport) {
  if (!payload || payload.version !== "1.0.0") {
    throw new Error("Unsupported backup format.");
  }

  await db.transaction("rw", db.tests, db.patients, db.patientTests, db.expenses, db.settings, db.layouts, async () => {
    await db.tests.clear();
    await db.patients.clear();
    await db.patientTests.clear();
    await db.expenses.clear();
    await db.settings.clear();
    await db.layouts.clear();

    await db.tests.bulkAdd(payload.tests as any);
    await db.patients.bulkAdd(payload.patients as any);
    await db.patientTests.bulkAdd(payload.patientTests as any);
    await db.expenses.bulkAdd(payload.expenses as any);
    await db.settings.bulkAdd(payload.settings as any);
    await db.layouts.bulkAdd(payload.layouts as any);
  });
}

async function getCreatedAt(table: "patients" | "tests" | "patientTests" | "expenses", id: string) {
  const record = await (db as any)[table].get(id);
  return record?.createdAt ?? new Date().toISOString();
}

function buildTestRecord(partial: Partial<{
  id: string;
  name: string;
  unit: string;
  normalRange: string;
  price: number;
}>) {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? generateId(),
    name: partial.name,
    unit: partial.unit,
    normalRange: partial.normalRange,
    price: partial.price,
    createdAt: partial.id ? partial.createdAt ?? now : now,
    updatedAt: now,
  };
}

function buildPatientTestRecord(patientId: string, date: string, entry: SelectedTestPayload, now: string) {
  return {
    id: generateId(),
    patientId,
    testId: entry.testId,
    testName: entry.testName,
    unit: entry.unit,
    normalRange: entry.normalRange,
    price: entry.price,
    date,
    createdAt: now,
    updatedAt: now,
  };
}
