// Foundry V14 mocked contract test for Milestone 2.
// Run from repository root: node tests/mock-smoke.mjs
import assert from "node:assert/strict";

const hooks = new Map();
const audio = [];
const warnings = [];
globalThis.Hooks = {
  once(name, fn) { hooks.set(name, fn); },
  on(name, fn) { hooks.set(name, fn); }
};

class MockApp {
  rendered = false;
  element = { querySelector: () => null };
  async render() { this.rendered = true; return this; }
  async close() { this.rendered = false; return this; }
  async _prepareContext() { return {}; }
  async _onRender() {}
}

globalThis.foundry = {
  applications: { api: { ApplicationV2: MockApp, HandlebarsApplicationMixin: Type => Type } },
  audio: { AudioHelper: { play: (data, broadcast) => audio.push({ data, broadcast }) } }
};
globalThis.ui = {
  notifications: {
    warn: text => warnings.push(text),
    error: text => { throw Error(text); }
  }
};

const combats = {
  contents: [],
  active: null,
  viewed: null,
  get(id) { return this.contents.find(combat => combat.id === id); },
  [Symbol.iterator]() { return this.contents.values(); }
};

const enemy = { actor: { hasPlayerOwner: false, system: { attributes: { cr: 3 } } } };
const gm = { id: "gm1", isGM: true };
globalThis.game = {
  user: gm,
  users: { activeGM: gm },
  combats,
  settings: { register() {} }
};

function makeCombat(id) {
  return {
    id,
    started: false,
    combatants: [enemy],
    bank: null,
    getFlag() { return this.bank; },
    async setFlag(_module, _key, value) {
      this.bank = structuredClone(value);
      hooks.get("updateCombat")(this, { flags: {} }, {}, gm.id);
      await Promise.resolve();
    }
  };
}

await import("../scripts/main.mjs");
hooks.get("init")();

const a = makeCombat("A");
const b = makeCombat("B");
combats.contents.push(a, b);
combats.viewed = combats.active = a;
hooks.get("ready")();

async function flush() {
  for (let i = 0; i < 80; i++) await Promise.resolve();
}

a.started = true;
hooks.get("updateCombat")(a, { round: 1 }, {}, gm.id);
await flush();
assert.deepEqual([a.bank.active, a.bank.current], [true, 2]);
assert.equal(game.blackFlagDoomPanel.panel.rendered, true);

const panel = game.blackFlagDoomPanel.panel;
const gain = panel.constructor.DEFAULT_OPTIONS.actions.gainDoom;
await Promise.all(Array.from({ length: 5 }, () => gain.call(panel)));
await flush();
assert.equal(a.bank.current, 7);
assert.equal(a.bank.revision, 6);

b.started = true;
combats.viewed = combats.active = b;
hooks.get("updateCombat")(b, { round: 1 }, {}, gm.id);
await flush();
assert.equal(b.bank.current, 2);
assert.equal(a.bank.current, 7);

combats.viewed = a;
hooks.get("canvasReady")();
assert.equal((await panel._prepareContext({})).doom, 7);

combats.viewed = b;
hooks.get("deleteCombat")(a);
assert.equal(b.bank.current, 2);

b.started = false;
hooks.get("updateCombat")(b, { round: 0 }, {}, gm.id);
await flush();
assert.equal(b.bank.active, false);
assert.equal(panel.rendered, false);

b.started = true;
hooks.get("updateCombat")(b, { round: 1 }, {}, gm.id);
await flush();
assert.deepEqual([b.bank.active, b.bank.current], [true, 2]);

game.user = { id: "gm2", isGM: true };
await gain.call(panel);
await flush();
assert.equal(b.bank.current, 2);
assert.ok(warnings.some(message => message.includes("active GM")));
assert.ok(audio.every(({ data, broadcast }) => data.autoplay === true && broadcast === false));

console.log("Milestone 2 mocked combat lifecycle, serialization, two-GM lock and audio passed.");
