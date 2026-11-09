import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestResult } from '../src/digest/types.js';

const night = '2026-10-28';
const at = '2026-10-28T23:00:02+01:00';
const pagePath = '/digest/' + night;
const jsonPath = '/api/digest/' + night;
const runLine = (job: string) => JSON.stringify({ at, job, status: 'ok', owner: null });

describe('digest routes', () => {
  let runsDir: string;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
    app = createApp({ adapter: 'shim', installed: at, beatEverySeconds: 60, runsDir });
  });

  afterEach(() => rmSync(runsDir, { recursive: true, force: true }));

  it('serves the same jobs in order as HTML and JSON', async () => {
    writeFileSync(join(runsDir, night + '.jsonl'), [runLine('z-job'), runLine('a-job')].join('\n'));

    const [page, json] = await Promise.all([app.request(pagePath), app.request(jsonPath)]);
    expect(page.status).toBe(200);
    expect(json.status).toBe(200);

    const html = await page.text();
    const digest: DigestResult = await json.json();
    const htmlJobs = Array.from(html.matchAll(/<th scope="row">([^<]+)<\/th>/g), (match) => match[1]);
    expect(digest.rows.map((row) => row.job)).toEqual(['a-job', 'z-job']);
    expect(htmlJobs).toEqual(digest.rows.map((row) => row.job));
  });

  it('returns 404 from both routes if the night is missing', async () => {
    const [page, json] = await Promise.all([app.request(pagePath), app.request(jsonPath)]);
    expect(page.status).toBe(404);
    expect(json.status).toBe(404);
  });

  it('serves an empty night from both routes', async () => {
    writeFileSync(join(runsDir, night + '.jsonl'), '');

    const [page, json] = await Promise.all([app.request(pagePath), app.request(jsonPath)]);
    expect(page.status).toBe(200);
    expect(json.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    expect(await json.json()).toMatchObject({ rows: [], badLines: 0 });
  });

  it('keeps serving valid rows when a line is malformed', async () => {
    writeFileSync(join(runsDir, night + '.jsonl'), ['{truncated', runLine('good-job')].join('\n'));

    const [page, json] = await Promise.all([app.request(pagePath), app.request(jsonPath)]);
    expect(page.status).toBe(200);
    expect(json.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('Malformed log lines: 1');
    expect(html).toContain('good-job');
    expect(await json.json()).toMatchObject({ rows: [{ job: 'good-job' }], badLines: 1 });
  });
});
