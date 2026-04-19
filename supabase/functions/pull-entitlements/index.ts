// GET /pull-entitlements - Cloud → Local entitlement snapshot pull
// Local nodes call this on reconnect to refresh their allow-list and policy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return encodeHex(new Uint8Array(buf));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = auth.slice(7).trim();
    const keyHash = await sha256(apiKey);

    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("id, company_id, is_active, expires_at, local_node_id")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (
      !keyRow || !keyRow.is_active ||
      (keyRow.expires_at && new Date(keyRow.expires_at) < new Date())
    ) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!keyRow.local_node_id) {
      return new Response(
        JSON.stringify({ error: "API key is not bound to a local node" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: node } = await supabase
      .from("madad_local_nodes")
      .select("*")
      .eq("id", keyRow.local_node_id)
      .maybeSingle();

    if (!node || node.node_status === "revoked") {
      return new Response(JSON.stringify({ error: "Node revoked" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: modules }, { data: features }] = await Promise.all([
      supabase
        .from("madad_local_node_modules")
        .select("module_slug, status")
        .eq("local_node_id", keyRow.local_node_id),
      supabase
        .from("madad_local_node_features")
        .select("module_slug, feature_key, status")
        .eq("local_node_id", keyRow.local_node_id),
    ]);

    // Update last_seen_at and log
    await supabase
      .from("madad_local_nodes")
      .update({
        last_seen_at: new Date().toISOString(),
        sync_health: node.node_status === "suspended" ? "error" : "healthy",
      })
      .eq("id", keyRow.local_node_id);

    await supabase.from("madad_local_sync_logs").insert({
      local_node_id: keyRow.local_node_id,
      company_id: keyRow.company_id,
      sync_direction: "cloud_to_local",
      sync_status: "success",
      events_count: (modules?.length || 0) + (features?.length || 0),
      metadata: { kind: "entitlement_pull" },
    });

    return new Response(
      JSON.stringify({
        node: {
          id: node.id,
          name: node.node_name,
          status: node.node_status,
          activation_status: node.activation_status,
        },
        tenant_id: keyRow.company_id,
        modules: modules || [],
        features: features || [],
        snapshot_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
