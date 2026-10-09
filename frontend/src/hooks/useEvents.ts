import { useEffect, useState } from 'react';
import { loadEventCatalog } from '../api/catalog';
import type { EventideEvent } from '../interfaces/interfaces';

export default function useEvents() {
    const [events, setEvents] = useState<EventideEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        void loadEventCatalog({ signal: controller.signal }).then(result => {
            if (!controller.signal.aborted) { setEvents(result); setLoading(false); }
        }).catch((reason: unknown) => {
            if (!controller.signal.aborted) {
                setError(reason instanceof Error ? reason.message : 'Unable to load events');
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [attempt]);
    const retry = () => { setLoading(true); setError(null); setAttempt(current => current + 1); };
    return { events, loading, error, retry };
}
