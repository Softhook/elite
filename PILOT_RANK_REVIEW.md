# Critical Review: Pilot Rank Modifier Implementation vs. Assumptions

## Executive Summary
The pilot rank system has **directionally correct** modifiers but significant **scope gaps** between design intent and actual implementation. Most modifiers work as intended, but 2 major and 3 medium-severity gaps exist.

---

## Severity 1: High Impact Gaps

### 1. **scanInterval Partially Ineffective (Off-Screen Bottleneck)**
**Issue**: Elite pilots should scan 4x faster (0.4s vs Veteran 1.0s), but are capped by global off-screen throttle.

**Code Evidence**:
- [enemy.js:569-579](enemy.js#L569) enforces hard 0.5s cadence for ALL off-screen scans
- [enemyTargeting.js:88](enemyTargeting.js#L88) applies rank scanInterval **after** global throttle
- Elite's 0.4s cannot be honored; worst case they scan at 0.5s (faster only marginally when on-screen)

**Impact**: ⭐⭐⭐⭐⭐ Elite awareness advantage is ~20-30% smaller than intended when off-screen.

**Fix Needed**: Make global off-screen cadence rank-aware:
```javascript
// Instead of fixed 0.5s:
const scanIntervalSeconds = rankMods?.scanInterval ?? 0.5; // Use rank directly
```

---

### 2. **reactionDelayBonus is Narrowly Scoped (SNIPING Only)**
**Issue**: Name and test implications suggest general "reaction time," but only affects SNIPING strafe reaction delays.

**Code Evidence**:
- [enemyMovement.js:165](enemyMovement.js#L165) — ONLY place reactionDelayBonus appears in actual logic
- Used to calculate hesitation before committing to strafe direction in SNIPING state
- **NOT used in**: targeting updates, firing commits, state transitions, weapon switching

**Impact**: ⭐⭐⭐⭐ Green/Rookie get no reaction penalty in combat, aim, or ability decisions (only in sniping strafe timing, which is minor).

**Assumption Drift**: Tests describe "slower/faster reactions" globally, but it's tactical sniping movement only.

**Fix Needed**: 
- Rename to `snipingStrafeReactionDelayBonus` (accurate)
- Introduce new true reaction latency if general reaction penalty intended
- OR update test/documentation to clarify SNIPING-scoped behavior

---

## Severity 2: Medium Impact Gaps

### 3. **canStrafe Blocks All Lateral Movement (SNIPING-Specific)**
**Issue**: Rank modifier gates strafe entirely for Green/Rookie in SNIPING, but:
- Does **NOT** apply to ATTACK_PASS, APPROACHING, REPOSITIONING, or FLEEING
- Green/Rookie can still maneuver in other states
- Only consequence: stationary sniping position is less dynamic

**Code Evidence**:
- [enemyMovement.js:111](enemyMovement.js#L111) gates entire strafe block in SNIPING
- Other states ignore canStrafe completely

**Impact**: ⭐⭐⭐ Mild. Sniping is relatively rare; combat mostly happens in other states.

**Fix**: Document that `canStrafe` only affects SNIPING state positioning, not general agility.

---

### 4. **decisionIntervalMultiplier is Sniping-Specific (Not Global)**
**Issue**: Implies faster/slower "tactical updates," but only affects SNIPING decision timer.

**Code Evidence**:
- [enemyStateMachine.js:231](enemyStateMachine.js#L231) — SNIPING decision timer
- [enemyStateMachine.js:776](enemyStateMachine.js#L776) — SNIPING entry timer setup
- **NOT applied to**: ATTACK_PASS, REPOSITIONING, or ability decision cadence

**Impact**: ⭐⭐⭐ Mild. Sniping is tactical pause-and-reassess; other states have fixed/grudge-based cadence.

**Fix**: Rename to `snipingDecisionIntervalMultiplier` or clarify scope.

---

### 5. **attackPassDurationMultiplier is Applied, But Grudge Overrides It**
**Issue**: Rank modifier reduces pass duration (Elite 0.9x = shorter, more aggressive passes), but:
- Grudge multiplier is applied AFTER rank multiplier [enemyStateMachine.js:751](enemyStateMachine.js#L751)
- High-grudge pilots override the rank intent (can make low-rank pilots commit longer than intended)

**Impact**: ⭐⭐ Minor. Grudge is rarely high; effect is subtle interaction.

**Fix**: Document that grudge + rank interact multiplicatively; rank intent may be partially overridden.

---

## Severity 3: Implementation Correctly Aligned

### ✅ **aimToleranceMultiplier** — Works as intended
- Higher multiplier = wider firing cone = worse accuracy [enemyCombat.js:392](enemyCombat.js#L392)
- Applied consistently in canFireAtTarget logic
- Direction: Green 2.3x wider than baseline, Elite 0.7x tighter ✓

### ✅ **fleeHullThreshold** — Works as intended
- Higher threshold = flee earlier (smarter survival) [enemyStateMachine.js:217](enemyStateMachine.js#L217)
- Direction: Green 0.08 (very late), Veteran 0.30, Elite 0.50 (early) ✓

### ✅ **pursuitAbandonMultiplier** — Works as intended
- Higher multiplier = tolerate more damage before disengaging [enemyStateMachine.js:285](enemyStateMachine.js#L285)
- Direction: Green 2.7x (suicidal), Elite 0.6x (tactical) ✓

### ✅ **engageDistanceMultiplier** — Works as intended
- Applied directly to effectiveEngageDistance [enemyStateMachine.js:306](enemyStateMachine.js#L306)
- Direction: Green 0.55x (recklessly close), Elite 1.3x (controlled range) ✓

### ✅ **predictionMultiplier** — Works as intended
- Multiplied into prediction frames [enemyUtils.js:96](enemyUtils.js#L96)
- Direction: Green 0.0 (no lead), Elite 1.3x (excellent prediction) ✓

### ✅ **moveSpeedMultiplier** — Works as intended (Global)
- Applied in constructor to maxSpeed and thrustForce [enemy.js:396-397](enemy.js#L396)
- Direction: Green 0.92x slower, Elite 1.08x faster ✓

### ✅ **turnSpeedMultiplier** — Works as intended (Global)
- Applied in constructor and recalculated in calculateRadianProperties [enemy.js:398, 415](enemy.js#L398)
- Direction: Green 0.90x slower, Elite 1.10x faster ✓

### ✅ **retaliationAggressionMultiplier** — Works as intended
- Multiplied into retaliation bonus [enemyTargeting.js:839](enemyTargeting.js#L839)
- Direction: Green 0.75x less aggressive, Elite 1.2x more aggressive ✓

### ✅ **targetSwitchCooldownMultiplier & targetSwitchScoreMultiplier** — Work as intended
- Cooldown and threshold applied [enemyTargeting.js:435-436](enemyTargeting.js#L435)
- Direction: Green takes longer to retarget, Elite switches faster ✓

### ✅ **fireDisciplineChance** — Works as intended
- Probability check before firing even with valid solution [enemyCombat.js:574](enemyCombat.js#L574)
- Direction: Green hesitates 28%, Elite commits 100% ✓

### ✅ **abilityDecisionIntervalMultiplier & abilityTriggerChanceMultiplier** — Work as intended
- Intervals and trigger chances scaled [enemyAbilities.js:12, 288](enemyAbilities.js#L12)
- Direction: Green slower/less confident, Elite faster/more aggressive ✓

### ✅ **obstacleAvoidanceStrength** — Works as intended
- Scales avoidance radius and steering [enemyAIBehaviors.js:2665, 2795](enemyAIBehaviors.js#L2665)
- Direction: Green ignores obstacles, Elite anticipates better ✓

---

## Test Suite Issues

### Missing Coverage:
1. **Green rank is entirely absent** — only tests ROOKIE/VETERAN/ELITE (3 of 4 ranks)
2. **reactionDelayBonus tested as global** when it's SNIPING-scoped — misleading
3. **No tests for moveSpeed/turnSpeed** which are correctly wired globally
4. **No tests for ability/retaliatory behavior** which work correctly
5. **Outdated rank constants** — ROOKIE=1 assumed, should be GREEN=1

---

## Recommendations

### Priority 1 (Critical):
- [ ] Fix off-screen scan cadence to be rank-aware (elite gets true 0.4s)
- [ ] Clarify/rename reactionDelayBonus to snipingStrafeReactionDelayBonus
- [ ] Update test suite to include all 4 ranks (GREEN, ROOKIE, VETERAN, ELITE)

### Priority 2 (Important):
- [ ] Document that canStrafe, decisionIntervalMultiplier only affect SNIPING
- [ ] Clarify grudge × rank interaction in attack pass duration
- [ ] Add tests for moveSpeed, turnSpeed, retaliatory aggression

### Priority 3 (Nice-to-Have):
- [ ] Consider making ability decision cadence global (not just ability-specific) for consistency
- [ ] Consider global reaction latency mechanic if "slow reactions" is design intent

---

## Summary Table

| Modifier | Status | Scope | Direction Correct | Test Updated |
|----------|--------|-------|-------------------|---------------|
| canStrafe | ✓ | SNIPING | ✓ | ❌ (scope not documented) |
| reactionDelayBonus | ⚠️ | SNIPING strafe | ✓ | ❌ (tested as global) |
| aimToleranceMultiplier | ✓ | Global | ✓ | ✓ |
| fleeHullThreshold | ✓ | Global | ✓ | ✓ |
| tacticChangeMultiplier | ✓ | Global | ✓ | ✓ |
| predictionMultiplier | ✓ | Global | ✓ | ✓ |
| pursuitAbandonMultiplier | ✓ | Global | ✓ | ✓ |
| engageDistanceMultiplier | ✓ | Global | ✓ | ✓ |
| detectionRangeMultiplier | ✓ | Global | ✓ | ❌ (no test) |
| scanInterval | ⚠️ | Off-screen | ⚠️ | ❌ (capped by throttle) |
| decisionIntervalMultiplier | ✓ | SNIPING | ✓ | ❌ (scope not documented) |
| snipingChanceMultiplier | ✓ | Global (APPROACHING) | ✓ | ❌ (no test) |
| attackPassDurationMultiplier | ✓ | Global | ✓ | ❌ (no test) |
| targetSwitchCooldownMultiplier | ✓ | Global | ✓ | ✓ |
| targetSwitchScoreMultiplier | ✓ | Global | ✓ | ✓ |
| weaponSwitchMinInterval | ✓ | Global | ✓ | ❌ (no test) |
| fireDisciplineChance | ✓ | Global | ✓ | ✓ |
| abilityDecisionIntervalMultiplier | ✓ | Ability decisions | ✓ | ❌ (no test) |
| abilityTriggerChanceMultiplier | ✓ | Ability triggers | ✓ | ❌ (no test) |
| retaliationAggressionMultiplier | ✓ | Global | ✓ | ✓ |
| moveSpeedMultiplier | ✓ | Global | ✓ | ❌ (no test) |
| turnSpeedMultiplier | ✓ | Global | ✓ | ❌ (no test) |
| obstacleAvoidanceStrength | ✓ | Global | ✓ | ❌ (no test) |
| useCover | ✓ | Global gate | ✓ | ❌ (no test) |

