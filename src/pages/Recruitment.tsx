import { useState } from "react";
import {
  Plus, Briefcase, Users, Star, ArrowLeft, Sparkles, Brain, MessageSquare,
  BarChart3, UserCheck, FileText, Link2, Check, Archive, RotateCcw,
  History, UserPlus, Database, Eye, Download, Clock, ChevronDown, PieChart,
  CalendarDays, Shield, Send, BookOpen, Globe, Target, Building2,
} from "lucide-react";
import RecruitmentAnalytics from "@/components/recruitment/RecruitmentAnalytics";
import InterviewManager from "@/components/recruitment/InterviewManager";
import { HiringProcessGuide } from "@/components/recruitment/HiringProcessGuide";
import { ExternalAgencyMode } from "@/components/recruitment/ExternalAgencyMode";
import OfferManager from "@/components/recruitment/OfferManager";
import BackgroundCheckManager from "@/components/recruitment/BackgroundCheckManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { AiActionButton } from "@/components/ai/AiActionButton";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import AtsAiPanel from "@/components/recruitment/AtsAiPanel";
import { useRole } from "@/hooks/useRole";
import { useResolvedAccess } from "@/hooks/useResolvedAccess";
import { useCreateWorkflowInstance, useWorkflowInstanceByRef, workflowStatusLabels, workflowStatusColors } from "@/hooks/useApprovalWorkflow";
import { WorkflowStatusBadge } from "@/components/approvals/WorkflowStatusBadge";

const stageLabels: Record<string, string> = {
  applied: "مقدّم", screening: "فرز", interview: "مقابلة", offer_pending: "بانتظار الموافقة", offer: "عرض", hired: "معيّن", rejected: "مرفوض",
};
const stageColors: Record<string, string> = {
  applied: "bg-muted text-muted-foreground", screening: "bg-accent/10 text-accent-foreground",
  interview: "bg-primary/10 text-primary", offer_pending: "bg-warning/10 text-warning",
  offer: "bg-primary/20 text-primary",
  hired: "bg-primary/30 text-primary", rejected: "bg-destructive/10 text-destructive",
};
const statusLabels: Record<string, string> = { open: "مفتوحة", closed: "مغلقة", on_hold: "متوقفة" };
const empTypeLabels: Record<string, string> = { full_time: "دوام كامل", part_time: "دوام جزئي", contract: "عقد مؤقت", internship: "تدريب" };
const hiringSourceLabels: Record<string, string> = { external: "خارجي", internal: "داخلي", both: "داخلي وخارجي", agency: "وكالة توظيف" };

// Systematic stage flow - defines valid transitions
const STAGE_ORDER = ["applied", "screening", "interview", "offer", "hired"] as const;
const VALID_TRANSITIONS: Record<string, string[]> = {
  applied: ["screening", "rejected"],
  screening: ["interview", "rejected", "applied"],
  interview: ["offer", "rejected", "screening"],
  offer_pending: ["rejected", "interview"], // can only reject or revert while pending approval
  offer: ["hired", "rejected", "interview"],
  hired: ["rejected"],
  rejected: ["screening", "applied"], // reactivation
};

const getNextStage = (current: string): string | null => {
  const idx = STAGE_ORDER.indexOf(current as any);
  if (idx >= 0 && idx < STAGE_ORDER.length - 1) return STAGE_ORDER[idx + 1];
  return null;
};

const stageRequirements: Record<string, string> = {
  screening: "تقديم الطلب",
  interview: "اجتياز الفرز وتقييم أولي",
  offer: "إتمام مقابلة واحدة على الأقل مع تقييم",
  hired: "قبول عرض التوظيف",
};

export default function Recruitment() {
  const [jobDialog, setJobDialog] = useState(false);
  const [candidateDialog, setCandidateDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [empType, setEmpType] = useState("full_time");
  const [hiringSource, setHiringSource] = useState("external");
  const [aiJobTitle, setAiJobTitle] = useState("");
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [historyDialog, setHistoryDialog] = useState<any>(null);
  const [candidateDetail, setCandidateDetail] = useState<any>(null);
  const [convertDialog, setConvertDialog] = useState<any>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [activeTab, setActiveTab] = useState("jobs");
  const [interviewCandidate, setInterviewCandidate] = useState<any>(null);
  const [offerCandidate, setOfferCandidate] = useState<any>(null);
  const [bgCheckCandidate, setBgCheckCandidate] = useState<any>(null);
  const [skillCategoryFilter, setSkillCategoryFilter] = useState("all");
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { roles } = useRole();
  const { canAccess } = useResolvedAccess();
  const createWorkflow = useCreateWorkflowInstance();
  const isPlatformUser = roles.includes("super_admin") || roles.includes("business_admin");
  const showAgencyMode = isPlatformUser || canAccess("recruitment_agency");

  const getApplyLink = (jobId: string) => `${window.location.origin}/apply/${jobId}`;
  const copyLink = (jobId: string) => {
    navigator.clipboard.writeText(getApplyLink(jobId));
    setCopiedJobId(jobId);
    setTimeout(() => setCopiedJobId(null), 2000);
    toast({ title: "تم نسخ الرابط", description: "يمكنك مشاركته مع المتقدمين" });
  };

  // ─── Queries ───
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["recruitment-jobs", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("*, departments(name), branches(name)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Positions marked as "hiring" from the Org Chart
  const { data: hiringPositions = [] } = useQuery({
    queryKey: ["hiring-positions", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("positions")
        .select("id, title_ar, title_en, position_code, department_id, min_salary, max_salary, grade_level, description, job_description, departments(name)")
        .eq("company_id", companyId!)
        .eq("status", "hiring");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Filter out hiring positions that already have a linked recruitment job
  const linkedPositionIds = new Set(jobs.filter((j: any) => j.position_id).map((j: any) => j.position_id));
  const unlinkedHiringPositions = hiringPositions.filter((p: any) => !linkedPositionIds.has(p.id));

  const activeJobs = jobs.filter((j: any) => j.status !== "closed");
  const archivedJobs = jobs.filter((j: any) => j.status === "closed");

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates", companyId, selectedJob?.id],
    queryFn: async () => {
      let query = supabase.from("candidates").select("*, recruitment_jobs(title)").eq("company_id", companyId!);
      if (selectedJob) query = query.eq("job_id", selectedJob.id);
      const { data } = await query.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: allCandidatesForAnalytics = [] } = useQuery({
    queryKey: ["all-candidates-analytics", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("candidates").select("id, stage, source, created_at, updated_at").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId && activeTab === "analytics",
  });

  // Talent pool = ALL candidates + cross-ref with employees to show employment status
  const { data: talentPool = [] } = useQuery({
    queryKey: ["talent-pool", companyId],
    queryFn: async () => {
      const [{ data: cands }, { data: emps }] = await Promise.all([
        supabase.from("candidates").select("*, recruitment_jobs(title)").eq("company_id", companyId!).order("updated_at", { ascending: false }),
        supabase.from("employees").select("id, name_ar, email, status, position, department_id, departments(name)").eq("company_id", companyId!),
      ]);
      const empMap = new Map((emps || []).map((e: any) => [e.email?.toLowerCase(), e]));
      return (cands || []).map((c: any) => {
        const matchedEmp = c.email ? empMap.get(c.email.toLowerCase()) : null;
        return {
          ...c,
          employment_status: matchedEmp ? matchedEmp.status : null,
          current_position: matchedEmp ? matchedEmp.position : null,
          current_department: matchedEmp?.departments?.name || null,
        };
      });
    },
    enabled: !!companyId && activeTab === "talent_pool",
  });

  // Stage history for a specific candidate
  const { data: stageHistory = [] } = useQuery({
    queryKey: ["stage-history", historyDialog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidate_stage_history" as any)
        .select("*")
        .eq("candidate_id", historyDialog!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!historyDialog,
  });

  // ─── Mutations ───
  const addJob = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("recruitment_jobs").insert({
        company_id: companyId!,
        title: formData.get("title") as string,
        department_id: (formData.get("department_id") as string) || null,
        branch_id: (formData.get("branch_id") as string) || null,
        description: (formData.get("description") as string) || null,
        requirements: (formData.get("requirements") as string) || null,
        employment_type: empType,
        hiring_source: hiringSource,
        positions_count: Number(formData.get("positions_count")) || 1,
        closing_date: (formData.get("closing_date") as string) || null,
        salary_min: Number(formData.get("salary_min")) || null,
        salary_max: Number(formData.get("salary_max")) || null,
        requisition_notes: (formData.get("requisition_notes") as string) || null,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      toast({ title: "تم بنجاح", description: "تم إنشاء الوظيفة الشاغرة" });
      setJobDialog(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const addCandidate = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data, error } = await supabase.from("candidates").insert({
        company_id: companyId!,
        job_id: selectedJob.id,
        name: formData.get("name") as string,
        email: (formData.get("email") as string) || null,
        phone: (formData.get("phone") as string) || null,
        source: (formData.get("source") as string) || "direct",
        notes: (formData.get("notes") as string) || null,
      }).select().single();
      if (error) throw error;
      // Record initial stage
      await supabase.from("candidate_stage_history" as any).insert({
        candidate_id: data.id,
        to_stage: "applied",
        changed_by: user!.id,
        notes: "تقديم أولي",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast({ title: "تم بنجاح", description: "تم إضافة المرشح" });
      setCandidateDialog(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, stage, oldStage }: { id: string; stage: string; oldStage: string }) => {
      // Gate: moving to "offer" requires approval workflow
      if (stage === "offer") {
        // Create workflow instance for offer approval (manager + HR)
        await createWorkflow.mutateAsync({
          requestType: "offer_approval",
          referenceId: id,
          companyId: companyId!,
        });
        // Mark candidate as pending offer approval (keep in interview stage with a flag)
        await supabase.from("candidates").update({ stage: "offer_pending" as any }).eq("id", id);
        await supabase.from("candidate_stage_history" as any).insert({
          candidate_id: id,
          from_stage: oldStage,
          to_stage: "offer_pending",
          changed_by: user!.id,
          notes: "بانتظار موافقة المدير والموارد البشرية للانتقال لمرحلة العرض",
        });
        return; // Don't proceed further - wait for approval
      }

      const { error } = await supabase.from("candidates").update({ stage }).eq("id", id);
      if (error) throw error;
      // Record stage change
      await supabase.from("candidate_stage_history" as any).insert({
        candidate_id: id,
        from_stage: oldStage,
        to_stage: stage,
        changed_by: user!.id,
      });
      // Auto-close job and move other candidates to bank when someone is hired
      if (stage === "hired") {
        // Get the candidate's job_id
        const { data: hiredCandidate } = await supabase.from("candidates").select("job_id").eq("id", id).single();
        if (hiredCandidate?.job_id) {
          // Check positions count vs hired count
          const { data: jobData } = await supabase.from("recruitment_jobs").select("positions_count").eq("id", hiredCandidate.job_id).single();
          const { count: hiredCount } = await supabase.from("candidates").select("id", { count: "exact", head: true }).eq("job_id", hiredCandidate.job_id).eq("stage", "hired");
          if (hiredCount && jobData && hiredCount >= (jobData.positions_count || 1)) {
            // Close the job
            await supabase.from("recruitment_jobs").update({ status: "closed" }).eq("id", hiredCandidate.job_id);
            // Move remaining non-hired/non-rejected candidates to rejected (talent bank)
            const { data: remainingCandidates } = await supabase.from("candidates")
              .select("id, stage")
              .eq("job_id", hiredCandidate.job_id)
              .not("id", "eq", id)
              .not("stage", "in", '("hired","rejected")');
            if (remainingCandidates && remainingCandidates.length > 0) {
              const remainingIds = remainingCandidates.map((c: any) => c.id);
              await supabase.from("candidates").update({ stage: "rejected" }).in("id", remainingIds);
              // Record history for each
              const historyEntries = remainingCandidates.map((c: any) => ({
                candidate_id: c.id,
                from_stage: c.stage,
                to_stage: "rejected",
                changed_by: user!.id,
                notes: "نقل تلقائي لبنك المواهب - تم شغل الوظيفة",
              }));
              await supabase.from("candidate_stage_history" as any).insert(historyEntries);
            }
            toast({ title: "تم إغلاق الوظيفة", description: "تم شغل جميع المقاعد ونقل المرشحين المتبقين لبنك المواهب" });
          }
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
      if (vars.stage === "offer") {
        toast({ title: "تم إرسال طلب الموافقة", description: "سيتم نقل المرشح لمرحلة العرض بعد موافقة المدير والموارد البشرية" });
      } else {
        toast({ title: "تم التحديث" });
      }
    },
  });

  const updateRating = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: number }) => {
      const { error } = await supabase.from("candidates").update({ rating }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidates"] }),
  });

  const archiveJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.from("recruitment_jobs").update({ status: "closed" }).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      toast({ title: "تم الأرشفة", description: "تم نقل الوظيفة للأرشيف" });
    },
  });

  const reopenJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.from("recruitment_jobs").update({ status: "open" }).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      toast({ title: "تم إعادة الفتح" });
    },
  });

  const reactivateCandidate = useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId?: string }) => {
      const updates: any = { stage: "screening" };
      if (jobId) updates.job_id = jobId;
      const { error } = await supabase.from("candidates").update(updates).eq("id", id);
      if (error) throw error;
      await supabase.from("candidate_stage_history" as any).insert({
        candidate_id: id,
        from_stage: "rejected",
        to_stage: "screening",
        changed_by: user!.id,
        notes: "إعادة تفعيل من الأرشيف",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates", "talent-pool"] });
      toast({ title: "تم إعادة التفعيل" });
    },
  });

  // Convert hired candidate to employee
  const convertToEmployee = useMutation({
    mutationFn: async ({ candidate, salary, hireDate }: { candidate: any; salary: number; hireDate: string }) => {
      // Get job details for auto-assignment
      const { data: jobData } = await supabase.from("recruitment_jobs")
        .select("department_id, branch_id, title, position_id, positions_count")
        .eq("id", candidate.job_id)
        .single();

      const { data: empData, error } = await supabase.from("employees").insert({
        company_id: companyId!,
        name_ar: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        basic_salary: salary,
        hire_date: hireDate,
        position: jobData?.title || candidate.recruitment_jobs?.title || null,
        department_id: jobData?.department_id || null,
        branch_id: jobData?.branch_id || null,
        status: "active",
      }).select("id").single();
      if (error) throw error;

      // Auto-assign onboarding templates to new employee
      if (empData?.id) {
        const { data: templates, error: tplErr } = await supabase
          .from("onboarding_templates")
          .select("*")
          .eq("company_id", companyId!)
          .eq("is_active", true)
          .order("sort_order");
        if (tplErr) {
          console.error("Failed to fetch onboarding templates:", tplErr);
        } else if (templates && templates.length > 0) {
          const tasks = templates.map((t: any) => ({
            company_id: companyId!,
            employee_id: empData.id,
            title: t.title,
            description: t.description,
            task_type: t.task_type,
          }));
          const { error: taskErr } = await supabase.from("onboarding_tasks").insert(tasks);
          if (taskErr) console.error("Failed to create onboarding tasks:", taskErr);
        }
      }

      // Record in history
      await supabase.from("candidate_stage_history" as any).insert({
        candidate_id: candidate.id,
        from_stage: "hired",
        to_stage: "converted",
        changed_by: user!.id,
        notes: `تم التحويل لموظف براتب ${salary}`,
      });

      // === AUTO-CLOSE: Close job, move remaining to bank, update org chart ===
      if (candidate.job_id) {
        const { count: hiredCount } = await supabase
          .from("candidates")
          .select("id", { count: "exact", head: true })
          .eq("job_id", candidate.job_id)
          .eq("stage", "hired");

        if (hiredCount && jobData && hiredCount >= (jobData.positions_count || 1)) {
          // Close the recruitment job
          await supabase.from("recruitment_jobs").update({ status: "closed" }).eq("id", candidate.job_id);

          // Move remaining candidates to talent bank
          const { data: remainingCandidates } = await supabase.from("candidates")
            .select("id, stage")
            .eq("job_id", candidate.job_id)
            .not("id", "eq", candidate.id)
            .not("stage", "in", '("hired","rejected","converted")');
          if (remainingCandidates && remainingCandidates.length > 0) {
            const remainingIds = remainingCandidates.map((c: any) => c.id);
            await supabase.from("candidates").update({ stage: "rejected" }).in("id", remainingIds);
            const historyEntries = remainingCandidates.map((c: any) => ({
              candidate_id: c.id,
              from_stage: c.stage,
              to_stage: "rejected",
              changed_by: user!.id,
              notes: "نقل تلقائي لبنك المواهب - تم تعيين مرشح آخر",
            }));
            await supabase.from("candidate_stage_history" as any).insert(historyEntries);
          }

          // Update linked org chart position from "hiring" to "filled"
          if (jobData.position_id) {
            await supabase.from("positions").update({ status: "filled" }).eq("id", jobData.position_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-count"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      queryClient.invalidateQueries({ queryKey: ["hiring-positions"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-tasks"] });
      toast({ title: "تم بنجاح ✅", description: "تم إنشاء ملف الموظف وإغلاق الشاغر وتحديث الهيكل التنظيمي" });
      setConvertDialog(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Create recruitment job from a hiring position
  const createJobFromPosition = useMutation({
    mutationFn: async (pos: any) => {
      const { error } = await supabase.from("recruitment_jobs").insert({
        company_id: companyId!,
        title: pos.title_ar || pos.title_en || "منصب شاغر",
        department_id: pos.department_id || null,
        position_id: pos.id,
        salary_min: pos.min_salary || null,
        salary_max: pos.max_salary || null,
        description: pos.job_description || pos.description || null,
        position_description: pos.description || null,
        positions_count: 1,
        employment_type: "full_time",
        hiring_source: "external",
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["hiring-positions"] });
      toast({ title: "تم بنجاح", description: "تم إنشاء وظيفة شاغرة من الهيكل التنظيمي" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const openCount = activeJobs.filter((j: any) => j.status === "open").length;
  const totalCandidates = candidates.length;
  const hiredCount = candidates.filter((c: any) => c.stage === "hired").length;
  const interviewCount = candidates.filter((c: any) => c.stage === "interview").length;

  const pipelineContext = selectedJob
    ? `الوظيفة: ${selectedJob.title}\nالوصف: ${selectedJob.description || "لا يوجد"}\nالمتطلبات: ${selectedJob.requirements || "لا يوجد"}\nعدد المقاعد: ${selectedJob.positions_count}\n\nالمرشحون:\n${candidates.map((c: any) => `- ${c.name} | المرحلة: ${stageLabels[c.stage]} | التقييم: ${c.rating || "لم يقيّم"}/5 | المصدر: ${c.source} | ملاحظات: ${c.notes || "لا يوجد"}`).join("\n")}`
    : `الوظائف المفتوحة: ${openCount}\nإجمالي المرشحين: ${totalCandidates}\nالمعينون: ${hiredCount}\nفي المقابلات: ${interviewCount}\n\n${jobs.map((j: any) => `- ${j.title} (${statusLabels[j.status]}) - ${j.positions_count} مقعد`).join("\n")}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            نظام التوظيف (ATS)
            <Badge variant="outline" className="bg-primary/5 text-primary gap-1 font-normal text-xs">
              <Sparkles className="h-3 w-3" />
              مدعوم بالذكاء الاصطناعي
            </Badge>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {openCount} وظيفة مفتوحة • {totalCandidates} مرشح • {hiredCount} معيّن • {archivedJobs.length} مؤرشفة
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AiActionButton
            action="analyze_pipeline"
            context={pipelineContext}
            label="تحليل خط التوظيف"
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            dialogTitle="تحليل خط أنابيب التوظيف بالذكاء الاصطناعي"
          />
          <Dialog open={jobDialog} onOpenChange={setJobDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-heading"><Plus className="h-4 w-4" />إضافة وظيفة شاغرة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-heading">وظيفة شاغرة جديدة</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addJob.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>المسمى الوظيفي</Label>
                  <Input name="title" required value={aiJobTitle} onChange={(e) => setAiJobTitle(e.target.value)} />
                  {aiJobTitle && (
                    <AiActionButton
                      action="generate_job_description"
                      context={`المسمى الوظيفي: ${aiJobTitle}\nنوع التوظيف: ${empTypeLabels[empType]}`}
                      label="توليد وصف وظيفي بالذكاء الاصطناعي"
                      icon={<Sparkles className="h-3 w-3" />}
                      variant="ghost" size="sm"
                      dialogTitle={`وصف وظيفي: ${aiJobTitle}`}
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>القسم</Label>
                    <Select name="department_id">
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الفرع</Label>
                    <Select name="branch_id">
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع التوظيف</Label>
                    <Select value={empType} onValueChange={setEmpType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(empTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>مصدر التوظيف</Label>
                    <Select value={hiringSource} onValueChange={setHiringSource}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(hiringSourceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>عدد المقاعد</Label><Input name="positions_count" type="number" defaultValue={1} /></div>
                  <div className="space-y-2"><Label>تاريخ الإغلاق</Label><Input name="closing_date" type="date" dir="ltr" className="text-left" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>الحد الأدنى للراتب</Label><Input name="salary_min" type="number" placeholder="اختياري" dir="ltr" className="text-left" /></div>
                  <div className="space-y-2"><Label>الحد الأعلى للراتب</Label><Input name="salary_max" type="number" placeholder="اختياري" dir="ltr" className="text-left" /></div>
                </div>
                <div className="space-y-2"><Label>ملاحظات الطلب الوظيفي</Label><Textarea name="requisition_notes" rows={2} placeholder="مبررات الطلب، الميزانية..." /></div>
                <div className="space-y-2"><Label>الوصف</Label><Textarea name="description" rows={3} /></div>
                <div className="space-y-2"><Label>المتطلبات</Label><Textarea name="requirements" rows={3} /></div>
                <Button type="submit" className="w-full font-heading" disabled={addJob.isPending}>
                  {addJob.isPending ? "جاري الحفظ..." : "إنشاء الوظيفة"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <FeatureGate featureKey="hiring_strategy" compact>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm font-heading font-bold text-primary">
                <Brain className="h-4 w-4" />
                أدوات AI
              </div>
              <div className="h-4 w-px bg-primary/20" />
              {selectedJob ? (
                <>
                  <AiActionButton action="generate_job_description" context={`المسمى: ${selectedJob.title}\nالوصف الحالي: ${selectedJob.description || "لا يوجد"}\nالمتطلبات الحالية: ${selectedJob.requirements || "لا يوجد"}\nنوع التوظيف: ${selectedJob.employment_type ? empTypeLabels[selectedJob.employment_type] || selectedJob.employment_type : "غير محدد"}\nالقسم: ${selectedJob.departments?.name || "غير محدد"}\nعدد المقاعد: ${selectedJob.positions_count}\n\nتعليمات: أنشئ وصفاً وظيفياً مخصصاً لهذه الوظيفة تحديداً.`} label="توليد وصف وظيفي" icon={<FileText className="h-3 w-3" />} variant="ghost" size="sm" />
                  <AiActionButton action="generate_interview_questions" context={`الوظيفة: ${selectedJob.title}\nالوصف: ${selectedJob.description || "لا يوجد"}\nالمتطلبات: ${selectedJob.requirements || "لا يوجد"}\nنوع التوظيف: ${selectedJob.employment_type ? empTypeLabels[selectedJob.employment_type] || selectedJob.employment_type : "غير محدد"}\nالقسم: ${selectedJob.departments?.name || "غير محدد"}\n\nتعليمات: أنشئ أسئلة مقابلة مخصصة لهذه الوظيفة بناءً على وصفها ومتطلباتها.`} label="أسئلة مقابلة" icon={<MessageSquare className="h-3 w-3" />} variant="ghost" size="sm" />
                  {candidates.length > 0 && (
                    <AiActionButton action="rank_candidates" context={`الوظيفة: ${selectedJob.title}\nالوصف: ${selectedJob.description || "لا يوجد"}\nالمتطلبات: ${selectedJob.requirements || "لا يوجد"}\n\nالمرشحون:\n${candidates.map((c: any) => `- ${c.name} | المرحلة: ${stageLabels[c.stage]} | التقييم: ${c.rating || "؟"}/5 | المصدر: ${c.source} | ملخص: ${c.notes || "لا يوجد"}`).join("\n")}\n\nتعليمات: رتّب المرشحين بناءً على مطابقتهم لمتطلبات هذه الوظيفة.`} label="ترتيب المرشحين" icon={<UserCheck className="h-3 w-3" />} variant="ghost" size="sm" />
                  )}
                </>
              ) : (
                <>
                  <AiActionButton action="analyze_pipeline" context={pipelineContext} label="تحليل شامل" icon={<BarChart3 className="h-3 w-3" />} variant="ghost" size="sm" />
                  <span className="text-xs text-muted-foreground">اختر وظيفة لعرض أدوات AI المتقدمة</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </FeatureGate>

      {/* Hiring Positions from Org Chart */}
      {unlinkedHiringPositions.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-sm font-heading">مناصب مفتوحة للتوظيف من الهيكل التنظيمي</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {unlinkedHiringPositions.length} منصب بحاجة لإنشاء وظيفة شاغرة
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Building2 className="h-3 w-3" />
                {unlinkedHiringPositions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unlinkedHiringPositions.map((pos: any) => (
                <div
                  key={pos.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 hover:shadow-sm transition-shadow"
                >
                 <div className="min-w-0">
                    <p className="text-sm font-heading font-semibold text-foreground truncate">
                      {pos.title_ar || pos.title_en || "—"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      {pos.position_code && (
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{pos.position_code}</span>
                      )}
                      {pos.departments?.name && <span>{pos.departments.name}</span>}
                      {pos.grade_level && <span>درجة {pos.grade_level}</span>}
                    </div>
                    {(pos.description || pos.job_description) && (
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                        {pos.job_description || pos.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => createJobFromPosition.mutate(pos)}
                    disabled={createJobFromPosition.isPending}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    إنشاء شاغر
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="jobs" className="font-heading gap-1.5"><Briefcase className="h-3.5 w-3.5" />الوظائف</TabsTrigger>
          <TabsTrigger value="candidates" className="font-heading gap-1.5"><Users className="h-3.5 w-3.5" />المرشحون</TabsTrigger>
          <TabsTrigger value="pipeline" className="font-heading gap-1.5"><BarChart3 className="h-3.5 w-3.5" />خط التوظيف</TabsTrigger>
          <TabsTrigger value="talent_pool" className="font-heading gap-1.5"><Database className="h-3.5 w-3.5" />بنك المواهب</TabsTrigger>
          <TabsTrigger value="archive" className="font-heading gap-1.5"><Archive className="h-3.5 w-3.5" />الأرشيف</TabsTrigger>
          <TabsTrigger value="analytics" className="font-heading gap-1.5"><PieChart className="h-3.5 w-3.5" />تحليلات</TabsTrigger>
          <TabsTrigger value="ai_insights" className="font-heading gap-1.5"><Brain className="h-3.5 w-3.5" />ذكاء التوظيف</TabsTrigger>
          {showAgencyMode && <TabsTrigger value="agency" className="font-heading gap-1.5"><Globe className="h-3.5 w-3.5" />وكالة توظيف</TabsTrigger>}
          <TabsTrigger value="process_guide" className="font-heading gap-1.5"><BookOpen className="h-3.5 w-3.5" />دليل العملية</TabsTrigger>
        </TabsList>

        {/* ═══ Jobs Tab ═══ */}
        <TabsContent value="jobs">
          {activeJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeJobs.map((job: any) => (
                <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => { setSelectedJob(job); setActiveTab("candidates"); }}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-base">{job.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {job.departments?.name || "—"}
                          {job.branches?.name && ` • ${job.branches.name}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={job.status === "open" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                          {statusLabels[job.status] || job.status}
                        </Badge>
                        {job.hiring_source && job.hiring_source !== "external" && (
                          <Badge variant="secondary" className="text-[10px] h-4">
                            {hiringSourceLabels[job.hiring_source] || job.hiring_source}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <span>{job.positions_count} مقعد</span>
                      <span>{empTypeLabels[job.employment_type] || job.employment_type}</span>
                      {job.closing_date && <span>يغلق: {job.closing_date}</span>}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => copyLink(job.id)}>
                        {copiedJobId === job.id ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                        {copiedJobId === job.id ? "تم" : "رابط"}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => archiveJob.mutate(job.id)}>
                        <Archive className="h-3 w-3" />أرشفة
                      </Button>
                      <AiActionButton action="generate_interview_questions" context={`الوظيفة: ${job.title}\nالوصف: ${job.description || ""}\nالمتطلبات: ${job.requirements || ""}`} label="أسئلة" icon={<MessageSquare className="h-3 w-3" />} variant="ghost" size="sm" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد وظائف شاغرة نشطة</p>
              <p className="text-sm mt-1">أنشئ وظيفة شاغرة جديدة لبدء التوظيف</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ═══ Candidates Tab ═══ */}
        <TabsContent value="candidates">
          <div className="space-y-4">
            {selectedJob && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedJob(null)}><ArrowLeft className="h-4 w-4" /></Button>
                  <span className="font-heading font-bold">{selectedJob.title}</span>
                  <Badge variant="outline">{empTypeLabels[selectedJob.employment_type] || selectedJob.employment_type}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyLink(selectedJob.id)}>
                    {copiedJobId === selectedJob.id ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                    {copiedJobId === selectedJob.id ? "تم النسخ" : "رابط التقديم"}
                  </Button>
                  <AiActionButton action="generate_interview_questions" context={`الوظيفة: ${selectedJob.title}\nالوصف: ${selectedJob.description || ""}\nالمتطلبات: ${selectedJob.requirements || ""}`} label="أسئلة مقابلة AI" icon={<MessageSquare className="h-3.5 w-3.5" />} />
                  {candidates.length > 1 && (
                    <AiActionButton action="rank_candidates" context={`الوظيفة: ${selectedJob.title}\nوصف الوظيفة: ${selectedJob.description || "غير متوفر"}\nمتطلبات الوظيفة: ${selectedJob.requirements || "غير متوفر"}\nنوع التوظيف: ${selectedJob.employment_type ? empTypeLabels[selectedJob.employment_type] || selectedJob.employment_type : "غير محدد"}\n\nالمرشحون:\n${candidates.map((c: any) => `- ${c.name} | المرحلة: ${stageLabels[c.stage]} | التقييم: ${c.rating || "؟"}/5 | المصدر: ${c.source} | ملخص السيرة: ${c.notes || "لا يوجد"}`).join("\n")}\n\nتعليمات: رتّب المرشحين بناءً على مدى تطابقهم مع متطلبات ووصف هذه الوظيفة تحديداً.`} label="ترتيب AI" icon={<UserCheck className="h-3.5 w-3.5" />} />
                  )}
                  <Dialog open={candidateDialog} onOpenChange={setCandidateDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2 font-heading"><Plus className="h-4 w-4" />إضافة مرشح</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle className="font-heading">إضافة مرشح</DialogTitle></DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); addCandidate.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                        <div className="space-y-2"><Label>الاسم</Label><Input name="name" required /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label>البريد</Label><Input name="email" type="email" dir="ltr" className="text-left" /></div>
                          <div className="space-y-2"><Label>الهاتف</Label><Input name="phone" dir="ltr" className="text-left" /></div>
                        </div>
                        <div className="space-y-2">
                          <Label>المصدر</Label>
                          <Select name="source" defaultValue="direct">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="direct">مباشر</SelectItem>
                              <SelectItem value="referral">ترشيح</SelectItem>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
                              <SelectItem value="agency">وكالة</SelectItem>
                              <SelectItem value="job_board">موقع توظيف</SelectItem>
                              <SelectItem value="application_link">رابط التقديم</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>ملاحظات / ملخص السيرة</Label><Textarea name="notes" rows={3} placeholder="أدخل ملخص المؤهلات والخبرة لتفعيل فرز AI..." /></div>
                        <Button type="submit" className="w-full font-heading" disabled={addCandidate.isPending}>حفظ</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
            {candidates.length > 0 ? (
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الوظيفة</TableHead>
                      <TableHead>المصدر</TableHead>
                      <TableHead>المرحلة</TableHead>
                      <TableHead>التقييم</TableHead>
                      <TableHead>إجراء</TableHead>
                      <TableHead>أدوات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm">{c.recruitment_jobs?.title || "—"}</TableCell>
                        <TableCell className="text-sm">{c.source}</TableCell>
                        <TableCell><Badge variant="outline" className={stageColors[c.stage]}>{stageLabels[c.stage]}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <button key={s} onClick={() => updateRating.mutate({ id: c.id, rating: s })}>
                                <Star className={`h-3.5 w-3.5 transition-colors ${s <= (c.rating || 0) ? "fill-accent text-accent" : "text-muted hover:text-accent/50"}`} />
                              </button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getNextStage(c.stage) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] gap-1 text-primary font-medium"
                                onClick={() => updateStage.mutate({ id: c.id, stage: getNextStage(c.stage)!, oldStage: c.stage })}
                                title={`نقل إلى: ${stageLabels[getNextStage(c.stage)!]} — ${stageRequirements[getNextStage(c.stage)!] || ""}`}
                              >
                                <Check className="h-3 w-3" />
                                {stageLabels[getNextStage(c.stage)!]}
                              </Button>
                            )}
                            <Select value={c.stage} onValueChange={(v) => {
                              if (VALID_TRANSITIONS[c.stage]?.includes(v)) {
                                updateStage.mutate({ id: c.id, stage: v, oldStage: c.stage });
                              } else {
                                toast({ title: "انتقال غير مسموح", description: `لا يمكن الانتقال من "${stageLabels[c.stage]}" إلى "${stageLabels[v]}" مباشرة`, variant: "destructive" });
                              }
                            }}>
                              <SelectTrigger className="h-7 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(VALID_TRANSITIONS[c.stage] || []).map((k) => <SelectItem key={k} value={k}>{stageLabels[k]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {c.resume_path && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={async () => {
                                const { data } = await supabase.storage.from("resumes").createSignedUrl(c.resume_path, 300);
                                if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                                else toast({ title: "خطأ", description: "تعذر فتح السيرة الذاتية", variant: "destructive" });
                              }} title="السيرة الذاتية">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHistoryDialog(c)} title="سجل المراحل">
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInterviewCandidate(c)} title="المقابلات والتقييم">
                              <CalendarDays className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBgCheckCandidate(c)} title="التحقق من الخلفية">
                              <Shield className="h-3.5 w-3.5" />
                            </Button>
                            {(c.stage === "offer" || c.stage === "offer_pending" || c.stage === "interview") && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setOfferCandidate(c)} title="عرض التوظيف">
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {c.stage === "hired" && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setConvertDialog(c)} title="تحويل لموظف">
                                  <UserPlus className="h-3.5 w-3.5" />
                                </Button>
                                <AiActionButton
                                  action="recommend_alternatives"
                                  context={`المرشح المعيّن: ${c.name}\nالوظيفة: ${c.recruitment_jobs?.title || selectedJob?.title || ""}\nالوصف: ${selectedJob?.description || ""}\nالمتطلبات: ${selectedJob?.requirements || ""}\n\nالمرشحون الآخرون في نفس الوظيفة:\n${candidates.filter((x: any) => x.id !== c.id && !["hired", "rejected"].includes(x.stage)).map((x: any) => `- ${x.name} | المرحلة: ${stageLabels[x.stage]} | التقييم: ${x.rating || "؟"}/5 | المصدر: ${x.source} | ملاحظات: ${x.notes || "لا يوجد"}`).join("\n") || "لا يوجد مرشحون آخرون"}\n\nتعليمات: بناءً على المرشح المعيّن ومتطلبات الوظيفة، رشّح أفضل المرشحين البديلين لوظائف مشابهة مستقبلاً أو لبنك المواهب مع ذكر الأسباب.`}
                                  label=""
                                  icon={<Target className="h-3.5 w-3.5" />}
                                  variant="ghost"
                                  size="icon"
                                  dialogTitle={`ترشيحات AI بديلة`}
                                />
                              </>
                            )}
                            <AiActionButton
                              action="screen_candidate"
                              context={`الوظيفة المتقدم لها: ${c.recruitment_jobs?.title || selectedJob?.title || ""}\nوصف الوظيفة: ${selectedJob?.description || "غير متوفر"}\nمتطلبات الوظيفة: ${selectedJob?.requirements || "غير متوفر"}\nنوع التوظيف: ${selectedJob?.employment_type ? empTypeLabels[selectedJob.employment_type] || selectedJob.employment_type : "غير محدد"}\nعدد المقاعد: ${selectedJob?.positions_count || "غير محدد"}\n\nبيانات المرشح:\nالاسم: ${c.name}\nالبريد: ${c.email || "غير متوفر"}\nالهاتف: ${c.phone || "غير متوفر"}\nالمصدر: ${c.source}\nالمرحلة الحالية: ${stageLabels[c.stage]}\nالتقييم: ${c.rating || "لم يقيّم"}/5\nملخص السيرة/الملاحظات: ${c.notes || "لا يوجد"}\n\nتعليمات: قيّم المرشح بناءً على مدى تطابق مؤهلاته مع متطلبات هذه الوظيفة تحديداً.`}
                              label=""
                              icon={<Brain className="h-3.5 w-3.5" />}
                              variant="ghost"
                              size="icon"
                              dialogTitle={`فرز AI: ${c.name}`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            ) : (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-heading font-medium">{selectedJob ? "لا يوجد مرشحون لهذه الوظيفة" : "اختر وظيفة لعرض المرشحين"}</p>
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* ═══ Pipeline Tab ═══ */}
        <TabsContent value="pipeline">
          {selectedJob ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedJob(null)}><ArrowLeft className="h-4 w-4" /></Button>
                  <span className="font-heading font-bold">{selectedJob.title}</span>
                </div>
                <AiActionButton action="analyze_pipeline" context={pipelineContext} label="تحليل AI للخط" icon={<BarChart3 className="h-3.5 w-3.5" />} />
              </div>
              {/* Stage flow indicator */}
              <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/40 rounded-lg overflow-x-auto">
                {STAGE_ORDER.map((stage, idx) => {
                  const count = candidates.filter((c: any) => c.stage === stage).length;
                  return (
                    <div key={stage} className="flex items-center gap-1">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${count > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <span>{stageLabels[stage]}</span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1">{count}</Badge>
                      </div>
                      {idx < STAGE_ORDER.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                    </div>
                  );
                })}
                <div className="mr-2 flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-destructive/10 text-destructive font-medium">
                  مرفوض <Badge variant="outline" className="text-[9px] h-4 px-1">{candidates.filter((c: any) => c.stage === "rejected").length}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(stageLabels).map(([stage, label]) => {
                  const stageCandidates = candidates.filter((c: any) => c.stage === stage);
                  const next = getNextStage(stage);
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-heading font-bold text-muted-foreground">{label}</span>
                        <Badge variant="outline" className="text-[10px] h-5">{stageCandidates.length}</Badge>
                      </div>
                      {stageRequirements[stage] && (
                        <p className="text-[9px] text-muted-foreground/70 leading-tight">⚡ {stageRequirements[stage]}</p>
                      )}
                      <div className="space-y-2 min-h-[100px] p-2 rounded-lg bg-muted/30 border border-border/50">
                        {stageCandidates.map((c: any) => (
                          <Card key={c.id} className="p-2.5 cursor-pointer hover:shadow-sm" onClick={() => setHistoryDialog(c)}>
                            <p className="text-xs font-medium truncate">{c.name}</p>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={`h-2.5 w-2.5 ${s <= (c.rating || 0) ? "fill-accent text-accent" : "text-muted"}`} />
                                ))}
                              </div>
                              <div className="flex gap-0.5">
                                {next && (
                                  <Button variant="ghost" size="icon" className="h-5 w-5" title={`نقل إلى ${stageLabels[next]}`}
                                    onClick={(e) => { e.stopPropagation(); updateStage.mutate({ id: c.id, stage: next, oldStage: c.stage }); }}>
                                    <Check className="h-3 w-3 text-primary" />
                                  </Button>
                                )}
                                {stage === "hired" && (
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setConvertDialog(c); }}>
                                    <UserPlus className="h-3 w-3 text-primary" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">اختر وظيفة لعرض خط التوظيف</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ═══ Talent Pool Tab ═══ */}
        <TabsContent value="talent_pool">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="font-heading flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  بنك المواهب
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={skillCategoryFilter} onValueChange={setSkillCategoryFilter}>
                    <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="تصنيف المهارات" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع التصنيفات</SelectItem>
                      <SelectItem value="engineering">هندسة</SelectItem>
                      <SelectItem value="management">إدارة</SelectItem>
                      <SelectItem value="finance">مالية ومحاسبة</SelectItem>
                      <SelectItem value="sales">مبيعات وتسويق</SelectItem>
                      <SelectItem value="it">تقنية معلومات</SelectItem>
                      <SelectItem value="hr">موارد بشرية</SelectItem>
                      <SelectItem value="operations">عمليات</SelectItem>
                      <SelectItem value="design">تصميم</SelectItem>
                      <SelectItem value="legal">قانوني</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">{talentPool.length} مرشح</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const filteredPool = skillCategoryFilter === "all" ? talentPool : talentPool.filter((c: any) => c.skill_category === skillCategoryFilter);
                const skillCategoryLabels: Record<string, string> = {
                  engineering: "هندسة", management: "إدارة", finance: "مالية ومحاسبة",
                  sales: "مبيعات وتسويق", it: "تقنية معلومات", hr: "موارد بشرية",
                  operations: "عمليات", design: "تصميم", legal: "قانوني", other: "أخرى",
                };
                return filteredPool.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الوظيفة المتقدم لها</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead>المرحلة</TableHead>
                      <TableHead>حالة التوظيف</TableHead>
                      <TableHead>التقييم</TableHead>
                      <TableHead>الملفات</TableHead>
                      <TableHead>إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPool.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm">{c.recruitment_jobs?.title || "—"}</TableCell>
                        <TableCell>
                          <Select value={c.skill_category || undefined} onValueChange={async (v) => {
                            await supabase.from("candidates").update({ skill_category: v } as any).eq("id", c.id);
                            queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
                          }}>
                            <SelectTrigger className="h-7 w-28 text-[10px]"><SelectValue placeholder="تصنيف" /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(skillCategoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={stageColors[c.stage]}>{stageLabels[c.stage]}</Badge>
                        </TableCell>
                        <TableCell>
                          {c.employment_status === "active" ? (
                            <div>
                              <Badge className="bg-primary/10 text-primary text-[10px] gap-1">
                                <UserCheck className="h-2.5 w-2.5" />يعمل حالياً
                              </Badge>
                              {c.current_position && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{c.current_position}{c.current_department ? ` — ${c.current_department}` : ""}</p>
                              )}
                            </div>
                          ) : c.employment_status === "terminated" || c.employment_status === "resigned" ? (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                              سابقاً ({c.employment_status === "terminated" ? "منتهي" : "مستقيل"})
                            </Badge>
                          ) : c.stage === "hired" ? (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <Clock className="h-2.5 w-2.5" />معيّن - لم يُحوّل بعد
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">غير موظف</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`h-3 w-3 ${s <= (c.rating || 0) ? "fill-accent text-accent" : "text-muted"}`} />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                          {c.resume_path ? (
                            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-primary" onClick={async () => {
                              const { data } = await supabase.storage.from("resumes").createSignedUrl(c.resume_path, 300);
                              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                              else toast({ title: "خطأ", description: "تعذر فتح السيرة الذاتية", variant: "destructive" });
                            }}>
                              <Eye className="h-3 w-3" />CV
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => setBgCheckCandidate(c)} title="مستندات التحقق">
                            <Shield className="h-3 w-3" />
                          </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {c.stage === "rejected" && !c.employment_status && (
                              <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => reactivateCandidate.mutate({ id: c.id })}>
                                <RotateCcw className="h-3 w-3" />إعادة تفعيل
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHistoryDialog(c)}>
                              <History className="h-3 w-3" />
                            </Button>
                            <AiActionButton
                              action="screen_candidate"
                              context={`الوظيفة: ${c.recruitment_jobs?.title || ""}\n\nبيانات المرشح:\nالاسم: ${c.name}\nالبريد: ${c.email || "غير متوفر"}\nالمصدر: ${c.source}\nالمرحلة: ${stageLabels[c.stage]}\nملخص السيرة/الملاحظات: ${c.notes || "لا يوجد"}\n\nالوظائف المفتوحة حالياً:\n${activeJobs.map((j: any) => `- ${j.title}: ${j.description || ""} | المتطلبات: ${j.requirements || ""}`).join("\n")}\n\nتعليمات: قيّم مدى ملاءمة هذا المرشح للوظائف المفتوحة حالياً.`}
                              label=""
                              icon={<Brain className="h-3 w-3" />}
                              variant="ghost"
                              size="icon"
                              dialogTitle={`تقييم مرشح: ${c.name}`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-heading font-medium">بنك المواهب فارغ</p>
                  <p className="text-sm mt-1">سيظهر هنا جميع المرشحين مع سيرهم الذاتية</p>
                </div>
              );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Archive Tab ═══ */}
        <TabsContent value="archive">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Archive className="h-5 w-5" />
                الوظائف المؤرشفة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {archivedJobs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المسمى</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المقاعد</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead>إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedJobs.map((job: any) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{job.departments?.name || "—"}</TableCell>
                        <TableCell>{empTypeLabels[job.employment_type] || job.employment_type}</TableCell>
                        <TableCell>{job.positions_count}</TableCell>
                        <TableCell className="text-sm">{new Date(job.created_at).toLocaleDateString("ar-IQ")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => reopenJob.mutate(job.id)}>
                              <RotateCcw className="h-3 w-3" />إعادة فتح
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => { setSelectedJob(job); setActiveTab("candidates"); }}>
                              <Eye className="h-3 w-3" />المرشحون
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-heading font-medium">لا توجد وظائف مؤرشفة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Analytics Tab ═══ */}
        <TabsContent value="analytics">
          <RecruitmentAnalytics jobs={jobs} candidates={allCandidatesForAnalytics} />
        </TabsContent>

        {/* ═══ AI Insights Tab ═══ */}
        <TabsContent value="ai_insights">
          <AtsAiPanel
            selectedJob={selectedJob}
            candidates={candidates}
            jobs={jobs}
            pipelineContext={pipelineContext}
          />
        </TabsContent>

        {/* ═══ Agency Mode Tab ═══ */}
        {showAgencyMode && (
          <TabsContent value="agency">
            <ExternalAgencyMode />
          </TabsContent>
        )}

        {/* ═══ Process Guide Tab ═══ */}
        <TabsContent value="process_guide">
          <HiringProcessGuide />
        </TabsContent>
      </Tabs>

      {/* ═══ Stage History Dialog ═══ */}
      <Dialog open={!!historyDialog} onOpenChange={() => setHistoryDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <History className="h-5 w-5" />
              سجل مراحل: {historyDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Candidate info */}
            <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-3 rounded-lg">
              <div><span className="text-muted-foreground">البريد: </span>{historyDialog?.email || "—"}</div>
              <div><span className="text-muted-foreground">الهاتف: </span>{historyDialog?.phone || "—"}</div>
              <div><span className="text-muted-foreground">المصدر: </span>{historyDialog?.source || "—"}</div>
              <div><span className="text-muted-foreground">المرحلة الحالية: </span>
                <Badge variant="outline" className={stageColors[historyDialog?.stage]}>{stageLabels[historyDialog?.stage] || historyDialog?.stage}</Badge>
              </div>
              {historyDialog?.resume_path && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">السيرة الذاتية: </span>
                  <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-primary/10" onClick={async () => {
                    const { data } = await supabase.storage.from("resumes").createSignedUrl(historyDialog.resume_path, 300);
                    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                    else toast({ title: "خطأ", description: "تعذر فتح السيرة الذاتية", variant: "destructive" });
                  }}>
                    <Download className="h-3 w-3" />عرض السيرة الذاتية
                  </Badge>
                </div>
              )}
            </div>
            {historyDialog?.notes && (
              <div className="text-sm bg-muted/20 p-3 rounded-lg">
                <span className="text-muted-foreground font-medium">ملاحظات:</span>
                <p className="mt-1 whitespace-pre-line text-xs">{historyDialog.notes}</p>
              </div>
            )}
            <Separator />
            <h4 className="font-heading font-bold text-sm">سجل الانتقالات</h4>
            <ScrollArea className="max-h-[300px]">
              {stageHistory.length > 0 ? (
                <div className="space-y-2">
                  {stageHistory.map((h: any) => (
                    <div key={h.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/20">
                      <div className="mt-1"><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          {h.from_stage && <Badge variant="outline" className="text-[10px] h-5">{stageLabels[h.from_stage] || h.from_stage}</Badge>}
                          {h.from_stage && <span className="text-muted-foreground">←</span>}
                          <Badge variant="outline" className={`text-[10px] h-5 ${stageColors[h.to_stage] || ""}`}>{stageLabels[h.to_stage] || h.to_stage}</Badge>
                        </div>
                        {h.notes && <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(h.created_at).toLocaleString("ar-IQ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا يوجد سجل بعد</p>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Convert to Employee Dialog ═══ */}
      <Dialog open={!!convertDialog} onOpenChange={() => setConvertDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              تحويل لموظف: {convertDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            convertToEmployee.mutate({
              candidate: convertDialog,
              salary: Number(fd.get("salary")) || 0,
              hireDate: (fd.get("hire_date") as string) || new Date().toISOString().split("T")[0],
            });
          }} className="space-y-4">
            <div className="bg-muted/30 p-3 rounded-lg text-sm space-y-1">
              <p><span className="text-muted-foreground">الاسم:</span> {convertDialog?.name}</p>
              <p><span className="text-muted-foreground">البريد:</span> {convertDialog?.email || "—"}</p>
              <p><span className="text-muted-foreground">الوظيفة:</span> {convertDialog?.recruitment_jobs?.title || "—"}</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-sm">
              <p className="font-heading font-semibold text-xs text-primary mb-1">تعيين تلقائي</p>
              <p className="text-muted-foreground text-xs">
                سيتم تعيين الموظف تلقائياً في القسم والفرع المحدد في الوظيفة الشاغرة، وستبدأ مهام التأهيل (Onboarding) فوراً.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الراتب الأساسي</Label>
                <Input name="salary" type="number" required placeholder="0" dir="ltr" className="text-left" />
              </div>
              <div className="space-y-2">
                <Label>تاريخ التعيين</Label>
                <Input name="hire_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} dir="ltr" className="text-left" />
              </div>
            </div>
            <Button type="submit" className="w-full font-heading gap-2" disabled={convertToEmployee.isPending}>
              {convertToEmployee.isPending ? "جاري الإنشاء..." : <><UserPlus className="h-4 w-4" />إنشاء ملف الموظف</>}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {/* ═══ Interview Manager ═══ */}
      {interviewCandidate && (
        <InterviewManager
          candidateId={interviewCandidate.id}
          candidateName={interviewCandidate.name}
          jobId={interviewCandidate.job_id || selectedJob?.id}
          jobTitle={interviewCandidate.recruitment_jobs?.title || selectedJob?.title || ""}
          open={!!interviewCandidate}
          onOpenChange={() => setInterviewCandidate(null)}
        />
      )}

      {/* ═══ Offer Manager ═══ */}
      {offerCandidate && (
        <OfferManager
          candidateId={offerCandidate.id}
          candidateName={offerCandidate.name}
          jobId={offerCandidate.job_id || selectedJob?.id}
          jobTitle={offerCandidate.recruitment_jobs?.title || selectedJob?.title || ""}
          open={!!offerCandidate}
          onOpenChange={() => setOfferCandidate(null)}
        />
      )}

      {/* ═══ Background Check Manager ═══ */}
      {bgCheckCandidate && (
        <BackgroundCheckManager
          candidateId={bgCheckCandidate.id}
          candidateName={bgCheckCandidate.name}
          candidateEmail={bgCheckCandidate.email}
          candidatePhone={bgCheckCandidate.phone}
          open={!!bgCheckCandidate}
          onOpenChange={() => setBgCheckCandidate(null)}
        />
      )}
    </div>
  );
}
