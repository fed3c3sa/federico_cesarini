# federicocesarini.com

Personal site of Federico Cesarini, served by GitHub Pages from `main` (custom domain in `CNAME`).

One static page, no build step and no trackers:

- `index.html`: the page, with its CSS inline. Styled after the Crow desktop app (graphite, one blue, Inter, the brain) with a light section in SecondBrain's own style.
- `assets/brain.js`: the brain behind the hero, drawn on a canvas the way Crow paints its wiki.
- `assets/site.js`: the bar, the menu, the benchmark bars, the demo video, the copy button and the composer.
- `assets/fonts/inter-var.woff2`: Inter (SIL Open Font License, see `LICENSE-Inter.txt`).
- `llms.txt`, `robots.txt`, `sitemap.xml`: for search engines and AI assistants.
- `tools/og-card.html`: the source of `assets/og.png`. Serve the repo locally (`python3 -m http.server`) and capture it with headless Chrome at 1200x630 with `--force-prefers-reduced-motion`.

House rule: no em-dash or en-dash anywhere, in copy or code.
