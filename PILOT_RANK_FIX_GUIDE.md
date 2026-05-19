# Pilot Rank System: Implementation Fix Guide

## Overview
This document provides precise code locations and recommended fixes for the 2 high-severity gaps and 3 medium-severity gaps identified in the critical review.

---

## SEVERITY 1: HIGH IMPACT

### GAP 1: Off-Screen Scan Cadence Ignores Rank

**Issue**: Elite pilots should scan 4x faster (scanInterval 0.4s), but all off-screen enemies are throttled to fixed 0.5s global cadence.

**Current Code Flow**:
1. [enemy.js:569-579](enemy.js#L569) — Fixed 0.5s hardcoded for all ranks
2. [enemyTargeting.js:88](enemyTargeting.js#L88) — Rank scanInterval applied AFTER throttle

**Impact**: Elite awareness advantage is ~20-30% smaller than designed.

**Fix Recommendation**:

**Option A (Preferred)**: Make global throttle rank-aware
```javascript
// In enemy.js constructor (~line 175):
const rankMods = (typeof getPilotRankModifiers === 'function') ? getPilotRankModifiers(this.pilotRank) : null;
const baseScanIntervalSeconds = rankMods?.scanInterval ?? 0.5;
this._baseScanIntervalSeconds = baseScanIntervalSeconds;

// In enemy.js update() method (~line 569):
const scanIntervalSeconds = this._baseScanIntervalSeconds; // Use rank-specific interval
if (this.scanTimer === undefined) this.scanTimer = Math.random() * scanIntervalSeconds;
```

**Option B (Simpler)**: Remove off-screen scan throttle for Elite pilots only
```javascript
// In enemyTargeting.js updateTargeting() (~line 88):
const scanIntervalSeconds = rankMods?.scanInterval ?? DEFAULT_SCAN_INTERVAL;
const isElite = rankMods?.detectionRangeMultiplier >= 1.5; // Heuristic for elite
const effectiveInterval = isElite ? scanIntervalSeconds : Math.max(scanIntervalSeconds, 0.5);
```

**Testing**: After fix, Elite scan interval should be 0.4s, not capped at 0.5s.

---

### GAP 2: reactionDelayBonus is SNIPING-Scoped Only

**Issue**: Name implies global "reaction time," but only affects SNIPING strafe timing. Not used in targeting, firing, weapon switching, or ability decisions.

**Current Code**:
- [enemyMovement.js:165](enemyMovement.js#L165) — ONLY location where reactionDelayBonus is used
- [test/pilotRankAI.test.js:269-283](test/pilotRankAI.test.js#L269) — Tests incorrectly assume global behavior

**Impact**: Misleading documentation/expectations; Green/Rookie don't actually react slowly in general combat.

**Fix Recommendation**:

**Option A (Clearer API)**: Rename modifier
```javascript
// In pilotRanks.js, rename all occurrences:
snipingStrafeReactionDelayBonus: 0.70,     // Green (was reactionDelayBonus)

// In enemyMovement.js line 165:
const baseReactionDelay = random(0.05, 0.25);
const rankBonus = rankMods?.snipingStrafeReactionDelayBonus || 0;  // Was reactionDelayBonus
```

**Option B (Add True Global Reaction Latency)**: If general "slow reactions" is design intent
```javascript
// In pilotRanks.js, ADD new modifier:
globalReactionLatencyMs: 150,  // Green: +150ms, Veteran: 0ms, Elite: -50ms

// In enemyTargeting.js updateTargeting(), add:
const reactionLatency = rankMods?.globalReactionLatencyMs ?? 0;
if (reactionLatency > 0 && !this._reactionLatencyTimer) {
    this._reactionLatencyTimer = reactionLatency;
}
if (this._reactionLatencyTimer > 0) {
    this._reactionLatencyTimer -= deltaTime;
    return false; // Skip targeting this frame
}
```

**Recommendation**: Do Option A (rename) + add comment: "Only affects SNIPING state strafe reaction timing, not general combat reactions."

**Testing**: After fix, test comments should clarify "SNIPING Strafe Timing" (already done in updated tests ✅).

---

## SEVERITY 2: MEDIUM IMPACT

### GAP 3: canStrafe Scope Not Documented

**Issue**: Modifier name suggests global strafing ability, but only gates lateral movement in SNIPING state. Other combat states unaffected.

**Current Code**:
- [enemyMovement.js:111](enemyMovement.js#L111) — Only location where canStrafe is checked
- Feature gate returns early; other states skip this block entirely

**Fix Recommendation**: Add documentation comment
```javascript
// In enemyMovement.js, line 108:
/**
 * SNIPING strafe logic (only applies in SNIPING state)
 * NOTE: canStrafe modifier ONLY affects SNIPING dynamic positioning.
 * Green/Rookie can still maneuver in APPROACHING, ATTACK_PASS, FLEEING, REPOSITIONING.
 * Green/Rookie are ONLY limited to static sniping when in SNIPING state.
 */
if (this.currentState === AI_STATE.SNIPING) {
    // RANK CHECK: Rookies don't use side thrusters (no kiting)
    const rankMods = this._getRankModifiers();
    const canStrafe = rankMods?.canStrafe ?? true;
    ...
}
```

**Testing**: Tests already correctly document this as "SNIPING-Scoped" ✅

---

### GAP 4: decisionIntervalMultiplier Scope Not Documented

**Issue**: Implies global "tactical decision speed," but only affects SNIPING state timer resets.

**Current Code**:
- [enemyStateMachine.js:231](enemyStateMachine.js#L231) — SNIPING decision timer
- [enemyStateMachine.js:776](enemyStateMachine.js#L776) — SNIPING entry timer setup
- No usage in ATTACK_PASS, APPROACHING, or ability decisions

**Fix Recommendation**: Rename modifier (if intended globally) or add scope comment

**Option A (Rename)**:
```javascript
// In pilotRanks.js:
snipingDecisionIntervalMultiplier: 0.75,  // Elite reassess faster
```

**Option B (Keep + Document)**:
```javascript
// In enemyStateMachine.js, line 231:
const decisionIntervalMult = rankMods?.decisionIntervalMultiplier ?? 1.0; // SNIPING-scoped
const adjustedTimerMin = Math.max(0.2, baseTimerMin * decisionIntervalMult);
```

**Recommendation**: Option A (rename) for clarity.

**Testing**: Tests already document scope correctly ✅

---

### GAP 5: Grudge × Rank Interaction Undocumented

**Issue**: In attack pass duration, grudge multiplier is applied AFTER rank multiplier. High-grudge pilots override rank intent (e.g., Elite 0.9x intent can become 1.5x+ with grudge).

**Current Code**:
- [enemyStateMachine.js:751-752](enemyStateMachine.js#L751)
```javascript
const passDurationMult = rankMods?.attackPassDurationMultiplier ?? 1.0;
const basePassDuration = this.passDuration * passDurationMult;
this.passTimer = basePassDuration * random(0.85, 1.25) * grudgeMultiplier;
```

**Impact**: Subtle; rank intent can be overridden by high grudge (grudge 5 = ~1.5x multiplier).

**Fix Recommendation**: Document interaction or swap priority
```javascript
// OPTION A: Document (preferred)
// Grudge × Rank are multiplicative: (rank modifier) × (grudge multiplier)
// High-grudge pilots may override rank intent (e.g., Elite's tactical 0.9x × Grudge 5's 1.5x = 1.35x longer)

// OPTION B: Swap Priority (if rank intent should override grudge)
// Make rank apply AFTER grudge (less common in game design):
this.passTimer = basePassDuration * grudgeMultiplier * random(0.85, 1.25);
const adjustedPassDuration = this.passTimer * rankMods?.attackPassDurationMultiplier ?? 1.0;
```

**Recommendation**: Option A — Add comment explaining multiplicative interaction.

**Testing**: Consider adding test case documenting this interaction.

---

## VERIFICATION CHECKLIST

After implementing fixes:

- [ ] Green pilots scan at 1.0s, Rookie at 2.0s, Veteran at 1.0s, Elite at 0.4s (off-screen)
- [ ] reactionDelayBonus renamed or scope is clearly documented in code AND tests
- [ ] canStrafe, decisionIntervalMultiplier scope documented in code
- [ ] Grudge × Rank interaction documented (with example)
- [ ] All 89 tests still pass
- [ ] No performance regressions (off-screen CPU should not increase)
- [ ] Player-facing behavior unchanged (Green/Rookie still "feel" less skilled)

---

## Quick Reference: Code Locations

| Gap | Severity | File | Lines | Issue |
|-----|----------|------|-------|-------|
| scanInterval | HIGH | enemy.js, enemyTargeting.js | 569-579, 88 | Capped by fixed throttle |
| reactionDelayBonus | HIGH | enemyMovement.js, test | 165, 269-283 | Scoped to SNIPING only |
| canStrafe | MED | enemyMovement.js | 111 | Scope not documented |
| decisionIntervalMultiplier | MED | enemyStateMachine.js | 231, 776 | Scope not documented |
| Grudge × Rank | MED | enemyStateMachine.js | 751-752 | Interaction undocumented |

---

## Expected Outcome

✅ Elite pilots will have ~30% faster off-screen awareness  
✅ Terminology will be clearer (reactionDelayBonus → snipingStrafeReactionDelayBonus)  
✅ Code comments will prevent future confusion  
✅ All 89 tests continue to pass  
✅ No breaking changes to gameplay  

