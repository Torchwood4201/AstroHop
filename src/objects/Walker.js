import Phaser from 'phaser';

const WALK_SPEED = 40;

// A goomba-style patrolling beaver. Extending Arcade.Sprite means Phaser
// calls our preUpdate() automatically every frame — the enemy carries
// its own behaviour instead of GameScene micro-managing it.
export default class Walker extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, gridKey = null) {
    super(scene, x, y, 'beaver-0');
    scene.add.existing(this); // register for rendering + updates
    scene.physics.add.existing(this); // give it a dynamic body
    this.gridKey = gridKey; // identity for cross-pipe level state

    this.body.setSize(16, 14);
    this.body.setOffset(8, 10); // 32-wide beaver frame: centre 16px body, feet at the bottom
    this.setDepth(1); // same layer as items, above terrain
    this.setCollideWorldBounds(true);

    this.direction = -1; // start walking left, toward the player
    this.isSquashed = false;
    this.play('walker-walk');
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta); // keeps the animation running

    if (this.isSquashed) return;

    // Sleep when far off-camera: no patrolling or edge probes for
    // enemies the player can't see (perf + they stay where designed).
    const cam = this.scene.cameras.main;
    if (Math.abs(this.x - (cam.scrollX + cam.width / 2)) > 1100) {
      this.setVelocityX(0);
      return;
    }

    // Turn at walls (blocked = static obstacle, touching = another enemy)
    if (this.body.blocked.left || this.body.touching.left) {
      this.direction = 1;
    } else if (this.body.blocked.right || this.body.touching.right) {
      this.direction = -1;
    }

    // Turn at platform edges: probe a tiny rectangle just ahead of and
    // below the front foot — if no static body is there, it's a cliff.
    if (this.body.onFloor()) {
      const aheadX = this.direction > 0 ? this.body.right + 2 : this.body.left - 3;
      const ground = this.scene.physics.overlapRect(
        aheadX, this.body.bottom + 2, 2, 4,
        false, true // ignore dynamic bodies, include static ones
      );
      if (ground.length === 0) this.direction *= -1;
    }

    this.setVelocityX(WALK_SPEED * this.direction);
    this.setFlipX(this.direction > 0);
  }

  /** Killed by a thrown axe or a star-powered player: flip and fall away. */
  knockAway(fromX = this.x) {
    this.isSquashed = true; // reuse the flag: stops AI and contact checks
    this.scene.consume?.(this.gridKey);
    this.anims.stop();
    this.body.checkCollision.none = true;
    this.setFlipY(true);
    const dir = this.x < fromX ? -1 : 1;
    this.body.setVelocity(dir * 120, -280);
    this.body.setAngularVelocity(dir * 240);
    this.scene.time.delayedCall(900, () => this.destroy());
  }

  /** Stomped from above: flatten, stop interacting, vanish shortly after. */
  squash() {
    this.isSquashed = true;
    this.scene.consume?.(this.gridKey);
    this.anims.stop();
    this.setTexture('beaver-flat');
    this.body.checkCollision.none = true;
    this.body.setVelocity(0, 0);
    this.body.allowGravity = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: 300,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }
}
