## Elite (p5.js) – Copilot Working Rules

### What to know first
- No build, no bundler, no modules. Run by opening `index.htm` in a browser. Don’t convert files to ESM/require—script tag order is the backbone of dependency management.
- Globals managed in `sketch.js`: `player`, `galaxy`, `uiManager`, `gameStateManager`, `soundManager`, `eventManager`, `titleScreen`, `saveSelectionScreen`.
- `setup()` order matters: load font/sound → create managers → `galaxy = new Galaxy()` → `player = new Player()` → `player.applyShipDefinition()` → `WeaponSystem.init(100)`.

### Script load order (index.htm)
1) Libraries: `p5.min.js`, `p5.sound.min.js`, `riffwave.js`, `sfxr.js`
2) Early utilities: `soundManager.js`, `objectPool.js`, `projectile.js`, `eventManager.js`
3) Data/defs: `ships.js`, `weapons.js`, `weaponSystem.js`, `mission.js`
4) Generators/managers: `missionGenerator.js`, `gameStateManager.js`
5) World classes: `market.js`, `station.js`, `planet.js`, `asteroid.js`, `nebula.js`, `cosmicStorm.js`
6) Composites: `starSystem.js`, `galaxy.js`
7) Debug helpers: `debugNebulae.js`, `nebulaDebugHelpers.js`
8) Entities/UI bits: `thrustParticles.js`, `player.js`, `enemy.js`, `inventoryScreen.js`, `cargo.js`
9) UI main: `uiManager.js`
10) Entry/UX: `explosion.js`, `titleScreen.js`, `saveSelectionScreen.js`, `sketch.js`

Never reorder without testing; silent circular deps are easy to introduce.

### Coordinate spaces (world vs screen)
View-space translation keeps player centered. Convert mouse to world:
```js
const tx = width/2 - player.pos.x, ty = height/2 - player.pos.y;
const worldMx = mouseX - tx, worldMy = mouseY - ty;
```

### Game states and transitions
- States: TITLE_SCREEN, SAVE_SELECTION, IN_FLIGHT, DOCKED, VIEWING_* (market/missions/etc), GALAXY_MAP, JUMPING, GAME_OVER.
- Dock/undock: docking snaps to station; undocking applies offset and spawns bodyguards.
- Jumping: requires being inside the system jump zone; features charge timer plus FADE_OUT → WHITE_HOLD → FADE_IN.

### StarSystem ownership rules
- Arrays managed internally: `enemies`, `projectiles`, `beams`, `forceWaves`, `asteroids`, `cargo`, `explosions`, `nebulae`, `cosmicStorms`.
- Don’t push/pop from outside. Use StarSystem methods. Projectiles are pooled via `ObjectPool` (initialized in `WeaponSystem.init`).

### Ships, AI, weapons
- Ships in `ships.js` use normalized vertex data; `baseTurnRate` is radians. `aiRoles` feed role arrays in `starSystem.js`.
- Weapons (`WEAPON_TYPE`): PROJECTILE, BEAM (raycast vs circle bounds), MISSILE (fires straight if no lock), TURRET, FORCE (AoE with batch processing), TANGLE (drag/rotation debuffs), BARRIER (temporary reduction).
- Always fire via `WeaponSystem.fire(owner, system, angle, type, target)`.

### Save/load and save selection
- Multi-slot saves in localStorage. Keys live in `saveSelectionScreen.js`: `SAVE_KEY_PREFIX`, `LAST_ACTIVE_SLOT_KEY`.
- Load order: `galaxy.loadSaveData()` → restore `currentSystemIndex` → `player.loadSaveData()` → `player.currentSystem = galaxy.getCurrentSystem()` → `eventManager.initializeReferences()`.
- The Save Selection screen drives New/Load and updates `window.activeSaveSlotIndex`.

### Procedural generation and routing
- `StarSystem.initStaticElements(sessionSeed)` seeds with `systemIndex (+ sessionSeed)`; must run after p5 `setup()` is ready.
- Galaxy builds routes in `connectedSystemIndices`; jump only along defined links.

### Controls, timing, pitfalls
- Keys: Space = fire, M = map, H/J = autopilot station/jump zone, I = inventory, L = toggle wanted, B = secret base nav.
- p5 `deltaTime` is ms; convert to seconds when needed. Angles use RADIANS (`angleMode(RADIANS)` in `setup()`). Use optional chaining during transitions.
- Don’t update player input while DOCKED; avoid direct array mutations on StarSystem.

### Editor tools
- `editor/` contains standalone tooling (e.g., ship editor/comparer). It’s not loaded by the game and shouldn’t influence runtime scripts.

### Key files
- `sketch.js` (entry, loop, input), `gameStateManager.js` (states/jumps), `starSystem.js` (entities/spawn/jump zone), `galaxy.js` (generation/routes),
  `player.js` (movement/combat/cargo/missions), `weaponSystem.js` (firing/pooling), `ships.js` (geometry/defs), `uiManager.js` (HUD/menus/market).

If you change load order, entity ownership, or save/load flow, sanity-test: undock/dock, jump (in-zone), save/load, fire all weapon types.
