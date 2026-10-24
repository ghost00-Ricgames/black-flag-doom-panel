# v2.0.0-dev.7 — Audio options (Milestone 4)

World settings: independent enable/disable and replacement audio paths for combat start, Doom gain, Doom spend; master Doom volume (0–100%).

Client setting: mute Doom sounds on this browser.

Preserves original sounds when paths are blank. Player and GM clients each respond to the combat flag update and play local audio, never forwarding it via sockets.

Uses Foundry V14 FilePathField with AUDIO category for replacement sound inputs and NumberField with slider range for volume; path controls require live UI check.

**Pending:** live Windows and Node.js player/GM audio verification. No production release, merge or tag.

**Regression:** audio toggles, custom paths, original fallback, volume, client mute, connected-player synchronization, refresh silence, player encounter isolation, ToV baseline and GMG spending.
