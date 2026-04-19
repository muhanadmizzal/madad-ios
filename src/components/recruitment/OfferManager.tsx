import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { FileText, Send, Check, X, Plus, DollarSign, Calendar, Star, MessageSquare, History, User } from "lucide-react";

interface Props {
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  draft: "مسودة", pending_approval: "بانتظار الموافقة", approved: "موافق عليه",
  sent: "مرسل", accepted: "مقبول", declined: "مرفوض", withdrawn: "مسحوب",
};
const statusColors: Record<string, string> = {
  draft: "secondary", pending_approval: "outline", approved: "default",
  sent: "default", accepted: "default", declined: "destructive", withdrawn: "destructive",
};

export default function OfferManager({ candidateId, candidateName, jobId, jobTitle, open, onOpenChange }: Props) {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState(false);

  // ── Candidate full profile for approval summary ──
  const { data: candidateProfile } = useQuery({
    queryKey: ["candidate-profile", candidateId],
    queryFn: async () => {
      const { data } = await supabase.from("candidates")
        .select("*, recruitment_jobs(title, department_id, branch_id, departments(name), branches(name))")
        .eq("id", candidateId).single();
      return data;
    },
    enabled: open && !!candidateId,
  });

  // ── Interview evaluations ──
  const { data: interviews = [] } = useQuery({
    queryKey: ["offer-interviews", candidateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("interviews" as any)
        .select("*")
        .eq("candidate_id", candidateId)
        .order("interview_date", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: open && !!candidateId,
  });

  // ── Stage history ──
  const { data: stageHistory = [] } = useQuery({
    queryKey: ["offer-stage-history", candidateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidate_stage_history" as any)
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: open && !!candidateId,
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["offers", candidateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("offer_letters" as any)
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: open && !!candidateId,
  });

  const createOffer = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("offer_letters" as any).insert({
        company_id: companyId!,
        candidate_id: candidateId,
        job_id: jobId,
        offered_salary: Number(fd.get("salary")) || 0,
        offered_position: (fd.get("position") as string) || jobTitle,
        start_date: (fd.get("start_date") as string) || null,
        benefits: (fd.get("benefits") as string) || null,
        notes: (fd.get("notes") as string) || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers", candidateId] });
      toast({ title: "تم إنشاء العرض" });
      setCreateForm(false);
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateOfferStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "approved") { updates.approved_by = user!.id; updates.approved_at = new Date().toISOString(); }
      if (status === "sent") { updates.sent_at = new Date().toISOString(); }
      if (status === "accepted" || status === "declined") { updates.response = status; updates.response_at = new Date().toISOString(); }
      const { error } = await supabase.from("offer_letters" as any).update(updates).eq("id", id);
      if (error) throw error;

      if (status === "accepted") {
        await supabase.from("candidates").update({ stage: "hired" }).eq("id", candidateId);
        await supabase.from("candidate_stage_history" as any).insert({
          candidate_id: candidateId, from_stage: "offer", to_stage: "hired",
          changed_by: user!.id, notes: "ترقية تلقائية - تم قبول عرض التوظيف",
        });

        // Auto-close job and move remaining to bank
        const { data: hiredCandidate } = await supabase.from("candidates").select("job_id").eq("id", candidateId).single();
        if (hiredCandidate?.job_id) {
          const { data: jobInfo } = await supabase.from("recruitment_jobs").select("positions_count, position_id").eq("id", hiredCandidate.job_id).single();
          const { count: hiredCount } = await supabase.from("candidates").select("id", { count: "exact", head: true }).eq("job_id", hiredCandidate.job_id).eq("stage", "hired");
          if (hiredCount && jobInfo && hiredCount >= (jobInfo.positions_count || 1)) {
            await supabase.from("recruitment_jobs").update({ status: "closed" }).eq("id", hiredCandidate.job_id);
            // Move remaining candidates to talent bank
            const { data: remaining } = await supabase.from("candidates")
              .select("id, stage").eq("job_id", hiredCandidate.job_id)
              .not("id", "eq", candidateId).not("stage", "in", '("hired","rejected")');
            if (remaining && remaining.length > 0) {
              await supabase.from("candidates").update({ stage: "rejected" }).in("id", remaining.map((c: any) => c.id));
              await supabase.from("candidate_stage_history" as any).insert(
                remaining.map((c: any) => ({ candidate_id: c.id, from_stage: c.stage, to_stage: "rejected", changed_by: user!.id, notes: "نقل تلقائي لبنك المواهب - تم شغل الوظيفة" }))
              );
            }
            // Update org chart position status
            if (jobInfo.position_id) {
              await supabase.from("positions").update({ status: "filled" }).eq("id", jobInfo.position_id);
            }
          }
        }
      }
      if (status === "declined") {
        await supabase.from("candidate_stage_history" as any).insert({
          candidate_id: candidateId, from_stage: "offer", to_stage: "offer",
          changed_by: user!.id, notes: "تم رفض عرض التوظيف من قبل المرشح",
        });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["offers", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      queryClient.invalidateQueries({ queryKey: ["hiring-positions"] });
      if (vars.status === "accepted") {
        toast({ title: "تم قبول العرض ✅", description: "تم نقل المرشح لمرحلة 'معيّن' وإغلاق الشاغر تلقائياً" });
      } else {
        toast({ title: "تم تحديث العرض" });
      }
    },
  });

  // Compute summary stats
  const avgInterviewScore = interviews.length > 0
    ? (interviews.reduce((sum: number, i: any) => sum + (i.overall_score || 0), 0) / interviews.filter((i: any) => i.overall_score).length || 0).toFixed(1)
    : null;
  const completedInterviews = interviews.filter((i: any) => i.status === "completed");
  const candidateRating = candidateProfile?.rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileText className="h-5 w-5" />
            عروض التوظيف: {candidateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ══ Candidate Approval Summary ══ */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <h4 className="font-heading font-bold text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                ملخص المرشح للموافقة
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-2 rounded-lg bg-background">
                  <div className="flex justify-center gap-0.5 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-3 w-3 ${s <= (candidateRating || 0) ? "fill-accent text-accent" : "text-muted"}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">التقييم العام</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background">
                  <p className="font-bold text-lg text-primary">{avgInterviewScore || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">معدل المقابلات</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background">
                  <p className="font-bold text-lg">{completedInterviews.length}</p>
                  <p className="text-[10px] text-muted-foreground">مقابلات مكتملة</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background">
                  <p className="font-bold text-lg">{stageHistory.length}</p>
                  <p className="text-[10px] text-muted-foreground">انتقالات</p>
                </div>
              </div>

              {/* Interview feedback summary */}
              {completedInterviews.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-heading font-semibold flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> ملاحظات المقابلات
                  </p>
                  <ScrollArea className="max-h-[120px]">
                    {completedInterviews.map((iv: any) => (
                      <div key={iv.id} className="text-xs bg-background rounded p-2 mb-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{iv.interview_type || "مقابلة"}</span>
                          {iv.overall_score && (
                            <Badge variant="outline" className="text-[9px] h-4">{iv.overall_score}/5</Badge>
                          )}
                        </div>
                        {iv.recommendation && (
                          <Badge variant={iv.recommendation === "hire" ? "default" : iv.recommendation === "reject" ? "destructive" : "secondary"} className="text-[9px] h-4 mb-1">
                            {iv.recommendation === "hire" ? "توصية بالتوظيف" : iv.recommendation === "reject" ? "لا يوصى" : iv.recommendation}
                          </Badge>
                        )}
                        {iv.feedback && <p className="text-muted-foreground line-clamp-2">{iv.feedback}</p>}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {/* Stage journey */}
              {stageHistory.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-heading font-semibold flex items-center gap-1">
                    <History className="h-3 w-3" /> مسار المرشح
                  </p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {stageHistory.slice().reverse().map((h: any, idx: number) => (
                      <div key={h.id} className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] h-4">
                          {h.to_stage === "applied" ? "مقدّم" : h.to_stage === "screening" ? "فرز" : h.to_stage === "interview" ? "مقابلة" : h.to_stage === "offer" ? "عرض" : h.to_stage === "hired" ? "معيّن" : h.to_stage}
                        </Badge>
                        {idx < stageHistory.length - 1 && <span className="text-muted-foreground text-[9px]">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {candidateProfile?.notes && (
                <div className="text-xs bg-background p-2 rounded">
                  <span className="font-medium">ملاحظات: </span>
                  <span className="text-muted-foreground">{candidateProfile.notes}</span>
                </div>
              )}

              {candidateProfile?.ai_skill_summary && (
                <div className="text-xs bg-background p-2 rounded">
                  <span className="font-medium">ملخص AI: </span>
                  <span className="text-muted-foreground">{candidateProfile.ai_skill_summary}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* ══ Offers List ══ */}
          <div className="flex justify-between items-center">
            <h4 className="font-heading font-bold text-sm">العروض</h4>
            <Button size="sm" className="gap-1" onClick={() => setCreateForm(true)}>
              <Plus className="h-3.5 w-3.5" />إنشاء عرض
            </Button>
          </div>

          {offers.length > 0 ? (
            <div className="space-y-3">
              {(offers as any[]).map((o: any) => (
                <Card key={o.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-heading font-bold text-sm">{o.offered_position || jobTitle}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{Number(o.offered_salary).toLocaleString()}</span>
                          {o.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{o.start_date}</span>}
                        </div>
                      </div>
                      <Badge variant={statusColors[o.status] as any || "outline"} className="text-[10px]">
                        {statusLabels[o.status] || o.status}
                      </Badge>
                    </div>
                    {o.benefits && <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">{o.benefits}</p>}
                    <div className="flex gap-1 flex-wrap">
                      {o.status === "draft" && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateOfferStatus.mutate({ id: o.id, status: "pending_approval" })}>
                          طلب موافقة
                        </Button>
                      )}
                      {o.status === "pending_approval" && (
                        <Button size="sm" className="text-xs h-7 gap-1" onClick={() => updateOfferStatus.mutate({ id: o.id, status: "approved" })}>
                          <Check className="h-3 w-3" />موافقة
                        </Button>
                      )}
                      {o.status === "approved" && (
                        <Button size="sm" className="text-xs h-7 gap-1" onClick={() => updateOfferStatus.mutate({ id: o.id, status: "sent" })}>
                          <Send className="h-3 w-3" />إرسال للمرشح
                        </Button>
                      )}
                      {o.status === "sent" && (
                        <>
                          <Button size="sm" className="text-xs h-7 gap-1" onClick={() => updateOfferStatus.mutate({ id: o.id, status: "accepted" })}>
                            <Check className="h-3 w-3" />قبول
                          </Button>
                          <Button size="sm" variant="destructive" className="text-xs h-7 gap-1" onClick={() => updateOfferStatus.mutate({ id: o.id, status: "declined" })}>
                            <X className="h-3 w-3" />رفض
                          </Button>
                        </>
                      )}
                      {!["accepted", "declined", "withdrawn"].includes(o.status) && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => updateOfferStatus.mutate({ id: o.id, status: "withdrawn" })}>
                          سحب
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد عروض بعد</p>
          )}
        </div>

        {/* Create Form */}
        <Dialog open={createForm} onOpenChange={setCreateForm}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">إنشاء عرض توظيف</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createOffer.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2">
                <Label>المسمى الوظيفي</Label>
                <Input name="position" defaultValue={jobTitle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>الراتب المعروض</Label>
                  <Input name="salary" type="number" required placeholder="0" dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ البدء</Label>
                  <Input name="start_date" type="date" dir="ltr" className="text-left" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>المزايا والحوافز</Label>
                <Textarea name="benefits" rows={3} placeholder="تأمين صحي، بدل نقل، ..." />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={createOffer.isPending}>
                {createOffer.isPending ? "جاري الحفظ..." : "إنشاء العرض"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
