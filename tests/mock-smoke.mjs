// Foundry V14 mocked combat, Monster Vault/GMG and GM authority regressions.
// Run: node tests/mock-smoke.mjs
import assert from "node:assert/strict";

const hooks = new Map(), values = new Map(), defs = new Map(), sounds = [], warnings = [];
globalThis.Hooks = {
  once(name, fn) { hooks.set(name, fn); },
  on(name, fn) { hooks.set(name, fn); }
};
class Base {
  rendered = false;
  element = { querySelector() { return null; } };
  async render() { this.rendered = true; return this; }
  async close() { this.rendered = false; return this; }
  async _prepareContext() { return {}; }
  async _onRender() {}
}
globalThis.foundry = {
  applications: { api: { ApplicationV2: Base, HandlebarsApplicationMixin: Class => Class } },
  data: { fields: {
    FilePathField: class { constructor(options) { this.options = options; } },
    NumberField: class { constructor(options) { this.options = options; } }
  } },
  audio: { AudioHelper: { play: (data, socket) => sounds.push({ data, socket }) } }
};
globalThis.ui = {
  notifications: {
    warn: message => warnings.push(message),
    error: message => { throw Error(message); }
  }
};
const gm = { id: "gm", isGM: true };
const combats = {
  contents: [], active: null, viewed: null,
  get(id) { return this.contents.find(combat => combat.id === id); },
  [Symbol.iterator]() { return this.contents.values(); }
};
globalThis.game = {
  user: gm, users: { activeGM: gm }, combats,
  settings: {
    register(_module, key, definition) { defs.set(key, definition); values.set(key, definition.default); },
    get(_module, key) { return values.get(key); },
    async set(_module, key, value) { values.set(key, value); defs.get(key)?.onChange?.(value); }
  }
};
function combatant(cr, disposition = -1) {
  return { actor: { hasPlayerOwner: false, system: { attributes: { cr } } }, token: { disposition } };
}
function makeCombat(id, enemyCRs, allyCRs = []) {
  return {
    id, name: "Encounter " + id, started: false, scene: { id: "scene1" },
    combatants: [...enemyCRs.map(cr => combatant(cr)), ...allyCRs.map(cr => combatant(cr, 1))],
    bank: null,
    getFlag() { return this.bank; },
    async setFlag(_module, _flag, value) {
      this.bank = structuredClone(value);
      hooks.get("updateCombat")(this, {}, {}, gm.id);
      await Promise.resolve();
    }
  };
}

await import("../scripts/main.mjs");
hooks.get("init")();
hooks.get("ready")();
const panel = game.blackFlagDoomPanel.panel;
const actions = panel.constructor.DEFAULT_OPTIONS.actions;
const flush = async () => { for (let i = 0; i < 130; i++) await Promise.resolve(); };
async function start(combat) {
  combats.contents.push(combat);
  combats.active = combats.viewed = combat;
  combat.started = true;
  hooks.get("updateCombat")(combat, { round: 1 }, {}, gm.id);
  await flush();
}
async function action(name, target = {}) { await actions[name].call(panel, {}, target); await flush(); }
const spend = key => ({ classList: { contains: () => false }, dataset: { spend: key } });

assert.equal(values.get("expandedDoom"), false);
for (const [i, [crs, expected]] of [
  [[4], 1], [[3, 3], 2], [[4, 5], 3], [[6, 7], 4],
  [[10, 7], 5], [[11, 10], 6]
].entries()) {
  const c = makeCombat("tier-" + i, crs);
  await start(c);
  assert.equal(c.bank.current, expected, "Monster Vault encounter CR " + crs.join("+"));
}
const ally = makeCombat("ally", [3], [20]);
await start(ally);
assert.equal(ally.bank.current, 1, "non-hostile allies excluded");
const a = makeCombat("A", [6]);
await start(a);
assert.equal(a.bank.current, 2);
await action("spendDoom", spend("advantage"));
await action("spendDoom", spend("recharge"));
assert.equal(a.bank.current, 0);
assert.equal(a.bank.expended, 2);
assert.equal(a.bank.usage.recharge, true);
await action("spendDoom", spend("recharge"));
assert.equal(a.bank.current, 0, "recharge usable once");
await action("recoverDoom", { dataset: { trigger: "critical" } });
assert.equal(a.bank.current, 0, "GMG off by default");
await game.settings.set("black-flag-doom-panel", "expandedDoom", true);
await action("recoverDoom", { dataset: { trigger: "critical" } });
await action("recoverDoom", { dataset: { trigger: "massive" } });
await action("recoverDoom", { dataset: { trigger: "miss5" } });
assert.equal(a.bank.current, 2, "cannot recover beyond expended points");
assert.equal(a.bank.expended, 0);
await action("preBonus", { dataset: { trigger: "trap" } });
await action("preBonus", { dataset: { trigger: "warning" } });
await action("preBonus", { dataset: { trigger: "rest" } });
assert.equal(a.bank.startingBonus, 2, "GMG bonus capped to encounter starting Doom");
assert.equal(a.bank.current, 4);
await action("spendDoom", spend("autoAttack"));
await action("spendDoom", spend("autoSave"));
await action("spendDoom", spend("autoSave"));
assert.equal(a.bank.current, 2, "automatic save cannot repeat");
await action("spendDoom", spend("movement"));
assert.equal(a.bank.current, 1);
await action("gainDoom");
assert.equal(a.bank.current, 2);
assert.equal(a.bank.expended, 3, "manual gain does not alter expended Doom");
const b = makeCombat("B", [1]);
await start(b);
assert.equal(b.bank.current, 1);
assert.equal(a.bank.current, 2, "separate combat banks");
await Promise.all(Array.from({ length: 5 }, () => action("gainDoom")));
assert.equal(b.bank.current, 6, "serialized concurrent actions");
game.user = { id: "secondary-gm", isGM: true };
await action("gainDoom");
assert.equal(b.bank.current, 6, "other GMs cannot write");
assert.ok(warnings.some(message => message.includes("active GM")));
assert.ok(sounds.every(({ data, socket }) => data.autoplay && socket === false), "audio remains client-local");
console.log("PASS — Monster Vault, Expanded Doom, combat isolation, GM authority.");
