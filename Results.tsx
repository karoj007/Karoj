import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Printer, FileDown, Search, Calendar, ArrowLeft, Settings, Trash2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Visit, TestResult, Patient, Setting, CustomPrintSection, Test } from "@shared/schema";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Results() {
  const [, setLocation] = useLocation();
  const [selectedVisit, setSelectedVisit] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  
  const [patientFormData, setPatientFormData] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    source: "",
  });
  
  const [visitFormData, setVisitFormData] = useState({
    testIds: [] as string[],
    totalCost: 0,
  });
  
  const { toast } = useToast();

  const { data: visits } = useQuery<Visit[]>({
    queryKey: ["/api/visits", { date: selectedDate }],
    queryFn: () => fetch(`/api/visits?date=${selectedDate}`).then((res) => res.json()),
  });

  const { data: testResults } = useQuery<TestResult[]>({
    queryKey: ["/api/test-results", { visitId: selectedVisit }],
    queryFn: () => fetch(`/api/test-results?visitId=${selectedVisit}`).then((res) => res.json()),
    enabled: !!selectedVisit,
  });

  const { data: settings } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  const { data: currentPatient } = useQuery<Patient>({
    queryKey: ["/api/patients", selectedVisit],
    queryFn: async () => {
      if (!selectedVisit) return null;
      const visit = visits?.find(v => v.id === selectedVisit);
      if (!visit) return null;
      const response = await fetch(`/api/patients/${visit.patientId}`);
      if (!response.ok) throw new Error("Failed to fetch patient");
      return response.json();
    },
    enabled: !!selectedVisit && !!visits,
  });

  const { data: allTests } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  useEffect(() => {
    if (testResults) {
      setResults(testResults);
    }
  }, [testResults]);

  const updatePatientMutation = useMutation({
    mutationFn: (data: { id: string; patient: Partial<Patient> }) =>
      apiRequest("PUT", `/api/patients/${data.id}`, data.patient),
  });

  const deletePatientMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/patients/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setDeleteDialogOpen(false);
      setEditDialogOpen(false);
      setSelectedVisit("");
      toast({
        title: "Deleted",
        description: "Patient data deleted successfully.",
      });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: (data: { id: string; visit: Partial<Visit> }) =>
      apiRequest("PUT", `/api/visits/${data.id}`, data.visit),
  });

  const deleteTestResultMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/test-results/${id}`, {}),
  });

  const createTestResultMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/test-results", data),
  });

  const batchUpdateMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; data: Partial<TestResult> }>) =>
      apiRequest("PUT", "/api/test-results/batch", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-results"] });
      toast({
        title: "Saved",
        description: "Results saved successfully",
      });
    },
  });

  const updateResult = (id: string, field: keyof TestResult, value: string) => {
    setResults(results.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const updateUrineData = (id: string, field: string, value: string) => {
    setResults(results.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          urineData: {
            ...r.urineData,
            [field]: value,
          },
        };
      }
      return r;
    }));
  };

  const handleEditPatient = () => {
    if (!selectedVisit) {
      toast({ title: "Error", description: "Please select a patient first", variant: "destructive" });
      return;
    }
    
    const visit = visits?.find(v => v.id === selectedVisit);
    if (!visit || !currentPatient) return;
    
    setEditingPatient(currentPatient);
    setEditingVisit(visit);
    setPatientFormData({
      name: currentPatient.name || "",
      age: currentPatient.age?.toString() || "",
      gender: currentPatient.gender || "",
      phone: currentPatient.phone || "",
      source: currentPatient.source || "",
    });
    setVisitFormData({
      testIds: visit.testIds || [],
      totalCost: visit.totalCost || 0,
    });
    setEditDialogOpen(true);
  };

  const handleSavePatient = async () => {
    if (!editingPatient || !editingVisit) return;
    
    try {
      await updatePatientMutation.mutateAsync({
        id: editingPatient.id,
        patient: {
          name: patientFormData.name,
          age: patientFormData.age ? parseInt(patientFormData.age) : undefined,
          gender: patientFormData.gender,
          phone: patientFormData.phone,
          source: patientFormData.source,
        },
      });

      const oldTestIds = editingVisit.testIds || [];
      const newTestIds = visitFormData.testIds;
      const addedTestIds = newTestIds.filter(id => !oldTestIds.includes(id));
      const removedTestIds = oldTestIds.filter(id => !newTestIds.includes(id));

      if (removedTestIds.length > 0) {
        const resultsToDelete = results.filter(r => removedTestIds.includes(r.testId));
        for (const res of resultsToDelete) {
           await deleteTestResultMutation.mutateAsync(res.id);
        }
        setResults(prev => prev.filter(r => !removedTestIds.includes(r.testId)));
      }

      for (const testId of addedTestIds) {
        const testDef = allTests?.find(t => t.id === testId);
        if (testDef) {
           const resultData: any = {
              visitId: editingVisit.id,
              testId: testDef.id,
              testName: testDef.name,
              price: testDef.price,
              unit: testDef.unit,
              normalRange: testDef.normalRange,
              testType: testDef.testType || "standard",
           };
           if (testDef.testType === "urine") {
              resultData.urineData = {
                colour: "Amber Yellow", aspect: "Clear", reaction: "Acidic",
                specificGravity: "1015-1025", glucose: "Nil", protein: "Nil",
                bilirubin: "Nil", ketones: "Nil", nitrite: "Nil", leukocyte: "Nil",
                blood: "Nil", pusCells: "Nil", redCells: "Nil", epithelialCell: "Nil",
                bacteria: "Nil", crystals: "Nil", amorphous: "Nil", mucus: "Nil", other: "Nil"
              };
           }
           await createTestResultMutation.mutateAsync(resultData);
        }
      }

      await updateVisitMutation.mutateAsync({
        id: editingVisit.id,
        visit: {
          testIds: visitFormData.testIds,
          totalCost: visitFormData.totalCost,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/test-results"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      setEditDialogOpen(false);
      toast({ title: "Saved", description: "Changes updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    }
  };

  const handleDeletePatient = async () => {
    if (!editingPatient) return;
    await deletePatientMutation.mutateAsync(editingPatient.id);
  };

  const handleAddTest = (testId: string) => {
    if (!visitFormData.testIds.includes(testId)) {
      setVisitFormData({
        ...visitFormData,
        testIds: [...visitFormData.testIds, testId],
      });
    }
  };

  const handleRemoveTest = (testId: string) => {
    setVisitFormData({
      ...visitFormData,
      testIds: visitFormData.testIds.filter(id => id !== testId),
    });
  };

  const saveResults = async () => {
    try {
      const updates = results.map((result) => ({
        id: result.id,
        data: {
          result: result.result,
          unit: result.unit,
          normalRange: result.normalRange,
          testType: result.testType,
          urineData: result.testType === "urine" ? result.urineData : undefined,
        },
      }));
      await batchUpdateMutation.mutateAsync(updates);
    } catch (e) {
      toast({ title: "Error", description: "Failed to save results", variant: "destructive" });
    }
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // --- دالة الطباعة (المعدلة بدقة حسب طلبك الأخير) ---
  const printResults = async () => {
    if (!selectedVisit || results.length === 0) {
      toast({
        title: "No Data",
        description: "Please select a patient with test results to print",
        variant: "destructive",
      });
      return;
    }

    const selectedVisitData = visits?.find(v => v.id === selectedVisit);
    if (!selectedVisitData) return;

    let patientData = currentPatient;
    try {
      const response = await fetch(`/api/patients/${selectedVisitData.patientId}`);
      if (response.ok) {
        patientData = await response.json();
      }
    } catch (error) {
      console.error("Error fetching patient data:", error);
    }

    let customSections: CustomPrintSection[] = [];
    try {
      const customSectionsSetting = settings?.find((s) => s.key === "customPrintSections");
      if (customSectionsSetting) {
        customSections = JSON.parse(customSectionsSetting.value);
      }
    } catch (e) {
      customSections = [];
    }

    // هنا يتم فصل الأقسام العلوية والسفلية
    // ملاحظة: لن نقوم بطباعة الأقسام العلوية فوق الجدول بناءً على طلبك
    const topSections = customSections.filter(s => s.position === "top" && s.text.trim());
    const bottomSections = customSections.filter(s => s.position === "bottom" && s.text.trim());

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Blocked",
        description: "Please allow popups to enable printing",
        variant: "destructive",
      });
      return;
    }

    // --- مربع معلومات المريض (مع الجنس والتاريخ) ---
    // هذا المربع سيتكرر في بداية كل صفحة
    const patientHeaderBlock = `
      <div class="header-box">
        <div class="info-row"><span class="label">Name:</span> ${escapeHtml(patientData?.name || '')}</div>
        <div class="info-row"><span class="label">Age:</span> ${patientData?.age || ''}</div>
        <div class="info-row"><span class="label">Gender:</span> ${escapeHtml(patientData?.gender || '')}</div>
        <div class="info-row"><span class="label">Ref:</span> ${escapeHtml(patientData?.source || '')}</div>
        <div class="info-row"><span class="label">Phone:</span> ${escapeHtml(patientData?.phone || '')}</div>
        <div class="info-row"><span class="label" style="color: #000; font-weight: bold;">Date:</span> ${selectedVisitData.visitDate}</div>
      </div>
    `;

    // --- منطق تقسيم الصفحات الذكي (Smart Pagination) ---
    const isLongTest = (testName: string, testType?: string): boolean => {
      if (testType === 'urine') return true;
      const lowerName = testName.toLowerCase();
      return ['stool', 'culture', 'sensitivity'].some(keyword => lowerName.includes(keyword));
    };

    const longTests = results.filter(r => isLongTest(r.testName, r.testType));
    const shortTests = results.filter(r => !isLongTest(r.testName, r.testType));

    const pages = [];

    // 1. الفحوصات الطويلة (كل فحص صفحة)
    longTests.forEach(test => {
      pages.push([test]);
    });

    // 2. الفحوصات القصيرة (حساب المساحة ديناميكياً)
    // نفترض أن الصفحة تتسع لـ 18 وحدة ارتفاع
    const MAX_PAGE_HEIGHT = 18; 
    let currentPage: typeof results = [];
    let currentHeight = 0;

    shortTests.forEach(test => {
      // نحسب ارتفاع الفحص: 1 وحدة أساسية + 0.5 لكل سطر إضافي في النطاق الطبيعي
      const lines = (test.normalRange || '').split('\n').length;
      const itemHeight = 1 + (lines > 1 ? (lines - 1) * 0.5 : 0);

      if (currentHeight + itemHeight > MAX_PAGE_HEIGHT) {
        // إذا امتلأت الصفحة، نحفظها ونفتح صفحة جديدة
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
      
      currentPage.push(test);
      currentHeight += itemHeight;
    });

    // إضافة آخر مجموعة متبقية
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Test Results - ${selectedVisitData.patientName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', Arial, sans-serif; padding: 30px; line-height: 1.5; color: #1f2937; background: #ffffff; }
            
            /* تنسيق الصفحة والفواصل */
            .page-container { 
               page-break-after: always; 
               position: relative;
               min-height: 95vh;
               display: flex;
               flex-direction: column;
            }
            .page-container:last-child { page-break-after: auto; }
            
            .multiline-text { white-space: pre-wrap; }
            
            /* الأقسام المخصصة (فقط السفلية ستظهر حسب طلبك) */
            .custom-section { padding: 10px; margin-top: auto; border-radius: 4px; }
            
            /* معلومات المريض */
            .header-box { 
              border: 1px solid #000; 
              padding: 12px; 
              margin-bottom: 20px; 
              display: grid; 
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              background: #f9f9f9;
            }
            .info-row { font-size: 14px; }
            .label { font-weight: bold; color: #333; margin-right: 5px; }
            
            /* الجداول */
            .results-table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid #d1d5db; }
            .results-table th { background: #1e3a8a; color: #ffffff; padding: 10px; text-align: left; font-weight: 600; font-size: 14px; border: 1px solid #d1d5db; }
            .results-table td { padding: 10px; border: 1px solid #d1d5db; font-size: 14px; vertical-align: top; }
            .results-table tr:nth-child(even) { background: #f9fafb; }
            
            /* اليورين */
            .complex-test { margin-top: 20px; }
            .complex-test h3 { color: #1e3a8a; font-size: 17px; margin-bottom: 12px; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; font-weight: 700; }
            .complex-test h4 { color: #1e40af; font-size: 14px; margin-bottom: 8px; margin-top: 15px; font-weight: 600; }
            .complex-test table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            .complex-test td { padding: 6px 8px; border: 1px solid #d1d5db; font-size: 13px; }
            .complex-test td:nth-child(odd) { font-weight: 600; color: #475569; background: #f9fafb; }
            .complex-test td:nth-child(even) { color: #059669; font-weight: 600; background: #ffffff; }

            .results-header-title { margin-bottom: 10px; color: #1e3a8a; font-weight: 700; font-size: 16px; margin-top: 10px; }

            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${pages.map((pageTests, index) => `
            <div class="page-container">
               
               <!-- 1. الكتابة الثابتة في البداية (هنا يمكنك وضع أي نص ثابت إن وجد، أو تركه فارغاً كما هو الآن) -->
               <!-- لا نضع هنا نصوص الإعدادات بناءً على طلبك -->

               <!-- 2. معلومات المريض (مع الجنس) - تتكرر في كل صفحة -->
               ${patientHeaderBlock}

               <!-- عنوان الجدول -->
               <h2 class="results-header-title">Test Results ${pages.length > 1 ? `(Page ${index + 1}/${pages.length})` : ''}</h2>
               
               <!-- 3. جدول الفحوصات (المقسمة) -->
               <div style="flex-grow: 1;">
                 ${pageTests.map(result => {
                    if (result.testType === 'urine' && result.urineData) {
                      const uData = result.urineData;
                      return `
                        <div class="complex-test">
                          <h3>Urine Analysis</h3>
                          <div>
                            <h4>Physical Examination</h4>
                            <table><tbody>
                              <tr><td>Colour</td><td>${escapeHtml(uData.colour || '')}</td><td>Aspect</td><td>${escapeHtml(uData.aspect || '')}</td></tr>
                              <tr><td>Reaction</td><td>${escapeHtml(uData.reaction || '')}</td><td>Specific Gravity</td><td>${escapeHtml(uData.specificGravity || '')}</td></tr>
                            </tbody></table>
                          </div>
                          <div>
                            <h4>Chemical Examination</h4>
                            <table><tbody>
                              <tr><td>Glucose</td><td>${escapeHtml(uData.glucose || '')}</td><td>Protein</td><td>${escapeHtml(uData.protein || '')}</td></tr>
                              <tr><td>Bilirubin</td><td>${escapeHtml(uData.bilirubin || '')}</td><td>Ketones</td><td>${escapeHtml(uData.ketones || '')}</td></tr>
                              <tr><td>Nitrite</td><td>${escapeHtml(uData.nitrite || '')}</td><td>Leukocyte</td><td>${escapeHtml(uData.leukocyte || '')}</td></tr>
                              <tr><td>Blood</td><td colspan="3">${escapeHtml(uData.blood || '')}</td></tr>
                            </tbody></table>
                          </div>
                          <div>
                            <h4>Microscopical Examination</h4>
                            <table><tbody>
                              <tr><td>Pus Cells</td><td>${escapeHtml(uData.pusCells || '')}</td><td>Red Cells</td><td>${escapeHtml(uData.redCells || '')}</td></tr>
                              <tr><td>Epithelial Cell</td><td>${escapeHtml(uData.epithelialCell || '')}</td><td>Bacteria</td><td>${escapeHtml(uData.bacteria || '')}</td></tr>
                              <tr><td>Crystals</td><td>${escapeHtml(uData.crystals || '')}</td><td>Amorphous</td><td>${escapeHtml(uData.amorphous || '')}</td></tr>
                              <tr><td>Mucus</td><td>${escapeHtml(uData.mucus || '')}</td><td>Other</td><td>${escapeHtml(uData.other || '')}</td></tr>
                            </tbody></table>
                          </div>
                        </div>
                      `;
                    } else {
                      return `
                        <table class="results-table">
                          <thead>
                            <tr>
                              <th style="width: 30%;">Test Name</th>
                              <th style="width: 20%;">Result</th>
                              <th style="width: 15%;">Unit</th>
                              <th style="width: 35%;">Normal Range</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td class="test-name">${escapeHtml(result.testName)}</td>
                              <td class="test-result">${escapeHtml(result.result || '-')}</td>
                              <td>${escapeHtml(result.unit || '-')}</td>
                              <td class="multiline-text">${escapeHtml(result.normalRange || '-')}</td>
                            </tr>
                          </tbody>
                        </table>
                      `;
                    }
                 }).join('')}
               </div>

               <!-- 4. الكتابة السفلية (من الإعدادات) - تظهر تحت الجدول في كل صفحة -->
               ${bottomSections.map(section => `
                 <div class="custom-section bottom" style="
                   text-align: ${section.alignment};
                   color: ${escapeHtml(section.textColor)};
                   background-color: ${escapeHtml(section.backgroundColor)};
                   font-size: ${section.fontSize || 16}px;
                 ">
                   ${escapeHtml(section.text)}
                 </div>
               `).join('')}
            </div>
          `).join('')}
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
    if (!selectedVisit || results.length === 0) {
      toast({
        title: "No Data",
        description: "Please select a patient with test results to export",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Export as PDF",
      description: "Please select 'Save as PDF' from the print dialog",
    });
    
    setTimeout(() => {
      printResults();
    }, 500);
  };

  const filteredVisits = visits?.filter((v) =>
    v.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
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
          title="Test Results"
          description="Enter and manage patient test results"
          actions={
            <>
              <Button variant="outline" onClick={printResults} className="gap-2" data-testid="button-print">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" onClick={exportPDF} className="gap-2" data-testid="button-export-pdf">
                <FileDown className="h-4 w-4" />
                Save PDF
              </Button>
              <Button onClick={saveResults} className="gap-2" data-testid="button-save-results">
                <Save className="h-4 w-4" />
                Save
              </Button>
            </>
          }
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Patient</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Type patient name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-patient"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Visit Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="pl-9"
                      data-testid="input-date"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient-select">Patients</Label>
                <Select value={selectedVisit} onValueChange={setSelectedVisit}>
                  <SelectTrigger id="patient-select" data-testid="select-patient">
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVisits?.map((visit) => (
                      <SelectItem key={visit.id} value={visit.id}>
                        {visit.patientName} - {visit.visitDate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedVisit && currentPatient && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Patient Information</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleEditPatient}
                          data-testid="button-edit-patient"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit / Delete Patient</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{currentPatient.name}</p>
                  </div>
                  {currentPatient.age && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Age</Label>
                      <p className="font-medium">{currentPatient.age}</p>
                    </div>
                  )}
                  {currentPatient.gender && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Gender</Label>
                      <p className="font-medium">{currentPatient.gender}</p>
                    </div>
                  )}
                  {currentPatient.phone && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Phone</Label>
                      <p className="font-medium">{currentPatient.phone}</p>
                    </div>
                  )}
                  {currentPatient.source && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Source</Label>
                      <p className="font-medium">{currentPatient.source}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedVisit && results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.map((test, index) => {
                    if (test.testType === "urine") {
                      const uData = test.urineData || {};
                      return (
                        <div key={test.id} className="border border-border rounded-lg p-6" data-testid={`result-row-${index}`}>
                          <h3 className="text-lg font-semibold mb-4 text-primary">Urine Analysis</h3>
                          
                          {/* Physical Examination */}
                          <div className="mb-6">
                            <h4 className="text-md font-semibold mb-3 text-foreground">Physical Examination</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Colour</Label>
                                <Input
                                  value={uData.colour || "Amber Yellow"}
                                  onChange={(e) => updateUrineData(test.id, "colour", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Aspect</Label>
                                <Input
                                  value={uData.aspect || "Clear"}
                                  onChange={(e) => updateUrineData(test.id, "aspect", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Reaction</Label>
                                <Input
                                  value={uData.reaction || "Acidic"}
                                  onChange={(e) => updateUrineData(test.id, "reaction", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Specific Gravity</Label>
                                <Input
                                  value={uData.specificGravity || "1015-1025"}
                                  onChange={(e) => updateUrineData(test.id, "specificGravity", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Chemical Examination */}
                          <div className="mb-6">
                            <h4 className="text-md font-semibold mb-3 text-foreground">Chemical Examination</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Glucose</Label>
                                <Input
                                  value={uData.glucose ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "glucose", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Protein</Label>
                                <Input
                                  value={uData.protein ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "protein", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Bilirubin</Label>
                                <Input
                                  value={uData.bilirubin ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "bilirubin", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Ketones</Label>
                                <Input
                                  value={uData.ketones ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "ketones", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Nitrite</Label>
                                <Input
                                  value={uData.nitrite ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "nitrite", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Leukocyte</Label>
                                <Input
                                  value={uData.leukocyte ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "leukocyte", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Blood</Label>
                                <Input
                                  value={uData.blood ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "blood", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Microscopical Examination */}
                          <div>
                            <h4 className="text-md font-semibold mb-3 text-foreground">Microscopical Examination</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Pus Cells</Label>
                                <Input
                                  value={uData.pusCells ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "pusCells", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Red Cells</Label>
                                <Input
                                  value={uData.redCells ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "redCells", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Epithelial Cell</Label>
                                <Input
                                  value={uData.epithelialCell ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "epithelialCell", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Bacteria</Label>
                                <Input
                                  value={uData.bacteria ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "bacteria", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Crystals</Label>
                                <Input
                                  value={uData.crystals ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "crystals", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Amorphous</Label>
                                <Input
                                  value={uData.amorphous ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "amorphous", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Mucus</Label>
                                <Input
                                  value={uData.mucus ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "mucus", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="w-32 text-sm">Other</Label>
                                <Input
                                  value={uData.other ?? "Nil"}
                                  onChange={(e) => updateUrineData(test.id, "other", e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Standard test (Updated with Textarea for multi-line support)
                    return (
                      <div
                        key={test.id}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg hover-elevate"
                        data-testid={`result-row-${index}`}
                      >
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">{test.testName}</Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`result-${test.id}`} className="text-xs text-muted-foreground">
                            Result
                          </Label>
                          <Input
                            id={`result-${test.id}`}
                            placeholder="Enter result"
                            value={test.result || ""}
                            onChange={(e) => updateResult(test.id, "result", e.target.value)}
                            data-testid={`input-result-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`unit-${test.id}`} className="text-xs text-muted-foreground">
                            Unit
                          </Label>
                          <Input
                            id={`unit-${test.id}`}
                            placeholder="Unit"
                            value={test.unit || ""}
                            onChange={(e) => updateResult(test.id, "unit", e.target.value)}
                            data-testid={`input-unit-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`range-${test.id}`} className="text-xs text-muted-foreground">
                            Normal Range
                          </Label>
                          <Textarea
                            id={`range-${test.id}`}
                            placeholder="Range"
                            value={test.normalRange || ""}
                            onChange={(e) => updateResult(test.id, "normalRange", e.target.value)}
                            data-testid={`input-range-${index}`}
                            className="min-h-[60px] resize-y"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Patient Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-patient">
            <DialogHeader>
              <DialogTitle>Edit Patient & Visit Information</DialogTitle>
              <DialogDescription>
                Update patient details, manage tests, and adjust pricing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Patient Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name *</Label>
                    <Input
                      id="edit-name"
                      value={patientFormData.name}
                      onChange={(e) => setPatientFormData({ ...patientFormData, name: e.target.value })}
                      placeholder="Patient name"
                      data-testid="input-edit-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-age">Age</Label>
                    <Input
                      id="edit-age"
                      type="number"
                      value={patientFormData.age}
                      onChange={(e) => setPatientFormData({ ...patientFormData, age: e.target.value })}
                      placeholder="Age"
                      data-testid="input-edit-age"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-gender">Gender</Label>
                    <Input
                      id="edit-gender"
                      value={patientFormData.gender}
                      onChange={(e) => setPatientFormData({ ...patientFormData, gender: e.target.value })}
                      placeholder="Gender"
                      data-testid="input-edit-gender"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={patientFormData.phone}
                      onChange={(e) => setPatientFormData({ ...patientFormData, phone: e.target.value })}
                      placeholder="Phone number"
                      data-testid="input-edit-phone"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-source">Source</Label>
                    <Input
                      id="edit-source"
                      value={patientFormData.source}
                      onChange={(e) => setPatientFormData({ ...patientFormData, source: e.target.value })}
                      placeholder="Patient source"
                      data-testid="input-edit-source"
                    />
                  </div>
                </div>
              </div>

              {/* Tests Management Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Requested Tests</h3>
                  <span className="text-xs text-muted-foreground">
                    {visitFormData.testIds.length} test(s) selected
                  </span>
                </div>
                
                {/* Current Tests */}
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {visitFormData.testIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No tests selected</p>
                  ) : (
                    visitFormData.testIds.map((testId) => {
                      const test = allTests?.find(t => t.id === testId);
                      if (!test) return null;
                      return (
                        <div key={testId} className="flex items-center justify-between p-2 bg-muted/30 rounded hover-elevate" data-testid={`test-item-${testId}`}>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{test.name}</p>
                            {test.price && (
                              <p className="text-xs text-muted-foreground">{test.price} IQD</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTest(testId)}
                            className="h-8 w-8"
                            data-testid={`button-remove-test-${testId}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Test Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="add-test">Add Test</Label>
                  <Select onValueChange={handleAddTest} value="">
                    <SelectTrigger id="add-test" data-testid="select-add-test">
                      <SelectValue placeholder="Select a test to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTests?.filter(test => !visitFormData.testIds.includes(test.id)).map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {test.name} {test.price ? `(${test.price} IQD)` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Pricing</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-total-cost">Total Cost (IQD)</Label>
                  <Input
                    id="edit-total-cost"
                    type="number"
                    value={visitFormData.totalCost}
                    onChange={(e) => setVisitFormData({ ...visitFormData, totalCost: parseFloat(e.target.value) || 0 })}
                    placeholder="Total cost"
                    data-testid="input-edit-total-cost"
                  />
                  <p className="text-xs text-muted-foreground">
                    Suggested: {allTests?.filter(t => visitFormData.testIds.includes(t.id)).reduce((sum, t) => sum + (t.price || 0), 0)} IQD
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
                data-testid="button-delete-patient"
              >
                <Trash2 className="h-4 w-4" />
                Delete Patient
              </Button>
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePatient}
                  disabled={!patientFormData.name || updatePatientMutation.isPending}
                  data-testid="button-save-patient"
                >
                  {updatePatientMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="dialog-confirm-delete">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to permanently delete this patient?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the patient and all related data including visits, test results, and expenses.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePatient}
                className="bg-destructive hover:bg-destructive/90"
                disabled={deletePatientMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deletePatientMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
