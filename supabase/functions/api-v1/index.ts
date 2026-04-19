import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type AuthSuccess = {
  companyId: string;
  keyId: string;
  keyPrefix: string;
};

type EmployeeApiRecord = {
  id: string;
  full_name: string;
  employment_status: "active" | "inactive";
  booking_available: boolean;
};

type EmployeesV1Result = {
  data?: EmployeeApiRecord | EmployeeApiRecord[];
  error?: string;
  status: number;
  matchedCount?: number;
  availableCount?: number;
};

function debugLog(
  level: "log" | "warn" | "error",
  event: string,
  context: Record<string, unknown> = {}
) {
  const suffix = Object.keys(context).length ? ` ${JSON.stringify(context)}` : "";
  const message = `[api-v1] ${event}${suffix}`;

  if (level === "warn") {
    console.warn(message);
    return;
  }

  if (level === "error") {
    console.error(message);
    return;
  }

  console.log(message);
}

function maskKey(key: string | null) {
  if (!key) return "missing";
  return key.length <= 12 ? key : `${key.slice(0, 12)}...`;
}

/** Authenticate via X-API-Key header, return company_id */
async function authenticate(
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<AuthSuccess | Response> {
  const apiKey = req.headers.get("x-api-key");
  const pathname = new URL(req.url).pathname;

  if (!apiKey) {
    debugLog("warn", "auth_failed_missing_header", {
      pathname,
      expectedHeader: "X-API-Key",
    });
    return json({ error: "Missing X-API-Key header" }, 401);
  }

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data: keyRow, error } = await supabase
    .from("api_keys")
    .select("id, company_id, scopes, is_active, expires_at, key_prefix")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !keyRow) {
    debugLog("warn", "auth_failed_invalid_key", {
      pathname,
      providedKeyPrefix: maskKey(apiKey),
    });
    return json({ error: "Invalid API key" }, 401);
  }

  if (!keyRow.is_active) {
    debugLog("warn", "auth_failed_inactive_key", {
      pathname,
      companyId: keyRow.company_id,
      keyPrefix: keyRow.key_prefix,
    });
    return json({ error: "Inactive key" }, 401);
  }

  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    debugLog("warn", "auth_failed_expired_key", {
      pathname,
      companyId: keyRow.company_id,
      keyPrefix: keyRow.key_prefix,
      expiresAt: keyRow.expires_at,
    });
    return json({ error: "Expired API key" }, 401);
  }

  const { data: settings, error: settingsError } = await supabase
    .from("api_settings")
    .select("api_enabled")
    .eq("company_id", keyRow.company_id)
    .maybeSingle();

  if (settingsError) {
    debugLog("error", "auth_settings_lookup_failed", {
      pathname,
      companyId: keyRow.company_id,
      error: settingsError.message,
    });
    return json({ error: "Failed to validate tenant API access" }, 500);
  }

  if (!settings?.api_enabled) {
    debugLog("warn", "auth_failed_api_disabled", {
      pathname,
      companyId: keyRow.company_id,
      keyPrefix: keyRow.key_prefix,
    });
    return json({ error: "API access is disabled for this tenant" }, 403);
  }

  const { error: updateError } = await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id);

  if (updateError) {
    debugLog("warn", "api_key_last_used_update_failed", {
      pathname,
      keyId: keyRow.id,
      error: updateError.message,
    });
  }

  debugLog("log", "auth_passed", {
    pathname,
    companyId: keyRow.company_id,
    keyId: keyRow.id,
    keyPrefix: keyRow.key_prefix,
  });

  return { companyId: keyRow.company_id, keyId: keyRow.id, keyPrefix: keyRow.key_prefix };
}

/** Log API access */
async function logAccess(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  keyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  req: Request
) {
  await supabase.from("api_access_logs").insert({
    company_id: companyId,
    api_key_id: keyId,
    endpoint,
    method,
    status_code: statusCode,
    ip_address: req.headers.get("x-forwarded-for") || "unknown",
    user_agent: req.headers.get("user-agent") || null,
  });
}

/** Compute booking_available based on status + active leaves */
async function getEmployeesV1(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  employeeId?: string
): Promise<EmployeesV1Result> {
  let query = supabase
    .from("employees")
    .select("id, company_id, name_ar, name_en, status")
    .eq("company_id", companyId);

  if (employeeId) query = query.eq("id", employeeId);

  const { data: employees, error } = await query;

  if (error) {
    debugLog("error", "employees_query_failed", {
      companyId,
      employeeId: employeeId ?? null,
      error: error.message,
    });
    return { error: "Failed to retrieve employee data", status: 500 };
  }

  const matchedCount = employees?.length ?? 0;

  if (!matchedCount) {
    if (employeeId) {
      const { data: employeeOutsideTenant } = await supabase
        .from("employees")
        .select("id, company_id")
        .eq("id", employeeId)
        .maybeSingle();

      if (employeeOutsideTenant && employeeOutsideTenant.company_id !== companyId) {
        debugLog("warn", "tenant_mismatch", {
          requestedEmployeeId: employeeId,
          requestedCompanyId: companyId,
          resolvedCompanyId: employeeOutsideTenant.company_id,
        });
        return { error: "Tenant mismatch", status: 403, matchedCount: 0, availableCount: 0 };
      }
    }

    debugLog("warn", "no_employees_found", {
      companyId,
      employeeId: employeeId ?? null,
      matchedBeforeFilteringCount: 0,
      remainingAfterFilteringCount: 0,
    });

    return {
      error: "No employees found for tenant",
      status: 404,
      matchedCount: 0,
      availableCount: 0,
    };
  }

  const today = new Date().toISOString().split("T")[0];
  const empIds = employees.map((e: any) => e.id);
  const { data: activeLeaves, error: leaveError } = await supabase
    .from("leave_requests")
    .select("employee_id")
    .eq("company_id", companyId)
    .in("employee_id", empIds)
    .eq("status", "approved")
    .lte("start_date", today)
    .gte("end_date", today);

  if (leaveError) {
    debugLog("error", "leave_lookup_failed", {
      companyId,
      employeeId: employeeId ?? null,
      error: leaveError.message,
      matchedBeforeFilteringCount: matchedCount,
    });
    return {
      error: "Failed to retrieve leave availability",
      status: 500,
      matchedCount,
      availableCount: 0,
    };
  }

  const onLeaveSet = new Set((activeLeaves || []).map((l: any) => l.employee_id));

  const result: EmployeeApiRecord[] = employees.map((emp: any) => {
    const isActive = emp.status === "active";
    const isOnLeave = onLeaveSet.has(emp.id);
    return {
      id: emp.id,
      full_name: emp.name_ar || emp.name_en || "",
      employment_status: isActive ? "active" : "inactive",
      booking_available: isActive && !isOnLeave,
    };
  });

  const availableCount = result.filter((emp) => emp.booking_available).length;

  debugLog("log", "employees_query_summary", {
    companyId,
    employeeId: employeeId ?? null,
    matchedBeforeFilteringCount: matchedCount,
    remainingAfterFilteringCount: availableCount,
    returnedCount: result.length,
  });

  return employeeId
    ? { data: result[0], status: 200, matchedCount, availableCount }
    : { data: result, status: 200, matchedCount, availableCount };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/api-v1\/?/, "").split("/").filter(Boolean);
  const endpoint = `/${pathParts.join("/")}`;

  // Public health check (no auth required)
  if (pathParts[0] === "health" || pathParts.length === 0) {
    return json({ status: "ok", version: "v1", timestamp: new Date().toISOString() });
  }

  // Authenticate
  const auth = await authenticate(req, supabase);
  if (auth instanceof Response) return auth;
  const { companyId, keyId } = auth;

  let response: Response;

  try {
    // Route: GET /employees
    if (pathParts[0] === "employees" && !pathParts[1]) {
      const result = await getEmployeesV1(supabase, companyId);
      response = result.error
        ? json({ error: result.error }, result.status)
        : json({ data: result.data, version: "v1" });
    }
    // Route: GET /employees/status
    else if (pathParts[0] === "employees" && pathParts[1] === "status") {
      const result = await getEmployeesV1(supabase, companyId);
      if (result.error) {
        response = json({ error: result.error }, result.status);
      } else {
        const employees = result.data as any[];
        response = json({
          data: {
            total: employees.length,
            active: employees.filter((e: any) => e.employment_status === "active").length,
            inactive: employees.filter((e: any) => e.employment_status !== "active").length,
            available_for_booking: employees.filter((e: any) => e.booking_available).length,
          },
          version: "v1",
        });
      }
    }
    // Route: GET /employees/availability
    else if (pathParts[0] === "employees" && pathParts[1] === "availability") {
      const result = await getEmployeesV1(supabase, companyId);
      if (result.error) {
        response = json({ error: result.error }, result.status);
      } else {
        const employees = result.data as any[];
        response = json({
          data: employees.map((e: any) => ({
            id: e.id,
            full_name: e.full_name,
            booking_available: e.booking_available,
          })),
          version: "v1",
        });
      }
    }
    // Route: GET /employees/:id
    else if (pathParts[0] === "employees" && pathParts[1]) {
      const result = await getEmployeesV1(supabase, companyId, pathParts[1]);
      response = result.error
        ? json({ error: result.error }, result.status)
        : json({ data: result.data, version: "v1" });
    }
    // Not found
    else {
      response = json({ error: "Endpoint not found", available: ["/employees", "/employees/:id", "/employees/status", "/employees/availability"] }, 404);
    }
  } catch (err) {
    debugLog("error", "unhandled_error", {
      endpoint,
      error: err instanceof Error ? err.message : String(err),
    });
    response = json({ error: "Internal server error" }, 500);
  }

  // Log access
  await logAccess(supabase, companyId, keyId, endpoint, req.method, response.status, req);

  return response;
});
