import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
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
  const { toast } = useToast();

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

  const addTest = (test: Test) => {
    if (!selectedTests.find((t) => t.id === test.id)) {
      const newTests = [...selectedTests, { 
        id: test.id, 
        name: test.name, 
        price: test.price || 0,
        unit: test.unit || "",
        normalRange: test.normalRange || "",
        testType: test.testType || "standard"
      }];
      setSelectedTests(newTests);
      const newTotal = newTests.reduce((sum, t) => sum + t.price, 0);
      setTotalCost(newTotal);
      setTestSearchTerm("");
      setShowTestDropdown(false);
    }
  };

  const removeTest = (testId: string) => {
    const newTests = selectedTests.filter((t) => t.id !== testId);
    setSelectedTests(newTests);
    const newTotal = newTests.reduce((sum, t) => sum + t.price, 0);
    setTotalCost(newTotal);
  };

  const savePatient = async () => {
    if (!patientData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Patient name is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedTests.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one test",
        variant: "destructive",
      });
      return;
    }

    try {
      const patientResponse = await createPatientMutation.mutateAsync({
        name: patientData.name,
        age: patientData.age ? parseInt(patientData.age) : undefined,
        gender: patientData.gender || undefined,
        phone: patientData.phone || undefined,
        source: patientData.source || undefined,
      });
      const patient: Patient = await (patientResponse as Response).json();

      const visitData = {
        patientId: patient.id,
        patientName: patient.name,
        visitDate: new Date().toISOString().split("T")[0],
        totalCost: Number(totalCost),
        testIds: selectedTests.map((t) => t.id),
      };

      console.log("Creating visit with data:", visitData);

      const visitResponse = await createVisitMutation.mutateAsync(visitData);
      const visit: Visit = await (visitResponse as Response).json();

      for (const test of selectedTests) {
        const testResultData: any = {
          visitId: visit.id,
          testId: test.id,
          testName: test.name,
          price: test.price,
          unit: test.unit,
          normalRange: test.normalRange,
          testType: test.testType || "standard",
        };

        // Add default urine data for urine tests
        if (test.testType === "urine") {
          testResultData.urineData = {
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
          };
        }

        await createTestResultMutation.mutateAsync(testResultData);
      }

      toast({
        title: "Patient Saved",
        description: "Patient information and selected tests have been saved",
      });

      setPatientData({ name: "", age: "", gender: "", phone: "", source: "" });
      setSelectedTests([]);
      setTotalCost(0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save patient information",
        variant: "destructive",
      });
    }
  };

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
                    onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
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
                    onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                    data-testid="input-patient-age"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={patientData.gender}
                    onValueChange={(value) => setPatientData({ ...patientData, gender: value })}
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
                    onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                    data-testid="input-patient-phone"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="source">Organization/Source</Label>
                  <Input
                    id="source"
                    placeholder="Enter organization or referral source"
                    value={patientData.source}
                    onChange={(e) => setPatientData({ ...patientData, source: e.target.value })}
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
                    onChange={(e) => setTotalCost(parseFloat(e.target.value) || 0)}
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
              disabled={createPatientMutation.isPending || createVisitMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {createPatientMutation.isPending || createVisitMutation.isPending ? "Saving..." : "Save Patient"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
