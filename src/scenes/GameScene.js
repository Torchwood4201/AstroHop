import Phaser from 'phaser';
import Player from '../objects/Player.js';
import Walker from '../objects/Walker.js';
import { touchState } from '../input/TouchControls.js';
import { LEVELS, THEMES } from '../levels/index.js';
import { sfx } from '../audio/sfx.js';

// ---- World ----
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const TILE = 18;
const ROWS = GAME_HEIGHT / TILE; // 25 — world height is fixed

// ---- Tile frame indices in the 'tiles' spritesheet ----
const T = {
  PLATFORM_SINGLE: 76,
  PLATFORM_LEFT: 77,
  PLATFORM_MID: 78,
  PLATFORM_RIGHT: 79,
  CLOUD_LEFT: 153,
  CLOUD_MID: 154,
  CLOUD_RIGHT: 155,
  CLOUD_SMALL: 156,
  SIGN_RIGHT: 86,
  SPROUT: 124,
  BUSH: 125,
  PINE: 126,
  COIN: 151,
  BLOCK_QUESTION: 10,
  BLOCK_USED: 31,
  BRICK: 6,
  MUSHROOM: 128,
  POLE: 131,
  FLAG: 111,
  DOOR_TOP: 130,
  DOOR_BOTTOM: 150,
};

const DECOR = { '>': T.SIGN_RIGHT, '*': T.BUSH, '^': T.PINE, '"': T.SPROUT, o: 145 /* snowman */ };

const STOMP_BOUNCE = -300;

// ---- Fireballs ----
const FIREBALL_SPEED = 300;
const FIREBALL_BOUNCE_VY = -170; // low hop so small enemies can't be jumped over
const FIREBALL_LIFETIME = 3000;
const MAX_FIREBALLS = 2;

// ---- Scoring ----
const SCORE_COIN = 100;
const SCORE_BRICK = 50;
const SCORE_STOMP = 100;
const SCORE_POWERUP = 1000;
const SCORE_STAR_KILL = 200;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  /** Everything that can vary between visits arrives via scene data. */
  init(data) {
    this.levelId = data.levelId ?? 'level1';
    this.spawnColOverride = data.spawnCol ?? null;
    this.startPower = data.powerState ?? 'SMALL';
    this.returnTo = data.returnTo ?? null; // set while inside a bonus room
    this.exitViaPipe = data.exitViaPipe ?? false; // rise out of the pipe at spawnCol
    this.keepTime = data.keepTime ?? false; // pipe travel keeps the level timer
    // What's already been collected/killed/broken, per level — carried
    // through pipe travel so the world keeps its state across the trip.
    // Death and level changes do NOT carry it, so everything respawns.
    this.consumedAll = data.consumed ?? {};
  }

  create() {
    this.level = LEVELS[this.levelId];
    this.theme = THEMES[this.level.theme];
    this.worldWidth = this.level.width * TILE;

    if (!this.scene.isActive('HUDScene')) this.scene.launch('HUDScene');
    this.registry.set('world', this.level.name.replace(/^WORLD\s*/, ''));
    this.setupTimer();
    this.setupPause();

    sfx.startMusic(this.level.theme);
    this.events.once('shutdown', () => sfx.stopMusic());

    this.autoPhase = null; // null | 'pipe' | 'flag' | 'walk' | 'done'
    this.pipeUnder = null;
    this.doorX = null;
    this.pipes = []; // {colLeft, colRight, topRow, cx} of every pipe built
    this.consumed = new Set(this.consumedAll[this.levelId] ?? []);

    this.solids = [];
    this.blocks = this.physics.add.staticGroup();
    this.coins = this.add.group();
    this.enemies = this.add.group();
    this.items = this.physics.add.group();
    this.fireballs = this.physics.add.group();
    this.pipeSensors = this.physics.add.staticGroup();
    this.hiddenSensors = this.physics.add.staticGroup();

    this.cameras.main.setBackgroundColor(this.theme.sky);
    if (this.theme.parallax) this.buildParallax();

    // World bounds: bottom check OFF so you can fall into pits.
    this.physics.world.setBounds(0, 0, this.worldWidth, GAME_HEIGHT, true, true, true, false);

    this.parseGrid();
    this.spawnPlayer();
    this.setupInput();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldWidth, GAME_HEIGHT);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.fadeIn(250);

    // --- Physics wiring
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.blocks, this.onPlayerBlockCollide, null, this);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.enemies, this.blocks);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.items, this.solids, this.onItemBounce, null, this);
    this.physics.add.collider(this.items, this.blocks, this.onItemBounce, null, this);
    this.physics.add.collider(this.fireballs, this.solids, this.onFireballBounce, null, this);
    this.physics.add.collider(this.fireballs, this.blocks, this.onFireballBounce, null, this);
    this.physics.add.overlap(this.player, this.coins, this.onCollectCoin, null, this);
    this.physics.add.overlap(this.player, this.items, this.onCollectItem, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerEnemyContact, null, this);
    this.physics.add.overlap(this.player, this.pipeSensors, (p, s) => (this.pipeUnder = s));
    this.physics.add.overlap(this.player, this.hiddenSensors, this.onHiddenSensor, null, this);
    this.physics.add.overlap(this.fireballs, this.enemies, this.onFireballHitsEnemy, null, this);
    if (this.flagZone) {
      this.physics.add.overlap(this.player, this.flagZone, this.startFlagSequence, null, this);
    }
  }

  // ----------------------------------------------------- grid parsing

  /** Pad the level rows into a full ROWS×width char matrix (bottom-anchored). */
  buildMatrix() {
    const { rows, width } = this.level;
    const empty = ' '.repeat(width);
    const pad = Array(ROWS - rows.length).fill(empty);
    return pad.concat(rows.map((r) => r.padEnd(width, ' ')));
  }

  parseGrid() {
    const grid = this.buildMatrix();
    const width = this.level.width;
    this.grid = grid;

    // 'X' = solid, 'x' = decorative (drawn the same, no collision)
    const isFilled = (row, col) =>
      row >= 0 && row < ROWS && col >= 0 && col < width &&
      (grid[row][col] === 'X' || grid[row][col] === 'x');

    for (let row = 0; row < ROWS; row++) {
      let col = 0;
      while (col < width) {
        const ch = grid[row][col];
        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;

        if (ch === 'X') {
          // merge the whole horizontal run into ONE body (no seams)
          const start = col;
          while (col < width && grid[row][col] === 'X') {
            const frame = isFilled(row - 1, col) ? this.theme.terrainFill : this.theme.terrainTop;
            this.add.image(col * TILE + TILE / 2, y, 'tiles', frame);
            col++;
          }
          const run = col - start;
          this.addSolid(start * TILE + (run * TILE) / 2, y, run * TILE, TILE);
          continue;
        }

        if (ch === 'x') {
          // decorative terrain (castles etc.) — visual only, no body
          const frame = isFilled(row - 1, col) ? this.theme.terrainFill : this.theme.terrainTop;
          this.add.image(x, y, 'tiles', frame);
          col++;
          continue;
        }

        if (ch === 'P') {
          const start = col;
          while (col < width && grid[row][col] === 'P') col++;
          this.buildPlatform(start, col - start, row);
          continue;
        }

        // Every entity's identity is its grid cell — 'gone' means it was
        // consumed before a pipe trip and must not respawn.
        const key = `r${row}c${col}`;
        const gone = this.consumed.has(key);

        switch (ch) {
          case 'B':
            if (!gone) this.addBlock(x, y, T.BRICK, 'brick', null, key);
            break;
          case '?':
            if (gone) this.addBlock(x, y, T.BLOCK_USED, 'used', null, key);
            else this.addBlock(x, y, T.BLOCK_QUESTION, 'question', 'coin', key);
            break;
          case 'M':
            if (gone) this.addBlock(x, y, T.BLOCK_USED, 'used', null, key);
            else this.addBlock(x, y, T.BLOCK_QUESTION, 'question', 'powerup', key);
            break;
          case 'S':
            if (gone) this.addBlock(x, y, T.BLOCK_USED, 'used', null, key);
            else this.addBlock(x, y, T.BLOCK_QUESTION, 'question', 'star', key);
            break;
          case 'H':
            if (gone) this.addBlock(x, y, T.BLOCK_USED, 'used', null, key);
            else this.addHiddenBlock(x, y, key);
            break;
          case 'c': {
            if (gone) break;
            const coin = this.add.sprite(x, y, 'tiles', T.COIN).play('coin-spin');
            this.physics.add.existing(coin, true);
            coin.setData('key', key);
            this.coins.add(coin);
            break;
          }
          case 'e':
            if (!gone) this.enemies.add(new Walker(this, x, y, key));
            break;
          case 'p':
            this.spawnCol = col;
            this.spawnRow = row; // floor is searched from HERE down (rooms have ceilings!)
            break;
          case 'T':
            this.buildPipe(col, row, false);
            break;
          case 't':
            this.buildPipe(col, row, true);
            break;
          case 'F':
            this.buildFlag(col, row);
            break;
          case 'd':
            this.buildDoor(col, row);
            break;
          default:
            if (DECOR[ch]) {
              this.add.image(x, (row + 1) * TILE, 'tiles', DECOR[ch]).setOrigin(0.5, 1);
            }
        }
        col++;
      }
    }
  }

  /** First terrain row at/below `fromRow` in this column (for pipes/flag/spawn). */
  findFloorRow(col, fromRow = 0) {
    for (let row = fromRow; row < ROWS; row++) {
      if (this.grid[row][col] === 'X') return row;
    }
    return ROWS - 2; // sensible fallback: standard ground height
  }

  buildPlatform(startCol, run, row) {
    const y = row * TILE + TILE / 2;
    for (let i = 0; i < run; i++) {
      let frame = T.PLATFORM_MID;
      if (run === 1) frame = T.PLATFORM_SINGLE;
      else if (i === 0) frame = T.PLATFORM_LEFT;
      else if (i === run - 1) frame = T.PLATFORM_RIGHT;
      this.add.image((startCol + i) * TILE + TILE / 2, y, 'tiles', frame);
    }
    this.addSolid(startCol * TILE + (run * TILE) / 2, y, run * TILE, TILE);
  }

  buildPipe(col, topRow, enterable) {
    const bottomRow = this.findFloorRow(col, topRow);
    const cx = (col + 1) * TILE; // centre of the 2-tile-wide pipe

    // depth 3: pipes render in FRONT of the player, so emerging from
    // (or sinking into) a pipe clips the sprite like in classic Mario
    this.add.image(cx, topRow * TILE + TILE / 2, 'pipe-mouth').setDepth(3);
    const shaftH = (bottomRow - topRow - 1) * TILE;
    if (shaftH > 0) {
      this.add
        .tileSprite(cx, (topRow + 1) * TILE + shaftH / 2, 36, shaftH, 'pipe-shaft')
        .setDepth(3);
    }
    this.pipes.push({ colLeft: col, colRight: col + 1, topRow, cx });

    const height = (bottomRow - topRow) * TILE;
    this.addSolid(cx, topRow * TILE + height / 2, 40, height);

    if (enterable) {
      // thin sensor lying on the pipe mouth — standing here + Down = enter
      const sensor = this.add.zone(cx, topRow * TILE - 4, TILE * 2 - 6, 8);
      this.physics.add.existing(sensor, true);
      this.pipeSensors.add(sensor);
    }
  }

  buildFlag(col, topRow) {
    const bottomRow = this.findFloorRow(col, topRow);
    const x = col * TILE + TILE / 2;

    this.flagSprite = this.add.sprite(x, topRow * TILE + TILE / 2, 'tiles', T.FLAG);
    this.flagSprite.play('flag-wave');
    for (let row = topRow + 1; row < bottomRow; row++) {
      this.add.image(x, row * TILE + TILE / 2, 'tiles', T.POLE);
    }

    this.flagInfo = { x, topY: topRow * TILE, bottomY: bottomRow * TILE };
    this.flagZone = this.add.zone(x, (topRow * TILE + bottomRow * TILE) / 2, 10, bottomRow * TILE - topRow * TILE);
    this.physics.add.existing(this.flagZone, true);
  }

  buildDoor(col, row) {
    const x = col * TILE + TILE / 2;
    this.add.image(x, (row - 1) * TILE + TILE / 2, 'tiles', T.DOOR_TOP);
    this.add.image(x, row * TILE + TILE / 2, 'tiles', T.DOOR_BOTTOM);
    this.doorX = x;
  }

  addBlock(x, y, frame, type, content = null, key = null) {
    const block = this.blocks.create(x, y, 'tiles', frame);
    block.setData('type', type);
    if (content) block.setData('content', content);
    if (key) block.setData('key', key);
    return block;
  }

  /** Invisible block: no body until hit from below (via its sensor). */
  addHiddenBlock(x, y, key) {
    const block = this.addBlock(x, y, T.BLOCK_USED, 'hidden', null, key);
    block.setVisible(false);
    block.body.enable = false;

    const sensor = this.add.zone(x, y, TILE, TILE);
    this.physics.add.existing(sensor, true);
    sensor.setData('block', block);
    this.hiddenSensors.add(sensor);
  }

  addSolid(x, y, width, height) {
    const zone = this.add.zone(x, y, width, height);
    this.physics.add.existing(zone, true);
    this.solids.push(zone);
    return zone;
  }

  spawnPlayer() {
    const col = this.spawnColOverride ?? this.spawnCol ?? 3;

    // Arriving from a bonus room: rise out of the pipe at the spawn column
    const pipe = this.exitViaPipe
      ? this.pipes.find((p) => col >= p.colLeft - 1 && col <= p.colRight + 1)
      : null;

    // Scan from the 'p' marker's row, NOT from the top of the world —
    // otherwise a level with a ceiling would put the player on its roof.
    const fromRow = this.spawnColOverride !== null ? 0 : this.spawnRow ?? 0;
    const floorRow = this.findFloorRow(col, fromRow);
    const feetY = floorRow * TILE;

    this.player = new Player(this, col * TILE + TILE / 2, feetY - 24);
    if (this.startPower !== 'SMALL') {
      this.player.powerState = this.startPower;
      this.player.applyState();
    }
    // icy themes have less friction — the classic slide
    if (this.theme.dragFactor) this.player.setDragFactor(this.theme.dragFactor);

    if (pipe) {
      // start hidden inside the mouth, slide up until standing on it
      const mouthY = pipe.topRow * TILE;
      this.player.x = pipe.cx;
      this.player.y = mouthY + 20;
      this.player.body.enable = false;
      this.player.body.reset(this.player.x, this.player.y);
      this.autoPhase = 'pipe';
      this.tweens.add({
        targets: this.player,
        y: mouthY - 12 * this.player.scale,
        duration: 600,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.player.body.enable = true;
          this.player.body.reset(this.player.x, this.player.y);
          this.autoPhase = null;
        },
      });
      return;
    }

    // feet exactly on the floor, whatever the current scale
    this.player.y = feetY - 12 * this.player.scale;
    this.player.body.reset(this.player.x, this.player.y);
  }

  // ----------------------------------------------------------- parallax

  buildParallax() {
    this.hills = this.add
      .tileSprite(GAME_WIDTH / 2, 414 - 36, Math.ceil(GAME_WIDTH / 3), 24, 'tex-hills')
      .setScale(3)
      .setScrollFactor(0)
      .setDepth(-10);

    // clouds spread across the whole parallax span of the level
    const span = GAME_WIDTH + (this.worldWidth - GAME_WIDTH) * 0.2;
    for (let x = 100; x < span; x += Phaser.Math.Between(160, 240)) {
      const y = Phaser.Math.Between(50, 130);
      if (Phaser.Math.Between(0, 2) === 2) {
        this.add.image(x, y, 'tiles', T.CLOUD_SMALL).setScale(2).setScrollFactor(0.2).setDepth(-10);
      } else {
        this.add.image(x - 36, y, 'tiles', T.CLOUD_LEFT).setScale(2).setScrollFactor(0.2).setDepth(-10);
        this.add.image(x, y, 'tiles', T.CLOUD_MID).setScale(2).setScrollFactor(0.2).setDepth(-10);
        this.add.image(x + 36, y, 'tiles', T.CLOUD_RIGHT).setScale(2).setScrollFactor(0.2).setDepth(-10);
      }
    }
  }

  // ------------------------------------------------------------- blocks

  onPlayerBlockCollide(player, block) {
    const hitFromBelow = player.body.touching.up && block.y < player.y;
    if (!hitFromBelow) return;

    const type = block.getData('type');
    if (type === 'question') {
      this.openQuestionBlock(block);
    } else if (type === 'brick') {
      // classic rule: only BIG or FIRE can smash bricks — small just bonks
      if (this.player.powerState === 'SMALL') this.bumpBlock(block);
      else this.breakBrick(block);
    }
  }

  openQuestionBlock(block) {
    const content = block.getData('content');
    block.setData('type', 'used');
    block.setFrame(T.BLOCK_USED);
    this.consume(block.getData('key'));
    this.bumpBlock(block);

    if (content === 'coin') {
      const coin = this.add.sprite(block.x, block.y - TILE, 'tiles', T.COIN).play('coin-spin');
      sfx.play('coin');
      this.sparkle(block.x, block.y - TILE);
      this.addScore(SCORE_COIN, block.x, block.y - TILE * 2);
      this.registry.values.coins += 1;
      this.tweens.add({
        targets: coin,
        y: coin.y - 30,
        duration: 200,
        ease: 'Quad.easeOut',
        yoyo: true,
        onComplete: () => coin.destroy(),
      });
    } else if (content === 'powerup') {
      if (this.player.powerState === 'SMALL') this.spawnWalkingItem(block, 'mushroom', 'tiles', T.MUSHROOM);
      else this.spawnFireGem(block);
    } else if (content === 'star') {
      this.spawnStar(block);
    }
  }

  breakBrick(block) {
    sfx.play('break');
    this.cameras.main.shake(110, 0.006);
    this.consume(block.getData('key'));
    this.addScore(SCORE_BRICK, block.x, block.y - TILE);
    const { x, y } = block;
    block.destroy();

    const bursts = [
      [-60, -280], [60, -280],
      [-110, -180], [110, -180],
    ];
    bursts.forEach(([vx, vy]) => {
      const frag = this.add.image(x, y, 'tiles', T.BRICK).setScale(0.5);
      this.physics.add.existing(frag);
      frag.body.checkCollision.none = true;
      frag.body.setVelocity(vx + Phaser.Math.Between(-20, 20), vy + Phaser.Math.Between(-40, 0));
      frag.body.setAngularVelocity(Phaser.Math.Between(-400, 400));
      this.tweens.add({
        targets: frag,
        alpha: 0,
        delay: 250,
        duration: 450,
        onComplete: () => frag.destroy(),
      });
    });
  }

  bumpBlock(block) {
    sfx.play('bump');
    this.tweens.add({
      targets: block,
      y: block.y - 6,
      duration: 70,
      ease: 'Quad.easeOut',
      yoyo: true,
    });
  }

  onHiddenSensor(player, sensor) {
    if (player.body.velocity.y >= -40) return; // must be rising into it

    const block = sensor.getData('block');
    const blockBottom = block.y + TILE / 2;
    if (player.body.top > blockBottom + 2 || player.body.top < blockBottom - 14) return;

    sensor.destroy();
    block.setVisible(true);
    block.body.enable = true;
    block.setData('type', 'used');
    this.consume(block.getData('key'));
    this.bumpBlock(block);
    player.body.setVelocityY(50); // head bonk
    this.spawnWalkingItem(block, 'oneup', 'mushroom-1up');
  }

  // -------------------------------------------------------------- items

  emergeItem(block, sprite, onReady) {
    sprite.setDepth(-1);
    sprite.body.enable = false;
    this.tweens.add({
      targets: sprite,
      y: block.y - TILE,
      duration: 450,
      ease: 'Sine.easeOut',
      onComplete: () => {
        sprite.setDepth(1);
        sprite.body.enable = true;
        onReady();
      },
    });
  }

  /** Mushroom-style item: slides, bounces off walls, falls off edges. */
  spawnWalkingItem(block, kind, texture, frame) {
    const item = this.items.create(block.x, block.y, texture, frame);
    item.setData('kind', kind);
    item.body.setSize(14, 14);
    item.body.setOffset(2, 4);
    this.emergeItem(block, item, () => {
      item.setCollideWorldBounds(true);
      item.setBounce(1, 0);
      item.setVelocityX(60);
    });
  }

  spawnFireGem(block) {
    const gem = this.items.create(block.x, block.y, 'gem-fire');
    gem.setData('kind', 'fireGem');
    gem.body.setAllowGravity(false);
    this.emergeItem(block, gem, () => {});
  }

  spawnStar(block) {
    const star = this.items.create(block.x, block.y, 'gem-star');
    star.setData('kind', 'star');
    star.body.setSize(12, 12);
    star.body.setOffset(3, 3);
    this.emergeItem(block, star, () => {
      star.setCollideWorldBounds(true);
      star.setBounce(1, 0);
      star.setVelocity(110, -240);
    });
    const tints = [0xffffff, 0xffe066, 0x66e0ff, 0xff8de1, 0x9dff8d];
    const shimmer = this.time.addEvent({
      delay: 120,
      repeat: -1,
      callback: () => {
        if (!star.active) {
          shimmer.remove();
          return;
        }
        star.setTint(tints[Math.floor(this.time.now / 120) % tints.length]);
      },
    });
  }

  onItemBounce(a, b) {
    // argument order is not guaranteed in group-vs-group collisions
    const item = a.getData && a.getData('kind') ? a : b;
    if (item.getData('kind') === 'star' && item.body.blocked.down) {
      item.setVelocityY(-330);
    }
  }

  onCollectItem(player, item) {
    if (!item.body.enable) return; // still emerging
    const kind = item.getData('kind');
    item.destroy();

    this.sparkle(item.x, item.y, kind === 'oneup' ? 0x9dff8d : 0xffe066);

    if (kind === 'mushroom') {
      sfx.play('powerup');
      this.addScore(SCORE_POWERUP, player.x, player.y - 24);
      if (player.powerState === 'SMALL') player.grow();
    } else if (kind === 'fireGem') {
      sfx.play('powerup');
      this.addScore(SCORE_POWERUP, player.x, player.y - 24);
      player.upgradeToFire();
    } else if (kind === 'star') {
      sfx.play('powerup');
      this.addScore(SCORE_POWERUP, player.x, player.y - 24);
      player.startStar();
    } else if (kind === 'oneup') {
      sfx.play('oneup');
      this.registry.values.lives += 1;
      const popup = this.add
        .text(player.x, player.y - 24, '1-UP!', {
          fontFamily: 'monospace',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#9dff8d',
        })
        .setOrigin(0.5)
        .setStroke('#000000', 3)
        .setDepth(10);
      this.tweens.add({
        targets: popup,
        y: popup.y - 32,
        alpha: 0,
        duration: 900,
        onComplete: () => popup.destroy(),
      });
    }
  }

  // ---------------------------------------------------------- fireballs

  shootFireball() {
    const active = this.fireballs.getChildren().filter((f) => f.active).length;
    if (active >= MAX_FIREBALLS) return;

    sfx.play('fireball');
    const dir = this.player.flipX ? -1 : 1;
    const ball = this.fireballs.create(this.player.x + dir * 14, this.player.y, 'fireball');
    ball.setDepth(2);
    ball.setCircle(5);
    ball.setVelocity(dir * FIREBALL_SPEED, 80);
    ball.body.setAngularVelocity(dir * 600);

    this.time.delayedCall(FIREBALL_LIFETIME, () => {
      if (ball.active) this.poof(ball);
    });
  }

  onFireballBounce(a, b) {
    const ball = a.texture && a.texture.key === 'fireball' ? a : b;
    if (ball.body.blocked.left || ball.body.blocked.right) {
      this.poof(ball);
    } else if (ball.body.blocked.down) {
      ball.setVelocityY(FIREBALL_BOUNCE_VY);
    }
  }

  onFireballHitsEnemy(a, b) {
    const enemy = a instanceof Walker ? a : b;
    const ball = enemy === a ? b : a;
    if (enemy.isSquashed || !ball.body.enable) return;
    sfx.play('stomp');
    this.poof(ball);
    enemy.knockAway(ball.x);
    this.addScore(SCORE_STOMP, enemy.x, enemy.y - 16);
  }

  poof(obj) {
    obj.body.enable = false;
    this.tweens.add({
      targets: obj,
      scale: obj.scale * 1.8,
      alpha: 0,
      duration: 120,
      onComplete: () => obj.destroy(),
    });
  }

  // ------------------------------------------------------ player contact

  /** Remember that a grid entity is gone (survives pipe trips). */
  consume(key) {
    if (key) this.consumed.add(key);
  }

  onCollectCoin(player, coin) {
    coin.body.enable = false;
    this.consume(coin.getData('key'));
    sfx.play('coin');
    this.sparkle(coin.x, coin.y);
    this.addScore(SCORE_COIN, coin.x, coin.y);
    this.registry.values.coins += 1;
    this.tweens.add({
      targets: coin,
      y: coin.y - 24,
      scale: 1.4,
      alpha: 0,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => coin.destroy(),
    });
  }

  onPlayerEnemyContact(player, enemy) {
    if (player.isDead || enemy.isSquashed || this.autoPhase) return;

    if (player.starActive) {
      sfx.play('stomp');
      enemy.knockAway(player.x);
      this.addScore(SCORE_STAR_KILL, enemy.x, enemy.y - 16);
      return;
    }

    const stomping =
      player.body.velocity.y > 0 &&
      player.body.bottom < enemy.body.center.y + 4;

    if (stomping) {
      enemy.squash();
      sfx.play('stomp');
      this.cameras.main.shake(70, 0.004);
      player.body.setVelocityY(STOMP_BOUNCE);
      this.addScore(SCORE_STOMP, enemy.x, enemy.y - 16);
    } else {
      this.hurtPlayer();
    }
  }

  /** Little burst of glittery squares (coin and item pick-ups). */
  sparkle(x, y, tint = 0xffe066) {
    const particles = this.add
      .particles(x, y, 'spark', {
        speed: { min: 50, max: 150 },
        lifespan: 350,
        scale: { start: 1.3, end: 0 },
        tint,
        emitting: false,
      })
      .setDepth(5);
    particles.explode(8);
    this.time.delayedCall(500, () => particles.destroy());
  }

  hurtPlayer() {
    const p = this.player;
    if (p.isDead || p.invulnerable || p.isTransforming || p.starActive || this.autoPhase) return;

    if (p.powerState === 'SMALL') {
      this.killPlayer();
    } else {
      sfx.play('hurt');
      p.downgrade();
    }
  }

  killPlayer() {
    if (this.player.isDead) return;
    sfx.stopMusic();
    sfx.play('death');
    this.player.die();
    this.cameras.main.stopFollow();
    this.time.delayedCall(1800, () => {
      const lives = (this.registry.get('lives') ?? 3) - 1;
      this.registry.set('lives', lives);
      // dying in a bonus room restarts the level it belongs to
      const levelId = this.returnTo?.levelId ?? this.levelId;
      if (lives > 0) this.scene.start('IntroScene', { levelId });
      else this.scene.start('GameOverScene');
    });
  }

  addScore(amount, x, y) {
    this.registry.values.score += amount;
    const popup = this.add
      .text(x, y, `+${amount}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setStroke('#000000', 3)
      .setDepth(10);
    this.tweens.add({
      targets: popup,
      y: y - 28,
      alpha: 0,
      duration: 600,
      onComplete: () => popup.destroy(),
    });
  }

  // -------------------------------------------- flag & level transitions

  startFlagSequence(player, zone) {
    if (this.autoPhase || player.isDead) return;
    this.autoPhase = 'flag';
    sfx.stopMusic();
    sfx.play('flag');

    const { x, topY, bottomY } = this.flagInfo;

    // higher grab = more points: 100 (bottom) … 5000 (top)
    const ratio = Phaser.Math.Clamp((bottomY - player.body.bottom) / (bottomY - topY), 0, 1);
    const points = 100 + Math.round(ratio * 49) * 100;
    this.addScore(points, x, topY - 10);

    player.body.enable = false;
    player.setFlipX(true);
    player.x = x + 10;
    player.anims.play(`${player.animPrefix}-jump`);

    // flag + player slide down the pole together
    this.tweens.add({ targets: this.flagSprite, y: bottomY - TILE, duration: 700 });
    this.tweens.add({
      targets: player,
      y: bottomY - 12 * player.scale,
      duration: 400 + ratio * 500,
      onComplete: () => {
        player.body.enable = true;
        player.body.reset(player.x, player.y);
        player.setFlipX(false);
        this.autoPhase = 'walk'; // update() walks them to the door
      },
    });
  }

  finishLevel() {
    this.autoPhase = 'done';
    this.player.body.setVelocityX(0);

    // remaining time becomes points (50 per second, like the classics)
    const t = this.registry.get('time') ?? 0;
    if (t > 0) {
      this.registry.set('time', 0);
      this.addScore(t * 50, this.player.x, this.player.y - 40);
    }

    this.tweens.add({ targets: this.player, alpha: 0, duration: 250 }); // into the door
    this.cameras.main.fadeOut(700);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.level.next === 'end') {
        this.scene.start('EndScene');
      } else {
        this.scene.start('IntroScene', {
          levelId: this.level.next,
          powerState: this.player.powerState,
        });
      }
    });
  }

  enterPipe(target) {
    this.autoPhase = 'pipe';
    sfx.play('pipe');
    const p = this.player;
    p.body.enable = false;
    p.body.setVelocity(0, 0);
    this.tweens.add({
      targets: p,
      y: p.y + 26,
      duration: 450,
      ease: 'Sine.easeIn',
    });
    this.cameras.main.fadeOut(450);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart(target));
  }

  // ------------------------------------------------------- timer & pause

  setupTimer() {
    // pipe travel keeps the clock running; everything else resets it
    if (!this.keepTime) this.registry.set('time', this.level.time ?? 300);
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.autoPhase || this.player.isDead) return;
        const t = (this.registry.get('time') ?? 0) - 1;
        this.registry.set('time', Math.max(0, t));
        if (t <= 0) this.killPlayer(); // time up — power state doesn't save you
      },
    });
  }

  setupPause() {
    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    this.input.keyboard.on('keydown-P', () => this.pauseGame());
  }

  /** Also called by the HUD's pause button. */
  pauseGame() {
    if (this.autoPhase || this.player.isDead || this.scene.isPaused()) return;
    this.scene.launch('PauseScene');
    this.scene.pause();
  }

  // -------------------------------------------------------------- input

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SHIFT,X');
    this.jumpWasHeld = false;
    this.fireWasHeld = false;
  }

  // -------------------------------------------------------------- update

  update() {
    if (this.hills) {
      this.hills.tilePositionX = (this.cameras.main.scrollX * 0.4) / 3;
    }

    if (this.player.isDead) return;

    // fell into a pit
    if (this.player.y > GAME_HEIGHT + 40 && !this.autoPhase) {
      this.killPlayer();
      return;
    }

    if (this.autoPhase === 'walk') {
      // auto-walk to the castle door after the flag slide
      this.player.handleInput({ left: false, right: true, jumpHeld: false, jumpPressed: false });
      if (this.doorX === null || this.player.x >= this.doorX - 2) this.finishLevel();
      return;
    }
    if (this.autoPhase) return; // pipe / flag / done — tweens are in charge

    const left = this.cursors.left.isDown || this.keys.A.isDown || touchState.left;
    const right = this.cursors.right.isDown || this.keys.D.isDown || touchState.right;
    const down = this.cursors.down.isDown || this.keys.S.isDown || touchState.down;
    const jumpHeld =
      this.cursors.up.isDown ||
      this.cursors.space.isDown ||
      this.keys.W.isDown ||
      touchState.jump;
    const fireHeld = this.keys.SHIFT.isDown || this.keys.X.isDown || touchState.fire;

    const jumpPressed = jumpHeld && !this.jumpWasHeld;
    const firePressed = fireHeld && !this.fireWasHeld;
    this.jumpWasHeld = jumpHeld;
    this.fireWasHeld = fireHeld;

    this.player.handleInput({ left, right, jumpHeld, jumpPressed });

    if (firePressed && this.player.powerState === 'FIRE' && !this.player.isTransforming) {
      this.shootFireball();
    }

    // standing on a secret pipe + Down = travel
    if (down && this.pipeUnder && this.player.body.onFloor()) {
      // level state travels with us, so the world is as we left it
      const consumed = { ...this.consumedAll, [this.levelId]: [...this.consumed] };
      const target = this.level.secret
        ? {
            levelId: this.level.secret.room,
            powerState: this.player.powerState,
            returnTo: { levelId: this.levelId, spawnCol: this.level.secret.exitCol },
            keepTime: true,
            consumed,
          }
        : {
            // exit pipe of a bonus room — back to the caller (with a
            // safe fallback if the return info was somehow lost)
            levelId: this.returnTo?.levelId ?? 'level1',
            spawnCol: this.returnTo?.spawnCol ?? null,
            powerState: this.player.powerState,
            exitViaPipe: true,
            keepTime: true,
            consumed,
          };
      this.enterPipe(target);
    }
    this.pipeUnder = null; // refreshed by the overlap every frame

    // tidy up items and enemies that fell into pits
    this.items.getChildren().forEach((item) => {
      if (item.y > GAME_HEIGHT + 60) item.destroy();
    });
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.y > GAME_HEIGHT + 60) {
        this.consume(enemy.gridKey); // gone for good, like a kill
        enemy.destroy();
      }
    });
  }
}
