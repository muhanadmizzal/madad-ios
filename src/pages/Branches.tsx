import { useState } from "react";
import { Plus, Building, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import ManagerPositionPicker from "@/components/orgchart/ManagerPositionPicker";

export default function Branches() {
  const [dialog, setDialog] = useState(false);
  const [isHQ, setIsHQ] = useState(false);
  const [managerPositionId, setManagerPositionId] = useState<string | null>(null);
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!).order("created_at");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Resolve manager positions for display
  const { data: managerMap = {} } = useQuery({
    queryKey: ["branch-manager-positions", companyId],
    queryFn: async () => {
      const posIds = branches.filter((b: any) => b.manager_position_id).map((b: any) => b.manager_position_id);
      if (posIds.length === 0) return {};
      const { data: posData } = await supabase.from("positions").select("id, title_ar").in("id", posIds);
      const { data: empData } = posIds.length > 0
        ? await supabase.from("employees").select("name_ar, position_id").in("position_id", posIds).eq("status", "active")
        : { data: [] };
      const map: Record<string, { title: string; empName?: string }> = {};
      posData?.forEach((p) => {
        const emp = empData?.find((e: any) => e.position_id === p.id);
        map[p.id] = { title: p.title_ar || "", empName: emp?.name_ar };
      });
      return map;
    },
    enabled: !!companyId && branches.length > 0,
  });

  const addBranch = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("branches").insert({
        company_id: companyId!,
        name: formData.get("name") as string,
        city: (formData.get("city") as string) || null,
        address: (formData.get("address") as string) || null,
        phone: (formData.get("phone") as string) || null,
        manager_name: null,
        manager_position_id: managerPositionId,
        is_headquarters: isHQ,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم بنجاح", description: "تم إضافة الفرع" });
      setDialog(false);
      setIsHQ(false);
      setManagerPositionId(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const getManagerDisplay = (b: any) => {
    if (b.manager_position_id && (managerMap as any)[b.manager_position_id]) {
      const info = (managerMap as any)[b.manager_position_id];
      return info.empName || `${info.title} (شاغر)`;
    }
    if (b.manager_name) return <span className="text-amber-600 dark:text-amber-400">{b.manager_name} ⚠</span>;
    return "—";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">الفروع والمواقع</h1>
          <p className="text-muted-foreground text-sm mt-1">{branches.length} فرع</p>
        </div>
        <Dialog open={dialog} onOpenChange={(v) => { setDialog(v); if (!v) { setManagerPositionId(null); setIsHQ(false); } }}>
          <DialogTrigger asChild><Button className="gap-2 font-heading"><Plus className="h-4 w-4" />إضافة فرع</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">فرع جديد</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addBranch.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>اسم الفرع</Label><Input name="name" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>المدينة</Label><Input name="city" /></div>
                <div className="space-y-2"><Label>الهاتف</Label><Input name="phone" dir="ltr" className="text-left" /></div>
              </div>
              <div className="space-y-2"><Label>العنوان</Label><Input name="address" /></div>
              {companyId && (
                <ManagerPositionPicker companyId={companyId} value={managerPositionId} onChange={setManagerPositionId} />
              )}
              <div className="flex items-center gap-2"><Switch checked={isHQ} onCheckedChange={setIsHQ} /><Label>المقر الرئيسي</Label></div>
              <Button type="submit" className="w-full font-heading" disabled={addBranch.isPending}>حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {branches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفرع</TableHead>
                  <TableHead>المدينة</TableHead>
                  <TableHead>المدير</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>النوع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.city || "—"}</TableCell>
                    <TableCell>{getManagerDisplay(b)}</TableCell>
                    <TableCell dir="ltr">{b.phone || "—"}</TableCell>
                    <TableCell>{b.is_headquarters ? <Badge className="bg-primary/10 text-primary">رئيسي</Badge> : <Badge variant="outline">فرع</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد فروع</p>
              <p className="text-sm mt-1">أضف فروع ومواقع شركتك</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
