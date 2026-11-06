# Release Checklist — GitHub-Only Distribution

Current published module: **v2.0.0** (2026-10-24). This document describes **future** releases. There is no Foundry-directory publisher workflow.

## Pre-release

- [ ] Work from a new branch based on current `main` (do not use the historical `development/v2.0` or `release/v2.0-rc1` branches).
- [ ] Review all source, rules, UI, compatibility, and third-party attribution changes.
- [ ] Update `module.json`: `version`, `compatibility` only if appropriate, and `download` to the planned release tag; preserve the stable main-branch `manifest` URL.
- [ ] Update `CHANGELOG.md`, README and release notes for the new version.
- [ ] Open a pull request into `main`. Review the diff and wait for green CI.
- [ ] Perform Foundry GM/player live checks based on [TEST-PLAN-v2.md](TEST-PLAN-v2.md).
- [ ] Obtain explicit maintainer approval before merge and release; back up the test world.

## GitHub release (manual initiation)

1. Merge the reviewed PR to `main` after approval. A push to `main` runs **tests and packaging only**. It does not create a tag, GitHub Release, or Foundry directory submission.
2. Check that the stable manifest at `https://raw.githubusercontent.com/ghost00-Ricgames/black-flag-doom-panel/main/module.json` contains the intended version and the matching versioned download link.
3. Create a GitHub release for the reviewed commit with the matching **vX.Y.Z** tag, initially as a draft if practical. When published, the `release: published` workflow checks the tag against `module.json`, builds a clean ZIP and attaches `black-flag-doom-panel.zip`.
4. Wait for GitHub Actions to finish successfully before telling users to install/update. Verify the asset is available at the manifest's `download` URL and contains root-level `module.json`, `LICENSE`, and `THIRD-PARTY-NOTICES.md`.
5. On a fresh Foundry data directory, install using the permanent manifest; on an older stable installation, verify **Check Update** detects the new version.
6. **Do not call Foundry's official package publishing API**. GitHub-only distribution is intentional.
7. Keep the previous release for rollback; close feature issues only after confirming the delivered behavior.

## Security and branch hygiene

- `main` should require pull-request review and a successful **Run tests and assemble installer** check in GitHub's branch protection/ruleset settings. This is a GitHub repository setting, **not** configured by this document.
- The workflow grants `contents: read` for validation; only the job attaching assets to an explicitly published GitHub Release uses `contents: write`.
- Old experimental branches and ZIP files are recoverable through Git history; do not base future work on the obsolete v2.0 development branch.

## Installation

Manifest: `https://raw.githubusercontent.com/ghost00-Ricgames/black-flag-doom-panel/main/module.json`

ZIP: `https://github.com/ghost00-Ricgames/black-flag-doom-panel/releases/download/v<VERSION>/black-flag-doom-panel.zip`

A temporary release-candidate manifest does not automatically migrate to the stable main manifest.
