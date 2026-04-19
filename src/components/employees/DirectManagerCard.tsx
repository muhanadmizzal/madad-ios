import { useState } from "react";
import { useDirectManager } from "@/hooks/useDirectManager";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, AlertTriangle, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  positionId?: string | null;
  companyId?: string | null;
  compact?: boolean;
  employeeDepartmentId?: string | null;
  /** Allow manual assignment when auto-resolution fails */
  allowManualAssign?: boolean;
}

/**
 * Unified DirectManagerCard — use in Employee Profile, Employee Portal, Org Chart Drawer, etc.
 * Shows manager info or warning when manager is missing.
 * Supports manual assignment of parent_position_id when no manager is found.
 */
export default function DirectManagerCard({ positionId, companyId, compact = false, employeeDepartmentId, allowManualAssign = true }: Props) {
  const { data: manager, isLoading } = useDirectManager(positionId, companyId, employeeDepartmentId);
  const [showPicker, setShowPicker] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card animate-pulse">
        <div className="px-3.5 py-2 border-b border-border/50 flex items-center gap-1.5">
          <Crown className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-heading font-bold text-muted-foreground">المدير المباشر</span>
        </div>
        <div className="p-3.5 h-14 bg-muted/20 rounded-b-xl" />
      </div>
    );
  }

  if (!manager || manager.noManager) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5">
        <div className="px-3.5 py-2 border-b border-destructive/20 flex items-center gap-1.5">
          <Crown className="h-3 w-3 text-destructive" />
          <span className="text-[11px] font-heading font-bold text-destructive">المدير المباشر</span>
        </div>
        <div className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-destructive/60 mb-1.5" />
          <p className="text-xs text-destructive font-heading font-semibold">
            {manager?.warning || "لم يتم ربط مدير مباشر بشكل صحيح"}
          </p>
          <p className="text-[10px] text-destructive/60 mt-0.5">يرجى التواصل مع الموارد البشرية</p>
          {allowManualAssign && positionId && companyId && (
            <>
              {!showPicker ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs gap-1.5"
                  onClick={() => setShowPicker(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  تعيين مدير يدوياً
                </Button>
              ) : (
                <ManagerPositionPicker
                  positionId={positionId}
                  companyId={companyId}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-3.5 py-2 border-b border-border/50 flex items-center gap-1.5 justify-between">
        <div className="flex items-center gap-1.5">
          <Crown className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-heading font-bold text-muted-foreground">المدير المباشر</span>
        </div>
        {allowManualAssign && positionId && companyId && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            تغيير
          </button>
        )}
      </div>
      {showPicker ? (
        <div className="p-3">
          <ManagerPositionPicker
            positionId={positionId}
            companyId={companyId}
            onClose={() => setShowPicker(false)}
          />
        </div>
      ) : (
        <div className="p-3.5 flex items-center gap-3">
          {manager.isVacant ? (
            <div className="h-10 w-10 rounded-full bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center text-sm text-muted-foreground shrink-0">
              ش
            </div>
          ) : (
            <Avatar className="h-10 w-10 ring-2 ring-primary/10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-heading">
                {manager.employeeName?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-heading font-bold text-foreground truncate">
              {manager.isVacant ? "المنصب شاغر حالياً" : manager.employeeName}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {manager.positionTitle}
              {manager.departmentName && ` • ${manager.departmentName}`}
            </p>
          </div>
          {!manager.isVacant && (
            <Badge variant="outline" className="text-[9px] shrink-0 border-primary/30 text-primary bg-primary/5">
              مباشر
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/** Inline position picker for manual manager assignment */
function ManagerPositionPicker({ positionId, companyId, onClose }: { positionId: string; companyId: string; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: positions, isLoading } = useQuery({
    queryKey: ["positions-for-manager-pick", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("positions")
        .select("id, title_ar, title, title_en, department_id, departments!positions_department_id_fkey(name)")
        .eq("company_id", companyId)
        .neq("id", positionId)
        .order("title_ar");
      
      // Also get assigned employees for each position
      if (!data?.length) return [];
      const posIds = data.map((p: any) => p.id);
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name_ar, position_id")
        .in("position_id", posIds)
        .eq("status", "active");
      
      return data.map((p: any) => ({
        ...p,
        assignedEmployee: emps?.find((e: any) => e.position_id === p.id),
      }));
    },
    enabled: !!companyId,
  });

  const filtered = positions?.filter((p: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const title = (p.title_ar || p.title || p.title_en || "").toLowerCase();
    const dept = (p.departments?.name || "").toLowerCase();
    const empName = (p.assignedEmployee?.name_ar || "").toLowerCase();
    return title.includes(q) || dept.includes(q) || empName.includes(q);
  });

  const handleAssign = async (parentId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("positions")
      .update({ parent_position_id: parentId })
      .eq("id", positionId);
    
    setSaving(false);
    if (error) {
      toast.error("فشل في تعيين المدير المباشر");
      return;
    }
    toast.success("تم تعيين المدير المباشر بنجاح");
    queryClient.invalidateQueries({ queryKey: ["direct-manager"] });
    queryClient.invalidateQueries({ queryKey: ["employee-hierarchy"] });
    queryClient.invalidateQueries({ queryKey: ["positions"] });
    queryClient.invalidateQueries({ queryKey: ["org-chart"] });
    onClose();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن منصب أو موظف..."
          className="flex-1 text-xs rounded-md border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-popover">
        {isLoading ? (
          <div className="p-3 text-center text-xs text-muted-foreground">جاري التحميل...</div>
        ) : !filtered?.length ? (
          <div className="p-3 text-center text-xs text-muted-foreground">لا توجد نتائج</div>
        ) : (
          filtered.map((p: any) => (
            <button
              key={p.id}
              disabled={saving}
              onClick={() => handleAssign(p.id)}
              className={cn(
                "w-full text-right px-3 py-2 text-xs hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 flex items-center justify-between gap-2",
                saving && "opacity-50"
              )}
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{p.title_ar || p.title || p.title_en}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {p.assignedEmployee?.name_ar || "شاغر"}
                  {p.departments?.name && ` • ${p.departments.name}`}
                </p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0">
                {p.assignedEmployee ? "مشغول" : "شاغر"}
              </Badge>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
