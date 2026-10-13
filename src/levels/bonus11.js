import { sparse, ground } from './builder.js';

// Secret underground bonus room for World 1-1 — wall-to-wall coins.
// Entered through the secret pipe; the exit pipe returns to the caller.

const W = 45;
const walls = (...stamps) => sparse(W, [0, 'XX'], [43, 'XX'], ...stamps);

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
    walls([18, 'ccccc']), // r13
    walls(), // r14
    walls([17, 'PPPPPPP']), // r15
    walls([11, 'cccccc'], [25, 'cccccc']), // r16
    walls(), // r17
    walls([10, 'PPPPPPPP'], [24, 'PPPPPPPP']), // r18
    walls([38, 't']), // r19 — exit pipe
    walls(), // r20
    walls([8, 'cccccccccccccccccccccccccc']), // r21
    walls([4, 'p']), // r22
    ground(W), // r23
    ground(W), // r24
  ],
};
