# Combat AI Role Refactoring Analysis

## Current State

The `AI_ROLE.COMBAT` role is used for Military, Imperial, and Separatist combat ships. These ships:
- Patrol and engage hostile targets (pirates, aliens)
- Have faction-specific targeting (Military vs Aliens, Imperial vs Separatist)
- Apply faction bonuses during combat

## The Problem

`AI_ROLE.COMBAT` is a catch-all that requires looking up the ship definition to determine the actual faction. This creates:
1. Complex faction detection logic scattered across files
2. Unclear role naming ("Combat" doesn't tell you which faction)
3. Redundant lookups of ship definitions for faction info

## Key Insight: Role vs Faction Separation

The current system has an important distinction:
- **Role** = What behavior the AI uses (combat, hauler, transport, police)
- **Faction** = Who the ship belongs to (Imperial, Separatist, Military)

This separation exists because some faction ships are NOT combat ships:

| Ship | aiRoles | Purpose |
|------|---------|---------|
| ImperialCourier | ["IMPERIAL"] | Light courier (non-combat) |
| ImperialClipper | ["IMPERIAL"] | Multi-role trader |
| SeparatistSupplyRunner | ["HAULER"] | Armored transport |
| ImperialCharger | ["COMBAT", "IMPERIAL"] | Combat fighter |

---

## Option A: Three Faction Roles

Replace `AI_ROLE.COMBAT` with three explicit roles:
- `AI_ROLE.MILITARY`
- `AI_ROLE.IMPERIAL`  
- `AI_ROLE.SEPARATIST`

### Implementation

```javascript
// enemyConstants.js
const AI_ROLE = {
    PIRATE: 'Pirate',
    POLICE: 'Police',
    HAULER: 'Hauler',
    // ...
    MILITARY: 'Military',      // NEW
    IMPERIAL: 'Imperial',      // NEW
    SEPARATIST: 'Separatist',  // NEW
    // COMBAT: 'Combat',       // REMOVED
};

// enemy.js update() - all three use same behavior
case AI_ROLE.MILITARY:
case AI_ROLE.IMPERIAL:
case AI_ROLE.SEPARATIST:
    this.updateCombatRoleAI(system);
    break;
```

### Pros
- Role name clearly indicates faction
- No need to look up ship definition for faction
- Spawning logic becomes explicit: `{ role: AI_ROLE.IMPERIAL, ship: ... }`

### Cons
- Doesn't solve non-combat faction ships (ImperialClipper as trader)
- 15+ files need updates for all three new roles
- Save game migration needed (existing `role: "Combat"` saves)
- Need helper function to avoid repeating 3-role checks everywhere

### Files Affected
- enemyConstants.js
- enemy.js (constructor, update)
- enemyAIBehaviors.js
- enemyTargeting.js (2 places)
- enemyDamageSystem.js
- communicationSystem.js (4 places)
- starSystem.js (6 spawning methods)
- eventManager.js
- uiStationMenus.js
- All test files

---

## Option B: Keep COMBAT, Simplify Faction Lookup

The `faction` property already exists on every Enemy (set in constructor). Instead of removing COMBAT, simplify the existing code to use `this.faction` directly.

### Current (Complex)
```javascript
// enemyAIBehaviors.js - updateCombatRoleAI
const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
let faction = 'MILITARY';
if (shipDef && shipDef.aiRoles) {
    if (shipDef.aiRoles.includes('IMPERIAL')) faction = 'IMPERIAL';
    else if (shipDef.aiRoles.includes('SEPARATIST')) faction = 'SEPARATIST';
}
```

### Proposed (Simple)
```javascript
// enemyAIBehaviors.js - updateCombatRoleAI
const faction = this.faction;  // Already set in constructor!
```

### Pros
- Minimal code changes (just use existing property)
- No save game migration needed
- Non-combat faction ships (traders) continue working
- Lower risk of breaking existing behavior

### Cons
- Role name still doesn't indicate faction
- COMBAT role remains as a catch-all

### Files Affected
- enemyAIBehaviors.js (remove redundant lookup)
- enemyTargeting.js (use this.faction instead of lookup)

---

## Comparison

| Aspect | Option A (3 Roles) | Option B (Keep COMBAT) |
|--------|-------------------|------------------------|
| Code clarity | Role = Faction | Role + Faction separate |
| Files changed | 15+ | 2-3 |
| Risk level | Medium | Low |
| Save compatibility | Migration needed | No migration |
| Non-combat faction ships | Unclear handling | Already works |
| Effort | 4-6 hours | 1-2 hours |

---

## Recommendation

**Start with Option B** to simplify the existing code, then evaluate if Option A is still desired.

Option B removes the complexity without the risk. The `faction` property is already correctly set in the Enemy constructor based on ship definition, so we're just removing redundant lookups.

If after Option B the role naming still feels unclear, Option A can be implemented as a follow-up with proper planning for save migration and non-combat faction ships.

---

## Status: Implemented (Option B)

**Changes made (2025-12-27):**

1. `enemyAIBehaviors.js` - `updateCombatRoleAI()`:
   - Replaced 13-line ship definition lookup with `const faction = this.faction || 'MILITARY'`
   - Simplified target faction lookup to use `target.faction` directly

2. `enemyTargeting.js` - `evaluateTargetScore()`:
   - Replaced `_getShipFaction()` calls with direct `enemy.faction` and `target.faction` access

**Result:** Faction detection now uses the `faction` property that's already set in the Enemy constructor, eliminating redundant ship definition lookups every frame.
