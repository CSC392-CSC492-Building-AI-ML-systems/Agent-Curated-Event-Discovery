export interface EventideTag {
  id: number;
  name: string;
}

export interface EventideCoordinates {
  type: "Point";
  coordinates: [number, number];
}

export interface EventideOrganizer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  linkedin: string | null;
  tiktok: string | null;
}

export interface EventideVenue {
  id: number;
  name: string;
  address: string;
  coordinates: EventideCoordinates | null;
}

export interface EventideEvent {
  key: number;
  id: number;
  title: string;
  description: string;
  longitude?: number;
  latitude?: number;
  // Names without #, retained for existing card, filter, and map components.
  // Keep IDs as well as names for API requests and tag following.
  tags: EventideTag[];
  // ISO timestamps with Z or an explicit offset; display in America/Toronto.
  // Toronto observes daylight saving time, so don't assume a fixed UTC offset.
  startDate?: string;
  endDate?: string;
  // False when only a calendar date is supplied, rather than an actual time.
  startTimeKnown?: boolean;
  endTimeKnown?: boolean;
  venue: EventideVenue;
  organizer?: EventideOrganizer | null;
  // Preserve the API's numeric or decimal-string representation.
  price?: number | string | null;
  link: string;
  eighteenPlus: boolean;
  imageUrl?: string;
}

export interface EventideFilters {
  search: string;
  tags: Set<string>;
  date: [Date | null, Date | null]; //tuple of form [datestart, dateend]
  order: string; //order by: datetime, distance, popularity, cost
  cost: [number, number]; //tuple of form [mincost, maxcost]
  location: string; //either "", "online" or "inperson"
  host: string; //either "username" or ""
}

export interface BrowseState {
  search: string;
  range: string;
  sort: string;
  tags: EventideTag[];
}

export type EventRequestProps = {
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export type EventPageProps = EventRequestProps & {
  events: EventideEvent[];
  saved: number[];
  onSave: (id: number) => void;
  followed: EventideTag[];
  onFollow: (tag: EventideTag) => void;
  browse: BrowseState;
  setBrowse: React.Dispatch<React.SetStateAction<BrowseState>>;
};

