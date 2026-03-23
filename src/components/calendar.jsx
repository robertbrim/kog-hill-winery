import { useMemo, useState } from "react";

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

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

function addMonths(date, monthsToAdd) {
  return new Date(date.getFullYear(), date.getMonth() + monthsToAdd, 1);
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function monthTitle(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function toLocalDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function firstLineInfo(text) {
  if (!text) return { line: "", url: "" };
  const stripped = String(text).replace(/<[^>]*>/g, "");
  const line = stripped.split("\n")[0].trim();
  const match = line.match(/https?:\/\/\S+/i);
  const url = match ? match[0].replace(/[),.;]+$/g, "") : "";
  return { line, url };
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

export default function Calendar1({ events = [], historyMonths = 12 }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const currentMonth = useMemo(() => startOfMonth(today), [today]);
  const minimumMonth = useMemo(() => addMonths(currentMonth, -historyMonths), [currentMonth, historyMonths]);
  const maximumMonth = useMemo(() => addMonths(currentMonth, historyMonths), [currentMonth, historyMonths]);

  const [visibleMonth, setVisibleMonth] = useState(currentMonth);

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

  const monthStart = useMemo(() => startOfMonth(visibleMonth), [visibleMonth]);
  const monthEnd = useMemo(() => endOfMonth(visibleMonth), [visibleMonth]);
  const gridStart = useMemo(() => startOfWeekSunday(monthStart), [monthStart]);

  // Only generate days that are within the current month
  const gridDays = useMemo(() => {
    const days = [];
    let d = new Date(gridStart);
    while (d <= monthEnd) {
      days.push(new Date(d));
      d = addDays(d, 1);
    }
    // Pad to full weeks — but mark outside days as null so they render as empty
    const result = [];
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const inMonth = day >= monthStart && day <= monthEnd;
      result.push(inMonth ? day : null);
    }
    // Make sure we always have complete rows of 7
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [gridStart, monthStart, monthEnd]);

  const canGoPrevious = visibleMonth.getTime() > minimumMonth.getTime();
  const canGoNext = visibleMonth.getTime() < maximumMonth.getTime();

  function goToPreviousMonth() { if (canGoPrevious) setVisibleMonth((m) => addMonths(m, -1)); }
  function goToNextMonth() { if (canGoNext) setVisibleMonth((m) => addMonths(m, 1)); }
  function goToCurrentMonth() { setVisibleMonth(currentMonth); }

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="calendar">
      <div className="calendar-header">
        <div className="calendar-title">{monthTitle(visibleMonth)}</div>
        <div className="calendar-controls">
          <button type="button" className="control-button" onClick={goToPreviousMonth} disabled={!canGoPrevious}>
            ← Prev
          </button>
          <button type="button" className="control-button" onClick={goToCurrentMonth} disabled={sameMonth(visibleMonth, currentMonth)}>
            Today
          </button>
          <button type="button" className="control-button" onClick={goToNextMonth} disabled={!canGoNext}>
            Next →
          </button>
        </div>
      </div>

      <div className="weekday-row" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <div key={label} className="weekday-cell">{label}</div>
        ))}
      </div>

      <div className="month-grid">
        {gridDays.map((day, idx) => {
          if (!day) {
            // Empty cell for days outside the month
            return <div key={`empty-${idx}`} className="day-cell empty" />;
          }

          const isToday = sameDay(day, today);
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
          const dayEvents = eventsByDayKey.get(key) || [];

          return (
            <div key={key} className={`day-cell ${isToday ? "today" : ""}`}>
              <div className="day-number">{day.getDate()}</div>
              {dayEvents.length ? (
                <div className="day-events">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <button
                      type="button"
                      key={`${key}-${i}`}
                      className="event-pill"
                      onClick={() => setSelectedEvent(e)}
                      title={e.location ? `${e.title} — ${e.location}` : e.title}
                    >
                      <span className="event-time">{timeLabel(e.start, e.end)}</span>
                      <span className="event-title">{e.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && <div className="more">+{dayEvents.length - 3} more</div>}
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
            {selectedEvent.location && <p className="modal-line">📍 {selectedEvent.location}</p>}
            {selectedEvent.description && (() => {
              const info = firstLineInfo(selectedEvent.description);
              return info.url ? (
                <p className="modal-line modal-desc">
                  <a href={info.url} target="_blank" rel="noopener noreferrer" className="modal-link">
                    {info.url}
                  </a>
                </p>
              ) : info.line ? (
                <p className="modal-line modal-desc">{info.line}</p>
              ) : null;
            })()}
            <button type="button" className="control-button" onClick={() => setSelectedEvent(null)}>Close</button>
          </div>
        </div>
      )}

      <style>{`
        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 10px 0 16px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .calendar-title {
          font-size: 22px;
          font-weight: 800;
        }
        .calendar-controls {
          display: flex;
          gap: 8px;
        }
        .control-button {
          padding: 8px 14px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.14);
          background: white;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }
        .control-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .control-button:hover:not(:disabled) {
          background: rgba(0,0,0,0.04);
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
        .day-cell.empty {
          background: transparent;
          border-color: transparent;
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
        .modal-title { margin: 0 0 10px; }
        .modal-line { margin: 0 0 10px; opacity: 0.9; }
        .modal-desc { font-size: 14px; line-height: 1.5; }
        .modal-link {
          color: #8b1a1a;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .modal-link:hover { opacity: 0.75; }
      `}</style>
    </div>
  );
}
