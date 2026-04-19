import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Building2, Image, Stamp, Globe, Phone, Mail, FileText, Palette, PenTool, Hash } from "lucide-react";

interface Props {
  company: any;
  companyId: string;
}

export default function CompanyBranding({ company, companyId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#071739");
  const [accentColor, setAccentColor] = useState("#A68868");
  const [secondaryColor, setSecondaryColor] = useState("#4B6382");
  const [sidebarColor, setSidebarColor] = useState("#071739");
  const [nameAr, setNameAr] = useState("");
  const [headerTemplate, setHeaderTemplate] = useState("");
  const [footerTemplate, setFooterTemplate] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (company) {
      setAddress(company.address || "");
      setPhone(company.phone || "");
      setEmail(company.email || "");
      setWebsite(company.website || "");
      setTaxNumber(company.tax_number || "");
      setPrimaryColor(company.primary_color || "#071739");
      setAccentColor(company.accent_color || "#A68868");
      setSecondaryColor(company.secondary_color || "#4B6382");
      setSidebarColor((company as any).sidebar_color || "#071739");
      setNameAr(company.name_ar || company.name || "");
      setHeaderTemplate(company.header_template || "");
      setFooterTemplate(company.footer_template || "");
      setSignatoryName(company.signatory_name || "");
      setSignatoryTitle(company.signatory_title || "");
      setRegistrationNumber(company.registration_number || "");
    }
  }, [company]);

  const uploadFile = async (file: File, type: "logo" | "stamp") => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${companyId}/${type}.${ext}`;
      const { error: upErr } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const col = type === "logo" ? "logo_url" : "stamp_url";
      const { error } = await supabase.from("companies").update({ [col]: urlData.publicUrl } as any).eq("id", companyId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-theme"] });
      toast({ title: `تم رفع ${type === "logo" ? "الشعار" : "الختم"} بنجاح` });
    } catch (err: any) {
      toast({ title: "خطأ في الرفع", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const saveDetails = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("companies").update({
        address: address || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        tax_number: taxNumber || null,
        primary_color: primaryColor || null,
        accent_color: accentColor || null,
        secondary_color: secondaryColor || null,
        sidebar_color: sidebarColor || null,
        name_ar: nameAr || null,
        header_template: headerTemplate || null,
        footer_template: footerTemplate || null,
        signatory_name: signatoryName || null,
        signatory_title: signatoryTitle || null,
        registration_number: registrationNumber || null,
      } as any).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-theme"] });
      toast({ title: "تم الحفظ" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Logo & Stamp */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            الهوية البصرية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="font-heading">شعار الشركة</Label>
              <div className="border-2 border-dashed rounded-xl p-4 text-center">
                {company?.logo_url ? (
                  <img src={company.logo_url} alt="شعار" className="h-20 mx-auto mb-2 object-contain" />
                ) : (
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                )}
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "logo")} />
                <Button variant="outline" size="sm" className="font-heading gap-2" onClick={() => logoRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4" />رفع شعار
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="font-heading">ختم الشركة</Label>
              <div className="border-2 border-dashed rounded-xl p-4 text-center">
                {company?.stamp_url ? (
                  <img src={company.stamp_url} alt="ختم" className="h-20 mx-auto mb-2 object-contain" />
                ) : (
                  <Stamp className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                )}
                <input ref={stampRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "stamp")} />
                <Button variant="outline" size="sm" className="font-heading gap-2" onClick={() => stampRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4" />رفع ختم
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            ألوان العلامة التجارية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "اللون الأساسي", value: primaryColor, setter: setPrimaryColor },
              { label: "اللون الثانوي", value: accentColor, setter: setAccentColor },
              { label: "اللون المساعد", value: secondaryColor, setter: setSecondaryColor },
              { label: "لون الشريط الجانبي", value: sidebarColor, setter: setSidebarColor },
            ].map((c) => (
              <div key={c.label} className="space-y-2">
                <Label className="font-heading text-sm">{c.label}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={c.value} onChange={(e) => c.setter(e.target.value)} className="w-9 h-9 rounded border cursor-pointer" />
                  <Input value={c.value} onChange={(e) => c.setter(e.target.value)} dir="ltr" className="text-left font-mono text-xs" />
                </div>
                <div className="h-6 rounded" style={{ backgroundColor: c.value }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            بيانات الشركة للمستندات الرسمية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الشركة (عربي)</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="اسم الشركة بالعربية" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />رقم السجل التجاري</Label>
              <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="رقم التسجيل" dir="ltr" className="text-left" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />العنوان</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="بغداد، العراق" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />الهاتف</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+964..." dir="ltr" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />البريد الإلكتروني</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@company.com" dir="ltr" className="text-left" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />الموقع الإلكتروني</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.company.com" dir="ltr" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>الرقم الضريبي</Label>
              <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} placeholder="رقم التسجيل الضريبي" dir="ltr" className="text-left" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header & Footer Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            ترويسة وتذييل المستندات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ترويسة المستند (Header)</Label>
            <Textarea value={headerTemplate} onChange={(e) => setHeaderTemplate(e.target.value)} rows={3} placeholder="نص الترويسة الرسمية الذي سيظهر أعلى المستندات..." />
            <p className="text-xs text-muted-foreground">يظهر أسفل الشعار في جميع المستندات الرسمية</p>
          </div>
          <div className="space-y-2">
            <Label>تذييل المستند (Footer)</Label>
            <Textarea value={footerTemplate} onChange={(e) => setFooterTemplate(e.target.value)} rows={3} placeholder="نص التذييل الرسمي: عنوان، هاتف، بريد..." />
            <p className="text-xs text-muted-foreground">يظهر في أسفل كل مستند رسمي</p>
          </div>
        </CardContent>
      </Card>

      {/* Signatory */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            المفوض بالتوقيع
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم المفوض</Label>
              <Input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div className="space-y-2">
              <Label>المسمى الوظيفي</Label>
              <Input value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} placeholder="المدير العام" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg">معاينة المستند الرسمي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-background min-h-[300px] text-sm leading-8" dir="rtl">
            {/* Header */}
            <div className="text-center mb-4">
              {company?.logo_url && <img src={company.logo_url} alt="شعار" className="h-16 mx-auto mb-2 object-contain" />}
              <h2 className="font-heading font-bold text-lg" style={{ color: primaryColor }}>{nameAr || company?.name || "اسم الشركة"}</h2>
              {headerTemplate && <p className="text-xs text-muted-foreground mt-1">{headerTemplate}</p>}
              {(registrationNumber || taxNumber) && (
                <p className="text-xs text-muted-foreground">
                  {registrationNumber && `سجل تجاري: ${registrationNumber}`}
                  {registrationNumber && taxNumber && " | "}
                  {taxNumber && `ضريبي: ${taxNumber}`}
                </p>
              )}
            </div>
            <Separator className="mb-4" />
            <p className="text-muted-foreground text-center py-8">محتوى المستند يظهر هنا...</p>
            <Separator className="mt-4" />
            {/* Footer */}
            <div className="mt-4 text-center">
              {(signatoryName || signatoryTitle) && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground">التوقيع والختم</p>
                  {signatoryName && <p className="font-heading font-bold text-sm">{signatoryName}</p>}
                  {signatoryTitle && <p className="text-xs text-muted-foreground">{signatoryTitle}</p>}
                </div>
              )}
              {company?.stamp_url && <img src={company.stamp_url} alt="ختم" className="h-14 mx-auto opacity-60" />}
              {footerTemplate && <p className="text-[10px] text-muted-foreground mt-3 border-t pt-2">{footerTemplate}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="font-heading w-full" size="lg" onClick={() => saveDetails.mutate()} disabled={saveDetails.isPending}>
        {saveDetails.isPending ? "جاري الحفظ..." : "حفظ جميع إعدادات الهوية"}
      </Button>
    </div>
  );
}
