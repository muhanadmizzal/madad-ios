import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Upload, CheckCircle, Loader2, AlertCircle, FileText } from "lucide-react";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-apply`;

const empTypeLabels: Record<string, string> = {
  full_time: "دوام كامل",
  part_time: "دوام جزئي",
  contract: "عقد مؤقت",
  internship: "تدريب",
};

export default function PublicApply() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);

  useEffect(() => {
    if (!jobId) return;
    fetch(`${FUNCTION_URL}?job_id=${jobId}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setJob(data.job);
      })
      .catch(() => setError("فشل تحميل بيانات الوظيفة"))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData();
      formData.append("job_id", jobId!);
      formData.append("name", (form.elements.namedItem("name") as HTMLInputElement).value);
      formData.append("email", (form.elements.namedItem("email") as HTMLInputElement).value);
      formData.append("phone", (form.elements.namedItem("phone") as HTMLInputElement).value);
      formData.append("notes", (form.elements.namedItem("notes") as HTMLTextAreaElement).value);
      if (cvFile) formData.append("cv", cvFile);

      const resp = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: formData,
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "فشل الإرسال");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive opacity-60" />
            <p className="font-bold text-lg">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">هذه الوظيفة قد تكون مغلقة أو غير موجودة</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h2 className="font-bold text-xl mb-2">تم استلام طلبك بنجاح!</h2>
            <p className="text-muted-foreground">شكراً لتقديمك على وظيفة <strong>{job?.title}</strong>. سيتم مراجعة طلبك والتواصل معك قريباً.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Job Details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Briefcase className="h-4 w-4" />
              {(job as any)?.companies?.name || "شركة"}
            </div>
            <CardTitle className="text-2xl">{job?.title}</CardTitle>
            <div className="flex gap-2 mt-2">
              {job?.employment_type && (
                <Badge variant="outline">{empTypeLabels[job.employment_type] || job.employment_type}</Badge>
              )}
              {job?.positions_count && (
                <Badge variant="outline">{job.positions_count} مقعد</Badge>
              )}
              {job?.closing_date && (
                <Badge variant="outline">يغلق: {job.closing_date}</Badge>
              )}
            </div>
          </CardHeader>
          {(job?.description || job?.requirements) && (
            <CardContent className="space-y-4 pt-0">
              {job.description && (
                <div>
                  <h3 className="font-bold text-sm mb-1">الوصف الوظيفي</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
                </div>
              )}
              {job.requirements && (
                <div>
                  <h3 className="font-bold text-sm mb-1">المتطلبات</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{job.requirements}</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تقديم طلب التوظيف</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل *</Label>
                <Input name="name" required placeholder="أدخل اسمك الكامل" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input name="email" type="email" dir="ltr" className="text-left" placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input name="phone" dir="ltr" className="text-left" placeholder="+964..." />
                </div>
              </div>

              {/* CV Upload */}
              <div className="space-y-2">
                <Label>السيرة الذاتية (CV)</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => document.getElementById("cv-input")?.click()}
                >
                  <input
                    id="cv-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  />
                  {cvFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{cvFile.name}</span>
                      <span className="text-xs text-muted-foreground">({(cvFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">اضغط لرفع السيرة الذاتية</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX (حتى 10 MB)</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>رسالة إضافية</Label>
                <Textarea name="notes" rows={3} placeholder="أخبرنا عن خبراتك ولماذا أنت مناسب لهذه الوظيفة..." />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري الإرسال...
                  </>
                ) : (
                  "إرسال الطلب"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          سيتم تحليل سيرتك الذاتية تلقائياً بالذكاء الاصطناعي لتسريع عملية المراجعة
        </p>
      </div>
    </div>
  );
}
