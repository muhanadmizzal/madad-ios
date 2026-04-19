import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Users, User, Crown, Shield, Workflow, AlertCircle,
  CheckCircle2, UserPlus, ChevronDown, ChevronLeft, Briefcase,
  Search, Filter, MoreHorizontal, Hash, DollarSign,
  FolderOpen, Minus, ChevronRight as ChevronR, Pencil, Copy, Power, UserMinus,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrgNodeData, PositionStatus } from "./OrgChartNode";
import { toast } from "@/hooks/use-toast";

/* ── Types ── */
interface TreeItem {
  id: string;
  type: "company" | "department" | "position";
  label: string;
  level: number;
  data: OrgNodeData;
  children: TreeItem[];
  parentChain: string[]; // ids of ancestors for search
}

interface Props {
  departments: any[];
  positions: any[];
  employees: any[];
  company: { name?: string; name_ar?: string } | null | undefined;
  onNodeClick: (data: OrgNodeData) => void;
  onAddChild?: (parentType: "company" | "department" | "position", parentPositionId?: string | null, parentDepartmentId?: string | null) => void;
  onAssignEmployee?: (positionId: string, title: string) => void;
  onEdit?: (pos: any) => void;
  onEditDept?: (dept: any) => void;
  onArchive?: (type: "department" | "position", id: string, title: string) => void;
  search: string;
}

const statusBadge: Record<PositionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  filled: { label: "مشغول", variant: "default" },
  vacant: { label: "شاغر", variant: "secondary" },
  hiring: { label: "قيد التوظيف", variant: "outline" },
  optional: { label: "اختياري", variant: "outline" },
  inactive: { label: "غير فعال", variant: "destructive" },
};

/* ── Build true hierarchy tree from DB data ── */
function buildTree(
  departments: any[],
  positions: any[],
  employees: any[],
  company: { name?: string; name_ar?: string } | null | undefined,
): TreeItem {
  const empByPosition = new Map<string, any>();
  employees.forEach(e => { if (e.position_id) empByPosition.set(e.position_id, e); });

  // Build department children map
  const deptChildren = new Map<string, any[]>();
  const topDepts: any[] = [];
  departments.forEach(d => {
    if (d.parent_department_id) {
      if (!deptChildren.has(d.parent_department_id)) deptChildren.set(d.parent_department_id, []);
      deptChildren.get(d.parent_department_id)!.push(d);
    } else {
      topDepts.push(d);
    }
  });

  // Build position children map (within same department)
  const posByDept = new Map<string, any[]>();
  const noDeptPositions: any[] = [];
  positions.forEach(p => {
    if (p.status === "inactive") return;
    if (p.department_id) {
      if (!posByDept.has(p.department_id)) posByDept.set(p.department_id, []);
      posByDept.get(p.department_id)!.push(p);
    } else {
      noDeptPositions.push(p);
    }
  });

  const posChildren = new Map<string, any[]>();
  const buildPositionItems = (deptPositions: any[], level: number, parentChain: string[]): TreeItem[] => {
    const posById = new Map(deptPositions.map(p => [p.id, p]));
    const childrenOf = new Map<string, any[]>();
    const roots: any[] = [];
    deptPositions.forEach(pos => {
      if (pos.parent_position_id && posById.has(pos.parent_position_id)) {
        if (!childrenOf.has(pos.parent_position_id)) childrenOf.set(pos.parent_position_id, []);
        childrenOf.get(pos.parent_position_id)!.push(pos);
      } else {
        roots.push(pos);
      }
    });

    const buildPos = (pos: any, lvl: number, chain: string[]): TreeItem => {
      const emp = empByPosition.get(pos.id);
      const status: PositionStatus = pos.status || (emp ? "filled" : "vacant");
      const children = childrenOf.get(pos.id) || [];
      const currentChain = [...chain, `pos-${pos.id}`];

      const nodeData: OrgNodeData = {
        type: "position",
        label: pos.title_ar || "منصب",
        positionId: pos.id,
        positionCode: pos.position_code,
        employeeName: emp?.name_ar,
        employeeCode: emp?.employee_code,
        employeeSalary: emp?.basic_salary,
        employeeId: emp?.id,
        department: pos.department_id,
        status,
        avatarInitial: emp?.name_ar?.charAt(0),
        isManager: pos.is_manager || false,
        salaryGrade: pos.grade_level ? String(pos.grade_level) : undefined,
        minSalary: pos.min_salary,
        maxSalary: pos.max_salary,
        directReports: children.length,
        permissionsCount: countPerms(pos.service_permissions),
        workflowRoles: countWorkflow(pos.workflow_responsibilities),
      };

      return {
        id: `pos-${pos.id}`,
        type: "position",
        label: pos.title_ar || "منصب",
        level: lvl,
        data: nodeData,
        children: children.map(c => buildPos(c, lvl + 1, currentChain)),
        parentChain: currentChain,
      };
    };

    // Sort: managers first, then by title
    roots.sort((a, b) => (b.is_manager ? 1 : 0) - (a.is_manager ? 1 : 0) || (a.title_ar || "").localeCompare(b.title_ar || ""));
    return roots.map(r => buildPos(r, level, parentChain));
  };

  const buildDeptItem = (dept: any, level: number, parentChain: string[]): TreeItem => {
    const deptId = `dept-${dept.id}`;
    const currentChain = [...parentChain, deptId];
    const deptPositions = posByDept.get(dept.id) || [];
    const subDepts = deptChildren.get(dept.id) || [];
    const deptEmps = employees.filter(e => e.department_id === dept.id);
    const vacantCount = deptPositions.filter(p => p.status === "vacant" || p.status === "hiring").length;
    const levelLabels: Record<string, string> = { department: "قسم", section: "شعبة", unit: "وحدة" };

    const children: TreeItem[] = [
      ...subDepts.map(sd => buildDeptItem(sd, level + 1, currentChain)),
      ...buildPositionItems(deptPositions, level + 1, currentChain),
    ];

    const nodeData: OrgNodeData = {
      type: "department",
      label: dept.name,
      branch: dept.branches?.name || levelLabels[dept.level] || "قسم",
      employeeCount: deptEmps.length,
      directReports: children.length,
      vacantCount,
      capacity: deptPositions.length,
      departmentId: dept.id,
    };

    return { id: deptId, type: "department", label: dept.name, level, data: nodeData, children, parentChain: currentChain };
  };

  const companyName = company?.name_ar || company?.name || "الشركة";
  const companyChildren: TreeItem[] = [
    ...topDepts.map(d => buildDeptItem(d, 1, ["company"])),
  ];

  // Positions without department
  if (noDeptPositions.length > 0) {
    companyChildren.push({
      id: "dept-unassigned",
      type: "department",
      label: "بدون قسم",
      level: 1,
      data: { type: "department", label: "بدون قسم", employeeCount: noDeptPositions.length, directReports: noDeptPositions.length },
      children: buildPositionItems(noDeptPositions, 2, ["company", "dept-unassigned"]),
      parentChain: ["company", "dept-unassigned"],
    });
  }

  return {
    id: "company",
    type: "company",
    label: companyName,
    level: 0,
    data: { type: "company", label: companyName, employeeCount: employees.length, deptCount: departments.length },
    children: companyChildren,
    parentChain: ["company"],
  };
}

function countPerms(sp: any): number {
  if (!sp || typeof sp !== "object") return 0;
  return Object.values(sp).filter(Boolean).length;
}
function countWorkflow(wr: any): number {
  if (!wr || typeof wr !== "object") return 0;
  return Object.values(wr).filter(Boolean).length;
}

/* ── Get all matching IDs + their ancestors ── */
function getMatchingIds(tree: TreeItem, searchLower: string): Set<string> {
  const matched = new Set<string>();

  function walk(item: TreeItem) {
    const d = item.data;
    const matches =
      item.label?.toLowerCase().includes(searchLower) ||
      d.employeeName?.toLowerCase().includes(searchLower) ||
      d.employeeCode?.toLowerCase().includes(searchLower) ||
      d.positionCode?.toLowerCase().includes(searchLower);

    if (matches) {
      // Add self + all ancestors
      item.parentChain.forEach(id => matched.add(id));
      matched.add(item.id);
    }

    item.children.forEach(walk);
  }
  walk(tree);
  return matched;
}

/* ── Filters ── */
interface Filters {
  department: string;
  status: string;
  managersOnly: boolean;
}

/* ── Row Component (recursive) ── */
function TreeRow({
  item, expanded, onToggle, onNodeClick, depth, matchedIds, filters,
  onEdit, onEditDept, onAssignEmployee, onArchive, rawDepartments,
}: {
  item: TreeItem;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNodeClick: (data: OrgNodeData) => void;
  depth: number;
  matchedIds: Set<string> | null;
  filters: Filters;
  onEdit?: (pos: any) => void;
  onEditDept?: (dept: any) => void;
  onAssignEmployee?: (positionId: string, title: string) => void;
  onArchive?: (type: "department" | "position", id: string, title: string) => void;
  rawDepartments?: any[];
}) {
  // Filter logic
  if (matchedIds && !matchedIds.has(item.id)) return null;

  if (item.type === "position" && filters.status && filters.status !== "all") {
    if (item.data.status !== filters.status) return null;
  }
  if (item.type === "position" && filters.managersOnly && !item.data.isManager) return null;
  if (item.type === "department" && filters.department && filters.department !== "all") {
    if (item.data.departmentId !== filters.department && item.id !== `dept-${filters.department}`) {
      // Check if any descendant matches
      const hasDescendant = item.children.some(c => c.id === `dept-${filters.department}` || c.data.departmentId === filters.department);
      if (!hasDescendant) return null;
    }
  }

  const isExpanded = expanded.has(item.id);
  const hasChildren = item.children.length > 0;
  const indent = depth * 24;

  const d = item.data;
  const status = d.status || "filled";
  const st = statusBadge[status as PositionStatus] || statusBadge.filled;

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer border-b border-border/30 transition-colors group"
        style={{ paddingRight: `${12 + indent}px` }}
        onClick={() => onNodeClick(d)}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(item.id); }}
          className="w-5 h-5 flex items-center justify-center flex-shrink-0"
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronR className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        {/* Icon / Avatar */}
        {item.type === "company" && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        {item.type === "department" && (
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-accent" />
          </div>
        )}
        {item.type === "position" && (
          d.status === "filled" && d.avatarInitial ? (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-heading">{d.avatarInitial}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-semibold text-sm text-foreground truncate">{item.label}</span>
            {d.isManager && (
              <Crown className="h-3 w-3 text-accent flex-shrink-0" />
            )}
          </div>
          {item.type === "position" && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {d.employeeName ? (
                <span>{d.employeeName}</span>
              ) : (
                <span className="text-warning italic">شاغر</span>
              )}
              {d.positionCode && <span className="font-mono text-[10px]">#{d.positionCode}</span>}
            </div>
          )}
          {item.type === "department" && d.branch && (
            <span className="text-[11px] text-muted-foreground">{d.branch}</span>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {item.type === "position" && (
            <>
              <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
              {d.salaryGrade && (
                <Badge variant="outline" className="text-[9px] hidden sm:flex"><DollarSign className="h-2.5 w-2.5 ml-0.5" />{d.salaryGrade}</Badge>
              )}
              {(d.permissionsCount || 0) > 0 && (
                <Badge variant="outline" className="text-[9px] hidden sm:flex"><Shield className="h-2.5 w-2.5 ml-0.5" />{d.permissionsCount}</Badge>
              )}
            </>
          )}
          {item.type === "department" && (
            <>
              <Badge variant="outline" className="text-[10px]">{d.employeeCount || 0} موظف</Badge>
              {(d.vacantCount || 0) > 0 && (
                <Badge variant="secondary" className="text-[10px] text-warning">{d.vacantCount} شاغر</Badge>
              )}
            </>
          )}
          {item.type === "company" && (
            <>
              <Badge variant="outline" className="text-[10px]">{d.employeeCount} موظف</Badge>
              <Badge variant="outline" className="text-[10px]">{d.deptCount} قسم</Badge>
            </>
          )}

          {hasChildren && !isExpanded && (
            <span className="text-[10px] text-muted-foreground">{item.children.length}</span>
          )}

          {/* Inline action menu */}
          {item.type !== "company" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {item.type === "position" && onEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item.data); }}>
                    <Pencil className="h-3.5 w-3.5 ml-2" />تعديل
                  </DropdownMenuItem>
                )}
                {item.type === "department" && onEditDept && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); const raw = rawDepartments?.find((dd: any) => dd.id === item.data.departmentId); if (raw) onEditDept(raw); }}>
                    <Pencil className="h-3.5 w-3.5 ml-2" />تعديل القسم
                  </DropdownMenuItem>
                )}
                {item.type === "position" && d.status !== "filled" && onAssignEmployee && d.positionId && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignEmployee(d.positionId!, item.label); }}>
                    <UserPlus className="h-3.5 w-3.5 ml-2" />تعيين موظف
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(item.type as any, item.type === "position" ? d.positionId! : d.departmentId!, item.label); }} className="text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 ml-2" />أرشفة
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Children */}
      {isExpanded && item.children.map(child => (
        <TreeRow
          key={child.id}
          item={child}
          expanded={expanded}
          onToggle={onToggle}
          onNodeClick={onNodeClick}
          depth={depth + 1}
          matchedIds={matchedIds}
          filters={filters}
          onEdit={onEdit}
          onEditDept={onEditDept}
          onAssignEmployee={onAssignEmployee}
          onArchive={onArchive}
          rawDepartments={rawDepartments}
        />
      ))}
    </>
  );
}

/* ── Main Component ── */
export default function OrgChartListView({ departments, positions, employees, company, onNodeClick, search, onEdit, onEditDept, onAssignEmployee, onArchive }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>(["company"]);
    departments.forEach((d: any) => s.add(`dept-${d.id}`));
    return s;
  });

  const [filters, setFilters] = useState<Filters>({ department: "all", status: "all", managersOnly: false });
  const [showFilters, setShowFilters] = useState(false);

  const tree = useMemo(() => buildTree(departments, positions, employees, company), [departments, positions, employees, company]);

  const matchedIds = useMemo(() => {
    if (!search) return null;
    return getMatchingIds(tree, search.toLowerCase());
  }, [tree, search]);

  // Auto-expand matched branches
  useMemo(() => {
    if (matchedIds) {
      setExpanded(prev => {
        const next = new Set(prev);
        matchedIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [matchedIds]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const all = new Set<string>();
    function walk(item: TreeItem) { all.add(item.id); item.children.forEach(walk); }
    walk(tree);
    setExpanded(all);
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set(["company"]));
  }, []);

  const uniqueDepts = useMemo(() => departments.filter((d: any) => !d.parent_department_id), [departments]);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Controls bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={expandAll}>
            <ChevronDown className="h-3 w-3" />توسيع الكل
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={collapseAll}>
            <Minus className="h-3 w-3" />طي الكل
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-[11px] gap-1"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3 w-3" />فلترة
          </Button>
          <Badge variant="outline" className="text-[10px]">{positions.length} منصب</Badge>
        </div>
      </div>

      {/* Filters bar */}
      {showFilters && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/10 flex-wrap">
          <Select value={filters.department} onValueChange={(v) => setFilters(f => ({ ...f, department: v }))}>
            <SelectTrigger className="h-7 w-36 text-[11px]">
              <SelectValue placeholder="القسم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأقسام</SelectItem>
              {uniqueDepts.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
            <SelectTrigger className="h-7 w-28 text-[11px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="filled">مشغول</SelectItem>
              <SelectItem value="vacant">شاغر</SelectItem>
              <SelectItem value="hiring">قيد التوظيف</SelectItem>
              <SelectItem value="inactive">غير فعال</SelectItem>
            </SelectContent>
          </Select>

          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
            <Checkbox
              checked={filters.managersOnly}
              onCheckedChange={(v) => setFilters(f => ({ ...f, managersOnly: !!v }))}
              className="h-3.5 w-3.5"
            />
            إداريين فقط
          </label>
        </div>
      )}

      {/* Tree */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        <TreeRow
          item={tree}
          expanded={expanded}
          onToggle={toggleExpand}
          onNodeClick={onNodeClick}
          depth={0}
          matchedIds={matchedIds}
          filters={filters}
          onEdit={onEdit}
          onEditDept={onEditDept}
          onAssignEmployee={onAssignEmployee}
          onArchive={onArchive}
          rawDepartments={departments}
        />
        {tree.children.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">لا توجد بيانات في الهيكل التنظيمي</div>
        )}
      </div>
    </div>
  );
}
