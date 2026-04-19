import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useFeatureAccessQuery } from "@/hooks/useFeatureAccess";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Lock, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CatalogFeature {
  id: string;
  key: string;
  name: string;
  name_ar: string | null;
  category: string;
  description: string | null;
  is_active: boolean;
}

interface PositionAssignment {
  id: string;
  position_id: string;
  feature_key: string;
  enabled: boolean;
}

interface Props {
  positionId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  core: "أساسي",
  hr: "موارد بشرية",
  analytics: "تحليلات",
  admin: "إدارة",
  ai: "ذكاء اصطناعي",
};

const CATEGORY_ORDER = ["core", "hr", "analytics", "admin", "ai"];

export default function PositionFeatureToggles({ positionId }: Props) {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const { checkFeature } = useFeatureAccessQuery();

  const { data: catalog = [] } = useQuery({
    queryKey: ["feature-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_catalog").select("*").eq("is_active", true).order("category, key");
      if (error) throw error;
      return (data || []) as CatalogFeature[];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["position-feature-assignments", positionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("position_feature_assignments")
        .select("*")
        .eq("position_id", positionId);
      if (error) throw error;
      return (data || []) as PositionAssignment[];
    },
    enabled: !!positionId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ featureKey, enabled }: { featureKey: string; enabled: boolean }) => {
      const existing = assignments.find((a) => a.feature_key === featureKey);
      if (existing) {
        const { error } = await supabase
          .from("position_feature_assignments")
          .update({ enabled } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("position_feature_assignments")
          .insert({
            position_id: positionId,
            feature_key: featureKey,
            enabled,
            company_id: companyId!,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-feature-assignments", positionId] });
      toast({ title: "تم تحديث صلاحية الميزة" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل في تحديث الصلاحية", variant: "destructive" }),
  });

  const assignmentMap = new Map(assignments.map((a) => [a.feature_key, a.enabled]));

  const groupedCatalog = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] || cat,
    features: catalog.filter((f) => f.category === cat),
  })).filter((g) => g.features.length > 0);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        تحكم بالميزات المتاحة لهذا المنصب. الميزات المعطّلة على مستوى الباقة لا يمكن تفعيلها.
      </p>

      {groupedCatalog.map((group, gi) => (
        <div key={group.category}>
          {gi > 0 && <Separator className="my-3" />}
          <div className="mb-2">
            <Badge variant="outline" className="text-[10px]">
              {group.category === "ai" && <Sparkles className="h-2.5 w-2.5 ml-0.5" />}
              {group.label}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {group.features.map((feat) => {
              const planCheck = checkFeature(feat.key);
              const inPlan = planCheck.enabled;
              const positionEnabled = assignmentMap.get(feat.key);
              // Default: if no assignment, feature is allowed (permissive)
              const effectiveEnabled = positionEnabled !== undefined ? positionEnabled : true;

              return (
                <div
                  key={feat.key}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                    inPlan
                      ? "border-border bg-card hover:bg-muted/30"
                      : "border-dashed border-muted-foreground/20 bg-muted/10 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {feat.name_ar || feat.name}
                      </p>
                      <code className="text-[10px] text-muted-foreground">{feat.key}</code>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!inPlan ? (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        <span>غير متاح ضمن الباقة</span>
                      </div>
                    ) : (
                      <>
                        {effectiveEnabled && (
                          <CheckCircle className="h-3.5 w-3.5 text-primary" />
                        )}
                        <Switch
                          checked={effectiveEnabled}
                          onCheckedChange={(v) => toggleMutation.mutate({ featureKey: feat.key, enabled: v })}
                          disabled={!inPlan}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
