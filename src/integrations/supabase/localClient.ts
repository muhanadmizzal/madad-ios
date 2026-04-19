import { readStoredLocalBaseUrl } from "@/lib/runtimeConfig";

type Filter = { column: string; operator: string; value: any };
type Order = { column: string; ascending?: boolean };
type AuthListener = (event: string, session: any) => void;

const STORAGE_SESSION_KEY = "madad.local.session";
const STORAGE_AUTH_EVENT_KEY = "madad.local.auth.event";
const authListeners = new Set<AuthListener>();

function getBaseUrl() {
  return readStoredLocalBaseUrl().replace(/\/$/, "");
}

function getStoredSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setStoredSession(session: any) {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_SESSION_KEY);
  }
}

function emitAuthEvent(event: string, session: any) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      STORAGE_AUTH_EVENT_KEY,
      JSON.stringify({ event, at: Date.now(), session }),
    );
  }
  authListeners.forEach((listener) => listener(event, session));
}

function getAuthHeaders() {
  const session = getStoredSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { data: null, error: payload.error || { message: `Request failed with ${response.status}` } };
  }
  return payload;
}

class LocalQueryBuilder implements PromiseLike<any> {
  table: string;
  action: "select" | "insert" | "update" | "delete" = "select";
  payload: any = null;
  filters: Filter[] = [];
  orders: Order[] = [];
  selectColumns = "*";
  orExpression = "";
  limitValue?: number;
  singleValue = false;
  maybeSingleValue = false;
  headValue = false;
  returning = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*", options: any = {}) {
    this.selectColumns = columns;
    this.headValue = !!options.head;
    if (this.action !== "select") {
      this.returning = true;
      return this;
    }
    this.action = "select";
    return this;
  }

  insert(payload: any) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: "eq", value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, operator: "neq", value });
    return this;
  }

  in(column: string, value: any[]) {
    this.filters.push({ column, operator: "in", value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ column, operator: "gte", value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ column, operator: "lte", value });
    return this;
  }

  is(column: string, value: any) {
    this.filters.push({ column, operator: "is", value });
    return this;
  }

  order(column: string, options: any = {}) {
    this.orders.push({ column, ascending: options.ascending !== false });
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  single() {
    this.singleValue = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingleValue = true;
    return this;
  }

  or(expression: string) {
    this.orExpression = expression;
    return this;
  }

  async execute() {
    if (this.action === "select") {
      return request("/api/db/query", {
        method: "POST",
        body: JSON.stringify({
          table: this.table,
          select: this.selectColumns,
          filters: this.filters,
          or: this.orExpression,
          orders: this.orders,
          limit: this.limitValue,
          single: this.singleValue,
          maybeSingle: this.maybeSingleValue,
          head: this.headValue,
        }),
      });
    }

    const payload = await request("/api/db/mutate", {
      method: "POST",
      body: JSON.stringify({
        table: this.table,
        action: this.action,
        payload: this.payload,
        filters: this.filters,
      }),
    });

    if (!payload.error && this.returning) {
      const rows = payload.data || [];
      if (this.singleValue || this.maybeSingleValue) {
        return {
          data: Array.isArray(rows) ? rows[0] || null : rows,
          error: null,
        };
      }
    }

    return payload;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

const authApi = {
  async signInWithPassword({ email, password }: any) {
    const payload = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (payload.data?.session) {
      setStoredSession(payload.data.session);
      emitAuthEvent("SIGNED_IN", payload.data.session);
    }
    return payload;
  },
  async signUp({ email, password, options }: any) {
    const payload = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        metadata: options?.data || {},
      }),
    });
    if (payload.data?.session) {
      setStoredSession(payload.data.session);
      emitAuthEvent("SIGNED_IN", payload.data.session);
    }
    return payload;
  },
  async signOut() {
    const payload = await request("/api/auth/logout", { method: "POST" });
    setStoredSession(null);
    emitAuthEvent("SIGNED_OUT", null);
    return payload;
  },
  async getSession() {
    const session = getStoredSession();
    if (!session) {
      return { data: { session: null }, error: null };
    }
    const payload = await request("/api/auth/session", { method: "GET" });
    return payload.data ? payload : { data: { session }, error: null };
  },
  async resetPasswordForEmail(email: string) {
    return request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  onAuthStateChange(callback: AuthListener) {
    authListeners.add(callback);
    if (typeof window !== "undefined" && !(window as any).__madadLocalAuthBound) {
      window.addEventListener("storage", (event) => {
        if (event.key !== STORAGE_AUTH_EVENT_KEY || !event.newValue) return;
        try {
          const parsed = JSON.parse(event.newValue);
          authListeners.forEach((listener) => listener(parsed.event, parsed.session || null));
        } catch {
          // ignore bad payloads
        }
      });
      (window as any).__madadLocalAuthBound = true;
    }
    return {
      data: {
        subscription: {
          unsubscribe() {
            authListeners.delete(callback);
          },
        },
      },
    };
  },
};

export function createLocalSupabaseClient() {
  return {
    from(table: string) {
      return new LocalQueryBuilder(table);
    },
    rpc(name: string, args?: Record<string, any>) {
      return request(`/api/rpc/${name}`, {
        method: "POST",
        body: JSON.stringify(args || {}),
      });
    },
    auth: authApi,
    functions: {
      invoke(name: string, options: any = {}) {
        return request(`/api/functions/${name}`, {
          method: "POST",
          body: JSON.stringify(options.body || {}),
        });
      },
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(objectPath: string, file: File) {
            const form = new FormData();
            form.append("objectPath", objectPath);
            form.append("file", file);
            return request(`/api/storage/${bucket}/upload`, {
              method: "POST",
              body: form,
              headers: getAuthHeaders(),
            });
          },
          createSignedUrl(objectPath: string) {
            return request(`/api/storage/${bucket}/signed-url?path=${encodeURIComponent(objectPath)}`, {
              method: "GET",
            });
          },
          getPublicUrl(objectPath: string) {
            return {
              data: {
                publicUrl: `${getBaseUrl()}/storage/${bucket}/${objectPath}`,
              },
            };
          },
          remove(paths: string[]) {
            return request(`/api/storage/${bucket}/remove`, {
              method: "POST",
              body: JSON.stringify({ paths }),
            });
          },
        };
      },
    },
    channel(name: string) {
      return {
        name,
        on() {
          return this;
        },
        subscribe() {
          return this;
        },
      };
    },
    removeChannel() {
      return true;
    },
  };
}
