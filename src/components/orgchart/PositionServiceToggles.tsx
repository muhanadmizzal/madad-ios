import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureAccessQuery } from "@/hooks/useFeatureAccess";
import {
  usePositionPermissions,
  SERVICE_CATALOG,
  CATEGORY_META,
  POSITION_PRESETS,
  type ServiceCategory,
  type ServicePermissions,
} from "@/hooks/usePositionPermissions";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Lock, CheckCircle, Sparkles, Copy, RotateCcw,
  Users, Briefcase, BarChart3, Bot, Settings2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  positionId: string;
  companyId: string;
  servicePermissions: ServicePermissions | null;
}

const CATEGORY_ICONS: Record<ServiceCategory, typeof Users> = {
  core_hr: Users,
  talent: Briefcase,
  operations: BarChart3,
  ai_tools: Bot,
  admin_advanced: Settings2,
};

export default function PositionServiceToggles({ positionId, companyId, servicePermissions }: Props) {
  const queryClient = useQueryClient();
  const { checkFeature } = useFeatureAccessQuery();
  const [localPerms, setLocalPerms] = useState<ServicePermissions>(
    servicePermissions || Object.fromEntries(SERVICE_CATALOG.map((f) => [f.key, true]))
  );
  const { groupedCatalog } = usePositionPermissions(localPerms);

  const saveMutation = useMutation({
    mutationFn: async (perms: ServicePermissions) => {
      const { error } = await supabase
        .from("positions")
        .update({ service_permissions: perms } as any)
        .eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم حفظ صلاحيات الخدمات" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل حفظ الصلاحيات", variant: "destructive" }),
  });

  const handleToggle = useCallback((key: string, value: boolean) => {
    const updated = { ...localPerms, [key]: value };
    setLocalPerms(updated);
    saveMutation.mutate(updated);
  }, [localPerms, saveMutation]);

  const handlePreset = useCallback((preset: string) => {
    if (!preset || !POSITION_PRESETS[preset]) return;
    const newPerms = { ...POSITION_PRESETS[preset] };
    // Respect package limits: if not in plan, force false
    for (const feat of SERVICE_CATALOG) {
      const planCheck = checkFeature(feat.key);
      if (!planCheck.enabled) newPerms[feat.key] = false;
    }
    setLocalPerms(newPerms);
    saveMutation.mutate(newPerms);
  }, [checkFeature, saveMutation]);

  const handleReset = useCallback(() => {
    const allOn = Object.fromEntries(SERVICE_CATALOG.map((f) => [f.key, true]));
    setLocalPerms(allOn);
    saveMutation.mutate(allOn);
  }, [saveMutation]);

  const enabledCount = Object.values(localPerms).filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Header controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select onValueChange={handlePreset}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="تحميل قالب..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tenant_admin">مدير النظام</SelectItem>
            <SelectItem value="hr_manager">مدير الموارد البشرية</SelectItem>
            <SelectItem value="hr_officer">مسؤول موارد بشرية</SelectItem>
            <SelectItem value="finance_manager">مدير مالي</SelectItem>
            <SelectItem value="manager">مدير</SelectItem>
            <SelectItem value="employee">موظف</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={handleReset}>
          <RotateCcw className="h-3 w-3" />إعادة ضبط
        </Button>

        <Badge variant="outline" className="text-[10px] mr-auto">
          {enabledCount}/{SERVICE_CATALOG.length} مفعّل
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground">
        تحكم بالخدمات المتاحة لهذا المنصب. الخدمات غير المشمولة بالباقة لا يمكن تفعيلها.
      </p>

      {/* Grouped toggles */}
      {groupedCatalog.map((group, gi) => {
        const CatIcon = CATEGORY_ICONS[group.category];
        return (
          <div key={group.category}>
            {gi > 0 && <Separator className="my-2" />}
            <div className="flex items-center gap-1.5 mb-2">
              <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">{group.meta.labelAr}</span>
              {group.category === "ai_tools" && <Sparkles className="h-3 w-3 text-accent" />}
            </div>
            <div className="space-y-1">
              {group.features.map((feat) => {
                const planCheck = checkFeature(feat.key);
                const inPlan = planCheck.enabled;
                const posEnabled = localPerms[feat.key] !== false;

                return (
                  <div
                    key={feat.key}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg border transition-colors ${
                      inPlan
                        ? "border-border bg-card hover:bg-muted/30"
                        : "border-dashed border-muted-foreground/20 bg-muted/10 opacity-60"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {feat.nameAr}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!inPlan ? (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          <span>غير متاح</span>
                        </div>
                      ) : (
                        <>
                          {posEnabled && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                          <Switch
                            checked={posEnabled}
                            onCheckedChange={(v) => handleToggle(feat.key, v)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
