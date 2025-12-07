# Enemy Behaviors — Design Notes

Summary
- Goal: make enemies less predictable and produce more diverse, tactical encounters without heavy CPU cost.
- Focus areas: weapon-choice variability, timing jitter, feints, combo sequences, group coordination, adaptive targeting, and environmental (asteroid) usage.

Key New Behaviors (short)
- Randomized Aggression: per-ship `aggression` (0..1) perturbs weapon scoring and willingness to feint or rush.
- Cooldown Jitter: add small random variation to `fireCooldown` and weapon-switch timings to avoid robotic patterns.
- Feint / Fake Fire: occasional non-damaging wind-ups or firing animations to bait player responses.
- Combo Sequences: reserve setup weapons (`TANGLE`/`EMP`) and follow with high-damage weapons when setup succeeds.
- Group Focus-Fire / Baiting: assign `groupRole` (bait, flanker, anchor) and broadcast `focusFireTarget` events so allies coordinate.
- Adaptive Targeting: short-term `lastHitLog` to bias choices (e.g., avoid angles that got hit by missiles).
- Resource Awareness: track limited-use abilities (mines, harpoon) and only use conservatively based on `conservation` param.

Asteroid / Cover Usage (detailed)
- Motivation: let enemies use obstacles to break line-of-sight (LOS), ambush, or retreat.

Design elements
- Detect cover: treat large asteroids as opaque circles with radius `r`. A simple LOS check: cast a segment between enemy and player; if intersects asteroid circle, consider enemy "behind cover." Use cheap geometry (point-circle intersection).
- Cover behaviors:
  - Hide: when health/shields low or outgunned, attempt to move to nearest asteroid that blocks LOS.
  - Peek-and-shoot: briefly move to edge of cover, fire a short burst, then retreat. Timing controlled by `peekTimer` and `peekCooldown` (tunable).
  - Ambush: bait ships intentionally draw player into an asteroid field; allies wait in cover and perform synchronized burst when player is in kill zone.
  - Minefields: drop mines around asteroid chokepoints; good for fleeing or area denial.
- Implementation notes:
  - Movement: add a new `seekCover(asteroid)` behavior in `enemyMovement.js` (or the movement module). When in cover state, set `isInCover=true` and disable straightforward pursuit.
  - Combat hooks: in `performFiring` and `selectOptimalWeapon` add checks for `isInCover` / `peekTimer` to allow temporary firing even when not fully in ideal firing arc.
  - LOS check: implement helper `isLineBlockedByAsteroid(p1, p2, asteroid)` to be cheap and deterministic.
  - Avoid heavy AI pathfinding: use simple steering (arrive, evade, circle) rather than A*.

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
- MINE_DROP_CONSERVATION = 0.6 (0..1 means save 60% uses)

Low-risk incremental patch (suggestion)
1. Add `aggression` and cooldown jitter to `enemyCombat.js` (`selectOptimalWeapon` and when setting `fireCooldown`).
2. Implement cheap LOS helper and `isBehindAsteroid()` utility in a small module or `enemyCombat.js`.
3. Add `seekCover()` stub to movement code and call it when `hullPct < 0.4` or `morale < threshold`.

Example cheap LOS test (pseudo)
```
// returns true if segment p1->p2 intersects asteroid circle
function segmentIntersectsCircle(p1, p2, center, r) {
  // project center onto segment and test distance <= r
}
```

Notes and tradeoffs
- Keep costs low: avoid global pathfinding or per-frame complex checks. Only evaluate cover selection every 0.5–1s for each ship.
- Determinism: store a PRNG seed per ship (based on spawn id) to keep reproducible but varied behavior.
- Balancing: tune `aggression` and `peek` values per enemy archetype (sniper vs swarmer vs tanker).

Next steps
- I can implement a non-invasive patch that adds `aggression` and cooldown jitter in `enemyCombat.js`, plus a simple LOS helper and one movement stub for cover. Or I can implement the full `peek-and-shoot` flow — tell me which you prefer.

