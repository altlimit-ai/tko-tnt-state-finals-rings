// Reads the current rings from EventXpres and writes the site to the folder given as argv[2].
// Any bad read exits non-zero, so the workflow skips the deploy and the last good site stays up.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const API = 'https://www.eventxpres.com/api/competitorRankings?EventId=3327&ActionId=';
// Only what the page shows. The event record also holds contact and payment fields, which stay behind.
const FIELDS = ['disciplineName', 'divisionID2', 'divisionName', 'style', 'ringDay', 'ringTime', 'ringDesc', 'ageDisplay', 'level', 'genders', 'divState', 'divisionCount'];

async function feed(action) {
  const r = await fetch(API + action, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${action} answered ${r.status}`);
  return r.json();
}

const [divs, ev] = await Promise.all([feed('DivList'), feed('Events').catch(() => null)]);
if (!Array.isArray(divs) || !divs.length || !divs.every((d) => d && d.ringDesc && d.divisionName)) {
  throw new Error('feed returned no usable divisions');
}
const data = {
  fetchedAt: Date.now(),
  event: ev && ev.eventTitle ? { title: ev.eventTitle, start: ev.eventStart, end: ev.eventEnd, city: ev.eventCity, state: ev.eventState } : null,
  divisions: divs.map((d) => Object.fromEntries(FIELDS.map((f) => [f, d[f]]))),
};

const src = (name) => readFileSync(new URL('src/' + name, import.meta.url), 'utf8');
const page = (liveUrl) => src('page.html')
  .replace('__CSS__', () => src('style.css'))
  .replace('__SNAPSHOT__', () => JSON.stringify(data).replaceAll('<', '\\u003c'))
  .replace('__APP__', () => src('app.js').replace('__LIVE_URL__', liveUrl));

const out = process.argv[2];
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/index.html`, page('data.json'));
writeFileSync(`${out}/data.json`, JSON.stringify(data));
// A copy to keep on a phone: no updates, clearly labelled as such. Not published.
if (process.argv[3]) writeFileSync(process.argv[3], page(''));
console.log(`${data.divisions.length} events`);
