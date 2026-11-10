// Pure logic: custody patterns, the tamper-evident message chain, and the calendar feed.
import { createHash } from 'node:crypto';

// 14-day cycles starting on the anchor date. A = schedule.first, B = the other parent.
export const PATTERNS = {
  'week-on-week-off': 'AAAAAAABBBBBBB',
  '2-2-3': 'AABBAAABBAABBB',
  '2-2-5-5': 'AABBAAAAABBBBB',
  '3-4-4-3': 'AAABBBBAAAABBB',
  'every-other-weekend': 'AAAABBBAAAAAAA',
};

const DAY = 864e5;
const utc = (s) => Date.parse(`${s}T00:00:00Z`);
export const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

/** [{ date, parent }] for every day in [from, to] (max 400 days). parent is a user id string or null. */
export function custodyFor(family, from, to) {
  const { pattern, anchor, first } = family.schedule;
  const a = first?.toString() ?? null;
  const b = family.members.map(String).find((m) => m !== a) ?? null;
  const seq = PATTERNS[pattern];
  const start = utc(anchor);
  const end = Math.min(utc(to), utc(from) + 400 * DAY);
  const out = [];
  for (let t = utc(from); t <= end; t += DAY) {
    const date = dayKey(t);
    const i = (((Math.round((t - start) / DAY)) % seq.length) + seq.length) % seq.length;
    out.push({ date, parent: family.overrides?.[date]?.toString() ?? (seq[i] === 'A' ? a : b) });
  }
  return out;
}

/** Each message seals the one before it; editing any past message breaks every hash after it. */
export const chainHash = (prev, author, at, text) =>
  createHash('sha256').update(`${prev}|${author}|${new Date(at).toISOString()}|${text}`).digest('hex');

/** iCalendar feed: custody blocks + family events, subscribable from Apple/Google Calendar. */
export function icsFeed(family, names, events, now = Date.now()) {
  const days = custodyFor(family, dayKey(now - 30 * DAY), dayKey(now + 180 * DAY));
  const d8 = (s) => s.replaceAll('-', '');
  const next = (s) => dayKey(utc(s) + DAY);
  const esc = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const stamp = `${new Date(now).toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ambodo//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Ambodo'];
  const add = (uid, start, end, summary) =>
    lines.push('BEGIN:VEVENT', `UID:${uid}@ambodo`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d8(start)}`,
      `DTEND;VALUE=DATE:${d8(end)}`, `SUMMARY:${esc(summary)}`, 'END:VEVENT');
  for (let i = 0; i < days.length;) {
    let j = i;
    while (j + 1 < days.length && days[j + 1].parent === days[i].parent) j++;
    add(`c-${days[i].date}`, days[i].date, next(days[j].date), `Kids with ${names[days[i].parent] ?? 'co-parent'}`);
    i = j + 1;
  }
  for (const e of events) add(`e-${e._id}`, e.date, next(e.date), e.title);
  lines.push('END:VCALENDAR');
  return lines.join('\r\n'); // ponytail: no 75-octet line folding; add if a client chokes on long titles
}
