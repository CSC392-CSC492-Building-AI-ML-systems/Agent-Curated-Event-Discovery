export interface EventideEvent {
  key: number;
  id: number;
  title: string;
  description: string;
  longitude?: number;
  latitude?: number;
  categories: string[];
  startDate?: string;
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