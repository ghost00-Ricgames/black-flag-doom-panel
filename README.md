# Black Flag Doom Panel — v2 development

GM Doom-tracking panel and player overlay for the **Tales of the Valiant / Black Flag** game system in **Foundry V14**.

> **Development branch only.** The stable published v1.0.2 remains on `main`. Do not install this development branch on a live campaign without backing up your world.

## What v2 adds

- **Monster Vault Doom is the default.** Initial Doom comes from the combined CR of hostile encounter creatures (CR 0–4 → 1, 5–8 → 2, 9–12 → 3, 13–16 → 4, 17–20 → 5, 21+ → 6).
- **Expanded Doom (Game Master's Guide) is optional**, off by default. Enable it under **Game Settings → Configure Settings → Module Settings → Black Flag Doom Panel** for qualifying pre-encounter bonuses, recovery of expended Doom, and additional spending.
- A compact GM panel with descriptions when hovering over spending and recovery actions. Used once-per-encounter buttons are disabled for the rest of that encounter.
- Independent Doom banks saved on each Combat document. Player overlays remain synchronized to the encounter chosen in their own browser, even when the GM switches encounters.
- V14 ApplicationV2 compatibility and deterministic GM authority for editing.
- Configurable start/gain/spend audio per event, replacement files, volume control, and individual browser mute.

## Sound settings (development build)

Under **Game Settings → Configure Settings → Module Settings → Black Flag Doom Panel**, set:
- **Combat start sound**, **Doom gain sound**, **Doom spend sound**: enabled by default, individually switchable.
- **Combat start custom audio**, **Doom gain custom audio**, **Doom spend custom audio**: choose an audio file in Foundry's user data using the path picker, or enter the file path. **Blank restores the original sound** (start `sounds/drums.wav`, gain `sounds/lock.wav`, spend `sounds/dice.wav`).
- **Doom sound volume (%)**: from 0 to 100, default 100 (preserves original relative volumes).
- **Mute Doom sounds on this browser**: optional client setting for players or GM; does not silence other browsers.

The Doom total and audio events are synchronized through combat document updates, not by rebroadcasting the audio across the socket. Each browser plays the selected sound once when its displayed encounter's Doom changes. The module does not automatically apply advantage, saving throws, or other mechanical effects.

## Manual test installation

1. Stop Foundry and back up existing module data.
2. Unzip the supplied `v2.0.0-dev.7` test archive under your Foundry User Data `Data/modules` directory.
3. Confirm that the file is at `Data/modules/black-flag-doom-panel/module.json`.
4. Restart Foundry, enable the module in a **disposable** Black Flag test world, then run the regression checklist in `TEST-PLAN-v2.md`.

Only install one version at a time in a particular Foundry user-data directory because v1 and v2 share the module ID.

## Compatibility and limitations

- Manifest minimum: Foundry 14.359; Black Flag system 3.0.079.
- Prior v1.x world-level Doom settings are registered for compatibility but are not used by v2. Finish any in-progress combat before upgrading a live world.
- Encounter's Doom CR depends on hostile disposition; misclassified tokens and creatures without proper CR data may require GM corrections.
- The GMG rule-trigger buttons are manually activated by the GM; there is no chat-roll automation.
- If more than one eligible combat is running, each player can choose their overlay encounter.
- Live verification for v2.0.0-dev.7 is pending.

## Project

Source: [ghost00-Ricgames/black-flag-doom-panel](https://github.com/ghost00-Ricgames/black-flag-doom-panel)

Issue: [#1 — Sound effect options](https://github.com/ghost00-Ricgames/black-flag-doom-panel/issues/1)

License: MIT.
