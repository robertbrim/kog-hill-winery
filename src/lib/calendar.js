// src/lib/calendar.js
import ICAL from "ical.js";

const ICS_URL =
  "https://calendar.google.com/calendar/ical/eugbc6jbfckp8eouvshrc4m208%40group.calendar.google.com/public/basic.ics";

function toJsDate(icalTime) {
  return icalTime ? icalTime.toJSDate() : null;
}

function cleanText(value) {
  return (value || "").toString().trim();
}

function eventToPlainObject(evt, details) {
  const start = toJsDate(details.startDate);
  const end = toJsDate(details.endDate);

  return {
    uid: cleanText(evt.uid),
    title: cleanText(evt.summary),
    location: cleanText(evt.location),
    description: cleanText(evt.description),
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
  };
}

export async function getCalendarEvents() {
  const response = await fetch(ICS_URL, {
    headers: { Accept: "text/calendar" },
  });

  if (!response.ok) {
    throw new Error(`Calendar fetch failed: ${response.status}`);
  }

  const icsText = await response.text();

  const jcalData = ICAL.parse(icsText);
  const vcalendar = new ICAL.Component(jcalData);

  const vevents = vcalendar.getAllSubcomponents("vevent");

  // Group by UID: one master (no RECURRENCE-ID) + exceptions (RECURRENCE-ID)
  const byUid = new Map();

  for (const comp of vevents) {
    const uid = cleanText(comp.getFirstPropertyValue("uid"));
    if (!uid) continue;

    if (!byUid.has(uid)) byUid.set(uid, { master: null, exceptions: [] });

    const hasRecurrenceId = !!comp.getFirstProperty("recurrence-id");
    if (hasRecurrenceId) {
      byUid.get(uid).exceptions.push(comp);
    } else {
      if (!byUid.get(uid).master) byUid.get(uid).master = comp;
    }
  }

  const results = [];
  const now = new Date();

  for (const [uid, group] of byUid.entries()) {
    // No master: treat exceptions as standalone single events
    if (!group.master) {
      for (const exComp of group.exceptions) {
        const exEvt = new ICAL.Event(exComp);
        const start = toJsDate(exEvt.startDate);
        const end = toJsDate(exEvt.endDate);

        results.push({
          uid,
          title: cleanText(exEvt.summary),
          location: cleanText(exEvt.location),
          description: cleanText(exEvt.description),
          start: start ? start.toISOString() : null,
          end: end ? end.toISOString() : null,
        });
      }
      continue;
    }

    const masterEvent = new ICAL.Event(group.master);

    // Attach exceptions so they override the correct occurrence
    for (const exComp of group.exceptions) {
      const exEvent = new ICAL.Event(exComp);
      masterEvent.relateException(exEvent);
    }

    // Not recurring: add once
    if (!masterEvent.isRecurring()) {
      const start = toJsDate(masterEvent.startDate);
      const end = toJsDate(masterEvent.endDate);

      results.push({
        uid,
        title: cleanText(masterEvent.summary),
        location: cleanText(masterEvent.location),
        description: cleanText(masterEvent.description),
        start: start ? start.toISOString() : null,
        end: end ? end.toISOString() : null,
      });
      continue;
    }

    // Recurring: expand occurrences within a window
    const windowStart = new Date(now);
    windowStart.setMonth(windowStart.getMonth() - 6);

    const windowEnd = new Date(now);
    windowEnd.setMonth(windowEnd.getMonth() + 18);

    const iterator = masterEvent.iterator(masterEvent.startDate);
    let next = iterator.next();

    // Safety limit to avoid infinite loops
    let guard = 0;

    while (next && guard < 5000) {
      guard += 1;

      const occurrenceStart = next.toJSDate();
      if (occurrenceStart > windowEnd) break;

      const details = masterEvent.getOccurrenceDetails(next);
      const item = eventToPlainObject(masterEvent, details);

      if (item.start && item.end) {
        const s = new Date(item.start);
        const e = new Date(item.end);

        if (e >= windowStart && s <= windowEnd) {
          results.push(item);
        }
      }

      next = iterator.next();
    }
  }

  // Final pass: drop invalid, sort, and remove exact duplicates
  const seen = new Set();
  const out = [];

  for (const e of results) {
    if (!e.start || !e.end) continue;

    const key = `${e.uid}|${e.start}|${e.end}|${e.title}`;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(e);
  }

  out.sort((a, b) => new Date(a.start) - new Date(b.start));

  return out;
}