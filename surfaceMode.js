// ****** surfaceMode.js ******
// Surface flight mode controller for planetary surface gameplay
// Uses 3D mesh terrain rendering based on surface_test.html

/**
 * Configuration constants for surface mode
 */
const SURFACE_CONFIG = {
    // Flight mechanics
    MIN_ALTITUDE: 10,
    MAX_ALTITUDE: 1500,
    DEFAULT_ALTITUDE: 800, // Default starting altitude above terrain
    TURN_SPEED: 2.5,           // Radians per second
    // Movement (now uses SHIP_DEFINITIONS and SharedPhysics)
    CLIMB_SPEED: 200,

    // Terrain mesh
    MESH_RESOLUTION: 100,      // Grid resolution (balanced for detail and performance)
    MESH_SIZE: 3800,           // World units covered (safe balance of sharpness and view distance)
    SPAWN_CELL_SIZE: 35,       // Fixed spawn density (independent of resolution)
    DEFAULT_FEATURE_SEED: 12345, // Fallback seed for terrain generation
    HIGH_TERRAIN_THRESHOLD: 350, // Height (0-500) treated as high ground for defenses

    // Transition
    TRANSITION_ENTER_DURATION: 3000, // ms for entering (terrain loads during fade)
    TRANSITION_EXIT_DURATION: 800,   // Increased from 250ms for smoother wash-out
    TRIGGER_KEY: 71,           // 'G' key for surface descent

    // Visual
    SUN_ANGLE: -Math.PI / 4,
    EXTRUSION_ANGLE: 0.5,      // Standard pseudo-3D extrusion angle
    FIRE_RATE: 8,              // Shots per second

    // Shadow rendering
    SHADOW_BASE_OFFSET: 20,    // Base shadow offset distance
    SHADOW_ALTITUDE_SCALE: 0.15, // Shadow offset multiplier per altitude unit

    // EVA and boarding
    BOARDING_RANGE: 40,         // Distance within which player can board ship
    REEBOARD_COOLDOWN: 2.0,     // Seconds before allowing re-boarding after disembark
    HAB_UNIT_SIZE: 60,          // Standard size for hab units
    EVA_ZOOM: 1.3,              // Automatic zoom factor when disembarking as astronaut

    // Terrain detection
    CANYON_DETECTION_DISTANCE: 400, // Distance to check for canyon edges

    // Cache cleanup
    CACHE_CLEANUP_INTERVAL: 600, // Frames between cache cleanup operations

    // Performance
    UPDATE_RANGE: 2000,         // Max distance for object updates (units)
    BEAM_DISPLAY_DURATION: 150, // Beam visual duration (ms)

    // Defense Drone Configuration
    DRONE: {
        DETECTION_RANGE: 800,      // Units
        DETECTION_ALTITUDE: 50,    // Units above terrain
        FLYING_HEIGHT: 60,         // Units above ground (Minimum 50 as requested)
        MAX_SPEED: 150,
        ACCELERATION: 200,
        TURN_RATE: 2.5,
        FIRE_RATE: 1.5,            // Seconds between shots
        PROJECTILE_SPEED: 12,
        PROJECTILE_DAMAGE: 8,
        HEALTH: 100
    },

    // Turret Configuration
    TURRET: {
        RANGE: 1000,
        DETECTION_HEIGHT_THRESHOLD: 50, // Radar altitude threshold for detection
        HEALTH: 150,
        FIRE_RATE: 2.0,                 // Seconds between shots
        TURN_SPEED: 5,                  // Radians per second factor
        PROJECTILE_SPEED: 15,
        PROJECTILE_DAMAGE: 5,
        PROJECTILE_LIFESPAN: 120
    },

    // Stealth Configuration
    // Simple rule: Enemies detect player if playerAltitude >= enemyAltitude
    // This makes stealth visually intuitive: stay below enemies to hide
    STEALTH: {
        // No configuration needed - pure altitude comparison
    },

    // Level of Detail (LOD) Configuration for flora/fauna rendering
    // Reduces geometry complexity at higher altitudes to improve performance
    // Simple 2-level system: full detail below threshold, simplified above
    LOD: {
        DETAIL_THRESHOLD: 1200,   // Below 1200: full detail, above: simplified
        MIN_SCREEN_SIZE: 3,       // Don't draw if apparent size < 3 pixels
        FULL_DETAIL: 3,           // LOD level for full detail rendering
        SIMPLIFIED: 2             // LOD level for simplified rendering
    },

    // Cloud Layer Configuration - fades surface to white at high altitudes
    // This hides LOD reduction and creates the effect of entering a cloud layer
    // The overlay is drawn AFTER surface objects but BEFORE the player ship,
    // so the ship remains visible while the surface fades out
    CLOUD_LAYER: {
        START_ALTITUDE: 1000,     // Altitude where clouds begin to appear
        FULL_ALTITUDE: 1500,      // Altitude where clouds reach maximum opacity
        MAX_OPACITY: 1.0,         // Increased from 0.75 for full white-out at MAX_ALTITUDE
        COLOR: [255, 255, 255]    // Cloud color (white)
    }
};

/**
 * Surface flight mode state
 * Controls transitions between space flight and planetary surface exploration
 */
const SURFACE_STATE = {
    INACTIVE: 'inactive',     // Not in surface mode
    ENTERING: 'entering',     // Transitioning from space to surface
    ACTIVE: 'active',         // Actively flying on planet surface
    EXITING: 'exiting'        // Returning to space
};

const DEFAULT_SURFACE_DETAIL_RATIO = 38;

/**
 * SurfaceMode class - manages planetary surface flight with 3D mesh terrain
 * 
 * COORDINATE SYSTEM:
 * - World Coordinates: Actual position of objects in the game world (this.surfaceX, this.surfaceY)
 * - Screen Coordinates: Position after camera translation (centered on player)
 * - Visual Coordinates: Screen position adjusted for 3D extrusion effect (altitude offset)
 * 
 * The camera system:
 * 1. Translates to screen center (width/2, height/2)
 * 2. Applies perspective scaling based on altitude
 * 3. Translates by -player.pos to center camera on player
 * 
 * Objects are drawn at their world positions; the camera transform handles centering.
 * 
 * ALTITUDE SEMANTICS:
 * - altitude: Absolute height above sea level (player altitude)
 * - radarAltitude: Height above local terrain (altitude - terrain height)
 * - yOffset: Height offset for surface objects (matches terrain height)
 * - height: Visual 3D height of buildings/structures
 * 
 * RENDERING OPTIMIZATION:
 * - Extrusion angle is cached per frame to avoid repeated calculations
 * - Viewport culling eliminates off-screen object rendering
 * - Object spawning uses fixed-density grid independent of terrain resolution
 */
class SurfaceMode {
    constructor() {
        this.state = SURFACE_STATE.INACTIVE;
        this.planet = null;
        this.player = null;
        this.starSystem = null;

        // Terrain module
        this.terrain = new SurfaceTerrain(SURFACE_CONFIG);

        // Surface position tracking
        this.surfaceX = 0;
        this.surfaceY = 0;
        this.altitude = SURFACE_CONFIG.DEFAULT_ALTITUDE; // Absolute altitude
        this.radarAltitude = SURFACE_CONFIG.DEFAULT_ALTITUDE; // Altitude above local terrain
        this.objectCache = new Map(); // Cache for persistent objects
        this.destroyedCells = new Set(); // Set of cellKeys for destroyed buildings/turrets
        this.playerBuiltMap = new Map(); // Map of cellKey -> surface object descriptor
        this.debugMode = false; // Set to true to spawn only one turret for testing
        this.isLanded = false; // Track landed state

        // Astronaut Mode
        this.controlMode = 'SHIP'; // 'SHIP' or 'ASTRONAUT'
        this.astronaut = null;

        // Mining robots and ore seam system
        this.miningRobots = []; // All mining robots on the surface
        this.oreSeams = new Map(); // Map of ore seam locations (shared across robots per base)
        this.robotSpawnCooldown = 0; // Cooldown to prevent continuous spawning
        this._depthSortBuffer = []; // Reusable array for depth sorting (avoids GC)

        // Player physics
        this.playerAngle = -Math.PI / 2; // Start facing UP
        this.playerSpeed = 0;

        // Control inputs (only altitude for surface-specific control)
        this.altitudeInput = 0;

        // Projectiles
        this.projectiles = [];

        // Transition
        this.transitionProgress = 0;
        this.transitionStartTime = 0;

        // Key state
        this._keyPressed = false;
        // Build key state (prevents repeat while held)
        this._buildKeyPressed = false;

        // Frame-level cached values (initialized with safe defaults)
        // These are recalculated at the start of each draw() call
        // CRITICAL: Must be initialized to prevent undefined access during ENTERING state
        this._cachedPerspectiveScale = 1.0;
        this._cachedBaseLODLevel = SURFACE_CONFIG.LOD.SIMPLIFIED;
        this._cachedExtrusionAngle = SURFACE_CONFIG.EXTRUSION_ANGLE;
        this._cachedExtrusionSin = Math.sin(SURFACE_CONFIG.EXTRUSION_ANGLE);
        this._cachedExtrusionCos = Math.cos(SURFACE_CONFIG.EXTRUSION_ANGLE);
        this._cachedCounterScale = 1.0;

        // Saved player position for return
        this.savedPlayerPos = null;

        // Reboard cooldown to prevent loop
        this.reboardCooldown = 0;
        this.boardCooldown = 0;

        // Exit fade overlay opacity (persists after exit for smooth fade-in to space)
        this.exitFadeOpacity = 0;

        // Transition color (defaults to cloud layer white, updated on entry)
        this.transitionColor = SURFACE_CONFIG.CLOUD_LAYER.COLOR;

        // View Zoom (for astronaut EVA mode)
        this.viewZoom = 1.0;
        this.targetViewZoom = 1.0;

        // Display Stability: EMA smoothed deltaTime to prevent position judder
        this._smoothDt = 1 / 60; // Start with standard 60fps assumption
    }

    /**
     * Check if surface mode is active or transitioning
     */
    isActive() {
        return this.state !== SURFACE_STATE.INACTIVE;
    }

    /**
     * Update and draw the exit fade overlay (called from space view after surface exit)
     * This creates a smooth transition from white back to the space view
     * @returns {boolean} True if fade is still active
     */
    updateAndDrawExitFade() {
        if (this.exitFadeOpacity <= 0) return false;

        // Gradually decrease opacity for smooth fade-in to space
        // Use deltaTime for consistent speed regardless of framerate
        // Increased speed to 0.05 (~20 frames / 0.3s) for snappier transition
        const fadeSpeed = 0.05;
        this.exitFadeOpacity -= fadeSpeed * (deltaTime / 16);

        if (this.exitFadeOpacity <= 0) {
            this.exitFadeOpacity = 0;
            return false;
        }

        // Draw colored overlay covering the entire screen
        const cloudColor = this.transitionColor || SURFACE_CONFIG.CLOUD_LAYER.COLOR;
        push();
        noStroke();
        // Clamp opacity to 1.0 for drawing (in case it started > 1.0)
        const drawOpacity = Math.min(1, this.exitFadeOpacity);
        fill(cloudColor[0], cloudColor[1], cloudColor[2], drawOpacity * 255);
        rect(0, 0, width, height);
        pop();

        return true;
    }

    // ============================================
    // DRY Helper Methods - Shared Calculations
    // Delegate to SurfaceUtils for consistency across surface-aware entities
    // ============================================

    /**
     * Calculate perspective scale factor based on altitude
     * @returns {number} Scale factor for rendering
     * @private
     */
    _getPerspectiveScale() {
        return SurfaceUtils.getPerspectiveScale(this.altitude);
    }

    /**
     * Calculate counter-scale factor to maintain constant screen size
     * @returns {number} Counter-scale factor (inverse of perspective scale)
     * @private
     */
    _getCounterScale() {
        return SurfaceUtils.getCounterScale(this.altitude);
    }

    /**
     * Get extrusion angle for pseudo-3D projection
     * @returns {number} Extrusion angle in radians
     * @private
     */
    _getExtrusionAngle() {
        return SurfaceUtils.getExtrusionAngle();
    }

    /**
     * Convert world X coordinate to visual X coordinate
     * @param {number} worldX - World X coordinate
     * @param {number} altitude - Altitude above terrain (default: 0)
     * @returns {number} Visual X coordinate
     * @private
     */
    _toVisualX(worldX, altitude = 0) {
        return SurfaceUtils.toVisualX(worldX, altitude);
    }

    /**
     * Convert world Y coordinate to visual Y coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} altitude - Altitude above terrain (default: 0)
     * @returns {number} Visual Y coordinate
     * @private
     */
    _toVisualY(worldY, altitude = 0) {
        return SurfaceUtils.toVisualY(worldY, altitude);
    }

    /**
     * Clear shadow effects from drawing context to prevent visual artifacts
     * Many drawing functions need to start with clean shadows
     * @private
     */
    _clearShadow() {
        if (typeof drawingContext !== 'undefined') {
            drawingContext.shadowBlur = 0;
            drawingContext.shadowColor = 'transparent';
        }
    }

    /**
     * Check if projectile is valid and should be processed
     * @param {Object} proj - Projectile to validate
     * @returns {boolean} True if projectile is valid and active
     * @private
     */
    _isProjectileValid(proj) {
        return proj && !proj.destroyed && proj.isSurface && proj.pos;
    }

    /**
     * Calculate LOD (Level of Detail) level based on altitude and apparent size
     * Used to reduce rendering complexity for distant flora/fauna
     * Simple 2-level system: LOD 3 (full detail) or LOD 2 (simplified)
     * @param {number} objSize - Object's world size
     * @returns {number} LOD level: 3=full detail, 2=simplified
     * @private
     */
    _calculateLODLevel(objSize) {
        const lod = SURFACE_CONFIG.LOD;

        // Early return for very small apparent size (screen-size culling)
        // Use cached perspective scale to avoid recalculation per object
        const apparentSize = objSize * this._cachedPerspectiveScale;
        if (apparentSize < lod.MIN_SCREEN_SIZE) return lod.SIMPLIFIED;

        // Distance-based LOD: Use cached LOD level for consistency across frame
        // Full detail below threshold, simplified above
        return this._cachedBaseLODLevel;
    }

    /**
     * Utility hash function for deterministic random number generation
     * Uses integer hashing to avoid directional bias
     * @param {number} v - Input value to hash
     * @returns {number} Hashed value
     * @private
     */
    _hash(v) {
        v = ((v >>> 16) ^ v) * 0x45d9f3b;
        v = ((v >>> 16) ^ v) * 0x45d9f3b;
        v = (v >>> 16) ^ v;
        return v;
    }

    /**
     * Deterministic planet seed for surface object placement
     * Falls back through nameHash -> featureRand -> seed -> hashed name -> default
     * @returns {number}
     * @private
     */
    _getPlanetSeed() {
        if (typeof this.planet?.nameHash === 'number') return this.planet.nameHash;
        if (typeof this.planet?.featureRand === 'number') return Math.floor(this.planet.featureRand * 1000000);
        if (typeof this.planet?.seed === 'number') return this.planet.seed;
        if (this.planet?.name) {
            let hash = 0;
            for (let i = 0; i < this.planet.name.length; i++) {
                hash = this._hash(hash + this.planet.name.charCodeAt(i));
            }
            return hash >>> 0; // Ensure unsigned
        }
        return 12345;
    }

    /**
     * Find the best canyon/valley location for shield generator placement
     * Searches multiple deterministic locations and scores them based on terrain features
     * @param {number} searchCount - Number of locations to probe
     * @returns {{x: number, y: number, score: number}} Best canyon location and its score
     * @private
     */
    _findBestCanyonLocation(searchCount = 12) {
        const seed = this.planet.seed || 12345;
        let bestScore = -Infinity;
        // Use planet center in space as a STABLE origin for deterministic placement
        const originX = this.planet.pos.x;
        const originY = this.planet.pos.y;
        let bestX = originX;
        let bestY = originY;

        for (let i = 0; i < searchCount; i++) {
            const mixedSeed = this._hash(seed ^ this._hash(i));
            const angle = ((mixedSeed >>> 0) / 0xFFFFFFFF) * Math.PI * 2;
            const mixedRadius = this._hash(mixedSeed);
            // Search in a predictable range around the planet's space coordinates
            const radius = 6000 + (Math.abs(mixedRadius % 8000)); // 6km to 14km

            const tx = originX + Math.cos(angle) * radius;
            const ty = originY + Math.sin(angle) * radius;

            // Sample center height
            const hCenter = this.terrain.getHeightAt(tx, ty);

            // Sample 4 surrounding points to check for canyon walls
            const wallDist = SURFACE_CONFIG.CANYON_DETECTION_DISTANCE;
            const h1 = this.terrain.getHeightAt(tx + wallDist, ty);
            const h2 = this.terrain.getHeightAt(tx - wallDist, ty);
            const h3 = this.terrain.getHeightAt(tx, ty + wallDist);
            const h4 = this.terrain.getHeightAt(tx, ty - wallDist);

            // Canyon score: higher is better (wall height minus floor height)
            const avgWallHeight = (h1 + h2 + h3 + h4) / 4;
            const canyonScore = avgWallHeight - hCenter;

            if (canyonScore > bestScore) {
                bestScore = canyonScore;
                bestX = tx;
                bestY = ty;
            }
        }

        return { x: bestX, y: bestY, score: bestScore };
    }

    /**
     * Check if player can enter surface mode
     */
    canEnter(player, planet) {
        if (!player || !planet) return false;
        if (this.state !== SURFACE_STATE.INACTIVE) return false;
        if (planet.isSun) return false;

        // Check player is close enough to planet
        const dist = p5.Vector.dist(player.pos, planet.pos);
        // Strict entry: must be effectively within the planet's visual radius (1.1x for slight buffer)
        const approachThreshold = planet.radius * 1.1;

        return dist < approachThreshold;
    }

    /**
     * Enter surface mode
     */
    // enter(player, planet, starSystem, options = {})
    // options.force: when true, skip canEnter checks (used for restoring from save)
    enter(player, planet, starSystem, options = {}) {
        const force = options && options.force;
        if (!force && !this.canEnter(player, planet)) {
            console.warn("Cannot enter surface mode - conditions not met");
            return false;
        }

        // 1. Dynamic Mesh Calculation: Optimize size/resolution for the current screen
        // Account for logical resolution, perspective, and extrusion shift
        const fallbackMeshSize = SURFACE_CONFIG.MESH_SIZE;
        const hasMeshSizeCalculator = typeof SurfaceUtils.calculateRequiredMeshSize === 'function';
        const calculatedMeshSize = hasMeshSizeCalculator
            ? SurfaceUtils.calculateRequiredMeshSize(
                SURFACE_CONFIG.CLOUD_LAYER.START_ALTITUDE,
                width,
                height
            )
            : fallbackMeshSize;
        const dynamicMeshSize = (Number.isFinite(calculatedMeshSize) && calculatedMeshSize > 0)
            ? Math.ceil(calculatedMeshSize)
            : fallbackMeshSize;
        const configuredDetailRatio = SurfaceUtils?.DETAIL_RATIO;
        const detailRatio = (Number.isFinite(configuredDetailRatio) && configuredDetailRatio > 0)
            ? configuredDetailRatio
            : DEFAULT_SURFACE_DETAIL_RATIO;

        // Update config for this session (prevents black gaps on ultra-wide / saves memory on small screens)
        SURFACE_CONFIG.MESH_SIZE = dynamicMeshSize;
        // Maintain consistent Level of Detail (LOD) regardless of screen size
        SURFACE_CONFIG.MESH_RESOLUTION = Math.ceil(dynamicMeshSize / detailRatio);

        console.log(`Entering surface mode on ${planet.name} [Dynamic Mesh: ${width}x${height} -> ${SURFACE_CONFIG.MESH_SIZE}x${SURFACE_CONFIG.MESH_RESOLUTION}]`);

        this.state = SURFACE_STATE.ENTERING;
        this.player = player;
        this.planet = planet;
        this.starSystem = starSystem;

        // Set transition color to planet's base color for immersive fade
        if (this.planet && this.planet.baseColor) {
            const c = this.planet.baseColor;
            // Ensure we have RGB values
            this.transitionColor = [red(c), green(c), blue(c)];
        } else {
            this.transitionColor = SURFACE_CONFIG.CLOUD_LAYER.COLOR;
        }

        // Reset cached surface objects so new terrain/building logic can repopulate cleanly
        this.objectCache.clear();
        this.destroyedCells.clear();
        this.playerBuiltMap.clear();

        // Clear mining robots and ore seams to prevent respawn bugs on planet re-entry
        this.miningRobots = [];
        this.oreSeams.clear();

        // Restore destroyed state from planet
        if (this.planet.destroyedSurfaceObjects) {
            for (const key of this.planet.destroyedSurfaceObjects) {
                this.destroyedCells.add(key);
            }
        }

        // Optimization: Pre-index player-built objects by cellKey for O(1) lookups during mesh generation
        if (Array.isArray(this.planet.playerBuiltSurfaceObjects)) {
            // CRITICAL: Use fixed SPAWN_CELL_SIZE (35) for consistent indexing across modes/sessions
            const cellSize = SURFACE_CONFIG.SPAWN_CELL_SIZE || 35;
            for (const desc of this.planet.playerBuiltSurfaceObjects) {
                if (!desc || typeof desc.x !== 'number') continue;
                // Use floor for consistent grid keying with _spawnObjects and construction
                const descCellX = Math.floor(desc.x / cellSize);
                const descCellY = Math.floor(desc.y / cellSize);
                const key = `${descCellX},${descCellY}`;
                this.playerBuiltMap.set(key, desc);
            }
        }

        console.log(`Surface state restored: ${this.destroyedCells.size} destroyed objects, ${this.playerBuiltMap.size} player-built structures.`);

        // Save player position for return - ensure we capture the entry point
        // Store the x and y values explicitly to ensure they're not affected by any reference issues
        this.savedPlayerPos = createVector(player.pos.x, player.pos.y);

        // Initialize surface position to player's current position to prevent offsets
        this.surfaceX = player.pos.x;
        this.surfaceY = player.pos.y;

        // Initialize absolute altitude (terrain height + default clearance)
        // Player will maintain this absolute altitude and must climb to clear hills
        const initialGroundH = this._getTerrainHeightAt(this.surfaceX, this.surfaceY);
        this.altitude = initialGroundH + SURFACE_CONFIG.DEFAULT_ALTITUDE;
        this.player.altitude = this.altitude;

        this.surfaceObjects = [];
        this.stars = [];
        this.projectiles = [];
        this.playerAngle = player.angle || -Math.PI / 2;
        this.playerSpeed = player.vel ? player.vel.mag() : 0;

        // Calculate and lock Sun Angle on entry
        // Uses planet rotation to determine initial Day/Night status
        // But keeps it static during surface play (per user request)
        if (this.planet && this.planet.pos) {
            // Sun is at (0,0). Planet is at this.planet.pos.
            // Simplified: Use the direct angle from Planet to Sun in world space.
            // Subtract Rotation to align "Surface North" with "Planet North".
            // If we don't subtract rotation, "Up" on surface = "Up" in Space.
            // But "Up" on surface usually means "North", which is rotated by currentRotation.
            this.sunAngle = Math.atan2(-this.planet.pos.y, -this.planet.pos.x) - (this.planet.currentRotation || 0);
        } else {
            this.sunAngle = -Math.PI / 4;
        }

        // Reset inputs
        this.turnInput = 0;
        this.thrustInput = 0;
        this.strafeInput = 0;
        this.altitudeInput = 0;
        this.fireInput = false;

        // Clear player target on entry to prevent space targets from ghosting on surface
        if (this.player) {
            this.player.target = null;
        }

        // Start transition
        this.transitionStartTime = millis();
        this.transitionProgress = 0;
        this._terrainReady = false; // Flag for deferred initialization
        this._terrainRequested = false;
        this.isLanded = false;

        // Mute space ambient sounds
        if (typeof ambientSoundManager !== 'undefined') {
            ambientSoundManager.stopAll();
        }

        // Initialize terrain module (lightweight setup only)
        this.terrain.setPlanet(planet);

        // Ensure noise seed is consistent with the planet
        if (typeof noiseSeed === 'function') {
            const seed = this._getPlanetSeed();
            try { noiseSeed(seed); } catch (e) { /* ignore */ }
            if (typeof randomSeed === 'function') { try { randomSeed(seed); } catch (e) { /* ignore */ } }
        }

        this.terrain.createBuffer(width, height);
        this.projectiles = [];
        this.surfaceObjects = [];

        // Initialize mission target (Shield Generator)
        if (this.planet) {
            // Restore from planet if already calculated/saved
            if (this.planet.targetPos) {
                this.targetPos = createVector(this.planet.targetPos.x, this.planet.targetPos.y);
                console.log(`[Persistence] Restored target position from planet: ${this.targetPos.x.toFixed(0)}, ${this.targetPos.y.toFixed(0)}`);
            } else {
                const result = this._findBestCanyonLocation(12);
                this.targetPos = createVector(result.x, result.y);
                // Save back to planet for persistence
                this.planet.targetPos = { x: result.x, y: result.y };
                console.log(`[Persistence] Generated new deterministic target position: ${this.targetPos.x.toFixed(0)}, ${this.targetPos.y.toFixed(0)}`);
            }
        }

        // NOTE: Heavy terrain operations (generateMesh, updateBuffer, _spawnObjects)
        // are deferred to _updateTransition() to run during the fade animation,
        // preventing the game from freezing during entry.

        // Set game state if gameStateManager available
        if (typeof gameStateManager !== 'undefined') {
            gameStateManager.setState("SURFACE_MODE");
        }

        // Change music chords on descent
        if (typeof spaceMusicManager !== 'undefined') {
            spaceMusicManager.advanceChordProgression();
        }

        return true;
    }

    /**
     * Exit surface mode (return to space)
     */
    exit() {
        if (this.state === SURFACE_STATE.INACTIVE ||
            this.state === SURFACE_STATE.EXITING) {
            return;
        }

        console.log("Exiting surface mode");

        this.state = SURFACE_STATE.EXITING;
        this.transitionStartTime = millis();
        this.transitionProgress = 0;
        this.isLanded = false; // Reset landed state on exit

        // Change music chords on ascent (start of transition)
        if (typeof spaceMusicManager !== 'undefined') {
            spaceMusicManager.advanceChordProgression();
        }
    }

    /**
     * Register that an object at a specific cell has been destroyed.
     * Persists this state to the planet so it remains gone on re-entry.
     */
    registerDestruction(cellKey) {
        if (!cellKey || !this.planet) return;

        // Add to active set for current session
        if (!this.destroyedCells.has(cellKey)) {
            this.destroyedCells.add(cellKey);

            // Update persistent descriptor if it's a player-built object
            const desc = this.playerBuiltMap.get(cellKey);
            if (desc) {
                desc.destroyed = true;

                // If it was a base, clean up associated mining systems
                if (desc.type === 'PlayerBase' || (desc.variant === 1 && (desc.type === 'OffworldBuilding' || desc.type === 'Offworld Colony'))) {
                    // Destroy mining robots associated with this base
                    if (this.miningRobots) {
                        for (let robot of this.miningRobots) {
                            if (robot.homeBase && (robot.homeBase.cellKey === cellKey || (robot.homeBase.pos && robot.homeBase.pos.x === desc.x && robot.homeBase.pos.y === desc.y))) {
                                robot.destroyed = true;
                                if (typeof this._createExplosion === 'function') {
                                    this._createExplosion(robot.pos.x, robot.pos.y, robot.size * 0.5);
                                }
                            }
                        }
                    }

                    // Remove shared ore seams for this base (identified by its creation coordinates)
                    const baseKey = `base_${desc.x}_${desc.y}`;
                    this.oreSeams.delete(baseKey);
                    console.log(`[Persistence] Mining system for base at ${cellKey} cleaned up.`);
                }

                // Sync destruction status to the planet's persistent list of built objects
                // This ensures compass markers (green dots) are removed
                if (this.planet.playerBuiltSurfaceObjects) {
                    const persistentObj = this.planet.playerBuiltSurfaceObjects.find(o => o.x === desc.x && o.y === desc.y);
                    if (persistentObj) {
                        persistentObj.destroyed = true;
                    }
                }
            }

            // Sync to planet for long-term persistence (saving/loading/leaving/returning)
            if (!this.planet.destroyedSurfaceObjects) {
                this.planet.destroyedSurfaceObjects = [];
            }
            this.planet.destroyedSurfaceObjects.push(cellKey);

            console.log(`[Persistence] Object at ${cellKey} registered as destroyed.`);
        }
    }

    /**
     * Complete exit and cleanup
     */
    _completeExit() {
        this.state = SURFACE_STATE.INACTIVE;

        // Start exit fade strictly at full opacity - space view will fade in from white
        // Set slightly above 1.0 to ensure first frame is solid white even after decrement
        this.exitFadeOpacity = 1.1;

        // Restore player position near planet where they entered
        if (this.player && this.planet && this.savedPlayerPos) {
            // Return player to their saved position near the planet
            this.player.pos.set(this.savedPlayerPos.x, this.savedPlayerPos.y);
            this.player.altitude = 0;

            // Clear invulnerability - player is now back in space
            this.player.isDockedAndInvulnerable = false;
            this.player.weaponsDisabled = false; // Ensure weapons are re-enabled

            // Clear surface mode combat references to prevent guard confusion
            // Guards check principal.lastAttacker - if this references a surface entity
            // (turret/pirate), they might try to engage it inappropriately
            this.player.lastAttacker = null;
            this.player.lastAttackTime = 0;
        }

        // CRITICAL: Reset robot initialization flags before leaving
        // This ensures robots respawn when player returns to planet
        if (this.planet && Array.isArray(this.planet.playerBuiltSurfaceObjects)) {
            for (const desc of this.planet.playerBuiltSurfaceObjects) {
                if (desc && desc.variant === 1 && !desc.destroyed) {  // Hab Unit, not destroyed
                    desc.robotsInitialized = false;
                }
            }
            console.log('[Surface Exit] Reset robotsInitialized flags for planet bases');
        }

        // Cleanup terrain
        this.terrain.cleanup();

        // Clear data
        this.projectiles = [];
        this.miningRobots = [];
        this.oreSeams.clear();
        this.savedPlayerPos = null;

        // Clear player target on exit to prevent surface targets from ghosting in space
        if (this.player) {
            this.player.target = null;
        }

        this.planet = null;

        // Restore game state
        if (typeof gameStateManager !== 'undefined') {
            gameStateManager.setState("IN_FLIGHT");
        }

        // Restart space ambient sounds
        if (this.starSystem && typeof this.starSystem.initAmbientSounds === 'function') {
            this.starSystem.initAmbientSounds();
        }

        console.log("Surface mode cleanup complete");
    }

    /**
     * Handle key press for surface mode
     */
    handleKeyDown(keyCode) {
        if (keyCode === SURFACE_CONFIG.TRIGGER_KEY) {
            this._keyPressed = true;
            return true;
        }

        return false;
    }

    /**
     * Backwards-compatible alias used by existing tests and input paths.
     */
    handleKeyPress(keyCode) {
        if (keyCode === SURFACE_CONFIG.TRIGGER_KEY) {
            this._keyPressed = true;
            return true;
        }

        return this.handleKeyDown(keyCode);
    }

    /**
     * Handle mouse press for surface mode
     */
    handleMousePressed() {
        // Delegate to HUD for button clicks
        if (typeof surfaceHud !== 'undefined' && surfaceHud && surfaceHud.handleMousePressed) {
            if (surfaceHud.handleMousePressed(this)) return true;
        }
        return false;
    }

    /**
     * Check for descent trigger
     */
    checkDescentTrigger(player, planets, starSystem) {
        if (!this._keyPressed) return;
        this._keyPressed = false;

        if (this.state !== SURFACE_STATE.INACTIVE) return;

        for (const planet of planets) {
            if (this.canEnter(player, planet)) {
                this.enter(player, planet, starSystem);
                return;
            }
        }
    }



    /**
     * Main update loop
     */
    update(deltaTime) {
        if (this.state === SURFACE_STATE.INACTIVE) return;

        // [FIX] Clear target if it is destroyed to remove persistent HUD/Radar indicators
        if (this.player && this.player.target) {
            if (this.player.target.destroyed || (typeof this.player.target.isDestroyed === 'function' && this.player.target.isDestroyed())) {
                this.player.target = null;
            }
        }

        // Display Stability: Smooth deltaTime to prevent background stutter/judder
        // Exponential Moving Average (EMA) with 20% weight per frame
        const alpha = 0.2;
        this._smoothDt = this._smoothDt * (1 - alpha) + (deltaTime / 1000) * alpha;
        const dt = this._smoothDt;

        // Update reboard cooldowns
        if (this.reboardCooldown > 0) {
            this.reboardCooldown -= dt;
        }
        if (this.boardCooldown > 0) {
            this.boardCooldown -= dt;
        }

        // Update transition
        if (this.state === SURFACE_STATE.ENTERING ||
            this.state === SURFACE_STATE.EXITING) {
            this._updateTransition();
        }

        // Interpolate view zoom smoothly
        const ZOOM_LERP_SPEED = 5.0; // Speed of zoom transition
        if (Math.abs(this.viewZoom - this.targetViewZoom) > 0.001) {
            this.viewZoom = lerp(this.viewZoom, this.targetViewZoom, 1 - Math.exp(-ZOOM_LERP_SPEED * dt));
        } else {
            this.viewZoom = this.targetViewZoom;
        }

        // Allow input processing during ACTIVE, ENTERING (when ready), and EXITING
        // During EXITING, ship needs to keep moving/responding to look alive
        const canProcessInput = this.state === SURFACE_STATE.ACTIVE ||
            (this.state === SURFACE_STATE.ENTERING && this._terrainReady) ||
            this.state === SURFACE_STATE.EXITING;

        if (canProcessInput) {
            // Player is NOT invulnerable on surface - they can take damage from turrets/drones
            // Invulnerability is only used when actually docked at a station
            if (this.player) {
                this.player.isDockedAndInvulnerable = false;
            }

            if (this.controlMode === 'SHIP') {
                // Altitude control - BEFORE physics update so player.altitude uses current value
                this.altitude += this.altitudeInput * SURFACE_CONFIG.CLIMB_SPEED * dt;

                // Constrain altitude relative to terrain (not absolute)
                // Player must maintain MIN_ALTITUDE clearance above ground
                const currentGroundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
                const minAbsoluteAlt = currentGroundH + SURFACE_CONFIG.MIN_ALTITUDE;
                this.altitude = constrain(this.altitude, minAbsoluteAlt, SURFACE_CONFIG.MAX_ALTITUDE);

                // Calculate and store radar altitude (height above local terrain)
                // This is used by turrets and drones for stealth detection
                this.radarAltitude = this.altitude - currentGroundH;

                this._updatePhysics(dt);
            } else if (this.controlMode === 'ASTRONAUT') {
                this._updateAstronaut(dt);
            }

            // Smarter Regeneration: Center mesh and spawns on the camera focus point
            const extrusionAngle = this._getExtrusionAngle();
            const visualXOffset = this.altitude * Math.sin(extrusionAngle);
            const visualYOffset = this.altitude * Math.cos(extrusionAngle);

            const focusX = this.surfaceX - visualXOffset;
            const focusY = this.surfaceY - visualYOffset; // Corrected: ship center is focal point

            // Update terrain - worker handles mesh generation and buffer swapping
            // Pass sunAngle to ensure consistent lighting
            const sunAngle = this._getSunAngle();
            const bufferSwapped = this.terrain.update(focusX, focusY, false, sunAngle);

            if (bufferSwapped) {
                // If buffer swapped, we might want to respawn objects relative to the new grid center
                // But objects are world-space persistent. We only need to spawn new ones if we moved far enough.
                // The terrain update handles the grid shift.
                const gridPos = this.terrain.getGridPosition();
                // Optimize: only respawn if grid significantly changed or it's a fresh load
                this._spawnObjects(gridPos.x, gridPos.y);
            }

            // Update surface objects (single pass, dt-corrected)
            // Apply distance-based culling for distant objects to improve performance
            if (this.surfaceObjects) {
                const target = this.controlMode === 'ASTRONAUT' ? this.astronaut : this.player;

                // Get viewport for culling (use constant from config)
                const updateRange = SURFACE_CONFIG.UPDATE_RANGE || 2000;
                const updateRangeSq = updateRange * updateRange;
                // Tighter culling for fauna wandering behavior (reduced to 70% of normal range)
                // Fauna can skip movement updates when far away since they just wander randomly
                const faunaReducedRangeSq = (updateRange * 0.7) ** 2;

                // Add hysteresis margin to prevent jitter at boundary (5% buffer)
                const HYSTERESIS_FACTOR = 1.05;
                const updateRangeHysteresisSq = updateRangeSq * HYSTERESIS_FACTOR;
                const faunaReducedHysteresisSq = faunaReducedRangeSq * HYSTERESIS_FACTOR;

                let objectsUpdated = 0;
                let objectsCulled = 0;

                for (let obj of this.surfaceObjects) {
                    if (!obj || obj.destroyed) continue;

                    // Distance-based culling for updates (world space is faster than visual)
                    // Only update objects within reasonable range of player
                    // Skip culling if object doesn't have pos property (always update these)
                    if (target && target.pos && obj.pos) {
                        const dx = obj.pos.x - target.pos.x;
                        const dy = obj.pos.y - target.pos.y;
                        const distSq = dx * dx + dy * dy;

                        // CRITICAL: Validate distance calculation didn't overflow
                        // Large coordinate differences can exceed safe integer limits
                        if (!isFinite(distSq)) {
                            // Overflow detected - treat as very far away and cull
                            objectsCulled++;
                            obj._wasCulledLastFrame = true;
                            continue;
                        }

                        // More aggressive culling for fauna (they just wander when not targeting bases)
                        // Use pre-set flag instead of expensive constructor.name check
                        const isFauna = obj.isFauna === true;

                        // Use hysteresis to prevent boundary jitter:
                        // - If object was updated last frame, use larger range before culling (hysteresis)
                        // - If object was culled last frame, use normal range before un-culling
                        const wasCulled = obj._wasCulledLastFrame === true;
                        const effectiveRangeSq = isFauna ?
                            (wasCulled ? faunaReducedRangeSq : faunaReducedHysteresisSq) :
                            (wasCulled ? updateRangeSq : updateRangeHysteresisSq);

                        // Skip update for very distant objects (but still render them if visible)
                        // Exceptions: Always update mission-critical objects (isTarget), fauna attacking bases, or friends
                        const shouldAlwaysUpdate = obj.isTarget || (isFauna && (obj.targetBase || obj.isFriend));
                        if (distSq > effectiveRangeSq && !shouldAlwaysUpdate) {
                            objectsCulled++;
                            obj._wasCulledLastFrame = true;  // Mark as culled for next frame
                            continue;
                        }
                    }

                    objectsUpdated++;
                    obj._wasCulledLastFrame = false;  // Mark as updated for next frame
                    if (obj.update) obj.update(dt, target, this.starSystem);
                }

                // Store stats for debug overlay
                this._lastUpdateCullStats = { updated: objectsUpdated, culled: objectsCulled };
            }

            this._checkSurfaceCollisions();

            // Update projectiles only (surface projectiles need to move)
            // Note: StarSystem.updateWhileDocked() is intentionally not called to prevent
            // sound leaks from space combat while on surface
            if (this.starSystem && typeof this.starSystem._updateProjectiles === 'function') {
                this.starSystem._updateProjectiles();
            }

            // Update explosions so they animate and fade
            if (this.starSystem && typeof this.starSystem._updateExplosions === 'function') {
                this.starSystem._updateExplosions();
            }

            // Update beams (laser beams have duration)
            if (this.starSystem && typeof this.starSystem._updateBeams === 'function') {
                this.starSystem._updateBeams();
            }

            // Update force waves (shockwaves)
            if (this.starSystem && typeof this.starSystem._updateForceWaves === 'function') {
                this.starSystem._updateForceWaves();
            }

            // Update mines (surface mines tick and arm)
            if (this.starSystem && typeof this.starSystem._updateMines === 'function') {
                this.starSystem._updateMines();
            }

            // Update harpoons (tethers and pulling)
            if (this.starSystem && typeof this.starSystem._updateHarpoons === 'function') {
                this.starSystem._updateHarpoons();
            }

            // Update mining robots
            this._updateMiningRobots(dt);

            // Periodically check for new player bases and initialize robots
            this.robotSpawnCooldown -= dt;
            if (this.robotSpawnCooldown <= 0) {
                this.robotSpawnCooldown = 5; // Check every 5 seconds
                this._initializeMiningRobotsForBases();
            }

            // Background activity catch-up for all bases (mining & damage)
            this._updateBackgroundActivity(dt);

            // Note: altitude control happens BEFORE _updatePhysics() so player.altitude
            // is calculated with current radar altitude, ensuring turrets see accurate data

            // Check exit condition (only when fully active)
            if (this.state === SURFACE_STATE.ACTIVE && this.altitude >= SURFACE_CONFIG.MAX_ALTITUDE) {
                this.exit();
            }
        }
    }

    /**
     * Update transition progress
     */
    _updateTransition() {
        const elapsed = millis() - this.transitionStartTime;
        // Use different durations for enter vs exit
        const duration = this.state === SURFACE_STATE.ENTERING
            ? SURFACE_CONFIG.TRANSITION_ENTER_DURATION
            : SURFACE_CONFIG.TRANSITION_EXIT_DURATION;
        this.transitionProgress = Math.min(1, elapsed / duration);

        // During ENTERING phase, perform deferred terrain initialization immediately
        // This runs during the fade so the user sees the transition animation
        if (this.state === SURFACE_STATE.ENTERING && !this._terrainRequested) {
            // Smarter Regeneration: Center mesh and spawns on the camera focus point
            const extrusionAngle = this._getExtrusionAngle();
            const visualXOffset = this.altitude * Math.sin(extrusionAngle);
            const visualYOffset = this.altitude * Math.cos(extrusionAngle);

            const focusX = this.surfaceX - visualXOffset;
            const focusY = this.surfaceY - visualYOffset; // Corrected: ship center is focal point

            // Generate terrain mesh and buffer - asynchronously request from worker
            // We force a request here
            this.terrain.update(focusX, focusY, true, this._getSunAngle());
            this._terrainRequested = true;
            this._terrainReady = false;
        }

        // Check if terrain has received its first buffer
        if (this.state === SURFACE_STATE.ENTERING && this._terrainRequested && !this._terrainReady) {
            // We need to allow the terrain to "poll" for the worker response
            // The terrain.update() call in the main loop handles data retrieval, but it might not run during transition 
            // if we are strictly in this function.
            // However, update() calls _updateTransition(), so we are inside the main loop.
            // But we need to call terrain.update() to actually check for the message!

            // NOTE: The main update() loop DOES NOT call terrain.update() if state is ENTERING.
            // It only calls _updateTransition().
            // So we must manually poll terrain.update() here to receive the worker message.
            const extrusionAngle = this._getExtrusionAngle();
            const visualXOffset = this.altitude * Math.sin(extrusionAngle);
            const visualYOffset = this.altitude * Math.cos(extrusionAngle);
            const focusX = this.surfaceX - visualXOffset;
            const focusY = this.surfaceY - visualYOffset;

            this.terrain.update(focusX, focusY, false, this._getSunAngle());

            if (this.terrain.currentBuffer) {
                this._terrainReady = true;
                // Spawn initial objects once we have the grid
                const gridPos = this.terrain.getGridPosition();
                this._spawnObjects(gridPos.x, gridPos.y);
                // Initialize mining robots for player bases
                this._initializeMiningRobotsForBases();
            }
        }

        // Only transition to ACTIVE when BOTH fade is complete AND terrain is ready
        // This ensures the fade holds at full coverage if terrain prep takes longer
        if (this.state === SURFACE_STATE.ENTERING) {
            if (this.transitionProgress >= 1 && this._terrainReady) {
                this.state = SURFACE_STATE.ACTIVE;
                console.log("Surface mode now active");
            }
            // Fade stays at 100% opacity until terrain is ready - user sees white screen
        } else if (this.state === SURFACE_STATE.EXITING) {
            // Ship continues to respond to controls during exit (canProcessInput includes EXITING)
            // Fast fade to white (500ms) then complete exit
            if (this.transitionProgress >= 1) {
                this._completeExit();
            }
        }
    }

    /**
     * Update player physics - uses player's normal controls (identical to space physics)
     */
    _updatePhysics(dt) {
        if (!this.player) return;

        if (typeof gameStateManager !== 'undefined' && gameStateManager && gameStateManager.currentState !== 'SURFACE_MODE') {
            if (this.player && this.player.vel) {
                this.player.vel.mult(0);
            }
            if (this.player) {
                this.player.isDockedAndInvulnerable = true;
            }
            return;
        }

        // Use exact same physics as space
        // [STORM CRITICAL FIX]
        // Reset environment flags that were removed from Player.update().
        // Since StarSystem.update() doesn't run on surface, we must reset them here
        // to prevent sticky debuffs from space storms or surface effects.
        this.player.targetingDisruption = 0;
        this.player.shieldsDisabled = false;

        // Handle weapon disabling based on landed status - reset first, then override if landed
        this.player.weaponsDisabled = false;

        this.player.inNebula = false;

        // Reset landed state for this frame, will be checked below
        // Actually, we maintain state and update it
        const currentGroundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
        const minAbsoluteAlt = currentGroundH + SURFACE_CONFIG.MIN_ALTITUDE;

        // Detect landing
        // If altitude is very close to minimum, we are landed
        const LANDING_TOLERANCE = 1.0; // Tolerance for floating point comparison
        const isNowLanded = (this.altitude <= minAbsoluteAlt + LANDING_TOLERANCE);

        // Transition check: if triggering landing this frame
        if (isNowLanded && !this.isLanded) {
            if (typeof soundManager !== 'undefined') {
                soundManager.playSound('land');
            }
            // Kick up dust
            if (this.player && this.player.thrustManager) {
                this.player.thrustManager.createLandingDust(this.player.pos.x, this.player.pos.y, this.player.size, 40);
            }
        }

        this.isLanded = isNowLanded;

        // Store previous position for collision rollback
        const prevX = this.player.pos.x;
        const prevY = this.player.pos.y;

        this.player.handleInput();
        this.player.update();

        // Terrain collision check - prevent flying into canyon walls
        // Check if new terrain would require player to be above current altitude
        const newGroundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
        const requiredMinAlt = newGroundH + SURFACE_CONFIG.MIN_ALTITUDE;

        // If player's current altitude is below required minimum at new position, block movement
        if (this.altitude < requiredMinAlt) {
            // Rollback to previous position - can't fly through walls
            this.player.pos.x = prevX;
            this.player.pos.y = prevY;
            // Zero out velocity to prevent sliding along walls
            this.player.vel.mult(0);
        }

        // Track surface position directly from player position
        // This ensures frame-rate independence as player.update handles time scaling
        this.surfaceX = this.player.pos.x;
        this.surfaceY = this.player.pos.y;

        // Sync angle, speed, and position from player
        this.playerAngle = this.player.angle;
        this.playerSpeed = this.player.vel.mag();

        // Set player's absolute altitude (this.altitude is now absolute, not radar)
        // This ensures turrets can properly detect the player based on their altitude
        const groundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
        this.player.altitude = this.altitude; // Absolute altitude
        this.player.yOffset = groundH; // Persist ground height for weapon firing

        // Check for disembark trigger (WASD while landed)
        this._checkDisembarkTrigger();
    }

    /**
     * Check if player is trying to disembark
     */
    _checkDisembarkTrigger() {
        // Skip check if trying to climb / take off
        if (this.altitudeInput > 0) return;
        if (!this.isLanded || this.controlMode !== 'SHIP') return;

        // Check for longitudinal (forward/backward) movement input only.
        // This allows the player to turn/rotate the ship on the ground without ejecting.
        // Keys: W(87), S(83) or Arrows (UP/DOWN)
        const keyboardMoving = keyIsDown(87) || keyIsDown(83) ||
            keyIsDown(UP_ARROW) || keyIsDown(DOWN_ARROW);

        const gpState = (typeof window !== 'undefined') ? window?._gamepadManager?.state : null;
        const gamepadMoving = !!gpState && (
            gpState.dpad?.up || gpState.dpad?.down ||
            Math.abs(gpState.ls?.y || 0) > 0.35 ||
            (gpState.r2 || 0) > 0.35 ||
            (gpState.l2 || 0) > 0.35
        );

        const moving = keyboardMoving || gamepadMoving;

        // Only allow disembark if moving AND stationary (speed < 10) AND not on cooldown
        if (moving && this.playerSpeed < 10 && this.reboardCooldown <= 0) {
            this.deployAstronaut();
        }
    }

    /**
     * Deploy the astronaut
     */
    deployAstronaut() {
        if (this.controlMode === 'ASTRONAUT') return;

        this.controlMode = 'ASTRONAUT';
        this.targetViewZoom = SURFACE_CONFIG.EVA_ZOOM; // Zoom in for EVA immersion

        // Create astronaut at player position
        // Ensure astronaut.js is loaded
        if (typeof Astronaut !== 'undefined') {
            // Pass skipSpawnOffset: true so we can position them dynamically
            this.astronaut = new Astronaut(this.player.pos, { skipSpawnOffset: true });
            this.astronaut.facingAngle = this.player.angle;
            this.astronaut.heading = this.player.angle; // Face same way as ship

            // Position astronaut perpendicular to the ship heading (right side), scaled by ship size
            const spawnAngle = this.player.angle + Math.PI / 2;
            const spawnDist = (this.player.size || 30) * 0.5 + 20; // Radius + offset padding
            this.astronaut.pos.x = this.player.pos.x + Math.cos(spawnAngle) * spawnDist;
            this.astronaut.pos.y = this.player.pos.y + Math.sin(spawnAngle) * spawnDist;

            // Initial surface sync
            const groundH = this._getTerrainHeightAt(this.astronaut.pos.x, this.astronaut.pos.y);
            this.astronaut.altitude = groundH;

            // Cooldown before allowing the player to board again
            this.boardCooldown = 1.5;

            // Message
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage("EVA Initiated - Astronaut Deployed", [100, 255, 100]);
            }
        } else {
            console.error("Astronaut class not found!");
            this.controlMode = 'SHIP';
        }
    }

    /**
     * Return to ship
     */
    boardShip() {
        if (this.controlMode !== 'ASTRONAUT') return;

        this.controlMode = 'SHIP';
        this.targetViewZoom = 1.0; // Zoom out to normal ship view
        this.astronaut = null;

        // Reset ship altitude to local terrain height + MIN_ALTITUDE so it stays landed
        const groundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
        this.altitude = groundH + SURFACE_CONFIG.MIN_ALTITUDE;
        this.player.altitude = this.altitude;
        this.isLanded = true;

        // Reset player inputs to prevent instant re-deploy or launch
        this.player.thrustInput = 0;
        this.player.turnInput = 0;

        // Set cooldown to prevent immediate re-disembark logic
        this.reboardCooldown = SURFACE_CONFIG.REEBOARD_COOLDOWN;

        // Message
        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage("Boarding Ship", [100, 255, 100]);
        }

        // Check for a single friend to board with you (closest only)
        let boardedFriend = null;
        if (this.surfaceObjects) {
            let closestDist = Infinity;
            let closestIdx = -1;
            for (let i = 0; i < this.surfaceObjects.length; i++) {
                const obj = this.surfaceObjects[i];
                if (obj && obj.isFauna && obj.isFriend && !obj.destroyed) {
                    const d = p5.Vector.dist(obj.pos, this.player.pos);
                    if (d < SURFACE_CONFIG.BOARDING_RANGE * 2 && d < closestDist) {
                        closestDist = d;
                        closestIdx = i;
                    }
                }
            }
            if (closestIdx >= 0) {
                const obj = this.surfaceObjects[closestIdx];
                // Persistently remove so it cannot respawn from cache/cell regen.
                if (obj.cellKey) {
                    this.registerDestruction(obj.cellKey);
                    if (this.objectCache) this.objectCache.set(obj.cellKey, null);
                }
                obj.destroyed = true;
                boardedFriend = obj;
                this.surfaceObjects.splice(closestIdx, 1);
            }
        }

        if (boardedFriend) {
            if (this.player && typeof this.player.setAlienCompanion === 'function') {
                this.player.setAlienCompanion(this._buildAlienCompanionProfile(boardedFriend));
            }

            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage(`Your alien friend boards the ship with you!`, [150, 255, 150]);

                if (this.player && !this.player.alienCompanionIntroShown && this.player.alienCompanion) {
                    const companionName = this.player.alienCompanion.name || 'Unknown';
                    uiManager.addMessage(`Companion acquired: ${companionName}`, [255, 235, 160]);
                    uiManager.addMessage('Open Inventory to view your new companion profile.', [200, 220, 255]);
                    this.player.alienCompanionIntroShown = true;
                }
            }

            if (typeof saveGame === 'function') {
                try { saveGame(); } catch (e) { /* ignore save errors */ }
            }
        }
    }

    _buildAlienCompanionProfile(fauna) {
        const defaultColor = [120, 220, 180];
        let portraitColor = defaultColor;

        if (fauna && fauna.color) {
            try {
                portraitColor = [
                    Math.round(red(fauna.color)),
                    Math.round(green(fauna.color)),
                    Math.round(blue(fauna.color))
                ];
            } catch (e) {
                portraitColor = defaultColor;
            }
        }

        const species = (fauna && fauna.constructor && fauna.constructor.name)
            ? fauna.constructor.name
            : 'Surface Fauna';

        const existingName = this.player && this.player.alienCompanion && this.player.alienCompanion.name;
        const generatedName = this._generateRandomAlienName();
        const faunaSeed = (fauna && typeof fauna.seed === 'number') ? fauna.seed : Math.random() * 10000;
        const faunaSize = (fauna && typeof fauna.size === 'number') ? fauna.size : 20;

        return {
            name: existingName || generatedName,
            species,
            description: this._generateAlienDescription(species, faunaSeed),
            portraitColor,
            seed: faunaSeed,
            size: faunaSize,
            boardedAt: Date.now()
        };
    }

    _generateAlienDescription(species, seed) {
        const pick = (arr) => arr[Math.floor((Math.sin(seed * arr.length * 1.7 + arr.length) * 0.5 + 0.5) * arr.length)];

        const personality = pick(['curious', 'calm', 'skittish', 'playful', 'watchful', 'bold', 'gentle', 'restless']);
        const trait = pick(['unusual intelligence', 'peculiar habits', 'odd sleeping patterns', 'a soothing presence', 'sharp instincts', 'endless energy', 'strange vocalizations', 'an uncanny sense of direction']);
        const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

        const bySpecies = {
            SlitherCreature: [
                `A sinuous creature that glides silently through the ship corridors. ${cap(personality)} by nature, it shows ${trait}.`,
                `This serpentine alien undulates along walls and pipes. It seems to prefer warmth and demonstrates ${trait}.`,
                `A ribbon-like being that weaves between equipment. Its ${trait} has impressed the crew.`,
            ],
            FloaterCreature: [
                `A delicate jellyfish-like being that drifts through the cabin. ${cap(personality)} and nearly weightless, it exhibits ${trait}.`,
                `This bioluminescent floater pulses with soft light. It shows ${trait} and seems unbothered by zero-g.`,
                `A translucent drifter that hovers near the viewport. Its ${trait} makes it hypnotic to watch.`,
            ],
            RollerCreature: [
                `A spiky ball-creature that rolls freely around the cargo bay. ${cap(personality)}, with ${trait}.`,
                `This compact creature tucks into a ball when startled. Its ${trait} has surprised the crew more than once.`,
                `A rounded alien that bounces off bulkheads with enthusiasm. Displays ${trait} in abundance.`,
            ],
            StalkCreature: [
                `A tall, spindly creature that perches on high fixtures. ${cap(personality)}, it watches everything with ${trait}.`,
                `This long-limbed alien moves with deliberate grace. It displays ${trait} and an uncanny awareness of its surroundings.`,
                `A towering, elegant creature that stalks the upper gantries. Its ${trait} is immediately apparent.`,
            ],
            HopperCreature: [
                `A squat, bounding creature that ricochets around the hull. ${cap(personality)}, it shows ${trait}.`,
                `This compact hopper leaps between perches with ease. It has ${trait} and seems to enjoy zero-g.`,
                `A stubby leaper that navigates the ship with surprising precision. Exhibits ${trait}.`,
            ],
            GliderCreature: [
                `A wide, winged creature that sails silently through the ship. ${cap(personality)} in disposition, it shows ${trait}.`,
                `This triangular flier banks and circles the cockpit. Its ${trait} makes it a strangely calming presence.`,
                `A graceful glider that rides air currents from the life-support vents. Possesses ${trait}.`,
            ],
            HexapodCreature: [
                `A six-legged beetle that scuttles along the walls. ${cap(personality)}, it demonstrates ${trait}.`,
                `This armoured hexapod clicks and taps on surfaces. Its ${trait} and methodical movement suggest high intelligence.`,
                `A compact, chitinous creature that patrols the lower decks. Shows ${trait} in everything it does.`,
            ],
        };

        const companionPowerText = (typeof Player !== 'undefined' && typeof Player.getAlienCompanionPowerTextBySpecies === 'function')
            ? Player.getAlienCompanionPowerTextBySpecies(species)
            : 'No special power identified yet.';

        const lines = bySpecies[species];
        if (lines) {
            return `${pick(lines)} Companion power: ${companionPowerText}`;
        }
        return `A ${personality} alien lifeform with ${trait}. It seems perfectly at home aboard the ship. Companion power: ${companionPowerText}`;
    }

    _generateRandomAlienName() {
        const starts = ['Xa', 'Ze', 'Ka', 'Vor', 'Tha', 'Qui', 'Ny', 'Ra', 'Lo', 'My'];
        const middles = ['li', 're', 'na', 'xo', 've', 'sha', 'tri', 'mo', 'za', 'ko'];
        const ends = ['n', 'th', 'x', 'ra', 'm', 'l', 'k', 's', 'v', 'q'];

        const pick = (list) => list[Math.floor(Math.random() * list.length)];
        return `${pick(starts)}${pick(middles)}${pick(ends)}`;
    }

    /**
     * Update astronaut physics and logic
     */
    _updateAstronaut(dt) {
        if (typeof gameStateManager !== 'undefined' && gameStateManager && gameStateManager.currentState !== 'SURFACE_MODE') {
            if (this.player && this.player.vel) {
                this.player.vel.mult(0);
            }
            if (this.player) {
                this.player.isDockedAndInvulnerable = true;
            }
            if (this.astronaut && this.astronaut.vel) {
                this.astronaut.vel.mult(0);
            }
            return;
        }

        // Defensive guard: if astronaut or essential positions are missing,
        // fall back to ship control to avoid null-dereferences during update.
        if (!this.astronaut || !this.astronaut.pos || !this.player || !this.player.pos) {
            if (this.controlMode === 'ASTRONAUT') {
                console.warn('SurfaceMode: astronaut or player pos missing during _updateAstronaut — switching to SHIP control.');
                this.controlMode = 'SHIP';
            }
            return;
        }

        // Handle Input
        const isMoving = this.astronaut.handleInput(this);

        // Physics update
        this.astronaut.update(dt);

        // [STORM CRITICAL FIX]
        // Reset environment flags that were removed from Player.update().
        // Since StarSystem.update() doesn't run on surface, we must reset them here
        // to prevent sticky debuffs from space storms or surface effects.
        if (this.player) {
            this.player.targetingDisruption = 0;
            this.player.shieldsDisabled = false;
            this.player.weaponsDisabled = false;
            this.player.inNebula = false;

            // Ensure player internal state (like particle systems, drag, etc.) 
            // continues to update even when in ASTRONAUT mode.
            // player.handleInput() is NOT called here, preventing "ghost" movements.
            this.player.update();
        }

        // Terrain Clamping
        const groundH = this._getTerrainHeightAt(this.astronaut.pos.x, this.astronaut.pos.y);
        this.astronaut.altitude = groundH; // Snap to ground

        // Sync camera focus to astronaut
        this.surfaceX = this.astronaut.pos.x;
        this.surfaceY = this.astronaut.pos.y;
        this.playerAngle = this.astronaut.facingAngle || 0;
        this.radarAltitude = 0; // Astronaut is on the ground
        this.altitude = groundH + 30; // Camera height above astronaut (closer than ship)

        // Check for Boarding (proximity to ship)
        // Use a dual-distance check to handle both physical and visual/parallax positions,
        // and allow boarding while moving if not on cooldown.
        if (this.boardCooldown <= 0) {
            const dist2D = p5.Vector.dist(this.astronaut.pos, this.player.pos);

            const extrusionAngle = this._getExtrusionAngle();
            const sinE = Math.sin(extrusionAngle);
            const cosE = Math.cos(extrusionAngle);

            const shipAlt = this.player.altitude || 0;
            const shipVisX = this.player.pos.x - shipAlt * sinE;
            const shipVisY = this.player.pos.y - shipAlt * cosE;

            const astroAlt = this.astronaut.altitude || 0;
            const astroVisX = this.astronaut.pos.x - astroAlt * sinE;
            const astroVisY = this.astronaut.pos.y - astroAlt * cosE;

            const distVisual = Math.hypot(astroVisX - shipVisX, astroVisY - shipVisY);
            const boardingRange = Math.max(SURFACE_CONFIG.BOARDING_RANGE, (this.player.size || 30) * 0.5 + 15);

            if (dist2D < boardingRange || distVisual < boardingRange) {
                this.boardShip();
                return; // Immediately return to avoid using this.astronaut after it was nulled
            }
        }

        // Detect entering a player-built base: if astronaut walks into a player-built OffworldBuilding,
        // open the Base Services menu.
        if (this.surfaceObjects && Array.isArray(this.surfaceObjects) && this.astronaut && this.astronaut.pos) {
            for (const obj of this.surfaceObjects) {
                if (!obj || obj.destroyed || !obj.pos) continue;
                const isOffworld = (obj.constructor && (obj.constructor.name === 'OffworldBuilding' || obj.constructor.name === 'PlayerBase')) || (obj.type === 'OffworldBuilding' || obj.type === 'PlayerBase');
                if (!isOffworld) continue;
                if (!obj.playerBuilt) continue;

                const dx = obj.pos.x - this.astronaut.pos.x;
                const dy = obj.pos.y - this.astronaut.pos.y;
                const distSq = dx * dx + dy * dy;
                const entryRadius = Math.max((obj.size || 40) / 2, 30);
                if (distSq <= entryRadius * entryRadius) {
                    if (typeof uiManager !== 'undefined' && uiManager) uiManager.currentBaseObject = obj;
                    if (typeof gameStateManager !== 'undefined' && gameStateManager) {
                        gameStateManager._returnFromBaseState = 'SURFACE_MODE';
                        try {
                            gameStateManager.setState('VIEWING_BASE');
                        } catch (e) { /* ignore */ }
                        // Save game on entering base so player-built bases persist immediately
                        try { if (typeof saveGame === 'function') saveGame(); } catch (e) { /* ignore save errors */ }
                    }
                    return; // stop further astronaut processing this frame
                }
            }
        }
    }

    /**
     * Attempt to befriend nearby fauna
     * Triggered by 'F' key
     */
    /**
     * Attempt to befriend nearby fauna
     * @param {SurfaceFauna} [specificTarget] - Optional specific target to befriend
     */
    _attemptBefriend(specificTarget) {
        if (!this.astronaut || !this.surfaceObjects) return;

        let nearest = specificTarget || null;

        if (nearest && (nearest.destroyed || p5.Vector.dist(this.astronaut.pos, nearest.pos) > 60)) {
            nearest = null;
        }

        if (!nearest) {
            let minDist = 60; // Interaction range
            for (const obj of this.surfaceObjects) {
                if (!obj || obj.destroyed || !obj.isFauna) continue;

                const d = p5.Vector.dist(this.astronaut.pos, obj.pos);
                if (d < minDist) {
                    minDist = d;
                    nearest = obj;
                }
            }
        }

        if (nearest) {
            if (nearest.isFriend) {
                if (typeof uiManager !== 'undefined') uiManager.addMessage("This creature is already your friend!", [100, 255, 200]);
            } else {
                nearest.isFriend = true;
                nearest.friendTarget = this.astronaut;
                nearest.targetBase = null; // Forget any hostility
                if (typeof uiManager !== 'undefined') uiManager.addMessage("You befriend the alien creature!", [100, 255, 150]);
            }
        } else {
            if (typeof uiManager !== 'undefined') uiManager.addMessage("No creatures nearby to befriend.", [200, 200, 200]);
        }
    }

    /**
     * Attempt to build a hab unit in front of the astronaut.
     * Simple placement: a fixed-distance spawn that checks for space and snaps to terrain.
     */
    _attemptBuildHabUnit() {
        if (!this.astronaut || !this.surfaceObjects) return;

        const distance = 80;
        const angle = this.astronaut.facingAngle || 0;
        const bx = this.astronaut.pos.x + Math.cos(angle) * distance;
        const by = this.astronaut.pos.y + Math.sin(angle) * distance;

        // Sample terrain height and set yOffset
        const groundH = this._getTerrainHeightAt(bx, by);

        // Check for collisions with nearby surface objects
        const minClearance = SURFACE_CONFIG.HAB_UNIT_SIZE;
        for (const obj of this.surfaceObjects) {
            if (!obj || obj.destroyed || !obj.pos) continue;
            const dx = obj.pos.x - bx;
            const dy = obj.pos.y - by;
            const distSq = dx * dx + dy * dy;
            const safeDist = ((obj.size || 40) / 2 + minClearance) ** 2;
            if (distSq < safeDist) {
                if (typeof uiManager !== 'undefined') uiManager.addMessage('Not enough space to build here', [255, 160, 100]);
                return;
            }
        }

        if (typeof PlayerBase === 'undefined') {
            if (typeof uiManager !== 'undefined') uiManager.addMessage('Build failed: building module missing', [255, 80, 80]);
            return;
        }

        const size = 60;
        const hab = new PlayerBase(bx, by, size, Math.floor(Math.random() * 100000));
        hab.variant = 1; // HAB UNIT variant in OffworldBuilding
        hab.displayName = 'Hab Unit (Player Built)';
        hab.yOffset = groundH;
        hab.size = size;

        // mark as player-built so entry detection and UI can identify it
        hab.playerBuilt = true;

        this.surfaceObjects.push(hab);

        // Add to planet persistent descriptors so it survives saves and grid regeneration
        if (this.planet) {
            const descriptor = {
                type: hab.type || 'PlayerBase',
                x: hab.pos ? hab.pos.x : hab.x || bx,
                y: hab.pos ? hab.pos.y : hab.y || by,
                size: hab.size || size,
                seed: hab.seed || null,
                variant: (typeof hab.variant !== 'undefined') ? hab.variant : null,
                yOffset: (typeof hab.yOffset !== 'undefined') ? hab.yOffset : 0,
                displayName: hab.displayName || null,
                destroyed: !!hab.destroyed
            };
            if (!Array.isArray(this.planet.playerBuiltSurfaceObjects)) this.planet.playerBuiltSurfaceObjects = [];
            this.planet.playerBuiltSurfaceObjects.push(descriptor);
        }

        // Also cache into the objectCache for the current grid cell so it persists while moving around
        try {
            const cellSize = SURFACE_CONFIG.SPAWN_CELL_SIZE || 35;
            const cellX = Math.floor((bx) / cellSize);
            const cellY = Math.floor((by) / cellSize);
            const cellKey = `${cellX},${cellY}`;

            this.objectCache.set(cellKey, hab);

            // CRITICAL: Also add to the runtime map so _spawnObjects can find it when grid shifts
            // Re-use descriptor from above (or create minimal one if this.planet was null)
            const mapDesc = {
                type: hab.type || 'PlayerBase',
                x: hab.pos ? hab.pos.x : hab.x || bx,
                y: hab.pos ? hab.pos.y : hab.y || by,
                size: hab.size || size,
                seed: hab.seed || null,
                variant: (typeof hab.variant !== 'undefined') ? hab.variant : null,
                yOffset: (typeof hab.yOffset !== 'undefined') ? hab.yOffset : 0,
                displayName: hab.displayName || null,
                destroyed: !!hab.destroyed
            };
            this.playerBuiltMap.set(cellKey, mapDesc);

            // CRITICAL: If this cell was previously marked as destroyed (e.g. we built over a pirate base),
            // we MUST clear that flag so the new building doesn't get skipped during load/respawn.
            if (this.destroyedCells.has(cellKey)) {
                this.destroyedCells.delete(cellKey);
                // Also remove from planet list to persist the "un-destroyed" state
                if (this.planet && Array.isArray(this.planet.destroyedSurfaceObjects)) {
                    const idx = this.planet.destroyedSurfaceObjects.indexOf(cellKey);
                    if (idx !== -1) this.planet.destroyedSurfaceObjects.splice(idx, 1);
                }
                console.log(`[Persistence] Cell ${cellKey} un-destroyed (reclaimed by player).`);
            }

        } catch (e) {
            // Ignore cache errors
        }

        if (typeof uiManager !== 'undefined') uiManager.addMessage('Hab unit constructed', [100, 255, 140]);
        if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
            soundManager.playSound('build');
        }

        // Open base services menu immediately after constructing a player base
        if (typeof uiManager !== 'undefined' && uiManager) {
            try {
                uiManager.currentBaseObject = hab;
                if (typeof gameStateManager !== 'undefined' && gameStateManager) {
                    gameStateManager._returnFromBaseState = 'SURFACE_MODE';
                    gameStateManager.setState('VIEWING_BASE');
                }
            } catch (e) { /* ignore if UI not ready */ }
        }

        // Trigger a save so built structures persist (if available)
        if (typeof saveGame === 'function') {
            try { saveGame(); } catch (e) { /* ignore save errors */ }
        }
    }

    /**
     * Calculate visual bounds for collision and rendering
     * Hit detection uses only the base plate on the ground surface
     * @private
     */
    _getVisualBounds(obj) {
        // Visual Base Position (accounting for terrain yOffset)
        const visualBaseY = this._toVisualY(obj.pos.y, obj.yOffset || 0);

        // For hit detection, we only care about the base plate on the ground
        // Use the object's footprint size for collision radius
        return {
            base: { x: obj.pos.x, y: visualBaseY },
            // Hit detection radius should match the base footprint only
            radius: Math.max((obj.size || 40) / 2, 10)
        };
    }

    /**
     * Calculate viewport bounds for culling based on altitude and player position
     * @param {number} padding - Extra padding to avoid pop-in at edges (default: 200)
     * @returns {{minX: number, maxX: number, minY: number, maxY: number}} Viewport bounds
     * @private
     */
    _getViewportBounds(padding = 200) {
        // Use optional chaining for safer null access
        if (!this.player?.pos) {
            return { minX: 0, maxX: width, minY: 0, maxY: height };
        }

        // Validate padding is non-negative to prevent invalid bounds
        const safePadding = Math.max(0, padding || 0);

        // Validate altitude is within reasonable bounds to prevent NaN propagation
        // Use Number.isNaN for reliable NaN detection
        const safeAltitude = Number.isNaN(this.altitude) ? SURFACE_CONFIG.DEFAULT_ALTITUDE :
            Math.max(0, Math.min(this.altitude, SURFACE_CONFIG.MAX_ALTITUDE * 2));

        return SurfaceUtils.getViewportBounds(
            this.surfaceX,
            this.surfaceY,
            safeAltitude,
            width,
            height,
            safePadding
        );
    }

    /**
     * Check collisions between projectiles and surface objects
     * Coordinates all collision checks for surface mode
     */
    _checkSurfaceCollisions() {
        if (!this.starSystem || !this.starSystem.projectiles) return;

        this._checkProjectileTerrainCollisions();
        this._checkPlayerProjectileCollisions();
        this._checkEnemyProjectileCollisions();
        this._checkEnemyProjectileCollisionsVsStructures(); // Check drone/turret hits on bases and robots
        // Fauna-robot and fauna-building collisions are handled within their respective update() methods
        // to maintain performance and localized behavior.
    }

    /**
     * Check projectile-terrain collisions (ground hits)
     * @private
     */
    _checkProjectileTerrainCollisions() {
        for (let proj of this.starSystem.projectiles) {
            if (!this._isProjectileValid(proj)) continue;

            const projPos = proj.pos;

            // Terrain collision disabled: Projectiles are energy weapons traveling through air
            // They should not hit terrain immediately at low altitude
        }
    }

    /**
     * Check player projectile hits on surface objects
     * @private
     */
    _checkPlayerProjectileCollisions() {
        if (!this.surfaceObjects || this.surfaceObjects.length === 0) return;

        for (let proj of this.starSystem.projectiles) {
            if (!this._isProjectileValid(proj)) continue;
            if (proj.owner !== this.player) continue;

            const projPos = proj.pos;
            const projAlt = proj.altitude || 0;

            for (let obj of this.surfaceObjects) {
                if (!obj || obj.destroyed || !obj.pos) continue;

                // Use VISUAL coordinates for collision (what the player sees on screen)
                const objAlt = obj.altitude || obj.yOffset || 0; // Needed for debug logging

                // For turrets, use head/muzzle position (they're tall structures with X and Y offsets)
                let objVisualX, objVisualY;
                if (obj.type === "Turret") {
                    // Use turret's stored altitude (base + head) for consistent collisions
                    const turretAlt = obj.altitude || obj.yOffset || 0;
                    objVisualX = this._toVisualX(obj.pos.x, turretAlt);
                    objVisualY = this._toVisualY(obj.pos.y, turretAlt);
                } else {
                    // For drones and other objects, use altitude
                    objVisualX = this._toVisualX(obj.pos.x, objAlt);
                    objVisualY = this._toVisualY(obj.pos.y, objAlt);
                }

                // Calculate projectile visual position
                const projVisualX = this._toVisualX(projPos.x, projAlt);
                const projVisualY = this._toVisualY(projPos.y, projAlt);

                // Distance check using visual coordinates
                const dx = projVisualX - objVisualX;
                const dy = projVisualY - objVisualY;
                const distSq = dx * dx + dy * dy;

                // Use the object's logical footprint radius
                const hitRadius = Math.max((obj.size || 40) * 0.6, 20);
                const hitRadiusSq = hitRadius * hitRadius;

                if (distSq < hitRadiusSq) {

                    obj.takeDamage(proj.damage || 10);

                    // Apply tangle effect if this is a tangle projectile
                    if (proj.type === 'tangle' && typeof obj.applyDragEffect === 'function') {
                        obj.applyDragEffect(
                            proj.tangleDuration || 5.0,
                            proj.dragMultiplier || 10.0,
                            proj.rotationBlockMultiplier || 0.1
                        );
                        if (typeof uiManager !== 'undefined' && uiManager) {
                            uiManager.addMessage(`${obj.getDisplayName()} caught in energy tangle!`, "#30FFB4");
                        }
                    }

                    proj.destroyed = true;

                    // Create explosion at the visual impact point using unified standard
                    this._createSurfaceExplosion(projPos.x, projPos.y, projAlt, 10, [255, 150, 50]);

                    if (typeof soundManager !== 'undefined' && this.player) {
                        soundManager.playWorldSound('hit', projPos.x, projPos.y, this.player.pos, obj);
                    }
                    break;
                }
            }
        }
    }

    /**
     * Check enemy projectile hits on player
     * @private
     */
    _checkEnemyProjectileCollisions() {
        const target = (this.controlMode === 'ASTRONAUT') ? this.astronaut : this.player;
        if (!target || target.destroyed) return;

        for (let proj of this.starSystem.projectiles) {
            if (!this._isProjectileValid(proj)) continue;
            // Don't hit self
            if (proj.owner === target || proj.owner === this.player) continue;

            // Use VISUAL coordinates for collision (what the player sees on screen)
            const projAlt = proj.altitude || 0;
            const targetAlt = target.altitude || 0;

            // Calculate visual positions (accounting for altitude/perspective)
            const projVisualX = this._toVisualX(proj.pos.x, projAlt);
            const projVisualY = this._toVisualY(proj.pos.y, projAlt);
            const targetVisualX = this._toVisualX(target.pos.x, targetAlt);
            const targetVisualY = this._toVisualY(target.pos.y, targetAlt);

            // Distance check in screen/visual space
            const dx = projVisualX - targetVisualX;
            const dy = projVisualY - targetVisualY;
            const distSq = dx * dx + dy * dy;

            // Use appropriate hit radius (astronaut is smaller than ship)
            const hitRadius = (target.size || 20) / 2;
            const hitRadiusSq = hitRadius * hitRadius;

            if (distSq < hitRadiusSq) {
                target.takeDamage(proj.damage || 5);
                this._createSurfaceExplosion(proj.pos.x, proj.pos.y, proj.altitude, target === this.astronaut ? 10 : 15, [255, 50, 50]);
                proj.destroyed = true;
            }
        }
    }

    /**
     * Check enemy projectile hits on player bases and mining robots
     * @private
     */
    _checkEnemyProjectileCollisionsVsStructures() {
        if (!this.starSystem || !this.starSystem.projectiles) return;

        for (let proj of this.starSystem.projectiles) {
            if (!this._isProjectileValid(proj)) continue;
            // Only check enemy projectiles (pirate/turret/drone)
            if (proj.ownerType !== 'pirate' && proj.ownerType !== 'turret') continue;

            const projPos = proj.pos;
            const projAlt = proj.altitude || 0;
            const projVisualX = this._toVisualX(projPos.x, projAlt);
            const projVisualY = this._toVisualY(projPos.y, projAlt);

            let hitSomething = false;

            // Check against player bases
            if (this.surfaceObjects) {
                for (let obj of this.surfaceObjects) {
                    if (!obj || obj.destroyed || !obj.pos) continue;

                    // Check if it's a player base (Hab Unit)
                    const isPlayerBase = (
                        (obj.constructor && (obj.constructor.name === 'OffworldBuilding' || obj.constructor.name === 'PlayerBase')) &&
                        obj.variant === 1 &&
                        obj.isPlayerBase === true
                    );

                    if (!isPlayerBase) continue;

                    // Calculate visual position for the base
                    const baseAlt = obj.altitude || obj.yOffset || 0;
                    const baseVisualX = this._toVisualX(obj.pos.x, baseAlt);
                    const baseVisualY = this._toVisualY(obj.pos.y, baseAlt);

                    // Distance check
                    const dx = projVisualX - baseVisualX;
                    const dy = projVisualY - baseVisualY;
                    const distSq = dx * dx + dy * dy;

                    const hitRadius = Math.max((obj.size || 40) * 0.6, 20);
                    const hitRadiusSq = hitRadius * hitRadius;

                    if (distSq < hitRadiusSq) {
                        obj.takeDamage(proj.damage || 8);
                        hitSomething = true;
                        break;
                    }
                }
            }

            // Check against mining robots
            if (!hitSomething && this.miningRobots) {
                for (let robot of this.miningRobots) {
                    if (!robot || robot.destroyed) continue;

                    // Calculate visual position for the robot
                    const robotAlt = robot.altitude || robot.yOffset || 0;
                    const robotVisualX = this._toVisualX(robot.pos.x, robotAlt);
                    const robotVisualY = this._toVisualY(robot.pos.y, robotAlt);

                    // Distance check
                    const dx = projVisualX - robotVisualX;
                    const dy = projVisualY - robotVisualY;
                    const distSq = dx * dx + dy * dy;

                    const hitRadius = (robot.size || 20) * 0.6;
                    const hitRadiusSq = hitRadius * hitRadius;

                    if (distSq < hitRadiusSq) {
                        robot.takeDamage(proj.damage || 8, this);
                        hitSomething = true;
                        break;
                    }
                }
            }

            // If we hit something, destroy the projectile and create explosion
            if (hitSomething) {
                proj.destroyed = true;
                this._createSurfaceExplosion(projPos.x, projPos.y, projAlt, 10, [255, 100, 50]);

                if (typeof soundManager !== 'undefined' && this.player) {
                    soundManager.playWorldSound('hit', projPos.x, projPos.y, this.player.pos);
                }
            }
        }
    }


    /**
     * Create explosion with appropriate positioning for surface mode
     * 
     * @param {number} x - World X coordinate  
     * @param {number} worldY - World Y coordinate
     * @param {number} altitude - Altitude above terrain (0 for ground-level explosions)
     * @param {number} size - Explosion size
     * @param {Array} color - RGB color array
     * @param {boolean} silent - If true, suppress explosion sound (default: false)
     */
    _createSurfaceExplosion(worldX, worldY, altitude = 0, size, color, silent = false) {
        if (!this.starSystem) return;

        // Create explosion using the central starSystem API
        // We pass the raw world coordinates and altitude; the Explosion class 
        // and SoundManager now handle visual projection internally.
        if (typeof this.starSystem.addExplosion === 'function') {
            this.starSystem.addExplosion(worldX, worldY, size, color, true, silent, altitude);
        }
    }

    /**
     * Draw surface mode view
     */
    draw() {
        if (this.state === SURFACE_STATE.INACTIVE) return;

        // Draw sky based on planet atmosphere
        if (this.planet && this.planet.hasAtmosphere && this.planet.atmosphereColor) {
            const c = this.planet.atmosphereColor;
            // Tint sky with atmosphere color (opaque)
            // Use 80% brightness for a slightly grounded feel
            background(red(c) * 0.8, green(c) * 0.8, blue(c) * 0.8);
        } else {
            // Dark space sky (no atmosphere)
            background(10, 15, 25);
        }

        if (!this.planet) return;

        // CRITICAL: Only update cache values when in active rendering states
        // During EXITING, continue using last valid cached values for smooth transition
        // This prevents cache corruption during state transitions
        if (this.state !== SURFACE_STATE.EXITING) {
            // Cache frequently-used values for the frame to avoid recalculation
            // These are used by multiple draw methods and LOD calculations
            this._cachedPerspectiveScale = this._getPerspectiveScale();
            this._cachedBaseLODLevel = this.altitude < SURFACE_CONFIG.LOD.DETAIL_THRESHOLD ?
                SURFACE_CONFIG.LOD.FULL_DETAIL : SURFACE_CONFIG.LOD.SIMPLIFIED;
            this._cachedExtrusionAngle = this._getExtrusionAngle();
            this._cachedExtrusionSin = Math.sin(this._cachedExtrusionAngle);
            this._cachedExtrusionCos = Math.cos(this._cachedExtrusionAngle);
            this._cachedCounterScale = this._getCounterScale();
        }

        push();
        // 1. Center camera on screen
        translate(width / 2, height / 2);

        // 2. Perspective scaling (everything world-side scales together)
        // Apply view zoom multiplier (for automatic EVA zoom)
        const isTransitioning = this.state === SURFACE_STATE.ENTERING || this.state === SURFACE_STATE.EXITING;
        const currentZoom = (isTransitioning && this.controlMode !== 'ASTRONAUT') ? 1.0 : this.viewZoom;
        scale(this._cachedPerspectiveScale * currentZoom);

        // 3. World translation (camera follows player's visual top position)
        const visualXOffset = this.altitude * this._cachedExtrusionSin;
        const visualYOffset = this.altitude * this._cachedExtrusionCos;

        // Translate by logic position + altitude shift to center on the projected "top"
        translate(-this.surfaceX + visualXOffset, -(this.surfaceY - visualYOffset));

        // Draw terrain
        this._drawTerrain();

        // Draw surface objects, explosions, and projectiles (all use world coords)
        this._drawSurfaceObjects();
        this._drawMiningRobots(); // Draw mining robots and mineable rocks
        this._drawExplosions();
        this._drawProjectiles();
        this._drawMines();
        if (typeof LightingEffects !== 'undefined') {
            LightingEffects.draw();
        }

        // Draw beam and force wave effects (no projectile, direct rendering)
        this._drawBeams();
        this._drawForceWaves();

        // Draw cloud layer overlay (altitude-based fog that hides LOD reduction)
        // Placed here so terrain/objects/effects are obscured but player remains visible
        this._drawCloudLayer();

        // Transition overlay (white fade) - drawn BEFORE player ship so ship remains visible
        // This creates smooth enter/exit transitions through the cloud layer
        if (this.state === SURFACE_STATE.ENTERING ||
            this.state === SURFACE_STATE.EXITING) {
            this._drawTransitionOverlay();
        }

        // Draw Astronaut (if active)
        this._drawAstronaut();

        // Draw player ship
        this._drawPlayerShip();

        pop();

        // Draw surface-specific HUD (altitude bar, compass)
        if (typeof surfaceHud !== 'undefined' && surfaceHud) {
            surfaceHud.draw(this);
        }

        // Draw game HUD (shields, hull, speed, etc. - NOT scaled)
        // This includes the target overlay, which should be on top
        this._drawGameHUD();
    }

    /**
     * Get sun angle relative to planet surface
     * Uses planet position relative to origin (where sun is) to calculate light direction
     * The angle is locked at surface entry to prevent noticeable sun movement during gameplay
     * @returns {number} Sun angle in radians
     * @private
     */
    _getSunAngle() {
        // Return the locked sun angle calculated at entry
        // This ensures proper lighting direction without the sun noticeably moving during gameplay
        if (this.sunAngle !== undefined) {
            return this.sunAngle;
        }
        return -Math.PI / 4; // Default fallback
    }

    /**
     * Get terrain height at a specific world position
     * Delegates to terrain module for consistent height sampling
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {number} Height at the position
     */
    _getTerrainHeightAt(worldX, worldY) {
        return this.terrain.getHeightAt(worldX, worldY);
    }

    /**
     * Draw terrain mesh with proper lighting
     * Delegates to terrain module for rendering the 3D terrain buffer
     * @private
     */
    _drawTerrain() {
        // Pass the dynamic sun angle to the terrain renderer so mountains are lit correctly
        this.terrain.draw(this._getSunAngle());
    }

    _spawnObjects(gridX, gridY) {
        if (!this.planet) return;

        this.surfaceObjects = [];
        const resolution = SURFACE_CONFIG.MESH_RESOLUTION;
        const cellSize = SURFACE_CONFIG.MESH_SIZE / resolution;
        const planetSeed = this._getPlanetSeed();

        // DEBUG MODE: Spawn exactly one turret and no other buildings
        if (this.debugMode) {
            const cellKey = "DEBUG_CENTER";
            // Check cache first to prevent rotation reset when moving across grid boundaries
            if (this.objectCache.has(cellKey)) {
                const cachedObj = this.objectCache.get(cellKey);
                this.surfaceObjects.push(cachedObj);
                return;
            }

            const turretX = 0;
            const turretY = 500;
            const turretH = this._getTerrainHeightAt(turretX, turretY);
            const debugTurret = new Turret(turretX, turretY);
            debugTurret.yOffset = turretH;
            debugTurret.id = "DEBUG_TURRET";
            debugTurret.cellKey = cellKey;
            this.surfaceObjects.push(debugTurret);
            this.objectCache.set(cellKey, debugTurret);
            return;
        }

        // Use a fixed spawn density independent of visual mesh resolution
        // Previous tuning was based on Resolution 120 over Size 4200 => Cell Size 35
        const SPAWN_CELL_SIZE = SURFACE_CONFIG.SPAWN_CELL_SIZE || 35;
        const spawnResolution = Math.ceil(SURFACE_CONFIG.MESH_SIZE / SPAWN_CELL_SIZE);

        // Iterate over the spawn grid area
        for (let gy = 0; gy < spawnResolution; gy++) {
            for (let gx = 0; gx < spawnResolution; gx++) {
                // Calculate world position based on fixed spawn density
                // Use floor to keep indices integral for hashing
                const activeGridX = Math.floor(gridX * (SURFACE_CONFIG.MESH_SIZE / SURFACE_CONFIG.MESH_RESOLUTION) / SPAWN_CELL_SIZE) + (gx - Math.floor(spawnResolution / 2));
                const activeGridY = Math.floor(gridY * (SURFACE_CONFIG.MESH_SIZE / SURFACE_CONFIG.MESH_RESOLUTION) / SPAWN_CELL_SIZE) + (gy - Math.floor(spawnResolution / 2));

                const cellKey = `${activeGridX},${activeGridY}`;

                // Check cache first
                if (this.objectCache.has(cellKey)) {
                    const cachedObj = this.objectCache.get(cellKey);
                    if (cachedObj) this.surfaceObjects.push(cachedObj);
                    continue;
                }

                // Compute cell values FIRST (needed for both inhabited and uninhabited logic)
                let obj = null;
                const x = activeGridX;
                const y = activeGridY;
                const cellHash = (Math.abs(Math.sin(x * 12.9898 + y * 78.233 + planetSeed) * 43758.5453) % 1);
                const wx = activeGridX * SPAWN_CELL_SIZE;
                const wy = activeGridY * SPAWN_CELL_SIZE;
                const h = this._getTerrainHeightAt(wx, wy);
                const subHash = (cellHash * 123.45) % 1;
                const objSeed = cellHash * 100000;

                // --- 0. DESTRUCTION CHECK ---
                // If this cell was previously destroyed, skip all spawning logic
                if (this.destroyedCells.has(cellKey)) {
                    this.objectCache.set(cellKey, null);
                    continue;
                }

                // Check for any player-built surface objects that belong to this cell
                // OPTIMIZED: Uses pre-indexed map instead of O(N) loop
                const desc = this.playerBuiltMap.get(cellKey);
                if (desc && !desc.destroyed) {
                    // Instantiate known types (OffworldBuilding) or fallback to a generic SurfaceObject
                    if (typeof PlayerBase !== 'undefined' && (desc.type === 'PlayerBase' || (desc.type === 'OffworldBuilding' && desc.variant === 1))) {
                        obj = new PlayerBase(desc.x, desc.y, desc.size || 60, desc.seed || 0);
                        obj.yOffset = (typeof desc.yOffset !== 'undefined') ? desc.yOffset : this._getTerrainHeightAt(desc.x, desc.y);
                        obj.displayName = desc.displayName || obj.displayName;
                        obj.destroyed = !!desc.destroyed;

                        // Restore persistent state for mining bases
                        obj.robotsInitialized = !!desc.robotsInitialized;
                        obj.miningStorage = Array.isArray(desc.miningStorage) ? desc.miningStorage : [];
                        obj.miningStorageCapacity = desc.miningStorageCapacity || 100;
                        // CRITICAL: Don't default to 0! Keep undefined if not set so initialization calculates it
                        obj.robotCount = desc.robotCount;  // May be undefined, 0, or a positive number
                        if (typeof desc.health === 'number') obj.health = desc.health;

                        // Flag instances spawned from saved player descriptors
                        obj.playerBuilt = true;

                        // CRITICAL: Set cellKey for player-built objects (needed for robot initialization)
                        obj.cellKey = cellKey;
                    } else if (typeof OffworldBuilding !== 'undefined' && (String(desc.type).toLowerCase().indexOf('offworld') !== -1 || desc.type === 'OffworldBuilding')) {
                        obj = new OffworldBuilding(desc.x, desc.y, desc.size || 40, desc.seed || 0);
                        if (typeof desc.variant !== 'undefined') obj.variant = desc.variant;
                        obj.yOffset = (typeof desc.yOffset !== 'undefined') ? desc.yOffset : this._getTerrainHeightAt(desc.x, desc.y);
                        obj.displayName = desc.displayName || obj.displayName;
                        obj.destroyed = !!desc.destroyed;
                        obj.playerBuilt = true;
                        obj.cellKey = cellKey;
                    } else if (typeof SurfaceObject !== 'undefined') {
                        obj = new SurfaceObject(desc.x, desc.y, desc.size || 40);
                        obj.yOffset = (typeof desc.yOffset !== 'undefined') ? desc.yOffset : this._getTerrainHeightAt(desc.x, desc.y);
                        obj.cellKey = cellKey;
                    }
                }

                // --- 1. SHIELD GENERATOR (Planet Boss) ---
                // [CRITICAL FIX] Check for generator spawning FIRST, before zone or habitation checks.
                // This ensures it ALWAYS spawns in its calculated valley, even on wilderness/uninhabited planets.
                // FIX: Use the actual target cell coordinates to ensure only ONE cell spawns the generator
                const targetCellX = this.targetPos ? Math.floor(this.targetPos.x / SPAWN_CELL_SIZE) : null;
                const targetCellY = this.targetPos ? Math.floor(this.targetPos.y / SPAWN_CELL_SIZE) : null;
                const isTargetCell = targetCellX !== null &&
                    activeGridX === targetCellX &&
                    activeGridY === targetCellY;

                // [NEW] 25% chance to spawn Shield Generator on uninhabited planets.
                // Use the planet's seed to make it deterministic.
                const planetSeedVal = (this.planet && this.planet.seed) ? this.planet.seed : 0;
                // Use a large prime multiplier to decorrelate from other RNG
                const genSpawnChance = (Math.abs(Math.sin(planetSeedVal * 99.123)) * 10000) % 1;
                const isUninhabited = this.planet && !this.planet.isInhabited;
                // Allow spawn if inhabited OR (uninhabited AND chance < 0.25)
                const allowGeneratorSpawn = !isUninhabited || (genSpawnChance < 0.25);

                if (isTargetCell && typeof ShieldGenerator !== 'undefined' && allowGeneratorSpawn) {
                    // Create generator at the actual target position, not the cell center
                    obj = new ShieldGenerator(this.targetPos.x, this.targetPos.y);
                    obj.yOffset = h;
                    obj.cellKey = cellKey;
                    this.surfaceObjects.push(obj);
                    this.objectCache.set(cellKey, obj);
                    continue; // Skip the rest for this cell
                }

                // --- BOSS BASE DETECTION (DEBUG: Works on all planets) ---
                let isNearTarget = false;
                if (this.targetPos) {
                    const tdx = wx - this.targetPos.x;
                    const tdy = wy - this.targetPos.y;
                    const distToTargetSq = tdx * tdx + tdy * tdy;
                    if (distToTargetSq < 4000000) { // 2000^2
                        isNearTarget = true;
                    }
                }

                // If we disallowed the generator spawn (due to 25% chance), we should also disable
                // the "near target" flag so we don't spawn a defense grid around nothing.
                if (!allowGeneratorSpawn) {
                    isNearTarget = false;
                }

                if (!obj) {
                    // 0. Habitation Check - Uninhabited planets spawn secret caches instead
                    // [DEBUG FIX] If near target, we ignore the habitability check to spawn the boss base
                    if (this.planet && !this.planet.isInhabited && !isNearTarget) {
                        // SECRET CACHE SPAWNING for uninhabited planets
                        if (cellHash < 0.00005 && typeof SecretCache !== 'undefined') {
                            obj = new SecretCache(wx, wy, objSeed);
                        }
                    } else if (this.planet && (this.planet.isInhabited || isNearTarget)) {
                        // INHABITED PLANETS: Buildings and urban development
                        // Settlement Zones: Large areas where buildings cluster
                        const settlementNoise = noise(activeGridX * 0.015 + 500, activeGridY * 0.015 + 500);
                        const isSettlementZone = settlementNoise > 0.60;
                        const isHighTerrain = h > SURFACE_CONFIG.HIGH_TERRAIN_THRESHOLD;

                        // Get civilization color and economy type for buildings
                        const civColor = (this.planet && this.planet.cityLightsColor) ? this.planet.cityLightsColor : null;
                        const economyType = this.planet?.economyType || 'Service';
                        const techLevel = this.planet?.techLevel || 3;

                        // Calculate defense density using helper method
                        const distToTargetSq = isNearTarget ?
                            (wx - this.targetPos.x) ** 2 + (wy - this.targetPos.y) ** 2 : 0;
                        const defenseDensity = this._calculateDefenseDensity(
                            economyType,
                            techLevel,
                            isNearTarget,
                            distToTargetSq
                        );

                        const buildingSize = 40 + (subHash * 40);

                        // --- 1. Strategic Defense (High Ground) ---
                        if (isHighTerrain || isNearTarget) {
                            if (cellHash < defenseDensity) {
                                let turretRatio = 0.3 + (techLevel / 5) * 0.4;
                                if (subHash < (1 - turretRatio) * 0.5) obj = new DefenseDrone(wx, wy);
                                else obj = new Turret(wx, wy);
                            }
                        }
                        // --- 2. Settlements (Low/Mid Ground) ---
                        else if (isSettlementZone) {
                            if ((Math.abs(activeGridX) + Math.abs(activeGridY)) % 2 === 0) {
                                if (cellHash < 0.10 || isNearTarget) {
                                    if (subHash < 0.03 && !isNearTarget) {
                                        const stSize = 100 + (subHash * 1000);
                                        obj = new SurfaceStation(wx, wy, stSize, civColor);
                                    } else {
                                        obj = this._createEconomyBuilding(economyType, wx, wy, buildingSize, objSeed);
                                    }
                                }
                            }
                        }
                        // --- 3. Outskirts / Wilderness ---
                        else {
                            if (cellHash < 0.003) {
                                if (subHash < 0.25) obj = new DefenseDrone(wx, wy);
                                else obj = this._createEconomyBuilding(economyType, wx, wy, 30, objSeed);
                            }
                        }
                    }

                    // --- 4. Flora and Fauna (scattered across landscape) ---
                    // Spawn on ALL planets (inhabited and uninhabited) if no building/defense was placed
                    if (!obj && this.planet) {
                        // Get planet colors for flora/fauna
                        const planetColors = this.planet.palette || [
                            this.planet.baseColor,
                            this.planet.featureColor1,
                            this.planet.featureColor2,
                            this.planet.featureColor3
                        ];

                        // Per-planet density variation (some planets have almost none)
                        // Use planet's feature random for consistent density per planet
                        const DENSITY_WAVE_FREQUENCY = 0.01;  // How fast density varies across planets
                        const DENSITY_AMPLITUDE = 0.5;        // Half range of variation
                        const DENSITY_BASELINE = 0.5;         // Center point (0.5 = 50%)
                        const densityFactor = this.planet.featureRand ?
                            (Math.sin(this.planet.featureRand * DENSITY_WAVE_FREQUENCY) * DENSITY_AMPLITUDE + DENSITY_BASELINE) : DENSITY_BASELINE;

                        // Log density once per spawn cycle
                        if (gx === 0 && gy === 0) {
                            console.log(`[Spawn] Planet ${this.planet.name} Global Density Factor: ${densityFactor.toFixed(3)}`);
                        }

                        // Inhabited vs Uninhabited spawning rules
                        if (this.planet.isInhabited) {
                            // INHABITED: Only flora, no fauna (civilization has displaced wildlife)
                            // Urban areas have very sparse flora, outskirts slightly more
                            const settlementNoise = noise(activeGridX * 0.015 + 500, activeGridY * 0.015 + 500);
                            const isSettlementZone = settlementNoise > 0.60;
                            const inhabitedFloraProb = isSettlementZone ? 0.001 : 0.005;
                            const densityThreshold = isSettlementZone ? 0.7 : 0.4;

                            if (cellHash < inhabitedFloraProb && densityFactor > densityThreshold) {
                                // Sample species noise for clustering
                                // Lower frequency (0.03) creates larger, more coherent biomes
                                const speciesNoise = noise(activeGridX * 0.03 + 1000, activeGridY * 0.03 + 1000);

                                // Spatial Color Noise: "Evolutionary Patterns"
                                // Generate a separate low-frequency noise for color traits
                                const colorNoise = noise(activeGridX * 0.03 + 5000, activeGridY * 0.03 + 5000);

                                // Pass color context without modifying the original array
                                const colorContext = [...planetColors];
                                colorContext.spatialNoise = colorNoise;

                                obj = this._createFlora(colorContext, wx, wy, objSeed, speciesNoise);
                            }
                        } else {
                            // UNINHABITED: Both flora and fauna thrive in organic patterns
                            // Scale density noise for variety (barren vs lush)
                            const organicDensity = noise(activeGridX * 0.04 + 2000, activeGridY * 0.04 + 2000);

                            // Dynamic thresholds: Lush planets (densityFactor=1) have moderate thresholds
                            // Barren planets (densityFactor=0) have high thresholds, creating rare pockets
                            const floraThreshold = 0.85 - (0.45 * densityFactor);
                            const faunaThreshold = 0.9 - (0.35 * densityFactor);

                            // Flora spawning
                            if (organicDensity > floraThreshold) {
                                const floraProb = 0.01 + (0.09 * densityFactor);
                                if (cellHash < floraProb) {
                                    // Lower frequency (0.03) creates larger, more coherent biomes
                                    const speciesNoise = noise(activeGridX * 0.03 + 1000, activeGridY * 0.03 + 1000);

                                    // Spatial Color Noise
                                    const colorNoise = noise(activeGridX * 0.03 + 5000, activeGridY * 0.03 + 5000);
                                    const colorContext = [...planetColors];
                                    colorContext.spatialNoise = colorNoise;

                                    obj = this._createFlora(colorContext, wx, wy, objSeed, speciesNoise);
                                }
                            }

                            // Fauna spawning (can now happen in its own zones or alongside flora)
                            if (!obj && organicDensity > faunaThreshold) {
                                const faunaProb = 0.01 + (0.05 * densityFactor);
                                // Use subHash for independent luck roll vs flora
                                if (subHash < faunaProb) {
                                    const speciesNoise = noise(activeGridX * 0.12 + 3000, activeGridY * 0.12 + 3000);
                                    obj = this._createFauna(planetColors, wx, wy, objSeed, speciesNoise);
                                    if (obj) {
                                        console.log(`[Spawn] Spawned organic fauna ${obj.constructor.name} at ${cellKey} (Density Factor: ${densityFactor.toFixed(2)})`);
                                    }
                                }
                            }
                        }
                    }
                }

                // If an object was created, finalize and cache it
                if (obj) {
                    obj.yOffset = h;
                    obj.cellKey = cellKey; // Store the key for persistence when destroyed
                    // Initialize culling state flag for hysteresis logic
                    obj._wasCulledLastFrame = false;
                    this.surfaceObjects.push(obj);
                    this.objectCache.set(cellKey, obj);
                } else {
                    this.objectCache.set(cellKey, null);
                }
            }
        }

        // Periodically clean cache to prevent memory leak (remove distant objects)
        if (frameCount % SURFACE_CONFIG.CACHE_CLEANUP_INTERVAL === 0) {
            const keepRadius = spawnResolution * 1.5;
            const centerSpawnGridX = Math.floor(gridX * (SURFACE_CONFIG.MESH_SIZE / SURFACE_CONFIG.MESH_RESOLUTION) / SPAWN_CELL_SIZE);
            const centerSpawnGridY = Math.floor(gridY * (SURFACE_CONFIG.MESH_SIZE / SURFACE_CONFIG.MESH_RESOLUTION) / SPAWN_CELL_SIZE);

            for (const [key, obj] of this.objectCache) {
                const [ox, oy] = key.split(',').map(Number);
                if (Math.abs(ox - centerSpawnGridX) > keepRadius || Math.abs(oy - centerSpawnGridY) > keepRadius) {
                    this.objectCache.delete(key);
                }
            }
        }
    }

    /**
     * Create an economy-specific building based on the planet's economy type
     * @param {string} economyType - The planet's economy type
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} size - Building size
     * @param {number} seed - Random seed for variation
     * @returns {SurfaceObject} The created building
     */
    _createEconomyBuilding(economyType, x, y, size, seed) {
        // Map economy types to their specific building classes
        switch (economyType) {
            case 'Imperial':
                return typeof ImperialBuilding !== 'undefined'
                    ? new ImperialBuilding(x, y, size, seed)
                    : new Building(x, y, size, 'skyscraper', seed);
            case 'Separatist':
                return typeof SeparatistBuilding !== 'undefined'
                    ? new SeparatistBuilding(x, y, size, seed)
                    : new Building(x, y, size, 'factory', seed);
            case 'Military':
                return typeof MilitaryBuilding !== 'undefined'
                    ? new MilitaryBuilding(x, y, size, seed)
                    : new Building(x, y, size, 'factory', seed);
            case 'Post Human':
                return typeof PostHumanBuilding !== 'undefined'
                    ? new PostHumanBuilding(x, y, size, seed)
                    : new Building(x, y, size, 'skyscraper', seed);
            case 'Offworld':
                return typeof OffworldBuilding !== 'undefined'
                    ? new OffworldBuilding(x, y, size, seed)
                    : new Building(x, y, size, 'silo', seed);
            case 'Mining':
                return typeof MiningBuilding !== 'undefined'
                    ? new MiningBuilding(x, y, size, seed)
                    : new Building(x, y, size, 'factory', seed);
            case 'Industrial':
                return typeof IndustrialBuilding !== 'undefined'
                    ? new IndustrialBuilding(x, y, size, seed)
                    : new Building(x, y, size, 'factory', seed);
            case 'Refinery':
                return typeof RefineryBuilding !== 'undefined'
                    ? new RefineryBuilding(x, y, size, seed)
                    : new Building(x, y, size, 'silo', seed);
            case 'Agricultural':
                return typeof AgriculturalBuilding !== 'undefined'
                    ? new AgriculturalBuilding(x, y, size, seed)
                    : new Building(x, y, size, 'silo', seed);
            case 'Service':
            default:
                return typeof ServiceBuilding !== 'undefined'
                    ? new ServiceBuilding(x, y, size, seed)
                    : new Building(x, y, size, 'skyscraper', seed);
        }
    }

    /**
     * Create flora based on planet colors and random seed
     * @param {Array} planetColors - Array of planet colors from palette
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} seed - Random seed for variation
     * @param {number} speciesNoise - Noise value (0-1) for species clustering
     * @returns {SurfaceFlora} The created flora
     * @private
     */
    _createFlora(planetColors, x, y, seed, speciesNoise = 0.5) {
        const size = 15 + (seed % 20);

        // Species clustering: use speciesNoise to select the dominant type
        // This creates "groves" or "patches" of same-species flora
        let flora = null;

        // Palette-based species selection (Restricted Palette)
        // Instead of all 8 species appearing on every planet, we pick a palette of 4
        // based on the planet seed. This allows each species to occupy larger chunks of the
        // noise map (0.25 range instead of 0.125), creating much better clustering.
        const planetSeed = this._getPlanetSeed();

        // Deterministically shuffle indices [0..7] using planet seed
        const indices = [0, 1, 2, 3, 4, 5, 6, 7];
        // Fisher-Yates-ish shuffle seeded by planetSeed
        let s = planetSeed;
        for (let i = indices.length - 1; i > 0; i--) {
            s = (s * 1664525 + 1013904223) >>> 0;
            const j = s % (i + 1);
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        // Pick top 4 as the palette for this planet
        const palette = indices.slice(0, 4);

        // Ensure "LuminescentFungi" (index 7) isn't too rare across the galaxy
        // If it was shuffled out, give it a small chance to force its way back in
        // on some planets (simple hack: if planetSeed % 10 == 0, force index 7 into slot 3)
        if (planetSeed % 8 === 0) {
            palette[3] = 7;
        }

        // Map noise (0-1) to 4 buckets (0-3)
        // No complex curves needed, just 4 large buckets
        let bucket = Math.floor(speciesNoise * 4);
        if (bucket > 3) bucket = 3;

        const finalIndex = palette[bucket];

        if (finalIndex === 0 && typeof AlienTree !== 'undefined') {
            flora = new AlienTree(x, y, size, planetColors, seed);
        } else if (finalIndex === 1 && typeof CrystalPlant !== 'undefined') {
            flora = new CrystalPlant(x, y, size, planetColors, seed);
        } else if (finalIndex === 2 && typeof TentaclePlant !== 'undefined') {
            flora = new TentaclePlant(x, y, size, planetColors, seed);
        } else if (finalIndex === 3 && typeof SporeStalk !== 'undefined') {
            flora = new SporeStalk(x, y, size, planetColors, seed);
        } else if (finalIndex === 4 && typeof BubbleBush !== 'undefined') {
            flora = new BubbleBush(x, y, size, planetColors, seed);
        } else if (finalIndex === 5 && typeof HexPalm !== 'undefined') {
            flora = new HexPalm(x, y, size, planetColors, seed);
        } else if (finalIndex === 6 && typeof PyramidCactus !== 'undefined') {
            flora = new PyramidCactus(x, y, size, planetColors, seed);
        } else if (finalIndex === 7 && typeof LuminescentFungi !== 'undefined') {
            flora = new LuminescentFungi(x, y, size, planetColors, seed);
        } else {
            // Fallback
            flora = typeof AlienTree !== 'undefined' ? new AlienTree(x, y, size, planetColors, seed) : null;
        }

        return flora;
    }

    /**
     * Create fauna based on planet colors and random seed
     * @param {Array} planetColors - Array of planet colors from palette
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} seed - Random seed for variation
     * @param {number} speciesNoise - Noise value (0-1) for species clustering
     * @returns {SurfaceFauna} The created fauna
     * @private
     */
    _createFauna(planetColors, x, y, seed, speciesNoise = 0.5) {
        const size = 10 + (seed % 15);

        // Use wrapped noise to keep clusters while fixing distribution bias.
        // Multiplier of 7.0 wraps the noise across the range 7 times, 
        // ensuring all species appear even with normally distributed Perlin noise.
        const balancedNoise = (speciesNoise * 7.0) % 1.0;

        let fauna = null;
        // Species clustering for fauna groups
        if (balancedNoise < 0.14 && typeof SlitherCreature !== 'undefined') {
            fauna = new SlitherCreature(x, y, size, planetColors, seed);
        } else if (balancedNoise < 0.28 && typeof FloaterCreature !== 'undefined') {
            fauna = new FloaterCreature(x, y, size, planetColors, seed);
        } else if (balancedNoise < 0.42 && typeof RollerCreature !== 'undefined') {
            fauna = new RollerCreature(x, y, size, planetColors, seed);
        } else if (balancedNoise < 0.56 && typeof StalkCreature !== 'undefined') {
            fauna = new StalkCreature(x, y, size, planetColors, seed);
        } else if (balancedNoise < 0.70 && typeof HopperCreature !== 'undefined') {
            fauna = new HopperCreature(x, y, size, planetColors, seed);
        } else if (balancedNoise < 0.84 && typeof GliderCreature !== 'undefined') {
            fauna = new GliderCreature(x, y, size, planetColors, seed);
        } else if (typeof HexapodCreature !== 'undefined') {
            fauna = new HexapodCreature(x, y, size, planetColors, seed);
        } else {
            // Fallback
            fauna = typeof SlitherCreature !== 'undefined' ? new SlitherCreature(x, y, size, planetColors, seed) : null;
        }

        // Mark as fauna to avoid expensive constructor.name checks in update loop
        if (fauna) {
            fauna.isFauna = true;
        }

        return fauna;
    }

    /**
     * Calculate defense density for a given cell based on planet tech level and economy
     * @param {string} economyType - The planet's economy type
     * @param {number} techLevel - The planet's tech level (0-5)
     * @param {boolean} isNearTarget - Whether cell is near the shield generator target
     * @param {number} distToTargetSq - Squared distance to target (only used if isNearTarget)
     * @returns {number} Defense density value (0-1 probability)
     * @private
     */
    _calculateDefenseDensity(economyType, techLevel, isNearTarget, distToTargetSq) {
        // Base density from tech level
        let techModifier = 0.0002 + (techLevel / 5) * 0.0003;
        const militaryBonus = (economyType === 'Military') ? 0.001 : 0;
        let defenseDensity = techModifier + militaryBonus;

        // Enhanced density near shield generator base
        if (isNearTarget) {
            // MASSIVELY REDUCED: Ultra-sparse defenses around target (max ~1%)
            defenseDensity = Math.max(defenseDensity, 0.001 + (1 - Math.sqrt(distToTargetSq) / 2000) * 0.005);
        }

        return defenseDensity;
    }

    /**
     * Initialize mining robots for player bases
     * @private
     */
    _initializeMiningRobotsForBases() {
        if (typeof MiningRobot === 'undefined' || typeof OreSeam === 'undefined') return;

        let basesChecked = 0;
        let robotsSpawned = 0;

        // Find all player-built Hab Units (variant 1 of OffworldBuilding)
        for (const obj of this.surfaceObjects) {
            if (!obj || obj.destroyed) continue;

            // Check if it's a player-built Hab Unit
            const isHabUnit = obj.playerBuilt &&
                obj.constructor &&
                (obj.constructor.name === 'OffworldBuilding' || obj.constructor.name === 'PlayerBase') &&
                obj.variant === 1;

            if (!isHabUnit) continue;

            basesChecked++;

            // Initialize storage if needed
            if (!obj.miningStorage) {
                obj.miningStorage = [];
                obj.miningStorageCapacity = MINING_CONFIG.STORAGE_CAPACITY;
            }

            // Check if robots already spawned for this base
            // CRITICAL: Check both object AND descriptor flags because cleanup sets descriptor flag
            const desc = this.playerBuiltMap.get(obj.cellKey);
            const needsRobots = !obj.robotsInitialized || (desc && !desc.robotsInitialized);

            // Debug logging for troubleshooting
            if (typeof DEBUG_MINING !== 'undefined' && DEBUG_MINING) {
                console.log(`[Mining Robots] Base at (${Math.round(obj.pos.x)}, ${Math.round(obj.pos.y)}) - cellKey: ${obj.cellKey}`);
                console.log(`  obj.robotsInitialized: ${obj.robotsInitialized}, desc.robotsInitialized: ${desc?.robotsInitialized}`);
                console.log(`  obj.robotCount: ${obj.robotCount}, needsRobots: ${needsRobots}`);
            }

            if (needsRobots) {
                obj.robotsInitialized = true;

                // Create shared ore seam map for this base (if not exists)
                const baseKey = `base_${obj.pos.x}_${obj.pos.y}`;
                if (!this.oreSeams.has(baseKey)) {
                    this.oreSeams.set(baseKey, new Map());
                }
                const baseOreSeams = this.oreSeams.get(baseKey);

                // Use persisted robot count if available, otherwise calculate deterministic count
                // This preserves robot losses from fauna attacks across save/load cycles
                let robotCount;
                if (typeof obj.robotCount === 'number' && obj.robotCount >= 0) {
                    // Use the persisted count (may be reduced from original if robots were destroyed)
                    robotCount = obj.robotCount;
                } else {
                    // Calculate initial deterministic robot count based on base position (2-3 robots)
                    const baseSeed = Math.abs(Math.sin(obj.pos.x * 1.234 + obj.pos.y * 5.678) * 43758.5453) % 1;
                    robotCount = 2 + Math.floor(baseSeed * 2);
                    obj.robotCount = robotCount;
                }

                // Sync to descriptor for persistence (desc already declared above)
                if (desc) {
                    desc.robotCount = robotCount;
                    desc.robotsInitialized = true;
                    // Link the storage array so updates to one affect the other
                    if (!desc.miningStorage) desc.miningStorage = obj.miningStorage;
                    else obj.miningStorage = desc.miningStorage;
                }

                // Debug logging
                if (typeof DEBUG_MINING !== 'undefined' && DEBUG_MINING) {
                    console.log(`[Mining Robots] Spawning ${robotCount} robots for base at (${Math.round(obj.pos.x)}, ${Math.round(obj.pos.y)}) - cellKey: ${obj.cellKey}`);
                }

                for (let i = 0; i < robotCount; i++) {
                    // Use deterministic positioning based on base location and robot index
                    const angle = (i / robotCount) * TWO_PI;
                    const distSeed = Math.abs(Math.sin(obj.pos.x * 2.345 + obj.pos.y * 6.789 + i * 3.14159)) % 1;
                    const dist = 50 + distSeed * 20;

                    // Spawn robots at patrol positions (not at base) to look "already working"
                    const patrolAngle = angle + (Math.sin(obj.pos.x + i) * 0.5); // Add some variation
                    const patrolDist = MINING_CONFIG.PATROL_RADIUS * 0.3 + (distSeed * MINING_CONFIG.PATROL_RADIUS * 0.4);
                    const rx = obj.pos.x + Math.cos(patrolAngle) * patrolDist;
                    const ry = obj.pos.y + Math.sin(patrolAngle) * patrolDist;

                    const robot = new MiningRobot(rx, ry, obj, baseOreSeams);
                    robot.yOffset = this._getTerrainHeightAt(rx, ry);

                    // Give robots varied starting states to look like they're already working
                    const stateSeed = Math.abs(Math.sin(obj.pos.x * 1.111 + obj.pos.y * 2.222 + i * 4.444)) % 1;
                    if (stateSeed < 0.3) {
                        // 30% chance: already mining
                        robot.state = ROBOT_STATE.MINING;
                        robot.stateTimer = stateSeed * MINING_CONFIG.MINING_DURATION;
                    } else if (stateSeed < 0.6) {
                        // 30% chance: returning with partial cargo
                        robot.state = ROBOT_STATE.RETURNING;
                        robot.cargo = Math.floor(stateSeed * MINING_CONFIG.CARGO_CAPACITY);
                    } else {
                        // 40% chance: seeking or moving to location
                        robot.state = stateSeed < 0.8 ? ROBOT_STATE.SEEKING : ROBOT_STATE.MOVING_TO_LOCATION;
                    }

                    this.miningRobots.push(robot);
                    robotsSpawned++;
                }
            }
        }

        if (typeof DEBUG_MINING !== 'undefined' && DEBUG_MINING && basesChecked > 0) {
            console.log(`[Mining Robots] Checked ${basesChecked} bases, spawned ${robotsSpawned} robots, total active: ${this.miningRobots.length}`);
        }
    }

    /**
     * Update background activity for distant player bases (mining and hazard damage)
     * Uses a timestamp-based catch-up system for performance.
     * @param {number} dt - Frame delta time
     * @private
     */
    _updateBackgroundActivity(dt) {
        if (!this.playerBuiltMap) {
            if (DEBUG_MINING) console.log('[Background] No playerBuiltMap');
            return;
        }

        const now = Date.now();
        const updateRangeSq = (SURFACE_CONFIG.UPDATE_RANGE || 2000) ** 2;
        const playerPos = (this.controlMode === 'ASTRONAUT' && this.astronaut) ? this.astronaut.pos : this.player.pos;

        let basesProcessed = 0;
        let basesSkippedInRange = 0;
        let basesSkippedDestroyed = 0;
        let basesSkippedTooSoon = 0;
        let basesUpdated = 0;

        // Iterate over all player built objects (even those not currently spawned)
        for (const [cellKey, desc] of this.playerBuiltMap) {
            if (desc.destroyed) {
                basesSkippedDestroyed++;
                continue;
            }

            basesProcessed++;

            // Find active object instance if it exists (in cache or surfaceObjects)
            let obj = this.objectCache.get(cellKey);

            // If the object is active and within range, it's being simulated in high-fidelity
            // so we skip background simulation to avoid double-dipping.
            if (obj && playerPos) {
                const dSq = (obj.pos.x - playerPos.x) ** 2 + (obj.pos.y - playerPos.y) ** 2;
                if (dSq < updateRangeSq) {
                    obj.lastBackgroundTick = now; // Keep tick updated so catch-up starts from here when it leaves range
                    desc.lastBackgroundTick = now; // Also update descriptor for persistence and catch-up calculation
                    basesSkippedInRange++;
                    continue;
                }
            }

            // BACKGROUND CATCH-UP LOGIC
            // Ensure lastBackgroundTick exists
            if (!desc.lastBackgroundTick) desc.lastBackgroundTick = now - (dt * 1000);

            const timeElapsed = (now - desc.lastBackgroundTick) / 1000; // Seconds

            // Minimum update frequency of 2 seconds for background logic to save processing
            if (timeElapsed < 2.0) {
                basesSkippedTooSoon++;
                continue;
            }

            basesUpdated++;

            // 1. Process Mining (Simplified math)
            if (desc.type === 'Offworld Colony' && desc.variant === 1) { // Player Base
                // Calculate mining rate based on expected robot performance
                // Match actual robot behavior: MINERALS_PER_MINE / MINING_DURATION
                let robotCount;
                if (typeof desc.robotCount === 'number') {
                    robotCount = desc.robotCount;
                } else {
                    // Legacy bases: derive a deterministic 2–3 robot count from base position.
                    // Use large primes for spatial hashing to ensure good distribution.
                    let seed = 0;
                    if (typeof desc.x === 'number' && typeof desc.y === 'number') {
                        const px = Math.floor(desc.x);
                        const py = Math.floor(desc.y);
                        // Hash constants: 73856093 and 19349663 are large primes commonly used for spatial hashing
                        seed = (px * 73856093) ^ (py * 19349663);
                    } else {
                        // No usable position; fall back to default.
                        seed = 1;
                    }
                    robotCount = 2 + (Math.abs(seed) % 2); // 2 or 3, deterministic per position
                }

                // If no robots, no mining happens
                if (robotCount === 0) {
                    desc.lastBackgroundTick = now;
                    continue;
                }

                const mineRatePerRobot = MINING_CONFIG.MINERALS_PER_MINE / MINING_CONFIG.MINING_DURATION;
                const mineralsEarned = robotCount * mineRatePerRobot * timeElapsed;

                // Ensure storage array exists and contains 'Minerals'
                if (!desc.miningStorage) desc.miningStorage = [];
                let mineralStack = desc.miningStorage.find(item => item.name === 'Minerals');
                if (!mineralStack) {
                    mineralStack = { name: 'Minerals', quantity: 0 };
                    desc.miningStorage.push(mineralStack);
                }

                const capacity = desc.miningStorageCapacity || 100;
                const oldQuantity = mineralStack.quantity;
                mineralStack.quantity = Math.min(capacity, mineralStack.quantity + mineralsEarned);

                // Notify player if storage is full (with cooldown)
                if (mineralStack.quantity >= capacity && oldQuantity < capacity) {
                    this._notifyBaseEvent(cellKey, 'storage_full', `Mining base storage full (${Math.round(capacity)} minerals)`);
                }

                // 2. Process Hazards (Simplified damage)
                // Fauna density factor (0 to 1 based on planet)
                const hazardLevel = this.planet ? (this.planet.hazardLevel || 0.2) : 0.1;
                const damagePerSec = hazardLevel * 0.5;
                const damageTaken = damagePerSec * timeElapsed;

                const oldHealth = desc.health !== undefined ? desc.health : 1000;
                desc.health = oldHealth - damageTaken;

                // Notify player when base health crosses below 50% of default max (1000 HP → threshold 500 HP)
                if (desc.health < 500 && oldHealth >= 500) {
                    this._notifyBaseEvent(cellKey, 'low_health', `Mining base under attack! (${Math.round(desc.health)} HP remaining)`);
                }

                // 3. Robot Attrition (Random chance based on hazard and time)
                // Approx 5% chance per hour per hazard level.
                // Clamp per-tick probability so very large timeElapsed values don't exceed a sane maximum.
                const rawAttritionChance = hazardLevel * (timeElapsed / 3600) * 0.05;
                const MAX_ATTRITION_CHANCE_PER_TICK = 0.5;
                const attritionChance = Math.min(MAX_ATTRITION_CHANCE_PER_TICK, Math.max(0, rawAttritionChance));
                if (Math.random() < attritionChance && desc.robotCount > 0) {
                    const oldCount = desc.robotCount;
                    desc.robotCount--;
                    console.log(`[Background] Lost a mining robot to hazards at ${cellKey}. Remaining: ${desc.robotCount}`);

                    // Notify player about robot loss
                    if (desc.robotCount === 0) {
                        this._notifyBaseEvent(cellKey, 'robots_lost', `All mining robots destroyed at base!`, [255, 100, 100]);
                    } else {
                        // oldCount was > 0 (checked in parent if), so this branch handles 1+ robots remaining
                        this._notifyBaseEvent(cellKey, 'robot_lost', `Mining robot destroyed (${desc.robotCount} remaining)`);
                    }
                }

                if (desc.health <= 0) {
                    desc.destroyed = true;
                    this.destroyedCells.add(cellKey);
                    console.log(`[Background] Base at ${cellKey} destroyed!`);
                    this._notifyBaseEvent(cellKey, 'base_destroyed', `Mining base destroyed!`, [255, 50, 50]);
                }

                // Sync properties back to cached object if it exists
                if (obj) {
                    obj.health = desc.health;
                    obj.destroyed = desc.destroyed;
                    obj.robotCount = desc.robotCount;
                    // Since miningStorage array is linked, we just need to notify if needed
                    // or ensure the active object's storage is synchronized.
                }
            }

            desc.lastBackgroundTick = now;
        }

        // Debug logging (only if DEBUG_MINING is enabled)
        if (typeof DEBUG_MINING !== 'undefined' && DEBUG_MINING && (basesProcessed > 0 || basesUpdated > 0)) {
            console.log(`[Background Activity] Processed: ${basesProcessed}, Updated: ${basesUpdated}, Skipped (in-range: ${basesSkippedInRange}, destroyed: ${basesSkippedDestroyed}, too-soon: ${basesSkippedTooSoon})`);
        }
    }

    /**
     * Send notification to player about base events
     * @param {string} cellKey - Cell key of the base
     * @param {string} eventType - Type of event (storage_full, low_health, robots_lost, etc)
     * @param {string} message - Message to display
     * @param {Array} color - Optional RGB color array
     * @private
     */
    _notifyBaseEvent(cellKey, eventType, message, color = [255, 200, 100]) {
        // Throttle notifications to avoid spam (once per minute per event type per base)
        if (!this.baseNotifications) {
            this.baseNotifications = new Map();
        }

        const notificationKey = `${cellKey}_${eventType}`;
        const now = Date.now();
        const lastNotification = this.baseNotifications.get(notificationKey);

        // Cooldown: 60 seconds for most events, 30 seconds for critical events
        const cooldown = (eventType === 'base_destroyed' || eventType === 'robots_lost') ? 30000 : 60000;

        if (lastNotification && (now - lastNotification) < cooldown) {
            return; // Skip notification, too soon
        }

        this.baseNotifications.set(notificationKey, now);

        // Send notification if uiManager is available
        if (typeof uiManager !== 'undefined' && uiManager.addMessage) {
            uiManager.addMessage(message, color);
        }

        console.log(`[Base Event] ${message} (${cellKey})`);
    }

    /**
     * Update mining robots and regenerate ore seams
     * @param {number} dt - Delta time in seconds
     * @private
     */
    _updateMiningRobots(dt) {
        if (!this.miningRobots) return;

        const updateRange = SURFACE_CONFIG.UPDATE_RANGE || 2000;
        const updateRangeSq = updateRange * updateRange;
        const cleanupDist = updateRange * 1.5;
        const cleanupDistSq = cleanupDist * cleanupDist;
        const playerPos = (this.controlMode === 'ASTRONAUT' && this.astronaut) ? this.astronaut.pos : this.player.pos;

        let robotsUpdated = 0;
        let robotsCulled = 0;

        // Update robots and filter out destroyed ones or those far away
        this.miningRobots = this.miningRobots.filter(robot => {
            if (!robot || robot.destroyed) return false;

            if (playerPos) {
                const dx = robot.pos.x - playerPos.x;
                const dy = robot.pos.y - playerPos.y;
                const distSq = dx * dx + dy * dy;

                // CRITICAL: Validate distance calculation didn't overflow or become NaN
                if (!isFinite(distSq)) {
                    // Overflow detected - remove robot and mark for respawn
                    if (robot.homeBase && !robot.homeBase.destroyed) {
                        robot.homeBase.robotsInitialized = false;
                        const desc = this.playerBuiltMap.get(robot.homeBase?.cellKey);
                        if (desc) desc.robotsInitialized = false;
                    }
                    return false;
                }

                // Distance-based cleanup: if robot is too far from player, remove it.
                // It will be re-instantiated when the player returns and base initialization runs.
                if (distSq > cleanupDistSq) {
                    // Force the base to re-initialize robots when player returns
                    // CRITICAL: Check homeBase exists and is not destroyed before accessing
                    if (robot.homeBase && !robot.homeBase.destroyed) {
                        robot.homeBase.robotsInitialized = false;
                        // Sync to descriptor to prevent duplicate spawns
                        const desc = this.playerBuiltMap.get(robot.homeBase?.cellKey);
                        if (desc) desc.robotsInitialized = false;
                    }
                    return false;
                }

                // Update culling: Only update robots within UPDATE_RANGE
                // Robots beyond this range stay frozen until player approaches
                if (distSq <= updateRangeSq) {
                    robot.update(dt, this);
                    robotsUpdated++;
                } else {
                    robotsCulled++;
                }
            } else {
                // No player pos, always update
                robot.update(dt, this);
                robotsUpdated++;
            }

            return true;
        });

        // Store culling stats for debug overlay
        this._lastRobotUpdateStats = { updated: robotsUpdated, culled: robotsCulled };

        // Regenerate ore seams slowly over time
        for (const [baseKey, baseSeams] of this.oreSeams) {
            for (const [seamKey, seam] of baseSeams) {
                seam.regenerate(dt);
            }
        }
    }

    /**
     * Draw mining robots with viewport culling (ore seams are invisible - mined at random locations)
     * @private
     */
    _drawMiningRobots() {
        if (!this.miningRobots || this.miningRobots.length === 0) return;

        // Viewport culling for mining robots
        const viewport = this._getViewportBounds(200);
        // Use cached values instead of recalculating
        const sin = this._cachedExtrusionSin;
        const cos = this._cachedExtrusionCos;

        let robotsDrawn = 0;
        let robotsCulled = 0;

        // Only draw robots that are visible
        for (let robot of this.miningRobots) {
            if (!robot) continue;

            // Viewport culling: Check if robot is visible
            const objAlt = robot.yOffset || 0;
            const objSize = robot.size || 20;
            const visX = robot.pos.x - objAlt * sin;
            const visY = robot.pos.y - objAlt * cos;

            if (visX + objSize < viewport.minX || visX - objSize > viewport.maxX ||
                visY + objSize < viewport.minY || visY - objSize > viewport.maxY) {
                robotsCulled++;
                continue;
            }

            robotsDrawn++;
            robot.draw(this);
        }

        // Store culling stats for debug overlay
        this._lastRobotDrawStats = { drawn: robotsDrawn, culled: robotsCulled };
    }

    /**
     * Draw surface objects with viewport culling and depth sorting
     */
    _drawSurfaceObjects() {
        if (!this.surfaceObjects) return;

        const sunAngle = this._getSunAngle();
        const viewport = this._getViewportBounds(300);
        const sin = this._cachedExtrusionSin;
        const cos = this._cachedExtrusionCos;

        // Reuse buffer array to avoid GC pressure
        const buffer = this._depthSortBuffer;
        buffer.length = 0;

        for (let obj of this.surfaceObjects) {
            if (!obj || obj.destroyed) continue;

            const objAlt = (typeof obj.altitude !== 'undefined') ? obj.altitude : (obj.yOffset || 0);
            const objSize = obj.size || 50;
            const objHeight = (typeof obj.getHeight === 'function') ? obj.getHeight() : (obj.height || (objSize * 2));

            // Visual position for culling and depth
            const visY = obj.pos.y - objAlt * cos;
            const visX = obj.pos.x - objAlt * sin;

            if (visX + objSize < viewport.minX || visX - objSize > viewport.maxX ||
                visY + objSize < viewport.minY || visY - objHeight > viewport.maxY) {
                continue;
            }

            // Store depth key directly on object (temporary, per-frame)
            obj._depthY = visY;
            buffer.push(obj);
        }

        // Depth sort: smaller visY drawn first (back to front)
        buffer.sort((a, b) => a._depthY - b._depthY);

        // Draw in sorted order
        for (let i = 0; i < buffer.length; i++) {
            const obj = buffer[i];
            const objAlt = (typeof obj.altitude !== 'undefined') ? obj.altitude : (obj.yOffset || 0);
            const objSize = obj.size || 50;
            const lodLevel = this._calculateLODLevel(objSize);

            if (obj.draw) {
                obj.draw(obj.pos.x, obj.pos.y, sunAngle, objAlt, lodLevel);
            }

            if (this.debugMode) {
                push();
                const bounds = this._getVisualBounds(obj);
                stroke(255, 0, 0, 100);
                strokeWeight(2);
                noFill();
                ellipse(bounds.base.x, bounds.base.y, bounds.radius * 2, bounds.radius * 2);
                pop();
            }
        }

        this._lastObjectCullStats = { drawn: buffer.length, culled: this.surfaceObjects.length - buffer.length };
    }

    /**
     * Draw projectiles from starSystem at their world positions with viewport culling
     * Camera transform handles centering relative to player
     */
    _drawProjectiles() {
        if (!this.starSystem || !this.starSystem.projectiles) return;

        const projectiles = this.starSystem.projectiles;
        // Use cached values instead of recalculating
        const counterScale = this._cachedCounterScale;
        const sunAngle = this._getSunAngle();

        const sin = this._cachedExtrusionSin;
        const cos = this._cachedExtrusionCos;

        // Viewport culling padding
        const viewport = this._getViewportBounds(100);

        push();
        for (let i = 0; i < projectiles.length; i++) {
            const proj = projectiles[i];
            if (proj && !proj.destroyed && (proj.isSurface || proj.owner === this.player)) {
                // Precise Culling: Project to visual coordinates
                const alt = proj.altitude || 0;
                const visX = proj.pos.x - alt * sin;
                const visY = proj.pos.y - alt * cos;

                if (visX < viewport.minX || visX > viewport.maxX ||
                    visY < viewport.minY || visY > viewport.maxY) {
                    continue;
                }

                // Projectile visual positioning is handled internally by proj.draw
                // using its altitude and the current global extrusion settings.
                proj.draw(proj.pos.x, proj.pos.y, sunAngle, counterScale);
            }
        }
        pop();
    }

    /**
     * Draw mines at their world positions with viewport culling
     * @private
     */
    _drawMines() {
        if (!this.starSystem || !this.starSystem.mines) return;

        const mines = this.starSystem.mines;
        if (mines.length === 0) return;

        // Viewport culling for mines
        const viewport = this._getViewportBounds(150);
        // Use cached values instead of recalculating
        const sin = this._cachedExtrusionSin;
        const cos = this._cachedExtrusionCos;

        push();
        this._clearShadow();

        for (const mine of mines) {
            if (mine && !mine.destroyed && typeof mine.draw === 'function') {
                // Viewport culling: Check if mine is visible
                const alt = mine.altitude || 0;
                const mineSize = mine.size || 20;
                const visX = mine.pos.x - alt * sin;
                const visY = mine.pos.y - alt * cos;

                if (visX + mineSize < viewport.minX || visX - mineSize > viewport.maxX ||
                    visY + mineSize < viewport.minY || visY - mineSize > viewport.maxY) {
                    continue;
                }

                // Mine.draw() already handles altitude projection via SurfaceUtils
                mine.draw();
            }
        }

        pop();
    }

    _drawExplosions() {
        if (!this.starSystem || !this.starSystem.explosions) return;
        if (!this.player) return;

        const explosions = this.starSystem.explosions;
        if (!explosions) return;

        // Use cached values instead of recalculating
        const sin = this._cachedExtrusionSin;
        const cos = this._cachedExtrusionCos;

        // Viewport culling padding
        const viewport = this._getViewportBounds(100);

        for (let i = 0; i < explosions.length; i++) {
            const exp = explosions[i];
            if (exp && !exp.isDone() && (exp.isSurface || exp.owner === this.player)) {
                // Precise Culling: Project to visual coordinates
                const alt = exp.altitude || 0;
                const visX = exp.pos.x - alt * sin;
                const visY = exp.pos.y - alt * cos;
                const expSize = exp.size || 30;

                if (visX + expSize < viewport.minX || visX - expSize > viewport.maxX ||
                    visY + expSize < viewport.minY || visY - expSize > viewport.maxY) {
                    continue;
                }

                // Pass visual position directly to explosion
                const sunAngle = this._getSunAngle();
                const counterScale = this._getCounterScale();

                exp.draw(exp.pos.x, exp.pos.y, sunAngle, counterScale);
            }
        }
    }

    /**
     * Draw beam weapon effects (laser lines) at world positions
     * Beams are stored on the player's lastBeam property, not as projectiles
     * @private
     */
    _drawBeams() {
        if (!this.player || !this.player.lastBeam) return;

        const beam = this.player.lastBeam;
        const now = millis();

        // Only draw if beam was recently fired (use constant from config)
        const beamDuration = SURFACE_CONFIG.BEAM_DISPLAY_DURATION || 150;
        if (now - beam.time >= beamDuration) return;

        // Calculate scale to maintain constant beam thickness
        const counterScale = this._getCounterScale();

        push();
        // Clear shadow settings to prevent visual artifacts
        this._clearShadow();

        let vStartX, vStartY, vEndX, vEndY;

        // Check if beam coordinates are already in visual space (surface mode beam)
        if (beam.inSurfaceMode) {
            // Beam was fired in surface mode - coordinates are already visual
            vStartX = beam.start.x;
            vStartY = beam.start.y;
            vEndX = beam.end.x;
            vEndY = beam.end.y;
        } else {
            // Beam was fired in space mode or legacy - convert world to visual coordinates
            const extrusionAngle = this._getExtrusionAngle();
            // Start always matches the player's visual height
            const activeAlt = (this.controlMode === 'SHIP') ? (this.player.altitude || this.altitude) : (this.astronaut.altitude || 0);
            const startXOffset = activeAlt * Math.sin(extrusionAngle);
            const startYOffset = activeAlt * Math.cos(extrusionAngle);
            // End matches target altitude (if known) or ground
            const endAlt = beam.targetAltitude || 0;
            const endXOffset = endAlt * Math.sin(extrusionAngle);
            const endYOffset = endAlt * Math.cos(extrusionAngle);

            vStartX = beam.start.x - startXOffset;
            vStartY = beam.start.y - startYOffset;
            vEndX = beam.end.x - endXOffset;
            vEndY = beam.end.y - endYOffset;
        }

        if (typeof LightingEffects !== 'undefined' && typeof LightingEffects.drawBeamGlow === 'function') {
            LightingEffects.drawBeamGlow(vStartX, vStartY, vEndX, vEndY, beam.color, {
                baseWidth: 3,
                counterScale,
                outerAlpha: 45,
                midAlpha: 90,
                coreAlpha: 220,
                whiteAlpha: 190
            });
        }

        pop();
    }

    /**
     * Draw force wave effects (expanding rings) at world positions
     * Force waves are stored in starSystem.forceWaves
     * @private
     */
    _drawForceWaves() {
        if (!this.starSystem || !this.starSystem.forceWaves) return;
        if (this.starSystem.forceWaves.length === 0) return;

        push();
        // Clear shadow settings to prevent visual artifacts
        this._clearShadow();

        const extrusionAngle = this._getExtrusionAngle(); // Consistent with other visual altitude calculations
        const counterScale = this._getCounterScale(); // For consistent sizing

        for (const wave of this.starSystem.forceWaves) {
            if (!wave) continue;
            // Only draw surface mode force waves (filter out space combat)
            if (!wave.isSurface) continue;

            // Calculate visual Y position based on altitude
            const visualY = this._toVisualY(wave.pos.y, wave.altitude);

            // Fade out as the wave expands
            const alpha = map(wave.radius, 0, wave.maxRadius, 220, 0);

            // Draw outer ring
            noFill();
            strokeWeight(6);
            stroke(wave.color[0], wave.color[1], wave.color[2], alpha);
            circle(wave.pos.x, visualY, wave.radius * 2);

            // Draw secondary ring
            strokeWeight(3);
            stroke(255, 255, 255, alpha * 0.7);
            circle(wave.pos.x, visualY, wave.radius * 1.9);

            // Draw inner glow
            strokeWeight(10);
            stroke(wave.color[0], wave.color[1], wave.color[2], alpha * 0.5);
            circle(wave.pos.x, visualY, wave.radius * 1.7);

            // Draw center pulse
            const pulseSize = (millis() - wave.startTime) % 300 / 300 * 50;
            fill(wave.color[0], wave.color[1], wave.color[2], alpha);
            noStroke();
            circle(wave.pos.x, visualY, pulseSize);
        }

        pop();
    }

    /**
     * Draw cloud layer overlay - fades surface to white at high altitudes
     * This creates the effect of entering a cloud layer and hides LOD reduction
     * PERFORMANCE: Single rectangle fill is extremely cheap (1 draw call)
     * @private
     */
    _drawCloudLayer() {
        const cloud = SURFACE_CONFIG.CLOUD_LAYER;

        // No clouds below start altitude
        if (this.altitude < cloud.START_ALTITUDE) return;

        // Calculate opacity based on altitude (linear interpolation)
        const t = (this.altitude - cloud.START_ALTITUDE) /
            (cloud.FULL_ALTITUDE - cloud.START_ALTITUDE);

        // [SMOOTH TRANSITION] If exiting, treat the transition progress as additional opacity
        // This ensures the screen reaches 100% white even if the player was slightly below FULL_ALTITUDE
        let opacityVal = Math.min(1, t);
        if (this.state === SURFACE_STATE.EXITING) {
            opacityVal = Math.max(opacityVal, this.transitionProgress);
        }

        const opacity = opacityVal * cloud.MAX_OPACITY * 255;

        // Skip if nearly invisible
        if (opacity < 1) return;

        // Draw fullscreen overlay in world space
        // We need to cover the visible viewport, which is centered on the player
        // The current transform is: translate(width/2, height/2) -> scale(perspectiveScale) -> translate(-playerPos)
        // So we need to draw a rect that covers the viewport in world coordinates

        // Calculate viewport bounds in world space
        const invScale = 1 / this._cachedPerspectiveScale;
        const halfW = (width / 2) * invScale;
        const halfH = (height / 2) * invScale;

        // Center of viewport in world coords (where camera is)
        const extrusionAngle = this._cachedExtrusionAngle;
        const visualXOffset = this.altitude * this._cachedExtrusionSin;
        const visualYOffset = this.altitude * this._cachedExtrusionCos;
        const centerX = this.surfaceX - visualXOffset;
        const centerY = this.surfaceY - visualYOffset;

        // Draw cloud overlay
        const cloudColor = this.transitionColor || cloud.COLOR;
        push();
        noStroke();
        fill(cloudColor[0], cloudColor[1], cloudColor[2], opacity);
        rectMode(CENTER);
        rect(centerX, centerY, halfW * 2 + 100, halfH * 2 + 100); // +100 for safety margin
        pop();
    }

    /**
     * Draw astronaut if active
     */
    _drawAstronaut() {
        if (!this.astronaut) return;

        // Use dynamic sun angle
        const sunAngle = this._getSunAngle();
        const startX = this.astronaut.pos.x;
        const startY = this.astronaut.pos.y;
        const extrusionAngle = this._getExtrusionAngle();

        // 1. Draw shadow on terrain (projected to terrain height)
        const terrainH = this._getTerrainHeightAt(startX, startY);

        // Shadow logic: offset slightly in sun direction
        const shadowOffset = 2;
        const shadowAlpha = 100;
        const shadowX = startX + Math.cos(sunAngle + Math.PI) * shadowOffset;
        const shadowY = startY + Math.sin(sunAngle + Math.PI) * shadowOffset;

        // Apply visual projection to shadow
        const visualShadowX = this._toVisualX(shadowX, terrainH);
        const visualShadowY = this._toVisualY(shadowY, terrainH);

        push();
        translate(visualShadowX, visualShadowY);
        fill(0, 0, 0, shadowAlpha);
        noStroke();
        ellipse(0, 0, this.astronaut.size, this.astronaut.size * 0.5);
        pop();

        // 2. Draw astronaut model
        // The astronaut is drawn at its world coordinates; the camera transform handles centering.
        // We just need to pass the sun angle and correct for counter-scale.
        const counterScale = this._getCounterScale();

        this.astronaut.draw(startX, startY, sunAngle);
    }

    /**
     * Draw player ship and its shadow on the terrain
     * @private
     */
    _drawPlayerShip() {
        if (!this.player) return;

        const extrusionAngle = this._getExtrusionAngle();
        // [EVA FIX] Use player's own altitude for drawing the ship.
        // this.altitude centers the camera/world, which changes during EVA.
        const shipAlt = (this.controlMode === 'SHIP') ? this.altitude : (this.player.altitude || 0);
        const altitudeOffset = shipAlt * Math.cos(extrusionAngle);
        const visualY = this.player.pos.y - altitudeOffset;

        // Calculate the inverse of perspective scale to keep ship at constant size
        const counterScale = this._getCounterScale();

        // Get sun direction
        const sunAngle = this._getSunAngle();

        // 1. Draw shadow on terrain
        const groundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
        const radarAlt = shipAlt - groundH;
        const shadowOffset = Math.max(0, (radarAlt - SURFACE_CONFIG.MIN_ALTITUDE) * SURFACE_CONFIG.SHADOW_ALTITUDE_SCALE);

        // Calculate Shadow Angle
        // We want the shadow to be cast from the *Visual* representation of the ship
        // The Ship Sprite is shifted by parallax: (shipAlt * sin(extrusion), shipAlt * cos(extrusion))
        // So we must offset the shadow reference point by this same amount to center it under the sprite
        // THEN apply the sun-based shadow vector.


        const startX = this.player.pos.x - (shipAlt * Math.sin(extrusionAngle));
        const startY = this.player.pos.y - (shipAlt * Math.cos(extrusionAngle));

        const shadowOffsetX = Math.cos(sunAngle + Math.PI) * shadowOffset;
        const shadowOffsetY = Math.sin(sunAngle + Math.PI) * shadowOffset;


        // Shadow on ground
        if (!this.player.destroyed && !this.player.isDying) {
            push();

            // Ground position for shadow
            // We calculate the logical shadow position first, then project it to visual coordinates.
            // Crucially, we apply a 'Visual Shift' to align the shadow with the perceived position of the 
            // extruded ship sprite, compensating for the parallax gap caused by altitude extrusion.

            // 1. Logical Shadow Position
            const logicalShadowX = this.player.pos.x + shadowOffsetX;
            const logicalShadowY = this.player.pos.y + shadowOffsetY;

            // 2. Project to Visual Space at Ground Height
            let visualShadowX = this._toVisualX(logicalShadowX, groundH);
            let visualShadowY = this._toVisualY(logicalShadowY, groundH);

            // 3. Apply Parallax Correction
            // Pull the shadow back to align with the ship's extruded visual position
            const visualShiftX = -(shipAlt - groundH) * Math.sin(extrusionAngle);
            const visualShiftY = -(shipAlt - groundH) * Math.cos(extrusionAngle);

            visualShadowX += visualShiftX;
            visualShadowY += visualShiftY;

            translate(visualShadowX, visualShadowY);
            rotate(this.player.angle);

            const shadowAlpha = map(radarAlt, SURFACE_CONFIG.MIN_ALTITUDE, 200, 140, 40);
            const radarAltNorm = constrain(radarAlt, SURFACE_CONFIG.MIN_ALTITUDE, 200);
            const shadowScale = map(radarAltNorm, SURFACE_CONFIG.MIN_ALTITUDE, 200, 0.6, 0.4);

            fill(0, 0, 0, shadowAlpha);
            noStroke();

            scale(counterScale);

            const shipTypeName = this.player.shipTypeName || 'Sidewinder';
            const shipDef = this.player._cachedShipDef || (typeof SHIP_DEFINITIONS !== 'undefined' ? SHIP_DEFINITIONS[shipTypeName] : null);
            let vertices = null;
            if (shipDef) {
                if (shipDef.vertexLayers && shipDef.vertexLayers.length > 0 && shipDef.vertexLayers[0].vertexData) {
                    vertices = shipDef.vertexLayers[0].vertexData;
                } else if (shipDef.vertexData && shipDef.vertexData.length > 0) {
                    vertices = shipDef.vertexData;
                }
            }

            if (vertices && vertices.length > 0) {
                const shipScale = this.player.size / 25;
                const shadowVertexScale = shipScale * 25 * shadowScale;
                beginShape();
                for (const v of vertices) {
                    vertex(v.x * shadowVertexScale, v.y * shadowVertexScale);
                }
                endShape(CLOSE);
            } else {
                const shadowSize = this.player.size * shadowScale;
                ellipse(0, 0, shadowSize, shadowSize * 0.8);
            }
            pop();
        }

        // 2. Draw actual ship model - PINNED TO SCREEN CENTER
        if (!this.player.destroyed && !this.player.isDying) {
            push();
            // We are already at screen center (visual center).
            // Shift the world origin BY the altitude offsets so that Player.draw (at world pos)
            // maps effectively to the visual center.
            const visualXOffset = shipAlt * Math.sin(extrusionAngle);
            translate(-visualXOffset, -altitudeOffset);

            // To scale around the ship's center correctly:
            translate(this.player.pos.x, this.player.pos.y);
            scale(counterScale);
            translate(-this.player.pos.x, -this.player.pos.y);

            // Pass the calculated Sun Angle to the player draw function
            // so the ship's self-shading matches the environment
            this.player.draw(sunAngle);
            pop();
        }
    }

    /**
     * Draw game HUD elements (normal game HUD)
     */
    _drawGameHUD() {
        if (typeof uiManager !== 'undefined' && uiManager && this.player) {
            // Draw the normal game HUD (shields, hull, speed, etc.)
            uiManager.drawHUD(this.player);
        }
    }

    /**
     * Draw HUD elements (delegated to surfaceHud.js)
     */
    _drawHUD() {
        if (typeof surfaceHud !== 'undefined' && surfaceHud) {
            surfaceHud.draw(this);
        }
    }

    /**
     * Draw transition overlay
     */
    _drawTransitionOverlay() {
        const alpha = this.state === SURFACE_STATE.ENTERING
            ? 255 * (1 - this.transitionProgress)
            : 255 * this.transitionProgress;

        // Use cloud color (white) for seamless cloud layer transition
        const cloudColor = this.transitionColor || SURFACE_CONFIG.CLOUD_LAYER.COLOR;

        // Draw overlay in world space (same technique as cloud layer)
        // This ensures it covers the terrain/objects but is behind the player ship
        const invScale = 1 / this._cachedPerspectiveScale;
        const halfW = (width / 2) * invScale;
        const halfH = (height / 2) * invScale;

        // Center of viewport in world coords
        const visualXOffset = this.altitude * this._cachedExtrusionSin;
        const visualYOffset = this.altitude * this._cachedExtrusionCos;
        const centerX = this.surfaceX - visualXOffset;
        const centerY = this.surfaceY - visualYOffset;

        push();
        noStroke();
        fill(cloudColor[0], cloudColor[1], cloudColor[2], alpha);
        rectMode(CENTER);
        rect(centerX, centerY, halfW * 2 + 100, halfH * 2 + 100);
        pop();
    }

    /**
     * Handle surface control key down - only altitude since player handles movement
     */
    handleKeyDown(keyCode, key) {
        if (this.state !== SURFACE_STATE.ACTIVE) return false;

        // Altitude controls (Z/X)
        if (key === 'z' || key === 'Z') { this.altitudeInput = 1; return true; }
        if (key === 'x' || key === 'X') { this.altitudeInput = -1; return true; }

        // Debug mode toggle removed - set this.debugMode = true in code if needed for debugging

        // Toggle mission overlay - 'N' for missioN
        if (key === 'n' || key === 'N') {
            if (typeof gameStateManager !== 'undefined' && gameStateManager) {
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                gameStateManager.toggleMissionOverlay();
                return true;
            }
        }

        // Let other keys pass through to normal game handling
        return false;
    }

    /**
     * Handle surface control key up - only altitude
     */
    handleKeyUp(keyCode, key) {
        // Allow key releases in any state to prevent stuck keys during transitions
        if (key === 'z' || key === 'Z' || key === 'x' || key === 'X') {
            this.altitudeInput = 0; return true;
        }

        return false;
    }

    /**
     * Debug command: Display status of all player-built bases
     * Call from console: debugBases()
     */
    debugBases() {
        console.log('\n========================================');
        console.log('MINING BASE STATUS REPORT');
        console.log('========================================\n');

        if (!this.planet) {
            console.log('❌ Not on a planet surface');
            return;
        }

        if (!this.planet.playerBuiltSurfaceObjects || this.planet.playerBuiltSurfaceObjects.length === 0) {
            console.log('ℹ️  No player-built bases found on this planet');
            return;
        }

        const now = Date.now();
        const playerPos = (this.controlMode === 'ASTRONAUT' && this.astronaut) ? this.astronaut.pos : this.player?.pos;
        const updateRangeSq = (SURFACE_CONFIG.UPDATE_RANGE || 2000) ** 2;

        console.log(`Planet: ${this.planet.name || 'Unknown'}`);
        console.log(`Hazard Level: ${(this.planet.hazardLevel || 0.2).toFixed(2)}`);
        console.log(`Player Position: ${playerPos ? `(${Math.round(playerPos.x)}, ${Math.round(playerPos.y)})` : 'Unknown'}`);
        console.log(`Background Update Range: ${Math.sqrt(updateRangeSq)} units\n`);

        let baseCount = 0;
        let activeCount = 0;
        let destroyedCount = 0;

        for (const desc of this.planet.playerBuiltSurfaceObjects) {
            // Check for PlayerBase, plus backward compatibility for Offworld type variants
            if (desc.type !== 'PlayerBase' && ((desc.type !== 'Offworld Colony' && desc.type !== 'OffworldBuilding') || desc.variant !== 1)) continue;

            baseCount++;
            const cellKey = this._getCellKeyForPosition(desc.x, desc.y);

            console.log(`─────────────────────────────────────────`);
            console.log(`BASE #${baseCount}`);
            console.log(`─────────────────────────────────────────`);

            // Basic info
            console.log(`📍 Position: (${Math.round(desc.x)}, ${Math.round(desc.y)})`);
            console.log(`🔑 Cell Key: ${cellKey}`);

            // Status
            if (desc.destroyed) {
                console.log(`💥 Status: DESTROYED`);
                destroyedCount++;
            } else {
                console.log(`✅ Status: ACTIVE`);
                activeCount++;
            }

            // Distance from player
            if (playerPos) {
                const distSq = (desc.x - playerPos.x) ** 2 + (desc.y - playerPos.y) ** 2;
                const dist = Math.sqrt(distSq);
                const inRange = distSq < updateRangeSq;
                console.log(`📏 Distance from Player: ${Math.round(dist)} units ${inRange ? '(IN RANGE - HIGH FIDELITY)' : '(OUT OF RANGE - BACKGROUND)'}`);
            }

            // Robots
            const robotCount = typeof desc.robotCount === 'number' ? desc.robotCount : 'Unknown';
            console.log(`🤖 Robots: ${robotCount}`);

            // Health
            const health = desc.health !== undefined ? desc.health : 1000;
            const maxHealth = 1000;
            const healthPercent = ((health / maxHealth) * 100).toFixed(1);
            const healthBar = this._getHealthBar(health, maxHealth);
            console.log(`❤️  Health: ${Math.round(health)}/${maxHealth} (${healthPercent}%) ${healthBar}`);

            // Mining storage
            if (desc.miningStorage && desc.miningStorage.length > 0) {
                const mineralStack = desc.miningStorage.find(item => item.name === 'Minerals');
                if (mineralStack) {
                    const capacity = desc.miningStorageCapacity || 100;
                    const quantity = mineralStack.quantity || 0;
                    const storagePercent = ((quantity / capacity) * 100).toFixed(1);
                    const storageBar = this._getStorageBar(quantity, capacity);
                    console.log(`⛏️  Mining Storage: ${Math.round(quantity)}/${capacity} minerals (${storagePercent}%) ${storageBar}`);
                } else {
                    console.log(`⛏️  Mining Storage: 0/100 minerals (empty)`);
                }
            } else {
                console.log(`⛏️  Mining Storage: No storage initialized`);
            }

            // Background activity timing
            if (desc.lastBackgroundTick) {
                const timeSinceUpdate = (now - desc.lastBackgroundTick) / 1000;
                const minutes = Math.floor(timeSinceUpdate / 60);
                const seconds = Math.floor(timeSinceUpdate % 60);
                console.log(`⏱️  Last Background Update: ${minutes}m ${seconds}s ago`);

                if (timeSinceUpdate > 120) {
                    console.log(`⚠️  WARNING: Long time since update! Check if background activity is running.`);
                }
            } else {
                console.log(`⏱️  Last Background Update: Never (freshly built)`);
            }

            // Mining rate estimation
            if (!desc.destroyed && robotCount > 0) {
                const mineRate = robotCount * (MINING_CONFIG.MINERALS_PER_MINE / MINING_CONFIG.MINING_DURATION);
                console.log(`📊 Mining Rate: ${mineRate.toFixed(2)} minerals/sec (${(mineRate * 60).toFixed(1)} minerals/min)`);
            }

            console.log('');
        }

        // Summary
        console.log(`========================================`);
        console.log(`SUMMARY`);
        console.log(`========================================`);
        console.log(`Total Bases: ${baseCount}`);
        console.log(`Active: ${activeCount}`);
        console.log(`Destroyed: ${destroyedCount}`);

        if (baseCount === 0) {
            console.log(`\nℹ️  No mining bases found. Use the Base Builder weapon to create one!`);
        } else if (activeCount === 0) {
            console.log(`\n⚠️  All bases are destroyed!`);
        }

        console.log(`\n💡 TIP: Background mining only works when you're >2000 units away or off-planet`);
        console.log(`========================================\n`);
    }

    /**
     * Helper to get cell key for a position
     */
    _getCellKeyForPosition(x, y) {
        const cellSize = SURFACE_CONFIG.SPAWN_CELL_SIZE || 35;
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        return `${cellX},${cellY}`;
    }

    /**
     * Helper to create a visual health bar
     */
    _getHealthBar(health, maxHealth) {
        const percent = health / maxHealth;
        const barLength = 20;
        const filled = Math.round(percent * barLength);
        const empty = barLength - filled;

        let bar = '[';
        if (percent > 0.7) {
            bar += '█'.repeat(filled) + '░'.repeat(empty);
        } else if (percent > 0.3) {
            bar += '▓'.repeat(filled) + '░'.repeat(empty);
        } else {
            bar += '▒'.repeat(filled) + '░'.repeat(empty);
        }
        bar += ']';

        return bar;
    }

    /**
     * Helper to create a visual storage bar
     */
    _getStorageBar(quantity, capacity) {
        const percent = quantity / capacity;
        const barLength = 20;
        const filled = Math.round(percent * barLength);
        const empty = barLength - filled;

        let bar = '[';
        if (percent >= 1.0) {
            bar += '█'.repeat(barLength);
        } else {
            bar += '▓'.repeat(filled) + '░'.repeat(empty);
        }
        bar += ']';

        return bar;
    }
}


// Global surface mode instance
let surfaceMode = null;

/**
 * Initialize surface mode
 */
function initSurfaceMode() {
    surfaceMode = new SurfaceMode();
    console.log("surfaceMode.js - Surface flight mode loaded (3D mesh terrain)");
}

// Auto-init on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        if (!surfaceMode) {
            initSurfaceMode();
        }
    });
}

// ============================================
// GLOBAL DEBUG COMMANDS
// ============================================

/**
 * Debug command: Show status of all mining bases
 * Usage: Type `debugBases()` or `debugBases(planetName)` in browser console
 * Works from space or planet surface
 */
function debugBases(planetName) {
    // Try to get context from either surface mode or space
    let planetsToCheck = [];
    let contextInfo = '';

    // Case 1: On planet surface
    if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.planet) {
        planetsToCheck = [surfaceMode.planet];
        contextInfo = `on surface of ${surfaceMode.planet.name || 'Unknown Planet'}`;
    }
    // Case 2: In space - check current system
    else if (typeof player !== 'undefined' && player && player.currentSystem) {
        if (planetName) {
            // Specific planet requested
            const planet = player.currentSystem.planets.find(p =>
                p.name && p.name.toLowerCase() === planetName.toLowerCase()
            );
            if (planet) {
                planetsToCheck = [planet];
                contextInfo = `checking planet: ${planet.name}`;
            } else {
                console.log(`❌ Planet "${planetName}" not found in current system`);
                console.log(`Available planets: ${player.currentSystem.planets.map(p => p.name).join(', ')}`);
                return;
            }
        } else {
            // Check all planets in system
            planetsToCheck = player.currentSystem.planets || [];
            contextInfo = `in space (${player.currentSystem.name || 'Unknown System'})`;
        }
    }
    // Case 3: No valid context
    else {
        console.log('❌ Cannot access base data');
        console.log('💡 Must be on a planet surface or in space with a current system');
        return;
    }

    // Display header
    console.log('\n========================================');
    console.log('MINING BASE STATUS REPORT');
    console.log('========================================\n');
    console.log(`Context: ${contextInfo}`);
    console.log(`Checking ${planetsToCheck.length} planet(s)\n`);

    let totalBases = 0;
    let totalActive = 0;
    let totalDestroyed = 0;

    // Check each planet
    for (const planet of planetsToCheck) {
        if (!planet) continue;

        const bases = planet.playerBuiltSurfaceObjects || [];

        // DEBUG: Show what we're finding
        console.log(`[Debug] Planet "${planet.name}": playerBuiltSurfaceObjects exists: ${!!planet.playerBuiltSurfaceObjects}, is array: ${Array.isArray(planet.playerBuiltSurfaceObjects)}, length: ${bases.length}`);
        if (bases.length > 0) {
            console.log(`[Debug] Base types found:`, bases.map(b => `${b.type} variant:${b.variant}`));
        }

        const habBases = bases.filter(b => b.type === 'PlayerBase' || ((b.type === 'Offworld Colony' || b.type === 'OffworldBuilding') && b.variant === 1));

        if (habBases.length === 0) {
            if (planetsToCheck.length === 1) {
                console.log(`ℹ️  No mining bases found on ${planet.name || 'this planet'}`);
                if (bases.length > 0) {
                    console.log(`   (Found ${bases.length} other object(s) but no Hab Units with variant=1)`);
                }
            }
            continue;
        }

        // Planet header (only if checking multiple planets)
        if (planetsToCheck.length > 1) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`🌍 ${planet.name || 'Unknown Planet'}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        }

        console.log(`Planet: ${planet.name || 'Unknown'}`);
        console.log(`Hazard Level: ${(planet.hazardLevel || 0.2).toFixed(2)}`);
        console.log(`Total Bases: ${habBases.length}\n`);

        // Show each base
        let baseNum = 0;
        for (const desc of habBases) {
            baseNum++;
            totalBases++;

            const cellSize = 35; // SURFACE_CONFIG.SPAWN_CELL_SIZE
            const cellX = Math.floor(desc.x / cellSize);
            const cellY = Math.floor(desc.y / cellSize);
            const cellKey = `${cellX},${cellY}`;

            console.log(`─────────────────────────────────────────`);
            console.log(`BASE #${baseNum} on ${planet.name || 'planet'}`);
            console.log(`─────────────────────────────────────────`);

            // Basic info
            console.log(`📍 Position: (${Math.round(desc.x)}, ${Math.round(desc.y)})`);
            console.log(`🔑 Cell Key: ${cellKey}`);

            // Status
            if (desc.destroyed) {
                console.log(`💥 Status: DESTROYED`);
                totalDestroyed++;
            } else {
                console.log(`✅ Status: ACTIVE`);
                totalActive++;
            }

            // Robots
            const robotCount = typeof desc.robotCount === 'number' ? desc.robotCount : 'Unknown';
            console.log(`🤖 Robots: ${robotCount}`);

            // Health
            const health = desc.health !== undefined ? desc.health : 1000;
            const maxHealth = 1000;
            const healthPercent = ((health / maxHealth) * 100).toFixed(1);
            const healthBar = _getDebugHealthBar(health, maxHealth);
            console.log(`❤️  Health: ${Math.round(health)}/${maxHealth} (${healthPercent}%) ${healthBar}`);

            // Mining storage
            if (desc.miningStorage && desc.miningStorage.length > 0) {
                const mineralStack = desc.miningStorage.find(item => item.name === 'Minerals');
                if (mineralStack) {
                    const capacity = desc.miningStorageCapacity || 100;
                    const quantity = mineralStack.quantity || 0;
                    const storagePercent = ((quantity / capacity) * 100).toFixed(1);
                    const storageBar = _getDebugStorageBar(quantity, capacity);
                    console.log(`⛏️  Mining Storage: ${Math.round(quantity)}/${capacity} minerals (${storagePercent}%) ${storageBar}`);
                } else {
                    console.log(`⛏️  Mining Storage: 0/${desc.miningStorageCapacity || 100} minerals (empty)`);
                }
            } else {
                console.log(`⛏️  Mining Storage: ${desc.miningStorage ? '0' : 'Not initialized'}/100 minerals`);
            }

            // Background activity timing
            if (desc.lastBackgroundTick) {
                const now = Date.now();
                const timeSinceUpdate = (now - desc.lastBackgroundTick) / 1000;
                const minutes = Math.floor(timeSinceUpdate / 60);
                const seconds = Math.floor(timeSinceUpdate % 60);
                console.log(`⏱️  Last Background Update: ${minutes}m ${seconds}s ago`);

                if (timeSinceUpdate > 120) {
                    console.log(`⚠️  WARNING: Long time since update! Check if background activity is running.`);
                }
            } else {
                console.log(`⏱️  Last Background Update: Never (freshly built or not yet updated)`);
            }

            // Mining rate estimation
            if (!desc.destroyed && typeof desc.robotCount === 'number' && desc.robotCount > 0) {
                const MINERALS_PER_MINE = 2;
                const MINING_DURATION = 10;
                const mineRate = desc.robotCount * (MINERALS_PER_MINE / MINING_DURATION);
                console.log(`📊 Mining Rate: ${mineRate.toFixed(2)} minerals/sec (${(mineRate * 60).toFixed(1)} minerals/min)`);
            }

            console.log('');
        }
    }

    // Final summary
    console.log(`========================================`);
    console.log(`SUMMARY`);
    console.log(`========================================`);
    console.log(`Total Bases Found: ${totalBases}`);
    console.log(`Active: ${totalActive}`);
    console.log(`Destroyed: ${totalDestroyed}`);

    if (totalBases === 0) {
        console.log(`\nℹ️  No mining bases found.`);
        if (planetsToCheck.length > 1) {
            console.log(`   No bases on any planet in this system.`);
        }
        console.log(`   Use the Base Builder weapon to create one!`);
    } else if (totalActive === 0) {
        console.log(`\n⚠️  All bases are destroyed!`);
    }

    console.log(`\n💡 TIPS:`);
    console.log(`   - Background mining works when >2000 units away or off-planet`);
    console.log(`   - From space: debugBases() shows all system planets`);
    console.log(`   - From space: debugBases("PlanetName") shows specific planet`);
    console.log(`   - From surface: debugBases() shows current planet`);
    console.log(`========================================\n`);
}

// Helper functions for visual bars
function _getDebugHealthBar(health, maxHealth) {
    const percent = health / maxHealth;
    const barLength = 20;
    const filled = Math.round(percent * barLength);
    const empty = barLength - filled;

    let bar = '[';
    if (percent > 0.7) {
        bar += '█'.repeat(filled) + '░'.repeat(empty);
    } else if (percent > 0.3) {
        bar += '▓'.repeat(filled) + '░'.repeat(empty);
    } else {
        bar += '▒'.repeat(filled) + '░'.repeat(empty);
    }
    bar += ']';

    return bar;
}

function _getDebugStorageBar(quantity, capacity) {
    const percent = quantity / capacity;
    const barLength = 20;
    const filled = Math.round(percent * barLength);
    const empty = barLength - filled;

    let bar = '[';
    if (percent >= 1.0) {
        bar += '█'.repeat(barLength);
    } else {
        bar += '▓'.repeat(filled) + '░'.repeat(empty);
    }
    bar += ']';

    return bar;
}

// Expose debug command globally
if (typeof window !== 'undefined') {
    window.debugBases = debugBases;
}

if (typeof DEBUG_MINING !== 'undefined' && DEBUG_MINING) {
    console.log("surfaceMode.js loaded");
    console.log("💡 Debug commands available:");
    console.log("   debugBases() - Show all bases in current system");
    console.log("   debugBases('PlanetName') - Show bases on specific planet");
}

// Export for Node.js/Jest testing while maintaining browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SurfaceMode, SURFACE_CONFIG, SURFACE_STATE };
}
// Also expose to global for browser environment
if (typeof window !== 'undefined') {
    window.SurfaceMode = SurfaceMode;
    window.SURFACE_CONFIG = SURFACE_CONFIG;
    window.SURFACE_STATE = SURFACE_STATE;
}
