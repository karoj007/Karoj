import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Printer, FileDown, Plus, Trash2, Calendar, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Visit, Expense, Patient } from "@shared/schema";
import { useLocation } from "wouter";

interface SourceReport {
  source: string;
  patients: number;
  totalAmount: number;
}

interface ExpenseRow {
  id: string;
  name: string;
  amount: string;
  isNew?: boolean;
}

interface OptionalRow {
  id: string;
  name: string;
  value: string;
}

export default function Reports() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [optionalRows, setOptionalRows] = useState<OptionalRow[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({
    open: false,
    id: "",
  });
  const { toast } = useToast();

  const { data: visits } = useQuery<Visit[]>({
    queryKey: ["/api/visits", { date: selectedDate }],
    queryFn: () => fetch(`/api/visits?date=${selectedDate}`).then((res) => res.json()),
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: expensesData } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", { date: selectedDate }],
    queryFn: () => fetch(`/api/expenses?date=${selectedDate}`).then((res) => res.json()),
  });

  useEffect(() => {
    if (expensesData) {
      setExpenses(
        expensesData.map((e) => ({
          id: e.id,
          name: e.name,
          amount: e.amount.toString(),
          isNew: false,
        }))
      );
    }
  }, [expensesData]);

  const createExpenseMutation = useMutation({
    mutationFn: (data: { name: string; amount: number; date: string }) =>
      apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/expenses/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
  });

  // Group patients by source
  const groupedReports: SourceReport[] = visits && patients
    ? Object.values(
        visits.reduce((acc, visit) => {
          const patient = patients.find(p => p.id === visit.patientId);
          const source = patient?.source || "Unknown";
          
          if (!acc[source]) {
            acc[source] = { source, patients: 0, totalAmount: 0 };
          }
          acc[source].patients += 1;
          acc[source].totalAmount += visit.totalCost || 0;
          return acc;
        }, {} as Record<string, SourceReport>)
      )
    : [];

  const totalIncome = groupedReports.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const netIncome = totalIncome - totalExpenses;

  const addExpense = () => {
    setExpenses([...expenses, { id: `new-${Date.now()}`, name: "", amount: "", isNew: true }]);
  };

  const addOptionalRow = () => {
    setOptionalRows([...optionalRows, { id: `opt-${Date.now()}`, name: "", value: "" }]);
  };

  const updateExpense = (id: string, field: "name" | "amount", value: string) => {
    setExpenses(expenses.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const updateOptionalRow = (id: string, field: "name" | "value", value: string) => {
    setOptionalRows(optionalRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const deleteExpense = async (id: string) => {
    if (id.startsWith("new-")) {
      setExpenses(expenses.filter((e) => e.id !== id));
    } else {
      await deleteExpenseMutation.mutateAsync(id);
    }
    setDeleteDialog({ open: false, id: "" });
  };

  const deleteOptionalRow = (id: string) => {
    setOptionalRows(optionalRows.filter((r) => r.id !== id));
  };

  const saveReport = async () => {
    try {
      for (const expense of expenses) {
        if (!expense.name || !expense.amount) continue;

        if (expense.isNew || expense.id.startsWith("new-")) {
          await createExpenseMutation.mutateAsync({
            name: expense.name,
            amount: parseFloat(expense.amount),
            date: selectedDate,
          });
        }
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ التقرير المالي بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ التقرير",
        variant: "destructive",
      });
    }
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Blocked",
        description: "Please allow popups to enable printing",
        variant: "destructive",
      });
      return;
    }

    // Smart scaling calculation to always fit in one page
    const patientRows = groupedReports.length + 1; // +1 for total row
    const expenseRows = expenses.filter(e => e.name && e.amount).length + 1; // +1 for total row
    const optionalInfoRows = optionalRows.filter(r => r.name || r.value).length;
    const totalRows = patientRows + expenseRows + optionalInfoRows + 3; // +3 for section headers and net total
    
    // More aggressive scaling: start scaling earlier and scale more
    let scaleFactor = 1;
    if (totalRows > 12) {
      // Aggressive scaling formula: more rows = smaller scale
      scaleFactor = Math.max(0.45, 1 - (totalRows - 12) * 0.03);
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Financial Report - ${selectedDate}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif;
              padding: 30px;
              color: #1f2937;
              background: #ffffff;
              direction: rtl;
            }
            .report-container {
              max-width: 900px;
              margin: 0 auto;
              transform: scale(${scaleFactor});
              transform-origin: top center;
            }
            .date-badge {
              display: inline-block;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              padding: 10px 24px;
              border-radius: 25px;
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 30px;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
            .section {
              background: #ffffff;
              border-radius: 12px;
              padding: 24px;
              margin-bottom: 24px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
              border: 1px solid #e5e7eb;
            }
            .section-title {
              font-size: 20px;
              color: #1e40af;
              margin-bottom: 18px;
              font-weight: 700;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .section-title::before {
              content: '';
              width: 4px;
              height: 24px;
              background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
              border-radius: 2px;
            }
            .table-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 14px 18px;
              margin-bottom: 8px;
              border-radius: 8px;
              background: #f9fafb;
              transition: all 0.2s;
            }
            .table-row:nth-child(even) {
              background: #ffffff;
            }
            .table-row:hover {
              background: #eff6ff;
            }
            .row-label {
              font-size: 15px;
              color: #374151;
              font-weight: 500;
              flex: 1;
            }
            .row-count {
              font-size: 13px;
              color: #6b7280;
              margin-right: 12px;
              background: #e0e7ff;
              padding: 4px 12px;
              border-radius: 12px;
              font-weight: 600;
            }
            .row-value {
              font-size: 17px;
              font-weight: 700;
              color: #059669;
              font-family: 'Courier New', monospace;
              min-width: 100px;
              text-align: left;
            }
            .expense-row .row-value {
              color: #dc2626;
            }
            .total-row {
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
              border: 2px solid #3b82f6;
              padding: 18px;
              margin-top: 16px;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            }
            .total-row .row-label {
              font-size: 18px;
              color: #1e40af;
              font-weight: 700;
            }
            .total-row .row-value {
              font-size: 24px;
              color: #1e40af;
            }
            .net-total {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
              color: white;
              border: none;
              box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
            }
            .net-total .row-label,
            .net-total .row-value {
              color: white;
            }
            .optional-section {
              background: #fef3c7;
              border: 2px dashed #f59e0b;
            }
            .optional-section .section-title {
              color: #d97706;
            }
            .optional-row {
              background: #fffbeb;
            }
            .optional-row .row-value {
              color: #d97706;
            }
            .footer {
              text-align: center;
              margin-top: 35px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              color: #6b7280;
              font-size: 13px;
            }
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                padding: 10px !important;
              }
              .report-container {
                page-break-inside: avoid;
                max-width: 100% !important;
              }
              .date-badge {
                padding: 6px 16px !important;
                font-size: 14px !important;
                margin-bottom: 15px !important;
              }
              .section {
                page-break-inside: avoid;
                box-shadow: none;
                padding: 12px !important;
                margin-bottom: 12px !important;
              }
              .section-title {
                font-size: 16px !important;
                margin-bottom: 10px !important;
              }
              .table-row {
                padding: 8px 12px !important;
                margin-bottom: 4px !important;
              }
              .row-label {
                font-size: 13px !important;
              }
              .row-value {
                font-size: 14px !important;
              }
              .row-count {
                font-size: 11px !important;
                padding: 2px 8px !important;
              }
              .total-row {
                padding: 10px !important;
                margin-top: 8px !important;
              }
              .total-row .row-label {
                font-size: 15px !important;
              }
              .total-row .row-value {
                font-size: 18px !important;
              }
              .footer {
                margin-top: 15px !important;
                padding-top: 10px !important;
                font-size: 11px !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div style="text-align: center; margin-bottom: 30px;">
              <span class="date-badge">📅 ${new Date(selectedDate).toLocaleDateString('ar-EG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>

            <div class="section">
              <h2 class="section-title">دخول المرضى</h2>
              ${groupedReports.map(report => `
                <div class="table-row">
                  <span class="row-label">${escapeHtml(report.source)}</span>
                  <span class="row-count">${report.patients} مريض</span>
                  <span class="row-value">${report.totalAmount.toFixed(0)}</span>
                </div>
              `).join('')}
              ${groupedReports.length === 0 ? `
                <div style="text-align: center; color: #9ca3af; padding: 30px;">
                  لا توجد بيانات مرضى لهذا التاريخ
                </div>
              ` : `
                <div class="table-row total-row">
                  <span class="row-label">المجموع الكلي</span>
                  <span class="row-value">${totalIncome.toFixed(0)}</span>
                </div>
              `}
            </div>

            ${expenses.filter(e => e.name && e.amount).length > 0 ? `
              <div class="section">
                <h2 class="section-title">المصاريف</h2>
                ${expenses.filter(e => e.name && e.amount).map(expense => `
                  <div class="table-row expense-row">
                    <span class="row-label">${escapeHtml(expense.name)}</span>
                    <span class="row-value">-${parseFloat(expense.amount).toFixed(0)}</span>
                  </div>
                `).join('')}
                <div class="table-row total-row">
                  <span class="row-label">مجموع المصاريف</span>
                  <span class="row-value">-${totalExpenses.toFixed(0)}</span>
                </div>
              </div>
            ` : ''}

            ${optionalRows.filter(r => r.name || r.value).length > 0 ? `
              <div class="section optional-section">
                <h2 class="section-title">معلومات اختيارية</h2>
                ${optionalRows.filter(r => r.name || r.value).map(row => `
                  <div class="table-row optional-row">
                    <span class="row-label">${escapeHtml(row.name || 'ملاحظة')}</span>
                    <span class="row-value">${escapeHtml(row.value)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <div class="section">
              <div class="table-row net-total">
                <span class="row-label">💰 المجموع النهائي (بعد الخصم)</span>
                <span class="row-value">${netIncome.toFixed(0)}</span>
              </div>
            </div>

            <div class="footer">
              <p>تم إنشاء التقرير في: ${new Date().toLocaleString('ar-EG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</p>
              <p style="margin-top: 8px; font-weight: 600;">هذا تقرير رسمي - يرجى الاحتفاظ به للسجلات</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const exportPDF = () => {
    toast({
      title: "تصدير PDF",
      description: "اختر 'حفظ بصيغة PDF' من نافذة الطباعة",
    });
    
    setTimeout(() => {
      printReport();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-background dark:to-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/")} 
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <PageHeader
          title="📊 التقارير المالية"
          description="عرض الدخل والمصاريف والتحليلات المالية"
          actions={
            <>
              <Button variant="outline" onClick={printReport} className="gap-2" data-testid="button-print-report">
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button variant="outline" onClick={exportPDF} className="gap-2" data-testid="button-export-report-pdf">
                <FileDown className="h-4 w-4" />
                PDF حفظ
              </Button>
              <Button onClick={saveReport} className="gap-2" data-testid="button-save-report">
                <Save className="h-4 w-4" />
                حفظ
              </Button>
            </>
          }
        />

        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-white/80 dark:bg-card/80 backdrop-blur">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  تاريخ التقرير
                </CardTitle>
                <div className="w-full sm:w-64">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border-primary/30 focus-visible:ring-primary"
                    data-testid="input-report-date"
                  />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                💵 دخول المرضى
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {groupedReports.map((report, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                    data-testid={`report-row-${index}`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        {report.source}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-semibold">
                          {report.patients} مريض
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {report.totalAmount.toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
                {groupedReports.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg">📭 لا توجد زيارات مسجلة لهذا التاريخ</p>
                  </div>
                )}
                {groupedReports.length > 0 && (
                  <div className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-500 to-green-500 dark:from-emerald-600 dark:to-green-600 rounded-xl shadow-lg mt-4">
                    <p className="text-xl font-bold text-white">المجموع الكلي</p>
                    <p className="text-3xl font-bold font-mono text-white">
                      {totalIncome.toFixed(0)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  💸 المصاريف
                </CardTitle>
                <Button 
                  onClick={addExpense} 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 border-red-300 hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900" 
                  data-testid="button-add-expense"
                >
                  <Plus className="h-4 w-4" />
                  إضافة مصروف
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {expenses.map((expense, index) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
                  data-testid={`expense-row-${index}`}
                >
                  <Input
                    placeholder="اسم المصروف (مثال: تكسي، أكل، مصروف)"
                    value={expense.name}
                    onChange={(e) => updateExpense(expense.id, "name", e.target.value)}
                    className="flex-1 border-gray-300 dark:border-gray-600"
                    data-testid={`input-expense-name-${index}`}
                  />
                  <Input
                    type="number"
                    placeholder="المبلغ"
                    value={expense.amount}
                    onChange={(e) => updateExpense(expense.id, "amount", e.target.value)}
                    className="w-32 border-gray-300 dark:border-gray-600 font-mono"
                    data-testid={`input-expense-amount-${index}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteDialog({ open: true, id: expense.id })}
                    className="hover:bg-red-100 dark:hover:bg-red-900"
                    data-testid={`button-delete-expense-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </Button>
                </div>
              ))}
              {expenses.length > 0 && (
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-red-500 to-orange-500 dark:from-red-600 dark:to-orange-600 rounded-xl shadow-lg mt-4">
                  <p className="text-lg font-bold text-white">مجموع المصاريف</p>
                  <p className="text-2xl font-bold font-mono text-white">
                    -{totalExpenses.toFixed(0)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-amber-400 dark:border-amber-600 shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  📝 معلومات اختيارية
                  <span className="text-xs font-normal text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded">
                    لا تؤثر على الحسابات
                  </span>
                </CardTitle>
                <Button 
                  onClick={addOptionalRow} 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900" 
                  data-testid="button-add-optional"
                >
                  <Plus className="h-4 w-4" />
                  إضافة معلومة
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {optionalRows.map((row, index) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800"
                  data-testid={`optional-row-${index}`}
                >
                  <Input
                    placeholder="اسم المعلومة (مثال: ملاحظة، تنبيه)"
                    value={row.name}
                    onChange={(e) => updateOptionalRow(row.id, "name", e.target.value)}
                    className="flex-1 bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-700"
                    data-testid={`input-optional-name-${index}`}
                  />
                  <Input
                    placeholder="القيمة"
                    value={row.value}
                    onChange={(e) => updateOptionalRow(row.id, "value", e.target.value)}
                    className="w-32 bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-700"
                    data-testid={`input-optional-value-${index}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteOptionalRow(row.id)}
                    className="hover:bg-amber-200 dark:hover:bg-amber-800"
                    data-testid={`button-delete-optional-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  </Button>
                </div>
              ))}
              {optionalRows.length === 0 && (
                <div className="text-center py-8 text-amber-700 dark:text-amber-400">
                  <p className="text-sm">اضغط على "إضافة معلومة" لإدخال معلومات إضافية</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    💰 المجموع النهائي
                  </p>
                  <p className="text-sm text-blue-100">بعد خصم المصاريف</p>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-bold font-mono text-white drop-shadow-lg" data-testid="text-net-income">
                    {netIncome.toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: "" })}
        title="حذف المصروف"
        description="هل أنت متأكد من حذف هذا المصروف؟"
        onConfirm={() => deleteExpense(deleteDialog.id)}
        variant="destructive"
      />
    </div>
  );
}
