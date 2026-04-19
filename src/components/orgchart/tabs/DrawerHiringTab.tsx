import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  UserPlus, Target, TrendingUp, ShieldCheck, Briefcase, Save, FileText,
  ExternalLink, Link2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import PositionTalentTab from "./PositionTalentTab";
import type { OrgNodeData } from "../OrgChartNode";

interface Props {
  positionId: string;
  companyId: string;
  node: OrgNodeData;
  onAssignEmployee?: (positionId: string, title: string) => void;
}

export default function DrawerHiringTab({ positionId, companyId, node, onAssignEmployee }: Props) {
  const queryClient = useQueryClient();
  const { hasRole } = useRole();
  const canEdit = hasRole("hr_manager") || hasRole("admin") || hasRole("tenant_admin");

  const isVacant = node.status === "vacant" || node.status === "hiring";

  // Fetch position full data including description & job_description
  const { data: positionData } = useQuery({
    queryKey: ["position-hiring-detail", positionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("positions")
        .select("description, job_description, title_ar, min_salary, max_salary, grade_level, department_id")
        .eq("id", positionId)
        .single();
      return data;
    },
    enabled: !!positionId,
  });

  // Fetch linked recruitment job
  const { data: linkedJob } = useQuery({
    queryKey: ["linked-recruitment-job", positionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("id, title, status, description, requirements")
        .eq("position_id", positionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!positionId,
  });

  const [jobDesc, setJobDesc] = useState("");
  const [posDesc, setPosDesc] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form values from DB
  if (positionData && !initialized) {
    setJobDesc(positionData.job_description || "");
    setPosDesc(positionData.description || "");
    setInitialized(true);
  }

  // Save description
  const saveDesc = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("positions")
        .update({
          description: posDesc || null,
          job_description: jobDesc || null,
        })
        .eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-hiring-detail"] });
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم حفظ الوصف الوظيفي" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  // Toggle hiring status
  const toggleHiring = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("positions")
        .update({ status: newStatus })
        .eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم تحديث حالة التوظيف" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  // Create recruitment job from this position
  const createJobMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("recruitment_jobs").insert({
        company_id: companyId,
        title: positionData?.title_ar || node.label,
        department_id: positionData?.department_id || null,
        position_id: positionId,
        salary_min: positionData?.min_salary || null,
        salary_max: positionData?.max_salary || null,
        description: positionData?.job_description || positionData?.description || null,
        position_description: positionData?.description || null,
        positions_count: 1,
        employment_type: "full_time",
        hiring_source: "external",
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linked-recruitment-job"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["hiring-positions"] });
      toast({ title: "تم إنشاء الشاغر الوظيفي في نظام التوظيف" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  if (!canEdit) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">ليس لديك صلاحية تعديل إعدادات التوظيف</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        تحكم بحالة التوظيف لهذا المنصب وحدد الوصف الوظيفي والمتطلبات.
      </p>

      {/* Hiring Status Card */}
      <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">حالة التوظيف</span>
          </div>
          <Badge variant={node.status === "hiring" ? "default" : node.status === "vacant" ? "secondary" : "outline"}>
            {node.status === "hiring" ? "قيد التوظيف" : node.status === "vacant" ? "شاغر" : node.status === "filled" ? "مشغول" : node.status || "—"}
          </Badge>
        </div>

        <div className="flex gap-2">
          {isVacant && node.status !== "hiring" && (
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => toggleHiring.mutate("hiring")}
              disabled={toggleHiring.isPending}
            >
              <UserPlus className="h-3.5 w-3.5" />
              فتح شاغر للتوظيف
            </Button>
          )}
          {node.status === "hiring" && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => toggleHiring.mutate("vacant")}
              disabled={toggleHiring.isPending}
            >
              إلغاء التوظيف
            </Button>
          )}
          {isVacant && onAssignEmployee && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => onAssignEmployee(positionId, node.label)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              تعيين موظف
            </Button>
          )}
        </div>
      </div>

      {/* Linked Recruitment Job */}
      {linkedJob ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">مرتبط بوظيفة شاغرة</span>
            </div>
            <Badge variant={linkedJob.status === "open" ? "default" : "secondary"} className="text-[10px]">
              {linkedJob.status === "open" ? "مفتوحة" : "مغلقة"}
            </Badge>
          </div>
          <p className="text-sm font-heading font-semibold text-foreground">{linkedJob.title}</p>
          {linkedJob.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2">{linkedJob.description}</p>
          )}
        </div>
      ) : node.status === "hiring" ? (
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          onClick={() => createJobMutation.mutate()}
          disabled={createJobMutation.isPending}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {createJobMutation.isPending ? "جاري الإنشاء..." : "إنشاء شاغر في نظام التوظيف"}
        </Button>
      ) : null}

      <Separator />

      {/* Position Description & Job Description */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-semibold text-foreground">الوصف الوظيفي</span>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px]">وصف المنصب</Label>
          <Textarea
            value={posDesc}
            onChange={(e) => setPosDesc(e.target.value)}
            placeholder="وصف المنصب والمسؤوليات..."
            rows={3}
            className="text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px]">الوصف الوظيفي التفصيلي (يُنشر في إعلان التوظيف)</Label>
          <Textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="المؤهلات المطلوبة، الخبرات، المهام..."
            rows={4}
            className="text-sm"
          />
        </div>
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={() => saveDesc.mutate()}
          disabled={saveDesc.isPending}
        >
          <Save className="h-3.5 w-3.5" />
          {saveDesc.isPending ? "جاري الحفظ..." : "حفظ الوصف"}
        </Button>
      </div>

      <Separator />

      {/* KPI section */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-semibold text-foreground">مؤشرات الأداء (KPI)</span>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 text-center">
          <TrendingUp className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1.5" />
          <p className="text-[11px] text-muted-foreground">يتم ربط مؤشرات الأداء تلقائياً عبر وحدة التقييم</p>
        </div>
      </div>

      <Separator />

      {/* Requirements - reuse existing PositionTalentTab */}
      <PositionTalentTab positionId={positionId} companyId={companyId} />
    </div>
  );
}
