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
    TRIGGER_KEY: 70,           // 'F' key for surface descent

    // Visual
    SUN_ANGLE: -Math.PI / 4,
    FIRE_RATE: 8               // Shots per second
};

/**
 * Surface flight mode state
 */
const SURFACE_STATE = {
    INACTIVE: 'inactive',
    ENTERING: 'entering',
    ACTIVE: 'active',
    EXITING: 'exiting'
};

/**
 * SurfaceMode class - manages planetary surface flight with 3D mesh terrain
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

        // Initialize surface position
        this.surfaceX = 0;
        this.surfaceY = 0;
        this.altitude = SURFACE_CONFIG.DEFAULT_ALTITUDE;
        this.playerAngle = player.angle || -Math.PI / 2;
        this.playerSpeed = 0;

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

        // Restore player position near planet
        if (this.player && this.savedPlayerPos && this.planet) {
            // Position player just outside planet approach zone
            const dir = p5.Vector.sub(this.savedPlayerPos, this.planet.pos).normalize();
            this.player.pos = p5.Vector.add(this.planet.pos, dir.mult(this.planet.radius * 2));
            this.player.angle = this.playerAngle;

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

            // Update starSystem like when docked - NPCs move but player is invulnerable
            if (this.starSystem && typeof this.starSystem.updateWhileDocked === 'function') {
                this.starSystem.updateWhileDocked();
            }

            // Altitude control  
            this.altitude += this.altitudeInput * SURFACE_CONFIG.CLIMB_SPEED * dt;
            this.altitude = constrain(this.altitude, SURFACE_CONFIG.MIN_ALTITUDE, SURFACE_CONFIG.MAX_ALTITUDE);

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

        // Use exact same physics as space - handleInput + update
        this.player.handleInput();
        this.player.update();

        // Track surface position directly from player velocity (no extra scaling)
        this.surfaceX += this.player.vel.x;
        this.surfaceY += this.player.vel.y;

        // Sync angle and speed from player
        this.playerAngle = this.player.angle;
        this.playerSpeed = this.player.vel.mag();
    }

    /**
     * Update projectiles
     */
    _updateProjectiles(dt) {
        // Handle firing
        this.fireCooldown -= dt;
        if (this.fireInput && this.fireCooldown <= 0) {
            this.fireCooldown = 1 / SURFACE_CONFIG.FIRE_RATE;
            this._fireProjectile();
        }

        // Update surface objects (turrets, etc.)
        if (this.surfaceObjects) {
            for (let obj of this.surfaceObjects) {
                if (obj.update) obj.update(dt, this.player);
            }
        }

        // Update existing projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update();

            if (proj.lifespan <= 0 || proj.destroyed) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    /**
     * Fire a projectile
     */
    _fireProjectile() {
        if (typeof Projectile === 'undefined') return;

        const proj = new Projectile(
            width / 2,
            height / 2 - 25,
            -Math.PI / 2,     // Fire upward on screen
            null,
            12,               // Speed
            10,               // Damage
            color(255, 200, 50),
            'projectile',
            null,
            60                // Lifespan frames
        );
        this.projectiles.push(proj);
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
        translate(width / 2, height / 2);

        // Perspective scaling based on altitude
        const perspectiveScale = map(this.altitude, SURFACE_CONFIG.MIN_ALTITUDE, SURFACE_CONFIG.MAX_ALTITUDE, 1.2, 0.6);
        scale(perspectiveScale);

        // Draw terrain
        this._drawTerrain();

        pop();

        // Draw projectiles from starSystem (where player.fireWeapon adds them)
        this._drawProjectiles();

        // Draw player ship
        this._drawPlayerShip();

        // Draw game HUD (shields, hull, speed, etc.)
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

        const offsetX = meshCenterWX - this.surfaceX;
        const offsetY = meshCenterWY - this.surfaceY;

        const bx = -this.terrainBuffer.width / 2 + offsetX;
        const by = -this.terrainBuffer.height / 2 + offsetY;

        image(this.terrainBuffer, bx, by);

        // Draw objects on top of terrain buffer
        this._drawSurfaceObjects(offsetX, offsetY);
    }

    /**
     * Spawn objects for the current grid
     */
    /**
     * Spawn objects for the current grid
     * Uses coordinate-based hashing to ensure persistence
     */
    _spawnObjects(gridX, gridY) {
        if (!this.planet) return;

        this.surfaceObjects = [];
        const resolution = SURFACE_CONFIG.MESH_RESOLUTION;
        const cellSize = SURFACE_CONFIG.MESH_SIZE / resolution;

        // Iterate over the entire active grid area
        for (let gy = 0; gy < resolution; gy++) {
            for (let gx = 0; gx < resolution; gx++) {
                // Calculate absolute grid coordinates for this cell
                const activeGridX = gridX + (gx - Math.floor(resolution / 2));
                const activeGridY = gridY + (gy - Math.floor(resolution / 2));

                // Create a clear, deterministic seed from coordinates
                // Shift bits to avoid symmetries
                const h1 = (activeGridX * 15485863) & 0xffffffff;
                const h2 = (activeGridY * 20380733) & 0xffffffff;
                const cellHash = Math.abs((h1 ^ h2) / 2147483647);

                // Determine if object exists here based on density threshold
                // Adjust threshold for scarcity (e.g. 1% chance per cell)
                if (cellHash < 0.02) { // 2% chance

                    const wx = activeGridX * cellSize;
                    const wy = activeGridY * cellSize;
                    const h = this._getTerrainHeightAt(wx, wy);

                    // Use a secondary hash for type determination
                    const typeHash = (cellHash * 100) % 1;

                    let obj;
                    if (typeHash < 0.3) {
                        obj = new Turret(wx, wy, 40);
                    } else if (typeHash < 0.35) {
                        obj = new SurfaceStation(wx, wy);
                    } else {
                        const bTypes = ['skyscraper', 'factory', 'silo'];
                        const bIdx = floor(typeHash * 100) % bTypes.length;

                        // Deterministic size within 30-80 range
                        // Use decimals of typeHash
                        const sizeVal = (typeHash * 123.45) % 1;
                        const size = 30 + sizeVal * 50;

                        obj = new Building(wx, wy, size, bTypes[bIdx], cellHash * 10000);
                    }

                    obj.yOffset = h;
                    this.surfaceObjects.push(obj);
                }
            }
        }
    }

    /**
     * Draw surface objects
     */
    _drawSurfaceObjects() {
        if (!this.surfaceObjects) return;

        // Render directly to the main canvas context (which has already been scaled/translated in draw())
        // Coordinates are relative to the player (center screen is 0,0 after translate(width/2, height/2))

        for (let obj of this.surfaceObjects) {
            // Calculate screen position relative to surface camera
            // obj.pos is world coordinates
            // surfaceX/surfaceY is camera world coordinates

            const sx = obj.pos.x - this.surfaceX;
            const sy = (obj.pos.y - this.surfaceY) - obj.yOffset;

            // Draw directly to global context
            if (obj.draw) {
                // Pass sun angle for shading
                obj.draw(sx, sy, SURFACE_CONFIG.SUN_ANGLE);
            }
        }
    }

    /**
     * Draw projectiles from starSystem with screen-space transformation
     */
    _drawProjectiles() {
        if (!this.starSystem || !this.starSystem.projectiles) return;
        if (!this.player) return;

        // Calculate offset from player's world position to screen center
        const offsetX = (width / 2) - this.player.pos.x;
        const offsetY = (height / 2) - this.player.pos.y;

        push();
        translate(offsetX, offsetY);

        // Draw all projectiles in star system, but only if close to player
        for (const proj of this.starSystem.projectiles) {
            if (proj && !proj.destroyed) {
                // Filter out distant space projectiles
                const distSq = p5.Vector.sub(proj.pos, this.player.pos).magSq();
                if (distSq < 3000 * 3000) { // Only draw within 3000 units
                    proj.draw();
                }
            }
        }

        pop();
    }

    /**
     * Draw player ship using normal game ship rendering
     */
    _drawPlayerShip() {
        if (!this.player) return;

        // Draw shadow on terrain
        push();
        translate(width / 2, height / 2);

        const shadowDist = this.altitude * 0.4;
        const shadowOffset = shadowDist * 0.707;
        // Scale shadow down (0.8 factor) so it's smaller than the ship
        const shadowScale = (1.0 - (this.altitude / SURFACE_CONFIG.MAX_ALTITUDE) * 0.4) * 0.8;

        // Sample terrain height at shadow position for height tracking
        const terrainHeight = this._getTerrainHeightAt(this.surfaceX + shadowOffset, this.surfaceY + shadowOffset);
        const terrainOffsetY = terrainHeight * 0.3; // Shadow moves with terrain

        push();
        translate(shadowOffset, shadowOffset + terrainOffsetY);
        rotate(this.playerAngle);
        scale(shadowScale);
        noStroke();

        // Shadow alpha decreases with altitude
        const shadowAlpha = map(this.altitude, SURFACE_CONFIG.MIN_ALTITUDE, SURFACE_CONFIG.MAX_ALTITUDE, 80, 20);
        fill(0, 0, 0, shadowAlpha);

        // Draw ship-shaped shadow using vertex data
        const shipTypeName = this.player?.shipTypeName || 'Sidewinder';
        const shipDef = typeof SHIP_DEFINITIONS !== 'undefined' ? SHIP_DEFINITIONS[shipTypeName] : null;
        const shipScale = this.player.size / 25; // Normalize to ship size

        // Ship definitions use vertexLayers array, with hull usually in first layer
        if (shipDef && shipDef.vertexLayers && shipDef.vertexLayers.length > 0 &&
            shipDef.vertexLayers[0].vertexData) {
            beginShape();
            for (const v of shipDef.vertexLayers[0].vertexData) {
                vertex(v.x * shipScale * 25, v.y * shipScale * 25);
            }
            endShape(CLOSE);
        } else if (shipDef && shipDef.vertexData) {
            // Legacy fallback if vertexData is top-level
            beginShape();
            for (const v of shipDef.vertexData) {
                vertex(v.x * shipScale * 25, v.y * shipScale * 25);
            }
            endShape(CLOSE);
        } else {
            // Fallback: draw basic ship shape
            beginShape();
            vertex(22 * shipScale, 0);
            vertex(-18 * shipScale, 20 * shipScale);
            vertex(-22 * shipScale, 0);
            vertex(-18 * shipScale, -20 * shipScale);
            endShape(CLOSE);
        }

        pop();
        pop();

        // Save player's real position
        const savedPos = this.player.pos.copy();

        // Calculate offset for moving thrust particles
        const offsetX = (width / 2) - savedPos.x;
        const offsetY = (height / 2) - savedPos.y;

        // Move player to screen center for drawing
        this.player.pos.x = width / 2;
        this.player.pos.y = height / 2;

        // Also move thrust particles to match
        if (this.player.thrustManager && this.player.thrustManager.particles) {
            for (const p of this.player.thrustManager.particles) {
                if (p && p.pos) {
                    p.pos.x += offsetX;
                    p.pos.y += offsetY;
                }
            }
        }

        // Use player's normal draw method (renders the actual ship model, thrust, shields)
        this.player.draw();

        // Move thrust particles back
        if (this.player.thrustManager && this.player.thrustManager.particles) {
            for (const p of this.player.thrustManager.particles) {
                if (p && p.pos) {
                    p.pos.x -= offsetX;
                    p.pos.y -= offsetY;
                }
            }
        }

        // Restore player position
        this.player.pos = savedPos;
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

        const altPercent = this.altitude / SURFACE_CONFIG.MAX_ALTITUDE;
        const fillHeight = barHeight * altPercent;

        noStroke();
        for (let i = 0; i < fillHeight; i += 2) {
            const t = i / barHeight;
            fill(lerpColor(color(50, 150, 200), color(100, 220, 255), t));
            rect(barX + 2, barY + barHeight - i - 2, barWidth - 4, 2);
        }

        // Min altitude marker
        stroke(255, 100, 100);
        strokeWeight(2);
        const minY = barY + barHeight - (barHeight * SURFACE_CONFIG.MIN_ALTITUDE / SURFACE_CONFIG.MAX_ALTITUDE);
        line(barX - 5, minY, barX + barWidth + 5, minY);

        noStroke();
        fill(255);
        textSize(11);
        textAlign(CENTER, TOP);
        text('ALT', barX + barWidth / 2, barY - 18);
        text(Math.floor(this.altitude), barX + barWidth / 2, barY + barHeight + 5);

        // Speed and heading
        textAlign(LEFT, TOP);
        fill(200);
        text(`Speed: ${Math.floor(this.playerSpeed)}`, width - 120, 20);
        let compassHeading = (degrees(this.playerAngle) + 90 + 360) % 360;
        text(`Heading: ${Math.floor(compassHeading)}°`, width - 120, 35);

        // Exit hint
        textAlign(CENTER, TOP);
        fill(150);
        textSize(10);
        text("Press R to climb and exit", width / 2, 10);

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

        // Altitude controls (R/F) - only surface-specific controls
        if (key === 'r' || key === 'R') { this.altitudeInput = 1; return true; }
        if (key === 'f' || key === 'F') { this.altitudeInput = -1; return true; }

        // Let other keys pass through to normal game handling
        return false;
    }

    /**
     * Handle surface control key up - only altitude
     */
    handleKeyUp(keyCode, key) {
        if (this.state !== SURFACE_STATE.ACTIVE) return false;

        if (key === 'r' || key === 'R' || key === 'f' || key === 'F') {
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
