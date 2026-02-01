// ****** surfaceUtils.js ******
// Shared utilities for surface mode rendering and altitude projection
// Used by surfaceMode.js, projectile.js, explosion.js, and other surface-aware entities

/**
 * SurfaceUtils - Shared utilities for surface mode altitude projection and rendering
 * 
 * COORDINATE SYSTEMS:
 * - World Coordinates: Actual position in game world (x, y, altitude)
 * - Screen Coordinates: After camera translation (centered on player)
 * - Visual Coordinates: Screen position adjusted for 3D extrusion effect (altitude offset)
 * 
 * The altitude projection system:
 * 1. Objects at higher altitudes appear offset in visual space
 * 2. The offset is calculated using the extrusion angle
 * 3. Perspective scale varies inversely with altitude
 */
const SurfaceUtils = {
    /**
     * Standard extrusion angle for pseudo-3D rendering (shared constant)
     */
    EXTRUSION_ANGLE: 0.5,

    /**
     * Calculate perspective scale based on altitude
     * Objects at higher altitudes appear smaller due to perspective
     * @param {number} altitude - Current altitude above terrain
     * @returns {number} Perspective scale factor (0-1.2)
     */
    getPerspectiveScale(altitude) {
        return 1200 / (altitude + 1000);
    },

    /**
     * Calculate counter-scale to maintain constant visual size
     * Used to keep objects same size regardless of altitude
     * @param {number} altitude - Current altitude above terrain
     * @returns {number} Counter-scale factor (inverse of perspective scale)
     */
    getCounterScale(altitude) {
        return 1 / this.getPerspectiveScale(altitude);
    },

    /**
     * Get the extrusion angle for altitude projection
     * @returns {number} Extrusion angle in radians
     */
    getExtrusionAngle() {
        return this.EXTRUSION_ANGLE;
    },

    /**
     * Convert world X coordinate to visual X coordinate accounting for altitude
     * @param {number} worldX - World X coordinate
     * @param {number} altitude - Altitude above terrain
     * @returns {number} Visual X coordinate
     */
    toVisualX(worldX, altitude) {
        const extrusionAngle = this.getExtrusionAngle();
        return worldX - altitude * Math.sin(extrusionAngle);
    },

    /**
     * Convert world Y coordinate to visual Y coordinate accounting for altitude
     * @param {number} worldY - World Y coordinate
     * @param {number} altitude - Altitude above terrain
     * @returns {number} Visual Y coordinate
     */
    toVisualY(worldY, altitude) {
        const extrusionAngle = this.getExtrusionAngle();
        return worldY - altitude * Math.cos(extrusionAngle);
    },

    /**
     * Project 3D world position to 2D visual coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} altitude - Altitude above terrain
     * @returns {{x: number, y: number}} Visual coordinates
     */
    projectToVisual(worldX, worldY, altitude) {
        return {
            x: this.toVisualX(worldX, altitude),
            y: this.toVisualY(worldY, altitude)
        };
    },

    /**
     * Calculate required mesh size to avoid edge visibility at given altitude
     * @param {number} altitude - Maximum altitude to support
     * @param {number} screenWidth - Screen width in pixels (default 1920)
     * @param {number} screenHeight - Screen height in pixels (default 1080)
     * @param {number} padding - Extra padding for safety margin (default 400)
     * @returns {number} Required mesh size in world units
     */
    calculateRequiredMeshSize(altitude, screenWidth = 1920, screenHeight = 1080, padding = 400) {
        const perspectiveScale = this.getPerspectiveScale(altitude);
        const viewportWidth = (screenWidth / perspectiveScale) + padding * 2;
        const viewportHeight = (screenHeight / perspectiveScale) + padding * 2;
        
        // Return the larger dimension with safety margin
        return Math.max(viewportWidth, viewportHeight) * 1.1;
    },

    /**
     * Get viewport bounds for culling based on altitude and focus position
     * @param {number} focusX - Camera focus X in world coordinates
     * @param {number} focusY - Camera focus Y in world coordinates
     * @param {number} altitude - Current altitude
     * @param {number} screenWidth - Screen width in pixels
     * @param {number} screenHeight - Screen height in pixels
     * @param {number} padding - Padding to avoid pop-in (default 200)
     * @returns {{minX: number, maxX: number, minY: number, maxY: number}} Viewport bounds
     */
    getViewportBounds(focusX, focusY, altitude, screenWidth, screenHeight, padding = 200) {
        const perspectiveScale = this.getPerspectiveScale(altitude);
        const extrusionAngle = this.getExtrusionAngle();

        // Calculate visual offsets for the focus point
        const visualXOffset = altitude * Math.sin(extrusionAngle);
        const visualYOffset = altitude * Math.cos(extrusionAngle);

        const adjustedFocusX = focusX - visualXOffset;
        const adjustedFocusY = focusY - visualYOffset;

        const viewportWidth = (screenWidth / perspectiveScale) + padding * 2;
        const viewportHeight = (screenHeight / perspectiveScale) + padding * 2;

        return {
            minX: adjustedFocusX - viewportWidth / 2,
            maxX: adjustedFocusX + viewportWidth / 2,
            minY: adjustedFocusY - viewportHeight / 2,
            maxY: adjustedFocusY + viewportHeight / 2
        };
    },

    /**
     * Check if a point is within viewport bounds (for culling)
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} altitude - Altitude of the object
     * @param {Object} viewport - Viewport bounds from getViewportBounds()
     * @param {number} margin - Extra margin for the object (e.g., size/radius)
     * @returns {boolean} True if object is visible, false if culled
     */
    isInViewport(worldX, worldY, altitude, viewport, margin = 0) {
        const visual = this.projectToVisual(worldX, worldY, altitude);
        
        return !(visual.x + margin < viewport.minX || 
                 visual.x - margin > viewport.maxX ||
                 visual.y + margin < viewport.minY || 
                 visual.y - margin > viewport.maxY);
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.SurfaceUtils = SurfaceUtils;
}

// Only log in debug mode
if (typeof DEBUG !== 'undefined' && DEBUG) {
    console.log("surfaceUtils.js loaded");
}
