// Backend response fields; intentionally separate from the UI's EventideEvent.
export interface ApiTag {
  id: number;
  name: string;
}

export interface ApiCoordinates {
  type: "Point";
  coordinates: [number, number];
}

export interface ApiVenue {
  id: number;
  name: string;
  address: string;
  coordinates: ApiCoordinates | null;
}

export interface ApiOrganizer {
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

export interface ApiEvent {
  id: number;
  name: string;
  description: string;
  startdate: string | null;
  starttime: string | null;
  enddate: string | null;
  endtime: string | null;
  venue: ApiVenue;
  organizer: ApiOrganizer | null;
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
