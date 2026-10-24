# Black Flag Doom Panel v2.0 — Release Controls

Status: **RC preparation**. There is NO live v2.0.0 GitHub Release, public tag, update to `main`, or Foundry directory publication.

## Before release

- [x] Local Windows GM/player acceptance reported for development v2.0.0-dev.7.
- [x] Automated combat, tooltip, compact-panel, player-overlay, and audio regressions passed against dev.7.
- [x] RC branch isolated from `main`.
- [x] Remove v1.0.2 and V13 hardcoded values from future-release automation on RC branch.
- [x] Separate archive upload from manual Foundry directory publication.
- [ ] RC candidate manually installed from its manifest URL using the generated ZIP.
- [ ] GM and players check game rules, audio, browser reload, multiple combats.
- [ ] Secondary Node.js server / two-GM smoke test.
- [ ] User explicitly approves publishing final v2.0.0.

## When approved (not before)

1. Compare release candidate against `main`, review and merge only after explicit user approval.
2. Change the **production** `module.json` to version `2.0.0`, stable manifest `https://raw.githubusercontent.com/ghost00-Ricgames/black-flag-doom-panel/main/module.json`, and download `https://github.com/ghost00-Ricgames/black-flag-doom-panel/releases/download/v2.0.0/black-flag-doom-panel.zip`.
3. Confirm updated workflows are on `main`; the old Foundry publisher would otherwise send v1.0.2 metadata.
4. Create tag `v2.0.0` pointing to the reviewed production commit, then publish a GitHub Release.
5. Verify the GitHub Release asset `black-flag-doom-panel.zip` is uploaded and includes `module.json` at ZIP root.
6. Run **Register Foundry Package Version** workflow manually with `release_tag: v2.0.0`, `dry_run: true`. Review success/errors.
7. After separate explicit publication approval, run the same workflow with `dry_run: false`.
8. Confirm Foundry listing and installation. Close issue #1 only after a successful release.

**Archive packaging note:** The release archive is ROOT-FLAT for Foundry's manifest installer. Older dev manual-install ZIPs contained an outer folder, to copy into Data/modules by hand. Do not confuse the two formats.

Rollback: retain original 1.0.2 GitHub Release and the existing main-branch commit; reverting version metadata or publishing a follow-up patch requires explicit coordination.
