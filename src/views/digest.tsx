import type { DigestResult } from '../digest/types.js';

export function Digest({ night, digest }: { night: string; digest: DigestResult }) {
  return (
    <>
      <h1>morning digest · {night}</h1>
      {digest.badLines > 0 && <p class="warn">Malformed log lines: {digest.badLines}</p>}
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">job</th>
              <th scope="col">owner</th>
              <th scope="col">runs</th>
              <th scope="col">retries</th>
              <th scope="col">last status</th>
              <th scope="col">last error</th>
              <th scope="col">first run</th>
              <th scope="col">last run</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr>
                <th scope="row">{row.job}</th>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td>{row.retries >= 3 ? <strong class="warn">{row.retries}</strong> : row.retries}</td>
                <td>{row.lastStatus === 'fail' ? <strong class="warn">fail</strong> : row.lastStatus}</td>
                <td>{row.lastError ?? '—'}</td>
                <td><time dateTime={row.firstAt}>{row.firstAt}</time></td>
                <td><time dateTime={row.lastAt}>{row.lastAt}</time></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
