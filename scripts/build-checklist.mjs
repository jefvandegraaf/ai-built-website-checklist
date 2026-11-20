#!/usr/bin/env node
// Regenerates CHECKLIST.md from lib/checks.mjs, so the human list and the scripts never drift.
// Usage: node scripts/build-checklist.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKS, PHASES } from '../lib/checks.mjs';

const HOW = { url: 'check-url', source: 'check-source', layout: 'check-layout', speed: 'check-speed', manual: 'you' };
const out = [];
out.push('# The AI-Built Website Launch Checklist', '');
out.push('Every item has a reason and a copy-paste prompt you can give Claude Code to fix it. "Checked by" shows which script tests it automatically; "you" means it needs a human.', '');
out.push('Run the automated checks with `node scripts/audit.mjs --url https://yourdomain.com --dir ../your-project`, or open this folder in Claude Code and say *"Audit my website."*', '');
out.push('> This file is generated from `lib/checks.mjs` by `node scripts/build-checklist.mjs`. Edit the source, not this file.', '');

for (const [phase, heading] of Object.entries(PHASES)) {
  out.push(`## ${heading}`, '');
  for (const c of Object.values(CHECKS).filter((x) => x.phase === phase)) {
    out.push(`### ☐ ${c.title}`);
    out.push(`*Checked by: ${c.how.map((h) => HOW[h]).join(', ')}*`, '');
    out.push(c.why, '');
    out.push('<details><summary>Fix it with Claude</summary>', '', '```', c.fix, '```', '', '</details>', '');
  }
}

out.push('## Phase 3: The first 30 days', '');
out.push('Google takes days to weeks to crawl a new site. Use this window to make sure it\'s finding everything.', '');
for (const [t, d] of [
  ['Week 1: sitemap read, pages discovered', 'In Google Search Console → Sitemaps, the status says "Success" and the discovered count matches your page count. Fix any "Couldn\'t fetch".'],
  ['Week 1: request indexing for your money pages', 'Use URL Inspection → Request indexing on your home page, services page and each service page. Don\'t spam it; once per page is enough.'],
  ['Week 2: check "Pages" for problems', 'GSC → Pages → "Why pages aren\'t indexed". "Discovered – currently not indexed" on a new site is normal at first. "Excluded by noindex", "Not found (404)" and "Duplicate without user-selected canonical" are not.'],
  ['Week 2: first impressions', 'GSC → Performance. Any impressions at all means Google is testing you. Note which queries show up, even at position 50.'],
  ['Week 3: Google Business Profile', 'Add photos, services, and a first post. Ask your three happiest recent customers for a review, with a direct link.'],
  ['Week 4: re-run this audit', 'Run `node scripts/audit.mjs` again. Changes made since launch are where new problems sneak in.'],
  ['Week 4: first real decisions', 'Pages with impressions but no clicks need better titles and descriptions. Pages with no impressions at all after 30 days need better content, internal links, or a merge.'],
]) out.push(`### ☐ ${t}`, d, '');

out.push('## After that: ongoing growth', '');
out.push('Striking-distance keywords, low-CTR rewrites, cannibalisation, 90-day pruning and scheduled reports are covered by the free [Claude GSC SEO Command Center](https://github.com/jefvandegraaf/claude-gsc-seo-command-center): a weekly report and Monday email with fix prompts.', '');
out.push('---', '', 'Made by [Jef van de Graaf](https://jefvandegraaf.com/ai-website-launch-checklist/). Content licensed CC BY 4.0, code MIT.');

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, '..', 'CHECKLIST.md'), out.join('\n') + '\n');
console.log('CHECKLIST.md written.');
