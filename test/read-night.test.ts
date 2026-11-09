import { expect, it } from 'vitest';
import { readNight } from '../src/digest/read-night.js';

it('aggregates the sample night and keeps reading through a malformed line', () => {
  const result = readNight('runs', '2026-10-28');
  expect(result?.badLines).toBe(1);
  expect(result?.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  expect(result?.rows.map((row) => row.job)).toEqual([
    'digest/render',
    'fixtures/refresh',
    'lane/sync',
    'notes/backup',
    'rig/rotate-logs',
  ]);
  expect(result?.rows[0]?.owner).toBeNull();
  expect(result?.rows[1]).toEqual({
    job: 'fixtures/refresh',
    owner: 'rook',
    runs: 4,
    retries: 3,
    lastStatus: 'ok',
    lastError: 'upstream 503',
    firstAt: '2026-10-29T01:30:00+01:00',
    lastAt: '2026-10-29T01:37:00+01:00',
  });
});

it('returns null for missing nights and rejects paths outside the runs directory', () => {
  expect(readNight('runs', '2026-01-01')).toBeNull();
  expect(readNight('runs', '../runs/2026-10-28')).toBeNull();
});
