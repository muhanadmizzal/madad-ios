import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, Building2, CalendarDays, Clock, Wallet, FileText, Settings,
  Briefcase, Target, GraduationCap, MapPin, CalendarOff, Timer, Banknote, Shield, Megaphone,
  ClipboardCheck, UserCircle, UserX, FileSignature, Bell, Bot, BarChart3, CheckCircle2,
  ChevronLeft, ChevronRight, X, BookOpen, Play, Sparkles, ArrowLeft,
  GitBranch, GraduationCap as Cap, Rocket, Award, Eye, Printer, Upload, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* ─── Module definitions ─── */
interface TourStep {
  title: string;
  description: string;
  tips?: string[];
}

interface TourModule {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  steps: TourStep[];
}

const TOUR_MODULES: TourModule[] = [
  {
    id: "welcome",
    title: "مرحباً بك في تمكين",
    subtitle: "نظرة عامة على النظام",
    icon: Rocket,
    color: "text-primary",
    steps: [
      {
        title: "مرحباً بك في نظام تمكين لإدارة الموارد البشرية",
        description: "تمكين هو نظام متكامل لإدارة الموارد البشرية يوفر لك جميع الأدوات اللازمة لإدارة شركتك بكفاءة عالية. سنأخذك في جولة تعريفية شاملة لاستكشاف كل ميزة.",
        tips: [
          "يمكنك إعادة تشغيل هذه الجولة في أي وقت من الإعدادات",
          "النظام يدعم اللغة العربية بالكامل مع واجهة RTL",
          "جميع البيانات محمية بتشفير عالي المستوى",
        ],
      },
      {
        title: "البوابات الثلاث",
        description: "النظام يتكون من ثلاث بوابات رئيسية:\n\n🏢 بوابة الأعمال — لمديري المنصة\n🏭 بوابة المنشأة — لمديري HR والإدارة\n👤 بوابة الموظف — للخدمة الذاتية\n\nكل بوابة لها صلاحيات ووظائف محددة حسب الدور.",
      },
      {
        title: "لوحة التحكم الرئيسية",
        description: "لوحة التحكم تعرض لك نظرة شاملة عن شركتك تشمل:\n\n• عدد الموظفين النشطين\n• الأقسام والفروع\n• الإجازات المعلقة\n• إجمالي الرواتب\n• الطلبات المعلقة\n• التنبيهات والإشعارات\n• أعياد ميلاد الموظفين\n• العقود المنتهية قريباً",
        tips: ["انقر على أي بطاقة للانتقال مباشرة إلى القسم المعني"],
      },
    ],
  },
  {
    id: "employees",
    title: "إدارة الموظفين",
    subtitle: "إضافة وإدارة بيانات الموظفين",
    icon: Users,
    color: "text-primary",
    steps: [
      {
        title: "قائمة الموظفين",
        description: "من صفحة الموظفين يمكنك:\n\n• عرض جميع الموظفين مع البحث والفلترة\n• إضافة موظف جديد مع جميع البيانات الشخصية والوظيفية\n• استيراد موظفين بالجملة من ملف Excel\n• تصدير البيانات بصيغ مختلفة",
        tips: [
          "استخدم زر 'إضافة موظف' لفتح نموذج التسجيل الكامل",
          "يمكنك إنشاء حساب دخول للموظف مباشرة عند الإضافة",
        ],
      },
      {
        title: "ملف الموظف التفصيلي",
        description: "كل موظف له ملف كامل يتضمن:\n\n• البيانات الشخصية (الاسم، الجنس، تاريخ الميلاد، العنوان)\n• البيانات الوظيفية (المنصب، القسم، الفرع، الراتب)\n• جهات الاتصال الطارئة\n• المعالين والتابعين\n• الأصول والعهد المسلمة\n• الملاحظات والتحذيرات\n• سجل الجدول الزمني الكامل",
      },
      {
        title: "التحذيرات والإنذارات",
        description: "نظام إدارة التحذيرات يتيح لك:\n\n• إصدار إنذارات بمستويات مختلفة (لفظي، كتابي، نهائي)\n• تتبع حالة كل تحذير\n• تسجيل رد الموظف\n• ربط التحذيرات بسير عمل الموافقات",
      },
    ],
  },
  {
    id: "org_structure",
    title: "الهيكل التنظيمي",
    subtitle: "الأقسام والفروع والمناصب",
    icon: Building2,
    color: "text-primary",
    steps: [
      {
        title: "إدارة الأقسام",
        description: "أنشئ هيكلك التنظيمي:\n\n• إضافة أقسام جديدة مع الوصف والمسؤول\n• ربط الأقسام بالفروع\n• عرض عدد الموظفين في كل قسم\n• تعيين مدير لكل قسم",
      },
      {
        title: "إدارة الفروع",
        description: "إذا كانت شركتك متعددة الفروع:\n\n• أضف فروعك مع العناوين ومعلومات الاتصال\n• حدد المقر الرئيسي\n• عيّن مديراً لكل فرع\n• ربط الأقسام بالفروع المناسبة",
      },
      {
        title: "الهيكل التنظيمي المرئي",
        description: "صفحة الهيكل التنظيمي تعرض:\n\n• شجرة تنظيمية تفاعلية\n• التسلسل الإداري\n• عدد الموظفين في كل مستوى\n• إمكانية التوسيع والطي للفروع",
      },
    ],
  },
  {
    id: "attendance",
    title: "الحضور والانصراف",
    subtitle: "تتبع ساعات العمل والمناوبات",
    icon: Clock,
    color: "text-primary",
    steps: [
      {
        title: "سجل الحضور",
        description: "نظام الحضور يوفر:\n\n• تسجيل الحضور والانصراف يدوياً أو عبر الأجهزة\n• عرض سجل الحضور اليومي والشهري\n• حساب ساعات العمل والعمل الإضافي تلقائياً\n• تقارير ملخصة للحضور",
        tips: ["يمكن ربط أجهزة البصمة عبر API الحضور"],
      },
      {
        title: "المخالفات والتصحيحات",
        description: "النظام يتتبع المخالفات تلقائياً:\n\n• التأخر عن الدوام\n• الخروج المبكر\n• الغياب بدون إذن\n\nويتيح للموظفين تقديم طلبات تصحيح حضور تمر عبر سير عمل الموافقة.",
      },
      {
        title: "المناوبات والورديات",
        description: "إدارة المناوبات تشمل:\n\n• إنشاء جداول مناوبات مرنة\n• تعيين موظفين لمناوبات محددة\n• تتبع التبديل بين المناوبات\n• إعداد قواعد العمل الإضافي",
      },
    ],
  },
  {
    id: "leave",
    title: "إدارة الإجازات",
    subtitle: "أنواع الإجازات والأرصدة والطلبات",
    icon: CalendarDays,
    color: "text-primary",
    steps: [
      {
        title: "أنواع الإجازات وأرصدتها",
        description: "النظام يدعم إدارة كاملة للإجازات:\n\n• إجازة سنوية\n• إجازة مرضية\n• إجازة طارئة\n• إجازة بدون راتب\n• إجازة أمومة/أبوة\n\nيتم تعريف الأرصدة والسياسات لكل نوع.",
      },
      {
        title: "طلب وموافقة الإجازات",
        description: "دورة حياة طلب الإجازة:\n\n1️⃣ الموظف يقدم الطلب\n2️⃣ يتم إنشاء سير عمل موافقة تلقائياً\n3️⃣ المدير المباشر يوافق/يرفض\n4️⃣ إشعار بالنتيجة\n5️⃣ تحديث الرصيد تلقائياً",
        tips: ["يمكن إعداد موافقة متعددة المستويات عبر قوالب سير العمل"],
      },
      {
        title: "تقويم إجازات الفريق",
        description: "عرض تقويمي لإجازات الفريق يساعد المديرين على:\n\n• رؤية من في إجازة اليوم\n• تجنب تضارب الإجازات\n• التخطيط المسبق للموارد البشرية",
      },
    ],
  },
  {
    id: "payroll",
    title: "الرواتب والمالية",
    subtitle: "مسيرات الرواتب والعقود والسلف",
    icon: Wallet,
    color: "text-primary",
    steps: [
      {
        title: "إعداد مسير الرواتب",
        description: "نظام الرواتب المتكامل يشمل:\n\n• تعريف مكونات الراتب (بدلات، خصومات، مكافآت)\n• محاكاة الراتب قبل الاعتماد\n• إنشاء مسير شهري آلي\n• كشف راتب تفصيلي لكل موظف",
        tips: [
          "استخدم 'منشئ قواعد الرواتب' لتعريف قواعد مخصصة",
          "ميزة المحاكاة تعرض التأثير قبل الاعتماد",
        ],
      },
      {
        title: "إدارة العقود",
        description: "تتبع عقود الموظفين:\n\n• أنواع العقود (محدد، غير محدد، تجربة)\n• تواريخ البدء والانتهاء\n• قيمة الراتب التعاقدي\n• التنبيه عند اقتراب انتهاء العقد\n• ربط العقود بسير عمل الموافقة",
      },
      {
        title: "السلف والقروض",
        description: "نظام إدارة السلف:\n\n• تقديم طلب سلفة\n• تحديد عدد الأقساط\n• متابعة السداد\n• خصم تلقائي من الراتب",
      },
    ],
  },
  {
    id: "recruitment",
    title: "التوظيف والاستقطاب",
    subtitle: "إدارة الوظائف والمرشحين",
    icon: Briefcase,
    color: "text-primary",
    steps: [
      {
        title: "إدارة الوظائف الشاغرة",
        description: "نظام التوظيف المتكامل:\n\n• إنشاء إعلانات وظيفية\n• نشر على صفحة التقديم العامة\n• تتبع المرشحين عبر مراحل التوظيف\n• تقييم المرشحين وإضافة ملاحظات",
      },
      {
        title: "مراحل التوظيف (ATS)",
        description: "نظام تتبع المتقدمين:\n\n📋 تقديم → 📞 فحص هاتفي → 🗣️ مقابلة → ✅ عرض وظيفي → 🎉 تعيين\n\nكل مرحلة قابلة للتخصيص مع إمكانية إضافة مقابلات متعددة وتحقق من الخلفية.",
      },
      {
        title: "صفحة التقديم العامة",
        description: "النظام يوفر صفحة تقديم عامة:\n\n• رابط مخصص لشركتك\n• عرض الوظائف المتاحة\n• نموذج تقديم مع رفع السيرة الذاتية\n• إشعار HR عند تقديم طلب جديد",
      },
    ],
  },
  {
    id: "onboarding_module",
    title: "التهيئة والتأهيل",
    subtitle: "إعداد الموظفين الجدد",
    icon: ClipboardCheck,
    color: "text-primary",
    steps: [
      {
        title: "قوائم مهام التهيئة",
        description: "عند انضمام موظف جديد:\n\n• أنشئ قائمة مهام مخصصة\n• حدد المرحلة (ما قبل الالتحاق، اليوم الأول، الأسبوع الأول، فترة التجربة)\n• عيّن المسؤول عن كل مهمة\n• تتبع التقدم بنسبة مئوية",
      },
      {
        title: "قوالب التهيئة",
        description: "وفّر الوقت باستخدام القوالب:\n\n• أنشئ قالب تهيئة لكل منصب أو قسم\n• طبّق القالب على الموظفين الجدد بنقرة واحدة\n• استخدم الذكاء الاصطناعي لتوليد قوائم مهام مخصصة",
      },
    ],
  },
  {
    id: "performance",
    title: "إدارة الأداء",
    subtitle: "التقييمات والأهداف",
    icon: Target,
    color: "text-primary",
    steps: [
      {
        title: "تقييم الأداء",
        description: "نظام تقييم شامل:\n\n• دورات تقييم (ربع سنوية، نصف سنوية، سنوية)\n• تقييم ذاتي + تقييم المدير\n• تقييم 360 درجة\n• نقاط القوة ومجالات التحسين\n• التقييم العام بالنجوم",
      },
      {
        title: "التدريب والتطوير",
        description: "صفحة التدريب تتيح:\n\n• إنشاء برامج تدريبية\n• تعيين موظفين لدورات\n• تتبع إكمال التدريب\n• ربط التدريب بخطط التطوير",
      },
    ],
  },
  {
    id: "documents",
    title: "المستندات والوثائق",
    subtitle: "إدارة وتوليد الوثائق الرسمية",
    icon: FileText,
    color: "text-primary",
    steps: [
      {
        title: "مركز المستندات",
        description: "إدارة جميع الوثائق:\n\n• رفع مستندات الموظفين (هوية، جواز، شهادات)\n• تتبع تواريخ الانتهاء والتنبيه التلقائي\n• فلترة حسب النوع والحالة\n• سير عمل موافقة على المستندات",
      },
      {
        title: "توليد الوثائق الرسمية",
        description: "النظام يولّد وثائق رسمية تلقائياً:\n\n📄 شهادة تعريف بالراتب\n📄 شهادة خبرة\n📄 خطاب تعريف بالعمل\n📄 خطاب موافقة إجازة\n📄 عقد عمل\n\nكل وثيقة تحمل شعار الشركة وتوقيع المفوض.",
        tips: [
          "خصّص قوالب الوثائق من الإعدادات → قوالب المستندات",
          "استخدم حقول الدمج لإدراج بيانات الموظف تلقائياً",
        ],
      },
      {
        title: "أرشيف السجلات الرسمية",
        description: "جميع الوثائق المولدة تُحفظ في أرشيف مركزي:\n\n• رقم مرجعي فريد\n• تاريخ الإصدار\n• حالة التوقيع\n• إمكانية الطباعة والتحميل\n• وصول الموظف لوثائقه عبر البوابة",
      },
    ],
  },
  {
    id: "approvals",
    title: "سير عمل الموافقات",
    subtitle: "نظام الموافقات متعدد المستويات",
    icon: Shield,
    color: "text-primary",
    steps: [
      {
        title: "كيف يعمل نظام الموافقات",
        description: "النظام يستخدم محرك سير عمل متقدم:\n\n1️⃣ الموظف يقدم طلباً (إجازة، شهادة، تصحيح...)\n2️⃣ النظام ينشئ مسار موافقة تلقائياً\n3️⃣ الموافقون يتلقون إشعارات\n4️⃣ كل مرحلة يمكن أن تحتوي على موافق مختلف\n5️⃣ سجل كامل لجميع الإجراءات",
      },
      {
        title: "قوالب سير العمل",
        description: "خصّص مسارات الموافقة:\n\n• حدد عدد مراحل الموافقة\n• عيّن الموافقين حسب الدور (مدير مباشر، HR، مدير عام)\n• فعّل التوليد التلقائي للوثائق عند الموافقة النهائية\n• أنشئ قوالب مختلفة لأنواع الطلبات",
        tips: [
          "النظام يمنع الموافقة الذاتية تلقائياً",
          "يتم تصعيد الطلبات المتأخرة بعد 24 ساعة",
        ],
      },
      {
        title: "صندوق الموافقات",
        description: "صفحة الموافقات تعرض:\n\n• الطلبات المعلقة التي تنتظر إجراءك\n• سجل الطلبات السابقة\n• إمكانية الموافقة/الرفض/الإرجاع مع ملاحظات\n• التوقيع الرقمي عند الموافقة",
      },
    ],
  },
  {
    id: "notifications",
    title: "الإشعارات والإعلانات",
    subtitle: "البقاء على اطلاع دائم",
    icon: Bell,
    color: "text-primary",
    steps: [
      {
        title: "نظام الإشعارات",
        description: "إشعارات ذكية لكل حدث:\n\n🔔 طلب جديد يحتاج موافقتك\n🔔 تمت الموافقة على طلبك\n🔔 تم رفض طلبك\n🔔 وثيقة جاهزة للتحميل\n🔔 عقد يقترب من الانتهاء\n🔔 مستند يقترب من الانتهاء",
      },
      {
        title: "الإعلانات",
        description: "نشر إعلانات للموظفين:\n\n• إعلانات عامة أو مستهدفة لقسم معين\n• مستويات الأولوية (عاجل، مهم، عادي)\n• تاريخ انتهاء تلقائي\n• ظهور الإعلانات على لوحة التحكم",
      },
    ],
  },
  {
    id: "settings",
    title: "الإعدادات والتخصيص",
    subtitle: "تهيئة النظام حسب احتياجاتك",
    icon: Settings,
    color: "text-primary",
    steps: [
      {
        title: "إعدادات الشركة والهوية",
        description: "خصّص هوية شركتك:\n\n• رفع شعار الشركة\n• إعداد ألوان العلامة التجارية\n• تعريف رأس وتذييل الخطابات الرسمية\n• رفع الختم الرسمي\n• إعداد معلومات التواصل",
      },
      {
        title: "المفوضون بالتوقيع",
        description: "إدارة المفوضين بالتوقيع:\n\n• إضافة مفوضين مع مناصبهم\n• رفع صورة التوقيع\n• تحديد أنواع الوثائق المسموح بتوقيعها\n• ترتيب أولوية المفوضين",
      },
      {
        title: "قوالب المستندات",
        description: "محرر القوالب المتقدم يتيح:\n\n• تخصيص تصميم كل نوع وثيقة\n• التحكم بالألوان والخطوط والهوامش\n• إضافة/إزالة عناصر التصميم\n• معاينة فورية للتصميم\n• حقول دمج ديناميكية",
        tips: [
          "التغييرات تنعكس فوراً على جميع الوثائق المولدة لاحقاً",
          "استخدم زر 'طباعة تجريبية' للتحقق من التصميم",
        ],
      },
      {
        title: "سياسات العمل",
        description: "تعريف سياسات العمل:\n\n• ساعات العمل الرسمية\n• فترة السماح للتأخير\n• معامل العمل الإضافي\n• أنواع الإجازات وأرصدتها\n• العطل الرسمية السنوية",
      },
    ],
  },
  {
    id: "ai_features",
    title: "الذكاء الاصطناعي",
    subtitle: "مساعد AI المتكامل",
    icon: Bot,
    color: "text-primary",
    steps: [
      {
        title: "مساعد الذكاء الاصطناعي",
        description: "النظام مدمج مع ذكاء اصطناعي متقدم:\n\n🤖 تحليل ذكي لبيانات الموارد البشرية\n🤖 توليد قوائم تهيئة مخصصة\n🤖 اقتراح قوالب وثائق\n🤖 تحليل اتجاهات القوى العاملة\n🤖 مساعد محادثة ذكي للموظفين",
      },
      {
        title: "باقات الذكاء الاصطناعي",
        description: "تتوفر باقات مختلفة لميزات AI:\n\n• باقة أساسية — محادثة واستفسارات\n• باقة متقدمة — تحليل وتوقعات\n• باقة احترافية — جميع الميزات\n\nيتم التحكم بالميزات عبر الاشتراك وحدود الاستخدام.",
      },
    ],
  },
  {
    id: "employee_portal",
    title: "بوابة الموظف",
    subtitle: "الخدمة الذاتية للموظفين",
    icon: UserCircle,
    color: "text-primary",
    steps: [
      {
        title: "لوحة الموظف الشخصية",
        description: "كل موظف لديه بوابة خاصة تتيح:\n\n• عرض الملف الشخصي\n• تقديم طلبات الإجازة\n• طلب الشهادات والوثائق\n• عرض كشف الراتب\n• تسجيل الحضور\n• متابعة حالة الطلبات",
      },
      {
        title: "الخدمة الذاتية",
        description: "الموظف يستطيع:\n\n✅ تقديم طلب إجازة\n✅ طلب شهادة تعريف أو راتب\n✅ تصحيح سجل الحضور\n✅ عرض وتحميل الوثائق الرسمية\n✅ استلام إشعارات فورية\n✅ التحدث مع مساعد AI",
        tips: [
          "الموظف يرى فقط بياناته الشخصية",
          "جميع الطلبات تمر عبر سير عمل الموافقة",
        ],
      },
    ],
  },
  {
    id: "reports",
    title: "التقارير والتحليلات",
    subtitle: "رؤى وتقارير شاملة",
    icon: BarChart3,
    color: "text-primary",
    steps: [
      {
        title: "التقارير المتاحة",
        description: "النظام يوفر تقارير شاملة:\n\n📊 تقرير الحضور الشهري\n📊 تقرير الإجازات والأرصدة\n📊 تقرير الرواتب\n📊 تقرير التوظيف\n📊 تقرير دوران الموظفين\n📊 سجل المراجعة",
      },
      {
        title: "التصدير والطباعة",
        description: "جميع التقارير تدعم:\n\n• تصدير إلى Excel\n• تصدير إلى CSV\n• طباعة مباشرة\n• فلترة متقدمة\n• عرض رسوم بيانية تفاعلية",
      },
    ],
  },
];

/* ─── Component ─── */
export default function SystemWalkthrough({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const { data: progress } = useQuery({
    queryKey: ["tour-progress", user?.id],
    queryFn: async () => {
      const { data } = await (supabase
        .from("onboarding_tour_progress" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle() as any);
      return data;
    },
    enabled: !!user,
  });

  const upsertProgress = useMutation({
    mutationFn: async (updates: {
      completed_modules?: string[];
      current_module?: number;
      is_completed?: boolean;
      dismissed_at?: string | null;
    }) => {
      const { error } = await (supabase
        .from("onboarding_tour_progress" as any)
        .upsert(
          {
            user_id: user!.id,
            company_id: companyId || null,
            ...updates,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id" }
        ) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tour-progress"] }),
  });

  const completedModules: string[] = (progress?.completed_modules as string[]) || [];
  const totalModules = TOUR_MODULES.length;
  const completedCount = completedModules.length;
  const overallPercent = Math.round((completedCount / totalModules) * 100);

  const currentMod = activeModule !== null ? TOUR_MODULES[activeModule] : null;
  const totalSteps = currentMod?.steps.length || 0;

  const completeModule = (moduleId: string) => {
    const updated = [...new Set([...completedModules, moduleId])];
    upsertProgress.mutate({
      completed_modules: updated,
      is_completed: updated.length >= totalModules,
    });
  };

  const handleNext = () => {
    if (activeStep < totalSteps - 1) {
      setActiveStep(activeStep + 1);
    } else if (currentMod) {
      completeModule(currentMod.id);
      setActiveModule(null);
      setActiveStep(0);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1);
  };

  const handleDismiss = () => {
    upsertProgress.mutate({ dismissed_at: new Date().toISOString() });
    onClose?.();
  };

  const isModuleView = activeModule !== null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header-brand rounded-xl px-6 pt-5 pb-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-24 h-24 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at 0% 0%, hsl(var(--gold) / 0.4) 0%, transparent 70%)" }} />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isModuleView && (
              <Button variant="ghost" size="icon" onClick={() => { setActiveModule(null); setActiveStep(0); }}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                {isModuleView ? currentMod?.title : "دورة تعريفية بالنظام"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isModuleView ? currentMod?.subtitle : `${completedCount}/${totalModules} وحدة مكتملة`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {overallPercent === 100 && (
              <Badge className="bg-success text-success-foreground gap-1">
                <Award className="h-3 w-3" /> مكتمل!
              </Badge>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="gold-line mt-4" />
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-heading font-medium">التقدم العام</span>
            <span className="font-heading font-bold text-primary">{overallPercent}%</span>
          </div>
          <Progress value={overallPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Module list OR Step viewer */}
      {!isModuleView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOUR_MODULES.map((mod, idx) => {
            const done = completedModules.includes(mod.id);
            return (
              <Card
                key={mod.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-card-hover border-2 ${done ? "border-success/30 bg-success/5" : "border-transparent hover:border-primary/20"}`}
                onClick={() => { setActiveModule(idx); setActiveStep(0); }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${done ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <mod.icon className="h-5 w-5" />}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {mod.steps.length} {mod.steps.length === 1 ? "خطوة" : "خطوات"}
                    </Badge>
                  </div>
                  <h3 className="font-heading font-bold text-sm mb-1">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground">{mod.subtitle}</p>
                  <div className="mt-3">
                    <Button variant={done ? "outline" : "default"} size="sm" className="w-full gap-1.5 text-xs font-heading">
                      {done ? <><Eye className="h-3 w-3" /> مراجعة</> : <><Play className="h-3 w-3" /> ابدأ</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          {/* Step progress */}
          <div className="bg-muted/50 px-6 py-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === activeStep ? "w-8 bg-primary" : i < activeStep ? "w-2 bg-primary/50" : "w-2 bg-border"}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-heading">
              {activeStep + 1} / {totalSteps}
            </span>
          </div>

          <CardContent className="p-6 sm:p-8">
            <div className="min-h-[300px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  {currentMod && <currentMod.icon className="h-6 w-6" />}
                </div>
                <h2 className="font-heading font-bold text-lg">{currentMod?.steps[activeStep]?.title}</h2>
              </div>

              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-6">
                {currentMod?.steps[activeStep]?.description}
              </div>

              {currentMod?.steps[activeStep]?.tips && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-heading font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> نصائح
                  </p>
                  {currentMod.steps[activeStep].tips!.map((tip, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span> {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button variant="outline" onClick={handlePrev} disabled={activeStep === 0} className="gap-1.5 font-heading">
                <ChevronRight className="h-4 w-4" /> السابق
              </Button>
              <Button onClick={handleNext} className="gap-1.5 font-heading">
                {activeStep < totalSteps - 1 ? (
                  <>التالي <ChevronLeft className="h-4 w-4" /></>
                ) : (
                  <>إنهاء الوحدة <CheckCircle2 className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Auto-show dialog for first-time users ─── */
const WALKTHROUGH_DISMISSED_KEY = "tamkeen_walkthrough_dismissed";

export function WalkthroughAutoPrompt() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const [open, setOpen] = useState(false);

  const { data: progress, isLoading } = useQuery({
    queryKey: ["tour-progress", user?.id],
    queryFn: async () => {
      const { data } = await (supabase
        .from("onboarding_tour_progress" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle() as any);
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !progress && user) {
      // Check if user already dismissed the prompt in this browser
      const dismissed = localStorage.getItem(`${WALKTHROUGH_DISMISSED_KEY}_${user.id}`);
      if (dismissed) return;

      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, progress, user]);

  const handleDismiss = () => {
    setOpen(false);
    if (user) {
      localStorage.setItem(`${WALKTHROUGH_DISMISSED_KEY}_${user.id}`, "true");
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="bg-gradient-to-bl from-primary/10 via-background to-accent/10 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-heading font-bold text-xl mb-2">مرحباً بك في نظام تمكين! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-6">
            هل ترغب في جولة تعريفية شاملة لاستكشاف جميع ميزات النظام؟
            <br />
            الجولة تستغرق حوالي 15 دقيقة وتغطي كل شيء تحتاج معرفته.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { handleDismiss(); window.location.href = "/walkthrough"; }} className="gap-2 font-heading">
              <Play className="h-4 w-4" /> ابدأ الجولة
            </Button>
            <Button variant="outline" onClick={handleDismiss} className="font-heading">
              لاحقاً
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
