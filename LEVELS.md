# Level format

Levels live in `src/levels/` as plain JS modules and are registered in
[src/levels/index.js](src/levels/index.js). Each level is an object:

```js
export default {
  name: 'WORLD 1-1',        // shown in the HUD / intro card
  theme: 'overworld',       // 'overworld' | 'underground' | 'snow' (see THEMES in index.js)
  next: 'level2',           // level id loaded after the flag ('end' = world-complete screen)
  time: 300,                // optional — level timer in seconds (default 300)
  secret: {                 // optional — config for the 't' secret pipe
    room: 'bonus11',        //   level id of the bonus room
    exitCol: 168,           //   column where the exit pipe drops you back
  },
  width: 280,               // width in tiles (1 tile = 18px)
  rows: [ ... ],            // the grid — array of strings, one char per tile
};
```

## The grid

- Each character is one **18×18px tile**. Column 0 is the left edge of the world.
- The world is always **25 rows (450px) tall**. Rows are **bottom-anchored**:
  the *last* string is the bottom row of the world, and missing rows at the
  top are padded with empty space. A level that only uses the lower half of
  the screen only needs ~12 strings.
- Rows shorter than `width` are padded with spaces on the right.

### Characters

| Char | Meaning |
| ---- | ------- |
| ` `  | empty |
| `X`  | solid terrain (auto-textured: top tile when nothing above, fill below) |
| `x`  | decorative terrain — drawn exactly like `X` but with NO collision (castles, background structures the player walks in front of) |
| `P`  | platform bar (auto rounded caps at the ends of each run) |
| `B`  | breakable brick |
| `?`  | question block containing a coin |
| `M`  | question block containing a power-up (mushroom if SMALL, fire gem otherwise) |
| `S`  | question block containing a star |
| `H`  | hidden invisible block with a 1-UP (appears when hit from below) |
| `c`  | coin |
| `e`  | walker enemy spawn |
| `p`  | player spawn |
| `T`  | pipe (top-left corner; 2 tiles wide, extends down to the terrain below) |
| `t`  | enterable pipe — secret entrance (uses `secret`) or, in a bonus room, the exit |
| `F`  | flagpole top (pole extends down to the terrain below) |
| `d`  | level-end door (bottom tile; the top half is drawn above automatically) |
| `>`  | decoration: arrow sign |
| `*`  | decoration: bush |
| `^`  | decoration: pine tree |
| `"`  | decoration: sprout |
| `o`  | decoration: snowman |

**Pipes are 2 columns wide** — leave the column to the right of `T`/`t` empty.

## Authoring tips

Use the helpers from [src/levels/builder.js](src/levels/builder.js) instead of
typing 280-character strings:

```js
import { sparse, ground, gap } from './builder.js';

const W = 280;
// a row with bricks at columns 16-18 and coins at 30-32:
sparse(W, [16, 'BMB'], [30, 'ccc']);
// the ground row with a 3-tile pit at column 45:
ground(45) + gap(3) + ground(W - 48);
```

Workflow: edit the level, save (Vite hot-reloads), die or finish to see the
level rebuilt. Screenshots of whole levels: `node tools/shot.mjs level1`
(with the dev server running).

## How it gets built

`GameScene` reads the grid once at scene start:

- Contiguous `X` runs in a row become **one** static body each (fewer bodies,
  no seams to snag on); each cell still gets its own sprite, choosing the
  "top" texture when the cell above is empty.
- Contiguous `P` runs become one platform: rounded cap sprites at the ends,
  one static body for the run.
- `T`/`t`/`F` scan downward from their cell to the first solid tile to learn
  their height, then build their sprites + bodies.
- Everything else maps 1:1 to the objects from earlier phases.
