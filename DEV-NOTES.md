Milestone 2: Combat-scoped Doom. DEVELOPMENT ONLY.

Milestone 1 passed live GM/player testing. This milestone requires fresh Foundry V14 validation.
Doom bank now persists in a per-Combat flag, with revision, current amount, active status and last-action information.
Only Foundry's designated active GM can edit; other GMs have read-only controls. Writes are serialized.
An unrelated combat deletion does not reset another bank. Refresh does not reset Doom or replay audio.
Combats ending preserve an inactive bank; restarting creates a new one.
Legacy v1 world settings remain registered but are not used. Do not upgrade a live world mid-combat.
Old starting Doom calculation and action labels/costs remain intentionally unchanged until Milestone 3.

TEST: Start A, adjust, refresh GM/player, start B, switch A/B, delete A while viewing B, end/restart B,
rapid-click gain, two GM sessions, scene changes, and check audio, overlays and console logs.
No release tag or published package is created.
