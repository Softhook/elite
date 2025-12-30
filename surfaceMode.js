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
    THRUST_ACCEL: 400,         // Units per second squared
    MAX_SPEED: 300,
    STRAFE_SPEED: 200,
    CLIMB_SPEED: 150,

    // Terrain mesh
    MESH_RESOLUTION: 80,       // Grid resolution
    MESH_SIZE: 4000,           // World units covered

    // Transition
    TRANSITION_DURATION: 2000, // ms for enter/exit transitions
    TRIGGER_KEY: 71,           // 'G' key for surface descent

    // Visual
    SUN_ANGLE: -Math.PI / 4,
    FIRE_RATE: 8               // Shots per second
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

        // Terrain mesh
        this.terrainMesh = [];
        this.terrainBuffer = null;
        this.lastGridX = null;
        this.lastGridY = null;

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

    /**
     * Check if player can enter surface mode
     */
    canEnter(player, planet) {
        if (!player || !planet) return false;
        if (this.state !== SURFACE_STATE.INACTIVE) return false;
        if (planet.isSun) return false;

        // Check player is close enough to planet
        const dist = p5.Vector.dist(player.pos, planet.pos);
        const approachThreshold = planet.radius * 2.5;

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
        this.altitude = SURFACE_CONFIG.DEFAULT_ALTITUDE;
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

        // Mute space ambient sounds
        if (typeof ambientSoundManager !== 'undefined') {
            ambientSoundManager.stopAll();
        }

        // Clear terrain
        this.terrainMesh = [];
        this.lastGridX = null;
        this.lastGridY = null;
        this.projectiles = [];
        this.surfaceObjects = [];

        // Create terrain buffer
        this._createTerrainBuffer();

        // Generate initial terrain
        this._generateTerrainMesh(true);

        // Set game state if gameStateManager available
        if (typeof gameStateManager !== 'undefined') {
            gameStateManager.setState("SURFACE_MODE");
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
        }

        // Cleanup terrain buffer
        if (this.terrainBuffer) {
            this.terrainBuffer.remove();
            this.terrainBuffer = null;
        }

        // Clear data
        this.terrainMesh = [];
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
     * Create terrain buffer for pre-rendering
     */
    _createTerrainBuffer() {
        const bufSize = Math.max(width, height) * 2.5;
        this.terrainBuffer = createGraphics(bufSize, bufSize);
        this.terrainBuffer.noStroke();
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

        // Update gameplay
        if (this.state === SURFACE_STATE.ACTIVE) {
            // Make player invulnerable while on surface (like when docked)
            if (this.player) {
                this.player.isDockedAndInvulnerable = true;
            }

            this._updatePhysics(dt);
            this._generateTerrainMesh();

            // Update surface objects (single pass, dt-corrected)
            if (this.surfaceObjects) {
                for (let obj of this.surfaceObjects) {
                    if (obj.update) obj.update(dt, this.player, this.starSystem);
                }
            }

            this._checkSurfaceCollisions();

            // Update starSystem like when docked - NPCs move but player is invulnerable
            if (this.starSystem && typeof this.starSystem.updateWhileDocked === 'function') {
                this.starSystem.updateWhileDocked();
            }

            // Altitude control  
            this.altitude += this.altitudeInput * SURFACE_CONFIG.CLIMB_SPEED * dt;
            this.altitude = constrain(this.altitude, SURFACE_CONFIG.MIN_ALTITUDE, SURFACE_CONFIG.MAX_ALTITUDE);

            if (this.player) {
                const groundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
                // Radar Altimeter Logic: User controls height ABOVE ground
                // Absolute Altitude = User Height + Terrain Height
                this.player.altitude = this.altitude + groundH;
                this.player.yOffset = groundH; // Persist ground height for weapon firing
            }


            // Check exit condition
            if (this.altitude >= SURFACE_CONFIG.MAX_ALTITUDE) {
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
     * Update player physics - uses player's normal controls (identical to space physics)
     */
    _updatePhysics(dt) {
        if (!this.player) return;

        // Use exact same physics as space
        this.player.handleInput();
        this.player.update();

        // Track surface position directly from player position
        // This ensures frame-rate independence as player.update handles time scaling
        this.surfaceX = this.player.pos.x;
        this.surfaceY = this.player.pos.y;

        // Sync angle, speed, and position from player
        this.playerAngle = this.player.angle;
        this.playerSpeed = this.player.vel.mag();

        // Ensure player.altitude is set for collision checks in starSystem
        this.player.altitude = this.altitude;
    }

    /**
     * Calculate visual bounds for collision and rendering
     * Returns the visual base and tip segment for the extruded object
     * @private
     */
    _getVisualBounds(obj) {
        const extrusionAngle = 0.5; // Must match Draw3D
        // Visual Base Position (accounting for terrain yOffset)
        const visualBaseY = obj.pos.y - (obj.yOffset || 0);

        // Use approximate height from size if height property missing
        const objH = (obj.height) ? obj.height : (obj.size * 2);

        // Calculate tip position (extruded top)
        const tipX = obj.pos.x - (objH * Math.sin(extrusionAngle));
        const tipY = visualBaseY - (objH * Math.cos(extrusionAngle));

        return {
            base: { x: obj.pos.x, y: visualBaseY },
            tip: { x: tipX, y: tipY },
            height: objH,
            radius: Math.max((obj.size || 40) / 2, 10) // Radius matches visual Cylinder (size/2)
        };
    }

    /**
     * Check collisions between projectiles and surface objects
     * Uses simple 2D distance check since all objects are on the same plane visually
     */
    _checkSurfaceCollisions() {
        if (!this.starSystem || !this.starSystem.projectiles) return;

        // Check each projectile in the world
        for (let proj of this.starSystem.projectiles) {
            if (proj.destroyed) continue;
            if (!proj.isSurface) continue; // Only check surface projectiles

            const projPos = proj.pos;

            // Check terrain collision (ground hit)
            const terrainH = this._getTerrainHeightAt(projPos.x, projPos.y);
            const projAlt = proj.altitude || 0;

            // If projectile hits the ground
            if (projAlt <= terrainH + 2 && proj.owner !== this.player) {
                // Create ground impact explosion
                this._createSurfaceExplosion(projPos.x, projPos.y, 0, 8, [255, 100, 50]);

                // Crater/Ground hit sound
                if (typeof soundManager !== 'undefined' && this.player) {
                    soundManager.playWorldSound('explosion', projPos.x, projPos.y, this.player.pos);
                }

                proj.destroyed = true;
                continue;
            }

            // Player's projectiles hitting surface objects
            if (this.surfaceObjects && this.surfaceObjects.length > 0 && proj.owner === this.player) {
                for (let obj of this.surfaceObjects) {
                    if (obj.destroyed) continue;

                    const bounds = this._getVisualBounds(obj);

                    // Distance from Point (Projectile) to Line Segment (Base -> Tip)
                    const distToAxis = this._distToSegment(projPos, bounds.base, bounds.tip);

                    // Generous radius for hitting the tower - allow striking the "width" of the object
                    const hitRadius = bounds.radius;

                    if (distToAxis < hitRadius) {
                        // Projectile hit the object
                        const objName = obj.type || obj.id || obj.constructor.name;
                        console.log(`Hit on surface object [${objName}]!`);
                        obj.takeDamage(proj.damage || 10);
                        proj.destroyed = true;

                        // Create explosion at impact point
                        this._createSurfaceExplosion(projPos.x, projPos.y, 0, 10, [255, 150, 50]);

                        // Play hit sound
                        if (typeof soundManager !== 'undefined' && this.player) {
                            soundManager.playWorldSound('hit', projPos.x, projPos.y, this.player.pos);
                        }
                        break;
                    }
                }
            }
        }

        // Also check turret projectiles hitting the player
        for (let proj of this.starSystem.projectiles) {
            if (proj.destroyed) continue;
            if (!proj.isSurface) continue;
            if (proj.owner === this.player) continue; // Skip player's own projectiles
            if (!this.player || this.player.destroyed) continue;

            // Check if turret projectile hits player
            const dx = proj.pos.x - this.player.pos.x;
            const dy = proj.pos.y - this.player.pos.y;
            const distSq = dx * dx + dy * dy;
            const hitRadiusSq = this.player.size * this.player.size;

            if (distSq < hitRadiusSq) {
                console.log(`Player hit by surface projectile!`);
                this.player.takeDamage(proj.damage || 5);

                // Create explosion at hit point
                this._createSurfaceExplosion(proj.pos.x, proj.pos.y, 0, 15, [255, 50, 50]);
                proj.destroyed = true;
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
     * 
     * NOTE: The extrusion angle creates a pseudo-3D effect. For most explosions at ground
     * level (projectile hits), pass altitude=0 since projectile positions are already visual.
     */
    _createSurfaceExplosion(x, y, altitude, size, color) {
        if (!this.starSystem || !this.starSystem.addExplosion) return;

        // Calculate visual offset based on altitude (matches Draw3D extrusion)
        const extrusionAngle = 0.5; // Must match surfaceObjects.js
        const visualX = x - (altitude * Math.sin(extrusionAngle));
        const visualY = y - (altitude * Math.cos(extrusionAngle));

        this.starSystem.addExplosion(visualX, visualY, size, color, true);
    }


    /**
     * Generate terrain mesh
     */
    _generateTerrainMesh(forceRegenerate = false) {
        if (!this.planet) return;

        const cellSize = SURFACE_CONFIG.MESH_SIZE / SURFACE_CONFIG.MESH_RESOLUTION;
        const currentGridX = Math.floor(this.surfaceX / cellSize);
        const currentGridY = Math.floor(this.surfaceY / cellSize);

        // Only regenerate if moved to new grid cell
        if (!forceRegenerate &&
            this.lastGridX === currentGridX &&
            this.lastGridY === currentGridY &&
            this.terrainMesh.length > 0) {
            return;
        }

        this.lastGridX = currentGridX;
        this.lastGridY = currentGridY;


        this.terrainMesh = [];

        const featureRand = this.planet.featureRand || 0;
        const palette = this.planet.palette || [color(128, 128, 128)];
        const resolution = SURFACE_CONFIG.MESH_RESOLUTION;

        for (let gy = 0; gy < resolution; gy++) {
            this.terrainMesh[gy] = [];
            for (let gx = 0; gx < resolution; gx++) {
                const gridX = currentGridX + (gx - Math.floor(resolution / 2));
                const gridY = currentGridY + (gy - Math.floor(resolution / 2));

                const worldX = gridX * cellSize;
                const worldY = gridY * cellSize;

                // Sample noise
                const sampleMultiplier = 0.003;
                const nx = worldX * sampleMultiplier + featureRand * 0.001;
                const ny = worldY * sampleMultiplier + featureRand * 0.002;
                const nz = featureRand * 0.6;

                const noiseVal = noise(nx, ny, nz);

                // Height from noise
                const height = (noiseVal - 0.5) * 500;

                // Color from palette
                const paletteIdx = Math.floor(noiseVal * (palette.length - 1));
                const paletteT = (noiseVal * (palette.length - 1)) - paletteIdx;
                const col1 = palette[paletteIdx];
                const col2 = palette[Math.min(paletteIdx + 1, palette.length - 1)];
                const cellColor = lerpColor(col1, col2, paletteT);

                this.terrainMesh[gy][gx] = {
                    worldX: worldX,
                    worldY: worldY,
                    height: height,
                    color: cellColor
                };
            }
        }

        this._spawnObjects(currentGridX, currentGridY);

        this._updateTerrainBuffer();
    }

    /**
     * Update terrain buffer
     */
    _updateTerrainBuffer() {
        if (!this.terrainBuffer || this.terrainMesh.length === 0) return;

        this.terrainBuffer.background(10, 15, 25);
        this.terrainBuffer.clear();

        const cx = this.terrainBuffer.width / 2;
        const cy = this.terrainBuffer.height / 2;
        const resolution = SURFACE_CONFIG.MESH_RESOLUTION;
        const resMinus1 = resolution - 1;
        const cellSize = SURFACE_CONFIG.MESH_SIZE / resolution;
        const meshCenterWX = this.lastGridX * cellSize;
        const meshCenterWY = this.lastGridY * cellSize;

        this.terrainBuffer.stroke(0, 0, 0, 40);
        this.terrainBuffer.strokeWeight(0.5);

        for (let gy = 0; gy < resMinus1; gy++) {
            const row0 = this.terrainMesh[gy];
            const row1 = this.terrainMesh[gy + 1];
            if (!row0 || !row1) continue;

            for (let gx = 0; gx < resMinus1; gx++) {
                const c00 = row0[gx];
                const c10 = row0[gx + 1];
                const c01 = row1[gx];
                const c11 = row1[gx + 1];

                if (!c00 || !c10 || !c01 || !c11) continue;

                // Lighting
                const slopeX = ((c10.height - c00.height) + (c11.height - c01.height)) * 0.5;
                const slopeY = ((c01.height - c00.height) + (c11.height - c10.height)) * 0.5;
                const sunIntensity = slopeX * 0.004 + slopeY * 0.005;

                const avgHeight = (c00.height + c10.height + c01.height + c11.height) * 0.25;
                const heightLight = avgHeight * 0.0005;

                let shade = 0.65 + sunIntensity + heightLight;
                shade = constrain(shade, 0.25, 1.4);

                const baseCol = c00.color;
                this.terrainBuffer.fill(
                    baseCol.levels[0] * shade,
                    baseCol.levels[1] * shade,
                    baseCol.levels[2] * shade
                );

                // Projection to buffer coordinates
                const dx00 = c00.worldX - meshCenterWX;
                const dy00 = c00.worldY - meshCenterWY;
                const dx10 = c10.worldX - meshCenterWX;
                const dy10 = c10.worldY - meshCenterWY;
                const dx11 = c11.worldX - meshCenterWX;
                const dy11 = c11.worldY - meshCenterWY;
                const dx01 = c01.worldX - meshCenterWX;
                const dy01 = c01.worldY - meshCenterWY;

                this.terrainBuffer.beginShape();
                this.terrainBuffer.vertex(cx + dx00, cy + dy00 - c00.height);
                this.terrainBuffer.vertex(cx + dx10, cy + dy10 - c10.height);
                this.terrainBuffer.vertex(cx + dx11, cy + dy11 - c11.height);
                this.terrainBuffer.vertex(cx + dx01, cy + dy01 - c01.height);
                this.terrainBuffer.endShape(CLOSE);
            }
        }
    }

    /**
     * Draw surface mode view
     */
    draw() {
        if (this.state === SURFACE_STATE.INACTIVE) return;

        // Dark gradient sky
        background(10, 15, 25);

        if (!this.planet) return;

        push();
        // 1. Center camera on player
        translate(width / 2, height / 2);

        // 2. Perspective scaling (everything world-side scales together)
        // We still use altitude for zoom, but it doesn't affect the coordinate scale ratio anymore
        const perspectiveScale = map(this.altitude, SURFACE_CONFIG.MIN_ALTITUDE, SURFACE_CONFIG.MAX_ALTITUDE, 1.2, 0.6);
        scale(perspectiveScale);

        // 3. World translation (camera follows player)
        translate(-this.player.pos.x, -this.player.pos.y);

        // Draw terrain
        this._drawTerrain();

        // Draw surface objects, explosions, and projectiles (all use world coords)
        this._drawSurfaceObjects();
        this._drawExplosions();
        this._drawProjectiles();

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
     * Uses same noise sampling as terrain generation
     */
    _getTerrainHeightAt(worldX, worldY) {
        if (!this.planet) return 0;

        const featureRand = this.planet.nameHash || 12345;
        const sampleMultiplier = 0.003;

        const nx = worldX * sampleMultiplier + featureRand * 0.001;
        const ny = worldY * sampleMultiplier + featureRand * 0.002;
        const nz = featureRand * 0.6;

        const noiseVal = noise(nx, ny, nz);
        return (noiseVal - 0.5) * 500;
    }

    /**
     * Draw terrain mesh
     */
    _drawTerrain() {
        if (!this.terrainBuffer) return;

        const cellSize = SURFACE_CONFIG.MESH_SIZE / SURFACE_CONFIG.MESH_RESOLUTION;
        const meshCenterWX = this.lastGridX * cellSize;
        const meshCenterWY = this.lastGridY * cellSize;

        // Draw terrain buffer at its world position
        const bx = meshCenterWX - this.terrainBuffer.width / 2;
        const by = meshCenterWY - this.terrainBuffer.height / 2;

        image(this.terrainBuffer, bx, by);

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

                // 1. Robust GLSL-style hash for this cell
                const x = activeGridX;
                const y = activeGridY;
                const cellHash = (Math.abs(Math.sin(x * 12.9898 + y * 78.233 + planetSeed) * 43758.5453) % 1);

                // 2. Large-scale noise density for clustering
                const densityNoise = noise(activeGridX * 0.05 + 1000, activeGridY * 0.05 + 2000);

                if (densityNoise > 0.6) {
                    if (cellHash < 0.25) { // Increased object density (was 0.15)
                        const wx = activeGridX * cellSize;
                        const wy = activeGridY * cellSize;
                        const h = this._getTerrainHeightAt(wx, wy);

                        const subHash = (cellHash * 123.45) % 1;
                        const objSeed = cellHash * 100000;

                        let obj;

                        // Check terrain height - turrets go on high points (h > 100)
                        const isHighTerrain = h > 100;

                        // Shield Generator Logic:
                        // Spawn EXACTLY ONE per planet near the landing site
                        // e.g. at grid (2, 2) relative to origin derived from seed
                        // Force spawn at grid coordinates (2, 2) relative to spawn
                        if (activeGridX === 2 && activeGridY === 2 && typeof ShieldGenerator !== 'undefined') {
                            obj = new ShieldGenerator(wx, wy);
                        } else if (isHighTerrain) {
                            // Turrets on high ground - HIGH density
                            // 50% chance for turret if on high ground
                            if (subHash < 0.5) {
                                obj = new Turret(wx, wy);
                            }
                            // Else leave empty (peaks shouldn't have cities)
                        } else if (subHash < 0.1) {
                            obj = new SurfaceStation(wx, wy);
                        } else if (subHash < 0.15) { // Rare buildings
                            const bTypes = ['skyscraper', 'factory', 'silo'];
                            const bIdx = Math.floor(subHash * 13) % bTypes.length;
                            const size = 30 + (subHash * 50);
                            obj = new Building(wx, wy, size, bTypes[bIdx], objSeed);
                        }

                        // If no object created, skip adding to list
                        if (obj) {
                            obj.yOffset = h;
                            this.surfaceObjects.push(obj);
                            this.objectCache.set(cellKey, obj);
                        } else {
                            this.objectCache.set(cellKey, null);
                        }
                    } else {
                        // Mark cell as empty in cache
                        this.objectCache.set(cellKey, null);
                    }
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
     * Draw surface objects
     */
    _drawSurfaceObjects() {
        if (!this.surfaceObjects) return;

        // Use dynamic sun angle from planet position
        const sunAngle = this._getSunAngle();

        for (let obj of this.surfaceObjects) {
            if (obj.destroyed) continue;

            // Drawn directly at world position. Transformation is handled by the camera in draw()
            if (obj.draw) {
                // Pass world coordinates. Object.draw translates to these.
                // Camera will subtract player.pos automatically.
                obj.draw(obj.pos.x, obj.pos.y - (obj.yOffset || 0), sunAngle);
            }

            // Debug visualization (only if debugMode is enabled)
            if (this.debugMode) {
                push();
                const bounds = this._getVisualBounds(obj);
                stroke(255, 0, 0, 80);
                strokeWeight(bounds.radius * 2);
                strokeCap(ROUND);
                line(bounds.base.x, bounds.base.y, bounds.tip.x, bounds.tip.y);
                pop();
            }
        }
    }

    /**
     * Draw projectiles from starSystem at their world positions
     * Camera transform handles centering relative to player
     */
    _drawProjectiles() {
        if (!this.starSystem || !this.starSystem.projectiles) return;
        if (!this.player) return;

        push();
        // Clear shadow settings to prevent visual artifacts
        if (typeof drawingContext !== 'undefined') {
            drawingContext.shadowBlur = 0;
            drawingContext.shadowColor = 'transparent';
        }

        for (const proj of this.starSystem.projectiles) {
            if (proj && !proj.destroyed && proj.isSurface) {
                const distSq = p5.Vector.sub(proj.pos, this.player.pos).magSq();
                if (distSq < 3000 * 3000) {
                    proj.draw();
                }
            }
        }
        pop();
    }

    _drawExplosions() {
        if (!this.starSystem || !this.starSystem.explosions) return;
        if (!this.player) return;

        const explosions = this.starSystem.explosions;
        if (!explosions) return;

        for (let i = 0; i < explosions.length; i++) {
            const exp = explosions[i];
            if (exp && !exp.destroyed && exp.isSurface) {
                // Draw at world position - no altitude offset needed
                // The camera transform handles centering everything
                exp.draw();
            }
        }
    }

    /**
     * Draw asteroids (if we want them on surface)
     * @private
     */
    _drawPlayerShip() {
        if (!this.player) return;

        // Calculate the inverse of perspective scale to keep ship at constant size
        const perspectiveScale = map(this.altitude, SURFACE_CONFIG.MIN_ALTITUDE, SURFACE_CONFIG.MAX_ALTITUDE, 1.2, 0.6);
        const counterScale = 1 / perspectiveScale;

        // Get sun direction from planet position (sun at origin)
        const sunAngle = this._getSunAngle();

        // 1. Draw shadow on terrain - offset based on sun direction and altitude
        // Sun rays are nearly parallel at this distance, so offset is minimal and consistent
        const baseOffset = 40; // Stronger fixed offset for visible displacement
        const altitudeOffset = this.altitude * 0.08; // Moderate altitude influence
        const totalOffset = baseOffset + altitudeOffset;

        const shadowOffsetX = Math.cos(sunAngle + Math.PI) * totalOffset;
        const shadowOffsetY = Math.sin(sunAngle + Math.PI) * totalOffset;

        // Shadow shrinks slightly with altitude (further away = smaller shadow)
        const shadowScale = map(this.altitude, SURFACE_CONFIG.MIN_ALTITUDE, SURFACE_CONFIG.MAX_ALTITUDE, 0.9, 0.6);

        push();
        // Position shadow relative to ship position, offset by sun direction
        const shadowX = this.player.pos.x + shadowOffsetX;
        const shadowY = this.player.pos.y + shadowOffsetY;
        translate(shadowX, shadowY);

        // Apply terrain height at shadow position so it follows the ground
        const terrainH = this._getTerrainHeightAt(shadowX, shadowY);
        translate(0, -terrainH);

        rotate(this.player.angle);
        scale(shadowScale);  // DO NOT apply counterScale - shadow stays ground-sized

        // Lighter shadow - distant sun means softer shadows
        const shadowAlpha = map(this.altitude, SURFACE_CONFIG.MIN_ALTITUDE, SURFACE_CONFIG.MAX_ALTITUDE, 60, 20);
        fill(0, 0, 0, shadowAlpha);
        noStroke();

        // Draw shadow using first vertex layer of ship definition
        // Try to get ship def from player's cache first, then fall back to SHIP_DEFINITIONS lookup
        const shipTypeName = this.player.shipTypeName || 'Sidewinder';
        let shipDef = this.player._cachedShipDef ||
            (typeof SHIP_DEFINITIONS !== 'undefined' ? SHIP_DEFINITIONS[shipTypeName] : null);
        const shipScale = this.player.size / 25;

        // Get vertex data - handle both new vertexLayers format and legacy vertexData format
        let vertices = null;
        if (shipDef) {
            if (shipDef.vertexLayers && shipDef.vertexLayers.length > 0 && shipDef.vertexLayers[0].vertexData) {
                // New format: vertexLayers[0].vertexData
                vertices = shipDef.vertexLayers[0].vertexData;
            } else if (shipDef.vertexData && shipDef.vertexData.length > 0) {
                // Legacy format: direct vertexData array (e.g., Sidewinder)
                vertices = shipDef.vertexData;
            }
        }

        if (vertices && vertices.length > 0) {
            beginShape();
            for (const v of vertices) {
                vertex(v.x * shipScale * 25, v.y * shipScale * 25);
            }
            endShape(CLOSE);
        } else {
            // Fallback to ellipse if no vertex data available
            ellipse(0, 0, this.player.size, this.player.size * 0.8);
        }
        pop();

        // 2. Draw actual ship model at its world position with counter-scale
        // This keeps the ship at constant screen size regardless of altitude
        push();
        translate(this.player.pos.x, this.player.pos.y);
        scale(counterScale);
        translate(-this.player.pos.x, -this.player.pos.y);
        this.player.draw();
        pop();
    }

    /**
     * Draw game HUD elements (normal game HUD)
     */
    _drawGameHUD() {
        if (typeof uiManager !== 'undefined' && uiManager) {
            // Draw the normal game HUD (shields, hull, speed, etc.)
            uiManager.drawHUD(this.player);
        }
    }

    /**
     * Draw HUD elements
     */
    _drawHUD() {
        push();

        // Altitude bar
        const barX = width - 50;
        const barY = height / 2 - 100;
        const barHeight = 200;
        const barWidth = 25;

        fill(0, 0, 0, 180);
        stroke(80, 80, 80);
        strokeWeight(1);
        rect(barX, barY, barWidth, barHeight, 3);

        // Relative Altitude (Radar Altitude)
        const groundH = this._getTerrainHeightAt(this.player.pos.x, this.player.pos.y);
        const radarAlt = Math.max(0, this.altitude - groundH);

        const altPercent = radarAlt / 500; // Scale relative altitude (0-500m)
        const fillHeight = Math.min(barHeight, barHeight * altPercent);

        noStroke();
        for (let i = 0; i < fillHeight; i += 2) {
            const t = i / barHeight;
            fill(lerpColor(color(50, 150, 200), color(100, 220, 255), t));
            rect(barX + 2, barY + barHeight - i - 2, barWidth - 4, 2);
        }

        // Min altitude marker (safe floor)
        stroke(255, 100, 100);
        strokeWeight(2);
        const minY = barY + barHeight - (barHeight * SURFACE_CONFIG.MIN_ALTITUDE / SURFACE_CONFIG.MAX_ALTITUDE);
        line(barX - 5, minY, barX + barWidth + 5, minY);

        noStroke();
        fill(255);
        textSize(11);
        textAlign(CENTER, TOP);
        text('R-ALT', barX + barWidth / 2, barY - 18);
        text(Math.floor(radarAlt), barX + barWidth / 2, barY + barHeight + 5);

        // Compass
        push();
        translate(width / 2, height - 50);

        fill(0, 0, 0, 100);
        ellipse(0, 0, 70, 70);

        noFill();
        stroke(100, 100, 100, 150);
        strokeWeight(2);
        ellipse(0, 0, 60, 60);

        fill(200);
        noStroke();
        textSize(12);
        textAlign(CENTER, CENTER);
        const compassRadius = 35;
        text('N', 0, -compassRadius);
        text('S', 0, compassRadius);
        text('E', compassRadius, 0);
        text('W', -compassRadius, 0);

        // Player heading indicator
        push();
        rotate(this.playerAngle);
        stroke(255, 50, 50);
        strokeWeight(3);
        line(0, 0, 25, 0);
        pop();

        // Surface object markers (Compass)
        for (const obj of this.surfaceObjects) {
            if (obj.destroyed) continue;

            // Only show relevant tactical targets
            // Check for ShieldGenerator class name since we might not have imported the class in this scope
            const isShieldGen = (obj.constructor && obj.constructor.name === 'ShieldGenerator') || obj.isTarget;
            const isTurret = (obj.constructor && obj.constructor.name === 'Turret');

            if (!isShieldGen && !isTurret) continue;

            const dx = obj.pos.x - this.player.pos.x;
            const dy = obj.pos.y - this.player.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Calculate angle on compass
            const angle = Math.atan2(dy, dx);
            // Map distance to compass radius (30 pixels)
            // Use 3000 as max tracking distance 
            const markerDist = map(dist, 0, 3000, 0, 30, true);

            push();
            rotate(angle);
            noStroke();

            if (isShieldGen) {
                // Main Target (Shield Generator) - Red, larger, pulsing
                const pulse = (Math.sin(millis() * 0.01) + 1) * 0.5;
                fill(255, 0, 0, 200 + pulse * 55);
                ellipse(markerDist, 0, 6 + pulse * 2, 6 + pulse * 2);
            } else if (isTurret) {
                // Turrets - Orange, smaller
                fill(255, 150, 0, 200);
                ellipse(markerDist, 0, 4, 4);
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

        // Let other keys pass through to normal game handling
        return false;
    }

    /**
     * Helper: Distance from point P to line segment AB
     */
    _distToSegment(p, a, b) {
        const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
        if (l2 === 0) return Math.sqrt((p.x - a.x) * (p.x - a.x) + (p.y - a.y) * (p.y - a.y));
        let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const px = a.x + t * (b.x - a.x);
        const py = a.y + t * (b.y - a.y); // Projection point on segment
        return Math.sqrt((p.x - px) * (p.x - px) + (p.y - py) * (p.y - py));
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
