// Level QA screenshots: boots the game headless, loads a level, teleports
// the (paused) player along it and saves a screenshot at each stop.
//
// usage: node tools/shot.mjs [levelId]      (dev server must be running)

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9224;
const URL = 'http://localhost:5175';
const levelId = process.argv[2] ?? 'level1';

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--user-data-dir=${process.env.TEMP}\\chrome-shot-profile`,
    '--window-size=820,520',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const page = (await res.json()).find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('DevTools endpoint not ready');
}

const ws = new WebSocket(await getWsUrl());
await new Promise((r) => (ws.onopen = r));

let msgId = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true }))?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: URL });
await sleep(3500);

const info = await evaluate(`(() => {
  const g = window.__game;
  if (!g) return null;
  const title = g.scene.getScene('TitleScene');
  if (title && title.scene.isActive()) {
    title.scene.start('GameScene', { levelId: '${levelId}' });
  } else {
    g.scene.getScene('GameScene').scene.restart({ levelId: '${levelId}' });
  }
  return true;
})()`);
if (!info) {
  console.log('FAIL: game not booted');
  process.exit(1);
}
await sleep(1200);

const width = await evaluate(
  `window.__game.scene.getScene('GameScene').worldWidth`
);
console.log(`level ${levelId}: ${width}px wide — pausing physics for clean shots`);
await evaluate(`window.__game.scene.getScene('GameScene').physics.world.pause()`);

// one shot per screen-width step across the level
const stops = [];
for (let x = 400; x < width; x += 760) stops.push(Math.min(x, width - 400));

for (let i = 0; i < stops.length; i++) {
  await evaluate(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.player.body.reset(${stops[i]}, 200);
    s.cameras.main.centerOnX(${stops[i]});
  })()`);
  await sleep(350);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = `tools/_shot_${levelId}_${i}.png`;
  writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(`saved ${file} (x=${stops[i]})`);
}

ws.close();
chrome.kill();
process.exit(0);
