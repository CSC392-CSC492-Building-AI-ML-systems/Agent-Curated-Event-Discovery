import type { AgeGroup, Budget } from "../api/preferences";

export const AGE_GROUPS = [
  { value: "20_29", label: "20–29" }, { value: "30_39", label: "30–39" },
  { value: "40_49", label: "40–49" }, { value: "50_59", label: "50–59" },
  { value: "60_69", label: "60–69" }, { value: "70_79", label: "70–79" },
  { value: "80_plus", label: "80+" },
] satisfies { value: AgeGroup; label: string }[];

export const BUDGETS = [
  { value: "free", label: "I prefer free events" }, { value: "under_25", label: "Under $25" },
  { value: "25_to_50", label: "$25–50" }, { value: "50_to_100", label: "$50–100" },
  { value: "100_to_200", label: "$100–200" }, { value: "over_200", label: "Over $200" },
] satisfies { value: Budget; label: string }[];
