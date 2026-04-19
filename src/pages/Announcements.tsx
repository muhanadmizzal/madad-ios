import { useState } from "react";
import { Plus, Megaphone, Trash2, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";

export default function Announcements() {
  const [dialog, setDialog] = useState(false);
  const [priority, setPriority] = useState("normal");
  const [targetDept, setTargetDept] = useState("all");
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*, departments:target_department_id(name)").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const addAnnouncement = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("announcements").insert({
        company_id: companyId!,
        title: formData.get("title") as string,
        content: formData.get("content") as string,
        priority,
        published_by: user!.id,
        expires_at: (formData.get("expires_at") as string) || null,
        target_department_id: targetDept !== "all" ? targetDept : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "تم النشر" });
      setDialog(false);
      setPriority("normal");
      setTargetDept("all");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "تم الحذف" });
    },
  });

  const priorityLabels: Record<string, string> = { low: "منخفض", normal: "عادي", high: "مهم", urgent: "عاجل" };
  const priorityColors: Record<string, string> = { low: "bg-muted text-muted-foreground", normal: "bg-primary/10 text-primary", high: "bg-accent/10 text-accent-foreground", urgent: "bg-destructive/10 text-destructive" };

  const activeAnnouncements = announcements.filter((a: any) => a.is_active && (!a.expires_at || new Date(a.expires_at) > new Date()));
  const expiredAnnouncements = announcements.filter((a: any) => !a.is_active || (a.expires_at && new Date(a.expires_at) <= new Date()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">الإعلانات</h1>
          <p className="text-muted-foreground text-sm mt-1">{activeAnnouncements.length} إعلان نشط • {expiredAnnouncements.length} منتهي</p>
        </div>
        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogTrigger asChild><Button className="gap-2 font-heading"><Plus className="h-4 w-4" />إعلان جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">نشر إعلان</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addAnnouncement.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>العنوان</Label><Input name="title" required /></div>
              <div className="space-y-2"><Label>المحتوى</Label><Textarea name="content" required rows={4} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الأولوية</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفض</SelectItem>
                      <SelectItem value="normal">عادي</SelectItem>
                      <SelectItem value="high">مهم</SelectItem>
                      <SelectItem value="urgent">عاجل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>القسم المستهدف</Label>
                  <Select value={targetDept} onValueChange={setTargetDept}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأقسام</SelectItem>
                      {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>ينتهي في</Label><Input name="expires_at" type="datetime-local" dir="ltr" className="text-left" /></div>
              <Button type="submit" className="w-full font-heading" disabled={addAnnouncement.isPending}>نشر</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="font-heading">النشطة ({activeAnnouncements.length})</TabsTrigger>
          <TabsTrigger value="expired" className="font-heading">المنتهية ({expiredAnnouncements.length})</TabsTrigger>
        </TabsList>

        {[
          { key: "active", items: activeAnnouncements },
          { key: "expired", items: expiredAnnouncements },
        ].map(({ key, items }) => (
          <TabsContent key={key} value={key}>
            {items.length > 0 ? (
              <div className="space-y-4">
                {items.map((a: any) => (
                  <Card key={a.id} className={key === "expired" ? "opacity-60" : ""}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-heading font-bold text-base">{a.title}</h3>
                            <Badge variant="outline" className={priorityColors[a.priority] || ""}>{priorityLabels[a.priority] || a.priority}</Badge>
                            {a.departments?.name && (
                              <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
                                <Building2 className="h-3 w-3" />
                                {a.departments.name}
                              </Badge>
                            )}
                            {!a.target_department_id && (
                              <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
                                <Users className="h-3 w-3" />
                                الجميع
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                            <span>{new Date(a.created_at).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" })}</span>
                            {a.expires_at && <span>ينتهي: {new Date(a.expires_at).toLocaleDateString("ar-IQ")}</span>}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => deleteAnnouncement.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><CardContent className="py-16 text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-heading font-medium">لا توجد إعلانات</p>
              </CardContent></Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
