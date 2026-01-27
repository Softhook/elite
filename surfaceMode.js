// ****** surfaceMode.js ******
// Surface flight mode controller for planetary surface gameplay
// Uses 3D mesh terrain rendering based on surface_test.html

/**
 * Configuration constants for surface mode
 */
const SURFACE_CONFIG = {
    // Flight mechanics
    MIN_ALTITUDE: 10,
    MAX_ALTITUDE: 500,
    DEFAULT_ALTITUDE: 100,
    TURN_SPEED: 2.5,           // Radians per second
    MAX_SPEED: 300,            // Legacy - now uses SHIP_DEFINITIONS
    STRAFE_SPEED: 200,         // Legacy - now uses SharedPhysics
    CLIMB_SPEED: 150,

    // Terrain mesh
    MESH_RESOLUTION: 100,      // Grid resolution
    MESH_SIZE: 4000,           // World units covered
    DEFAULT_FEATURE_SEED: 12345, // Fallback seed for terrain generation

    // Transition
    TRANSITION_DURATION: 2000, // ms for enter/exit transitions
    TRIGGER_KEY: 71,           // 'G' key for surface descent

    // Visual
    SUN_ANGLE: -Math.PI / 4,
    FIRE_RATE: 8,              // Shots per second

    // Shadow rendering
    SHADOW_BASE_OFFSET: 20,    // Base shadow offset distance
    SHADOW_ALTITUDE_SCALE: 0.15, // Shadow offset multiplier per altitude unit

    // Defense Drone Configuration
    DRONE: {
        DETECTION_RANGE: 800,      // Units
        DETECTION_ALTITUDE: 50,    // Units above terrain
        FLYING_HEIGHT: 80,         // Units above ground
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
        DETECTION_HEIGHT_THRESHOLD: 30, // Units above turret base for detection
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
        this.altitude = SURFACE_CONFIG.DEFAULT_ALTITUDE;
        this.objectCache = new Map(); // Cache for persistent objects
        this.debugMode = false; // Set to true to spawn only one turret for testing

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

        // Saved player position for return
        this.savedPlayerPos = null;
    }

    /**
     * Check if surface mode is active or transitioning
     */
    isActive() {
        return this.state !== SURFACE_STATE.INACTIVE;
    }

    // ============================================
    // DRY Helper Methods - Shared Calculations
    // ============================================

    /**
     * Calculate perspective scale factor based on current altitude
     * Higher altitude = zoomed out (smaller scale), lower = zoomed in (larger scale)
     * @returns {number} Scale factor (1.2 at min altitude, 0.6 at max altitude)
     * @private
     */
    _getPerspectiveScale() {
        return map(this.altitude, SURFACE_CONFIG.MIN_ALTITUDE, SURFACE_CONFIG.MAX_ALTITUDE, 1.2, 0.6);
    }

    /**
     * Calculate counter-scale factor to maintain constant screen size for UI elements
     * This is the inverse of perspective scale - objects drawn with this stay same size
     * @returns {number} Counter-scale factor (inverse of perspective scale)
     * @private
     */
    _getCounterScale() {
        return 1 / this._getPerspectiveScale();
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
     * Find the best canyon/valley location for shield generator placement
     * Searches multiple deterministic locations and scores them based on terrain features
     * @param {number} searchCount - Number of locations to probe
     * @returns {{x: number, y: number, score: number}} Best canyon location and its score
     * @private
     */
    _findBestCanyonLocation(searchCount = 12) {
        const seed = this.planet.seed || 12345;
        let bestScore = -Infinity;
        let bestX = this.surfaceX;
        let bestY = this.surfaceY;

        for (let i = 0; i < searchCount; i++) {
            const mixedSeed = this._hash(seed ^ this._hash(i));
            const angle = ((mixedSeed >>> 0) / 0xFFFFFFFF) * Math.PI * 2;
            const mixedRadius = this._hash(mixedSeed);
            const radius = 6000 + (Math.abs(mixedRadius % 6000)); // 6km to 12km

            const tx = this.surfaceX + Math.cos(angle) * radius;
            const ty = this.surfaceY + Math.sin(angle) * radius;

            // Sample center height
            const hCenter = this.terrain.getHeightAt(tx, ty);

            // Sample 4 surrounding points to check for canyon walls
            const wallDist = 400;
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
    enter(player, planet, starSystem) {
        if (!this.canEnter(player, planet)) {
            console.warn("Cannot enter surface mode - conditions not met");
            return false;
        }

        console.log(`Entering surface mode on ${planet.name}`);

        this.state = SURFACE_STATE.ENTERING;
        this.player = player;
        this.planet = planet;
        this.starSystem = starSystem;

        // Save player position for return
        this.savedPlayerPos = player.pos.copy();

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

        // Mute space ambient sounds
        if (typeof ambientSoundManager !== 'undefined') {
            ambientSoundManager.stopAll();
        }

        // Initialize terrain module (lightweight setup only)
        this.terrain.setPlanet(planet);
        this.terrain.createBuffer(width, height);
        this.projectiles = [];
        this.surfaceObjects = [];

        // Calculate deterministic target position for Shield Generator (Planet Boss)
        // Enable for ALL planets, not just inhabited ones
        this.targetPos = null;
        if (this.planet) {
            const result = this._findBestCanyonLocation(12);
            this.targetPos = createVector(result.x, result.y);
            console.log(`[CanyonRun] Target found in valley! Score: ${Math.round(result.score)}, Height: ${Math.round(this.terrain.getHeightAt(result.x, result.y))}`);
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

        // Change music chords on ascent (start of transition)
        if (typeof spaceMusicManager !== 'undefined') {
            spaceMusicManager.advanceChordProgression();
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

            // Altitude control - BEFORE physics update so player.altitude uses current value
            this.altitude += this.altitudeInput * SURFACE_CONFIG.CLIMB_SPEED * dt;

            // Constrain altitude relative to terrain (not absolute)
            // Player must maintain MIN_ALTITUDE clearance above ground
            const currentGroundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
            const minAbsoluteAlt = currentGroundH + SURFACE_CONFIG.MIN_ALTITUDE;
            this.altitude = constrain(this.altitude, minAbsoluteAlt, SURFACE_CONFIG.MAX_ALTITUDE);

            this._updatePhysics(dt);

            // Update terrain - regenerate if player moved to new grid cell
            if (this.terrain.generateMesh(this.surfaceX, this.surfaceY)) {
                // Force buffer update when mesh regenerates (player moved to new grid cell)
                this.terrain.updateBuffer(this.altitude, width, height, true);
                this._spawnObjects(this.terrain.getGridPosition().x, this.terrain.getGridPosition().y);
            } else {
                // Conditionally update buffer based on altitude change (skip if stable)
                this.terrain.updateBuffer(this.altitude, width, height);
            }

            // Update surface objects (single pass, dt-corrected)
            if (this.surfaceObjects) {
                for (let obj of this.surfaceObjects) {
                    if (obj.update) obj.update(dt, this.player, this.starSystem);
                }
            }

            this._checkSurfaceCollisions();

            // Update starSystem like when docked - NPCs move but player is invulnerable
            // Commented out to prevent sound leaks from space combat while on surface
            /*
            if (this.starSystem && typeof this.starSystem.updateWhileDocked === 'function') {
                this.starSystem.updateWhileDocked();
            }
            */

            // Update projectiles only (surface projectiles need to move)
            // This is safe as it only updates existing projectiles without spawning/firing
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
        if (this.state === SURFACE_STATE.ENTERING && !this._terrainReady) {
            // Generate terrain mesh and buffer - this takes ~50-100ms
            if (this.terrain.generateMesh(this.surfaceX, this.surfaceY, true)) {
                this.terrain.updateBuffer(this.altitude, width, height);
                this._spawnObjects(this.terrain.getGridPosition().x, this.terrain.getGridPosition().y);
            }
            this._terrainReady = true;
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
        this.player.weaponsDisabled = false;
        this.player.inNebula = false;

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
    }

    /**
     * Calculate visual bounds for collision and rendering
     * Hit detection uses only the base plate on the ground surface
     * @private
     */
    _getVisualBounds(obj) {
        const extrusionAngle = 0.5; // Must match Draw3D
        // Visual Base Position (accounting for terrain yOffset)
        const visualBaseY = obj.pos.y - (obj.yOffset || 0);

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
     * @returns {{left: number, right: number, top: number, bottom: number}} Viewport bounds
     * @private
     */
    _getViewportBounds(padding = 200) {
        // Defensive null check - surface mode should always have player,
        // but guard against edge cases during initialization/cleanup
        if (!this.player || !this.player.pos) {
            return { left: 0, right: width, top: 0, bottom: height };
        }

        const perspectiveScale = this._getPerspectiveScale();
        const viewportWidth = (width / perspectiveScale) + padding * 2;
        const viewportHeight = (height / perspectiveScale) + padding * 2;

        return {
            left: this.player.pos.x - viewportWidth / 2,
            right: this.player.pos.x + viewportWidth / 2,
            top: this.player.pos.y - viewportHeight / 2,
            bottom: this.player.pos.y + viewportHeight / 2
        };
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
    }

    /**
     * Check projectile-terrain collisions (ground hits)
     * @private
     */
    _checkProjectileTerrainCollisions() {
        for (let proj of this.starSystem.projectiles) {
            if (!proj || proj.destroyed) continue;
            if (!proj.isSurface) continue;

            const projPos = proj.pos;

            // For enemy projectiles with trajectory data, interpolate altitude toward target
            if (proj.startAltitude !== undefined && proj.targetAltitude !== undefined && proj.owner !== this.player) {
                const maxLife = 120;
                const elapsed = maxLife - (proj.lifespan || maxLife);
                const progress = Math.min(1, elapsed / maxLife);
                proj.altitude = proj.startAltitude + (proj.targetAltitude - proj.startAltitude) * progress;
            }

            // Check terrain collision (ground hit)
            const terrainH = this._getTerrainHeightAt(projPos.x, projPos.y);
            const projAlt = proj.altitude || 0;

            if (projAlt <= terrainH + 2) {
                this._createSurfaceExplosion(projPos.x, projPos.y, 0, 8, [255, 100, 50], true);
                proj.destroyed = true;
            }
        }
    }

    /**
     * Check player projectile hits on surface objects
     * @private
     */
    _checkPlayerProjectileCollisions() {
        if (!this.surfaceObjects || this.surfaceObjects.length === 0) return;

        for (let proj of this.starSystem.projectiles) {
            if (!proj || proj.destroyed) continue;
            if (!proj.isSurface) continue;
            if (proj.owner !== this.player) continue;

            const projPos = proj.pos;

            for (let obj of this.surfaceObjects) {
                if (!obj || obj.destroyed) continue;

                const bounds = this._getVisualBounds(obj);
                const dx = projPos.x - bounds.base.x;
                const dy = projPos.y - bounds.base.y;
                const distSq = dx * dx + dy * dy;
                const hitRadiusSq = bounds.radius * bounds.radius;

                if (distSq < hitRadiusSq) {
                    const objName = obj.type || obj.id || obj.constructor.name;
                    console.log(`Hit on surface object [${objName}]!`);
                    obj.takeDamage(proj.damage || 10);
                    proj.destroyed = true;

                    this._createSurfaceExplosion(projPos.x, projPos.y, 0, 10, [255, 150, 50]);

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
        if (!this.player || this.player.destroyed) return;

        for (let proj of this.starSystem.projectiles) {
            if (!proj || proj.destroyed) continue;
            if (!proj.isSurface) continue;
            if (proj.owner === this.player) continue;

            // Interpolate altitude for enemy projectiles with trajectory data
            if (proj.startAltitude !== undefined && proj.targetAltitude !== undefined) {
                const maxLife = 120;
                const elapsed = maxLife - (proj.lifespan || maxLife);
                const progress = Math.min(1, elapsed / maxLife);
                proj.altitude = proj.startAltitude + (proj.targetAltitude - proj.startAltitude) * progress;
            }

            const dx = proj.pos.x - this.player.pos.x;
            const dy = proj.pos.y - this.player.pos.y;
            const distSq = dx * dx + dy * dy;
            const hitRadiusSq = this.player.size * this.player.size;

            if (distSq < hitRadiusSq) {
                const playerAlt = this.player.altitude || 0;
                const projAlt = proj.altitude || 0;

                // Projectile hits if player is at or above the projectile's altitude
                if (playerAlt >= projAlt) {
                    console.log(`Player hit by surface projectile!`);
                    this.player.takeDamage(proj.damage || 5);
                    this._createSurfaceExplosion(proj.pos.x, proj.pos.y, 0, 15, [255, 50, 50]);
                    proj.destroyed = true;
                }
            }
        }
    }

    /**
     * Create explosion with appropriate positioning for surface mode
     * 
     * @param {number} x - World X coordinate  
     * @param {number} y - World Y coordinate
     * @param {number} altitude - Altitude above terrain (0 for ground-level explosions)
     * @param {number} size - Explosion size
     * @param {Array} color - RGB color array
     * @param {boolean} silent - If true, suppress explosion sound (default: false)
     * 
     * NOTE: The extrusion angle creates a pseudo-3D effect. For most explosions at ground
     * level (projectile hits), pass altitude=0 since projectile positions are already visual.
     */
    _createSurfaceExplosion(x, y, altitude, size, color, silent = false) {
        if (!this.starSystem || !this.starSystem.addExplosion) return;

        // Calculate visual offset based on altitude (matches Draw3D extrusion)
        const extrusionAngle = 0.5; // Must match surfaceObjects.js
        const visualX = x - (altitude * Math.sin(extrusionAngle));
        const visualY = y - (altitude * Math.cos(extrusionAngle));

        this.starSystem.addExplosion(visualX, visualY, size, color, true, silent);
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
        // 1. Center camera on player
        translate(width / 2, height / 2);

        // 2. Perspective scaling (everything world-side scales together)
        // We still use altitude for zoom, but it doesn't affect the coordinate scale ratio anymore
        const perspectiveScale = this._getPerspectiveScale();
        scale(perspectiveScale);

        // 3. World translation (camera follows player)
        translate(-this.player.pos.x, -this.player.pos.y);

        // Draw terrain
        this._drawTerrain();

        // Draw surface objects, explosions, and projectiles (all use world coords)
        this._drawSurfaceObjects();
        this._drawExplosions();
        this._drawProjectiles();

        // Draw beam and force wave effects (no projectile, direct rendering)
        this._drawBeams();
        this._drawForceWaves();

        // Draw player ship
        this._drawPlayerShip();

        pop();

        // Draw game HUD (shields, hull, speed, etc. - NOT scaled)
        this._drawGameHUD();

        // Draw surface-specific HUD (altitude bar, compass)
        this._drawHUD();

        // Transition overlay
        if (this.state === SURFACE_STATE.ENTERING ||
            this.state === SURFACE_STATE.EXITING) {
            this._drawTransitionOverlay();
        }
    }

    /**
     * Get sun angle relative to planet surface
     * Uses planet position relative to origin (where sun is) to calculate light direction
     */
    _getSunAngle() {
        if (!this.planet || !this.planet.pos) {
            return -Math.PI / 4; // Default fallback
        }
        // Sun is at origin (0,0), planet orbits around it
        // Sun direction from planet surface = angle from planet to origin
        return Math.atan2(-this.planet.pos.y, -this.planet.pos.x);
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
     * Draw terrain mesh - delegates to terrain module
     */
    _drawTerrain() {
        this.terrain.draw();
    }

    _spawnObjects(gridX, gridY) {
        if (!this.planet) return;

        this.surfaceObjects = [];
        const resolution = SURFACE_CONFIG.MESH_RESOLUTION;
        const cellSize = SURFACE_CONFIG.MESH_SIZE / resolution;
        const planetSeed = this.planet.nameHash || 12345;

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
            this.surfaceObjects.push(debugTurret);
            this.objectCache.set(cellKey, debugTurret);
            return;
        }

        // Iterate over the entire active grid area
        for (let gy = 0; gy < resolution; gy++) {
            for (let gx = 0; gx < resolution; gx++) {
                const activeGridX = gridX + (gx - Math.floor(resolution / 2));
                const activeGridY = gridY + (gy - Math.floor(resolution / 2));

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
                const wx = activeGridX * cellSize;
                const wy = activeGridY * cellSize;
                const h = this._getTerrainHeightAt(wx, wy);
                const subHash = (cellHash * 123.45) % 1;
                const objSeed = cellHash * 100000;

                // --- 1. SHIELD GENERATOR (Planet Boss) ---
                // [CRITICAL FIX] Check for generator spawning FIRST, before zone or habitation checks.
                // This ensures it ALWAYS spawns in its calculated valley, even on wilderness/uninhabited planets.
                const isTargetCell = this.targetPos &&
                    Math.abs(wx - this.targetPos.x) < cellSize / 2 &&
                    Math.abs(wy - this.targetPos.y) < cellSize / 2;

                if (isTargetCell && typeof ShieldGenerator !== 'undefined') {
                    obj = new ShieldGenerator(wx, wy);
                    obj.yOffset = h;
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

                // 0. Habitation Check - Uninhabited planets spawn secret caches instead
                // [DEBUG FIX] If near target, we ignore the habitability check to spawn the boss base
                if (this.planet && !this.planet.isInhabited && !isNearTarget) {
                    // SECRET CACHE SPAWNING for uninhabited planets
                    if (cellHash < 0.00005 && typeof SecretCache !== 'undefined') {
                        obj = new SecretCache(wx, wy, objSeed);
                    }
                } else {
                    // Settlement Zones: Large areas where buildings cluster
                    const settlementNoise = noise(activeGridX * 0.015 + 500, activeGridY * 0.015 + 500);
                    const isSettlementZone = settlementNoise > 0.60;
                    const isHighTerrain = h > 100;

                    // Get civilization color and economy type for buildings
                    const civColor = (this.planet && this.planet.cityLightsColor) ? this.planet.cityLightsColor : null;
                    const economyType = this.planet?.economyType || 'Service';

                    // TECH LEVEL affects defense density (0-5 scale)
                    // [MASSIVE REDUCTION] Scaled down further for extreme sparse gameplay
                    const techLevel = this.planet?.techLevel || 3;
                    let techModifier = 0.0002 + (techLevel / 5) * 0.0003;
                    const militaryBonus = (economyType === 'Military') ? 0.001 : 0;
                    let defenseDensity = techModifier + militaryBonus;

                    // --- SHIELD GENERATOR BASE DEFENSE ---
                    if (isNearTarget && this.targetPos) {
                        const tdx = wx - this.targetPos.x;
                        const tdy = wy - this.targetPos.y;
                        const distToTargetSq = tdx * tdx + tdy * tdy;
                        // MASSIVELY REDUCED: Ultra-sparse defenses around target (max ~1%)
                        defenseDensity = Math.max(defenseDensity, 0.001 + (1 - Math.sqrt(distToTargetSq) / 2000) * 0.005);
                    }

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

                // If an object was created, finalize and cache it
                if (obj) {
                    obj.yOffset = h;
                    this.surfaceObjects.push(obj);
                    this.objectCache.set(cellKey, obj);
                } else {
                    this.objectCache.set(cellKey, null);
                }
            }
        }

        // Periodically clean cache to prevent memory leak (remove distant objects)
        if (frameCount % 600 === 0) {
            const keepRadius = resolution;
            for (const [key, obj] of this.objectCache) {
                const [ox, oy] = key.split(',').map(Number);
                if (Math.abs(ox - gridX) > keepRadius || Math.abs(oy - gridY) > keepRadius) {
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
     * Draw surface objects with viewport culling
     */
    _drawSurfaceObjects() {
        if (!this.surfaceObjects) return;

        // Use dynamic sun angle from planet position
        const sunAngle = this._getSunAngle();

        // Calculate viewport bounds for culling
        const viewport = this._getViewportBounds(200);

        let objectsDrawn = 0;
        let objectsCulled = 0;

        for (let obj of this.surfaceObjects) {
            if (!obj || obj.destroyed) continue;

            // Viewport culling: check if object is within visible bounds
            // Use object size to create a bounding box
            const objSize = obj.size || 50;
            const objHeight = obj.height || (objSize * 2);

            // Check horizontal and vertical bounds
            if (obj.pos.x + objSize < viewport.left || obj.pos.x - objSize > viewport.right ||
                obj.pos.y + objSize < viewport.top || obj.pos.y - objHeight > viewport.bottom) {
                objectsCulled++;
                continue;
            }

            objectsDrawn++;

            // Drawn directly at world position. Transformation is handled by the camera in draw()
            if (obj.draw) {
                // Pass world coordinates. Object.draw translates to these.
                // Camera will subtract player.pos automatically.
                obj.draw(obj.pos.x, obj.pos.y - (obj.yOffset || 0), sunAngle);
            }

            // Draw Target Reticle if this object is the player's target
            if (this.player && this.player.target === obj) {
                const drawX = obj.pos.x;
                const drawY = obj.pos.y - (obj.yOffset || 0);

                push();
                translate(drawX, drawY);
                // Reticle drawing (consistent with EnemyRendering style)
                noFill();
                stroke(0, 255, 0, 200); // Green
                strokeWeight(2);

                const size = obj.size || 50;
                // Draw circle slightly larger than object
                ellipse(0, 0, size * 1.6, size * 1.6);

                // Corner brackets
                const bracketSize = size * 0.3;
                const offset = size * 0.7;

                // Top-left
                line(-offset, -offset, -offset + bracketSize, -offset);
                line(-offset, -offset, -offset, -offset + bracketSize);
                // Top-right
                line(offset, -offset, offset - bracketSize, -offset);
                line(offset, -offset, offset, -offset + bracketSize);
                // Bottom-left
                line(-offset, offset, -offset + bracketSize, offset);
                line(-offset, offset, -offset, offset - bracketSize);
                // Bottom-right
                line(offset, offset, offset - bracketSize, offset);
                line(offset, offset, offset, offset - bracketSize);

                pop();
            }

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
        if (!this.player) return;

        // Calculate viewport bounds for culling
        const viewport = this._getViewportBounds(100);

        // Calculate counter-scale so projectiles stay constant screen size
        const counterScale = this._getCounterScale();

        push();
        // Clear shadow settings to prevent visual artifacts
        this._clearShadow();

        for (const proj of this.starSystem.projectiles) {
            if (proj && !proj.destroyed && proj.isSurface) {
                // Viewport culling for projectiles
                if (proj.pos.x < viewport.left || proj.pos.x > viewport.right ||
                    proj.pos.y < viewport.top || proj.pos.y > viewport.bottom) {
                    continue;
                }

                // Apply counter-scale to projectile
                push();
                translate(proj.pos.x, proj.pos.y);
                scale(counterScale);
                translate(-proj.pos.x, -proj.pos.y);
                proj.draw();
                pop();
            }
        }
        pop();
    }

    _drawExplosions() {
        if (!this.starSystem || !this.starSystem.explosions) return;
        if (!this.player) return;

        const explosions = this.starSystem.explosions;
        if (!explosions) return;

        // Calculate viewport bounds for culling
        const viewport = this._getViewportBounds(100);

        for (let i = 0; i < explosions.length; i++) {
            const exp = explosions[i];
            if (exp && !exp.destroyed && exp.isSurface) {
                // Viewport culling for explosions
                if (exp.pos.x < viewport.left || exp.pos.x > viewport.right ||
                    exp.pos.y < viewport.top || exp.pos.y > viewport.bottom) {
                    continue;
                }

                // Draw at world position - no altitude offset needed
                // The camera transform handles centering everything
                exp.draw();
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

        // Only draw if beam was recently fired (within 150ms)
        if (now - beam.time >= 150) return;

        // Calculate scale to maintain constant beam thickness
        const counterScale = this._getCounterScale();

        push();
        // Clear shadow settings to prevent visual artifacts
        this._clearShadow();

        // Draw main beam line
        stroke(beam.color);
        strokeWeight(3 * counterScale);
        line(beam.start.x, beam.start.y, beam.end.x, beam.end.y);

        // Draw glow effect
        stroke(beam.color[0], beam.color[1], beam.color[2], 100);
        strokeWeight(6 * counterScale);
        line(beam.start.x, beam.start.y, beam.end.x, beam.end.y);

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

        for (const wave of this.starSystem.forceWaves) {
            if (!wave) continue;
            // Only draw surface mode force waves (filter out space combat)
            if (!wave.isSurface) continue;

            // Fade out as the wave expands
            const alpha = map(wave.radius, 0, wave.maxRadius, 220, 0);

            // Draw outer ring
            noFill();
            strokeWeight(6);
            stroke(wave.color[0], wave.color[1], wave.color[2], alpha);
            circle(wave.pos.x, wave.pos.y, wave.radius * 2);

            // Draw secondary ring
            strokeWeight(3);
            stroke(255, 255, 255, alpha * 0.7);
            circle(wave.pos.x, wave.pos.y, wave.radius * 1.9);

            // Draw inner glow
            strokeWeight(10);
            stroke(wave.color[0], wave.color[1], wave.color[2], alpha * 0.5);
            circle(wave.pos.x, wave.pos.y, wave.radius * 1.7);

            // Draw center pulse
            const pulseSize = (millis() - wave.startTime) % 300 / 300 * 50;
            fill(wave.color[0], wave.color[1], wave.color[2], alpha);
            noStroke();
            circle(wave.pos.x, wave.pos.y, pulseSize);
        }

        pop();
    }

    /**
     * Draw player ship and its shadow on the terrain
     * @private
     */
    _drawPlayerShip() {
        if (!this.player) return;

        // Calculate the inverse of perspective scale to keep ship at constant size
        const counterScale = this._getCounterScale();

        // Get sun direction from planet position (sun at origin)
        const sunAngle = this._getSunAngle();

        // 1. Draw shadow on terrain - realistic shadow projection
        // Physics: Shadow cast by sun at an angle
        // - At minimum altitude: Shadow directly beneath ship (offset = 0)
        // - Higher altitude: Shadow offset from ship based on sun angle and height

        // Calculate radar altitude (clearance above ground)
        const groundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
        const radarAlt = this.altitude - groundH;

        // Shadow offset: proportional to altitude
        // At minimum altitude (10): offset = 0 (directly beneath ship)
        // At altitude 100: offset ≈ 13.5 units
        // At altitude 200: offset ≈ 28.5 units
        const shadowOffset = Math.max(0, (radarAlt - SURFACE_CONFIG.MIN_ALTITUDE) * SURFACE_CONFIG.SHADOW_ALTITUDE_SCALE);

        // DEBUG: Log when player is at low altitude
        if (radarAlt < 20) {
            console.log(`[SHADOW] absAlt=${this.altitude.toFixed(1)}, groundH=${groundH.toFixed(1)}, radarAlt=${radarAlt.toFixed(1)}, shadowOffset=${shadowOffset.toFixed(2)}`);
        }

        const shadowOffsetX = Math.cos(sunAngle + Math.PI) * shadowOffset;
        const shadowOffsetY = Math.sin(sunAngle + Math.PI) * shadowOffset;

        // Shadow size: Always smaller than ship, shrinks with altitude
        // At minimum altitude (10): 0.6x ship size (significantly smaller than ship)
        // At high altitude (200): 0.4x ship size (tiny due to perspective)
        const shadowScale = map(radarAlt, SURFACE_CONFIG.MIN_ALTITUDE, 200, 0.6, 0.4);

        // Hide shadow when player is destroyed or dying/exploding
        if (!this.player.destroyed && !this.player.isDying) {
            push();

            // Position shadow at offset from ship based on sun angle and altitude
            // The offset is calculated from radar altitude, representing the horizontal
            // displacement of the shadow due to sun angle.
            // We draw at this exact World X/Y.
            const shadowX = this.player.pos.x + shadowOffsetX;
            const shadowY = this.player.pos.y + shadowOffsetY;

            translate(shadowX, shadowY);

            // Rotate to match ship orientation
            rotate(this.player.angle);

            // Shadow darkness: darker when close to ground, lighter when high
            const shadowAlpha = map(radarAlt, SURFACE_CONFIG.MIN_ALTITUDE, 200, 140, 40);
            fill(0, 0, 0, shadowAlpha);
            noStroke();

            // Draw shadow using ship vertices if available
            // Apply counter-scale to shadow to keep it consistent with ship
            // (Ship is drawn with counter-scale to maintain screen size)
            if (typeof counterScale !== 'undefined') {
                scale(counterScale);
            }

            const shipTypeName = this.player.shipTypeName || 'Sidewinder';
            let shipDef = this.player._cachedShipDef ||
                (typeof SHIP_DEFINITIONS !== 'undefined' ? SHIP_DEFINITIONS[shipTypeName] : null);

            // Get vertex data
            let vertices = null;
            if (shipDef) {
                if (shipDef.vertexLayers && shipDef.vertexLayers.length > 0 && shipDef.vertexLayers[0].vertexData) {
                    vertices = shipDef.vertexLayers[0].vertexData;
                } else if (shipDef.vertexData && shipDef.vertexData.length > 0) {
                    vertices = shipDef.vertexData;
                }
            }

            if (vertices && vertices.length > 0) {
                // Draw shadow using ship vertices, scaled by shadowScale
                const shipScale = this.player.size / 25;
                const shadowVertexScale = shipScale * 25 * shadowScale;
                beginShape();
                for (const v of vertices) {
                    vertex(v.x * shadowVertexScale, v.y * shadowVertexScale);
                }
                endShape(CLOSE);
            } else {
                // Fallback to ellipse if no vertex data
                const shadowSize = this.player.size * shadowScale;
                ellipse(0, 0, shadowSize, shadowSize * 0.8);
            }

            pop();
        }

        // 2. Draw actual ship model at its world position with counter-scale
        // This keeps the ship at constant screen size regardless of altitude
        // Hide ship when destroyed or dying/exploding
        if (!this.player.destroyed && !this.player.isDying) {
            push();
            translate(this.player.pos.x, this.player.pos.y);
            scale(counterScale);
            translate(-this.player.pos.x, -this.player.pos.y);
            this.player.draw();
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
     * Draw HUD elements
     */
    _drawHUD() {
        push();

        // Performance stats (top left, only if debugMode is explicitly enabled)
        const terrainStats = this.terrain?.lastCullStats;
        if (this.debugMode) {
            push();
            const DEBUG_PANEL_HEIGHT_BASIC = 95;
            const DEBUG_PANEL_HEIGHT_EXTENDED = 110;
            const panelHeight = this.debugMode && this.player ? DEBUG_PANEL_HEIGHT_EXTENDED : DEBUG_PANEL_HEIGHT_BASIC;
            fill(0, 0, 0, 180);
            stroke(80, 80, 80);
            strokeWeight(1);
            rect(10, 10, 200, panelHeight, 3);

            fill(100, 255, 100);
            noStroke();
            textSize(10);
            textAlign(LEFT, TOP);
            text('Surface Render Stats:', 15, 15);

            fill(200);
            if (terrainStats) {
                const total = terrainStats.drawn + terrainStats.culled;
                const cullPercent = total > 0 ? ((terrainStats.culled / total) * 100).toFixed(1) : 0;
                text(`Terrain: ${terrainStats.drawn}/${total} (${cullPercent}% culled)`, 15, 30);
            }
            if (this._lastObjectCullStats) {
                const total = this._lastObjectCullStats.drawn + this._lastObjectCullStats.culled;
                const cullPercent = total > 0 ? ((this._lastObjectCullStats.culled / total) * 100).toFixed(1) : 0;
                text(`Objects: ${this._lastObjectCullStats.drawn}/${total} (${cullPercent}% culled)`, 15, 45);
            }

            text(`FPS: ${Math.round(frameRate())}`, 15, 60);
            text(`R-ALT: ${Math.round(this.altitude)}`, 15, 75);

            // Show terrain height and absolute altitude for debugging (only in debug mode)
            if (this.debugMode && this.player) {
                const groundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
                text(`Ground: ${Math.round(groundH)}`, 15, 90);
                text(`Abs-ALT: ${Math.round(this.player.altitude)}`, 15, 105);
            }
            pop();
        }

        // Surface Controls Hint (Top Center)
        const hintY = 45 + 24 + 5;
        fill(40, 80, 120, 200);
        noStroke();
        rect(0, hintY, width, 20);

        textAlign(CENTER, CENTER);
        // Ensure consistent typeface
        if (typeof font !== 'undefined' && font) textFont(font);
        textSize(STATION_TEXT_SIZE.BODY);
        fill(255, 255, 100);
        text("[T] Ascend [G] Descend", width / 2, hintY + 10);

        // Altitude bar
        const barX = width - 50;
        const barY = height / 2 - 100;
        const barHeight = 200;
        const barWidth = 25;

        fill(0, 0, 0, 180);
        stroke(80, 80, 80);
        strokeWeight(1);
        rect(barX, barY, barWidth, barHeight, 3);

        // Get terrain height at player position
        const groundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);

        // Player's absolute altitude (terrain is now 0-500, so no negative values)
        const absAlt = Math.max(0, this.player?.altitude || 0);
        const maxDisplayAlt = 500; // Display range (0-500m)

        // Find highest nearby enemy altitude (detection threshold)
        let maxEnemyAlt = 0;
        let nearbyEnemies = 0;
        const detectionRange = 800; // Check enemies within this range

        if (this.surfaceObjects && this.surfaceObjects.length > 0) {
            for (const obj of this.surfaceObjects) {
                if (obj && (obj.constructor.name === 'Turret' || obj.constructor.name === 'DefenseDrone') && !obj.destroyed) {
                    // Check if enemy is nearby
                    const dx = obj.pos.x - this.player.pos.x;
                    const dy = obj.pos.y - this.player.pos.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < detectionRange * detectionRange) {
                        const enemyAlt = obj.yOffset || 0;
                        maxEnemyAlt = Math.max(maxEnemyAlt, enemyAlt);
                        nearbyEnemies++;
                    }
                }
            }
        }

        // Determine detection status
        const isDetected = nearbyEnemies > 0 && absAlt >= maxEnemyAlt;

        // Draw ground level indicator
        if (groundH >= 0 && groundH <= maxDisplayAlt) {
            const groundY = barY + barHeight - (barHeight * groundH / maxDisplayAlt);
            stroke(100, 200, 100);
            strokeWeight(2);
            line(barX, groundY, barX + barWidth, groundY);

            // Label
            noStroke();
            fill(100, 200, 100);
            textSize(9);
            textAlign(LEFT, CENTER);
            text('GND', barX + barWidth + 5, groundY);
        }

        // Draw detection threshold (highest enemy relative altitude) - yellow/orange dashed line
        if (nearbyEnemies > 0 && maxEnemyAlt >= 0 && maxEnemyAlt <= maxDisplayAlt) {
            const detectionY = barY + barHeight - (barHeight * maxEnemyAlt / maxDisplayAlt);

            // Dashed line
            stroke(255, 200, 0);
            strokeWeight(2);
            drawingContext.setLineDash([5, 5]);
            line(barX, detectionY, barX + barWidth, detectionY);
            drawingContext.setLineDash([]);

            // Red zone above detection threshold (danger zone)
            fill(255, 80, 80, 60);
            noStroke();
            const dangerZoneHeight = detectionY - barY;
            if (dangerZoneHeight > 0) {
                rect(barX + 2, barY + 2, barWidth - 4, dangerZoneHeight);
            }

            // Label
            noStroke();
            fill(255, 200, 0);
            textSize(9);
            textAlign(LEFT, CENTER);
            text('DET', barX + barWidth + 5, detectionY);
        }

        // Player altitude indicator (color-coded by detection status)
        const playerAltY = barY + barHeight - (barHeight * Math.min(absAlt, maxDisplayAlt) / maxDisplayAlt);

        // Color: Green if hidden, Red if detected
        if (isDetected) {
            stroke(255, 50, 50);
            fill(255, 50, 50);
        } else {
            stroke(50, 255, 50);
            fill(50, 255, 50);
        }
        strokeWeight(3);
        line(barX - 5, playerAltY, barX + barWidth + 5, playerAltY);

        // Player altitude triangle marker
        noStroke();
        triangle(
            barX + barWidth + 8, playerAltY,
            barX + barWidth + 15, playerAltY - 4,
            barX + barWidth + 15, playerAltY + 4
        );

        // Labels
        noStroke();
        fill(255);
        textSize(11);
        textAlign(CENTER, TOP);
        text('ALT', barX + barWidth / 2, barY - 18);

        // Show absolute altitude value with detection status
        if (isDetected) {
            fill(255, 100, 100);
            text(Math.floor(absAlt) + ' [!]', barX + barWidth / 2, barY + barHeight + 5);
        } else {
            fill(100, 255, 100);
            text(Math.floor(absAlt), barX + barWidth / 2, barY + barHeight + 5);
        }

        // Compass - positioned at bottom-right corner (same as minimap in space), sized to match minimap
        const compassSize = 250; // 
        const compassMargin = 0;  // Match minimap margin
        const compassX = width - compassSize / 2 - compassMargin;
        const compassY = height - compassSize / 2 - compassMargin;
        const compassRadius = compassSize / 2 - 20; // Slightly smaller for labels
        const markerMaxRadius = compassRadius - 20; // Max distance for markers

        push();
        translate(compassX, compassY);

        // Background circle with semi-transparent fill (match minimap style)
        fill(10, 15, 40, 180);
        stroke(0, 200, 0, 200);
        strokeWeight(1);
        ellipse(0, 0, compassSize, compassSize);

        // Inner reference circle
        noFill();
        stroke(100, 100, 100, 100);
        strokeWeight(1);
        ellipse(0, 0, compassSize - 40, compassSize - 40);

        // Cardinal direction labels
        fill(200);
        noStroke();
        textSize(12);
        textAlign(CENTER, CENTER);
        text('N', 0, -compassRadius);
        text('S', 0, compassRadius);
        text('E', compassRadius, 0);
        text('W', -compassRadius, 0);





        // Player heading indicator
        push();
        rotate(this.playerAngle);
        stroke(255, 50, 50);
        strokeWeight(1);
        line(0, 0, markerMaxRadius, 0);
        pop();

        // 1. Mission Waypoint (Shield Generator) - Locked to edge
        if (this.targetPos) {
            const dx = this.targetPos.x - this.player.pos.x;
            const dy = this.targetPos.y - this.player.pos.y;
            const distSq = dx * dx + dy * dy;

            // Only show if generator not yet destroyed (or check if objective active)
            // We'll check if it's found in surfaceObjects and destroyed
            let targetDestroyed = false;
            for (const obj of this.surfaceObjects) {
                if (((obj.constructor && obj.constructor.name === 'ShieldGenerator') || obj.isTarget) && obj.destroyed) {
                    targetDestroyed = true;
                    break;
                }
            }

            if (!targetDestroyed) {
                const angle = Math.atan2(dy, dx);
                const dist = Math.sqrt(distSq);
                const pulse = (Math.sin(millis() * 0.01) + 1) * 0.5;

                // HYBRID COMPASS: Lock to edge when far (>3000m), move to center when near
                // This provides waypoint navigation that transitions into tactical targeting
                const targetMarkerDist = (dist > 3000)
                    ? markerMaxRadius
                    : map(dist, 0, 3000, 0, markerMaxRadius, true);

                push();
                rotate(angle);
                noStroke();
                // Pulsing red waypoint marker
                fill(255, 0, 0, 200 + pulse * 55);
                ellipse(targetMarkerDist, 0, 10 + pulse * 2, 10 + pulse * 2);
                pop();
            }
        }

        // 2. Local Tactical Markers (Compass)
        for (const obj of this.surfaceObjects) {
            if (obj.destroyed) continue;

            // Only show relevant tactical targets
            // Check for SurfaceStation, ShieldGenerator, Turret, DefenseDrone, and SecretCache
            const isStation = (obj.constructor && obj.constructor.name === 'SurfaceStation');
            const isShieldGen = (obj.constructor && obj.constructor.name === 'ShieldGenerator') || obj.isTarget;
            const isTurret = (obj.constructor && obj.constructor.name === 'Turret');
            const isDrone = (obj.constructor && obj.constructor.name === 'DefenseDrone');
            const isCache = obj.isCache === true;

            if (!isStation && !isShieldGen && !isTurret && !isDrone && !isCache) continue;
            if (isShieldGen) continue; // Handled by persistent waypoint above

            const dx = obj.pos.x - this.player.pos.x;
            const dy = obj.pos.y - this.player.pos.y;
            const distSq = dx * dx + dy * dy;

            // Skip expensive sqrt and atan2 if object is way beyond tracking range (e.g. 5000m)
            // markerMaxRadius is usually based on 3000m, but we can cull earlier
            if (distSq > 25000000) continue; // 5000^2

            const dist = Math.sqrt(distSq);

            // Calculate angle on compass
            const angle = Math.atan2(dy, dx);
            // Map distance to compass radius - scaled for larger compass
            // Use 3000 as max tracking distance 
            const markerDist = map(dist, 0, 3000, 0, markerMaxRadius, true);

            push();
            rotate(angle);
            noStroke();

            if (isStation) {
                // Surface Stations - Blue, slightly larger
                fill(50, 150, 255, 220);
                ellipse(markerDist, 0, 7, 7);
            } else if (isShieldGen) {
                // Main Target (Shield Generator) - Red, larger, pulsing
                const pulse = (Math.sin(millis() * 0.01) + 1) * 0.5;
                fill(255, 0, 0, 200 + pulse * 55);
                ellipse(markerDist, 0, 8 + pulse * 2, 8 + pulse * 2);
            } else if (isTurret) {
                // Turrets - Orange, smaller
                fill(255, 150, 0, 200);
                ellipse(markerDist, 0, 5, 5);
            } else if (isDrone) {
                // Defense Drones - Red, small
                fill(255, 50, 50, 200);
                ellipse(markerDist, 0, 4, 4);
            } else if (isCache) {
                // Secret Caches - Green
                // Discovery mode: Clamp to edge if far, show actual position if close (within tracking range)
                fill(50, 255, 100, 220);
                if (dist > 3000) {
                    ellipse(markerMaxRadius, 0, 6, 6); // Clamped to edge
                } else {
                    ellipse(markerDist, 0, 6, 6); // Moving towards center
                }
            }
            pop();
        }


        pop();

        pop();
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

        // Altitude controls (T/G)
        if (key === 't' || key === 'T') { this.altitudeInput = 1; return true; }
        if (key === 'g' || key === 'G') { this.altitudeInput = -1; return true; }

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
        if (this.state !== SURFACE_STATE.ACTIVE) return false;

        if (key === 't' || key === 'T' || key === 'g' || key === 'G') {
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
