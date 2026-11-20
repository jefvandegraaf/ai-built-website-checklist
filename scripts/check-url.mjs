#!/usr/bin/env node
// Checks a live (or staging) website over HTTP. Zero dependencies, read-only.
// Usage: node scripts/check-url.mjs https://yourdomain.com [--pages-dev https://project.pages.dev] [--max-pages 20] [--json]
import { pathToFileURL } from 'node:url';
import {
  result, get, follow, tags, attr, meta, links, title, count, jsonLd, visibleText,
  findPlaceholders, DEFAULT_FAVICONS, BAD_HOSTS, parseArgs, normaliseUrl, printSummary,
} from '../lib/util.mjs';

const EXPOSED_PATHS = [
  'CLAUDE.md', 'AGENTS.md', 'README.md', 'PROGRESS.md', '.env', '.env.local', '.env.production',
  '.git/config', '.git/HEAD', 'package.json', 'package-lock.json', '.claude/settings.json', '.claude/settings.local.json',
  'workspace/brand-context.md', 'brand-context.md', 'design-tokens.md', 'build.js', 'wrangler.toml', '.gitignore',
];
const GENERIC_TYPES = new Set(['WebSite', 'WebPage', 'Organization', 'BreadcrumbList', 'FAQPage', 'Article', 'BlogPosting',
  'Person', 'ImageObject', 'ItemList', 'SiteNavigationElement', 'Service', 'Offer', 'ContactPoint', 'PostalAddress',
  'GeoCoordinates', 'OpeningHoursSpecification', 'Review', 'AggregateRating', 'Rating', 'ListItem', 'Question', 'Answer',
  'SearchAction', 'EntryPoint', 'CollectionPage', 'AboutPage', 'ContactPage', 'Brand', 'Place', 'Thing', 'HowTo', 'Product']);

const hostOf = (u) => { try { return new URL(u).host; } catch { return ''; } };

export async function run({ url, pagesDev, maxPages = 20 } = {}) {
  const R = [];
  const add = (...a) => R.push(result(...a, 'url'));
  const base = normaliseUrl(url);

  // ── Home page ──
  const { final: home, hops } = await follow(base);
  if (!home.ok || home.status !== 200) {
    add('meta-basics', 'fail', `Home page didn't load: ${home.status || home.error} (${base}). Nothing else could be checked.`);
    return R;
  }
  const finalUrl = hops[hops.length - 1].url;
  const host = hostOf(finalUrl);
  const origin = new URL(finalUrl).origin;
  const isPreview = /\.pages\.dev$/i.test(host);
  if (hops.length > 1) add('www-redirect', 'info', `${base} redirects to ${finalUrl} (${hops.map((h) => h.status).join(' → ')})`);

  // ── HTTPS ──
  const httpRun = await follow(`http://${host}/`);
  const first = httpRun.hops[0];
  if (httpRun.final.status === 200 && httpRun.hops[httpRun.hops.length - 1].url.startsWith('http:')) add('https', 'fail', `http://${host}/ loads without redirecting to https.`);
  else if (first && [301, 308].includes(first.status)) add('https', 'pass', `http:// → https:// with ${first.status}.`);
  else if (first && [302, 307].includes(first.status)) add('https', 'warn', `http:// redirects with a temporary ${first.status}. Use 301.`);
  else add('https', 'info', `Couldn't test http:// (${httpRun.final.error || httpRun.final.status}).`);

  // ── www vs non-www ──
  if (!isPreview) {
    const other = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
    const o = await follow(`https://${other}/`);
    const oFinalHost = hostOf(o.hops[o.hops.length - 1]?.url || '');
    if (!o.final.ok && o.hops.length === 1) add('www-redirect', 'warn', `https://${other}/ doesn't respond (${o.final.error}). People who type it get an error. Add it as a domain and redirect it to ${host}.`);
    else if (oFinalHost === host && o.hops.length > 1) add('www-redirect', 'pass', `${other} redirects to ${host} (${o.hops[0].status}).`);
    else if (o.final.status === 200) add('www-redirect', 'fail', `Both ${host} and ${other} load separately. Redirect one to the other.`);
    else add('www-redirect', 'warn', `${other} returns ${o.final.status}.`);
  }

  // ── robots.txt ──
  const robots = await get(`${origin}/robots.txt`);
  let sitemapUrls = [];
  if (robots.status !== 200 || /text\/html/.test(robots.type)) add('robots', 'fail', `No robots.txt (${robots.status}).`);
  else {
    const txt = robots.body;
    const groups = txt.split(/\n(?=\s*user-agent)/i);
    const star = groups.filter((g) => /user-agent\s*:\s*\*/i.test(g)).join('\n');
    if (/^\s*disallow\s*:\s*\/\s*$/im.test(star)) add('robots', 'fail', 'robots.txt blocks everything ("Disallow: /" for all crawlers).');
    sitemapUrls = [...txt.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]);
    if (!sitemapUrls.length) add('robots', 'warn', 'robots.txt has no Sitemap: line.');
    for (const s of sitemapUrls) if (hostOf(s) !== host) add('canonical', 'fail', `robots.txt Sitemap line points to ${hostOf(s) || s}, not ${host}.`);
    if (!R.some((r) => r.id === 'robots' && r.status !== 'pass')) add('robots', 'pass', 'robots.txt allows crawling and lists a sitemap.');
    const hasCdnRule = /disallow\s*:\s*\/cdn-cgi\//i.test(star);
    const cf = /cloudflare/i.test(home.headers.get('server') || '');
    if (/__cf_email__|\/cdn-cgi\/l\/email-protection/.test(home.body) && !hasCdnRule) add('cdn-cgi', 'warn', 'Cloudflare is rewriting email addresses into /cdn-cgi/ links and robots.txt doesn\'t disallow /cdn-cgi/.');
    else if (cf && !hasCdnRule) add('cdn-cgi', 'info', 'On Cloudflare without "Disallow: /cdn-cgi/". Only matters if email obfuscation is on.');
    else if (hasCdnRule) add('cdn-cgi', 'pass', '/cdn-cgi/ is disallowed.');
  }

  // ── sitemap ──
  if (!sitemapUrls.length) sitemapUrls = [`${origin}/sitemap.xml`];
  let locs = [];
  for (const s of sitemapUrls.slice(0, 3)) {
    const sm = await get(s.startsWith('http') ? s : `${origin}${s}`);
    if (sm.status !== 200 || !/<(urlset|sitemapindex)/i.test(sm.body)) { add('sitemap', 'fail', `${s} returned ${sm.status || sm.error} or isn't an XML sitemap.`); continue; }
    const found = [...sm.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, '&'));
    if (/<sitemapindex/i.test(sm.body)) {
      for (const child of found.slice(0, 5)) {
        const c = await get(child);
        locs.push(...[...c.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, '&')));
      }
    } else locs.push(...found);
  }
  locs = [...new Set(locs)];
  if (locs.length) {
    const wrong = locs.filter((l) => hostOf(l) !== host);
    if (wrong.length) add('canonical', 'fail', `${wrong.length} sitemap URL(s) use another host, e.g. ${wrong[0]}`);
    const bad = [];
    for (const l of locs.filter((x) => hostOf(x) === host).slice(0, maxPages)) {
      const r = await get(l);
      if (r.status !== 200) bad.push(`${l} → ${r.status || r.error}${r.location ? ` → ${r.location}` : ''}`);
    }
    if (bad.length) add('sitemap', 'fail', `Sitemap URLs that don't return 200:\n  ${bad.join('\n  ')}`);
    else add('sitemap', 'pass', `${locs.length} URL(s) listed; the ${Math.min(locs.length, maxPages)} checked all return 200.`);
  } else if (!R.some((r) => r.id === 'sitemap')) add('sitemap', 'fail', 'Sitemap has no URLs.');

  // ── per-page checks ──
  const pages = [finalUrl, ...locs.filter((l) => hostOf(l) === host && l !== finalUrl)].slice(0, maxPages);
  const pageHtml = new Map([[finalUrl, home]]);
  for (const p of pages.slice(1)) pageHtml.set(p, await get(p));

  const titles = new Map();
  let schemaFound = false; let schemaOrgOnly = false;
  for (const [p, r] of pageHtml) {
    if (r.status !== 200) continue;
    const html = r.body;
    const path = new URL(p).pathname;
    // noindex
    const xr = (r.headers.get('x-robots-tag') || '').toLowerCase();
    const mr = (meta(html, 'robots') || '').toLowerCase();
    if (xr.includes('noindex') || mr.includes('noindex')) {
      if (isPreview) add('preview-noindex', 'pass', `${path} is noindex (correct for a preview).`);
      else add('live-noindex', 'fail', `${path} is noindex (${xr.includes('noindex') ? 'X-Robots-Tag header' : 'meta robots tag'}).`);
    }
    // basics
    const t = title(html);
    const d = meta(html, 'description');
    const h1 = count(html, /<h1\b/gi);
    const problems = [];
    if (!t) problems.push('no <title>'); else if (t.length > 60) problems.push(`title is ${t.length} chars`);
    if (t) titles.set(t, [...(titles.get(t) || []), path]);
    if (!d) problems.push('no meta description'); else if (d.length > 160) problems.push(`description is ${d.length} chars`);
    if (h1 !== 1) problems.push(`${h1} <h1> tags`);
    if (!meta(html, 'viewport')) problems.push('no viewport meta');
    if (!/<html[^>]*\slang=/i.test(html)) problems.push('no lang on <html>');
    if (problems.length) add('meta-basics', h1 === 0 || !t || !meta(html, 'viewport') ? 'fail' : 'warn', `${path}: ${problems.join(', ')}`);
    // canonical
    const canon = links(html, 'canonical').map((l) => attr(l, 'href'))[0];
    if (!canon) add('canonical', 'warn', `${path}: no canonical tag.`);
    else if (BAD_HOSTS.test(canon) && !isPreview) add('canonical', 'fail', `${path}: canonical is ${canon}`);
    else if (hostOf(new URL(canon, p).href) !== host && !isPreview) add('canonical', 'fail', `${path}: canonical points to another host (${canon}).`);
    const ogUrl = meta(html, 'og:url');
    if (ogUrl && BAD_HOSTS.test(ogUrl) && !isPreview) add('canonical', 'fail', `${path}: og:url is ${ogUrl}`);
    // placeholders
    const ph = findPlaceholders(`${t || ''} ${d || ''} ${visibleText(html)}`);
    if (ph.length) add('placeholders', ph.severe ? 'fail' : 'warn', `${path}: ${ph.join('; ')}`);
    // mixed content
    const insecure = [...html.matchAll(/<(img|script|iframe|source|video|audio)\b[^>]*\ssrc\s*=\s*["'](http:\/\/[^"']+)/gi)].map((m) => m[2])
      .concat(links(html, 'stylesheet').map((l) => attr(l, 'href')).filter((h) => h && h.startsWith('http://')));
    if (insecure.length) add('mixed-content', 'fail', `${path}: ${insecure.slice(0, 3).join(', ')}`);
    // debug leftovers
    if (/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(html)) add('debug-leftovers', 'warn', `${path}: references localhost.`);
    const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');
    if (/console\.log\(|debugger;/.test(inline)) add('debug-leftovers', 'warn', `${path}: console.log/debugger in an inline script.`);
    // images (static)
    const noAlt = tags(html, 'img').filter((i) => attr(i, 'alt') === null);
    if (noAlt.length) add('images', 'warn', `${path}: ${noAlt.length} image(s) without alt.`);
    // schema
    for (const block of jsonLd(html)) {
      if (block.__invalid) { add('schema', 'fail', `${path}: a JSON-LD block isn't valid JSON.`); continue; }
      const nodes = [].concat(block['@graph'] || block);
      for (const n of nodes) {
        const types = [].concat(n['@type'] || []);
        if (types.some((x) => x === 'LocalBusiness' || !GENERIC_TYPES.has(x))) {
          schemaFound = true;
          const miss = ['name', 'telephone'].filter((k) => !n[k]);
          if (!n.address && !n.areaServed) miss.push('address or areaServed');
          add('schema', miss.length ? 'warn' : 'pass', `${path}: ${types.join('/')}${miss.length ? `, missing ${miss.join(', ')}` : ' with name, phone and location'}.`);
        } else if (types.includes('Organization')) schemaOrgOnly = true;
      }
    }
  }
  for (const [t, ps] of titles) if (ps.length > 1) add('meta-basics', 'warn', `Same title on ${ps.length} pages: "${t}" (${ps.slice(0, 3).join(', ')})`);
  if (!schemaFound) add('schema', 'warn', schemaOrgOnly ? 'Only Organization schema found. Use LocalBusiness (or a subtype like Plumber).' : 'No LocalBusiness schema found on the pages checked.');
  if (!R.some((r) => r.id === 'live-noindex') && !isPreview) add('live-noindex', 'pass', `None of the ${pageHtml.size} pages checked are noindex.`);
  if (!R.some((r) => r.id === 'canonical' && r.status !== 'pass')) add('canonical', 'pass', `Canonicals point to ${host}.`);
  if (!R.some((r) => r.id === 'placeholders')) add('placeholders', 'pass', `No placeholders found in ${pageHtml.size} page(s).`);
  if (!R.some((r) => r.id === 'mixed-content')) add('mixed-content', 'pass', 'No http:// resources found.');
  if (!R.some((r) => r.id === 'meta-basics')) add('meta-basics', 'pass', `Titles, descriptions, H1s and viewport OK on ${pageHtml.size} page(s).`);

  // ── home-page-only checks ──
  const hh = home.body;
  for (const k of ['og:title', 'og:description', 'og:image', 'og:url']) if (!meta(hh, k)) add('og-tags', 'fail', `Home page has no ${k}.`);
  const ogImg = meta(hh, 'og:image');
  if (ogImg) {
    const r = await get(new URL(ogImg, finalUrl).href, { redirect: 'follow' });
    if (r.status !== 200) add('og-tags', 'fail', `og:image ${ogImg} returns ${r.status || r.error}.`);
  }
  if (!R.some((r) => r.id === 'og-tags')) add('og-tags', 'pass', 'Home page has og:title, og:description, og:image and og:url.');

  const icons = links(hh, 'icon').concat(links(hh, 'shortcut')).map((l) => attr(l, 'href')).filter(Boolean);
  if (icons.some((h) => DEFAULT_FAVICONS.test(h))) add('favicon', 'fail', `Default framework favicon: ${icons.find((h) => DEFAULT_FAVICONS.test(h))}`);
  else {
    const iconUrl = icons[0] ? new URL(icons[0], finalUrl).href : `${origin}/favicon.ico`;
    const r = await get(iconUrl, { redirect: 'follow' });
    if (r.status !== 200 || /text\/html/.test(r.type)) add('favicon', 'fail', `${icons[0] ? 'Favicon link' : 'No favicon link, and /favicon.ico'} returns ${r.status || r.error}${/text\/html/.test(r.type) ? ' (an HTML page, not an icon)' : ''}.`);
    else add('favicon', icons[0] ? 'pass' : 'warn', icons[0] ? `Favicon: ${icons[0]}` : 'No <link rel="icon">; relying on /favicon.ico.');
  }
  add('apple-touch-icon', links(hh, 'apple-touch-icon').length ? 'pass' : 'warn', links(hh, 'apple-touch-icon').length ? 'Present.' : 'No apple-touch-icon link on the home page.');
  add('privacy', /href\s*=\s*["'][^"']*privacy/i.test(hh) ? 'pass' : 'warn', /href\s*=\s*["'][^"']*privacy/i.test(hh) ? 'Home page links to a privacy page.' : 'No link to a privacy policy on the home page.');

  // security headers
  const hd = home.headers;
  const missing = [];
  if (!hd.get('x-content-type-options')) missing.push('X-Content-Type-Options');
  if (!hd.get('referrer-policy')) missing.push('Referrer-Policy');
  if (!hd.get('x-frame-options') && !/frame-ancestors/i.test(hd.get('content-security-policy') || '')) missing.push('X-Frame-Options');
  add('security-headers', missing.length ? 'warn' : 'pass', missing.length ? `Missing: ${missing.join(', ')}` : 'Present.');

  // cache busting
  const css = links(hh, 'stylesheet').map((l) => attr(l, 'href')).filter(Boolean).map((h) => new URL(h, finalUrl)).filter((u) => u.host === host);
  const unversioned = [];
  for (const u of css) {
    if (u.search || /[.-][a-f0-9]{6,}\.css$/i.test(u.pathname)) continue;
    const r = await get(u.href, { method: 'HEAD' });
    const age = Number((r.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1] || 0);
    if (age > 3600) unversioned.push(`${u.pathname} (cached ${Math.round(age / 3600)}h)`);
  }
  add('cache-busting', unversioned.length ? 'warn' : 'pass', unversioned.length ? `Stylesheets with no version and long caching: ${unversioned.join(', ')}` : 'Stylesheets are versioned or short-cached.');

  // ── 404 handling ──
  const nf = await get(`${origin}/__checklist-404-test-${Date.now()}/`);
  if (nf.status === 404) add('not-found', 'pass', 'Missing pages return a real 404.');
  else if (nf.status === 200) add('not-found', 'fail', 'A made-up URL returns 200 (a "soft 404"). On Cloudflare Pages this means there\'s no 404.html, so every missing page shows the home page.');
  else add('not-found', 'warn', `A made-up URL returns ${nf.status || nf.error}.`);

  // ── exposed files ──
  const exposed = [];
  for (const p of EXPOSED_PATHS) {
    const r = await get(`${origin}/${p}`);
    if (r.status === 200 && !/text\/html/i.test(r.type) && r.body.length > 0) exposed.push(`/${p}`);
  }
  add('exposed-files', exposed.length ? 'fail' : 'pass', exposed.length ? `Publicly readable: ${exposed.join(', ')}` : `None of ${EXPOSED_PATHS.length} common private files are public.`);

  // ── preview / staging noindex ──
  if (pagesDev) {
    const pv = await get(normaliseUrl(pagesDev));
    const x = (pv.headers.get('x-robots-tag') || '').toLowerCase();
    const m = (meta(pv.body, 'robots') || '').toLowerCase();
    if (!pv.ok) add('preview-noindex', 'warn', `Couldn't load ${pagesDev} (${pv.error}).`);
    else add('preview-noindex', x.includes('noindex') || m.includes('noindex') ? 'pass' : 'fail', x.includes('noindex') || m.includes('noindex') ? `${hostOf(pagesDev)} sends noindex.` : `${hostOf(pagesDev)} is indexable. Google can index this copy of your site.`);
  } else if (isPreview) {
    if (!R.some((r) => r.id === 'preview-noindex')) add('preview-noindex', 'fail', `${host} is a preview copy and it's indexable.`);
    add('live-noindex', 'info', 'You audited a .pages.dev preview. Run again on your real domain for live checks.');
  } else add('preview-noindex', 'info', 'Not tested. Re-run with --pages-dev https://yourproject.pages.dev to check your staging copy is noindex.');

  return R;
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (!args._[0]) { console.error('Usage: node scripts/check-url.mjs https://yourdomain.com [--pages-dev https://project.pages.dev] [--max-pages 20] [--json]'); process.exit(2); }
  const res = await run({ url: args._[0], pagesDev: args['pages-dev'], maxPages: Number(args['max-pages'] || 20) });
  if (args.json) console.log(JSON.stringify(res, null, 2)); else printSummary(res, `URL checks: ${args._[0]}`);
}
