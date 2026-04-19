import { useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCreateWorkflowInstance, useWorkflowInstances } from "@/hooks/useApprovalWorkflow";
import { WorkflowStatusBadge } from "@/components/approvals/WorkflowStatusBadge";


export default function EPLeave() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [selectedType, setSelectedType] = useState("");

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id, companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id").eq("company_id", companyId!).eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types-ep", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("leave_types").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: myLeaves = [] } = useQuery({
    queryKey: ["ep-leaves", myEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase.from("leave_requests").select("*, leave_types(name)").eq("employee_id", myEmployee!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const balances = leaveTypes.map((lt: any) => {
    const used = myLeaves.filter((l: any) => l.leave_type_id === lt.id && l.status === "approved")
      .reduce((sum: number, l: any) => sum + Math.ceil((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / 86400000) + 1, 0);
    return { ...lt, used, remaining: Math.max(0, lt.days_allowed - used) };
  });

  const createWorkflow = useCreateWorkflowInstance();

  // Fetch workflow instances for this employee's leave requests
  const { data: leaveWorkflows = [] } = useWorkflowInstances({ requestType: "leave" });
  const workflowMap: Record<string, any> = {};
  leaveWorkflows.forEach((wi: any) => { workflowMap[wi.reference_id] = wi; });

  const submitLeave = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data, error } = await supabase.from("leave_requests").insert({
        company_id: companyId!, employee_id: myEmployee!.id, leave_type_id: selectedType || null,
        start_date: formData.get("start_date") as string, end_date: formData.get("end_date") as string,
        reason: (formData.get("reason") as string) || null,
      }).select().single();
      if (error) throw error;
      try {
        await createWorkflow.mutateAsync({ requestType: "leave", referenceId: data.id, companyId: companyId! });
      } catch (wfError: any) {
        console.error("Workflow creation failed:", wfError);
        toast({ title: "تم حفظ الطلب لكن فشل إنشاء سير العمل", description: wfError?.message, variant: "destructive" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ep-leaves"] });
      toast({ title: "تم تقديم الطلب" }); setDialog(false); setSelectedType("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  if (!myEmployee) return <div className="text-center py-16 text-muted-foreground">لم يتم ربط حسابك بسجل موظف</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">إجازاتي</h1>
        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogTrigger asChild>
            <Button className="font-heading gap-2"><Plus className="h-4 w-4" />طلب إجازة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">طلب إجازة جديدة</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); submitLeave.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2">
                <Label>نوع الإجازة</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{leaveTypes.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.days_allowed} يوم)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>من</Label><Input type="date" name="start_date" required dir="ltr" /></div>
                <div className="space-y-2"><Label>إلى</Label><Input type="date" name="end_date" required dir="ltr" /></div>
              </div>
              <div className="space-y-2"><Label>السبب</Label><Textarea name="reason" rows={2} /></div>
              <Button type="submit" className="w-full font-heading" disabled={submitLeave.isPending}>تقديم</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balances */}
      {balances.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {balances.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-heading font-medium text-sm">{b.name}</span>
                  <Badge variant="outline" className="text-xs">{b.remaining}/{b.days_allowed}</Badge>
                </div>
                <Progress value={b.days_allowed > 0 ? ((b.days_allowed - b.remaining) / b.days_allowed) * 100 : 0} className="h-2" />
                <p className="text-[11px] text-muted-foreground mt-1">مستخدم: {b.used} | متبقي: {b.remaining}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Requests */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="font-heading text-lg">طلباتي</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>النوع</TableHead><TableHead>من</TableHead><TableHead>إلى</TableHead><TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myLeaves.map((l: any) => {
                const wfInstance = workflowMap[l.id];
                const displayStatus = wfInstance?.status || l.status || "pending";
                return (
                <TableRow key={l.id}>
                  <TableCell>{l.leave_types?.name || "—"}</TableCell>
                  <TableCell dir="ltr">{l.start_date}</TableCell>
                  <TableCell dir="ltr">{l.end_date}</TableCell>
                  <TableCell><WorkflowStatusBadge status={displayStatus} /></TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
