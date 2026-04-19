import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Severity = "critical" | "warning" | "info";

type SyncStatus = "success" | "partial" | "failed";

interface SyncOptions {
  company_id: string;
  preview: boolean;
  sync_branches: boolean;
  sync_departments: boolean;
  sync_positions: boolean;
  sync_employees: boolean;
  fix_managers: boolean;
  repair_hierarchy: boolean;
}

interface UnresolvedRecord {
  type: string;
  id: string | null;
  name: string;
  message: string;
  severity: Severity;
  action_path?: string;
}

interface DepartmentDiagnostic {
  department_id: string;
  name: string;
  employees: number;
  positions: number;
  filled: number;
  missing: number;
  has_manager: boolean;
  inconsistent: boolean;
}

interface SyncResult {
  created_positions: { id: string; title: string; reason: string; severity: Severity }[];
  linked_employees: { employee_id: string; name: string; position_id: string }[];
  fixed_managers: { entity: "department" | "branch"; entity_id: string; entity_name: string; position_id: string }[];
  repaired_relations: { position_id: string; title: string; fix: string }[];
  conflicts: { type: string; message: string; entity_id?: string; severity: Severity }[];
  warnings: string[];
  errors: string[];
  summary: Record<string, number>;
  before: Record<string, number>;
  after: Record<string, number>;
  consistency_score: number;
  company_consistency_score: number;
  repaired_count: number;
  unresolved_count: number;
  blocking_errors_count: number;
  final_status: SyncStatus;
  department_diagnostics: DepartmentDiagnostic[];
  unresolved_records: UnresolvedRecord[];
  audit: {
    employees: {
      total_active_employees: number;
      employees_missing_position_before: number;
      employees_repaired: number;
      employees_unresolved: number;
    };
    positions: {
      total_positions_before: number;
      positions_created: number;
      positions_repaired: number;
      vacant_positions: number;
      duplicate_or_invalid_positions: number;
    };
    departments: {
      departments_with_employees_no_positions_before: number;
      departments_fixed: number;
      departments_still_inconsistent: number;
    };
    managers: {
      missing_manager_positions_detected: number;
      manager_positions_created: number;
      unresolved_manager_mappings: number;
    };
    roles_permissions: {
      mismatched_permissions_repaired: number;
      unresolved_permission_mismatches: number;
    };
    workflows: {
      workflows_missing_approvers: number;
      workflows_repaired_via_hierarchy_fallback: number;
      unresolved_workflow_chains: number;
    };
  };
}

const defaultOptions: Pick<SyncOptions, "sync_branches" | "sync_departments" | "sync_positions" | "sync_employees" | "fix_managers" | "repair_hierarchy"> = {
  sync_branches: true,
  sync_departments: true,
  sync_positions: true,
  sync_employees: true,
  fix_managers: true,
  repair_hierarchy: true,
};

const normalize = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase() : "");

function hasTruthyValue(record: unknown): boolean {
  if (!record || typeof record !== "object") return false;
  return Object.values(record as Record<string, unknown>).some(Boolean);
}

function detectCircularChain(positionId: string, positionMap: Map<string, any>, maxDepth = 100): string[] {
  const visited = new Set<string>();
  const chain: string[] = [];
  let current: string | null = positionId;
  let depth = 0;

  while (current && depth < maxDepth) {
    if (visited.has(current)) {
      chain.push(current);
      return chain;
    }

    visited.add(current);
    chain.push(current);

    const pos = positionMap.get(current);
    current = pos?.parent_position_id || null;
    depth++;
  }

  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader?.replace("Bearer ", "");
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const options: SyncOptions = {
      company_id: typeof body.company_id === "string" ? body.company_id : "",
      preview: body.preview !== false,
      sync_branches: body.sync_branches ?? defaultOptions.sync_branches,
      sync_departments: body.sync_departments ?? defaultOptions.sync_departments,
      sync_positions: body.sync_positions ?? defaultOptions.sync_positions,
      sync_employees: body.sync_employees ?? defaultOptions.sync_employees,
      fix_managers: body.fix_managers ?? defaultOptions.fix_managers,
      repair_hierarchy: body.repair_hierarchy ?? defaultOptions.repair_hierarchy,
    };

    if (!options.company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPreview = options.preview;
    const companyId = options.company_id;

    const result: SyncResult = {
      created_positions: [],
      linked_employees: [],
      fixed_managers: [],
      repaired_relations: [],
      conflicts: [],
      warnings: [],
      errors: [],
      summary: {},
      before: {},
      after: {},
      consistency_score: 0,
      company_consistency_score: 0,
      repaired_count: 0,
      unresolved_count: 0,
      blocking_errors_count: 0,
      final_status: "failed",
      department_diagnostics: [],
      unresolved_records: [],
      audit: {
        employees: {
          total_active_employees: 0,
          employees_missing_position_before: 0,
          employees_repaired: 0,
          employees_unresolved: 0,
        },
        positions: {
          total_positions_before: 0,
          positions_created: 0,
          positions_repaired: 0,
          vacant_positions: 0,
          duplicate_or_invalid_positions: 0,
        },
        departments: {
          departments_with_employees_no_positions_before: 0,
          departments_fixed: 0,
          departments_still_inconsistent: 0,
        },
        managers: {
          missing_manager_positions_detected: 0,
          manager_positions_created: 0,
          unresolved_manager_mappings: 0,
        },
        roles_permissions: {
          mismatched_permissions_repaired: 0,
          unresolved_permission_mismatches: 0,
        },
        workflows: {
          workflows_missing_approvers: 0,
          workflows_repaired_via_hierarchy_fallback: 0,
          unresolved_workflow_chains: 0,
        },
      },
    };

    const addConflict = (type: string, message: string, severity: Severity, entityId?: string) => {
      result.conflicts.push({ type, message, severity, entity_id: entityId });
    };

    const addUnresolved = (record: UnresolvedRecord) => {
      result.unresolved_records.push(record);
      if (record.severity === "critical") {
        addConflict(record.type, record.message, "critical", record.id || undefined);
      }
    };

    const addError = (message: string, err?: unknown) => {
      const details = err instanceof Error ? err.message : String(err ?? "unknown error");
      result.errors.push(`${message}: ${details}`);
    };

    const [employeesRes, positionsRes, departmentsRes, branchesRes, profilesRes] = await Promise.all([
      supabase
        .from("employees")
        .select("id, name_ar, name_en, company_id, department_id, branch_id, position, position_id, status, user_id")
        .eq("company_id", companyId)
        .eq("status", "active"),
      supabase
        .from("positions")
        .select("id, company_id, title_ar, title_en, department_id, branch_id, parent_position_id, status, is_manager, created_from, service_permissions, workflow_responsibilities, system_role")
        .eq("company_id", companyId)
        .neq("status", "inactive"),
      supabase
        .from("departments")
        .select("id, name, branch_id, level, parent_department_id, manager_name, manager_position_id, company_id")
        .eq("company_id", companyId),
      supabase
        .from("branches")
        .select("id, name, manager_name, manager_position_id, company_id")
        .eq("company_id", companyId),
      supabase
        .from("profiles")
        .select("id, user_id, system_role, company_id")
        .eq("company_id", companyId),
    ]);

    if (employeesRes.error) addError("Failed to fetch employees", employeesRes.error);
    if (positionsRes.error) addError("Failed to fetch positions", positionsRes.error);
    if (departmentsRes.error) addError("Failed to fetch departments", departmentsRes.error);
    if (branchesRes.error) addError("Failed to fetch branches", branchesRes.error);
    if (profilesRes.error) addError("Failed to fetch profiles", profilesRes.error);

    const employees = employeesRes.data || [];
    const positions = positionsRes.data || [];
    const departments = departmentsRes.data || [];
    const branches = branchesRes.data || [];
    const profiles = profilesRes.data || [];

    result.audit.employees.total_active_employees = employees.length;
    result.audit.positions.total_positions_before = positions.length;

    const departmentMap = new Map(departments.map((d: any) => [d.id, { ...d }]));
    const branchMap = new Map(branches.map((b: any) => [b.id, { ...b }]));
    const employeeMap = new Map(employees.map((e: any) => [e.id, { ...e }]));
    const positionMap = new Map(positions.map((p: any) => [p.id, { ...p }]));

    const employeePositionMap = new Map<string, string | null>();
    employees.forEach((emp: any) => {
      employeePositionMap.set(emp.id, emp.position_id || null);
    });

    const nextPreviewId = (() => {
      let i = 0;
      return (prefix: string) => `preview-${prefix}-${++i}`;
    })();

    const safeUpdate = async (op: string, fn: () => Promise<any>) => {
      if (isPreview) return null;
      try {
        return await fn();
      } catch (err) {
        addError(op, err);
        return null;
      }
    };

    const getEmployeeCountByDepartment = (deps: Map<string, any>, empMap: Map<string, any>) => {
      const out = new Map<string, number>();
      deps.forEach((_, id) => out.set(id, 0));
      empMap.forEach((emp: any) => {
        if (emp.department_id && out.has(emp.department_id)) {
          out.set(emp.department_id, (out.get(emp.department_id) || 0) + 1);
        }
      });
      return out;
    };

    const getPositionCountByDepartment = (deps: Map<string, any>, posMap: Map<string, any>) => {
      const out = new Map<string, number>();
      deps.forEach((_, id) => out.set(id, 0));
      posMap.forEach((pos: any) => {
        if (pos.department_id && out.has(pos.department_id) && pos.status !== "inactive") {
          out.set(pos.department_id, (out.get(pos.department_id) || 0) + 1);
        }
      });
      return out;
    };

    const getInitialMissingPositionEmployees = () => {
      let count = 0;
      employeeMap.forEach((emp: any) => {
        const posId = emp.position_id;
        if (!posId || !positionMap.has(posId)) count++;
      });
      return count;
    };

    const initialEmpMissing = getInitialMissingPositionEmployees();
    const initialEmpByDept = getEmployeeCountByDepartment(departmentMap, employeeMap);
    const initialPosByDept = getPositionCountByDepartment(departmentMap, positionMap);

    const initialDeptNoPositions = Array.from(departmentMap.keys()).filter((deptId) => {
      const empCount = initialEmpByDept.get(deptId) || 0;
      const posCount = initialPosByDept.get(deptId) || 0;
      return empCount > 0 && posCount === 0;
    }).length;

    const initialOrphanPositions = Array.from(positionMap.values()).filter((p: any) => p.parent_position_id && !positionMap.has(p.parent_position_id)).length;

    const initialMissingManagerPositions = [
      ...Array.from(departmentMap.values()).filter((d: any) => (d.manager_name && !d.manager_position_id) || (d.manager_position_id && !positionMap.has(d.manager_position_id))),
      ...Array.from(branchMap.values()).filter((b: any) => (b.manager_name && !b.manager_position_id) || (b.manager_position_id && !positionMap.has(b.manager_position_id))),
    ].length;

    result.before = {
      total_active_employees: employees.length,
      total_active_positions: positions.length,
      employees_missing_position: initialEmpMissing,
      departments_with_employees_no_positions: initialDeptNoPositions,
      missing_manager_positions: initialMissingManagerPositions,
      orphan_positions: initialOrphanPositions,
    };

    result.audit.employees.employees_missing_position_before = initialEmpMissing;
    result.audit.departments.departments_with_employees_no_positions_before = initialDeptNoPositions;

    const updateEmployeePosition = async (employeeId: string, positionId: string, reasonForReport?: string) => {
      const emp = employeeMap.get(employeeId);
      if (!emp) return;

      const oldPositionId = employeePositionMap.get(employeeId);
      employeePositionMap.set(employeeId, positionId);
      emp.position_id = positionId;

      if (!isPreview) {
        await safeUpdate(`Update employee.position_id (${employeeId})`, async () => {
          const { error } = await supabase
            .from("employees")
            .update({ position_id: positionId })
            .eq("id", employeeId)
            .eq("company_id", companyId);
          if (error) throw error;
          return true;
        });
      }

      if (reasonForReport) {
        result.linked_employees.push({
          employee_id: employeeId,
          name: emp.name_ar || emp.name_en || employeeId,
          position_id: positionId,
        });
      }

      // Old position can become vacant after reassignment
      if (oldPositionId && oldPositionId !== positionId && positionMap.has(oldPositionId)) {
        const oldPos = positionMap.get(oldPositionId);
        oldPos.status = "vacant";
      }
    };

    const updatePosition = async (positionId: string, patch: Record<string, any>, fixLabel?: string) => {
      const pos = positionMap.get(positionId);
      if (!pos) return;

      Object.assign(pos, patch);

      if (!isPreview) {
        await safeUpdate(`Update position (${positionId})`, async () => {
          const { error } = await supabase
            .from("positions")
            .update(patch)
            .eq("id", positionId)
            .eq("company_id", companyId);
          if (error) throw error;
          return true;
        });
      }

      if (fixLabel) {
        result.repaired_relations.push({
          position_id: positionId,
          title: pos.title_ar || pos.title_en || "—",
          fix: fixLabel,
        });
      }
    };

    const createPosition = async (
      payload: Record<string, any>,
      reason: string,
      severity: Severity,
      unresolvedIfFail?: UnresolvedRecord
    ): Promise<string | null> => {
      if (!options.sync_positions) {
        if (unresolvedIfFail) addUnresolved(unresolvedIfFail);
        return null;
      }

      const title = payload.title_ar || payload.title_en || "منصب";

      if (isPreview) {
        const previewId = nextPreviewId("position");
        const syntheticPos = { ...payload, id: previewId };
        positionMap.set(previewId, syntheticPos);
        result.created_positions.push({ id: previewId, title, reason, severity });
        result.audit.positions.positions_created += 1;
        return previewId;
      }

      try {
        const { data, error } = await supabase
          .from("positions")
          .insert(payload)
          .select("*")
          .single();

        if (error || !data?.id) throw error || new Error("Failed to create position");

        positionMap.set(data.id, data);
        result.created_positions.push({ id: data.id, title, reason, severity });
        result.audit.positions.positions_created += 1;
        return data.id;
      } catch (err) {
        addError("Create position failed", err);
        if (unresolvedIfFail) addUnresolved(unresolvedIfFail);
        return null;
      }
    };

    const setDepartmentManagerPosition = async (departmentId: string, positionId: string) => {
      const dept = departmentMap.get(departmentId);
      if (!dept) return;

      dept.manager_position_id = positionId;
      dept.manager_name = null;

      if (!isPreview) {
        await safeUpdate(`Update department manager_position_id (${departmentId})`, async () => {
          const { error } = await supabase
            .from("departments")
            .update({ manager_position_id: positionId, manager_name: null })
            .eq("id", departmentId)
            .eq("company_id", companyId);
          if (error) throw error;
          return true;
        });
      }
    };

    const setBranchManagerPosition = async (branchId: string, positionId: string) => {
      const branch = branchMap.get(branchId);
      if (!branch) return;

      branch.manager_position_id = positionId;
      branch.manager_name = null;

      if (!isPreview) {
        await safeUpdate(`Update branch manager_position_id (${branchId})`, async () => {
          const { error } = await supabase
            .from("branches")
            .update({ manager_position_id: positionId, manager_name: null })
            .eq("id", branchId)
            .eq("company_id", companyId);
          if (error) throw error;
          return true;
        });
      }
    };

    // RULE 1 + RULE 3 + RULE 4: each active employee must have a valid position.
    if (options.sync_employees || options.sync_positions) {
      const usedVacant = new Set<string>();

      for (const employee of employeeMap.values()) {
        const existingPosId = employeePositionMap.get(employee.id);
        const existingPos = existingPosId ? positionMap.get(existingPosId) : null;

        if (!existingPos) {
          const titleKey = normalize(employee.position) || "موظف";
          const candidate = Array.from(positionMap.values()).find((p: any) =>
            !usedVacant.has(p.id) &&
            p.status !== "inactive" &&
            p.status === "vacant" &&
            p.department_id === employee.department_id &&
            normalize(p.title_ar || p.title_en) === titleKey
          );

          if (candidate) {
            usedVacant.add(candidate.id);
            await updateEmployeePosition(employee.id, candidate.id, "link-existing-vacant");
            await updatePosition(candidate.id, { status: "filled" }, `ربط الموظف "${employee.name_ar || employee.name_en}" بمنصب شاغر`);
            continue;
          }

          const dept = employee.department_id ? departmentMap.get(employee.department_id) : null;
          const fallbackBranch = employee.branch_id || dept?.branch_id || null;
          const titleAr = (typeof employee.position === "string" && employee.position.trim()) || "موظف";
          const titleEn = (typeof employee.position === "string" && employee.position.trim()) || "Employee";

          const createdPositionId = await createPosition(
            {
              company_id: companyId,
              department_id: employee.department_id || null,
              branch_id: fallbackBranch,
              title_ar: titleAr,
              title_en: titleEn,
              status: "filled",
              
              is_manager: false,
              parent_position_id: dept?.manager_position_id || null,
              created_from: "sync",
            },
            `إنشاء منصب تلقائي للموظف "${employee.name_ar || employee.name_en || employee.id}"`,
            "critical",
            {
              type: "employee_without_position",
              id: employee.id,
              name: employee.name_ar || employee.name_en || employee.id,
              message: "لم يتمكن النظام من إنشاء/ربط منصب لهذا الموظف",
              severity: "critical",
              action_path: `/employees?id=${employee.id}`,
            }
          );

          if (createdPositionId) {
            await updateEmployeePosition(employee.id, createdPositionId, "employee-missing-position");
          }
        } else {
          // repair incorrect or missing structural links on existing position
          const empDeptId = employee.department_id || null;
          const empBranchId = employee.branch_id || null;
          const dept = empDeptId ? departmentMap.get(empDeptId) : null;
          const expectedBranchId = empBranchId || dept?.branch_id || null;

          if (empDeptId && existingPos.department_id !== empDeptId) {
            await updatePosition(existingPos.id, { department_id: empDeptId }, `تصحيح القسم للمنصب "${existingPos.title_ar || existingPos.title_en}" من بيانات الموظف`);
            result.audit.positions.positions_repaired += 1;
          }

          if (expectedBranchId && existingPos.branch_id !== expectedBranchId) {
            await updatePosition(existingPos.id, { branch_id: expectedBranchId }, `تصحيح الفرع للمنصب "${existingPos.title_ar || existingPos.title_en}" من بيانات الموظف`);
            result.audit.positions.positions_repaired += 1;
          }
        }
      }
    }

    // Multi-employee single-position conflicts.
    const employeesPerPosition = new Map<string, any[]>();
    employeeMap.forEach((emp: any) => {
      const posId = employeePositionMap.get(emp.id);
      if (!posId || !positionMap.has(posId)) return;
      if (!employeesPerPosition.has(posId)) employeesPerPosition.set(posId, []);
      employeesPerPosition.get(posId)!.push(emp);
    });

    for (const [positionId, linkedEmployees] of employeesPerPosition.entries()) {
      if (linkedEmployees.length <= 1) continue;

      const pos = positionMap.get(positionId);
      result.audit.positions.duplicate_or_invalid_positions += 1;
      addConflict(
        "multi_employee_position",
        `المنصب "${pos?.title_ar || pos?.title_en || positionId}" مرتبط بـ ${linkedEmployees.length} موظفين`,
        "warning",
        positionId
      );

      // Keep first employee on current position; split the rest.
      for (let i = 1; i < linkedEmployees.length; i++) {
        const emp = linkedEmployees[i];
        const dept = emp.department_id ? departmentMap.get(emp.department_id) : null;

        const newPosId = await createPosition(
          {
            company_id: companyId,
            department_id: emp.department_id || pos?.department_id || null,
            branch_id: emp.branch_id || pos?.branch_id || null,
            parent_position_id: pos?.parent_position_id || dept?.manager_position_id || null,
            title_ar: emp.position || pos?.title_ar || "موظف",
            title_en: emp.position || pos?.title_en || "Employee",
            status: "filled",
            
            is_manager: false,
            created_from: "sync",
          },
          `فصل الموظف "${emp.name_ar || emp.name_en || emp.id}" عن منصب مشترك`,
          "warning",
          {
            type: "multi_employee_position",
            id: emp.id,
            name: emp.name_ar || emp.name_en || emp.id,
            message: "لم يتمكن النظام من فصل الموظف عن المنصب المشترك",
            severity: "warning",
            action_path: `/employees?id=${emp.id}`,
          }
        );

        if (newPosId) {
          await updateEmployeePosition(emp.id, newPosId, "split-shared-position");
          result.audit.positions.positions_repaired += 1;
        }
      }
    }

    // RULE 2: manager mappings must point to real manager positions.
    if (options.fix_managers) {
      if (options.sync_departments) {
        for (const dept of departmentMap.values()) {
          const hasManagerPos = !!dept.manager_position_id && positionMap.has(dept.manager_position_id);
          const hasManagerName = !!normalize(dept.manager_name);

          if (hasManagerPos && hasManagerName && !isPreview) {
            await safeUpdate(`Clear legacy department manager_name (${dept.id})`, async () => {
              const { error } = await supabase
                .from("departments")
                .update({ manager_name: null })
                .eq("id", dept.id)
                .eq("company_id", companyId);
              if (error) throw error;
              return true;
            });
            dept.manager_name = null;
          }

          if (hasManagerPos) continue;

          if (!hasManagerName && !dept.manager_position_id) continue;

          result.audit.managers.missing_manager_positions_detected += 1;

          const parentDept = dept.parent_department_id ? departmentMap.get(dept.parent_department_id) : null;
          const managerPositionId = await createPosition(
            {
              company_id: companyId,
              department_id: dept.id,
              branch_id: dept.branch_id || null,
              parent_position_id: parentDept?.manager_position_id || null,
              title_ar: `مدير ${dept.name}`,
              title_en: `Manager - ${dept.name}`,
              status: "vacant",
              
              is_manager: true,
              created_from: "sync",
            },
            `إنشاء منصب مدير للتشكيل "${dept.name}"`,
            "critical",
            {
              type: "missing_manager_position",
              id: dept.id,
              name: dept.name,
              message: "التشكيل لديه مدير نصي أو رابط مدير مكسور بدون منصب إداري حقيقي",
              severity: "critical",
              action_path: "/departments",
            }
          );

          if (!managerPositionId) {
            result.audit.managers.unresolved_manager_mappings += 1;
            continue;
          }

          await setDepartmentManagerPosition(dept.id, managerPositionId);

          const managerNameNormalized = normalize(dept.manager_name);
          const managerEmployee = managerNameNormalized
            ? Array.from(employeeMap.values()).find((e: any) =>
                e.department_id === dept.id &&
                (normalize(e.name_ar) === managerNameNormalized || normalize(e.name_en) === managerNameNormalized)
              )
            : null;

          if (managerEmployee) {
            await updateEmployeePosition(managerEmployee.id, managerPositionId, "manager-link");
            await updatePosition(managerPositionId, { status: "filled" }, `تعيين مدير التشكيل "${dept.name}" على منصب إداري حقيقي`);
          }

          result.fixed_managers.push({
            entity: "department",
            entity_id: dept.id,
            entity_name: dept.name,
            position_id: managerPositionId,
          });
          result.audit.managers.manager_positions_created += 1;
        }
      }

      if (options.sync_branches) {
        for (const branch of branchMap.values()) {
          const hasManagerPos = !!branch.manager_position_id && positionMap.has(branch.manager_position_id);
          const hasManagerName = !!normalize(branch.manager_name);

          if (hasManagerPos && hasManagerName && !isPreview) {
            await safeUpdate(`Clear legacy branch manager_name (${branch.id})`, async () => {
              const { error } = await supabase
                .from("branches")
                .update({ manager_name: null })
                .eq("id", branch.id)
                .eq("company_id", companyId);
              if (error) throw error;
              return true;
            });
            branch.manager_name = null;
          }

          if (hasManagerPos) continue;
          if (!hasManagerName && !branch.manager_position_id) continue;

          result.audit.managers.missing_manager_positions_detected += 1;

          const managerPositionId = await createPosition(
            {
              company_id: companyId,
              department_id: null,
              branch_id: branch.id,
              parent_position_id: null,
              title_ar: `مدير فرع ${branch.name}`,
              title_en: `Branch Manager - ${branch.name}`,
              status: "vacant",
              
              is_manager: true,
              created_from: "sync",
            },
            `إنشاء منصب مدير للفرع "${branch.name}"`,
            "warning",
            {
              type: "missing_branch_manager_position",
              id: branch.id,
              name: branch.name,
              message: "الفرع لديه مدير نصي أو رابط مدير مكسور بدون منصب إداري",
              severity: "warning",
              action_path: "/branches",
            }
          );

          if (!managerPositionId) {
            result.audit.managers.unresolved_manager_mappings += 1;
            continue;
          }

          await setBranchManagerPosition(branch.id, managerPositionId);

          const managerNameNormalized = normalize(branch.manager_name);
          const managerEmployee = managerNameNormalized
            ? Array.from(employeeMap.values()).find((e: any) =>
                e.branch_id === branch.id &&
                (normalize(e.name_ar) === managerNameNormalized || normalize(e.name_en) === managerNameNormalized)
              )
            : null;

          if (managerEmployee) {
            await updateEmployeePosition(managerEmployee.id, managerPositionId, "branch-manager-link");
            await updatePosition(managerPositionId, { status: "filled" }, `تعيين مدير الفرع "${branch.name}" على منصب إداري`);
          }

          result.fixed_managers.push({
            entity: "branch",
            entity_id: branch.id,
            entity_name: branch.name,
            position_id: managerPositionId,
          });
          result.audit.managers.manager_positions_created += 1;
        }
      }
    }

    if (options.repair_hierarchy) {
      // Fix broken parent links
      for (const pos of positionMap.values()) {
        if (pos.parent_position_id && !positionMap.has(pos.parent_position_id)) {
          await updatePosition(pos.id, { parent_position_id: null }, "إزالة parent_position_id غير صالح");
          addConflict("broken_parent", `المنصب "${pos.title_ar || pos.title_en || pos.id}" كان يشير لأب غير موجود`, "critical", pos.id);
          result.audit.positions.positions_repaired += 1;
        }
      }

      // Fix circular chains
      const fixedCircular = new Set<string>();
      for (const pos of positionMap.values()) {
        if (!pos.parent_position_id || fixedCircular.has(pos.id)) continue;
        const chain = detectCircularChain(pos.id, positionMap);
        if (chain.length > 0) {
          await updatePosition(pos.id, { parent_position_id: null }, "كسر مرجع دائري بالهيكل الوظيفي");
          addConflict("circular_hierarchy", `تم اكتشاف مرجع دائري في سلسلة المنصب "${pos.title_ar || pos.title_en || pos.id}"`, "critical", pos.id);
          chain.forEach((id) => fixedCircular.add(id));
          result.audit.positions.positions_repaired += 1;
        }
      }

      // STEP A: Match orphan positions (no department_id) to departments by name similarity.
      const deptNameMap = new Map<string, any>();
      for (const dept of departmentMap.values()) {
        deptNameMap.set(normalize(dept.name), dept);
      }

      for (const pos of positionMap.values()) {
        if (pos.department_id) continue; // already assigned
        const titleNorm = normalize(pos.title_ar || pos.title_en || "");
        if (!titleNorm) continue;

        // Try to match position to department by checking if position title contains department name
        let bestMatch: any = null;
        let bestMatchLen = 0;
        for (const [deptName, dept] of deptNameMap.entries()) {
          if (deptName.length < 3) continue;
          if (titleNorm.includes(deptName) && deptName.length > bestMatchLen) {
            bestMatch = dept;
            bestMatchLen = deptName.length;
          }
        }

        if (bestMatch) {
          const patch: Record<string, any> = { department_id: bestMatch.id };
          if (bestMatch.branch_id) patch.branch_id = bestMatch.branch_id;

          // If this looks like a manager position for the dept and dept has no manager
          const looksLikeManager = titleNorm.includes("مدير") && titleNorm.includes(normalize(bestMatch.name));
          if (looksLikeManager && !pos.is_manager) {
            patch.is_manager = true;
          }

          // Link under department manager if exists and this is not the manager
          if (!looksLikeManager && bestMatch.manager_position_id && positionMap.has(bestMatch.manager_position_id)) {
            patch.parent_position_id = bestMatch.manager_position_id;
          }

          await updatePosition(pos.id, patch, `ربط المنصب "${pos.title_ar}" بالتشكيل "${bestMatch.name}" تلقائياً`);
          result.audit.positions.positions_repaired += 1;

          // If this is a manager match and dept has no manager_position_id, set it
          if (looksLikeManager && !bestMatch.manager_position_id) {
            await setDepartmentManagerPosition(bestMatch.id, pos.id);
            result.fixed_managers.push({
              entity: "department",
              entity_id: bestMatch.id,
              entity_name: bestMatch.name,
              position_id: pos.id,
            });
            result.audit.managers.manager_positions_created += 1;
          }
        }
      }

      // STEP B: Link orphan top-level positions under department manager when possible.
      for (const dept of departmentMap.values()) {
        if (!dept.manager_position_id || !positionMap.has(dept.manager_position_id)) continue;
        const managerPosId = dept.manager_position_id;

        for (const pos of positionMap.values()) {
          if (pos.department_id !== dept.id) continue;
          if (pos.id === managerPosId) continue;
          if (pos.is_manager) continue;
          if (pos.parent_position_id) continue;

          await updatePosition(pos.id, { parent_position_id: managerPosId }, `ربط المنصب بمدير التشكيل "${dept.name}"`);
          result.audit.positions.positions_repaired += 1;
        }
      }
    }

    // Normalize position status to match real assignment truth.
    const occupancy = new Map<string, number>();
    employeePositionMap.forEach((posId) => {
      if (!posId || !positionMap.has(posId)) return;
      occupancy.set(posId, (occupancy.get(posId) || 0) + 1);
    });

    for (const pos of positionMap.values()) {
      if (pos.status === "inactive") continue;
      const assigned = occupancy.get(pos.id) || 0;
      const shouldStatus = assigned > 0 ? "filled" : "vacant";
      if (pos.status !== shouldStatus) {
        await updatePosition(pos.id, { status: shouldStatus }, `تحديث حالة المنصب تلقائياً إلى ${shouldStatus === "filled" ? "مشغول" : "شاغر"}`);
        result.audit.positions.positions_repaired += 1;
      }
    }

    // RULE 5: roles/permissions must be position-based and resolvable.
    for (const [positionId, assignedCount] of occupancy.entries()) {
      if (assignedCount <= 0) continue;
      const pos = positionMap.get(positionId);
      if (!pos) continue;

      const patch: Record<string, any> = {};
      if (!pos.system_role) patch.system_role = "employee";
      if (pos.service_permissions === null || pos.service_permissions === undefined) patch.service_permissions = {};

      if (Object.keys(patch).length > 0) {
        await updatePosition(positionId, patch, "توحيد صلاحيات المنصب وربطه بالوصول الفعّال");
        result.audit.roles_permissions.mismatched_permissions_repaired += 1;
      }
    }

    // RULE 6: workflow fallback audit through parent chain then tenant_admin.
    const tenantAdminCount = profiles.filter((p: any) => normalize(p.system_role) === "tenant_admin").length;

    for (const pos of positionMap.values()) {
      if (!hasTruthyValue(pos.workflow_responsibilities)) continue;

      const assigned = occupancy.get(pos.id) || 0;
      if (assigned > 0) continue;

      result.audit.workflows.workflows_missing_approvers += 1;

      let cursor = pos.parent_position_id || null;
      let depth = 0;
      let resolvedByChain = false;

      while (cursor && depth < 100) {
        const parent = positionMap.get(cursor);
        if (!parent) break;
        const parentAssigned = occupancy.get(parent.id) || 0;
        if (parentAssigned > 0) {
          resolvedByChain = true;
          break;
        }
        cursor = parent.parent_position_id || null;
        depth += 1;
      }

      if (resolvedByChain || tenantAdminCount > 0) {
        result.audit.workflows.workflows_repaired_via_hierarchy_fallback += 1;
      } else {
        result.audit.workflows.unresolved_workflow_chains += 1;
        addUnresolved({
          type: "workflow_missing_approver",
          id: pos.id,
          name: pos.title_ar || pos.title_en || pos.id,
          message: "لا يوجد معتمد فعّال في السلسلة الهرمية ولا tenant_admin متاح",
          severity: "critical",
          action_path: "/approvals",
        });
      }
    }

    // Department diagnostics + inconsistency validation.
    const finalEmployeesByDept = getEmployeeCountByDepartment(departmentMap, employeeMap);
    const finalPositionsByDept = getPositionCountByDepartment(departmentMap, positionMap);

    for (const dept of departmentMap.values()) {
      const employeesCount = finalEmployeesByDept.get(dept.id) || 0;
      const deptPositions = Array.from(positionMap.values()).filter((p: any) => p.department_id === dept.id && p.status !== "inactive");
      const filledPositions = deptPositions.filter((p: any) => (occupancy.get(p.id) || 0) > 0);
      const hasManager = deptPositions.some((p: any) => p.is_manager === true);
      const missing = Math.max(0, employeesCount - filledPositions.length);
      const inconsistent = employeesCount > 0 && deptPositions.length === 0;

      result.department_diagnostics.push({
        department_id: dept.id,
        name: dept.name,
        employees: employeesCount,
        positions: deptPositions.length,
        filled: filledPositions.length,
        missing,
        has_manager: hasManager,
        inconsistent,
      });

      if (inconsistent) {
        addUnresolved({
          type: "dept_no_positions",
          id: dept.id,
          name: dept.name,
          message: `التشكيل يحتوي على ${employeesCount} موظف ولكن 0 مناصب`,
          severity: "critical",
          action_path: "/departments",
        });
      }
    }

    // Post-repair validation: unresolved employees.
    let employeesStillMissing = 0;
    employeeMap.forEach((emp: any) => {
      const posId = employeePositionMap.get(emp.id);
      if (!posId || !positionMap.has(posId)) {
        employeesStillMissing += 1;
        addUnresolved({
          type: "employee_without_position",
          id: emp.id,
          name: emp.name_ar || emp.name_en || emp.id,
          message: "الموظف لا يزال بدون منصب صالح بعد المزامنة",
          severity: "critical",
          action_path: `/employees?id=${emp.id}`,
        });
      }
    });

    result.audit.employees.employees_repaired = result.linked_employees.length;
    result.audit.employees.employees_unresolved = employeesStillMissing;

    const finalOrphanPositions = Array.from(positionMap.values()).filter((p: any) => p.parent_position_id && !positionMap.has(p.parent_position_id)).length;
    const finalDeptNoPositions = result.department_diagnostics.filter((d) => d.inconsistent).length;
    const finalMissingManagerPositions = [
      ...Array.from(departmentMap.values()).filter((d: any) => !d.manager_position_id && !!normalize(d.manager_name)),
      ...Array.from(branchMap.values()).filter((b: any) => !b.manager_position_id && !!normalize(b.manager_name)),
    ].length;

    result.after = {
      total_active_employees: employeeMap.size,
      total_active_positions: positionMap.size,
      employees_missing_position: employeesStillMissing,
      departments_with_employees_no_positions: finalDeptNoPositions,
      missing_manager_positions: finalMissingManagerPositions,
      orphan_positions: finalOrphanPositions,
    };

    const departmentsFixed = Math.max(0, initialDeptNoPositions - finalDeptNoPositions);
    result.audit.departments.departments_fixed = departmentsFixed;
    result.audit.departments.departments_still_inconsistent = finalDeptNoPositions;

    const vacantAfter = Array.from(positionMap.values()).filter((p: any) => p.status !== "inactive" && (occupancy.get(p.id) || 0) === 0).length;
    result.audit.positions.vacant_positions = vacantAfter;

    const beforeProblems =
      (result.before.employees_missing_position || 0) +
      (result.before.departments_with_employees_no_positions || 0) +
      (result.before.missing_manager_positions || 0) +
      (result.before.orphan_positions || 0);

    const afterProblems =
      (result.after.employees_missing_position || 0) +
      (result.after.departments_with_employees_no_positions || 0) +
      (result.after.missing_manager_positions || 0) +
      (result.after.orphan_positions || 0);

    const criticalUnresolved = result.unresolved_records.filter((r) => r.severity === "critical").length;
    const warningUnresolved = result.unresolved_records.filter((r) => r.severity === "warning").length;

    const repairedCount =
      result.created_positions.length +
      result.linked_employees.length +
      result.fixed_managers.length +
      result.repaired_relations.length +
      result.audit.roles_permissions.mismatched_permissions_repaired;

    result.repaired_count = repairedCount;
    result.unresolved_count = result.unresolved_records.length;
    result.blocking_errors_count = criticalUnresolved + result.errors.length;

    const baseScore = beforeProblems === 0
      ? (afterProblems === 0 ? 100 : Math.max(0, 100 - afterProblems * 15))
      : Math.round(Math.max(0, (1 - (afterProblems / Math.max(beforeProblems, 1))) * 100));

    const deduction = Math.min(60, criticalUnresolved * 10 + warningUnresolved * 3 + result.errors.length * 12);
    const finalScore = Math.max(0, Math.min(100, baseScore - deduction));

    result.consistency_score = finalScore;
    result.company_consistency_score = finalScore;

    if (result.blocking_errors_count === 0 && result.unresolved_count === 0) {
      result.final_status = "success";
    } else if (result.repaired_count > 0) {
      result.final_status = "partial";
    } else {
      result.final_status = "failed";
    }

    result.summary = {
      total_active_employees: employeeMap.size,
      employees_with_valid_position_id: employeeMap.size - employeesStillMissing,
      positions_created: result.created_positions.length,
      broken_employee_position_links_repaired: result.linked_employees.length,
      departments_with_employees_but_zero_positions: finalDeptNoPositions,
      departments_fixed: departmentsFixed,
      repaired_count: result.repaired_count,
      unresolved_count: result.unresolved_count,
      blocking_errors_count: result.blocking_errors_count,
      company_consistency_score: result.company_consistency_score,
    };

    if (!isPreview) {
      await safeUpdate("Write sync audit log", async () => {
        const { error } = await supabase.from("audit_logs").insert({
          company_id: companyId,
          user_id: user.id,
          action: "sync_org_structure_repair",
          table_name: "positions",
          new_values: {
            final_status: result.final_status,
            repaired_count: result.repaired_count,
            unresolved_count: result.unresolved_count,
            blocking_errors_count: result.blocking_errors_count,
            company_consistency_score: result.company_consistency_score,
            summary: result.summary,
            audit: result.audit,
          },
        });
        if (error) throw error;
        return true;
      });
    }

    return new Response(JSON.stringify({ preview: isPreview, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
