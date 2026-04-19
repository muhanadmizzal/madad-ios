import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { nanoid } from "nanoid";
import { config } from "./config.js";
import { requireAuth, signIn, signOut, signUp, getSession } from "./auth.js";
import {
  db,
  getState,
  listRecords,
  nowIso,
  parseJson,
  setState,
  upsertRecord,
} from "./database.js";
import { getProfileContext, mutateTable, queryTable } from "./query-engine.js";
import { pullFromCloud, pushToCloud, runSyncCycle } from "./sync-engine.js";

const app = express();
const upload = multer({ dest: path.join(config.storageDir, "_uploads") });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/storage", express.static(config.storageDir));

function getTenantId(req) {
  return req.auth?.tenant_id || config.defaultTenantId;
}

function getActivationState() {
  const tenant = getState("tenant", {});
  const activation = db
    .prepare("SELECT * FROM activation_cache WHERE tenant_id = ?")
    .get(config.defaultTenantId);

  return {
    tenant,
    activation: activation
      ? {
          ...activation,
          modules: parseJson(activation.modules_json, []),
          permissions: parseJson(activation.permissions_json, []),
        }
      : null,
  };
}

function handleRpc(name, req) {
  const tenantId = getTenantId(req);
  const userId = req.auth?.sub;
  const body = req.body || {};

  if (name === "recover_own_role") {
    return getProfileContext(userId, tenantId).roles;
  }

  if (name === "get_tenant_entitlements") {
    const activation = getActivationState().activation;
    return {
      modules: activation?.modules || getState("tenant", {}).modules || [],
      permissions: activation?.permissions || getState("tenant", {}).permissions || [],
    };
  }

  if (name === "get_madad_subscription_details") {
    const activation = getActivationState().activation;
    return {
      subscription_status: activation?.subscription_status || "inactive",
      modules: activation?.modules || [],
      permissions: activation?.permissions || [],
      local_runtime_enabled: true,
    };
  }

  if (name === "get_madad_dashboard_stats") {
    return {
      users: listRecords("profiles", tenantId).length,
      modules: (getState("tenant", {}).modules || []).length,
      local_runtime_enabled: true,
      sync_queue_depth: db
        .prepare("SELECT COUNT(*) AS count FROM sync_queue WHERE tenant_id = ? AND status IN ('pending', 'failed')")
        .get(tenantId).count,
    };
  }

  if (name === "get_tenant_usage_summary") {
    return {
      employees: listRecords("employees", tenantId).length,
      positions: listRecords("positions", tenantId).length,
      documents: listRecords("documents", tenantId).length,
    };
  }

  if (name === "generate_position_code") {
    const count = listRecords("positions", tenantId).length + 1;
    return `POS-${String(count).padStart(4, "0")}`;
  }

  if (name === "request_local_access") {
    const record = upsertRecord("madad_local_access_requests", tenantId, {
      id: nanoid(),
      company_id: tenantId,
      requested_by: userId,
      request_status: "pending",
      notes: body.p_notes || null,
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    return record.id;
  }

  if (name === "cancel_local_access_request") {
    const request = queryTable({
      tenantId,
      tableName: "madad_local_access_requests",
      filters: [{ column: "id", operator: "eq", value: body.p_request_id }],
      single: true,
    });
    if (!request) throw new Error("Request not found");
    return upsertRecord("madad_local_access_requests", tenantId, {
      ...request,
      request_status: "cancelled",
      updated_at: nowIso(),
    });
  }

  if (name === "set_local_node_status") {
    const node = queryTable({
      tenantId,
      tableName: "madad_local_nodes",
      filters: [{ column: "id", operator: "eq", value: body.p_node_id }],
      single: true,
    });
    if (!node) throw new Error("Node not found");
    return upsertRecord("madad_local_nodes", tenantId, {
      ...node,
      node_status: body.p_status,
      updated_at: nowIso(),
    });
  }

  if (name === "refresh_local_node_entitlements") {
    const activation = getActivationState().activation;
    return {
      modules: activation?.modules || [],
      permissions: activation?.permissions || [],
    };
  }

  if (name === "generate_api_key") {
    const token = `tmk_${nanoid(24)}`;
    upsertRecord("api_keys", tenantId, {
      id: nanoid(),
      company_id: tenantId,
      name: body.p_name || "Default",
      key_prefix: token.slice(0, 12),
      key_hash: token,
      scopes: body.p_scopes || ["v1:read"],
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    return { key: token };
  }

  if (name === "revoke_api_key") {
    const key = queryTable({
      tenantId,
      tableName: "api_keys",
      filters: [{ column: "id", operator: "eq", value: body.p_key_id }],
      single: true,
    });
    if (!key) throw new Error("API key not found");
    return upsertRecord("api_keys", tenantId, {
      ...key,
      is_active: false,
      updated_at: nowIso(),
    });
  }

  if (name === "get_my_ai_entitlements") {
    return {
      ai_enabled: false,
      reason: "AI cloud functions are disabled in local runtime by default",
    };
  }

  return {
    notImplemented: true,
    name,
    message: `RPC ${name} is not implemented in local runtime yet`,
  };
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    mode: "local-runtime",
    timestamp: nowIso(),
    activation: getActivationState(),
  });
});

app.post("/api/activation/activate", (req, res) => {
  const token = req.body?.activationToken;
  if (!token) {
    res.status(400).json({ error: { message: "activationToken is required" } });
    return;
  }

  const stamp = nowIso();
  db.prepare(
    `
      INSERT INTO activation_cache (
        tenant_id, activation_token, subscription_status, modules_json, permissions_json, last_validated_at, expires_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET
        activation_token = excluded.activation_token,
        subscription_status = excluded.subscription_status,
        modules_json = excluded.modules_json,
        permissions_json = excluded.permissions_json,
        last_validated_at = excluded.last_validated_at,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
    `,
  ).run(
    config.defaultTenantId,
    token,
    "active",
    JSON.stringify(getState("tenant", {}).modules || []),
    JSON.stringify(getState("tenant", {}).permissions || []),
    stamp,
    null,
    stamp,
  );

  res.json({
    data: {
      activated: true,
      tenantId: config.defaultTenantId,
      validatedAt: stamp,
    },
  });
});

app.get("/api/activation/status", (_req, res) => {
  res.json({ data: getActivationState() });
});

app.post("/api/auth/login", (req, res) => {
  const result = signIn(req.body?.email, req.body?.password);
  if (result.error) {
    res.status(401).json(result);
    return;
  }
  res.json(result);
});

app.post("/api/auth/signup", (req, res) => {
  const result = signUp({
    email: req.body?.email,
    password: req.body?.password,
    metadata: req.body?.metadata,
  });
  if (result.error) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

app.get("/api/auth/session", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  res.json(getSession(token));
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  res.json(signOut(req.accessToken));
});

app.post("/api/auth/reset-password", (_req, res) => {
  res.json({ data: { sent: true }, error: null });
});

app.use("/api", requireAuth);

app.get("/api/profile/bootstrap", (req, res) => {
  const { profile, roles } = getProfileContext(req.auth.sub, getTenantId(req));
  res.json({
    data: {
      profile,
      roles,
      company: queryTable({
        tenantId: getTenantId(req),
        tableName: "companies",
        filters: [{ column: "id", operator: "eq", value: getTenantId(req) }],
        single: true,
      }),
      activation: getActivationState(),
    },
  });
});

app.post("/api/db/query", (req, res) => {
  const result = queryTable({
    tenantId: getTenantId(req),
    tableName: req.body.table,
    filters: req.body.filters || [],
    or: req.body.or,
    orders: req.body.orders || [],
    limit: req.body.limit,
    single: req.body.single,
    maybeSingle: req.body.maybeSingle,
  });

  const count = Array.isArray(result) ? result.length : result ? 1 : 0;
  if (req.body.head) {
    res.json({ data: null, count, error: null });
    return;
  }

  res.json({ data: result, count, error: null });
});

app.post("/api/db/mutate", (req, res) => {
  const result = mutateTable({
    tenantId: getTenantId(req),
    tableName: req.body.table,
    action: req.body.action,
    payload: req.body.payload,
    filters: req.body.filters || [],
    userId: req.auth.sub,
  });
  res.json({ data: result, error: null });
});

app.post("/api/rpc/:name", (req, res) => {
  try {
    const data = handleRpc(req.params.name, req);
    res.json({ data, error: null });
  } catch (error) {
    res.status(400).json({ data: null, error: { message: error.message } });
  }
});

app.post("/api/functions/:name", (req, res) => {
  res.json({
    data: {
      local_runtime: true,
      function: req.params.name,
      payload: req.body || {},
      message: `Function ${req.params.name} is delegated to local runtime`,
    },
    error: null,
  });
});

app.post("/api/storage/:bucket/upload", upload.single("file"), (req, res) => {
  const bucket = req.params.bucket;
  const objectPath = req.body.objectPath || req.file?.originalname || `${nanoid()}.bin`;
  const bucketDir = path.join(config.storageDir, bucket);
  const destination = path.join(bucketDir, objectPath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(req.file.path, destination);
  fs.unlinkSync(req.file.path);
  res.json({
    data: {
      path: objectPath,
      fullPath: destination,
      publicUrl: `/storage/${bucket}/${tenantId}/${objectPath}`,
    },
    error: null,
  });
});

app.get("/api/storage/:bucket/signed-url", (req, res) => {
  const bucket = req.params.bucket;
  const objectPath = req.query.path;
  res.json({
    data: {
      signedUrl: `${req.protocol}://${req.get("host")}/storage/${bucket}/${objectPath}`,
    },
    error: null,
  });
});

app.post("/api/storage/:bucket/remove", (req, res) => {
  const bucket = req.params.bucket;
  const paths = req.body.paths || [];
  for (const objectPath of paths) {
    const target = path.join(config.storageDir, bucket, objectPath);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  }
  res.json({ data: { removed: paths }, error: null });
});

app.get("/api/sync/status", async (req, res) => {
  const data = await runSyncCycle(getTenantId(req));
  res.json({ data, error: null });
});

app.post("/api/sync/pull", async (req, res) => {
  try {
    const data = await pullFromCloud(getTenantId(req));
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

app.post("/api/sync/push", async (req, res) => {
  try {
    const data = await pushToCloud(getTenantId(req));
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

app.listen(config.port, config.host, () => {
  setState("server", {
    startedAt: nowIso(),
    host: config.host,
    port: config.port,
  });
  console.log(`MADAD local runtime listening on http://${config.host}:${config.port}`);
});
