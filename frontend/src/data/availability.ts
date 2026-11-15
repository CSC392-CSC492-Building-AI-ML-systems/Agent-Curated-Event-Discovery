export const AVAILABILITY_DAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
] as const;

export const MINUTES_PER_SLOT = 30;
export const MINUTES_PER_DAY = 1440;
export const SLOTS_PER_DAY = MINUTES_PER_DAY / MINUTES_PER_SLOT;
