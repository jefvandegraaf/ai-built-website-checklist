#!/usr/bin/env node
// IndexNow: tell Bing, Yandex, Naver, Seznam and Yep (and through Bing: ChatGPT search, Copilot, DuckDuckGo)
// that pages are new or changed. Google does NOT use IndexNow; see CHECKLIST.md for the Google step.
//
// One-time setup (creates the key file in the folder your host publishes):
//   node scripts/indexnow.mjs setup --publish ../my-site/site
//   → deploy, so https://yourdomain.com/<key>.txt is live
//
// After publishing or updating pages:
//   node scripts/indexnow.mjs submit --site https://yourdomain.com --publish ../my-site/site      (pages changed in the last 7 days, from sitemap lastmod)
//   node scripts/indexnow.mjs submit --site https://yourdomain.com --urls https://yourdomain.com/new-page/
//   node scripts/indexnow.mjs submit --site https://yourdomain.com --all                          (every sitemap URL; for launch day only)
// Options: --key <key> (or env INDEXNOW_KEY) instead of --publish, --days 7, --dry-run
//
// The key isn't a password. It's public by design (anyone can read <key>.txt); it proves you control the site.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { get, parseArgs, normaliseUrl, UA } from '../lib/util.mjs';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const RESPONSES = {
  200: 'Accepted. Search engines have the URLs.',
  202: 'Received. The key is still being checked; this is normal on the first submission.',
  400: 'Bad request: the URL list or format is invalid.',
  403: 'Key rejected: the key file isn\'t live at the keyLocation, or its contents don\'t match.',
  422: 'Rejected: some URLs don\'t belong to this host, or the key doesn\'t match the host.',
  429: 'Too many requests. Submit only changed pages, and try again later.',
};

function findKey(publish) {
  if (!publish) return null;
  const dir = resolve(publish);
  if (!existsSync(dir)) return null;
  for (const f of readdirSync(dir)) {
    const m = f.match(/^([a-f0-9]{8,128})\.txt$/i);
    if (m && readFileSync(join(dir, f), 'utf8').trim() === m[1]) return m[1];
  }
  return null;
}

async function sitemapUrls(origin) {
  const robots = await get(`${origin}/robots.txt`, { redirect: 'follow' });
  const maps = [...(robots.body || '').matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]);
  if (!maps.length) maps.push(`${origin}/sitemap.xml`);
  const out = [];
  const queue = [...maps];
  for (let i = 0; i < queue.length && i < 25; i++) {
    const r = await get(queue[i], { redirect: 'follow' });
    const body = r.body || '';
    if (/<sitemapindex/i.test(body)) { queue.push(...[...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])); continue; }
    for (const u of body.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
      const loc = u[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/i)?.[1];
      const lastmod = u[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i)?.[1];
      if (loc) out.push({ loc: loc.replace(/&amp;/g, '&'), lastmod: lastmod ? new Date(lastmod) : null });
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];

// Return an exit code instead of calling process.exit(): on Windows, exiting while fetch sockets close can crash Node.
async function main() {
  if (cmd === 'setup') {
    if (!args.publish) { console.error('Give the folder your host publishes: --publish ../my-site/site'); return (2); }
    const existing = findKey(args.publish);
    if (existing) { console.log(`Already set up: ${existing}.txt is in ${args.publish}. Nothing changed.`); return (0); }
    const key = randomBytes(16).toString('hex');
    writeFileSync(join(resolve(args.publish), `${key}.txt`), key);
    console.log(`Created ${key}.txt in ${args.publish}.\nNext: commit and deploy, then check https://yourdomain.com/${key}.txt shows the key.\nThen run: node scripts/indexnow.mjs submit --site https://yourdomain.com --publish ${args.publish} --all`);
    return (0);
  }

  if (cmd !== 'submit') {
    console.error('Usage:\n  node scripts/indexnow.mjs setup --publish <publish-folder>\n  node scripts/indexnow.mjs submit --site https://yourdomain.com [--publish <folder> | --key <key>] [--urls a,b | --all | --days 7] [--dry-run]');
    return (2);
  }

  if (!args.site) { console.error('Missing --site https://yourdomain.com'); return (2); }
  const site = new URL(normaliseUrl(args.site));
  const key = args.key || process.env.INDEXNOW_KEY || findKey(args.publish);
  if (!key) { console.error('No key found. Run "setup" first, or pass --publish <folder> (where <key>.txt lives) or --key.'); return (2); }
  const keyLocation = `${site.origin}/${key}.txt`;

  // 1. The key file must be live, or every engine rejects the submission.
  const kf = await get(keyLocation, { redirect: 'follow' });
  if (kf.status !== 200 || kf.body.trim() !== key) {
    console.error(`✗ ${keyLocation} returns ${kf.status || kf.error}${kf.status === 200 ? ' but its contents don\'t match the key' : ''}. Deploy the key file first.`);
    return (1);
  }
  console.log(`✓ Key file is live: ${keyLocation}`);

  // 2. Which URLs?
  let urls;
  if (args.urls) urls = String(args.urls).split(',').map((u) => u.trim()).filter(Boolean).map((u) => new URL(u, site).href);
  else {
    const all = await sitemapUrls(site.origin);
    if (!all.length) { console.error('✗ No URLs found in the sitemap. Pass --urls instead.'); return (1); }
    if (args.all) urls = all.map((u) => u.loc);
    else {
      const days = Number(args.days || 7);
      const since = Date.now() - days * 864e5;
      const dated = all.filter((u) => u.lastmod);
      if (!dated.length) { console.error('✗ The sitemap has no <lastmod> dates, so I can\'t tell what changed. Pass --urls for the new pages (or --all on launch day).'); return (1); }
      urls = dated.filter((u) => u.lastmod.getTime() >= since).map((u) => u.loc);
      if (!urls.length) { console.log(`Nothing changed in the last ${days} day(s), going by sitemap <lastmod>. Nothing submitted.`); return (0); }
    }
  }
  const foreign = urls.filter((u) => new URL(u).host !== site.host);
  if (foreign.length) { console.error(`✗ These aren't on ${site.host}: ${foreign.slice(0, 3).join(', ')}`); return (1); }
  urls = [...new Set(urls)].slice(0, 10000);

  console.log(`${args['dry-run'] ? 'Would submit' : 'Submitting'} ${urls.length} URL(s):\n  ${urls.slice(0, 15).join('\n  ')}${urls.length > 15 ? `\n  …and ${urls.length - 15} more` : ''}`);
  if (args['dry-run']) return (0);

  // 3. Submit.
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8', 'user-agent': UA },
    body: JSON.stringify({ host: site.host, key, keyLocation, urlList: urls }),
    signal: AbortSignal.timeout(30000),
  }).catch((e) => ({ status: 0, statusText: String(e) }));
  console.log(`${res.status === 200 || res.status === 202 ? '✓' : '✗'} ${res.status} ${RESPONSES[res.status] || res.statusText || ''}`);
  console.log('\nGoogle doesn\'t use IndexNow. For new pages you care about, also open Google Search Console → URL Inspection → paste the URL → Request indexing.');
  return (res.status === 200 || res.status === 202 ? 0 : 1);
}

process.exitCode = await main();
