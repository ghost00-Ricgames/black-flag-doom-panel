// Compact GM panel regression: visual controls and disclosure state.
// Run: node tests/compact-panel.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../templates/doom-panel.html", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));
assert.match(manifest.version, /^2\.0\.0-dev\./);
assert.ok(manifest.styles.includes("styles/compact-panel.css"));
assert.ok(html.includes('id="doom-expanded-details"'));
assert.ok(html.includes("{{#if expanded}}"));
for (const name of ["advantage", "disadvantage", "recharge", "autoSave", "autoAttack", "movement"]) {
  assert.ok(html.includes('data-spend="' + name + '"'), name + " preserved");
}
for (const name of ["trap", "warning", "rest", "miss5", "critical", "massive"]) {
  assert.ok(html.includes('data-trigger="' + name + '"'), name + " preserved");
}

const hooks = new Map();
globalThis.Hooks = {
  once(name, cb) { hooks.set(name, cb); },
  on(name, cb) { hooks.set(name, cb); }
};

function makeDetails() {
  return { open: false, listeners: new Map(), addEventListener(name, cb) { this.listeners.set(name, cb); } };
}

class MockApp {
  rendered = false;
  element = null;
  async render() {
    const details = makeDetails(); // Rerender means a brand-new DOM element.
    this.element = {
      details,
      querySelector: selector => selector === "#doom-expanded-details" ? details : null
    };
    this.rendered = true;
    await this._onRender({}, {});
    return this;
  }
  async _onRender() {}
  async _prepareContext() { return {}; }
  async close() { this.rendered = false; }
}

globalThis.foundry = {
  data: { fields: {
    FilePathField: class { constructor(options) { this.options = options; } },
    NumberField: class { constructor(options) { this.options = options; } }
  } },
  applications: { api: { ApplicationV2: MockApp, HandlebarsApplicationMixin: Type => Type } },
  audio: { AudioHelper: { play() {} } }
};
globalThis.ui = { notifications: { warn() {}, error(message) { throw Error(message); } } };
const values = new Map();
globalThis.game = {
  user: { id: "gm", isGM: true },
  users: { activeGM: { id: "gm" } },
  combats: { active: null, viewed: null, [Symbol.iterator]: function* () {} },
  settings: {
    register(_module, key, def) { values.set(key, def.default); },
    get(_module, key) { return values.get(key); }
  }
};

await import("../scripts/main.mjs");
hooks.get("init")();
hooks.get("ready")();
const panel = game.blackFlagDoomPanel.panel;
await panel.render();
assert.equal(panel.element.details.open, false, "GMG disclosure starts collapsed");
panel.element.details.open = true;
panel.element.details.listeners.get("toggle")();
assert.equal(panel.expandedSectionOpen, true);
await panel.render();
assert.equal(panel.element.details.open, true, "GMG disclosure stays open on rerender");
panel.element.details.open = false;
panel.element.details.listeners.get("toggle")();
await panel.render();
assert.equal(panel.element.details.open, false, "GMG disclosure stays closed on rerender");

console.log("PASS — compact controls intact, GMG disclosure survives rerenders.");
