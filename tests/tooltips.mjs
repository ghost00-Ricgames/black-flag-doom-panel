// v2.0.0-dev.6 — native Foundry V14 tooltip and localization regression.
// Run from repository root: node tests/tooltips.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const template = readFileSync(new URL("../templates/doom-panel.html", import.meta.url), "utf8");
const languages = JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8"));
const stylesheet = readFileSync(new URL("../styles/compact-panel.css", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

assert.match(manifest.version, /^2\.0\.0-(?:dev|rc)\./);
const keys = [
  "ManualAdd", "CustomSpend", "AttackAdvantage", "SaveDisadvantage", "Recharge",
  "Trap", "Warning", "LongRest", "FailedRoll", "CriticalHit", "MassiveDamage",
  "AutomaticSave", "AutomaticAttack", "FreeMove", "Override", "CustomAmount"
];

for (const name of keys) {
  assert.ok(template.includes('data-tooltip="BFDP.Tooltips.' + name + '"'), name + " must have a tooltip");
  assert.ok(languages.BFDP?.Tooltips?.[name]?.length > 70, name + " must be fully explained");
}
const buttons = template.match(/<button\b[\s\S]*?<\/button>/g) ?? [];
assert.equal(buttons.length, 14, "all rule and manual action buttons remain present");
assert.equal((template.match(/class="doom-tip-target"/g) ?? []).length, 14, "wrap all action buttons for disabled hover");
assert.ok(buttons.every(button => button.includes("aria-label=")), "all buttons have accessible text");
assert.ok(buttons.every(button => !button.includes(' title="')), "avoid duplicate native browser tooltips");
assert.ok(stylesheet.includes("pointer-events: none"), "disabled rule actions must allow wrapper hover");
assert.ok(stylesheet.includes("#tooltip.bfdp-doom-help"), "Foundry's tooltip gets readable sizing");

console.log("PASS — all 14 action buttons and 2 inputs provide localized explanatory tooltips.");
