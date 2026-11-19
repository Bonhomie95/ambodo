// Calendar days are plain 'YYYY-MM-DD' strings in local time — no timezone drift.
import { lang, locale, t } from './i18n';

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const today = () => ymd(new Date());
export const diffDays = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);

export const monday = (s: string) => { const d = parse(s); return addDays(s, -((d.getDay() + 6) % 7)); };

export const fmt = (s: string, o: Intl.DateTimeFormatOptions) => parse(s).toLocaleDateString(locale, o);
export const weekday = (s: string) => fmt(s, { weekday: 'short' });
export const nice = (s: string) => fmt(s, { weekday: 'short', month: 'short', day: 'numeric' });
export const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
/** Day pill tag: two letters in English (Mo, Tu); other languages keep the short form Intl gives them. */
export const dayTag = (s: string) => { const w = weekday(s).replace(/\.$/, ''); return lang === 'en' ? w.slice(0, 2) : w; };
/** Narrow weekday names, Monday first (M T W T F S S in English). */
export const weekLetters = () => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' }));
/** "November 2026", capitalised for a heading. */
export const monthTitle = (y: number, m: number) => {
  const s = new Date(y, m, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Today / Tomorrow / a weekday / a date. `midSentence` gives the lower-case words for use inside a sentence. */
export function relative(s: string, midSentence = false) {
  const n = diffDays(today(), s);
  if (n === 0) return midSentence ? t('today') : t('Today');
  if (n === 1) return midSentence ? t('tomorrow') : t('Tomorrow');
  if (n === -1) return midSentence ? t('yesterday') : t('Yesterday');
  if (n > 1 && n < 7) return weekday(s);
  return nice(s);
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? t('Up late') : h < 12 ? t('Good morning') : h < 17 ? t('Good afternoon') : t('Good evening');
};

/** 6×7 grid of days for a month view, starting on Monday. */
export function monthGrid(year: number, month: number) {
  const start = monday(ymd(new Date(year, month, 1)));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
