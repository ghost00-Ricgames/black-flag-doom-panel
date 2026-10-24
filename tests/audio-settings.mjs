// Milestone 4 audio settings and local playback regression.
// Run: node tests/audio-settings.mjs
import assert from "node:assert/strict";
const hooks = new Map(), settings = new Map(), defs = new Map(), plays = [];
globalThis.Hooks = { once: (name, fn) => hooks.set(name, fn), on: (name, fn) => hooks.set(name, fn) };
class MockApp {
  rendered = false;
  element = { querySelector: () => null };
  async render() { this.rendered = true; return this; }
  async close() { this.rendered = false; return this; }
  async _prepareContext() { return {}; }
  async _onRender() {}
}
class FilePathField { constructor(options) { this.options = options; } }
class NumberField { constructor(options) { this.options = options; } }
globalThis.foundry = {
  applications: { api: { ApplicationV2: MockApp, HandlebarsApplicationMixin: Type => Type } },
  data: { fields: { FilePathField, NumberField } },
  audio: { AudioHelper: { play(data, socket) { plays.push({ data, socket }); } } }
};
globalThis.ui = { notifications: { warn() {}, error(message) { throw Error(message); } } };
const gm = { id: "gm", isGM: true };
const monster = { actor: { hasPlayerOwner: false, system: { attributes: { cr: 3 } } }, token: { disposition: -1 } };
const combat = {
  id: "fight", started: false, combatants: [monster], bank: null,
  getFlag() { return this.bank; },
  async setFlag(_module, _flag, bank) {
    this.bank = structuredClone(bank);
    hooks.get("updateCombat")(this, {}, {}, gm.id);
  }
};
globalThis.game = {
  user: gm, users: { activeGM: gm },
  combats: {
    viewed: combat, active: combat,
    get: id => id === combat.id ? combat : null,
    [Symbol.iterator]: function* () { yield combat; }
  },
  settings: {
    register(_mod, key, info) { defs.set(key, info); settings.set(key, info.default); },
    get(_mod, key) { return settings.get(key); },
    async set(_mod, key, value) { settings.set(key, value); defs.get(key)?.onChange?.(value); }
  }
};
await import("../scripts/main.mjs");
hooks.get("init")();
hooks.get("ready")();
assert.equal(defs.get("audioMuteClient").scope, "client");
assert.equal(defs.get("audioVolume").default, 100);
for (const kind of ["Start", "Gain", "Spend"]) {
  assert.equal(defs.get("audio" + kind + "Enabled").default, true);
  const pathSetting = defs.get("audio" + kind + "File");
  assert.equal(pathSetting.default, "");
  assert.ok(pathSetting.type instanceof FilePathField);
  assert.deepEqual(pathSetting.type.options.categories, ["AUDIO"]);
}
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
function updated(action, delta) {
  combat.bank = {
    ...combat.bank,
    revision: combat.bank.revision + 1,
    lastAction: action,
    current: combat.bank.current + delta,
    delta
  };
  hooks.get("updateCombat")(combat, {}, {}, gm.id);
}
combat.started = true;
hooks.get("updateCombat")(combat, { round: 1 }, {}, gm.id);
await flush();
assert.equal(plays.length, 1);
assert.equal(plays[0].data.src, "sounds/drums.wav");
assert.equal(plays[0].data.volume, 0.8);
updated("gain", 1);
assert.equal(plays.at(-1).data.src, "sounds/lock.wav");
updated("spend:advantage", -1);
assert.equal(plays.at(-1).data.src, "sounds/dice.wav");
assert.equal(plays.at(-1).data.volume, 0.6);

settings.set("audioGainEnabled", false);
const before = plays.length;
updated("gain", 1);
assert.equal(plays.length, before, "gain toggle should mute only gain");
settings.set("audioGainEnabled", true);
settings.set("audioGainFile", "worlds/test/custom_gain.ogg");
settings.set("audioVolume", 50);
updated("gain", 1);
assert.equal(plays.at(-1).data.src, "worlds/test/custom_gain.ogg");
assert.equal(plays.at(-1).data.volume, 0.4);
settings.set("audioGainFile", "");
updated("gain", 1);
assert.equal(plays.at(-1).data.src, "sounds/lock.wav", "empty path reverts to default");
settings.set("audioMuteClient", true);
const mutedCount = plays.length;
updated("gain", 1);
assert.equal(plays.length, mutedCount, "local mute prevents playback");
settings.set("audioMuteClient", false);
settings.set("audioVolume", 0);
updated("gain", 1);
assert.equal(plays.length, mutedCount, "zero volume is silent");
settings.set("audioVolume", 100);
settings.set("audioSpendEnabled", false);
updated("spend:advantage", -1);
assert.equal(plays.length, mutedCount);
settings.set("audioSpendEnabled", true);
settings.set("audioSpendFile", "worlds/test/new_spend.wav");
updated("spend:advantage", -1);
assert.equal(plays.at(-1).data.src, "worlds/test/new_spend.wav");
assert.ok(plays.every(({ data, socket }) => data.autoplay === true && socket === false));

console.log("PASS — default audio, event toggles, file overrides, volume, local mute, no socket broadcast.");
