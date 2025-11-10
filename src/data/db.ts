import Dexie, { Table } from "dexie";

export type SectionKey = "tests" | "patients" | "results" | "reports" | "settings";

export interface TestRecord {
  id: string;
  name?: string;
  unit?: string;
  normalRange?: string;
  price?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatientRecord {
  id: string;
  name?: string;
  age?: string;
  gender?: string;
  phone?: string;
  source?: string;
  date: string;
  total?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatientTestRecord {
  id: string;
  patientId: string;
  testId?: string;
  testName?: string;
  unit?: string;
  normalRange?: string;
  price?: number;
  result?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  name?: string;
  amount?: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export interface DashboardWidgetRecord {
  sectionName: SectionKey;
  displayName: string;
  route: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export type PrintCustomization = {
  text: string;
  position: "top" | "bottom" | "side";
  orientation: "horizontal" | "vertical";
  textColor: string;
  backgroundColor: string;
  fontSize: number;
};

class LabDatabase extends Dexie {
  tests!: Table<TestRecord, string>;
  patients!: Table<PatientRecord, string>;
  patientTests!: Table<PatientTestRecord, string>;
  expenses!: Table<ExpenseRecord, string>;
  settings!: Table<SettingRecord, string>;
  layouts!: Table<DashboardWidgetRecord, string>;

  constructor() {
    super("lab-management-db");

    this.version(1).stores({
      tests: "id,name,updatedAt",
      patients: "id,date,source,name",
      patientTests: "id,patientId,testId,date",
      expenses: "id,date",
      settings: "key",
      layouts: "sectionName",
    });
  }
}

export const db = new LabDatabase();

export const DEFAULT_SECTIONS: DashboardWidgetRecord[] = [
  {
    sectionName: "tests",
    displayName: "Tests & Prices",
    route: "/tests",
    positionX: 0,
    positionY: 0,
    width: 4,
    height: 3,
    color: "from-sky-500/20 to-sky-500/10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    sectionName: "patients",
    displayName: "Patients",
    route: "/patients",
    positionX: 4,
    positionY: 0,
    width: 4,
    height: 3,
    color: "from-emerald-500/20 to-emerald-500/10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    sectionName: "results",
    displayName: "Results",
    route: "/results",
    positionX: 8,
    positionY: 0,
    width: 4,
    height: 3,
    color: "from-violet-500/20 to-violet-500/10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    sectionName: "reports",
    displayName: "Reports",
    route: "/reports",
    positionX: 0,
    positionY: 3,
    width: 6,
    height: 3,
    color: "from-amber-500/20 to-amber-500/10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    sectionName: "settings",
    displayName: "Settings",
    route: "/settings",
    positionX: 6,
    positionY: 3,
    width: 6,
    height: 3,
    color: "from-slate-500/20 to-slate-500/10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function initializeDefaults() {
  await db.open();

  const layoutCount = await db.layouts.count();
  if (layoutCount === 0) {
    await db.layouts.bulkAdd(DEFAULT_SECTIONS);
  }

  const defaultPrintSettings: Array<{ key: string; value: PrintCustomization }> = [
    [
      "print.results",
      {
        text: "",
        position: "bottom",
        orientation: "horizontal",
        textColor: "#0f172a",
        backgroundColor: "#ffffff",
        fontSize: 14,
      },
    ],
    [
      "print.reports",
      {
        text: "",
        position: "bottom",
        orientation: "horizontal",
        textColor: "#0f172a",
        backgroundColor: "#ffffff",
        fontSize: 14,
      },
    ],
  ].map(([key, value]) => ({ key, value: value as PrintCustomization }));

  for (const item of defaultPrintSettings) {
    const existing = await db.settings.get(item.key);
    if (!existing) {
      await db.settings.put({
        key: item.key,
        value: JSON.stringify(item.value),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const themeSetting = await db.settings.get("theme");
  if (!themeSetting) {
    await db.settings.put({
      key: "theme",
      value: "light",
      updatedAt: new Date().toISOString(),
    });
  }
}

export function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
