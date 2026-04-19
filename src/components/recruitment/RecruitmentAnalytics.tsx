import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Clock, Target, TrendingUp } from "lucide-react";

interface Props {
  jobs: any[];
  candidates: any[];
}

const stageLabels: Record<string, string> = {
  applied: "مقدّم",
  screening: "فرز",
  interview: "مقابلة",
  offer: "عرض",
  hired: "معيّن",
  rejected: "مرفوض",
};

const sourceLabels: Record<string, string> = {
  direct: "مباشر",
  referral: "إحالة",
  linkedin: "لينكدإن",
  job_board: "منصة توظيف",
  website: "الموقع",
};

export default function RecruitmentAnalytics({ jobs, candidates }: Props) {
  const totalCandidates = candidates.length;
  const hiredCount = candidates.filter((c: any) => c.stage === "hired").length;
  const rejectedCount = candidates.filter((c: any) => c.stage === "rejected").length;
  const activeCount = totalCandidates - hiredCount - rejectedCount;
  const conversionRate = totalCandidates > 0 ? Math.round((hiredCount / totalCandidates) * 100) : 0;
  const openJobs = jobs.filter((j: any) => j.status === "open").length;

  // Pipeline breakdown
  const stageCounts = Object.keys(stageLabels).map((stage) => ({
    stage,
    label: stageLabels[stage],
    count: candidates.filter((c: any) => c.stage === stage).length,
  }));

  // Source breakdown
  const sourceCounts: Record<string, number> = {};
  candidates.forEach((c: any) => {
    const src = c.source || "direct";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const topSources = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Avg time to hire (days from created_at to stage=hired updated_at)
  const hiredCandidates = candidates.filter((c: any) => c.stage === "hired");
  const avgTimeToHire = hiredCandidates.length > 0
    ? Math.round(
        hiredCandidates.reduce((sum: number, c: any) => {
          const days = Math.ceil((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
          return sum + days;
        }, 0) / hiredCandidates.length
      )
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground">إجمالي المتقدمين</p>
          <p className="text-2xl font-heading font-bold">{totalCandidates}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Target className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground">وظائف مفتوحة</p>
          <p className="text-2xl font-heading font-bold">{openJobs}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground">معدل التحويل</p>
          <p className="text-2xl font-heading font-bold">{conversionRate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-accent-foreground mb-1" />
          <p className="text-xs text-muted-foreground">متوسط وقت التوظيف</p>
          <p className="text-2xl font-heading font-bold">{avgTimeToHire} يوم</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground">نشط في Pipeline</p>
          <p className="text-2xl font-heading font-bold">{activeCount}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="font-heading text-base">توزيع المراحل</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stageCounts.filter(s => s.count > 0).map((s) => (
              <div key={s.stage} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{s.label}</span>
                  <span className="font-heading font-bold">{s.count}</span>
                </div>
                <Progress value={totalCandidates > 0 ? (s.count / totalCandidates) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="font-heading text-base">مصادر التوظيف</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topSources.length > 0 ? topSources.map(([src, count]) => (
              <div key={src} className="flex items-center justify-between">
                <span className="text-sm">{sourceLabels[src] || src}</span>
                <div className="flex items-center gap-2">
                  <Progress value={totalCandidates > 0 ? (count / totalCandidates) * 100 : 0} className="h-2 w-20" />
                  <Badge variant="outline" className="text-xs">{count}</Badge>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
