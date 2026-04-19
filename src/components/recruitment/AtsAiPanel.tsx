import { AiModuleInsights, AiQuickAction } from "@/components/ai/AiModuleInsights";
import { FileText, MessageSquare, UserCheck, Mail, TrendingUp, Search, Users, ListChecks, BookOpen } from "lucide-react";

interface Props {
  selectedJob?: any;
  candidates?: any[];
  jobs?: any[];
  pipelineContext: string;
}

export default function AtsAiPanel({ selectedJob, candidates = [], jobs = [], pipelineContext }: Props) {
  const jobContext = selectedJob
    ? `الوظيفة: ${selectedJob.title}\nالوصف: ${selectedJob.description || "لا يوجد"}\nالمتطلبات: ${selectedJob.requirements || "لا يوجد"}\nنوع التوظيف: ${selectedJob.employment_type || "غير محدد"}\nعدد المقاعد: ${selectedJob.positions_count}\n\nالمرشحون (${candidates.length}):\n${candidates.slice(0, 30).map((c: any) => `- ${c.name} | المرحلة: ${c.stage} | التقييم: ${c.rating || "?"}/5 | المصدر: ${c.source} | ملاحظات: ${c.notes || "لا يوجد"}`).join("\n")}`
    : pipelineContext;

  const quickActions: AiQuickAction[] = selectedJob
    ? [
        { label: "تحليل السير الذاتية", question: "حلل السير الذاتية للمرشحين وقيّم مدى تطابقهم مع متطلبات الوظيفة. رتّبهم مع شرح أسباب الترتيب.", icon: <FileText className="h-3 w-3" />, actionType: "ats_cv_analysis" },
        { label: "القائمة القصيرة", question: "حدد القائمة القصيرة من المرشحين الأنسب لهذه الوظيفة مع تسجيل نقاط وأسباب ومخاطر لكل مرشح.", icon: <ListChecks className="h-3 w-3" />, actionType: "shortlist_candidates" },
        { label: "أسئلة مقابلة", question: "أنشئ حزمة مقابلة كاملة مع أسئلة ومعايير تقييم مخصصة لهذه الوظيفة.", icon: <MessageSquare className="h-3 w-3" />, actionType: "ats_interview" },
        { label: "ترتيب المرشحين", question: "رتّب المرشحين مع نقاط مطابقة وأسباب وفجوات وتوصية لكل مرشح.", icon: <UserCheck className="h-3 w-3" />, actionType: "ats_cv_analysis" },
        { label: "مسودة تواصل", question: "اكتب مسودات رسائل: دعوة مقابلة، متابعة، واعتذار رفض.", icon: <Mail className="h-3 w-3" />, actionType: "ats_communication" },
        { label: "كشف عوائق", question: "حلل خط أنابيب المرشحين وحدد عوائق التوظيف وسبب التأخير.", icon: <TrendingUp className="h-3 w-3" /> },
      ]
    : [
        { label: "تحليل مصادر التوظيف", question: "حلل أداء مصادر التوظيف المختلفة من حيث الجودة والكمية.", icon: <Search className="h-3 w-3" /> },
        { label: "عوائق التوظيف", question: "أين توجد عوائق التوظيف عبر جميع الوظائف؟", icon: <TrendingUp className="h-3 w-3" /> },
        { label: "إعادة استخدام المواهب", question: "هل يوجد مرشحون مرفوضون سابقاً يمكن إعادة النظر فيهم؟", icon: <Users className="h-3 w-3" /> },
        { label: "خطة توظيف", question: "أنشئ خطة عمل للتوظيف مع أولويات وجدول زمني ومؤشرات أداء.", icon: <BookOpen className="h-3 w-3" />, actionType: "generate_workforce_plan" },
      ];

  return (
    <AiModuleInsights
      module="recruitment"
      title="ذكاء التوظيف AI"
      description={selectedJob ? `تحليل ذكي لـ ${selectedJob.title}` : "تحليلات شاملة لعملية التوظيف"}
      quickActions={quickActions}
      contextData={jobContext}
      feature="hiring_strategy"
      recordId={selectedJob?.id}
    />
  );
}
