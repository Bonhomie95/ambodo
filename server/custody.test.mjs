import test from 'node:test';
import assert from 'node:assert/strict';
import { custodyFor, chainHash, icsFeed } from './custody.mjs';

const fam = (pattern, overrides = {}) => ({
  schedule: { pattern, anchor: '2026-11-09', first: 'A' }, members: ['A', 'B'], overrides,
});
const run = (f, from, to) => custodyFor(f, from, to).map((d) => d.parent[0]).join('');

test('patterns repeat every 14 days from the anchor', () => {
  assert.equal(run(fam('2-2-3'), '2026-11-09', '2026-11-22'), 'AABBAAABBAABBB');
  assert.equal(run(fam('2-2-3'), '2026-11-23', '2026-11-24'), 'AA');
  assert.equal(run(fam('every-other-weekend'), '2026-11-09', '2026-11-15'), 'AAAABBB');
});

test('days before the anchor wrap correctly', () => {
  assert.equal(run(fam('week-on-week-off'), '2026-11-02', '2026-11-08'), 'BBBBBBB');
});

test('accepted swaps override the pattern', () => {
  assert.equal(run(fam('week-on-week-off', { '2026-11-10': 'B' }), '2026-11-09', '2026-11-11'), 'ABA');
});

test('second parent not joined yet → null', () => {
  const f = { ...fam('week-on-week-off'), members: ['A'] };
  assert.equal(custodyFor(f, '2026-11-16', '2026-11-16')[0].parent, null);
});

test('chain hash changes if any field changes', () => {
  const h = chainHash('g', 'A', '2026-11-10T10:00:00.000Z', 'hi');
  assert.equal(h, chainHash('g', 'A', new Date('2026-11-10T10:00:00.000Z'), 'hi'));
  assert.notEqual(h, chainHash('g', 'A', '2026-11-10T10:00:00.000Z', 'hi!'));
  assert.notEqual(h, chainHash('x', 'A', '2026-11-10T10:00:00.000Z', 'hi'));
});

test('ics feed groups custody into blocks', () => {
  const ics = icsFeed(fam('week-on-week-off'), { A: 'Ada', B: 'Bo' }, [{ _id: 'e1', date: '2026-11-12', title: 'Recital, 6pm' }],
    Date.parse('2026-11-10T12:00:00Z'));
  assert.match(ics, /SUMMARY:Kids with Ada/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261109\r\nDTEND;VALUE=DATE:20261116/);
  assert.match(ics, /SUMMARY:Recital\\, 6pm/);
});
