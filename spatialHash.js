/**
 * SpatialHash - Grid-based spatial partitioning for efficient collision detection
 * 
 * This class provides O(1) average-time spatial queries by dividing the world
 * into a grid of cells. Entities are inserted into cells based on their position,
 * and queries return only entities in nearby cells.
 * 
 * Usage:
 *   const hash = new SpatialHash(200);  // 200px cell size
 *   hash.insertAll(enemies);
 *   hash.insertAll(asteroids);
 *   const nearby = hash.getNearby(x, y, radius);
 */
class SpatialHash {
    /**
     * Create a new spatial hash
     * @param {number} cellSize - Size of each grid cell in pixels (default: 1000)
     *                            1000px is optimal based on benchmarks - matches largest query radius (targeting)
     */
    constructor(cellSize = 1000) {
        this.cellSize = cellSize;
        this.cells = new Map();

        // Pre-allocate reusable arrays to avoid GC pressure
        this._reusableResults = [];
        this._reusableFiltered = [];
    }

    /**
     * Fast integer hash from cell coordinates using prime multiplication
     * @private
     */
    _keyFromCoords(cx, cy) {
        // Use prime number multiplication for better distribution
        // This creates a unique key for each (cx, cy) pair
        return (cx * 73856093) ^ (cy * 19349663);
    }

    /**
     * Get cell key for a world position
     * @private
     */
    _key(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return this._keyFromCoords(cx, cy);
    }

    /**
     * Get cell coordinates from world position
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @returns {{cx: number, cy: number}} Cell coordinates
     */
    getCellCoords(x, y) {
        return {
            cx: Math.floor(x / this.cellSize),
            cy: Math.floor(y / this.cellSize)
        };
    }

    /**
     * Insert a single entity into the hash
     * @param {Object} entity - Entity with a pos property (pos.x, pos.y)
     */
    insert(entity) {
        if (!entity || !entity.pos) return;

        const key = this._key(entity.pos.x, entity.pos.y);
        let cell = this.cells.get(key);
        if (!cell) {
            cell = [];
            this.cells.set(key, cell);
        }
        cell.push(entity);
    }

    /**
     * Insert multiple entities efficiently
     * @param {Array} entities - Array of entities with pos properties
     */
    insertAll(entities) {
        if (!entities || !entities.length) return;

        for (let i = 0, len = entities.length; i < len; i++) {
            const entity = entities[i];
            if (!entity || !entity.pos) continue;

            const key = this._key(entity.pos.x, entity.pos.y);
            let cell = this.cells.get(key);
            if (!cell) {
                cell = [];
                this.cells.set(key, cell);
            }
            cell.push(entity);
        }
    }

    /**
     * Get all entities within a radius of a point (broadphase)
     * 
     * NOTE: This returns entities from nearby CELLS, not entities within the exact radius.
     * Some returned entities may be slightly outside the radius. For exact filtering,
     * use getNearbyFiltered() or filter the results yourself.
     * 
     * @param {number} x - Center X coordinate
     * @param {number} y - Center Y coordinate
     * @param {number} radius - Search radius in pixels
     * @param {Array} [results] - Optional array to reuse (avoids allocation)
     * @returns {Array} Entities in nearby cells
     */
    getNearby(x, y, radius, results = null) {
        const out = results || this._reusableResults;
        out.length = 0;

        // Calculate precise cell range to check
        const minCx = Math.floor((x - radius) / this.cellSize);
        const maxCx = Math.floor((x + radius) / this.cellSize);
        const minCy = Math.floor((y - radius) / this.cellSize);
        const maxCy = Math.floor((y + radius) / this.cellSize);

        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const key = this._keyFromCoords(cx, cy);
                const cell = this.cells.get(key);
                if (cell) {
                    for (let i = 0, len = cell.length; i < len; i++) {
                        out.push(cell[i]);
                    }
                }
            }
        }
        return out;
    }

    /**
     * Get entities within radius, filtered by actual distance (narrowphase)
     * 
     * This is more accurate than getNearby() but slightly slower due to distance checks.
     * Use this when you need exact radius matching.
     * 
     * @param {number} x - Center X coordinate
     * @param {number} y - Center Y coordinate
     * @param {number} radius - Search radius in pixels
     * @param {Array} [results] - Optional array to reuse
     * @returns {Array} Entities within exact radius
     */
    getNearbyFiltered(x, y, radius, results = null) {
        const candidates = this.getNearby(x, y, radius);
        const out = results || this._reusableFiltered;
        out.length = 0;

        const radiusSq = radius * radius;

        for (let i = 0, len = candidates.length; i < len; i++) {
            const entity = candidates[i];
            if (!entity || !entity.pos) continue;

            const dx = entity.pos.x - x;
            const dy = entity.pos.y - y;
            if (dx * dx + dy * dy <= radiusSq) {
                out.push(entity);
            }
        }
        return out;
    }

    /**
     * Clear all entities from the hash
     * Call this at the start of each frame before re-inserting entities
     */
    clear() {
        this.cells.clear();
    }

    /**
     * Get the number of cells currently containing entities
     * @returns {number} Number of occupied cells
     */
    get cellCount() {
        return this.cells.size;
    }

    /**
     * Get total entity count across all cells
     * @returns {number} Total number of entities in hash
     */
    get entityCount() {
        let count = 0;
        for (const cell of this.cells.values()) {
            count += cell.length;
        }
        return count;
    }

    /**
     * Debug: Get statistics about the hash distribution
     * @returns {Object} Statistics object
     */
    getStats() {
        let totalEntities = 0;
        let maxCellSize = 0;
        let minCellSize = Infinity;

        for (const cell of this.cells.values()) {
            totalEntities += cell.length;
            maxCellSize = Math.max(maxCellSize, cell.length);
            minCellSize = Math.min(minCellSize, cell.length);
        }

        return {
            cellCount: this.cells.size,
            totalEntities,
            avgEntitiesPerCell: this.cells.size > 0 ? totalEntities / this.cells.size : 0,
            maxCellSize,
            minCellSize: this.cells.size > 0 ? minCellSize : 0,
            cellSize: this.cellSize
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SpatialHash = SpatialHash;
}
