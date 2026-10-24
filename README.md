# Black Flag Doom Panel

Doom Bank tracking for **Tales of the Valiant / Black Flag** on **Foundry V14**.

**Version 2.0.0** is distributed through GitHub Releases. Compatible Foundry V14 installations can install it through the stable manifest URL below.

## Features

- **Monster Vault Doom by default.** Adds the encounter CRs of hostile creatures to establish starting Doom: total CR 0–4: 1; 5–8: 2; 9–12: 3; 13–16: 4; 17–20: 5; 21+: 6.
- **Optional Expanded Doom** from the Game Master's Guide, **off by default**: qualifying precombat additions (maximum initial Doom twice the normal bank), recovery of previously spent Doom, and additional spending options.
- **Compact GM panel:** one-click spends, manual override, a collapsible GMG section, and explanatory hover popups. Once-per-encounter actions become unavailable after use.
- **Player-facing Doom overlay:** keeps the bank visible and synchronized. When more than one eligible combat is running, players can choose the encounter their overlay follows.
- **Combat-scoped Doom:** each encounter keeps a separate, persistent bank; only the currently active GM may modify its state.
- **Audio options:** individual start/gain/spend sound controls, replacement audio paths, master volume, and local mute.

## Sound configuration

Open **Game Settings → Configure Settings → Module Settings → Black Flag Doom Panel**.

- Combat start, Doom gain and Doom spend sounds are individually enabled by default.
- Set a custom audio file for each event using Foundry's file picker. Leave its path blank to retain the built-in file (`sounds/drums.wav`, `sounds/lock.wav`, `sounds/dice.wav`).
- The Doom volume setting ranges from 0–100%, with 100% preserving existing built-in relative levels.
- `Mute Doom sounds on this browser` is a client preference. It does not change audio for other participants.

Audio is triggered locally when a client observes a combat state update; it is not rebroadcast by each client to other users.

## Game mechanics

Spend Doom from the Monster Vault actions for creature attack advantage, PC saving throw disadvantage, or one limited-use feature refresh (once per encounter). With Expanded Doom enabled, the GM can manually record qualifying pre-encounter additions and regain expended points, and spend on automatic successes or half-speed movement without opportunity attacks. Hover over each button for the complete explanation.

The module is a **tracker**, not an automated attack/save modifier. It does not roll dice or enforce timing beyond the tracked once-per-encounter limits.

## Install v2.0.0 from GitHub

In Foundry Setup → **Add-on Modules → Install Module**, paste the production manifest URL:

`https://raw.githubusercontent.com/ghost00-Ricgames/black-flag-doom-panel/main/module.json`

Foundry reads the manifest's `download` field and installs the matching GitHub Release ZIP. The release archive has `module.json` at its root. Alternatively, download the release asset and install it manually in `Data/modules/black-flag-doom-panel`.

Back up worlds before upgrading from v1.0.2. The two versions use the same module ID and cannot be installed side by side in one Foundry data directory.

## GitHub-based updating

The official Foundry directory publication workflow has been removed. **Automatic update detection still works through the module's manifest URL**, without calling the Foundry publishing API. Once v2.0.0 is approved and released, the production manifest stays at:

`https://raw.githubusercontent.com/ghost00-Ricgames/black-flag-doom-panel/main/module.json`

The published production manifest's `download` field must point to the versioned GitHub Release ZIP. Users of the existing v1.0.2 module already using the main-branch manifest can use Foundry's **Check Update / Update All** controls when v2.0.0 is available.

**Important for RC testers:** If you previously installed the temporary `release/v2.0-rc1` manifest, install the stable module from the `main/module.json` URL above so future releases are detected.

## Compatibility and migration

- Foundry minimum 14.359; tested only with Black Flag 3.x (system dependency minimum 3.0.079).
- **Finish combat before upgrading an existing world.** v1 stored Doom in a world-level setting; v2 stores independent Doom state on each Combat document and does not automatically transfer an in-progress v1 bank.
- Hostile disposition determines the encounter CR; check token disposition and CR data before combat begins.
- Additional GMG events are applied by pressing the matching buttons, not by observing chat messages automatically.
- Sound requires browser playback permissions and valid file paths for replacements.

## Licensing and third-party attribution

Original module code is provided under the MIT license (see [LICENSE](LICENSE)). Black Flag Reference Document material incorporated into this project is separately attributed under **CC BY 4.0** in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md), which is also included in the installable ZIP.

The optional *Game Master's Guide* Expanded Doom controls implement game procedures using independently written explanatory text, rather than reproducing a published passage. This unofficial module is not affiliated with or endorsed by Kobold Press, and it does not include Kobold Press logos.

## Release status

- Release and update verification is documented in [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md).
- Regression cases: [TEST-PLAN-v2.md](TEST-PLAN-v2.md).
- History: [CHANGELOG.md](CHANGELOG.md).
- Outstanding user request: [#1 (audio preferences)](https://github.com/ghost00-Ricgames/black-flag-doom-panel/issues/1) — delivered in v2.0.0.

Original code: MIT. BFRD-derived material: CC BY 4.0 with attribution. Previous versions remain available in GitHub Releases.
