# v2.0.0-dev.3 — Player encounter selection fix

Milestone 2 live report: combat banks remain separate, but the player overlay unexpectedly followed the GM's viewed encounter.

Fix:
- GM panel and overlay continue to follow the GM's viewed encounter.
- Players now resolve Doom from an independent locally selected combat, never the GM's viewed encounter.
- Player overlays show an encounter selector only when multiple started combats are visible on the player's current scene.
- Selected combat ID is stored as a client setting, with fallback to a scene-relevant encounter featuring an owned character.
- Changing the GM tracker focus never changes a player's selected bank.
- If a selected encounter ends, is deleted or is no longer on the viewed scene, the overlay falls back to an eligible encounter, or closes.
- Only the selector can intercept mouse events; the decorative overlay remains click-through.

Still pending: ToV rules corrections (Milestone 3), configurable audio, full live verification.

Test: Start A and B on the same scene. Player selects A; GM switches to B. The player should still see A's Doom. Player selects B; the number should change to B's bank. Change scenes independently and refresh, confirming the selection persists where valid.
