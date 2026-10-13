import { sparse, ground } from './builder.js';

// Secret room for World 1-5 — coins AND a power-up block.

const W = 40;
const walls = (...stamps) => sparse(W, [0, 'XX'], [38, 'XX'], ...stamps);

export default {
  name: 'BONUS',
  theme: 'underground',
  width: W,
  rows: [
    ground(W), // r6 — ceiling
    walls(), // r7
    walls(), // r8
    walls(), // r9
    walls(), // r10
    walls(), // r11
    walls(), // r12
    walls(), // r13
    walls(), // r14
    walls(), // r15
    walls([9, 'cccccc'], [21, 'ccccc']), // r16
    walls([12, 'M'], [18, 'BB']), // r17
    walls([8, 'PPPPPPPP'], [20, 'PPPPPP']), // r18
    walls([33, 't']), // r19 — exit pipe
    walls(), // r20
    walls([6, 'cccccccccccccccccccccc']), // r21
    walls([4, 'p']), // r22
    ground(W), // r23
    ground(W), // r24
  ],
};
