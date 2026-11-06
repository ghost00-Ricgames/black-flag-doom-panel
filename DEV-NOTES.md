# Maintainer Notes — Black Flag Doom Panel

The published version is **2.0.0** (GitHub-only). Source of truth: `main`. The historical `development/v2.0` and `release/v2.0-rc1` branches are not suitable bases for future patches.

## What runs in Foundry

- `module.json` loads only `scripts/main.mjs`, the listed CSS, templates, and `lang/en.json`.
- A V14 ApplicationV2 GM panel edits Doom on the current Combat document's `flags.black-flag-doom-panel.doomState` when the local user is Foundry's active GM.
- Player overlays read the Combat state and keep the selected encounter in a **client** setting.
- Writes are serialized per Combat on the active GM; the module does not broadcast extra sockets.
- Each client plays optional Doom audio locally when an observed bank revision advances.
- Expanded Doom is an opt-in world setting; rule actions change the tracker only, not attack/save rolls.

## Development

1. Start new feature or fix branches from `main`; open a PR into `main`.
2. Run `node --check scripts/main.mjs` and `for f in tests/*.mjs; do node "$f"; done` locally.
3. GitHub Actions run tests and validate a ZIP on PRs, configured development branches, and `main`. Pushes **cannot** create a release.
4. Release packaging is handled when a human publishes a GitHub Release matching the stable manifest's version, using `release: published`.
5. Review `TEST-PLAN-v2.md` and `RELEASE-CHECKLIST.md` before publishing.

## Repo housekeeping

Old pre-v2 archives, duplicate screenshots, and the unused `scripts/main.js` were removed from the current tree; Git history retains them. The module's published v2.0.0 ZIP is immutable and unaffected by repository housekeeping.

## Pending

- GitHub branch protection must be configured by a repository administrator: require PR review and CI on `main`.
- Issue #3 requests a movable player counter with client-local remembered position; not implemented yet.
