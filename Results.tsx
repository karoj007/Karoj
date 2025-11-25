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
  
  // Form State
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

  // --- Queries ---
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

  // Sync results when testResults changes
  useEffect(() => {
    if (testResults) {
      setResults(testResults);
    }
  }, [testResults]);

  // --- Mutations ---
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
      toast({ title: "Deleted", description: "Patient data deleted." });
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
      toast({ title: "Saved", description: "Results saved successfully" });
    },
  });

  // --- Update Handlers ---
  const updateResult = (id: string, field: keyof TestResult, value: string) => {
    setResults(results.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const updateUrineData = (id: string, field: string, value: string) => {
    setResults(results.map((r) => {
      if (r.id === id) {
        return { ...r, urineData: { ...r.urineData, [field]: value } };
      }
      return r;
    }));
  };

  // --- Edit Logic ---
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
          gender: patientFormData.gender,
          phone: patientFormData.phone,
          source: patientFormData.source,
        },
      });

      // 2. Handle Tests (Add & Remove)
      const oldTestIds = editingVisit.testIds || [];
      const newTestIds = visitFormData.testIds;

      const addedTestIds = newTestIds.filter(id => !oldTestIds.includes(id));
      const removedTestIds = oldTestIds.filter(id => !newTestIds.includes(id));

      // A. DELETE Removed Tests
      if (removedTestIds.length > 0) {
        // Find result rows linked to these IDs locally
        const resultsToDelete = results.filter(r => removedTestIds.includes(r.testId));
        
        // Delete from Database
        for (const res of resultsToDelete) {
           await deleteTestResultMutation.mutateAsync(res.id);
        }
        
        // *** CRITICAL FIX: Update Local State Immediately ***
        // This ensures the fields disappear instantly from the screen
        setResults(prev => prev.filter(r => !removedTestIds.includes(r.testId)));
      }

      // B. ADD New Tests
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
           // Default Urine Data
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

      // 3. Update Visit Data (Test IDs & Price)
      await updateVisitMutation.mutateAsync({
        id: editingVisit.id,
        visit: {
          testIds: visitFormData.testIds,
          totalCost: visitFormData.totalCost,
        },
      });

      // 4. Force Refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/test-results"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });

      setEditDialogOpen(false);
      toast({ title: "Saved", description: "Changes updated successfully" });

    } catch (error) {
       console.error(error);
       toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
  };

  const handleDeletePatient = async () => {
    if (!editingPatient) return;
    await deletePatientMutation.mutateAsync(editingPatient.id);
  };

  const handleAddTest = (testId: string) => {
    if (!visitFormData.testIds.includes(testId)) {
      const test = allTests?.find(t => t.id === testId);
      const newTotal = visitFormData.totalCost + (test?.price || 0);
      setVisitFormData({
        testIds: [...visitFormData.testIds, testId],
        totalCost: newTotal
      });
    }
  };

  const handleRemoveTest = (testId: string) => {
    const test = allTests?.find(t => t.id === testId);
    const newTotal = Math.max(0, visitFormData.totalCost - (test?.price || 0));
    setVisitFormData({
      testIds: visitFormData.testIds.filter(id => id !== testId),
      totalCost: newTotal
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

  // --- Printing ---
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const printResults = () => {
    if (!selectedVisit || results.length === 0) {
      toast({ title: "No Data", description: "Select a patient first", variant: "destructive" });
      return;
    }
    
    const selectedVisitData = visits?.find(v => v.id === selectedVisit);
    if (!selectedVisitData) return;
    const patientData = currentPatient;

    let customSections: CustomPrintSection[] = [];
    try {
      const s = settings?.find(x => x.key === "customPrintSections");
      if (s) customSections = JSON.parse(s.value);
    } catch (e) { customSections = []; }
    const topSections = customSections.filter(s => s.position === "top");
    const bottomSections = customSections.filter(s => s.position === "bottom");

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Organize pages
    const isLongTest = (t: string, type?: string) => type === 'urine' || ['stool','culture'].some(k => t.toLowerCase().includes(k));
    const pages = [];
    results.filter(r => isLongTest(r.testName, r.testType)).forEach(t => pages.push([t]));
    const shortTests = results.filter(r => !isLongTest(r.testName, r.testType));
    for(let i=0; i<shortTests.length; i+=10) pages.push(shortTests.slice(i, i+10));

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Result Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; -webkit-print-color-adjust: exact; }
            .header-box { 
              border: 1px solid #000; 
              padding: 12px; 
              margin-bottom: 20px; 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); /* 3 Columns */
              gap: 8px;
              background: #f9f9f9;
            }
            .info-row { font-size: 14px; }
            .label { font-weight: bold; color: #333; margin-right: 5px; }
            
            /* Standard Table */
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #eef2f7; border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 13px; }
            td { border: 1px solid #ccc; padding: 8px; font-size: 13px; }
            
            /* Urine Section */
            .urine-container { display: flex; flex-wrap: wrap; gap: 20px; }
            .urine-col { flex: 1; min-width: 200px; }
            .urine-table td { padding: 4px 6px; font-size: 12px; border: 1px solid #eee; }
            .urine-table th { padding: 4px 6px; font-size: 12px; background: #f5f5f5; border: 1px solid #eee; text-align: left; }
            .section-title { font-weight: bold; margin-bottom: 5px; font-size: 13px; border-bottom: 2px solid #ddd; display: inline-block; }

            .custom-text { margin: 10px 0; padding: 5px; }
            .page-break { page-break-after: always; }
            .page-break:last-child { page-break-after: auto; }
          </style>
        </head>
        <body>
          ${pages.map(pageRes => `
            <div class="page-break">
              ${topSections.map(s => `<div class="custom-text" style="text-align:${s.alignment};color:${s.textColor};background:${s.backgroundColor};font-size:${s.fontSize}px">${s.text}</div>`).join('')}
              
              <div class="header-box">
                <div class="info-row"><span class="label">Name:</span> ${escapeHtml(patientData?.name || '')}</div>
                <div class="info-row"><span class="label">Age:</span> ${patientData?.age || ''}</div>
                <div class="info-row"><span class="label">Gender:</span> ${escapeHtml(patientData?.gender || '')}</div>
                <div class="info-row"><span class="label">Ref:</span> ${escapeHtml(patientData?.source || '')}</div>
                <div class="info-row"><span class="label">Phone:</span> ${escapeHtml(patientData?.phone || '')}</div>
                <div class="info-row"><span class="label" style="color: #000; font-weight: bold;">Date:</span> ${selectedVisitData.visitDate}</div>
              </div>

              ${pageRes.map(res => {
                if (res.testType === 'urine' && res.urineData) {
                  const u = res.urineData;
                  return `
                    <h3 style="border-bottom: 2px solid #000; display: inline-block; margin-bottom: 15px;">URINE ANALYSIS</h3>
                    <div class="urine-container">
                      <div class="urine-col">
                        <div class="section-title">Physical Examination</div>
                        <table class="urine-table" style="width:100%">
                          <tr><td>Colour</td><td>${u.colour}</td></tr>
                          <tr><td>Aspect</td><td>${u.aspect}</td></tr>
                          <tr><td>Reaction</td><td>${u.reaction}</td></tr>
                          <tr><td>Sp. Gravity</td><td>${u.specificGravity}</td></tr>
                        </table>
                      </div>
                      <div class="urine-col">
                        <div class="section-title">Chemical Examination</div>
                        <table class="urine-table" style="width:100%">
                          <tr><td>Glucose</td><td>${u.glucose}</td></tr>
                          <tr><td>Protein</td><td>${u.protein}</td></tr>
                          <tr><td>Bilirubin</td><td>${u.bilirubin}</td></tr>
                          <tr><td>Ketones</td><td>${u.ketones}</td></tr>
                          <tr><td>Nitrite</td><td>${u.nitrite}</td></tr>
                          <tr><td>Blood</td><td>${u.blood}</td></tr>
                        </table>
                      </div>
                    </div>
                    <div style="margin-top: 15px;">
                      <div class="section-title">Microscopical Examination</div>
                      <table class="urine-table" style="width:100%">
                        <tr>
                          <th>Pus Cells</th><td>${u.pusCells}</td>
                          <th>Red Cells</th><td>${u.redCells}</td>
                        </tr>
                        <tr>
                          <th>Epith. Cells</th><td>${u.epithelialCell}</td>
                          <th>Bacteria</th><td>${u.bacteria}</td>
                        </tr>
                        <tr>
                          <th>Crystals</th><td>${u.crystals}</td>
                          <th>Amorphous</th><td>${u.amorphous}</td>
                        </tr>
                        <tr>
                          <th>Mucus</th><td>${u.mucus}</td>
                          <th>Others</th><td>${u.other}</td>
                        </tr>
                      </table>
                    </div>
                  `;
                } else {
                  return `
                    <table>
                      <thead><tr><th style="width:35%">Test Name</th><th style="width:20%">Result</th><th style="width:20%">Unit</th><th style="width:25%">Normal Range</th></tr></thead>
                      <tbody>
                        <tr>
                          <td style="font-weight:bold; color:#000;">${escapeHtml(res.testName)}</td>
                          <td style="font-weight:bold; font-family:monospace; font-size:14px;">${escapeHtml(res.result || '')}</td>
                          <td>${escapeHtml(res.unit || '')}</td>
                          <td>${escapeHtml(res.normalRange || '')}</td>
                        </tr>
                      </tbody>
                    </table>
                  `;
                }
              }).join('')}

              ${bottomSections.map(s => `<div class="custom-text" style="text-align:${s.alignment};color:${s.textColor};background:${s.backgroundColor};font-size:${s.fontSize}px">${s.text}</div>`).join('')}
            </div>
          `).join('')}
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const exportPDF = () => {
    toast({ title: "PDF Export", description: "Please choose 'Save as PDF' in the print window." });
    printResults();
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
          description="Enter results and manage patients"
          actions={
            <>
              <Button variant="outline" onClick={printResults} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
              <Button variant="outline" onClick={exportPDF} className="gap-2"><FileDown className="h-4 w-4" /> PDF</Button>
              <Button onClick={saveResults} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
            </>
          }
        />

        <div className="space-y-6">
          {/* Patient Selection */}
          <Card>
            <CardHeader><CardTitle>Select Patient</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Patient name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
              </div>
              <Select value={selectedVisit} onValueChange={setSelectedVisit}>
                <SelectTrigger><SelectValue placeholder="Select a patient..." /></SelectTrigger>
                <SelectContent>
                  {filteredVisits?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.patientName} - {v.visitDate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Patient Info */}
          {selectedVisit && currentPatient && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Patient Information</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleEditPatient}><Settings className="h-4 w-4" /></Button></TooltipTrigger>
                      <TooltipContent>Edit Patient / Tests</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm font-medium">
                  <div><span className="text-muted-foreground font-normal">Name:</span> {currentPatient.name}</div>
                  <div><span className="text-muted-foreground font-normal">Age:</span> {currentPatient.age}</div>
                  <div><span className="text-muted-foreground font-normal">Gender:</span> {currentPatient.gender}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Entry */}
          {selectedVisit && results.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Enter Results</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {results.map((test, index) => {
                    if (test.testType === "urine") {
                      const u = test.urineData || {};
                      return (
                        <div key={test.id} className="border border-border rounded-lg p-6 bg-card">
                          <h3 className="text-lg font-bold mb-4 text-primary border-b pb-2">Urine Analysis</h3>
                          
                          {/* Physical */}
                          <div className="mb-6">
                            <h4 className="text-md font-semibold mb-3 text-muted-foreground">Physical Examination</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3"><Label className="w-32">Colour</Label><Input value={u.colour} onChange={(e)=>updateUrineData(test.id,'colour',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Aspect</Label><Input value={u.aspect} onChange={(e)=>updateUrineData(test.id,'aspect',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Reaction</Label><Input value={u.reaction} onChange={(e)=>updateUrineData(test.id,'reaction',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Specific Gravity</Label><Input value={u.specificGravity} onChange={(e)=>updateUrineData(test.id,'specificGravity',e.target.value)} className="flex-1" /></div>
                            </div>
                          </div>

                          {/* Chemical */}
                          <div className="mb-6">
                            <h4 className="text-md font-semibold mb-3 text-muted-foreground">Chemical Examination</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3"><Label className="w-32">Glucose</Label><Input value={u.glucose} onChange={(e)=>updateUrineData(test.id,'glucose',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Protein</Label><Input value={u.protein} onChange={(e)=>updateUrineData(test.id,'protein',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Bilirubin</Label><Input value={u.bilirubin} onChange={(e)=>updateUrineData(test.id,'bilirubin',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Ketones</Label><Input value={u.ketones} onChange={(e)=>updateUrineData(test.id,'ketones',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Nitrite</Label><Input value={u.nitrite} onChange={(e)=>updateUrineData(test.id,'nitrite',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Leukocyte</Label><Input value={u.leukocyte} onChange={(e)=>updateUrineData(test.id,'leukocyte',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Blood</Label><Input value={u.blood} onChange={(e)=>updateUrineData(test.id,'blood',e.target.value)} className="flex-1" /></div>
                            </div>
                          </div>

                          {/* Microscopical */}
                          <div>
                            <h4 className="text-md font-semibold mb-3 text-muted-foreground">Microscopical Examination</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3"><Label className="w-32">Pus Cells</Label><Input value={u.pusCells} onChange={(e)=>updateUrineData(test.id,'pusCells',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Red Cells</Label><Input value={u.redCells} onChange={(e)=>updateUrineData(test.id,'redCells',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Epithelial Cell</Label><Input value={u.epithelialCell} onChange={(e)=>updateUrineData(test.id,'epithelialCell',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Bacteria</Label><Input value={u.bacteria} onChange={(e)=>updateUrineData(test.id,'bacteria',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Crystals</Label><Input value={u.crystals} onChange={(e)=>updateUrineData(test.id,'crystals',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Amorphous</Label><Input value={u.amorphous} onChange={(e)=>updateUrineData(test.id,'amorphous',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Mucus</Label><Input value={u.mucus} onChange={(e)=>updateUrineData(test.id,'mucus',e.target.value)} className="flex-1" /></div>
                              <div className="flex items-center gap-3"><Label className="w-32">Other</Label><Input value={u.other} onChange={(e)=>updateUrineData(test.id,'other',e.target.value)} className="flex-1" /></div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    // Standard Test
                    return (
                      <div key={test.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg hover:shadow-sm bg-card items-center">
                        <div className="font-semibold text-foreground">{test.testName}</div>
                        <div><Label className="text-xs text-muted-foreground mb-1 block">Result</Label><Input value={test.result || ""} onChange={(e) => updateResult(test.id, "result", e.target.value)} /></div>
                        <div><Label className="text-xs text-muted-foreground mb-1 block">Unit</Label><Input value={test.unit || ""} onChange={(e) => updateResult(test.id, "unit", e.target.value)} /></div>
                        <div><Label className="text-xs text-muted-foreground mb-1 block">Range</Label><Input value={test.normalRange || ""} onChange={(e) => updateResult(test.id, "normalRange", e.target.value)} /></div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Patient & Tests</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={patientFormData.name} onChange={(e)=>setPatientFormData({...patientFormData, name: e.target.value})} /></div>
                <div><Label>Age</Label><Input value={patientFormData.age} onChange={(e)=>setPatientFormData({...patientFormData, age: e.target.value})} /></div>
                <div><Label>Gender</Label><Input value={patientFormData.gender} onChange={(e)=>setPatientFormData({...patientFormData, gender: e.target.value})} /></div>
                <div><Label>Phone</Label><Input value={patientFormData.phone} onChange={(e)=>setPatientFormData({...patientFormData, phone: e.target.value})} /></div>
              </div>
              
              <div className="space-y-2 mt-4 border-t pt-4">
                <div className="flex justify-between"><Label>Selected Tests</Label><span className="text-xs text-muted-foreground">{visitFormData.testIds.length} tests</span></div>
                <div className="border rounded-md p-2 space-y-2 max-h-48 overflow-y-auto bg-muted/20">
                  {visitFormData.testIds.map(id => {
                    const t = allTests?.find(x => x.id === id);
                    return t ? (
                      <div key={id} className="flex justify-between bg-background p-2 rounded border items-center">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 hover:bg-red-100 hover:text-red-600" onClick={()=>handleRemoveTest(id)}><X className="h-4 w-4"/></Button>
                      </div>
                    ) : null;
                  })}
                </div>
                <Select onValueChange={handleAddTest}>
                  <SelectTrigger><SelectValue placeholder="Add a test..." /></SelectTrigger>
                  <SelectContent>{allTests?.filter(t => !visitFormData.testIds.includes(t.id)).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              
              <div><Label>Total Cost</Label><Input type="number" value={visitFormData.totalCost} onChange={(e)=>setVisitFormData({...visitFormData, totalCost: parseFloat(e.target.value) || 0})} /></div>
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={()=>setDeleteDialogOpen(true)}>Delete Patient</Button>
              <Button onClick={handleSavePatient}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the patient and all data.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeletePatient} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
