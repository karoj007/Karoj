import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, LayoutList, Rows, Save, Trash2, Search, GripVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { BackButton } from "@/components/BackButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { db } from "@/data/db";
import { createTest, deleteTest, updateTest } from "@/data/service";
import { formatCurrency, parseCurrencyInput } from "@/utils/number";

type Orientation = "vertical" | "horizontal";

interface PendingDeleteState {
  id: string | null;
  open: boolean;
}

export default function Tests() {
  const tests = useLiveQuery(() => db.tests.toArray(), [], []) ?? [];
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState>({ id: null, open: false });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const filteredTests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return tests;
    }
    return tests.filter((test) =>
      [test.name, test.unit, test.normalRange]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [tests, search]);

  const handleAddTest = async (direction: Orientation) => {
    setOrientation(direction);
    await createTest();
    toast({
      title: "New test added",
      description: "A blank test row has been created and auto-saved.",
    });
  };

  const handleUpdate = async (
    id: string,
    field: "name" | "unit" | "normalRange" | "price",
    value: string,
  ) => {
    if (field === "price") {
      const parsed = parseCurrencyInput(value);
      await updateTest(id, { price: parsed ?? 0 });
      return;
    }
    await updateTest(id, { [field]: value });
  };

  const requestDelete = (id: string) => setPendingDelete({ id, open: true });

  const confirmDelete = async () => {
    if (!pendingDelete.id) return;
    await deleteTest(pendingDelete.id);
    toast({
      title: "Test deleted",
      description: "The selected test has been removed from the catalog.",
    });
    setPendingDelete({ id: null, open: false });
  };

  const acknowledgeSave = () => {
    toast({
      title: "Catalog saved",
      description: "All changes are already stored in the local database.",
    });
    setSaveDialogOpen(false);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setLocation("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-semibold text-foreground">Tests & Prices</h1>
                <p className="text-sm text-muted-foreground">
                  Maintain every laboratory test with instant persistence and global syncing.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BackButton />
              <Button variant="secondary" className="gap-2" onClick={() => setSaveDialogOpen(true)}>
                <Save className="h-4 w-4" />
                Save changes
              </Button>
            </div>
          </header>

          <Card className="shadow-lg border border-border/60">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Interactive test catalog
                  <Badge variant="outline" className="bg-primary/5 text-primary">
                    auto-save active
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Add unlimited rows vertically or horizontally, edit details, and keep patients and results in sync.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="gap-2" onClick={() => handleAddTest("vertical")}>
                  <Rows className="h-4 w-4" />
                  Add vertical row
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => handleAddTest("horizontal")}>
                  <LayoutList className="h-4 w-4" />
                  Add horizontal row
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search tests</Label>
                  <div className="relative mt-1">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name, unit, or normal range"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Orientation</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <Button
                      variant={orientation === "vertical" ? "default" : "outline"}
                      onClick={() => setOrientation("vertical")}
                    >
                      Vertical
                    </Button>
                    <Button
                      variant={orientation === "horizontal" ? "default" : "outline"}
                      onClick={() => setOrientation("horizontal")}
                    >
                      Horizontal
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-xs text-muted-foreground">
                    Total tests: <span className="font-medium text-foreground">{filteredTests.length}</span>
                  </p>
                </div>
              </div>

              <div
                className={
                  orientation === "vertical"
                    ? "space-y-4"
                    : "grid gap-4 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr"
                }
              >
                {filteredTests.length === 0 && (
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                    No tests found. Use the add buttons above to create new rows.
                  </div>
                )}

                {filteredTests.map((test) => (
                  <Card
                    key={test.id}
                    className="border border-border/60 shadow-sm hover:shadow-lg transition relative overflow-hidden"
                  >
                    <div className="absolute left-3 top-3 text-muted-foreground/60">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <CardContent className="pt-6">
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label className="text-xs text-muted-foreground">Test name</Label>
                          <Input
                            value={test.name ?? ""}
                            onChange={(event) => handleUpdate(test.id, "name", event.target.value)}
                            placeholder="Enter test name"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground">Unit</Label>
                            <Input
                              value={test.unit ?? ""}
                              onChange={(event) => handleUpdate(test.id, "unit", event.target.value)}
                              placeholder="e.g. g/dL"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground">Normal range</Label>
                            <Input
                              value={test.normalRange ?? ""}
                              onChange={(event) => handleUpdate(test.id, "normalRange", event.target.value)}
                              placeholder="e.g. 4.0 – 5.6"
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs text-muted-foreground">Price</Label>
                          <Input
                            value={test.price !== undefined ? String(test.price) : ""}
                            onChange={(event) => handleUpdate(test.id, "price", event.target.value)}
                            placeholder="0.00"
                          />
                          <p className="text-xs text-muted-foreground">
                            Displayed to patients and used for automatic cost calculations ({formatCurrency(test.price ?? 0)}).
                          </p>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => requestDelete(test.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete.open}
        onOpenChange={(open) => setPendingDelete((prev) => ({ ...prev, open }))}
        title="Delete test?"
        description="This test will no longer appear in patient selections or result templates. This action cannot be undone."
        onConfirm={confirmDelete}
        variant="destructive"
      />

      <ConfirmDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="Save all tests?"
        description="Auto-save already keeps your records current. Select confirm to acknowledge."
        onConfirm={acknowledgeSave}
      />
    </PageTransition>
  );
}
