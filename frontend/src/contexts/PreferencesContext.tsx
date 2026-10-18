import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getPreferences } from "../api/preferences";
import type { Preferences } from "../api/preferences";
import { useAuth } from "./AuthContext";

type State = { userId: string; preferences: Preferences | null; loading: boolean; error: string | null };
const PreferencesContext = createContext<{
  preferences: Preferences | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  onSaved: (preferences: Preferences, userId: string) => void;
} | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const token = session?.access_token;
  const [state, setState] = useState<State>({ userId: "", preferences: null, loading: false, error: null });
  const [attempt, setAttempt] = useState(0);
  const requestVersion = useRef(0);

  useEffect(() => {
    const version = ++requestVersion.current;
    if (!userId || !token) {
      setState({ userId: "", preferences: null, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState(current => ({ userId, preferences: current.userId === userId ? current.preferences : null, loading: true, error: null }));
    void getPreferences(token, { signal: controller.signal }).then(preferences => {
      if (!controller.signal.aborted && version === requestVersion.current) setState({ userId, preferences, loading: false, error: null });
    }).catch(error => {
      if (!controller.signal.aborted && version === requestVersion.current) setState(current => ({
        userId, preferences: current.userId === userId ? current.preferences : null, loading: false,
        error: error instanceof Error ? error.message : "Unable to load preferences.",
      }));
    });
    return () => controller.abort();
  }, [userId, token, attempt]);

  function onSaved(preferences: Preferences, savedUserId: string) {
    if (savedUserId === userId) {
      // A GET started before this PUT must not overwrite the newly saved answers.
      requestVersion.current += 1;
      setState({ userId, preferences, loading: false, error: null });
    }
  }

  const belongsToUser = !!userId && state.userId === userId;
  return <PreferencesContext.Provider value={{
    preferences: belongsToUser ? state.preferences : null,
    loading: !!userId && (!belongsToUser || state.loading),
    error: belongsToUser ? state.error : null,
    retry: () => setAttempt(value => value + 1),
    onSaved,
  }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used inside PreferencesProvider");
  return context;
}
