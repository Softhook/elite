# Cargo Simulation Timing Fix

## Problem
Pilots were completing invisible trade cycles before being visualized (spawned as visible ships), causing cargo to change between undocking and spawning.

## Example Issue
```
1. Pilot buys 184 cargo units and undocks
2. Background simulation continues (pilot hasn't spawned yet)
3. Pilot "arrives" at destination (5-9 seconds travel time)
4. Pilot sells cargo, buys 186 new units, undocks again
5. Repeat multiple times before spawn timer (8 seconds) triggers
6. Finally spawns with 188 cargo (not the original 184)
```

## Solution
Added guard in `_updateTravelingPilot` to prevent arrival/docking until `hasBeenVisualized = true`:

```javascript
// Prevent arrival/docking until pilot has been visualized at least once
// This prevents pilots from completing invisible trade cycles before spawning
if (!pilot.hasBeenVisualized && now >= pilot.travelArrivalMs) {
    // Keep extending arrival time until pilot is visualized
    pilot.travelArrivalMs = now + 1000;
    return;
}
```

## Expected Behavior After Fix
1. Pilot buys 184 cargo units and undocks
2. Pilot enters traveling state with `hasBeenVisualized = false`
3. When arrival time reached, arrival is delayed (extended by 1s repeatedly)
4. Spawn system picks up pilot, creates visible ship, sets `hasBeenVisualized = true`
5. Pilot spawns with original 184 cargo units
6. Now pilot can complete travel and trade normally

## Testing
To verify the fix works:
1. Watch a trader pilot in a system (e.g., Taylor Zhou in Acheus)
2. Check console logs for PURCHASE → UNDOCKING → Spawn sequence
3. Verify cargo quantity in "Spawn" log matches cargo at UNDOCKING
4. No "arrived and docked" messages should appear between UNDOCKING and Spawn
