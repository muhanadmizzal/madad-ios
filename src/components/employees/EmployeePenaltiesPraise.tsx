import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Award, AlertTriangle, Banknote } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  employeeId: string;
  companyId: string;
  isManager: boolean;
}

const praiseTypeLabels: Record<string, string> = {
  commendation: "شكر وتقدير", bonus: "مكافأة مالية", promotion_recommend: "توصية ترقية", certificate: "شهادة تقدير",
};
const penaltyTypeLabels: Record<string, string> = {
  deduction: "خصم مالي", warning_linked: "إنذار مرتبط", suspension_pay: "إيقاف راتب", demotion: "تخفيض درجة",
};

export function EmployeePenaltiesPraise({ employeeId, companyId, isManager }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [praiseDialog, setPraiseDialog] = useState(false);
  const [penaltyDialog, setPenaltyDialog] = useState(false);
  const [affectsPayroll, setAffectsPayroll] = useState(false);
  const [autoGenDoc, setAutoGenDoc] = useState(false);

  const { data: praises = [] } = useQuery({
    queryKey: ["emp-praise", employeeId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("employee_praise").select("*").eq("employee_id", employeeId).order("issued_date", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["emp-penalties", employeeId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("employee_penalties").select("*").eq("employee_id", employeeId).order("issued_date", { ascending: false });
      return (data || []) as any[];
    },
  });

  const addPraise = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await (supabase as any).from("employee_praise").insert({
        company_id: companyId,
        employee_id: employeeId,
        praise_type: formData.get("praise_type") || "commendation",
        category: formData.get("category") || "performance",
        subject: formData.get("subject"),
        description: formData.get("description") || null,
        reward_amount: Number(formData.get("reward_amount")) || 0,
        affects_payroll: affectsPayroll,
        auto_generate_document: autoGenDoc,
        issued_by: user?.id,
        issued_date: formData.get("issued_date") || new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emp-praise"] });
      toast({ title: "تم تسجيل التكريم" });
      setPraiseDialog(false);
      setAffectsPayroll(false);
      setAutoGenDoc(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const addPenalty = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await (supabase as any).from("employee_penalties").insert({
        company_id: companyId,
        employee_id: employeeId,
        penalty_type: formData.get("penalty_type") || "deduction",
        category: formData.get("category") || "attendance",
        subject: formData.get("subject"),
        description: formData.get("description") || null,
        deduction_amount: Number(formData.get("deduction_amount")) || 0,
        deduction_days: Number(formData.get("deduction_days")) || 0,
        affects_payroll: affectsPayroll,
        auto_generate_document: autoGenDoc,
        issued_by: user?.id,
        issued_date: formData.get("issued_date") || new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emp-penalties"] });
      toast({ title: "تم تسجيل الجزاء" });
      setPenaltyDialog(false);
      setAffectsPayroll(false);
      setAutoGenDoc(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const totalRewards = praises.filter((p: any) => p.status === "active").reduce((s: number, p: any) => s + Number(p.reward_amount || 0), 0);
  const totalDeductions = penalties.filter((p: any) => p.status === "active").reduce((s: number, p: any) => s + Number(p.deduction_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <Award className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="font-heading font-bold text-lg text-primary">{praises.length}</p>
            <p className="text-[10px] text-muted-foreground">تكريم</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto text-destructive mb-1" />
            <p className="font-heading font-bold text-lg text-destructive">{penalties.length}</p>
            <p className="text-[10px] text-muted-foreground">جزاء</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Banknote className="h-4 w-4 mx-auto text-foreground mb-1" />
            <p className="font-heading font-bold text-sm">
              <span className="text-primary">+{totalRewards.toLocaleString()}</span> / <span className="text-destructive">-{totalDeductions.toLocaleString()}</span>
            </p>
            <p className="text-[10px] text-muted-foreground">الأثر المالي</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="praise">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="praise" className="font-heading text-xs gap-1"><Award className="h-3 w-3" />تكريم</TabsTrigger>
            <TabsTrigger value="penalties" className="font-heading text-xs gap-1"><AlertTriangle className="h-3 w-3" />جزاءات</TabsTrigger>
          </TabsList>
          {isManager && (
            <div className="flex gap-1">
              <Dialog open={praiseDialog} onOpenChange={setPraiseDialog}>
                <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1 text-xs font-heading"><Plus className="h-3 w-3" />تكريم</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-heading">تكريم جديد</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); addPraise.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                    <div className="space-y-2"><Label>الموضوع *</Label><Input name="subject" required /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>النوع</Label><Select name="praise_type" defaultValue="commendation"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(praiseTypeLabels).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>التصنيف</Label><Input name="category" defaultValue="أداء" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>المكافأة (د.ع)</Label><Input name="reward_amount" type="number" defaultValue="0" dir="ltr" className="text-left" /></div>
                      <div className="space-y-2"><Label>التاريخ</Label><Input name="issued_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} dir="ltr" className="text-left" /></div>
                    </div>
                    <div className="space-y-2"><Label>الوصف</Label><Textarea name="description" rows={2} /></div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2"><Checkbox checked={affectsPayroll} onCheckedChange={(v) => setAffectsPayroll(!!v)} /><Label className="text-xs cursor-pointer">يؤثر على الراتب</Label></div>
                      <div className="flex items-center gap-2"><Checkbox checked={autoGenDoc} onCheckedChange={(v) => setAutoGenDoc(!!v)} /><Label className="text-xs cursor-pointer">إنشاء مستند رسمي</Label></div>
                    </div>
                    <Button type="submit" className="w-full font-heading" disabled={addPraise.isPending}>{addPraise.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={penaltyDialog} onOpenChange={setPenaltyDialog}>
                <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1 text-xs font-heading text-destructive"><Plus className="h-3 w-3" />جزاء</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-heading">جزاء جديد</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); addPenalty.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                    <div className="space-y-2"><Label>الموضوع *</Label><Input name="subject" required /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>النوع</Label><Select name="penalty_type" defaultValue="deduction"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(penaltyTypeLabels).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>التصنيف</Label><Input name="category" defaultValue="حضور" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2"><Label>مبلغ الخصم</Label><Input name="deduction_amount" type="number" defaultValue="0" dir="ltr" className="text-left" /></div>
                      <div className="space-y-2"><Label>أيام خصم</Label><Input name="deduction_days" type="number" defaultValue="0" dir="ltr" className="text-left" /></div>
                      <div className="space-y-2"><Label>التاريخ</Label><Input name="issued_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} dir="ltr" className="text-left" /></div>
                    </div>
                    <div className="space-y-2"><Label>الوصف</Label><Textarea name="description" rows={2} /></div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2"><Checkbox checked={affectsPayroll} onCheckedChange={(v) => setAffectsPayroll(!!v)} /><Label className="text-xs cursor-pointer">يؤثر على الراتب</Label></div>
                      <div className="flex items-center gap-2"><Checkbox checked={autoGenDoc} onCheckedChange={(v) => setAutoGenDoc(!!v)} /><Label className="text-xs cursor-pointer">إنشاء مستند رسمي</Label></div>
                    </div>
                    <Button type="submit" className="w-full font-heading" disabled={addPenalty.isPending}>{addPenalty.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <TabsContent value="praise" className="mt-3">
          {praises.length > 0 ? (
            <div className="space-y-2">
              {praises.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div>
                    <p className="text-sm font-medium">{p.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{praiseTypeLabels[p.praise_type] || p.praise_type}</Badge>
                      {p.reward_amount > 0 && <span className="text-xs text-primary font-bold">+{Number(p.reward_amount).toLocaleString()} د.ع</span>}
                      {p.affects_payroll && <Badge className="bg-primary/10 text-primary text-[10px]">مرتبط بالراتب</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.issued_date}</p>
                  </div>
                  <Badge variant="outline" className={p.status === "active" ? "bg-primary/10 text-primary" : ""}>{p.status === "active" ? "نشط" : "ملغى"}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm"><Award className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>لا توجد تكريمات</p></div>
          )}
        </TabsContent>

        <TabsContent value="penalties" className="mt-3">
          {penalties.length > 0 ? (
            <div className="space-y-2">
              {penalties.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div>
                    <p className="text-sm font-medium">{p.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{penaltyTypeLabels[p.penalty_type] || p.penalty_type}</Badge>
                      {p.deduction_amount > 0 && <span className="text-xs text-destructive font-bold">-{Number(p.deduction_amount).toLocaleString()} د.ع</span>}
                      {p.deduction_days > 0 && <span className="text-xs text-destructive">{p.deduction_days} يوم</span>}
                      {p.affects_payroll && <Badge className="bg-destructive/10 text-destructive text-[10px]">مرتبط بالراتب</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.issued_date}</p>
                  </div>
                  <Badge variant="outline" className={p.status === "active" ? "bg-destructive/10 text-destructive" : ""}>{p.status === "active" ? "نشط" : "ملغى"}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm"><AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>لا توجد جزاءات</p></div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
