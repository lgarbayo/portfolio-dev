# Portfolio

> A web portfolio with a playable version hidden one click away.

## About

This started as a 2D game you had to play to read my CV. It still is a game — but the game
is no longer the toll booth. The site is now a real, indexable, bilingual portfolio, and
the retro version lives behind a launcher in the corner for anyone who'd rather explore my
work by walking a sprite into a pipe.

Inspired by the **iconic worlds of Super Mario Bros**, the game features custom-designed
character sprites and four worlds — about, projects, experience and contact — that blend
nostalgia with personal branding.

![](public/assets/sprites/player.png)

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

```
src/
  content/      portfolio content as validated collections (one file per entry, per locale)
  i18n/         interface strings (en.json is the contract; es.json translates it)
  components/   layout, sections and the game launcher
  game/         the Phaser game — host.ts is its only entry point
  lib/          shared client behaviour (reveal, filtering, game lifecycle)
scripts/        build-time checks that run after every production build
```

Adding a project, a job or a blog post means adding a file under `src/content/` — no
component needs editing.

## Content and locales

English is the default locale. `/en/`, `/es/` and `/gl/` are all prefixed, and `/` redirects
based on stored preference, then browser language. Portfolio content falls back to English
when a translation is missing. Blog posts do not: an untranslated post simply doesn't appear
in that locale.

Adding a locale means adding it to `src/i18n/config.ts` (which also holds the BCP-47 tag used
for date formatting), a `src/i18n/<code>.json` dictionary, and one `<slug>.<code>.md` per
content entry. `npm run build` reports what is still missing.

Content files added while `astro dev` is running may not show up: the content store in
`.astro/` is built at startup. Restart it — `npm run dev` clears that cache first.

## License

© 2026 Luis Garbayo Fernández

## Additional Credits

- **Character Sprite**: Custom design by Luis Garbayo Fernández
- **Game Inspiration**: Super Mario Bros® is a registered trademark of Nintendo Co., Ltd.
  This project is a personal portfolio and is not affiliated with, endorsed by, or connected to Nintendo.
