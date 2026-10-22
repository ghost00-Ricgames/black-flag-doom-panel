# Black Flag Doom Panel v2 — Milestone 1

This is **development-only**, not a released version. The production branch and release ZIP are unchanged.

## Architecture changes
- ApplicationV2 / HandlebarsApplicationMixin replaces the two legacy Application windows.
- Native `data-action` handlers replace jQuery click handlers.
- New ES module entrypoint `scripts/main.mjs`, Foundry V14 manifest metadata and Black Flag 3.x requirement.
- Existing overlay template, base stylesheet, images, language strings and legacy JS are preserved in the branch.
- Local-only sound playback avoids multiplying socket broadcasts; V14 requires `autoplay: true`.
- Do not reset Doom solely because the GM reloads; refresh the GM display when combatants or actors change.

## Deliberately NOT completed
- Rules-correct encounter CR / starting Doom, Expanded Doom and expended Doom bookkeeping.
- Per-combat persistence, multiple-GM write arbitration or unrelated-combat deletion bug.
- Issue #1 sound preferences and player-specific volumes.
- Finished localization, animation, full regression tests and live Foundry V14 verification.

**Important:** The old v1 Doom action labels and costs remain temporarily for functionality parity; they are not an assertion of Tales of the Valiant rules correctness.

## Validate locally
Run `node --check scripts/main.mjs` then `node tests/mock-smoke.mjs`.
Test actual rendering and events in a disposable Foundry V14 world before merging.
No production publishing, tag creation or workflow changes in this milestone.
