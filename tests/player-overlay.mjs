// Regression: player Doom overlay must not follow GM combat focus.
// Run: node tests/player-overlay.mjs
import assert from "node:assert/strict";

const hooks = new Map();
const settings = new Map();
const settingDefs = new Map();
globalThis.Hooks = {
  once: (name, fn) => hooks.set(name, fn),
  on: (name, fn) => hooks.set(name, fn)
};
globalThis.canvas = { scene: { id: "sceneA" } };
class MockApplication {
  rendered = false;
  element = { querySelector: () => null };
  async render() { this.rendered = true; return this; }
  async close() { this.rendered = false; return this; }
  async _prepareContext() { return {}; }
  async _onRender() {}
}
globalThis.foundry = {
  data: { fields: {
    FilePathField: class { constructor(options) { this.options = options; } },
    NumberField: class { constructor(options) { this.options = options; } }
  } },
  applications: {
    api: { ApplicationV2: MockApplication, HandlebarsApplicationMixin: Type => Type }
  },
  audio: { AudioHelper: { play() {} } }
};
globalThis.ui = { notifications: { warn() {}, error(message) { throw new Error(message); } } };
const gm = { id: "gm", isGM: true };
const player = { id: "p1", isGM: false };
const ownedActor = {
  hasPlayerOwner: true,
  system: { attributes: { cr: 1 } },
  testUserPermission(user, permission) {
    return user.id === "p1" && permission === "OWNER";
  }
};
const npcActor = { hasPlayerOwner: false, system: { attributes: { cr: 3 } } };
function makeCombat(id, current, hasPlayer = false) {
  const actors = hasPlayer ? [ownedActor, npcActor] : [npcActor];
  return {
    id,
    name: "Encounter " + id,
    scene: { id: "sceneA" },
    started: true,
    visible: true,
    combatants: actors.map(actor => ({ actor })),
    bank: { schema: 1, active: true, current, revision: 2, lastAction: "gain", delta: 1 },
    getFlag() { return this.bank; },
    async setFlag(_module, _key, bank) {
      this.bank = structuredClone(bank);
      hooks.get("updateCombat")(this, {}, {}, gm.id);
    }
  };
}
const a = makeCombat("A", 5, true);
const b = makeCombat("B", 11);
const combats = {
  contents: [a, b], active: a, viewed: a,
  get(id) { return this.contents.find(combat => combat.id === id); },
  [Symbol.iterator]() { return this.contents.values(); }
};
globalThis.game = {
  user: gm, combats, users: { activeGM: gm }, scenes: { viewed: { id: "sceneA" } },
  settings: {
    register(_module, key, definition) {
      settingDefs.set(key, definition);
      settings.set(key, definition.default);
    },
    get(_module, key) { return settings.get(key); },
    async set(_module, key, value) {
      settings.set(key, value);
      settingDefs.get(key)?.onChange?.(value);
    }
  }
};
await import("../scripts/main.mjs");
hooks.get("init")();
hooks.get("ready")();
game.user = player;
const overlay = game.blackFlagDoomPanel.overlay;
let context = await overlay._prepareContext({});
assert.equal(context.doom, 5); // Own character encounter wins default selection.
assert.equal(context.showCombatSelector, true);
assert.equal(context.combatChoices.length, 2);

// Foundry's tracker focus can change when the GM switches encounters.
combats.viewed = b;
hooks.get("updateCombat")(b, { round: 2 }, {}, gm.id);
context = await overlay._prepareContext({});
assert.equal(context.doom, 5, "GM's tracker choice must not change player Doom");

// The player may explicitly pin B; the GM's focus then must be irrelevant.
await game.settings.set("black-flag-doom-panel", "playerCombatId", "B");
context = await overlay._prepareContext({});
assert.equal(context.doom, 11);
assert.equal(context.combatChoices.find(option => option.id === "B")?.selected, true);
combats.viewed = a;
hooks.get("updateCombat")(a, { round: 3 }, {}, gm.id);
assert.equal((await overlay._prepareContext({})).doom, 11);

// Changing the player's scene hides out-of-scene encounters.
canvas.scene.id = "sceneB";
hooks.get("canvasReady")();
assert.equal((await overlay._prepareContext({})).showCombatSelector, false);
assert.equal((await overlay._prepareContext({})).doom, 0);

// Ending pinned B falls back to eligible A on return to scene A.
canvas.scene.id = "sceneA";
b.started = false;
assert.equal((await overlay._prepareContext({})).doom, 5);
assert.equal((await overlay._prepareContext({})).showCombatSelector, false);
console.log("Player encounter independence regression: PASS");
