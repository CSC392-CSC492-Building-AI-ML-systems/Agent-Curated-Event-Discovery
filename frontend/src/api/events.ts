import { getJson } from './client';
import type { ApiEvent, GetEventsOptions, RequestOptions } from './types';

export function getEvents({ skip, limit, signal }: GetEventsOptions = {}): Promise<ApiEvent[]> {
    const params = new URLSearchParams();
    if (skip !== undefined) {
        if (!Number.isInteger(skip) || skip < 0) throw new RangeError('skip must be a non-negative integer');
        params.set('skip', String(skip));
    }
    if (limit !== undefined) {
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError('limit must be an integer from 1 to 100');
        params.set('limit', String(limit));
    }
    const query = params.toString();
    return getJson<ApiEvent[]>(`/events${query ? `?${query}` : ''}`, { signal });
}

export function getEvent(id: number, options: RequestOptions = {}): Promise<ApiEvent> {
    return getJson<ApiEvent>(`/events/${encodeURIComponent(String(id))}`, options);
}
