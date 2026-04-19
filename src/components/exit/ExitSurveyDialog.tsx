import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Star } from "lucide-react";

const exitReasons: Record<string, string> = {
  better_opportunity: "فرصة عمل أفضل",
  compensation: "الراتب والمزايا",
  management: "الإدارة والقيادة",
  growth: "قلة فرص النمو",
  culture: "بيئة العمل",
  relocation: "الانتقال",
  personal: "أسباب شخصية",
  retirement: "تقاعد",
  health: "أسباب صحية",
  worklife: "التوازن بين العمل والحياة",
  other: "أخرى",
};

function RatingStars({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground w-32">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => onChange(s)}
            className="p-0.5 transition-colors">
            <Star className={`h-5 w-5 ${s <= value ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exitRecord: any;
}

export function ExitSurveyDialog({ open, onOpenChange, exitRecord }: Props) {
  const [ratings, setRatings] = useState({
    satisfaction_overall: 0, satisfaction_management: 0,
    satisfaction_compensation: 0, satisfaction_growth: 0,
    satisfaction_culture: 0, satisfaction_worklife: 0,
  });
  const [primaryReason, setPrimaryReason] = useState("other");
  const [secondaryReasons, setSecondaryReasons] = useState<string[]>([]);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null);
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const saveSurvey = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("exit_surveys" as any).insert({
        company_id: companyId!,
        exit_clearance_id: exitRecord.id,
        employee_id: exitRecord.employee_id,
        ...ratings,
        primary_reason: primaryReason,
        secondary_reasons: secondaryReasons,
        what_liked: formData.get("what_liked") as string || null,
        what_improved: formData.get("what_improved") as string || null,
        would_recommend: wouldRecommend,
        would_return: wouldReturn,
        additional_comments: formData.get("additional_comments") as string || null,
        interviewer_name: formData.get("interviewer_name") as string || null,
        interview_date: formData.get("interview_date") as string || null,
        interview_conducted: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-surveys"] });
      queryClient.invalidateQueries({ queryKey: ["exit-clearance"] });
      toast({ title: "تم الحفظ", description: "تم حفظ استبيان مقابلة الخروج بنجاح" });
      onOpenChange(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const toggleSecondary = (reason: string) => {
    setSecondaryReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">استبيان مقابلة الخروج</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {exitRecord?.employees?.name_ar} ({exitRecord?.employees?.employee_code})
          </p>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); saveSurvey.mutate(new FormData(e.currentTarget)); }} className="space-y-6">
          {/* Satisfaction Ratings */}
          <div className="space-y-3">
            <Label className="text-base font-heading">مستوى الرضا (1-5)</Label>
            <div className="space-y-2 p-4 rounded-lg bg-muted/50">
              <RatingStars label="الرضا العام" value={ratings.satisfaction_overall}
                onChange={(v) => setRatings(p => ({ ...p, satisfaction_overall: v }))} />
              <RatingStars label="الإدارة" value={ratings.satisfaction_management}
                onChange={(v) => setRatings(p => ({ ...p, satisfaction_management: v }))} />
              <RatingStars label="الراتب والمزايا" value={ratings.satisfaction_compensation}
                onChange={(v) => setRatings(p => ({ ...p, satisfaction_compensation: v }))} />
              <RatingStars label="فرص النمو" value={ratings.satisfaction_growth}
                onChange={(v) => setRatings(p => ({ ...p, satisfaction_growth: v }))} />
              <RatingStars label="بيئة العمل" value={ratings.satisfaction_culture}
                onChange={(v) => setRatings(p => ({ ...p, satisfaction_culture: v }))} />
              <RatingStars label="التوازن" value={ratings.satisfaction_worklife}
                onChange={(v) => setRatings(p => ({ ...p, satisfaction_worklife: v }))} />
            </div>
          </div>

          {/* Primary Reason */}
          <div className="space-y-2">
            <Label>السبب الرئيسي للمغادرة</Label>
            <Select value={primaryReason} onValueChange={setPrimaryReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(exitReasons).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Secondary Reasons */}
          <div className="space-y-2">
            <Label>أسباب إضافية</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(exitReasons).filter(([k]) => k !== primaryReason).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <Checkbox checked={secondaryReasons.includes(k)}
                    onCheckedChange={() => toggleSecondary(k)} />
                  <span className="text-sm">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Would recommend / return */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>هل توصي بالعمل هنا؟</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={wouldRecommend === true ? "default" : "outline"}
                  onClick={() => setWouldRecommend(true)}>نعم</Button>
                <Button type="button" size="sm" variant={wouldRecommend === false ? "default" : "outline"}
                  onClick={() => setWouldRecommend(false)}>لا</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>هل تعود مستقبلاً؟</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={wouldReturn === true ? "default" : "outline"}
                  onClick={() => setWouldReturn(true)}>نعم</Button>
                <Button type="button" size="sm" variant={wouldReturn === false ? "default" : "outline"}
                  onClick={() => setWouldReturn(false)}>لا</Button>
              </div>
            </div>
          </div>

          {/* Free text */}
          <div className="space-y-2">
            <Label>ما الذي أعجبك في العمل؟</Label>
            <Textarea name="what_liked" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>ما الذي يمكن تحسينه؟</Label>
            <Textarea name="what_improved" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>ملاحظات إضافية</Label>
            <Textarea name="additional_comments" rows={2} />
          </div>

          {/* Interviewer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم المحاور</Label>
              <Input name="interviewer_name" />
            </div>
            <div className="space-y-2">
              <Label>تاريخ المقابلة</Label>
              <Input name="interview_date" type="date" dir="ltr" className="text-left"
                defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
          </div>

          <Button type="submit" className="w-full font-heading" disabled={saveSurvey.isPending}>
            {saveSurvey.isPending ? "جاري الحفظ..." : "حفظ الاستبيان"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
