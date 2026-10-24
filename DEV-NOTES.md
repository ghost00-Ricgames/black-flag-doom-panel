# v2.0.0-dev.4: Monster Vault defaults + optional Expanded Doom

* Default rules: Monster Vault p.13. Summed hostile encounter CR maps to 1/2/3/4/5/6 Doom for CR 0-4 / 5-8 / 9-12 / 13-16 / 17-20 / 21+.
* Normal Doom spending (1 each): creature attack advantage; PC save disadvantage; limited-use feature refresh once per encounter.
* Expanded Doom is OFF by default. GM can enable in world Module Settings.
* Expanded (GMG pp.72-73) before-encounter qualifying events: +1 each; overall bonus capped at baseline, total not more than 2x baseline.
* Expanded during encounter: +1 previously expended Doom for creature attack/save fail by 5+, suffering crit, taking massive damage. Never increase without expended balance.
* Extra spend options (1 each): automatic creature save once per encounter; automatic creature attack once per encounter; movement up to half speed avoiding opportunity attacks at end of another creature's turn.
* Manual add, direct number corrections and custom spend remain. Only actual spend actions increase expended balance.
* All rules events are GM button actions, not chat automation.
* Hostile token disposition preferred to exclude allied NPCs. If disposition unavailable, fallback to NPC ownership heuristic.
* Existing dev.2/dev.3 combat banks convert in place; prior spent history cannot be reconstructed. Start fresh combats to test baseline/limited-use tracking.

Test: multiple NPC CR sum (e.g. 3+3 => CR 6 => Doom 2), all tier boundaries, single recharge use, expanded setting off/on, GMG bonus cap, recovery only after spending, save/attack once flags, browser reload and player overlay independence. Do not publish.
