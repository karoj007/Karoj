import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { TestTube, Users, FileText, BarChart3, Settings, Moon, Sun, Lock, Unlock, Edit2, Save, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { DashboardLayout } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const iconMap = {
  tests: TestTube,
  patients: Users,
  results: FileText,
  reports: BarChart3,
  settings: Settings,
  accounts: ShieldCheck, // الاضافة الوحيدة في الايقونات
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [isLocked, setIsLocked] = useState(true);
  const [editingSection, setEditingSection] = useState<DashboardLayout | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", color: "" });
  const [localLayouts, setLocalLayouts] = useState<DashboardLayout[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 1. جلب المستخدم
  useEffect(() => {
    fetch("/api/session").then(res => res.json()).then(data => {
      if (data.authenticated) setCurrentUser(data.user);
    });
  }, []);

  const { data: layouts, isLoading } = useQuery<DashboardLayout[]>({
    queryKey: ["/api/dashboard-layouts"],
  });

  useEffect(() => {
    if (layouts) {
      setLocalLayouts(layouts);
    }
  }, [layouts]);

  // 2. دالة الفلترة
  const shouldShowWidget = (sectionName: string) => {
    if (!currentUser) return false;
    let perms = currentUser.permissions;
    if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch (e) {} }
    if (!perms) return true;

    switch (sectionName) {
      case 'tests': return perms.tests?.access;
      case 'patients': return perms.patients?.view;
      case 'results': return perms.results?.view;
      case 'reports': return perms.reports?.view;
      case 'settings': return perms.settings?.access;
      case 'accounts': return perms.accounts?.access;
      default: return true;
    }
  };

  // 3. تطبيق الفلترة
  const visibleLayouts = localLayouts.filter(layout => shouldShowWidget(layout.sectionName));

  const gridLayout = visibleLayouts.map(layout => ({
    i: layout.sectionName,
    x: layout.positionX,
    y: layout.positionY,
    w: layout.width,
    h: layout.height,
  }));

  const initLayoutsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dashboard-layouts/init", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-layouts"] });
      toast({ title: "Initialized", description: "Dashboard layouts initialized successfully" });
    },
  });

  const updateLayoutMutation = useMutation({
    mutationFn: ({ sectionName, data }: { sectionName: string; data: any }) =>
      apiRequest("PUT", `/api/dashboard-layouts/${sectionName}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-layouts"] });
    },
  });

  useEffect(() => {
    if (layouts && layouts.length === 0) {
      initLayoutsMutation.mutate();
    }
  }, [layouts]);

  const handleEditClick = (layout: DashboardLayout, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSection(layout);
    setEditForm({ displayName: layout.displayName, color: layout.color || "" });
  };

  const handleSaveEdit = () => {
    if (!editingSection) return;
    setLocalLayouts(prev => prev.map(layout => 
      layout.sectionName === editingSection.sectionName
        ? { ...layout, displayName: editForm.displayName, color: editForm.color }
        : layout
    ));
    updateLayoutMutation.mutate({
      sectionName: editingSection.sectionName,
      data: { ...editingSection, displayName: editForm.displayName, color: editForm.color },
    });
    setEditingSection(null);
  };

  const commitLayoutChange = (sectionName: string, updates: Partial<DashboardLayout>) => {
    setLocalLayouts(prev => prev.map(layout => 
      layout.sectionName === sectionName ? { ...layout, ...updates } : layout
    ));
    const layout = localLayouts.find(l => l.sectionName === sectionName);
    if (layout) {
      updateLayoutMutation.mutate({ sectionName, data: { ...layout, ...updates } });
    }
  };

  const handleDragStop = (newLayout: any[]) => {
    if (isLocked) return;
    newLayout.forEach((item) => {
      const layout = localLayouts.find(l => l.sectionName === item.i);
      if (layout && (layout.positionX !== item.x || layout.positionY !== item.y)) {
        commitLayoutChange(layout.sectionName, { positionX: item.x, positionY: item.y, width: item.w, height: item.h });
      }
    });
  };

  const handleResize = (newLayout: any[]) => {
    if (isLocked) return;
    setLocalLayouts(prev => prev.map(layout => {
      const item = newLayout.find(i => i.i === layout.sectionName);
      if (item) {
        return { ...layout, positionX: item.x, positionY: item.y, width: item.w, height: item.h };
      }
      return layout;
    }));
  };

  const handleResizeStop = (newLayout: any[]) => {
    if (isLocked) return;
    newLayout.forEach((item) => {
      const layout = localLayouts.find(l => l.sectionName === item.i);
      if (layout) {
        updateLayoutMutation.mutate({ sectionName: layout.sectionName, data: { ...layout, positionX: item.x, positionY: item.y, width: item.w, height: item.h } });
      }
    });
  };

  if (isLoading || !layouts) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><TestTube className="h-6 w-6 text-primary" /></div>
              <div><h1 className="text-xl font-semibold text-foreground">KAROZH</h1><p className="text-xs text-muted-foreground">Welcome back!</p></div>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="text-center text-muted-foreground">Loading dashboard...</div></main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><TestTube className="h-6 w-6 text-primary" /></div>
            <div><h1 className="text-xl font-semibold text-foreground">KAROZH</h1><p className="text-xs text-muted-foreground">Welcome back!</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsLocked(!isLocked)} data-testid="button-lock-toggle" title={isLocked ? "Unlock" : "Lock"}>
              {isLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-foreground mb-2" data-testid="text-dashboard-title">Dashboard</h2>
          <p className="text-muted-foreground">{isLocked ? "Select a section" : "Drag to move • Click edit to customize"}</p>
        </div>

        <GridLayout className="layout" layout={gridLayout} cols={12} rowHeight={100} width={1200} isDraggable={!isLocked} isResizable={!isLocked} onDragStop={handleDragStop} onResize={handleResize} onResizeStop={handleResizeStop} compactType={null} preventCollision={false} draggableCancel=".edit-button">
          {visibleLayouts.map((layout) => {
            const Icon = iconMap[layout.sectionName as keyof typeof iconMap] || Settings;
            const scaleFactor = Math.max(0.5, Math.min(2.0, layout.height / 2));
            const iconSize = Math.max(30, Math.min(96, Math.round(48 * scaleFactor)));
            const iconInnerSize = Math.max(15, Math.min(48, Math.round(24 * scaleFactor)));
            const fontSize = Math.max(10, Math.min(36, Math.round(18 * scaleFactor)));
            const editButtonSize = Math.max(20, Math.min(36, Math.round(32 * scaleFactor)));
            const editIconSize = Math.max(10, Math.min(24, Math.round(16 * scaleFactor)));
            
            return (
              <div key={layout.sectionName}>
                <Card className={`${isLocked ? "cursor-pointer hover-elevate active-elevate-2" : "cursor-move"} transition-all overflow-hidden relative h-full flex flex-col`} onClick={isLocked ? () => setLocation(layout.route) : undefined} data-testid={`card-${layout.sectionName}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${layout.color || "from-gray-500/10 to-gray-500/5"} rounded-lg -z-10`} />
                  {!isLocked && (
                    <Button variant="ghost" size="icon" className="edit-button absolute top-2 right-2 z-10" style={{ width: `${editButtonSize}px`, height: `${editButtonSize}px`, minHeight: `${editButtonSize}px` }} onClick={(e) => handleEditClick(layout, e)} data-testid={`button-edit-${layout.sectionName}`}>
                      <Edit2 style={{ width: `${editIconSize}px`, height: `${editIconSize}px` }} />
                    </Button>
                  )}
                  <div className="flex flex-col items-center justify-center gap-3 w-full flex-1 p-4">
                    <div className="rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0" style={{ width: `${iconSize}px`, height: `${iconSize}px` }}>
                      <Icon className="text-primary" style={{ width: `${iconInnerSize}px`, height: `${iconInnerSize}px` }} />
                    </div>
                    <div className="text-center w-full px-2"><h3 className="font-semibold leading-tight" style={{ fontSize: `${fontSize}px` }}>{layout.displayName}</h3></div>
                  </div>
                </Card>
              </div>
            );
          })}
        </GridLayout>
      </main>

      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent data-testid="dialog-edit-widget">
          <DialogHeader><DialogTitle>Customize Widget</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label htmlFor="displayName">Display Name</Label><Input id="displayName" value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} data-testid="input-display-name" /></div>
            <div className="space-y-2">
              <Label>Color Gradient</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start" onClick={() => setEditForm({ ...editForm, color: "from-blue-500/10 to-blue-500/5" })} data-testid="button-color-blue"><div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500/10 to-blue-500/5 mr-2" />Blue</Button>
                <Button variant="outline" className="justify-start" onClick={() => setEditForm({ ...editForm, color: "from-green-500/10 to-green-500/5" })} data-testid="button-color-green"><div className="w-4 h-4 rounded bg-gradient-to-br from-green-500/10 to-green-500/5 mr-2" />Green</Button>
                <Button variant="outline" className="justify-start" onClick={() => setEditForm({ ...editForm, color: "from-purple-500/10 to-purple-500/5" })} data-testid="button-color-purple"><div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500/10 to-purple-500/5 mr-2" />Purple</Button>
                <Button variant="outline" className="justify-start" onClick={() => setEditForm({ ...editForm, color: "from-amber-500/10 to-amber-500/5" })} data-testid="button-color-amber"><div className="w-4 h-4 rounded bg-gradient-to-br from-amber-500/10 to-amber-500/5 mr-2" />Amber</Button>
                <Button variant="outline" className="justify-start" onClick={() => setEditForm({ ...editForm, color: "from-red-500/10 to-red-500/5" })} data-testid="button-color-red"><div className="w-4 h-4 rounded bg-gradient-to-br from-red-500/10 to-red-500/5 mr-2" />Red</Button>
                <Button variant="outline" className="justify-start" onClick={() => setEditForm({ ...editForm, color: "from-gray-500/10 to-gray-500/5" })} data-testid="button-color-gray"><div className="w-4 h-4 rounded bg-gradient-to-br from-gray-500/10 to-gray-500/5 mr-2" />Gray</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)} data-testid="button-cancel">Cancel</Button>
            <Button onClick={handleSaveEdit} className="gap-2" data-testid="button-save-widget"><Save className="h-4 w-4" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
