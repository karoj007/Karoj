import { forwardRef } from "react";
import { format } from "date-fns";
import { PrintCustomization } from "@/data/db";
import { formatCurrency } from "@/utils/number";

interface SourceSummary {
  source: string;
  patientCount: number;
  income: number;
}

interface ExpenseSummary {
  name: string;
  amount: number;
}

interface ReportPrintProps {
  date: string;
  sources: SourceSummary[];
  expenses: ExpenseSummary[];
  totalIncome: number;
  totalExpenses: number;
  net: number;
  customization: PrintCustomization;
}

export const ReportPrint = forwardRef<HTMLDivElement, ReportPrintProps>(function ReportPrint(
  { date, sources, expenses, totalIncome, totalExpenses, net, customization },
  ref,
) {
  const renderCustomText = () => {
    if (!customization.text.trim()) return null;

    const style: React.CSSProperties = {
      color: customization.textColor,
      backgroundColor: customization.backgroundColor,
      fontSize: customization.fontSize,
      writingMode: customization.orientation === "vertical" ? "vertical-rl" : "initial",
      textOrientation: customization.orientation === "vertical" ? "mixed" : "initial",
      padding: "0.5rem 1.25rem",
      borderRadius: "1rem",
      whiteSpace: "pre-line",
    };

    return (
      <div
        className="flex justify-center"
        style={{
          order: customization.position === "top" ? -1 : customization.position === "bottom" ? 99 : 0,
          alignSelf: customization.position === "side" ? "stretch" : "center",
        }}
      >
        <div style={style}>{customization.text}</div>
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className="mx-auto max-w-3xl rounded-3xl bg-white p-12 shadow-2xl"
      style={{
        background: "linear-gradient(145deg, rgba(238, 248, 255, 0.85), rgba(245, 242, 255, 0.9))",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#0f172a",
      }}
    >
      <div className="flex flex-col gap-8">
        {renderCustomText()}

        <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-blue-500/90 via-indigo-500/85 to-purple-500/75 p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-3xl font-semibold tracking-wide">Daily Laboratory Report</h1>
              <p className="text-blue-100">Consolidated patient visits, revenue, and expenses</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-2 text-sm backdrop-blur">
              {date ? format(new Date(date), "PPP") : format(new Date(), "PPP")}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-white/90">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Total income</p>
              <p className="text-lg font-semibold">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-white/90">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Total expenses</p>
              <p className="text-lg font-semibold">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-white/90">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Net balance</p>
              <p className="text-lg font-semibold">{formatCurrency(net)}</p>
            </div>
          </div>
        </header>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-inner">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Source summary</h2>
            <p className="text-xs uppercase tracking-wide text-slate-400">Grouped by organization</p>
          </div>
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.source} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <div>
                  <p className="font-semibold text-slate-800">{source.source || "Direct walk-in"}</p>
                  <p className="text-xs text-slate-500">{source.patientCount} patients</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">{formatCurrency(source.income)}</p>
                  <p className="text-xs text-slate-500">Daily income</p>
                </div>
              </div>
            ))}
            {sources.length === 0 && <p className="text-sm text-center text-slate-500 py-4">No patient visits recorded for this date.</p>}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-rose-100 bg-rose-50/80 p-6 shadow-inner">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-rose-900">Expenses</h2>
            <p className="text-xs uppercase tracking-wide text-rose-500">Adjustments & overhead</p>
          </div>
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div key={expense.name} className="flex items-center justify-between rounded-xl border border-rose-100 bg-white px-4 py-3 shadow-sm">
                <p className="font-medium text-rose-900">{expense.name || "Unnamed expense"}</p>
                <p className="text-sm font-semibold text-rose-600">-{formatCurrency(expense.amount)}</p>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-sm text-center text-rose-600/80 py-4">No expenses registered for this date.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-6 shadow-inner">
          <h2 className="text-lg font-semibold text-emerald-900">Net position</h2>
          <p className="mt-2 text-sm text-emerald-700">
            Adjusted total after expenses: <span className="font-semibold">{formatCurrency(net)}</span>
          </p>
        </section>

        {renderCustomText()}

        <footer className="rounded-3xl border border-slate-200 bg-white/85 px-6 py-4 text-xs text-slate-500">
          <p>This report is generated automatically by the KAROZH Laboratory Management System. Internal use only.</p>
        </footer>
      </div>
    </div>
  );
});
