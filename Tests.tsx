import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // استدعاء مربع النص الكبير
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, ArrowLeft, Beaker, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Test } from "@shared/schema";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Tests() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // --- State Variables ---
  const [testSearch, setTestSearch] = useState("");
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  
  // Form Data State
  const [testFormData, setTestFormData] = useState({
    name: "",
    price: 0,
    unit: "",
    normalRange: "",
    testType: "standard"
  });
  
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null);

  // --- Queries ---
  const { data: tests, isLoading } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  // --- Mutations (Save/Edit/Delete) ---
  const createTestMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setIsTestDialogOpen(false);
      resetTestForm();
      toast({ title: "تمت الإضافة", description: "تم إنشاء الفحص الجديد بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في إنشاء الفحص", variant: "destructive" });
    }
  });

  const updateTestMutation = useMutation({
    mutationFn: (data: { id: string; test: any }) =>
      apiRequest("PUT", `/api/tests/${data.id}`, data.test),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setIsTestDialogOpen(false);
      resetTestForm();
      toast({ title: "تم التعديل", description: "تم تحديث بيانات الفحص بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تحديث الفحص", variant: "destructive" });
    }
  });

  const deleteTestMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tests/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setDeleteTestId(null);
      toast({ title: "تم الحذف", description: "تم حذف الفحص بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في حذف الفحص", variant: "destructive" });
    }
  });

  // --- Helper Functions ---
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
    if (!testFormData.name.trim()) {
      toast({ title: "تنبيه", description: "يجب كتابة اسم الفحص", variant: "destructive" });
      return;
    }

    if (editingTest) {
      updateTestMutation.mutate({ id: editingTest.id, test: testFormData });
    } else {
      createTestMutation.mutate(testFormData);
    }
  };

  // --- Filtering ---
  const filteredTests = tests?.filter(test => 
    test.name.toLowerCase().includes(testSearch.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Navigation */}
        <div className="mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/")} 
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            رجوع للرئيسية
          </Button>
        </div>
        
        <PageHeader
          title="الفحوصات والأسعار"
          description="إدارة قائمة التحاليل الطبية وتعديل الأسعار والنطاقات الطبيعية"
          actions={
            <Button onClick={openAddTestDialog} className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-md">
              <Plus className="h-4 w-4" />
              إضافة فحص جديد
            </Button>
          }
        />

        {/* Search & List Card */}
        <Card className="mt-6 border-none shadow-md bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle className="text-xl text-primary">قائمة التحاليل ({filteredTests.length})</CardTitle>
                <CardDescription>
                  يمكنك البحث عن أي فحص لتعديله أو حذفه
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن اسم الفحص..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="pl-9 bg-background border-primary/20 focus-visible:ring-primary"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse">جاري تحميل البيانات...</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredTests.map((test) => (
                  <div 
                    key={test.id} 
                    className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-card border border-border/50 rounded-xl hover:shadow-lg hover:border-primary/30 transition-all duration-200 group gap-4"
                  >
                    {/* Test Info Section */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 w-full items-center">
                      
                      {/* Name */}
                      <div className="md:col-span-3 font-bold text-lg text-primary flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${test.testType === 'urine' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                           {test.testType === 'urine' ? <FileText className="h-5 w-5" /> : <Beaker className="h-5 w-5" />}
                         </div>
                         {test.name}
                      </div>

                      {/* Price */}
                      <div className="md:col-span-2 text-sm bg-muted/30 p-2 rounded-md border border-border/50">
                        <span className="text-muted-foreground block text-xs mb-1">السعر</span>
                        <span className="font-mono font-bold text-base text-foreground">{test.price.toLocaleString()} IQD</span>
                      </div>

                      {/* Normal Range (Updated for Multiline) */}
                      <div className="md:col-span-5 text-sm bg-muted/30 p-2 rounded-md border border-border/50 min-h-[50px] flex flex-col justify-center">
                         <span className="text-muted-foreground block text-xs mb-1">النطاق الطبيعي (Normal Range)</span>
                         <span className="font-medium text-foreground whitespace-pre-wrap leading-relaxed" dir="auto">
                           {test.normalRange || "غير محدد"}
                         </span>
                      </div>

                      {/* Unit */}
                      <div className="md:col-span-2 text-sm bg-muted/30 p-2 rounded-md border border-border/50">
                         <span className="text-muted-foreground block text-xs mb-1">الوحدة</span>
                         <span className="font-medium text-foreground">{test.unit || "-"}</span>
                      </div>
                    </div>
                    
                    {/* Actions Buttons */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditTestDialog(test)}
                        className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors gap-2"
                        title="تعديل الفحص"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="md:hidden">تعديل</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTestId(test.id)}
                        className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors gap-2"
                        title="حذف الفحص"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="md:hidden">حذف</span>
                      </Button>
                    </div>
                  </div>
                ))}
                
                {filteredTests.length === 0 && (
                  <div className="text-center py-16 border-2 border-dashed border-muted rounded-xl bg-muted/10">
                    <div className="flex flex-col items-center gap-3">
                      <Beaker className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-lg text-muted-foreground font-medium">لا توجد فحوصات مطابقة للبحث</p>
                      <Button variant="link" onClick={openAddTestDialog} className="text-primary">
                        إضافة فحص جديد الآن
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              {editingTest ? "تعديل بيانات الفحص" : "إضافة فحص جديد"}
            </DialogTitle>
            <DialogDescription>
              قم بتعبئة البيانات أدناه. يمكنك استخدام زر Enter في خانة النطاق الطبيعي لكتابة أكثر من سطر.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="test-name" className="text-foreground font-medium">اسم الفحص *</Label>
              <Input
                id="test-name"
                value={testFormData.name}
                onChange={(e) => setTestFormData({ ...testFormData, name: e.target.value })}
                placeholder="مثال: CBC, Vitamin D"
                className="font-medium"
              />
            </div>

            {/* Price & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test-price" className="text-foreground font-medium">السعر (IQD)</Label>
                <Input
                  id="test-price"
                  type="number"
                  value={testFormData.price}
                  onChange={(e) => setTestFormData({ ...testFormData, price: parseFloat(e.target.value) || 0 })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-unit" className="text-foreground font-medium">الوحدة (Unit)</Label>
                <Input
                  id="test-unit"
                  value={testFormData.unit}
                  onChange={(e) => setTestFormData({ ...testFormData, unit: e.target.value })}
                  placeholder="مثال: mg/dL"
                />
              </div>
            </div>

            {/* Normal Range (TEXTAREA) */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="test-range" className="text-foreground font-medium">النطاق الطبيعي (Normal Range)</Label>
                <span className="text-xs text-muted-foreground">(يدعم أسطر متعددة)</span>
              </div>
              <Textarea
                id="test-range"
                value={testFormData.normalRange}
                onChange={(e) => setTestFormData({ ...testFormData, normalRange: e.target.value })}
                placeholder="مثال:&#10;Male: 10-50&#10;Female: 5-40"
                className="font-mono min-h-[100px] resize-y"
              />
            </div>

            {/* Test Type */}
            <div className="space-y-2">
              <Label htmlFor="test-type" className="text-foreground font-medium">نوع الفحص</Label>
              <Select
                value={testFormData.testType}
                onValueChange={(value: "standard" | "urine") => setTestFormData({ ...testFormData, testType: value as any })}
              >
                <SelectTrigger id="test-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">فحص قياسي (نتيجة عادية)</SelectItem>
                  <SelectItem value="urine">تحليل بول (واجهة مفصلة)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveTest} disabled={createTestMutation.isPending || updateTestMutation.isPending} className="gap-2">
              <Check className="h-4 w-4" />
              {editingTest ? "حفظ التعديلات" : "إضافة الفحص"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTestId}
        onOpenChange={(open) => !open && setDeleteTestId(null)}
        title="حذف الفحص"
        description="هل أنت متأكد من حذف هذا الفحص نهائياً؟ لن يؤثر هذا على نتائج المرضى القديمة."
        onConfirm={() => deleteTestId && deleteTestMutation.mutate(deleteTestId)}
        variant="destructive"
      />
    </div>
  );
}
