# Enemy Save/Load Investigation - Walkthrough

## Summary

Investigated the enemy save/load system to understand why enemies might not be properly restored after a player dies and loaded from a previous save point, specifically focusing on "missing Alien ships".

## Investigation Findings

### Enemy Save/Load Flow

1. **Saving enemies** (`StarSystem.toJSON()`):
   - Enemies are serialized via `_serializeEntityArray()` which calls `Enemy.toJSON()` for each
   - Player bodyguards are filtered out (saved with player data instead)
   
2. **Loading enemies** (`StarSystem.fromJSON()`):
   - Enemies are deserialized via `_deserializeEntityArray()` which calls `Enemy.fromJSON()` for each
   - Enemies are registered in the `enemiesById` Map for O(1) lookups

3. **System entry** (`enterSystem()`):
   - **CRITICAL**: This method clears all enemies with `this.enemies = []`
   - Only called when starting a NEW game or jumping to a NEW system
   - **NOT called when loading a saved game** - so loaded enemies are preserved

### Issues Found and Fixed

#### Issue 1: Destroyed Enemies Were Being Saved

**Problem**: The enemy filter in serialization only excluded `isPlayerBodyguard`:
```javascript
this.enemies.filter(e => !e?.isPlayerBodyguard)
```

**Fix**: Added checks for `destroyed` flag and hull:
```javascript
this.enemies.filter(e => e && !e.isPlayerBodyguard && !e.destroyed && e.hull > 0)
```

**File**: [starSystem.js](file:///Users/softhook/Documents/GitHub/elite/starSystem.js#L5652)

#### Issue 2: No Validation for Invalid Hull on Load

**Problem**: `Enemy.fromJSON()` didn't check if the loaded hull value was valid.

**Fix**: Added safety check to skip enemies with invalid hull.
[enemy.js](file:///Users/softhook/Documents/GitHub/elite/enemy.js#L819-L823)

#### Issue 3: Procedural Generation Seed Mismatch (Consistency Fix)

**Problem**: `globalSessionSeed` was not restored on load.
**Clarification**: While rigorous analysis showed `initStaticElements` is often skipped on load (mitigating this issue for existing saves), restoring the seed ensures that if regeneration *does* occur (e.g., due to missing planet data), it happens deterministically.
**Fix**: Persisted and restored `globalSessionSeed`.

#### Issue 4: Mission Flags Missing in Serialization (The "Missing Aliens" Fix)

**Problem**: Distant enemies (like Alien Mission Targets) rely on flags such as `isMissionSpecific` to avoid being despawned by distance checks.
- `Enemy.toJSON` was **dropping** these flags (`isMissionSpecific`, `isAssassinationTarget`, `isAssassinationGuard`).
- Upon loading, these flags were lost (`undefined`).
- The game's `shouldDespawnEntity` check then treated these critical targets as generic random spawns.
- Only nearby aliens persisted; distant ones were culled immediately.

**Fix**: Updated `Enemy.toJSON` and `Enemy.fromJSON` to explicitly persist these flags.

**File**: [enemy.js](file:///Users/softhook/Documents/GitHub/elite/enemy.js)

#### Issue 5: Event Spawns Unprotected & Despawn Radius Shrinkage

**Problem**: 
1. **Unprotected Event Spawns**: Enemies from events (e.g., Alien Raids, Pirate Swarms) were treated as generic entities. They lacked any persistence flags, so if distant from the player on load, they were culled.
2. **Despawn Radius Bug**: In a New Game, the despawn radius is set to `10000`. On Load Game, initialization is skipped, defaulting the radius to `3500`. This created a massive "dead zone" where valid distant entities were immediately wiped out.
3. **Bounty Hunters Amnesia**: Bounty hunters lost their `bountyTarget` reference on load.

**Fix**: 
- **Protected Event Entities**: Added `isEventEntity` flag to spawns and persisted it in `Enemy.js`. Updated `shouldDespawnEntity` to respect this flag.
- **Restored Radius**: Updated `StarSystem.fromJSON` to explicitly restore `despawnRadius = 10000`.
- **Persisted Targets**: Persisted `bountyTargetId` and added logic to relink it on load.

**File**: [starSystem.js](file:///Users/softhook/Documents/GitHub/elite/starSystem.js), [enemy.js](file:///Users/softhook/Documents/GitHub/elite/enemy.js), [eventManager.js](file:///Users/softhook/Documents/GitHub/elite/eventManager.js)

## Changes Made

| File | Change |
|------|--------|
| [starSystem.js](file:///Users/softhook/Documents/GitHub/elite/starSystem.js) | Filter out destroyed enemies; Restore despawn radius; Protect event entities |
| [enemy.js](file:///Users/softhook/Documents/GitHub/elite/enemy.js) | Fix Mission/Event Flag Serialization; Persist Bounty Targets |
| [eventManager.js](file:///Users/softhook/Documents/GitHub/elite/eventManager.js) | Flag spawned enemies as `isEventEntity` |
| [sketch.js](file:///Users/softhook/Documents/GitHub/elite/sketch.js) | Save and restore `globalSessionSeed` |
| [galaxy.js](file:///Users/softhook/Documents/GitHub/elite/galaxy.js) | Use restored seed for static element generation |

## Verification

The changes ensure:
- **Mission Critical Entities Persist**: Aliens and assassination targets will now correctly survive save/load cycles even if they are far from the player.
- **Event Persistence**: Raids and Swarms will no longer vanish on load.
- **Data Integrity**: Destroyed enemies are not saved, preventing zombie states.
- **Consistent World**: Despawn radius is consistent between New Game and Load Game.
