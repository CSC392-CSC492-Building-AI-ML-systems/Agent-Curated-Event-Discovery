export interface EventideTag {
  id: number;
  name: string;
}

export interface EventideEvent {
  key: number;
  id: number;
  title: string;
  description: string;
  longitude?: number;
  latitude?: number;
  // Names without #, retained for existing card, filter, and map components.
  categories: string[];
  // Keep IDs as well as names for API requests and tag following.
  tags?: EventideTag[];
  // ISO timestamps with Z or an explicit offset; display in America/Toronto.
  // Toronto observes daylight saving time, so don't assume a fixed UTC offset.
  startDate?: string;
  endDate?: string;
  venueId?: number;
  organizerId?: number | null;
  // Preserve the API's numeric or decimal-string representation.
  price?: number | string | null;
  link?: string;
  eighteenPlus?: boolean;
  address?: string;
  imageUrl?: string;
}

export interface EventideFilters {
    search: string,
    categories: Set<string>,
    date: [Date | null, Date | null], //tuple of form [datestart, dateend]
    order: string, //order by: datetime, distance, popularity, cost
    cost: [number, number], //tuple of form [mincost, maxcost]
    location: string, //either "", "online" or "inperson"
    host: string, //either "username" or ""
}
