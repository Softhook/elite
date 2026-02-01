// ****** surfaceObjectUtils.js ******
// Utility functions for surface objects
// Extracted common patterns to reduce duplication

/**
 * Constants for surface object rendering
 * EXTRUSION_ANGLE must match SURFACE_CONFIG.EXTRUSION_ANGLE (0.5)
 */
const SURFACE_RENDER_CONSTANTS = {
    EXTRUSION_ANGLE: 0.5,
    DEFAULT_SUN_ANGLE: -Math.PI / 4
};

/**
 * Calculate building variant from seed
 * @param {number} seed - Random seed
 * @param {number} multiplier - Seed multiplier for uniqueness (default: 7.89)
 * @param {number} variantCount - Number of variants (default: 5)
 * @returns {number} Variant index (0 to variantCount-1)
 */
function calculateVariant(seed, multiplier = 7.89, variantCount = 5) {
    return Math.floor((Math.sin(seed * multiplier) * 0.5 + 0.5) * variantCount);
}

/**
 * Calculate building height from size and seed
 * @param {number} size - Base size
 * @param {number} seed - Random seed
 * @param {number} minMultiplier - Minimum height multiplier (default: 2)
 * @param {number} maxMultiplier - Maximum height multiplier (default: 5)
 * @returns {number} Building height
 */
function calculateHeight(size, seed, minMultiplier = 2, maxMultiplier = 5) {
    const range = maxMultiplier - minMultiplier;
    return size * (minMultiplier + (Math.sin(seed) * 0.5 + 0.5) * range);
}

/**
 * Calculate vertical offset for extruded objects
 * @param {number} height - Object height
 * @param {number} extrusionAngle - Extrusion angle (default: 0.15)
 * @returns {number} Vertical offset (dv)
 */
function calculateVerticalOffset(height, extrusionAngle = SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE) {
    return height * Math.cos(extrusionAngle);
}

/**
 * Get extrusion angle from surfaceMode or fallback to constant
 * Centralizes the fallback logic that was duplicated across all surface objects
 * @returns {number} Extrusion angle in radians
 */
function getExtrusionAngle() {
    if (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle) {
        return surfaceMode._getExtrusionAngle();
    }
    if (SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined) {
        return SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE;
    }
    return 0.5; // Final fallback
}

/**
 * Convert world coordinates to visual coordinates with projection
 * @param {number} worldX - World X coordinate
 * @param {number} worldY - World Y coordinate
 * @param {number} altitude - Object altitude
 * @param {number} extrusionAngle - Optional extrusion angle (defaults to current)
 * @returns {{x: number, y: number}} Visual coordinates
 */
function toVisualCoordinates(worldX, worldY, altitude, extrusionAngle = null) {
    if (extrusionAngle === null) {
        extrusionAngle = getExtrusionAngle();
    }
    
    let visualX, visualY;
    
    if (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX && surfaceMode._toVisualY) {
        visualX = surfaceMode._toVisualX(worldX, altitude);
        visualY = surfaceMode._toVisualY(worldY, altitude);
    } else {
        visualX = worldX - altitude * Math.sin(extrusionAngle);
        visualY = worldY - altitude * Math.cos(extrusionAngle);
    }
    
    return { x: visualX, y: visualY };
}

/**
 * Get projection helpers for rendering surface objects
 * Returns both extrusion angle and visual coordinates in one call
 * @param {number} worldX - World X coordinate
 * @param {number} worldY - World Y coordinate
 * @param {number} altitude - Object altitude
 * @returns {{extrusionAngle: number, baseX: number, baseY: number}} Projection data
 */
function getProjectionHelpers(worldX, worldY, altitude) {
    const extrusionAngle = getExtrusionAngle();
    const visual = toVisualCoordinates(worldX, worldY, altitude, extrusionAngle);
    
    return {
        extrusionAngle,
        baseX: visual.x,
        baseY: visual.y
    };
}

/**
 * Initialize colors for a building from RGB arrays
 * @param {Object} colorConfig - Object with primary, accent, etc. as [r,g,b] arrays
 * @returns {Object} Object with p5.Color objects
 */
function initializeBuildingColors(colorConfig) {
    const colors = {};
    for (const [key, rgb] of Object.entries(colorConfig)) {
        if (Array.isArray(rgb) && rgb.length === 3) {
            colors[key] = color(rgb[0], rgb[1], rgb[2]);
        }
    }
    return colors;
}

/**
 * Create a standard building base configuration
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} size - Building size
 * @param {number} seed - Random seed
 * @param {Object} style - Building style configuration
 * @returns {Object} Building configuration
 */
function createBuildingConfig(x, y, size, seed, style) {
    const variant = calculateVariant(seed, style.variantSeedMultiplier, style.variantCount);
    const height = calculateHeight(size, seed, style.heightMultiplier[0], style.heightMultiplier[1]);
    const colors = initializeBuildingColors(style.colors);

    return {
        x,
        y,
        size,
        seed,
        variant,
        height,
        type: style.type,
        maxHealth: style.maxHealth,
        colors
    };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SURFACE_RENDER_CONSTANTS = SURFACE_RENDER_CONSTANTS;
    window.calculateVariant = calculateVariant;
    window.calculateHeight = calculateHeight;
    window.calculateVerticalOffset = calculateVerticalOffset;
    window.initializeBuildingColors = initializeBuildingColors;
    window.createBuildingConfig = createBuildingConfig;
    window.getExtrusionAngle = getExtrusionAngle;
    window.toVisualCoordinates = toVisualCoordinates;
    window.getProjectionHelpers = getProjectionHelpers;
}

// For Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SURFACE_RENDER_CONSTANTS,
        calculateVariant,
        calculateHeight,
        calculateVerticalOffset,
        initializeBuildingColors,
        createBuildingConfig,
        getExtrusionAngle,
        toVisualCoordinates,
        getProjectionHelpers
    };
}

console.log("surfaceObjectUtils.js loaded");
