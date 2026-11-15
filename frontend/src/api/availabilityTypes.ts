/** Sunday = 0 through Saturday = 6, matching the calendar's display order. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AvailabilityWindow = {
  day_of_week: DayOfWeek;
  /** Toronto wall-clock minutes after midnight, in 30-minute increments. */
  start_minute: number;
  /** Exclusive; 1440 means midnight at the end of this day. */
  end_minute: number;
};

export type WeeklyAvailability = {
  /** Empty means recommendations use interests without an availability preference. */
  windows: readonly AvailabilityWindow[];
};
