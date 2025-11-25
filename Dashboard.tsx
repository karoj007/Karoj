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
  accounts: ShieldCheck,
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isLocked, setIsLocked] = useState(true);
  const [editingSection, setEditingSection] = useState<DashboardLayout | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", color: "" });
  const [localLayouts, setLocalLayouts] = useState<DashboardLayout[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 1. جلب المستخدم (للتأكد من الصلاحيات)
  useEffect(() => {
    fetch("/api/session").then(res => res.json()).then(data => {
      if (data.authenticated) setCurrentUser(data.user);
    });
  }, []);

  const { data: layouts, isLoading } = useQuery<DashboardLayout[]>({
    queryKey: ["/api/dashboard-layouts"],
  });

  // 2. كود "الحقن الإجباري" لزر الحسابات
  useEffect(() => {
    if (layouts) {
      const currentList = [...layouts];
      const hasAccounts = currentList.find(l => l.sectionName === 'accounts');
      
      // إذا لم يكن زر الحسابات موجوداً، نقوم بإضافته بالقوة في البداية
      if (!hasAccounts) {
        currentList.unshift({ // unshift يضعه في البداية
          id: 9999,
          sectionName: 'accounts',
          displayName: 'Accounts (Admin)',
          route: '/accounts',
          color: 'from-red-500/10 to-red-500/5',
          positionX: 0,
          positionY: 0, // في أعلى الشاشة
          width: 4,
          height: 2,
          isVisible: true
        });
      }
      setLocalLayouts(currentList);
    }
  }, [layouts]);

  // 3. دالة الصلاحيات (تم تعديلها لتسمح لك برؤية كل شيء إذا كنت الحساب القديم)
  const shouldShowWidget = (sectionName: string) => {
    // إذا لم يتم تحميل المستخدم، نفترض أنه المدير ونعرض كل شيء
    if (!currentUser) return true;
    
    // إذا لم يكن لدى المستخدم حقل صلاحيات (الحساب القديم)، فهو المدير -> اعرض كل شيء
    if (!currentUser.permissions) return true;

    let perms = currentUser.permissions;
    try {
      if (typeof perms === 'string') perms = JSON.parse(perms);
    } catch (e) { return true; }

    // إذا كانت الصلاحيات فارغة -> مدير
    if (!perms || Object.keys(perms).length === 0) return true;

    // التحقق لباقي المستخدمين
    switch (sectionName) {
      case 'tests': return perms.tests?.access !== false;
      case 'patients': return perms.patients?.view !== false;
      case 'results': return perms.results?.view !== false;
      case 'reports': return perms.reports?.view !== false;
      case 'settings': return perms.settings?.access !== false;
      case 'accounts': return perms.accounts?.access !== false;
      default: return true;
    }
  };

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dashboard-layouts"] }),
  });
  
  const updateLayoutMutation = useMutation({
    mutationFn: ({ sectionName, data }: { sectionName: string; data: any }) =>
      apiRequest("PUT", `/api/dashboard-layouts/${sectionName}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dashboard-layouts"] }),
  });

  useEffect(() => { if (layouts && layouts.length === 0) initLayoutsMutation.mutate(); }, [layouts]);

  const handleEditClick = (layout: DashboardLayout, e: React.MouseEvent) => { e.stopPropagation(); setEditingSection(layout); setEditForm({ displayName: layout.displayName, color: layout.color || "" }); };
  
  const handleSaveEdit = () => { 
    if (!editingSection) return; 
    
    // تحديث الواجهة
    setLocalLayouts(prev => prev.map(l => l.sectionName === editingSection.sectionName ? { ...l, displayName: editForm.displayName, color: editForm.color } : l)); 
    
    // إذا كان زر الحسابات "المحقون"، لن يتم حفظه في الداتابيس القديمة بسهولة، وهذا جيد حالياً
    if (editingSection.sectionName !== 'accounts') {
        updateLayoutMutation.mutate({ sectionName: editingSection.sectionName, data: { ...editingSection, displayName: editForm.displayName, color: editForm.color }, }); 
    }
    setEditingSection(null); 
  };

  const handleDragStop = (newLayout: any[]) => { if (isLocked) return; newLayout.forEach((item) => { const layout = localLayouts.find(l => l.sectionName === item.i); if (layout && (layout.positionX !== item.x || layout.positionY !== item.y)) { updateLayoutMutation.mutate({ sectionName: layout.sectionName, data: { ...layout, positionX: item.x, positionY: item.y, width: item.w, height: item.h } }); } }); };
  const handleResize = (newLayout: any[]) => { if (isLocked) return; setLocalLayouts(prev => prev.map(layout => { const item = newLayout.find(i => i.i === layout.sectionName); return item ? { ...layout, positionX: item.x, positionY: item.y, width: item.w, height: item.h } : layout; })); };
  const handleResizeStop = (newLayout: any[]) => { if (isLocked) return; newLayout.forEach((item) => { const layout = localLayouts.find(l => l.sectionName === item.i); if (layout) { updateLayoutMutation.mutate({ sectionName: layout.sectionName, data: { ...layout, positionX: item.x, positionY: item.y, width: item.w, height: item.h }, }); } }); };

  if (isLoading || !layouts) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><TestTube className="h-6 w-6 text-primary" /></div>
            <div><h1 className="text-xl font-semibold text-foreground">KAROZH LAB</h1><p className="text-xs text-muted-foreground">Welcome {currentUser?.displayName || 'Admin'}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsLocked(!isLocked)}>{isLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}</Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>{theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8"><h2 className="text-3xl font-semibold text-foreground mb-2">Dashboard</h2><p className="text-muted-foreground">{isLocked ? "Select a section" : "Drag to organize"}</p></div>

        <GridLayout className="layout" layout={gridLayout} cols={12} rowHeight={100} width={1200} isDraggable={!isLocked} isResizable={!isLocked} onDragStop={handleDragStop} onResize={handleResize} onResizeStop={handleResizeStop} compactType={null} preventCollision={false} draggableCancel=".edit-button">
          {visibleLayouts.map((layout) => {
            const Icon = iconMap[layout.sectionName as keyof typeof iconMap] || Settings;
            const scaleFactor = Math.max(0.5, Math.min(2.0, layout.height / 2));
            const iconSize = Math.round(48 * scaleFactor);
            const fontSize = Math.round(18 * scaleFactor);
            
            return (
              <div key={layout.sectionName}>
                <Card className={`${isLocked ? "cursor-pointer hover-elevate active-elevate-2" : "cursor-move"} transition-all overflow-hidden relative h-full flex flex-col`} onClick={isLocked ? () => setLocation(layout.route) : undefined}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${layout.color || "from-gray-500/10 to-gray-500/5"} rounded-lg -z-10`} />
                  {!isLocked && (
                    <Button variant="ghost" size="icon" className="edit-button absolute top-2 right-2 z-10" onClick={(e) => handleEditClick(layout, e)}><Edit2 className="h-4 w-4" /></Button>
                  )}
                  <div className="flex flex-col items-center justify-center gap-3 w-full flex-1 p-4">
                    <div className="rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0" style={{ width: iconSize, height: iconSize }}><Icon className="text-primary" style={{ width: iconSize/2, height: iconSize/2 }} /></div>
                    <div className="text-center w-full px-2"><h3 className="font-semibold leading-tight" style={{ fontSize }}>{layout.displayName}</h3></div>
                  </div>
                </Card>
              </div>
            );
          })}
        </GridLayout>
      </main>

      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Customize</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Name</Label><Input value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} /></div>
            <div className="space-y-2"><Label>Color</Label><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setEditForm({ ...editForm, color: "from-blue-500/10 to-blue-500/5" })}>Blue</Button><Button variant="outline" onClick={() => setEditForm({ ...editForm, color: "from-green-500/10 to-green-500/5" })}>Green</Button><Button variant="outline" onClick={() => setEditForm({ ...editForm, color: "from-purple-500/10 to-purple-500/5" })}>Purple</Button><Button variant="outline" onClick={() => setEditForm({ ...editForm, color: "from-amber-500/10 to-amber-500/5" })}>Amber</Button></div></div>
          </div>
          <DialogFooter><Button onClick={handleSaveEdit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
