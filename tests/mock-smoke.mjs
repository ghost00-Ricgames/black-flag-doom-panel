// Milestone 3 rules and encounter-state regression (Foundry V14 mock).
// Run from repository root: node tests/mock-smoke.mjs
import assert from "node:assert/strict";

const hooks = new Map(), settings = new Map(), definitions = new Map();
const sounds = [], warnings = [];
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
  audio: { AudioHelper: { play: (data, broadcast) => sounds.push({ data, broadcast }) } }
};
globalThis.ui = {
  notifications: {
    warn: message => warnings.push(message),
    error: message => { throw Error(message); }
  }
};
const gm = { id: "gm1", isGM: true };
const combats = {
  contents: [], active: null, viewed: null,
  get(id) { return this.contents.find(c => c.id === id); },
  [Symbol.iterator]() { return this.contents.values(); }
};
globalThis.game = {
  user: gm, users: { activeGM: gm }, combats,
  settings: {
    register(_module, key, definition) {
      definitions.set(key, definition);
      settings.set(key, definition.default);
    },
    get(_module, key) { return settings.get(key); },
    async set(_module, key, value) {
      settings.set(key, value);
      definitions.get(key)?.onChange?.(value);
    }
  }
};
function monster(cr, disposition = -1) {
  return {
    actor: { hasPlayerOwner: false, system: { attributes: { cr } } },
    token: { disposition }
  };
}
function makeCombat(id, crs, allies = []) {
  return {
    id, name: id, started: false, scene: { id: "scene" },
    combatants: [...crs.map(cr => monster(cr)), ...allies.map(cr => monster(cr, 1))],
    bank: null,
    getFlag() { return this.bank; },
    async setFlag(_module, _key, value) {
      this.bank = structuredClone(value);
      hooks.get("updateCombat")(this, { flags: {} }, {}, gm.id);
    }
  };
}
await import("../scripts/main.mjs");
hooks.get("init")();
hooks.get("ready")();
assert.equal(settings.get("expandedDoom"), false);
async function drain() { for (let i = 0; i < 120; i++) await Promise.resolve(); }
async function start(combat) {
  combats.contents.push(combat);
  combats.active = combats.viewed = combat;
  combat.started = true;
  hooks.get("updateCombat")(combat, { round: 1 }, {}, gm.id);
  await drain();
}
const panel = game.blackFlagDoomPanel.panel;
const actions = panel.constructor.DEFAULT_OPTIONS.actions;
const button = key => ({ classList: { contains: () => false }, dataset: { spend: key } });
async function action(name, target) {
  await actions[name].call(panel, {}, target);
  await drain();
}
const tiers = [
  [[0], 1], [[4], 1], [[2, 3], 2], [[4, 5], 3],
  [[6, 7], 4], [[10, 7], 5], [[11, 10], 6]
];
for (const [i, [crs, expected]] of tiers.entries()) {
  const c = makeCombat("tier" + i, crs);
  await start(c);
  assert.equal(c.bank.current, expected, "Monster Vault total-CR tier " + crs);
}
const ally = makeCombat("ally", [3], [20]);
await start(ally);
assert.equal(ally.bank.current, 1, "friendly NPC must not count towards encounter CR");

const c = makeCombat("tracked", [6]);
await start(c);
assert.equal(c.bank.current, 2);
await action("spendDoom", button("advantage"));
assert.equal(c.bank.current, 1);
assert.equal(c.bank.expended, 1);
await action("spendDoom", button("recharge"));
assert.equal(c.bank.current, 0);
assert.equal(c.bank.usage.recharge, true);
await action("spendDoom", button("recharge"));
assert.equal(c.bank.current, 0, "recharge once per encounter");

await action("recoverDoom", { dataset: { trigger: "critical" } });
assert.equal(c.bank.current, 0, "recovery disabled by default");
await game.settings.set("black-flag-doom-panel", "expandedDoom", true);
assert.equal((await panel._prepareContext({})).expanded, true);
await action("recoverDoom", { dataset: { trigger: "critical" } });
await action("recoverDoom", { dataset: { trigger: "massive" } });
assert.equal(c.bank.current, 2);
assert.equal(c.bank.expended, 0);
await action("recoverDoom", { dataset: { trigger: "miss5" } });
assert.equal(c.bank.current, 2, "only previously expended Doom can return");
await action("preBonus", { dataset: { trigger: "trap" } });
await action("preBonus", { dataset: { trigger: "warning" } });
await action("preBonus", { dataset: { trigger: "rest" } });
assert.equal(c.bank.startingBonus, 2, "starting bonus max = baseline");
assert.equal(c.bank.current, 4);
await action("spendDoom", button("autoAttack"));
await action("spendDoom", button("autoSave"));
assert.equal(c.bank.current, 2);
await action("spendDoom", button("autoSave"));
assert.equal(c.bank.current, 2, "automatic save once per encounter");
await action("spendDoom", button("movement"));
assert.equal(c.bank.current, 1);
assert.equal(c.bank.expended, 3);
await action("gainDoom", {});
assert.equal(c.bank.current, 2);
assert.equal(c.bank.expended, 3, "manual gain does not recover expended points");
await game.settings.set("black-flag-doom-panel", "expandedDoom", false);
assert.equal((await panel._prepareContext({})).expanded, false);
await action("spendDoom", button("movement"));
assert.equal(c.bank.current, 2, "expanded option unavailable after disabling");

// Keep milestone-2 combat independence and GM lock.
const other = makeCombat("other", [1]);
await start(other);
assert.equal(other.bank.current, 1);
assert.equal(c.bank.current, 2);
game.user = { id: "secondaryGM", isGM: true };
await action("gainDoom", {});
assert.equal(other.bank.current, 1, "secondary GM cannot overwrite active GM");
assert.ok(warnings.some(message => message.includes("active GM")));
assert.ok(sounds.every(sound => sound.data.autoplay && sound.broadcast === false));
console.log("PASS — Monster Vault, Expanded Doom, combat banks and GM authority.");
