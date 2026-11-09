import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunStatus } from './types.js';

type Run = {
  at: string;
  job: string;
  owner: string | null;
  status: RunStatus;
  error?: string;
};

function parseRun(line: string): Run | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }

  if (typeof value !== 'object' || value === null) return null;
  const { at, job, owner, status, error } = value as Record<string, unknown>;
  if (
    typeof at !== 'string' ||
    typeof job !== 'string' ||
    (owner !== null && typeof owner !== 'string') ||
    (status !== 'ok' && status !== 'retry' && status !== 'fail') ||
    (error !== undefined && typeof error !== 'string')
  ) {
    return null;
  }

  return { at, job, owner, status, error };
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;

  let contents: string;
  try {
    contents = readFileSync(join(runsDir, night + '.jsonl'), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  const rows = new Map<string, DigestRow>();
  const counts = { ok: 0, retry: 0, fail: 0 };
  let badLines = 0;
  const lines = contents === '' ? [] : contents.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  for (const line of lines) {
    const run = parseRun(line);
    if (run === null) {
      badLines++;
      continue;
    }

    counts[run.status]++;
    const previous = rows.get(run.job);
    rows.set(run.job, {
      job: run.job,
      owner: run.owner,
      runs: (previous?.runs ?? 0) + 1,
      retries: (previous?.retries ?? 0) + Number(run.status === 'retry'),
      lastStatus: run.status,
      lastError: run.error ?? previous?.lastError ?? null,
      firstAt: previous?.firstAt ?? run.at,
      lastAt: run.at,
    });
  }

  return {
    rows: [...rows.values()].sort((a, b) => a.job.localeCompare(b.job, 'en')),
    badLines,
    counts,
  };
};
