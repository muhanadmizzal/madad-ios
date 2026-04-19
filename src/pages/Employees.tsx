import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { EmployeeTimeline } from "@/components/employees/EmployeeTimeline";
import { EmployeeArchive } from "@/components/employees/EmployeeArchive";
import EmployeeWarnings from "@/components/employees/EmployeeWarnings";
import DirectManagerCard from "@/components/employees/DirectManagerCard";
import { EmployeeImport } from "@/components/employees/EmployeeImport";
import { EmployeeServiceInfo } from "@/components/employees/EmployeeServiceInfo";
import { EmployeePenaltiesPraise } from "@/components/employees/EmployeePenaltiesPraise";
import EmployeeOnboardingProgress from "@/components/employees/EmployeeOnboardingProgress";
import { AiModuleInsights } from "@/components/ai/AiModuleInsights";
import { UserPlus, Search, Users as UsersIcon, Upload, Eye, Phone, Mail, MapPin, FileText, Pencil, Trash2, Plus, LayoutGrid, LayoutList, Camera, Building2, Cake, KeyRound, Shield, TrendingUp, Award, ClipboardCheck } from "lucide-react";
import { transliterateArabicToEnglish } from "@/lib/arabic-transliterate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx";

const statusLabels: Record<string, string> = { active: "نشط", on_leave: "في إجازة", terminated: "منتهي", probation: "تجربة", suspended: "موقوف" };
const statusColors: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  on_leave: "bg-accent/10 text-accent-foreground border-accent/20",
  terminated: "bg-destructive/10 text-destructive border-destructive/20",
  probation: "bg-accent/10 text-accent-foreground border-accent/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getAvatarUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

export default function Employees() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [gender, setGender] = useState("");
  const [contractType, setContractType] = useState("permanent");
  const [editGender, setEditGender] = useState("");
  const [editContractType, setEditContractType] = useState("permanent");
  const [editStatus, setEditStatus] = useState("active");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkDept, setBulkDept] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountRole, setAccountRole] = useState("employee");
  const [createAccountDialog, setCreateAccountDialog] = useState(false);
  const [createAccountEmpId, setCreateAccountEmpId] = useState<string | null>(null);
  const [caEmail, setCaEmail] = useState("");
  const [caPassword, setCaPassword] = useState("");
  const [caRole, setCaRole] = useState("employee");
  const [caLoading, setCaLoading] = useState(false);
  const [manageRolesDialog, setManageRolesDialog] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [newRoleToAdd, setNewRoleToAdd] = useState("employee");
  const [roleLoading, setRoleLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*, departments(name)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Auto-select employee from URL param
  useEffect(() => {
    const empId = searchParams.get("id");
    if (empId && employees.length > 0 && !selectedEmployee) {
      const found = employees.find((e: any) => e.id === empId);
      if (found) {
        setSelectedEmployee(found);
        searchParams.delete("id");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [employees, searchParams, selectedEmployee, setSearchParams]);

  // Manager resolution is now position-based (parent_position_id → assigned employee)
  // The old manager_user_id field is kept for backwards compat but NOT used for display.
  // Use DirectManagerCard component for consistent display.


  const { data: emergencyContacts = [] } = useQuery({
    queryKey: ["emergency-contacts", selectedEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase.from("employee_emergency_contacts").select("*").eq("employee_id", selectedEmployee!.id);
      return data || [];
    },
    enabled: !!selectedEmployee?.id,
  });

  const { data: dependents = [] } = useQuery({
    queryKey: ["dependents", selectedEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase.from("employee_dependents").select("*").eq("employee_id", selectedEmployee!.id);
      return data || [];
    },
    enabled: !!selectedEmployee?.id,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["employee-assets", selectedEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase.from("employee_assets").select("*").eq("employee_id", selectedEmployee!.id);
      return data || [];
    },
    enabled: !!selectedEmployee?.id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["employee-notes", selectedEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase.from("employee_notes").select("*").eq("employee_id", selectedEmployee!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedEmployee?.id,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["employee-contracts", selectedEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*").eq("employee_id", selectedEmployee!.id).order("start_date", { ascending: false });
      return data || [];
    },
    enabled: !!selectedEmployee?.id,
  });

  const addEmployee = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: empData, error } = await supabase.from("employees").insert({
        company_id: companyId!,
        name_ar: formData.get("name_ar") as string,
        name_en: (formData.get("name_en") as string) || null,
        department_id: (formData.get("department_id") as string) || null,
        branch_id: (formData.get("branch_id") as string) || null,
        position: (formData.get("position") as string) || null,
        phone: (formData.get("phone") as string) || null,
        email: (formData.get("email") as string) || null,
        basic_salary: Number(formData.get("basic_salary")) || 0,
        hire_date: (formData.get("hire_date") as string) || null,
        national_id: (formData.get("national_id") as string) || null,
        date_of_birth: (formData.get("date_of_birth") as string) || null,
        gender: gender || null,
        contract_type: contractType,
        nationality: (formData.get("nationality") as string) || "عراقي",
        address: (formData.get("address") as string) || null,
      }).select("id").single();
      if (error) throw error;

      // Create login account if toggled
      if (createAccount && accountEmail && accountPassword) {
        const res = await supabase.functions.invoke("invite-user", {
          body: {
            email: accountEmail,
            password: accountPassword,
            role: accountRole,
            full_name: formData.get("name_ar") as string,
            company_id: companyId,
            employee_id: empData?.id,
          },
        });
        if (res.data?.error) {
          toast({ title: "تم إضافة الموظف لكن فشل إنشاء الحساب", description: res.data.error, variant: "destructive" });
        } else if (res.data?.success) {
          toast({
            title: "✅ تم إنشاء الحساب بنجاح",
            description: res.data.message,
            duration: 15000,
          });
        }
      }

      // Auto-assign onboarding templates to new employee
      if (empData?.id) {
        const { data: templates, error: tplErr } = await supabase
          .from("onboarding_templates")
          .select("*")
          .eq("company_id", companyId!)
          .eq("is_active", true)
          .order("sort_order");

        if (tplErr) {
          console.error("Failed to fetch onboarding templates:", tplErr);
        } else if (templates && templates.length > 0) {
          const tasks = templates.map((t: any) => ({
            company_id: companyId!,
            employee_id: empData.id,
            title: t.title,
            description: t.description,
            task_type: t.task_type,
          }));
          const { error: taskErr } = await supabase.from("onboarding_tasks").insert(tasks);
          if (taskErr) {
            console.error("Failed to create onboarding tasks:", taskErr);
            toast({ title: "تنبيه", description: "تم إضافة الموظف لكن فشل إنشاء مهام التهيئة تلقائياً", variant: "destructive" });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-count"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-tasks"] });
      toast({ title: "تم بنجاح", description: "تمت إضافة الموظف وتعيين مهام التهيئة" });
      setDialogOpen(false);
      setGender("");
      setContractType("permanent");
      setCreateAccount(false);
      setAccountEmail("");
      setAccountPassword("");
      setAccountRole("employee");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateEmployee = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("employees").update({
        name_ar: formData.get("name_ar") as string,
        name_en: (formData.get("name_en") as string) || null,
        department_id: (formData.get("department_id") as string) || null,
        branch_id: (formData.get("branch_id") as string) || null,
        position: (formData.get("position") as string) || null,
        phone: (formData.get("phone") as string) || null,
        email: (formData.get("email") as string) || null,
        basic_salary: Number(formData.get("basic_salary")) || 0,
        hire_date: (formData.get("hire_date") as string) || null,
        national_id: (formData.get("national_id") as string) || null,
        date_of_birth: (formData.get("date_of_birth") as string) || null,
        gender: editGender || null,
        contract_type: editContractType,
        nationality: (formData.get("nationality") as string) || "عراقي",
        address: (formData.get("address") as string) || null,
        status: editStatus,
      }).eq("id", editEmployee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "تم التحديث" });
      setEditDialog(false);
      setEditEmployee(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-count"] });
      toast({ title: "تم الحذف" });
      setSelectedEmployee(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase.from("employees").update({ status }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setSelectedIds(new Set());
      toast({ title: "تم التحديث", description: `تم تحديث ${selectedIds.size} موظف` });
    },
  });

  const bulkUpdateDepartment = useMutation({
    mutationFn: async ({ ids, department_id }: { ids: string[]; department_id: string }) => {
      const { error } = await supabase.from("employees").update({ department_id }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setSelectedIds(new Set());
      setBulkDept("");
      toast({ title: "تم النقل", description: `تم نقل ${selectedIds.size} موظف` });
    },
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e: any) => e.id)));
    }
  };

  const bulkImport = useMutation({
    mutationFn: async (file: File) => {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      const emps = rows.map(row => ({
        company_id: companyId!,
        name_ar: row["الاسم بالعربية"] || row["name_ar"] || row["الاسم"] || "",
        name_en: row["الاسم بالإنجليزية"] || row["name_en"] || null,
        position: row["المسمى الوظيفي"] || row["position"] || null,
        phone: row["الهاتف"] || row["phone"] || null,
        email: row["البريد"] || row["email"] || null,
        basic_salary: Number(row["الراتب"] || row["basic_salary"] || 0),
        national_id: row["رقم الهوية"] || row["national_id"] || null,
      })).filter(e => e.name_ar);
      if (emps.length === 0) throw new Error("لم يتم العثور على بيانات صالحة");
      const { error } = await supabase.from("employees").insert(emps);
      if (error) throw error;
      return emps.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "تم الاستيراد", description: `تم استيراد ${count} موظف بنجاح` });
    },
    onError: (err: Error) => toast({ title: "خطأ في الاستيراد", description: err.message, variant: "destructive" }),
  });

  const uploadAvatar = useMutation({
    mutationFn: async ({ file, employeeId }: { file: File; employeeId: string }) => {
      const ext = file.name.split('.').pop();
      const path = `${companyId}/${employeeId}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { error: updateErr } = await supabase.from("employees").update({ avatar_url: path }).eq("id", employeeId);
      if (updateErr) throw updateErr;
      return path;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "تم رفع الصورة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const addEmergencyContact = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("employee_emergency_contacts").insert({
        employee_id: selectedEmployee.id,
        name: formData.get("ec_name") as string,
        relationship: (formData.get("ec_relationship") as string) || null,
        phone: formData.get("ec_phone") as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] });
      toast({ title: "تم الحفظ" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const addDependent = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("employee_dependents").insert({
        employee_id: selectedEmployee.id,
        name: formData.get("dep_name") as string,
        relationship: formData.get("dep_relationship") as string,
        date_of_birth: (formData.get("dep_dob") as string) || null,
        national_id: (formData.get("dep_nid") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependents"] });
      toast({ title: "تم الحفظ" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const addAsset = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("employee_assets").insert({
        company_id: companyId!,
        employee_id: selectedEmployee.id,
        asset_name: formData.get("asset_name") as string,
        asset_type: formData.get("asset_type") as string,
        serial_number: (formData.get("serial_number") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-assets"] });
      toast({ title: "تم الحفظ" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const addNote = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("employee_notes").insert({
        employee_id: selectedEmployee.id,
        note: formData.get("note") as string,
        note_type: (formData.get("note_type") as string) || "general",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-notes"] });
      toast({ title: "تم الحفظ" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const addContract = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("contracts").insert({
        company_id: companyId!,
        employee_id: selectedEmployee.id,
        contract_type: (formData.get("c_type") as string) || "permanent",
        start_date: formData.get("c_start") as string,
        end_date: (formData.get("c_end") as string) || null,
        salary: Number(formData.get("c_salary")) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-contracts"] });
      toast({ title: "تم الحفظ" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const filtered = employees.filter((e: any) => {
    const matchSearch = e.name_ar.includes(search) || (e.name_en && e.name_en.toLowerCase().includes(search.toLowerCase())) || (e.employee_code && e.employee_code.includes(search));
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const matchDept = deptFilter === "all" || e.department_id === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const openEdit = (emp: any) => {
    setEditEmployee(emp);
    setEditGender(emp.gender || "");
    setEditContractType(emp.contract_type || "permanent");
    setEditStatus(emp.status || "active");
    setEditStatus(emp.status || "active");
    setEditDialog(true);
  };

  // Birthday check
  const today = new Date();
  const todayMD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const birthdayEmployees = employees.filter((e: any) => {
    if (!e.date_of_birth) return false;
    const dob = e.date_of_birth.slice(5); // MM-DD
    return dob === todayMD;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">إدارة الموظفين</h1>
          <p className="text-muted-foreground text-sm mt-1">{employees.length} موظف مسجّل</p>
        </div>
        <div className="flex gap-2">
          <AiModuleInsights
            module="employees"
            title="رؤى الموظفين"
            description="تحليل القوى العاملة والتوزيعات"
            feature="workforce_analytics"
            compact
            quickActions={[
              { label: "تكوين القوى العاملة", question: "حلل تكوين القوى العاملة الحالية مع التوزيعات حسب القسم والجنس ونوع العقد" },
              { label: "معدل الدوران", question: "ما هو معدل دوران الموظفين؟ حدد الأقسام الأكثر تأثراً واشرح الأسباب" },
              { label: "فجوات الأدوار", question: "هل توجد أقسام تعاني من نقص في الموظفين بناءً على عبء العمل؟" },
              { label: "مخاطر الخلافة", question: "حدد الأدوار الرئيسية التي قد تواجه مخاطر خلافة" },
            ]}
          />
          <Button variant="outline" className="gap-2 font-heading" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />استيراد Excel
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-heading"><UserPlus className="h-4 w-4" />إضافة موظف</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-heading">إضافة موظف جديد</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addEmployee.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>الاسم بالعربية *</Label><Input name="name_ar" required onChange={(e) => {
                    const enInput = e.target.form?.querySelector('[name="name_en"]') as HTMLInputElement;
                    if (enInput && !enInput.dataset.userEdited) {
                      enInput.value = transliterateArabicToEnglish(e.target.value);
                    }
                  }} /></div>
                  <div className="space-y-2"><Label>الاسم بالإنجليزية</Label><Input name="name_en" dir="ltr" className="text-left" onChange={(e) => { (e.target as HTMLInputElement).dataset.userEdited = "true"; }} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>رقم الهوية</Label><Input name="national_id" dir="ltr" className="text-left" /></div>
                  <div className="space-y-2"><Label>الجنس</Label><Select value={gender} onValueChange={setGender}><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger><SelectContent><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>تاريخ الميلاد</Label><Input name="date_of_birth" type="date" dir="ltr" className="text-left" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>القسم</Label><Select name="department_id"><SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger><SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>الفرع</Label><Select name="branch_id"><SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger><SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>المسمى الوظيفي</Label><Input name="position" /></div>
                  <div className="space-y-2"><Label>نوع العقد</Label><Select value={contractType} onValueChange={setContractType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="permanent">دائم</SelectItem><SelectItem value="temporary">مؤقت</SelectItem><SelectItem value="contract">عقد</SelectItem><SelectItem value="internship">تدريب</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>الهاتف</Label><Input name="phone" dir="ltr" className="text-left" /></div>
                  <div className="space-y-2"><Label>البريد</Label><Input name="email" type="email" dir="ltr" className="text-left" /></div>
                  <div className="space-y-2"><Label>تاريخ التعيين</Label><Input name="hire_date" type="date" dir="ltr" className="text-left" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>الراتب الأساسي (د.ع)</Label><Input name="basic_salary" type="number" dir="ltr" className="text-left" /></div>
                  <div className="space-y-2"><Label>الجنسية</Label><Input name="nationality" defaultValue="عراقي" /></div>
                </div>
                <div className="space-y-2"><Label>العنوان</Label><Input name="address" /></div>
                
                {/* Create Login Account Toggle */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Checkbox id="create_account" checked={createAccount} onCheckedChange={(v) => setCreateAccount(!!v)} />
                    <Label htmlFor="create_account" className="font-heading cursor-pointer flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      إنشاء حساب دخول للموظف
                    </Label>
                  </div>
                  {createAccount && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>البريد الإلكتروني للحساب *</Label>
                          <Input type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} placeholder="user@company.com" dir="ltr" className="text-left" required />
                        </div>
                        <div className="space-y-2">
                          <Label>كلمة المرور *</Label>
                          <Input type="password" value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} placeholder="كلمة مرور مؤقتة" dir="ltr" className="text-left" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>دور المستخدم</Label>
                        <Select value={accountRole} onValueChange={setAccountRole}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">مدير الشركة</SelectItem>
                            <SelectItem value="hr_manager">مدير الموارد البشرية</SelectItem>
                            <SelectItem value="employee">موظف</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full font-heading" disabled={addEmployee.isPending}>{addEmployee.isPending ? "جاري الحفظ..." : "حفظ الموظف"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Birthday Alert */}
      {birthdayEmployees.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Cake className="h-5 w-5 text-accent" />
            <p className="text-sm font-heading font-medium">
              🎂 عيد ميلاد اليوم: {birthdayEmployees.map((e: any) => e.name_ar).join("، ")}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الكود أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="on_leave">في إجازة</SelectItem>
            <SelectItem value="probation">تجربة</SelectItem>
            <SelectItem value="terminated">منتهي</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="القسم" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأقسام</SelectItem>
            {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("table")}><LayoutList className="h-4 w-4" /></Button>
          <Button variant={viewMode === "cards" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("cards")}><LayoutGrid className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-3 flex-wrap">
            <Badge className="bg-primary text-primary-foreground font-heading">{selectedIds.size} محدد</Badge>
            <Select value={bulkAction} onValueChange={(v) => {
              setBulkAction(v);
              if (v && v !== "move_dept") {
                bulkUpdateStatus.mutate({ ids: Array.from(selectedIds), status: v });
                setBulkAction("");
              }
            }}>
              <SelectTrigger className="w-40 h-8"><SelectValue placeholder="تغيير الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="on_leave">في إجازة</SelectItem>
                <SelectItem value="suspended">موقوف</SelectItem>
                <SelectItem value="terminated">منتهي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bulkDept} onValueChange={(v) => {
              setBulkDept(v);
              bulkUpdateDepartment.mutate({ ids: Array.from(selectedIds), department_id: v });
            }}>
              <SelectTrigger className="w-40 h-8"><SelectValue placeholder="نقل لقسم" /></SelectTrigger>
              <SelectContent>
                {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedIds(new Set())}>إلغاء التحديد</Button>
          </CardContent>
        </Card>
      )}


      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />) :
          filtered.length > 0 ? filtered.map((emp: any) => (
            <Card key={emp.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setSelectedEmployee(emp)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 border-2 border-border">
                    <AvatarImage src={getAvatarUrl(emp.avatar_url) || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-heading font-bold text-lg">{emp.name_ar[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-base truncate">{emp.name_ar}</p>
                    {emp.name_en && <p className="text-xs text-muted-foreground truncate">{emp.name_en}</p>}
                    <p className="text-sm text-muted-foreground mt-0.5">{emp.position || "—"}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${statusColors[emp.status]}`}>{statusLabels[emp.status]}</Badge>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />{emp.departments?.name || "—"}</div>
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /><span dir="ltr">{emp.phone || "—"}</span></div>
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span dir="ltr" className="truncate">{emp.email || "—"}</span></div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="font-mono text-xs text-muted-foreground">{emp.employee_code || "—"}</span>
                  <span className="font-heading font-bold text-sm text-primary">{(emp.basic_salary || 0).toLocaleString("ar-IQ")} د.ع</span>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-heading font-medium">لا يوجد موظفون</p>
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded border-input" /></TableHead>
                    <TableHead></TableHead><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>القسم</TableHead><TableHead>المسمى</TableHead><TableHead>الهاتف</TableHead><TableHead>الحالة</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp: any) => (
                    <TableRow key={emp.id} className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(emp.id) ? "bg-primary/5" : ""}`}>
                      <TableCell className="w-8" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(emp.id)} onChange={() => toggleSelect(emp.id)} className="rounded border-input" />
                      </TableCell>
                      <TableCell className="w-10">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getAvatarUrl(emp.avatar_url) || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-heading">{emp.name_ar[0]}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{emp.employee_code || "—"}</TableCell>
                      <TableCell><div><p className="font-medium">{emp.name_ar}</p>{emp.name_en && <p className="text-xs text-muted-foreground">{emp.name_en}</p>}</div></TableCell>
                      <TableCell>{emp.departments?.name || "—"}</TableCell>
                      <TableCell>{emp.position || "—"}</TableCell>
                      <TableCell dir="ltr" className="text-left">{emp.phone || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[emp.status]}>{statusLabels[emp.status] || emp.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedEmployee(emp)}><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("حذف هذا الموظف؟")) deleteEmployee.mutate(emp.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-heading font-medium">لا يوجد موظفون</p>
                <p className="text-sm mt-1">ابدأ بإضافة أول موظف أو استيراد من Excel</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Employee Dialog */}
      {editEmployee && (
        <Dialog open={editDialog} onOpenChange={(o) => { setEditDialog(o); if (!o) setEditEmployee(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-heading">تعديل بيانات الموظف</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); updateEmployee.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>الاسم بالعربية *</Label><Input name="name_ar" defaultValue={editEmployee.name_ar} required /></div>
                <div className="space-y-2"><Label>الاسم بالإنجليزية</Label><Input name="name_en" defaultValue={editEmployee.name_en || ""} dir="ltr" className="text-left" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>رقم الهوية</Label><Input name="national_id" defaultValue={editEmployee.national_id || ""} dir="ltr" className="text-left" /></div>
                <div className="space-y-2"><Label>الجنس</Label><Select value={editGender} onValueChange={setEditGender}><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger><SelectContent><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>الحالة</Label><Select value={editStatus} onValueChange={setEditStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="on_leave">في إجازة</SelectItem><SelectItem value="probation">تجربة</SelectItem><SelectItem value="suspended">موقوف</SelectItem><SelectItem value="terminated">منتهي</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>القسم</Label><Select name="department_id" defaultValue={editEmployee.department_id || ""}><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger><SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>الفرع</Label><Select name="branch_id" defaultValue={editEmployee.branch_id || ""}><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger><SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>المسمى</Label><Input name="position" defaultValue={editEmployee.position || ""} /></div>
                <div className="space-y-2"><Label>نوع العقد</Label><Select value={editContractType} onValueChange={setEditContractType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="permanent">دائم</SelectItem><SelectItem value="temporary">مؤقت</SelectItem><SelectItem value="contract">عقد</SelectItem><SelectItem value="internship">تدريب</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>الهاتف</Label><Input name="phone" defaultValue={editEmployee.phone || ""} dir="ltr" className="text-left" /></div>
                <div className="space-y-2"><Label>البريد</Label><Input name="email" defaultValue={editEmployee.email || ""} dir="ltr" className="text-left" /></div>
                <div className="space-y-2"><Label>تاريخ التعيين</Label><Input name="hire_date" type="date" defaultValue={editEmployee.hire_date || ""} dir="ltr" className="text-left" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>الراتب (د.ع)</Label><Input name="basic_salary" type="number" defaultValue={editEmployee.basic_salary || 0} dir="ltr" className="text-left" /></div>
                <div className="space-y-2"><Label>الجنسية</Label><Input name="nationality" defaultValue={editEmployee.nationality || "عراقي"} /></div>
                <div className="space-y-2"><Label>تاريخ الميلاد</Label><Input name="date_of_birth" type="date" defaultValue={editEmployee.date_of_birth || ""} dir="ltr" className="text-left" /></div>
              </div>
              <div className="space-y-2"><Label>العنوان</Label><Input name="address" defaultValue={editEmployee.address || ""} /></div>
              {/* Manager info — position-based (read-only) */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <Label className="font-heading flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-primary" />
                  المدير المباشر
                </Label>
                <DirectManagerCard positionId={editEmployee?.position_id} companyId={companyId} compact employeeDepartmentId={editEmployee?.department_id} />
                <p className="text-xs text-muted-foreground">
                  المدير المباشر يُحدد تلقائياً من الهيكل التنظيمي (المنصب الأعلى). لتغييره، عدّل ربط المنصب في الهيكل التنظيمي.
                </p>
              </div>
              <Button type="submit" className="w-full font-heading" disabled={updateEmployee.isPending}>{updateEmployee.isPending ? "جاري الحفظ..." : "تحديث البيانات"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Employee Detail Sheet */}
      {selectedEmployee && (
        <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading flex items-center gap-3">
                <div className="relative group">
                  <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={getAvatarUrl(selectedEmployee.avatar_url) || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-heading font-bold">{selectedEmployee.name_ar[0]}</AvatarFallback>
                  </Avatar>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadAvatar.mutate({ file: f, employeeId: selectedEmployee.id });
                    }}
                  />
                  <button
                    type="button"
                    className="absolute inset-0 rounded-full bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 text-background" />
                  </button>
                </div>
                <div>
                  <p>{selectedEmployee.name_ar}</p>
                  <p className="text-xs text-muted-foreground font-normal">{selectedEmployee.employee_code} • {selectedEmployee.position || "—"}</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Create Account Button for employees without user_id */}
            {!selectedEmployee.user_id && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                <KeyRound className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground flex-1">هذا الموظف ليس لديه حساب دخول</span>
                <Button size="sm" variant="outline" className="font-heading gap-1" onClick={() => {
                  setCreateAccountEmpId(selectedEmployee.id);
                  setCaEmail(selectedEmployee.email || "");
                  setCaPassword("");
                  setCaRole("employee");
                  setCreateAccountDialog(true);
                }}>
                  <KeyRound className="h-3.5 w-3.5" />
                  إنشاء حساب
                </Button>
              </div>
            )}
            {selectedEmployee.user_id && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5">
                <KeyRound className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium flex-1">لديه حساب دخول مربوط</span>
                <Button size="sm" variant="outline" className="font-heading gap-1 text-xs" onClick={() => {
                  setCreateAccountEmpId(selectedEmployee.id);
                  setCaEmail(selectedEmployee.email || "");
                  setCaPassword("");
                  setCaRole("employee");
                  setManageRolesDialog(true);
                  // Fetch current roles
                  supabase.from("user_roles").select("role, scope_type").eq("user_id", selectedEmployee.user_id).then(({ data }) => {
                    setCurrentRoles((data || []).map((r: any) => r.role));
                  });
                }}>
                  <Shield className="h-3.5 w-3.5" />
                  إدارة الأدوار
                </Button>
              </div>
            )}
            <Tabs defaultValue="service">
              <TabsList className="w-full flex flex-wrap gap-0.5">
                <TabsTrigger value="service" className="font-heading text-xs gap-1"><TrendingUp className="h-3 w-3" />الخدمة</TabsTrigger>
                <TabsTrigger value="info" className="font-heading text-xs">المعلومات</TabsTrigger>
                <TabsTrigger value="archive" className="font-heading text-xs">الأرشيف</TabsTrigger>
                <TabsTrigger value="timeline" className="font-heading text-xs">السجل</TabsTrigger>
                <TabsTrigger value="contracts" className="font-heading text-xs">العقود</TabsTrigger>
                <TabsTrigger value="penalties" className="font-heading text-xs gap-1"><Award className="h-3 w-3" />جزاءات/تكريم</TabsTrigger>
                <TabsTrigger value="dependents" className="font-heading text-xs">المعالون</TabsTrigger>
                <TabsTrigger value="assets" className="font-heading text-xs">الأصول</TabsTrigger>
                <TabsTrigger value="emergency" className="font-heading text-xs">الطوارئ</TabsTrigger>
                <TabsTrigger value="notes" className="font-heading text-xs">الملاحظات</TabsTrigger>
                <TabsTrigger value="warnings" className="font-heading text-xs">الإنذارات</TabsTrigger>
                <TabsTrigger value="onboarding" className="font-heading text-xs gap-1"><ClipboardCheck className="h-3 w-3" />التهيئة</TabsTrigger>
              </TabsList>

              <TabsContent value="service" className="mt-4">
                <EmployeeServiceInfo employee={selectedEmployee} companyId={companyId!} />
              </TabsContent>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{selectedEmployee.email || "—"}</span></div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span dir="ltr">{selectedEmployee.phone || "—"}</span></div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{selectedEmployee.address || "—"}</span></div>
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>هوية: {selectedEmployee.national_id || "—"}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">الجنسية:</span> {selectedEmployee.nationality || "—"}</div>
                  <div><span className="text-muted-foreground">الجنس:</span> {selectedEmployee.gender === "male" ? "ذكر" : selectedEmployee.gender === "female" ? "أنثى" : "—"}</div>
                  <div><span className="text-muted-foreground">تاريخ الميلاد:</span> {selectedEmployee.date_of_birth || "—"}</div>
                  <div><span className="text-muted-foreground">نوع العقد:</span> {selectedEmployee.contract_type === "permanent" ? "دائم" : selectedEmployee.contract_type === "temporary" ? "مؤقت" : selectedEmployee.contract_type || "—"}</div>
                  <div><span className="text-muted-foreground">القسم:</span> {selectedEmployee.departments?.name || "—"}</div>
                  <div><span className="text-muted-foreground">تاريخ التعيين:</span> {selectedEmployee.hire_date || "—"}</div>
                  <div><span className="text-muted-foreground">الراتب:</span> {(selectedEmployee.basic_salary || 0).toLocaleString("ar-IQ")} د.ع</div>
                  <div><span className="text-muted-foreground">الحالة:</span> <Badge variant="outline" className={statusColors[selectedEmployee.status]}>{statusLabels[selectedEmployee.status]}</Badge></div>
                  <div className="col-span-2">
                    <DirectManagerCard positionId={selectedEmployee.position_id} companyId={companyId} compact employeeDepartmentId={selectedEmployee.department_id} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="archive" className="mt-4">
                <EmployeeArchive employeeId={selectedEmployee.id} companyId={companyId!} />
              </TabsContent>

              <TabsContent value="timeline" className="space-y-3 mt-4">
                <EmployeeTimeline employeeId={selectedEmployee.id} companyId={companyId!} />
              </TabsContent>

              <TabsContent value="contracts" className="space-y-4 mt-4">
                {contracts.length > 0 && contracts.map((c: any) => (
                  <div key={c.id} className="p-3 rounded-lg bg-muted flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.contract_type === "permanent" ? "دائم" : c.contract_type === "temporary" ? "مؤقت" : c.contract_type}</p>
                      <p className="text-sm text-muted-foreground">{c.start_date} → {c.end_date || "مفتوح"}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{(c.salary || 0).toLocaleString("ar-IQ")} د.ع</p>
                      <Badge variant="outline" className={c.status === "active" ? "bg-primary/10 text-primary" : ""}>{c.status === "active" ? "نشط" : c.status}</Badge>
                    </div>
                  </div>
                ))}
                <form onSubmit={(e) => { e.preventDefault(); addContract.mutate(new FormData(e.currentTarget)); e.currentTarget.reset(); }} className="space-y-3 border-t pt-4">
                  <p className="font-heading font-bold text-sm">إضافة عقد</p>
                  <div className="grid grid-cols-4 gap-3">
                    <Select name="c_type" defaultValue="permanent"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="permanent">دائم</SelectItem><SelectItem value="temporary">مؤقت</SelectItem><SelectItem value="contract">عقد</SelectItem></SelectContent></Select>
                    <Input name="c_start" type="date" required dir="ltr" className="text-left" placeholder="بداية" />
                    <Input name="c_end" type="date" dir="ltr" className="text-left" placeholder="نهاية" />
                    <Input name="c_salary" type="number" placeholder="الراتب" dir="ltr" className="text-left" />
                  </div>
                  <Button size="sm" type="submit" className="font-heading" disabled={addContract.isPending}>حفظ العقد</Button>
                </form>
              </TabsContent>

              <TabsContent value="dependents" className="space-y-4 mt-4">
                {dependents.length > 0 && dependents.map((d: any) => (
                  <div key={d.id} className="p-3 rounded-lg bg-muted flex items-center justify-between">
                    <div><p className="font-medium">{d.name}</p><p className="text-sm text-muted-foreground">{d.relationship}</p></div>
                    <div className="text-sm text-muted-foreground">{d.date_of_birth || "—"}</div>
                  </div>
                ))}
                <form onSubmit={(e) => { e.preventDefault(); addDependent.mutate(new FormData(e.currentTarget)); e.currentTarget.reset(); }} className="space-y-3 border-t pt-4">
                  <p className="font-heading font-bold text-sm">إضافة معال</p>
                  <div className="grid grid-cols-4 gap-3">
                    <Input name="dep_name" placeholder="الاسم" required />
                    <Input name="dep_relationship" placeholder="العلاقة (زوج/ابن)" required />
                    <Input name="dep_dob" type="date" dir="ltr" className="text-left" />
                    <Input name="dep_nid" placeholder="رقم الهوية" dir="ltr" className="text-left" />
                  </div>
                  <Button size="sm" type="submit" className="font-heading" disabled={addDependent.isPending}>حفظ</Button>
                </form>
              </TabsContent>

              <TabsContent value="assets" className="space-y-4 mt-4">
                {assets.length > 0 && assets.map((a: any) => (
                  <div key={a.id} className="p-3 rounded-lg bg-muted flex items-center justify-between">
                    <div><p className="font-medium">{a.asset_name}</p><p className="text-sm text-muted-foreground">{a.asset_type} {a.serial_number ? `• ${a.serial_number}` : ""}</p></div>
                    <Badge variant="outline" className={a.status === "assigned" ? "bg-primary/10 text-primary" : ""}>{a.status === "assigned" ? "مُسلّم" : a.status === "returned" ? "مُرتجع" : a.status}</Badge>
                  </div>
                ))}
                <form onSubmit={(e) => { e.preventDefault(); addAsset.mutate(new FormData(e.currentTarget)); e.currentTarget.reset(); }} className="space-y-3 border-t pt-4">
                  <p className="font-heading font-bold text-sm">إضافة أصل</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Input name="asset_name" placeholder="اسم الأصل (لابتوب)" required />
                    <Input name="asset_type" placeholder="النوع (إلكترونيات)" required />
                    <Input name="serial_number" placeholder="الرقم التسلسلي" dir="ltr" className="text-left" />
                  </div>
                  <Button size="sm" type="submit" className="font-heading" disabled={addAsset.isPending}>حفظ</Button>
                </form>
              </TabsContent>

              <TabsContent value="emergency" className="space-y-4 mt-4">
                {emergencyContacts.length > 0 && emergencyContacts.map((ec: any) => (
                  <div key={ec.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div><p className="font-medium">{ec.name}</p><p className="text-sm text-muted-foreground">{ec.relationship || "—"}</p></div>
                    <p className="text-sm" dir="ltr">{ec.phone}</p>
                  </div>
                ))}
                <form onSubmit={(e) => { e.preventDefault(); addEmergencyContact.mutate(new FormData(e.currentTarget)); e.currentTarget.reset(); }} className="space-y-3 border-t pt-4">
                  <p className="font-heading font-bold text-sm">إضافة جهة اتصال طوارئ</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Input name="ec_name" placeholder="الاسم" required />
                    <Input name="ec_relationship" placeholder="العلاقة" />
                    <Input name="ec_phone" placeholder="الهاتف" required dir="ltr" className="text-left" />
                  </div>
                  <Button size="sm" type="submit" className="font-heading" disabled={addEmergencyContact.isPending}>حفظ</Button>
                </form>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4 mt-4">
                {notes.length > 0 && notes.map((n: any) => (
                  <div key={n.id} className="p-3 rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">{n.note_type === "general" ? "عام" : n.note_type === "disciplinary" ? "تأديبي" : n.note_type === "performance" ? "أداء" : n.note_type}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString("ar-IQ")}</span>
                    </div>
                    <p className="text-sm">{n.note}</p>
                  </div>
                ))}
                <form onSubmit={(e) => { e.preventDefault(); addNote.mutate(new FormData(e.currentTarget)); e.currentTarget.reset(); }} className="space-y-3 border-t pt-4">
                  <p className="font-heading font-bold text-sm">إضافة ملاحظة</p>
                  <Select name="note_type" defaultValue="general"><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">عام</SelectItem><SelectItem value="disciplinary">تأديبي</SelectItem><SelectItem value="performance">أداء</SelectItem><SelectItem value="warning">تحذير</SelectItem></SelectContent></Select>
                  <Textarea name="note" placeholder="الملاحظة..." required rows={3} />
                  <Button size="sm" type="submit" className="font-heading" disabled={addNote.isPending}>حفظ</Button>
                </form>
              </TabsContent>

              <TabsContent value="penalties" className="mt-4">
                {companyId && <EmployeePenaltiesPraise employeeId={selectedEmployee.id} companyId={companyId} isManager={true} />}
              </TabsContent>

              <TabsContent value="warnings" className="mt-4">
                {companyId && (
                  <EmployeeWarnings
                    employees={[selectedEmployee]}
                    companyId={companyId}
                    isManager={true}
                  />
                )}
              </TabsContent>

              <TabsContent value="onboarding" className="mt-4">
                {companyId && <EmployeeOnboardingProgress employeeId={selectedEmployee.id} companyId={companyId} />}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Account Dialog for existing employee */}
      <Dialog open={createAccountDialog} onOpenChange={setCreateAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              إنشاء حساب دخول للموظف
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={caEmail} onChange={(e) => setCaEmail(e.target.value)} placeholder="user@company.com" dir="ltr" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input type="password" value={caPassword} onChange={(e) => setCaPassword(e.target.value)} placeholder="كلمة مرور مؤقتة" dir="ltr" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select value={caRole} onValueChange={setCaRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_admin">مدير النظام</SelectItem>
                  <SelectItem value="admin">مدير الشركة</SelectItem>
                  <SelectItem value="hr_manager">مدير الموارد البشرية</SelectItem>
                  <SelectItem value="hr_officer">مسؤول موارد بشرية</SelectItem>
                  <SelectItem value="finance_manager">مدير مالي</SelectItem>
                  <SelectItem value="manager">مدير قسم</SelectItem>
                  <SelectItem value="employee">موظف</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">الدور يحدد صلاحيات المستخدم في النظام</p>
            </div>
            <Button className="w-full font-heading" disabled={caLoading || !caEmail || !caPassword} onClick={async () => {
              setCaLoading(true);
              try {
                const res = await supabase.functions.invoke("invite-user", {
                  body: {
                    email: caEmail,
                    password: caPassword,
                    role: caRole,
                    full_name: selectedEmployee?.name_ar || "",
                    company_id: companyId,
                    employee_id: createAccountEmpId,
                  },
                });
                if (res.data?.error) throw new Error(res.data.error);
                toast({ title: "تم إنشاء الحساب بنجاح" });
                queryClient.invalidateQueries({ queryKey: ["employees"] });
                setCreateAccountDialog(false);
                // Refresh selected employee
                if (selectedEmployee) {
                  setSelectedEmployee({ ...selectedEmployee, user_id: res.data?.user_id });
                }
              } catch (err: any) {
                toast({ title: "خطأ", description: err.message, variant: "destructive" });
              } finally {
                setCaLoading(false);
              }
            }}>
              {caLoading ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={manageRolesDialog} onOpenChange={setManageRolesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              إدارة أدوار الموظف
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-heading mb-2 block">الأدوار الحالية</Label>
              {currentRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {currentRoles.map((role) => {
                    const roleLabels: Record<string, string> = {
                      super_admin: "مدير المنصة", business_admin: "مدير الأعمال", tenant_admin: "مدير النظام",
                      admin: "مدير الشركة", hr_manager: "مدير موارد بشرية", hr_officer: "مسؤول موارد بشرية",
                      finance_manager: "مدير مالي", manager: "مدير قسم", employee: "موظف",
                      support_agent: "دعم فني", sales_manager: "مدير مبيعات", technical_admin: "مدير تقني",
                    };
                    return (
                      <Badge key={role} variant="secondary" className="gap-1.5 py-1 px-2.5">
                        {roleLabels[role] || role}
                        <button
                          type="button"
                          className="text-destructive hover:text-destructive/80 ml-1"
                          onClick={async () => {
                            if (currentRoles.length <= 1) {
                              toast({ title: "لا يمكن إزالة الدور الأخير", variant: "destructive" });
                              return;
                            }
                            setRoleLoading(true);
                            const { error } = await supabase
                              .from("user_roles")
                              .delete()
                              .eq("user_id", selectedEmployee.user_id)
                              .eq("role", role as any);
                            if (error) {
                              toast({ title: "خطأ", description: error.message, variant: "destructive" });
                            } else {
                              setCurrentRoles((prev) => prev.filter((r) => r !== role));
                              toast({ title: "تم إزالة الدور" });
                              queryClient.invalidateQueries({ queryKey: ["user-roles"] });
                            }
                            setRoleLoading(false);
                          }}
                        >
                          ✕
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد أدوار</p>
              )}
            </div>
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-heading">إضافة دور جديد</Label>
              <div className="flex gap-2">
                <Select value={newRoleToAdd} onValueChange={setNewRoleToAdd}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_admin">مدير النظام</SelectItem>
                    <SelectItem value="admin">مدير الشركة</SelectItem>
                    <SelectItem value="hr_manager">مدير موارد بشرية</SelectItem>
                    <SelectItem value="hr_officer">مسؤول موارد بشرية</SelectItem>
                    <SelectItem value="finance_manager">مدير مالي</SelectItem>
                    <SelectItem value="manager">مدير قسم</SelectItem>
                    <SelectItem value="employee">موظف</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="font-heading"
                  disabled={roleLoading || currentRoles.includes(newRoleToAdd)}
                  onClick={async () => {
                    setRoleLoading(true);
                    const { error } = await supabase.from("user_roles").insert({
                      user_id: selectedEmployee.user_id,
                      role: newRoleToAdd as any,
                      scope_type: "tenant",
                      tenant_id: companyId!,
                    });
                    if (error) {
                      toast({ title: "خطأ", description: error.message, variant: "destructive" });
                    } else {
                      setCurrentRoles((prev) => [...prev, newRoleToAdd]);
                      toast({ title: "تم إضافة الدور بنجاح" });
                      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
                    }
                    setRoleLoading(false);
                  }}
                >
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة
                </Button>
              </div>
              {currentRoles.includes(newRoleToAdd) && (
                <p className="text-xs text-muted-foreground">هذا الدور مُعيّن بالفعل</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {companyId && (
        <EmployeeImport
          companyId={companyId}
          departments={departments}
          branches={branches}
          open={importOpen}
          onOpenChange={setImportOpen}
        />
      )}
    </div>
  );
}
