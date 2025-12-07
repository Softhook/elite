# Enemy Behaviors — Design Notes

Summary
- Goal: make enemies less predictable and produce more diverse, tactical encounters without heavy CPU cost.
- Focus areas: weapon-choice variability, timing jitter, feints, combo sequences, group coordination, adaptive targeting.

Key New Behaviors (short)
- Randomized Aggression: per-ship `aggression` (0..1) perturbs weapon scoring and willingness to feint or rush.
- Cooldown Jitter: add small random variation to `fireCooldown` and weapon-switch timings to avoid robotic patterns.
- Feint / Fake Fire: occasional non-damaging wind-ups or firing animations to bait player responses.


Mapping to code locations
- Weapon selection & jitter: `enemyCombat.js` — `selectOptimalWeapon`, `selectBestWeapon`, `performFiring`, `fireWeapon`.
- Movement & cover seeking: `enemyMovement.js` (or `enemy.js` movement code) — add `seekCover`, `peekAndShoot`, `ambushState`.
- Group coordination: `eventManager.js` or `eventManager` already referenced — add simple broadcast: `eventManager.broadcast('groupFocus', {target, originId})`.
- Persistent per-ship data: attach fields on Enemy instances: `aggression`, `morale`, `conservation`, `lastHitLog[]`, `isInCover`, `peekTimer`, `groupRole`.

Tunable parameters (suggested)
- AGGRESSION_VARIANCE = 0.15
- COOLDOWN_JITTER_MAX = 0.15 (seconds)
- FEINT_PROB_BASE = 0.05
- PEEK_DURATION = 0.6 (seconds)
- PEEK_COOLDOWN = 2.5 (seconds)
- GROUP_FOCUS_THRESHOLD = 2


Low-risk incremental patch (suggestion)
1. Add `aggression` and cooldown jitter to `enemyCombat.js` (`selectOptimalWeapon` and when setting `fireCooldown`).


Next steps
- I can implement a non-invasive patch that adds `aggression` and cooldown jitter in `enemyCombat.js`, plus a simple LOS helper and one movement stub for cover. 
