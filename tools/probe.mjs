// Headless gameplay probe: drives the running dev server through the
// Chrome DevTools Protocol (no dependencies — uses Node's built-in
// fetch + WebSocket). Reports uncaught exceptions and whether the game
// loop is still alive after a scripted scenario.
//
// usage: node tools/probe.mjs [scenario]   (default scenario: fireball)

import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9223;
const URL = 'http://localhost:5175';

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--user-data-dir=${process.env.TEMP}\\chrome-probe-profile`,
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
const errors = [];

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    errors.push(d.exception?.description ?? d.text);
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
};

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (res?.exceptionDetails) {
    errors.push(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
  }
  return res?.result?.value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: URL });
await sleep(3500); // boot lands on the title screen

// skip the title and go straight into level 1
await evaluate(`(() => {
  const g = window.__game;
  if (g && g.scene.isActive('TitleScene')) {
    g.scene.getScene('TitleScene').scene.start('GameScene', { levelId: 'level1' });
  }
})()`);
await sleep(1500);

const booted = await evaluate(
  `!!(window.__game && window.__game.scene.isActive('GameScene'))`
);
if (!booted) {
  console.log('FAIL: game did not boot into GameScene');
} else {
  // --- scenario: become FIRE, stand near a walker, shoot it
  const setup = await evaluate(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    // a GROUND walker (y near the floor) — deterministic fireball target
    const e = s.enemies.getChildren().find((w) => w.active && !w.isSquashed && w.y > 380);
    if (!e) return 'no enemy';
    s.player.powerState = 'FIRE';
    s.player.applyState();
    s.player.body.reset(e.x - 80, e.y - 6);
    s.player.setFlipX(false);
    s.shootFireball();
    return 'ok';
  })()`);
  console.log('scenario setup:', setup);

  const f1 = await evaluate(`window.__game.loop.frame`);
  await sleep(1500);
  const f2 = await evaluate(`window.__game.loop.frame`);

  const enemyState = await evaluate(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const list = s.enemies.getChildren();
    return list.filter((w) => w.active && !w.isSquashed).length + '/' + list.length + ' alive';
  })()`);

  console.log(`game loop: frame ${f1} -> ${f2} ${f2 > f1 ? '(ALIVE)' : '(FROZEN!)'}`);
  console.log('enemies:', enemyState);
}

console.log(
  errors.length ? `\n${errors.length} error(s):\n` + errors.join('\n---\n') : '\nno errors'
);

ws.close();
chrome.kill();
process.exit(0);
