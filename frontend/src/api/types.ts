// Backend response fields; intentionally separate from the UI's EventideEvent.
export interface ApiTag {
    id: number;
    name: string;
}

export interface ApiEvent {
    id: number;
    name: string;
    description: string;
    startdate: string | null;
    starttime: string | null;
    enddate: string | null;
    endtime: string | null;
    venue: number;
    organizer: number | null;
    price: number | string | null;
    link: string;
    eighteenplus: boolean;
    // The tag-events route does not currently eagerly load event tags.
    tags?: ApiTag[];
}

export interface RequestOptions {
    signal?: AbortSignal;
}

export interface GetEventsOptions extends RequestOptions {
    skip?: number;
    limit?: number;
}
