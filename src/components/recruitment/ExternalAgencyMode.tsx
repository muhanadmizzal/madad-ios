import { useState } from "react";
import { Building2, Users, Briefcase, Globe, FileText, Plus, Phone, Mail, Link2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";

const stageLabels: Record<string, string> = {
  applied: "مقدّم", screening: "فرز", interview: "مقابلة", offer: "عرض", hired: "معيّن", rejected: "مرفوض",
};

export function ExternalAgencyMode() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clientDialog, setClientDialog] = useState(false);
  const [jobDialog, setJobDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["agency-clients", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("agency_clients").select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Agency jobs with client linkage
  const { data: agencyJobs = [] } = useQuery({
    queryKey: ["agency-jobs", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("*, departments(name), candidates(id, stage, name, rating), agency_clients(client_name)")
        .eq("company_id", companyId!)
        .eq("hiring_source", "agency")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const addClient = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("agency_clients").insert({
        company_id: companyId!,
        client_name: formData.get("client_name") as string,
        contact_person: (formData.get("contact_person") as string) || null,
        email: (formData.get("email") as string) || null,
        phone: (formData.get("phone") as string) || null,
        industry: (formData.get("industry") as string) || null,
        notes: (formData.get("notes") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-clients"] });
      toast({ title: "تم إضافة العميل بنجاح" });
      setClientDialog(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Create job linked to a specific client
  const addAgencyJob = useMutation({
    mutationFn: async (formData: FormData) => {
      const clientId = formData.get("client_id") as string;
      const { error } = await supabase.from("recruitment_jobs").insert({
        company_id: companyId!,
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        requirements: (formData.get("requirements") as string) || null,
        positions_count: Number(formData.get("positions_count")) || 1,
        hiring_source: "agency",
        agency_client_id: clientId || null,
        employment_type: (formData.get("employment_type") as string) || "full_time",
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      toast({ title: "تم إنشاء طلب التوظيف" });
      setJobDialog(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const totalPlacements = agencyJobs.reduce((acc: number, j: any) => {
    return acc + (j.candidates?.filter((c: any) => c.stage === "hired").length || 0);
  }, 0);
  const activeRequests = agencyJobs.filter((j: any) => j.status === "open").length;
  const clientJobs = selectedClient
    ? agencyJobs.filter((j: any) => (j as any).agency_client_id === selectedClient.id)
    : agencyJobs;

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <Building2 className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="font-heading font-bold text-2xl text-primary">{clients.length}</p>
            <p className="text-xs text-muted-foreground">عملاء</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-4 text-center">
            <Briefcase className="h-6 w-6 mx-auto text-accent-foreground mb-1" />
            <p className="font-heading font-bold text-2xl">{activeRequests}</p>
            <p className="text-xs text-muted-foreground">طلبات نشطة</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-foreground mb-1" />
            <p className="font-heading font-bold text-2xl">{agencyJobs.reduce((a: number, j: any) => a + (j.candidates?.length || 0), 0)}</p>
            <p className="text-xs text-muted-foreground">مرشحون</p>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="p-4 text-center">
            <Globe className="h-6 w-6 mx-auto text-foreground mb-1" />
            <p className="font-heading font-bold text-2xl">{totalPlacements}</p>
            <p className="text-xs text-muted-foreground">توظيفات ناجحة</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients" className="font-heading gap-1.5"><Building2 className="h-3.5 w-3.5" />العملاء</TabsTrigger>
          <TabsTrigger value="requests" className="font-heading gap-1.5"><Briefcase className="h-3.5 w-3.5" />طلبات التوظيف</TabsTrigger>
          <TabsTrigger value="workflow" className="font-heading gap-1.5"><FileText className="h-3.5 w-3.5" />سير العمل</TabsTrigger>
        </TabsList>

        {/* ═══ Clients Tab ═══ */}
        <TabsContent value="clients">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                العملاء (الشركات الطالبة)
              </CardTitle>
              <Dialog open={clientDialog} onOpenChange={setClientDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 font-heading"><Plus className="h-4 w-4" />إضافة عميل</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-heading">إضافة شركة عميلة</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); addClient.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                    <div className="space-y-2"><Label>اسم الشركة *</Label><Input name="client_name" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>شخص التواصل</Label><Input name="contact_person" /></div>
                      <div className="space-y-2"><Label>القطاع</Label><Input name="industry" placeholder="تقنية، نفط..." /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>البريد</Label><Input name="email" type="email" dir="ltr" className="text-left" /></div>
                      <div className="space-y-2"><Label>الهاتف</Label><Input name="phone" dir="ltr" className="text-left" /></div>
                    </div>
                    <div className="space-y-2"><Label>ملاحظات</Label><Textarea name="notes" rows={2} /></div>
                    <Button type="submit" className="w-full font-heading" disabled={addClient.isPending}>
                      {addClient.isPending ? "جاري الحفظ..." : "إضافة العميل"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {clients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {clients.map((client: any) => {
                    const clientJobCount = agencyJobs.filter((j: any) => (j as any).agency_client_id === client.id).length;
                    const clientHires = agencyJobs
                      .filter((j: any) => (j as any).agency_client_id === client.id)
                      .reduce((a: number, j: any) => a + (j.candidates?.filter((c: any) => c.stage === "hired").length || 0), 0);
                    return (
                      <Card key={client.id} className="bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => setSelectedClient(client)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-heading font-bold">{client.client_name}</h4>
                              {client.industry && <Badge variant="secondary" className="text-[10px] mt-1">{client.industry}</Badge>}
                            </div>
                            <Badge variant="outline" className="bg-primary/10 text-primary text-[10px]">نشط</Badge>
                          </div>
                          {client.contact_person && (
                            <p className="text-sm text-muted-foreground mt-2">{client.contact_person}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
                            {client.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3 w-3" />{client.phone}</span>}
                          </div>
                          <div className="flex gap-3 mt-3 pt-2 border-t text-xs">
                            <span><strong>{clientJobCount}</strong> طلب</span>
                            <span><strong>{clientHires}</strong> توظيف</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">لا يوجد عملاء بعد. أضف شركات عميلة لبدء التوظيف الخارجي.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Requests Tab ═══ */}
        <TabsContent value="requests">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                طلبات التوظيف للعملاء
                {selectedClient && (
                  <Badge variant="outline" className="gap-1">
                    {selectedClient.client_name}
                    <button className="hover:text-destructive" onClick={() => setSelectedClient(null)}>×</button>
                  </Badge>
                )}
              </CardTitle>
              <Dialog open={jobDialog} onOpenChange={setJobDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 font-heading"><Plus className="h-4 w-4" />طلب توظيف جديد</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-heading">إنشاء طلب توظيف لعميل</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); addAgencyJob.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>العميل *</Label>
                      <Select name="client_id" defaultValue={selectedClient?.id || ""}>
                        <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>المسمى الوظيفي *</Label><Input name="title" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>عدد المقاعد</Label><Input name="positions_count" type="number" defaultValue={1} /></div>
                      <div className="space-y-2">
                        <Label>نوع التوظيف</Label>
                        <Select name="employment_type" defaultValue="full_time">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time">دوام كامل</SelectItem>
                            <SelectItem value="part_time">دوام جزئي</SelectItem>
                            <SelectItem value="contract">عقد مؤقت</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>الوصف</Label><Textarea name="description" rows={3} /></div>
                    <div className="space-y-2"><Label>المتطلبات</Label><Textarea name="requirements" rows={3} /></div>
                    <Button type="submit" className="w-full font-heading" disabled={addAgencyJob.isPending}>
                      {addAgencyJob.isPending ? "جاري الحفظ..." : "إنشاء الطلب"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {clientJobs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المسمى</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>المقاعد</TableHead>
                      <TableHead>المرشحون</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>مسار التوظيف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientJobs.map((job: any) => {
                      const cands = job.candidates || [];
                      return (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {job.agency_clients?.client_name || "غير مرتبط"}
                            </Badge>
                          </TableCell>
                          <TableCell>{job.positions_count || 1}</TableCell>
                          <TableCell>{cands.length}</TableCell>
                          <TableCell>
                            <Badge variant={job.status === "open" ? "default" : "secondary"} className="text-[10px]">
                              {job.status === "open" ? "مفتوح" : job.status === "closed" ? "مغلق" : job.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {["applied", "screening", "interview", "offer", "hired"].map(stage => {
                                const count = cands.filter((c: any) => c.stage === stage).length;
                                return count > 0 ? (
                                  <Badge key={stage} variant="outline" className="text-[9px] h-4 px-1">
                                    {stageLabels[stage]}: {count}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">لا توجد طلبات توظيف. أنشئ طلباً جديداً مرتبطاً بعميل.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Workflow Tab ═══ */}
        <TabsContent value="workflow">
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                سير عمل وكالة التوظيف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {[
                  { step: 1, title: "استلام الطلب", desc: "تسجيل طلب التوظيف من الشركة العميلة وربطه بالعميل", icon: "📥" },
                  { step: 2, title: "البحث والفرز", desc: "إيجاد المرشحين المناسبين من بنك المواهب أو مصادر خارجية", icon: "🔍" },
                  { step: 3, title: "التقييم والمقابلات", desc: "إجراء المقابلات الأولية والتقييم قبل التقديم للعميل", icon: "📋" },
                  { step: 4, title: "تقديم المرشحين", desc: "تقديم المرشحين المؤهلين للعميل مع ملخص التقييم", icon: "📤" },
                  { step: 5, title: "التوظيف والمتابعة", desc: "إتمام عملية التوظيف وتسجيل التوظيف الناجح", icon: "✅" },
                ].map((s) => (
                  <div key={s.step} className="relative p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <p className="font-heading font-bold text-sm">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{s.step}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-muted/30 text-sm">
                <p className="font-heading font-semibold mb-1">🔗 الفرق عن التوظيف الداخلي:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>كل طلب توظيف مرتبط بعميل محدد (شركة طالبة)</li>
                  <li>المرشحون يُقيَّمون مبدئياً من الوكالة قبل تقديمهم للعميل</li>
                  <li>تتبع التوظيفات الناجحة لكل عميل</li>
                  <li>العميل لا يملك وصولاً مباشراً للنظام - الوكالة تدير العملية بالكامل</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
