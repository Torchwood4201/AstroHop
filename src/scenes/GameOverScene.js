import Phaser from 'phaser';
import { saveHighScore } from '../highscore.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    const { width, height } = this.scale;
    this.scene.stop('HUDScene');
    this.cameras.main.setBackgroundColor('#000000');
    this.scale.once('resize', () => this.scene.restart());
    saveHighScore(this.registry.get('score') ?? 0);

    this.add
      .text(width / 2, height / 2 - 20, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#ff6b6b',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 40, `SCORE ${String(this.registry.get('score') ?? 0).padStart(6, '0')}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const toTitle = () => this.scene.start('TitleScene');
    this.time.delayedCall(3000, toTitle);
    this.input.keyboard.once('keydown-SPACE', toTitle);
    this.input.once('pointerdown', toTitle);
  }
}
