/**
 * Permission Matrix Page — admin/debug view showing who can do what.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Shield } from "lucide-react";
import { PERMISSION_MATRIX, PERMISSION_LABELS, ROLE_META, type Permission } from "@/lib/roles";
import { RoleBadge } from "@/components/ui/role-badge";
import { useRole } from "@/hooks/useRole";
import type { AppRole } from "@/hooks/useRole";

const MATRIX_ROLES: AppRole[] = ["tenant_admin", "admin", "hr_manager", "hr_officer", "manager", "employee"];
const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

// Group permissions for readability
const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "لوحة التحكم والتنظيم",
    permissions: ["can_view_dashboard", "can_manage_employees", "can_manage_departments", "can_manage_branches", "can_manage_positions", "can_view_org_chart"],
  },
  {
    label: "الرواتب والمالية",
    permissions: ["can_view_payroll", "can_run_payroll", "can_approve_payroll", "can_view_salary_records", "can_manage_loans", "can_manage_contracts"],
  },
  {
    label: "الإجازات والحضور",
    permissions: ["can_request_leave", "can_approve_leave", "can_manage_shifts"],
  },
  {
    label: "المستندات والشهادات",
    permissions: ["can_request_certificate", "can_approve_certificate", "can_view_documents", "can_generate_official_documents"],
  },
  {
    label: "الموافقات وسير العمل",
    permissions: ["can_view_approvals", "can_approve_direct_reports", "can_manage_workflows"],
  },
  {
    label: "المواهب والتطوير",
    permissions: ["can_manage_recruitment", "can_manage_onboarding", "can_manage_training", "can_manage_performance", "can_manage_exit"],
  },
  {
    label: "النظام والإعدادات",
    permissions: [
      "can_manage_settings", "can_view_audit_log", "can_manage_announcements", "can_view_reports",
      "can_manage_signatories", "can_manage_templates", "can_manage_subscription",
      "can_view_billing", "can_manage_billing", "can_access_ai_features",
    ],
  },
];

export default function PermissionMatrix() {
  const { roles: myRoles } = useRole();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6" /> مصفوفة الصلاحيات
        </h1>
        <p className="text-muted-foreground text-sm mt-1">عرض تفصيلي لصلاحيات كل دور في النظام</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">أدوارك الحالية:</span>
          {myRoles.map((r) => (
            <RoleBadge key={r} role={r as AppRole} size="md" />
          ))}
        </div>
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <Card key={group.label}>
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm">{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px] sticky right-0 bg-background z-10">الصلاحية</TableHead>
                    {MATRIX_ROLES.map((role) => (
                      <TableHead key={role} className="text-center min-w-[100px]">
                        <RoleBadge role={role} size="sm" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.permissions.map((perm) => (
                    <TableRow key={perm}>
                      <TableCell className="font-medium text-xs sticky right-0 bg-background z-10">
                        {PERMISSION_LABELS[perm]?.ar || perm}
                      </TableCell>
                      {MATRIX_ROLES.map((role) => {
                        const allowed = PERMISSION_MATRIX[role]?.[perm] === true;
                        return (
                          <TableCell key={role} className="text-center">
                            {allowed ? (
                              <CheckCircle className="h-4 w-4 text-primary mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-heading text-sm font-medium mb-3">دليل الأدوار</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MATRIX_ROLES.map((role) => {
              const meta = ROLE_META[role];
              return (
                <div key={role} className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                  <RoleBadge role={role} size="md" />
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
