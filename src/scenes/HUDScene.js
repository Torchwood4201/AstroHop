import Phaser from 'phaser';
import { sfx } from '../audio/sfx.js';

// The in-game HUD: SCORE, COINS, WORLD, TIME, LIVES + pause/fullscreen.
// Laid out from the CURRENT game width (the logical view is narrower on
// phones in portrait) and re-laid out whenever the size changes.
export default class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUDScene');
  }

  create() {
    const mkText = (text, color) =>
      this.add
        .text(0, 0, text, {
          fontFamily: 'monospace',
          fontSize: '14px',
          fontStyle: 'bold',
          color,
        })
        .setStroke('#000000', 3);

    this.labels = {
      score: mkText('SCORE', '#cfe8ff'),
      coins: mkText('COINS', '#cfe8ff'),
      world: mkText('WORLD', '#cfe8ff'),
      time: mkText('TIME', '#cfe8ff'),
      lives: mkText('LIVES', '#cfe8ff'),
    };
    this.values = {
      score: mkText('', '#ffffff'),
      coins: mkText('', '#ffffff'),
      world: mkText('', '#ffffff'),
      time: mkText('', '#ffffff'),
      lives: mkText('', '#ffffff'),
    };
    this.coinIcon = this.add.sprite(0, 0, 'tiles', 151).play('coin-spin').setScale(0.9);
    this.livesIcon = this.add.sprite(0, 0, 'chars', 0).setScale(0.8);

    const corner = (txt, onTap) => {
      const btn = this.add
        .text(0, 4, txt, {
          fontFamily: 'monospace',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(1, 0)
        .setStroke('#000000', 3)
        .setAlpha(0.85)
        .setPadding(10)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', onTap);
      return btn;
    };
    this.pauseBtn = corner('▐▐', () => {
      const gs = this.scene.get('GameScene');
      if (gs.scene.isActive()) gs.pauseGame();
    });
    this.fsBtn = corner('⛶', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });
    this.muteBtn = corner('♪', () => {
      const muted = sfx.toggleMute();
      this.muteBtn.setAlpha(muted ? 0.3 : 0.85);
    });
    this.muteBtn.setAlpha(sfx.muted ? 0.3 : 0.85);

    this.layout();
    this.refresh();

    this.scale.on('resize', this.layout, this);
    this.registry.events.on('changedata', this.refresh, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.registry.events.off('changedata', this.refresh, this);
    });
  }

  layout() {
    const w = this.scale.width;
    const compact = w < 700;
    const labelSize = compact ? '11px' : '14px';
    const valueSize = compact ? '13px' : '16px';

    const cols = {
      score: 14,
      coins: Math.round(w * 0.21),
      world: Math.round(w * 0.42),
      time: Math.round(w * 0.58),
      lives: Math.round(w * 0.73),
    };

    for (const key of Object.keys(cols)) {
      this.labels[key].setFontSize(labelSize).setPosition(cols[key], 8);
      this.values[key].setFontSize(valueSize).setPosition(cols[key], 26);
    }
    // coin / lives values make room for their icons
    this.coinIcon.setPosition(cols.coins + 7, 34);
    this.values.coins.setX(cols.coins + 18);
    this.livesIcon.setPosition(cols.lives + 9, 34);
    this.values.lives.setX(cols.lives + 22);

    this.pauseBtn.setX(w - 4);
    this.fsBtn.setX(w - 48);
    this.muteBtn.setX(w - 92);
  }

  refresh() {
    const r = this.registry;
    this.values.score.setText(String(r.get('score') ?? 0).padStart(6, '0'));
    this.values.coins.setText('x' + String(r.get('coins') ?? 0).padStart(2, '0'));
    this.values.world.setText(r.get('world') ?? '1-1');
    this.values.time.setText(String(r.get('time') ?? 0).padStart(3, '0'));
    this.values.lives.setText('x' + String(r.get('lives') ?? 3));
  }
}
