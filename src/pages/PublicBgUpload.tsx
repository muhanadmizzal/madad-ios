import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Upload, CheckCircle2, AlertCircle } from "lucide-react";

const typeLabels: Record<string, string> = {
  identity: "هوية", education: "شهادات", employment: "خبرة سابقة",
  criminal: "سجل جنائي", reference: "مراجع", medical: "فحص طبي",
};

export default function PublicBgUpload() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [checkInfo, setCheckInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!token) {
      setError("رابط غير صالح");
      setLoading(false);
      return;
    }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/bg-check-upload?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setCheckInfo(data);
        setLoading(false);
      })
      .catch(() => { setError("حدث خطأ في التحميل"); setLoading(false); });
  }, [token]);

  const handleUpload = async () => {
    if (!file || !token) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("file", file);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/bg-check-upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">جاري التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="font-bold text-xl mb-2">تم رفع المستند بنجاح ✅</h2>
          <p className="text-muted-foreground">شكراً لك! سيتم مراجعة المستند من قبل فريق التوظيف.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            رفع مستند التحقق
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">المرشح:</span>{" "}
              <strong>{checkInfo?.candidate_name}</strong>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">نوع التحقق:</span>{" "}
              <Badge variant="outline">{typeLabels[checkInfo?.check_type] || checkInfo?.check_type}</Badge>
            </p>
          </div>

          <div className="space-y-2">
            <Label>اختر الملف</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">PDF, صور، أو مستند Word (حد أقصى 10MB)</p>
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "جاري الرفع..." : "رفع المستند"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
