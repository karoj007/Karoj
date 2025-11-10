import { forwardRef } from "react";
import { format } from "date-fns";
import { PrintCustomization } from "@/data/db";
import { formatCurrency } from "@/utils/number";

interface ResultLineItem {
  testName: string;
  result?: string;
  unit?: string;
  normalRange?: string;
  price?: number;
}

interface ResultPrintProps {
  patientName?: string;
  visitDate?: string;
  age?: string;
  gender?: string;
  source?: string;
  phone?: string;
  items: ResultLineItem[];
  total?: number;
  customization: PrintCustomization;
}

export const ResultPrint = forwardRef<HTMLDivElement, ResultPrintProps>(function ResultPrint(
  { patientName, visitDate, age, gender, source, phone, items, total, customization },
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
      padding: "0.5rem 1rem",
      borderRadius: "0.75rem",
      maxWidth: customization.orientation === "vertical" ? "4rem" : "100%",
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
      className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(236, 233, 252, 0.4), rgba(245, 245, 255, 0.9))",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: "#0f172a",
      }}
    >
      <div className="flex flex-col gap-6">
        {renderCustomText()}

        <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-indigo-500/90 to-purple-500/80 p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-wide">Laboratory Result Sheet</h1>
              <p className="text-indigo-100">High precision diagnostics • Confidential report</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-2 text-sm backdrop-blur">
              {visitDate ? format(new Date(visitDate), "PPP") : format(new Date(), "PPP")}
            </div>
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <p className="uppercase text-indigo-200 tracking-[0.2em] text-xs">Patient</p>
              <p className="font-semibold text-lg">{patientName || "Unnamed patient"}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-indigo-100/90">
                {age && <span>Age: {age}</span>}
                {gender && <span>Gender: {gender}</span>}
                {phone && <span>Phone: {phone}</span>}
              </div>
            </div>
            <div>
              <p className="uppercase text-indigo-200 tracking-[0.2em] text-xs">Origin</p>
              <p className="font-semibold text-lg">{source || "Direct Visit"}</p>
            </div>
          </div>
        </header>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-inner">
          <div className="grid grid-cols-4 gap-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Analysis</span>
            <span>Result</span>
            <span>Normal Range</span>
            <span className="text-right">Price</span>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.testName + item.normalRange}
                className="grid grid-cols-4 items-center gap-4 rounded-xl border border-slate-100 bg-white/95 px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="font-medium text-slate-800">{item.testName}</p>
                  {item.unit && <p className="text-xs text-slate-500">Unit: {item.unit}</p>}
                </div>
                <div className="text-sm font-semibold text-slate-700">{item.result || "—"}</div>
                <div className="text-sm text-slate-600">{item.normalRange || "—"}</div>
                <div className="text-right text-sm font-semibold text-slate-700">
                  {item.price !== undefined ? formatCurrency(item.price) : "—"}
                </div>
              </div>
            ))}
          </div>
        </section>

        {typeof total === "number" && (
          <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/70 px-6 py-4 text-indigo-900">
            <span className="text-sm uppercase tracking-wider">Total Payable</span>
            <span className="text-2xl font-semibold">{formatCurrency(total)}</span>
          </div>
        )}

        {renderCustomText()}

        <footer className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-xs text-slate-500">
          <p>This document is generated by the KAROZH Laboratory Management System. Results are confidential and intended for the patient only.</p>
        </footer>
      </div>
    </div>
  );
});
