// ****** terrainTile.js ******
// Terrain tile system for surface mode
// Generates procedural low-poly terrain using Draw3D primitives

/**
 * Terrain feature types and their Draw3D rendering
 */
const TERRAIN_FEATURES = {
    MOUNTAIN: 'mountain',
    HILL: 'hill',
    RIDGE: 'ridge',
    CRATER: 'crater',
    MESA: 'mesa',
    DUNE: 'dune',
    SPIRE: 'spire',
    BUILDING: 'building',
    TOWER: 'tower'
};

/**
 * Biome configurations based on planet type
 */
const BIOME_CONFIG = {
    DEFAULT: {
        groundVariation: 0.1,
        features: {
            low: [],
            medium: [TERRAIN_FEATURES.HILL],
            high: [TERRAIN_FEATURES.MOUNTAIN, TERRAIN_FEATURES.RIDGE]
        }
    },
    DESERT: {
        groundVariation: 0.15,
        features: {
            low: [],
            medium: [TERRAIN_FEATURES.DUNE, TERRAIN_FEATURES.DUNE],
            high: [TERRAIN_FEATURES.MESA, TERRAIN_FEATURES.SPIRE]
        }
    },
    ICE: {
        groundVariation: 0.08,
        features: {
            low: [],
            medium: [TERRAIN_FEATURES.HILL],
            high: [TERRAIN_FEATURES.SPIRE, TERRAIN_FEATURES.MOUNTAIN]
        }
    },
    VOLCANIC: {
        groundVariation: 0.2,
        features: {
            low: [TERRAIN_FEATURES.CRATER],
            medium: [TERRAIN_FEATURES.RIDGE],
            high: [TERRAIN_FEATURES.MOUNTAIN, TERRAIN_FEATURES.SPIRE]
        }
    },
    INHABITED: {
        groundVariation: 0.05,
        features: {
            low: [],
            medium: [TERRAIN_FEATURES.BUILDING],
            high: [TERRAIN_FEATURES.TOWER, TERRAIN_FEATURES.BUILDING]
        }
    }
};

/**
 * TerrainTile class - represents a single terrain tile
 */
class TerrainTile {
    /**
     * Create a terrain tile
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {Object} planet - Planet reference for color/noise data
     */
    constructor(gridX, gridY, planet) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.planet = planet;

        // World position
        const tileSize = SURFACE_CONFIG?.TILE_SIZE || 200;
        this.worldX = gridX * tileSize;
        this.worldY = gridY * tileSize;
        this.tileSize = tileSize;

        // Terrain data
        this.groundColor = null;
        this.groundHeight = 0;
        this.features = [];

        // Buffer for pre-rendered content (optional optimization)
        this.buffer = null;
        this.generated = false;
    }

    /**
     * Generate terrain for this tile
     */
    generate() {
        if (this.generated) return;

        // Get planet data for terrain generation
        const planet = this.planet;
        if (!planet) {
            this._generateDefaultTerrain();
            this.generated = true;
            return;
        }

        // Sample noise at tile center for base properties
        const centerX = this.worldX + this.tileSize / 2;
        const centerY = this.worldY + this.tileSize / 2;

        // Use planet's noise parameters
        const noiseScale = planet.noiseScale || 0.005;
        const featureRand = planet.featureRand || 0;
        const noiseZ = featureRand * 0.6;

        // Sample 3D noise matching planet's surface
        const sampleMultiplier = (planet.radius || 200) * noiseScale * 0.0008;
        const nx = centerX * sampleMultiplier + featureRand * 0.001;
        const ny = centerY * sampleMultiplier + featureRand * 0.002;

        // Get noise value for this tile
        const noiseVal = noise(nx, ny, noiseZ);

        // Determine ground color from planet palette
        this._assignGroundColor(noiseVal);

        // Determine ground height (centered around 0)
        const maxHeight = SURFACE_CONFIG?.MAX_TERRAIN_HEIGHT || 80;
        this.groundHeight = (noiseVal - 0.5) * maxHeight * 0.3;

        // Generate features based on noise
        this._generateFeatures(noiseVal);

        this.generated = true;
    }

    /**
     * Assign ground color from planet palette
     * @param {number} noiseVal - Noise value 0-1
     * @private
     */
    _assignGroundColor(noiseVal) {
        const planet = this.planet;

        if (planet && planet.palette && planet.palette.length > 0) {
            const paletteLen = planet.palette.length;
            const idx = Math.floor(noiseVal * (paletteLen - 1));
            const nextIdx = Math.min(idx + 1, paletteLen - 1);
            const t = (noiseVal * (paletteLen - 1)) - idx;

            // Lerp between palette colors
            const c1 = planet.palette[idx];
            const c2 = planet.palette[nextIdx];

            if (c1 && c2) {
                this.groundColor = lerpColor(c1, c2, t);
            } else {
                this.groundColor = c1 || color(120, 100, 80);
            }
        } else {
            // Default terrain color
            this.groundColor = color(120 + noiseVal * 40, 100 + noiseVal * 30, 80 + noiseVal * 20);
        }
    }

    /**
     * Generate terrain features based on noise
     * @param {number} noiseVal - Noise value 0-1
     * @private
     */
    _generateFeatures(noiseVal) {
        this.features = [];

        // Determine biome from planet properties
        const biome = this._getBiome();
        const config = BIOME_CONFIG[biome] || BIOME_CONFIG.DEFAULT;

        // Feature height category
        const category = noiseVal < 0.35 ? 'low' : noiseVal < 0.65 ? 'medium' : 'high';
        const possibleFeatures = config.features[category];

        // Chance to spawn a feature
        const featureChance = SURFACE_CONFIG?.FEATURE_DENSITY || 0.3;

        // Use grid position for deterministic randomness
        const seed = this.gridX * 10000 + this.gridY + (this.planet?.featureRand || 0);
        const pseudoRandom = (seed * 9301 + 49297) % 233280 / 233280;

        if (pseudoRandom < featureChance && possibleFeatures.length > 0) {
            // Pick a feature type
            const featureIdx = Math.floor(pseudoRandom * 10) % possibleFeatures.length;
            const featureType = possibleFeatures[featureIdx];

            // Position within tile (with some padding from edges)
            const padding = this.tileSize * 0.2;
            const px = padding + (pseudoRandom * 0.5) * (this.tileSize - padding * 2);
            const py = padding + ((pseudoRandom * 3) % 1) * (this.tileSize - padding * 2);

            // Size based on noise and random factor
            const sizeBase = 20 + noiseVal * 40;
            const sizeMod = 0.7 + pseudoRandom * 0.6;

            const feature = {
                type: featureType,
                localX: px,
                localY: py,
                size: sizeBase * sizeMod,
                height: (noiseVal - 0.3) * (SURFACE_CONFIG?.MAX_TERRAIN_HEIGHT || 80),
                color: this._getFeatureColor(featureType, noiseVal)
            };

            this.features.push(feature);
        }
    }

    /**
     * Get biome type from planet properties
     * @returns {string} Biome type key
     * @private
     */
    _getBiome() {
        const planet = this.planet;
        if (!planet) return 'DEFAULT';

        // Check for inhabited
        if (planet.isInhabited) return 'INHABITED';

        // Check atmosphere color for hints
        if (planet.atmosphereColor) {
            const r = red(planet.atmosphereColor);
            const g = green(planet.atmosphereColor);
            const b = blue(planet.atmosphereColor);

            // Orange/red = volcanic or desert
            if (r > 180 && g < 150 && b < 120) return 'VOLCANIC';
            // Blue/white = ice
            if (b > 200 && r < 180) return 'ICE';
            // Brown/tan = desert
            if (r > 150 && g > 100 && g < 170 && b < 120) return 'DESERT';
        }

        // Check base color
        if (planet.baseColor) {
            const r = red(planet.baseColor);
            const g = green(planet.baseColor);
            const b = blue(planet.baseColor);

            // Warm colors = desert/volcanic
            if (r > 160 && g < 140) return random() > 0.5 ? 'DESERT' : 'VOLCANIC';
            // Cool colors = ice
            if (b > 180 && r < 150) return 'ICE';
        }

        return 'DEFAULT';
    }

    /**
     * Get feature color (slightly different from ground for contrast)
     * @param {string} featureType
     * @param {number} noiseVal
     * @returns {p5.Color}
     * @private
     */
    _getFeatureColor(featureType, noiseVal) {
        // Start with ground color, adjust for feature type
        let baseColor = this.groundColor || color(128, 128, 128);

        switch (featureType) {
            case TERRAIN_FEATURES.MOUNTAIN:
            case TERRAIN_FEATURES.SPIRE:
                // Darker, more gray
                return lerpColor(baseColor, color(80, 80, 90), 0.4);

            case TERRAIN_FEATURES.BUILDING:
            case TERRAIN_FEATURES.TOWER:
                // Metallic/artificial
                return color(150, 150, 160);

            case TERRAIN_FEATURES.CRATER:
                // Darker than surroundings
                return lerpColor(baseColor, color(40, 40, 40), 0.5);

            default:
                // Slight variation
                const shift = (noiseVal - 0.5) * 30;
                return color(
                    red(baseColor) + shift,
                    green(baseColor) + shift * 0.8,
                    blue(baseColor) + shift * 0.6
                );
        }
    }

    /**
     * Generate default terrain when no planet data available
     * @private
     */
    _generateDefaultTerrain() {
        this.groundColor = color(100, 90, 70);
        this.groundHeight = 0;
        this.features = [];
    }

    /**
     * Draw the terrain tile
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {number} sunAngle - Light direction angle
     * @param {number} lod - Level of detail (0=low, 1=medium, 2=high)
     */
    draw(screenX, screenY, sunAngle, lod = 2) {
        // Draw ground quad
        this._drawGround(screenX, screenY, lod);

        // Draw features (skip at lowest LOD)
        if (lod > 0) {
            this._drawFeatures(screenX, screenY, sunAngle, lod);
        }
    }

    /**
     * Draw ground plane
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} lod
     * @private
     */
    _drawGround(screenX, screenY, lod) {
        push();

        noStroke();
        fill(this.groundColor || color(100, 90, 70));

        // Simple quad for ground
        rect(screenX, screenY, this.tileSize, this.tileSize);

        // Add subtle grid lines at high LOD for visual interest
        if (lod >= 2) {
            stroke(0, 0, 0, 30);
            strokeWeight(1);
            // Horizontal and vertical lines at tile edges
            line(screenX, screenY, screenX + this.tileSize, screenY);
            line(screenX, screenY, screenX, screenY + this.tileSize);
        }

        pop();
    }

    /**
     * Draw terrain features using Draw3D
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} sunAngle
     * @param {number} lod
     * @private
     */
    _drawFeatures(screenX, screenY, sunAngle, lod) {
        // Check if Draw3D is available
        if (typeof Draw3D === 'undefined') {
            // Fallback: draw simple shapes
            this._drawFeaturesFallback(screenX, screenY);
            return;
        }

        for (const feature of this.features) {
            const fx = screenX + feature.localX;
            const fy = screenY + feature.localY;
            const size = feature.size * (lod === 1 ? 0.8 : 1.0);
            const height = feature.height;
            const col = feature.color;

            // Use deferred rendering for depth sorting
            switch (feature.type) {
                case TERRAIN_FEATURES.MOUNTAIN:
                    Draw3D.drawCone(fx, fy, size, height, 6, col, sunAngle, sunAngle);
                    break;

                case TERRAIN_FEATURES.HILL:
                    Draw3D.drawDome(fx, fy, size * 0.8, 8, col, sunAngle, sunAngle, false);
                    break;

                case TERRAIN_FEATURES.SPIRE:
                    Draw3D.drawCone(fx, fy, size * 0.4, height * 1.5, 4, col, sunAngle, sunAngle);
                    break;

                case TERRAIN_FEATURES.MESA:
                    Draw3D.drawBox3D(fx, fy, size * 1.5, size, height * 0.5, col, sunAngle, sunAngle);
                    break;

                case TERRAIN_FEATURES.DUNE:
                    Draw3D.drawDome(fx, fy, size, 6, col, sunAngle, sunAngle, false);
                    break;

                case TERRAIN_FEATURES.CRATER:
                    Draw3D.drawDome(fx, fy, size, 8, col, sunAngle, sunAngle, true);
                    break;

                case TERRAIN_FEATURES.RIDGE:
                    // Draw as elongated prism
                    Draw3D.drawBox3D(fx, fy, size * 2, size * 0.4, height * 0.6, col, sunAngle, sunAngle);
                    break;

                case TERRAIN_FEATURES.BUILDING:
                    Draw3D.drawBox3D(fx, fy, size * 0.8, size * 0.8, height * 0.8, col, sunAngle, sunAngle);
                    break;

                case TERRAIN_FEATURES.TOWER:
                    Draw3D.drawCylinder(fx, fy, size * 0.3, height * 1.2, 8, col, sunAngle, sunAngle);
                    break;
            }
        }
    }

    /**
     * Fallback feature drawing without Draw3D
     * @param {number} screenX
     * @param {number} screenY
     * @private
     */
    _drawFeaturesFallback(screenX, screenY) {
        push();
        noStroke();

        for (const feature of this.features) {
            const fx = screenX + feature.localX;
            const fy = screenY + feature.localY;
            const size = feature.size;

            // Darken the feature color slightly for depth illusion
            const col = feature.color || color(100, 100, 100);
            fill(red(col) * 0.8, green(col) * 0.8, blue(col) * 0.8);

            switch (feature.type) {
                case TERRAIN_FEATURES.MOUNTAIN:
                case TERRAIN_FEATURES.SPIRE:
                    // Triangle
                    triangle(fx, fy - size, fx - size * 0.6, fy + size * 0.3, fx + size * 0.6, fy + size * 0.3);
                    break;

                case TERRAIN_FEATURES.HILL:
                case TERRAIN_FEATURES.DUNE:
                    ellipse(fx, fy, size * 1.5, size);
                    break;

                case TERRAIN_FEATURES.BUILDING:
                case TERRAIN_FEATURES.MESA:
                    rect(fx - size * 0.4, fy - size * 0.4, size * 0.8, size * 0.8);
                    break;

                case TERRAIN_FEATURES.CRATER:
                    fill(red(col) * 0.5, green(col) * 0.5, blue(col) * 0.5);
                    ellipse(fx, fy, size, size * 0.8);
                    break;

                default:
                    ellipse(fx, fy, size, size);
            }
        }

        pop();
    }

    /**
     * Get terrain height at a specific world position
     * @param {number} worldX
     * @param {number} worldY
     * @returns {number} Height at position
     */
    getHeightAt(worldX, worldY) {
        // Base ground height
        let height = this.groundHeight;

        // Check if position is near any feature
        for (const feature of this.features) {
            const featureWorldX = this.worldX + feature.localX;
            const featureWorldY = this.worldY + feature.localY;
            const dx = worldX - featureWorldX;
            const dy = worldY - featureWorldY;
            const distSq = dx * dx + dy * dy;
            const radiusSq = feature.size * feature.size;

            // If within feature radius, add feature height (falloff with distance)
            if (distSq < radiusSq) {
                const t = 1 - Math.sqrt(distSq / radiusSq);

                // Different falloff curves for different feature types
                switch (feature.type) {
                    case TERRAIN_FEATURES.MOUNTAIN:
                    case TERRAIN_FEATURES.SPIRE:
                        // Sharp peak
                        height = Math.max(height, feature.height * t * t);
                        break;

                    case TERRAIN_FEATURES.HILL:
                    case TERRAIN_FEATURES.DUNE:
                        // Smooth dome
                        height = Math.max(height, feature.height * Math.sqrt(t));
                        break;

                    case TERRAIN_FEATURES.CRATER:
                        // Depression
                        height = Math.min(height, -feature.height * 0.5 * t);
                        break;

                    case TERRAIN_FEATURES.BUILDING:
                    case TERRAIN_FEATURES.TOWER:
                    case TERRAIN_FEATURES.MESA:
                        // Flat top (if close to center)
                        if (t > 0.7) {
                            height = Math.max(height, feature.height);
                        }
                        break;

                    default:
                        height = Math.max(height, feature.height * t);
                }
            }
        }

        return height;
    }
}

console.log("terrainTile.js - Terrain tile system loaded");
