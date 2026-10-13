// Persistent high score (survives page reloads via localStorage).
const KEY = 'retro-platformer-highscore';

export function loadHighScore() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0; // private mode / storage blocked — just don't persist
  }
}

export function saveHighScore(score) {
  try {
    if (score > loadHighScore()) localStorage.setItem(KEY, String(score));
  } catch {
    /* ignore */
  }
}
