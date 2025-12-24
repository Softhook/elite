/**
 * CollisionUtils - Polygon collision detection for on-screen entities
 * Uses Separating Axis Theorem (SAT) for accurate polygon collision
 * 
 * Only applies polygon checks to on-screen entities for performance.
 * Off-screen collisions use circle-based broadphase only.
 */
const CollisionUtils = {

    /**
     * Check if position is on screen (with margin)
     * @param {Object} pos - Position with x, y properties
     * @param {number} margin - Extra margin around screen bounds
     * @returns {boolean} True if position is within screen bounds
     */
    isOnScreen(pos, margin = 100) {
        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return false;

        // Get camera position (player position is camera center)
        let camX = 0, camY = 0;
        if (typeof gameStateManager !== 'undefined' && gameStateManager.player) {
            camX = gameStateManager.player.pos.x;
            camY = gameStateManager.player.pos.y;
        }

        const halfW = (typeof width !== 'undefined' ? width : 1920) / 2 + margin;
        const halfH = (typeof height !== 'undefined' ? height : 1080) / 2 + margin;

        return Math.abs(pos.x - camX) < halfW && Math.abs(pos.y - camY) < halfH;
    },

    /**
     * Get world-space polygon for a ship entity
     * Caches transformed polygon and reuses if angle hasn't changed significantly
     * @param {Object} entity - Ship entity with pos, angle, size, shipDef
     * @returns {Array|null} Array of {x, y} vertices in world space, or null
     */
    getShipPolygon(entity) {
        if (!entity || !entity.pos || !entity.shipDef) return null;

        // Get hull from cache
        const hull = entity.shipDef._cache?.collisionHull;
        if (!hull || hull.length < 3) return null;

        const currentAngle = entity.angle || 0;

        // Check cache validity (reuse if angle changed less than ~1.2 degrees)
        // Handle angle wrapping (e.g., 6.28 to 0.01 is a small change)
        if (entity._collisionPoly &&
            entity._collisionPoly.length > 0) {
            let angleDiff = Math.abs(currentAngle - (entity._collisionPolyAngle || 0));
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff; // Handle wrap
            if (angleDiff < 0.02) {
                return entity._collisionPoly;
            }
        }

        // Transform to world space
        const cos = Math.cos(currentAngle);
        const sin = Math.sin(currentAngle);
        const scale = (entity.size || 30) / 2;
        const px = entity.pos.x;
        const py = entity.pos.y;

        // Validate position (NaN check to prevent silent failures)
        if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(scale)) {
            return null;
        }

        // Reuse or create array
        if (!entity._collisionPoly || entity._collisionPoly.length !== hull.length) {
            entity._collisionPoly = new Array(hull.length);
            for (let i = 0; i < hull.length; i++) {
                entity._collisionPoly[i] = { x: 0, y: 0 };
            }
        }

        for (let i = 0; i < hull.length; i++) {
            const v = hull[i];
            entity._collisionPoly[i].x = px + (v.x * cos - v.y * sin) * scale;
            entity._collisionPoly[i].y = py + (v.x * sin + v.y * cos) * scale;
        }

        entity._collisionPolyAngle = currentAngle;
        return entity._collisionPoly;
    },

    /**
     * Get world-space polygon for an asteroid
     * Asteroids store vertices in this.vertices as p5.Vector[]
     * @param {Object} asteroid - Asteroid with pos, angle, vertices
     * @returns {Array|null} Array of {x, y} vertices in world space, or null
     */
    getAsteroidPolygon(asteroid) {
        if (!asteroid || !asteroid.pos || !asteroid.vertices || asteroid.vertices.length < 3) {
            return null;
        }

        const currentAngle = asteroid.angle || 0;

        // Check cache validity (handle angle wrapping)
        if (asteroid._collisionPoly &&
            asteroid._collisionPoly.length > 0) {
            let angleDiff = Math.abs(currentAngle - (asteroid._collisionPolyAngle || 0));
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
            if (angleDiff < 0.02) {
                return asteroid._collisionPoly;
            }
        }

        // Transform vertices to world space
        const cos = Math.cos(currentAngle);
        const sin = Math.sin(currentAngle);
        const px = asteroid.pos.x;
        const py = asteroid.pos.y;
        const verts = asteroid.vertices;

        // Validate position (NaN check to prevent silent failures)
        if (!Number.isFinite(px) || !Number.isFinite(py)) {
            return null;
        }

        // Reuse or create array
        if (!asteroid._collisionPoly || asteroid._collisionPoly.length !== verts.length) {
            asteroid._collisionPoly = new Array(verts.length);
            for (let i = 0; i < verts.length; i++) {
                asteroid._collisionPoly[i] = { x: 0, y: 0 };
            }
        }

        for (let i = 0; i < verts.length; i++) {
            const v = verts[i];
            // p5.Vector uses .x and .y
            const vx = v.x || 0;
            const vy = v.y || 0;
            asteroid._collisionPoly[i].x = px + vx * cos - vy * sin;
            asteroid._collisionPoly[i].y = py + vx * sin + vy * cos;
        }

        asteroid._collisionPolyAngle = currentAngle;
        return asteroid._collisionPoly;
    },

    /**
     * SAT polygon-polygon collision test
     * @param {Array} polyA - First polygon as array of {x, y}
     * @param {Array} polyB - Second polygon as array of {x, y}
     * @returns {boolean} True if polygons overlap
     */
    polygonsCollide(polyA, polyB) {
        if (!polyA || !polyB || polyA.length < 3 || polyB.length < 3) {
            return false;
        }

        // Check all axes from both polygons
        // If any axis separates them, they don't collide
        return !this._hasSeparatingAxis(polyA, polyB) &&
            !this._hasSeparatingAxis(polyB, polyA);
    },

    /**
     * Check if any edge normal of polyA separates the two polygons
     * @private
     */
    _hasSeparatingAxis(polyA, polyB) {
        const lenA = polyA.length;

        for (let i = 0; i < lenA; i++) {
            const j = (i + 1) % lenA;

            // Edge normal (perpendicular to edge direction)
            const nx = polyA[j].y - polyA[i].y;
            const ny = polyA[i].x - polyA[j].x;

            // Skip degenerate edges (identical consecutive vertices)
            // These produce zero-length normals which cause invalid projections
            if (nx === 0 && ny === 0) continue;

            // Project both polygons onto this axis
            let minA = Infinity, maxA = -Infinity;
            let minB = Infinity, maxB = -Infinity;

            for (let k = 0; k < lenA; k++) {
                const proj = polyA[k].x * nx + polyA[k].y * ny;
                if (proj < minA) minA = proj;
                if (proj > maxA) maxA = proj;
            }

            const lenB = polyB.length;
            for (let k = 0; k < lenB; k++) {
                const proj = polyB[k].x * nx + polyB[k].y * ny;
                if (proj < minB) minB = proj;
                if (proj > maxB) maxB = proj;
            }

            // Check for gap between projections
            if (maxA < minB || maxB < minA) {
                return true; // Found separating axis - no collision
            }
        }

        return false; // No separating axis found on these edges
    },

    /**
     * Circle-polygon collision test
     * For projectiles hitting ships/asteroids
     * @param {number} cx - Circle center X
     * @param {number} cy - Circle center Y
     * @param {number} radius - Circle radius
     * @param {Array} polygon - Polygon as array of {x, y}
     * @returns {boolean} True if circle overlaps polygon
     */
    circlePolygonCollide(cx, cy, radius, polygon) {
        if (!polygon || polygon.length < 3) return false;

        // Check if circle center is inside polygon
        if (this._pointInPolygon(cx, cy, polygon)) {
            return true;
        }

        // Check if circle intersects any edge
        const radiusSq = radius * radius;
        const len = polygon.length;

        for (let i = 0; i < len; i++) {
            const j = (i + 1) % len;
            const distSq = this._pointToSegmentDistSq(
                cx, cy,
                polygon[i].x, polygon[i].y,
                polygon[j].x, polygon[j].y
            );
            if (distSq <= radiusSq) {
                return true;
            }
        }

        return false;
    },

    /**
     * Point in polygon test using ray casting algorithm
     * @private
     */
    _pointInPolygon(x, y, polygon) {
        let inside = false;
        const len = polygon.length;

        for (let i = 0, j = len - 1; i < len; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            // Skip horizontal edges (avoid division by zero)
            // Horizontal edges don't contribute to crossing count
            const dyEdge = yj - yi;
            if (Math.abs(dyEdge) < 0.0001) continue;

            if (((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / dyEdge + xi)) {
                inside = !inside;
            }
        }

        return inside;
    },

    /**
     * Squared distance from point to line segment
     * @private
     */
    _pointToSegmentDistSq(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;

        // Degenerate segment (single point)
        if (lenSq === 0) {
            const dpx = px - x1;
            const dpy = py - y1;
            return dpx * dpx + dpy * dpy;
        }

        // Project point onto line, clamp to segment
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        if (t < 0) t = 0;
        else if (t > 1) t = 1;

        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;

        const distX = px - closestX;
        const distY = py - closestY;

        return distX * distX + distY * distY;
    },

    /**
     * Line-polygon intersection test for beam weapons
     * @param {number} x1 - Line start X
     * @param {number} y1 - Line start Y
     * @param {number} x2 - Line end X
     * @param {number} y2 - Line end Y
     * @param {Array} polygon - Polygon as array of {x, y}
     * @returns {Object|null} Hit info {t, x, y} where t is 0-1 along line, or null if no hit
     */
    linePolygonIntersect(x1, y1, x2, y2, polygon) {
        if (!polygon || polygon.length < 3) return null;

        // FIRST: Check if line starts inside polygon (immediate hit)
        if (this._pointInPolygon(x1, y1, polygon)) {
            return { t: 0, x: x1, y: y1 };
        }

        const dx = x2 - x1;
        const dy = y2 - y1;

        // Handle zero-length line (start === end)
        // If we're here, point is not in polygon (checked above), so no hit
        if (dx === 0 && dy === 0) return null;

        let closestT = Infinity;
        let hitX = 0, hitY = 0;

        // Check intersection with each edge
        const len = polygon.length;
        for (let i = 0; i < len; i++) {
            const j = (i + 1) % len;
            const ex1 = polygon[i].x, ey1 = polygon[i].y;
            const ex2 = polygon[j].x, ey2 = polygon[j].y;

            const edx = ex2 - ex1;
            const edy = ey2 - ey1;

            // Cross product for parallel check
            const denom = dx * edy - dy * edx;
            if (Math.abs(denom) < 0.0001) continue; // Parallel

            const t1 = ((ex1 - x1) * edy - (ey1 - y1) * edx) / denom;
            const t2 = ((ex1 - x1) * dy - (ey1 - y1) * dx) / denom;

            // Check if intersection is within both segments
            if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
                if (t1 < closestT) {
                    closestT = t1;
                    hitX = x1 + t1 * dx;
                    hitY = y1 + t1 * dy;
                }
            }
        }

        // (Point-in-polygon check moved to top of function)

        if (closestT <= 1) {
            return { t: closestT, x: hitX, y: hitY };
        }

        return null;
    }
};

// Make globally available
if (typeof window !== 'undefined') {
    window.CollisionUtils = CollisionUtils;
}

console.log('collisionUtils.js loaded - polygon collision detection for on-screen entities');
