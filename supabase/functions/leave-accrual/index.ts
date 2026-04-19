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

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Get all accrual configs
    const { data: configs } = await supabase
      .from('leave_accrual_config')
      .select('*, leave_types(name, days_allowed)')
      .eq('is_active', true);

    let totalCredits = 0;

    for (const config of configs || []) {
      if (config.accrual_method !== 'monthly') continue;

      // Get all active employees for this company
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', config.company_id)
        .eq('status', 'active');

      for (const emp of employees || []) {
        // Check if balance exists for this year
        const { data: balance } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('employee_id', emp.id)
          .eq('leave_type_id', config.leave_type_id)
          .eq('year', currentYear)
          .single();

        if (balance) {
          // Add monthly accrual
          const newEntitled = (balance.entitled_days || 0) + config.monthly_amount;
          await supabase
            .from('leave_balances')
            .update({ entitled_days: newEntitled })
            .eq('id', balance.id);
        } else {
          // Create new balance
          await supabase.from('leave_balances').insert({
            company_id: config.company_id,
            employee_id: emp.id,
            leave_type_id: config.leave_type_id,
            year: currentYear,
            entitled_days: config.monthly_amount,
            used_days: 0,
            carried_days: 0,
          });
        }
        totalCredits++;
      }
    }

    // Handle yearly accruals at the start of the year (month = 1)
    if (currentMonth === 1) {
      const yearlyConfigs = (configs || []).filter((c: any) => c.accrual_method === 'yearly');
      for (const config of yearlyConfigs) {
        const { data: employees } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', config.company_id)
          .eq('status', 'active');

        for (const emp of employees || []) {
          // Check previous year balance for carry forward
          const { data: prevBalance } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', emp.id)
            .eq('leave_type_id', config.leave_type_id)
            .eq('year', currentYear - 1)
            .single();

          const carryForward = prevBalance
            ? Math.min(prevBalance.remaining_days || 0, config.carry_forward_max || 0)
            : 0;

          await supabase.from('leave_balances').upsert({
            company_id: config.company_id,
            employee_id: emp.id,
            leave_type_id: config.leave_type_id,
            year: currentYear,
            entitled_days: config.leave_types?.days_allowed || 0,
            used_days: 0,
            carried_days: carryForward,
          }, { onConflict: 'employee_id,leave_type_id,year' });
          totalCredits++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, credits_processed: totalCredits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
