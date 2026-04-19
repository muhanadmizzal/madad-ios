import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Device authentication via header or body
    const deviceKey = req.headers.get("x-device-key");

    if (req.method === "POST") {
      const body = await req.json();
      
      // Support single punch or batch
      const punches: Array<{
        employee_code: string;
        punch_time: string;
        punch_type?: "in" | "out";
        device_id?: string;
      }> = Array.isArray(body.punches) ? body.punches : [body];

      const results = [];

      for (const punch of punches) {
        const { employee_code, punch_time, punch_type, device_id } = punch;

        if (!employee_code || !punch_time) {
          results.push({ employee_code, status: "error", message: "Missing employee_code or punch_time" });
          continue;
        }

        // Find employee by code
        const { data: employee } = await supabase
          .from("employees")
          .select("id, company_id")
          .eq("employee_code", employee_code)
          .eq("status", "active")
          .maybeSingle();

        if (!employee) {
          results.push({ employee_code, status: "error", message: "Employee not found" });
          continue;
        }

        const punchDate = new Date(punch_time);
        const dateStr = punchDate.toISOString().split("T")[0];

        // Check existing record for the day
        const { data: existing } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("employee_id", employee.id)
          .eq("date", dateStr)
          .maybeSingle();

        const resolvedType = punch_type || (!existing ? "in" : !existing.check_out ? "out" : "in");

        if (resolvedType === "in") {
          if (existing && existing.check_in) {
            results.push({ employee_code, status: "skipped", message: "Already checked in today" });
            continue;
          }
          const { error } = await supabase.from("attendance_records").insert({
            company_id: employee.company_id,
            employee_id: employee.id,
            date: dateStr,
            check_in: punchDate.toISOString(),
            notes: device_id ? `Device: ${device_id}` : "Biometric",
          });
          if (error) {
            results.push({ employee_code, status: "error", message: error.message });
          } else {
            results.push({ employee_code, status: "ok", action: "check_in" });
          }
        } else {
          if (!existing) {
            results.push({ employee_code, status: "error", message: "No check-in record found" });
            continue;
          }
          if (existing.check_out) {
            results.push({ employee_code, status: "skipped", message: "Already checked out" });
            continue;
          }
          const checkInTime = new Date(existing.check_in);
          const hoursWorked = Math.round(((punchDate.getTime() - checkInTime.getTime()) / 3600000) * 100) / 100;
          const overtime = Math.max(0, hoursWorked - 8);
          const { error } = await supabase
            .from("attendance_records")
            .update({
              check_out: punchDate.toISOString(),
              hours_worked: hoursWorked,
              overtime_hours: overtime,
              notes: existing.notes ? `${existing.notes} | Out: ${device_id || "Biometric"}` : `Out: ${device_id || "Biometric"}`,
            })
            .eq("id", existing.id);
          if (error) {
            results.push({ employee_code, status: "error", message: error.message });
          } else {
            results.push({ employee_code, status: "ok", action: "check_out", hours_worked: hoursWorked });
          }
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
