// ****** surfaceObjectUtils.js ******
// Utility functions for surface objects
// Extracted common patterns to reduce duplication

/**
 * Constants for surface object rendering
 * EXTRUSION_ANGLE must match SURFACE_CONFIG.EXTRUSION_ANGLE (0.5)
 */
const SURFACE_RENDER_CONSTANTS = {
    EXTRUSION_ANGLE: 0.5,
    DEFAULT_SUN_ANGLE: -Math.PI / 4,
    TWO_PI: Math.PI * 2,
    DAMAGE_FLASH_DURATION: 150, // ms
    VISIBILITY_RESOLUTION: 128
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

/**
 * Normalize angle difference to [-PI, PI] range
 * Used for smooth rotation and turning behaviors
 * @param {number} targetAngle - Target angle in radians
 * @param {number} currentAngle - Current angle in radians
 * @returns {number} Normalized angle difference
 */
function normalizeAngleDifference(targetAngle, currentAngle) {
    let diff = targetAngle - currentAngle;
    const TWO_PI = SURFACE_RENDER_CONSTANTS.TWO_PI;
    while (diff < -Math.PI) diff += TWO_PI;
    while (diff > Math.PI) diff -= TWO_PI;
    return diff;
}

/**
 * Check if entity should show damage flash effect
 * @param {number} lastHitTime - Timestamp of last hit (from millis())
 * @param {number} duration - Flash duration in ms (default: 150)
 * @returns {boolean} True if should show flash
 */
function shouldShowDamageFlash(lastHitTime, duration = SURFACE_RENDER_CONSTANTS.DAMAGE_FLASH_DURATION) {
    if (!lastHitTime || typeof millis !== 'function') return false;
    return millis() - lastHitTime < duration;
}

/**
 * Apply smooth frame-rate independent rotation towards target angle
 * @param {number} currentAngle - Current angle in radians
 * @param {number} targetAngle - Target angle in radians
 * @param {number} turnSpeed - Turn speed in radians per second
 * @param {number} dt - Delta time in seconds
 * @returns {number} New angle after applying rotation
 */
function smoothRotateTowards(currentAngle, targetAngle, turnSpeed, dt) {
    const diff = normalizeAngleDifference(targetAngle, currentAngle);
    const maxTurn = turnSpeed * dt;

    if (Math.abs(diff) <= maxTurn) {
        return targetAngle;
    }

    return currentAngle + Math.sign(diff) * maxTurn;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.TWO_PI = SURFACE_RENDER_CONSTANTS.TWO_PI;
    window.calculateVariant = calculateVariant;
    window.calculateHeight = calculateHeight;
    window.calculateVerticalOffset = calculateVerticalOffset;
    window.initializeBuildingColors = initializeBuildingColors;
    window.createBuildingConfig = createBuildingConfig;
    window.getExtrusionAngle = getExtrusionAngle;
    window.toVisualCoordinates = toVisualCoordinates;
    window.getProjectionHelpers = getProjectionHelpers;
    window.normalizeAngleDifference = normalizeAngleDifference;
    window.shouldShowDamageFlash = shouldShowDamageFlash;
    window.smoothRotateTowards = smoothRotateTowards;
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
        getProjectionHelpers,
        normalizeAngleDifference,
        shouldShowDamageFlash,
        smoothRotateTowards
    };
}

console.log("surfaceObjectUtils.js loaded");
