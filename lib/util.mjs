// Shared helpers. Zero dependencies (Node 18+).
import { CHECKS, PHASES } from './checks.mjs';

export const UA = 'ai-built-website-checklist/1.0 (+https://github.com/jefvandegraaf/ai-built-website-checklist)';

// status: pass | fail | warn | info | skip
export function result(id, status, detail = '', source = '') {
  if (!CHECKS[id]) throw new Error(`Unknown check id: ${id}`);
  return { id, status, detail: String(detail).trim(), source };
}

export async function get(url, { method = 'GET', redirect = 'manual', timeout = 15000 } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, { method, redirect, headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout) });
    const ms = Date.now() - started;
    const type = res.headers.get('content-type') || '';
    const body = method === 'HEAD' ? '' : await res.text().catch(() => '');
    return { ok: true, status: res.status, headers: res.headers, location: res.headers.get('location'), body, type, ms, url };
  } catch (e) {
    return { ok: false, status: 0, error: e.cause?.code || e.name || String(e), headers: new Headers(), body: '', type: '', url };
  }
}

// Follow redirects manually (so we can see each hop).
export async function follow(url, max = 6) {
  const hops = [];
  let current = url;
  for (let i = 0; i < max; i++) {
    const r = await get(current);
    hops.push({ url: current, status: r.status });
    if (r.status >= 300 && r.status < 400 && r.location) { current = new URL(r.location, current).href; continue; }
    return { final: r, hops };
  }
  return { final: { ok: false, status: 0, error: 'too many redirects' }, hops };
}

// ── tiny HTML helpers (regex-based: good enough for audits, not a parser) ──
export const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
export function tags(html, name) {
  return [...stripComments(html).matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
}
export function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
}
export function meta(html, key) {
  for (const t of tags(html, 'meta')) {
    const k = (attr(t, 'name') || attr(t, 'property') || '').toLowerCase();
    if (k === key.toLowerCase()) return attr(t, 'content');
  }
  return null;
}
export function links(html, rel) {
  return tags(html, 'link').filter((t) => (attr(t, 'rel') || '').toLowerCase().split(/\s+/).includes(rel));
}
export function title(html) {
  const m = stripComments(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}
export function count(html, re) { return (stripComments(html).match(re) || []).length; }
export function jsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { out.push(JSON.parse(m[1])); } catch { out.push({ __invalid: true }); }
  }
  return out;
}
export function visibleText(html) {
  return stripComments(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

// ── placeholder / leftover patterns ──
export const PLACEHOLDERS = [
  [/lorem ipsum/i, 'lorem ipsum', true],
  [/\[NEEDS:[^\]]*\]/i, '[NEEDS: …] marker', true],
  [/\[(insert|your|add|city|business|company|name|phone|email|address)[^\]]{0,40}\]/i, 'square-bracket placeholder'],
  [/\{\{[^}]{1,40}\}\}/, '{{template}} placeholder'],
  [/\(?\b\d{3}\)?[\s.-]?555[\s.-]?01\d\d\b/, '555-01xx fake phone number', true],
  [/\b(john|jane) (doe|smith)\b/i, 'John/Jane Doe', true],
  [/\byour (business|company) name\b/i, '"your business name"'],
  [/\bexample\.(com|org|net)\b/i, 'example.com'],
  [/\bTODO\b|\bFIXME\b/, 'TODO/FIXME'],
  [/acme (corp|inc|co)/i, 'Acme'],
];
export function findPlaceholders(text) {
  const hits = [];
  text = text.replace(/\[email(&#160;| | )protected\]/gi, ''); // Cloudflare email obfuscation, not a placeholder
  for (const [re, label, severe] of PLACEHOLDERS) {
    const m = text.match(re);
    if (m) { hits.push(`${label} ("${m[0].slice(0, 60)}")`); if (severe) hits.severe = true; }
  }
  return hits;
}

export const DEFAULT_FAVICONS = /(vite\.svg|next\.svg|vercel\.svg|astro\.svg|react\.svg|svelte\.svg|nuxt|favicon-default|logo192\.png)/i;
export const BAD_HOSTS = /(localhost|127\.0\.0\.1|\.pages\.dev|\.vercel\.app|\.netlify\.app|\.github\.io|\.sevalla\.(page|app)|example\.(com|org|net)|\[NEEDS)/i;
export const LAYOUT_TRANSITION = /transition(-property)?\s*:[^;}]*\b(width|height|margin[a-z-]*|padding[a-z-]*|border(-[a-z]+)?-width|top|left|right|bottom|all)\b/i;

// ── report ──
const ICON = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️', skip: '⏭️' };
const ORDER = { fail: 0, warn: 1, info: 2, pass: 3, skip: 4 };

export function merge(results) {
  // Collapse several results for one id into the worst status, keeping all details.
  const by = new Map();
  for (const r of results) {
    const cur = by.get(r.id);
    if (!cur) { by.set(r.id, { ...r, details: r.detail ? [`${r.source ? `[${r.source}] ` : ''}${r.detail}`] : [] }); continue; }
    if (ORDER[r.status] < ORDER[cur.status]) cur.status = r.status;
    if (r.detail) cur.details.push(`${r.source ? `[${r.source}] ` : ''}${r.detail}`);
  }
  return [...by.values()];
}

export function summary(results) {
  const s = { pass: 0, fail: 0, warn: 0, info: 0, skip: 0 };
  for (const r of merge(results)) s[r.status]++;
  return s;
}

export function markdownReport({ target, results, ran, date = new Date() }) {
  const merged = merge(results);
  const s = summary(results);
  const lines = [];
  lines.push(`# Website launch audit: ${target}`, '');
  lines.push(`Run ${date.toISOString().slice(0, 16).replace('T', ' ')} UTC · scripts: ${ran.join(', ')}`, '');
  lines.push(`**${s.fail} to fix · ${s.warn} to review · ${s.pass} passed** (${s.info} info, ${s.skip} skipped)`, '');
  const manual = Object.entries(CHECKS).filter(([id, c]) => c.how.includes('manual') && !merged.find((r) => r.id === id));
  for (const phase of Object.keys(PHASES)) {
    const rows = merged.filter((r) => CHECKS[r.id].phase === phase).sort((a, b) => ORDER[a.status] - ORDER[b.status]);
    const man = manual.filter(([, c]) => c.phase === phase);
    if (!rows.length && !man.length) continue;
    lines.push(`## ${PHASES[phase]}`, '');
    for (const r of rows) {
      const c = CHECKS[r.id];
      lines.push(`### ${ICON[r.status]} ${c.title}`);
      for (const d of r.details.slice(0, 12)) lines.push(`- ${d}`);
      if (r.details.length > 12) lines.push(`- …and ${r.details.length - 12} more`);
      if (r.status === 'fail' || r.status === 'warn') {
        lines.push('', `**Why it matters:** ${c.why}`, '', '**Fix prompt for Claude:**', '', '```', c.fix, '```');
      }
      lines.push('');
    }
    if (man.length) {
      lines.push('### 👀 Check these yourself', '');
      for (const [, c] of man) lines.push(`- [ ] **${c.title}**: ${c.why}`);
      lines.push('');
    }
  }
  lines.push('---', 'Made with the free [AI-Built Website Checklist](https://github.com/jefvandegraaf/ai-built-website-checklist) by Jef van de Graaf.');
  return lines.join('\n');
}

export function printSummary(results, label) {
  const merged = merge(results);
  console.log(`\n${label}`);
  for (const r of merged.sort((a, b) => ORDER[a.status] - ORDER[b.status])) {
    console.log(`${ICON[r.status]}  ${CHECKS[r.id].title}${r.details[0] ? ` · ${r.details[0].slice(0, 140)}` : ''}`);
  }
}

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[k] = argv[++i];
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

export function normaliseUrl(u) {
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  const url = new URL(u);
  if (!url.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(url.pathname)) url.pathname += '/';
  return url.href;
}
