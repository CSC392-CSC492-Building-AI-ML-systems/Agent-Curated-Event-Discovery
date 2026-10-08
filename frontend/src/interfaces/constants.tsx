import type { EventideFilters } from "./interfaces";

export const CATEGORIES = ["tech", "food", "social", "active", "music"];
export const ORDER_BY = ["lowest cost", "upcoming", "popularity"] //least cost, closest date, most popular
export const INITIAL_ORDER_BY = "upcoming"

export const INITIAL_FILTERS: EventideFilters = {
    search: "",
    categories: new Set(),
    date: [null, null], //tuple of form [datestart, dateend]
    order: INITIAL_ORDER_BY, //order by: datetime, distance, popularity, cost
    cost: [0, 0], //tuple of form [mincost, maxcost]
    location: "", //either "", "online" or "inperson"
    host: "" //either "username" or ""
}

