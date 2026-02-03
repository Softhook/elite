// ****** surfaceMode.js ******
// Surface flight mode controller for planetary surface gameplay
// Uses 3D mesh terrain rendering based on surface_test.html

/**
 * Configuration constants for surface mode
 */
const SURFACE_CONFIG = {
    // Flight mechanics
    MIN_ALTITUDE: 10,
    MAX_ALTITUDE: 2000,
    DEFAULT_ALTITUDE: 500, // Default starting altitude above terrain
    TURN_SPEED: 2.5,           // Radians per second
    // Movement (now uses SHIP_DEFINITIONS and SharedPhysics)
    CLIMB_SPEED: 200,

    // Terrain mesh
    MESH_RESOLUTION: 120,      // Grid resolution (balanced for detail and performance)
    MESH_SIZE: 5000,           // World units covered (smaller mesh with earlier buffer requests to ensure seamless swaps)
    SPAWN_CELL_SIZE: 35,       // Fixed spawn density (independent of resolution)
    DEFAULT_FEATURE_SEED: 12345, // Fallback seed for terrain generation
    HIGH_TERRAIN_THRESHOLD: 350, // Height (0-500) treated as high ground for defenses

    // Transition
    TRANSITION_DURATION: 2000, // ms for enter/exit transitions
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

        // Saved player position for return
        this.savedPlayerPos = null;

        // Reboard cooldown to prevent loop
        this.reboardCooldown = 0;
    }

    /**
     * Check if surface mode is active or transitioning
     */
    isActive() {
        return this.state !== SURFACE_STATE.INACTIVE;
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

        console.log(`Entering surface mode on ${planet.name}`);

        this.state = SURFACE_STATE.ENTERING;
        this.player = player;
        this.planet = planet;
        this.starSystem = starSystem;

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
                if (desc.variant === 1 && desc.type === 'OffworldBuilding') {
                    // Destroy mining robots associated with this base
                    if (this.miningRobots) {
                        for (let robot of this.miningRobots) {
                            if (robot.homeBase && robot.homeBase.cellKey === cellKey) {
                                robot.destroyed = true;
                            }
                        }
                    }

                    // Remove shared ore seams for this base (identified by its creation coordinates)
                    const baseKey = `base_${desc.x}_${desc.y}`;
                    this.oreSeams.delete(baseKey);
                    console.log(`[Persistence] Mining system for base at ${cellKey} cleaned up.`);
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

        // Cleanup terrain
        this.terrain.cleanup();

        // Clear data
        this.projectiles = [];
        this.miningRobots = [];
        this.oreSeams.clear();
        this.savedPlayerPos = null;
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
    handleKeyPress(keyCode) {
        if (keyCode === SURFACE_CONFIG.TRIGGER_KEY) {
            this._keyPressed = true;
            return true;
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

        const dt = deltaTime / 1000; // Convert to seconds

        // Update reboard cooldown
        if (this.reboardCooldown > 0) {
            this.reboardCooldown -= dt;
        }

        // Update transition
        if (this.state === SURFACE_STATE.ENTERING ||
            this.state === SURFACE_STATE.EXITING) {
            this._updateTransition();
        }

        // Start gameplay input handling as soon as terrain is ready (even during fade)
        // This eliminates input lag at the end of the transition
        const canProcessInput = this.state === SURFACE_STATE.ACTIVE ||
            (this.state === SURFACE_STATE.ENTERING && this._terrainReady);

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
            // Apply viewport culling for distant objects to improve performance
            if (this.surfaceObjects) {
                const target = this.controlMode === 'ASTRONAUT' ? this.astronaut : this.player;

                // Get viewport for culling (use constant from config)
                const updateRange = SURFACE_CONFIG.UPDATE_RANGE || 2000;
                const updateRangeSq = updateRange * updateRange;

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

                        // Skip update for very distant objects (but still render them if visible)
                        // Exceptions: Always update mission-critical objects (isTarget)
                        if (distSq > updateRangeSq && !obj.isTarget) {
                            objectsCulled++;
                            continue;
                        }
                    }

                    objectsUpdated++;
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
        this.transitionProgress = Math.min(1, elapsed / SURFACE_CONFIG.TRANSITION_DURATION);

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
            // Fade stays at 100% opacity until terrain is ready - user sees black screen
        } else if (this.state === SURFACE_STATE.EXITING && this.transitionProgress >= 1) {
            this._completeExit();
        }
    }

    /**
     * Update player physics - uses player's normal controls (identical to space physics)
     */
    _updatePhysics(dt) {
        if (!this.player) return;

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
        if (!this.isLanded || this.controlMode !== 'SHIP') return;

        // Check for any movement input
        // Keys: W(87), A(65), S(83), D(68) or Arrows (UP/LEFT/DOWN/RIGHT)
        const moving = keyIsDown(87) || keyIsDown(65) || keyIsDown(83) || keyIsDown(68) ||
            keyIsDown(UP_ARROW) || keyIsDown(LEFT_ARROW) || keyIsDown(DOWN_ARROW) || keyIsDown(RIGHT_ARROW);

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

        // Create astronaut at player position
        // Ensure astronaut.js is loaded
        if (typeof Astronaut !== 'undefined') {
            this.astronaut = new Astronaut(this.player.pos);
            this.astronaut.heading = this.player.angle; // Face same way as ship

            // Initial surface sync
            const groundH = this._getTerrainHeightAt(this.astronaut.pos.x, this.astronaut.pos.y);
            this.astronaut.altitude = groundH;

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
        this.astronaut = null;

        // Reset player inputs to prevent instant re-deploy or launch
        this.player.thrustInput = 0;
        this.player.turnInput = 0;

        // Set cooldown to prevent immediate re-disembark logic
        this.reboardCooldown = SURFACE_CONFIG.REEBOARD_COOLDOWN;

        // Message
        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage("Boarding Ship", [100, 255, 100]);
        }
    }

    /**
     * Update astronaut physics and logic
     */
    _updateAstronaut(dt) {
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

        // Build base: Press 'B' (keyCode 66) to build a hab unit in front of the astronaut
        if (keyIsDown && typeof keyIsDown === 'function') {
            if (keyIsDown(66)) { // 'B'
                if (!this._buildKeyPressed) {
                    this._buildKeyPressed = true;
                    this._attemptBuildHabUnit();
                }
            } else {
                this._buildKeyPressed = false;
            }
        }

        // Check for Boarding (proximity to ship)
        // Only board if not moving (to avoid accidental trigger while walking past)
        if (!isMoving) {
            const dist = p5.Vector.dist(this.astronaut.pos, this.player.pos);
            if (dist < SURFACE_CONFIG.BOARDING_RANGE) {
                this.boardShip();
                return; // Immediately return to avoid using this.astronaut after it was nulled
            }
        }

        // Detect entering a player-built base: if astronaut walks into a player-built OffworldBuilding,
        // open the Base Services menu.
        if (this.surfaceObjects && Array.isArray(this.surfaceObjects) && this.astronaut && this.astronaut.pos) {
            for (const obj of this.surfaceObjects) {
                if (!obj || obj.destroyed || !obj.pos) continue;
                const isOffworld = (obj.constructor && obj.constructor.name === 'OffworldBuilding') || (obj.type === 'OffworldBuilding');
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

        if (typeof OffworldBuilding === 'undefined') {
            if (typeof uiManager !== 'undefined') uiManager.addMessage('Build failed: building module missing', [255, 80, 80]);
            return;
        }

        const size = 60;
        const hab = new OffworldBuilding(bx, by, size, Math.floor(Math.random() * 100000));
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
                type: hab.type || 'OffworldBuilding',
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
                type: hab.type || 'OffworldBuilding',
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
        if (!this.player || !this.player.pos) {
            return { minX: 0, maxX: width, minY: 0, maxY: height };
        }

        return SurfaceUtils.getViewportBounds(
            this.surfaceX,
            this.surfaceY,
            this.altitude,
            width,
            height,
            padding
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

        push();
        // 1. Center camera on screen
        translate(width / 2, height / 2);

        // 2. Perspective scaling (everything world-side scales together)
        const perspectiveScale = this._getPerspectiveScale();
        scale(perspectiveScale);

        // 3. World translation (camera follows player's visual top position)
        const extrusionAngle = this._getExtrusionAngle();
        const visualXOffset = this.altitude * Math.sin(extrusionAngle);
        const visualYOffset = this.altitude * Math.cos(extrusionAngle);

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

        // Draw beam and force wave effects (no projectile, direct rendering)
        this._drawBeams();
        this._drawForceWaves();

        // Draw Astronaut (if active)
        this._drawAstronaut();

        // Draw player ship
        this._drawPlayerShip();

        pop();

        // Draw game HUD (shields, hull, speed, etc. - NOT scaled)
        this._drawGameHUD();

        // Draw surface-specific HUD (altitude bar, compass)
        if (typeof surfaceHud !== 'undefined' && surfaceHud) {
            surfaceHud.draw(this);
        }

        // Transition overlay
        if (this.state === SURFACE_STATE.ENTERING ||
            this.state === SURFACE_STATE.EXITING) {
            this._drawTransitionOverlay();
        }
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
                    if (typeof OffworldBuilding !== 'undefined' && (String(desc.type).toLowerCase().indexOf('offworld') !== -1 || desc.type === 'OffworldBuilding')) {
                        obj = new OffworldBuilding(desc.x, desc.y, desc.size || 40, desc.seed || 0);
                        if (typeof desc.variant !== 'undefined') obj.variant = desc.variant;
                        obj.yOffset = (typeof desc.yOffset !== 'undefined') ? desc.yOffset : this._getTerrainHeightAt(desc.x, desc.y);
                        obj.displayName = desc.displayName || obj.displayName;
                        obj.destroyed = !!desc.destroyed;

                        // Restore persistent state for mining bases
                        if (desc.variant === 1) {
                            obj.robotsInitialized = !!desc.robotsInitialized;
                            obj.miningStorage = Array.isArray(desc.miningStorage) ? desc.miningStorage : [];
                            obj.miningStorageCapacity = desc.miningStorageCapacity || 100;
                            obj.robotCount = desc.robotCount || 0;
                            if (typeof desc.health === 'number') obj.health = desc.health;
                        }

                        // Flag instances spawned from saved player descriptors
                        obj.playerBuilt = true;
                    } else if (typeof SurfaceObject !== 'undefined') {
                        obj = new SurfaceObject(desc.x, desc.y, desc.size || 40);
                        obj.yOffset = (typeof desc.yOffset !== 'undefined') ? desc.yOffset : this._getTerrainHeightAt(desc.x, desc.y);
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

                if (isTargetCell && typeof ShieldGenerator !== 'undefined') {
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

                if (!obj) {
                    // 0. Habitation Check - Uninhabited planets spawn secret caches instead
                    // [DEBUG FIX] If near target, we ignore the habitability check to spawn the boss base
                    if (this.planet && !this.planet.isInhabited && !isNearTarget) {
                        // SECRET CACHE SPAWNING for uninhabited planets
                        if (cellHash < 0.00005 && typeof SecretCache !== 'undefined') {
                            obj = new SecretCache(wx, wy, objSeed);
                        }
                    } else if (this.planet && this.planet.isInhabited) {
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
                        const planetDensityFactor = this.planet.featureRand ?
                            (Math.sin(this.planet.featureRand * DENSITY_WAVE_FREQUENCY) * DENSITY_AMPLITUDE + DENSITY_BASELINE) : DENSITY_BASELINE;

                        // Log density once per spawn cycle
                        if (gx === 0 && gy === 0) {
                            console.log(`[Spawn] Planet ${this.planet.name} Density Factor: ${planetDensityFactor.toFixed(3)} (Fauna Threshold: 0.4, Flora Threshold: 0.2)`);
                        }

                        // Inhabited vs Uninhabited spawning rules
                        if (this.planet.isInhabited) {
                            // INHABITED: Only flora, no fauna (civilization has displaced wildlife)
                            // Much sparser flora (0.3% base * planet factor)
                            const inhabitedFloraMin = 0.990;
                            const inhabitedFloraMax = 0.993;
                            if (cellHash > inhabitedFloraMin && cellHash < inhabitedFloraMax && planetDensityFactor > 0.3) {
                                obj = this._createFlora(planetColors, wx, wy, objSeed);
                            }
                        } else {
                            // UNINHABITED: Both flora and fauna thrive
                            // Flora spawning - moderate (2% base * planet factor)
                            const wildFloraMin = 0.940;
                            const wildFloraMax = 0.970;
                            const wildFaunaMin = 0.970;
                            const wildFaunaMax = 0.999;

                            if (cellHash > wildFloraMin && cellHash < wildFloraMax && planetDensityFactor > 0.2) {
                                obj = this._createFlora(planetColors, wx, wy, objSeed);
                            }
                            // Fauna spawning - moderate (roughly 2.9% probability)
                            else if (cellHash > wildFaunaMin && cellHash < wildFaunaMax && planetDensityFactor > 0.4) {
                                obj = this._createFauna(planetColors, wx, wy, objSeed);
                                if (obj) {
                                    obj.cellKey = cellKey;
                                    console.log(`[Spawn] Spawned fauna ${obj.constructor.name} at ${cellKey} (Hash: ${cellHash.toFixed(4)}, Factor: ${planetDensityFactor.toFixed(2)})`);
                                }
                            }
                        }
                    }
                }

                // If an object was created, finalize and cache it
                if (obj) {
                    obj.yOffset = h;
                    obj.cellKey = cellKey; // Store the key for persistence when destroyed
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
     * @returns {SurfaceFlora} The created flora
     * @private
     */
    _createFlora(planetColors, x, y, seed) {
        const rand = (seed * 7.919) % 1;
        const size = 15 + (seed % 20);

        // Choose flora type based on random value
        if (rand < 0.2 && typeof AlienTree !== 'undefined') {
            return new AlienTree(x, y, size, planetColors, seed);
        } else if (rand < 0.4 && typeof CrystalPlant !== 'undefined') {
            return new CrystalPlant(x, y, size, planetColors, seed);
        } else if (rand < 0.6 && typeof TentaclePlant !== 'undefined') {
            return new TentaclePlant(x, y, size, planetColors, seed);
        } else if (rand < 0.8 && typeof SporeStalk !== 'undefined') {
            return new SporeStalk(x, y, size, planetColors, seed);
        } else if (typeof BubbleBush !== 'undefined') {
            return new BubbleBush(x, y, size, planetColors, seed);
        }

        // Fallback to AlienTree if available
        return typeof AlienTree !== 'undefined' ? new AlienTree(x, y, size, planetColors, seed) : null;
    }

    /**
     * Create fauna based on planet colors and random seed
     * @param {Array} planetColors - Array of planet colors from palette
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} seed - Random seed for variation
     * @returns {SurfaceFauna} The created fauna
     * @private
     */
    _createFauna(planetColors, x, y, seed) {
        const rand = (seed * 13.579) % 1;
        const size = 10 + (seed % 15);

        // Choose fauna type based on random value
        if (rand < 0.25 && typeof SlitherCreature !== 'undefined') {
            return new SlitherCreature(x, y, size, planetColors, seed);
        } else if (rand < 0.5 && typeof FloaterCreature !== 'undefined') {
            return new FloaterCreature(x, y, size, planetColors, seed);
        } else if (rand < 0.75 && typeof RollerCreature !== 'undefined') {
            return new RollerCreature(x, y, size, planetColors, seed);
        } else if (typeof StalkCreature !== 'undefined') {
            return new StalkCreature(x, y, size, planetColors, seed);
        }

        // Fallback to SlitherCreature if available
        return typeof SlitherCreature !== 'undefined' ? new SlitherCreature(x, y, size, planetColors, seed) : null;
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

        // Find all player-built Hab Units (variant 1 of OffworldBuilding)
        for (const obj of this.surfaceObjects) {
            if (!obj || obj.destroyed) continue;

            // Check if it's a player-built Hab Unit
            const isHabUnit = obj.playerBuilt &&
                obj.constructor &&
                obj.constructor.name === 'OffworldBuilding' &&
                obj.variant === 1;

            if (!isHabUnit) continue;

            // Initialize storage if needed
            if (!obj.miningStorage) {
                obj.miningStorage = [];
                obj.miningStorageCapacity = MINING_CONFIG.STORAGE_CAPACITY;
            }

            // Check if robots already spawned for this base
            if (!obj.robotsInitialized) {
                obj.robotsInitialized = true;

                // Create shared ore seam map for this base (if not exists)
                const baseKey = `base_${obj.pos.x}_${obj.pos.y}`;
                if (!this.oreSeams.has(baseKey)) {
                    this.oreSeams.set(baseKey, new Map());
                }
                const baseOreSeams = this.oreSeams.get(baseKey);

                // Deterministic robot count based on base position (2-3 robots)
                const baseSeed = Math.abs(Math.sin(obj.pos.x * 1.234 + obj.pos.y * 5.678) * 43758.5453) % 1;
                const robotCount = 2 + Math.floor(baseSeed * 2);
                obj.robotCount = robotCount;

                // Sync to descriptor for persistence
                const desc = this.playerBuiltMap.get(obj.cellKey);
                if (desc) {
                    desc.robotCount = robotCount;
                    desc.robotsInitialized = true;
                    // Link the storage array so updates to one affect the other
                    if (!desc.miningStorage) desc.miningStorage = obj.miningStorage;
                    else obj.miningStorage = desc.miningStorage;
                }

                for (let i = 0; i < robotCount; i++) {
                    const angle = (i / robotCount) * TWO_PI;
                    // Deterministic spawn distance based on base position and robot index
                    const distSeed = Math.abs(Math.sin(obj.pos.x * 2.345 + obj.pos.y * 6.789 + i * 3.14159)) % 1;
                    const dist = 50 + distSeed * 20;
                    const rx = obj.pos.x + Math.cos(angle) * dist;
                    const ry = obj.pos.y + Math.sin(angle) * dist;

                    const robot = new MiningRobot(rx, ry, obj, baseOreSeams);
                    robot.yOffset = this._getTerrainHeightAt(rx, ry);
                    this.miningRobots.push(robot);
                }
            }
        }
    }

    /**
     * Update background activity for distant player bases (mining and hazard damage)
     * Uses a timestamp-based catch-up system for performance.
     * @param {number} dt - Frame delta time
     * @private
     */
    _updateBackgroundActivity(dt) {
        if (!this.playerBuiltMap) return;

        const now = Date.now();
        const updateRangeSq = (SURFACE_CONFIG.UPDATE_RANGE || 2000) ** 2;
        const playerPos = (this.controlMode === 'ASTRONAUT' && this.astronaut) ? this.astronaut.pos : this.player.pos;

        // Iterate over all player built objects (even those not currently spawned)
        for (const [cellKey, desc] of this.playerBuiltMap) {
            if (desc.destroyed) continue;

            // Find active object instance if it exists (in cache or surfaceObjects)
            let obj = this.objectCache.get(cellKey);

            // If the object is active and within range, it's being simulated in high-fidelity
            // so we skip background simulation to avoid double-dipping.
            if (obj && playerPos) {
                const dSq = (obj.pos.x - playerPos.x) ** 2 + (obj.pos.y - playerPos.y) ** 2;
                if (dSq < updateRangeSq) {
                    obj.lastBackgroundTick = now; // Keep tick updated so catch-up starts from here when it leaves range
                    continue;
                }
            }

            // BACKGROUND CATCH-UP LOGIC
            // Ensure lastBackgroundTick exists
            if (!desc.lastBackgroundTick) desc.lastBackgroundTick = now - (dt * 1000);

            const timeElapsed = (now - desc.lastBackgroundTick) / 1000; // Seconds

            // Minimum update frequency of 2 seconds for background logic to save processing
            if (timeElapsed < 2.0) continue;

            // 1. Process Mining (Simplified math)
            if (desc.type === 'OffworldBuilding' && desc.variant === 1) { // Player Base
                // Calculate mining rate based on expected robot performance
                // Match actual robot behavior: MINERALS_PER_MINE / MINING_DURATION
                const robotCount = typeof desc.robotCount === 'number' ? desc.robotCount : 3;

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
                mineralStack.quantity = Math.min(capacity, mineralStack.quantity + mineralsEarned);

                // 2. Process Hazards (Simplified damage)
                // Fauna density factor (0 to 1 based on planet)
                const hazardLevel = this.planet ? (this.planet.hazardLevel || 0.2) : 0.1;
                const damagePerSec = hazardLevel * 0.5;
                const damageTaken = damagePerSec * timeElapsed;

                desc.health = (desc.health !== undefined ? desc.health : 1000) - damageTaken;

                // 3. Robot Attrition (Random chance based on hazard and time)
                // Approx 5% chance per hour per hazard level
                const attritionChance = hazardLevel * (timeElapsed / 3600) * 0.05;
                if (Math.random() < attritionChance && desc.robotCount > 0) {
                    desc.robotCount--;
                    console.log(`Lost a mining robot to hazards at ${cellKey}. Remaining: ${desc.robotCount}`);
                }

                if (desc.health <= 0) {
                    desc.destroyed = true;
                    this.destroyedCells.add(cellKey);
                    console.log(`Base at ${cellKey} destroyed in background!`);
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
    }

    /**
     * Update mining robots and regenerate ore seams
     * @param {number} dt - Delta time in seconds
     * @private
     */
    _updateMiningRobots(dt) {
        if (!this.miningRobots) return;

        const cleanupRangeSq = (SURFACE_CONFIG.UPDATE_RANGE || 2000) * 1.5;
        const cleanupRangeSqVal = cleanupRangeSq * cleanupRangeSq;
        const playerPos = (this.controlMode === 'ASTRONAUT' && this.astronaut) ? this.astronaut.pos : this.player.pos;

        // Update robots and filter out destroyed ones or those far away
        this.miningRobots = this.miningRobots.filter(robot => {
            if (!robot || robot.destroyed) return false;

            // Distance-based cleanup: if robot is too far from player, remove it.
            // It will be re-instantiated when the player returns and base initialization runs.
            if (playerPos) {
                const dx = robot.pos.x - playerPos.x;
                const dy = robot.pos.y - playerPos.y;
                if (dx * dx + dy * dy > cleanupRangeSqVal) {
                    // Force the base to re-initialize robots when player returns
                    if (robot.homeBase) {
                        robot.homeBase.robotsInitialized = false;
                        // Sync to descriptor to prevent duplicate spawns
                        const desc = this.playerBuiltMap.get(robot.homeBase.cellKey);
                        if (desc) desc.robotsInitialized = false;
                    }
                    return false;
                }
            }

            robot.update(dt, this);
            return true;
        });

        // Regenerate ore seams slowly over time
        for (const [baseKey, baseSeams] of this.oreSeams) {
            for (const [seamKey, seam] of baseSeams) {
                seam.regenerate(dt);
            }
        }
    }

    /**
     * Draw mining robots (ore seams are invisible - mined at random locations)
     * @private
     */
    _drawMiningRobots() {
        if (!this.miningRobots || this.miningRobots.length === 0) return;

        // Only draw robots - ore seams are not visible
        for (let robot of this.miningRobots) {
            if (!robot) continue;
            robot.draw(this);
        }
    }

    /**
     * Draw surface objects with viewport culling
     */
    _drawSurfaceObjects() {
        if (!this.surfaceObjects) return;

        // Use dynamic sun angle from planet position
        const sunAngle = this._getSunAngle();

        // Use adequate padding for visual projection culling to prevent pop-in
        // Flora/fauna need more padding due to varied sizes and movement
        const viewport = this._getViewportBounds(300);
        const extrusionAngle = this._getExtrusionAngle();
        const sin = Math.sin(extrusionAngle);
        const cos = Math.cos(extrusionAngle);

        let objectsDrawn = 0;
        let objectsCulled = 0;

        for (let obj of this.surfaceObjects) {
            if (!obj || obj.destroyed) continue;

            const objAlt = (typeof obj.altitude !== 'undefined') ? obj.altitude : (obj.yOffset || 0);
            const objSize = obj.size || 50;
            const objHeight = obj.height || (objSize * 2);

            // Visual Projection Culling: Project logical position to visual on-screen position
            const visX = obj.pos.x - objAlt * sin;
            const visY = obj.pos.y - objAlt * cos;

            if (visX + objSize < viewport.minX || visX - objSize > viewport.maxX ||
                visY + objSize < viewport.minY || visY - objHeight > viewport.maxY) {
                objectsCulled++;
                continue;
            }

            objectsDrawn++;

            // Local coordinates and altitude for surface objects
            const worldX = obj.pos.x;
            const worldY = obj.pos.y;
            // objAlt already declared above

            // Objects now handle their internal visual projection using world coords and altitude
            if (obj.draw) {
                obj.draw(worldX, worldY, sunAngle, objAlt);
            }

            // Target reticle drawing moved to centralized UIHUD.drawTargetReticle() called via drawHUD()

            // Debug visualization (only if debugMode is enabled)
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

        // Store culling stats for debug overlay
        this._lastObjectCullStats = { drawn: objectsDrawn, culled: objectsCulled };
    }

    /**
     * Draw projectiles from starSystem at their world positions with viewport culling
     * Camera transform handles centering relative to player
     */
    _drawProjectiles() {
        if (!this.starSystem || !this.starSystem.projectiles) return;

        const projectiles = this.starSystem.projectiles;
        const counterScale = this._getCounterScale();
        const sunAngle = this._getSunAngle();

        const extrusionAngle = this._getExtrusionAngle();
        const sin = Math.sin(extrusionAngle);
        const cos = Math.cos(extrusionAngle);

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
     * Draw mines at their world positions
     * @private
     */
    _drawMines() {
        if (!this.starSystem || !this.starSystem.mines) return;

        const mines = this.starSystem.mines;
        if (mines.length === 0) return;

        push();
        this._clearShadow();

        for (const mine of mines) {
            if (mine && !mine.destroyed && typeof mine.draw === 'function') {
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

        const extrusionAngle = this._getExtrusionAngle();
        const sin = Math.sin(extrusionAngle);
        const cos = Math.cos(extrusionAngle);

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

        // Draw main beam line
        stroke(beam.color);
        strokeWeight(3 * counterScale);
        line(vStartX, vStartY, vEndX, vEndY);

        // Draw glow effect
        stroke(beam.color[0], beam.color[1], beam.color[2], 100);
        strokeWeight(6 * counterScale);
        line(vStartX, vStartY, vEndX, vEndY);

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

        noStroke();
        fill(0, 0, 0, alpha);
        rect(0, 0, width, height);
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

console.log("surfaceMode.js loaded");

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
