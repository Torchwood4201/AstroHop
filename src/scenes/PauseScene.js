import Phaser from 'phaser';
import { saveHighScore } from '../highscore.js';

// Overlay launched on top of a paused GameScene.
// Works with keyboard (arrows + enter), mouse and touch.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create() {
    const { width, height } = this.scale;
    this.scale.once('resize', () => this.scene.restart());

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    this.add
      .text(width / 2, 150, 'PAUSED', {
        fontFamily: 'monospace',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setStroke('#000000', 6);

    this.options = [
      { label: 'RESUME', action: () => this.resumeGame() },
      { label: 'QUIT TO TITLE', action: () => this.quitToTitle() },
    ];
    this.selected = 0;
    this.texts = this.options.map((opt, i) => {
      const t = this.add
        .text(width / 2, 230 + i * 48, opt.label, {
          fontFamily: 'monospace',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setStroke('#000000', 4)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.select(i));
      t.on('pointerdown', () => opt.action());
      return t;
    });
    this.select(0);

    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.select(this.selected - 1));
    kb.on('keydown-DOWN', () => this.select(this.selected + 1));
    kb.on('keydown-W', () => this.select(this.selected - 1));
    kb.on('keydown-S', () => this.select(this.selected + 1));
    kb.on('keydown-ENTER', () => this.options[this.selected].action());
    kb.on('keydown-SPACE', () => this.options[this.selected].action());
    kb.on('keydown-ESC', () => this.resumeGame());
    kb.on('keydown-P', () => this.resumeGame());
  }

  select(i) {
    this.selected = Phaser.Math.Wrap(i, 0, this.options.length);
    this.texts.forEach((t, idx) => {
      const on = idx === this.selected;
      t.setColor(on ? '#ffe066' : '#ffffff');
      t.setText((on ? '▶ ' : '  ') + this.options[idx].label + (on ? ' ◀' : '  '));
    });
  }

  resumeGame() {
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  quitToTitle() {
    saveHighScore(this.registry.get('score') ?? 0);
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.start('TitleScene');
  }
}
