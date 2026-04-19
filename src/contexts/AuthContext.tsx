import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  LOCAL_BASE_STORAGE_KEY,
  RUNTIME_CHANGE_EVENT,
  RUNTIME_MODE_STORAGE_KEY,
  readStoredLocalBaseUrl,
  readStoredRuntimeMode,
} from "@/lib/runtimeConfig";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [runtimeKey, setRuntimeKey] = useState(
    () => `${readStoredRuntimeMode()}::${readStoredLocalBaseUrl()}`,
  );

  useEffect(() => {
    const updateRuntimeKey = () => {
      setRuntimeKey(`${readStoredRuntimeMode()}::${readStoredLocalBaseUrl()}`);
    };

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === RUNTIME_MODE_STORAGE_KEY ||
        event.key === LOCAL_BASE_STORAGE_KEY
      ) {
        updateRuntimeKey();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(RUNTIME_CHANGE_EVENT, updateRuntimeKey);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(RUNTIME_CHANGE_EVENT, updateRuntimeKey);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    const bootstrapSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        const isMissingRefreshToken =
          (error as { code?: string }).code === "refresh_token_not_found" ||
          error.message?.toLowerCase().includes("refresh token not found");

        if (isMissingRefreshToken) {
          await supabase.auth.signOut({ scope: "local" });
        }

        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    void bootstrapSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [runtimeKey]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
