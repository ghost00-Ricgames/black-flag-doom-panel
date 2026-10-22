// Minimal mocked contract test. A real Foundry V14 client must still be tested.
import assert from "node:assert/strict";

const events = {}, values = new Map(), defs = new Map(), calls = [];
globalThis.Hooks = { once(k, fn) { events[k] = fn; }, on(k, fn) { events[k] = fn; } };

class Base {
  rendered = false;
  element = { querySelector() { return null; } };
  async render() { this.rendered = true; return this; }
  async close() { this.rendered = false; return this; }
  async _prepareContext() { return {}; }
  async _onRender() {}
}
globalThis.foundry = {
  applications: { api: { ApplicationV2: Base, HandlebarsApplicationMixin: klass => klass } },
  audio: { AudioHelper: { play: (data, socket) => calls.push({ data, socket }) } }
};
globalThis.ui = { notifications: { warn: msg => calls.push({ warn: msg }) } };

const enemies = [
  { actor: { hasPlayerOwner: false, system: { attributes: { cr: 3 } } } },
  { actor: { hasPlayerOwner: true, system: { attributes: { cr: 2 } } } }
];
globalThis.game = {
  user: { isGM: true },
  combats: { active: { combatants: enemies } },
  settings: {
    register: (id, key, data) => { defs.set(key, data); values.set(key, data.default); },
    get: (id, key) => values.get(key),
    set: async (id, key, value) => { values.set(key, value); defs.get(key)?.onChange(value); }
  }
};

await import("../scripts/main.mjs");
events.init();
await events.ready();
assert.equal(game.blackFlagDoomPanel.initialized, true);
await events.combatStart({ combatants: enemies });
assert.equal(values.get("doomPoints"), 2); // temporarily retained v1 behavior
assert.equal(values.get("activeCombat"), true);
assert.equal(game.blackFlagDoomPanel.panel.rendered, true);
assert.equal(game.blackFlagDoomPanel.overlay.rendered, true);
const context = await game.blackFlagDoomPanel.panel._prepareContext({});
assert.equal(context.maxCR, 3);
assert.equal(context.adversaryCount, 1);
assert.ok(calls.every(c => c.socket !== true)); // no repeat socket broadcast
assert.ok(calls.filter(c => c.data).every(c => c.data.autoplay === true));
console.log("Mock smoke test passed.");
