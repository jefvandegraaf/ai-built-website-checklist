#!/usr/bin/env node
// Runs Google PageSpeed Insights (Lighthouse + real-user Chrome data) on your pages, phone and desktop.
// Usage: node scripts/check-speed.mjs https://yourdomain.com [--pages /,/contact/] [--json]
// Needs a free Google API key in practice (Google's keyless quota is usually used up). Create one
// (https://developers.google.com/speed/docs/insights/v5/get-started) and set it as the
// PSI_API_KEY environment variable. Never paste the key into a file in your project.
import { pathToFileURL } from 'node:url';
import { result, parseArgs, normaliseUrl, printSummary } from '../lib/util.mjs';

const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const FIELD = { LARGEST_CONTENTFUL_PAINT_MS: ['LCP', (v) => `${(v / 1000).toFixed(1)}s`], INTERACTION_TO_NEXT_PAINT: ['INP', (v) => `${v}ms`], CUMULATIVE_LAYOUT_SHIFT_SCORE: ['CLS', (v) => (v / 100).toFixed(2)] };

async function psi(url, strategy) {
  const q = new URLSearchParams({ url, strategy });
  for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) q.append('category', c);
  if (process.env.PSI_API_KEY) q.set('key', process.env.PSI_API_KEY);
  try {
    const r = await fetch(`${API}?${q}`, { signal: AbortSignal.timeout(120000) });
    const j = await r.json();
    if (!r.ok) return { error: `${r.status} ${j.error?.message?.split('.')[0] || ''}`.trim() };
    return j;
  } catch (e) { return { error: e.name === 'TimeoutError' ? 'timed out' : String(e) }; }
}

export async function run({ url, pages = ['/'] } = {}) {
  const R = [];
  const add = (status, detail) => R.push(result('speed', status, detail, 'speed'));
  const base = normaliseUrl(url);
  for (const p of pages) {
    const target = new URL(p, base).href;
    const path = new URL(target).pathname;
    for (const strategy of ['mobile', 'desktop']) {
      const j = await psi(target, strategy);
      if (j.error) {
        add('skip', `${path} (${strategy}): PageSpeed Insights failed: ${j.error}${/429|quota/i.test(j.error) ? '. Google limits runs without an API key. Set PSI_API_KEY (free) and try again.' : ''}`);
        continue;
      }
      const cats = j.lighthouseResult?.categories || {};
      const score = (k) => Math.round((cats[k]?.score ?? 0) * 100);
      const perf = score('performance');
      const field = j.loadingExperience?.metrics || {};
      const fieldTxt = Object.entries(FIELD).filter(([k]) => field[k]).map(([k, [n, f]]) => `${n} ${f(field[k].percentile)} (${field[k].category.toLowerCase()})`);
      const audits = j.lighthouseResult?.audits || {};
      const opps = Object.values(audits)
        .filter((a) => a.details?.type === 'opportunity' && (a.details.overallSavingsMs > 100 || a.details.overallSavingsBytes > 20000) && a.score !== null && a.score < 0.9)
        .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
        .slice(0, 5)
        .map((a) => `${a.title}${a.details.overallSavingsMs ? ` (~${(a.details.overallSavingsMs / 1000).toFixed(1)}s)` : ''}`);
      const lab = ['largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift'].map((k) => audits[k]?.displayValue && `${audits[k].title.replace('Largest Contentful Paint', 'LCP').replace('Total Blocking Time', 'TBT').replace('Cumulative Layout Shift', 'CLS')} ${audits[k].displayValue}`).filter(Boolean);
      const status = perf >= 90 ? 'pass' : perf >= 50 ? 'warn' : 'fail';
      add(status, [
        `${path} (${strategy}): Performance ${perf} · Accessibility ${score('accessibility')} · Best practices ${score('best-practices')} · SEO ${score('seo')}`,
        `  Lab: ${lab.join(', ')}`,
        fieldTxt.length ? `  Real visitors (Chrome, last 28 days): ${fieldTxt.join(', ')}` : '  Real visitors: not enough Chrome traffic yet (normal for new or small sites).',
        opps.length ? `  Biggest wins: ${opps.join('; ')}` : '',
      ].filter(Boolean).join('\n'));
    }
  }
  return R;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (!args._[0]) { console.error('Usage: node scripts/check-speed.mjs https://yourdomain.com [--pages /,/contact/] [--json]'); process.exit(2); }
  const res = await run({ url: args._[0], pages: args.pages ? String(args.pages).split(',') : ['/'] });
  if (args.json) console.log(JSON.stringify(res, null, 2));
  else { printSummary(res, `PageSpeed: ${args._[0]}`); for (const r of res) console.log(`\n${r.detail}`); }
}
