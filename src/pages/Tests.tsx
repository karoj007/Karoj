import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Save, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Test } from "@shared/schema";
import { useLocation } from "wouter";

interface TestRow {
  id: string;
  name: string;
  unit: string;
  normalRange: string;
  price: string;
  isNew?: boolean;
}

export default function Tests() {
  const [, setLocation] = useLocation();
  const [tests, setTests] = useState<TestRow[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({
    open: false,
    id: "",
  });
  const { toast } = useToast();
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const hasMounted = useRef(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState<Date | null>(null);

  const { data: testsData, isLoading } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const createTestMutation = useMutation({
    mutationFn: (data: { name: string; unit?: string; normalRange?: string; price?: number }) =>
      apiRequest("POST", "/api/tests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Test> }) =>
      apiRequest("PUT", `/api/tests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tests/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
    },
  });

  useEffect(() => {
    if (testsData) {
      setTests(
        testsData.map((t) => ({
          id: t.id,
          name: t.name,
          unit: t.unit || "",
          normalRange: t.normalRange || "",
          price: t.price?.toString() || "",
          isNew: false,
        }))
      );
      hasMounted.current = true;
    }
  }, [testsData]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  const clearAutoSaveTimer = () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
  };

  const addTest = () => {
    setTests([...tests, { id: `new-${Date.now()}`, name: "", unit: "", normalRange: "", price: "", isNew: true }]);
    scheduleAutoSave();
  };

  const updateTest = (id: string, field: keyof TestRow, value: string) => {
    setTests(tests.map((test) => (test.id === id ? { ...test, [field]: value } : test)));
    scheduleAutoSave();
  };

  const deleteTest = async (id: string) => {
    if (id.startsWith("new-")) {
      setTests(tests.filter((test) => test.id !== id));
    } else {
      await deleteTestMutation.mutateAsync(id);
      toast({
        title: "Test Deleted",
        description: "The test has been removed from the list",
      });
    }
    setDeleteDialog({ open: false, id: "" });
  };

  const saveTests = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!hasMounted.current) {
      return;
    }
    clearAutoSaveTimer();

    for (const test of tests) {
      if (!test.name.trim()) continue;

      const data = {
        name: test.name,
        unit: test.unit || undefined,
        normalRange: test.normalRange || undefined,
        price: test.price ? parseFloat(test.price) : undefined,
      };

      if (test.isNew || test.id.startsWith("new-")) {
        await createTestMutation.mutateAsync(data);
      } else {
        await updateTestMutation.mutateAsync({ id: test.id, data });
      }
    }

    setHasPendingChanges(false);
    setLastAutoSaveAt(new Date());

    if (!silent) {
      toast({
        title: "Tests Saved",
        description: "All test information has been saved successfully.",
      });
    }
  };

  const performAutoSave = async () => {
    if (!hasMounted.current || !hasPendingChanges) {
      return;
    }
    setIsAutoSaving(true);
    clearAutoSaveTimer();
    try {
      await saveTests({ silent: true });
    } catch (error) {
      toast({
        title: "Auto-save failed",
        description: "Unable to save the latest changes automatically.",
        variant: "destructive",
      });
    } finally {
      setIsAutoSaving(false);
    }
  };

  const scheduleAutoSave = () => {
    if (!hasMounted.current) return;
    setHasPendingChanges(true);
    clearAutoSaveTimer();
    autoSaveTimer.current = setTimeout(() => {
      performAutoSave();
    }, 800);
  };

  const autoSaveStatus = isAutoSaving
    ? "Auto-saving..."
    : hasPendingChanges
    ? "Unsaved changes"
    : lastAutoSaveAt
    ? `Saved at ${lastAutoSaveAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "All changes saved";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/")} 
              className="gap-2"
              data-testid="button-back-loading"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <PageHeader title="Tests & Prices" description="Loading..." />
          <Card className="p-12">
            <div className="text-center text-muted-foreground">Loading tests...</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
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
          title="Tests & Prices"
          description="Manage laboratory tests, units, normal ranges, and pricing"
            actions={
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{autoSaveStatus}</span>
                <Button onClick={addTest} variant="outline" className="gap-2" data-testid="button-add-test">
                  <Plus className="h-4 w-4" />
                  Add Test
                </Button>
                <Button onClick={() => saveTests()} className="gap-2" data-testid="button-save-tests">
                  <Save className="h-4 w-4" />
                  Save All
                </Button>
              </div>
            }
        />

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Test Name</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Unit</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Normal Range</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Price</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tests.map((test, index) => (
                  <tr key={test.id} className="hover-elevate" data-testid={`row-test-${index}`}>
                    <td className="p-4">
                      <Input
                        placeholder="Enter test name"
                        value={test.name}
                        onChange={(e) => updateTest(test.id, "name", e.target.value)}
                        data-testid={`input-test-name-${index}`}
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        placeholder="e.g., mg/dL"
                        value={test.unit}
                        onChange={(e) => updateTest(test.id, "unit", e.target.value)}
                        data-testid={`input-test-unit-${index}`}
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        placeholder="e.g., 70-100"
                        value={test.normalRange}
                        onChange={(e) => updateTest(test.id, "normalRange", e.target.value)}
                        data-testid={`input-test-range-${index}`}
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={test.price}
                        onChange={(e) => updateTest(test.id, "price", e.target.value)}
                        data-testid={`input-test-price-${index}`}
                      />
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDialog({ open: true, id: test.id })}
                        data-testid={`button-delete-test-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {tests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tests added yet. Click "Add Test" to get started.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: "" })}
        title="Delete Test"
        description="Are you sure you want to delete this test? This action cannot be undone."
        onConfirm={() => deleteTest(deleteDialog.id)}
        variant="destructive"
      />
    </div>
  );
}
