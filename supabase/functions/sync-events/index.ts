// POST /sync-events - Offline-first batched event sync endpoint
// Idempotent, API-key authenticated, node-scoped, resilient per-event processing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_EVENTS = 500;

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SyncEvent {
  event_id: string;
  type: string;
  entity: string;
  entity_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
  sequence: number;
}

function validateEvent(e: any): { ok: true; event: SyncEvent } | { ok: false; error: string } {
  if (!e || typeof e !== "object") return { ok: false, error: "event not an object" };
  if (typeof e.event_id !== "string" || !UUID_RE.test(e.event_id))
    return { ok: false, error: "event_id must be UUID" };
  if (typeof e.type !== "string" || !e.type) return { ok: false, error: "type required" };
  if (typeof e.entity !== "string" || !e.entity) return { ok: false, error: "entity required" };
  if (typeof e.entity_id !== "string") return { ok: false, error: "entity_id required" };
  if (typeof e.payload !== "object" || e.payload === null || Array.isArray(e.payload))
    return { ok: false, error: "payload must be object" };
  if (typeof e.timestamp !== "string" || isNaN(Date.parse(e.timestamp)))
    return { ok: false, error: "timestamp must be ISO datetime" };
  if (typeof e.sequence !== "number" || !Number.isFinite(e.sequence))
    return { ok: false, error: "sequence must be number" };
  return { ok: true, event: e as SyncEvent };
}

// Whitelisted entities → table names + module slug they belong to (for entitlement check).
const ENTITY_TABLE: Record<string, { table: string; module: string; feature?: string }> = {
  invoice: { table: "tahseel_invoices", module: "tahseel" },
  customer: { table: "tathbeet_customers", module: "tathbeet" },
  payment: { table: "tahseel_payments", module: "tahseel" },
  expense: { table: "tahseel_expenses", module: "tahseel" },
};

async function applyEvent(
  tenantId: string,
  ev: SyncEvent,
): Promise<{ ok: boolean; error?: string }> {
  const meta = ENTITY_TABLE[ev.entity];
  if (!meta) return { ok: false, error: `unknown entity: ${ev.entity}` };
  const table = meta.table;

  // Strip any client-supplied tenant override.
  const data = { ...ev.payload, company_id: tenantId };

  const op = ev.type.split("_")[0]?.toUpperCase();
  try {
    if (op === "CREATE") {
      const { error } = await supabase.from(table).insert({ ...data, id: ev.entity_id });
      if (error) return { ok: false, error: error.message };
    } else if (op === "UPDATE") {
      const { error } = await supabase
        .from(table)
        .update(data)
        .eq("id", ev.entity_id)
        .eq("company_id", tenantId);
      if (error) return { ok: false, error: error.message };
    } else if (op === "DELETE") {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", ev.entity_id)
        .eq("company_id", tenantId);
      if (error) return { ok: false, error: error.message };
    } else {
      return { ok: false, error: `unsupported op: ${ev.type}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  let tenantId: string | null = null;
  let apiKeyId: string | null = null;
  let localNodeId: string | null = null;
  let processed = 0,
    skipped = 0,
    failed = 0,
    blocked = 0,
    total = 0;
  let statusCode = 200;
  let errorSummary: string | null = null;

  const logAttempt = async () => {
    await supabase.from("sync_attempts").insert({
      tenant_id: tenantId,
      api_key_id: apiKeyId,
      total_events: total,
      processed,
      skipped,
      failed,
      status_code: statusCode,
      ip_address: ip,
      error_summary: errorSummary,
    });
  };

  const logNodeSync = async (status: string, error?: string | null) => {
    if (!localNodeId || !tenantId) return;
    await supabase.from("madad_local_sync_logs").insert({
      local_node_id: localNodeId,
      company_id: tenantId,
      sync_direction: "local_to_cloud",
      sync_status: status,
      events_count: total,
      error_message: error ?? null,
      metadata: { processed, skipped, failed, blocked },
    });
    // Update node health
    const health =
      status === "success" ? "healthy" :
      status === "partial" ? "degraded" :
      status === "skipped" ? "stale" : "error";
    await supabase
      .from("madad_local_nodes")
      .update({
        last_sync_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        sync_health: health,
        activation_status: "activated",
      })
      .eq("id", localNodeId);
  };

  try {
    // --- Auth ---
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      statusCode = 401;
      errorSummary = "missing bearer";
      await logAttempt();
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = auth.slice(7).trim();
    const keyHash = await sha256(apiKey);

    // --- Body ---
    let body: any;
    try {
      body = await req.json();
    } catch {
      statusCode = 400;
      errorSummary = "invalid json";
      await logAttempt();
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body || typeof body.tenant_id !== "string" || !Array.isArray(body.events)) {
      statusCode = 400;
      errorSummary = "schema";
      await logAttempt();
      return new Response(
        JSON.stringify({ error: "tenant_id and events[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    tenantId = body.tenant_id;

    if (body.events.length === 0 || body.events.length > MAX_EVENTS) {
      statusCode = 400;
      errorSummary = "batch size";
      await logAttempt();
      return new Response(
        JSON.stringify({ error: `events must be 1..${MAX_EVENTS}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    total = body.events.length;

    // --- Validate API key bound to tenant ---
    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("id, company_id, is_active, expires_at, local_node_id")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (
      !keyRow ||
      !keyRow.is_active ||
      keyRow.company_id !== tenantId ||
      (keyRow.expires_at && new Date(keyRow.expires_at) < new Date())
    ) {
      statusCode = 403;
      errorSummary = "invalid key";
      await logAttempt();
      return new Response(
        JSON.stringify({ error: "Invalid API key for tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    apiKeyId = keyRow.id;
    localNodeId = keyRow.local_node_id ?? null;

    // --- If key is bound to a local node, validate node + load entitlements ---
    let allowedModules: Set<string> | null = null;
    let allowedFeatures: Set<string> | null = null;

    if (localNodeId) {
      const { data: node } = await supabase
        .from("madad_local_nodes")
        .select("id, node_status, company_id")
        .eq("id", localNodeId)
        .maybeSingle();
      if (!node || node.company_id !== tenantId || node.node_status === "suspended" || node.node_status === "revoked") {
        statusCode = 403;
        errorSummary = `node ${node?.node_status ?? "missing"}`;
        await logAttempt();
        await logNodeSync("failed", errorSummary);
        return new Response(
          JSON.stringify({ error: `Local node ${node?.node_status ?? "not found"}` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: mods } = await supabase
        .from("madad_local_node_modules")
        .select("module_slug")
        .eq("local_node_id", localNodeId)
        .eq("status", "active");
      allowedModules = new Set((mods || []).map((m: any) => m.module_slug));
      const { data: feats } = await supabase
        .from("madad_local_node_features")
        .select("feature_key")
        .eq("local_node_id", localNodeId)
        .eq("status", "active");
      allowedFeatures = new Set((feats || []).map((f: any) => f.feature_key));
    }

    // Touch last_used_at (best effort)
    supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id)
      .then(() => {});

    // --- Process events ---
    for (const raw of body.events) {
      const v = validateEvent(raw);
      if (!v.ok) {
        failed++;
        continue;
      }
      const ev = v.event;

      // Entitlement check (only if node-bound)
      if (allowedModules) {
        const meta = ENTITY_TABLE[ev.entity];
        if (meta && !allowedModules.has(meta.module)) {
          // Module not enabled for this node — block
          await supabase.from("events_log").insert({
            event_id: ev.event_id,
            tenant_id: tenantId,
            type: ev.type,
            entity: ev.entity,
            entity_id: ev.entity_id,
            sequence: ev.sequence,
            event_timestamp: ev.timestamp,
            status: "failed",
            error_message: `module '${meta.module}' not enabled on node`,
            payload: ev.payload,
          });
          blocked++;
          failed++;
          continue;
        }
        if (meta?.feature && allowedFeatures && !allowedFeatures.has(meta.feature)) {
          await supabase.from("events_log").insert({
            event_id: ev.event_id,
            tenant_id: tenantId,
            type: ev.type,
            entity: ev.entity,
            entity_id: ev.entity_id,
            sequence: ev.sequence,
            event_timestamp: ev.timestamp,
            status: "failed",
            error_message: `feature '${meta.feature}' not enabled on node`,
            payload: ev.payload,
          });
          blocked++;
          failed++;
          continue;
        }
      }

      // Idempotency check
      const { data: existing } = await supabase
        .from("events_log")
        .select("event_id")
        .eq("event_id", ev.event_id)
        .maybeSingle();
      if (existing) {
        skipped++;
        continue;
      }

      const result = await applyEvent(tenantId!, ev);

      const { error: logErr } = await supabase.from("events_log").insert({
        event_id: ev.event_id,
        tenant_id: tenantId,
        type: ev.type,
        entity: ev.entity,
        entity_id: ev.entity_id,
        sequence: ev.sequence,
        event_timestamp: ev.timestamp,
        status: result.ok ? "processed" : "failed",
        error_message: result.error ?? null,
        payload: ev.payload,
      });

      if (logErr) {
        if (logErr.code === "23505") {
          skipped++;
        } else {
          failed++;
        }
        continue;
      }

      if (result.ok) processed++;
      else failed++;
    }

    await logAttempt();

    // Determine overall sync status
    const overallStatus =
      failed === 0 ? "success" :
      processed > 0 ? "partial" : "failed";
    await logNodeSync(overallStatus, blocked > 0 ? `${blocked} events blocked by entitlements` : null);

    return new Response(
      JSON.stringify({ status: "success", processed, skipped, failed, blocked }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    statusCode = 500;
    errorSummary = (e as Error).message?.slice(0, 500) ?? "unknown";
    try {
      await logAttempt();
      await logNodeSync("failed", errorSummary);
    } catch (_) {}
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
