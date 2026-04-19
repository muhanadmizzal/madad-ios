import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Save, Plus, Trash2, Calculator } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_FORMULA,
  useSalaryEquation,
  useSaveSalaryEquation,
  type FormulaComponent,
} from "@/hooks/useSalaryEquation";

export default function SalaryEquationSettings() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const { data: equation } = useSalaryEquation(companyId);
  const saveMutation = useSaveSalaryEquation();

  const [formula, setFormula] = useState<FormulaComponent[]>(DEFAULT_FORMULA);
  const [projectionYears, setProjectionYears] = useState(5);
  const [name, setName] = useState("المعادلة الافتراضية");

  useEffect(() => {
    if (equation) {
      setFormula(equation.formula?.length ? equation.formula : DEFAULT_FORMULA);
      setProjectionYears(equation.projection_years || 5);
      setName(equation.name || "المعادلة الافتراضية");
    }
  }, [equation]);

  const updateComponent = (id: string, updates: Partial<FormulaComponent>) => {
    setFormula((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addComponent = () => {
    const newId = `custom_${Date.now()}`;
    setFormula((prev) => [
      ...prev,
      { id: newId, label: "مكون جديد", type: "earning", calcMode: "fixed", amount: 0, enabled: true },
    ]);
  };

  const removeComponent = (id: string) => {
    if (id === "basic") return; // Can't remove basic salary
    setFormula((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = () => {
    if (!companyId) return;
    saveMutation.mutate(
      { companyId, name, isDefault: true, formula, projectionYears },
      {
        onSuccess: () => toast({ title: "تم حفظ معادلة الراتب" }),
        onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
      }
    );
  };

  const calcModeLabels: Record<string, string> = {
    fixed: "مبلغ ثابت",
    percentage: "نسبة من الأساسي",
    per_service_year: "لكل سنة خدمة",
    grade_linked: "مرتبط بالدرجة",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          معادلة حساب الراتب الافتراضية
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          حدد مكونات الراتب وطريقة حسابها. يمكن تخصيصها لكل موظف من الهيكل التنظيمي.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Equation name & projection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">اسم المعادلة</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">سنوات الإسقاط</Label>
            <Input type="number" value={projectionYears} onChange={(e) => setProjectionYears(Number(e.target.value))} min={1} max={20} className="h-9 text-sm text-left" dir="ltr" />
          </div>
        </div>

        {/* Formula components */}
        <div className="space-y-2">
          {formula.map((c) => (
            <div key={c.id} className={`rounded-lg border p-3 space-y-2 transition-opacity ${!c.enabled ? "opacity-50" : ""} ${c.type === "deduction" ? "border-destructive/20 bg-destructive/5" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={c.enabled} onCheckedChange={(v) => updateComponent(c.id, { enabled: v })} className="scale-75" />
                  <Input value={c.label} onChange={(e) => updateComponent(c.id, { label: e.target.value })} className="h-7 text-xs font-semibold w-40 border-0 bg-transparent px-1" />
                  <Badge variant={c.type === "earning" ? "default" : "destructive"} className="text-[9px]">
                    {c.type === "earning" ? "استحقاق" : "خصم"}
                  </Badge>
                </div>
                {c.id !== "basic" && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeComponent(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="space-y-1">
                  <Label className="text-[10px]">النوع</Label>
                  <Select value={c.type} onValueChange={(v: "earning" | "deduction") => updateComponent(c.id, { type: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="earning">استحقاق</SelectItem>
                      <SelectItem value="deduction">خصم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">طريقة الحساب</Label>
                  <Select value={c.calcMode} onValueChange={(v: any) => updateComponent(c.id, { calcMode: v })} disabled={c.id === "basic"}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                      <SelectItem value="percentage">نسبة من الأساسي</SelectItem>
                      <SelectItem value="per_service_year">لكل سنة خدمة</SelectItem>
                      <SelectItem value="grade_linked">مرتبط بالدرجة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">
                    {c.calcMode === "percentage" ? "النسبة %" : c.calcMode === "per_service_year" ? "لكل سنة" : "المبلغ"}
                  </Label>
                  {c.calcMode === "grade_linked" ? (
                    <p className="text-[10px] text-muted-foreground pt-1">تلقائي من الدرجة</p>
                  ) : (
                    <Input
                      type="number"
                      value={c.calcMode === "percentage" ? (c.percentage || 0) : c.calcMode === "per_service_year" ? (c.perYearAmount || 0) : (c.amount || 0)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (c.calcMode === "percentage") updateComponent(c.id, { percentage: val });
                        else if (c.calcMode === "per_service_year") updateComponent(c.id, { perYearAmount: val });
                        else updateComponent(c.id, { amount: val });
                      }}
                      className="h-7 text-xs text-left"
                      dir="ltr"
                      disabled={c.id === "basic"}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add component */}
        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={addComponent}>
          <Plus className="h-3 w-3" /> إضافة مكون
        </Button>

        {/* Save */}
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full gap-2">
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "جاري الحفظ..." : "حفظ المعادلة الافتراضية"}
        </Button>
      </CardContent>
    </Card>
  );
}
