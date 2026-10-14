import Phaser from 'phaser';
import { sfx } from '../audio/sfx.js';

// ---- Movement tuning (the "game feel" numbers) ----
const ACCELERATION = 1600;
const RUN_ACCELERATION = 2200; // holding run (fire button) accelerates harder
const DRAG = 1300;
const MAX_RUN_SPEED = 240; // walk cap — the classic pace
const MAX_SPRINT_SPEED = 330; // run cap while holding run (SMW Y-button style)
const MAX_FALL_SPEED = 900;
const JUMP_VELOCITY = -480; // base; scaled up with horizontal speed (SMW-style)
const SPIN_VELOCITY = -380; // spin jump is shorter by design (SMW-style)
const JUMP_CUT_VELOCITY = -160;
const SPIN_CUT_VELOCITY = -140;
const EXTRA_FALL_GRAVITY = 900;

// ---- Sprite frame geometry: the SNES-size jack is 24x32, origin centre.
// Physics anchors the body bottom to the frame bottom (the boots).
export const FRAME_HALF_W = 12;
export const FRAME_HALF_H = 16;

// ---- Power-up tuning ----
const BIG_SCALE = 1.5; // ~2 tiles tall — the lumberjack stands TALL after lunch
const STAR_DURATION = 8000;
const STAR_WARNING = 2000; // flash faster during the last 2s
const HURT_INVULN_DURATION = 2000;
const STAR_TINTS = [0xffffff, 0xffe066, 0x66e0ff, 0xff8de1, 0x9dff8d, 0xffa05c];

/**
 * The player, with a small state machine for power-ups:
 *
 *   SMALL ──poutine──▶ BIG ──ember──▶ EMBER (throws axes)
 *     ▲                  │                  │
 *     └────hit───────────┘◀───────hit───────┘   (SMALL + hit = death)
 *
 * STAR is not a state in the chain — it's a temporary *overlay* flag that
 * can stack on any state, because being invincible doesn't change what
 * you are, only how contacts resolve.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'jack-0');
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
    // SMW-port: jumpType 0 = grounded, 1 = normal jump, 2 = spin jump.
    this.jumpType = 0;
    this.isSpinning = false;

    this.setDepth(2); // in front of items (1), terrain (0) and the sky (-10)
    this.setCollideWorldBounds(true);
    this.body.setMaxVelocity(MAX_RUN_SPEED, MAX_FALL_SPEED);
    this.body.setDragX(DRAG);
    this.applyState();
  }

  get starActive() {
    return this.scene && this.scene.time.now < this.starUntil;
  }

  /** EMBER uses the blaze-orange shirt animations — a campfire palette swap. */
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
    //   bodyBottom = y + FRAME_HALF_H * baseScale   (constant for any squash)
    const offY = FRAME_HALF_H + (FRAME_HALF_H * this.baseScale) / this.scaleY - unitH;
    this.body.setOffset((FRAME_HALF_W * 2 - unitW) / 2, offY);
  }

  // ------------------------------------------------------- transitions

  /** Poutine collected while SMALL. */
  grow() {
    this.changeState('BIG');
  }

  /** Ember collected. */
  upgradeToFire() {
    // Edge case: ember grabbed while SMALL (e.g. after getting hit while
    // it was on its block) — one step up, like the poutine.
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
   * Shared transition: brief freeze-frame (physics paused, like the
   * classics) + a scale pulse, with the feet kept planted on the ground.
   */
  changeState(newState) {
    if (this.isTransforming || newState === this.powerState) return;
    this.isTransforming = true;
    if (this.stretchTween) this.stretchTween.stop(); // both animate scale

    // Feet sit at the frame bottom: screenY = y + FRAME_HALF_H * scale.
    // Keep them planted when the scale changes.
    const oldFeet = this.y + FRAME_HALF_H * this.scale;
    this.powerState = newState;
    this.applyState();
    this.y = oldFeet - FRAME_HALF_H * this.scale;
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
    this.isSpinning = false;
    this.setAngle(0);
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
  handleInput({ left, right, jumpHeld, jumpPressed, runHeld = false, spinPressed = false }) {
    if (this.isDead || this.isTransforming) return;

    const body = this.body;
    const onGround = body.onFloor();
    if (onGround) {
      this.jumpType = 0;
      if (this.isSpinning) this.stopSpin();
    }

    // Run modifier (SMW Y-button): holding fire while moving raises the
    // speed cap + acceleration. Tapping fire still shoots (GameScene).
    const maxSpeed = runHeld ? MAX_SPRINT_SPEED : MAX_RUN_SPEED;
    const accel = runHeld ? RUN_ACCELERATION : ACCELERATION;
    body.setMaxVelocity(maxSpeed, MAX_FALL_SPEED);

    if (left && !right) {
      body.setAccelerationX(-accel);
      this.setFlipX(true);
    } else if (right && !left) {
      body.setAccelerationX(accel);
      this.setFlipX(false);
    } else {
      body.setAccelerationX(0);
    }

    // Spin jump (SMW A-button): shorter, breaks bricks even when SMALL,
    // kills on side contact (see GameScene). Triggered by the spin key
    // or by holding run/fire and pressing jump.
    if (spinPressed && onGround) {
      this.doSpinJump();
    } else if (jumpPressed && onGround) {
      // normal jump uses full speed-scaled velocity
      body.setVelocityY(this.scaledJump(JUMP_VELOCITY, false));
      this.jumpType = 1;
      sfx.play('jump');
      this.squashStretch(0.82, 1.18); // stretch tall on take-off
    }
    const cutAt = this.isSpinning ? SPIN_CUT_VELOCITY : JUMP_CUT_VELOCITY;
    if (!jumpHeld && body.velocity.y < cutAt) {
      body.setVelocityY(cutAt);
    }
    body.setGravityY(body.velocity.y > 0 ? EXTRA_FALL_GRAVITY : 0);

    if (this.isSpinning) {
      this.anims.play(`${this.animPrefix}-spin`, true);
      // visual spin: rotate while airborne (reset on landing)
      this.angle += 360 / 12;
    } else if (!onGround) this.anims.play(`${this.animPrefix}-jump`, true);
    else if (Math.abs(body.velocity.x) > 10) this.anims.play(`${this.animPrefix}-run`, true);
    else this.anims.play(`${this.animPrefix}-idle`, true);
  }

  /**
   * Speed-scaled jump velocity (SMW-port): the faster you run, the higher
   * you jump. Thresholds mirror SuperMarioWorldJS mechanics.js
   * (|vx| >= 125 fast, >= 75 medium), rescaled to Timber Hop speeds.
   */
  scaledJump(base, isSpin) {
    const speed = Math.abs(this.body.velocity.x);
    if (isSpin) {
      if (speed >= 200) return -420;
      if (speed >= 120) return -400;
      return SPIN_VELOCITY;
    }
    if (speed >= 200) return -530;
    if (speed >= 120) return -505;
    return base;
  }

  doSpinJump() {
    this.body.setVelocityY(this.scaledJump(SPIN_VELOCITY, true));
    this.jumpType = 2;
    this.isSpinning = true;
    this.angle = 0;
    sfx.play('spin');
    this.squashStretch(0.82, 1.18);
  }

  stopSpin() {
    this.isSpinning = false;
    this.angle = 0;
    this.setAngle(0);
    if (this.jumpType === 2) this.jumpType = 0;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    // Landing: squash flat for a moment
    if (!this.isDead && this.body) {
      const onFloor = this.body.onFloor();
      if (onFloor && !this.wasOnFloor) {
        if (this.isSpinning) this.stopSpin();
        else this.squashStretch(1.18, 0.82);
      }
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
