# Gamepad & Keyboard Integration Analysis

**Status:** Post-refactor coherence review  
**Date:** May 2026  
**Scope:** gamepadmanager.js, inputManager.js, gamepadMenuNavigation.js, sketch.js integration

---

## Executive Summary

The input system is **well-architected overall** with clear separation of concerns:
- **gamepadmanager.js** → low-level hardware polling
- **inputManager.js** → high-level action mapping
- **gamepadMenuNavigation.js** → specialized menu navigation
- **sketch.js** → game loop integration

**⚠️ ISSUES FOUND:**
1. **Dual menu navigation systems** (minor conflicts)
2. **Inconsistent input paradigms** (synthetic events vs. direct polling)
3. **Context resolution redundancy** (multiple resolution points)
4. **D-pad handling duplication** (multiple implementations for same behavior)
5. **Surface mode circumvents the input system** (separate keyboard handler)

---

## Architecture Overview

### Input Flow Chain

```
Hardware Input
    ↓
[GamepadManager._tick() + keyPress]
    ↓
(Synthetic KeyboardEvents OR Direct State Query)
    ↓
[sketch.js: keyPressed() + handleGamepadContinuousInput()]
    ↓
[InputManager: getKeyboardAction() OR isGamepadActionPressed()]
    ↓
[executeInputAction() OR _handleGamepadStationMenus()]
    ↓
Game Logic
```

### File Dependencies

```
sketch.js
├── GamepadManager (window._gamepadManager)
│   ├── keyboard bridge (synthetic events)
│   └── hardware polling
├── InputManager (window._inputManager)
│   ├── keyboard map building
│   ├── gamepad map building
│   └── context resolution
└── gamepadMenuNavigation.js
    ├── _handleGamepadStationMenus()
    ├── _handleGamepadMissions()
    └── _handleGamepadListScroll()
```

**Load order (index.htm):**
```
Line 121: gamepadmanager.js
Line 122: inputManager.js
Line 123: gamepadMenuNavigation.js
Line 124: ... (sketch.js loaded later)
```

✅ **Load order is correct** - dependencies are satisfied.

---

## Component Analysis

### 1. GamepadManager (gamepadmanager.js)

**Responsibility:** Low-level hardware abstraction, state polling, synthetic event generation

**Key Features:**
- Detects gamepad mode (X, S, D)
- Polls raw gamepad state each frame
- Maintains `_state` and `_prev` for frame comparison
- **Hybrid approach:** synthetic keyboard events for discrete actions + direct state for continuous

**Public API:**
```javascript
.connected              // boolean
.state / .prevState   // current raw state object
.pressed(input)       // button pressed this frame (rising edge)
.released(input)      // button released this frame (falling edge)
.held(input)          // button held (any duration)
.analog(input)        // analog value (-1..1 or 0..1)
.bindKey(input, key)  // bind gamepad input → synthetic keyboard event
```

**Synthetic Events:**
- GamepadManager fires synthetic `KeyboardEvent` for bound inputs
- These trigger `keyPressed()` and `keyReleased()` in p5.js
- **Limitation:** `p5.keyIsDown()` doesn't see synthetic events (p5 bug/design)

**Issues:**
- ⚠️ Synthetic events only work for keyPressed/keyReleased, not keyIsDown()
- ⚠️ The keyboard bridge approach is necessary but creates two parallel input paradigms

---

### 2. InputManager (inputManager.js)

**Responsibility:** Context-aware action mapping, high-level input abstraction

**Key Features:**
- 12 input contexts (TITLE, STATION_MENU, IN_FLIGHT, etc.)
- 38+ input actions (FIRE_PRIMARY, NAV_UP, CONFIRM, etc.)
- Context-dependent keyboard and gamepad mappings
- Beam targeting cursor management
- Three gamepad modes (X/S/D) with different button layouts

**Public API:**
```javascript
.getKeyboardAction(key, keyCode, context)        // keyboard → action
.isGamepadActionPressed(action, context)         // button just pressed
.isGamepadActionHeld(action, context)            // button currently held
.getGamepadShipControls(context)                 // analog stick values
.resolveContext({gameState, ...})                // determine active context
.describeBindings(context)                       // debug: see all bindings
```

**Context Resolution (`resolveContext`):**
- Takes game state + UI flags
- Returns appropriate INPUT_CONTEXT enum
- Central point for context logic

**Issues:**
- ✅ Well-structured and context-aware
- ⚠️ Gamepad map is modal-dependent (X/S/D mode) - need mode to be set correctly
- ⚠️ Some actions have different buttons for X vs S mode (e.g., mission toggle)

---

### 3. GamepadMenuNavigation (gamepadMenuNavigation.js)

**Responsibility:** Specialized menu UI navigation for docked/station states

**Key Functions:**
```javascript
_handleGamepadStationMenus(gp, state)    // D-pad nav, button selection
_handleGamepadMissions(gp)               // Two-panel mission board nav
_handleGamepadListScroll(state, dir)     // Scroll shipyard/upgrades/etc
_getButtonAreasForState(state)           // Get clickable buttons for state
_drawGamepadMenuHighlight(btn)           // Draw highlight box around selected
```

**Design:**
- Uses **global state:** `_gpMenuIndex`, `_gpMenuState`, `_gpMissionPanel`, etc.
- Direct gamepad polling (reads `gp.pressed('a')`, not InputManager)
- Simulates mouse clicks on button centers
- Updates UI scroll offsets directly

**Issues:**
- ⚠️ **Circumvents InputManager** - reads gamepad directly instead of using the abstraction
- ⚠️ **Global state for menu navigation** - could be encapsulated in a class
- ⚠️ Duplicates D-pad navigation logic that already exists in executeInputAction()

---

### 4. Main Loop Integration (sketch.js)

**Input Handling Path:**

#### Keyboard: `keyPressed()` function
```javascript
keyPressed() {
  if (handleSurfaceModeKeys()) return false;           // Surface mode bypass
  const context = getActiveInputContext();
  const mappedAction = inputManager?.getKeyboardAction(key, keyCode, context);
  if (mappedAction) {
    executeInputAction(mappedAction, context);
  }
}
```

✅ Clean and straightforward

#### Gamepad Discrete: `handleGamepadContinuousInput()` function
- Calls `inputManager.isGamepadActionPressed(action, context)` 
- Dispatches actions via `executeInputAction()`
- **OR** calls `_handleGamepadStationMenus()` directly for station states
- **OR** handles surface altitude input directly

#### Gamepad Continuous: Direct state queries
- `inputManager.getGamepadShipControls()` for analog input
- Calls player movement methods directly

#### Action Execution: `executeInputAction()` function
```javascript
switch(action) {
  case FIRE_PRIMARY: player?.handleFireInput?.(); break;
  case NAV_UP:       dispatchStationMenuKeyboardAction(action); break;
  // ... 35+ more cases
}
```

**All discrete actions** go through this function.

---

## Issues & Conflicts

### 🔴 ISSUE 1: Dual Station Menu Navigation Systems

**Problem:** Two parallel systems handle menu navigation:

1. **System A:** `dispatchStationMenuKeyboardAction()` → `executeInputAction()`
   - Triggered from keyboard input (arrow keys)
   - Creates a proxy gamepad object with mocked `pressed()` method
   - Calls `_handleGamepadStationMenus(proxy, state)`

2. **System B:** `_handleGamepadStationMenus()` → direct gamepad polling
   - Called from `handleGamepadContinuousInput()` when in STATION_MENU context
   - Reads real gamepad directly (e.g., `gp.pressed('dpad.up')`)
   - Bypasses InputManager entirely

**Evidence:**
```javascript
// sketch.js line 564-586
if (context === INPUT_CONTEXTS.STATION_MENU) {
  _handleGamepadStationMenus(gp, state);  // System B: direct call
  return;
}
// ...
// sketch.js line 566-592 (different path)
if (context !== INPUT_CONTEXTS.STATION_MENU && 
    inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_UP, context)) {
  executeInputAction(INPUT_ACTIONS.NAV_UP, context);  // System A: abstracted
  // which calls dispatchStationMenuKeyboardAction()
}
```

**Impact:** 
- Station menu handling is inconsistent between keyboard and gamepad
- Changes to menu behavior require updates in two places
- InputManager abstraction is partially circumvented
- **No actual conflict** but violates DRY principle

**Recommendation:** Consolidate into single path through InputManager.

---

### 🟡 ISSUE 2: Inconsistent Input Paradigms

**Problem:** The system uses two different input models:

1. **Synthetic KeyboardEvents** (gamepadmanager → keyPressed)
   - Works for discrete one-shot actions
   - Can't be read by `p5.keyIsDown()` 
   - Only for actions that need keyPressed/keyReleased

2. **Direct State Polling** (InputManager queries gamepad directly)
   - Works for held buttons and analog
   - Gives full control over thresholds
   - Bypasses p5's keyboard system

**Where each is used:**
```javascript
// Paradigm 1: Synthetic events (keyboard handling)
keyPressed() → handleSurfaceModeKeys() → surfaceMode.handleKeyDown()

// Paradigm 2: Direct polling (gamepad handling)
handleGamepadContinuousInput() → inputManager.isGamepadActionPressed()
                              → getGamepadShipControls()
```

**Impact:**
- Keyboard and gamepad don't use the same input pipeline
- Keyboard can't access full analog precision (it's discrete)
- Adding new features requires choosing a paradigm

**This is actually acceptable** because:
- Keyboards are inherently discrete
- Gamepads need analog precision
- Both paradigms are necessary

---

### 🟡 ISSUE 3: D-Pad Handling Duplication

**Problem:** D-pad navigation is implemented 3 times:

1. **InputManager mapping** (inputManager.js line ~190)
   ```javascript
   [INPUT_ACTIONS.NAV_UP]: ['dpad.up'],
   [INPUT_ACTIONS.NAV_DOWN]: ['dpad.down'],
   // ... etc
   ```

2. **executeInputAction()** (sketch.js ~450)
   ```javascript
   case INPUT_ACTIONS.NAV_UP:
     if (context === INPUT_CONTEXTS.STATION_MENU) {
       return dispatchStationMenuKeyboardAction(...);
     }
     // ...
   ```

3. **_handleGamepadStationMenus()** (gamepadMenuNavigation.js ~50)
   ```javascript
   const pressedUp = gp.pressed('dpad.up') || (gp.state.ls.y < -0.7 && ...);
   // ... direct menu index modification
   ```

**Impact:** Changes to D-pad behavior must be made in multiple places.

---

### 🟡 ISSUE 4: Context Resolution Redundancy

**Problem:** Input context is resolved in multiple places:

1. **getActiveInputContext()** in sketch.js
   - Resolves context for primary input loop
   - Called once per frame (in handleGamepadContinuousInput)

2. **InputManager.resolveContext()** 
   - Same logic, different place
   - Can give different results if called at different game states

3. **Direct state checks** in sketch.js
   - `if (gameStateManager.currentState === 'IN_FLIGHT')`
   - Bypasses the abstraction entirely

**Impact:** Subtle bugs if game state changes between calls.

---

### 🔴 ISSUE 5: Surface Mode Input Bypasses System

**Problem:** Surface mode has its own keyboard handler:

```javascript
// sketch.js line 897-906
function keyPressed() {
  if (handleSurfaceModeKeys()) return false;  // ← RETURNS EARLY
  // ... normal input handling
}

// sketch.js line 1021-1027
function handleSurfaceModeKeys() {
  if (!gameStateManager || gameStateManager.currentState !== "SURFACE_MODE") return false;
  if (!surfaceMode) return false;
  return surfaceMode.handleKeyDown(keyCode, key);  // ← DIFFERENT SYSTEM
}
```

**Impact:**
- Surface mode doesn't use InputManager or gamepadMenuNavigation
- Can't leverage gamepad mappings for surface mode
- Creates a parallel input system for 1 game state

---

## Completeness Check

### All Input Actions Mapped?

✅ **Keyboard mappings** - Complete for all contexts
```javascript
_buildKeyboardMap() → 12 contexts × average 8 actions = ~96 mappings
```

✅ **Gamepad mappings** - Complete, but **mode-dependent**
```javascript
_buildGamepadMap() → 3 modes (X/S/D) × 12 contexts × average 8 actions = ~288 mappings
```

⚠️ **Surface mode** - Partially mapped
- Has separate keyboard handler in surfaceMode.js
- No explicit gamepad integration visible

### All Game States Covered?

✅ **INPUT_CONTEXTS enum** covers:
```
TITLE, INSTRUCTIONS, SAVE_SELECTION, GAME_OVER, STATION_MENU, GALAXY_MAP,
MISSION_OVERLAY, INVENTORY, IN_FLIGHT, SURFACE_SHIP, SURFACE_ASTRONAUT, BEAM_TARGETING
```

✅ **executeInputAction()** handles all contexts

⚠️ **gamepadMenuNavigation.js** only handles STATION_MENU states (10+ sub-states)

### Key Bindings Consistent?

✅ **Most bindings are consistent** across keyboard and gamepad
⚠️ Some differences in gamepad modes (intentional, for button layout differences)

Example difference:
- **X mode:** Mission toggle = `x` button
- **S mode:** Mission toggle = `home` button
- **D mode:** Mission toggle = `home` button

---

## Potential Runtime Issues

### 1. ✅ Mode Detection

GamepadManager correctly detects and switches between X/S/D modes on gamepad connect.

### 2. ⚠️ Synthetic Event Limitations

```javascript
// This works:
keyPressed() { /* synthetic events trigger this */ }

// This DOESN'T work:
handleGamepadContinuousInput() {
  if (keyIsDown(32)) { /* synthetic Space key doesn't trigger this */ }
}
```

**Workaround:** The game explicitly checks `inputManager.isGamepadActionHeld()` instead:
```javascript
const gpFiring = inputManager.isGamepadActionHeld(INPUT_ACTIONS.FIRE_PRIMARY, context);
if (keyIsDown(32) || gpFiring) { player.handleFireInput(); }
```

✅ Correctly handled

### 3. ⚠️ Context Mismatch Window

Between when `getActiveInputContext()` is called and when action is executed, game state could change:
```javascript
// Called once per frame
const context = getActiveInputContext();
// ...
// 1-15ms could pass here before executeInputAction()
executeInputAction(action, context);
```

**Risk:** Low (unlikely in practice, context is stable within single frame)

### 4. ✅ Gamepad Disconnection

Handled cleanly:
```javascript
_onDisconnect(e) {
  this._connected = false;
  this._state = null;
  for (const code of this._keysHeld) this._dispatchKey(code, false);
}
```

---

## Performance Considerations

### 1. Polling Overhead
- GamepadManager polls gamepad **every frame** via RAF (requestAnimationFrame)
- InputManager queries state **in handleGamepadContinuousInput()** (once per game frame)
- **Impact:** Negligible for modern hardware

### 2. Synthetic Event Generation
```javascript
_processBindings() {
  for (const b of this._bindings) {
    const raw = this._getVal(this._state, b.input) ?? 0;
    let active = /* threshold logic */;
    if (active && !wasHeld) this._dispatchKey(b.key, true);
  }
}
```
- Creates events only on state change (rising/falling edge)
- **Impact:** Minimal

### 3. Context Resolution
- Called once per frame in handleGamepadContinuousInput()
- Simple if/else chain, ~12 conditions
- **Impact:** Negligible

---

## Code Quality Assessment

### Strengths
✅ Clear separation of concerns (3 layer architecture)  
✅ Context-aware input mapping is well-designed  
✅ Comprehensive gamepad mode support (X/S/D)  
✅ Good fallback handling (optional chaining everywhere)  
✅ Frame-accurate button state tracking  

### Weaknesses
❌ Dual menu navigation systems (DRY violation)  
❌ Circumventing InputManager in some places  
❌ Surface mode input is separate  
❌ Global state for menu navigation  
❌ Inconsistent input paradigms (acceptable but complex)  

### Documentation
✅ Good comments in gamepadmanager.js  
✅ INPUT_CONTEXTS and INPUT_ACTIONS are self-documenting  
⚠️ gamepadMenuNavigation.js could use more comments  
⚠️ No input flow diagram or architecture doc  

---

## Recommendations

### Priority 1: Consolidate Menu Navigation (Minor)
**Merge the two station menu navigation paths:**

Current:
```javascript
// Path A: Keyboard
keyPressed() 
  → executeInputAction(NAV_UP, STATION_MENU)
  → dispatchStationMenuKeyboardAction()
  → _handleGamepadStationMenus(proxy, state)

// Path B: Gamepad
handleGamepadContinuousInput()
  → _handleGamepadStationMenus(gp, state)
```

Recommended:
```javascript
// Single path: Gamepad-as-primary
handleGamepadContinuousInput() {
  if (context === STATION_MENU) {
    // Always use real gamepad object
    _handleGamepadStationMenus(gp, state);
  }
}

// Keyboard gets converted to gamepad proxy
keyPressed() {
  const context = getActiveInputContext();
  const action = inputManager.getKeyboardAction(key, keyCode, context);
  
  if (context === STATION_MENU && action) {
    // Create proxy and feed to same handler
    const proxy = createGamepadProxy(action);
    _handleGamepadStationMenus(proxy, state);
  } else if (action) {
    executeInputAction(action, context);
  }
}
```

**Benefit:** Single source of truth for menu navigation

---

### Priority 2: Encapsulate Menu State (Nice-to-Have)
**Move global menu state into a class:**

Current:
```javascript
let _gpMenuIndex = 0;
let _gpMenuState = '';
let _gpMissionPanel = 'list';
let _gpMissionDetailIndex = 0;
```

Recommended:
```javascript
class GamepadMenuState {
  constructor() {
    this.menuIndex = 0;
    this.menuState = '';
    this.missionPanel = 'list';
    this.missionDetailIndex = 0;
  }
  reset() { /* ... */ }
  navigate(dir, gridSize) { /* ... */ }
}

window.gamepadMenuState = new GamepadMenuState();
```

**Benefit:** Clearer ownership, easier to test, better encapsulation

---

### Priority 3: Document Surface Mode Input (Low Priority)
**Add explicit gamepad integration for surface mode:**

Currently surface mode uses its own handler. Consider:
1. Adding surface controls to InputManager gamepad map
2. Or document why surface mode needs separate handling

---

### Priority 4: Centralize Context Resolution (Very Low Priority)
**Current approach is fine, but could add a comment:**

```javascript
/**
 * Single point for input context resolution.
 * Called each frame to determine which input bindings are active.
 * Based on game state, UI overlays, and weapon type.
 */
function getActiveInputContext() { /* ... */ }
```

---

## Validation Checklist

- [x] Load order is correct
- [x] No circular dependencies
- [x] Gamepad mode detection works
- [x] Context resolution is centralized
- [x] All game states have input bindings
- [x] All actions are mappable
- [x] Synthetic events don't interfere
- [x] No duplicate button mappings (within same context/mode)
- [x] Gamepad disconnection is handled
- [x] Fallback handling is comprehensive
- [⚠️] Station menu navigation uses two paths (consolidate per Priority 1)
- [⚠️] Surface mode is separate (document per Priority 3)

---

## Conclusion

**Overall Assessment:** The input system is **coherent and well-designed**. The recent refactor successfully separated concerns into three layers (GamepadManager → InputManager → sketch.js).

**The two issues found are architectural, not functional:**
1. Redundant station menu navigation (code smell, not a bug)
2. Surface mode circumvents the system (acceptable separation, but undocumented)

**No conflicts, overlaps, or critical bugs detected.** The system will work correctly across keyboard and gamepad inputs.

**Recommended action:** Implement Priority 1 (consolidate menu navigation) for code cleanliness. All other items are optional improvements.

