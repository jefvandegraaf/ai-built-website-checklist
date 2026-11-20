#!/usr/bin/env node
// Loads pages in a real browser (Playwright/Chromium) at phone and desktop width and measures layout.
// Read-only. Analytics requests are blocked so the audit doesn't pollute your stats.
// Usage: node scripts/check-layout.mjs https://yourdomain.com [--pages /,/contact/] [--max-pages 8] [--json]
// Needs: npm install && npx playwright install chromium
import { pathToFileURL } from 'node:url';
import { result, get, parseArgs, normaliseUrl, printSummary } from '../lib/util.mjs';

const VIEWPORTS = [
  { name: 'phone 375px', width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'desktop 1440px', width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
];
const ANALYTICS = /(google-analytics\.com|googletagmanager\.com|analytics\.google\.com|plausible\.io|usefathom\.com|cdn\.usefathom|posthog\.com|i\.posthog|clarity\.ms|hotjar\.com|connect\.facebook\.net|facebook\.com\/tr|static\.cloudflareinsights\.com|simpleanalytics|umami|matomo|segment\.(io|com)|mixpanel|heap(analytics)?\.)/i;

// Runs inside the page.
function measure({ mobile, width }) {
  // Compare with the device width, not innerWidth: phones widen the layout viewport to fit overflowing content.
  const vw = width;
  const out = { overflow: null, offenders: [], tiny: [], smallInputs: [], broken: [], noSize: 0, widows: [], glyphIcons: [], offCentre: [], lcp: null, cls: 0 };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const sel = (el) => {
    if (el.id) return `#${el.id}`;
    let s = el.tagName.toLowerCase();
    const cls = [...el.classList].slice(0, 2).join('.');
    if (cls) s += `.${cls}`;
    const p = el.parentElement;
    return p && p !== document.body ? `${sel(p).split(' > ').slice(-1)[0]} > ${s}` : s;
  };
  const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox !== 'visible') return true; } return false; };

  // 1. Sideways overflow
  const sw = Math.max(document.documentElement.scrollWidth, window.innerWidth);
  if (sw > vw + 1) {
    out.overflow = sw - vw;
    const all = [...document.body.querySelectorAll('*')].filter((el) => { const r = el.getBoundingClientRect(); return (r.right > vw + 1 || r.left < -1) && r.width > 0 && !clipped(el); });
    const outer = all.filter((el) => !all.includes(el.parentElement));
    out.offenders = outer.slice(0, 5).map((el) => { const r = el.getBoundingClientRect(); return `${sel(el)} (${Math.round(r.left)}→${Math.round(r.right)}px)`; });
  }

  // 2. Tap targets (phone only)
  if (mobile) {
    for (const el of document.querySelectorAll('a[href], button, [role="button"], summary, input[type="submit"], input[type="button"], select')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      const inline = el.tagName === 'A' && el.closest('p, li, td, figcaption, blockquote') && getComputedStyle(el).display === 'inline' && (el.parentElement.textContent.trim().length > el.textContent.trim().length + 10);
      if (inline) continue;
      if (r.width < 44 - 0.5 || r.height < 44 - 0.5) out.tiny.push(`${sel(el)} ${Math.round(r.width)}×${Math.round(r.height)}${el.textContent.trim() ? ` "${el.textContent.trim().slice(0, 24)}"` : ''}`);
    }
    for (const el of document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="range"]):not([type="color"]), select, textarea')) {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) out.smallInputs.push(`${sel(el)} ${fs}px`);
    }
  }

  // 3. Images
  for (const img of document.images) {
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) out.broken.push(img.currentSrc.slice(0, 120));
    if (!img.getAttribute('width') || !img.getAttribute('height')) out.noSize++;
  }

  // 4. Widows: one word alone on the last line of a heading
  for (const h of document.querySelectorAll('h1, h2, h3')) {
    if (!visible(h)) continue;
    const words = [];
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const re = /\S+/g; let m;
      while ((m = re.exec(n.data))) {
        const range = document.createRange(); range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
        const rects = range.getClientRects(); const r = rects[rects.length - 1];
        if (r && r.width) words.push({ w: m[0], top: Math.round(r.top + r.height / 2) });
      }
    }
    if (words.length < 3) continue;
    const lines = [];
    for (const w of words) { const last = lines[lines.length - 1]; if (last && Math.abs(last.top - w.top) < 6) last.words.push(w.w); else lines.push({ top: w.top, words: [w.w] }); }
    if (lines.length > 1 && lines[lines.length - 1].words.length === 1) out.widows.push(`${h.tagName.toLowerCase()} "${h.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)}" ends with "${lines[lines.length - 1].words[0]}" alone`);
  }

  // 5. Icons drawn with font characters, and items that should be centred but aren't
  const GLYPH = /^[+\-−–×✕✖›‹»«→←↑↓⌄⌃▾▸▴◂▼▶▲◀⌵∨]$/;
  for (const el of document.querySelectorAll('button, summary, a, [role="button"], label, span, i, div')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 160 || r.height > 120) continue;
    for (const pseudo of ['::before', '::after']) {
      const c = getComputedStyle(el, pseudo).content;
      if (c && c !== 'none' && c !== 'normal') { const t = c.replace(/^["']|["']$/g, '').trim(); if (GLYPH.test(t)) out.glyphIcons.push(`${sel(el)}${pseudo} "${t}"`); }
    }
    if (el.children.length === 0 && GLYPH.test(el.textContent.trim()) && el.closest('button, summary, a, [role="button"]')) out.glyphIcons.push(`${sel(el)} "${el.textContent.trim()}"`);
    // geometric centring of a single child inside a centred box
    const s = getComputedStyle(el);
    if (el.children.length === 1 && r.width <= 80 && r.height <= 80 && /flex|grid/.test(s.display) && /center/.test(s.justifyContent + s.justifyItems + s.placeItems) && /center/.test(s.alignItems + s.placeItems)) {
      const c = el.children[0].getBoundingClientRect();
      if (!c.width || !c.height) continue;
      const bl = parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft), br = parseFloat(s.borderRightWidth) + parseFloat(s.paddingRight);
      const bt = parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop), bb = parseFloat(s.borderBottomWidth) + parseFloat(s.paddingBottom);
      const dx = (c.left + c.width / 2) - (r.left + bl + (r.width - bl - br) / 2);
      const dy = (c.top + c.height / 2) - (r.top + bt + (r.height - bt - bb) / 2);
      if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) out.offCentre.push(`${sel(el)} child is ${dx.toFixed(1)}px ${dx >= 0 ? 'right' : 'left'}, ${dy.toFixed(1)}px ${dy >= 0 ? 'low' : 'high'}`);
    }
  }
  out.glyphIcons = [...new Set(out.glyphIcons)];
  return out;
}

async function vitals(page) {
  return page.evaluate(() => new Promise((resolve) => {
    let lcp = null; let cls = 0;
    try { new PerformanceObserver((l) => { const e = l.getEntries(); lcp = e[e.length - 1]; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
    setTimeout(() => {
      let el = null;
      if (lcp && lcp.element) {
        const x = lcp.element;
        el = { tag: x.tagName, src: (x.currentSrc || x.src || '').slice(0, 120), loading: x.getAttribute('loading'), fetchpriority: x.getAttribute('fetchpriority'), bg: x.tagName !== 'IMG' && getComputedStyle(x).backgroundImage !== 'none' };
      }
      resolve({ lcp: el, lcpTime: lcp ? Math.round(lcp.startTime) : null, cls: Math.round(cls * 1000) / 1000 });
    }, 1500);
  }));
}

async function pagesFromSitemap(base, max) {
  const origin = new URL(base).origin;
  const sm = await get(`${origin}/sitemap.xml`, { redirect: 'follow' });
  let locs = [...(sm.body || '').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
  if (/<sitemapindex/i.test(sm.body || '') && locs[0]) {
    const c = await get(locs[0], { redirect: 'follow' });
    locs = [...(c.body || '').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
  }
  return [base, ...locs.filter((l) => l !== base && new URL(l).host === new URL(base).host)].slice(0, max);
}

export async function run({ url, pages, maxPages = 8 } = {}) {
  const R = [];
  const add = (id, status, detail) => R.push(result(id, status, detail, 'layout'));
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch {
    add('mobile-overflow', 'skip', 'Browser checks skipped: Playwright isn\'t installed. Run "npm install" then "npx playwright install chromium" in the checklist folder, and try again.');
    return R;
  }
  let browser;
  try { browser = await chromium.launch(); } catch (e) {
    add('mobile-overflow', 'skip', `Browser checks skipped: couldn't start Chromium. Run "npx playwright install chromium". (${String(e.message).split('\n')[0]})`);
    return R;
  }
  const base = normaliseUrl(url);
  const list = pages ? pages.map((p) => new URL(p, base).href) : await pagesFromSitemap(base, maxPages);
  const seen = new Set();
  try {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor, userAgent: undefined });
      await ctx.route('**/*', (route) => (ANALYTICS.test(route.request().url()) ? route.abort() : route.continue()));
      for (const pageUrl of list) {
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e.message).split('\n')[0]));
        page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_FAILED|net::ERR_BLOCKED|analytics/i.test(m.text())) errors.push(m.text().slice(0, 160)); });
        const path = new URL(pageUrl).pathname;
        const tag = `${path} @ ${vp.name}`;
        try {
          const resp = await page.goto(pageUrl, { waitUntil: 'load', timeout: 30000 });
          if (!resp || resp.status() >= 400) { add('console-errors', 'warn', `${tag}: page returned ${resp ? resp.status() : 'no response'}.`); await page.close(); continue; }
          await page.waitForTimeout(800);
          const v = await vitals(page);
          const m = await page.evaluate(measure, { mobile: vp.isMobile, width: vp.width });
          if (m.overflow) add('mobile-overflow', 'fail', `${tag}: page is ${m.overflow}px wider than the screen. Widest culprits: ${m.offenders.join('; ') || 'not found (check fixed-position or transformed elements)'}`);
          if (vp.isMobile) {
            if (m.tiny.length) add('tap-targets', 'warn', `${tag}: ${m.tiny.length} target(s) under 44×44px, e.g. ${m.tiny.slice(0, 4).join('; ')}`);
            if (m.smallInputs.length) add('input-zoom', 'fail', `${tag}: ${m.smallInputs.slice(0, 4).join('; ')}`);
          }
          if (m.widows.length) add('widows', 'warn', `${tag}: ${m.widows.slice(0, 3).join('; ')}`);
          if (!seen.has(`${path}:icons`)) {
            if (m.glyphIcons.length) add('icon-centring', 'warn', `${path}: icons drawn with font characters (they usually sit low): ${m.glyphIcons.slice(0, 5).join('; ')}`);
            seen.add(`${path}:icons`);
          }
          if (m.offCentre.length) add('icon-centring', 'warn', `${tag}: ${m.offCentre.slice(0, 4).join('; ')}`);
          if (m.broken.length) add('images', 'fail', `${tag}: broken image(s): ${m.broken.slice(0, 3).join(', ')}`);
          if (m.noSize && !seen.has(`${path}:size`)) { add('images', 'warn', `${path}: ${m.noSize} image(s) without width/height attributes.`); seen.add(`${path}:size`); }
          if (v.cls > 0.1) add('layout-shift', v.cls > 0.25 ? 'fail' : 'warn', `${tag}: layout shift score ${v.cls} while loading (aim for under 0.1).`);
          if (v.lcp && v.lcp.tag === 'IMG') {
            if (v.lcp.loading === 'lazy') add('hero-image', 'fail', `${tag}: the main image is loading="lazy" (${v.lcp.src}).`);
            else if (v.lcp.fetchpriority !== 'high') add('hero-image', 'warn', `${tag}: the main image has no fetchpriority="high" (${v.lcp.src}).`);
          }
          if (errors.length && !seen.has(`${path}:err`)) { add('console-errors', 'warn', `${path}: ${[...new Set(errors)].slice(0, 3).join(' | ')}`); seen.add(`${path}:err`); }
        } catch (e) {
          add('console-errors', 'warn', `${tag}: couldn't load (${String(e.message).split('\n')[0]}).`);
        }
        await page.close();
      }
      await ctx.close();
    }
  } finally { await browser.close(); }
  const n = list.length;
  for (const id of ['mobile-overflow', 'tap-targets', 'input-zoom', 'widows', 'icon-centring', 'images', 'layout-shift', 'hero-image', 'console-errors']) {
    if (!R.some((r) => r.id === id)) add(id, 'pass', `OK on ${n} page(s) at phone and desktop width.`);
  }
  return R;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (!args._[0]) { console.error('Usage: node scripts/check-layout.mjs https://yourdomain.com [--pages /,/contact/] [--max-pages 8] [--json]'); process.exit(2); }
  const res = await run({ url: args._[0], pages: args.pages ? String(args.pages).split(',') : null, maxPages: Number(args['max-pages'] || 8) });
  if (args.json) console.log(JSON.stringify(res, null, 2)); else printSummary(res, `Layout checks: ${args._[0]}`);
}
