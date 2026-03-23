import { useMemo, useState } from "react";

function startOfWeekSunday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toLocalDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeLabel(start, end) {
  const startText = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!end) return startText;
  const endText = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${startText} to ${endText}`;
}

export default function Calendar({ events = [] }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Rolling window: start of this week through end of week 4 (35 days = 5 weeks)
  const gridStart = useMemo(() => startOfWeekSunday(today), [today]);
  const gridDays = useMemo(
    () => Array.from({ length: 35 }, (_, i) => addDays(gridStart, i)),
    [gridStart]
  );

  const windowEnd = gridDays[gridDays.length - 1];

  const rangeLabel = useMemo(() => {
    const start = gridDays[0].toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const end = windowEnd.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return `${start} – ${end}`;
  }, [gridDays, windowEnd]);

  const normalizedEvents = useMemo(() => {
    return (Array.isArray(events) ? events : [])
      .map((event) => {
        const start = toLocalDate(event.start);
        const end = toLocalDate(event.end);
        if (!start) return null;
        return {
          title: typeof event.title === "string" ? event.title : "Event",
          location: typeof event.location === "string" ? event.location : "",
          description: typeof event.description === "string" ? event.description : "",
          start,
          end,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events]);

  const eventsByDayKey = useMemo(() => {
    const map = new Map();
    for (const e of normalizedEvents) {
      const key = `${e.start.getFullYear()}-${String(e.start.getMonth() + 1).padStart(2, "0")}-${String(e.start.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return map;
  }, [normalizedEvents]);

  // Build week rows for rendering week-range labels
  const weeks = useMemo(() => {
    const rows = [];
    for (let i = 0; i < 5; i++) {
      rows.push(gridDays.slice(i * 7, i * 7 + 7));
    }
    return rows;
  }, [gridDays]);

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="calendar">
      <div className="calendar-header">
        <div className="calendar-title">Upcoming Events</div>
        <div className="calendar-range">{rangeLabel}</div>
      </div>

      <div className="weekday-row" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <div key={label} className="weekday-cell">
            {label}
          </div>
        ))}
      </div>

      <div className="month-grid">
        {gridDays.map((day) => {
          const isToday = sameDay(day, today);
          const isPast = day < today && !isToday;
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
          const dayEvents = eventsByDayKey.get(key) || [];

          // Month label shown on the 1st of each month or on the first cell
          const showMonthLabel =
            day.getDate() === 1 ||
            sameDay(day, gridDays[0]);

          return (
            <div
              key={key}
              className={`day-cell ${isPast ? "past" : ""} ${isToday ? "today" : ""}`}
            >
              <div className="day-number">
                {showMonthLabel && (
                  <span className="month-chip">
                    {day.toLocaleDateString(undefined, { month: "short" })}
                  </span>
                )}
                {day.getDate()}
              </div>

              {dayEvents.length ? (
                <div className="day-events">
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <button
                      type="button"
                      key={`${key}-${idx}`}
                      className="event-pill"
                      onClick={() => setSelectedEvent(e)}
                      title={e.location ? `${e.title} — ${e.location}` : e.title}
                    >
                      <span className="event-time">{timeLabel(e.start, e.end)}</span>
                      <span className="event-title">{e.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="more">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {selectedEvent && (
        <div className="modal" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{selectedEvent.title}</h3>
            <p className="modal-line">
              {selectedEvent.start.toLocaleString()}
              {selectedEvent.end ? ` to ${selectedEvent.end.toLocaleString()}` : ""}
            </p>
            {selectedEvent.location && (
              <p className="modal-line">📍 {selectedEvent.location}</p>
            )}
            {selectedEvent.description && (
              <p className="modal-line modal-desc">{selectedEvent.description}</p>
            )}
            <button
              type="button"
              className="control-button"
              onClick={() => setSelectedEvent(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        .calendar-header {
          margin: 10px 0 16px;
        }

        .calendar-title {
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .calendar-range {
          font-size: 13px;
          opacity: 0.65;
        }

        .weekday-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-bottom: 8px;
        }

        .weekday-cell {
          font-size: 12px;
          opacity: 0.75;
          font-weight: 700;
          padding: 0 6px;
        }

        .month-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .day-cell {
          min-height: 110px;
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 14px;
          background: white;
          padding: 8px;
          overflow: hidden;
        }

        .day-cell.past {
          opacity: 0.45;
          background: rgba(0,0,0,0.02);
        }

        .day-cell.today {
          outline: 2px solid rgba(10,20,28,0.35);
          outline-offset: 1px;
        }

        .day-number {
          font-weight: 800;
          font-size: 13px;
          opacity: 0.85;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .month-chip {
          font-size: 10px;
          font-weight: 700;
          background: rgba(10,20,28,0.08);
          border-radius: 6px;
          padding: 1px 5px;
          opacity: 1;
        }

        .day-events {
          display: grid;
          gap: 6px;
        }

        .event-pill {
          width: 100%;
          text-align: left;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.10);
          background: rgba(10,20,28,0.04);
          padding: 6px 8px;
          cursor: pointer;
        }

        .event-pill:hover {
          background: rgba(10,20,28,0.09);
        }

        .event-time {
          display: block;
          font-size: 11px;
          opacity: 0.75;
          margin-bottom: 2px;
        }

        .event-title {
          display: block;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.2;
        }

        .more {
          font-size: 11px;
          opacity: 0.7;
          padding-left: 2px;
        }

        .modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          z-index: 50;
        }

        .modal-content {
          background: white;
          padding: 24px;
          border-radius: 18px;
          max-width: 520px;
          width: 100%;
          border: 1px solid rgba(0,0,0,0.12);
        }

        .modal-title {
          margin: 0 0 10px;
        }

        .modal-line {
          margin: 0 0 10px;
          opacity: 0.9;
        }

        .modal-desc {
          font-size: 14px;
          line-height: 1.5;
        }

        .control-button {
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.14);
          background: white;
          cursor: pointer;
          font-weight: 600;
          margin-top: 6px;
        }

        .control-button:hover {
          background: rgba(0,0,0,0.04);
        }
      `}</style>
    </div>
  );
}
