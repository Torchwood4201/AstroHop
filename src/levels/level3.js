import { sparse, ground, gap } from './builder.js';

// WORLD 1-3 — athletic: island hopping over seven pits, high platform
// routes with coin trails, and one wide final gap with a platform aid.

const W = 260;

export default {
  name: 'WORLD 1-3',
  theme: 'overworld',
  next: 'level4',
  width: W,
  rows: [
    // r13 — star above the high route
    sparse(W, [183, 'S']),
    // r14 — flag
    sparse(W, [248, 'F']),
    // r15 — coins above the high platforms
    sparse(W, [63, 'ccc'], [97, 'ccc'], [181, 'cccc']),
    // r16
    sparse(W, [122, 'ccc']),
    // r17 — the high route
    sparse(W, [62, 'PPPPP'], [96, 'PPPPP'], [180, 'PPPPPP']),
    // r18 — aid platform over the wide final gap; castle top
    sparse(W, [211, 'PPPP'], [253, 'xxx']),
    // r19 — blocks, gap platforms, stairs top, castle
    sparse(W, [30, 'cccc'], [38, 'B?B'], [56, 'PPPPP'], [86, 'BMB'], [139, 'PPPPP'],
      [152, '?'], [240, 'XX'], [252, 'xxxxxxx']),
    // r20 — coin arcs over pits; stairs; castle
    sparse(W, [79, 'cccc'], [111, 'cccccc'], [238, 'XXXX'], [252, 'xxxxxxx']),
    // r21 — walking coins; stairs; castle walls
    sparse(W, [10, 'ccccc'], [171, 'cccc'], [236, 'XXXXXX'], [252, 'xxx'], [256, 'xxx']),
    // r22 — spawn, decorations, enemies, stairs base, castle + door
    sparse(W, [3, 'p'], [6, '>'], [20, 'e'], [44, 'e'], [50, '"'], [70, 'e'], [92, 'e'],
      [100, '^'], [126, 'e'], [150, '*'], [160, 'e'], [185, 'e'], [195, 'e'], [222, '^'],
      [234, ground(8)], [252, 'xxx'], [255, 'd'], [256, 'xxx']),
    // r23/r24 — seven pits of rising width
    ground(30) + gap(4) + ground(22) + gap(5) + ground(18) + gap(4) + ground(28) + gap(6) +
      ground(22) + gap(5) + ground(27) + gap(4) + ground(34) + gap(8) + ground(43),
    ground(30) + gap(4) + ground(22) + gap(5) + ground(18) + gap(4) + ground(28) + gap(6) +
      ground(22) + gap(5) + ground(27) + gap(4) + ground(34) + gap(8) + ground(43),
  ],
};
