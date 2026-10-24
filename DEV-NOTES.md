# v2.0.0-dev.6 — Foundry V14 explanatory hover popups

This follows live approval of the compact dev.5 GM layout. Doom rules, persistence, audio, and player overlay are unchanged.

- Uses native Foundry V14 TooltipManager through data-tooltip localization keys (not delayed browser title popups).
- All 14 GM action buttons have full explanatory text with when to use it, Doom cost, limits, and caveats.
- Manual bank correction and the custom spend amount field also have explanatory tooltips.
- Tooltips live in lang/en.json under BFDP.Tooltips for future localization.
- Tooltips are on wrapper spans, so a once-per-encounter action's explanation remains available even when its button is disabled. Disabled buttons stay noninteractive.
- TooltipManager handles position relative to the screen; the tooltip CSS sets a readable maximum width.
- The compact layout and expandable GMG controls are preserved.

Live checks: hover Monster Vault actions (especially Recharge after use), expand GMG and hover all nine GMG actions, hover Add 1 and Spend, check no duplicate browser title tooltip appears, and verify clicking remains functional. Also test with GMG off.
