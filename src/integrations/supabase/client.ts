import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { createLocalSupabaseClient } from "./localClient";
import { isLocalRuntimeEnabled } from "@/lib/runtimeConfig";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const cloudClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

const localClient = createLocalSupabaseClient();

function getActiveClient() {
  return isLocalRuntimeEnabled() ? localClient : cloudClient;
}

export const supabase: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getActiveClient() as any;
      const value = client[prop];
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  },
);
