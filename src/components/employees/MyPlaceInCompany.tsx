import { useManagerChain } from "@/hooks/useManagerChain";
import { useDirectManager } from "@/hooks/useDirectManager";
import DirectManagerCard from "@/components/employees/DirectManagerCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2, MapPin, GitBranch, Crown, Users, ChevronLeft,
  AlertTriangle, Briefcase, Hash, Phone, Link2Off, Shield,
} from "lucide-react";

interface Props {
  employee: {
    id: string;
    name_ar?: string;
    employee_code?: string;
    position?: string;
    position_id?: string;
    department_id?: string;
    branch_id?: string;
  };
  companyId: string;
}

export default function MyPlaceInCompany({ employee, companyId }: Props) {
  const { data: managerChain = [], isLoading } = useManagerChain(employee.position_id, companyId, employee.department_id);
  const { data: directMgr } = useDirectManager(employee.position_id, companyId, employee.department_id);

  // Position detail for structural breadcrumb
  const { data: positionDetail } = useQuery({
    queryKey: ["my-position-detail", employee.position_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("positions")
        .select("*, departments(name, level, branches(name))")
        .eq("id", employee.position_id!)
        .single();
      return data;
    },
    enabled: !!employee.position_id,
  });

  // Company name
  const { data: company } = useQuery({
    queryKey: ["my-company-name", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("name, name_ar")
        .eq("id", companyId)
        .single();
      return data;
    },
    enabled: !!companyId,
  });

  // Direct colleagues (same parent position's children)
  const { data: colleagues = [] } = useQuery({
    queryKey: ["my-colleagues", employee.position_id, companyId],
    queryFn: async () => {
      if (!employee.position_id) return [];
      // Get parent position
      const { data: myPos } = await supabase
        .from("positions")
        .select("parent_position_id")
        .eq("id", employee.position_id)
        .single();
      if (!myPos?.parent_position_id) return [];
      // Get sibling positions
      const { data: siblings } = await supabase
        .from("positions")
        .select("id")
        .eq("parent_position_id", myPos.parent_position_id)
        .eq("company_id", companyId)
        .neq("id", employee.position_id);
      if (!siblings?.length) return [];
      const siblingIds = siblings.map((s: any) => s.id);
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name_ar, position, avatar_url")
        .in("position_id", siblingIds)
        .eq("status", "active")
        .limit(10);
      return emps || [];
    },
    enabled: !!employee.position_id,
  });

  const dept = positionDetail?.departments as any;
  const branch = dept?.branches as any;
  const directManager = managerChain.length > 0 ? managerChain[0] : null;
  const companyName = company?.name_ar || company?.name || "—";

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ═══ My Place in Company — Reporting Line ═══ */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-heading font-bold text-foreground">مكاني في الشركة</p>
            <p className="text-[10px] text-muted-foreground">الارتباط الإداري وسلسلة القيادة</p>
          </div>
        </div>

        <CardContent className="px-5 pb-5 pt-0 space-y-4">
          {/* Structural breadcrumb */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] gap-1 bg-muted/30">
              <Building2 className="h-2.5 w-2.5" />{companyName}
            </Badge>
            {branch?.name && (
              <>
                <ChevronLeft className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="text-[10px] gap-1 bg-muted/30">
                  <MapPin className="h-2.5 w-2.5" />{branch.name}
                </Badge>
              </>
            )}
            {dept?.name && (
              <>
                <ChevronLeft className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="text-[10px] gap-1 bg-muted/30">
                  <Users className="h-2.5 w-2.5" />{dept.name}
                  {dept.level && dept.level !== "department" && (
                    <span className="text-muted-foreground">({dept.level === "section" ? "شعبة" : dept.level === "unit" ? "وحدة" : dept.level})</span>
                  )}
                </Badge>
              </>
            )}
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
            <Badge variant="secondary" className="text-[10px] gap-1 font-bold">
              <Briefcase className="h-2.5 w-2.5" />{employee.position || "—"}
            </Badge>
          </div>

          {/* ═══ Direct Manager Card (unified) ═══ */}
          <DirectManagerCard positionId={employee.position_id} companyId={companyId} employeeDepartmentId={employee.department_id} />

          {/* Guidance block */}
          {directManager && !directManager.isVacant && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-primary font-heading font-bold">
                  للتواصل الإداري الأولي، يرجى الرجوع إلى مديرك المباشر
                </p>
                <p className="text-[10px] text-primary/70 mt-0.5">
                  {directManager.employeeName} — {directManager.positionTitle}
                </p>
              </div>
            </div>
          )}

          {/* ═══ Full Chain (collapsed if > 1) ═══ */}
          {managerChain.length > 1 && (
            <div className="rounded-xl border border-border bg-card">
              <div className="px-3.5 py-2 border-b border-border/50 flex items-center gap-1.5">
                <GitBranch className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] font-heading font-bold text-muted-foreground">
                  سلسلة القيادة ({managerChain.length} مستوى)
                </span>
              </div>
              <div className="p-3 relative pr-7 space-y-0">
                <div className="absolute right-[13px] top-3 bottom-3 w-px bg-border" />
                {managerChain.map((m, idx) => (
                  <div key={m.positionId} className="relative flex items-center gap-2.5 py-1.5">
                    <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border-2 z-10 flex items-center justify-center text-[8px] font-bold ${
                      idx === 0
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    }`}>
                      {managerChain.length - idx}
                    </div>
                    <div className="mr-5 min-w-0 flex-1 flex items-center gap-2">
                      {m.isVacant ? (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[9px] shrink-0">ش</div>
                      ) : (
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-heading">
                            {m.employeeName?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{m.isVacant ? "شاغر" : m.employeeName}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{m.positionTitle}</p>
                      </div>
                    </div>
                    {idx === 0 && (
                      <Badge variant="outline" className="text-[8px] shrink-0 border-primary/30 text-primary h-4 px-1">
                        مباشر
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ Colleagues / Team ═══ */}
          {colleagues.length > 0 && (
            <div className="rounded-xl border border-border bg-card">
              <div className="px-3.5 py-2 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-heading font-bold text-muted-foreground">الزملاء في الفريق</span>
                </div>
                <Badge variant="outline" className="text-[9px] h-4">{colleagues.length}</Badge>
              </div>
              <div className="p-3 space-y-1.5 max-h-36 overflow-y-auto">
                {colleagues.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-[9px] font-heading">
                        {c.name_ar?.[0] || "م"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{c.name_ar}</p>
                      {c.position && <p className="text-[9px] text-muted-foreground truncate">{c.position}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
