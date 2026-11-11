import { useEffect, useRef, useState } from "react";
import { getProfile, saveProfile } from "../api/profile";
import type { ProfileUpdate, UserProfile } from "../api/profile";
import { userAccessToken } from "../lib/supabase/session";

export default function useProfile(userId: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const saveRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void userAccessToken(userId).then(token => getProfile(token, { signal: controller.signal }))
      .then(result => { if (!controller.signal.aborted) setProfile(result); })
      .catch(() => { if (!controller.signal.aborted) setError("Unable to load profile. Please retry."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId, attempt]);

  useEffect(() => () => saveRequest.current?.abort(), [userId]);

  async function save(values: ProfileUpdate) {
    if (saveRequest.current) return null;
    const controller = new AbortController();
    saveRequest.current = controller;
    setSaving(true);
    try {
      const token = await userAccessToken(userId);
      const result = await saveProfile(values, token, { signal: controller.signal });
      if (controller.signal.aborted) return null;
      setProfile(result);
      return result;
    } finally {
      saveRequest.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  function retry() {
    setLoading(true);
    setError(null);
    setAttempt(value => value + 1);
  }

  return { profile, loading, error, saving, save, retry };
}
