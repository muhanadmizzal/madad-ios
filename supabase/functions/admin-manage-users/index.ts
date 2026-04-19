import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Authenticate caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing auth" }, 401);

  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !caller) return json({ error: "Unauthorized" }, 401);

  // Verify caller is super_admin
  const { data: callerRoles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id);

  const isSuperAdmin = callerRoles?.some((r: any) => r.role === "super_admin");
  if (!isSuperAdmin) return json({ error: "Forbidden: super_admin required" }, 403);

  const { action, ...payload } = await req.json();

  // ── LIST PLATFORM USERS ──
  if (action === "list") {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) return json({ error: error.message }, 500);

    const userIds = users.users.map((u: any) => u.id);
    const { data: allRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, scope_type, tenant_id")
      .in("user_id", userIds);

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, company_id")
      .in("user_id", userIds);

    const result = users.users.map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
      banned: u.banned_until ? true : false,
      full_name: profiles?.find((p: any) => p.user_id === u.id)?.full_name || null,
      company_id: profiles?.find((p: any) => p.user_id === u.id)?.company_id || null,
      roles: allRoles?.filter((r: any) => r.user_id === u.id) || [],
    }));

    return json({ users: result });
  }

  // ── CREATE USER ──
  if (action === "create") {
    const { email, password, full_name, roles: requestedRoles, tenant_id } = payload;

    if (!email || !password) return json({ error: "email and password required" }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

    let userId: string;

    // Try to create user; if email exists, reuse existing user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existing = listData?.users?.find((u: any) => u.email === email);
        if (!existing) return json({ error: "User exists but could not be found" }, 400);
        userId = existing.id;
      } else {
        return json({ error: createErr.message }, 400);
      }
    } else {
      userId = newUser.user.id;
    }

    // Create profile
    await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      full_name: full_name || email.split("@")[0],
      company_id: tenant_id || null,
    });

    // Assign roles
    if (requestedRoles && Array.isArray(requestedRoles)) {
      for (const r of requestedRoles) {
        await supabaseAdmin.from("user_roles").insert({
          user_id: userId,
          role: r.role,
          scope_type: r.scope_type || (["super_admin", "business_admin", "support_agent", "sales_manager", "technical_admin", "finance_manager"].includes(r.role) ? "platform" : "tenant"),
          tenant_id: r.tenant_id || null,
        });
      }
    }

    // Audit log
    await supabaseAdmin.from("business_audit_logs").insert({
      actor_user_id: caller.id,
      action: "create_platform_user",
      target_type: "user",
      target_id: userId,
      after_state: { email, roles: requestedRoles, full_name },
      metadata: { created_by_super_admin: true },
    });

    return json({ success: true, user_id: userId });
  }

  // ── UPDATE ROLES ──
  if (action === "update_roles") {
    const { user_id, roles: newRoles } = payload;
    if (!user_id || !newRoles) return json({ error: "user_id and roles required" }, 400);

    // Prevent removing last super_admin
    if (!newRoles.some((r: any) => r.role === "super_admin")) {
      const { data: allSuperAdmins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      const otherSuperAdmins = allSuperAdmins?.filter((r: any) => r.user_id !== user_id);
      if (!otherSuperAdmins || otherSuperAdmins.length === 0) {
        return json({ error: "Cannot remove role from last Super Admin" }, 400);
      }
    }

    // Get old roles for audit
    const { data: oldRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role, scope_type, tenant_id")
      .eq("user_id", user_id);

    // Replace roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
    for (const r of newRoles) {
      await supabaseAdmin.from("user_roles").insert({
        user_id,
        role: r.role,
        scope_type: r.scope_type || "platform",
        tenant_id: r.tenant_id || null,
      });
    }

    // Audit
    await supabaseAdmin.from("business_audit_logs").insert({
      actor_user_id: caller.id,
      action: "update_user_roles",
      target_type: "user",
      target_id: user_id,
      before_state: { roles: oldRoles },
      after_state: { roles: newRoles },
    });

    return json({ success: true });
  }

  // ── DEACTIVATE / BAN ──
  if (action === "deactivate") {
    const { user_id } = payload;
    if (!user_id) return json({ error: "user_id required" }, 400);

    // Prevent deactivating last super_admin
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id);

    if (targetRoles?.some((r: any) => r.role === "super_admin")) {
      const { data: allSuperAdmins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      const others = allSuperAdmins?.filter((r: any) => r.user_id !== user_id);
      if (!others || others.length === 0) {
        return json({ error: "Cannot deactivate last Super Admin" }, 400);
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      ban_duration: "876000h", // ~100 years
    });
    if (error) return json({ error: error.message }, 500);

    await supabaseAdmin.from("business_audit_logs").insert({
      actor_user_id: caller.id,
      action: "deactivate_user",
      target_type: "user",
      target_id: user_id,
    });

    return json({ success: true });
  }

  // ── ACTIVATE ──
  if (action === "activate") {
    const { user_id } = payload;
    if (!user_id) return json({ error: "user_id required" }, 400);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      ban_duration: "none",
    });
    if (error) return json({ error: error.message }, 500);

    await supabaseAdmin.from("business_audit_logs").insert({
      actor_user_id: caller.id,
      action: "activate_user",
      target_type: "user",
      target_id: user_id,
    });

    return json({ success: true });
  }

  // ── RESET PASSWORD ──
  if (action === "reset_password") {
    const { user_id, new_password } = payload;
    if (!user_id || !new_password) return json({ error: "user_id and new_password required" }, 400);
    if (new_password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password,
    });
    if (error) return json({ error: error.message }, 500);

    await supabaseAdmin.from("business_audit_logs").insert({
      actor_user_id: caller.id,
      action: "reset_user_password",
      target_type: "user",
      target_id: user_id,
    });

    return json({ success: true });
  }

  return json({ error: "Unknown action" }, 400);
});
