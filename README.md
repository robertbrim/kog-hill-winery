# Kog Hill Winery Website

The event-focused website for Kog Hill Winery.

## Pages

- Home
- Events
- Wholesale
- About
- Contact

The online shop is hosted by Square and linked from the site.

## Calendar

The Events page reads from the public Kog Hill Google Calendar feed in `src/lib/calendar.js`.
The GitHub Actions workflow triggers a Netlify rebuild each night so calendar updates appear on the published site.

## Local development

Run these commands from the project folder:

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
```

## Main files

- `src/layouts/BaseLayout.astro` — shared navigation, footer, site-wide styling, and search metadata.
- `src/pages/` — website pages.
- `src/components/calendar.jsx` — interactive event calendar.
- `public/` — files served directly, including `robots.txt` and `sitemap.xml`.
