// Store text lives in store/text/<lang>.json, one file per app language (src/locales), plus fr-CA and English
// variants (en-GB/en-AU/en-CA hold keyword overrides only). These maps say which store locales each file fills.
import { existsSync, readFileSync } from 'node:fs';

/** App Store Connect locale codes (Apple offers 50). */
export const APPLE = {
  en: ['en-US'], 'en-GB': ['en-GB'], 'en-AU': ['en-AU'], 'en-CA': ['en-CA'], ar: ['ar-SA'], bn: ['bn-BD'], ca: ['ca'],
  'zh-Hans': ['zh-Hans'], 'zh-Hant': ['zh-Hant'], hr: ['hr'], cs: ['cs'], da: ['da'], nl: ['nl-NL'], fi: ['fi'], fr: ['fr-FR'],
  'fr-CA': ['fr-CA'], de: ['de-DE'], el: ['el'], gu: ['gu-IN'], he: ['he'], hi: ['hi'], hu: ['hu'], id: ['id'], it: ['it'],
  ja: ['ja'], kn: ['kn-IN'], ko: ['ko'], ms: ['ms'], ml: ['ml-IN'], mr: ['mr-IN'], nb: ['no'], or: ['or-IN'], pl: ['pl'],
  'pt-BR': ['pt-BR'], 'pt-PT': ['pt-PT'], pa: ['pa-IN'], ro: ['ro'], ru: ['ru'], sk: ['sk'], sl: ['sl-SI'], 'es-419': ['es-MX'],
  es: ['es-ES'], sv: ['sv'], ta: ['ta-IN'], te: ['te-IN'], th: ['th'], tr: ['tr'], uk: ['uk'], ur: ['ur-PK'], vi: ['vi'],
};

/** Google Play language codes. Odia has no Play listing language. */
export const PLAY = {
  en: ['en-US'], af: ['af'], am: ['am'], ar: ['ar'], az: ['az-AZ'], be: ['be'], bg: ['bg'], bn: ['bn-BD'], ca: ['ca'],
  cs: ['cs-CZ'], da: ['da-DK'], de: ['de-DE'], el: ['el-GR'], es: ['es-ES'], 'es-419': ['es-419', 'es-US'], et: ['et'],
  eu: ['eu-ES'], fa: ['fa', 'fa-AE', 'fa-AF', 'fa-IR'], fi: ['fi-FI'], fil: ['fil'], fr: ['fr-FR'], 'fr-CA': ['fr-CA'],
  gl: ['gl-ES'], gu: ['gu'], he: ['iw-IL'], hi: ['hi-IN'], hr: ['hr'], hu: ['hu-HU'], hy: ['hy-AM'], id: ['id'],
  is: ['is-IS'], it: ['it-IT'], ja: ['ja-JP'], ka: ['ka-GE'], kk: ['kk'], km: ['km-KH'], kn: ['kn-IN'], ko: ['ko-KR'],
  ky: ['ky-KG'], lo: ['lo-LA'], lt: ['lt'], lv: ['lv'], mk: ['mk-MK'], ml: ['ml-IN'], mn: ['mn-MN'], mr: ['mr-IN'],
  ms: ['ms', 'ms-MY'], my: ['my-MM'], nb: ['no-NO'], ne: ['ne-NP'], nl: ['nl-NL'], pa: ['pa'], pl: ['pl-PL'],
  'pt-BR': ['pt-BR'], 'pt-PT': ['pt-PT'], rm: ['rm'], ro: ['ro'], ru: ['ru-RU'], si: ['si-LK'], sk: ['sk'], sl: ['sl'],
  sq: ['sq'], sr: ['sr'], sv: ['sv-SE'], sw: ['sw'], ta: ['ta-IN'], te: ['te-IN'], th: ['th'], tr: ['tr-TR'], uk: ['uk'],
  ur: ['ur'], vi: ['vi'], 'zh-Hans': ['zh-CN'], 'zh-Hant': ['zh-TW', 'zh-HK'], zu: ['zu'],
};

const DIR = new URL('.', import.meta.url).pathname;
const EN = JSON.parse(readFileSync(`${DIR}en.json`, 'utf8'));
/** A language's store text; missing fields fall back to English (en-GB & co. only override keywords). */
export function text(lang) {
  const f = `${DIR}${lang}.json`;
  return existsSync(f) ? { ...EN, ...JSON.parse(readFileSync(f, 'utf8')) } : null;
}

const SITE = 'https://ambodo-api.onrender.com';
export const SUPPORT_URL = `${SITE}/support`;
export const PRIVACY_URL = `${SITE}/privacy`;
const links = (s) => `${s.termsLabel}: ${SITE}/terms\n${s.privacyLabel}: ${SITE}/privacy`;
export const appleDescription = (s) => `${s.body}\n\n${s.payApple}\n\n${links(s)}`;
export const playDescription = (s) => `${s.body}\n\n${s.payPlay}\n\n${links(s)}`;
