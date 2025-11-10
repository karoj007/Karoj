import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { BackButton } from "@/components/BackButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResultPrint } from "@/printing/ResultPrint";
import { PrintCustomization, db } from "@/data/db";
import { readPrintCustomization, updatePatientTestResult } from "@/data/service";
import { formatCurrency } from "@/utils/number";
import { formatDisplayDate, todayKey } from "@/utils/date";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  Calendar,
  Filter,
  FileDown,
  Printer,
  RefreshCcw,
  Save,
  Search,
  TestTubes,
} from "lucide-react";

interface ResultRow {
  id: string;
  testId?: string;
  testName: string;
  result?: string;
  unit?: string;
  normalRange?: string;
  price?: number;
}

const defaultCustomization: PrintCustomization = {
  text: "",
  position: "bottom",
  orientation: "horizontal",
  textColor: "#0f172a",
  backgroundColor: "#ffffff",
  fontSize: 14,
};

export default function Results() {
  const today = todayKey();
  const [dateFilter, setDateFilter] = useState(today);
  const patientsForDate = useLiveQuery(
    () => db.patients.where("date").equals(dateFilter).toArray(),
    [dateFilter],
    [],
  ) ?? [];
  const allPatients = useLiveQuery(() => db.patients.toArray(), [], []) ?? [];
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>();
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [patientRecord, setPatientRecord] = useState<Awaited<ReturnType<typeof db.patients.get>>>();
  const [customization, setCustomization] = useState<PrintCustomization>(defaultCustomization);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    readPrintCustomization("print.results").then(setCustomization).catch(() => {
      setCustomization(defaultCustomization);
    });
  }, []);

  useEffect(() => {
    const loadPatient = async () => {
      if (!selectedPatientId) {
        setPatientRecord(undefined);
        setResultRows([]);
        return;
      }
      const record = await db.patients.get(selectedPatientId);
      setPatientRecord(record);
      const items = await db.patientTests.where("patientId").equals(selectedPatientId).toArray();
      setResultRows(
        items.map((entry) => ({
          id: entry.id,
          testId: entry.testId,
          testName: entry.testName ?? "",
          result: entry.result ?? "",
          unit: entry.unit ?? "",
          normalRange: entry.normalRange ?? "",
          price: entry.price ?? 0,
        })),
      );
    };
    loadPatient();
  }, [selectedPatientId]);

  const historyMatches = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    if (!term) return [];
    return allPatients
      .filter((patient) => (patient.name ?? "").toLowerCase().includes(term))
      .slice(0, 8);
  }, [allPatients, historySearch]);

  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return patientsForDate;
    return patientsForDate.filter((patient) =>
      [patient.name, patient.source]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [patientsForDate, patientSearch]);

  const computedTotal = useMemo(() => resultRows.reduce((sum, entry) => sum + (entry.price ? Number(entry.price) : 0), 0), [resultRows]);

  const handleResultChange = async (id: string, field: keyof ResultRow, value: string) => {
    setResultRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: field === "price" ? Number(value) : value,
            }
          : row,
      ),
    );
    try {
      await updatePatientTestResult(
        id,
        field === "price" ? ({ price: Number(value) } as any) : ({ [field]: value } as any),
      );
    } catch (error) {
      toast({
        title: "Auto-save failed",
        description: "Unable to persist one of the result fields. Please retry.",
        variant: "destructive",
      });
    }
  };

  const handleReopenPrevious = () => {
    if (!patientRecord) return;
    const sameNameRecords = allPatients
      .filter((entry) => entry.name === patientRecord.name)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const index = sameNameRecords.findIndex((entry) => entry.id === patientRecord.id);
    if (sameNameRecords.length <= 1 || index === -1) {
      toast({ title: "No previous record", description: "There are no other visits for this patient." });
      return;
    }
    const nextIndex = (index + 1) % sameNameRecords.length;
    setSelectedPatientId(sameNameRecords[nextIndex].id);
    setDateFilter(sameNameRecords[nextIndex].date);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () =>
      toast({
        title: "Print dialog opened",
        description: "Preview generated with the requested styling.",
      }),
  });

  const handleDownloadPdf = useCallback(async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`result-${patientRecord?.name ?? "patient"}.pdf`);
    toast({ title: "PDF exported", description: "Result sheet saved as PDF locally." });
  }, [patientRecord]);

  const handleSave = () => {
    if (!selectedPatientId) {
      toast({
        title: "Select a patient",
        description: "Choose a patient record before saving.",
        variant: "destructive",
      });
      return;
    }
    setSaveDialogOpen(true);
  };

  const confirmSave = () => {
    toast({ title: "Results saved", description: "All result edits are already stored thanks to auto-save." });
    setSaveDialogOpen(false);
  };

  const cardsData = useMemo(() => {
    const totalPatients = patientsForDate.length;
    const totalRevenue = patientsForDate.reduce((sum, patient) => sum + (patient.total ?? 0), 0);
    return { totalPatients, totalRevenue };
  }, [patientsForDate]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setLocation("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
                  Results Console
                  <Badge variant="outline" className="bg-primary/5 text-primary">
                    auto-save active
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Review, update, and print laboratory outcomes. Normal range edits sync with the master catalog.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BackButton />
              <Button variant="secondary" className="gap-2" onClick={handleSave}>
                <Save className="h-4 w-4" />
                Save Result
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleReopenPrevious}>
                <RefreshCcw className="h-4 w-4" />
                Reopen previous
              </Button>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2">
            <Card className="border border-border/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Patients today</CardTitle>
                <CardDescription>Records on {formatDisplayDate(dateFilter)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">{cardsData.totalPatients}</p>
              </CardContent>
            </Card>
            <Card className="border border-border/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Revenue today</CardTitle>
                <CardDescription>Based on saved totals</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">{formatCurrency(cardsData.totalRevenue)}</p>
              </CardContent>
            </Card>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
            <Card className="border border-border/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Patient records
                </CardTitle>
                <CardDescription>Select a patient to review or edit results.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Date filter</Label>
                    <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Search patients</Label>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Filter by name or source" className="pl-9" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Find visits by name</Label>
                    <Input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search across all visits" />
                    {historyMatches.length > 0 && (
                      <div className="rounded-lg border border-border bg-background shadow-lg">
                        {historyMatches.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => {
                              setDateFilter(patient.date);
                              setSelectedPatientId(patient.id);
                              setHistorySearch("");
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{patient.name || "Unnamed patient"}</span>
                              <span className="text-xs text-muted-foreground">{formatDisplayDate(patient.date)}</span>
                            </div>
                            {patient.source && <p className="text-xs text-muted-foreground">Source: {patient.source}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <ScrollArea className="max-h-[26rem]">
                  <div className="space-y-3">
                    {filteredPatients.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No patient visits recorded for the selected filter.
                      </p>
                    )}
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          selectedPatientId === patient.id ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm font-medium text-foreground">
                          <span>{patient.name || "Unnamed patient"}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDisplayDate(patient.date)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {patient.source && <Badge variant="outline">{patient.source}</Badge>}
                          {patient.total !== undefined && (
                            <Badge variant="outline" className="bg-primary/5 text-primary">
                              {formatCurrency(patient.total)}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-lg">
              <CardHeader className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TestTubes className="h-5 w-5 text-primary" />
                      Result details
                    </CardTitle>
                    <CardDescription>
                      {patientRecord ? `Editing results for ${patientRecord.name ?? "Unnamed patient"}` : "Select a patient to begin"}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint} disabled={!patientRecord}>
                      <Printer className="h-4 w-4" />
                      🖨️ Print Result
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadPdf} disabled={!patientRecord}>
                      <FileDown className="h-4 w-4" />
                      📄 Save as PDF
                    </Button>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit bg-primary/5 text-primary">
                  Changes auto-save on blur and field updates
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {patientRecord ? (
                  <>
                    <div className="grid grid-cols-4 gap-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>Test</span>
                      <span>Result</span>
                      <span>Normal range</span>
                      <span className="text-right">Price</span>
                    </div>
                    <div className="space-y-4">
                      {resultRows.map((row) => (
                        <div key={row.id} className="grid grid-cols-4 items-center gap-4 rounded-xl border border-border/70 px-4 py-3 shadow-sm">
                          <div>
                            <p className="font-medium text-foreground">{row.testName}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Unit:</span>
                              <Input
                                value={row.unit ?? ""}
                                onChange={(event) => handleResultChange(row.id, "unit", event.target.value)}
                                placeholder="Unit"
                                className="h-8"
                              />
                            </div>
                          </div>
                          <Input
                            value={row.result ?? ""}
                            onChange={(event) => handleResultChange(row.id, "result", event.target.value)}
                            placeholder="Result"
                          />
                          <Input
                            value={row.normalRange ?? ""}
                            onChange={(event) => handleResultChange(row.id, "normalRange", event.target.value)}
                            placeholder="Normal range"
                          />
                          <div className="text-right">
                            <Input
                              value={row.price !== undefined ? String(row.price) : ""}
                              onChange={(event) => handleResultChange(row.id, "price", event.target.value)}
                              className="text-right"
                              placeholder="0.00"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">Auto updates billing summary</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-6 py-3 text-primary">
                      <span className="text-sm uppercase tracking-wider">Total</span>
                      <span className="text-xl font-semibold">{formatCurrency(patientRecord.total ?? computedTotal)}</span>
                    </div>
                    <div className="hidden">
                      <ResultPrint
                        ref={printRef}
                        patientName={patientRecord.name ?? undefined}
                        age={patientRecord.age ?? undefined}
                        gender={patientRecord.gender ?? undefined}
                        phone={patientRecord.phone ?? undefined}
                        source={patientRecord.source ?? undefined}
                        visitDate={patientRecord.date}
                        items={resultRows.map((row) => ({
                          testName: row.testName,
                          result: row.result,
                          unit: row.unit,
                          normalRange: row.normalRange,
                          price: row.price,
                        }))}
                        total={patientRecord.total ?? computedTotal}
                        customization={customization}
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 py-12 text-center text-sm text-muted-foreground">
                    Select a patient record to load results.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="Save results?"
        description="All result changes are auto-saved. Confirm to acknowledge the latest values."
        onConfirm={confirmSave}
      />
    </PageTransition>
  );
}
