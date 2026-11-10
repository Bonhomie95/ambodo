// ToneGuard: instant, on-device check before a message goes on the record.
// ponytail: keyword heuristics; swap `checkTone` for an LLM call when you want nuance.

export type Tone = { level: 'calm' | 'tense' | 'heated'; issues: string[]; calmer: string };

const RULES: [RegExp, string][] = [
  [/\byou (always|never)\b/i, '"Always/never" reads as an attack'],
  [/\b(stupid|idiot|liar|pathetic|useless|crazy|psycho|loser|bitch|asshole|bastard|dumb)\b/i, 'Name-calling'],
  [/\b(your fault|because of you|thanks to you|you ruined)\b/i, 'Blame lands hard'],
  [/\b(whatever|i don'?t care|grow up|get a life|shut up|deal with it)\b/i, 'Sounds dismissive'],
  [/\b(or else|you'?ll regret|see you in court|my lawyer will)\b/i, 'Sounds like a threat'],
  [/\b(ridiculous|absurd|unbelievable|insane|unacceptable|disgusting|a joke)\b/i, 'Judging words sting — say how it feels'],
  [/[!?]{3,}|!{2,}/, 'Stacked punctuation'],
];

const SWAPS: [RegExp, string][] = [
  [/\byou always\b/gi, 'it often feels like you'],
  [/\byou never\b/gi, 'it would really help if you'],
  [/\b(this is |it'?s |it is )?(all )?(your fault|because of you|thanks to you)\b/gi, "let's figure this out together"],
  [/\b(stupid|idiot|liar|pathetic|useless|crazy|psycho|loser|bitch|asshole|bastard|dumb)\b\s*/gi, ''],
  [/\b(whatever|i don'?t care|grow up|get a life|shut up|deal with it)\b[.,!]*\s*/gi, ''],
  [/\b(or else|you'?ll regret it|see you in court)\b/gi, "let's sort this out"],
  [/\b(this|that|it|you)( is|'s|'re| are) (so |just |completely |totally )?(ridiculous|absurd|unbelievable|insane|unacceptable|disgusting|a joke)\b/gi, "I'm frustrated"],
  [/[!?]*\?[!?]*/g, '?'],
  [/!+/g, '.'],
];

export function checkTone(text: string): Tone {
  const issues = RULES.filter(([re]) => re.test(text)).map(([, why]) => why);
  const shouty = text.split(/\s+/).filter((w) => w.length > 2 && /[A-Z]/.test(w) && w === w.toUpperCase()).length;
  if (shouty >= 2) issues.push('All caps reads as yelling');

  let calmer = text.replace(/\b[A-Z]{3,}\b/g, (w) => w.toLowerCase());
  for (const [re, to] of SWAPS) calmer = calmer.replace(re, to);
  calmer = calmer.replace(/\s{2,}/g, ' ').replace(/\s+([.,?])/g, '$1').replace(/[,;]+([.?])/g, '$1').trim();
  calmer = calmer.replace(/(^|[.?!]\s+)([a-z])/g, (_, p: string, ch: string) => p + ch.toUpperCase());

  return { level: issues.length === 0 ? 'calm' : issues.length === 1 ? 'tense' : 'heated', issues, calmer };
}
