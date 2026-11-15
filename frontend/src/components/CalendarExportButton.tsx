import { useState } from "react";
import type { EventideEvent } from "../interfaces/interfaces";
import {
  createCalendarExport,
  downloadCalendar,
  hasExportableDate,
} from "../utils/calendarExport";
import "./CalendarExportButton.css";

type ExportState =
  | { status: "idle" }
  | { status: "exporting" }
  | { status: "complete"; excludedCount: number }
  | { status: "error"; message: string };

export default function CalendarExportButton({ events }: { events: readonly EventideEvent[] }) {
  const [state, setState] = useState<ExportState>({ status: "idle" });
  const exporting = state.status === "exporting";

  async function handleExport() {
    if (exporting) return;
    setState({ status: "exporting" });
    try {
      const { content, excludedCount } = await createCalendarExport(events);
      downloadCalendar(content);
      setState({ status: "complete", excludedCount });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to export events. Please try again.",
      });
    }
  }

  return (
    <div className="calendar-export">
      <button
        type="button"
        className="pill"
        disabled={exporting || !events.some(hasExportableDate)}
        onClick={() => { void handleExport(); }}
      >
        {exporting ? "Exporting…" : "Export events"}
      </button>
      {state.status === "error" && <p role="alert">{state.message}</p>}
      {state.status === "complete" && state.excludedCount > 0 && (
        <p role="status">
          {state.excludedCount} calendar {state.excludedCount === 1 ? "event was" : "events were"}
          {" "}excluded because no start date is available.
        </p>
      )}
    </div>
  );
}
