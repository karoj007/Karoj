import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useLiveQuery } from "dexie-react-hooks";
import GridLayout, { type Layout } from "react-grid-layout";
import { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Beaker, TestTube, Users, FileText, BarChart3, Settings2, PenSquare, Lock, Unlock, LogOut, Moon, Sun, Sparkles, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/layout/PageTransition";
import { BackButton } from "@/components/BackButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { db, type DashboardWidgetRecord } from "@/data/db";
import { recolorSection, renameSection, persistLayout } from "@/data/service";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/utils/number";
import { todayKey } from "@/utils/date";

const AutoGridLayout = WidthProvider(GridLayout);

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  tests: TestTube,
  patients: Users,
  results: FileText,
  reports: BarChart3,
  settings: Settings2,
};

const COLOR_PRESETS = [
  { label: "Azure Glow", value: "from-sky-500/20 via-sky-500/10 to-sky-500/5" },
  { label: "Emerald Mist", value: "from-emerald-500/20 via-emerald-500/10 to-emerald-500/5" },
  { label: "Violet Aura", value: "from-violet-500/25 via-violet-500/10 to-indigo-500/5" },
  { label: "Amber Sunrise", value: "from-amber-500/25 via-orange-500/10 to-amber-500/5" },
  { label: "Rose Bloom", value: "from-rose-500/25 via-rose-500/10 to-rose-500/5" },
  { label: "Slate Frost", value: "from-slate-500/25 via-slate-500/10 to-slate-500/5" },
];

interface EditState {
  section: DashboardWidgetRecord;
  displayName: string;
  color: string;
}

export default function Dashboard() {
  const layouts = useLiveQuery(() => db.layouts.toArray(), []);
  const testsCount = useLiveQuery(() => db.tests.count(), []);
  const today = todayKey();
  const patientsToday = useLiveQuery(() => db.patients.where("date").equals(today).count(), [today]);
  const revenueToday = useLiveQuery(async () => {
    const records = await db.patients.where("date").equals(today).toArray();
    if (!records.length) return 0;

    let total = 0;
    for (const record of records) {
      if (typeof record.total === "number") {
        total += record.total;
      } else {
        const tests = await db.patientTests.where("patientId").equals(record.id).toArray();
        total += tests.reduce((sum, item) => sum + (item.price ?? 0), 0);
      }
    }
    return total;
  }, [today]);

  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { toast } = useToast();

  const [isLocked, setIsLocked] = useState(true);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const gridLayouts: Layout[] = useMemo(() => {
    if (!layouts) return [];
    return layouts.map((item) => ({
      i: item.sectionName,
      x: item.positionX,
      y: item.positionY,
      w: item.width,
      h: item.height,
      minW: 3,
      minH: 3,
    }));
  }, [layouts]);

  const handleLayoutCommit = async (nextLayout: Layout[]) => {
    const transactions = nextLayout.map((item) =>
      persistLayout(item.i, {
        positionX: item.x,
        positionY: item.y,
        width: item.w,
        height: item.h,
      }),
    );
    await Promise.all(transactions);
    toast({
      title: "Layout updated",
      description: "Your dashboard arrangement has been auto-saved.",
    });
  };

  const handleCustomize = (section: DashboardWidgetRecord) => {
    setEditState({
      section,
      displayName: section.displayName,
      color: section.color,
    });
  };

  const handleConfirmSave = async () => {
    if (!editState) return;
    await Promise.all([
      renameSection(editState.section.sectionName, editState.displayName),
      recolorSection(editState.section.sectionName, editState.color),
    ]);
    toast({
      title: "Widget updated",
      description: `${editState.displayName} now reflects your customization.`,
    });
    setEditState(null);
    setConfirmOpen(false);
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Session closed",
      description: "You have safely logged out of the laboratory workspace.",
    });
  };

  if (!layouts) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-primary/10">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary animate-spin rounded-full mb-6" />
          <p className="text-muted-foreground text-lg">Loading your intelligent dashboard…</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
        <header className="sticky top-0 z-30 border-b border-border/60 backdrop-blur bg-background/80">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/20">
                <Beaker className="h-6 w-6 text-primary drop-shadow" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">KAROZH Laboratory</p>
                <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  Intelligent Control Center
                  <Sparkles className="h-5 w-5 text-primary" />
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BackButton />
              <Button variant="outline" size="icon" onClick={() => setIsLocked((prev) => !prev)} title={isLocked ? "Unlock layout editor" : "Lock layout"}>
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={toggleTheme} title="Toggle theme">
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={handleLogout} title="Log out securely">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="border-none shadow-lg bg-gradient-to-br from-primary/15 via-primary/5 to-background">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Tests</CardTitle>
                <TestTube className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">{testsCount ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-2">Ready-to-use laboratory procedures</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-400/10 via-emerald-300/5 to-background">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Patients Today</CardTitle>
                <Users className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">{patientsToday ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-2">Registered on {today}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg bg-gradient-to-br from-amber-400/10 via-amber-300/5 to-background">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Today</CardTitle>
                <BarChart3 className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">{formatCurrency(revenueToday ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-2">Reflects saved and auto-synced totals</p>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                  Modular Dashboard
                  <Badge variant="outline" className="gap-1">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    drag &amp; drop
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Move, resize, rename, and recolor each workspace module. Changes are auto-saved instantly.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-border/60 bg-background/80">
                  <PenSquare className="h-3 w-3" />
                  unlock to edit widgets
                </span>
              </div>
            </div>

            <AutoGridLayout
              className="layout"
              layout={gridLayouts}
              cols={12}
              rowHeight={90}
              margin={[16, 16]}
              isDraggable={!isLocked}
              isResizable={!isLocked}
              onDragStop={handleLayoutCommit}
              onResizeStop={handleLayoutCommit}
              draggableCancel=".prevent-drag"
              compactType={null}
              preventCollision
            >
              {layouts.map((section) => {
                const Icon = iconMap[section.sectionName] ?? Settings2;
                return (
                  <div key={section.sectionName}>
                    <Card className="h-full relative overflow-hidden shadow-lg border-none">
                      <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${section.color} opacity-80`} />
                      <CardContent className="h-full flex flex-col p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-background/40 border border-white/10 flex items-center justify-center shadow-inner">
                              <Icon className="h-6 w-6 text-foreground" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{section.displayName}</h3>
                              <p className="text-xs text-muted-foreground">Route: {section.route}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setLocation(section.route)} className="prevent-drag">
                              Open
                            </Button>
                            {!isLocked && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleCustomize(section)}
                                className="prevent-drag"
                                title="Customize widget"
                              >
                                <PenSquare className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>
                        <Separator className="my-4 border-border/70" />
                        <div className="mt-auto text-xs text-muted-foreground">
                          <p>Widget coordinates: {section.positionX}, {section.positionY}</p>
                          <p>Size: {section.width} × {section.height}</p>
                          <p>Auto-save: active</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </AutoGridLayout>
          </section>
        </main>

        <Dialog open={!!editState} onOpenChange={(open) => (open ? null : setEditState(null))}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Customize widget</DialogTitle>
              <DialogDescription>
                Rename and recolor this dashboard module. Confirm to save the update to the local database.
              </DialogDescription>
            </DialogHeader>
            {editState && (
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={editState.displayName}
                    onChange={(event) =>
                      setEditState((prev) => (prev ? { ...prev, displayName: event.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color finish</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() =>
                          setEditState((prev) => (prev ? { ...prev, color: preset.value } : prev))
                        }
                        className={`rounded-xl border px-3 py-3 text-left transition hover:scale-[1.01] ${
                          editState.color === preset.value ? "border-primary bg-primary/10" : "border-border bg-background"
                        }`}
                      >
                        <div className={`h-10 rounded-lg bg-gradient-to-r ${preset.value} mb-3`} />
                        <p className="text-sm font-medium text-foreground">{preset.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setEditState(null)}>
                Cancel
              </Button>
              <Button disabled={!editState?.displayName.trim()} onClick={() => setConfirmOpen(true)}>
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Apply customization?"
          description="This update will be written to the local database immediately. Do you want to continue?"
          onConfirm={handleConfirmSave}
        />
      </div>
    </PageTransition>
  );
}
