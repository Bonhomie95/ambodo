// Ambodo speaks the phone's language. English is the source: the English text itself is the key, and
// src/locales/<lang>.json maps it to the translation. `npm run i18n` reports anything a language is missing.
import { getLocales, type Locale } from 'expo-localization';
import { Fragment, type ReactNode } from 'react';

type Pack = Record<string, string>;
// Static requires so Metro bundles every pack; only the one in use is loaded.
const PACKS: Record<string, () => Pack> = {
  af: () => require('../locales/af.json'), am: () => require('../locales/am.json'), ar: () => require('../locales/ar.json'),
  az: () => require('../locales/az.json'), be: () => require('../locales/be.json'), bg: () => require('../locales/bg.json'),
  bn: () => require('../locales/bn.json'), ca: () => require('../locales/ca.json'), cs: () => require('../locales/cs.json'),
  da: () => require('../locales/da.json'), de: () => require('../locales/de.json'), el: () => require('../locales/el.json'),
  es: () => require('../locales/es.json'), 'es-419': () => require('../locales/es-419.json'), et: () => require('../locales/et.json'),
  eu: () => require('../locales/eu.json'), fa: () => require('../locales/fa.json'), fi: () => require('../locales/fi.json'),
  fil: () => require('../locales/fil.json'), fr: () => require('../locales/fr.json'), gl: () => require('../locales/gl.json'),
  gu: () => require('../locales/gu.json'), he: () => require('../locales/he.json'), hi: () => require('../locales/hi.json'),
  hr: () => require('../locales/hr.json'), hu: () => require('../locales/hu.json'), hy: () => require('../locales/hy.json'),
  id: () => require('../locales/id.json'), is: () => require('../locales/is.json'), it: () => require('../locales/it.json'),
  ja: () => require('../locales/ja.json'), ka: () => require('../locales/ka.json'), kk: () => require('../locales/kk.json'),
  km: () => require('../locales/km.json'), kn: () => require('../locales/kn.json'), ko: () => require('../locales/ko.json'),
  ky: () => require('../locales/ky.json'), lo: () => require('../locales/lo.json'), lt: () => require('../locales/lt.json'),
  lv: () => require('../locales/lv.json'), mk: () => require('../locales/mk.json'), ml: () => require('../locales/ml.json'),
  mn: () => require('../locales/mn.json'), mr: () => require('../locales/mr.json'), ms: () => require('../locales/ms.json'),
  my: () => require('../locales/my.json'), nb: () => require('../locales/nb.json'), ne: () => require('../locales/ne.json'),
  nl: () => require('../locales/nl.json'), or: () => require('../locales/or.json'), pa: () => require('../locales/pa.json'),
  pl: () => require('../locales/pl.json'), 'pt-BR': () => require('../locales/pt-BR.json'), 'pt-PT': () => require('../locales/pt-PT.json'),
  rm: () => require('../locales/rm.json'), ro: () => require('../locales/ro.json'), ru: () => require('../locales/ru.json'),
  si: () => require('../locales/si.json'), sk: () => require('../locales/sk.json'), sl: () => require('../locales/sl.json'),
  sq: () => require('../locales/sq.json'), sr: () => require('../locales/sr.json'), sv: () => require('../locales/sv.json'),
  sw: () => require('../locales/sw.json'), ta: () => require('../locales/ta.json'), te: () => require('../locales/te.json'),
  th: () => require('../locales/th.json'), tr: () => require('../locales/tr.json'), uk: () => require('../locales/uk.json'),
  ur: () => require('../locales/ur.json'), vi: () => require('../locales/vi.json'), 'zh-Hans': () => require('../locales/zh-Hans.json'),
  'zh-Hant': () => require('../locales/zh-Hant.json'), zu: () => require('../locales/zu.json'),
};

// Old Android codes and Norwegian variants, mapped onto the packs.
const ALIAS: Record<string, string> = { iw: 'he', in: 'id', tl: 'fil', no: 'nb', nn: 'nb' };

/** The pack for one of the phone's languages, 'en', or null when Ambodo doesn't speak it. */
export function packFor(l: Pick<Locale, 'languageCode' | 'languageScriptCode' | 'languageRegionCode'>): string | null {
  const code = l.languageCode?.toLowerCase() ?? '';
  const lang = ALIAS[code] ?? code;
  const region = l.languageRegionCode ?? '';
  if (lang === 'en') return 'en';
  if (lang === 'zh') return l.languageScriptCode === 'Hant' || ['TW', 'HK', 'MO'].includes(region) ? 'zh-Hant' : 'zh-Hans';
  if (lang === 'pt') return region === 'BR' ? 'pt-BR' : 'pt-PT';
  if (lang === 'es') return region === 'ES' ? 'es' : 'es-419';
  return lang in PACKS ? lang : null;
}

// The first of the phone's languages Ambodo speaks wins; set once at launch (iOS restarts apps on a language change).
const phone = getLocales();
const hit = phone.map((l) => ({ l, pack: packFor(l) })).find((x) => x.pack);
export const lang = hit?.pack ?? 'en';
/** BCP-47 tag for dates, times and money: the matched language, or English in the phone's region. */
export const locale = hit?.l.languageTag ?? `en-${phone[0]?.regionCode ?? 'US'}`;
/** The phone's currency, used for a new family's expenses. */
export const phoneCurrency = phone[0]?.currencyCode ?? 'USD';

const pack: Pack = lang === 'en' ? {} : PACKS[lang]();

/**
 * Translate English source text; {name} placeholders are filled from vars. Text without a translation stays English.
 * `ctx` tells apart identical English that other languages say differently (the pack key becomes "ctx|text").
 */
export function t(s: string, vars?: Record<string, string | number>, ctx?: string): string {
  const out = pack[ctx ? `${ctx}|${s}` : s] ?? s;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

/** Count-dependent text: `one` when n is 1, `other` otherwise; both get {n}. */
export const tn = (n: number, one: string, other: string, vars?: Record<string, string | number>) =>
  t(n === 1 ? one : other, { ...vars, n });

/** t() for sentences with inline elements: rich('Read the {terms}', { terms: <Text …/> }). */
export function rich(s: string, parts: Record<string, ReactNode>): ReactNode[] {
  return t(s).split(/\{(\w+)\}/).map((p, i) => (i % 2 ? <Fragment key={i}>{parts[p] ?? `{${p}}`}</Fragment> : p));
}
