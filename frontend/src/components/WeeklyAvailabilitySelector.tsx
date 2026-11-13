import { useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import "./WeeklyAvailabilitySelector.css";

import { AVAILABILITY_DAYS as DAYS, SLOTS_PER_DAY } from "../data/availability";
const ROWS = Array.from({ length: SLOTS_PER_DAY }, (_, index) => index);

type Position = { day: number; slot: number };
type Drag = { start: Position; available: boolean; original: ReadonlySet<number> };
type Props = {
  value: ReadonlySet<number>;
  onChange: (value: Set<number>) => void;
  disabled?: boolean;
  actions?: ReactNode;
};

function slotId({ day, slot }: Position) {
  return day * SLOTS_PER_DAY + slot;
}

function timeLabel(slot: number) {
  const hour = Math.floor(slot / 2) % 24;
  return `${hour % 12 || 12}:${slot % 2 ? "30" : "00"} ${hour >= 12 ? "p.m." : "a.m."}`;
}

function paint(drag: Drag, end: Position) {
  const next = new Set(drag.original);
  for (let day = Math.min(drag.start.day, end.day); day <= Math.max(drag.start.day, end.day); day++) {
    for (let slot = Math.min(drag.start.slot, end.slot); slot <= Math.max(drag.start.slot, end.slot); slot++) {
      const id = slotId({ day, slot });
      if (drag.available) next.add(id);
      else next.delete(id);
    }
  }
  return next;
}

export default function WeeklyAvailabilitySelector({ value, onChange, disabled = false, actions }: Props) {
  const instructionsId = useId();
  const scroll = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const pointerType = useRef("");
  const [active, setActive] = useState<Position>({ day: 0, slot: 18 });

  function toggle(position: Position) {
    const next = new Set(value);
    const id = slotId(position);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, position: Position) {
    pointerType.current = event.pointerType;
    // Touch keeps native scrolling; tapping a slot toggles it through onClick.
    if (disabled || event.pointerType !== "mouse" || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    setActive(position);
    drag.current = { start: position, available: !value.has(slotId(position)), original: value };
    scroll.current?.setPointerCapture(event.pointerId);
    onChange(paint(drag.current, position));
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>("button[data-availability-slot]");
    if (!target || !scroll.current?.contains(target)) return;
    onChange(paint(drag.current, { day: Number(target.dataset.day), slot: Number(target.dataset.slot) }));
  }

  function cancelDrag() {
    if (drag.current) onChange(new Set(drag.current.original));
    drag.current = null;
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, position: Position) {
    const offsets: Record<string, Position> = {
      ArrowUp: { day: 0, slot: -1 }, ArrowDown: { day: 0, slot: 1 },
      ArrowLeft: { day: -1, slot: 0 }, ArrowRight: { day: 1, slot: 0 },
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    const next = {
      day: Math.max(0, Math.min(6, position.day + offset.day)),
      slot: Math.max(0, Math.min(SLOTS_PER_DAY - 1, position.slot + offset.slot)),
    };
    setActive(next);
    scroll.current?.querySelector<HTMLButtonElement>(`button[data-day="${next.day}"][data-slot="${next.slot}"]`)?.focus();
  }

  return (
    <section className="weekly-availability" aria-label="Weekly availability selector">
      <p id={instructionsId}>Click and drag to mark your usual availability. You will receive recommendations based on your schedule.</p>
      <div className="availability-toolbar">
        <div className="availability-legend">
          <span><i className="availability-swatch" aria-hidden="true" />Unavailable</span>
          <span><i className="availability-swatch available" aria-hidden="true" />Available</span>
        </div>
        <div className="availability-toolbar-actions">
          <button type="button" className="pill" disabled={disabled || !value.size} onClick={() => onChange(new Set())}>Clear all</button>
          {actions}
        </div>
      </div>
      <div className="availability-scroll" ref={scroll} onPointerMove={moveDrag}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={cancelDrag}
        onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={event => { if (event.key === "Escape" && drag.current) { event.preventDefault(); cancelDrag(); } }}>
        <table className="availability-table" aria-describedby={instructionsId}>
          <caption className="availability-sr-only">Choose your available times for a typical week</caption>
          <thead><tr><th scope="col">Time</th>{DAYS.map(({ label: day }) => <th scope="col" key={day}><abbr title={day}>{day.slice(0, 3)}</abbr></th>)}</tr></thead>
          <tbody>{ROWS.map(slot => <tr key={slot} className={slot % 2 === 0 ? "availability-hour" : ""}>
            <th scope="row"><span className={slot % 2 ? "availability-sr-only" : undefined}>{timeLabel(slot)}</span></th>
            {DAYS.map(({ label: day, value: dayIndex }) => {
              const position = { day: dayIndex, slot };
              const selected = value.has(slotId(position));
              return <td key={day}><button type="button" data-availability-slot data-day={dayIndex} data-slot={slot}
                className="availability-slot" aria-pressed={selected} disabled={disabled}
                aria-label={`${day}, ${timeLabel(slot)} to ${timeLabel(slot + 1)}`}
                tabIndex={active.day === dayIndex && active.slot === slot ? 0 : -1}
                onFocus={() => setActive(position)} onKeyDown={event => navigate(event, position)}
                onPointerDown={event => startDrag(event, position)}
                onClick={event => { if (event.detail === 0 || pointerType.current !== "mouse") toggle(position); }} />
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
