import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';
import level4 from './level4.js';
import level5 from './level5.js';
import bonus11 from './bonus11.js';
import bonus15 from './bonus15.js';

// World 1: level1 → level5, chained via each level's `next` field.
export const LEVELS = { level1, level2, level3, level4, level5, bonus11, bonus15 };

// Visual themes — picked per level via its `theme` field.
// Frames refer to the 'tiles' spritesheet.
export const THEMES = {
  overworld: {
    sky: '#5c94fc',
    terrainTop: 2, // grass
    terrainFill: 122, // dirt
    parallax: true,
  },
  underground: {
    sky: '#12122a',
    terrainTop: 42, // cave floor
    terrainFill: 142, // packed dirt
    parallax: false,
  },
  snow: {
    sky: '#a8c8ec',
    terrainTop: 81, // snow-capped ground
    terrainFill: 121, // dirt
    parallax: true,
    dragFactor: 0.3, // ice! much less friction — you slide
  },
};
