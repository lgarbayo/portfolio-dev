# Portfolio

> A web portfolio with a playable version hidden one click away.

## About

This started as a 2D game you had to play to read my CV. It still is a game — but the game
is no longer the toll booth. The site is now a real, indexable portfolio in three languages,
and the retro version lives behind a launcher in the corner for anyone who'd rather explore
my work by walking a sprite into a pipe.

Inspired by the **iconic worlds of Super Mario Bros**, the game features custom-designed
character sprites and four worlds — about, projects, experience and contact — that blend
nostalgia with personal branding.

![Sprite sheet: four frames of a pixel-art character with brown hair and a blue jumper — standing, walking, jumping and facing forward](public/assets/sprites/player.png)

## Tech Stack

**Astro** and **TypeScript** for the site, **Phaser 3** for the game, **GSAP** and
**Three.js** for the motion layer.

The engines load on demand: Phaser only when you open game mode, Three.js only when the
sections that need it scroll into view. `npm run build` fails if either one ends up in a
page's initial payload.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # type check, build, translation coverage, asset and bundle checks
npm run preview  # serve the production build
```

## Structure

```text
src/
  content/      portfolio content as validated collections (one file per entry, per locale)
  i18n/         interface strings (en.json is the contract; es.json and gl.json translate it)
  components/   layout, sections and the game launcher
  game/         the Phaser game — host.ts is its only entry point
  lib/          shared client behaviour (reveal, 3D scenes, game lifecycle)
scripts/        build-time checks that run after every production build
```

Adding a project, a job or a blog post means adding a file under `src/content/` — no
component needs editing.

## Content and locales

English is the default locale. `/en/`, `/es/` and `/gl/` are all prefixed, and `/` redirects
based on stored preference, then browser language. Content falls back to English when a
translation is missing — blog posts included: they are listed in every locale, labelled as
untranslated, and link to the URL where the article actually exists.

Adding a locale means adding it to `src/i18n/config.ts` (which also holds the BCP-47 tag used
for date formatting), a `src/i18n/<code>.json` dictionary, and one `<slug>.<code>.md` per
content entry. `npm run build` reports what is still missing.

Content files added while `astro dev` is running may not show up: the content store in
`.astro/` is built at startup. Restart it — `npm run dev` clears that cache first.

## Blog

Articles are Markdown files in `src/content/posts/`, named `<slug>.<locale>.md` like the rest
of the content. Four fields are required — `title`, `description`, `pubDate` and `slug` — and
`draft: true` keeps a post visible in `npm run dev` while hiding it from production, the feed
and the sitemap. An optional `motion` clip (with its `motionAlt`) loops beside the entry in
the index; it only plays on screen, and never with reduced motion.

Every locale gets a feed at `/<locale>/rss.xml`. Opening one in a browser shows a readable
page rather than raw XML — that is `public/rss/styles.xsl`, a stylesheet the browser applies
on its own, leaving the file itself untouched for feed readers. The Blog link appears in the
header only once a published post exists.

## License

MIT — see [LICENSE.md](LICENSE.md).

© 2026 Luis Garbayo Fernández

## Additional Credits

- **Character Sprite**: Custom design by Luis Garbayo Fernández
- **Game Inspiration**: Super Mario Bros® is a registered trademark of Nintendo Co., Ltd.
  This project is a personal portfolio and is not affiliated with, endorsed by, or connected to Nintendo.
