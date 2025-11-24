import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Trash2, Download, Upload, Moon, Sun, Plus, X, ArrowLeft, Pencil, Search, Beaker } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTheme } from "@/components/ThemeProvider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Setting, CustomPrintSection, Test } from "@shared/schema";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const { toast } = useToast();

  // Tests Management State
  const [testSearch, setTestSearch] = useState("");
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [testFormData, setTestFormData] = useState({
    name: "",
    price: 0,
    unit: "",
    normalRange: "",
    testType: "standard"
  });
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null);

  const [customPrintSections, setCustomPrintSections] = useState<CustomPrintSection[]>([]);

  const { data: settings } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  const { data: tests } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  useEffect(() => {
    if (settings) {
      const customSectionsSetting = settings.find((s) => s.key === "customPrintSections");
      if (customSectionsSetting) {
        try {
          setCustomPrintSections(JSON.parse(customSectionsSetting.value));
        } catch (e) {
          setCustomPrintSections([]);
        }
      }
    }
  }, [settings]);

  // Mutations
  const setSettingMutation = useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      apiRequest("POST", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const createTestMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setIsTestDialogOpen(false);
      resetTestForm();
      toast({ title: "Success", description: "Test created successfully" });
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: (data: { id: string; test: any }) =>
      apiRequest("PUT", `/api/tests/${data.id}`, data.test),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setIsTestDialogOpen(false);
      resetTestForm();
      toast({ title: "Success", description: "Test updated successfully" });
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tests/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setDeleteTestId(null);
      toast({ title: "Success", description: "Test deleted successfully" });
    },
  });

  const deleteAllDataMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/data", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Data Cleared",
        description: "All patient data and expenses cleared. Tests and print settings remain intact.",
      });
    },
  });

  const initializeDefaultTestsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tests/initialize-defaults", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      toast({
        title: "Tests Initialized",
        description: `Successfully added ${data.count} default tests.`,
      });
    },
  });

  // Test Management Functions
  const resetTestForm = () => {
    setEditingTest(null);
    setTestFormData({ name: "", price: 0, unit: "", normalRange: "", testType: "standard" });
  };

  const openAddTestDialog = () => {
    resetTestForm();
    setIsTestDialogOpen(true);
  };

  const openEditTestDialog = (test: Test) => {
    setEditingTest(test);
    setTestFormData({
      name: test.name,
      price: test.price || 0,
      unit: test.unit || "",
      normalRange: test.normalRange || "",
      testType: test.testType || "standard"
    });
    setIsTestDialogOpen(true);
  };

  const handleSaveTest = () => {
    if (!testFormData.name) {
      toast({ title: "Error", description: "Test name is required", variant: "destructive" });
      return;
    }

    if (editingTest) {
      updateTestMutation.mutate({ id: editingTest.id, test: testFormData });
    } else {
      createTestMutation.mutate(testFormData);
    }
  };

  // Filtered Tests
  const filteredTests = tests?.filter(test => 
    test.name.toLowerCase().includes(testSearch.toLowerCase())
  ) || [];

  // Print Section Functions
  const addPrintSection = () => {
    const newSection: CustomPrintSection = {
      id: `section-${Date.now()}`,
      text: "",
      position: "top",
      alignment: "center",
      textColor: "#000000",
      backgroundColor: "#ffffff",
      fontSize: 16,
    };
    setCustomPrintSections([...customPrintSections, newSection]);
  };

  const updatePrintSection = (id: string, field: keyof CustomPrintSection, value: string | number) => {
    setCustomPrintSections(
      customPrintSections.map((section) =>
        section.id === id ? { ...section, [field]: value } : section
      )
    );
  };

  const removePrintSection = (id: string) => {
    setCustomPrintSections(customPrintSections.filter((section) => section.id !== id));
  };

  const saveSettings = async () => {
    try {
      await setSettingMutation.mutateAsync({
        key: "customPrintSections",
        value: JSON.stringify(customPrintSections),
      });

      toast({
        title: "Settings Saved",
        description: "Print customization saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const deleteAllData = () => {
    deleteAllDataMutation.mutate();
    setDeleteDialog(false);
  };

  const exportData = () => {
    toast({ title: "Exporting Data", description: "Preparing data export..." });
  };

  const importData = () => {
    toast({ title: "Import Data", description: "Select a file to import" });
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/")} 
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <PageHeader
          title="Settings"
          description="Configure system preferences, tests, and print templates"
          actions={
            <Button onClick={saveSettings} className="gap-2">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          }
        />

        <Tabs defaultValue="tests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tests">Tests Management</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="print">Print Templates</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
          </TabsList>

          {/* --- TESTS MANAGEMENT TAB --- */}
          <TabsContent value="tests" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle>Laboratory Tests</CardTitle>
                  <CardDescription>Manage available tests, prices, and normal ranges</CardDescription>
                </div>
                <Button onClick={openAddTestDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Test
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tests..."
                      value={testSearch}
                      onChange={(e) => setTestSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total: {filteredTests.length} tests
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {filteredTests.map((test) => (
                    <div 
                      key={test.id} 
                      className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-md transition-all group"
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="font-semibold text-primary flex items-center gap-2">
                           <Beaker className="h-4 w-4 text-muted-foreground" />
                           {test.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Price: </span>
                          {test.price} IQD
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                           <span className="font-medium text-foreground">Range: </span>
                           {test.normalRange || "-"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                           <span className="font-medium text-foreground">Unit: </span>
                           {test.unit || "-"}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditTestDialog(test)}
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTestId(test.id)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredTests.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No tests found matching your search.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- GENERAL TAB --- */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the application theme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Theme Mode</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Switch between light and dark mode
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={toggleTheme}
                    className="gap-2"
                  >
                    {theme === "light" ? (
                      <>
                        <Moon className="h-5 w-5" />
                        Dark Mode
                      </>
                    ) : (
                      <>
                        <Sun className="h-5 w-5" />
                        Light Mode
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- PRINT TEMPLATES TAB --- */}
          <TabsContent value="print" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Print Customization</CardTitle>
                <CardDescription>
                  Add custom text sections to your printed documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {customPrintSections.map((section, index) => (
                  <Card key={section.id} className="border-muted">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Section {index + 1}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePrintSection(section.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Custom Text</Label>
                        <Textarea
                          value={section.text}
                          onChange={(e) => updatePrintSection(section.id, "text", e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Position</Label>
                          <Select
                            value={section.position}
                            onValueChange={(value) => updatePrintSection(section.id, "position", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top">Top</SelectItem>
                              <SelectItem value="bottom">Bottom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Alignment</Label>
                          <Select
                            value={section.alignment}
                            onValueChange={(value) => updatePrintSection(section.id, "alignment", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Font Size</Label>
                          <Input
                            type="number"
                            min="8"
                            max="72"
                            value={section.fontSize}
                            onChange={(e) => updatePrintSection(section.id, "fontSize", parseInt(e.target.value))}
                          />
                        </div>
                         <div className="space-y-2">
                          <Label>Text Color</Label>
                          <Input
                            type="color"
                            value={section.textColor}
                            onChange={(e) => updatePrintSection(section.id, "textColor", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Background Color</Label>
                          <Input
                            type="color"
                            value={section.backgroundColor}
                            onChange={(e) => updatePrintSection(section.id, "backgroundColor", e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button onClick={addPrintSection} variant="outline" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Section
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- DATA MANAGEMENT TAB --- */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Backup, restore, or clear system data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex gap-4">
                  <Button onClick={exportData} variant="outline" className="gap-2 flex-1">
                    <Download className="h-4 w-4" />
                    Export All Data
                  </Button>
                  <Button onClick={importData} variant="outline" className="gap-2 flex-1">
                    <Upload className="h-4 w-4" />
                    Import Data
                  </Button>
                </div>
                
                <div className="pt-6 border-t">
                  <Button
                    onClick={() => initializeDefaultTestsMutation.mutate()}
                    disabled={initializeDefaultTestsMutation.isPending}
                    variant="outline"
                    className="w-full mb-4"
                  >
                    Initialize Default Tests (Only if empty)
                  </Button>

                  <Button
                    onClick={() => setDeleteDialog(true)}
                    variant="destructive"
                    className="w-full gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All Patient Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Test Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTest ? "Edit Test" : "Add New Test"}</DialogTitle>
            <DialogDescription>
              Configure the test details, price, and normal ranges.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Test Name *</Label>
              <Input
                value={testFormData.name}
                onChange={(e) => setTestFormData({ ...testFormData, name: e.target.value })}
                placeholder="e.g. CBC, Glucose"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (IQD)</Label>
                <Input
                  type="number"
                  value={testFormData.price}
                  onChange={(e) => setTestFormData({ ...testFormData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={testFormData.unit}
                  onChange={(e) => setTestFormData({ ...testFormData, unit: e.target.value })}
                  placeholder="e.g. mg/dl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Normal Range</Label>
              <Input
                value={testFormData.normalRange}
                onChange={(e) => setTestFormData({ ...testFormData, normalRange: e.target.value })}
                placeholder="e.g. 70 - 110"
              />
            </div>
            <div className="space-y-2">
              <Label>Test Type</Label>
              <Select
                value={testFormData.testType}
                onValueChange={(value: "standard" | "urine") => setTestFormData({ ...testFormData, testType: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Test</SelectItem>
                  <SelectItem value="urine">Urine Analysis (Complex)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTest}>
              {editingTest ? "Update Test" : "Create Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTestId}
        onOpenChange={(open) => !open && setDeleteTestId(null)}
        title="Delete Test"
        description="Are you sure you want to delete this test? It will not affect existing patient results."
        onConfirm={() => deleteTestId && deleteTestMutation.mutate(deleteTestId)}
        variant="destructive"
      />

      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Clear All Patient Data"
        description="This will permanently delete all patients, visits, test results, and expenses. Tests catalog will NOT be deleted."
        onConfirm={deleteAllData}
        variant="destructive"
      />
    </div>
  );
}
