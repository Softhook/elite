// ****** surfaceMode.js ******
// Surface flight mode controller for planetary surface gameplay
// Manages entry/exit transitions, terrain rendering, and surface-specific mechanics

/**
 * Configuration constants for surface mode
 */
const SURFACE_CONFIG = {
    // Tile system
    TILE_SIZE: 200,              // World units per tile
    VISIBLE_RADIUS: 5,           // Tiles visible in each direction
    LOD_NEAR: 2,                 // High detail within this many tiles
    LOD_FAR: 4,                  // Medium detail within this many tiles
    MAX_TILES_PER_FRAME: 2,      // Limit tile generation per frame

    // Flight mechanics
    MIN_ALTITUDE: 10,            // Minimum safe altitude
    MAX_ALTITUDE: 500,           // Triggers exit transition
    DEFAULT_ALTITUDE: 100,       // Starting altitude
    CLIMB_RATE: 150,             // Units per second when climbing
    DESCENT_RATE: 120,           // Units per second when descending

    // Transition
    TRANSITION_DURATION: 2000,   // ms for enter/exit transitions
    TRIGGER_KEY: 71,             // 'G' key for ground/descend

    // Visual
    SUN_ANGLE: -Math.PI / 4,     // Consistent light direction
    SHADOW_OFFSET_FACTOR: 0.5,   // Shadow offset per altitude unit

    // Terrain generation
    MAX_TERRAIN_HEIGHT: 80,      // Maximum elevation for features
    FEATURE_DENSITY: 0.3         // Chance of feature per tile
};

/**
 * Surface flight mode state
 */
const SURFACE_STATE = {
    INACTIVE: 'inactive',
    ENTERING: 'entering',    // Transition in progress
    ACTIVE: 'active',        // Full surface mode
    EXITING: 'exiting'       // Transition out
};

/**
 * SurfaceMode class - manages planetary surface flight
 */
class SurfaceMode {
    constructor() {
        this.state = SURFACE_STATE.INACTIVE;
        this.planet = null;              // Reference to planet being explored
        this.player = null;              // Reference to player
        this.starSystem = null;          // Reference to star system

        // Position tracking (surface-local coordinates)
        this.surfaceX = 0;               // Player position on surface
        this.surfaceY = 0;
        this.altitude = SURFACE_CONFIG.DEFAULT_ALTITUDE;

        // Transition state
        this.transitionProgress = 0;     // 0-1 for fade effects
        this.transitionStartTime = 0;

        // Terrain tiles
        this.tiles = new Map();          // Map of "x,y" -> TerrainTile
        this.tileQueue = [];             // Tiles pending generation

        // Surface entities
        this.turrets = [];               // Static turrets
        this.targets = [];               // Mission targets
        this.patrolShips = [];           // Enemy ships on surface

        // Landing approach vector (for terrain sampling)
        this.landingVector = null;       // Normalized vector from planet center

        // Key state
        this._keyPressed = false;
    }

    /**
     * Check if surface mode is active or transitioning
     * @returns {boolean}
     */
    isActive() {
        return this.state !== SURFACE_STATE.INACTIVE;
    }

    /**
     * Check if player can enter surface mode
     * @param {Object} player - Player object
     * @param {Object} planet - Planet object
     * @returns {boolean}
     */
    canEnter(player, planet) {
        if (!player || !planet) return false;
        if (this.state !== SURFACE_STATE.INACTIVE) return false;
        if (planet.isSun) return false;

        // Check if planet has surface mission (for testing: always true)
        if (!planet.hasSurfaceMission) return false;

        // Check player is close enough to planet
        const dist = p5.Vector.dist(player.pos, planet.pos);
        const approachThreshold = planet.radius * 2.5;

        return dist < approachThreshold;
    }

    /**
     * Enter surface mode
     * @param {Object} player - Player object
     * @param {Object} planet - Planet object
     * @param {Object} starSystem - Current star system
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

        // Calculate landing vector (direction player approached from)
        this.landingVector = p5.Vector.sub(player.pos, planet.pos).normalize();

        // Initialize surface position at center
        this.surfaceX = 0;
        this.surfaceY = 0;
        this.altitude = SURFACE_CONFIG.DEFAULT_ALTITUDE;

        // Start transition
        this.transitionStartTime = millis();
        this.transitionProgress = 0;

        // Clear any existing tiles
        this.tiles.clear();
        this.tileQueue = [];

        // Generate initial tiles around player
        this._generateInitialTiles();

        // Spawn surface entities for mission
        this._spawnSurfaceEntities();

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
    }

    /**
     * Complete exit and cleanup
     * @private
     */
    _completeExit() {
        this.state = SURFACE_STATE.INACTIVE;

        // Cleanup tiles
        for (const tile of this.tiles.values()) {
            if (tile.buffer) {
                tile.buffer.remove();
            }
        }
        this.tiles.clear();

        // Clear entities
        this.turrets = [];
        this.targets = [];
        this.patrolShips = [];

        // Clear references
        this.planet = null;
        this.landingVector = null;

        console.log("Surface mode cleanup complete");
    }

    /**
     * Handle key press for surface mode
     * @param {number} keyCode - Key code pressed
     * @returns {boolean} True if key was handled
     */
    handleKeyPress(keyCode) {
        if (keyCode === SURFACE_CONFIG.TRIGGER_KEY) {
            this._keyPressed = true;
            return true;
        }
        return false;
    }

    /**
     * Check for descent trigger (called from game loop)
     * @param {Object} player - Player object
     * @param {Array} planets - Array of planets in system
     * @param {Object} starSystem - Current star system
     */
    checkDescentTrigger(player, planets, starSystem) {
        if (!this._keyPressed) return;
        this._keyPressed = false;

        if (this.state !== SURFACE_STATE.INACTIVE) return;

        // Find planet player is near
        for (const planet of planets) {
            if (this.canEnter(player, planet)) {
                this.enter(player, planet, starSystem);
                return;
            }
        }
    }

    /**
     * Main update loop for surface mode
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (this.state === SURFACE_STATE.INACTIVE) return;

        // Update transition
        if (this.state === SURFACE_STATE.ENTERING ||
            this.state === SURFACE_STATE.EXITING) {
            this._updateTransition();
        }

        // Update player movement
        if (this.state === SURFACE_STATE.ACTIVE) {
            this._updatePlayerMovement(deltaTime);
            this._updateTiles();
            this._updateEntities(deltaTime);

            // Check exit condition
            if (this.altitude >= SURFACE_CONFIG.MAX_ALTITUDE) {
                this.exit();
            }
        }
    }

    /**
     * Update transition progress
     * @private
     */
    _updateTransition() {
        const elapsed = millis() - this.transitionStartTime;
        this.transitionProgress = Math.min(1, elapsed / SURFACE_CONFIG.TRANSITION_DURATION);

        if (this.transitionProgress >= 1) {
            if (this.state === SURFACE_STATE.ENTERING) {
                this.state = SURFACE_STATE.ACTIVE;
                console.log("Surface mode now active");
            } else if (this.state === SURFACE_STATE.EXITING) {
                this._completeExit();
            }
        }
    }

    /**
     * Update player movement on surface
     * @param {number} deltaTime - Time in seconds
     * @private
     */
    _updatePlayerMovement(deltaTime) {
        if (!this.player) return;

        // Use player's velocity to scroll the surface
        // Surface coordinates move opposite to player velocity
        const speed = this.player.currentSpeed || 0;
        const angle = this.player.angle || 0;

        this.surfaceX += Math.cos(angle) * speed * deltaTime;
        this.surfaceY += Math.sin(angle) * speed * deltaTime;

        // Altitude control via pitch (assuming pitch affects altitude in surface mode)
        // Positive pitch = climb, negative = descend
        const pitchInput = this.player.pitchInput || 0; // Need to add this to player

        if (pitchInput > 0) {
            this.altitude += SURFACE_CONFIG.CLIMB_RATE * deltaTime * pitchInput;
        } else if (pitchInput < 0) {
            this.altitude += SURFACE_CONFIG.DESCENT_RATE * deltaTime * pitchInput;
        }

        // Clamp altitude
        this.altitude = Math.max(SURFACE_CONFIG.MIN_ALTITUDE,
            Math.min(SURFACE_CONFIG.MAX_ALTITUDE, this.altitude));
    }

    /**
     * Update terrain tiles (generate new ones, cull old)
     * @private
     */
    _updateTiles() {
        const tileSize = SURFACE_CONFIG.TILE_SIZE;
        const visibleRadius = SURFACE_CONFIG.VISIBLE_RADIUS;

        // Calculate current tile position
        const centerTileX = Math.floor(this.surfaceX / tileSize);
        const centerTileY = Math.floor(this.surfaceY / tileSize);

        // Check for new tiles needed
        for (let dy = -visibleRadius; dy <= visibleRadius; dy++) {
            for (let dx = -visibleRadius; dx <= visibleRadius; dx++) {
                const tx = centerTileX + dx;
                const ty = centerTileY + dy;
                const key = `${tx},${ty}`;

                if (!this.tiles.has(key) && !this.tileQueue.includes(key)) {
                    this.tileQueue.push(key);
                }
            }
        }

        // Generate queued tiles (limited per frame)
        let generated = 0;
        while (this.tileQueue.length > 0 && generated < SURFACE_CONFIG.MAX_TILES_PER_FRAME) {
            const key = this.tileQueue.shift();
            const [tx, ty] = key.split(',').map(Number);

            if (typeof TerrainTile !== 'undefined') {
                const tile = new TerrainTile(tx, ty, this.planet);
                tile.generate();
                this.tiles.set(key, tile);
            }
            generated++;
        }

        // Cull distant tiles
        const cullRadius = visibleRadius + 2;
        for (const [key, tile] of this.tiles.entries()) {
            const [tx, ty] = key.split(',').map(Number);
            const dx = Math.abs(tx - centerTileX);
            const dy = Math.abs(ty - centerTileY);

            if (dx > cullRadius || dy > cullRadius) {
                if (tile.buffer) {
                    tile.buffer.remove();
                }
                this.tiles.delete(key);
            }
        }
    }

    /**
     * Update surface entities
     * @param {number} deltaTime
     * @private
     */
    _updateEntities(deltaTime) {
        // Update turrets (track player, fire)
        for (const turret of this.turrets) {
            if (turret.update) {
                turret.update(deltaTime, this.player, this);
            }
        }

        // Check targets for destruction
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            if (target.destroyed) {
                this.targets.splice(i, 1);
                this._onTargetDestroyed(target);
            }
        }
    }

    /**
     * Handle target destruction
     * @param {Object} target
     * @private
     */
    _onTargetDestroyed(target) {
        console.log(`Surface target destroyed: ${target.name || 'Target'}`);

        // Check if all targets destroyed (mission complete condition)
        if (this.targets.length === 0) {
            console.log("All surface targets destroyed - mission complete!");
            // Mission handler will detect this via update()
        }
    }

    /**
     * Generate initial terrain tiles around player
     * @private
     */
    _generateInitialTiles() {
        // Queue tiles in a spiral pattern from center outward
        const visibleRadius = SURFACE_CONFIG.VISIBLE_RADIUS;

        for (let r = 0; r <= visibleRadius; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) === r || Math.abs(dy) === r) {
                        const key = `${dx},${dy}`;
                        if (!this.tileQueue.includes(key)) {
                            this.tileQueue.push(key);
                        }
                    }
                }
            }
        }
    }

    /**
     * Spawn surface entities for the mission
     * @private
     */
    _spawnSurfaceEntities() {
        // For testing: spawn a target at center
        // In production, this will be configured by the mission

        if (typeof SurfaceTarget !== 'undefined') {
            const target = new SurfaceTarget(0, 0, 'Primary Target');
            this.targets.push(target);
        }

        // Spawn some turrets around the target
        if (typeof SurfaceTurret !== 'undefined') {
            const turretPositions = [
                { x: -300, y: -200 },
                { x: 300, y: -200 },
                { x: -300, y: 200 },
                { x: 300, y: 200 }
            ];

            for (const pos of turretPositions) {
                const turret = new SurfaceTurret(pos.x, pos.y);
                this.turrets.push(turret);
            }
        }
    }

    /**
     * Draw the surface mode view
     */
    draw() {
        if (this.state === SURFACE_STATE.INACTIVE) return;

        push();

        // During transition, apply fade effect
        if (this.state === SURFACE_STATE.ENTERING ||
            this.state === SURFACE_STATE.EXITING) {
            const alpha = this.state === SURFACE_STATE.ENTERING
                ? this.transitionProgress
                : 1 - this.transitionProgress;
            // Fade handled by caller blending with space view
        }

        // Calculate screen offset (player at center, terrain scrolls)
        const offsetX = width / 2 - this.surfaceX;
        const offsetY = height / 2 - this.surfaceY;

        // Draw terrain tiles
        this._drawTerrain(offsetX, offsetY);

        // Draw surface entities
        this._drawEntities(offsetX, offsetY);

        // Draw player shadow
        this._drawPlayerShadow();

        // Draw player (at screen center with altitude offset)
        this._drawPlayer();

        // Draw altitude indicator
        this._drawAltitudeHUD();

        pop();
    }

    /**
     * Draw terrain tiles
     * @param {number} offsetX - Screen offset X
     * @param {number} offsetY - Screen offset Y
     * @private
     */
    _drawTerrain(offsetX, offsetY) {
        const tileSize = SURFACE_CONFIG.TILE_SIZE;
        const sunAngle = SURFACE_CONFIG.SUN_ANGLE;

        // Use deferred rendering for proper depth sorting
        if (typeof beginDeferredRendering === 'function') {
            beginDeferredRendering();
        }

        // Draw visible tiles
        for (const [key, tile] of this.tiles.entries()) {
            const screenX = tile.worldX + offsetX;
            const screenY = tile.worldY + offsetY;

            // Frustum culling
            if (screenX + tileSize < 0 || screenX > width ||
                screenY + tileSize < 0 || screenY > height) {
                continue;
            }

            // Calculate LOD
            const centerTileX = Math.floor(this.surfaceX / tileSize);
            const centerTileY = Math.floor(this.surfaceY / tileSize);
            const tileDist = Math.max(Math.abs(tile.gridX - centerTileX),
                Math.abs(tile.gridY - centerTileY));
            const lod = tileDist <= SURFACE_CONFIG.LOD_NEAR ? 2 :
                tileDist <= SURFACE_CONFIG.LOD_FAR ? 1 : 0;

            tile.draw(screenX, screenY, sunAngle, lod);
        }

        // Flush deferred rendering
        if (typeof flushDeferredRendering === 'function') {
            flushDeferredRendering();
        }
    }

    /**
     * Draw surface entities (turrets, targets)
     * @param {number} offsetX
     * @param {number} offsetY
     * @private
     */
    _drawEntities(offsetX, offsetY) {
        const sunAngle = SURFACE_CONFIG.SUN_ANGLE;

        // Draw targets
        for (const target of this.targets) {
            const screenX = target.x + offsetX;
            const screenY = target.y + offsetY;

            if (target.draw) {
                target.draw(screenX, screenY, sunAngle);
            }
        }

        // Draw turrets
        for (const turret of this.turrets) {
            const screenX = turret.x + offsetX;
            const screenY = turret.y + offsetY;

            if (turret.draw) {
                turret.draw(screenX, screenY, sunAngle);
            }
        }
    }

    /**
     * Draw player shadow on ground
     * @private
     */
    _drawPlayerShadow() {
        const shadowOffset = this.altitude * SURFACE_CONFIG.SHADOW_OFFSET_FACTOR;
        const shadowScale = 1.0 - (this.altitude / SURFACE_CONFIG.MAX_ALTITUDE) * 0.3;

        push();
        translate(width / 2 + shadowOffset * 0.5, height / 2 + shadowOffset * 0.5);
        scale(shadowScale);

        // Simple shadow ellipse
        noStroke();
        fill(0, 0, 0, 80);
        ellipse(0, 0, 40, 20);

        pop();
    }

    /**
     * Draw player ship at center
     * @private
     */
    _drawPlayer() {
        // Player draws themselves normally, but we could add altitude-based scaling
        // For now, player.draw() is called externally
    }

    /**
     * Draw altitude HUD indicator
     * @private
     */
    _drawAltitudeHUD() {
        push();

        // Draw altitude bar on right side
        const barX = width - 40;
        const barY = height / 2 - 100;
        const barHeight = 200;
        const barWidth = 20;

        // Background
        fill(0, 0, 0, 150);
        stroke(100, 100, 100);
        strokeWeight(1);
        rect(barX, barY, barWidth, barHeight);

        // Altitude fill
        const altPercent = this.altitude / SURFACE_CONFIG.MAX_ALTITUDE;
        const fillHeight = barHeight * altPercent;

        noStroke();
        fill(100, 200, 255, 200);
        rect(barX, barY + barHeight - fillHeight, barWidth, fillHeight);

        // Min/max markers
        stroke(255, 100, 100);
        strokeWeight(2);
        const minY = barY + barHeight - (barHeight * SURFACE_CONFIG.MIN_ALTITUDE / SURFACE_CONFIG.MAX_ALTITUDE);
        line(barX - 5, minY, barX + barWidth + 5, minY);

        // Altitude text
        noStroke();
        fill(255);
        textSize(12);
        textAlign(CENTER, TOP);
        text(`ALT: ${Math.floor(this.altitude)}`, barX + barWidth / 2, barY + barHeight + 5);

        pop();
    }

    /**
     * Get terrain height at a world position
     * @param {number} worldX
     * @param {number} worldY
     * @returns {number} Terrain height at position
     */
    getTerrainHeight(worldX, worldY) {
        const tileSize = SURFACE_CONFIG.TILE_SIZE;
        const tileX = Math.floor(worldX / tileSize);
        const tileY = Math.floor(worldY / tileSize);
        const key = `${tileX},${tileY}`;

        const tile = this.tiles.get(key);
        if (tile && tile.getHeightAt) {
            return tile.getHeightAt(worldX, worldY);
        }

        return 0; // Default ground level
    }

    /**
     * Check collision with terrain
     * @returns {boolean} True if player is colliding with terrain
     */
    checkTerrainCollision() {
        const terrainHeight = this.getTerrainHeight(this.surfaceX, this.surfaceY);
        const collisionBuffer = 5;

        return this.altitude <= terrainHeight + collisionBuffer;
    }
}

// Global surface mode instance
let surfaceMode = null;

/**
 * Initialize surface mode (call from setup)
 */
function initSurfaceMode() {
    surfaceMode = new SurfaceMode();
    console.log("surfaceMode.js - Surface flight mode loaded");
}

// Auto-init if p5 is ready
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        if (!surfaceMode) {
            initSurfaceMode();
        }
    });
}
