// Preview metadata for the custody patterns the API understands (server/custody.mjs).
export const PATTERNS = [
  { key: '2-2-3', name: '2-2-3', blurb: 'Both homes every week, short stretches', seq: 'AABBAAABBAABBB' },
  { key: 'week-on-week-off', name: 'Week on, week off', blurb: 'Fewer handoffs, longer stays', seq: 'AAAAAAABBBBBBB' },
  { key: '2-2-5-5', name: '2-2-5-5', blurb: 'Same weekdays, alternating weekends', seq: 'AABBAAAAABBBBB' },
  { key: '3-4-4-3', name: '3-4-4-3', blurb: 'Balanced, rotating midweek', seq: 'AAABBBBAAAABBB' },
  { key: 'every-other-weekend', name: 'Every other weekend', blurb: 'One main home, weekends shared', seq: 'AAAABBBAAAAAAA' },
] as const;

export const patternName = (key: string) => PATTERNS.find((p) => p.key === key)?.name ?? key;
