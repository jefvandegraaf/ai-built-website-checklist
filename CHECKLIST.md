# The AI-Built Website Launch Checklist

Every item has a reason and a copy-paste prompt you can give Claude Code to fix it. "Checked by" shows which script tests it automatically; "you" means it needs a human.

Run the automated checks with `node scripts/audit.mjs --url https://yourdomain.com --dir ../your-project`, or open this folder in Claude Code and say *"Audit my website."*

> This file is generated from `lib/checks.mjs` by `node scripts/build-checklist.mjs`. Edit the source, not this file.

## Phase 1: Pre-launch QA

### ☐ Custom favicon
*Checked by: check-url, check-source*

AI often leaves the framework default (Vite, Next.js, Astro) or a broken icon link. It's the first thing people see in a browser tab and in Google results.

<details><summary>Fix it with Claude</summary>

```
Create an SVG favicon from my main brand colour, save it as favicon.svg, add a 180×180 apple-touch-icon.png, and add the <link rel="icon"> and <link rel="apple-touch-icon"> tags to the <head> of every page.
```

</details>

### ☐ Apple touch icon
*Checked by: check-url, check-source*

Shown when someone saves your site to their phone home screen.

<details><summary>Fix it with Claude</summary>

```
Create a 180×180 apple-touch-icon.png from my favicon on a solid brand-colour background and link it in the <head> of every page.
```

</details>

### ☐ Social share previews (Open Graph)
*Checked by: check-url, check-source*

Without them, a link texted or shared on LinkedIn or Facebook shows a blank grey box instead of a title, description and image.

<details><summary>Fix it with Claude</summary>

```
Add og:title, og:description, og:url, og:type and og:image (1200×630) to every page. og:url must use my real domain. Create a simple branded share image if I don't have one.
```

</details>

### ☐ Title, description, one H1, viewport, language
*Checked by: check-url, check-source*

Titles and descriptions are what Google shows. One clear H1 per page tells it what the page is about. Without a viewport tag, phones show a shrunken desktop page.

<details><summary>Fix it with Claude</summary>

```
Give every page a unique <title> under 60 characters, a meta description under 155 characters, exactly one <h1>, <meta name="viewport" content="width=device-width, initial-scale=1"> and <html lang="…">.
```

</details>

### ☐ No placeholders or AI leftovers
*Checked by: check-url, check-source*

Lorem ipsum, [Insert City], 555 phone numbers, "John Doe" testimonials and [NEEDS: …] markers make a business look fake or unfinished.

<details><summary>Fix it with Claude</summary>

```
Search every page for placeholder text (lorem ipsum, square-bracket placeholders, 555 numbers, example.com, John/Jane Doe, TODO, [NEEDS:]). List each one with its file and line, and ask me for the real content before replacing it. Never invent replacements.
```

</details>

### ☐ Every claim is true
*Checked by: you*

AI happily invents reviews, star ratings, "20 years of experience" and awards. Fake proof can break consumer-protection laws and destroys trust when someone checks.

<details><summary>Fix it with Claude</summary>

```
List every testimonial, rating, review count, award, certification, statistic and "years in business" claim on the site, with the page it's on, so I can confirm each one is real. Remove any I can't confirm.
```

</details>

### ☐ Forms deliver, with spam protection and a thank-you state
*Checked by: you*

The most expensive bug on a small business site: a contact form that looks fine but sends leads nowhere.

<details><summary>Fix it with Claude</summary>

```
Walk me through testing every form end to end: submit a test, confirm it arrives in my inbox (and isn't in spam), check the thank-you message, and add spam protection (honeypot field or Turnstile) if missing.
```

</details>

### ☐ Branded 404 page that returns a real 404
*Checked by: check-url, check-source*

Broken links should send people back to your services. On Cloudflare Pages, a site with no 404.html answers every missing URL with your homepage and a 200 status, which Google treats as duplicate pages.

<details><summary>Fix it with Claude</summary>

```
Create a 404.html in my publish folder with the site header and footer, a short friendly message and links to my main services and contact page. Add <meta name="robots" content="noindex"> to it.
```

</details>

### ☐ Privacy policy
*Checked by: check-url, check-source*

Required almost everywhere once you collect form data or run analytics.

<details><summary>Fix it with Claude</summary>

```
Draft a plain-English privacy policy page for my site covering what my forms collect, where submissions go, any analytics, and how to contact me. Link it in the footer. Flag anything I should have a lawyer check.
```

</details>

### ☐ No sideways wobble on phones
*Checked by: check-layout, check-source*

If anything is wider than the screen, the whole page slides left and right under a thumb. Usual causes: width: 100vw, wide tables or code, fixed widths, negative margins, horizontal-scrolling rows of cards.

<details><summary>Fix it with Claude</summary>

```
At 375px wide, find every element wider than the screen (compare each element's right edge with window.innerWidth). Fix the cause rather than hiding it: replace 100vw with 100%, add max-width: 100% to media, wrap tables in a scroll container, and turn horizontal card rows into a wrapping grid on phones. Don't just add overflow-x: hidden to body.
```

</details>

### ☐ Nothing jumps while loading or on hover
*Checked by: check-layout, check-source*

Content that jumps (late images, animated borders or margins) makes people mis-tap and hurts Google's Core Web Vitals.

<details><summary>Fix it with Claude</summary>

```
Give every image width and height attributes, and change any transition or animation on width, height, margin, padding, border-width, top or left to use transform, opacity or box-shadow instead.
```

</details>

### ☐ Thumb-friendly buttons and links
*Checked by: check-layout*

Small, tightly packed buttons and menu links cause mis-taps on phones.

<details><summary>Fix it with Claude</summary>

```
Make every button, menu link and icon link at least 44×44px on phones (padding is fine), with at least 8px between neighbouring targets.
```

</details>

### ☐ Form inputs don't zoom on iPhone
*Checked by: check-layout*

iPhones zoom in on any input with text smaller than 16px, and the page stays zoomed after.

<details><summary>Fix it with Claude</summary>

```
Set font-size: 16px (or larger) on every input, select and textarea.
```

</details>

### ☐ Icons and centred items are actually centred
*Checked by: check-layout*

AI often centres an element's box, not what you see. Plus/minus signs, arrows and chevrons drawn with font characters sit low or off to one side.

<details><summary>Fix it with Claude</summary>

```
Replace font-character icons (+, −, ×, ›, →, ▾) in buttons, accordions and steppers with inline SVGs that have a centred viewBox. Then check every centred item at 375px and desktop: the visible icon's centre should line up with the centre of its button or with its text line, within 1px.
```

</details>

### ☐ No one-word last lines in headings (optional)
*Checked by: check-layout*

A heading that ends with one lonely word on its own line looks careless.

<details><summary>Fix it with Claude</summary>

```
In every heading, join the last two words with &nbsp; (skip it if the last word is very long) so the last line never has a single word.
```

</details>

### ☐ Main image loads first
*Checked by: check-layout, check-source*

The biggest image at the top of the page is what Google measures for load speed (LCP). Lazy-loading it makes the page feel slow.

<details><summary>Fix it with Claude</summary>

```
On the top image of every page, remove loading="lazy", add fetchpriority="high", and make sure it has width and height and is WebP or AVIF sized to how big it displays.
```

</details>

### ☐ Images have alt text and sizes, none broken
*Checked by: check-layout, check-source*

Alt text helps screen-reader users and Google Images. Missing sizes cause jumping. Broken images look abandoned.

<details><summary>Fix it with Claude</summary>

```
Give every image meaningful alt text (empty alt="" only for decoration), width and height attributes, and fix any image that fails to load.
```

</details>

### ☐ No JavaScript errors
*Checked by: check-layout*

Errors often mean a menu, accordion or form silently doesn't work.

<details><summary>Fix it with Claude</summary>

```
Open each page, list every console error with its file and line, and fix the cause.
```

</details>

### ☐ Private project files aren't public
*Checked by: check-url, check-source*

If your host publishes the whole project folder, anyone can read CLAUDE.md, your brand notes, README, package.json or even .env at yourdomain.com/filename.

<details><summary>Fix it with Claude</summary>

```
Move all website files into one publish folder (e.g. site/) and set my host's output directory to it, so CLAUDE.md, notes, prompts and config files are never published. Then check that yourdomain.com/CLAUDE.md returns 404.
```

</details>

### ☐ No API keys or passwords in the code
*Checked by: check-source*

Anything in a public site, or a repo that later goes public, can be found and abused within minutes.

<details><summary>Fix it with Claude</summary>

```
Remove every secret key from my project files, tell me which services to rotate (generate a new key in) because the old key may have leaked, and move server-side keys to environment variables in my host.
```

</details>

### ☐ No debug code or test leftovers
*Checked by: check-url, check-source*

console.log calls, debug panels and ?debug switches leak how the site works and sometimes show up for visitors.

<details><summary>Fix it with Claude</summary>

```
Remove console.log/debugger statements, debug panels, ?debug or ?test URL switches and commented-out test code from my publish folder.
```

</details>

## Phase 2: Launch day

### ☐ HTTPS forced
*Checked by: check-url*

Browsers mark http:// pages "Not secure". Every http:// request should redirect to https://.

<details><summary>Fix it with Claude</summary>

```
In Cloudflare, turn on SSL/TLS → Edge Certificates → Always Use HTTPS, then check http:// redirects to https:// with a 301.
```

</details>

### ☐ One version of your domain
*Checked by: check-url*

If both www.yourdomain.com and yourdomain.com load separately, Google sees two copies of your site.

<details><summary>Fix it with Claude</summary>

```
Pick www or non-www as my main domain and add a 301 redirect from the other (Cloudflare: a Redirect Rule, or add both as custom domains and redirect one).
```

</details>

### ☐ Live site is NOT set to noindex
*Checked by: check-url, check-source*

The classic staging-to-live mistake: a noindex tag or header left over from development keeps your whole site out of Google.

<details><summary>Fix it with Claude</summary>

```
Remove <meta name="robots" content="noindex"> and any X-Robots-Tag: noindex header from my live pages (keep them only on the 404 page and on .pages.dev previews).
```

</details>

### ☐ Staging and preview links ARE noindex
*Checked by: check-url, check-source*

Every Cloudflare Pages project is a full public copy of your site at project.pages.dev, plus a preview URL per change. If Google indexes them, they compete with your real domain.

<details><summary>Fix it with Claude</summary>

```
Add this to the _headers file in my publish folder, with :project and :alias written literally:
https://:project.pages.dev/*
  X-Robots-Tag: noindex

https://:alias.:project.pages.dev/*
  X-Robots-Tag: noindex
```

</details>

### ☐ Canonicals and og:url use your real domain
*Checked by: check-url, check-source*

AI often leaves localhost, .pages.dev or a placeholder domain in canonical tags, og:url and the sitemap, which tells Google the real page lives somewhere else.

<details><summary>Fix it with Claude</summary>

```
Make every canonical tag, og:url, sitemap.xml entry and the robots.txt Sitemap line use https://mydomain/… with the exact www/non-www version I chose. Search for localhost, pages.dev and example.com and replace them.
```

</details>

### ☐ robots.txt allows Google and points to the sitemap
*Checked by: check-url, check-source*

A leftover "Disallow: /" blocks your whole site from Google.

<details><summary>Fix it with Claude</summary>

```
Make robots.txt allow all crawlers (User-agent: * / Allow: /), add Disallow: /cdn-cgi/ if I'm on Cloudflare, and add Sitemap: https://mydomain/sitemap.xml.
```

</details>

### ☐ XML sitemap lists every page, on the real domain
*Checked by: check-url, check-source*

The sitemap tells Google which pages exist. Wrong domains, redirects or 404s inside it waste Google's attention.

<details><summary>Fix it with Claude</summary>

```
Generate sitemap.xml listing every indexable page (not the 404 page) with my real domain and a trailing slash that matches the live URLs. Every URL in it should return 200, not a redirect.
```

</details>

### ☐ Cloudflare email links don't show as broken
*Checked by: check-url*

Cloudflare rewrites email addresses into /cdn-cgi/l/email-protection links. SEO crawlers report them as broken links.

<details><summary>Fix it with Claude</summary>

```
Add "Disallow: /cdn-cgi/" under User-agent: * in robots.txt.
```

</details>

### ☐ LocalBusiness schema
*Checked by: check-url, check-source*

Structured data tells Google your business name, location or service area, phone and hours in a format it trusts, which helps local results.

<details><summary>Fix it with Claude</summary>

```
Add LocalBusiness JSON-LD (use the most specific type, e.g. Plumber, Dentist, HairSalon) to my home and contact pages with my name, URL, phone, address or areaServed, opening hours and logo, using only facts from my site. Then test it at https://search.google.com/test/rich-results
```

</details>

### ☐ Basic security headers
*Checked by: check-url, check-source*

Cheap protection against clickjacking and content sniffing.

<details><summary>Fix it with Claude</summary>

```
Add to my _headers file under /*: X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, X-Frame-Options: SAMEORIGIN.
```

</details>

### ☐ No insecure http:// resources
*Checked by: check-url*

Images or scripts loaded over http:// on an https page get blocked or trigger warnings.

<details><summary>Fix it with Claude</summary>

```
Change every http:// image, script, stylesheet and iframe URL on my site to https://.
```

</details>

### ☐ Changed CSS reaches returning visitors
*Checked by: check-url, check-source*

Browsers keep your old stylesheet for hours. Change the CSS without changing its URL and returning visitors see a broken mix of old styles and new HTML.

<details><summary>Fix it with Claude</summary>

```
Add a version to my stylesheet and script links (styles.css?v=2) and bump it every time I change that file.
```

</details>

### ☐ Old URLs redirect to new pages
*Checked by: check-source, you*

Replacing an existing site? Every old URL that Google ranks needs a 301 to its new page, or those rankings vanish overnight.

<details><summary>Fix it with Claude</summary>

```
Get the list of my old site's URLs (from Google Search Console → Pages, or the old sitemap) and add a 301 redirect for each to the closest new page in _redirects. On Cloudflare Pages use plain 301 (not 301! or 404).
```

</details>

### ☐ Google Search Console verified, sitemap submitted
*Checked by: you*

It's how you find out whether Google can find, index and rank your pages.

<details><summary>Fix it with Claude</summary>

```
Walk me through adding my domain as a Domain property in Google Search Console, verifying it with a DNS TXT record in Cloudflare, and submitting sitemap.xml.
```

</details>

### ☐ Bing Webmaster Tools verified
*Checked by: you*

Bing's index also feeds ChatGPT search and Microsoft Copilot. Import from Google Search Console and it takes two minutes.

<details><summary>Fix it with Claude</summary>

```
Walk me through signing in to Bing Webmaster Tools, importing my site from Google Search Console, and submitting my sitemap.
```

</details>

### ☐ Google Business Profile matches the site
*Checked by: you*

For a local business, the Maps listing matters as much as the website. Name, address and phone must match exactly.

<details><summary>Fix it with Claude</summary>

```
Compare my business name, address, phone and hours on my site with my Google Business Profile and list every difference, down to "St." vs "Street". Make sure the profile links to my site.
```

</details>

### ☐ Analytics installed, your own visits excluded
*Checked by: you*

You'll want to know what's working. Your own visits while checking the site will skew small numbers badly.

<details><summary>Fix it with Claude</summary>

```
Help me add a privacy-friendly analytics tool and exclude my own visits (the tool's ignore setting, or a filter), and tell me if I need a cookie notice where I operate.
```

</details>

### ☐ Fast on phones (PageSpeed Insights)
*Checked by: check-speed*

Google uses real-visitor speed (Core Web Vitals) in rankings, and slow pages lose callers. Lab scores show what to fix; real-visitor data shows what people actually experience.

<details><summary>Fix it with Claude</summary>

```
Here is my PageSpeed Insights result for [page]: [paste the report section]. Fix the biggest wins one at a time, starting with the largest time saving. Don't change how the page looks. After each fix, tell me what changed so I can re-test.
```

</details>

### ☐ IndexNow set up (Bing, ChatGPT search, Copilot)
*Checked by: you*

IndexNow tells Bing, Yandex, Naver, Seznam and Yep about new pages within minutes, and Bing feeds ChatGPT search, Copilot and DuckDuckGo. Google doesn't use it.

<details><summary>Fix it with Claude</summary>

```
Set up IndexNow for my site: run "node scripts/indexnow.mjs setup --publish <my publish folder>" from the checklist repo, deploy, check the key file is live, then submit all my sitemap URLs once with --all.
```

</details>

### ☐ Checked on a real phone
*Checked by: you*

Resizing a desktop browser misses things: the iPhone notch, the on-screen keyboard over forms, sticky bars covering content.

<details><summary>Fix it with Claude</summary>

```
Give me a 10-item checklist to run on my actual phone: every page, the menu, the call button, every form with the keyboard open, and sideways scrolling.
```

</details>

## Every time you publish a page

### ☐ Ping IndexNow
*Checked by: you*

One command tells Bing and the AI search tools that use it about your new or updated page.

<details><summary>Fix it with Claude</summary>

```
Submit my new page to IndexNow: node scripts/indexnow.mjs submit --site https://mydomain --urls https://mydomain/new-page/
```

</details>

### ☐ Request indexing in Google Search Console
*Checked by: you*

Google ignores IndexNow, and can take days or weeks to find a new page on a small site. This is the step most DIY owners skip. It takes 30 seconds.

<details><summary>Fix it with Claude</summary>

```
Remind me how: Google Search Console → URL Inspection (top search bar) → paste the new URL → Request indexing. Once per page; repeating it doesn't help.
```

</details>

### ☐ Link to it from at least two existing pages
*Checked by: you*

Pages nothing links to get found late and rank poorly. Links from your service pages or popular posts pass both visitors and Google to the new page.

<details><summary>Fix it with Claude</summary>

```
Find 2–3 existing pages on my site where a link to [new page] would genuinely help the reader, and suggest the sentence and anchor text for each.
```

</details>

### ☐ Re-run the audit on the new page
*Checked by: check-url, check-layout*

New pages are where placeholders, missing titles, oversized images and phone wobble sneak back in.

<details><summary>Fix it with Claude</summary>

```
Run the checklist audit on my new page only: node scripts/audit.mjs --url https://mydomain/new-page/ --max-pages 1
```

</details>

## Phase 3: The first 30 days

Google takes days to weeks to crawl a new site. Use this window to make sure it's finding everything.

### ☐ Week 1: sitemap read, pages discovered
In Google Search Console → Sitemaps, the status says "Success" and the discovered count matches your page count. Fix any "Couldn't fetch".

### ☐ Week 1: request indexing for your money pages
Use URL Inspection → Request indexing on your home page, services page and each service page. Don't spam it; once per page is enough.

### ☐ Week 2: check "Pages" for problems
GSC → Pages → "Why pages aren't indexed". "Discovered – currently not indexed" on a new site is normal at first. "Excluded by noindex", "Not found (404)" and "Duplicate without user-selected canonical" are not.

### ☐ Week 2: first impressions
GSC → Performance. Any impressions at all means Google is testing you. Note which queries show up, even at position 50.

### ☐ Week 3: Google Business Profile
Add photos, services, and a first post. Ask your three happiest recent customers for a review, with a direct link.

### ☐ Week 4: re-run this audit
Run `node scripts/audit.mjs` again. Changes made since launch are where new problems sneak in.

### ☐ Week 4: first real decisions
Pages with impressions but no clicks need better titles and descriptions. Pages with no impressions at all after 30 days need better content, internal links, or a merge.

## After that: ongoing growth

Striking-distance keywords, low-CTR rewrites, cannibalisation, 90-day pruning and scheduled reports are covered by the free [Claude GSC SEO Command Center](https://github.com/jefvandegraaf/claude-gsc-seo-command-center): a weekly report and Monday email with fix prompts.

---

Made by [Jef van de Graaf](https://jefvandegraaf.com/ai-website-launch-checklist/). Content licensed CC BY 4.0, code MIT.
