// Repository-only checks: installable resource declarations and release safety.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = file => readFileSync(new URL(file, root), "utf8");
const manifest = JSON.parse(read("module.json"));
assert.equal(manifest.id, "black-flag-doom-panel");
assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-(?:dev|rc)\.\d+)?$/);
assert.match(manifest.compatibility.verified, /^14/);
assert.ok(manifest.relationships.systems.some(system => system.id === "black-flag"));

for (const path of ["module.json", ...manifest.esmodules, ...manifest.styles,
  ...manifest.languages.map(language => language.path), "LICENSE", "THIRD-PARTY-NOTICES.md",
  "templates/doom-panel.html", "templates/doom-overlay.html"]) {
  assert.ok(existsSync(new URL(path, root)), "missing installable file " + path);
}
const flow = read(".github/workflows/package.yml");
assert.ok(!flow.includes("gh release create"), "pushes must not publish GitHub releases");
assert.ok(!flow.includes("foundryvtt.com/_api"), "no Foundry-directory submissions");
assert.ok(flow.includes("pull_request:"), "PR CI must be enabled");
assert.ok(flow.includes("release:"), "approved GitHub releases must package");
assert.ok(flow.includes("contents: read") && flow.includes("contents: write"),
  "release writes should be limited to a separate job");
assert.ok(!existsSync(new URL(".github/workflows/publish.yml", root)),
  "legacy Foundry directory publication workflow must stay removed");
if (!manifest.version.includes("-")) {
  assert.equal(manifest.manifest,
    "https://raw.githubusercontent.com/ghost00-Ricgames/black-flag-doom-panel/main/module.json");
  assert.equal(manifest.download,
    `https://github.com/ghost00-Ricgames/black-flag-doom-panel/releases/download/v${manifest.version}/black-flag-doom-panel.zip`);
}
console.log("PASS — manifest resources, branch CI, and GitHub-only release safeguards.");
