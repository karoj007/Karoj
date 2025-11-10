import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Save, Trash2, UserRound, Banknote, Filter, Calendar, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { BackButton } from "@/components/BackButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useDebouncedEffect } from "@/hooks/useDebouncedEffect";
import { db, type TestRecord } from "@/data/db";
import { savePatientWithTests } from "@/data/service";
import { formatCurrency, parseCurrencyInput } from "@/utils/number";
import { todayKey, formatDisplayDate } from "@/utils/date";

interface SelectedTestEntry {
  id: string;
  testId?: string;
  name: string;
  unit?: string;
  normalRange?: string;
  price?: number;
}

interface PatientFormState {
  id?: string;
  name: string;
  age: string;
  gender: string;
  phone: string;
  source: string;
  date: string;
}

const genderOptions = ["", "Female", "Male", "Other"];

export default function Patients() {
  const tests = useLiveQuery(() => db.tests.toArray(), [], []) ?? [];
  const patients = useLiveQuery(() => db.patients.orderBy("date").reverse().toArray(), [], []) ?? [];
  const [activePatientId, setActivePatientId] = useState<string | undefined>();
  const [form, setForm] = useState<PatientFormState>({
    name: "",
    age: "",
    gender: "",
    phone: "",
    source: "",
    date: todayKey(),
  });
  const [selectedTests, setSelectedTests] = useState<SelectedTestEntry[]>([]);
  const [manualTotal, setManualTotal] = useState<string>("");
  const [testQuery, setTestQuery] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [testDeleteDialog, setTestDeleteDialog] = useState<{ open: boolean; id?: string }>({ open: false });
  const [isHydrating, setIsHydrating] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const computedTotal = useMemo(
    () => selectedTests.reduce((sum, current) => sum + (Number(current.price) || 0), 0),
    [selectedTests],
  );
  const effectiveTotal = useMemo(() => {
    const parsed = parseCurrencyInput(manualTotal);
    return manualTotal.trim().length ? parsed ?? computedTotal : computedTotal;
  }, [manualTotal, computedTotal]);

  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) =>
      [patient.name, patient.source, patient.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [patients, patientSearch]);

  const testSuggestions = useMemo(() => {
    const term = testQuery.trim().toLowerCase();
    if (!term) return [];
    return tests
      .filter((test) => (test.name ?? "").toLowerCase().startsWith(term))
      .slice(0, 8);
  }, [tests, testQuery]);

  useEffect(() => {
    const hydrate = async () => {
      if (!activePatientId) return;
      setIsHydrating(true);

      const record = await db.patients.get(activePatientId);
      if (!record) {
        setIsHydrating(false);
        return;
      }

      const testRecords = await db.patientTests.where("patientId").equals(activePatientId).toArray();
      setForm({
        id: record.id,
        name: record.name ?? "",
        age: record.age ?? "",
        gender: record.gender ?? "",
        phone: record.phone ?? "",
        source: record.source ?? "",
        date: record.date,
      });
      setSelectedTests(
        testRecords.map((entry) => ({
          id: entry.id,
          testId: entry.testId,
          name: entry.testName ?? "",
          unit: entry.unit ?? "",
          normalRange: entry.normalRange ?? "",
          price: entry.price ?? 0,
        })),
      );
      setManualTotal(record.total !== undefined ? String(record.total) : "");
      setHasSaved(true);

      setTimeout(() => setIsHydrating(false), 100);
    };

    hydrate();
  }, [activePatientId]);

  useDebouncedEffect(
    () => {
      if (!form.id || !hasSaved || isHydrating) return;
      const payload = buildSavePayload(form, selectedTests, effectiveTotal);
      savePatientWithTests(payload.patient, payload.tests).catch(() => {
        toast({
          title: "Auto-save failed",
          description: "Please retry saving the patient details manually.",
          variant: "destructive",
        });
      });
    },
    [form, selectedTests, manualTotal, effectiveTotal, hasSaved, isHydrating],
    800,
  );

  const handleFormChange = (field: keyof PatientFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTestFromRecord = (test: TestRecord) => {
    const alreadyAdded = selectedTests.some(
      (entry) => entry.testId === test.id || entry.name.toLowerCase() === (test.name ?? "").toLowerCase(),
    );
    if (alreadyAdded) {
      toast({
        title: "Already selected",
        description: "This test is already part of the selection.",
      });
      return;
    }
    setSelectedTests((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        testId: test.id,
        name: test.name ?? "Untitled test",
        unit: test.unit ?? "",
        normalRange: test.normalRange ?? "",
        price: test.price ?? 0,
      },
    ]);
    setTestQuery("");
  };

  const handleRemoveSelectedTest = (id: string) => {
    setSelectedTests((prev) => prev.filter((entry) => entry.id !== id));
    setTestDeleteDialog({ open: false, id: undefined });
  };

  const handleSelectedTestUpdate = (id: string, field: keyof SelectedTestEntry, value: string) => {
    setSelectedTests((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              [field]: field === "price" ? parseCurrencyInput(value) ?? 0 : value,
            }
          : entry,
      ),
    );
  };

  const handleResetForm = () => {
    setActivePatientId(undefined);
    setForm({
      name: "",
      age: "",
      gender: "",
      phone: "",
      source: "",
      date: todayKey(),
    });
    setSelectedTests([]);
    setManualTotal("");
    setHasSaved(false);
  };

  const handleSave = async () => {
    if (!selectedTests.length) {
      toast({
        title: "No tests selected",
        description: "Please choose at least one test for the patient.",
        variant: "destructive",
      });
      return;
    }
    setSaveDialogOpen(true);
  };

  const confirmSave = async () => {
    const payload = buildSavePayload(form, selectedTests, effectiveTotal);
    const id = await savePatientWithTests(payload.patient, payload.tests);
    setForm((prev) => ({ ...prev, id }));
    setActivePatientId(id);
    setHasSaved(true);
    setSaveDialogOpen(false);
    toast({
      title: "Patient saved",
      description: "Patient information has been written to the local database.",
    });
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setLocation("/")}>
                <span className="mr-2">🔙</span>
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
                  Patient Registry
                  <Badge variant="outline" className="bg-primary/5 text-primary">
                    auto-save active
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Register patients, assign tests, and capture billing details. Data is stored locally and synced in real-time.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BackButton />
              <Button variant="secondary" className="gap-2" onClick={handleSave}>
                <Save className="h-4 w-4" />
                Save Patient
              </Button>
              <Button variant="outline" onClick={handleResetForm}>
                Reset form
              </Button>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card className="shadow-lg border border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  Patient details
                </CardTitle>
                <CardDescription>All fields are optional. Information updates instantly after the first save.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Patient name</Label>
                    <Input value={form.name} onChange={(event) => handleFormChange("name", event.target.value)} placeholder="Enter full name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Age</Label>
                    <Input value={form.age} onChange={(event) => handleFormChange("age", event.target.value)} placeholder="Age" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Gender</Label>
                    <select
                      value={form.gender}
                      onChange={(event) => handleFormChange("gender", event.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {genderOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === "" ? "Unspecified" : option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone number</Label>
                    <Input value={form.phone} onChange={(event) => handleFormChange("phone", event.target.value)} placeholder="Optional contact" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Organization / Source</Label>
                    <Input value={form.source} onChange={(event) => handleFormChange("source", event.target.value)} placeholder="Referred by" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Visit date</Label>
                    <Input type="date" value={form.date} onChange={(event) => handleFormChange("date", event.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Select tests</Label>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        value={testQuery}
                        onChange={(event) => setTestQuery(event.target.value)}
                        placeholder="Type to search tests by name"
                        className="pl-9"
                      />
                      {testSuggestions.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow-lg">
                          {testSuggestions.map((test) => (
                            <button
                              key={test.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                              onClick={() => addTestFromRecord(test)}
                            >
                              <div className="font-medium">{test.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                {test.unit && <span>{test.unit}</span>}
                                {test.normalRange && <span>Range: {test.normalRange}</span>}
                                {test.price !== undefined && <span>{formatCurrency(test.price)}</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Suggestions appear when you type the first letters. Tests originate from the Tests & Prices catalog.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70">
                    <div className="grid grid-cols-5 gap-3 bg-muted/50 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <span>Test name</span>
                      <span>Unit</span>
                      <span>Normal range</span>
                      <span className="text-right">Price</span>
                      <span className="text-right">Actions</span>
                    </div>
                    <ScrollArea className="max-h-72">
                      <div className="divide-y">
                        {selectedTests.map((entry) => (
                          <div key={entry.id} className="grid grid-cols-5 gap-3 px-4 py-3 text-sm items-center">
                            <Input value={entry.name} onChange={(event) => handleSelectedTestUpdate(entry.id, "name", event.target.value)} />
                            <Input value={entry.unit ?? ""} onChange={(event) => handleSelectedTestUpdate(entry.id, "unit", event.target.value)} />
                            <Input
                              value={entry.normalRange ?? ""}
                              onChange={(event) => handleSelectedTestUpdate(entry.id, "normalRange", event.target.value)}
                            />
                            <Input
                              value={entry.price !== undefined ? String(entry.price) : ""}
                              onChange={(event) => handleSelectedTestUpdate(entry.id, "price", event.target.value)}
                              className="text-right"
                            />
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setTestDeleteDialog({ open: true, id: entry.id })}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Computed total
                    </span>
                    <span className="font-semibold text-foreground">{formatCurrency(computedTotal)}</span>
                  </div>
                  <div className="grid gap-2">
                    <Label>Manual override</Label>
                    <Input
                      value={manualTotal}
                      onChange={(event) => setManualTotal(event.target.value)}
                      placeholder="Enter custom total if needed"
                    />
                    <p className="text-xs text-muted-foreground">
                      The total remains editable. Leave blank to rely on the automatic sum.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total saved value</span>
                    <span className="font-semibold text-primary">{formatCurrency(effectiveTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Recent patients
                </CardTitle>
                <CardDescription>Tap a record to reopen and auto-sync results.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    value={patientSearch}
                    onChange={(event) => setPatientSearch(event.target.value)}
                    placeholder="Search by name, source, or phone"
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="max-h-[26rem]">
                  <div className="space-y-3">
                    {filteredPatients.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">No patient records available.</p>
                    )}
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => setActivePatientId(patient.id)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          activePatientId === patient.id ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>{patient.name || "Unnamed patient"}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDisplayDate(patient.date)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-2">
                          {patient.source && <Badge variant="outline">{patient.source}</Badge>}
                          {patient.total !== undefined && (
                            <Badge variant="outline" className="bg-primary/5 text-primary">
                              {formatCurrency(patient.total)}
                            </Badge>
                          )}
                          {patient.phone && <span>{patient.phone}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="Save patient record?"
        description="The patient details and selected tests will be written to the local database. Do you want to continue?"
        onConfirm={confirmSave}
      />

      <ConfirmDialog
        open={testDeleteDialog.open}
        onOpenChange={(open) => setTestDeleteDialog((prev) => ({ ...prev, open }))}
        title="Remove selected test?"
        description="This test will be removed from the patient's visit."
        onConfirm={() => {
          if (testDeleteDialog.id) {
            handleRemoveSelectedTest(testDeleteDialog.id);
          }
        }}
        variant="destructive"
      />
    </PageTransition>
  );
}

function buildSavePayload(form: PatientFormState, tests: SelectedTestEntry[], total: number) {
  return {
    patient: {
      id: form.id,
      name: form.name || undefined,
      age: form.age || undefined,
      gender: form.gender || undefined,
      phone: form.phone || undefined,
      source: form.source || undefined,
      date: form.date,
      total,
    },
    tests: tests.map((entry) => ({
      testId: entry.testId,
      testName: entry.name,
      unit: entry.unit,
      normalRange: entry.normalRange,
      price: entry.price,
    })),
  };
}
