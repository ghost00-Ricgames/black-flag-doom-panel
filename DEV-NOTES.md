# v2.0.0-dev.7 — Milestone 4 implemented / Milestone 5 pending live test

World settings allow individual sound toggles, custom sound files, and percent-based volume. A client setting allows each browser to mute Doom sounds.

Audio uses Foundry V14 AudioHelper.play with socket=false to avoid duplication; each client reacts to combat flag updates.

Test plan: TEST-PLAN-v2.md. Release history: CHANGELOG.md. Updated README documents rules and sound options.

Milestone 4 mock regression checks have passed. **Do not tag, release or merge** until verified in a real Foundry V14 GM + player test setup and approved.
