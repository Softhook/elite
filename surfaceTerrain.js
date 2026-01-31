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

        // Performance: Height sampling cache (cleared each frame)
        this.heightCache = new Map();
        this.heightCacheFrame = -1;

        // Performance: Track last buffer altitude to avoid redundant updates
        this.lastBufferAltitude = -1;
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

        // Check if p5.js noise function is available
        if (typeof noise !== 'function') {
            console.warn('p5.js noise function not available in getHeightAt');
            return 0;
        }

        // Performance: Clear cache each frame and use cached values
        if (typeof frameCount !== 'undefined' && frameCount !== this.heightCacheFrame) {
            this.heightCache.clear();
            this.heightCacheFrame = frameCount;
        }

        // Use integer grid key for cache (reduces cache misses from floating point)
        const key = `${Math.floor(worldX / 10)},${Math.floor(worldY / 10)}`;
        if (this.heightCache.has(key)) {
            return this.heightCache.get(key);
        }

        const featureRand = this._getFeatureRand();
        const sampleMultiplier = 0.003;

        const nx = worldX * sampleMultiplier + featureRand * 0.001;
        const ny = worldY * sampleMultiplier + featureRand * 0.002;
        const nz = featureRand * 0.6;

        const noiseVal = noise(nx, ny, nz);
        const height = noiseVal * 500; // 0-500 range (no negative terrain)

        this.heightCache.set(key, height);
        return height;
    }

    /**
     * Generate terrain mesh centered on player position
     * Only regenerates when player moves to a new grid cell
     * 
     * PERFORMANCE: Stores raw RGB values instead of p5.Color objects
     * to avoid expensive lerpColor() allocations (~10,000 per generation)
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
        const resolution = this.config.MESH_RESOLUTION;

        // Pick three predominant colors from the planet palette.
        // Prefer feature colors (skip the base at index 0) when available.
        const srcPal = this.planet.palette || [color(128, 128, 128)];
        let threeColors = [];
        if (srcPal.length >= 4) {
            threeColors = [srcPal[1], srcPal[2], srcPal[3]];
        } else {
            // Fallback: take up to first three entries, repeat last if needed
            threeColors = srcPal.slice(0, 3);
            while (threeColors.length < 3) threeColors.push(srcPal[srcPal.length - 1]);
        }

        // Convert to raw RGB and compute luminance so we can map dark->low, bright->high
        const threeRGB = threeColors.map(c => ({
            r: c.levels[0], g: c.levels[1], b: c.levels[2],
            lum: 0.299 * c.levels[0] + 0.587 * c.levels[1] + 0.114 * c.levels[2]
        }));
        // Sort ascending by luminance: [lowColor, midColor, highColor]
        threeRGB.sort((a, b) => a.lum - b.lum);

        // Pre-compute constants
        const sampleMultiplier = 0.003;
        const featureOffsetX = featureRand * 0.001;
        const featureOffsetY = featureRand * 0.002;
        const nz = featureRand * 0.6;
        const halfRes = Math.floor(resolution / 2);

        for (let gy = 0; gy < resolution; gy++) {
            this.mesh[gy] = [];
            const gridY = currentGridY + (gy - halfRes);
            const worldY = gridY * cellSize;
            const ny = worldY * sampleMultiplier + featureOffsetY;

            for (let gx = 0; gx < resolution; gx++) {
                const gridX = currentGridX + (gx - halfRes);
                const worldX = gridX * cellSize;
                const nx = worldX * sampleMultiplier + featureOffsetX;

                const noiseVal = noise(nx, ny, nz);

                // Height from noise (0-500 range, no negative terrain)
                const height = noiseVal * 500;

                // Use the same power curve and contrast bias as planet rendering
                // so terrain colors match the visual style of the planet texture.
                const nColor = Math.min(1, Math.max(0, Math.pow(noiseVal, 1.3)));
                const paletteLen = threeRGB.length; // 3
                const scaled = nColor * (paletteLen - 1); // 0..2
                const paletteIdx = Math.floor(scaled);
                const lerpFactor = scaled - paletteIdx;

                // Contrast bias (matches planet.renderPlanetTexture)
                const contrastBias = 2.6;
                let cf = ((lerpFactor - 0.5) * contrastBias) + 0.5;
                cf = cf < 0 ? 0 : (cf > 1 ? 1 : cf);

                const col1 = threeRGB[paletteIdx];
                const col2 = threeRGB[Math.min(paletteIdx + 1, paletteLen - 1)];

                // Interpolate between the two adjacent predominant colors
                const rVal = col1.r + (col2.r - col1.r) * cf;
                const gVal = col1.g + (col2.g - col1.g) * cf;
                const bVal = col1.b + (col2.b - col1.b) * cf;

                // Store raw RGB values (no p5.Color object allocation)
                this.mesh[gy][gx] = {
                    worldX: worldX,
                    worldY: worldY,
                    height: height,
                    r: rVal,
                    g: gVal,
                    b: bVal
                };
            }
        }

        return true; // Mesh was regenerated
    }

    /**
    /**
     * Update the offscreen terrain buffer with viewport culling
     * 
     * PERFORMANCE OPTIMIZATIONS:
     * - Uses quad() instead of beginShape()/endShape() for faster primitive drawing
     * - Grid-based coordinate calculation (no per-cell worldX/Y subtraction)
     * - Row-level viewport culling (skip entire out-of-view rows)
     * - Inline shade clamping (no constrain() function call)
     * - Raw RGB access (no .color.levels access)
     * - No strokes
     * 
     * @param {number} altitude - Current player altitude for perspective scale
     * @param {number} screenWidth - Screen width
     * @param {number} screenHeight - Screen height
     * @param {boolean} forceUpdate - Force regeneration
     * @param {number} sunAngle - Sun Angle in radians (default -PI/4)
     */
    updateBuffer(altitude, screenWidth, screenHeight, forceUpdate = false, sunAngle = -Math.PI / 4) {
        if (!this.buffer || this.mesh.length === 0) return;

        // Performance: Skip buffer update if altitude hasn't changed significantly
        // Note: We ignore sunAngle changes for caching because sun is locked during gameplay
        const altitudeDelta = Math.abs(altitude - this.lastBufferAltitude);
        if (!forceUpdate && this.lastBufferAltitude >= 0 && altitudeDelta < 15) {
            return;
        }
        this.lastBufferAltitude = altitude;

        // Clear buffer
        this.buffer.clear();
        this.buffer.noStroke();

        const cx = this.buffer.width / 2;
        const cy = this.buffer.height / 2;
        const resolution = this.config.MESH_RESOLUTION;
        const resMinus1 = resolution - 1;
        const cellSize = this.config.MESH_SIZE / resolution;
        const halfRes = Math.floor(resolution / 2);

        // Pre-calculate sun direction vectors
        const sunDirX = Math.cos(sunAngle);
        const sunDirY = Math.sin(sunAngle);

        // Calculate viewport bounds for culling
        const perspectiveScale = map(altitude, this.config.MIN_ALTITUDE, this.config.MAX_ALTITUDE, 1.2, 0.6);
        // Sharp padding (800) to account for max terrain height (500) and parallax shift at high altitude
        const cullPadding = 800 / perspectiveScale;
        const visibleHalfWidth = (screenWidth / 2) / perspectiveScale + cullPadding;
        const visibleHalfHeight = (screenHeight / 2) / perspectiveScale + cullPadding;

        // Grid-based culling bounds (in grid units from center)
        // Using +/- 2 padding for extra safety margin at edges
        const minVisibleGX = Math.max(0, Math.floor(halfRes - visibleHalfWidth / cellSize) - 2);
        const maxVisibleGX = Math.min(resMinus1, Math.ceil(halfRes + visibleHalfWidth / cellSize) + 2);
        const minVisibleGY = Math.max(0, Math.floor(halfRes - visibleHalfHeight / cellSize) - 2);
        const maxVisibleGY = Math.min(resMinus1, Math.ceil(halfRes + visibleHalfHeight / cellSize) + 2);

        let cellsDrawn = 0;
        let cellsCulled = 0;

        // Pre-compute base offset for grid-to-buffer coordinates
        // Grid cell (halfRes, halfRes) is at buffer center
        const baseOffsetX = -halfRes * cellSize;
        const baseOffsetY = -halfRes * cellSize;

        for (let gy = minVisibleGY; gy < maxVisibleGY; gy++) {
            const row0 = this.mesh[gy];
            const row1 = this.mesh[gy + 1];
            if (!row0 || !row1) continue;

            // Row Y offset (shared by all cells in row)
            const rowY0 = baseOffsetY + gy * cellSize;
            const rowY1 = baseOffsetY + (gy + 1) * cellSize;

            for (let gx = minVisibleGX; gx < maxVisibleGX; gx++) {
                const c00 = row0[gx];
                const c10 = row0[gx + 1];
                const c01 = row1[gx];
                const c11 = row1[gx + 1];

                if (!c00 || !c10 || !c01 || !c11) {
                    cellsCulled++;
                    continue;
                }

                cellsDrawn++;

                // Project terrain vertices for consistent pseudo-3D look
                // This ensures terrain hills align with the extrusion angle of objects
                const extrusionAngle = (this.config.EXTRUSION_ANGLE !== undefined) ? this.config.EXTRUSION_ANGLE : 0.5;
                const cosA = Math.cos(extrusionAngle);
                const sinA = Math.sin(extrusionAngle);

                // Grid-based X offsets
                const colX0 = baseOffsetX + gx * cellSize;
                const colX1 = baseOffsetX + (gx + 1) * cellSize;

                // Lighting calculation based on Sun Angle
                const slopeX = ((c10.height - c00.height) + (c11.height - c01.height)) * 0.5;
                const slopeY = ((c01.height - c00.height) + (c11.height - c01.height)) * 0.5;

                // Dynamic lighting: Dot product of slope normal and sun direction
                // Sun direction is (sunDirX, sunDirY). Slope "Normal" is roughly (-slopeX, -slopeY, 1).
                // Simplified: Light falls on slope facing the sun.
                // We invert signs because slopeX positive means "uphill to right", which faces LEFT.
                // If sun is LEFT (negative X), it should light up. (-slopeX * -1) = positive.
                const sunIntensity = (slopeX * -sunDirX + slopeY * -sunDirY) * 0.015;

                const avgHeight = (c00.height + c10.height + c01.height + c11.height) * 0.25;
                const heightLight = avgHeight * 0.0008;
                const steepness = (slopeX < 0 ? -slopeX : slopeX) + (slopeY < 0 ? -slopeY : slopeY);
                const valleyDarken = steepness * 0.005;

                // Inline clamp (no constrain() call)
                let shade = 0.65 + sunIntensity + heightLight - valleyDarken;
                shade = shade < 0.25 ? 0.25 : (shade > 1.4 ? 1.4 : shade);

                // Direct RGB access (no .color.levels)
                this.buffer.fill(c00.r * shade, c00.g * shade, c00.b * shade);

                // Draw quad using grid-calculated positions WITH extrusion projection
                // Projection: ScreenX = WorldX - height * sin(angle), ScreenY = WorldY - height * cos(angle)
                this.buffer.quad(
                    cx + colX0 - c00.height * sinA, cy + rowY0 - c00.height * cosA,
                    cx + colX1 - c10.height * sinA, cy + rowY0 - c10.height * cosA,
                    cx + colX1 - c11.height * sinA, cy + rowY1 - c11.height * cosA,
                    cx + colX0 - c01.height * sinA, cy + rowY1 - c01.height * cosA
                );
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
