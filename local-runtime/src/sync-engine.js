import { db, getState, listSyncQueue, logSync, nowIso, setState, updateQueueStatus } from "./database.js";
import { config } from "./config.js";

async function cloudFetch(pathname, options = {}) {
  if (!config.cloudSyncUrl) {
    throw new Error("Cloud sync URL is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.cloudTimeoutMs);
  try {
    const response = await fetch(`${config.cloudSyncUrl}${pathname}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(config.cloudApiKey ? { authorization: `Bearer ${config.cloudApiKey}` } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Cloud sync failed with status ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function pullFromCloud(tenantId) {
  try {
    const payload = await cloudFetch(`/api/local-runtime/pull?tenantId=${encodeURIComponent(tenantId)}`);
    setState("lastPull", {
      tenantId,
      pulledAt: nowIso(),
      modules: payload.modules || [],
      permissions: payload.permissions || [],
    });
    logSync({
      tenantId,
      syncDirection: "cloud_to_local",
      syncStatus: "success",
      eventsCount: Array.isArray(payload.records) ? payload.records.length : 0,
      details: payload,
    });
    return payload;
  } catch (error) {
    logSync({
      tenantId,
      syncDirection: "cloud_to_local",
      syncStatus: "failed",
      eventsCount: 0,
      details: { error: error.message },
    });
    throw error;
  }
}

export async function pushToCloud(tenantId) {
  const queue = listSyncQueue(tenantId);
  if (!queue.length) {
    return { pushed: 0, skipped: true };
  }

  try {
    const payload = await cloudFetch("/api/local-runtime/push", {
      method: "POST",
      body: JSON.stringify({
        tenantId,
        changes: queue.map((item) => ({
          id: item.id,
          tableName: item.table_name,
          recordId: item.record_id,
          operation: item.operation,
          payload: item.payload,
          attemptCount: item.attempt_count,
        })),
      }),
    });

    queue.forEach((item) => updateQueueStatus(item.id, "completed"));
    db.prepare("UPDATE local_records SET sync_status = 'synced' WHERE tenant_id = ?").run(tenantId);
    setState("lastPush", { tenantId, pushedAt: nowIso(), count: queue.length });
    logSync({
      tenantId,
      syncDirection: "local_to_cloud",
      syncStatus: "success",
      eventsCount: queue.length,
      details: payload,
    });
    return { pushed: queue.length, response: payload };
  } catch (error) {
    queue.forEach((item) => updateQueueStatus(item.id, "failed", error.message));
    logSync({
      tenantId,
      syncDirection: "local_to_cloud",
      syncStatus: "failed",
      eventsCount: queue.length,
      details: { error: error.message },
    });
    throw error;
  }
}

export async function runSyncCycle(tenantId) {
  const state = getState("tenant", {});
  const result = {
    tenantId,
    localMode: true,
    online: false,
    activation: state,
    queueDepth: listSyncQueue(tenantId).length,
    lastPull: getState("lastPull"),
    lastPush: getState("lastPush"),
  };

  if (!config.cloudSyncUrl) {
    return result;
  }

  try {
    await pullFromCloud(tenantId);
    await pushToCloud(tenantId);
    return {
      ...result,
      online: true,
      queueDepth: listSyncQueue(tenantId).length,
      lastPull: getState("lastPull"),
      lastPush: getState("lastPush"),
    };
  } catch (error) {
    return {
      ...result,
      online: false,
      error: error.message,
      queueDepth: listSyncQueue(tenantId).length,
    };
  }
}
