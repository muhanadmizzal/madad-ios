import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all companies
    const { data: companies } = await supabase.from('companies').select('id, working_hours_start, working_hours_end, grace_minutes');

    let totalViolations = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const company of companies || []) {
      const graceMinutes = company.grace_minutes || 10;
      const workStart = company.working_hours_start || '08:00';
      const workEnd = company.working_hours_end || '16:00';

      // Get active employees
      const { data: employees } = await supabase
        .from('employees')
        .select('id, shift_id')
        .eq('company_id', company.id)
        .eq('status', 'active');

      // Get today's attendance
      const { data: records } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('company_id', company.id)
        .eq('date', today);

      // Get approved leaves for today
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('employee_id')
        .eq('company_id', company.id)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);

      const onLeaveIds = new Set((leaves || []).map((l: any) => l.employee_id));
      const attendedIds = new Set((records || []).map((r: any) => r.employee_id));

      // Check existing violations for today to avoid duplicates
      const { data: existingViolations } = await supabase
        .from('attendance_violations')
        .select('employee_id, violation_type')
        .eq('company_id', company.id)
        .eq('date', today);

      const existingSet = new Set((existingViolations || []).map((v: any) => `${v.employee_id}-${v.violation_type}`));

      const newViolations: any[] = [];

      for (const emp of employees || []) {
        if (onLeaveIds.has(emp.id)) continue;

        // Absent
        if (!attendedIds.has(emp.id)) {
          const key = `${emp.id}-absent`;
          if (!existingSet.has(key)) {
            newViolations.push({
              company_id: company.id,
              employee_id: emp.id,
              date: today,
              violation_type: 'absent',
              minutes_diff: 0,
            });
          }
          continue;
        }

        const record = (records || []).find((r: any) => r.employee_id === emp.id);
        if (!record) continue;

        // Late
        if (record.check_in) {
          const checkIn = new Date(record.check_in);
          const [h, m] = workStart.split(':').map(Number);
          const expected = new Date(checkIn);
          expected.setHours(h, m + graceMinutes, 0, 0);

          if (checkIn > expected) {
            const diff = Math.round((checkIn.getTime() - expected.getTime()) / 60000);
            const key = `${emp.id}-late`;
            if (!existingSet.has(key)) {
              newViolations.push({
                company_id: company.id,
                employee_id: emp.id,
                date: today,
                violation_type: 'late',
                minutes_diff: diff,
              });
            }
          }
        }

        // Early departure
        if (record.check_out) {
          const checkOut = new Date(record.check_out);
          const [h, m] = workEnd.split(':').map(Number);
          const expected = new Date(checkOut);
          expected.setHours(h, m, 0, 0);

          if (checkOut < expected) {
            const diff = Math.round((expected.getTime() - checkOut.getTime()) / 60000);
            if (diff > graceMinutes) {
              const key = `${emp.id}-early_departure`;
              if (!existingSet.has(key)) {
                newViolations.push({
                  company_id: company.id,
                  employee_id: emp.id,
                  date: today,
                  violation_type: 'early_departure',
                  minutes_diff: diff,
                });
              }
            }
          }
        }
      }

      if (newViolations.length > 0) {
        await supabase.from('attendance_violations').insert(newViolations);
        totalViolations += newViolations.length;
      }
    }

    return new Response(JSON.stringify({ success: true, violations_created: totalViolations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
