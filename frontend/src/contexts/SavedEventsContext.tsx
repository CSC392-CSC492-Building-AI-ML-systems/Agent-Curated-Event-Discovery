import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { EventideEvent } from "../interfaces/interfaces";

type SavedEvents = {
  events: EventideEvent[];
  saved: number[];
  onSave: (id: number) => void;
};

const SavedEventsContext = createContext<SavedEvents>({
  events: [],
  saved: [],
  onSave: () => {},
});

export function SavedEventsProvider({
  events,
  saved,
  onSave,
  children,
}: SavedEvents & { children: ReactNode }) {
  return (
    <SavedEventsContext.Provider value={{ events, saved, onSave }}>
      {children}
    </SavedEventsContext.Provider>
  );
}

export function useSavedEvents() {
  return useContext(SavedEventsContext);
}
