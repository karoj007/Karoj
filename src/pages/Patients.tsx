import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Search, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Test, Patient, Visit, TestResult } from "@shared/schema";
import { useLocation } from "wouter";

interface SelectedTest {
  id: string;
  name: string;
  price: number;
  unit: string;
  normalRange: string;
  testType?: "standard" | "urine";
}

export default function Patients() {
  const [, setLocation] = useLocation();
  const [patientData, setPatientData] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    source: "",
  });
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [testSearchTerm, setTestSearchTerm] = useState("");
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [currentVisitId, setCurrentVisitId] = useState<string | null>(null);
  const [resultMap, setResultMap] = useState<Record<string, string>>({});
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const hasMounted = useRef(false);
  const isResetting = useRef(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    hasMounted.current = true;
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  const { data: tests } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const filteredTests = tests?.filter(test => 
    test.name.toLowerCase().includes(testSearchTerm.toLowerCase()) &&
    !selectedTests.find(st => st.id === test.id)
  ) || [];

  const createPatientMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/patients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/visits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
    },
  });

  const createTestResultMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/test-results", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-results"] });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/patients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/visits/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
    },
  });

  const updateTestResultMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/test-results/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-results"] });
    },
  });

  const deleteTestResultMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/test-results/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-results"] });
    },
  });

  const getDefaultUrineData = () => ({
    colour: "Amber Yellow",
    aspect: "Clear",
    reaction: "Acidic",
    specificGravity: "1015-1025",
    glucose: "Nil",
    protein: "Nil",
    bilirubin: "Nil",
    ketones: "Nil",
    nitrite: "Nil",
    leukocyte: "Nil",
    blood: "Nil",
    pusCells: "Nil",
    redCells: "Nil",
    epithelialCell: "Nil",
    bacteria: "Nil",
    crystals: "Nil",
    amorphous: "Nil",
    mucus: "Nil",
    other: "Nil",
  });

  const clearAutoSaveTimer = () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
  };

  const resetForm = () => {
    isResetting.current = true;
    clearAutoSaveTimer();
    setPatientData({ name: "", age: "", gender: "", phone: "", source: "" });
    setSelectedTests([]);
    setResultMap({});
    setTotalCost(0);
    setTestSearchTerm("");
    setShowTestDropdown(false);
    setCurrentPatientId(null);
    setCurrentVisitId(null);
    setHasPendingChanges(false);
    setLastAutoSaveAt(null);
    setTimeout(() => {
      isResetting.current = false;
    }, 0);
  };

  const savePatientData = async ({ silent = false, finalize = false }: { silent?: boolean; finalize?: boolean } = {}) => {
    const trimmedName = patientData.name.trim();

    if (!trimmedName) {
      if (!silent) {
        toast({
          title: "Validation Error",
          description: "Patient name is required",
          variant: "destructive",
        });
      }
      return false;
    }

    if (selectedTests.length === 0) {
      if (!silent) {
        toast({
          title: "Validation Error",
          description: "Please select at least one test",
          variant: "destructive",
        });
      }
      return false;
    }

    clearAutoSaveTimer();

    try {
      let patientId = currentPatientId;
      const patientPayload = {
        name: trimmedName,
        age: patientData.age ? parseInt(patientData.age, 10) : undefined,
        gender: patientData.gender || undefined,
        phone: patientData.phone || undefined,
        source: patientData.source || undefined,
      };

      if (!patientId) {
        const patientResponse = await createPatientMutation.mutateAsync(patientPayload);
        const patient: Patient = await (patientResponse as Response).json();
        patientId = patient.id;
        setCurrentPatientId(patientId);
      } else {
        const response = await updatePatientMutation.mutateAsync({ id: patientId, data: patientPayload });
        await (response as Response).json();
      }

      if (!patientId) {
        throw new Error("Patient identifier could not be determined after saving.");
      }

      const visitPayload = {
        patientId,
        patientName: trimmedName,
        visitDate: new Date().toISOString().split("T")[0],
        totalCost: Number.isFinite(totalCost) ? Number(totalCost) : 0,
        testIds: selectedTests.map((t) => t.id),
      };

      let visitId = currentVisitId;
      if (!visitId) {
        const visitResponse = await createVisitMutation.mutateAsync(visitPayload);
        const visit: Visit = await (visitResponse as Response).json();
        visitId = visit.id;
        setCurrentVisitId(visitId);
      } else {
        const response = await updateVisitMutation.mutateAsync({ id: visitId, data: visitPayload });
        await (response as Response).json();
      }

      if (!visitId) {
        throw new Error("Visit identifier could not be determined after saving.");
      }

      const updatedResultMap: Record<string, string> = { ...resultMap };
      const selectedTestIds = new Set(selectedTests.map((t) => t.id));

      for (const [testId, resultId] of Object.entries(resultMap)) {
        if (!selectedTestIds.has(testId) && resultId) {
          await deleteTestResultMutation.mutateAsync(resultId);
          delete updatedResultMap[testId];
        }
      }

      for (const test of selectedTests) {
        const payload: any = {
          visitId,
          testId: test.id,
          testName: test.name,
          price: Number(test.price) || 0,
          unit: test.unit || undefined,
          normalRange: test.normalRange || undefined,
          testType: test.testType || "standard",
        };

        const existingResultId = updatedResultMap[test.id];

        if (existingResultId) {
          await updateTestResultMutation.mutateAsync({ id: existingResultId, data: payload });
        } else {
          if (test.testType === "urine") {
            payload.urineData = getDefaultUrineData();
          }
          const resultResponse = await createTestResultMutation.mutateAsync(payload);
          const result: TestResult = await (resultResponse as Response).json();
          updatedResultMap[test.id] = result.id;
        }
      }

      setResultMap(updatedResultMap);
      setHasPendingChanges(false);
      setLastAutoSaveAt(new Date());

      if (!silent) {
        toast({
          title: "Patient Saved",
          description: "Patient information and selected tests have been saved",
        });
      }

      if (finalize) {
        resetForm();
      }

      return true;
    } catch (error: any) {
      const description = error?.message || "Failed to save patient information";
      if (!silent) {
        toast({
          title: "Error",
          description,
          variant: "destructive",
        });
      } else {
        throw error;
      }
      return false;
    }
  };

  const performAutoSave = async () => {
    if (!hasMounted.current || isResetting.current || isAutoSaving || !hasPendingChanges) {
      return;
    }

    if (!patientData.name.trim() || selectedTests.length === 0) {
      return;
    }

    setIsAutoSaving(true);
    clearAutoSaveTimer();

    try {
      await savePatientData({ silent: true });
    } catch {
      toast({
        title: "Auto-save failed",
        description: "Unable to save patient information automatically.",
        variant: "destructive",
      });
    } finally {
      setIsAutoSaving(false);
    }
  };

  const scheduleAutoSave = () => {
    if (!hasMounted.current || isResetting.current) {
      return;
    }

    setHasPendingChanges(true);
    clearAutoSaveTimer();
    autoSaveTimer.current = setTimeout(() => {
      performAutoSave();
    }, 800);
  };

  const addTest = (test: Test) => {
    setSelectedTests((prev) => {
      if (prev.find((t) => t.id === test.id)) {
        return prev;
      }

      const updated = [
        ...prev,
        {
          id: test.id,
          name: test.name,
          price: test.price || 0,
          unit: test.unit || "",
          normalRange: test.normalRange || "",
          testType: test.testType || "standard",
        },
      ];

      const newTotal = updated.reduce((sum, t) => sum + (t.price || 0), 0);
      setTotalCost(newTotal);
      scheduleAutoSave();
      return updated;
    });

    setTestSearchTerm("");
    setShowTestDropdown(false);
  };

  const removeTest = (testId: string) => {
    setSelectedTests((prev) => {
      const updated = prev.filter((t) => t.id !== testId);
      if (updated.length === prev.length) {
        return prev;
      }

      const newTotal = updated.reduce((sum, t) => sum + (t.price || 0), 0);
      setTotalCost(newTotal);
      scheduleAutoSave();
      return updated;
    });
  };

  const handlePatientChange = <K extends keyof typeof patientData>(field: K, value: string) => {
    setPatientData((prev) => ({ ...prev, [field]: value }));
    scheduleAutoSave();
  };

  const handleTotalCostChange = (value: number) => {
    setTotalCost(value);
    scheduleAutoSave();
  };

  const savePatient = async () => {
    await savePatientData({ finalize: true });
  };

  const isMutationPending =
    createPatientMutation.isPending ||
    updatePatientMutation.isPending ||
    createVisitMutation.isPending ||
    updateVisitMutation.isPending ||
    createTestResultMutation.isPending ||
    updateTestResultMutation.isPending ||
    deleteTestResultMutation.isPending;

  const autoSaveStatus = isAutoSaving
    ? "Auto-saving..."
    : isMutationPending
    ? "Saving..."
    : hasPendingChanges
    ? "Unsaved changes"
    : lastAutoSaveAt
    ? `Saved at ${lastAutoSaveAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "All changes saved";

  const isSaveButtonDisabled = isAutoSaving || isMutationPending;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
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
          title="Patient Registration"
          description="Register new patients and assign laboratory tests"
          actions={<span className="text-xs text-muted-foreground">{autoSaveStatus}</span>}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Patient Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter patient name"
                    value={patientData.name}
                    onChange={(e) => handlePatientChange("name", e.target.value)}
                    data-testid="input-patient-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter age"
                    value={patientData.age}
                    onChange={(e) => handlePatientChange("age", e.target.value)}
                    data-testid="input-patient-age"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={patientData.gender}
                    onValueChange={(value) => handlePatientChange("gender", value)}
                  >
                    <SelectTrigger id="gender" data-testid="select-gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number"
                    value={patientData.phone}
                    onChange={(e) => handlePatientChange("phone", e.target.value)}
                    data-testid="input-patient-phone"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="source">Organization/Source</Label>
                  <Input
                    id="source"
                    placeholder="Enter organization or referral source"
                    value={patientData.source}
                    onChange={(e) => handlePatientChange("source", e.target.value)}
                    data-testid="input-patient-source"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="test-search">Search and Add Test</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="test-search"
                    placeholder="Type test name to search..."
                    value={testSearchTerm}
                    onChange={(e) => {
                      setTestSearchTerm(e.target.value);
                      setShowTestDropdown(e.target.value.length > 0);
                    }}
                    onFocus={() => {
                      if (testSearchTerm.length > 0) {
                        setShowTestDropdown(true);
                      }
                    }}
                    className="pl-9"
                    data-testid="input-test-search"
                  />
                </div>
                
                {showTestDropdown && filteredTests.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
                    {filteredTests.map((test) => (
                      <button
                        key={test.id}
                        onClick={() => addTest(test)}
                        className="w-full px-4 py-3 text-left hover-elevate active-elevate-2 border-b border-border last:border-b-0 flex items-center justify-between"
                        data-testid={`test-option-${test.id}`}
                      >
                        <span className="font-medium text-foreground">{test.name}</span>
                        <span className="text-sm font-mono text-muted-foreground">${test.price || 0}</span>
                      </button>
                    ))}
                  </div>
                )}

                {showTestDropdown && testSearchTerm.length > 0 && filteredTests.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground">
                    No tests found matching "{testSearchTerm}"
                  </div>
                )}
              </div>

              {selectedTests.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Tests</Label>
                  <div className="space-y-2">
                    {selectedTests.map((test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                        data-testid={`selected-test-${test.id}`}
                      >
                        <span className="text-sm font-medium">{test.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono">${test.price}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeTest(test.id)}
                            data-testid={`button-remove-test-${test.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Label className="text-lg">Total Cost</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={totalCost}
                    onChange={(e) => handleTotalCostChange(parseFloat(e.target.value) || 0)}
                    className="w-32 text-right font-mono"
                    data-testid="input-total-cost"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={savePatient}
              className="gap-2"
              size="lg"
              data-testid="button-save-patient"
              disabled={isSaveButtonDisabled}
            >
              <Save className="h-4 w-4" />
              {isMutationPending ? "Saving..." : "Save Patient"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
