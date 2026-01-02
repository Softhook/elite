// ****** surfaceTerrain.js ******
// Terrain generation and rendering for surface mode
// Extracted from surfaceMode.js for better maintainability

/**
 * SurfaceTerrain - Handles terrain mesh generation, height sampling, and rendering
 * 
 * Uses Perlin noise to generate a height-mapped terrain mesh that is rendered
 * to an off-screen buffer for performance. The terrain follows the player
 * and regenerates when they move to a new grid cell.
 */
class SurfaceTerrain {
    /**
     * @param {Object} config - SURFACE_CONFIG object with terrain settings
     */
    constructor(config) {
        this.config = config;

        // Terrain mesh data
        this.mesh = [];
        this.buffer = null;

        // Grid tracking for incremental regeneration
        this.lastGridX = null;
        this.lastGridY = null;

        // Planet reference for palette and feature seed
        this.planet = null;

        // Culling statistics for debug overlay
        this.lastCullStats = null;
    }

    /**
     * Set the planet for terrain generation
     * @param {Object} planet - Planet object with palette and featureRand
     */
    setPlanet(planet) {
        this.planet = planet;
        this.mesh = [];
        this.lastGridX = null;
        this.lastGridY = null;
    }

    /**
     * Create the offscreen buffer for terrain rendering
     * @param {number} screenWidth - Screen width
     * @param {number} screenHeight - Screen height
     */
    createBuffer(screenWidth, screenHeight) {
        const bufSize = Math.max(screenWidth, screenHeight) * 2.5;
        this.buffer = createGraphics(bufSize, bufSize);
        this.buffer.noStroke();
    }

    /**
     * Clean up the terrain buffer
     */
    cleanup() {
        if (this.buffer) {
            this.buffer.remove();
            this.buffer = null;
        }
        this.mesh = [];
        this.lastGridX = null;
        this.lastGridY = null;
    }

    /**
     * Get terrain feature random seed with fallback
     * @returns {number} Feature seed for noise generation
     * @private
     */
    _getFeatureRand() {
        return this.planet?.featureRand ?? this.config.DEFAULT_FEATURE_SEED;
    }

    /**
     * Get terrain height at a specific world position
     * Uses same noise sampling as mesh generation for consistency
     * 
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {number} Height at the position
     */
    getHeightAt(worldX, worldY) {
        if (!this.planet) return 0;

        const featureRand = this._getFeatureRand();
        const sampleMultiplier = 0.003;

        const nx = worldX * sampleMultiplier + featureRand * 0.001;
        const ny = worldY * sampleMultiplier + featureRand * 0.002;
        const nz = featureRand * 0.6;

        const noiseVal = noise(nx, ny, nz);
        return (noiseVal - 0.5) * 500;
    }

    /**
     * Generate terrain mesh centered on player position
     * Only regenerates when player moves to a new grid cell
     * 
     * @param {number} playerX - Player world X position
     * @param {number} playerY - Player world Y position
     * @param {boolean} forceRegenerate - Force regeneration even if in same cell
     * @returns {boolean} True if mesh was regenerated
     */
    generateMesh(playerX, playerY, forceRegenerate = false) {
        if (!this.planet) return false;

        const cellSize = this.config.MESH_SIZE / this.config.MESH_RESOLUTION;
        const currentGridX = Math.floor(playerX / cellSize);
        const currentGridY = Math.floor(playerY / cellSize);

        // Only regenerate if moved to new grid cell
        if (!forceRegenerate &&
            this.lastGridX === currentGridX &&
            this.lastGridY === currentGridY &&
            this.mesh.length > 0) {
            return false;
        }

        this.lastGridX = currentGridX;
        this.lastGridY = currentGridY;
        this.mesh = [];

        const featureRand = this._getFeatureRand();
        const palette = this.planet.palette || [color(128, 128, 128)];
        const resolution = this.config.MESH_RESOLUTION;

        for (let gy = 0; gy < resolution; gy++) {
            this.mesh[gy] = [];
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

                this.mesh[gy][gx] = {
                    worldX: worldX,
                    worldY: worldY,
                    height: height,
                    color: cellColor
                };
            }
        }

        return true; // Mesh was regenerated
    }

    /**
     * Update the offscreen terrain buffer with viewport culling
     * 
     * @param {number} altitude - Current player altitude for perspective scale
     * @param {number} screenWidth - Screen width
     * @param {number} screenHeight - Screen height
     */
    updateBuffer(altitude, screenWidth, screenHeight) {
        if (!this.buffer || this.mesh.length === 0) return;

        this.buffer.background(10, 15, 25);
        this.buffer.clear();

        const cx = this.buffer.width / 2;
        const cy = this.buffer.height / 2;
        const resolution = this.config.MESH_RESOLUTION;
        const resMinus1 = resolution - 1;
        const cellSize = this.config.MESH_SIZE / resolution;
        const meshCenterWX = this.lastGridX * cellSize;
        const meshCenterWY = this.lastGridY * cellSize;

        // Calculate viewport bounds for culling
        // At higher altitude (lower perspectiveScale), we see more world area,
        // so we need a larger cull margin to prevent black edges
        const perspectiveScale = map(altitude, this.config.MIN_ALTITUDE, this.config.MAX_ALTITUDE, 1.2, 0.6);

        // Scale padding inversely with perspective - more padding at high altitude
        // At low altitude (scale=1.2): 200px padding, At high altitude (scale=0.6): 400px padding
        const cullPadding = Math.round(250 / perspectiveScale);

        const visibleHalfWidth = (screenWidth / 2) / perspectiveScale + cullPadding;
        const visibleHalfHeight = (screenHeight / 2) / perspectiveScale + cullPadding;
        const bufferLeft = -visibleHalfWidth;
        const bufferRight = visibleHalfWidth;
        const bufferTop = -visibleHalfHeight;
        const bufferBottom = visibleHalfHeight;

        this.buffer.stroke(0, 0, 0, 40);
        this.buffer.strokeWeight(0.5);

        let cellsDrawn = 0;
        let cellsCulled = 0;

        for (let gy = 0; gy < resMinus1; gy++) {
            const row0 = this.mesh[gy];
            const row1 = this.mesh[gy + 1];
            if (!row0 || !row1) continue;

            for (let gx = 0; gx < resMinus1; gx++) {
                const c00 = row0[gx];
                const c10 = row0[gx + 1];
                const c01 = row1[gx];
                const c11 = row1[gx + 1];

                if (!c00 || !c10 || !c01 || !c11) continue;

                // Calculate buffer-space coordinates
                const dx00 = c00.worldX - meshCenterWX;
                const dy00 = c00.worldY - meshCenterWY;
                const dx10 = c10.worldX - meshCenterWX;
                const dy10 = c10.worldY - meshCenterWY;
                const dx11 = c11.worldX - meshCenterWX;
                const dy11 = c11.worldY - meshCenterWY;
                const dx01 = c01.worldX - meshCenterWX;
                const dy01 = c01.worldY - meshCenterWY;

                // Viewport culling
                const minHeight = Math.min(c00.height, c10.height, c01.height, c11.height);
                const maxHeight = Math.max(c00.height, c10.height, c01.height, c11.height);

                const quadLeft = Math.min(dx00, dx10, dx01, dx11);
                const quadRight = Math.max(dx00, dx10, dx01, dx11);
                const quadTop = Math.min(dy00, dy10, dy01, dy11) - maxHeight;
                const quadBottom = Math.max(dy00, dy10, dy01, dy11) - minHeight;

                if (quadRight < bufferLeft || quadLeft > bufferRight ||
                    quadBottom < bufferTop || quadTop > bufferBottom) {
                    cellsCulled++;
                    continue;
                }

                cellsDrawn++;

                // Lighting calculation
                const slopeX = ((c10.height - c00.height) + (c11.height - c01.height)) * 0.5;
                const slopeY = ((c01.height - c00.height) + (c11.height - c10.height)) * 0.5;
                const sunIntensity = slopeX * 0.004 + slopeY * 0.005;

                const avgHeight = (c00.height + c10.height + c01.height + c11.height) * 0.25;
                const heightLight = avgHeight * 0.0005;

                let shade = 0.65 + sunIntensity + heightLight;
                shade = constrain(shade, 0.25, 1.4);

                const baseCol = c00.color;
                this.buffer.fill(
                    baseCol.levels[0] * shade,
                    baseCol.levels[1] * shade,
                    baseCol.levels[2] * shade
                );

                this.buffer.beginShape();
                this.buffer.vertex(cx + dx00, cy + dy00 - c00.height);
                this.buffer.vertex(cx + dx10, cy + dy10 - c10.height);
                this.buffer.vertex(cx + dx11, cy + dy11 - c11.height);
                this.buffer.vertex(cx + dx01, cy + dy01 - c01.height);
                this.buffer.endShape(CLOSE);
            }
        }

        this.lastCullStats = { drawn: cellsDrawn, culled: cellsCulled };
    }

    /**
     * Draw the terrain at the correct world position
     * Must be called within a transformed graphics context (camera applied)
     */
    draw() {
        if (!this.buffer || this.lastGridX === null) return;

        const cellSize = this.config.MESH_SIZE / this.config.MESH_RESOLUTION;
        const meshCenterWX = this.lastGridX * cellSize;
        const meshCenterWY = this.lastGridY * cellSize;

        const bx = meshCenterWX - this.buffer.width / 2;
        const by = meshCenterWY - this.buffer.height / 2;

        image(this.buffer, bx, by);
    }

    /**
     * Get the current grid position
     * @returns {{x: number, y: number}} Current grid coordinates
     */
    getGridPosition() {
        return { x: this.lastGridX, y: this.lastGridY };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SurfaceTerrain = SurfaceTerrain;
}

console.log("surfaceTerrain.js loaded");
