# v2.0.0-dev.5 — Compact GM panel test build

This is a presentation-only iteration following live Foundry V14 confirmation that Monster Vault and Expanded Doom rules work in dev.4.

## New layout
- Slightly wider (330px) GM panel, substantially less vertical space.
- Compact encounter metrics and a two-column Doom/GM adjustments row.
- Three Monster Vault spending buttons displayed side by side.
- GMG Expanded Doom controls now live in one disclosure section, collapsed initially.
- Expanded controls are three short rows of three buttons (pre-combat, recover, and extra spending).
- Full rule text remains available in each button's mouse-hover title and accessibility label when supplied.
- Expansion stays open across data-triggered ApplicationV2 rerenders; the preference is cosmetic and client-local.
- Rule calculations, combat persistence, player overlay and sound behavior unchanged.

## Live test
1. With Expanded Doom OFF, confirm the compact three-button Monster Vault layout.
2. With Expanded Doom ON, confirm a single collapsed Expanded Doom bar.
3. Open it, click Trap/Warn/Rest, Recovery, Auto Save/Hit/Free Move. Disclosure must stay open as the Doom total changes.
4. Verify once-per-encounter buttons disable; ensure all tooltips show full meaning.
5. Check window width, scroll behavior at low screen height, and GM/player synchronization.
