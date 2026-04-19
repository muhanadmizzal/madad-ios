import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Banknote, Car, Phone, Home, Plane, Utensils, GraduationCap,
  Heart, ShieldCheck, AlertCircle, CheckCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  positionId: string;
  companyId: string;
}

interface AllowanceConfig {
  key: string;
  nameAr: string;
  icon: typeof Banknote;
  category: "allowance" | "deduction";
}

const ALLOWANCE_CATALOG: AllowanceConfig[] = [
  { key: "transport_allowance", nameAr: "بدل نقل", icon: Car, category: "allowance" },
  { key: "phone_allowance", nameAr: "بدل هاتف", icon: Phone, category: "allowance" },
  { key: "housing_allowance", nameAr: "بدل سكن", icon: Home, category: "allowance" },
  { key: "travel_allowance", nameAr: "بدل سفر", icon: Plane, category: "allowance" },
  { key: "food_allowance", nameAr: "بدل طعام", icon: Utensils, category: "allowance" },
  { key: "education_allowance", nameAr: "بدل تعليم", icon: GraduationCap, category: "allowance" },
  { key: "health_insurance", nameAr: "تأمين صحي", icon: Heart, category: "deduction" },
  { key: "social_security", nameAr: "تأمينات اجتماعية", icon: ShieldCheck, category: "deduction" },
];

type PositionAllowances = Record<string, { enabled: boolean; amount?: number }>;

export default function PositionAllowancesTab({ positionId, companyId }: Props) {
  const queryClient = useQueryClient();

  const { data: positionData } = useQuery({
    queryKey: ["position-allowances", positionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("allowances")
        .eq("id", positionId)
        .single();
      if (error) throw error;
      return (data?.allowances as unknown as PositionAllowances) || {};
    },
    enabled: !!positionId,
  });

  const [localData, setLocalData] = useState<PositionAllowances>({});

  // Sync on load
  const allowances: PositionAllowances = { ...positionData, ...localData };

  const saveMutation = useMutation({
    mutationFn: async (newData: PositionAllowances) => {
      const { error } = await supabase
        .from("positions")
        .update({ allowances: newData } as any)
        .eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-allowances", positionId] });
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم حفظ البدلات والاستقطاعات" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل في الحفظ", variant: "destructive" }),
  });

  const handleToggle = useCallback((key: string, enabled: boolean) => {
    const updated = { ...allowances, [key]: { ...allowances[key], enabled } };
    setLocalData(updated);
    saveMutation.mutate(updated);
  }, [allowances, saveMutation]);

  const handleAmountChange = useCallback((key: string, amount: number) => {
    const updated = { ...allowances, [key]: { ...allowances[key], enabled: true, amount } };
    setLocalData(updated);
  }, [allowances]);

  const handleAmountBlur = useCallback((key: string) => {
    saveMutation.mutate({ ...allowances, ...localData });
  }, [allowances, localData, saveMutation]);

  const allowanceItems = ALLOWANCE_CATALOG.filter(a => a.category === "allowance");
  const deductionItems = ALLOWANCE_CATALOG.filter(a => a.category === "deduction");
  const enabledCount = ALLOWANCE_CATALOG.filter(a => allowances[a.key]?.enabled).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          حدد البدلات والاستقطاعات المرتبطة بهذا المنصب. سيتم تطبيقها تلقائياً عند احتساب الرواتب.
        </p>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {enabledCount}/{ALLOWANCE_CATALOG.length} مفعّل
        </Badge>
      </div>

      {/* Allowances */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Banknote className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">البدلات</span>
        </div>
        <div className="space-y-1.5">
          {allowanceItems.map((item) => {
            const config = allowances[item.key];
            const enabled = config?.enabled || false;
            const Icon = item.icon;
            return (
              <div key={item.key} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${enabled ? "border-primary/20 bg-primary/5" : "border-border bg-card"}`}>
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{item.nameAr}</span>
                </div>
                <div className="flex items-center gap-2">
                  {enabled && (
                    <Input
                      type="number"
                      placeholder="المبلغ"
                      className="h-7 w-24 text-xs text-left"
                      dir="ltr"
                      value={config?.amount || ""}
                      onChange={(e) => handleAmountChange(item.key, parseFloat(e.target.value) || 0)}
                      onBlur={() => handleAmountBlur(item.key)}
                    />
                  )}
                  {enabled && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                  <Switch checked={enabled} onCheckedChange={(v) => handleToggle(item.key, v)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Deductions */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-semibold text-foreground">الاستقطاعات</span>
        </div>
        <div className="space-y-1.5">
          {deductionItems.map((item) => {
            const config = allowances[item.key];
            const enabled = config?.enabled || false;
            const Icon = item.icon;
            return (
              <div key={item.key} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${enabled ? "border-destructive/20 bg-destructive/5" : "border-border bg-card"}`}>
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${enabled ? "text-destructive" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{item.nameAr}</span>
                </div>
                <div className="flex items-center gap-2">
                  {enabled && (
                    <Input
                      type="number"
                      placeholder="المبلغ"
                      className="h-7 w-24 text-xs text-left"
                      dir="ltr"
                      value={config?.amount || ""}
                      onChange={(e) => handleAmountChange(item.key, parseFloat(e.target.value) || 0)}
                      onBlur={() => handleAmountBlur(item.key)}
                    />
                  )}
                  {enabled && <CheckCircle className="h-3.5 w-3.5 text-destructive" />}
                  <Switch checked={enabled} onCheckedChange={(v) => handleToggle(item.key, v)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
