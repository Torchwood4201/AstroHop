import Phaser from 'phaser';
import { saveHighScore } from '../highscore.js';

// Shown after the last level: thanks, then back to the title screen.
export default class EndScene extends Phaser.Scene {
  constructor() {
    super('EndScene');
  }

  create() {
    const { width, height } = this.scale;
    this.scene.stop('HUDScene');
    this.cameras.main.setBackgroundColor('#000000');
    this.scale.once('resize', () => this.scene.restart());
    saveHighScore(this.registry.get('score') ?? 0);

    this.add
      .text(width / 2, height / 2 - 60, 'WORLD 1 COMPLETE!', {
        fontFamily: 'monospace',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ffe066',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2, 'THANK YOU FOR PLAYING — WORLD 2 COMING SOON', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 40, `SCORE ${String(this.registry.get('score') ?? 0).padStart(6, '0')}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(width / 2, height / 2 + 100, 'PRESS SPACE / TAP TO CONTINUE', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9dff8d',
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    const toTitle = () => this.scene.start('TitleScene');
    this.input.keyboard.once('keydown-SPACE', toTitle);
    this.input.once('pointerdown', toTitle);
  }
}
