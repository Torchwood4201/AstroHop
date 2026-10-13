import { sparse, ground, gap } from './builder.js';

// WORLD 1-1 — overworld, ~6.3 screens wide.
// Rows are bottom-anchored: the last row is the bottom of the world.
// See LEVELS.md for the character legend.

const W = 280;

export default {
  name: 'WORLD 1-1',
  theme: 'overworld',
  next: 'level2',
  // the 't' pipe leads to the bonus room and its exit drops you at col 168
  secret: { room: 'bonus11', exitCol: 168 },
  width: W,
  rows: [
    // r13 — star block over the brick deck; high coin trail
    sparse(W, [83, 'S'], [188, 'cccc']),
    // r14 — flag top; coins over platform
    sparse(W, [59, 'ccc'], [256, 'F']),
    // r15 — upper brick deck; coins; high-route platforms
    sparse(W, [24, 'ccc'], [82, 'BBBB'], [121, 'ccc'], [179, 'cccc'], [187, 'PPPPPP'], [197, 'cccc']),
    // r16
    sparse(W, [58, 'PPPPP'], [66, 'ccc']),
    // r17 — early platforms, mid platforms, high route
    sparse(W, [23, 'PPPPP'], [31, 'ccc'], [109, 'ccc'], [120, 'PPPPP'], [178, 'PPPPPP'], [196, 'PPPPPP']),
    // r18 — platform enemy, hidden 1-UP block, coin arc over pit 2
    sparse(W, [53, 'e'], [65, 'PPPPP'], [96, 'cccc'], [132, 'H'], [147, 'cc'], [264, 'xxx']),
    // r19 — first blocks, platforms, bricks, secret pipe top, final blocks, castle
    sparse(W, [16, 'BMB'], [30, 'PPPPP'], [45, 'ccc'], [51, 'PPPPP'], [73, 't'], [78, 'BB?BB'],
      [85, 'BMB'], [108, 'PPPPP'], [128, '?'], [137, '?'], [206, 'T'], [212, 'B?B?B'],
      [246, 'XX'], [262, 'xxxxxxx']),
    // r20 — first pipe, pyramid top, the secret room's EXIT pipe, stairs, castle
    sparse(W, [42, 'T'], [146, 'XXXX'], [168, 'T'], [244, 'XXXX'], [262, 'xxxxxxx']),
    // r21 — walking coins, pyramid, stairs, castle (door gap at 265)
    sparse(W, [8, 'ccccc'], [144, 'XXXXXXXX'], [170, 'cccc'], [242, 'XXXXXX'],
      [262, 'xxx'], [266, 'xxx']),
    // r22 — spawn, decorations, enemies, pyramid base, stairs, castle + door
    sparse(W, [3, 'p'], [6, '>'], [20, '*'], [36, '^'], [38, 'e'], [50, '"'], [64, 'e'],
      [90, 'e'], [93, 'e'], [105, 'e'], [118, 'e'], [130, '"'], [131, 'e'], [142, ground(12)],
      [156, '*'], [162, 'e'], [174, '^'], [185, 'e'], [195, 'e'], [203, 'e'], [222, 'e'],
      [226, 'e'], [232, '^'], [240, ground(8)], [250, '"'], [262, 'xxx'], [265, 'd'], [266, 'xxx']),
    // r23/r24 — ground with two pits (45-47 and 96-99)
    ground(45) + gap(3) + ground(48) + gap(4) + ground(180),
    ground(45) + gap(3) + ground(48) + gap(4) + ground(180),
  ],
};
