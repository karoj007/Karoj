import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Printer, FileDown, Search, Calendar, ArrowLeft, Settings, Trash2, X } from "lucide-react";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      toast({
        title: "Changes Saved",
        description: "Patient information has been updated successfully",
      });
    },
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
        title: "Patient Deleted",
        description: "Patient and all related data have been permanently deleted",
      });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: (data: { id: string; visit: Partial<Visit> }) =>
      apiRequest("PUT", `/api/visits/${data.id}`, data.visit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-results"] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
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
      // 1. Update Patient Info
      await updatePatientMutation.mutateAsync({
        id: editingPatient.id,
        patient: {
          name: patientFormData.name,
          age: patientFormData.age ? parseInt(patientFormData.age) : undefined,
          gender: patientFormData.gender || undefined,
          phone: patientFormData.phone || undefined,
          source: patientFormData.source || undefined,
        },
      });

      // 2. Handle Test Changes (Additions and Deletions)
      const oldTestIds = editingVisit.testIds || [];
      const newTestIds = visitFormData.testIds;

      // Identify added and removed tests
      const addedTestIds = newTestIds.filter(id => !oldTestIds.includes(id));
      const removedTestIds = oldTestIds.filter(id => !newTestIds.includes(id));

      // DELETE REMOVED TESTS
      if (removedTestIds.length > 0) {
        // Find the TestResult objects that correspond to these testIds in this visit
        const resultsToDelete = results.filter(r => removedTestIds.includes(r.testId));
        
        for (const res of resultsToDelete) {
           await deleteTestResultMutation.mutateAsync(res.id);
        }
      }

      // ADD NEW TESTS
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
           // Add default urine data if needed
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

      // 3. Update Visit (Test IDs List and Total Cost)
      await updateVisitMutation.mutateAsync({
        id: editingVisit.id,
        visit: {
          testIds: visitFormData.testIds,
          totalCost: visitFormData.totalCost,
        },
      });

      setEditDialogOpen(false);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/test-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });

      toast({
        title: "Changes Saved",
        description: "Patient and tests updated successfully",
      });
    } catch (error) {
       console.error(error);
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
      
      toast({
        title: "Results Saved",
        description: "Test results have been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save results",
        variant: "destructive",
      });
    }
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const printResults = async () => {
    if (!selectedVisit || results.length === 0) {
      toast({ title: "No Data", description: "Please select a patient", variant: "destructive" });
      return;
    }

    const selectedVisitData = visits?.find(v => v.id === selectedVisit);
    if (!selectedVisitData) return;

    let patientData: Patient | null = null;
    try {
      const response = await fetch(`/api/patients/${selectedVisitData.patientId}`);
      if (response.ok) {
        patientData = await response.json();
      }
    } catch (error) { console.error(error); }

    let customSections: CustomPrintSection[] = [];
    try {
      const customSectionsSetting = settings?.find((s) => s.key === "customPrintSections");
      if (customSectionsSetting) customSections = JSON.parse(customSectionsSetting.value);
    } catch (e) { customSections = []; }

    const topSections = customSections.filter(s => s.position === "top" && s.text.trim());
    const bottomSections = customSections.filter(s => s.position === "bottom" && s.text.trim());

    // Print Logic
    const LONG_TEST_KEYWORDS = ['urine', 'stool', 'culture', 'sensitivity'];
    const isLongTest = (testName: string, testType?: string) => {
      if (testType === 'urine') return true;
      return LONG_TEST_KEYWORDS.some(k => testName.toLowerCase().includes(k));
    };

    const longTests = results.filter(r => isLongTest(r.testName, r.testType));
    const shortTests = results.filter(r => !isLongTest(r.testName, r.testType));

    const pages: Array<typeof results> = [];
    longTests.forEach(test => pages.push([test]));
    const TESTS_PER_PAGE = 8;
    for (let i = 0; i < shortTests.length; i += TESTS_PER_PAGE) {
      pages.push(shortTests.slice(i, i + TESTS_PER_PAGE));
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // PATIENT INFO HTML (ADDED DATE HERE)
    const patientInfoHTML = `
      <div class="patient-info">
        <h2>Patient Information</h2>
        <div class="info-grid">
          ${patientData?.name ? `<div class="info-item"><span class="info-label">Name:</span><span class="info-value">${escapeHtml(patientData.name)}</span></div>` : ''}
          ${patientData?.age ? `<div class="info-item"><span class="info-label">Age:</span><span class="info-value">${patientData.age}</span></div>` : ''}
          ${patientData?.gender ? `<div class="info-item"><span class="info-label">Gender:</span><span class="info-value">${escapeHtml(patientData.gender)}</span></div>` : ''}
          <div class="info-item"><span class="info-label">Date:</span><span class="info-value" style="font-family:monospace;">${selectedVisitData.visitDate}</span></div>
          ${patientData?.phone ? `<div class="info-item"><span class="info-label">Phone:</span><span class="info-value">${escapeHtml(patientData.phone)}</span></div>` : ''}
        </div>
      </div>
    `;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Test Results</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', Arial, sans-serif; padding: 35px; color: #1f2937; }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: auto; }
            .custom-section { padding: 12px; margin-bottom: 18px; }
            .patient-info { background: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 25px; border: 1px solid #e5e7eb; }
            .patient-info h2 { font-size: 16px; margin-bottom: 10px; color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .info-item { display: flex; flex-direction: column; }
            .info-label { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
            .info-value { font-size: 14px; font-weight: 600; color: #111827; }
            .results-table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid #d1d5db; }
            .results-table th { background: #1e3a8a; color: white; padding: 8px; text-align: left; font-size: 13px; }
            .results-table td { padding: 8px; border: 1px solid #d1d5db; font-size: 13px; }
            .results-table tr:nth-child(even) { background: #f9fafb; }
            .test-name { font-weight: 700; color: #1e3a8a; }
            .test-result { font-weight: 700; color: #059669; }
            /* Urine Styles */
            .complex-test { margin-top: 10px; }
            .complex-test h3 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; margin-bottom: 10px; }
            .complex-test table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; }
            .complex-test td { border: 1px solid #e5e7eb; padding: 4px 8px; }
            .complex-test td:nth-child(odd) { background: #f3f4f6; font-weight: 600; width: 25%; }
            @media print { body { padding: 20px; } .results-table { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${pages.map((pageTests) => `
            <div class="page">
               ${topSections.map(s => `<div class="custom-section" style="text-align:${s.alignment};color:${s.textColor};font-size:${s.fontSize}px">${s.text}</div>`).join('')}
               ${patientInfoHTML}
               ${pageTests.map(result => {
                 if (result.testType === 'urine' && result.urineData) {
                    const u = result.urineData;
                    return `
                    <div class="complex-test">
                      <h3>Urine Analysis</h3>
                      <table>
                        <tr><td>Colour</td><td>${u.colour}</td><td>Aspect</td><td>${u.aspect}</td></tr>
                        <tr><td>Reaction</td><td>${u.reaction}</td><td>Specific Gravity</td><td>${u.specificGravity}</td></tr>
                      </table>
                      <table style="margin-top:5px">
                        <tr><td>Glucose</td><td>${u.glucose}</td><td>Protein</td><td>${u.protein}</td></tr>
                        <tr><td>Bilirubin</td><td>${u.bilirubin}</td><td>Ketones</td><td>${u.ketones}</td></tr>
                        <tr><td>Nitrite</td><td>${u.nitrite}</td><td>Leukocyte</td><td>${u.leukocyte}</td></tr>
                        <tr><td>Blood</td><td>${u.blood}</td><td></td><td></td></tr>
                      </table>
                      <table style="margin-top:5px">
                        <tr><td>Pus Cells</td><td>${u.pusCells}</td><td>Red Cells</td><td>${u.redCells}</td></tr>
                        <tr><td>Epithelial</td><td>${u.epithelialCell}</td><td>Bacteria</td><td>${u.bacteria}</td></tr>
                        <tr><td>Crystals</td><td>${u.crystals}</td><td>Amorphous</td><td>${u.amorphous}</td></tr>
                        <tr><td>Mucus</td><td>${u.mucus}</td><td>Other</td><td>${u.other}</td></tr>
                      </table>
                    </div>`;
                 } else {
                    return `
                    <table class="results-table">
                      <thead><tr><th>Test Name</th><th>Result</th><th>Unit</th><th>Normal Range</th></tr></thead>
                      <tbody><tr>
                        <td class="test-name">${escapeHtml(result.testName)}</td>
                        <td class="test-result">${escapeHtml(result.result || '-')}</td>
                        <td>${escapeHtml(result.unit || '-')}</td>
                        <td>${escapeHtml(result.normalRange || '-')}</td>
                      </tr></tbody>
                    </table>`;
                 }
               }).join('')}
               ${bottomSections.map(s => `<div class="custom-section" style="text-align:${s.alignment};color:${s.textColor};font-size:${s.fontSize}px">${s.text}</div>`).join('')}
            </div>
          `).join('')}
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const exportPDF = () => {
    toast({ title: "Export PDF", description: "Use 'Save as PDF' in the print dialog." });
    setTimeout(printResults, 500);
  };

  const filteredVisits = visits?.filter((v) => v.patientName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
        <PageHeader
          title="Test Results"
          description="Enter and manage patient test results"
          actions={
            <>
              <Button variant="outline" onClick={printResults} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
              <Button variant="outline" onClick={exportPDF} className="gap-2"><FileDown className="h-4 w-4" /> Save PDF</Button>
              <Button onClick={saveResults} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
            </>
          }
        />

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Patient Selection</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Search Patient</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Type patient name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Visit Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-9" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Patients</Label>
                <Select value={selectedVisit} onValueChange={setSelectedVisit}>
                  <SelectTrigger><SelectValue placeholder="Select a patient" /></SelectTrigger>
                  <SelectContent>
                    {filteredVisits?.map((visit) => (
                      <SelectItem key={visit.id} value={visit.id}>{visit.patientName} - {visit.visitDate}</SelectItem>
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
                        <Button variant="ghost" size="icon" onClick={handleEditPatient}><Settings className="h-4 w-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Edit / Delete Patient</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label className="text-sm text-muted-foreground">Name</Label><p className="font-medium">{currentPatient.name}</p></div>
                  {currentPatient.age && <div><Label className="text-sm text-muted-foreground">Age</Label><p className="font-medium">{currentPatient.age}</p></div>}
                  {currentPatient.gender && <div><Label className="text-sm text-muted-foreground">Gender</Label><p className="font-medium">{currentPatient.gender}</p></div>}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedVisit && results.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Test Results Entry</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.map((test, index) => {
                    if (test.testType === "urine") {
                      return (
                         <div key={test.id} className="border p-4 rounded-lg bg-muted/20">
                           <h3 className="font-bold mb-2 text-primary">Urine Analysis</h3>
                           <div className="grid grid-cols-2 gap-4">
                             <div>
                               <Label className="text-xs">Physical</Label>
                               <Input value={test.urineData?.colour} onChange={(e)=>updateUrineData(test.id,'colour',e.target.value)} className="mb-2 h-8" placeholder="Colour" />
                               <Input value={test.urineData?.aspect} onChange={(e)=>updateUrineData(test.id,'aspect',e.target.value)} className="h-8" placeholder="Aspect" />
                             </div>
                             <div>
                               <Label className="text-xs">Chemical (Glucose/Protein)</Label>
                               <Input value={test.urineData?.glucose} onChange={(e)=>updateUrineData(test.id,'glucose',e.target.value)} className="mb-2 h-8" placeholder="Glucose" />
                               <Input value={test.urineData?.protein} onChange={(e)=>updateUrineData(test.id,'protein',e.target.value)} className="h-8" placeholder="Protein" />
                             </div>
                           </div>
                           <div className="mt-2 text-xs text-muted-foreground text-center">Click print to see full Urine report</div>
                         </div>
                      );
                    }
                    return (
                      <div key={test.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg hover:shadow-sm transition-all">
                        <div className="space-y-2"><Label className="text-sm font-medium">{test.testName}</Label></div>
                        <div className="space-y-2"><Label className="text-xs text-muted-foreground">Result</Label><Input value={test.result || ""} onChange={(e) => updateResult(test.id, "result", e.target.value)} /></div>
                        <div className="space-y-2"><Label className="text-xs text-muted-foreground">Unit</Label><Input value={test.unit || ""} onChange={(e) => updateResult(test.id, "unit", e.target.value)} /></div>
                        <div className="space-y-2"><Label className="text-xs text-muted-foreground">Normal Range</Label><Input value={test.normalRange || ""} onChange={(e) => updateResult(test.id, "normalRange", e.target.value)} /></div>
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
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Patient & Visit</DialogTitle>
              <DialogDescription>Update info, add/remove tests.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name</Label><Input value={patientFormData.name} onChange={(e) => setPatientFormData({ ...patientFormData, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Age</Label><Input value={patientFormData.age} onChange={(e) => setPatientFormData({ ...patientFormData, age: e.target.value })} /></div>
                <div className="space-y-2"><Label>Gender</Label><Input value={patientFormData.gender} onChange={(e) => setPatientFormData({ ...patientFormData, gender: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={patientFormData.phone} onChange={(e) => setPatientFormData({ ...patientFormData, phone: e.target.value })} /></div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>Selected Tests ({visitFormData.testIds.length})</Label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                  {visitFormData.testIds.map((testId) => {
                    const test = allTests?.find(t => t.id === testId);
                    return test ? (
                      <div key={testId} className="flex justify-between items-center bg-muted/40 p-2 rounded">
                        <span className="text-sm">{test.name}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveTest(testId)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Add Test</Label>
                <Select onValueChange={handleAddTest} value="">
                  <SelectTrigger><SelectValue placeholder="Add a test..." /></SelectTrigger>
                  <SelectContent>
                    {allTests?.filter(t => !visitFormData.testIds.includes(t.id)).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2"><Label>Total Cost</Label><Input type="number" value={visitFormData.totalCost} onChange={(e) => setVisitFormData({ ...visitFormData, totalCost: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>Delete Patient</Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePatient}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Patient?</AlertDialogTitle><AlertDialogDescription>This action is permanent.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePatient} className="bg-destructive">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
