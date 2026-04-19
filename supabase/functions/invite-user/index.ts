import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the calling user is an admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is admin and get their company
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", caller.id);
    
    const isAdmin = callerRoles?.some((r: any) => 
      r.role === "admin" || r.role === "tenant_admin" || r.role === "super_admin"
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's company for cross-tenant check
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("user_id", caller.id)
      .single();
    
    const isSuperAdmin = callerRoles?.some((r: any) => r.role === "super_admin");

    const { email, role, full_name, company_id, password, employee_id } = await req.json();

    if (!email || !company_id) {
      return new Response(JSON.stringify({ error: "البريد الإلكتروني ومعرف الشركة مطلوبان" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent cross-tenant assignment (unless super_admin)
    if (!isSuperAdmin && callerProfile?.company_id !== company_id) {
      return new Response(JSON.stringify({ error: "لا يمكنك دعوة مستخدمين لشركة أخرى" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent assigning platform roles through invite
    const platformRoles = ["super_admin", "business_admin", "finance_manager", "support_agent", "sales_manager", "technical_admin"];
    const assignRole = role || "employee";
    if (platformRoles.includes(assignRole) && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "لا يمكنك تعيين أدوار المنصة" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user via admin API (auto-confirms)
    const createPayload: any = {
      email,
      email_confirm: true,
      user_metadata: { full_name: full_name || "", company_name: "" },
    };
    if (password) {
      createPayload.password = password;
    }
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser(createPayload);

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Update profile to link to the correct company (override the trigger-created one)
    const { data: autoProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (autoProfile && autoProfile.company_id !== company_id) {
      await supabaseAdmin.from("companies").delete().eq("id", autoProfile.company_id);
    }

    // Update profile to correct company
    await supabaseAdmin
      .from("profiles")
      .update({ company_id, full_name: full_name || "" })
      .eq("user_id", userId);

    // Update role with proper scope_type and tenant_id
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const isPlatformRole = platformRoles.includes(assignRole);
    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: assignRole,
      scope_type: isPlatformRole ? "platform" : "tenant",
      tenant_id: isPlatformRole ? null : company_id,
    });

    // Link to employee record if employee_id provided
    if (employee_id) {
      await supabaseAdmin
        .from("employees")
        .update({ user_id: userId })
        .eq("id", employee_id);
    }

    // Generate magic link for the user
    const { data: resetData } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    const magicLink = resetData?.properties?.action_link || null;

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: userId,
      magic_link: magicLink,
      has_password: !!password,
      message: password 
        ? `تم إنشاء الحساب بنجاح. البريد: ${email} | كلمة المرور: كما أدخلتها`
        : `تم إنشاء الحساب بنجاح. شارك رابط الدعوة مع الموظف.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
