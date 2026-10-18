import { useEffect, useState } from "react";
import { getTags } from "../api/tags";
import type { ApiTag } from "../api/types";

export default function useTags(enabled = true) {
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void getTags({ signal: controller.signal }).then(result => {
      if (!Array.isArray(result) || result.some(tag => !Number.isInteger(tag.id) || tag.id <= 0 || typeof tag.name !== "string")) {
        throw new Error("The tags API returned an unexpected response.");
      }
      if (!controller.signal.aborted) {
        setTags([...new Map(result.map(tag => [tag.id, tag])).values()].sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      }
    }).catch(reason => {
      if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Unable to load interests."); setLoading(false); }
    });
    return () => controller.abort();
  }, [enabled, attempt]);
  return { tags, loading, error, retry: () => setAttempt(value => value + 1) };
}
