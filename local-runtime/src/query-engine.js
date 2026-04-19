import { nanoid } from "nanoid";
import {
  listRecords,
  getRecord,
  upsertRecord,
  markDeleted,
  enqueueSync,
  nowIso,
} from "./database.js";

function extractPath(record, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), record);
}

function compareValues(left, operator, right) {
  if (operator === "eq") return left === right;
  if (operator === "neq") return left !== right;
  if (operator === "gte") return left >= right;
  if (operator === "lte") return left <= right;
  if (operator === "in") return Array.isArray(right) && right.includes(left);
  if (operator === "is") {
    if (right === "null") return left == null;
    return left === right;
  }
  return true;
}

function applyFilters(rows, filters = []) {
  return rows.filter((row) =>
    filters.every((filter) => compareValues(extractPath(row, filter.column), filter.operator, filter.value)),
  );
}

function applyOr(rows, expression) {
  if (!expression) return rows;
  const conditions = expression
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [column, operator, value] = part.split(".");
      return { column, operator, value };
    });

  return rows.filter((row) =>
    conditions.some((condition) =>
      compareValues(extractPath(row, condition.column), condition.operator, condition.value),
    ),
  );
}

function applyOrder(rows, orders = []) {
  if (!orders.length) return rows;
  return [...rows].sort((a, b) => {
    for (const order of orders) {
      const left = extractPath(a, order.column);
      const right = extractPath(b, order.column);
      if (left === right) continue;
      if (left == null) return 1;
      if (right == null) return -1;
      const cmp = left > right ? 1 : -1;
      return order.ascending === false ? -cmp : cmp;
    }
    return 0;
  });
}

function applyLimit(rows, limit) {
  if (!Number.isFinite(limit) || limit <= 0) return rows;
  return rows.slice(0, limit);
}

export function queryTable({ tenantId, tableName, filters, or, orders, limit, single, maybeSingle }) {
  let rows = listRecords(tableName, tenantId);
  rows = applyFilters(rows, filters);
  rows = applyOr(rows, or);
  rows = applyOrder(rows, orders);
  rows = applyLimit(rows, limit);

  if (single || maybeSingle) {
    return rows[0] || null;
  }

  return rows;
}

export function mutateTable({ tenantId, tableName, action, payload, filters, userId }) {
  if (action === "insert") {
    const items = Array.isArray(payload) ? payload : [payload];
    const rows = items.map((item) =>
      upsertRecord(tableName, tenantId, {
        ...item,
        id: item.id || nanoid(),
        created_at: item.created_at || nowIso(),
        updated_at: item.updated_at || nowIso(),
      }, { userId }),
    );

    rows.forEach((row) =>
      enqueueSync({
        tenantId,
        tableName,
        recordId: row.id,
        operation: "upsert",
        payload: row,
      }),
    );

    return rows;
  }

  const targets = queryTable({ tenantId, tableName, filters });

  if (action === "update") {
    const rows = targets.map((record) =>
      upsertRecord(
        tableName,
        tenantId,
        {
          ...record,
          ...payload,
          id: record.id,
          updated_at: nowIso(),
        },
        { userId },
      ),
    );

    rows.forEach((row) =>
      enqueueSync({
        tenantId,
        tableName,
        recordId: row.id,
        operation: "upsert",
        payload: row,
      }),
    );

    return rows;
  }

  if (action === "delete") {
    targets.forEach((record) => {
      markDeleted(tableName, tenantId, record.id);
      enqueueSync({
        tenantId,
        tableName,
        recordId: record.id,
        operation: "delete",
        payload: { id: record.id },
      });
    });
    return targets;
  }

  return [];
}

export function getProfileContext(userId, tenantId) {
  const profile = queryTable({
    tenantId,
    tableName: "profiles",
    filters: [{ column: "user_id", operator: "eq", value: userId }],
    single: true,
  });
  const roles = queryTable({
    tenantId,
    tableName: "user_roles",
    filters: [{ column: "user_id", operator: "eq", value: userId }],
  });
  return { profile, roles };
}
