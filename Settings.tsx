import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Trash2, Download, Upload, Moon, Sun, Plus, X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTheme } from "@/components/ThemeProvider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Setting, CustomPrintSection } from "@shared/schema";
import { useLocation } from "wouter";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const { toast } = useToast();

  const [customPrintSections, setCustomPrintSections] = useState<CustomPrintSection[]>([]);

  const { data: settings } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
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

  const setSettingMutation = useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      apiRequest("POST", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
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
        description: `Successfully added ${data.count} default tests to the database.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Initialization Failed",
        description: error.message || "Tests may already exist in the database.",
        variant: "destructive",
      });
    },
  });

  const addUrineTestMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tests/add-urine-test", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      toast({
        title: "Urine Test Added",
        description: "Urine Analysis test with custom interface has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Urine Test",
        description: error.message || "Urine test may already exist in the database.",
        variant: "destructive",
      });
    },
  });

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
    toast({
      title: "Exporting Data",
      description: "Preparing data export...",
    });
  };

  const importData = () => {
    toast({
      title: "Import Data",
      description: "Select a file to import",
    });
  };

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
          title="Settings"
          description="Configure system preferences and customize print templates"
          actions={
            <Button onClick={saveSettings} className="gap-2" data-testid="button-save-settings">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          }
        />

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="print" data-testid="tab-print">Print Templates</TabsTrigger>
            <TabsTrigger value="data" data-testid="tab-data">Data Management</TabsTrigger>
          </TabsList>

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
                    data-testid="button-toggle-theme"
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

          <TabsContent value="print" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Print Customization</CardTitle>
                <CardDescription>
                  Add custom text sections to your printed documents (top or bottom)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {customPrintSections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-4">No custom sections added yet</p>
                    <p className="text-sm">Click "Add Section" to start customizing your printouts</p>
                  </div>
                ) : (
                  <div className="space-y-6">
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
                              data-testid={`button-remove-section-${section.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Custom Text</Label>
                            <Textarea
                              placeholder="Enter your custom text..."
                              value={section.text}
                              onChange={(e) => updatePrintSection(section.id, "text", e.target.value)}
                              rows={2}
                              data-testid={`textarea-section-text-${section.id}`}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Position</Label>
                              <Select
                                value={section.position}
                                onValueChange={(value) => updatePrintSection(section.id, "position", value)}
                              >
                                <SelectTrigger data-testid={`select-position-${section.id}`}>
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
                                <SelectTrigger data-testid={`select-alignment-${section.id}`}>
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
                              <Label>Font Size (8-72)</Label>
                              <Input
                                type="number"
                                min="8"
                                max="72"
                                placeholder="16"
                                value={section.fontSize ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') {
                                    updatePrintSection(section.id, "fontSize", '' as any);
                                  } else {
                                    const num = parseInt(val);
                                    if (!isNaN(num)) {
                                      updatePrintSection(section.id, "fontSize", num);
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || val === null || val === undefined) {
                                    updatePrintSection(section.id, "fontSize", 16);
                                  } else {
                                    const num = parseInt(val);
                                    if (isNaN(num) || num < 8) {
                                      updatePrintSection(section.id, "fontSize", 8);
                                    } else if (num > 72) {
                                      updatePrintSection(section.id, "fontSize", 72);
                                    }
                                  }
                                }}
                                data-testid={`input-font-size-${section.id}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Text Color</Label>
                              <Input
                                type="color"
                                value={section.textColor}
                                onChange={(e) => updatePrintSection(section.id, "textColor", e.target.value)}
                                data-testid={`input-text-color-${section.id}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Background Color</Label>
                              <Input
                                type="color"
                                value={section.backgroundColor}
                                onChange={(e) => updatePrintSection(section.id, "backgroundColor", e.target.value)}
                                data-testid={`input-bg-color-${section.id}`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <Button
                  onClick={addPrintSection}
                  variant="outline"
                  className="w-full gap-2"
                  data-testid="button-add-section"
                >
                  <Plus className="h-4 w-4" />
                  Add Section
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Export & Import</CardTitle>
                <CardDescription>Backup and restore your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={exportData} variant="outline" className="gap-2 flex-1" data-testid="button-export-data">
                    <Download className="h-4 w-4" />
                    Export All Data
                  </Button>
                  <Button onClick={importData} variant="outline" className="gap-2 flex-1" data-testid="button-import-data">
                    <Upload className="h-4 w-4" />
                    Import Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/50">
              <CardHeader>
                <CardTitle className="text-emerald-600 dark:text-emerald-400">Add Urine Analysis Test</CardTitle>
                <CardDescription>
                  Add only the Urine test without affecting existing tests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="font-medium text-foreground mb-2">Safe to use with existing tests</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      This adds only the Urine Analysis test with custom multi-section interface, 
                      without modifying your existing tests, prices, or normal ranges.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Features:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Custom interface with 3 sections (Physical, Chemical, Microscopical)</li>
                      <li>• 18 parameters with default values</li>
                      <li>• Price: 4</li>
                      <li>• Perfect for syncing production with development</li>
                    </ul>
                  </div>
                </div>
                <Button
                  onClick={() => addUrineTestMutation.mutate()}
                  disabled={addUrineTestMutation.isPending}
                  className="gap-2 w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                  data-testid="button-add-urine-test"
                >
                  <Plus className="h-4 w-4" />
                  {addUrineTestMutation.isPending ? "Adding Urine Test..." : "Add Urine Analysis Test"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="text-primary">Initialize Default Tests</CardTitle>
                <CardDescription>
                  Add 68 medical tests to the database (including Urine Analysis)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="font-medium text-foreground mb-2">This will add the following tests:</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      68 medical laboratory tests including blood tests (CBC, Glucose, BUN, Creatinine), 
                      lipid panel (Cholesterol, Triglycerides), liver function tests (AST, ALT, ALP), 
                      hormones (TSH, T3, T4, FSH, LH, Testosterone), vitamins (Vitamin D, B12, Iron, Ferritin), 
                      infectious disease tests (HBsAg, Anti-HCV, HIV, VDRL), pregnancy tests (PT Urine, PT Serum), 
                      and comprehensive Urine Analysis with custom multi-section interface (Physical, Chemical, Microscopical examinations).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">Note:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Only works if no tests exist in database</li>
                      <li>• Perfect for first-time setup or after clearing all tests</li>
                      <li>• All tests come with units, normal ranges, and prices</li>
                      <li>• Urine test includes 18 parameters with default values</li>
                    </ul>
                  </div>
                </div>
                <Button
                  onClick={() => initializeDefaultTestsMutation.mutate()}
                  disabled={initializeDefaultTestsMutation.isPending}
                  className="gap-2 w-full"
                  data-testid="button-initialize-tests"
                >
                  <Plus className="h-4 w-4" />
                  {initializeDefaultTestsMutation.isPending ? "Adding Tests..." : "Add 68 Default Tests (Including Urine Analysis)"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions - proceed with caution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="font-medium text-foreground mb-2">Clear Patient Data</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Delete all patient records, visits, test results, and expenses.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">What will be deleted:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• All patients</li>
                      <li>• All visits</li>
                      <li>• All test results</li>
                      <li>• All expenses</li>
                    </ul>
                    <p className="text-sm font-medium text-primary mt-2">What will be kept:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Tests catalog and prices</li>
                      <li>• Print customization</li>
                    </ul>
                  </div>
                </div>
                <Button
                  onClick={() => setDeleteDialog(true)}
                  variant="destructive"
                  className="gap-2 w-full"
                  data-testid="button-delete-all"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Patient Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Clear All Patient Data"
        description="This will permanently delete all patients, visits, test results, and expenses. Tests catalog and print settings will NOT be deleted. This action cannot be undone."
        onConfirm={deleteAllData}
        variant="destructive"
      />
    </div>
  );
}
