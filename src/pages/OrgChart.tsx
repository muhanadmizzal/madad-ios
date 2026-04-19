import { useState, useCallback, useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useOrgChartLayout } from "@/hooks/useOrgChartLayout";
import {
  ReactFlow,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  type Connection,
  type OnReconnect,
  type OnNodeDrag,
  BackgroundVariant,
  ConnectionLineType,
  MarkerType,
  reconnectEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import OrgChartNodeComponent, { type OrgNodeData, type PositionStatus } from "@/components/orgchart/OrgChartNode";
import OrgChartToolbar, { type ViewMode, type LayoutMode } from "@/components/orgchart/OrgChartToolbar";
import OrgChartDetailDrawer from "@/components/orgchart/OrgChartDetailDrawer";
import OrgChartListView from "@/components/orgchart/OrgChartListView";
import {
  AddNodeDialog,
  AssignEmployeeDialog,
  ClonePositionDialog,
  ArchiveConfirmDialog,
  EditPositionDialog,
  EditDepartmentDialog,
  ActivatePositionDialog,
  TransferEmployeeDialog,
} from "@/components/orgchart/OrgChartDialogs";
import { toast } from "@/hooks/use-toast";
import OrgSyncDialog from "@/components/orgchart/OrgSyncDialog";
import { useRole } from "@/hooks/useRole";

const nodeTypes: NodeTypes = {
  orgNode: OrgChartNodeComponent as any,
};

const defaultEdgeOptions = {
  type: "smoothstep",
  animated: false,
  style: { stroke: "hsl(var(--border))", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--border))", width: 12, height: 12 },
};

interface AddNodeState { open: boolean; parentPositionId?: string | null; parentDepartmentId?: string | null; parentType: "company" | "department" | "position"; initialNodeType?: string; }
interface AssignState { open: boolean; positionId: string; positionTitle: string; }
interface CloneState { open: boolean; position: any; }
interface ArchiveState { open: boolean; nodeType: "department" | "position"; nodeId: string; nodeTitle: string; }
interface EditState { open: boolean; position: any; }
interface ActivateState { open: boolean; positionId: string; positionTitle: string; }
interface TransferState { open: boolean; employeeId: string; employeeName: string; currentPositionId?: string; }
interface EditDeptState { open: boolean; department: any; }

function OrgChartInner() {
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => isMobile ? "list" : "chart");
  const [chartLayoutMode, setChartLayoutMode] = useState<"auto" | "free">("auto");
  const [detailNode, setDetailNode] = useState<OrgNodeData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reactFlowInstance = useReactFlow();
  const { saveNodePosition, resetLayout, isResetting, applySavedPositions, hasSavedPositions } = useOrgChartLayout(companyId);

  // Collapsible node state – tracks which nodes are expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set(["company"]));

  const [addNode, setAddNode] = useState<AddNodeState>({ open: false, parentType: "company" });
  const [assignState, setAssignState] = useState<AssignState>({ open: false, positionId: "", positionTitle: "" });
  const [cloneState, setCloneState] = useState<CloneState>({ open: false, position: null });
  const [archiveState, setArchiveState] = useState<ArchiveState>({ open: false, nodeType: "position", nodeId: "", nodeTitle: "" });
  const [editState, setEditState] = useState<EditState>({ open: false, position: null });
  const [activateState, setActivateState] = useState<ActivateState>({ open: false, positionId: "", positionTitle: "" });
  const [transferState, setTransferState] = useState<TransferState>({ open: false, employeeId: "", employeeName: "" });
  const [editDeptState, setEditDeptState] = useState<EditDeptState>({ open: false, department: null });
  const [syncOpen, setSyncOpen] = useState(false);
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem("org-auto-sync") === "true");
  const { isAdmin, isHrManager } = useRole();

  // ─── Data queries ───
  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ["org-positions", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("positions")
        .select("id, title_ar, title_en, department_id, branch_id, parent_position_id, is_manager, grade_level, status, service_permissions, min_salary, max_salary, position_code, workflow_responsibilities, description, job_description, system_role, diagram_x, diagram_y")
        .eq("company_id", companyId!)
        .order("title_ar");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["org-departments", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*, branches(name)").eq("company_id", companyId!).order("name");
      return (data || []).map((d: any) => ({ ...d, level: d.level || "department", parent_department_id: d.parent_department_id || null }));
    },
    enabled: !!companyId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["org-employees", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name_ar, position, department_id, status, employee_code, avatar_url, position_id, basic_salary")
        .eq("company_id", companyId!)
        .eq("status", "active")
        .order("name_ar");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: company } = useQuery({
    queryKey: ["org-company", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("name, name_ar").eq("id", companyId!).single();
      return data;
    },
    enabled: !!companyId,
  });

  // Auto-expand first level on data load
  useEffect(() => {
    if (departments.length > 0 && expandedNodes.size <= 1) {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        next.add("company");
        departments.forEach(d => next.add(`dept-${d.id}`));
        return next;
      });
    }
  }, [departments]);

  // ─── Background auto-sync function ───
  const runBackgroundSync = useCallback(async () => {
    if (!companyId || !autoSync) return;
    try {
      await supabase.functions.invoke("sync-org-structure", {
        body: {
          company_id: companyId,
          preview: false,
          sync_branches: true,
          sync_departments: true,
          sync_positions: true,
          sync_employees: true,
          fix_managers: true,
          repair_hierarchy: true,
        },
      });
      qc.invalidateQueries({ queryKey: ["org-positions", companyId] });
      qc.invalidateQueries({ queryKey: ["org-employees", companyId] });
      qc.invalidateQueries({ queryKey: ["org-departments", companyId] });
    } catch {
      // Silent background sync
    }
  }, [companyId, autoSync, qc]);

  const handleAutoSyncChange = useCallback((v: boolean) => {
    setAutoSync(v);
    localStorage.setItem("org-auto-sync", String(v));
    if (v) runBackgroundSync();
  }, [runBackgroundSync]);

  // ─── Realtime subscriptions for auto-sync ───
  useEffect(() => {
    if (!companyId) return;
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel('org-chart-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions', filter: `company_id=eq.${companyId}` }, () => {
        qc.invalidateQueries({ queryKey: ["org-positions", companyId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees', filter: `company_id=eq.${companyId}` }, () => {
        qc.invalidateQueries({ queryKey: ["org-employees", companyId] });
        // Debounced auto-sync on employee changes
        if (autoSync) {
          if (syncTimeout) clearTimeout(syncTimeout);
          syncTimeout = setTimeout(runBackgroundSync, 3000);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments', filter: `company_id=eq.${companyId}` }, () => {
        qc.invalidateQueries({ queryKey: ["org-departments", companyId] });
        if (autoSync) {
          if (syncTimeout) clearTimeout(syncTimeout);
          syncTimeout = setTimeout(runBackgroundSync, 3000);
        }
      })
      .subscribe();
    return () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      supabase.removeChannel(channel);
    };
  }, [companyId, qc, autoSync, runBackgroundSync]);

  // Reparent position mutation
  const reparentMutation = useMutation({
    mutationFn: async ({ positionId, newParentPositionId, newDepartmentId }: { positionId: string; newParentPositionId: string | null; newDepartmentId: string | null }) => {
      const updates: any = { parent_position_id: newParentPositionId };
      if (newDepartmentId) updates.department_id = newDepartmentId;
      const { error } = await supabase.from("positions").update(updates).eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم تحديث التبعية بنجاح" });
      qc.invalidateQueries({ queryKey: ["org-positions"] });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  // Reparent department mutation
  const reparentDeptMutation = useMutation({
    mutationFn: async ({ departmentId, newParentDepartmentId }: { departmentId: string; newParentDepartmentId: string | null }) => {
      const { error } = await supabase.rpc("reparent_department", {
        p_department_id: departmentId,
        p_new_parent_department_id: newParentDepartmentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم تحديث تبعية القسم بنجاح" });
      qc.invalidateQueries({ queryKey: ["org-departments"] });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  // Employee lookup by position_id (single employee + occupancy count)
  const empByPosition = useMemo(() => {
    const firstEmpMap = new Map<string, typeof employees[0]>();
    const countMap = new Map<string, number>();
    employees.forEach((e) => {
      if (!e.position_id) return;
      if (!firstEmpMap.has(e.position_id)) firstEmpMap.set(e.position_id, e);
      countMap.set(e.position_id, (countMap.get(e.position_id) || 0) + 1);
    });
    return { firstEmpMap, countMap };
  }, [employees]);

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const openDetail = useCallback((node: OrgNodeData) => {
    setDetailNode(node);
    setDrawerOpen(true);
  }, []);

  // ─── Action handlers ───
  const handleAddChild = useCallback((parentType: "company" | "department" | "position", parentPositionId?: string | null, parentDepartmentId?: string | null) => {
    setAddNode({ open: true, parentType, parentPositionId, parentDepartmentId });
  }, []);

  const handleAssignEmployee = useCallback((positionId: string, positionTitle: string) => {
    setAssignState({ open: true, positionId, positionTitle });
  }, []);

  const handleClone = useCallback((pos: any) => {
    setCloneState({ open: true, position: pos });
  }, []);

  const handleArchive = useCallback((nodeType: "department" | "position", nodeId: string, nodeTitle: string) => {
    setArchiveState({ open: true, nodeType, nodeId, nodeTitle });
  }, []);

  const handleEdit = useCallback((pos: any) => {
    setEditState({ open: true, position: pos });
  }, []);

  const handleActivate = useCallback((positionId: string, positionTitle: string) => {
    setActivateState({ open: true, positionId, positionTitle });
  }, []);

  const handleTransfer = useCallback((employeeId: string, employeeName: string, currentPositionId?: string) => {
    setTransferState({ open: true, employeeId, employeeName, currentPositionId });
  }, []);

  const handleEditDept = useCallback((dept: any) => {
    setEditDeptState({ open: true, department: dept });
  }, []);

  // Unassign employee
  const unassignMutation = useMutation({
    mutationFn: async (positionId: string) => {
      const { error } = await supabase.from("employees").update({ position_id: null }).eq("position_id", positionId);
      if (error) throw error;
      await supabase.from("positions").update({ status: "vacant" }).eq("id", positionId);
    },
    onSuccess: () => {
      toast({ title: "تم إزالة الموظف من المنصب" });
      qc.invalidateQueries({ queryKey: ["org-positions"] });
      qc.invalidateQueries({ queryKey: ["org-employees"] });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleReparent = useCallback((sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    // Position → Position (reparent under new parent)
    if (targetId.startsWith("pos-") && sourceId.startsWith("pos-")) {
      const childId = targetId.replace("pos-", "");
      const parentId = sourceId.replace("pos-", "");
      reparentMutation.mutate({ positionId: childId, newParentPositionId: parentId, newDepartmentId: null });
    }
    // Position → Department (move position to department)
    else if (targetId.startsWith("pos-") && sourceId.startsWith("dept-")) {
      const posId = targetId.replace("pos-", "");
      const deptId = sourceId.replace("dept-", "");
      reparentMutation.mutate({ positionId: posId, newParentPositionId: null, newDepartmentId: deptId });
    }
    // Department → Department (reparent department)
    else if (targetId.startsWith("dept-") && sourceId.startsWith("dept-")) {
      const childDeptId = targetId.replace("dept-", "");
      const parentDeptId = sourceId.replace("dept-", "");
      if (childDeptId === parentDeptId) return;
      reparentDeptMutation.mutate({ departmentId: childDeptId, newParentDepartmentId: parentDeptId });
    }
    // Department → Company (move department to top level)
    else if (targetId.startsWith("dept-") && sourceId === "company") {
      const deptId = targetId.replace("dept-", "");
      reparentDeptMutation.mutate({ departmentId: deptId, newParentDepartmentId: null });
    }
  }, [reparentMutation, reparentDeptMutation]);

  const onConnect = useCallback((connection: Connection) => {
    handleReparent(connection.source || "", connection.target || "");
  }, [handleReparent]);

  const onReconnect: OnReconnect = useCallback((oldEdge, newConnection) => {
    // When an edge is dragged to a new target, reparent
    handleReparent(newConnection.source || "", newConnection.target || "");
  }, [handleReparent]);

  // Save node position on drag end (free layout)
  const onNodeDragStop = useCallback((_event: any, node: Node) => {
    if (chartLayoutMode === "free") {
      saveNodePosition(node.id, node.position.x, node.position.y);
    }
  }, [chartLayoutMode, saveNodePosition]);

  // ─── Build nodes & edges with collapse/expand ───
  const { chartNodes, chartEdges, flatNodes, vacantCount } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const flatList: { id: string; data: OrgNodeData; parentId?: string }[] = [];
    let vacant = 0;

    const companyLabel = company?.name_ar || company?.name || "الشركة";
    const companyNodeId = "company";
    const isCompanyExpanded = expandedNodes.has(companyNodeId);

    const companyData: OrgNodeData = {
      type: "company",
      label: companyLabel,
      employeeCount: employees.length,
      deptCount: departments.length,
      expanded: isCompanyExpanded,
      childCount: departments.length,
      onOpenDetail: () => openDetail({ type: "company", label: companyLabel, employeeCount: employees.length, deptCount: departments.length }),
      onAddChild: () => handleAddChild("company"),
      onToggleExpand: () => toggleNodeExpansion(companyNodeId),
    };
    nodes.push({ id: companyNodeId, type: "orgNode", position: { x: 0, y: 0 }, data: companyData as any });
    flatList.push({ id: companyNodeId, data: companyData });

    if (!isCompanyExpanded) {
      return { chartNodes: nodes, chartEdges: edges, flatNodes: flatList, vacantCount: 0 };
    }

    const DEPT_SPACING_X = 320;
    const DEPT_Y = 160;
    const POS_SPACING_Y = 130;
    const POS_SPACING_X = 240;
    const POS_START_Y = DEPT_Y + 160;

    // Separate top-level departments from sub-departments
    const topDepts = departments.filter((d: any) => !d.parent_department_id && d.level === "department");
    const subDeptsByParent = new Map<string, typeof departments>();
    departments.forEach((d: any) => {
      if (d.parent_department_id) {
        if (!subDeptsByParent.has(d.parent_department_id)) subDeptsByParent.set(d.parent_department_id, []);
        subDeptsByParent.get(d.parent_department_id)!.push(d);
      }
    });

    const totalDeptWidth = (topDepts.length - 1) * DEPT_SPACING_X;
    const deptStartX = -totalDeptWidth / 2;

    // Group active positions by department
    const posByDept = new Map<string, typeof positions>();
    const noDeptPositions: typeof positions = [];
    positions.forEach((p) => {
      if (p.status === "inactive") return;
      if (p.department_id) {
        if (!posByDept.has(p.department_id)) posByDept.set(p.department_id, []);
        posByDept.get(p.department_id)!.push(p);
      } else {
        noDeptPositions.push(p);
      }
    });

    // Count helpers
    const countPerms = (sp: any): number => {
      if (!sp || typeof sp !== "object") return 0;
      return Object.values(sp).filter(Boolean).length;
    };
    const countWorkflow = (wr: any): number => {
      if (!wr || typeof wr !== "object") return 0;
      return Object.values(wr).filter(Boolean).length;
    };

    // Build position node data
    const makePositionData = (pos: typeof positions[0], deptName: string, branchName: string | undefined, children: typeof positions, nodeId: string): OrgNodeData => {
      const emp = empByPosition.firstEmpMap.get(pos.id);
      const assignedCount = empByPosition.countMap.get(pos.id) || 0;
      const status: PositionStatus = (pos.status as PositionStatus) === "inactive"
        ? "inactive"
        : (pos.status as PositionStatus) === "hiring"
          ? "hiring"
          : assignedCount > 0
            ? "filled"
            : "vacant";
      if (status === "vacant" || status === "hiring") vacant++;
      const isExpanded = expandedNodes.has(nodeId);

      return {
        type: "position",
        label: pos.title_ar || "منصب",
        positionId: pos.id,
        positionCode: (pos as any).position_code,
        employeeName: emp?.name_ar,
        employeeCode: emp?.employee_code,
        employeeSalary: emp?.basic_salary,
        employeeId: emp?.id,
        department: deptName,
        branch: branchName,
        status,
        avatarInitial: emp?.name_ar?.charAt(0),
        isManager: pos.is_manager || false,
        salaryGrade: pos.grade_level ? String(pos.grade_level) : undefined,
        minSalary: pos.min_salary,
        maxSalary: pos.max_salary,
        servicePermissions: pos.service_permissions,
        workflowResponsibilities: (pos as any).workflow_responsibilities,
        permissionsCount: countPerms(pos.service_permissions),
        workflowRoles: countWorkflow((pos as any).workflow_responsibilities),
        directReports: children.length,
        description: (pos as any).description,
        jobDescription: (pos as any).job_description,
        systemRole: (pos as any).system_role || "employee",
        expanded: isExpanded,
        childCount: children.length,
        onOpenDetail: () => openDetail({
          type: "position", label: pos.title_ar || "منصب", positionId: pos.id,
          positionCode: (pos as any).position_code,
          employeeName: emp?.name_ar, employeeCode: emp?.employee_code, employeeSalary: emp?.basic_salary,
          employeeId: emp?.id,
          department: deptName, branch: branchName, status,
          avatarInitial: emp?.name_ar?.charAt(0), isManager: pos.is_manager || false,
          salaryGrade: pos.grade_level ? String(pos.grade_level) : undefined,
          minSalary: pos.min_salary, maxSalary: pos.max_salary,
          servicePermissions: pos.service_permissions,
          workflowResponsibilities: (pos as any).workflow_responsibilities,
          permissionsCount: countPerms(pos.service_permissions),
          workflowRoles: countWorkflow((pos as any).workflow_responsibilities),
          directReports: children.length,
          description: (pos as any).description,
          jobDescription: (pos as any).job_description,
          systemRole: (pos as any).system_role || "employee",
        }),
        onToggleExpand: children.length > 0 ? () => toggleNodeExpansion(nodeId) : undefined,
        onAssignEmployee: () => handleAssignEmployee(pos.id, pos.title_ar),
        onUnassignEmployee: emp ? () => unassignMutation.mutate(pos.id) : undefined,
        onAddChild: () => handleAddChild("position", pos.id, pos.department_id),
        onClonePosition: () => handleClone(pos),
        onArchive: () => handleArchive("position", pos.id, pos.title_ar),
        onEdit: () => handleEdit(pos),
        onEditHierarchy: () => handleEdit(pos), // Opens edit dialog focused on hierarchy
        onActivate: status === "inactive" ? () => handleActivate(pos.id, pos.title_ar) : undefined,
        onOpenVacancy: () => handleAssignEmployee(pos.id, pos.title_ar),
      };
    };

    // Recursive position tree builder – respects collapse state
    // KEY: non-manager root positions are placed under the department's manager position
    // so the visual tree matches the useDirectManager resolution logic.
    const buildPositionTree = (
      deptPositions: typeof positions,
      deptId: string,
      deptName: string,
      branchName: string | undefined,
      baseX: number,
      baseY: number,
      deptManagerPositionId?: string | null,
    ) => {
      const posById = new Map(deptPositions.map(p => [p.id, p]));
      const childrenOf = new Map<string, typeof positions>();
      const roots: typeof positions = [];

      deptPositions.forEach(pos => {
        if (pos.parent_position_id && posById.has(pos.parent_position_id)) {
          if (!childrenOf.has(pos.parent_position_id)) childrenOf.set(pos.parent_position_id, []);
          childrenOf.get(pos.parent_position_id)!.push(pos);
        } else {
          roots.push(pos);
        }
      });

      // If dept has a manager position, move non-manager root positions under the manager
      // This ensures the visual hierarchy matches the direct-manager resolution logic
      if (deptManagerPositionId && posById.has(deptManagerPositionId)) {
        const managerRoots: typeof positions = [];
        const nonManagerRoots: typeof positions = [];
        roots.forEach(r => {
          if (r.id === deptManagerPositionId) {
            managerRoots.push(r);
          } else {
            nonManagerRoots.push(r);
          }
        });

        if (managerRoots.length > 0 && nonManagerRoots.length > 0) {
          // Attach non-manager roots as children of the manager position
          if (!childrenOf.has(deptManagerPositionId)) childrenOf.set(deptManagerPositionId, []);
          nonManagerRoots.forEach(r => childrenOf.get(deptManagerPositionId!)!.push(r));
          // Only the manager position remains as a true root
          roots.length = 0;
          roots.push(...managerRoots);
        }
      }

      const renderPosition = (pos: typeof positions[0], x: number, y: number, parentNodeId: string) => {
        const posId = `pos-${pos.id}`;
        const children = childrenOf.get(pos.id) || [];
        const posData = makePositionData(pos, deptName, branchName, children, posId);

        nodes.push({ id: posId, type: "orgNode", position: { x, y }, data: posData as any });
        flatList.push({ id: posId, data: posData, parentId: parentNodeId });
        edges.push({ id: `e-${parentNodeId}-${posId}`, source: parentNodeId, target: posId, ...defaultEdgeOptions });

        // Only render children if this node is expanded
        const isExpanded = expandedNodes.has(posId);
        if (children.length > 0 && isExpanded) {
          const childTotalWidth = (children.length - 1) * POS_SPACING_X;
          const childStartX = x - childTotalWidth / 2;
          children.forEach((child, ci) => {
            renderPosition(child, childStartX + ci * POS_SPACING_X, y + POS_SPACING_Y, posId);
          });
        }
      };

      const rootTotalWidth = (roots.length - 1) * POS_SPACING_X;
      const rootStartX = baseX - rootTotalWidth / 2;
      roots.forEach((pos, pi) => {
        renderPosition(pos, rootStartX + pi * POS_SPACING_X, baseY, `dept-${deptId}`);
      });
    };

    // Recursive department node builder (supports قسم → شعبة → وحدة)
    const levelLabels: Record<string, string> = { department: "قسم", section: "شعبة", unit: "وحدة" };

    const buildDeptNode = (dept: any, x: number, y: number, parentNodeId: string) => {
      const deptId = `dept-${dept.id}`;
      const deptPositions = posByDept.get(dept.id) || [];
      const childDepts = subDeptsByParent.get(dept.id) || [];
      const deptEmps = employees.filter((e: any) => e.department_id === dept.id);
      const isDeptExpanded = expandedNodes.has(deptId);
      const totalChildren = childDepts.length + deptPositions.length;
      const levelLabel = levelLabels[dept.level] || "قسم";

      const filledPositions = deptPositions.filter((p) => (empByPosition.countMap.get(p.id) || 0) > 0).length;
      const vacantPositionsCount = deptPositions.filter((p) => (empByPosition.countMap.get(p.id) || 0) === 0 && p.status !== "inactive").length;
      const managersCount = deptPositions.filter(p => p.is_manager).length;
      const isOutOfSync = deptEmps.length > 0 && deptPositions.length === 0;

      const deptData: OrgNodeData = {
        type: "department",
        label: `${dept.name}`,
        branch: dept.branches?.name || levelLabel,
        isManager: !!dept.manager_position_id || managersCount > 0,
        employeeCount: deptEmps.length,
        directReports: totalChildren,
        expanded: isDeptExpanded,
        childCount: totalChildren,
        vacantCount: vacantPositionsCount,
        capacity: deptPositions.length,
        positionsFilled: filledPositions,
        positionsVacant: vacantPositionsCount,
        positionsTotal: deptPositions.length,
        managersCount,
        isOutOfSync,
        departmentId: dept.id,
        onOpenDetail: () => openDetail({
          type: "department", label: dept.name, branch: dept.branches?.name || levelLabel,
          isManager: !!dept.manager_position_id || managersCount > 0, employeeCount: deptEmps.length, directReports: totalChildren,
          departmentId: dept.id, vacantCount: vacantPositionsCount, capacity: deptPositions.length,
          positionsFilled: filledPositions, positionsVacant: vacantPositionsCount, positionsTotal: deptPositions.length,
          managersCount, isOutOfSync,
        }),
        onToggleExpand: totalChildren > 0 ? () => toggleNodeExpansion(deptId) : undefined,
        onAddChild: () => handleAddChild("department", null, dept.id),
        onEdit: () => handleEditDept(dept),
        onArchive: () => handleArchive("department", dept.id, dept.name),
      };

      nodes.push({ id: deptId, type: "orgNode", position: { x, y }, data: deptData as any });
      flatList.push({ id: deptId, data: deptData, parentId: parentNodeId });
      edges.push({ id: `e-${parentNodeId}-${deptId}`, source: parentNodeId, target: deptId, ...defaultEdgeOptions });

      if (isDeptExpanded) {
        let nextY = y + POS_SPACING_Y;
        // Render child sub-departments first
        if (childDepts.length > 0) {
          const childWidth = (childDepts.length - 1) * DEPT_SPACING_X;
          const childStartX = x - childWidth / 2;
          childDepts.forEach((child: any, ci: number) => {
            buildDeptNode(child, childStartX + ci * DEPT_SPACING_X, nextY, deptId);
          });
          nextY += POS_SPACING_Y;
        }
        // Then render positions
        if (deptPositions.length > 0) {
          buildPositionTree(deptPositions, dept.id, dept.name, dept.branches?.name, x, nextY, dept.manager_position_id);
        }
      }
    };

    // Top-level departments
    topDepts.forEach((dept: any, di: number) => {
      const deptX = deptStartX + di * DEPT_SPACING_X;
      buildDeptNode(dept, deptX, DEPT_Y, "company");
    });

    // Positions without department
    if (noDeptPositions.length > 0) {
      const uDeptId = "dept-unassigned";
      const uX = deptStartX + topDepts.length * DEPT_SPACING_X;
      const isUExpanded = expandedNodes.has(uDeptId);

      const uDeptData: OrgNodeData = {
        type: "department", label: "بدون قسم", employeeCount: noDeptPositions.length,
        directReports: noDeptPositions.length, expanded: isUExpanded,
        childCount: noDeptPositions.length,
        onOpenDetail: () => openDetail({ type: "department", label: "بدون قسم", employeeCount: noDeptPositions.length, directReports: noDeptPositions.length }),
        onToggleExpand: () => toggleNodeExpansion(uDeptId),
        onAddChild: () => handleAddChild("department"),
      };

      nodes.push({ id: uDeptId, type: "orgNode", position: { x: uX, y: DEPT_Y }, data: uDeptData as any });
      flatList.push({ id: uDeptId, data: uDeptData, parentId: "company" });
      edges.push({ id: `e-company-${uDeptId}`, source: "company", target: uDeptId, ...defaultEdgeOptions, style: { ...defaultEdgeOptions.style, strokeDasharray: "5 5" } });

      if (isUExpanded) {
        buildPositionTree(noDeptPositions, "unassigned", "بدون قسم", undefined, uX, POS_START_Y);
      }
    }

    return { chartNodes: nodes, chartEdges: edges, flatNodes: flatList, vacantCount: vacant };
  }, [departments, employees, positions, company, openDetail, empByPosition, handleAddChild, handleAssignEmployee, handleClone, handleArchive, handleEdit, handleEditDept, handleActivate, unassignMutation, expandedNodes, toggleNodeExpansion]);

  // Filter by search
  const filteredNodes = useMemo(() => {
    if (!search) return chartNodes;
    const s = search.toLowerCase();
    const matchIds = new Set<string>();
    chartNodes.forEach((n) => {
      const d = n.data as unknown as OrgNodeData;
      if (d.label?.toLowerCase().includes(s) || d.employeeName?.toLowerCase().includes(s) || d.department?.toLowerCase().includes(s) || d.employeeCode?.toLowerCase().includes(s) || d.positionCode?.toLowerCase().includes(s)) matchIds.add(n.id);
    });
    const addAncestors = (id: string) => { const flat = flatNodes.find((f) => f.id === id); if (flat?.parentId) { matchIds.add(flat.parentId); addAncestors(flat.parentId); } };
    [...matchIds].forEach(addAncestors);
    return chartNodes.filter((n) => matchIds.has(n.id));
  }, [chartNodes, flatNodes, search]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return chartEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [filteredNodes, chartEdges]);

  // View mode filtering
  const displayNodes = useMemo(() => {
    if (viewMode === "vacancy") {
      const ids = new Set<string>();
      filteredNodes.forEach((n) => { const d = n.data as unknown as OrgNodeData; if (d.status === "vacant" || d.status === "hiring") ids.add(n.id); });
      if (ids.size === 0) return filteredNodes;
      const addAncestors = (id: string) => { const flat = flatNodes.find((f) => f.id === id); if (flat?.parentId) { ids.add(flat.parentId); addAncestors(flat.parentId); } };
      [...ids].forEach(addAncestors);
      return filteredNodes.filter((n) => ids.has(n.id));
    }
    if (viewMode === "management") {
      const ids = new Set<string>();
      filteredNodes.forEach((n) => { const d = n.data as unknown as OrgNodeData; if (d.isManager || d.type === "company" || d.type === "department") ids.add(n.id); });
      return filteredNodes.filter((n) => ids.has(n.id));
    }
    if (viewMode === "permissions") {
      const ids = new Set<string>();
      filteredNodes.forEach((n) => { const d = n.data as unknown as OrgNodeData; if ((d.permissionsCount || 0) > 0 || d.type === "company" || d.type === "department") ids.add(n.id); });
      return filteredNodes.filter((n) => ids.has(n.id));
    }
    if (viewMode === "workflow") {
      const ids = new Set<string>();
      filteredNodes.forEach((n) => { const d = n.data as unknown as OrgNodeData; if ((d.workflowRoles || 0) > 0 || d.type === "company" || d.type === "department") ids.add(n.id); });
      return filteredNodes.filter((n) => ids.has(n.id));
    }
    return filteredNodes;
  }, [filteredNodes, flatNodes, viewMode]);

  // Apply saved positions in free layout mode
  const finalDisplayNodes = useMemo(() => {
    if (chartLayoutMode === "free") {
      return applySavedPositions(displayNodes, positions, departments);
    }
    return displayNodes;
  }, [displayNodes, chartLayoutMode, applySavedPositions, positions, departments]);

  // Auto-detect if saved positions exist
  useEffect(() => {
    if (hasSavedPositions(positions, departments)) {
      setChartLayoutMode("free");
    }
  }, [positions, departments, hasSavedPositions]);

  const displayEdges = useMemo(() => {
    const nodeIds = new Set(finalDisplayNodes.map((n) => n.id));
    return filteredEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [finalDisplayNodes, filteredEdges]);

  if (positionsLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div><h1 className="font-heading font-bold text-2xl text-foreground">الهيكل التنظيمي</h1></div>
        <div className="flex-1 min-h-[500px] rounded-xl border border-border bg-card flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 mx-auto flex items-center justify-center animate-pulse">
              <span className="text-primary font-heading font-bold">ت</span>
            </div>
            <p className="text-sm text-muted-foreground">جاري تحميل الهيكل التنظيمي...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">الهيكل التنظيمي</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{departments.filter((d: any) => d.level === "department").length} قسم • {departments.filter((d: any) => d.level === "section").length} شعبة • {departments.filter((d: any) => d.level === "unit").length} وحدة • {positions.length} منصب • {employees.length} موظف</p>
        </div>
      </div>

      <OrgChartToolbar
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        chartLayoutMode={chartLayoutMode}
        onChartLayoutModeChange={(mode) => {
          setChartLayoutMode(mode);
          if (mode === "auto") {
            resetLayout();
          }
        }}
        onZoomIn={() => reactFlowInstance.zoomIn()}
        onZoomOut={() => reactFlowInstance.zoomOut()}
        onFitView={() => reactFlowInstance.fitView({ padding: 0.2 })}
        totalNodes={positions.length}
        vacantCount={vacantCount}
        onAddDepartment={() => setAddNode({ open: true, parentType: "company" })}
        onAddPosition={() => setAddNode({ open: true, parentType: "company", initialNodeType: "position" })}
        onAssignEmployee={() => setAssignState({ open: true, positionId: "", positionTitle: "" })}
        onSync={() => setSyncOpen(true)}
        showSync={true}
        autoSync={autoSync}
        onAutoSyncChange={handleAutoSyncChange}
        fixIssueCount={(() => {
          let count = 0;
          positions.forEach((p: any) => {
            if (!p.parent_position_id && !p.department_id) count++;
          });
          const orphanEmps = employees.filter((e: any) => e.status === "active" && !e.position_id);
          count += orphanEmps.length;
          return count;
        })()}
        onExport={() => {
          const rows = positions.map((p: any) => {
            const emp = empByPosition.firstEmpMap.get(p.id);
            const dept = departments.find((d: any) => d.id === p.department_id);
            return [
              p.title_ar || "",
              p.title_en || "",
              (p as any).position_code || "",
              p.status || "",
              emp?.name_ar || "شاغر",
              emp?.employee_code || "",
              dept?.name || "",
              p.is_manager ? "نعم" : "لا",
              p.grade_level || "",
              p.min_salary || "",
              p.max_salary || "",
            ].join(",");
          });
          const header = "المنصب,Title EN,الرمز,الحالة,الموظف,رقم الموظف,القسم,إداري,الدرجة,الحد الأدنى,الحد الأقصى";
          const csv = "\uFEFF" + [header, ...rows].join("\n");
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "org-chart-export.csv"; a.click();
          URL.revokeObjectURL(url);
          toast({ title: "تم تصدير البيانات" });
        }}
      />

      {layoutMode === "chart" ? (
        <div className="flex-1 min-h-[500px] rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <ReactFlow
            nodes={finalDisplayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onNodeDragStop={onNodeDragStop}
            nodesDraggable
            edgesReconnectable
            fitView={chartLayoutMode === "auto"}
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineType={ConnectionLineType.SmoothStep}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="org-chart-flow"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border) / 0.4)" />
            <MiniMap nodeStrokeWidth={3} pannable zoomable className="!bg-card !border-border !rounded-lg !shadow-sm" maskColor="hsl(var(--background) / 0.7)" />
          </ReactFlow>
        </div>
      ) : (
        <OrgChartListView departments={departments} positions={positions} employees={employees} company={company} search={search} onNodeClick={openDetail} onAddChild={handleAddChild} onAssignEmployee={handleAssignEmployee} onEdit={handleEdit} onEditDept={handleEditDept} onArchive={handleArchive} />
      )}

      <OrgChartDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        node={detailNode}
        onAssignEmployee={handleAssignEmployee}
        onUnassignEmployee={(posId) => unassignMutation.mutate(posId)}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onClone={handleClone}
        onAddChild={handleAddChild}
        onActivate={handleActivate}
        onTransfer={handleTransfer}
      />

      {companyId && (
        <>
          <AddNodeDialog
            open={addNode.open}
            onClose={() => setAddNode({ open: false, parentType: "company" })}
            companyId={companyId}
            parentPositionId={addNode.parentPositionId}
            parentDepartmentId={addNode.parentDepartmentId}
            parentType={addNode.parentType}
            initialNodeType={addNode.initialNodeType}
          />
          <AssignEmployeeDialog
            open={assignState.open}
            onClose={() => setAssignState({ open: false, positionId: "", positionTitle: "" })}
            companyId={companyId}
            positionId={assignState.positionId}
            positionTitle={assignState.positionTitle}
          />
          <ClonePositionDialog
            open={cloneState.open}
            onClose={() => setCloneState({ open: false, position: null })}
            companyId={companyId}
            position={cloneState.position}
          />
          <ArchiveConfirmDialog
            open={archiveState.open}
            onClose={() => setArchiveState({ open: false, nodeType: "position", nodeId: "", nodeTitle: "" })}
            nodeType={archiveState.nodeType}
            nodeId={archiveState.nodeId}
            nodeTitle={archiveState.nodeTitle}
          />
          <EditPositionDialog
            open={editState.open}
            onClose={() => setEditState({ open: false, position: null })}
            companyId={companyId}
            position={editState.position}
          />
          <ActivatePositionDialog
            open={activateState.open}
            onClose={() => setActivateState({ open: false, positionId: "", positionTitle: "" })}
            positionId={activateState.positionId}
            positionTitle={activateState.positionTitle}
          />
          <TransferEmployeeDialog
            open={transferState.open}
            onClose={() => setTransferState({ open: false, employeeId: "", employeeName: "" })}
            companyId={companyId}
            employeeId={transferState.employeeId}
            employeeName={transferState.employeeName}
            currentPositionId={transferState.currentPositionId}
          />
          <EditDepartmentDialog
            open={editDeptState.open}
            onClose={() => setEditDeptState({ open: false, department: null })}
            companyId={companyId}
            department={editDeptState.department}
          />
          <OrgSyncDialog open={syncOpen} onOpenChange={setSyncOpen} />
        </>
      )}
    </div>
  );
}

export default function OrgChart() {
  return (
    <ReactFlowProvider>
      <OrgChartInner />
    </ReactFlowProvider>
  );
}
