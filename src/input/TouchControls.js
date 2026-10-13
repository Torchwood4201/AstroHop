// Shared state object: the DOM buttons write into it, GameScene reads it
// every frame alongside the keyboard. The game never knows where input
// came from.
export const touchState = {
  left: false,
  right: false,
  down: false,
  jump: false,
  fire: false,
};

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Remembers the player's preferred side for the controls. When swapped,
// the action buttons move to the left and the d-pad to the right.
const SWAP_STORAGE_KEY = 'astrohop.controlsSwapped';

function isSwapped() {
  try {
    return localStorage.getItem(SWAP_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function applySwap(swapped) {
  document.getElementById('touch-controls')?.classList.toggle('swapped', swapped);
}

/**
 * Wires the "Swap controls" button so players can flip the d-pad and the
 * action buttons between sides. The choice is saved to localStorage and
 * re-applied on the next load.
 */
export function setupControlsSwap() {
  applySwap(isSwapped());

  document.getElementById('swap-controls')?.addEventListener('click', () => {
    const swapped = !isSwapped();
    applySwap(swapped);
    try {
      localStorage.setItem(SWAP_STORAGE_KEY, swapped ? '1' : '0');
    } catch {
      /* storage unavailable (private mode) — the swap still applies for the session */
    }
  });
}

/**
 * Pointer handling done properly for a virtual gamepad:
 *
 * - every active pointer (finger) is tracked by its pointerId, so any
 *   number of buttons can be held at once (run + jump + fire);
 * - on every pointermove we re-resolve which button is under the finger
 *   (elementFromPoint), so sliding from ◀ to ▶ without lifting works;
 * - a button stays pressed while AT LEAST one finger holds it;
 * - pointer events + touch-action:none = no 300ms delays, no scrolling.
 */
export function setupTouchControls() {
  if (!isTouchDevice()) return;

  document.body.classList.add('touch');

  const container = document.getElementById('touch-controls');
  const buttons = {};
  container.querySelectorAll('.ctrl').forEach((b) => (buttons[b.dataset.key] = b));

  const active = new Set(); // pointerIds currently down on the pad
  const owners = new Map(); // pointerId -> button key it is pressing
  const holders = {}; // key -> Set of pointerIds holding it
  Object.keys(touchState).forEach((k) => (holders[k] = new Set()));

  const setKey = (key, on) => {
    touchState[key] = on;
    buttons[key]?.classList.toggle('pressed', on);
  };

  const keyAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const btn = el && el.closest('.ctrl');
    return btn ? btn.dataset.key : null;
  };

  const release = (pointerId) => {
    const key = owners.get(pointerId);
    if (!key) return;
    owners.delete(pointerId);
    holders[key].delete(pointerId);
    if (holders[key].size === 0) setKey(key, false);
  };

  const claim = (e) => {
    const key = keyAt(e.clientX, e.clientY);
    if (owners.get(e.pointerId) === key) return; // nothing changed
    release(e.pointerId);
    if (key) {
      owners.set(e.pointerId, key);
      holders[key].add(e.pointerId);
      setKey(key, true);
    }
  };

  container.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    active.add(e.pointerId);
    claim(e);
  });
  container.addEventListener('pointermove', (e) => {
    if (active.has(e.pointerId)) claim(e); // slide between buttons
  });
  const end = (e) => {
    active.delete(e.pointerId);
    release(e.pointerId);
  };
  container.addEventListener('pointerup', end);
  container.addEventListener('pointercancel', end);

  // no long-press context menus while holding a button
  container.addEventListener('contextmenu', (e) => e.preventDefault());
}
