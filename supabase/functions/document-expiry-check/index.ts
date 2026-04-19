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

    const today = new Date();
    const warningDays = 30; // Alert 30 days before expiry
    const warningDate = new Date(today);
    warningDate.setDate(warningDate.getDate() + warningDays);
    const warningDateStr = warningDate.toISOString().split('T')[0];

    // Get documents expiring within 30 days that haven't been notified
    const { data: expiringDocs } = await supabase
      .from('documents')
      .select('*, employees(name_ar, company_id)')
      .lte('expires_at', warningDateStr)
      .gte('expires_at', today.toISOString().split('T')[0])
      .eq('expiry_notified', false);

    let notifiedCount = 0;

    for (const doc of expiringDocs || []) {
      // Mark as notified
      await supabase
        .from('documents')
        .update({ expiry_notified: true })
        .eq('id', doc.id);

      notifiedCount++;
    }

    // Also check for already expired documents (not notified)
    const { data: expiredDocs } = await supabase
      .from('documents')
      .select('id')
      .lt('expires_at', today.toISOString().split('T')[0])
      .eq('expiry_notified', false);

    for (const doc of expiredDocs || []) {
      await supabase
        .from('documents')
        .update({ expiry_notified: true })
        .eq('id', doc.id);
      notifiedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      expiring_documents: (expiringDocs || []).length,
      expired_documents: (expiredDocs || []).length,
      notified: notifiedCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
