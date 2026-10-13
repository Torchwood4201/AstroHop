import Phaser from 'phaser';
import { loadHighScore } from '../highscore.js';

// Title screen with a living slice of the game world behind the logo —
// no physics, just sprites, animations and tweens.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { width, height } = this.scale;
    this.scene.stop('HUDScene');
    this.cameras.main.setBackgroundColor('#5c94fc');
    // re-centre everything if the device rotates (logical size changes)
    this.scale.once('resize', () => this.scene.restart());

    // --- animated background: hills, clouds, ground, critters
    this.hills = this.add
      .tileSprite(width / 2, 414 - 36, Math.ceil(width / 3), 24, 'tex-hills')
      .setScale(3);

    [{ x: 120, y: 70 }, { x: 420, y: 110 }, { x: 690, y: 60 }].forEach(({ x, y }, i) => {
      // NOTE: the container is scaled 2x and that scales child POSITIONS
      // too — so children sit 18px apart locally to end up 36px apart
      // on screen (the width of one scaled tile, i.e. seamless).
      const cloud = this.add.container(x, y, [
        this.add.image(-18, 0, 'tiles', 153),
        this.add.image(0, 0, 'tiles', 154),
        this.add.image(18, 0, 'tiles', 155),
      ]).setScale(2);
      this.tweens.add({
        targets: cloud,
        x: x + 40,
        duration: 6000 + i * 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    this.add.tileSprite(width / 2, 414 + 9, width, 18, 'tex-grass-top');
    this.add.tileSprite(width / 2, 414 + 29, width, 22, 'tex-dirt');

    // scenery: pipe, blocks, coins
    this.add.image(700, 414 - 9, 'pipe-mouth');
    this.add.tileSprite(700, 414 - 9 + 18, 36, 18, 'pipe-shaft');
    this.add.image(540, 320, 'tiles', 10); // question block
    this.add.image(558, 320, 'tiles', 6); // brick
    this.add.sprite(180, 396, 'tiles', 151).play('coin-spin');
    this.add.sprite(240, 350, 'tiles', 151).play('coin-spin');
    this.add.image(80, 414, 'tiles', 125).setOrigin(0.5, 1); // bush
    this.add.image(620, 414, 'tiles', 126).setOrigin(0.5, 1); // pine

    // patrolling walkers
    [{ from: 230, to: 470, y: 402, d: 5200 }, { from: 320, to: 180, y: 402, d: 3400 }].forEach(
      ({ from, to, y, d }) => {
        const w = this.add.sprite(from, y, 'chars', 18).play('walker-walk');
        w.setFlipX(to > from);
        this.tweens.add({
          targets: w,
          x: to,
          duration: d,
          yoyo: true,
          repeat: -1,
          onYoyo: () => w.setFlipX(!w.flipX),
          onRepeat: () => w.setFlipX(!w.flipX),
        });
      }
    );

    // the hero, idling by the logo
    this.add.sprite(120, 398, 'chars', 0).play('player-idle').setScale(1.5);

    // --- logo + texts
    const logo = this.add
      .text(width / 2, 120, 'ASTRO HOP', {
        fontFamily: 'monospace',
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#ffe066',
      })
      .setOrigin(0.5)
      .setStroke('#7a3045', 10)
      .setShadow(0, 6, '#00000055', 0, true, true);
    this.tweens.add({
      targets: logo,
      y: 112,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(width / 2, 168, 'A RETRO PLATFORMER', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setStroke('#000000', 3);

    this.add
      .text(width / 2, 210, `HI ${String(loadHighScore()).padStart(6, '0')}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#9dff8d',
      })
      .setOrigin(0.5)
      .setStroke('#000000', 3);

    const prompt = this.add
      .text(width / 2, 290, 'PRESS START  /  TAP TO START', {
        fontFamily: 'monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setStroke('#000000', 4);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 550, yoyo: true, repeat: -1 });

    // fullscreen toggle (works on desktop and Android; iPhones don't
    // support the Fullscreen API)
    const fsBtn = this.add
      .text(width - 10, 8, '⛶', {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(1, 0)
      .setStroke('#000000', 4)
      .setAlpha(0.85)
      .setPadding(10)
      .setInteractive({ useHandCursor: true });
    fsBtn.on('pointerdown', (pointer, lx, ly, event) => {
      event.stopPropagation(); // don't trigger "tap to start"
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });

    // --- start: keyboard, mouse or touch
    const start = () => {
      this.registry.set('score', 0);
      this.registry.set('coins', 0);
      this.registry.set('lives', 3);
      this.scene.start('IntroScene', { levelId: 'level1' });
    };
    this.input.keyboard.once('keydown-SPACE', start);
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.once('pointerdown', start);
  }

  update() {
    this.hills.tilePositionX += 0.08; // slow drift
  }
}
