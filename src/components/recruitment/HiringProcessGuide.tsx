import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, UserPlus, Search, MessageSquare, FileText, CheckCircle, Building2, Users } from "lucide-react";

const steps = [
  {
    icon: Building2,
    title: "1. فتح الوظيفة",
    titleEn: "Open Position",
    desc: "يقوم مدير القسم أو الفرع بإنشاء طلب توظيف يحدد فيه المسمى الوظيفي والمتطلبات والقسم والفرع المطلوب",
    tags: ["داخلي", "خارجي"],
  },
  {
    icon: UserPlus,
    title: "2. استقبال الطلبات",
    titleEn: "Receive Applications",
    desc: "يتم استقبال طلبات المرشحين عبر رابط التقديم العام أو إضافتهم يدوياً. يمكن أن يكون التوظيف داخلياً (موظف حالي) أو خارجياً",
    tags: ["تلقائي"],
  },
  {
    icon: Search,
    title: "3. الفرز والتقييم",
    titleEn: "Screening",
    desc: "يقوم فريق الموارد البشرية بمراجعة السير الذاتية وفرز المرشحين المؤهلين. يمكن استخدام الذكاء الاصطناعي لتحليل المهارات",
    tags: ["يدوي", "AI"],
  },
  {
    icon: MessageSquare,
    title: "4. المقابلات",
    titleEn: "Interviews",
    desc: "جدولة المقابلات مع لجان التقييم الداخلية أو الخارجية. يتم تسجيل التقييمات في بطاقات الأداء",
    tags: ["تذكير تلقائي"],
  },
  {
    icon: FileText,
    title: "5. العرض الوظيفي",
    titleEn: "Job Offer",
    desc: "إرسال عرض العمل للمرشح المختار مع تفاصيل الراتب والمزايا. يتطلب موافقة الإدارة",
    tags: ["موافقة"],
  },
  {
    icon: CheckCircle,
    title: "6. التعيين والتأهيل",
    titleEn: "Hire & Onboard",
    desc: "عند قبول العرض، يتم تحويل المرشح تلقائياً إلى موظف ويُعيّن في القسم والفرع الذي فتح الوظيفة. تبدأ مهام التأهيل تلقائياً",
    tags: ["تلقائي", "تأهيل"],
  },
];

export function HiringProcessGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          دليل عملية التوظيف
          <Badge variant="outline" className="text-xs font-normal">Hiring Process Guide</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {steps.map((step, idx) => (
            <div key={idx}>
              <div className="flex gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors">
                <div className="p-2 h-fit rounded-lg bg-primary/10">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-semibold text-sm">{step.title}</h3>
                    <span className="text-xs text-muted-foreground">({step.titleEn})</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                  <div className="flex gap-1.5 mt-2">
                    {step.tags.map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px] h-5">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-heading font-semibold text-sm mb-2">ملاحظات مهمة</h4>
          <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
            <li>التوظيف الداخلي: يمكن ترشيح موظف حالي لوظيفة جديدة مع الحفاظ على سجله</li>
            <li>عند التعيين، يُسند الموظف تلقائياً للقسم والفرع المحدد في الوظيفة</li>
            <li>تبدأ مهام التأهيل (Onboarding) تلقائياً فور إنشاء ملف الموظف</li>
            <li>عند شغل جميع المقاعد، تُغلق الوظيفة تلقائياً ويُنقل باقي المرشحين لبنك المواهب</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
