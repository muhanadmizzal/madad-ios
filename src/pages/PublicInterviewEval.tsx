import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users, Calendar, Clock, MapPin, Star, CheckCircle2,
  AlertCircle, Send, Loader2, FileText,
} from "lucide-react";

const typeLabels: Record<string, string> = {
  in_person: "حضوري", video: "فيديو", phone: "هاتفي", panel: "لجنة",
};

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-interview-eval`;

export default function PublicInterviewEval() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("رابط غير صالح - لم يتم تحديد رمز المقابلة");
      setLoading(false);
      return;
    }
    fetch(`${FUNCTION_URL}?token=${token}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("حدث خطأ في تحميل البيانات"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const body: Record<string, any> = { token };
      fd.forEach((v, k) => { body[k] = v; });

      const resp = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "فشل الإرسال");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="font-bold text-lg mb-2">خطأ</h2>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="font-bold text-xl mb-2">تم إرسال التقييم بنجاح ✅</h2>
          <p className="text-muted-foreground">شكراً لمساهمتك في عملية التوظيف.</p>
        </Card>
      </div>
    );
  }

  if (data?.already_submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="font-bold text-xl mb-2">تم إرسال التقييم مسبقاً</h2>
          <p className="text-muted-foreground">لقد قمت بتقديم تقييمك لهذا المرشح بالفعل. شكراً لك!</p>
        </Card>
      </div>
    );
  }

  const scheduledDate = data?.interview?.scheduled_at
    ? new Date(data.interview.scheduled_at) : null;

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            نموذج تقييم المقابلة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">يرجى تعبئة النموذج التالي بعد إجراء المقابلة</p>
        </div>

        {/* Interview Details */}
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
                <p className="font-bold">{data?.candidate?.name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">الوظيفة:</span>
                <p className="font-bold">{data?.job?.title || "—"}</p>
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
              {data?.interview?.interview_type && (
                <div>
                  <span className="text-muted-foreground">النوع:</span>
                  <Badge variant="outline" className="mr-1 text-[10px]">
                    {typeLabels[data.interview.interview_type] || data.interview.interview_type}
                  </Badge>
                </div>
              )}
              {data?.interview?.location && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {data.interview.location}
                </div>
              )}
            </div>
            {data?.interview?.notes && (
              <div className="bg-muted/50 rounded-md p-3 text-sm">
                <p className="font-bold text-xs mb-1">ملاحظات / تعليمات:</p>
                <p className="text-muted-foreground">{data.interview.notes}</p>
              </div>
            )}
            {/* Job Requirements */}
            {data?.job?.requirements && (
              <div className="bg-muted/30 rounded-md p-3 text-sm">
                <p className="font-bold text-xs mb-1 flex items-center gap-1"><FileText className="h-3 w-3" />متطلبات الوظيفة:</p>
                <p className="text-muted-foreground whitespace-pre-line">{data.job.requirements}</p>
              </div>
            )}
            {/* Candidate CV/Resume */}
            {data?.candidate?.resume_url && (
              <Button variant="outline" size="sm" className="gap-1 text-xs" asChild>
                <a href={data.candidate.resume_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3 w-3" />عرض السيرة الذاتية
                </a>
              </Button>
            )}
          </CardContent>
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
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>اسم المقيّم *</Label>
                <Input
                  name="interviewer_name"
                  required
                  defaultValue={data?.interview?.external_interviewer_name || ""}
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

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                <Send className="h-4 w-4" />
                {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
