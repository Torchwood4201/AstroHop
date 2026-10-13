import Phaser from 'phaser';
import { isTouchDevice } from './input/TouchControls.js';
import PreloadScene from './scenes/PreloadScene.js';
import TitleScene from './scenes/TitleScene.js';
import IntroScene from './scenes/IntroScene.js';
import GameScene from './scenes/GameScene.js';
import HUDScene from './scenes/HUDScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import EndScene from './scenes/EndScene.js';
import { setupTouchControls, setupControlsSwap } from './input/TouchControls.js';

// Show/wire the on-screen buttons before the game boots, so the
// layout (game on top, controls below) is settled when Phaser measures
// its parent container.
setupTouchControls();
setupControlsSwap();

// On phones in portrait the screen is narrow — a 800px-wide view ends up
// tiny. We narrow the LOGICAL view instead (540px ≈ 30 tiles of lookahead,
// the NES showed 16), so everything renders ~45% larger.
// NOTE: keep in sync with the #game-container aspect-ratio in index.html.
const BASE_WIDTH = 800;
const PORTRAIT_WIDTH = 540;
const HEIGHT = 450;
const portraitQuery = window.matchMedia('(orientation: portrait)');
const logicalWidth = () =>
  isTouchDevice() && portraitQuery.matches ? PORTRAIT_WIDTH : BASE_WIDTH;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: logicalWidth(),
  height: HEIGHT,
  backgroundColor: '#5c94fc', // classic sky blue
  pixelArt: true, // nearest-neighbour scaling — keeps pixels crisp
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT, // scale to fit the container, keep aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: 'app', // fullscreen the whole layout, touch controls included
  },
  scene: [
    PreloadScene,
    TitleScene,
    IntroScene,
    GameScene,
    HUDScene,
    PauseScene,
    GameOverScene,
    EndScene,
  ],
};

const game = new Phaser.Game(config);

// Rotating the device switches between the wide and narrow logical view
portraitQuery.addEventListener('change', () => {
  game.scale.setGameSize(logicalWidth(), HEIGHT);
  game.scale.refresh();
});

if (import.meta.env.DEV) {
  window.__game = game; // debug handle for tools/probe.mjs (dev only)
}
