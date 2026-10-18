import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";

type AuthState = { session: Session | null; loading: boolean; error: string | null };
const AuthContext = createContext<(AuthState & {
  signOut: () => Promise<void>;
  retry: () => void;
}) | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let revision = 0;
    let unsubscribe: (() => void) | undefined;
    try {
      const client = createClient();
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        revision += 1;
        if (active) setState({ session, loading: false, error: null });
      });
      unsubscribe = () => data.subscription.unsubscribe();
      const initialRevision = revision;
      void client.auth.getSession().then(({ data, error }) => {
        if (active && revision === initialRevision) {
          setState({ session: data.session, loading: false, error: error?.message ?? null });
        }
      }).catch(() => {
        if (active && revision === initialRevision) setState({ session: null, loading: false, error: "Unable to check your login. Please retry." });
      });
    } catch (error) {
      setState({ session: null, loading: false, error: error instanceof Error ? error.message : "Unable to check your login." });
    }
    return () => { active = false; unsubscribe?.(); };
  }, [attempt]);

  async function signOut() {
    const { error } = await createClient().auth.signOut();
    if (error) throw error;
    setState({ session: null, loading: false, error: null });
  }

  return <AuthContext.Provider value={{ ...state, signOut, retry: () => setAttempt(value => value + 1) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
