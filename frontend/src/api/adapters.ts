import type { EventideEvent } from '../interfaces/interfaces';
import { toTorontoTimestamp } from '../utils/torontoTime';
import type { ApiEvent } from './types';

export function toEventideEvent(event: ApiEvent): EventideEvent {
    const tags = event.tags?.map(tag => ({ id: tag.id, name: tag.name }));
    return {
        key: event.id,
        id: event.id,
        title: event.name,
        description: event.description,
        startDate: toTorontoTimestamp(event.startdatetime),
        endDate: toTorontoTimestamp(event.enddatetime),
        venueId: event.venue,
        organizerId: event.organizer,
        price: event.price,
        link: event.link,
        eighteenPlus: event.eighteenplus,
        tags,
        categories: [...new Set((tags ?? []).map(tag => tag.name))],
        // Address, image, and coordinates aren't supplied by these endpoints yet.
    };
}
