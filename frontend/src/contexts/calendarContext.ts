import { createContext, useContext } from "react";
import type { EventideEvent } from "../interfaces/interfaces";

export type CalendarState = {
  events: EventideEvent[];
  pending: ReadonlySet<number>;
  loading: boolean;
  error: string | null;
  retry: () => void;
  toggle: (event: EventideEvent) => Promise<void>;
};

export const CalendarContext = createContext<CalendarState | null>(null);

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) throw new Error("useCalendar must be used inside CalendarProvider");
  return context;
}
