import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, KeyRound, UserX, Search, Users, ShieldCheck, Copy } from "lucide-react";
import { getRoleMeta } from "@/lib/roles";
import type { AppRole } from "@/hooks/useRole";

const TENANT_ROLES: { value: AppRole; labelAr: string }[] = [
  { value: "tenant_admin", labelAr: "مدير المنشأة" },
  { value: "admin", labelAr: "مسؤول" },
  { value: "hr_manager", labelAr: "مدير موارد بشرية" },
  { value: "hr_officer", labelAr: "مسؤول موارد بشرية" },
  { value: "manager", labelAr: "مدير" },
  { value: "employee", labelAr: "موظف" },
];

const MODULE_KEYS = [
  { key: "tamkeen", labelAr: "تمكين — الموارد البشرية" },
  { key: "tathbeet", labelAr: "تثبيت — الحجوزات" },
  { key: "tahseel", labelAr: "تحصيل — المالية" },
  { key: "takzeen", labelAr: "تخزين — المخزون" },
];

interface UserRow {
  user_id: string;
  full_name: string | null;
  email: string;
  roles: { role: AppRole; scope_type: string }[];
  status: "active" | "inactive";
}

export default function MadadUsers() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  // Fetch all users in this tenant
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["madad-users", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      // Get profiles for this company
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("company_id", companyId);
      if (error) throw error;
      if (!profiles?.length) return [];

      const userIds = profiles.map((p) => p.user_id);

      // Get roles for these users
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role, scope_type")
        .in("user_id", userIds);

      // Build user list — email comes from auth metadata stored in full_name or fallback
      return profiles.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: "", // Will be filled if possible
        roles: (roles || []).filter((r) => r.user_id === p.user_id).map((r) => ({ role: r.role as AppRole, scope_type: r.scope_type })),
        status: "active" as const,
      }));
    },
    enabled: !!companyId,
  });

  const filtered = users.filter(
    (u) => !search || (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("إدارة المستخدمين", "User Management")}
        description={t("إدارة مستخدمي المنشأة والصلاحيات", "Manage users and permissions")}
      />

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("بحث بالاسم...", "Search by name...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("إضافة مستخدم", "Add User")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-xs text-muted-foreground">{t("إجمالي المستخدمين", "Total Users")}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{users.filter((u) => u.roles.some((r) => r.role === "tenant_admin" || r.role === "admin")).length}</div>
              <div className="text-xs text-muted-foreground">{t("مسؤولون", "Admins")}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("الاسم", "Name")}</TableHead>
                <TableHead>{t("الدور", "Role")}</TableHead>
                <TableHead className="text-center">{t("الإجراءات", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t("جاري التحميل...", "Loading...")}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t("لا يوجد مستخدمون", "No users found")}</TableCell></TableRow>
              ) : filtered.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || t("بدون اسم", "No name")}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r, i) => {
                        const meta = getRoleMeta(r.role);
                        return (
                          <Badge key={i} variant="outline" className={`text-[10px] px-1.5 py-0 ${meta.color}`}>
                            {meta.labelAr}
                          </Badge>
                        );
                      })}
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">{t("بدون دور", "No role")}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-1 justify-center">
                      <Button size="icon" variant="ghost" onClick={() => setEditUser(u)} title={t("تعديل", "Edit")}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} companyId={companyId} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["madad-users"] })} />

      {/* Edit User Dialog */}
      {editUser && (
        <EditUserDialog user={editUser} open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }} companyId={companyId} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ["madad-users"] }); setEditUser(null); }} />
      )}
    </div>
  );
}

/* ==================== CREATE USER DIALOG ==================== */
function CreateUserDialog({ open, onOpenChange, companyId, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; companyId: string | undefined; onSuccess: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "employee" as AppRole });
  const [magicLink, setMagicLink] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("invite-user", {
        body: { email: form.email, password: form.password || undefined, full_name: form.full_name, role: form.role, company_id: companyId },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(t("تم إنشاء المستخدم بنجاح", "User created successfully"));
      if (data?.magic_link) {
        setMagicLink(data.magic_link);
      } else {
        setForm({ full_name: "", email: "", password: "", role: "employee" });
        onOpenChange(false);
      }
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleClose = (v: boolean) => {
    if (!v) {
      setMagicLink(null);
      setForm({ full_name: "", email: "", password: "", role: "employee" });
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("إضافة مستخدم جديد", "Add New User")}</DialogTitle>
        </DialogHeader>

        {magicLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("تم إنشاء الحساب بنجاح. شارك رابط الدخول أدناه:", "Account created. Share the login link below:")}</p>
            <div className="flex gap-2">
              <Input value={magicLink} readOnly className="text-xs" />
              <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(magicLink); toast.success(t("تم النسخ", "Copied")); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>{t("إغلاق", "Close")}</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>{t("الاسم الكامل", "Full Name")}</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label>{t("البريد الإلكتروني", "Email")}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>{t("كلمة المرور (اختياري)", "Password (optional)")}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t("اتركه فارغاً لإرسال رابط", "Leave empty for magic link")} />
            </div>
            <div>
              <Label>{t("الدور", "Role")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TENANT_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.labelAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">{t("إلغاء", "Cancel")}</Button></DialogClose>
              <Button onClick={() => createMutation.mutate()} disabled={!form.email || createMutation.isPending}>
                {createMutation.isPending ? t("جاري الإنشاء...", "Creating...") : t("إنشاء", "Create")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ==================== EDIT USER DIALOG ==================== */
function EditUserDialog({ user, open, onOpenChange, companyId, onSuccess }: { user: UserRow; open: boolean; onOpenChange: (v: boolean) => void; companyId: string | undefined; onSuccess: () => void }) {
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<AppRole>(user.roles[0]?.role || "employee");

  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      // Delete existing roles for this user
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", user.user_id);
      if (delErr) throw delErr;
      // Insert new role
      const { error: insErr } = await supabase.from("user_roles").insert({
        user_id: user.user_id,
        role: selectedRole,
        scope_type: "tenant",
        tenant_id: companyId,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success(t("تم تحديث الدور", "Role updated"));
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("تعديل المستخدم", "Edit User")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("الاسم", "Name")}</Label>
            <Input value={user.full_name || ""} readOnly className="bg-muted" />
          </div>
          <div>
            <Label>{t("الدور", "Role")}</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TENANT_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.labelAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("إلغاء", "Cancel")}</Button></DialogClose>
            <Button onClick={() => updateRoleMutation.mutate()} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? t("جاري الحفظ...", "Saving...") : t("حفظ", "Save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
