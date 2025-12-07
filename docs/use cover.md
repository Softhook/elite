Asteroid / Cover Usage (detailed)
- Motivation: Enemies use asteroids to break line-of-sight (LOS), ambush, or retreat. Adds tactical depth, making asteroid fields more dangerous and strategic.
- Current hook: Implemented via enemy combat AI with cover evaluation in combat flow; uses `coverCandidates` cached on the system, state switch to `REPOSITIONING`, and a simple peek window once near cover.

Design elements
- Detect cover: Treat asteroids as opaque circles. LOS check: If line from enemy to player intersects asteroid, it's blocked. Use point-circle intersection. Cache results for 0.5-1s. For irregular asteroids, use bounding boxes.
- Cover behaviors:
  - Seek cover: When low health or outgunned, move to the best asteroid that blocks LOS. Prefer static or slow-moving asteroids (faster ones are unreliable). Small ships should find cover more easily — treat asteroid fit as a factor (asteroid radius vs ship size). Score candidates by distance, size-fit (how well the ship can fit/be obscured), blockage angle, and speed (static = higher score). Larger ships require proportionally larger asteroids and should fall back to evasive maneuvers more often.
  - Peek-and-shoot: Emerge briefly from cover, fire burst, retreat. Duration scales with aggression. Prefer quick weapons.
  - Ambush: Bait player into field; allies in cover attack when player enters zone. Use group signals.
  - Minefields: Drop mines at choke points or predicted paths. Limit by conservation.

Implementation notes
- Movement: Add `seekCover(asteroid)` in `enemyMovement.js`. Use steering (seek, arrive) for smooth moves. Add hesitation for realism.
- Combat hooks: In `performFiring` and `selectOptimalWeapon`, allow firing during peek. Boost short-range weapons; reduce accuracy in cover.
- LOS check: Helper `isLineBlockedByAsteroid(p1, p2, asteroid)`. Check multiple asteroids; partial blockage allows firing with penalty.
- Pathfinding: Simple steering; check waypoints for complex fields.
- Extras: Predict player movement; aware of planets/stations; balance with aggression/morale; visual dimming; evaluate every 0.5-1s.

Risk and Decision Making
- Trigger: Low health (<40%), shields down, outnumbered. Weigh risk: Exposure during move. Re-evaluate every 1-2s; abort if cover invalid.

Dynamic Environments
- Asteroids move slowly; update cache often. Prefer static ones for stable cover. Predict paths for moving asteroids.

Player Counterplay and Adaptations
- Players spot covered indicators or movements. Use arcing weapons or destroy asteroids. Enemies vary timings or learn from player tactics.

Multi-Ship Tactics
- Roles: Bait, Spotter, Flanker, Anchor. Coordinate via eventManager: Idle → Baiting → Ambushing → Retreat.

Balancing and Tuning
- Params: COVER_EVAL_INTERVAL=1.0s, PEEK_DURATION=0.6s, AGGRESSION_MULT=1.5, DIST_WEIGHT=0.4, BLOCKAGE_WEIGHT=0.6, SPEED_WEIGHT=0.2 (favor static).
- Scaling: Harder difficulties = more aggressive cover use.

Testing Considerations
- Unit tests: Mock asteroids for LOS, scoring, transitions.
- Playtest: Dense fields; check performance/exploits.
- Edges: No asteroids, fast movers, solo/group.

Code Structure (Pseudocode)
- In enemy.js:
  ```js
  function evaluateCover() {
    if (this.coverEvalTimer > 0) return;
    this.coverEvalTimer = COVER_EVALUATION_INTERVAL;
    const best = this.system.asteroids.reduce((b, ast) => {
      const score = scoreCover(ast, this.pos, player.pos);
      return score > b.score ? {ast, score} : b;
    }, {score: -1});
    if (best.score > 0) this.targetCover = best.ast;
  }
  function scoreCover(ast, ePos, pPos) {
    const dist = dist(ePos, ast.pos);
    const blockage = calculateBlockageAngle(ast, ePos, pPos);
    const speedPenalty = ast.vel ? ast.vel.mag() : 0; // Lower for static
    // Size-fit: favor asteroids that are comfortably larger than the ship
    const shipSize = this.size || 20; // fallback if undefined
    const fitRatio = Math.max(0, (ast.radius - shipSize) / Math.max(ast.radius, 1)); // 0..1 where 1 = asteroid much larger
    const sizeFactor = clamp(fitRatio, 0, 1);
    return (1/dist)*DIST_WEIGHT + blockage*BLOCKAGE_WEIGHT - speedPenalty*SPEED_WEIGHT + sizeFactor*0.8; // sizeFactor boost
  }
  ```
- Update loop: Call evaluateCover() and seekCover() per state.
 
CPU Minimization
- Early exit: if the system has no asteroids or no suitable (static/slow/large) asteroids, skip all cover logic entirely. This check should be the very first line in `evaluateCover()` and any cover-related update hooks.
- Candidate list: precompute `system.coverCandidates` at system load (or when asteroids change) by filtering asteroids for size and low speed. Use that list instead of scanning `system.asteroids` each evaluation.
- Limit checks: only evaluate cover for ships that meet a cheap trigger (e.g., hull < 0.5 * maxHull, shields low, or outnumbered). Do not run for every enemy every frame.
- Rate limit: run `evaluateCover()` per ship on a timer (0.5–1.0s) not per frame. Stagger timers across ships to avoid spikes.
- Bounded search: only score the nearest N candidates (N=4..8) sorted by distance to reduce work in dense fields.
- Cheap LOS: implement `isLineBlockedByAsteroid()` with point-circle math (O(1)). Cache results per asteroid-player pair for 0.5–1s and invalidate when asteroid moves more than a small threshold.
- Batch/approximate: for large groups, run cover evaluation for a subset each tick (round-robin) and share results among nearby allies (spotter role) to reduce duplicate work.
- Avoid per-weapon or per-asteroid heavy math inside the tight loop. Precompute asteroid radius and squared radius, and reuse vector math.

Minimal `evaluateCover()` pattern (pseudocode)
```js
function evaluateCover() {
  if (!this.system || !Array.isArray(this.system.coverCandidates) || this.system.coverCandidates.length === 0) return; // early exit
  if (this.coverEvalTimer > 0) return; // rate limited
  if (!this.shouldConsiderCover()) return; // cheap trigger (health, shields, role)
  this.coverEvalTimer = COVER_EVAL_INTERVAL + (Math.random()*0.2 - 0.1); // slight jitter

  const candidates = this.system.coverCandidates; // prefiltered, small list
  // sort or take nearest N cheaply (use squared distance)
  const nearest = takeNearestN(candidates, this.pos, 6);
  let best = {score:-Infinity};
  for (const ast of nearest) {
    // cheap cached LOS check
    if (!cachedLOSAllows(ast, this.pos, player.pos)) continue;
    const score = scoreCover(ast, this.pos, player.pos);
    if (score > best.score) best = {ast, score};
  }
  if (best.score > 0) this.targetCover = best.ast;
}
```

These steps keep per-frame cost near zero when no cover is present and keep per-ship work bounded and staggered when it is.