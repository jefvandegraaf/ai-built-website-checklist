// The checklist catalog: one entry per check. CHECKLIST.md is the human version of this file.
// phase: pre = before launch, launch = launch day, post = first 30 days
// how: url | source | layout | manual (which script can test it)

export const CHECKS = {
  // ── Phase 1: Pre-launch QA ─────────────────────────────────────────────
  favicon: {
    phase: 'pre', how: ['url', 'source'], title: 'Custom favicon',
    why: 'AI often leaves the framework default (Vite, Next.js, Astro) or a broken icon link. It\'s the first thing people see in a browser tab and in Google results.',
    fix: 'Create an SVG favicon from my main brand colour, save it as favicon.svg, add a 180×180 apple-touch-icon.png, and add the <link rel="icon"> and <link rel="apple-touch-icon"> tags to the <head> of every page.',
  },
  'apple-touch-icon': {
    phase: 'pre', how: ['url', 'source'], title: 'Apple touch icon',
    why: 'Shown when someone saves your site to their phone home screen.',
    fix: 'Create a 180×180 apple-touch-icon.png from my favicon on a solid brand-colour background and link it in the <head> of every page.',
  },
  'og-tags': {
    phase: 'pre', how: ['url', 'source'], title: 'Social share previews (Open Graph)',
    why: 'Without them, a link texted or shared on LinkedIn or Facebook shows a blank grey box instead of a title, description and image.',
    fix: 'Add og:title, og:description, og:url, og:type and og:image (1200×630) to every page. og:url must use my real domain. Create a simple branded share image if I don\'t have one.',
  },
  'meta-basics': {
    phase: 'pre', how: ['url', 'source'], title: 'Title, description, one H1, viewport, language',
    why: 'Titles and descriptions are what Google shows. One clear H1 per page tells it what the page is about. Without a viewport tag, phones show a shrunken desktop page.',
    fix: 'Give every page a unique <title> under 60 characters, a meta description under 155 characters, exactly one <h1>, <meta name="viewport" content="width=device-width, initial-scale=1"> and <html lang="…">.',
  },
  placeholders: {
    phase: 'pre', how: ['url', 'source'], title: 'No placeholders or AI leftovers',
    why: 'Lorem ipsum, [Insert City], 555 phone numbers, "John Doe" testimonials and [NEEDS: …] markers make a business look fake or unfinished.',
    fix: 'Search every page for placeholder text (lorem ipsum, square-bracket placeholders, 555 numbers, example.com, John/Jane Doe, TODO, [NEEDS:]). List each one with its file and line, and ask me for the real content before replacing it. Never invent replacements.',
  },
  'real-proof': {
    phase: 'pre', how: ['manual'], title: 'Every claim is true',
    why: 'AI happily invents reviews, star ratings, "20 years of experience" and awards. Fake proof can break consumer-protection laws and destroys trust when someone checks.',
    fix: 'List every testimonial, rating, review count, award, certification, statistic and "years in business" claim on the site, with the page it\'s on, so I can confirm each one is real. Remove any I can\'t confirm.',
  },
  forms: {
    phase: 'pre', how: ['manual'], title: 'Forms deliver, with spam protection and a thank-you state',
    why: 'The most expensive bug on a small business site: a contact form that looks fine but sends leads nowhere.',
    fix: 'Walk me through testing every form end to end: submit a test, confirm it arrives in my inbox (and isn\'t in spam), check the thank-you message, and add spam protection (honeypot field or Turnstile) if missing.',
  },
  'not-found': {
    phase: 'pre', how: ['url', 'source'], title: 'Branded 404 page that returns a real 404',
    why: 'Broken links should send people back to your services. On Cloudflare Pages, a site with no 404.html answers every missing URL with your homepage and a 200 status, which Google treats as duplicate pages.',
    fix: 'Create a 404.html in my publish folder with the site header and footer, a short friendly message and links to my main services and contact page. Add <meta name="robots" content="noindex"> to it.',
  },
  privacy: {
    phase: 'pre', how: ['url', 'source'], title: 'Privacy policy',
    why: 'Required almost everywhere once you collect form data or run analytics.',
    fix: 'Draft a plain-English privacy policy page for my site covering what my forms collect, where submissions go, any analytics, and how to contact me. Link it in the footer. Flag anything I should have a lawyer check.',
  },
  'mobile-overflow': {
    phase: 'pre', how: ['layout', 'source'], title: 'No sideways wobble on phones',
    why: 'If anything is wider than the screen, the whole page slides left and right under a thumb. Usual causes: width: 100vw, wide tables or code, fixed widths, negative margins, horizontal-scrolling rows of cards.',
    fix: 'At 375px wide, find every element wider than the screen (compare each element\'s right edge with window.innerWidth). Fix the cause rather than hiding it: replace 100vw with 100%, add max-width: 100% to media, wrap tables in a scroll container, and turn horizontal card rows into a wrapping grid on phones. Don\'t just add overflow-x: hidden to body.',
  },
  'layout-shift': {
    phase: 'pre', how: ['layout', 'source'], title: 'Nothing jumps while loading or on hover',
    why: 'Content that jumps (late images, animated borders or margins) makes people mis-tap and hurts Google\'s Core Web Vitals.',
    fix: 'Give every image width and height attributes, and change any transition or animation on width, height, margin, padding, border-width, top or left to use transform, opacity or box-shadow instead.',
  },
  'tap-targets': {
    phase: 'pre', how: ['layout'], title: 'Thumb-friendly buttons and links',
    why: 'Small, tightly packed buttons and menu links cause mis-taps on phones.',
    fix: 'Make every button, menu link and icon link at least 44×44px on phones (padding is fine), with at least 8px between neighbouring targets.',
  },
  'input-zoom': {
    phase: 'pre', how: ['layout'], title: 'Form inputs don\'t zoom on iPhone',
    why: 'iPhones zoom in on any input with text smaller than 16px, and the page stays zoomed after.',
    fix: 'Set font-size: 16px (or larger) on every input, select and textarea.',
  },
  'icon-centring': {
    phase: 'pre', how: ['layout'], title: 'Icons and centred items are actually centred',
    why: 'AI often centres an element\'s box, not what you see. Plus/minus signs, arrows and chevrons drawn with font characters sit low or off to one side.',
    fix: 'Replace font-character icons (+, −, ×, ›, →, ▾) in buttons, accordions and steppers with inline SVGs that have a centred viewBox. Then check every centred item at 375px and desktop: the visible icon\'s centre should line up with the centre of its button or with its text line, within 1px.',
  },
  widows: {
    phase: 'pre', how: ['layout'], title: 'No one-word last lines in headings (optional)',
    why: 'A heading that ends with one lonely word on its own line looks careless.',
    fix: 'In every heading, join the last two words with &nbsp; (skip it if the last word is very long) so the last line never has a single word.',
  },
  'hero-image': {
    phase: 'pre', how: ['layout', 'source'], title: 'Main image loads first',
    why: 'The biggest image at the top of the page is what Google measures for load speed (LCP). Lazy-loading it makes the page feel slow.',
    fix: 'On the top image of every page, remove loading="lazy", add fetchpriority="high", and make sure it has width and height and is WebP or AVIF sized to how big it displays.',
  },
  images: {
    phase: 'pre', how: ['layout', 'source'], title: 'Images have alt text and sizes, none broken',
    why: 'Alt text helps screen-reader users and Google Images. Missing sizes cause jumping. Broken images look abandoned.',
    fix: 'Give every image meaningful alt text (empty alt="" only for decoration), width and height attributes, and fix any image that fails to load.',
  },
  'console-errors': {
    phase: 'pre', how: ['layout'], title: 'No JavaScript errors',
    why: 'Errors often mean a menu, accordion or form silently doesn\'t work.',
    fix: 'Open each page, list every console error with its file and line, and fix the cause.',
  },
  'exposed-files': {
    phase: 'pre', how: ['url', 'source'], title: 'Private project files aren\'t public',
    why: 'If your host publishes the whole project folder, anyone can read CLAUDE.md, your brand notes, README, package.json or even .env at yourdomain.com/filename.',
    fix: 'Move all website files into one publish folder (e.g. site/) and set my host\'s output directory to it, so CLAUDE.md, notes, prompts and config files are never published. Then check that yourdomain.com/CLAUDE.md returns 404.',
  },
  secrets: {
    phase: 'pre', how: ['source'], title: 'No API keys or passwords in the code',
    why: 'Anything in a public site, or a repo that later goes public, can be found and abused within minutes.',
    fix: 'Remove every secret key from my project files, tell me which services to rotate (generate a new key in) because the old key may have leaked, and move server-side keys to environment variables in my host.',
  },
  'debug-leftovers': {
    phase: 'pre', how: ['url', 'source'], title: 'No debug code or test leftovers',
    why: 'console.log calls, debug panels and ?debug switches leak how the site works and sometimes show up for visitors.',
    fix: 'Remove console.log/debugger statements, debug panels, ?debug or ?test URL switches and commented-out test code from my publish folder.',
  },

  // ── Phase 2: Launch day ────────────────────────────────────────────────
  https: {
    phase: 'launch', how: ['url'], title: 'HTTPS forced',
    why: 'Browsers mark http:// pages "Not secure". Every http:// request should redirect to https://.',
    fix: 'In Cloudflare, turn on SSL/TLS → Edge Certificates → Always Use HTTPS, then check http:// redirects to https:// with a 301.',
  },
  'www-redirect': {
    phase: 'launch', how: ['url'], title: 'One version of your domain',
    why: 'If both www.yourdomain.com and yourdomain.com load separately, Google sees two copies of your site.',
    fix: 'Pick www or non-www as my main domain and add a 301 redirect from the other (Cloudflare: a Redirect Rule, or add both as custom domains and redirect one).',
  },
  'live-noindex': {
    phase: 'launch', how: ['url', 'source'], title: 'Live site is NOT set to noindex',
    why: 'The classic staging-to-live mistake: a noindex tag or header left over from development keeps your whole site out of Google.',
    fix: 'Remove <meta name="robots" content="noindex"> and any X-Robots-Tag: noindex header from my live pages (keep them only on the 404 page and on .pages.dev previews).',
  },
  'preview-noindex': {
    phase: 'launch', how: ['url', 'source'], title: 'Staging and preview links ARE noindex',
    why: 'Every Cloudflare Pages project is a full public copy of your site at project.pages.dev, plus a preview URL per change. If Google indexes them, they compete with your real domain.',
    fix: 'Add this to the _headers file in my publish folder, with :project and :alias written literally:\nhttps://:project.pages.dev/*\n  X-Robots-Tag: noindex\n\nhttps://:alias.:project.pages.dev/*\n  X-Robots-Tag: noindex',
  },
  canonical: {
    phase: 'launch', how: ['url', 'source'], title: 'Canonicals and og:url use your real domain',
    why: 'AI often leaves localhost, .pages.dev or a placeholder domain in canonical tags, og:url and the sitemap, which tells Google the real page lives somewhere else.',
    fix: 'Make every canonical tag, og:url, sitemap.xml entry and the robots.txt Sitemap line use https://mydomain/… with the exact www/non-www version I chose. Search for localhost, pages.dev and example.com and replace them.',
  },
  robots: {
    phase: 'launch', how: ['url', 'source'], title: 'robots.txt allows Google and points to the sitemap',
    why: 'A leftover "Disallow: /" blocks your whole site from Google.',
    fix: 'Make robots.txt allow all crawlers (User-agent: * / Allow: /), add Disallow: /cdn-cgi/ if I\'m on Cloudflare, and add Sitemap: https://mydomain/sitemap.xml.',
  },
  sitemap: {
    phase: 'launch', how: ['url', 'source'], title: 'XML sitemap lists every page, on the real domain',
    why: 'The sitemap tells Google which pages exist. Wrong domains, redirects or 404s inside it waste Google\'s attention.',
    fix: 'Generate sitemap.xml listing every indexable page (not the 404 page) with my real domain and a trailing slash that matches the live URLs. Every URL in it should return 200, not a redirect.',
  },
  'cdn-cgi': {
    phase: 'launch', how: ['url'], title: 'Cloudflare email links don\'t show as broken',
    why: 'Cloudflare rewrites email addresses into /cdn-cgi/l/email-protection links. SEO crawlers report them as broken links.',
    fix: 'Add "Disallow: /cdn-cgi/" under User-agent: * in robots.txt.',
  },
  schema: {
    phase: 'launch', how: ['url', 'source'], title: 'LocalBusiness schema',
    why: 'Structured data tells Google your business name, location or service area, phone and hours in a format it trusts, which helps local results.',
    fix: 'Add LocalBusiness JSON-LD (use the most specific type, e.g. Plumber, Dentist, HairSalon) to my home and contact pages with my name, URL, phone, address or areaServed, opening hours and logo, using only facts from my site. Then test it at https://search.google.com/test/rich-results',
  },
  'security-headers': {
    phase: 'launch', how: ['url', 'source'], title: 'Basic security headers',
    why: 'Cheap protection against clickjacking and content sniffing.',
    fix: 'Add to my _headers file under /*: X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, X-Frame-Options: SAMEORIGIN.',
  },
  'mixed-content': {
    phase: 'launch', how: ['url'], title: 'No insecure http:// resources',
    why: 'Images or scripts loaded over http:// on an https page get blocked or trigger warnings.',
    fix: 'Change every http:// image, script, stylesheet and iframe URL on my site to https://.',
  },
  'cache-busting': {
    phase: 'launch', how: ['url', 'source'], title: 'Changed CSS reaches returning visitors',
    why: 'Browsers keep your old stylesheet for hours. Change the CSS without changing its URL and returning visitors see a broken mix of old styles and new HTML.',
    fix: 'Add a version to my stylesheet and script links (styles.css?v=2) and bump it every time I change that file.',
  },
  redirects: {
    phase: 'launch', how: ['source', 'manual'], title: 'Old URLs redirect to new pages',
    why: 'Replacing an existing site? Every old URL that Google ranks needs a 301 to its new page, or those rankings vanish overnight.',
    fix: 'Get the list of my old site\'s URLs (from Google Search Console → Pages, or the old sitemap) and add a 301 redirect for each to the closest new page in _redirects. On Cloudflare Pages use plain 301 (not 301! or 404).',
  },
  gsc: {
    phase: 'launch', how: ['manual'], title: 'Google Search Console verified, sitemap submitted',
    why: 'It\'s how you find out whether Google can find, index and rank your pages.',
    fix: 'Walk me through adding my domain as a Domain property in Google Search Console, verifying it with a DNS TXT record in Cloudflare, and submitting sitemap.xml.',
  },
  bing: {
    phase: 'launch', how: ['manual'], title: 'Bing Webmaster Tools verified',
    why: 'Bing\'s index also feeds ChatGPT search and Microsoft Copilot. Import from Google Search Console and it takes two minutes.',
    fix: 'Walk me through signing in to Bing Webmaster Tools, importing my site from Google Search Console, and submitting my sitemap.',
  },
  gbp: {
    phase: 'launch', how: ['manual'], title: 'Google Business Profile matches the site',
    why: 'For a local business, the Maps listing matters as much as the website. Name, address and phone must match exactly.',
    fix: 'Compare my business name, address, phone and hours on my site with my Google Business Profile and list every difference, down to "St." vs "Street". Make sure the profile links to my site.',
  },
  analytics: {
    phase: 'launch', how: ['manual'], title: 'Analytics installed, your own visits excluded',
    why: 'You\'ll want to know what\'s working. Your own visits while checking the site will skew small numbers badly.',
    fix: 'Help me add a privacy-friendly analytics tool and exclude my own visits (the tool\'s ignore setting, or a filter), and tell me if I need a cookie notice where I operate.',
  },
  speed: {
    phase: 'launch', how: ['speed'], title: 'Fast on phones (PageSpeed Insights)',
    why: 'Google uses real-visitor speed (Core Web Vitals) in rankings, and slow pages lose callers. Lab scores show what to fix; real-visitor data shows what people actually experience.',
    fix: 'Here is my PageSpeed Insights result for [page]: [paste the report section]. Fix the biggest wins one at a time, starting with the largest time saving. Don\'t change how the page looks. After each fix, tell me what changed so I can re-test.',
  },
  indexnow: {
    phase: 'launch', how: ['manual'], title: 'IndexNow set up (Bing, ChatGPT search, Copilot)',
    why: 'IndexNow tells Bing, Yandex, Naver, Seznam and Yep about new pages within minutes, and Bing feeds ChatGPT search, Copilot and DuckDuckGo. Google doesn\'t use it.',
    fix: 'Set up IndexNow for my site: run "node scripts/indexnow.mjs setup --publish <my publish folder>" from the checklist repo, deploy, check the key file is live, then submit all my sitemap URLs once with --all.',
  },
  'real-phone': {
    phase: 'launch', how: ['manual'], title: 'Checked on a real phone',
    why: 'Resizing a desktop browser misses things: the iPhone notch, the on-screen keyboard over forms, sticky bars covering content.',
    fix: 'Give me a 10-item checklist to run on my actual phone: every page, the menu, the call button, every form with the keyboard open, and sideways scrolling.',
  },

  // ── Every time you publish ─────────────────────────────────────────────
  'publish-indexnow': {
    phase: 'publish', how: ['manual'], title: 'Ping IndexNow',
    why: 'One command tells Bing and the AI search tools that use it about your new or updated page.',
    fix: 'Submit my new page to IndexNow: node scripts/indexnow.mjs submit --site https://mydomain --urls https://mydomain/new-page/',
  },
  'publish-request-indexing': {
    phase: 'publish', how: ['manual'], title: 'Request indexing in Google Search Console',
    why: 'Google ignores IndexNow, and can take days or weeks to find a new page on a small site. This is the step most DIY owners skip. It takes 30 seconds.',
    fix: 'Remind me how: Google Search Console → URL Inspection (top search bar) → paste the new URL → Request indexing. Once per page; repeating it doesn\'t help.',
  },
  'publish-links': {
    phase: 'publish', how: ['manual'], title: 'Link to it from at least two existing pages',
    why: 'Pages nothing links to get found late and rank poorly. Links from your service pages or popular posts pass both visitors and Google to the new page.',
    fix: 'Find 2–3 existing pages on my site where a link to [new page] would genuinely help the reader, and suggest the sentence and anchor text for each.',
  },
  'publish-recheck': {
    phase: 'publish', how: ['url', 'layout'], title: 'Re-run the audit on the new page',
    why: 'New pages are where placeholders, missing titles, oversized images and phone wobble sneak back in.',
    fix: 'Run the checklist audit on my new page only: node scripts/audit.mjs --url https://mydomain/new-page/ --max-pages 1',
  },
};

export const PHASES = {
  pre: 'Phase 1: Pre-launch QA',
  launch: 'Phase 2: Launch day',
  publish: 'Every time you publish a page',
};
