import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Search, ShieldCheck, UserPlus, Ban, CheckCircle2, Crown, Shield, Eye } from "lucide-react";

const PLATFORM_ROLES = [
  { value: "super_admin", label: "Super Admin", labelAr: "مدير أعلى" },
  { value: "business_admin", label: "Platform Admin", labelAr: "مدير المنصة" },
  { value: "support_agent", label: "Support Admin", labelAr: "مدير الدعم" },
  { value: "tenant_admin", label: "Tenant Owner", labelAr: "مالك المنشأة" },
  { value: "admin", label: "Tenant Admin", labelAr: "مدير المنشأة" },
  { value: "employee", label: "User", labelAr: "مستخدم" },
] as const;

interface PlatformUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  company_id: string | null;
  roles: { role: string; scope_type: string; tenant_id: string | null }[];
}

export default function MadadAdminUsers() {
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const { isSuperAdmin } = useRole();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<PlatformUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: PlatformUser } | null>(null);

  // Create form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("employee");

  const invoke = async (action: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke("admin-manage-users", {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["platform-users"],
    queryFn: async () => {
      const data = await invoke("list", {});
      return (data.users || []) as PlatformUser[];
    },
    enabled: isSuperAdmin,
  });

  const createMut = useMutation({
    mutationFn: () =>
      invoke("create", {
        email: newEmail,
        password: newPassword,
        full_name: newName,
        roles: [{ role: newRole, scope_type: ["super_admin", "business_admin", "support_agent", "sales_manager", "technical_admin", "finance_manager"].includes(newRole) ? "platform" : "tenant" }],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-users"] });
      toast.success(t("تم إنشاء المستخدم بنجاح", "User created successfully"));
      setCreateOpen(false);
      setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("employee");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatusMut = useMutation({
    mutationFn: ({ user_id, activate }: { user_id: string; activate: boolean }) =>
      invoke(activate ? "activate" : "deactivate", { user_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-users"] });
      toast.success(t("تم التحديث", "Updated"));
      setConfirmAction(null);
      setDetailUser(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q);
  });

  const getRoleBadge = (role: string) => {
    const meta = PLATFORM_ROLES.find((r) => r.value === role);
    const label = meta ? t(meta.labelAr, meta.label) : role;
    const style = role === "super_admin" ? "bg-destructive/10 text-destructive" :
      role === "business_admin" ? "bg-primary/10 text-primary" :
      "bg-muted text-muted-foreground";
    return <Badge key={role} className={style}>{label}</Badge>;
  };

  if (!isSuperAdmin) return <div className="p-8 text-center text-muted-foreground">{t("غير مصرح", "Unauthorized")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-extrabold text-2xl flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t("إدارة المستخدمين", "User Management")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("إنشاء وإدارة مستخدمي المنصة والأدوار", "Create and manage platform users and roles")}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" />{t("مستخدم جديد", "New User")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder={t("بحث بالبريد أو الاسم...", "Search by email or name...")} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t("جاري التحميل...", "Loading...")}</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((u) => (
            <Card key={u.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setDetailUser(u)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-bold">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {u.roles.map((r) => getRoleBadge(r.role))}
                    {u.banned && <Badge variant="destructive">{t("معطل", "Banned")}</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">{t("لا يوجد مستخدمون", "No users found")}</div>
          )}
        </div>
      )}

      {/* CREATE USER DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />{t("إنشاء مستخدم جديد", "Create New User")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("البريد الإلكتروني", "Email")}</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <Label>{t("كلمة المرور", "Password")}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••" />
            </div>
            <div>
              <Label>{t("الاسم الكامل", "Full Name")}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <Label>{t("الدور", "Role")}</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{t(r.labelAr, r.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newRole === "super_admin" && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <Crown className="h-4 w-4 shrink-0" />
                {t("سيحصل هذا المستخدم على صلاحيات كاملة على المنصة", "This user will have full platform access")}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button
              onClick={() => {
                if (newRole === "super_admin") {
                  setConfirmAction({ type: "create_super", user: { id: "", email: newEmail } as any });
                } else {
                  createMut.mutate();
                }
              }}
              disabled={!newEmail || !newPassword || createMut.isPending}
            >
              {createMut.isPending ? t("جاري الإنشاء...", "Creating...") : t("إنشاء", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* USER DETAIL DIALOG */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />{t("تفاصيل المستخدم", "User Details")}
            </DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{t("الاسم:", "Name:")}</span> {detailUser.full_name || "—"}</div>
                <div><span className="text-muted-foreground">{t("البريد:", "Email:")}</span> {detailUser.email}</div>
                <div><span className="text-muted-foreground">{t("الحالة:", "Status:")}</span> {detailUser.banned ? t("معطل", "Banned") : t("نشط", "Active")}</div>
                <div><span className="text-muted-foreground">{t("آخر دخول:", "Last login:")}</span> {detailUser.last_sign_in_at ? new Date(detailUser.last_sign_in_at).toLocaleDateString() : "—"}</div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-heading font-bold mb-2">{t("الأدوار", "Roles")}</p>
                <div className="flex flex-wrap gap-2">
                  {detailUser.roles.length > 0
                    ? detailUser.roles.map((r) => getRoleBadge(r.role))
                    : <span className="text-xs text-muted-foreground">{t("بدون أدوار", "No roles")}</span>}
                </div>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {detailUser.banned ? (
                  <Button size="sm" onClick={() => setConfirmAction({ type: "activate", user: detailUser })}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{t("تفعيل", "Activate")}
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ type: "deactivate", user: detailUser })}>
                    <Ban className="h-3.5 w-3.5 mr-1" />{t("تعطيل", "Deactivate")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              {confirmAction?.type === "create_super"
                ? t("تأكيد إنشاء مدير أعلى", "Confirm Super Admin Creation")
                : confirmAction?.type === "deactivate"
                ? t("تأكيد تعطيل الحساب", "Confirm Account Deactivation")
                : t("تأكيد تفعيل الحساب", "Confirm Account Activation")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "create_super"
                ? t("أنت على وشك منح صلاحيات المدير الأعلى لهذا المستخدم. سيحصل على صلاحيات كاملة على المنصة بالكامل. هل أنت متأكد؟",
                    "You are about to grant Super Admin privileges. This user will have full control over the entire platform. Are you sure?")
                : confirmAction?.type === "deactivate"
                ? t("سيتم تعطيل حساب هذا المستخدم ولن يتمكن من تسجيل الدخول.", "This user's account will be deactivated and they won't be able to sign in.")
                : t("سيتم إعادة تفعيل حساب هذا المستخدم.", "This user's account will be reactivated.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("إلغاء", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.type === "create_super" || confirmAction?.type === "deactivate" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => {
                if (confirmAction?.type === "create_super") {
                  createMut.mutate();
                } else if (confirmAction?.type === "deactivate") {
                  toggleStatusMut.mutate({ user_id: confirmAction.user.id, activate: false });
                } else if (confirmAction?.type === "activate") {
                  toggleStatusMut.mutate({ user_id: confirmAction.user.id, activate: true });
                }
              }}
            >
              {t("تأكيد", "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
