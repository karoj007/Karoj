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
    mutationFn: (data: any) => apiRequest("POST", "/api/tests/add-urine-test", {}), // Fixed call
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      toast({
        title: "Urine Test Added",
        description: "Urine Analysis test added successfully.",
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
    toast({ title: "Exporting Data", description: "Preparing data export..." });
  };

  const importData = () => {
    toast({ title: "Import Data", description: "Select a file to import" });
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
        <PageHeader
          title="Settings"
          description="Configure system preferences and customize print templates"
          actions={
            <Button onClick={saveSettings} className="gap-2">
              <Save className="h-4 w-4" /> Save Settings
            </Button>
          }
        />

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="print">Print Templates</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Customize theme</CardDescription></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div><Label className="text-base">Theme Mode</Label><p className="text-sm text-muted-foreground mt-1">Switch between light and dark mode</p></div>
                  <Button variant="outline" size="lg" onClick={toggleTheme} className="gap-2">
                    {theme === "light" ? <><Moon className="h-5 w-5" /> Dark Mode</> : <><Sun className="h-5 w-5" /> Light Mode</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="print" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Print Customization</CardTitle><CardDescription>Add custom text sections</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                {customPrintSections.map((section, index) => (
                  <Card key={section.id} className="border-muted">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Section {index + 1}</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => removePrintSection(section.id)} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2"><Label>Custom Text</Label><Textarea value={section.text} onChange={(e) => updatePrintSection(section.id, "text", e.target.value)} rows={2} /></div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Position</Label><Select value={section.position} onValueChange={(value) => updatePrintSection(section.id, "position", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="top">Top</SelectItem><SelectItem value="bottom">Bottom</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><Label>Alignment</Label><Select value={section.alignment} onValueChange={(value) => updatePrintSection(section.id, "alignment", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="center">Center</SelectItem><SelectItem value="left">Left</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><Label>Font Size</Label><Input type="number" min="8" max="72" value={section.fontSize} onChange={(e) => updatePrintSection(section.id, "fontSize", parseInt(e.target.value))} /></div>
                        <div className="space-y-2"><Label>Text Color</Label><Input type="color" value={section.textColor} onChange={(e) => updatePrintSection(section.id, "textColor", e.target.value)} /></div>
                        <div className="space-y-2"><Label>Background Color</Label><Input type="color" value={section.backgroundColor} onChange={(e) => updatePrintSection(section.id, "backgroundColor", e.target.value)} /></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button onClick={addPrintSection} variant="outline" className="w-full gap-2"><Plus className="h-4 w-4" /> Add Section</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
             {/* Data Management Content kept as is */}
             <Card>
              <CardHeader><CardTitle>Data Management</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button onClick={exportData} variant="outline" className="gap-2 flex-1"><Download className="h-4 w-4" /> Export</Button>
                  <Button onClick={importData} variant="outline" className="gap-2 flex-1"><Upload className="h-4 w-4" /> Import</Button>
                </div>
                <div className="pt-6 border-t space-y-4">
                   <Button onClick={() => addUrineTestMutation.mutate({})} disabled={addUrineTestMutation.isPending} variant="secondary" className="w-full">Add Urine Test (If missing)</Button>
                   <Button onClick={() => initializeDefaultTestsMutation.mutate()} disabled={initializeDefaultTestsMutation.isPending} variant="secondary" className="w-full">Initialize Default Tests</Button>
                   <Button onClick={() => setDeleteDialog(true)} variant="destructive" className="w-full gap-2"><Trash2 className="h-4 w-4" /> Clear All Patient Data</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog open={deleteDialog} onOpenChange={setDeleteDialog} title="Clear Data" description="Permanently delete all patient data?" onConfirm={deleteAllData} variant="destructive" />
    </div>
  );
}
