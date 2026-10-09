import { getEvents } from './events';
import { toEventideEvent } from './adapters';
import type { EventideEvent } from '../interfaces/interfaces';
import type { RequestOptions } from './types';

// Load all batches so client-side filters don't search only the first page.
export async function loadEventCatalog({ signal }: RequestOptions = {}): Promise<EventideEvent[]> {
    const events = new Map<number, EventideEvent>();
    const limit = 100;
    for (let skip = 0; ; skip += limit) {
        signal?.throwIfAborted();
        const page = await getEvents({ skip, limit, signal });
        if (!Array.isArray(page)) throw new Error('The events API returned an unexpected response');
        for (const event of page) events.set(event.id, toEventideEvent(event));
        if (page.length < limit) return [...events.values()];
    }
}
