import { ChangeEvent, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { PageTransition } from "@/components/layout/PageTransition";
import { BackButton } from "@/components/BackButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { PrintCustomization } from "@/data/db";
import {
  deleteAllData,
  exportAllData,
  importAllData,
  readPrintCustomization,
  updatePrintCustomization,
} from "@/data/service";
import { ArrowLeft, Moon, Sun, Download, Trash2, Palette, Type } from "lucide-react";
import { useLocation } from "wouter";

const defaultCustomization: PrintCustomization = {
  text: "",
  position: "bottom",
  orientation: "horizontal",
  textColor: "#0f172a",
  backgroundColor: "#ffffff",
  fontSize: 14,
};

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [resultsCustomization, setResultsCustomization] = useState<PrintCustomization>(defaultCustomization);
  const [reportsCustomization, setReportsCustomization] = useState<PrintCustomization>(defaultCustomization);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const loadCustomizations = async () => {
      const [results, reports] = await Promise.all([
        readPrintCustomization("print.results"),
        readPrintCustomization("print.reports"),
      ]);
      setResultsCustomization(results);
      setReportsCustomization(reports);
    };
    loadCustomizations();
  }, []);

  const handleDeleteAll = async () => {
    await deleteAllData();
    toast({ title: "All data deleted", description: "The database has been reset." });
    setDeleteDialogOpen(false);
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lab-backup-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported", description: "A JSON backup has been downloaded." });
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      await importAllData(parsed);
      toast({ title: "Data imported", description: "The backup was restored successfully." });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "The selected file is not a valid backup.",
        variant: "destructive",
      });
    }
    event.target.value = "";
  };

  const handleCustomizationChange = (target: "results" | "reports", partial: Partial<PrintCustomization>) => {
    if (target === "results") {
      setResultsCustomization((prev) => ({ ...prev, ...partial }));
    } else {
      setReportsCustomization((prev) => ({ ...prev, ...partial }));
    }
  };

  useEffect(() => {
    updatePrintCustomization("print.results", resultsCustomization).catch(() => {
      toast({
        title: "Save failed",
        description: "Unable to save result customization.",
        variant: "destructive",
      });
    });
  }, [resultsCustomization]);

  useEffect(() => {
    updatePrintCustomization("print.reports", reportsCustomization).catch(() => {
      toast({
        title: "Save failed",
        description: "Unable to save report customization.",
        variant: "destructive",
      });
    });
  }, [reportsCustomization]);

  const toggleThemeMode = () => {
    toggleTheme();
    toast({
      title: "Theme updated",
      description: `Switched to ${theme === "light" ? "dark" : "light"} mode.`,
    });
  };

  const customizationControls = (target: "results" | "reports", state: PrintCustomization) => (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Custom text</Label>
        <Textarea
          value={state.text}
          onChange={(event) => handleCustomizationChange(target, { text: event.target.value })}
          placeholder="Add custom text to the print layout"
          rows={4}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Position</Label>
          <select
            value={state.position}
            onChange={(event) => handleCustomizationChange(target, { position: event.target.value as PrintCustomization["position"] })}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="side">Side</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Orientation</Label>
          <select
            value={state.orientation}
            onChange={(event) =>
              handleCustomizationChange(target, { orientation: event.target.value as PrintCustomization["orientation"] })
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Text color</Label>
          <Input type="color" value={state.textColor} onChange={(event) => handleCustomizationChange(target, { textColor: event.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>Background color</Label>
          <Input
            type="color"
            value={state.backgroundColor}
            onChange={(event) => handleCustomizationChange(target, { backgroundColor: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Font size</Label>
          <Input
            type="number"
            min={10}
            max={48}
            value={state.fontSize}
            onChange={(event) => handleCustomizationChange(target, { fontSize: Number(event.target.value) })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setLocation("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-semibold text-foreground">Settings & Tools</h1>
                <p className="text-sm text-muted-foreground">Manage theme preferences, data lifecycle, and print branding.</p>
              </div>
            </div>
            <BackButton />
          </header>

          <div className="grid gap-6">
            <Card className="border border-border/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Appearance
                </CardTitle>
                <CardDescription>Toggle between light and dark modes for the entire application.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">Current theme: {theme === "light" ? "Light" : "Dark"}</p>
                  <p className="text-sm text-muted-foreground">
                    {theme === "light"
                      ? "Enjoy a crisp, high-contrast interface for bright environments."
                      : "Experience a low-glare interface optimized for dark rooms."}
                  </p>
                </div>
                <Button variant="outline" className="gap-2" onClick={toggleThemeMode}>
                  {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  Toggle theme
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-primary" />
                  Results print customization
                </CardTitle>
                <CardDescription>Tailor the footer or side notes that appear on result printouts and PDFs.</CardDescription>
              </CardHeader>
              <CardContent>{customizationControls("results", resultsCustomization)}</CardContent>
            </Card>

            <Card className="border border-border/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-primary" />
                  Reports print customization
                </CardTitle>
                <CardDescription>Adjust branding and legal disclaimers for financial reports.</CardDescription>
              </CardHeader>
              <CardContent>{customizationControls("reports", reportsCustomization)}</CardContent>
            </Card>

            <Card className="border border-border/60 shadow-lg">
              <CardHeader>
                <CardTitle>Data management</CardTitle>
                <CardDescription>Export backups, import previous data, or clear the database.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Export data</p>
                    <p className="text-sm text-muted-foreground">Download a JSON backup of all laboratory data.</p>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={handleExport}>
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
                <Separator />
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Import data</p>
                    <p className="text-sm text-muted-foreground">Restore a previously exported backup file.</p>
                  </div>
                  <div>
                    <Input type="file" accept="application/json" onChange={handleImport} />
                  </div>
                </div>
                <Separator />
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-destructive">Delete all data</p>
                    <p className="text-sm text-muted-foreground">This action is irreversible. All tests, patients, results, and expenses will be removed.</p>
                  </div>
                  <Button variant="destructive" className="gap-2" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                    Delete everything
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete all data?"
        description="All stored patients, tests, results, reports, and expenses will be permanently removed. This action cannot be undone."
        onConfirm={handleDeleteAll}
        variant="destructive"
      />
    </PageTransition>
  );
}
