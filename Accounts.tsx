import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Shield, User, Key, Save, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// تعريف شكل الصلاحيات
interface Permissions {
  patients: { view: boolean; edit: boolean };
  results: { view: boolean; edit: boolean; print: boolean };
  reports: { view: boolean; print: boolean };
  settings: { access: boolean };
  accounts: { access: boolean };
  tests: { access: boolean };
}

// الصلاحيات الافتراضية (الكل مغلق)
const defaultPermissions: Permissions = {
  patients: { view: false, edit: false },
  results: { view: false, edit: false, print: false },
  reports: { view: false, print: false },
  settings: { access: false },
  accounts: { access: false },
  tests: { access: false },
};

export default function Accounts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({ open: false, id: "" });

  // Form Data
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    password: "",
    permissions: defaultPermissions
  });

  // Fetch Users
  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "تم بنجاح", description: "تم إنشاء الحساب الجديد" });
    },
    onError: () => toast({ title: "خطأ", description: "اسم المستخدم قد يكون موجوداً مسبقاً", variant: "destructive" })
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: { id: string; user: any }) =>
      apiRequest("PUT", `/api/users/${data.id}`, data.user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "تم التعديل", description: "تم تحديث بيانات الحساب وصلاحياته" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/users/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteDialog({ open: false, id: "" });
      toast({ title: "تم الحذف", description: "تم حذف الحساب بنجاح" });
    }
  });

  // Helpers
  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      displayName: "",
      username: "",
      password: "",
      permissions: JSON.parse(JSON.stringify(defaultPermissions)) // Deep copy
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    // Parse permissions if stored as string, or use default if missing
    let userPerms = defaultPermissions;
    try {
      if (typeof user.permissions === 'string') userPerms = JSON.parse(user.permissions);
      else if (user.permissions) userPerms = user.permissions;
    } catch (e) {}

    setFormData({
      displayName: user.displayName || "",
      username: user.username || "",
      password: user.password || "", // In real app, don't show password
      permissions: userPerms
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.username || !formData.password) {
      toast({ title: "نقص في البيانات", description: "يجب إدخال اسم المستخدم وكلمة المرور", variant: "destructive" });
      return;
    }

    const dataToSend = {
      ...formData,
      permissions: JSON.stringify(formData.permissions)
    };

    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, user: dataToSend });
    } else {
      createUserMutation.mutate(dataToSend);
    }
  };

  // Permission Toggle Helper
  const togglePerm = (section: keyof Permissions, key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]: {
          ...prev.permissions[section],
          // @ts-ignore
          [key]: !prev.permissions[section][key]
        }
      }
    }));
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-2">
            <Key className="h-4 w-4" /> رجوع للرئيسية
          </Button>
        </div>

        <PageHeader
          title="إدارة الحسابات والصلاحيات"
          description="إنشاء مستخدمين وتحديد صلاحياتهم بدقة (مشاهدة، تعديل، طباعة)"
          actions={
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="h-4 w-4" /> إضافة حساب جديد
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {users?.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-all border-t-4 border-t-primary">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{user.displayName}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">@{user.username}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(user)} className="h-8 w-8 text-blue-600">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({open: true, id: user.id})} className="h-8 w-8 text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">
                  كلمة المرور: <span className="font-mono font-bold text-foreground">{user.password}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {/* Badges for permissions preview */}
                  <span className="text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    صلاحيات محددة
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? "تعديل الحساب" : "حساب جديد"}</DialogTitle>
              <DialogDescription>أدخل بيانات الدخول ثم حدد الصلاحيات بالأسفل.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="space-y-2">
                  <Label>الاسم الظاهر</Label>
                  <Input value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} placeholder="مثلاً: د. أحمد" />
                </div>
                <div className="space-y-2">
                  <Label>اسم المستخدم</Label>
                  <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Login ID" />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <Input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Password" />
                </div>
              </div>

              {/* Permissions Grid */}
              <div className="space-y-4">
                <Label className="text-lg font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> تحديد الصلاحيات
                </Label>
                
                <div className="grid gap-4 border rounded-lg p-4">
                  
                  {/* Patients */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="w-32 font-medium">المرضى</div>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2"><Switch checked={formData.permissions.patients.view} onCheckedChange={() => togglePerm('patients', 'view')} /><Label>مشاهدة القائمة</Label></div>
                      <div className="flex items-center gap-2"><Switch checked={formData.permissions.patients.edit} onCheckedChange={() => togglePerm('patients', 'edit')} /><Label>تعديل وحذف</Label></div>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="w-32 font-medium">النتائج</div>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2"><Switch checked={formData.permissions.results.view} onCheckedChange={() => togglePerm('results', 'view')} /><Label>مشاهدة</Label></div>
                      <div className="flex items-center gap-2"><Switch checked={formData.permissions.results.edit} onCheckedChange={() => togglePerm('results', 'edit')} /><Label>تعديل وإدخال</Label></div>
                      <div className="flex items-center gap-2"><Switch checked={formData.permissions.results.print} onCheckedChange={() => togglePerm('results', 'print')} /><Label>طباعة</Label></div>
                    </div>
                  </div>

                  {/* Reports */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="w-32 font-medium">التقارير المالية</div>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2"><Switch checked={formData.permissions.reports.view} onCheckedChange={() => togglePerm('reports', 'view')} /><Label>مشاهدة</Label></div>
                      <div className="flex items-center gap-2"><Switch checked={formData.permissions.reports.print} onCheckedChange={() => togglePerm('reports', 'print')} /><Label>طباعة</Label></div>
                    </div>
                  </div>

                  {/* Tests Management */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="w-32 font-medium">الفحوصات والأسعار</div>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2"><Switch checked={formData.permissions.tests.access} onCheckedChange={() => togglePerm('tests', 'access')} /><Label>دخول كامل</Label></div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="w-32 font-medium">الإعدادات</div>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2"><Switch checked={formData.permissions.settings.access} onCheckedChange={() => togglePerm('settings', 'access')} /><Label>دخول كامل</Label></div>
                    </div>
                  </div>

                  {/* Accounts (Admin) */}
                  <div className="flex items-center justify-between bg-red-50 p-2 rounded">
                    <div className="w-32 font-bold text-red-700">الحسابات (Admin)</div>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2"><Switch checked={formData.permissions.accounts.access} onCheckedChange={() => togglePerm('accounts', 'access')} /><Label className="text-red-700 font-bold">إدارة المستخدمين</Label></div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave} className="gap-2"><Check className="h-4 w-4" /> حفظ الحساب</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open, id: "" })}
          title="حذف الحساب"
          description="هل أنت متأكد؟ لن يتمكن هذا المستخدم من الدخول مرة أخرى."
          onConfirm={() => deleteUserMutation.mutate(deleteDialog.id)}
          variant="destructive"
        />
      </div>
    </div>
  );
}
