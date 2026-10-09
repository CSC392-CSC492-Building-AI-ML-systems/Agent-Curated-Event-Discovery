import { getJson } from './client';
import type { ApiEvent, ApiTag, RequestOptions } from './types';

export function getTags(options: RequestOptions = {}): Promise<ApiTag[]> {
    return getJson<ApiTag[]>('/tags', options);
}

export function getTag(id: number, options: RequestOptions = {}): Promise<ApiTag> {
    return getJson<ApiTag>(`/tags/${encodeURIComponent(String(id))}`, options);
}

export function getTagEvents(id: number, options: RequestOptions = {}): Promise<ApiEvent[]> {
    return getJson<ApiEvent[]>(`/tags/${encodeURIComponent(String(id))}/events`, options);
}
