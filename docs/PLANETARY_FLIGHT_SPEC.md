# Planetary Surface Approach Specification (V2)

## 1. Overview & Goals

This specification redesigns the planetary surface approach feature to deliver a visually compelling, **faux 3D low-poly terrain** experience. The player flies toward and over a procedurally generated surface that **matches the planet's visible texture** from orbit.

### Design Pillars
1. **Visual Continuity** — Surface colors and features derive from the same noise/palette used to render the planet sprite
2. **Attractive Low-Poly Aesthetic** — Faceted terrain using `Draw3D` primitives (prisms, cones, boxes) evokes a stylized look
3. **Smooth Transition** — Gradual zoom and crossfade from planet sprite to terrain mesh
4. **Intuitive Controls** — Standard flight controls work identically; altitude is an additional axis
5. **Performance Focus** — Progressive tile generation, culling, and LOD keep frame rate high

---

## 2. Visual Design: Faux 3D Low-Poly Surface

### 2.1 What the Player Sees

```
ORBIT VIEW                         SURFACE VIEW
┌─────────────────────┐            ┌─────────────────────┐
│                     │            │   ◢████◣     ▲      │
│      ●◐◑●           │  ──→       │  ◢██████◣   ▲▲▲     │
│     (planet)        │  zoom      │ ◢████████◣  ▲▲▲▲    │
│                     │            │ ████████████ ground  │
└─────────────────────┘            └─────────────────────┘
       (sprite)                        (3D terrain tiles)
```

The surface is rendered as a **grid of low-poly tiles**, each tile containing:
- A **base ground quad** colored from the planet's noise palette
- Optional **elevation features** (mountains, ridges, dunes) as extruded shapes
- Optional **structures** (cities, installations) on inhabited planets
- **Shadows** cast by features toward a consistent light direction

### 2.2 Low-Poly Terrain Primitives

Using the existing `Draw3D` system:

| Feature Type | Draw3D Primitive | Visual Effect |
|--------------|------------------|---------------|
| Mountains | `drawCone()` / `drawPrism(4-6 sides)` | Jagged peaks with faceted shading |
| Hills | `drawDome()` (low segments) | Smooth bumps with faceted faces |
| Ridges | `drawExtrudedShape()` | Long angular formations |
| Buildings | `drawBox3D()` / `drawPrism()` | City blocks, installations |
| Towers | `drawCylinder()` / `drawCone()` | Antenna, spires |
| Craters | `drawDome(inverted=true)` | Concave depressions |

### 2.3 Color Derivation

The surface uses **the same 3D noise field** as `planet.js` to ensure visual consistency:

```javascript
// Sample noise at surface coordinates to get height + color
function getSurfaceData(planetSeed, localX, localY) {
    const nx = localX * planet.sampleMultiplier + planet.featureRand * 0.001;
    const ny = localY * planet.sampleMultiplier + planet.featureRand * 0.002;
    const nz = planet.noiseZ; // Fixed Z slice for surface
    
    const noiseVal = noise(nx, ny, nz);
    const colorIndex = floor(noiseVal * planet.palette.length);
    const height = (noiseVal - 0.5) * MAX_TERRAIN_HEIGHT;
    
    return { 
        color: planet.palette[colorIndex], 
        height: height 
    };
}
```

**Key insight**: Heights are **signed** — values below 0.5 noise threshold become depressions (canyons, craters), values above become elevations (mountains, hills). This prevents the "inverted terrain" bug from the previous implementation.

---

## 3. Transition Mechanics

### 3.1 Approach Phases

```
Phase 1: ORBIT          Phase 2: DESCENT         Phase 3: SURFACE
┌───────────────┐       ┌───────────────┐        ┌───────────────┐
│ Planet sprite │  ──→  │ Sprite scaling│  ──→   │ Terrain only  │
│ at normal size│       │ + terrain fade│        │ player at low │
│               │       │ in behind     │        │ altitude      │
└───────────────┘       └───────────────┘        └───────────────┘
    dist > 500            500 > dist > 50           dist < 50
```

#### Phase 1: Orbit (Normal Space Flight)
- Planet rendered as usual sprite
- Player can approach planet to initiate descent
- No terrain visible yet

#### Phase 2: Descent Transition
- Trigger: Player enters **approach zone** (configurable radius around planet edge)
- Planet sprite begins **scaling up** (simulating zoom)
- Terrain tiles **fade in** behind/beneath the scaling sprite
- Camera smoothly adjusts to surface-relative view
- Duration: ~3 seconds for full transition

#### Phase 3: Surface Flight
- Planet sprite hidden
- Full terrain grid visible around player
- Player has altitude control (new axis)
- Terrain scrolls as world moves past stationary player

### 3.2 Exit Transition
- Player ascends to maximum altitude OR travels far from approach point
- Reverse of approach: terrain fades, sprite scales down
- Seamless return to normal space view

---

## 4. Technical Architecture

### 4.1 Coordinate System

```
SPACE COORDS                    SURFACE COORDS
(world x, y)                    (local x, y, altitude)
     │                               │
     ▼                               ▼
┌─────────────────┐            ┌─────────────────┐
│ starSystem.js   │            │ surfaceMode.js  │
│ handles space   │   ⟷        │ handles terrain │
│ entities        │            │ + altitude      │
└─────────────────┘            └─────────────────┘
```

- **Surface Local Coords**: Player is always at screen center; terrain tiles positioned relative to player
- **Landing Vector**: When entering surface mode, the approach direction is recorded as the "down" vector
- **Altitude**: New Z-axis dimension, 0 = ground level, positive = ascending

### 4.2 Terrain Tile System

```javascript
const TILE_CONFIG = {
    SIZE: 200,              // World units per tile
    VISIBLE_RADIUS: 5,      // Tiles visible in each direction (11x11 grid)
    LOD_NEAR: 2,            // High detail within 2 tiles
    LOD_FAR: 4,             // Medium detail within 4 tiles
    GENERATION_PER_FRAME: 2 // Max tiles to generate per frame
};
```

#### Tile Structure
```javascript
class TerrainTile {
    constructor(gridX, gridY, planetData) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.features = [];     // Array of Draw3D primitives
        this.groundColor = null;
        this.buffer = null;     // Pre-rendered buffer (optional)
    }
    
    generate(planetData) {
        // Sample noise to determine tile properties
        // Generate appropriate features based on height, biome
    }
    
    draw(offsetX, offsetY, sunAngle) {
        // Draw ground quad
        // Draw each feature with proper depth sorting
    }
}
```

### 4.3 Feature Generation by Biome

Based on noise value and planet type, tiles spawn different features:

```javascript
const BIOME_FEATURES = {
    DESERT: {
        low: [],                              // Flat sand
        medium: ['dune', 'dune', 'ridge'],   // Sand dunes
        high: ['mesa', 'spire']              // Rock formations
    },
    ICE: {
        low: ['frozen_lake'],                // Flat ice
        medium: ['glacier_chunk'],           // Ice formations
        high: ['ice_spire', 'ice_mountain'] // Frozen peaks
    },
    VOLCANIC: {
        low: ['lava_pool'],                  // Lava lakes (inverted)
        medium: ['cone', 'vent'],            // Small vents
        high: ['volcano']                    // Large cones
    },
    INHABITED: {
        low: ['landing_pad', 'road'],        // Flat structures
        medium: ['building_cluster'],        // City blocks
        high: ['tower', 'megastructure']    // Tall buildings
    }
};
```

### 4.4 Depth Sorting for 3D Effect

All terrain features use the existing `Draw3D` deferred rendering:

```javascript
function drawSurfaceFrame() {
    beginDeferredRendering();
    
    // 1. Draw ground tiles (depth = 0)
    for (const tile of visibleTiles) {
        tile.drawGround(offsetX, offsetY);
    }
    
    // 2. Draw all features (depth = feature height)
    for (const tile of visibleTiles) {
        for (const feature of tile.features) {
            feature.draw(offsetX, offsetY, sunAngle);
        }
    }
    
    // 3. Draw player and entities at their altitudes
    drawPlayerShadow(player.altitude);
    drawPlayer(player.altitude);
    
    flushDeferredRendering(); // Sorts by depth, draws back-to-front
}
```

---

## 5. Flight Mechanics

### 5.1 Altitude Control

```javascript
const SURFACE_FLIGHT = {
    MIN_ALTITUDE: 10,       // Minimum safe altitude
    MAX_ALTITUDE: 500,      // Triggers exit transition
    CLIMB_RATE: 100,        // Units per second
    DESCENT_RATE: 80,       // Units per second
    TERRAIN_COLLISION: true // Enable ground collision
};
```

- **Pitch Up/Down**: Existing controls affect altitude
- **Thrust**: Moves forward across surface
- **Strafe**: Lateral movement (if ship supports)

### 5.2 Shadow Parallax (Visual Altitude Cue)

```javascript
function drawPlayerShadow(altitude) {
    const shadowOffset = altitude * 0.5; // Pixels per altitude unit
    const shadowScale = 1.0 - (altitude / SURFACE_FLIGHT.MAX_ALTITUDE) * 0.3;
    
    // Draw shadow on ground (depth = 0)
    push();
    translate(player.x + shadowOffset, player.y + shadowOffset);
    scale(shadowScale);
    // ... draw shadow shape
    pop();
}
```

Higher altitude = shadow further from ship + smaller shadow

### 5.3 Terrain Collision

```javascript
function checkTerrainCollision(playerX, playerY, playerAltitude) {
    const tile = getTileAt(playerX, playerY);
    const terrainHeight = tile.getHeightAt(playerX, playerY);
    
    if (playerAltitude <= terrainHeight + COLLISION_BUFFER) {
        // Collision! Apply damage, bounce, or block descent
        return true;
    }
    return false;
}
```

---

## 6. Implementation Phases

### Phase 1: Core Terrain Rendering (MVP)
1. Create `surfaceMode.js` module
2. Implement tile grid generation using Draw3D primitives
3. Basic noise-based height/color sampling from planet data
4. Ground-level flight only (no altitude yet)
5. Simple transition trigger (approach planet -> surface mode)

### Phase 2: Visual Polish
1. Add deferred depth sorting for proper 3D layering
2. Implement shadow parallax for altitude visualization
3. Add biome-specific feature sets
4. Smooth transition animation (sprite scale + fade)

### Phase 3: Full Flight Mechanics
1. Altitude control system
2. Terrain collision detection
3. Exit transition (ascend to leave)
4. Surface-specific entities (turrets, convoys)

### Phase 4: Gameplay Integration
1. Surface missions (bombing runs, convoys)
2. Landing mechanics (find flat areas)
3. Surface-to-orbit combat handoff

---

## 7. Performance Considerations

### 7.1 Progressive Generation
- Tiles generated on-demand as player moves
- Maximum 2 tiles generated per frame
- Tiles cached for duration of surface visit
- Old tiles disposed when leaving visible range

### 7.2 Level of Detail (LOD)
- **Near tiles** (within 2 tiles): Full detail, all features rendered
- **Far tiles** (2-4 tiles): Reduced features, simpler primitives
- **Distant tiles** (4+ tiles): Ground color only, no features

### 7.3 Buffer Caching
For static tiles, pre-render to off-screen buffer:
```javascript
if (!tile.buffer) {
    tile.buffer = createGraphics(TILE_SIZE, TILE_SIZE);
    tile.renderToBuffer();
}
image(tile.buffer, screenX, screenY);
```

---

## 8. Example: Desert Planet Surface

```javascript
// What the player sees when approaching a desert world:

// Tile at grid (0, 0) with noise value 0.7 (elevated)
const tile = new TerrainTile(0, 0, desertPlanet);
tile.groundColor = color(194, 155, 97);  // Sandy brown from palette
tile.features = [
    { type: 'mesa', x: 50, y: 30, height: 40 },
    { type: 'dune', x: 120, y: 80, height: 15 },
    { type: 'spire', x: 180, y: 150, height: 60 }
];

// Rendered with Draw3D:
// - Mesa: drawBox3D() with tapered top
// - Dune: drawDome() with low segment count
// - Spire: drawCone() with narrow base
```

---

## 9. File Structure

```
/elite
├── surfaceMode.js          # Main surface flight controller
├── terrainTile.js          # Tile generation and rendering
├── surfaceTransition.js    # Approach/exit animation logic
├── surfaceEntities.js      # Surface-specific objects (turrets, etc.)
└── test/
    └── surface_test.html   # Visual test harness
```

---

## 10. Open Questions / Future Work

1. **Ground Vehicles**: Should the player be able to land and deploy a rover?
2. **Underwater**: Could this system extend to ocean worlds with depth instead of altitude?
3. **Caves/Tunnels**: Draw3D supports inverted domes — could we have cave entrances?
4. **Weather Effects**: Sandstorms, blizzards as visual overlays during surface flight?
5. **AI on Surface**: Should enemy ships follow player to surface, or surface-only enemies?

---

## Appendix A: Draw3D Primitives Reference

| Method | Best For |
|--------|----------|
| `drawCone(x, y, baseR, height, segments, col, angle, sun)` | Mountains, peaks, spires |
| `drawDome(x, y, radius, segments, col, angle, sun, inverted)` | Hills, craters (inverted) |
| `drawBox3D(x, y, w, h, depth, col, angle, sun)` | Buildings, mesas |
| `drawPrism(x, y, r, sides, depth, col, angle, sun)` | Angular rocks, crystals |
| `drawCylinder(x, y, r, height, segments, col, angle, sun)` | Towers, pillars |
| `drawExtrudedShape(verts, depth, col, angle, sun)` | Custom ridges, walls |

All primitives support:
- Consistent shading based on `sunAngle`
- Deferred rendering for depth sorting via `beginDeferredRendering()` / `flushDeferredRendering()`
