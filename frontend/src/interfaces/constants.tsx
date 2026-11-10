import type { BrowseState, EventideTag } from "./interfaces";

export const CATEGORIES = ["tech", "food", "social", "active", "music"];
export const ORDER_BY = ["lowest cost", "upcoming", "popularity"]; //least cost, closest date, most popular
export const INITIAL_ORDER_BY = "upcoming";

export const INITIAL_FILTERS: BrowseState = {
  search: "",
  range: "30",
  sort: "upcoming",
  tags: [] as EventideTag[],
  price: [0, 50],
  eighteenPlus: false,
}

export const MIN_PRICE = 0
export const MAX_PRICE = 50