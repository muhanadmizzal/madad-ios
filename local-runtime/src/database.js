import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { config } from "./config.js";

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.storageDir, { recursive: true });

const dbPath = path.join(config.dataDir, "madad-local.db");
export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS runtime_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS local_users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    roles_json TEXT NOT NULL,
    profile_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS local_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS local_records (
    id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    PRIMARY KEY (table_name, id)
  );

  CREATE TABLE IF NOT EXISTS storage_objects (
    id TEXT PRIMARY KEY,
    bucket TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    object_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    operation TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    sync_direction TEXT NOT NULL,
    sync_status TEXT NOT NULL,
    events_count INTEGER NOT NULL DEFAULT 0,
    details_json TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activation_cache (
    tenant_id TEXT PRIMARY KEY,
    activation_token TEXT NOT NULL,
    subscription_status TEXT NOT NULL,
    modules_json TEXT NOT NULL,
    permissions_json TEXT NOT NULL,
    last_validated_at TEXT NOT NULL,
    expires_at TEXT,
    updated_at TEXT NOT NULL
  );
`);

export function nowIso() {
  return new Date().toISOString();
}

export function getState(key, fallback = null) {
  const row = db.prepare("SELECT value FROM runtime_state WHERE key = ?").get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

export function setState(key, value) {
  const stamp = nowIso();
  db.prepare(
    `
      INSERT INTO runtime_state (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
  ).run(key, JSON.stringify(value), stamp);
}

export function seedRuntime() {
  if (!getState("tenant")) {
    const tenant = {
      id: config.defaultTenantId,
      name: config.defaultTenantName,
      modules: ["tamkeen", "tathbeet", "takzeen", "tahseel"],
      permissions: ["offline_access", "local_runtime"],
      activationRequired: true,
    };
    setState("tenant", tenant);
  }

  const countRow = db.prepare("SELECT COUNT(*) AS count FROM local_users").get();
  if (!countRow?.count) {
    const stamp = nowIso();
    const adminId = nanoid();
    db.prepare(
      `
        INSERT INTO local_users (
          id, tenant_id, email, password_hash, full_name, roles_json, profile_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      adminId,
      config.defaultTenantId,
      "admin@local.madad",
      "local-admin",
      "Local Admin",
      JSON.stringify(["tenant_admin", "admin", "hr_manager"]),
      JSON.stringify({
        user_id: adminId,
        full_name: "Local Admin",
        company_id: config.defaultTenantId,
        email: "admin@local.madad",
      }),
      stamp,
      stamp,
    );

    upsertRecord("companies", config.defaultTenantId, {
      id: config.defaultTenantId,
      name: config.defaultTenantName,
      sector: "private",
      default_currency: "IQD",
      employee_count_range: "1-10",
      working_hours_start: "08:00",
      working_hours_end: "16:00",
      overtime_multiplier: 1.5,
      grace_minutes: 10,
      created_at: stamp,
      updated_at: stamp,
    });

    upsertRecord("profiles", config.defaultTenantId, {
      id: nanoid(),
      user_id: adminId,
      company_id: config.defaultTenantId,
      full_name: "Local Admin",
      email: "admin@local.madad",
      created_at: stamp,
      updated_at: stamp,
    });

    upsertRecord("user_roles", config.defaultTenantId, {
      id: nanoid(),
      user_id: adminId,
      role: "tenant_admin",
      scope_type: "tenant",
      tenant_id: config.defaultTenantId,
      created_at: stamp,
      updated_at: stamp,
    });

    upsertRecord("madad_local_nodes", config.defaultTenantId, {
      id: nanoid(),
      company_id: config.defaultTenantId,
      node_name: "Primary Local Runtime",
      node_status: "active",
      activation_status: "pending",
      last_sync_at: null,
      last_seen_at: stamp,
      sync_health: "unknown",
      notes: "Provisioned locally",
      created_at: stamp,
      updated_at: stamp,
    });
  }
}

export function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function listRecords(tableName, tenantId) {
  const rows = db
    .prepare(
      `
        SELECT id, data_json, updated_at, deleted_at, version
        FROM local_records
        WHERE table_name = ? AND tenant_id = ? AND deleted_at IS NULL
      `,
    )
    .all(tableName, tenantId);

  return rows.map((row) => ({
    ...parseJson(row.data_json, {}),
    id: row.id,
    updated_at: parseJson(row.data_json, {}).updated_at || row.updated_at,
    _version: row.version,
  }));
}

export function getRecord(tableName, tenantId, id) {
  const row = db
    .prepare(
      `
        SELECT id, data_json, updated_at, deleted_at, version
        FROM local_records
        WHERE table_name = ? AND tenant_id = ? AND id = ?
      `,
    )
    .get(tableName, tenantId, id);

  if (!row || row.deleted_at) return null;
  return {
    ...parseJson(row.data_json, {}),
    id: row.id,
    updated_at: parseJson(row.data_json, {}).updated_at || row.updated_at,
    _version: row.version,
  };
}

export function upsertRecord(tableName, tenantId, payload, meta = {}) {
  const stamp = nowIso();
  const id = payload.id || nanoid();
  const existing = getRecord(tableName, tenantId, id);
  const next = {
    ...(existing || {}),
    ...payload,
    id,
    tenant_id: tenantId,
    updated_at: payload.updated_at || stamp,
  };

  db.prepare(
    `
      INSERT INTO local_records (
        id, table_name, tenant_id, data_json, updated_at, created_by, sync_status, version, deleted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(table_name, id) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = excluded.updated_at,
        created_by = excluded.created_by,
        sync_status = excluded.sync_status,
        version = local_records.version + 1,
        deleted_at = NULL
    `,
  ).run(
    id,
    tableName,
    tenantId,
    JSON.stringify(next),
    next.updated_at,
    meta.userId || null,
    meta.syncStatus || "pending",
    1,
  );

  return getRecord(tableName, tenantId, id);
}

export function markDeleted(tableName, tenantId, id, meta = {}) {
  const stamp = nowIso();
  db.prepare(
    `
      UPDATE local_records
      SET deleted_at = ?, updated_at = ?, sync_status = ?, version = version + 1
      WHERE table_name = ? AND tenant_id = ? AND id = ?
    `,
  ).run(stamp, stamp, meta.syncStatus || "pending", tableName, tenantId, id);
}

export function enqueueSync(entry) {
  const stamp = nowIso();
  const id = nanoid();
  db.prepare(
    `
      INSERT INTO sync_queue (
        id, tenant_id, table_name, record_id, operation, payload_json, status, attempt_count, last_error, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?, ?)
    `,
  ).run(
    id,
    entry.tenantId,
    entry.tableName || null,
    entry.recordId || null,
    entry.operation,
    JSON.stringify(entry.payload || {}),
    stamp,
    stamp,
  );
  return id;
}

export function logSync(entry) {
  db.prepare(
    `
      INSERT INTO sync_logs (id, tenant_id, sync_direction, sync_status, events_count, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    nanoid(),
    entry.tenantId,
    entry.syncDirection,
    entry.syncStatus,
    entry.eventsCount || 0,
    JSON.stringify(entry.details || {}),
    nowIso(),
  );
}

export function listSyncQueue(tenantId) {
  return db
    .prepare(
      `
        SELECT * FROM sync_queue
        WHERE tenant_id = ? AND status IN ('pending', 'failed')
        ORDER BY created_at ASC
      `,
    )
    .all(tenantId)
    .map((row) => ({ ...row, payload: parseJson(row.payload_json, {}) }));
}

export function updateQueueStatus(id, status, lastError = null) {
  db.prepare(
    `
      UPDATE sync_queue
      SET status = ?, attempt_count = attempt_count + 1, last_error = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(status, lastError, nowIso(), id);
}

seedRuntime();
