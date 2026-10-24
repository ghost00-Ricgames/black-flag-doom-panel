# Black Flag Doom Panel v2.0 — Final Live Test Plan

## Gate 1 — Compatibility and startup (Windows V14)
- [ ] Module appears in Foundry Setup and can be enabled in a disposable Black Flag 3.x test world.
- [ ] GM panel opens when combat starts, player overlay appears, and neither throws console errors.
- [ ] No duplicate module installation or nested ZIP folder.

## Gate 2 — Monster Vault and GMG rules
- [ ] Two hostile CR 3 creatures create encounter CR 6 and 2 starting Doom.
- [ ] CR tier boundaries: 4→1, 5→2, 8→2, 9→3, 12→3, 13→4, 16→4, 17→5, 20→5, 21→6.
- [ ] Friendlies/neutral NPCs do not count towards hostile encounter CR.
- [ ] Monster Vault spend ADV, save DIS, and recharge decrement Doom by 1. Recharge cannot repeat.
- [ ] Expanded Doom is OFF by default; toggling ON adds the GMG collapsible section.
- [ ] GMG bonuses cannot exceed 2× starting Doom (including base). Recover only previously expended Doom.
- [ ] GMG auto save/attack can be used once per encounter; movement spending is repeatable.
- [ ] Manual Doom correction does not count as recovery or spending.

## Gate 3 — State/multiplayer reliability
- [ ] Refresh GM and player during combat: Doom persists; no starting sound is replayed.
- [ ] GM and player see the same Doom total for their chosen encounter.
- [ ] Multiple combats have independent banks; GM switching doesn't hijack a player's choice.
- [ ] Ending/restarting one combat resets only that encounter. Deleting another encounter does not affect active Doom.
- [ ] Several rapid Doom gain clicks are all recorded.
- [ ] With two GM sessions, only the active GM can edit.

## Gate 4 — Audio changes (Milestone 4)
- [ ] Default sounds: combat start (drums), Doom gain (lock), Doom spend (dice).
- [ ] Start sound OFF prevents start audio without muting gains or spends.
- [ ] Gain OFF and Spend OFF each mute only their named event.
- [ ] Choose a replacement audio file in each file picker, verify correct custom file plays.
- [ ] Clearing a custom audio path restores its original built-in sound.
- [ ] Volume 100/50/0 behaves as expected and respects Foundry interface volume.
- [ ] Local browser mute silences one participant without muting other GM/players.
- [ ] All connected clients get **one sound per event**; no duplicated audio caused by sockets.
- [ ] Confirm no audio on browser refresh or switching to another already-started encounter.

## Gate 5 — Interface and acceptance
- [ ] Compact GM panel layout, Expanded Doom disclosure, and all buttons remain usable.
- [ ] GMG section stays expanded while Doom changes.
- [ ] Explanatory hover popups appear (including disabled buttons).
- [ ] On a short screen the panel scrolls without covering inaccessible controls.
- [ ] Re-run multiplayer tests on the Node.js test server.
- [ ] Review README and migration warnings.

## Release controls
- [ ] All automated tests pass, both environments pass live tests.
- [ ] Explicit user approval for release.
- [ ] Prepare clean production package/ZIP/manifest, review diff, create release/tag as approved.
- [ ] Merge only after the user approves. Verify production download/manifest and rollback path.

**No merge, publication, tag, or closure of GitHub issue #1 without acceptance.**
