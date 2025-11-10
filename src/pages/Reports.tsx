import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { BackButton } from "@/components/BackButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportPrint } from "@/printing/ReportPrint";
import { PrintCustomization, db } from "@/data/db";
import { createExpense, deleteExpense, readPrintCustomization, updateExpense } from "@/data/service";
import { formatCurrency } from "@/utils/number";
import { formatDisplayDate, todayKey } from "@/utils/date";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useDebouncedEffect } from "@/hooks/useDebouncedEffect";
import {
  ArrowLeft,
  Calendar,
  FileDown,
  Plus,
  Printer,
  Save,
  Trash2,
} from "lucide-react";

interface ExpenseRow {
  id: string;
  name: string;
  amount: string;
}

interface SourceGroup {
  source: string;
  patientCount: number;
  income: number;
}

const defaultCustomization: PrintCustomization = {
  text: "",
  position: "bottom",
  orientation: "horizontal",
  textColor: "#0f172a",
  backgroundColor: "#ffffff",
  fontSize: 14,
};

export default function Reports() {
  const today = todayKey();
  const [dateFilter, setDateFilter] = useState(today);
  const patientsForDate = useLiveQuery(() => db.patients.where("date").equals(dateFilter).toArray(), [dateFilter], []) ?? [];
  const expenseRecords = useLiveQuery(() => db.expenses.where("date").equals(dateFilter).toArray(), [dateFilter], []) ?? [];
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [customization, setCustomization] = useState<PrintCustomization>(defaultCustomization);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [expenseDeleteDialog, setExpenseDeleteDialog] = useState<{ open: boolean; id?: string }>({ open: false });
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    readPrintCustomization("print.reports").then(setCustomization).catch(() => setCustomization(defaultCustomization));
  }, []);

  useEffect(() => {
    setExpenseRows(
      expenseRecords.map((expense) => ({
        id: expense.id,
        name: expense.name ?? "",
        amount: expense.amount !== undefined ? String(expense.amount) : "",
      })),
    );
  }, [expenseRecords]);

  useDebouncedEffect(
    () => {
      expenseRows.forEach((row) => {
        const original = expenseRecords.find((expense) => expense.id === row.id);
        if (!original) return;
        const parsedAmount = row.amount ? Number(row.amount) : 0;
        if ((original.name ?? "") !== row.name || (original.amount ?? 0) !== parsedAmount) {
          updateExpense(row.id, { name: row.name || undefined, amount: parsedAmount, date: dateFilter }).catch(() => {
            toast({
              title: "Auto-save failed",
              description: "Unable to persist one of the expenses. Please retry.",
              variant: "destructive",
            });
          });
        }
      });
    },
    [expenseRows, expenseRecords, dateFilter],
    600,
  );

  const groupedSources = useMemo<SourceGroup[]>(() => {
    const map = new Map<string, { patientCount: number; income: number }>();
    patientsForDate.forEach((patient) => {
      const key = patient.source || "Direct walk-in";
      const entry = map.get(key) ?? { patientCount: 0, income: 0 };
      entry.patientCount += 1;
      entry.income += patient.total ?? 0;
      map.set(key, entry);
    });
    return Array.from(map.entries()).map(([source, value]) => ({
      source,
      patientCount: value.patientCount,
      income: value.income,
    }));
  }, [patientsForDate]);

  const totalIncome = useMemo(() => groupedSources.reduce((sum, entry) => sum + entry.income, 0), [groupedSources]);
  const totalExpenses = useMemo(
    () => expenseRows.reduce((sum, entry) => sum + (entry.amount ? Number(entry.amount) : 0), 0),
    [expenseRows],
  );
  const net = totalIncome - totalExpenses;

  const handleAddExpense = async () => {
    await createExpense("", 0, dateFilter);
    toast({ title: "Expense added", description: "Fill in the details and they will auto-save." });
  };

  const handleExpenseFieldChange = (id: string, field: keyof ExpenseRow, value: string) => {
    setExpenseRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
    toast({ title: "Expense removed", description: "The entry was deleted successfully." });
    setExpenseDeleteDialog({ open: false, id: undefined });
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => toast({ title: "Print dialog opened", description: "Preview generated successfully." }),
  });

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`report-${dateFilter}.pdf`);
    toast({ title: "PDF exported", description: "Report saved locally." });
  };

  const handleSave = () => {
    setSaveDialogOpen(true);
  };

  const confirmSave = () => {
    toast({
      title: "Report saved",
      description: "All changes are preserved in the local database.",
    });
    setSaveDialogOpen(false);
  };

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
                  Reports & Finance
                  <Badge variant="outline" className="bg-primary/5 text-primary">
                    auto-save active
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Generate daily summaries, account for expenses, and export polished reports.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BackButton />
              <Button variant="secondary" className="gap-2" onClick={handleSave}>
                <Save className="h-4 w-4" />
                Save Report
              </Button>
              <Button variant="outline" className="gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                🖨️ Print Report
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleDownloadPdf}>
                <FileDown className="h-4 w-4" />
                📄 Save Report as PDF
              </Button>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card className="border border-border/60 shadow-lg">
              <CardHeader>
                <CardTitle>Source performance</CardTitle>
                <CardDescription>Grouped totals by referring organization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Report date</span>
                    <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="max-w-xs" />
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>Patients: <span className="font-semibold text-foreground">{patientsForDate.length}</span></span>
                    <span>Income: <span className="font-semibold text-foreground">{formatCurrency(totalIncome)}</span></span>
                    <span>Expenses: <span className="font-semibold text-foreground">{formatCurrency(totalExpenses)}</span></span>
                  </div>
                </div>
                <ScrollArea className="max-h-72">
                  <div className="space-y-3">
                    {groupedSources.map((source) => (
                      <div key={source.source} className="flex items-center justify-between rounded-xl border border-border/70 bg-white px-4 py-3 shadow-sm">
                        <div>
                          <p className="font-semibold text-foreground">{source.source}</p>
                          <p className="text-xs text-muted-foreground">{source.patientCount} patients</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(source.income)}</p>
                      </div>
                    ))}
                    {groupedSources.length === 0 && (
                      <p className="text-sm text-center text-muted-foreground py-6">
                        No patient visits recorded for this date.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-lg">
              <CardHeader>
                <CardTitle>Net summary</CardTitle>
                <CardDescription>Overall outcome after expenses.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-primary">
                  <div className="flex items-center justify-between text-sm uppercase tracking-wide">
                    <span>Total income</span>
                    <span className="text-lg font-semibold">{formatCurrency(totalIncome)}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600">
                  <div className="flex items-center justify-between text-sm uppercase tracking-wide">
                    <span>Total expenses</span>
                    <span className="text-lg font-semibold">-{formatCurrency(totalExpenses)}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                  <div className="flex items-center justify-between text-sm uppercase tracking-wide">
                    <span>Net balance</span>
                    <span className="text-lg font-semibold">{formatCurrency(net)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border/60 shadow-lg">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Expenses</CardTitle>
                <CardDescription>Track operational costs and deductions.</CardDescription>
              </div>
              <Button variant="outline" className="gap-2" onClick={handleAddExpense}>
                <Plus className="h-4 w-4" />
                Add expense
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 border-b border-border/70 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Expense name</span>
                <span>Amount</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="space-y-3">
                {expenseRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-3 items-center gap-3 rounded-xl border border-border/70 px-4 py-3 shadow-sm">
                    <Input value={row.name} onChange={(event) => handleExpenseFieldChange(row.id, "name", event.target.value)} placeholder="Expense description" />
                    <Input value={row.amount} onChange={(event) => handleExpenseFieldChange(row.id, "amount", event.target.value)} placeholder="0.00" />
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setExpenseDeleteDialog({ open: true, id: row.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {expenseRows.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-6">No expenses recorded for this date.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="hidden">
            <ReportPrint
              ref={printRef}
              date={dateFilter}
              sources={groupedSources}
              expenses={expenseRows.map((row) => ({ name: row.name, amount: Number(row.amount) || 0 }))}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              net={net}
              customization={customization}
            />
          </div>
        </div>
      </div>

        <ConfirmDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="Save report?"
        description="All report adjustments are auto-saved. Confirm to acknowledge the latest totals."
        onConfirm={confirmSave}
      />

        <ConfirmDialog
          open={expenseDeleteDialog.open}
          onOpenChange={(open) => setExpenseDeleteDialog((prev) => ({ ...prev, open }))}
          title="Delete expense?"
          description="This expense entry will be permanently removed from the report."
          onConfirm={() => {
            if (expenseDeleteDialog.id) {
              handleDeleteExpense(expenseDeleteDialog.id);
            }
          }}
          variant="destructive"
        />
    </PageTransition>
  );
}
