#!/usr/bin/env node
// Checks a website project folder on disk. Zero dependencies, read-only.
// Usage: node scripts/check-source.mjs <project-folder> [--publish site] [--json]
//   --publish  the folder your host publishes (default: "site" if it exists, else the project folder itself)
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  result, tags, attr, meta, links, title, count, jsonLd, visibleText, findPlaceholders,
  DEFAULT_FAVICONS, BAD_HOSTS, LAYOUT_TRANSITION, parseArgs, printSummary,
} from '../lib/util.mjs';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', '.astro', '.cache', '.wrangler', '.vercel', '.netlify']);
const TEXT_EXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.md', '.svg', '.toml', '.yml', '.yaml', '']);
const PRIVATE_NAMES = /^(claude\.md|agents\.md|readme\.md|progress\.md|brand-context\.md|design-tokens\.md|\.env.*|package(-lock)?\.json|wrangler\.toml|\.gitignore|.*\.key|.*\.pem)$/i;
const SECRETS = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'],
  [/sk-(proj-)?[A-Za-z0-9]{32,}/, 'OpenAI-style API key'],
  [/sk_live_[A-Za-z0-9]{16,}/, 'Stripe live secret key'],
  [/rk_live_[A-Za-z0-9]{16,}/, 'Stripe restricted key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key (check it is restricted)'],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/re_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/, 'Resend API key'],
  [/(api[_-]?key|secret|password|passwd|token)\s*[:=]\s*["'][^"'\s]{12,}["']/i, 'hard-coded secret'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push({ path: p, size: s.size });
  }
  return out;
}

function lineOf(text, index) { return text.slice(0, index).split('\n').length; }

export async function run({ dir, publish } = {}) {
  const R = [];
  const add = (id, status, detail) => R.push(result(id, status, detail, 'source'));
  const root = resolve(dir);
  if (!existsSync(root)) { add('meta-basics', 'fail', `Folder not found: ${root}`); return R; }
  const pub = resolve(root, publish || (existsSync(join(root, 'site')) ? 'site' : '.'));
  const pubRel = relative(root, pub) || '.';
  const all = walk(root);
  const inPub = all.filter((f) => f.path.startsWith(pub));
  const rel = (p) => relative(root, p).replace(/\\/g, '/');
  const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
  const htmlFiles = inPub.filter((f) => /\.html?$/i.test(f.path));

  // ── private files inside the publish folder ──
  if (pubRel === '.') {
    const priv = inPub.filter((f) => PRIVATE_NAMES.test(basename(f.path)));
    add('exposed-files', priv.length ? 'warn' : 'pass', priv.length
      ? `The whole project is the publish folder, so these would be public unless your host's build output is a subfolder: ${priv.slice(0, 8).map((f) => rel(f.path)).join(', ')}`
      : 'No private-looking files found.');
  } else {
    const priv = inPub.filter((f) => PRIVATE_NAMES.test(basename(f.path)) || /\.md$/i.test(f.path));
    add('exposed-files', priv.length ? 'fail' : 'pass', priv.length ? `Private files inside ${pubRel}/: ${priv.map((f) => rel(f.path)).join(', ')}` : `Nothing private inside ${pubRel}/. Make sure your host's output directory is set to "${pubRel}".`);
  }

  // ── secrets (whole project, not just publish folder) ──
  for (const f of all) {
    const ext = extname(f.path).toLowerCase();
    const isEnv = /^\.env/i.test(basename(f.path));
    if (isEnv && f.path.startsWith(pub)) add('secrets', 'fail', `${rel(f.path)} is inside the publish folder.`);
    if ((!TEXT_EXT.has(ext) && !isEnv) || f.size > 2_000_000) continue;
    if (/(^|[\\/])(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(f.path)) continue;
    const text = read(f.path);
    for (const [re, label] of SECRETS) {
      const m = text.match(re);
      if (m && !/example|placeholder|your[_-]?key|xxxx/i.test(m[0])) {
        add('secrets', isEnv && !f.path.startsWith(pub) ? 'info' : 'fail', `${rel(f.path)}:${lineOf(text, m.index)} looks like a ${label}${isEnv ? ' (.env file: fine locally, never commit or publish it)' : ''}.`);
        break;
      }
    }
  }
  if (!R.some((r) => r.id === 'secrets')) add('secrets', 'pass', 'No API keys, tokens or private keys found.');

  // ── publish-folder housekeeping ──
  const has = (name) => existsSync(join(pub, name));
  add('not-found', has('404.html') ? 'pass' : 'fail', has('404.html') ? '404.html exists.' : 'No 404.html. On Cloudflare Pages, every missing URL will show your home page with a 200 status.');
  if (has('404.html') && !/noindex/i.test(meta(read(join(pub, '404.html')), 'robots') || '')) add('not-found', 'warn', '404.html has no noindex meta tag.');

  if (!has('robots.txt')) add('robots', 'fail', 'No robots.txt.');
  else {
    const rb = read(join(pub, 'robots.txt'));
    if (/user-agent\s*:\s*\*[\s\S]*?^\s*disallow\s*:\s*\/\s*$/im.test(rb)) add('robots', 'fail', 'robots.txt has "Disallow: /".');
    if (!/^\s*sitemap\s*:/im.test(rb)) add('robots', 'warn', 'robots.txt has no Sitemap: line.');
    const sm = rb.match(/^\s*sitemap\s*:\s*(\S+)/im)?.[1];
    if (sm && BAD_HOSTS.test(sm)) add('canonical', 'fail', `robots.txt Sitemap line is ${sm}`);
    if (!/disallow\s*:\s*\/cdn-cgi\//i.test(rb)) add('cdn-cgi', 'info', 'robots.txt has no "Disallow: /cdn-cgi/" (only matters on Cloudflare with email obfuscation).');
    if (!R.some((r) => r.id === 'robots')) add('robots', 'pass', 'robots.txt OK.');
  }

  if (!has('sitemap.xml')) add('sitemap', 'warn', 'No sitemap.xml in the publish folder (fine if your build generates one).');
  else {
    const sx = read(join(pub, 'sitemap.xml'));
    const locs = [...sx.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    const bad = locs.filter((l) => BAD_HOSTS.test(l));
    if (bad.length) add('canonical', 'fail', `sitemap.xml has ${bad.length} URL(s) on a wrong/placeholder host, e.g. ${bad[0]}`);
    const hosts = new Set(locs.map((l) => { try { return new URL(l).host; } catch { return l; } }));
    if (hosts.size > 1) add('sitemap', 'warn', `sitemap.xml mixes hosts: ${[...hosts].join(', ')}`);
    const pagesOnDisk = htmlFiles.filter((f) => !/404\.html?$/i.test(f.path)).length;
    add('sitemap', locs.length >= pagesOnDisk ? 'pass' : 'warn', `sitemap.xml lists ${locs.length} URL(s); ${pagesOnDisk} HTML page(s) on disk.`);
  }

  if (has('_headers')) {
    const hdr = read(join(pub, '_headers'));
    add('preview-noindex', /:project\.pages\.dev[\s\S]*?x-robots-tag\s*:\s*noindex/i.test(hdr) ? 'pass' : 'warn',
      /:project\.pages\.dev[\s\S]*?x-robots-tag\s*:\s*noindex/i.test(hdr) ? '_headers sets noindex on .pages.dev copies.' : '_headers exists but has no noindex rule for https://:project.pages.dev/*');
    const sec = ['x-content-type-options', 'referrer-policy', 'x-frame-options'].filter((h) => !new RegExp(h, 'i').test(hdr));
    add('security-headers', sec.length ? 'warn' : 'pass', sec.length ? `_headers is missing: ${sec.join(', ')}` : '_headers sets basic security headers.');
    const liveNoindex = hdr.split(/\n(?=\S)/).find((block) => /^\/\*/m.test(block.split('\n')[0]) && /x-robots-tag\s*:\s*noindex/i.test(block));
    if (liveNoindex) add('live-noindex', 'fail', '_headers sends noindex on /* (every page of your live site).');
  } else add('preview-noindex', 'warn', 'No _headers file. If you host on Cloudflare Pages, your .pages.dev copy can be indexed by Google.');

  if (has('_redirects')) {
    const rd = read(join(pub, '_redirects'));
    const invalid = rd.split('\n').filter((l) => !/^\s*#/.test(l) && /\s(301!|302!|404)\s*$/.test(l.trim() + ' '));
    add('redirects', invalid.length ? 'fail' : 'info', invalid.length ? `Cloudflare Pages silently ignores these lines (301!/404 aren't valid there): ${invalid.slice(0, 3).join(' | ')}` : `_redirects has ${rd.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).length} rule(s).`);
  }

  // favicons
  const iconFiles = inPub.filter((f) => /favicon|apple-touch-icon|icon\.(svg|png)/i.test(basename(f.path)));
  const defaults = inPub.filter((f) => DEFAULT_FAVICONS.test(basename(f.path)));
  if (defaults.length) add('favicon', 'warn', `Framework default icon files present: ${defaults.map((f) => rel(f.path)).join(', ')}`);

  // ── per HTML page ──
  let anyIcon = false; let anyApple = false; let anySchema = false; let anyPrivacy = false;
  const titles = new Map();
  for (const f of htmlFiles) {
    const html = read(f.path);
    const name = rel(f.path);
    const is404 = /404\.html?$/i.test(f.path);
    const ph = findPlaceholders(`${title(html) || ''} ${meta(html, 'description') || ''} ${visibleText(html)}`);
    if (ph.length) add('placeholders', ph.severe ? 'fail' : 'warn', `${name}: ${ph.join('; ')}`);
    if (is404) continue;
    if (/noindex/i.test(meta(html, 'robots') || '')) add('live-noindex', 'fail', `${name} has a noindex meta tag.`);
    const t = title(html); const d = meta(html, 'description'); const h1 = count(html, /<h1\b/gi);
    const problems = [];
    if (!t) problems.push('no <title>'); else if (t.length > 60) problems.push(`title is ${t.length} chars`);
    if (t) titles.set(t, [...(titles.get(t) || []), name]);
    if (!d) problems.push('no meta description'); else if (d.length > 160) problems.push(`description is ${d.length} chars`);
    if (h1 !== 1) problems.push(`${h1} <h1> tags`);
    if (!meta(html, 'viewport')) problems.push('no viewport meta');
    if (!/<html[^>]*\slang=/i.test(html)) problems.push('no lang on <html>');
    if (problems.length) add('meta-basics', h1 === 0 || !t ? 'fail' : 'warn', `${name}: ${problems.join(', ')}`);
    const canon = links(html, 'canonical').map((l) => attr(l, 'href'))[0];
    if (!canon) add('canonical', 'warn', `${name}: no canonical tag.`);
    else if (BAD_HOSTS.test(canon) || !/^https:\/\//.test(canon)) add('canonical', 'fail', `${name}: canonical is ${canon}`);
    const ogUrl = meta(html, 'og:url');
    if (ogUrl && BAD_HOSTS.test(ogUrl)) add('canonical', 'fail', `${name}: og:url is ${ogUrl}`);
    const missingOg = ['og:title', 'og:description', 'og:image'].filter((k) => !meta(html, k));
    if (missingOg.length) add('og-tags', 'warn', `${name}: missing ${missingOg.join(', ')}`);
    const icons = links(html, 'icon').map((l) => attr(l, 'href'));
    if (icons.length) anyIcon = true;
    if (icons.some((h) => DEFAULT_FAVICONS.test(h || ''))) add('favicon', 'fail', `${name} links a framework default icon (${icons.find((h) => DEFAULT_FAVICONS.test(h || ''))}).`);
    if (links(html, 'apple-touch-icon').length) anyApple = true;
    if (/href\s*=\s*["'][^"']*privacy/i.test(html)) anyPrivacy = true;
    for (const b of jsonLd(html)) {
      if (b.__invalid) add('schema', 'fail', `${name}: JSON-LD isn't valid JSON.`);
      else if (JSON.stringify(b).match(/"@type"\s*:\s*"(?!WebSite|WebPage|Organization|BreadcrumbList|FAQPage|Article|BlogPosting|Person|ImageObject|ItemList|ListItem|Question|Answer|PostalAddress|GeoCoordinates|OpeningHoursSpecification|ContactPoint|SearchAction|Offer|Service)[A-Za-z]+"/)) anySchema = true;
    }
    // images
    const imgs = tags(html, 'img');
    const noAlt = imgs.filter((i) => attr(i, 'alt') === null).length;
    const noSize = imgs.filter((i) => !attr(i, 'width') || !attr(i, 'height')).length;
    if (noAlt || noSize) add('images', 'warn', `${name}: ${noAlt ? `${noAlt} without alt` : ''}${noAlt && noSize ? ', ' : ''}${noSize ? `${noSize} without width/height` : ''}.`);
    if (imgs[0] && /lazy/i.test(attr(imgs[0], 'loading') || '')) add('hero-image', 'warn', `${name}: the first image is loading="lazy". If it's above the fold, remove that and add fetchpriority="high".`);
    // debug / leftovers
    if (/https?:\/\/(localhost|127\.0\.0\.1)/i.test(html)) add('debug-leftovers', 'warn', `${name} references localhost.`);
    // stylesheet versions
    const css = links(html, 'stylesheet').map((l) => attr(l, 'href')).filter((h) => h && !/^https?:/.test(h) && !h.includes('?') && !/[.-][a-f0-9]{6,}\.css$/i.test(h));
    if (css.length) add('cache-busting', 'info', `${name}: ${css.join(', ')} has no ?v= version. Add one and bump it when the file changes.`);
  }
  for (const [t, ps] of titles) if (ps.length > 1) add('meta-basics', 'warn', `Same title on ${ps.length} pages: "${t}" (${ps.slice(0, 3).join(', ')})`);
  if (htmlFiles.length) {
    if (!anyIcon && !iconFiles.length) add('favicon', 'fail', 'No favicon file or <link rel="icon"> found.');
    else if (!R.some((r) => r.id === 'favicon')) add('favicon', 'pass', 'Custom favicon linked.');
    add('apple-touch-icon', anyApple ? 'pass' : 'warn', anyApple ? 'Linked.' : 'No apple-touch-icon link.');
    add('schema', anySchema ? 'pass' : 'warn', anySchema ? 'LocalBusiness-type schema found.' : 'No LocalBusiness-type JSON-LD found.');
    add('privacy', anyPrivacy ? 'pass' : 'warn', anyPrivacy ? 'A privacy link exists.' : 'No link to a privacy policy.');
    for (const id of ['placeholders', 'meta-basics', 'canonical', 'og-tags', 'live-noindex', 'images']) {
      if (!R.some((r) => r.id === id && r.status !== 'info')) add(id, 'pass', `OK across ${htmlFiles.length} page(s).`);
    }
  }

  // ── CSS and JS ──
  for (const f of inPub.filter((x) => /\.(css|html?)$/i.test(x.path))) {
    const text = read(f.path);
    const vw = text.match(/(?<![a-z-])width\s*:\s*100vw/i);
    if (vw) add('mobile-overflow', 'warn', `${rel(f.path)}:${lineOf(text, vw.index)} uses width: 100vw (wider than the screen when there's a scrollbar).`);
    const tr = text.match(LAYOUT_TRANSITION);
    if (tr) add('layout-shift', 'warn', `${rel(f.path)}:${lineOf(text, tr.index)} animates a layout property: "${tr[0].slice(0, 70)}". Use transform/opacity/box-shadow.`);
  }
  for (const f of inPub.filter((x) => /\.(m?js|html?)$/i.test(x.path) && !/\.min\.js$/i.test(x.path))) {
    const text = read(f.path);
    const m = text.match(/console\.log\(|debugger;|location\.search[^\n]{0,40}debug/);
    if (m) add('debug-leftovers', 'warn', `${rel(f.path)}:${lineOf(text, m.index)}: ${m[0]}`);
  }
  for (const id of ['mobile-overflow', 'layout-shift', 'debug-leftovers']) if (!R.some((r) => r.id === id)) add(id, 'pass', 'Nothing found in the code.');

  return R;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (!args._[0]) { console.error('Usage: node scripts/check-source.mjs <project-folder> [--publish site] [--json]'); process.exit(2); }
  const res = await run({ dir: args._[0], publish: args.publish });
  if (args.json) console.log(JSON.stringify(res, null, 2)); else printSummary(res, `Source checks: ${args._[0]}`);
}
