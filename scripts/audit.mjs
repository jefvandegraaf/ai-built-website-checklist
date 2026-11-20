#!/usr/bin/env node
// Runs every check that applies and writes a Markdown report to reports/.
// Usage:
//   node scripts/audit.mjs --url https://yourdomain.com
//   node scripts/audit.mjs --dir ../my-business-website
//   node scripts/audit.mjs --url https://yourdomain.com --dir ../my-business-website --pages-dev https://project.pages.dev
// Options: --publish site  --max-pages 20  --no-layout  --no-speed  --out reports/custom.md
// Speed uses Google PageSpeed Insights; set PSI_API_KEY for regular use.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, markdownReport, summary, printSummary } from '../lib/util.mjs';
import { run as runUrl } from './check-url.mjs';
import { run as runSource } from './check-source.mjs';
import { run as runLayout } from './check-layout.mjs';
import { run as runSpeed } from './check-speed.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
if (!args.url && !args.dir) {
  console.error('Give me a site to check:\n  --url https://yourdomain.com   (live or staging site)\n  --dir ../your-project          (project folder on this computer)\nBoth together gives the fullest report.');
  process.exit(2);
}

const results = [];
const ran = [];
const maxPages = Number(args['max-pages'] || 20);

if (args.url) {
  console.log(`Checking ${args.url} over HTTP…`);
  results.push(...await runUrl({ url: args.url, pagesDev: args['pages-dev'], maxPages }));
  ran.push('check-url');
  if (!args['no-layout']) {
    console.log('Checking layout in a real browser (phone + desktop)…');
    results.push(...await runLayout({ url: args.url, maxPages: Math.min(maxPages, 8) }));
    ran.push('check-layout');
  }
  if (!args['no-speed']) {
    console.log('Running Google PageSpeed Insights on the home page (phone + desktop, about a minute)…');
    results.push(...await runSpeed({ url: args.url, pages: ['/'] }));
    ran.push('check-speed');
  }
}
if (args.dir) {
  console.log(`Checking project folder ${args.dir}…`);
  results.push(...await runSource({ dir: args.dir, publish: args.publish }));
  ran.push('check-source');
}

const target = args.url ? new URL(/^https?:/.test(args.url) ? args.url : `https://${args.url}`).host : basename(resolve(args.dir));
const date = new Date();
const out = args.out ? resolve(args.out) : join(here, '..', 'reports', `${target.replace(/[^a-z0-9.-]/gi, '_')}-${date.toISOString().slice(0, 10)}.md`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, markdownReport({ target: args.url || args.dir, results, ran, date }));

printSummary(results, 'Results');
const s = summary(results);
console.log(`\n${s.fail} to fix · ${s.warn} to review · ${s.pass} passed`);
console.log(`Full report with fix prompts: ${out}`);
process.exitCode = s.fail ? 1 : 0;
