// Language packs: the English in t()/tn()/rich() calls (plus the API's messages) is the source of truth.
//   node scripts/i18n.mjs              check every pack: missing, stale, broken {placeholders}
//   node scripts/i18n.mjs todo <dir>   write <dir>/source.json, notes.json and <lang>.todo.json for what's missing
//   node scripts/i18n.mjs merge <dir>  fold <dir>/<lang>.json ({ id: translation }) into src/locales/<lang>.json
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const APP = new URL('..', import.meta.url).pathname;
const SERVER = join(APP, '../server');
const LOCALES = join(APP, 'src/locales');

// Context for English that is short or ambiguous on its own. Keyed by the English (with "ctx|" when it has one).
const NOTES = {
  Kind: 'label above the event categories (school, health…): means type/category',
  Open: 'expense status: not settled yet (adjective)',
  Settled: 'expense status: paid back',
  Handoff: 'the moment the kids move from one parent’s home to the other’s',
  'Handoff log': 'list of logged drop-offs and pick-ups of the kids',
  'Dropped off': 'button/log entry: I dropped the kids off with the other parent',
  'Picked up': 'button/log entry: I picked the kids up from the other parent',
  Talk: 'tab name for the messaging screen between co-parents',
  Family: 'tab name for the family settings screen',
  Today: 'tab name and “today” as a day',
  Me: 'choice chip: me (the person using the app)',
  Starts: 'label: the date the custody schedule starts',
  Sealed: 'messages are cryptographically sealed (tamper-evident), not hidden',
  SEALED: 'badge: messages are cryptographically sealed (tamper-evident). Keep it short, all caps where the script has case',
  'with {name}': 'big text after “TODAY THE KIDS ARE”: the kids are at {name}’s home',
  'with you': 'big text after “TODAY THE KIDS ARE”: the kids are with you',
  'talk|with {name}': 'subtitle under the Talk title: this conversation is with {name}',
  'Kids with': 'table column: which parent has the kids on those days',
  'Kids with {name}': 'the kids are at {name}’s home on those days (also used in calendar apps)',
  Swaps: 'swap requests: trading custody days between parents',
  'Swap days': 'button: ask to trade custody days',
  pending: 'swap request status, lower case', accepted: 'swap request status, lower case', declined: 'swap request status, lower case',
  'TONE · CALM': 'ToneGuard badge on a message draft', 'TONE · TENSE': 'ToneGuard badge on a message draft',
  'TONE · HEATED': 'ToneGuard badge on a message draft', 'TONEGUARD ON': 'ToneGuard is the feature’s brand name: keep it',
  'Up late': 'greeting between midnight and 5am, followed by “, {name}”',
  'Name, then return': 'placeholder: type the name, then press the return key',
  'Maple Elementary · Ms. Lee': 'placeholder example: swap in a typical local school and teacher name',
  'Dr. Okafor · 555-0134': 'placeholder example: a typical local doctor name and phone number',
  'Shoes 13 · Shirt 6': 'placeholder example: kids’ sizes in the local sizing system',
  'Soccer cleats, school trip…': 'placeholder example of kid expenses',
  '{n} open': 'count of open (unsettled) expenses',
  'BALANCE': 'all caps label above the money balance',
  'Apple Account': 'only used as {store} in “Billed to your {store}…” on iPhone: Apple’s own term for the language (what iPhone Settings shows), in the form that sentence needs',
  'Google Play account': 'only used as {store} in “Billed to your {store}…” on Android, in the form that sentence needs',
  'Sign in to your Apple Account in Settings, then try again.': 'iPhone only: use Apple’s own words for “Apple Account” and for the Settings app',
};

const languages = () => readdirSync(LOCALES).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
const readPack = (l) => JSON.parse(readFileSync(join(LOCALES, `${l}.json`), 'utf8'));
const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const files = (dir) => readdirSync(dir, { recursive: true }).map(String).filter((f) => /\.(tsx?|mjs)$/.test(f) && !/\.test\./.test(f)).map((f) => join(dir, f));

function literals(node) {
  if (!node) return [];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isConditionalExpression(node)) return [...literals(node.whenTrue), ...literals(node.whenFalse)];
  if (ts.isBinaryExpression(node) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind)) return literals(node.right);
  if (ts.isParenthesizedExpression(node)) return literals(node.expression);
  return [];
}

/** Every English string the app can show, with where it came from. */
export function collect() {
  const keys = new Map();
  const add = (k, where) => { if (k && !keys.has(k)) keys.set(k, where); };
  const walk = (file, server) => {
    const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const [a, b, c] = n.arguments;
        const fn = n.expression.text;
        const where = file.replace(APP, '').replace(SERVER, 'server');
        if (!server && fn === 't') {
          const ctx = literals(c)[0];
          for (const s of literals(a)) add(ctx ? `${ctx}|${s}` : s, where);
        }
        if (!server && fn === 'tn') [...literals(b), ...literals(c)].forEach((s) => add(s, where));
        if (!server && fn === 'rich') literals(a).forEach((s) => add(s, where));
        if (server && fn === 'fail') literals(b).forEach((s) => add(s, where));
        // Validation labels that start lower-case ('from', 'to') are API plumbing the app never shows.
        if (server && fn === 'str') literals(b).filter((s) => /^[A-Z]/.test(s)).forEach((s) => add(`${s} is needed`, where));
        if (server && fn === 'day') literals(b).filter((s) => /^[A-Z]/.test(s)).forEach((s) => add(`${s} must be YYYY-MM-DD`, where));
      }
      if (server && ts.isPropertyAssignment(n) && n.name.getText(src) === 'error') literals(n.initializer).forEach((s) => add(s, 'server'));
      ts.forEachChild(n, visit);
    };
    visit(src);
  };
  files(join(APP, 'src')).forEach((f) => walk(f, false));
  walk(join(SERVER, 'index.mjs'), true);
  return keys;
}

function problems(pack, keys) {
  const missing = [...keys.keys()].filter((k) => !pack[k]);
  const broken = [...keys.keys()].filter((k) => pack[k] && holes(pack[k]) !== holes(k.replace(/^[^|]*\|/, '')));
  const stale = Object.keys(pack).filter((k) => !keys.has(k));
  return { missing, broken, stale };
}

// The calendar feed (server/custody.mjs) labels custody days itself, so it gets its own small table.
function writeServerTable() {
  const out = {};
  for (const l of languages()) {
    const p = readPack(l);
    if (p['Kids with {name}']) out[l] = { 'Kids with {name}': p['Kids with {name}'], 'Co-parent': p['Co-parent'] ?? 'Co-parent' };
  }
  writeFileSync(join(SERVER, 'ics-lang.json'), `${JSON.stringify(out, null, 1)}\n`);
}

const [mode = 'check', dir] = process.argv.slice(2);
const keys = collect();

if (mode === 'check') {
  const plugin = JSON.parse(readFileSync(join(APP, 'app.json'), 'utf8')).expo.plugins.find((p) => p[0] === 'expo-localization');
  const declared = new Set(plugin?.[1]?.supportedLocales ?? []);
  const packs = readFileSync(join(APP, 'src/lib/i18n.tsx'), 'utf8');
  let bad = 0;
  for (const l of languages()) {
    const { missing, broken, stale } = problems(readPack(l), keys);
    const notWired = !declared.has(l) || !packs.includes(`locales/${l}.json`);
    if (missing.length || broken.length || notWired) bad++;
    if (missing.length || broken.length || stale.length || notWired)
      console.log(`${l.padEnd(8)} missing ${missing.length}  broken ${broken.length}  stale ${stale.length}${notWired ? '  NOT WIRED (app.json / i18n.tsx)' : ''}`);
  }
  console.log(`${keys.size} strings · ${languages().length} languages · ${bad ? `${bad} need work` : 'all complete'}`);
  process.exit(bad ? 1 : 0);
}

if (mode === 'todo') {
  const ids = [...keys.keys()];
  const source = Object.fromEntries(ids.map((k, i) => [String(i + 1), k]));
  const notes = Object.fromEntries(ids.map((k, i) => [String(i + 1), NOTES[k]]).filter(([, n]) => n));
  writeFileSync(join(dir, 'source.json'), JSON.stringify(source, null, 1));
  writeFileSync(join(dir, 'notes.json'), JSON.stringify(notes, null, 1));
  for (const l of languages()) {
    const { missing, broken } = problems(readPack(l), keys);
    const need = new Set([...missing, ...broken]);
    if (need.size) writeFileSync(join(dir, `${l}.todo.json`), JSON.stringify(Object.fromEntries(ids.map((k, i) => [String(i + 1), k]).filter(([, k]) => need.has(k))), null, 1));
  }
  console.log(`wrote ${dir}/source.json (${ids.length} strings) and todo files`);
}

if (mode === 'merge') {
  const source = JSON.parse(readFileSync(join(dir, 'source.json'), 'utf8'));
  for (const l of languages()) {
    const f = join(dir, `${l}.json`);
    if (!existsSync(f)) continue;
    const pack = readPack(l);
    const got = JSON.parse(readFileSync(f, 'utf8'));
    const rejected = [];
    for (const [id, text] of Object.entries(got)) {
      const en = source[id];
      if (!en || typeof text !== 'string' || !text.trim()) { rejected.push(id); continue; }
      if (holes(text) !== holes(en.replace(/^[^|]*\|/, ''))) { rejected.push(id); continue; }
      pack[en] = text;
    }
    for (const k of Object.keys(pack)) if (!keys.has(k)) delete pack[k];
    const sorted = Object.fromEntries(Object.entries(pack).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(join(LOCALES, `${l}.json`), `${JSON.stringify(sorted, null, 1)}\n`);
    const { missing } = problems(sorted, keys);
    console.log(`${l.padEnd(8)} merged ${Object.keys(got).length - rejected.length}${rejected.length ? `  rejected ${rejected.join(',')}` : ''}${missing.length ? `  still missing ${missing.length}` : ''}`);
  }
  writeServerTable();
}
