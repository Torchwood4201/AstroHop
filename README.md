# Astro Hop 👾

Astro Hop is a retro, Mario-style 2D platformer built with Phaser 3 and Vite (vanilla JS), playable on desktop and mobile from the same URL and deployed to GitHub Pages.
The project has two goals running in parallel. The first is hands-on game development — physics and game feel, sprite animation, tilemap level design, power-up state machines, mobile touch controls, and a full game-flow loop. The second is using the build as a way to understand the Claude Fable 5 model: how far it can be pushed as a coding partner, where it excels, and where it needs steering, across everything from architecture decisions to spritesheet analysis and asset generation.
Built with original assets (not Nintendo IP), starting from Kenney.nl's CC0 pixel-art packs.

**▶ Play it live:** https://nunoamorim99.github.io/AstroHop/

<!-- TODO: screenshot/GIF here, e.g.: ![gameplay](docs/screenshot.png) -->

## Features

- Classic mechanics: run & jump with proper game feel (acceleration,
  variable jump height), coin collecting, stompable enemies, breakable
  bricks and question blocks
- Power-ups: grow mushroom, fire gem (bouncing fireballs), invincibility
  star — with a SMALL → BIG → FIRE state machine
- Two hand-built levels (sunny overworld + underground cave), a secret
  coin vault behind a pipe, a hidden 1-UP block, flagpole finishes with
  height bonus
- Full game flow: title screen, intro cards, lives, level timer, pause
  menu, game over, persistent high score
- All sound effects and music synthesized live with the Web Audio API —
  zero audio files
- Levels are plain-text grids — see [LEVELS.md](LEVELS.md) and design
  your own

## Tech stack

- [Phaser 3](https://phaser.io/) — game engine (arcade physics, scenes, scaling)
- [Vite](https://vitejs.dev/) — dev server and bundler (vanilla JavaScript, no framework)
- Deployed to GitHub Pages by [GitHub Actions](.github/workflows/deploy.yml) on every push to `main`

## Run it locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Controls

| Action | Desktop | Mobile |
| ------ | ------- | ------ |
| Move   | Arrow keys or A/D | On-screen ◀ ▶ |
| Enter pipe | ↓ or S | On-screen ▼ |
| Jump   | Space, W or ↑ (hold for higher jump) | On-screen **A** button |
| Fireball (FIRE state) | Shift or X | On-screen **B** button |
| Pause  | Esc or P | ▐▐ button (top right) |
| Sound on/off | ♪ button | ♪ button |
| Fullscreen | ⛶ button | ⛶ button (Android) |

The touch pad supports press-and-hold, sliding between buttons without
lifting, and multi-touch (run + jump + fire at once). In portrait the game
sits above a handheld-style control deck; in landscape the buttons overlay
the screen edges semi-transparently.

## Testing the mobile layout

**On desktop:** `F12` → device toolbar (`Ctrl+Shift+M`) → pick a phone
preset → reload. The touch controls appear below the game.

**On a real phone (same Wi-Fi):**

```bash
npm run dev -- --host
```

Open the `Network:` URL Vite prints (e.g. `http://192.168.1.x:5173`) in the
phone's browser.

## Credits & license

- Code, levels and synthesized audio: made for this project — [MIT](LICENSE)
- Art: [Pixel Platformer](https://kenney.nl/assets/pixel-platformer) by
  [Kenney](https://kenney.nl) — License: [CC0](https://creativecommons.org/publicdomain/zero/1.0/)
- Engine: [Phaser 3](https://phaser.io/) (MIT)
