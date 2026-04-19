import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { AiActionButton } from "@/components/ai/AiActionButton";
import {
  Users, Calendar, Clock, MapPin, Star, FileText, CheckCircle2,
  ChevronDown, ChevronUp, ArrowRight, Send,
} from "lucide-react";

const typeLabels: Record<string, string> = {
  in_person: "حضوري", video: "فيديو", phone: "هاتفي", panel: "لجنة",
};

export default function InterviewEvaluation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const interviewId = searchParams.get("interview_id");
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showQuestions, setShowQuestions] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch interview details
  const { data: interview, isLoading: loadingInterview } = useQuery({
    queryKey: ["interview-eval", interviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_schedules" as any)
        .select("*")
        .eq("id", interviewId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!interviewId,
  });

  // Fetch candidate info
  const { data: candidate } = useQuery({
    queryKey: ["candidate-eval", interview?.candidate_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates")
        .select("id, name, email, phone, stage, source, notes")
        .eq("id", interview.candidate_id)
        .single();
      return data;
    },
    enabled: !!interview?.candidate_id,
  });

  // Fetch job info
  const { data: job } = useQuery({
    queryKey: ["job-eval", interview?.job_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("id, title, department_id, requirements, employment_type")
        .eq("id", interview.job_id)
        .single();
      return data;
    },
    enabled: !!interview?.job_id,
  });

  // Check if this interviewer already submitted a scorecard
  const { data: existingScorecard } = useQuery({
    queryKey: ["existing-scorecard", interviewId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("interview_scorecards" as any)
        .select("*")
        .eq("interview_id", interviewId!)
        .eq("company_id", companyId!);
      return (data as any[]) || [];
    },
    enabled: !!interviewId && !!companyId,
  });

  // Get current employee name
  const { data: currentEmployee } = useQuery({
    queryKey: ["my-employee", user?.id, companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("name_ar, position")
        .eq("user_id", user!.id)
        .eq("company_id", companyId!)
        .single();
      return data;
    },
    enabled: !!user?.id && !!companyId,
  });

  const submitScorecard = useMutation({
    mutationFn: async (fd: FormData) => {
      const recommendation = fd.get("recommendation") as string || "neutral";
      const { error } = await supabase.from("interview_scorecards" as any).insert({
        company_id: companyId!,
        candidate_id: interview.candidate_id,
        interview_id: interviewId,
        interviewer_name: fd.get("interviewer_name") as string,
        technical_score: Number(fd.get("technical")) || null,
        communication_score: Number(fd.get("communication")) || null,
        cultural_fit_score: Number(fd.get("cultural_fit")) || null,
        experience_score: Number(fd.get("experience")) || null,
        overall_score: Number(fd.get("overall")) || null,
        strengths: (fd.get("strengths") as string) || null,
        weaknesses: (fd.get("weaknesses") as string) || null,
        recommendation,
        notes: (fd.get("notes") as string) || null,
      });
      if (error) throw error;

      // Auto-advance candidate if recommendation is "hire"
      if (recommendation === "hire") {
        const { data: cand } = await supabase.from("candidates").select("stage").eq("id", interview.candidate_id).single();
        if (cand?.stage === "interview") {
          await supabase.from("candidates").update({ stage: "offer" }).eq("id", interview.candidate_id);
          await supabase.from("candidate_stage_history" as any).insert({
            candidate_id: interview.candidate_id,
            from_stage: "interview",
            to_stage: "offer",
            changed_by: user!.id,
            notes: "ترقية تلقائية - توصية بالتوظيف من المقابِل",
          });
        }
      }

      // Mark interview as completed
      await supabase.from("interview_schedules" as any)
        .update({ status: "completed" })
        .eq("id", interviewId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["existing-scorecard"] });
      queryClient.invalidateQueries({ queryKey: ["interview-eval"] });
      toast({ title: "تم إرسال التقييم بنجاح ✅", description: "شكراً لمساهمتك في عملية التوظيف" });
      setSubmitted(true);
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  if (!interviewId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <p className="text-muted-foreground">رابط غير صالح - لم يتم تحديد معرف المقابلة</p>
          <Button className="mt-4" onClick={() => navigate("/notifications")}>العودة للإشعارات</Button>
        </Card>
      </div>
    );
  }

  if (loadingInterview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground animate-pulse">جاري تحميل بيانات المقابلة...</p>
      </div>
    );
  }

  if (submitted || (existingScorecard && existingScorecard.length > 0)) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="font-heading text-xl font-bold mb-2">تم إرسال التقييم</h2>
          <p className="text-muted-foreground mb-6">
            شكراً لك! تم تسجيل تقييمك للمرشح وسيتم مراجعته من قبل فريق التوظيف.
          </p>
          {existingScorecard && existingScorecard.length > 0 && (
            <div className="text-right space-y-2 bg-muted/50 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-sm">ملخص تقييمك:</h3>
              {existingScorecard.map((sc: any) => (
                <div key={sc.id} className="text-sm text-muted-foreground">
                  <span>الإجمالي: <strong>{sc.overall_score || "—"}/5</strong></span>
                  <span className="mx-2">•</span>
                  <span>التوصية: <Badge variant={sc.recommendation === "hire" ? "default" : sc.recommendation === "reject" ? "destructive" : "secondary"} className="text-[10px]">
                    {sc.recommendation === "hire" ? "توظيف" : sc.recommendation === "reject" ? "رفض" : "محايد"}
                  </Badge></span>
                </div>
              ))}
            </div>
          )}
          <Button onClick={() => navigate("/notifications")}>العودة للإشعارات</Button>
        </Card>
      </div>
    );
  }

  const scheduledDate = interview ? new Date(interview.scheduled_at) : null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6 text-primary" />
          نموذج تقييم المقابلة
        </h1>
        <p className="text-muted-foreground text-sm mt-1">يرجى تعبئة النموذج التالي بعد إجراء المقابلة</p>
      </div>

      {/* Interview & Candidate Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            تفاصيل المقابلة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">المرشح:</span>
              <p className="font-bold">{candidate?.name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">الوظيفة:</span>
              <p className="font-bold">{job?.title || "—"}</p>
            </div>
            {scheduledDate && (
              <>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {scheduledDate.toLocaleDateString("ar-IQ")}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {scheduledDate.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </>
            )}
            {interview?.interview_type && (
              <div>
                <span className="text-muted-foreground">النوع:</span>
                <Badge variant="outline" className="mr-1 text-[10px]">{typeLabels[interview.interview_type] || interview.interview_type}</Badge>
              </div>
            )}
            {interview?.location && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {interview.location}
              </div>
            )}
          </div>
          {interview?.notes && (
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <p className="font-bold text-xs mb-1">ملاحظات / تعليمات:</p>
              <p className="text-muted-foreground">{interview.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggested Questions */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowQuestions(!showQuestions)}>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              أسئلة مقترحة للمقابلة
            </span>
            {showQuestions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {showQuestions && (
          <CardContent>
            <AiActionButton
              action="generate_interview_questions"
              context={`المرشح: ${candidate?.name || "غير محدد"}\nالوظيفة: ${job?.title || "غير محدد"}\nنوع المقابلة: ${typeLabels[interview?.interview_type] || "غير محدد"}\n${job?.requirements ? `المتطلبات: ${job.requirements}` : ""}\n\nأنشئ 8-10 أسئلة مقابلة مخصصة تغطي: المهارات التقنية، التواصل، الملاءمة الثقافية، والخبرة العملية.`}
              label="توليد أسئلة بالذكاء الاصطناعي"
              icon={<FileText className="h-3 w-3" />}
              variant="outline"
              size="sm"
            />
          </CardContent>
        )}
      </Card>

      <Separator />

      {/* Scorecard Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            بطاقة التقييم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); submitScorecard.mutate(new FormData(e.currentTarget)); }} className="space-y-5">
            <div className="space-y-2">
              <Label>اسم المقيّم</Label>
              <Input
                name="interviewer_name"
                required
                defaultValue={currentEmployee?.name_ar || ""}
                placeholder="اسمك الكامل"
              />
            </div>

            <div>
              <Label className="mb-2 block">التقييمات (1-5)</Label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: "technical", label: "تقني" },
                  { name: "communication", label: "تواصل" },
                  { name: "cultural_fit", label: "ثقافي" },
                  { name: "experience", label: "خبرة" },
                  { name: "overall", label: "إجمالي" },
                ].map((f) => (
                  <div key={f.name} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                    <Select name={f.name}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((v) => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نقاط القوة</Label>
                <Textarea name="strengths" rows={3} placeholder="ما الذي أبدع فيه المرشح؟" />
              </div>
              <div className="space-y-2">
                <Label>نقاط الضعف</Label>
                <Textarea name="weaknesses" rows={3} placeholder="أين يحتاج للتحسين؟" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>التوصية</Label>
              <Select name="recommendation" defaultValue="neutral">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hire">توظيف ✅</SelectItem>
                  <SelectItem value="neutral">محايد ⚪</SelectItem>
                  <SelectItem value="reject">رفض ❌</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات إضافية</Label>
              <Textarea name="notes" rows={3} placeholder="أي ملاحظات أخرى عن المرشح..." />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={submitScorecard.isPending}>
              <Send className="h-4 w-4" />
              {submitScorecard.isPending ? "جاري الإرسال..." : "إرسال التقييم"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
