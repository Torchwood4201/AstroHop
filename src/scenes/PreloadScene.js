import Phaser from 'phaser';

const TILEMAP_DIR = 'assets/kenney_pixel-platformer/Tilemap';

// The pale sky colour baked into Kenney's background tiles — we turn it
// transparent at load time so the hills can sit on our own blue sky.
const BG_SKY_COLOR = { r: 223, g: 246, b: 245 };

// ---- Timber Hop palette: flannel red, beard brown, beaver bark, poutine gold.
// '.' = transparent. The jack stands 24x32 and the beaver 32x24 —
// SNES proportions with room for shading + a 1px dark outline.
// Row 0/31 (jack) and row 0/23 (beaver) stay empty: the outline pass
// fills the margins instead of clipping.
const INK = {
  W: '#ffffff',
  R: '#c8352b', // toque + flannel red
  r: '#8e231c', // dark red (brim, plaid check)
  S: '#f2c894', // skin
  s: '#d69664', // skin shade (cheeks)
  E: '#1e1e24', // eyes
  B: '#6b4226', // beard
  b: '#4a2c17', // dark brown (boots, belt, beard shade)
  F: '#c8352b', // flannel
  f: '#8e231c', // flannel check
  J: '#3f5f9e', // jeans
  j: '#2e4676', // jeans shade
  D: '#8a5a2e', // beaver fur
  d: '#5e3a1c', // beaver dark (tail, feet)
  L: '#c99a5e', // bark light
  N: '#222222', // beaver nose
  Y: '#f0c83c', // fries gold
  G: '#4a8c4a', // 1-UP carton green
  g: '#785428', // gravy brown
  O: '#e67828', // ember-orange flannel (FIRE state)
  o: '#a85418', // ember dark check
  H: '#969ba5', // axe head steel
  h: '#646973', // axe head shade
};

// EMBER state = the same jack with a blaze-orange shirt, like a campfire
// glow — the retro palette-swap trick, drawn fresh.
const EMBER_INK = { ...INK, F: '#e67828', f: '#a85418' };

const JACK_HEAD = [
  '........................',
  '...........WW...........',
  '.........RRRRRR.........',
  '........RRRRRRRR........',
  '........RRrRRrRR........',
  '........RRRRRRRR........',
  '.......rrrrrrrrrr.......',
  '.......rRRRRRRRRr.......',
  '.......SSSSSSSSSS.......',
  '.......SESSSESSSS.......',
  '.......SSSSSNSSSS.......',
  '.......sSSSSSSSss.......',
  '.......BBBBBBBBBB.......',
  '......BBBBBBBBBBBB......',
  '......BBBbBBBBbBBB......',
  '......BBBBBBBBBBBB......',
  '.......BBBBBBBBBB.......',
];

// Idle: boots together. Walk frames stride apart — the run cycle is 1→2.
const JACK_IDLE = JACK_HEAD.concat([
  '......FFFFFFFFFFFF......',
  '.....SFFFFFWFFFFFS......',
  '.....SFFfFFFFfFFFS......',
  '.....SFFFFFWFFFFFS......',
  '.....SFFfFFFFfFFFS......',
  '......FFFFFFFFFFFF......',
  '......FFFFFFFFFFFF......',
  '......bbbbbbbbbbbb......',
  '.......JJJJJJJJJJ.......',
  '.......JJjJJJjJJJ.......',
  '.......JJJ...JJJ........',
  '.......JJJ...JJJ........',
  '......bbb.....bbb.......',
  '......bbb.....bbb.......',
  '........................',
]);

const JACK_WALK1 = JACK_HEAD.concat([
  '......FFFFFFFFFFFF......',
  '.....SFFFFFWFFFFFS......',
  '.....SFFfFFFFfFFFS......',
  '.....SFFFFFWFFFFFS......',
  '.....SFFfFFFFfFFFS......',
  '......FFFFFFFFFFFF......',
  '......FFFFFFFFFFFF......',
  '......bbbbbbbbbbbb......',
  '......JJJJJJJJJJ........',
  '.....JJJjJJJjJJJ........',
  '.....JJJ....JJJ.........',
  '....JJJ......JJJ........',
  '....bbb.......bbb.......',
  '...bbb.........bbb......',
  '........................',
]);

const JACK_WALK2 = JACK_HEAD.concat([
  '......FFFFFFFFFFFF......',
  '.....SFFFFFWFFFFFS......',
  '.....SFFfFFFFfFFFS......',
  '.....SFFFFFWFFFFFS......',
  '.....SFFfFFFFfFFFS......',
  '......FFFFFFFFFFFF......',
  '......FFFFFFFFFFFF......',
  '......bbbbbbbbbbbb......',
  '........JJJJJJJJJJ......',
  '........JJJjJJJjJJJ.....',
  '.........JJJ....JJJ.....',
  '........JJJ......JJJ....',
  '.......bbb.......bbb....',
  '......bbb.........bbb...',
  '........................',
]);

const BEAVER_A = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '......................DD........',
  '.....................DDDDDD.....',
  '....................DDDDDWED....',
  '.........DDDDDDDDDDDDDDDDDDD....',
  '........DDDDDDDDDDDDDDDDDDDD....',
  '.......DDDDDDDDDDDDDDDDDDDD.....',
  '...dddddDDDDDDDDDDDDDDDDDDDDNN..',
  '...ddddddDDDDDDDDDDDDDDDDWWWN...',
  '...ddLdDddDDDDDDDDDDDDDDDWWWW...',
  '...dddddddDDDDDDDDDDDDDD........',
  '....ddLdDddDDDDDDDDDDDDD........',
  '....dddddddDDDDDDDDDDdd.........',
  '.....dddLdddDDDddddd............',
  '........dddddddd................',
  '.........ddd..ddd...............',
  '.........ddd..ddd...............',
  '................................',
  '................................',
];

// Frame B: tail lifts, feet shuffle — alternating at 6fps reads as a waddle.
const BEAVER_B = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '......................DD........',
  '.....................DDDDDD.....',
  '....................DDDDDWED....',
  '.........DDDDDDDDDDDDDDDDDDD....',
  '........DDDDDDDDDDDDDDDDDDDD....',
  '.......DDDDDDDDDDDDDDDDDDDD.....',
  '....dddddDDDDDDDDDDDDDDDDDDDNN..',
  '....ddddddDDDDDDDDDDDDDDDWWWN...',
  '...ddLdDddDDDDDDDDDDDDDDDWWWW...',
  '...dddddddDDDDDDDDDDDDDD........',
  '....ddLdDddDDDDDDDDDDDDD........',
  '....dddddddDDDDDDDDDDdd.........',
  '.....dddLdddDDDddddd............',
  '........dddddddd................',
  '..........ddd..ddd..............',
  '..........ddd..ddd..............',
  '................................',
  '................................',
];

const BEAVER_FLAT = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '....ddddDDDDDDDDDDDDDDDDWWW.....',
  '...ddDDEDDEDDEDDEDDDDDDDWWWN....',
  '...dDDDDDDDDDDDDDDDDDDD.........',
  '....dddddddddddddddddd..........',
  '................................',
  '................................',
  '................................',
  '................................',
];

// Poutine lunchbox: fries + gravy + curds in a red carton.
// The 1-UP variant swaps the carton to green (same fries).
const POUTINE = [
  '...Y..Y...Y..Y....',
  '...YY..Y...Y..YY..',
  '..YY.YY..YY..YY...',
  '..YYY.YYYY.YYY....',
  '...YgggggggY......',
  '....YWgWWWgW......',
  '...RRgggggggRR....',
  '...RRRRRRRRRRR....',
  '..RRWWRRRRWWRR....',
  '..RRRWRRRRWWRR....',
  '..RRRRRRRRRRRR....',
  '..RRRRRRRRRRRR....',
  '..RrRRRRRRRRrR....',
  '..RRRRRRRRRRRR....',
  '...RRRRRRRRR......',
  '...RRRRRRRRR......',
  '...RRRRRRRRR......',
  '..................',
];

const AXE = [
  '........HHHH',
  '.......HHHHH',
  '......HHHHh.',
  '......gHH...',
  '.....g......',
  '....g.......',
  '...g........',
  '..g.........',
  '.g..........',
  'g...........',
  '............',
  '............',
];

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    const { width, height } = this.scale;

    // --- Simple loading bar driven by the loader's progress event (0..1)
    this.add.rectangle(width / 2, height / 2, 324, 22, 0x222230);
    const bar = this.add
      .rectangle(width / 2 - 158, height / 2, 316, 12, 0x5c94fc)
      .setOrigin(0, 0.5)
      .setScale(0, 1);
    this.load.on('progress', (value) => bar.setScale(value, 1));

    // --- Spritesheets: one image, many fixed-size frames.
    // Phaser slices them by frameWidth/frameHeight and numbers the
    // frames left-to-right, top-to-bottom (0, 1, 2, ...).
    this.load.spritesheet('tiles', `${TILEMAP_DIR}/tilemap_packed.png`, {
      frameWidth: 18,
      frameHeight: 18,
    });
    this.load.spritesheet('chars', `${TILEMAP_DIR}/tilemap-characters_packed.png`, {
      frameWidth: 24,
      frameHeight: 24,
    });
    this.load.spritesheet('bg', `${TILEMAP_DIR}/tilemap-backgrounds_packed.png`, {
      frameWidth: 24,
      frameHeight: 24,
    });
  }

  create() {
    // TileSprites repeat a whole texture, not a single frame of a sheet —
    // so we copy the frames we want to repeat into small standalone textures.
    this.makeTilingTexture('tex-grass-top', 'tiles', [2]);
    this.makeTilingTexture('tex-dirt', 'tiles', [122]);
    // Pine-forest hills for the timberland; pale hills for the frozen north.
    this.makeTilingTexture('tex-hills', 'bg', [14, 15], BG_SKY_COLOR);
    this.makeTilingTexture('tex-hills-snow', 'bg', [8, 9, 10, 11], BG_SKY_COLOR);
    this.makeLumberjackTextures();
    this.makeAxeTexture();

    // Tints in Phaser MULTIPLY colours, so they can only darken — an
    // orange tint on the blue gem gives muddy green. For real recolours
    // we rewrite the pixels instead:
    // fire gem: swap red/blue channels → blue gem becomes orange,
    // with all of its shading intact.
    this.makeRecoloredTexture('gem-fire', 'tiles', 67, (r, g, b) => [b, g, r]);
    // star gem: bright neutral version → rainbow tints stay vivid.
    this.makeRecoloredTexture('gem-star', 'tiles', 67, (r, g, b) => {
      const l = Math.min(255, Math.round(Math.max(r, g, b) * 1.15));
      return [l, l, l];
    });
    // The pack has no hollow-log tunnels — draw our own bark log pieces.
    this.makePipeTextures();

    // 4x4 white square for particle sparkles (tinted per use)
    const spark = this.textures.createCanvas('spark', 4, 4);
    spark.context.fillStyle = '#ffffff';
    spark.context.fillRect(0, 0, 4, 4);
    spark.refresh();

    this.createAnimations();

    // Game-wide state lives in the registry so it survives scene changes
    // and the HUD can listen for changes.
    this.registry.set('score', 0);
    this.registry.set('coins', 0);
    this.registry.set('lives', 3);
    this.registry.set('time', 300);
    this.registry.set('world', '1-1');

    this.scene.start('TitleScene');
  }

  /**
   * Copies one or more frames side by side into a new canvas texture.
   * If colorKey is given, every pixel of exactly that colour becomes
   * transparent (classic "color key" transparency).
   */
  makeTilingTexture(destKey, srcKey, frames, colorKey = null) {
    const first = this.textures.getFrame(srcKey, frames[0]);
    const w = first.width;
    const h = first.height;

    const canvas = this.textures.createCanvas(destKey, w * frames.length, h);
    const ctx = canvas.context;

    frames.forEach((frameIndex, i) => {
      const f = this.textures.getFrame(srcKey, frameIndex);
      // cutX/cutY = where this frame lives inside the packed source image
      ctx.drawImage(f.source.image, f.cutX, f.cutY, w, h, i * w, 0, w, h);
    });

    if (colorKey) {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data; // flat array: r,g,b,a, r,g,b,a, ...
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] === colorKey.r && d[i + 1] === colorKey.g && d[i + 2] === colorKey.b) {
          d[i + 3] = 0; // alpha 0 = fully transparent
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    canvas.refresh(); // push the canvas pixels to the GPU texture
  }

  /** Copies a frame into a new texture, rewriting every pixel's colour. */
  makeRecoloredTexture(destKey, srcKey, frameIndex, transform) {
    const f = this.textures.getFrame(srcKey, frameIndex);
    const canvas = this.textures.createCanvas(destKey, f.width, f.height);
    const ctx = canvas.context;
    ctx.drawImage(f.source.image, f.cutX, f.cutY, f.width, f.height, 0, 0, f.width, f.height);

    const img = ctx.getImageData(0, 0, f.width, f.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue; // skip transparent pixels
      const [r, g, b] = transform(d[i], d[i + 1], d[i + 2]);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    ctx.putImageData(img, 0, 0);
    canvas.refresh();
  }

  /**
   * Renders a pixel map (array of equal-length strings) into a canvas
   * texture, 1px per char. Unknown chars (e.g. '.') stay transparent.
   * With outline=true, every empty pixel touching a filled one (8-way)
   * gets the SNES-style dark outline. Outlined maps must keep a 1px
   * empty border so nothing clips.
   */
  makePixelTexture(key, rows, pal = INK, outline = false) {
    const w = Math.max(...rows.map((r) => r.length));
    const h = rows.length;
    const canvas = this.textures.createCanvas(key, w, h);
    const ctx = canvas.context;
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const color = pal[ch];
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      });
    });
    if (outline) {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const filled = (x, y) =>
        x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
      const edge = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (filled(x, y)) continue;
          let touches = false;
          for (let dy = -1; dy <= 1 && !touches; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if ((dx || dy) && filled(x + dx, y + dy)) {
                touches = true;
                break;
              }
            }
          }
          if (touches) edge.push([x, y]);
        }
      }
      ctx.fillStyle = '#241408';
      edge.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
    }
    canvas.refresh();
  }

  /** Hand-drawn cast: lumberjack (both shirts), beaver, poutine lunches. */
  makeLumberjackTextures() {
    this.makePixelTexture('jack-0', JACK_IDLE, INK, true);
    this.makePixelTexture('jack-1', JACK_WALK1, INK, true);
    this.makePixelTexture('jack-2', JACK_WALK2, INK, true);
    this.makePixelTexture('jackfire-0', JACK_IDLE, EMBER_INK, true);
    this.makePixelTexture('jackfire-1', JACK_WALK1, EMBER_INK, true);
    this.makePixelTexture('jackfire-2', JACK_WALK2, EMBER_INK, true);
    this.makePixelTexture('beaver-0', BEAVER_A, INK, true);
    this.makePixelTexture('beaver-1', BEAVER_B, INK, true);
    this.makePixelTexture('beaver-flat', BEAVER_FLAT, INK, true);
    this.makePixelTexture('poutine', POUTINE);
    this.makePixelTexture(
      'poutine-1up',
      POUTINE.map((r) => r.replaceAll('R', 'G').replaceAll('r', 'g'))
    );
  }

  /** Hollow log tunnel: a ringed mouth + a tileable bark shaft piece. */
  makePipeTextures() {
    const BARK_D = '#3e2612';
    const BARK = '#5e3a1c';
    const BARK_L = '#a07341';
    const HOLLOW = '#28180c';
    const RING = '#785428';

    const mouth = this.textures.createCanvas('pipe-mouth', 44, 18);
    const m = mouth.context;
    m.fillStyle = BARK_D;
    m.fillRect(0, 0, 44, 18);
    m.fillStyle = BARK;
    m.fillRect(2, 2, 40, 14);
    m.fillStyle = BARK_L; // rim light on top
    m.fillRect(2, 2, 40, 4);
    m.fillStyle = HOLLOW; // the hollow opening
    m.beginPath();
    m.ellipse(22, 9.5, 12, 5, 0, 0, Math.PI * 2);
    m.fill();
    m.strokeStyle = RING; // growth ring
    m.lineWidth = 1;
    m.beginPath();
    m.ellipse(22, 9.5, 8, 3, 0, 0, Math.PI * 2);
    m.stroke();
    m.fillStyle = BARK_D;
    m.fillRect(2, 14, 40, 2);
    mouth.refresh();

    const shaft = this.textures.createCanvas('pipe-shaft', 36, 18);
    const s = shaft.context;
    s.fillStyle = BARK;
    s.fillRect(0, 0, 36, 18);
    s.fillStyle = BARK_D;
    s.fillRect(0, 0, 2, 18);
    s.fillRect(33, 0, 3, 18);
    s.fillStyle = BARK_L; // sunlit bark stripe
    s.fillRect(6, 0, 4, 18);
    s.fillStyle = BARK_D; // cracks
    s.fillRect(20, 0, 2, 18);
    s.fillRect(27, 0, 1, 18);
    shaft.refresh();
  }

  /** A tiny hand-drawn axe: it tumbles in flight (angular velocity). */
  makeAxeTexture() {
    this.makePixelTexture('axe', AXE);
  }

  createAnimations() {
    // Animations are global (stored in the AnimationManager), so defining
    // them once here makes them available to every scene.
    // The lumberjack has 3 frames: standing + a two-step stride,
    // SNES-style (idle, left-step, right-step).
    this.anims.create({
      key: 'player-idle',
      frames: [{ key: 'jack-0' }],
    });
    this.anims.create({
      key: 'player-run',
      frames: [{ key: 'jack-1' }, { key: 'jack-2' }],
      frameRate: 10,
      repeat: -1, // loop forever
    });
    this.anims.create({
      key: 'player-jump',
      frames: [{ key: 'jack-1' }],
    });
    // Spin jump (SMW-port): fast alternation reads as a tumble while the
    // sprite rotates via angle in Player.handleInput.
    this.anims.create({
      key: 'player-spin',
      frames: [{ key: 'jack-1' }, { key: 'jack-2' }],
      frameRate: 20,
      repeat: -1,
    });

    // EMBER state = the blaze-orange shirt — same poses, hotter palette,
    // exactly how retro games did power-up swaps.
    this.anims.create({
      key: 'fire-idle',
      frames: [{ key: 'jackfire-0' }],
    });
    this.anims.create({
      key: 'fire-run',
      frames: [{ key: 'jackfire-1' }, { key: 'jackfire-2' }],
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'fire-jump',
      frames: [{ key: 'jackfire-1' }],
    });
    this.anims.create({
      key: 'fire-spin',
      frames: [{ key: 'jackfire-1' }, { key: 'jackfire-2' }],
      frameRate: 20,
      repeat: -1,
    });

    // Coin: face/edge-on frames alternating reads as a spin
    this.anims.create({
      key: 'coin-spin',
      frames: this.anims.generateFrameNumbers('tiles', { frames: [151, 152] }),
      frameRate: 6,
      repeat: -1,
    });

    // Beaver enemy: two-frame waddle
    this.anims.create({
      key: 'walker-walk',
      frames: [{ key: 'beaver-0' }, { key: 'beaver-1' }],
      frameRate: 6,
      repeat: -1,
    });

    // End-of-level flag waving on its pole
    this.anims.create({
      key: 'flag-wave',
      frames: this.anims.generateFrameNumbers('tiles', { frames: [111, 112] }),
      frameRate: 3,
      repeat: -1,
    });
  }
}
