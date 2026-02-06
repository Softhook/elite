// ****** visibilityAnalyzer.js ******
// Utility to analyze sub-element visibility using a pixel-perfect offscreen pass.
// Runs once per species configuration and caches the results.

class VisibilityAnalyzer {
    static _cache = new Map();
    static _buffer = null;

    /**
     * Get indices of visible sub-elements for a specific configuration
     * @param {string} entityId - Name of the class or unique species ID
     * @param {number} count - Number of sub-elements to check
     * @param {Function} drawFn - Function to draw the entity with ID colors
     * @param {number} res - Optional resolution for the offscreen buffer
     * @returns {Array<number>} Visible indices
     */
    static getVisibleIndices(entityId, count, drawFn, res = null) {
        // Fully robust resolution fallback
        let resolution = 128;
        if (res) {
            resolution = res;
        } else if (typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.VISIBILITY_RESOLUTION) {
            resolution = SURFACE_RENDER_CONSTANTS.VISIBILITY_RESOLUTION;
        }

        const cacheKey = `${entityId}_${count}`;
        if (this._cache.has(cacheKey)) {
            console.log(`[VisibilityAnalyzer] ${entityId}: using cached indices (${this._cache.get(cacheKey).length}/${count})`);
            return this._cache.get(cacheKey);
        }

        // Lazily create or resize offscreen buffer
        if (typeof createGraphics === 'function') {
            if (!this._buffer || this._buffer.width !== resolution) {
                this._buffer = createGraphics(resolution, resolution);
            }
        }

        if (!this._buffer) return Array.from({ length: count }, (_, i) => i);

        const g = this._buffer;
        g.noSmooth(); // Crucial: Prevent edge blending from creating phantom IDs
        g.clear();
        g.push();
        // Center of buffer, adjusted for expected extrusion height
        g.translate(resolution / 2, (resolution / 2) + (resolution / 4));

        // Solid black for background/body to obscure hidden elements
        g.noStroke();
        g.fill(0);

        // Execute the ID-color pass
        // Pass true for noShading parameter in Draw3D calls inside drawFn
        drawFn(g);

        g.pop();
        g.loadPixels();

        const visibleSet = new Set();
        const pixels = g.pixels;
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const gVal = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];

            // Only accept pure R values (IDs) and avoid background (0)
            // Strict filtering: Index must be within [0, count-1]
            if (a > 250 && r > 0 && r <= count && gVal === 0 && b === 0) {
                visibleSet.add(r - 1);
            }
        }

        const visibleIndices = Array.from(visibleSet).sort((a, b) => a - b);
        this._cache.set(cacheKey, visibleIndices);

        const pruned = count - visibleIndices.length;
        console.log(`[VisibilityAnalyzer] ${entityId}: ${visibleIndices.length}/${count} visible (${pruned} pruned)`);
        return visibleIndices;
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.VisibilityAnalyzer = VisibilityAnalyzer;
}

// For Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VisibilityAnalyzer };
}

console.log("visibilityAnalyzer.js loaded");
