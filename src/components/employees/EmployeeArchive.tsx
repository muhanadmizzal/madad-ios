import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, CalendarDays, Clock, Target, FileSignature,
  AlertTriangle, Download, Eye, Printer, Shield, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompanyBranding, buildOfficialDocumentHtml, useGetDocumentSignedUrl } from "@/hooks/useOfficialDocument";
import { EmployeeUploadedDocsList } from "@/components/documents/EmployeeUploadedDocsList";

interface Props {
  employeeId: string;
  companyId: string;
}

export function EmployeeArchive({ employeeId, companyId }: Props) {
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const { data: company } = useCompanyBranding();
  const getSignedUrl = useGetDocumentSignedUrl();

  const { data: documents = [] } = useQuery({
    queryKey: ["archive-docs", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*").eq("employee_id", employeeId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: generatedDocs = [] } = useQuery({
    queryKey: ["archive-gen-docs", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("generated_documents").select("*").eq("employee_id", employeeId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: requestDocs = [] } = useQuery({
    queryKey: ["archive-request-docs", employeeId, companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("request_documents").select("*").eq("company_id", companyId).eq("employee_id", employeeId).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ["archive-leaves", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("leave_requests").select("*, leave_types(name)").eq("employee_id", employeeId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["archive-attendance", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("attendance_records").select("*").eq("employee_id", employeeId).order("date", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["archive-contracts", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*").eq("employee_id", employeeId).order("start_date", { ascending: false });
      return data || [];
    },
  });

  const { data: appraisals = [] } = useQuery({
    queryKey: ["archive-appraisals", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("appraisals").select("*").eq("employee_id", employeeId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["archive-goals", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("*").eq("employee_id", employeeId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: warnings = [] } = useQuery({
    queryKey: ["archive-warnings", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("employee_notes").select("*").eq("employee_id", employeeId).in("note_type", ["warning", "disciplinary"]).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: violations = [] } = useQuery({
    queryKey: ["archive-violations", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("attendance_violations").select("*").eq("employee_id", employeeId).order("date", { ascending: false }).limit(30);
      return data || [];
    },
  });

  const { data: empWarnings = [] } = useQuery({
    queryKey: ["archive-emp-warnings", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("employee_warnings").select("*").eq("employee_id", employeeId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: praises = [] } = useQuery({
    queryKey: ["archive-praises", employeeId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("employee_praise").select("*").eq("employee_id", employeeId).order("issued_date", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["archive-penalties", employeeId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("employee_penalties").select("*").eq("employee_id", employeeId).order("issued_date", { ascending: false });
      return (data || []) as any[];
    },
  });

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { approved: "مقبول", pending: "معلق", rejected: "مرفوض", active: "نشط", completed: "مكتمل", terminated: "منتهي", draft: "مسودة", submitted: "مقدم", pending_approval: "بانتظار الموافقة" };
    return map[s] || s;
  };

  const statusColor = (s: string) => {
    if (["approved", "active", "completed"].includes(s)) return "bg-primary/10 text-primary";
    if (["pending", "draft", "submitted", "pending_approval"].includes(s)) return "bg-accent/10 text-accent-foreground";
    return "bg-destructive/10 text-destructive";
  };

  const docTypeLabels: Record<string, string> = {
    payslip: "كشف راتب", salary_certificate: "شهادة راتب", certificate_salary: "شهادة راتب",
    experience_certificate: "شهادة خبرة", certificate_experience: "شهادة خبرة",
    certificate_employment: "تعريف بالعمل", contract: "عقد عمل", warning: "إنذار",
    warning_letter: "خطاب إنذار", letter: "خطاب رسمي", leave: "موافقة إجازة",
  };

  const requestTypeLabels: Record<string, string> = {
    leave: "إجازة", certificate: "شهادة", salary_adjustment: "تعديل راتب",
    document: "مستند", payroll: "كشف رواتب", general: "عام",
  };

  const allDocs = [
    ...documents.map((d: any) => ({ ...d, _type: "uploaded", _label: d.name })),
    ...generatedDocs.map((d: any) => ({ ...d, _type: "generated", _label: d.document_type })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleDownloadUploaded = async (doc: any) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleViewGenerated = (doc: any) => setPreviewDoc(doc);

  const handlePrintGenerated = (doc: any) => {
    const html = buildOfficialDocumentHtml(company, doc.content || "");
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleDownloadGenerated = async (doc: any) => {
    if (doc.file_path) {
      try {
        const result = await getSignedUrl.mutateAsync(doc.id);
        window.open(result.url, "_blank");
      } catch { handlePrintGenerated(doc); }
    } else {
      handlePrintGenerated(doc);
    }
  };

  const totalRecords = allDocs.length + requestDocs.length + leaves.length + contracts.length + appraisals.length + goals.length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="font-heading font-bold text-lg text-primary">{allDocs.length}</p>
            <p className="text-xs text-muted-foreground">مستند</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50">
          <CardContent className="p-3 text-center">
            <FileSignature className="h-5 w-5 mx-auto text-foreground mb-1" />
            <p className="font-heading font-bold text-lg">{requestDocs.length}</p>
            <p className="text-xs text-muted-foreground">طلب</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-3 text-center">
            <CalendarDays className="h-5 w-5 mx-auto text-accent-foreground mb-1" />
            <p className="font-heading font-bold text-lg">{leaves.length}</p>
            <p className="text-xs text-muted-foreground">إجازة</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50">
          <CardContent className="p-3 text-center">
            <FileSignature className="h-5 w-5 mx-auto text-foreground mb-1" />
            <p className="font-heading font-bold text-lg">{contracts.length}</p>
            <p className="text-xs text-muted-foreground">عقد</p>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="p-3 text-center">
            <Target className="h-5 w-5 mx-auto text-foreground mb-1" />
            <p className="font-heading font-bold text-lg">{appraisals.length + goals.length}</p>
            <p className="text-xs text-muted-foreground">تقييم/هدف</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documents">
        <TabsList className="w-full grid grid-cols-6 h-auto">
          <TabsTrigger value="documents" className="font-heading text-xs py-1.5"><FileText className="h-3 w-3 ml-1" />المستندات</TabsTrigger>
          <TabsTrigger value="emp-uploads" className="font-heading text-xs py-1.5"><Upload className="h-3 w-3 ml-1" />المرفوعة</TabsTrigger>
          <TabsTrigger value="requests" className="font-heading text-xs py-1.5"><FileSignature className="h-3 w-3 ml-1" />الطلبات</TabsTrigger>
          <TabsTrigger value="leaves" className="font-heading text-xs py-1.5"><CalendarDays className="h-3 w-3 ml-1" />الإجازات</TabsTrigger>
          <TabsTrigger value="performance" className="font-heading text-xs py-1.5"><Target className="h-3 w-3 ml-1" />الأداء</TabsTrigger>
          <TabsTrigger value="disciplinary" className="font-heading text-xs py-1.5"><AlertTriangle className="h-3 w-3 ml-1" />المخالفات</TabsTrigger>
        </TabsList>

        {/* Documents Tab with View/Print/Download */}
        <TabsContent value="documents" className="mt-3">
          <ScrollArea className="h-[300px]">
            {allDocs.length > 0 ? (
              <div className="space-y-2">
                {allDocs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${doc._type === "generated" ? "bg-primary/10" : "bg-secondary"}`}>
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc._type === "generated" ? (docTypeLabels[doc._label] || doc._label) : doc._label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString("ar-IQ")}
                          {doc._type === "generated" && doc.reference_number && ` • ${doc.reference_number}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] ${statusColor(doc.status)}`}>{statusLabel(doc.status)}</Badge>
                      {doc._type === "uploaded" && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadUploaded(doc)} title="تحميل">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {doc._type === "generated" && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleViewGenerated(doc)} title="عرض">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrintGenerated(doc)} title="طباعة">
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadGenerated(doc)} title="تحميل">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} text="لا توجد مستندات" />
            )}
          </ScrollArea>
        </TabsContent>

        {/* Employee Uploaded Documents Tab */}
        <TabsContent value="emp-uploads" className="mt-3">
          <EmployeeUploadedDocsList employeeId={employeeId} companyId={companyId} userId="" readOnly />
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="mt-3">
          <ScrollArea className="h-[300px]">
            {requestDocs.length > 0 ? (
              <div className="space-y-2">
                {requestDocs.map((r: any) => {
                  const linkedGen = generatedDocs.find((g: any) => g.workflow_instance_id === r.workflow_instance_id);
                  return (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{requestTypeLabels[r.request_type] || r.request_type}</Badge>
                          <span className="font-mono text-xs text-muted-foreground">{r.reference_number}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString("ar-IQ")}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] ${statusColor(r.status)}`}>{statusLabel(r.status)}</Badge>
                        {linkedGen && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleViewGenerated(linkedGen)} title="عرض المستند">
                              <Eye className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrintGenerated(linkedGen)} title="طباعة">
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={FileSignature} text="لا توجد طلبات" />
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="leaves" className="mt-3">
          <ScrollArea className="h-[300px]">
            {leaves.length > 0 ? (
              <div className="space-y-2">
                {leaves.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{(l as any).leave_types?.name || "إجازة"}</p>
                      <p className="text-xs text-muted-foreground">{l.start_date} → {l.end_date}</p>
                      {l.reason && <p className="text-xs text-muted-foreground mt-0.5">{l.reason}</p>}
                    </div>
                    <Badge variant="outline" className={statusColor(l.status)}>{statusLabel(l.status)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={CalendarDays} text="لا توجد إجازات" />
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="performance" className="mt-3">
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {appraisals.length > 0 && (
                <>
                  <p className="text-xs font-heading font-bold text-muted-foreground mb-1">التقييمات</p>
                  {appraisals.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">دورة {a.cycle}</span>
                        <div className="flex items-center gap-2">
                          {a.overall_rating && <Badge className="bg-primary/10 text-primary">{a.overall_rating}/5</Badge>}
                          <Badge variant="outline" className={statusColor(a.status)}>{statusLabel(a.status)}</Badge>
                        </div>
                      </div>
                      {a.comments && <p className="text-xs text-muted-foreground mt-1">{a.comments}</p>}
                    </div>
                  ))}
                </>
              )}
              {goals.length > 0 && (
                <>
                  <p className="text-xs font-heading font-bold text-muted-foreground mb-1 mt-3">الأهداف</p>
                  {goals.map((g: any) => (
                    <div key={g.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{g.title}</p>
                        <p className="text-xs text-muted-foreground">التقدم: {g.progress || 0}%</p>
                      </div>
                      <Badge variant="outline" className={statusColor(g.status)}>{statusLabel(g.status)}</Badge>
                    </div>
                  ))}
                </>
              )}
              {appraisals.length === 0 && goals.length === 0 && (
                <EmptyState icon={Target} text="لا توجد تقييمات أو أهداف" />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="disciplinary" className="mt-3">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {/* Formal Warnings from employee_warnings */}
              {empWarnings.length > 0 && (
                <>
                  <p className="text-xs font-heading font-bold text-muted-foreground mb-1">الإنذارات الرسمية</p>
                  {empWarnings.map((w: any) => (
                    <div key={w.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                      <div className="flex justify-between items-center mb-1">
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">
                          {w.warning_type === "verbal" ? "شفهي" : w.warning_type === "written" ? "كتابي" : w.warning_type === "final" ? "إنذار نهائي" : w.warning_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{w.incident_date || new Date(w.created_at).toLocaleDateString("ar-IQ")}</span>
                      </div>
                      <p className="text-sm font-medium">{w.subject}</p>
                      {w.description && <p className="text-xs text-muted-foreground mt-0.5">{w.description}</p>}
                    </div>
                  ))}
                </>
              )}

              {/* Penalties */}
              {penalties.length > 0 && (
                <>
                  <p className="text-xs font-heading font-bold text-muted-foreground mb-1 mt-3">الجزاءات</p>
                  {penalties.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                      <div className="flex justify-between items-center mb-1">
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">{p.penalty_type === "deduction" ? "خصم" : p.penalty_type}</Badge>
                        <span className="text-xs text-muted-foreground">{p.issued_date}</span>
                      </div>
                      <p className="text-sm font-medium">{p.subject}</p>
                      {p.deduction_amount > 0 && <span className="text-xs text-destructive">-{Number(p.deduction_amount).toLocaleString()} د.ع</span>}
                    </div>
                  ))}
                </>
              )}

              {/* Praise/Rewards */}
              {praises.length > 0 && (
                <>
                  <p className="text-xs font-heading font-bold text-muted-foreground mb-1 mt-3">التكريمات والمكافآت</p>
                  {praises.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex justify-between items-center mb-1">
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">{p.praise_type === "commendation" ? "تقدير" : p.praise_type === "bonus" ? "مكافأة" : p.praise_type}</Badge>
                        <span className="text-xs text-muted-foreground">{p.issued_date}</span>
                      </div>
                      <p className="text-sm font-medium">{p.subject}</p>
                      {p.reward_amount > 0 && <span className="text-xs text-primary">+{Number(p.reward_amount).toLocaleString()} د.ع</span>}
                    </div>
                  ))}
                </>
              )}

              {/* Note-based warnings */}
              {warnings.length > 0 && (
                <>
                  <p className="text-xs font-heading font-bold text-muted-foreground mb-1 mt-3">ملاحظات تأديبية</p>
                  {warnings.map((w: any) => (
                    <div key={w.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                      <div className="flex justify-between items-center mb-1">
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">
                          {w.note_type === "warning" ? "تحذير" : "تأديبي"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString("ar-IQ")}</span>
                      </div>
                      <p className="text-sm">{w.note}</p>
                    </div>
                  ))}
                </>
              )}

              {violations.length > 0 && (
                <>
                  <p className="text-xs font-heading font-bold text-muted-foreground mb-1 mt-3">مخالفات الحضور</p>
                  {violations.map((v: any) => (
                    <div key={v.id} className="p-2.5 rounded-lg bg-destructive/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-sm">{v.violation_type === "late" ? "تأخير" : v.violation_type === "early_leave" ? "خروج مبكر" : v.violation_type === "absent" ? "غياب" : v.violation_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{v.date}</span>
                        {v.minutes_diff && <Badge variant="outline" className="text-[10px]">{v.minutes_diff} د</Badge>}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {warnings.length === 0 && violations.length === 0 && empWarnings.length === 0 && penalties.length === 0 && praises.length === 0 && (
                <EmptyState icon={Shield} text="لا توجد مخالفات أو إنذارات أو تكريمات" />
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">إجمالي السجلات: {totalRecords} سجل</p>

      {/* Preview Dialog for Generated Documents */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {previewDoc && (docTypeLabels[previewDoc.document_type] || previewDoc.document_type)}
              {previewDoc?.reference_number && ` — ${previewDoc.reference_number}`}
            </DialogTitle>
          </DialogHeader>
          {previewDoc && company && (
            <div className="border rounded-lg p-6 text-sm leading-8" dir="rtl"
              dangerouslySetInnerHTML={{
                __html: (() => {
                  const c = company as any;
                  let html = "";
                  if (c.logo_url) html += `<div style="text-align:center;margin-bottom:8px"><img src="${c.logo_url}" style="max-height:60px" /></div>`;
                  html += `<h2 style="text-align:center;color:${c.primary_color || "#1E3A8A"};font-size:18px">${c.name_ar || c.name || ""}</h2>`;
                  html += `<hr style="margin:12px 0;border-color:${c.primary_color || "#1E3A8A"}" />`;
                  html += (previewDoc.content || "").replace(/\n/g, "<br/>");
                  const sigName = previewDoc.signatory_name_snapshot || c.signatory_name;
                  const sigRole = previewDoc.signatory_role_snapshot || c.signatory_title;
                  if (sigName) html += `<div style="margin-top:30px"><strong>${sigName}</strong><br/><span style="color:#666;font-size:12px">${sigRole || ""}</span></div>`;
                  return html;
                })(),
              }}
            />
          )}
          <div className="flex gap-2">
            <Button className="flex-1 gap-2 font-heading" onClick={() => previewDoc && handlePrintGenerated(previewDoc)}>
              <Printer className="h-4 w-4" />طباعة
            </Button>
            <Button variant="outline" className="flex-1 gap-2 font-heading" onClick={() => previewDoc && handleDownloadGenerated(previewDoc)}>
              <Download className="h-4 w-4" />تحميل
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="py-10 text-center text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-20" />
      <p className="text-sm">{text}</p>
    </div>
  );
}