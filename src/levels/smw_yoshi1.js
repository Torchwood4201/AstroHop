import { sparse, ground, gap } from './builder.js';

// CAMP 1-6 — forest trail (SMW-port).
// A grid-syntax re-imagining of SuperMarioWorldJS map.buildYoshisIsland1:
// long ground runs, elevated mesas, ditch + gap rhythm, pipe pairs,
// block stacks, one-way ledges ('-'), and a staircase before the flag.
//
// Original art/layout (Nintendo) is NOT copied — only the level beats,
// rebuilt with Timber Hop's Kenney tiles and entities.

const W = 300;

export default {
  name: 'CAMP 1-6',
  theme: 'overworld',
  next: 'end',
  time: 400,
  width: W,
  rows: [
    // r13 — high coins over the staircase
    sparse(W, [240, 'cccccc']),
    // r14 — flag top; coins
    sparse(W, [60, 'ccc'], [150, 'cccc'], [272, 'F']),
    // r15 — upper one-way bridge (new '-' feature demo)
    sparse(W, [176, '------'], [186, 'cccc'], [238, '------']),
    // r16 — mid platforms + one-ways
    sparse(W, [58, 'PPPPP'], [120, '------'], [176, 'PPPPP'], [200, 'ccc']),
    // r17 — ledges, block stacks, staircase approach
    sparse(W, [24, 'PPPPP'], [110, 'PPPPP'], [168, 'PPPPP'], [196, 'PPPPP'],
      [232, 'PPPPP'], [246, 'XX']),
    // r18 — pipe tops live here; enemies on mesas; hidden 1-UP; castle top
    sparse(W, [52, 'e'], [64, 'e'], [118, 'B?B'], [132, 'H'], [160, 'e'],
      [210, 'e'], [248, 'XXXX'], [264, 'xxx']),
    // r19 — blocks, pipes, mesas, stairs, castle
    sparse(W, [16, 'BMB'], [44, '?'], [78, 'BB?BB'], [100, 'T'], [112, 'T'],
      [119, 'BMB'], [128, 'T'], [140, '?'], [170, 'M'], [190, 'S'],
      [206, 'T'], [220, '?'], [246, 'XXXXXX'], [262, 'xxxxxxx']),
    // r20 — mesas solidify; pipes extend; stairs; castle
    sparse(W, [55, 'XXXXXXXXXXXXX'], [140, 'ccc'], [244, 'XXXXXXXX'],
      [250, 'T'], [262, 'xxxxxxx']),
    // r21 — walking coins; mesa bases; stairs; castle walls
    sparse(W, [8, 'ccccc'], [55, 'XXXXXXXXXXXXX'], [170, 'cccc'],
      [242, 'XXXXXXXXXX'], [262, 'xxx'], [266, 'xxx']),
    // r22 — spawn, decorations, enemies, mesas, stairs base, castle + door
    sparse(W, [3, 'p'], [6, '>'], [20, '*'], [36, '^'], [38, 'e'], [50, '"'],
      [64, 'e'], [72, 'e'], [90, 'e'], [105, 'e'], [118, 'e'], [130, '"'],
      [131, 'e'], [142, 'XXXXXXXXXXXXX'], [156, '*'], [162, 'e'], [174, '^'],
      [185, 'e'], [195, 'e'], [203, 'e'], [222, 'e'], [226, 'e'], [232, '^'],
      [240, 'XXXXXXXXXXXX'], [250, '"'], [262, 'xxx'], [265, 'd'], [266, 'xxx']),
    // r23/r24 — ditch + gap rhythm (cf. createDitch/createGap 192-231)
    ground(50) + gap(3) + ground(60) + gap(4) + ground(40) + gap(3) +
      ground(50) + gap(3) + ground(87),
    ground(50) + gap(3) + ground(60) + gap(4) + ground(40) + gap(3) +
      ground(50) + gap(3) + ground(87),
  ],
};
