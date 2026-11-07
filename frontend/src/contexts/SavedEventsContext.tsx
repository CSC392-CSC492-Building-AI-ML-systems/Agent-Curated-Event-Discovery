import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { EventideEvent } from "../interfaces/interfaces";

type SavedEvents = { events: EventideEvent[]; saved: number[] };

const SavedEventsContext = createContext<SavedEvents>({
  events: [],
  saved: [],
});

export function SavedEventsProvider({
  events,
  saved,
  children,
}: SavedEvents & { children: ReactNode }) {
  return (
    <SavedEventsContext.Provider value={{ events, saved }}>
      {children}
    </SavedEventsContext.Provider>
  );
}

export function useSavedEvents() {
  return useContext(SavedEventsContext);
}
