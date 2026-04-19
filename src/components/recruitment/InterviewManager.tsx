import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Plus, Users, Star, Bell, FileText, Send, Copy, Mail } from "lucide-react";
import { AiActionButton } from "@/components/ai/AiActionButton";
import { InterviewerAutocomplete } from "@/components/recruitment/InterviewerAutocomplete";
import { Separator } from "@/components/ui/separator";

interface Props {
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeLabels: Record<string, string> = {
  in_person: "حضوري", video: "فيديو", phone: "هاتفي", panel: "لجنة",
};

const statusLabels: Record<string, string> = {
  scheduled: "مجدولة", completed: "مكتملة", cancelled: "ملغاة", no_show: "لم يحضر",
};

export default function InterviewManager({ candidateId, candidateName, jobId, jobTitle, open, onOpenChange }: Props) {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [scheduleForm, setScheduleForm] = useState(false);
  const [scorecardForm, setScorecardForm] = useState<string | null>(null);
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);
  const [externalInviteDialog, setExternalInviteDialog] = useState<string | null>(null);

  // Fetch employees for interviewer selection
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-interview", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name_ar, user_id, email, position")
        .eq("company_id", companyId!)
        .eq("status", "active")
        .order("name_ar");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ["interviews", candidateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("interview_schedules" as any)
        .select("*")
        .eq("candidate_id", candidateId)
        .order("scheduled_at", { ascending: true });
      return data || [];
    },
    enabled: open && !!candidateId,
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ["scorecards", candidateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("interview_scorecards" as any)
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: open && !!candidateId,
  });

  const scheduleInterview = useMutation({
    mutationFn: async (fd: FormData) => {
      const interviewerNames = (fd.get("interviewers") as string).split(",").map(s => s.trim()).filter(Boolean);
      const scheduledAt = fd.get("scheduled_at") as string;
      const interviewType = fd.get("type") as string;
      const duration = Number(fd.get("duration")) || 60;
      const location = (fd.get("location") as string) || null;
      const notes = (fd.get("notes") as string) || null;

      const { data: interview, error } = await supabase.from("interview_schedules" as any).insert({
        company_id: companyId!,
        candidate_id: candidateId,
        job_id: jobId,
        interview_type: interviewType,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        location,
        interviewer_names: interviewerNames,
        notes,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;

      const interviewRecord = interview as any;
      const evalLink = `/interview-evaluation?interview_id=${interviewRecord.id}`;

      // Send internal notifications to interviewers (match by name)
      const scheduledDate = new Date(scheduledAt);
      const dateStr = scheduledDate.toLocaleDateString("ar-IQ");
      const timeStr = scheduledDate.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });

      for (const name of interviewerNames) {
        const matchedEmployee = employees.find(e =>
          e.name_ar?.includes(name) || name.includes(e.name_ar || "")
        );
        if (matchedEmployee?.user_id) {
          try {
            await supabase.from("notifications").insert({
              company_id: companyId!,
              user_id: matchedEmployee.user_id,
              title: "📋 مقابلة مجدولة - يرجى التقييم",
              message: `لديك مقابلة مع المرشح "${candidateName}" لوظيفة "${jobTitle || "غير محدد"}" بتاريخ ${dateStr} الساعة ${timeStr}. النوع: ${typeLabels[interviewType] || interviewType}. المكان: ${location || "غير محدد"}. المدة: ${duration} دقيقة.${notes ? ` ملاحظات: ${notes}` : ""}\n\n📝 اضغط هنا لتعبئة نموذج التقييم`,
              type: "info",
              link: evalLink,
            });
          } catch { /* non-critical */ }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews", candidateId] });
      toast({ title: "تم جدولة المقابلة", description: "تم إرسال إشعارات للمقابِلين" });
      setScheduleForm(false);
      setSelectedInterviewers([]);
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateInterviewStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("interview_schedules" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["interviews", candidateId] }),
  });

  const addScorecard = useMutation({
    mutationFn: async (fd: FormData) => {
      const recommendation = fd.get("recommendation") as string || "neutral";
      const { error } = await supabase.from("interview_scorecards" as any).insert({
        company_id: companyId!,
        candidate_id: candidateId,
        interview_id: scorecardForm !== "new" ? scorecardForm : null,
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

      // Auto-advance: if recommendation is "hire", move candidate from interview → offer
      if (recommendation === "hire") {
        const { data: candidate } = await supabase.from("candidates").select("stage").eq("id", candidateId).single();
        if (candidate?.stage === "interview") {
          await supabase.from("candidates").update({ stage: "offer" }).eq("id", candidateId);
          await supabase.from("candidate_stage_history" as any).insert({
            candidate_id: candidateId,
            from_stage: "interview",
            to_stage: "offer",
            changed_by: user!.id,
            notes: "ترقية تلقائية - توصية بالتوظيف من المقابِل",
          });
        }
      }
    },
    onSuccess: (_, fd) => {
      queryClient.invalidateQueries({ queryKey: ["scorecards", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      const rec = fd.get("recommendation") as string;
      if (rec === "hire") {
        toast({ title: "تم حفظ التقييم ✅", description: "تم نقل المرشح تلقائياً لمرحلة 'عرض'" });
      } else {
        toast({ title: "تم حفظ التقييم" });
      }
      setScorecardForm(null);
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const avgScore = scorecards.length > 0
    ? (scorecards.reduce((sum: number, s: any) => sum + (s.overall_score || 0), 0) / scorecards.length).toFixed(1)
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Users className="h-5 w-5" />
            المقابلات والتقييم: {candidateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Interview Questions */}
          <div className="flex flex-wrap gap-2">
            <AiActionButton
              action="generate_interview_questions"
              context={`المرشح: ${candidateName}\nالوظيفة: ${jobTitle || "غير محدد"}\n\nتعليمات: أنشئ أسئلة مقابلة مخصصة لتقييم هذا المرشح.`}
              label="أسئلة مقابلة AI"
              icon={<FileText className="h-3 w-3" />}
              variant="outline"
              size="sm"
            />
          </div>

          {/* Interviews Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-sm">المقابلات المجدولة ({interviews.length})</h3>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setScheduleForm(true)}>
                <Plus className="h-3 w-3" />جدولة مقابلة
              </Button>
            </div>

            {interviews.length > 0 ? (
              <div className="space-y-2">
                {interviews.map((iv: any) => (
                  <Card key={iv.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{typeLabels[iv.interview_type] || iv.interview_type}</Badge>
                          <Badge variant={iv.status === "completed" ? "default" : iv.status === "cancelled" ? "destructive" : "secondary"} className="text-[10px]">
                            {statusLabels[iv.status] || iv.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(iv.scheduled_at).toLocaleDateString("ar-IQ")}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(iv.scheduled_at).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}</span>
                          <span>{iv.duration_minutes} دقيقة</span>
                          {iv.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{iv.location}</span>}
                        </div>
                        {iv.interviewer_names?.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            <Bell className="h-3 w-3 inline-block ml-1" />
                            المقابِلون: {iv.interviewer_names.join("، ")}
                          </p>
                        )}
                        {iv.notes && <p className="text-xs text-muted-foreground/70 mt-1">📝 {iv.notes}</p>}
                      </div>
                      <div className="flex gap-1">
                        {iv.status === "scheduled" && (
                          <>
                            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => updateInterviewStatus.mutate({ id: iv.id, status: "completed" })}>إكمال</Button>
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => updateInterviewStatus.mutate({ id: iv.id, status: "cancelled" })}>إلغاء</Button>
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setExternalInviteDialog(iv.id)} title="دعوة مقيّم خارجي">
                              <Mail className="h-3 w-3" />خارجي
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setScorecardForm(iv.id)}>
                          <Star className="h-3 w-3" />تقييم
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد مقابلات مجدولة</p>
            )}
          </div>

          {/* Scorecards Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-sm">بطاقات التقييم ({scorecards.length}) • المتوسط: {avgScore}/5</h3>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setScorecardForm("new")}>
                <Plus className="h-3 w-3" />تقييم جديد
              </Button>
            </div>
            {scorecards.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">المقيّم</TableHead>
                    <TableHead className="text-xs">تقني</TableHead>
                    <TableHead className="text-xs">تواصل</TableHead>
                    <TableHead className="text-xs">ثقافي</TableHead>
                    <TableHead className="text-xs">خبرة</TableHead>
                    <TableHead className="text-xs">إجمالي</TableHead>
                    <TableHead className="text-xs">التوصية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scorecards.map((sc: any) => (
                    <TableRow key={sc.id}>
                      <TableCell className="text-xs font-medium">{sc.interviewer_name}</TableCell>
                      <TableCell className="text-xs">{sc.technical_score || "—"}</TableCell>
                      <TableCell className="text-xs">{sc.communication_score || "—"}</TableCell>
                      <TableCell className="text-xs">{sc.cultural_fit_score || "—"}</TableCell>
                      <TableCell className="text-xs">{sc.experience_score || "—"}</TableCell>
                      <TableCell className="text-xs font-bold">{sc.overall_score || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={sc.recommendation === "hire" ? "default" : sc.recommendation === "reject" ? "destructive" : "secondary"} className="text-[10px]">
                          {sc.recommendation === "hire" ? "توظيف" : sc.recommendation === "reject" ? "رفض" : "محايد"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد تقييمات بعد</p>
            )}
          </div>
        </div>

        {/* Schedule Form Dialog */}
        <Dialog open={scheduleForm} onOpenChange={setScheduleForm}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">جدولة مقابلة</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); scheduleInterview.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>النوع</Label>
                  <Select name="type" defaultValue="in_person">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">حضوري</SelectItem>
                      <SelectItem value="video">فيديو</SelectItem>
                      <SelectItem value="phone">هاتفي</SelectItem>
                      <SelectItem value="panel">لجنة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المدة (دقيقة)</Label>
                  <Input name="duration" type="number" defaultValue={60} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>التاريخ والوقت</Label>
                <Input name="scheduled_at" type="datetime-local" required dir="ltr" className="text-left" />
              </div>
              <div className="space-y-2">
                <Label>الموقع / الرابط</Label>
                <Input name="location" placeholder="القاعة / رابط Zoom..." />
              </div>
              <div className="space-y-2">
                <Label>المقابِلون</Label>
                <InterviewerAutocomplete
                  employees={employees}
                  value={selectedInterviewers}
                  onChange={setSelectedInterviewers}
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات / تعليمات للمقابِلين</Label>
                <Textarea name="notes" rows={2} placeholder="نقاط للتركيز عليها أثناء المقابلة..." />
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 text-xs text-muted-foreground">
                <Bell className="h-3.5 w-3.5 text-primary shrink-0" />
                سيتم إرسال إشعار داخلي تلقائياً للمقابِلين مع تفاصيل المقابلة
              </div>
              <Button type="submit" className="w-full" disabled={scheduleInterview.isPending}>
                {scheduleInterview.isPending ? "جاري الحفظ..." : "جدولة المقابلة وإشعار المقابِلين"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Scorecard Form Dialog */}
        <Dialog open={!!scorecardForm} onOpenChange={() => setScorecardForm(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">بطاقة تقييم المقابلة</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addScorecard.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المقيّم</Label>
                <Input name="interviewer_name" required placeholder="اسمك الكامل" />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: "technical", label: "تقني" },
                  { name: "communication", label: "تواصل" },
                  { name: "cultural_fit", label: "ثقافي" },
                  { name: "experience", label: "خبرة" },
                  { name: "overall", label: "إجمالي" },
                ].map((f) => (
                  <div key={f.name} className="space-y-1">
                    <Label className="text-[10px]">{f.label}</Label>
                    <Select name={f.name}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((v) => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>نقاط القوة</Label><Textarea name="strengths" rows={2} /></div>
                <div className="space-y-2"><Label>نقاط الضعف</Label><Textarea name="weaknesses" rows={2} /></div>
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
              <div className="space-y-2"><Label>ملاحظات إضافية</Label><Textarea name="notes" rows={2} /></div>
              <Button type="submit" className="w-full" disabled={addScorecard.isPending}>
                {addScorecard.isPending ? "جاري الحفظ..." : "حفظ التقييم"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* External Interviewer Invite Dialog */}
        <Dialog open={!!externalInviteDialog} onOpenChange={() => setExternalInviteDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading flex items-center gap-2"><Mail className="h-5 w-5" />دعوة مقيّم خارجي</DialogTitle></DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const extName = fd.get("ext_name") as string;
              const extEmail = fd.get("ext_email") as string;
              const deliveryMethod = fd.get("delivery_method") as string || "copy";
              
              try {
                const token = crypto.randomUUID();
                const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
                
                const { error } = await supabase.from("interview_schedules" as any).update({
                  eval_token: token,
                  eval_token_expires_at: expiresAt,
                  external_interviewer_name: extName,
                  external_interviewer_email: extEmail,
                }).eq("id", externalInviteDialog!);
                if (error) throw error;

                const link = `${window.location.origin}/interview-eval?token=${token}`;

                if (deliveryMethod === "email" && extEmail) {
                  const subject = encodeURIComponent("دعوة لتقييم مقابلة - " + candidateName);
                  const body = encodeURIComponent(`مرحباً ${extName}،\n\nيسعدنا دعوتك لتقييم المرشح "${candidateName}" لوظيفة "${jobTitle || ""}"\n\nيمكنك الاطلاع على ملف المرشح وتعبئة نموذج التقييم عبر الرابط:\n${link}\n\nالرابط صالح لمدة 14 يوماً.\n\nشكراً لتعاونكم.`);
                  window.open(`mailto:${extEmail}?subject=${subject}&body=${body}`, "_blank");
                  toast({ title: "تم فتح البريد الإلكتروني مع رابط التقييم" });
                } else {
                  navigator.clipboard.writeText(link);
                  toast({ title: "تم نسخ رابط التقييم ✅", description: "يمكنك إرساله للمقيّم الخارجي" });
                }

                queryClient.invalidateQueries({ queryKey: ["interviews", candidateId] });
                setExternalInviteDialog(null);
              } catch (err: any) {
                toast({ title: "خطأ", description: err.message, variant: "destructive" });
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المقيّم الخارجي *</Label>
                <Input name="ext_name" required placeholder="الاسم الكامل" />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input name="ext_email" type="email" dir="ltr" placeholder="email@example.com" />
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">سيتم إنشاء رابط آمن يمكن للمقيّم الخارجي فتحه لمشاهدة ملف المرشح وتعبئة بطاقة التقييم. صالح لمدة 14 يوماً.</p>
              <div className="flex gap-2">
                <Button type="submit" name="delivery_method" value="email" variant="outline" className="flex-1 gap-1">
                  <Mail className="h-3 w-3" />إرسال بالبريد
                </Button>
                <Button type="submit" name="delivery_method" value="copy" className="flex-1 gap-1">
                  <Copy className="h-3 w-3" />نسخ الرابط
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
