import Phaser from 'phaser';
import { sfx } from '../audio/sfx.js';

// ---- Movement tuning (the "game feel" numbers) ----
const ACCELERATION = 1600;
const DRAG = 1300;
const MAX_RUN_SPEED = 240;
const MAX_FALL_SPEED = 900;
const JUMP_VELOCITY = -480;
const JUMP_CUT_VELOCITY = -160;
const EXTRA_FALL_GRAVITY = 900;

// ---- Power-up tuning ----
const BIG_SCALE = 1.5; // ~2 tiles tall, like classic big Mario
const STAR_DURATION = 8000;
const STAR_WARNING = 2000; // flash faster during the last 2s
const HURT_INVULN_DURATION = 2000;
const STAR_TINTS = [0xffffff, 0xffe066, 0x66e0ff, 0xff8de1, 0x9dff8d, 0xffa05c];

/**
 * The player, with a small state machine for power-ups:
 *
 *   SMALL ──mushroom──▶ BIG ──fire gem──▶ FIRE
 *     ▲                  │                  │
 *     └────hit───────────┘◀───────hit───────┘   (SMALL + hit = death)
 *
 * STAR is not a state in the chain — it's a temporary *overlay* flag that
 * can stack on any state, because being invincible doesn't change what
 * you are, only how contacts resolve.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'chars', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.powerState = 'SMALL';
    this.starUntil = 0; // timestamp when invincibility runs out
    this.invulnerable = false; // brief mercy window after taking a hit
    this.isTransforming = false; // mid grow/shrink freeze-frame
    this.isDead = false;
    this.jumpWasHeld = false;
    this.wasOnFloor = true;
    this.stretchTween = null;

    this.setDepth(2); // in front of items (1), terrain (0) and the sky (-10)
    this.setCollideWorldBounds(true);
    this.body.setMaxVelocity(MAX_RUN_SPEED, MAX_FALL_SPEED);
    this.body.setDragX(DRAG);
    this.applyState();
  }

  get starActive() {
    return this.scene && this.scene.time.now < this.starUntil;
  }

  /** FIRE uses the orange character's animations — a Kenney palette swap. */
  get animPrefix() {
    return this.powerState === 'FIRE' ? 'fire' : 'player';
  }

  get baseScale() {
    return this.powerState === 'SMALL' ? 1 : BIG_SCALE;
  }

  /** Icy levels pass a factor < 1: less drag = longer slides. */
  setDragFactor(factor) {
    this.body.setDragX(DRAG * factor);
  }

  /** Squash & stretch: cartoon elasticity on jump (tall) and land (flat).
   *  Purely visual — syncBodyToScale keeps the hitbox constant throughout. */
  squashStretch(sx, sy) {
    if (this.isTransforming) return;
    const s = this.baseScale;
    if (this.stretchTween) this.stretchTween.stop();
    this.setScale(s * sx, s * sy);
    this.syncBodyToScale();
    this.stretchTween = this.scene.tweens.add({
      targets: this,
      scaleX: s,
      scaleY: s,
      duration: 140,
      ease: 'Quad.easeOut',
      onUpdate: () => this.syncBodyToScale(),
      onComplete: () => this.syncBodyToScale(),
    });
  }

  /** Re-derive scale + physics body from the current power state. */
  applyState() {
    this.setScale(this.baseScale);
    this.syncBodyToScale();
  }

  /**
   * Keep the EFFECTIVE collision box constant no matter how the sprite
   * is scaled. Arcade bodies are sized in unscaled frame pixels and
   * multiplied by the sprite scale — so visual tricks like squash &
   * stretch would warp the hitbox (and a taller body on take-off
   * cancels the jump against the floor!). We divide it back out and
   * anchor the body bottom to the frame bottom (the feet).
   */
  syncBodyToScale() {
    const effW = 16;
    const effH = this.powerState === 'SMALL' ? 20 : 30;
    const unitW = effW / this.scaleX;
    const unitH = effH / this.scaleY;
    this.body.setSize(unitW, unitH);
    // The sprite origin is its CENTRE, so a squashed frame's bottom edge
    // rises with scaleY — anchoring the body to the frame bottom would
    // lift it off the floor (and re-trigger landing forever). Anchor the
    // body bottom to the at-rest feet position instead:
    //   bodyBottom = y + 12 * baseScale   (constant for any squash)
    const offY = 12 + (12 * this.baseScale) / this.scaleY - unitH;
    this.body.setOffset((24 - unitW) / 2, offY);
  }

  // ------------------------------------------------------- transitions

  /** Mushroom collected while SMALL. */
  grow() {
    this.changeState('BIG');
  }

  /** Fire gem collected. */
  upgradeToFire() {
    // Edge case: gem grabbed while SMALL (e.g. after getting hit while
    // it was on its block) — one step up, like the mushroom.
    this.changeState(this.powerState === 'SMALL' ? 'BIG' : 'FIRE');
  }

  /** Hit while BIG or FIRE: one step down + a mercy window. */
  downgrade() {
    this.changeState(this.powerState === 'FIRE' ? 'BIG' : 'SMALL');
    this.invulnerable = true;
    // blink for the whole invulnerability window
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: HURT_INVULN_DURATION / 200 - 1,
      onComplete: () => {
        this.setAlpha(1);
        this.invulnerable = false;
      },
    });
  }

  /**
   * Shared transition: brief freeze-frame (physics paused, like classic
   * Mario) + a scale pulse, with the feet kept planted on the ground.
   */
  changeState(newState) {
    if (this.isTransforming || newState === this.powerState) return;
    this.isTransforming = true;
    if (this.stretchTween) this.stretchTween.stop(); // both animate scale

    // Feet sit at the frame bottom: screenY = y + 12 * scale.
    // Keep them planted when the scale changes.
    const oldFeet = this.y + 12 * this.scale;
    this.powerState = newState;
    this.applyState();
    this.y = oldFeet - 12 * this.scale;
    this.body.reset(this.x, this.y); // snap the body to the new position

    this.scene.physics.world.pause();
    const finalScale = this.scale;
    this.setScale(finalScale * 0.75);
    this.scene.tweens.add({
      targets: this,
      scale: finalScale,
      duration: 120,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.setScale(finalScale);
        this.syncBodyToScale();
        this.isTransforming = false;
        this.scene.physics.world.resume();
      },
    });
  }

  startStar() {
    this.starUntil = this.scene.time.now + STAR_DURATION;
  }

  /** Death visuals: flip and fall through the world (scene handles restart). */
  die() {
    this.isDead = true;
    this.body.checkCollision.none = true;
    this.setCollideWorldBounds(false);
    this.body.setAccelerationX(0);
    this.body.setDragX(0);
    this.body.setVelocity(0, -420);
    this.setFlipY(true);
    this.anims.play(`${this.animPrefix}-jump`);
  }

  // ----------------------------------------------------------- updates

  /** Called by GameScene every frame with the merged input state. */
  handleInput({ left, right, jumpHeld, jumpPressed }) {
    if (this.isDead || this.isTransforming) return;

    const body = this.body;
    const onGround = body.onFloor();

    if (left && !right) {
      body.setAccelerationX(-ACCELERATION);
      this.setFlipX(true);
    } else if (right && !left) {
      body.setAccelerationX(ACCELERATION);
      this.setFlipX(false);
    } else {
      body.setAccelerationX(0);
    }

    if (jumpPressed && onGround) {
      body.setVelocityY(JUMP_VELOCITY);
      sfx.play('jump');
      this.squashStretch(0.82, 1.18); // stretch tall on take-off
    }
    if (!jumpHeld && body.velocity.y < JUMP_CUT_VELOCITY) {
      body.setVelocityY(JUMP_CUT_VELOCITY);
    }
    body.setGravityY(body.velocity.y > 0 ? EXTRA_FALL_GRAVITY : 0);

    if (!onGround) this.anims.play(`${this.animPrefix}-jump`, true);
    else if (Math.abs(body.velocity.x) > 10) this.anims.play(`${this.animPrefix}-run`, true);
    else this.anims.play(`${this.animPrefix}-idle`, true);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    // Landing: squash flat for a moment
    if (!this.isDead && this.body) {
      const onFloor = this.body.onFloor();
      if (onFloor && !this.wasOnFloor) this.squashStretch(1.18, 0.82);
      this.wasOnFloor = onFloor;
    }

    // Star rainbow flash — driven by time, faster as it runs out
    if (this.starUntil > 0) {
      const remaining = this.starUntil - time;
      if (remaining <= 0) {
        this.starUntil = 0;
        this.clearTint();
      } else {
        const interval = remaining < STAR_WARNING ? 45 : 90;
        const idx = Math.floor(time / interval) % STAR_TINTS.length;
        this.setTint(STAR_TINTS[idx]);
      }
    }
  }
}
