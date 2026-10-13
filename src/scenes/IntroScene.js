import Phaser from 'phaser';
import { LEVELS } from '../levels/index.js';

// The black card between levels: "WORLD 1-1" + lives, ~2 seconds.
export default class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  init(data) {
    this.levelId = data.levelId ?? 'level1';
    this.powerState = data.powerState ?? 'SMALL'; // carried across levels
  }

  create() {
    const { width, height } = this.scale;
    this.scene.stop('HUDScene');
    this.cameras.main.setBackgroundColor('#000000');
    this.scale.once('resize', () => this.scene.restart());

    this.add
      .text(width / 2, height / 2 - 50, LEVELS[this.levelId].name, {
        fontFamily: 'monospace',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // lives: the hero's face next to the count
    this.add.sprite(width / 2 - 30, height / 2 + 14, 'chars', 0);
    this.add
      .text(width / 2 + 4, height / 2 + 14, `× ${this.registry.get('lives') ?? 3}`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);

    this.time.delayedCall(2000, () =>
      this.scene.start('GameScene', { levelId: this.levelId, powerState: this.powerState })
    );
  }
}
