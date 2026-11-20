# AI-Built Website Checklist

A free pre- and post-launch audit for AI-built small business websites. Point it at your site, and it tells you what's broken, why it matters, and gives you a copy-paste Claude prompt to fix each item.

AI-built sites look great on a 27-inch monitor and quietly fail on the boring details. This catches them before your customers (or Google) do.

**The full guide:** [Free Pre- and Post-Launch Checklist for AI-Built Websites](https://jefvandegraaf.com/ai-website-launch-checklist/)

---

## What it catches

**Before launch**
- Default framework favicons, missing share previews (the blank grey box when someone texts your link)
- Lorem ipsum, `[Insert City]`, 555 phone numbers, John Doe testimonials
- **Sideways wobble on phones**: anything wider than a 375px screen, with the element that causes it
- Buttons too small for thumbs, form inputs that make iPhones zoom in
- **Icons that aren't really centred**: plus/minus and arrow icons drawn with font characters, items off-centre in their buttons
- One-word last lines in headings (optional)
- A lazy-loaded hero image, content that jumps while loading, broken images, JavaScript errors
- **Private files published by accident**: `CLAUDE.md`, `.env`, brand notes, `package.json`
- API keys and passwords in your code, `console.log` and debug leftovers

**Launch day**
- HTTPS and www redirects
- **Your live site accidentally set to `noindex`**, and your `.pages.dev` preview copy *not* set to noindex
- Canonical tags, `og:url` and the sitemap pointing at `localhost` or `.pages.dev` instead of your domain
- robots.txt, sitemap.xml, a real 404 page (not a "soft 404")
- LocalBusiness schema, security headers, insecure `http://` resources, stylesheet caching
- Old URLs redirected (Cloudflare Pages silently ignores `301!` and `404` rules)
- **Speed:** Google PageSpeed Insights on phone and desktop, with real-visitor Core Web Vitals and the biggest wins to fix (free Google API key needed)

**Every time you publish**
- **IndexNow** ping for Bing, ChatGPT search, Copilot and DuckDuckGo (`scripts/indexnow.mjs`), plus the reminder most DIY owners skip: request indexing in Google Search Console, because Google doesn't use IndexNow
- Internal links to the new page, and a quick re-audit

**First 30 days**: what to watch in Google Search Console week by week. See [CHECKLIST.md](CHECKLIST.md).

## Quickstart (with Claude Code)

1. Download this repo: **Code → Download ZIP**, or
   ```
   git clone https://github.com/jefvandegraaf/ai-built-website-checklist.git
   ```
2. Open the folder in Claude Code (desktop app Code tab, or `claude` in a terminal).
3. Say: **"Audit my website."**

Claude asks for your site's address (and your project folder, if it's on your computer), installs what it needs, runs the checks, and walks you through the results, worst first.

## Quickstart (without Claude)

Needs Node.js 18+.

```
npm install
npx playwright install chromium
node scripts/audit.mjs --url https://yourdomain.com
```

Add `--dir ../your-project` to also check your project files, and `--pages-dev https://yourproject.pages.dev` to check your Cloudflare preview is hidden from Google. `--no-layout` skips the browser checks, and `--no-speed` skips PageSpeed Insights.

The report is saved to `reports/yourdomain.com-YYYY-MM-DD.md`, with a fix prompt under every failed item.

## How it works

| Script | What it does | Needs |
|---|---|---|
| `scripts/check-url.mjs` | Fetches your live pages, headers, robots.txt and sitemap, and probes for exposed files | Node only |
| `scripts/check-source.mjs` | Reads your project folder: secrets, private files, placeholders, SEO tags, CSS risks | Node only |
| `scripts/check-layout.mjs` | Opens your pages in a real browser at phone (375px) and desktop (1440px) width and measures them | Playwright |
| `scripts/check-speed.mjs` | Runs Google PageSpeed Insights on phone and desktop | Free Google API key (`PSI_API_KEY`) |
| `scripts/audit.mjs` | Runs whichever apply and writes the report | |
| `scripts/indexnow.mjs` | Sets up IndexNow and submits new or changed pages | Node only |

Everything is **read-only**: it never changes your site. The browser check blocks common analytics scripts (Google Analytics, Fathom, Plausible, PostHog and others) so testing doesn't pollute your stats.

**Limits:** it samples up to 20 pages (8 in the browser) from your sitemap, uses heuristics (some warnings are judgement calls), and can't log in. Some things can only be checked by a person: whether your forms really deliver, whether every review and claim is true, and Google Search Console, Bing and your Google Business Profile. Those are listed at the end of every report.

## Built your site with the starter kit?

The [Claude Code Small Business Website Starter Kit](https://github.com/jefvandegraaf/claude-code-smb-website-starter-kit) builds sites that pass most of this out of the box. Its Step 7 sends you here.

## Rather have someone do it?

I'm Jef van de Graaf. I build, audit and fix small business websites. [Get in touch](https://jefvandegraaf.com/contact/).

## License

Checklist, fix prompts and docs: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit **Jef van de Graaf** with a link to https://jefvandegraaf.com/ai-website-launch-checklist/. Scripts: [MIT](LICENSE).
