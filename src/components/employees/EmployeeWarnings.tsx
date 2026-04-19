import { useState } from "react";
import { Plus, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const typeLabels: Record<string, string> = {
  verbal: "شفهي",
  written: "كتابي",
  final: "إنذار نهائي",
  suspension: "إيقاف",
};
const severityLabels: Record<string, string> = {
  minor: "بسيط",
  moderate: "متوسط",
  major: "جسيم",
  critical: "خطير",
};
const severityColors: Record<string, string> = {
  minor: "bg-muted text-muted-foreground",
  moderate: "bg-accent/10 text-accent-foreground",
  major: "bg-destructive/10 text-destructive",
  critical: "bg-destructive/20 text-destructive",
};

interface Props {
  companyId: string;
  employees: any[];
  isManager: boolean;
}

export default function EmployeeWarnings({ companyId, employees, isManager }: Props) {
  const [dialog, setDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [warningType, setWarningType] = useState("verbal");
  const [severity, setSeverity] = useState("minor");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: warnings = [] } = useQuery({
    queryKey: ["employee-warnings", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_warnings")
        .select("*, employees(name_ar)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const addWarning = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("employee_warnings").insert({
        company_id: companyId,
        employee_id: selectedEmployee,
        warning_type: warningType,
        severity,
        subject: formData.get("subject") as string,
        description: (formData.get("description") as string) || null,
        incident_date: (formData.get("incident_date") as string) || new Date().toISOString().split("T")[0],
        action_taken: (formData.get("action_taken") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-warnings"] });
      toast({ title: "تم تسجيل الإنذار" });
      setDialog(false);
      setSelectedEmployee("");
      setWarningType("verbal");
      setSeverity("minor");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const activeWarnings = warnings.filter((w: any) => w.status === "active");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">إجمالي الإنذارات</p>
          <p className="text-2xl font-heading font-bold">{warnings.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">نشطة</p>
          <p className="text-2xl font-heading font-bold text-destructive">{activeWarnings.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">شفهية</p>
          <p className="text-2xl font-heading font-bold">{warnings.filter((w: any) => w.warning_type === "verbal").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">كتابية</p>
          <p className="text-2xl font-heading font-bold">{warnings.filter((w: any) => w.warning_type === "written" || w.warning_type === "final").length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            سجل الإنذارات والجزاءات
          </CardTitle>
          {isManager && (
            <Dialog open={dialog} onOpenChange={setDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 font-heading"><Plus className="h-4 w-4" />إنذار جديد</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">تسجيل إنذار</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); addWarning.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>الموظف</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                      <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>نوع الإنذار</Label>
                      <Select value={warningType} onValueChange={setWarningType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الشدة</Label>
                      <Select value={severity} onValueChange={setSeverity}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(severityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>الموضوع</Label><Input name="subject" required /></div>
                  <div className="space-y-2"><Label>تاريخ الحادثة</Label><Input name="incident_date" type="date" dir="ltr" className="text-left" /></div>
                  <div className="space-y-2"><Label>الوصف</Label><Textarea name="description" rows={3} /></div>
                  <div className="space-y-2"><Label>الإجراء المتخذ</Label><Input name="action_taken" /></div>
                  <Button type="submit" className="w-full font-heading" disabled={addWarning.isPending || !selectedEmployee}>
                    {addWarning.isPending ? "جاري الحفظ..." : "حفظ الإنذار"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {warnings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الشدة</TableHead>
                  <TableHead>الموضوع</TableHead>
                  <TableHead>تاريخ الحادثة</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warnings.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.employees?.name_ar}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabels[w.warning_type]}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={severityColors[w.severity]}>{severityLabels[w.severity]}</Badge></TableCell>
                    <TableCell className="max-w-48 truncate">{w.subject}</TableCell>
                    <TableCell dir="ltr">{w.incident_date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={w.status === "active" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}>
                        {w.status === "active" ? "نشط" : "مغلق"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد إنذارات مسجلة</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
