# Bodyguard Protection Services Hardening Review

## Overview
Reviewed the hardening of bodyguard lifecycle management in `player.js` and the associated test in `test/player.test.js`.

## Current Implementation

### Key Methods
1. **`spawnBodyguards(system)`** - Line 4478
   - Filters out destroyed guards
   - For each guard: checks if enemyRef is still tracked via `_isBodyguardRefTrackedInSystem()`
   - **Respawn condition**: `if (currentSystem !== system || destroyed || !tracked)`
   - Spawns new Enemy if condition met

2. **`syncBodyguardStatus()`** - Line 4545
   - Called every frame from player.draw()
   - Clears stale refs using different logic
   - **Stale detection**: `if (!destroyed && inCurrentSystem && !tracked)`
   - Syncs hull status and removes destroyed guards

3. **`_isBodyguardRefTrackedInSystem(guard, system)`** - Line 4347
   - Checks THREE conditions (all must be true):
     - `guard.enemyRef.currentSystem === system`
     - `Array.isArray(system.enemies)`
     - `system.enemies.includes(guard.enemyRef)`

### Test Coverage

**Single Test**: "re-spawns a bodyguard when enemyRef exists but is stale (not tracked by system)"
- Line 577-609 in test/player.test.js
- **Scenario**: Guard exists with `currentSystem === system`, but NOT in `system.enemies` array
- **Setup**:
  ```js
  const staleEnemyRef = {
      currentSystem: system,  // Same system
      destroyed: false,
      hull: 40,
      maxHull: 60
  };
  // NOT added to system.enemies
  ```
- **Expectations**:
  1. New Enemy created (constructor called once)
  2. New enemy added to system.enemies
  3. guard.enemyRef updated to new enemy
  4. staleEnemyRef.destroyed remains FALSE (not marked)
- **Status**: ✅ PASSING

---

## Critical Assumptions Under Test

### Assumption 1: Stale Refs Are Detectable Without Destroyed Flag
**Hypothesis**: A reference can exist but be removed from `system.enemies` without being marked as destroyed.

**Test Coverage**: ✅ TESTED
- The single test validates this exact scenario
- staleEnemyRef.destroyed = false but NOT in array

**Implementation Check**: ✅ CONSISTENT
- `_isBodyguardRefTrackedInSystem()` checks the array explicitly
- No dependency on destroyed flag for detection
- Line 4495: `const guardStillInSystem = this._isBodyguardRefTrackedInSystem(guard, system);`

---

### Assumption 2: Same-System Stale Refs Don't Mark Old Reference as Destroyed
**Hypothesis**: If a guard is culled from the same system, we don't mark its enemyRef.destroyed.

**Test Coverage**: ✅ TESTED
- Expectation: `staleEnemyRef.destroyed === false` after respawn

**Implementation Check**: ✅ CONSISTENT
- Line 4500-4502: Mark destroyed only if `currentSystem !== system`
  ```js
  if (!guard.enemyRef.destroyed && guard.enemyRef.currentSystem !== system) {
      guard.enemyRef.destroyed = true;
  }
  ```

**Rationale**: Preserves the orphaned ref for garbage collection

---

### Assumption 3: Cross-System Transitions Work Correctly
**Hypothesis**: When player jumps to a different system, stale refs from old system are handled.

**Test Coverage**: ❌ NOT TESTED
- Current test only checks same-system culling
- Missing: Cross-system transition scenarios

**Implementation Check**: INCOMPLETE VALIDATION
- Line 4499: `if (guard.enemyRef.currentSystem !== system || ...)`
- Cross-system refs ARE detected
- OLD ref IS marked as destroyed (line 4501)
- But **no test validates this behavior**

---

### Assumption 4: Distance Despawn Doesn't Cull Player Bodyguards
**Hypothesis**: StarSystem respects `isPlayerBodyguard` flag and doesn't remove these entities.

**Test Coverage**: ❌ NOT TESTED
- No validation that distance culling preserves player bodyguards
- This is handled in starSystem.js, not player.js

**Implementation Check**: REQUIRES REVIEW OF STARSYSTEM
- Player bodyguards are marked with `isPlayerBodyguard = true` (line 4514)
- Must verify starSystem.js respects this flag in distance despawn logic

---

### Assumption 5: syncBodyguardStatus Correctly Detects Stale Refs
**Hypothesis**: The frame-by-frame sync detects and clears stale refs properly.

**Test Coverage**: ❌ NOT TESTED
- No validation of syncBodyguardStatus() behavior
- Different logic than spawnBodyguards()

**Implementation Check**: ⚠️ LOGIC INCONSISTENCY FOUND

**Issue**: spawnBodyguards and syncBodyguardStatus use DIFFERENT stale-detection conditions:

```js
// spawnBodyguards (line 4499)
if (guard.enemyRef.currentSystem !== system || guard.enemyRef.destroyed || !guardStillInSystem)

// syncBodyguardStatus (line 4562)
if (!guard.enemyRef.destroyed && inCurrentSystem && !stillTrackedBySystem)
```

**Scenario Where This Matters**:
- Guard is in a DIFFERENT system and DESTROYED
- spawnBodyguards: Would clear the ref immediately ✅
- syncBodyguardStatus: Would NOT clear ref immediately (would fall through to next check)
- Later in syncBodyguardStatus (line 4573), it checks `if (guard.enemyRef.destroyed)` and marks guard.destroyed

**Result**: The cleared ref is handled but via a different code path. This works but is inconsistent.

---

### Assumption 6: Save/Load Correctly Rebuilds Enemy References
**Hypothesis**: On load, enemyRef is always set to null and rebuilt at runtime.

**Test Coverage**: ❌ NOT TESTED IN BODYGUARD TESTS
- This is tested elsewhere in serialization tests
- But no integration test validates full save/load/respawn cycle

**Implementation Check**: ✅ CONSISTENT
- Line 2905: `enemyRef: null` is always set
- Line 2451 (sketch.js): spawnBodyguards called after load

---

## Test Stability Assessment

### Current Test Quality: ⚠️ LIMITED COVERAGE
- ✅ **Strength**: Validates core stale-ref detection and respawn
- ❌ **Weakness**: Only one scenario (same-system stale ref)
- ❌ **Gap**: No cross-system testing
- ❌ **Gap**: No syncBodyguardStatus testing
- ❌ **Gap**: No destroyed flag combinations
- ❌ **Gap**: No multiple guard interaction

### Risk Assessment
| Scenario | Coverage | Risk |
|----------|----------|------|
| Same-system stale ref | ✅ TESTED | LOW |
| Cross-system transition | ❌ UNTESTED | **MEDIUM** |
| syncBodyguardStatus stale detect | ❌ UNTESTED | **MEDIUM** |
| Destroyed flag + distance cull | ❌ UNTESTED | **MEDIUM** |
| Save/load/respawn cycle | ⚠️ PARTIAL | LOW |

---

## Recommended Test Additions

### 1. Cross-System Respawn Test
```js
test('marks old enemyRef as destroyed when spawning in different system', () => {
    // Setup guard in system A with valid enemyRef
    // Call spawnBodyguards(systemB)
    // Assert: oldRef.destroyed === true
    // Assert: guard.enemyRef is new enemy in systemB
});
```

### 2. syncBodyguardStatus Consistency Test
```js
test('syncBodyguardStatus clears stale refs consistently with spawnBodyguards', () => {
    // Setup stale ref (in currentSystem but not in enemies array)
    // Call syncBodyguardStatus()
    // Assert: guard.enemyRef === null
});
```

### 3. Destroyed Flag Edge Cases
```js
test('respawns guard when enemyRef.destroyed = true even if tracked', () => {
    // Setup: guard.enemyRef exists and is in system.enemies
    // But: guard.enemyRef.destroyed = true
    // Call spawnBodyguards(system)
    // Assert: new Enemy created and enemyRef updated
});
```

### 4. Multiple Guard Coordination
```js
test('handles multiple guards with mixed stale/fresh refs correctly', () => {
    // Setup: 3 guards, some stale, some fresh, some destroyed
    // Call spawnBodyguards()
    // Assert: Correct number of respawns
    // Assert: No double-spawning
});
```

### 5. Distance Despawn Protection
```js
test('respawns guards culled by distance despawn', () => {
    // Setup: guard spawned and tracked
    // Simulate distance despawn removing from enemies array
    // Call spawnBodyguards()
    // Assert: guard respawned
});
```

---

## Hardening Effectiveness Summary

### What's Well Hardened ✅
1. **Stale ref detection via array inclusion** - No false negatives
2. **Cross-system cleanup** - Old refs marked destroyed
3. **Hull persistence** - Damaged guards retain hull status
4. **Serialization** - enemyRef cleared on load

### What Needs Strengthening ⚠️
1. **Consistency between spawn and sync** - Different conditions
2. **Test coverage** - Only 1 meaningful test case
3. **Destroyed flag handling** - Multiple code paths
4. **StarSystem integration** - Unverified distance despawn behavior

### Assumptions That Are Reasonable ✅
1. Destroyed flag alone insufficient (✅ Verified by test)
2. Array inclusion required (✅ Verified by test)
3. Cross-system refs need cleanup (✅ Implemented, untested)
4. Save/load rebuilds refs (✅ Implemented, partially tested)

---

## Recommendations

### High Priority
1. **Add cross-system transition test** - Currently untested, medium risk
2. **Add syncBodyguardStatus tests** - Runs every frame, should be validated
3. **Align spawnBodyguards/syncBodyguardStatus conditions** - Remove inconsistency

### Medium Priority
4. **Add destroyed flag edge case tests** - Ensure all combinations work
5. **Verify StarSystem distance despawn** - Check isPlayerBodyguard is respected
6. **Add integration test** - Full save/load/respawn cycle

### Low Priority
7. **Add multiple guard stress tests** - Verify no race conditions
8. **Document assumptions** - Add JSDoc comments explaining why stale detection needed
