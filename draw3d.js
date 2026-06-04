// ****** draw3d.js ******
// Centralized Faux 3D Rendering System
// Provides optimized 3D-style drawing primitives for ships, cargo, asteroids, and space objects
// MUST be loaded BEFORE ships.js, cargo.js, spaceObjects.js, and asteroid.js

// ============================================================================
// SHADING LOOKUP TABLE - Pre-computed for performance
// ============================================================================
const SHADE_TABLE_SIZE = 360;
const SHADE_TABLE = new Float32Array(SHADE_TABLE_SIZE);
const SHADING_MIN = 0.35;
const SHADING_MAX = 1.15;
const SHADING_BASE = 0.42;
const SHADING_KEY_EXPONENT = 1.1;
const SHADING_KEY_INTENSITY = 0.5;
const SHADING_FILL_EXPONENT = 1.8;
const SHADING_FILL_INTENSITY = 0.06;
const SHADING_RIM_EXPONENT = 1.7;
const SHADING_RIM_INTENSITY = 0.28;
const SHIP_RIM_GLINT_THRESHOLD = 0.42;
const SHIP_RIM_GLINT_EXPONENT = 5.2;
const SHIP_RIM_GLINT_ALPHA = 110;
const SHIP_RIM_GLINT_STROKE = 0.7;
const SHIP_RIM_GLINT_OUTSET = 0.35;
for (let i = 0; i < SHADE_TABLE_SIZE; i++) {
    const angle = (i / SHADE_TABLE_SIZE) * Math.PI * 2;
    const ndl = Math.cos(angle);
    const key = Math.pow(Math.max(0, ndl), SHADING_KEY_EXPONENT) * SHADING_KEY_INTENSITY;
    const fill = Math.pow(Math.max(0, -ndl), SHADING_FILL_EXPONENT) * SHADING_FILL_INTENSITY;
    const rim = Math.pow(Math.max(0, 1 - Math.abs(ndl)), SHADING_RIM_EXPONENT) * SHADING_RIM_INTENSITY;
    SHADE_TABLE[i] = Math.max(SHADING_MIN, Math.min(SHADING_MAX, SHADING_BASE + key + fill + rim));
}

// Pre-computed scale factor for fast angle-to-index conversion
const SHADE_INDEX_SCALE = SHADE_TABLE_SIZE / (Math.PI * 2);

/**
 * Fast shading lookup using pre-computed table.
 * Optimized: avoids float modulo, uses integer floor + integer modulo.
 * @param {number} angleDiff - Angle difference in radians
 * @returns {number} Brightness multiplier (SHADING_MIN - SHADING_MAX, currently 0.35 - 1.15)
 */
function getShading(angleDiff) {
    const scaled = angleDiff * SHADE_INDEX_SCALE;
    // Fast floor-equivalent indexing: `| 0` truncates toward zero, so adjust negative fractions.
    let idx = scaled | 0;
    if (scaled < idx) idx -= 1;
    idx = idx % SHADE_TABLE_SIZE;
    if (idx < 0) idx += SHADE_TABLE_SIZE;
    return SHADE_TABLE[idx];
}

function drawShipRimGlint(layerCache, layerR, localSunAngle) {
    if (!layerCache?.edges || layerCache.edges.length === 0) return;
    const sunX = Math.cos(localSunAngle);
    const sunY = Math.sin(localSunAngle);

    push();
    blendMode(ADD);
    noFill();
    strokeCap(ROUND);

    for (let i = 0; i < layerCache.edges.length; i++) {
        const edge = layerCache.edges[i];
        const normal = getEdgeNormal(edge);
        const ndl = normal.x * sunX + normal.y * sunY;
        const rim = computeShipRimGlintStrength(ndl);
        if (rim < SHIP_RIM_GLINT_THRESHOLD) continue;

        const alpha = SHIP_RIM_GLINT_ALPHA * rim;
        const tint = 0.12 + rim * 0.18;
        const rr = Math.min(255, layerCache.fillRGB.r + (255 - layerCache.fillRGB.r) * tint);
        const rg = Math.min(255, layerCache.fillRGB.g + (255 - layerCache.fillRGB.g) * tint);
        const rb = Math.min(255, layerCache.fillRGB.b + (255 - layerCache.fillRGB.b) * tint);
        const ox = normal.x * SHIP_RIM_GLINT_OUTSET;
        const oy = normal.y * SHIP_RIM_GLINT_OUTSET;

        stroke(rr, rg, rb, alpha);
        strokeWeight(0.18 + rim * SHIP_RIM_GLINT_STROKE);
        line(
            edge.v1.x * layerR + ox, edge.v1.y * layerR + oy,
            edge.v2.x * layerR + ox, edge.v2.y * layerR + oy
        );
    }

    pop();
}

/**
 * Returns rim-light strength for an edge normal vs. sun direction dot product.
 * ndl is the normalized dot product of the edge's outward normal and the sun direction (-1 to 1).
 * Higher values are produced only for edges whose outward normal stays close to the sun direction.
 * @param {number} ndl
 * @returns {number}
 */
function computeShipRimGlintStrength(ndl) {
    return Math.pow(Math.max(0, ndl), SHIP_RIM_GLINT_EXPONENT);
}

function getEdgeFaceAngle(edge) {
    return getEdgeNormal(edge).angle;
}

function getEdgeNormal(edge) {
    // Cache the computed outward normal angle/vector on the edge so repeat draws avoid extra atan2/cos/sin work.
    // Math.atan2(-edge.dx, edge.dy) rotates the edge vector 90° to get the outward-facing normal.
    if (!edge.normal) {
        const angle = edge.faceAngle !== undefined ? edge.faceAngle : Math.atan2(-edge.dx, edge.dy);
        edge.faceAngle = angle;
        edge.normal = {
            angle,
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }
    return edge.normal;
}

// Cache for nearest sun position per system to avoid O(planets) scan every frame
const _sunPosCache = new WeakMap();

/**
 * Returns the angle from an entity toward the nearest sun in its current system.
 * Sun position is cached per system (WeakMap keyed by system object) to avoid O(planets) scan.
 * Falls back to world-origin sun direction when no explicit sun can be resolved.
 * @param {Object} entity
 * @returns {number}
 */
function getNearestSunAngleForEntity(entity) {
    const ex = entity?.pos?.x ?? 0;
    const ey = entity?.pos?.y ?? 0;
    const system = entity?.currentSystem;

    let sunPos;
    if (system) {
        sunPos = _sunPosCache.get(system);
        if (!sunPos) {
            // Cache miss: scan planets once per system
            const planets = system.planets;
            let bestDistSq = Infinity;
            if (Array.isArray(planets)) {
                for (let i = 0; i < planets.length; i++) {
                    const p = planets[i];
                    if (!p?.pos) continue;
                    const hasExplicitSunIndex = Number.isFinite(p.planetIndex) && p.planetIndex === 0;
                    if (!p.isSun && !hasExplicitSunIndex) continue;
                    // Use system center as reference for cache (not entity position)
                    const d2 = p.pos.x * p.pos.x + p.pos.y * p.pos.y;
                    if (d2 < bestDistSq) {
                        bestDistSq = d2;
                        sunPos = p.pos;
                    }
                }
            }
            if (!sunPos) sunPos = { x: 0, y: 0 };
            _sunPosCache.set(system, sunPos);
        }
    } else {
        sunPos = { x: 0, y: 0 };
    }

    return Math.atan2(sunPos.y - ey, sunPos.x - ex);
}

// ============================================================================
// DRAW3D OBJECT - Centralized 3D rendering helpers
// ============================================================================

// Pre-computed trig tables for common polygon sides (4-16 sides)
// Each cache entry: { cos, sin, faceNX, faceNY, faceAngle } — all Float32Array(sides)
const _trigCache = {};
function getTrigCache(sides) {
    if (!_trigCache[sides]) {
        const angleStep = (Math.PI * 2) / sides;
        const cache = {
            cos: new Float32Array(sides),
            sin: new Float32Array(sides),
            faceNX: new Float32Array(sides),
            faceNY: new Float32Array(sides),
            faceAngle: new Float32Array(sides)
        };
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep - Math.PI / 2;
            cache.cos[i] = Math.cos(ang);
            cache.sin[i] = Math.sin(ang);
            // Face normal at midpoint between vertex i and i+1
            const fa = (i + 0.5) * angleStep - Math.PI / 2;
            cache.faceNX[i] = Math.cos(fa);
            cache.faceNY[i] = Math.sin(fa);
            cache.faceAngle[i] = fa;
        }
        _trigCache[sides] = cache;
    }
    return _trigCache[sides];
}

// Static pre-computed box face data: normals and edge endpoints (relative to center)
const _BOX_FACE = [
    { nx:  0, ny: -1, angle: -Math.PI / 2, x1: -0.5, y1: -0.5, x2:  0.5, y2: -0.5 }, // top
    { nx:  1, ny:  0, angle:  0,            x1:  0.5, y1: -0.5, x2:  0.5, y2:  0.5 }, // right
    { nx:  0, ny:  1, angle:  Math.PI / 2,  x1:  0.5, y1:  0.5, x2: -0.5, y2:  0.5 }, // bottom
    { nx: -1, ny:  0, angle:  Math.PI,       x1: -0.5, y1:  0.5, x2: -0.5, y2: -0.5 }  // left
];
const _colorCache = new WeakMap();
function getColorComponents(col) {
    if (_colorCache.has(col)) return _colorCache.get(col);
    const components = {
        r: red(col),
        g: green(col),
        b: blue(col),
        a: alpha(col)
    };
    _colorCache.set(col, components);
    return components;
}

const Draw3D = {

    /**
     * Calculate extrusion depth vector from angle
     * @param {number} depth - Extrusion depth
     * @param {number} angle - Extrusion angle in radians
     * @returns {{x: number, y: number}} Depth vector
     */
    getDepthVector: function (depth, angle) {
        return {
            x: depth * Math.sin(angle),
            y: depth * Math.cos(angle)
        };
    },


    /**
     * Draw an extruded regular prism (polygon with depth)
     * @param {boolean} skipBottom - If true, skip drawing bottom cap (optimization for fixed-view surface mode)
     */
    drawPrism: function (x, y, r, sides, depth, col, angle, sunAngle, skipBottom = false) {
        const dv = this.getDepthVector(depth, angle);
        const trig = getTrigCache(sides);
        const cc = getColorComponents(col);

        strokeWeight(1);

        // Draw Bottom Cap (skipped in fixed-view surface mode - never visible)
        if (!skipBottom) {
            fill(cc.r * 0.5, cc.g * 0.5, cc.b * 0.5, cc.a);
            stroke(cc.r * 0.4, cc.g * 0.4, cc.b * 0.4, cc.a);
            beginShape();
            for (let i = 0; i < sides; i++) {
                vertex(x + trig.cos[i] * r + dv.x, y + trig.sin[i] * r + dv.y);
            }
            endShape(CLOSE);
        }

        // Draw sides with backface culling — use pre-computed face normals & angles from trig cache
        const dvx = dv.x, dvy = dv.y;
        for (let i = 0; i < sides; i++) {
            // Backface cull: dot(faceNormal, depthVector) > 0 means facing camera
            if (trig.faceNX[i] * dvx + trig.faceNY[i] * dvy > 0.001) {
                const next = (i + 1) % sides;
                const vx = x + trig.cos[i] * r;
                const vy = y + trig.sin[i] * r;
                const nvx = x + trig.cos[next] * r;
                const nvy = y + trig.sin[next] * r;

                const b = getShading(trig.faceAngle[i] - sunAngle);

                fill(cc.r * b, cc.g * b, cc.b * b, cc.a);
                stroke(cc.r * b * 0.8, cc.g * b * 0.8, cc.b * b * 0.8, cc.a);

                beginShape();
                vertex(vx + dvx, vy + dvy);
                vertex(nvx + dvx, nvy + dvy);
                vertex(nvx, nvy);
                vertex(vx, vy);
                endShape(CLOSE);
            }
        }

        // Draw Top Cap
        fill(col);
        stroke(cc.r * 0.8, cc.g * 0.8, cc.b * 0.8, cc.a);
        beginShape();
        for (let i = 0; i < sides; i++) {
            vertex(x + trig.cos[i] * r, y + trig.sin[i] * r);
        }
        endShape(CLOSE);
    },

    /**
     * Draw a 3D extruded box
     * @param {boolean} skipBottom - If true, skip drawing bottom cap (optimization for fixed-view surface mode)
     */
    drawBox3D: function (x, y, w, h, depth, col, angle, sunAngle, skipBottom = false) {
        const dv = this.getDepthVector(depth, angle);
        const cc = getColorComponents(col);
        const hw = w / 2, hh = h / 2;
        const dvx = dv.x, dvy = dv.y;

        strokeWeight(1);

        // Bottom Cap (skipped in fixed-view surface mode - never visible)
        if (!skipBottom) {
            fill(cc.r * 0.5, cc.g * 0.5, cc.b * 0.5, cc.a);
            stroke(cc.r * 0.4, cc.g * 0.4, cc.b * 0.4, cc.a);
            beginShape();
            vertex(x - hw + dvx, y - hh + dvy);
            vertex(x + hw + dvx, y - hh + dvy);
            vertex(x + hw + dvx, y + hh + dvy);
            vertex(x - hw + dvx, y + hh + dvy);
            endShape(CLOSE);
        }

        // Sides with backface culling — unrolled 4 faces with pre-computed normals
        for (let i = 0; i < 4; i++) {
            const f = _BOX_FACE[i];
            if (f.nx * dvx + f.ny * dvy > 0.001) {
                const b = getShading(f.angle - sunAngle);

                fill(cc.r * b, cc.g * b, cc.b * b, cc.a);
                stroke(cc.r * b * 0.8, cc.g * b * 0.8, cc.b * b * 0.8, cc.a);

                const x1 = x + f.x1 * w, y1 = y + f.y1 * h;
                const x2 = x + f.x2 * w, y2 = y + f.y2 * h;

                beginShape();
                vertex(x1 + dvx, y1 + dvy);
                vertex(x2 + dvx, y2 + dvy);
                vertex(x2, y2);
                vertex(x1, y1);
                endShape(CLOSE);
            }
        }

        // Top
        fill(col);
        stroke(cc.r * 0.8, cc.g * 0.8, cc.b * 0.8, cc.a);
        rectMode(CENTER);
        rect(x, y, w, h);
    },

    /**
     * Draw an extruded arbitrary shape from vertices
     */
    drawExtrudedShape: function (vertices, depth, col, angle, sunAngle, cull = true) {
        const dv = this.getDepthVector(depth, angle);
        const cc = getColorComponents(col);

        strokeWeight(1);
        const len = vertices.length;

        // Bottom Cap
        fill(cc.r * 0.5, cc.g * 0.5, cc.b * 0.5, cc.a);
        stroke(cc.r * 0.4, cc.g * 0.4, cc.b * 0.4, cc.a);
        beginShape();
        for (let i = 0; i < len; i++) {
            vertex(vertices[i].x + dv.x, vertices[i].y + dv.y);
        }
        endShape(CLOSE);

        // Sides
        const dvx = dv.x, dvy = dv.y;
        for (let i = 0; i < len; i++) {
            const next = (i + 1) % len;
            const v1 = vertices[i];
            const v2 = vertices[next];

            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            const faceAngle = Math.atan2(-dx, dy);

            const nx = Math.cos(faceAngle);
            const ny = Math.sin(faceAngle);
            const dot = nx * dvx + ny * dvy;

            if (!cull || dot > 0.001) {
                const b = getShading(faceAngle - sunAngle);

                fill(cc.r * b, cc.g * b, cc.b * b, cc.a);
                stroke(cc.r * b * 0.8, cc.g * b * 0.8, cc.b * b * 0.8, cc.a);

                beginShape();
                vertex(v1.x + dvx, v1.y + dvy);
                vertex(v2.x + dvx, v2.y + dvy);
                vertex(v2.x, v2.y);
                vertex(v1.x, v1.y);
                endShape(CLOSE);
            }
        }

        // Top
        fill(col);
        stroke(cc.r * 0.8, cc.g * 0.8, cc.b * 0.8, cc.a);
        beginShape();
        for (let i = 0; i < len; i++) {
            vertex(vertices[i].x, vertices[i].y);
        }
        endShape(CLOSE);
    },

    /**
     * Draw a 3D ring (torus cross-section)
     */
    drawRing3D: function (x, y, rOuter, rInner, sides, depth, col, angle, sunAngle, shapeRotation = 0) {
        const dv = this.getDepthVector(depth, angle);
        const cc = getColorComponents(col);
        const angleStep = TWO_PI / sides;

        strokeWeight(1);

        // Bottom cap with contour for hole
        const hasContour = typeof beginContour === 'function' && typeof endContour === 'function';

        fill(cc.r * 0.5, cc.g * 0.5, cc.b * 0.5, cc.a);
        stroke(cc.r * 0.4, cc.g * 0.4, cc.b * 0.4, cc.a);

        if (hasContour) {
            try {
                beginShape();
                for (let i = 0; i < sides; i++) {
                    const ang = i * angleStep + shapeRotation;
                    vertex(x + Math.cos(ang) * rOuter + dv.x, y + Math.sin(ang) * rOuter + dv.y);
                }
                beginContour();
                for (let i = sides - 1; i >= 0; i--) {
                    const ang = i * angleStep + shapeRotation;
                    vertex(x + Math.cos(ang) * rInner + dv.x, y + Math.sin(ang) * rInner + dv.y);
                }
                endContour();
                endShape(CLOSE);
            } catch (e) {
                this._drawRingFallback(x, y, rOuter, rInner, sides, dv, col, shapeRotation, 'bottom');
            }
        } else {
            this._drawRingFallback(x, y, rOuter, rInner, sides, dv, col, shapeRotation, 'bottom');
        }

        // Draw outer and inner faces
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep + shapeRotation;
            const nextAng = (i + 1) * angleStep + shapeRotation;

            const c = Math.cos(ang), s = Math.sin(ang);
            const nc = Math.cos(nextAng), ns = Math.sin(nextAng);

            const ox1 = x + c * rOuter, oy1 = y + s * rOuter;
            const ox2 = x + nc * rOuter, oy2 = y + ns * rOuter;
            const ix1 = x + c * rInner, iy1 = y + s * rInner;
            const ix2 = x + nc * rInner, iy2 = y + ns * rInner;

            // Outer face
            const faceAngle = (i + 0.5) * angleStep + shapeRotation;
            const nx = Math.cos(faceAngle), ny = Math.sin(faceAngle);
            const dot = nx * dv.x + ny * dv.y;

            if (dot > 0.001) {
                const b = getShading(faceAngle - sunAngle);
                fill(cc.r * b, cc.g * b, cc.b * b, cc.a);
                stroke(cc.r * b * 0.8, cc.g * b * 0.8, cc.b * b * 0.8, cc.a);
                beginShape();
                vertex(ox1 + dv.x, oy1 + dv.y);
                vertex(ox2 + dv.x, oy2 + dv.y);
                vertex(ox2, oy2);
                vertex(ox1, oy1);
                endShape(CLOSE);
            }

            // Inner face
            const innerFaceAngle = faceAngle + PI;
            const nxIn = Math.cos(innerFaceAngle), nyIn = Math.sin(innerFaceAngle);
            const dotIn = nxIn * dv.x + nyIn * dv.y;

            if (dotIn > 0.001) {
                const bIn = getShading(innerFaceAngle - sunAngle);
                fill(cc.r * bIn, cc.g * bIn, cc.b * bIn, cc.a);
                stroke(cc.r * bIn * 0.8, cc.g * bIn * 0.8, cc.b * bIn * 0.8, cc.a);
                beginShape();
                vertex(ix1 + dv.x, iy1 + dv.y);
                vertex(ix2 + dv.x, iy2 + dv.y);
                vertex(ix2, iy2);
                vertex(ix1, iy1);
                endShape(CLOSE);
            }
        }

        // Top cap
        fill(col);
        stroke(cc.r * 0.8, cc.g * 0.8, cc.b * 0.8, cc.a);
        if (hasContour) {
            try {
                beginShape();
                for (let i = 0; i < sides; i++) {
                    const ang = i * angleStep;
                    vertex(x + Math.cos(ang) * rOuter, y + Math.sin(ang) * rOuter);
                }
                beginContour();
                for (let i = sides - 1; i >= 0; i--) {
                    const ang = i * angleStep;
                    vertex(x + Math.cos(ang) * rInner, y + Math.sin(ang) * rInner);
                }
                endContour();
                endShape(CLOSE);
            } catch (e) {
                this._drawRingFallback(x, y, rOuter, rInner, sides, { x: 0, y: 0 }, col, 0, 'top');
            }
        } else {
            this._drawRingFallback(x, y, rOuter, rInner, sides, { x: 0, y: 0 }, col, 0, 'top');
        }
    },

    // Fallback for rings when contours aren't supported
    _drawRingFallback: function (x, y, rOuter, rInner, sides, dv, col, shapeRotation, stage) {
        const cc = getColorComponents(col);
        const angleStep = TWO_PI / sides;
        const ox = dv.x, oy = dv.y;

        beginShape();
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep + shapeRotation;
            vertex(x + Math.cos(ang) * rOuter + ox, y + Math.sin(ang) * rOuter + oy);
        }
        endShape(CLOSE);

        noStroke();
        fill(0, 0, 0, 220);
        beginShape();
        for (let i = sides - 1; i >= 0; i--) {
            const ang = i * angleStep + shapeRotation;
            vertex(x + Math.cos(ang) * rInner + ox, y + Math.sin(ang) * rInner + oy);
        }
        endShape(CLOSE);
        stroke(cc.r * 0.8, cc.g * 0.8, cc.b * 0.8, cc.a);
    },

    /**
     * Draw a hemisphere/dome (half sphere) with angle-based extrusion
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Dome radius
     * @param {number} segments - Number of segments (quality)
     * @param {color} col - Base color
     * @param {number} angle - Extrusion angle (direction the dome rises toward)
     * @param {number} sunAngle - Sun angle for shading
     * @param {boolean} inverted - If true, dome is concave (dish) instead of convex
     */
    drawDome: function (x, y, radius, segments, col, angle, sunAngle, inverted = false) {
        // Use depth vector for angle-based extrusion (dome height direction)
        const domeHeight = radius * 0.6; // Height of the dome
        const dv = this.getDepthVector(domeHeight, angle);
        const depthDir = inverted ? -1 : 1; // Inverted = dish (concave, against depth), normal = dome (convex, into depth)

        const cc = getColorComponents(col);
        const heightSegments = Math.max(3, Math.floor(segments / 2));
        const radialSegments = Math.max(6, segments);
        const angleStep = TWO_PI / radialSegments;
        const heightStep = (PI / 2) / heightSegments;

        strokeWeight(0.5);

        // Draw base/rim circle at specified position (top of dome, no offset)
        // For inverted dome, this is the outer rim; for normal dome, this is the base
        fill(cc.r * 0.5, cc.g * 0.5, cc.b * 0.5, cc.a);
        stroke(cc.r * 0.4, cc.g * 0.4, cc.b * 0.4, cc.a);
        beginShape();
        for (let i = 0; i < radialSegments; i++) {
            const theta = i * angleStep;
            // Rim stays at (x, y) - no dv offset for rim
            vertex(x + Math.cos(theta) * radius, y + Math.sin(theta) * radius);
        }
        endShape(CLOSE);

        // Draw dome segments from rim toward center/tip
        for (let h = 0; h < heightSegments; h++) {
            const phi1 = h * heightStep;
            const phi2 = (h + 1) * heightStep;
            const r1 = Math.cos(phi1) * radius;
            const r2 = Math.cos(phi2) * radius;
            // Height offset: starts at 0 (rim) and increases toward tip
            const t1 = Math.sin(phi1); // 0 to 1
            const t2 = Math.sin(phi2);
            // For inverted (dish): project INTO depth; for normal (dome): project AGAINST depth
            const h1x = dv.x * t1 * depthDir;
            const h1y = dv.y * t1 * depthDir;
            const h2x = dv.x * t2 * depthDir;
            const h2y = dv.y * t2 * depthDir;

            // Draw ring of faces at this height
            for (let rIdx = 0; rIdx < radialSegments; rIdx++) {
                const theta1 = rIdx * angleStep;
                const theta2 = (rIdx + 1) * angleStep;

                // Outer ring vertices (closer to rim)
                const x1 = x + Math.cos(theta1) * r1 + h1x;
                const y1 = y + Math.sin(theta1) * r1 + h1y;
                const x2 = x + Math.cos(theta2) * r1 + h1x;
                const y2 = y + Math.sin(theta2) * r1 + h1y;

                // Inner ring vertices (closer to center/tip)
                const x3 = x + Math.cos(theta2) * r2 + h2x;
                const y3 = y + Math.sin(theta2) * r2 + h2y;
                const x4 = x + Math.cos(theta1) * r2 + h2x;
                const y4 = y + Math.sin(theta1) * r2 + h2y;

                // Face normal for lighting (approximate)
                const avgTheta = (theta1 + theta2) / 2;
                const avgPhi = (phi1 + phi2) / 2;
                // Mix radial shading with height-based brightness
                const radialShade = getShading(avgTheta - sunAngle);
                const heightShade = 0.7 + Math.sin(avgPhi) * 0.3;
                const b = radialShade * heightShade;

                fill(cc.r * b, cc.g * b, cc.b * b, cc.a);
                stroke(cc.r * b * 0.7, cc.g * b * 0.7, cc.b * b * 0.7, cc.a);

                // Draw quad face (or triangle at tip)
                beginShape();
                vertex(x1, y1);
                vertex(x2, y2);
                if (h < heightSegments - 1) {
                    vertex(x3, y3);
                    vertex(x4, y4);
                } else {
                    // Tip/center - single point at full depth
                    const tipX = x + dv.x * depthDir;
                    const tipY = y + dv.y * depthDir;
                    vertex(tipX, tipY);
                }
                endShape(CLOSE);
            }
        }
    },

    /**
     * Draw a 3D cylinder (like prism but with smooth circular cross-section)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Cylinder radius
     * @param {number} height - Cylinder height
     * @param {number} segments - Number of segments around circumference
     * @param {color} col - Base color
     * @param {number} angle - Rotation angle
     * @param {number} sunAngle - Sun angle for shading
     */
    drawCylinder: function (x, y, radius, height, segments, col, angle, sunAngle) {
        // This is essentially a prism with many sides, but optimized
        this.drawPrism(x, y, radius, Math.max(8, segments), height, col, angle, sunAngle);
    },

    /**
     * Draw a 3D cone/pyramid
     * @param {number} x - Base center X
     * @param {number} y - Base center Y
     * @param {number} baseRadius - Base radius
     * @param {number} height - Cone height
     * @param {number} segments - Number of segments
     * @param {color} col - Base color
     * @param {number} angle - Extrusion angle
     * @param {number} sunAngle - Sun angle for shading
     */
    drawCone: function (x, y, baseRadius, height, segments, col, angle, sunAngle) {
        const dv = this.getDepthVector(height, angle);
        const cc = getColorComponents(col);
        const angleStep = TWO_PI / segments;

        // Base at (x, y), tip projects along depth vector (consistent with prism/box)
        const tipX = x + dv.x;
        const tipY = y + dv.y;

        strokeWeight(1);

        // Draw base at (x, y) - top face, no offset
        fill(col);
        stroke(cc.r * 0.8, cc.g * 0.8, cc.b * 0.8, cc.a);
        beginShape();
        for (let i = 0; i < segments; i++) {
            const ang = i * angleStep - PI / 2;
            vertex(x + Math.cos(ang) * baseRadius, y + Math.sin(ang) * baseRadius);
        }
        endShape(CLOSE);

        // Draw sides with backface culling
        for (let i = 0; i < segments; i++) {
            const ang = i * angleStep - PI / 2;
            const nextAng = ((i + 1) % segments) * angleStep - PI / 2;
            const faceAngle = (i + 0.5) * angleStep - PI / 2;

            const nx = Math.cos(faceAngle);
            const ny = Math.sin(faceAngle);
            const dot = nx * dv.x + ny * dv.y;

            if (dot > 0.001) {
                const baseX1 = x + Math.cos(ang) * baseRadius;
                const baseY1 = y + Math.sin(ang) * baseRadius;
                const baseX2 = x + Math.cos(nextAng) * baseRadius;
                const baseY2 = y + Math.sin(nextAng) * baseRadius;

                const b = getShading(faceAngle - sunAngle) * 0.9;

                fill(cc.r * b, cc.g * b, cc.b * b, cc.a);
                stroke(cc.r * b * 0.8, cc.g * b * 0.8, cc.b * b * 0.8, cc.a);

                // Triangle face from base edge to tip
                beginShape();
                vertex(baseX1, baseY1);
                vertex(baseX2, baseY2);
                vertex(tipX, tipY);
                endShape(CLOSE);
            }
        }
    },

    /**
     * Draw a helix/spiral structure
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Helix radius
     * @param {number} height - Total height
     * @param {number} turns - Number of complete turns
     * @param {number} segments - Number of segments per turn
     * @param {number} thickness - Helix strand thickness
     * @param {color} col - Base color
     * @param {number} angle - Rotation angle
     * @param {number} sunAngle - Sun angle for shading
     */
    drawHelix: function (x, y, radius, height, turns, segments, thickness, col, angle, sunAngle) {
        const cc = getColorComponents(col);
        const totalSegments = Math.floor(segments * turns);
        const heightStep = height / totalSegments;
        const angleStep = (TWO_PI * turns) / totalSegments;

        strokeWeight(0.5);

        // Draw helix as connected segments
        for (let i = 0; i < totalSegments; i++) {
            const t = i / totalSegments;
            const nextT = (i + 1) / totalSegments;

            const theta = i * angleStep;
            const nextTheta = (i + 1) * angleStep;

            const hx1 = x + Math.cos(theta) * radius;
            const hy1 = y - height * 0.5 + i * heightStep;
            const hx2 = x + Math.cos(nextTheta) * radius;
            const hy2 = y - height * 0.5 + (i + 1) * heightStep;

            const faceAngle = theta;
            const b = getShading(faceAngle - sunAngle);

            fill(cc.r * b, cc.g * b, cc.b * b, cc.a);
            stroke(cc.r * b * 0.8, cc.g * b * 0.8, cc.b * b * 0.8, cc.a);

            // Draw segment as small box
            this.drawBox3D(hx1, hy1, thickness, thickness, thickness * 0.5, col, angle, sunAngle);
        }
    },

    /**
     * Draw a lattice/grid panel structure
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} width - Panel width
     * @param {number} height - Panel height
     * @param {number} gridX - Number of grid divisions X
     * @param {number} gridY - Number of grid divisions Y
     * @param {number} beamThickness - Thickness of grid beams
     * @param {color} col - Base color
     * @param {number} angle - Rotation angle
     * @param {number} sunAngle - Sun angle for shading
     */
    drawLattice: function (x, y, width, height, gridX, gridY, beamThickness, col, angle, sunAngle) {
        const stepX = width / gridX;
        const stepY = height / gridY;
        const halfW = width / 2;
        const halfH = height / 2;

        // Draw vertical beams
        for (let i = 0; i <= gridX; i++) {
            const bx = x - halfW + i * stepX;
            this.drawBox3D(bx, y, beamThickness, height, beamThickness, col, angle, sunAngle);
        }

        // Draw horizontal beams
        for (let j = 0; j <= gridY; j++) {
            const by = y - halfH + j * stepY;
            this.drawBox3D(x, by, width, beamThickness, beamThickness, col, angle, sunAngle);
        }
    },

    /**
     * Draw a thin antenna/rod with optional tip
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} thickness - Rod thickness
     * @param {color} col - Base color
     * @param {number} angle - Rotation angle
     * @param {number} sunAngle - Sun angle for shading
     * @param {boolean} withTip - Add a small sphere tip
     */
    drawRod: function (x1, y1, x2, y2, thickness, col, angle, sunAngle, withTip = false) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        push();
        translate(midX, midY);
        rotate(Math.atan2(dy, dx));
        this.drawBox3D(0, 0, len, thickness, thickness, col, angle, sunAngle);
        pop();

        if (withTip) {
            // Draw small sphere at tip
            const cc = getColorComponents(col);
            fill(cc.r * 1.2, cc.g * 1.2, cc.b * 1.2, cc.a);
            stroke(cc.r, cc.g, cc.b, cc.a);
            ellipse(x2, y2, thickness * 2, thickness * 1.5);
        }
    },

    /**
     * Draw a geodesic dome (faceted hemisphere)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Dome radius
     * @param {number} subdivisions - Detail level (1-3)
     * @param {color} col - Base color
     * @param {number} angle - Rotation angle
     * @param {number} sunAngle - Sun angle for shading
     */
    drawGeodesicDome: function (x, y, radius, subdivisions, col, angle, sunAngle) {
        const cc = getColorComponents(col);
        const segments = Math.max(6, 6 * (subdivisions + 1));
        const rings = Math.max(3, 3 * (subdivisions + 1));
        const angleStep = TWO_PI / segments;
        const heightStep = 1 / rings;

        strokeWeight(0.8);

        // Draw faceted dome
        for (let r = 0; r < rings; r++) {
            const t1 = r * heightStep;
            const t2 = (r + 1) * heightStep;
            const phi1 = t1 * (PI / 2);
            const phi2 = t2 * (PI / 2);

            const r1 = Math.cos(phi1) * radius;
            const r2 = Math.cos(phi2) * radius;
            const h1 = -Math.sin(phi1) * radius;
            const h2 = -Math.sin(phi2) * radius;

            for (let i = 0; i < segments; i++) {
                const theta1 = i * angleStep;
                const theta2 = (i + 1) * angleStep;

                // Calculate face center for lighting
                const faceAngle = (theta1 + theta2) / 2;
                // Use deterministic pseudo-random based on face position (avoids per-frame flicker)
                const facetVariation = 0.85 + ((i * 7 + r * 13) % 100) / 100 * 0.3;
                const b = getShading(faceAngle - sunAngle) * facetVariation;

                fill(cc.r * b, cc.g * b, cc.b * b, cc.a);
                stroke(cc.r * 0.3, cc.g * 0.3, cc.b * 0.3, cc.a * 0.8);

                // Draw facet
                beginShape();
                vertex(x + Math.cos(theta1) * r1, y + h1);
                vertex(x + Math.cos(theta2) * r1, y + h1);
                if (r < rings - 1) {
                    vertex(x + Math.cos(theta2) * r2, y + h2);
                    vertex(x + Math.cos(theta1) * r2, y + h2);
                } else {
                    vertex(x, y + h2);
                }
                endShape(CLOSE);
            }
        }
    },

    /**
     * Draw a 3D torus (donut shape)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} majorRadius - Distance from center to tube center
     * @param {number} minorRadius - Tube radius
     * @param {number} segments - Number of segments around major circle
     * @param {number} tubeSegments - Number of segments around tube
     * @param {color} col - Base color
     * @param {number} angle - Rotation angle
     * @param {number} sunAngle - Sun angle for shading
     */
    drawTorus: function (x, y, majorRadius, minorRadius, segments, tubeSegments, col, angle, sunAngle) {
        const cc = getColorComponents(col);
        const majorStep = TWO_PI / segments;
        const minorStep = TWO_PI / tubeSegments;

        strokeWeight(0.5);

        // Draw torus segments
        for (let i = 0; i < segments; i++) {
            const theta1 = i * majorStep;
            const theta2 = (i + 1) * majorStep;

            const cx1 = Math.cos(theta1) * majorRadius;
            const cy1 = Math.sin(theta1) * majorRadius;
            const cx2 = Math.cos(theta2) * majorRadius;
            const cy2 = Math.sin(theta2) * majorRadius;

            for (let j = 0; j < tubeSegments; j++) {
                const phi1 = j * minorStep;
                const phi2 = (j + 1) * minorStep;

                const cos1 = Math.cos(phi1) * minorRadius;
                const sin1 = Math.sin(phi1) * minorRadius;
                const cos2 = Math.cos(phi2) * minorRadius;
                const sin2 = Math.sin(phi2) * minorRadius;

                // Calculate vertices
                // For each point, we need to:
                // 1. Position on major circle: (cx, cy)
                // 2. Add tube offset rotated around the major circle
                const vx1 = x + (majorRadius + cos1) * Math.cos(theta1);
                const vy1 = y + (majorRadius + cos1) * Math.sin(theta1) + sin1;
                const vx2 = x + (majorRadius + cos1) * Math.cos(theta2);
                const vy2 = y + (majorRadius + cos1) * Math.sin(theta2) + sin1;
                const vx3 = x + (majorRadius + cos2) * Math.cos(theta2);
                const vy3 = y + (majorRadius + cos2) * Math.sin(theta2) + sin2;
                const vx4 = x + (majorRadius + cos2) * Math.cos(theta1);
                const vy4 = y + (majorRadius + cos2) * Math.sin(theta1) + sin2;

                // Backface culling: only draw faces visible from above
                // Calculate face normal using cross product of two edges
                const edge1x = vx2 - vx1;
                const edge1y = vy2 - vy1;
                const edge2x = vx4 - vx1;
                const edge2y = vy4 - vy1;

                // Cross product z-component (normal pointing up or down)
                const normalZ = edge1x * edge2y - edge1y * edge2x;

                // Only draw if face is pointing towards viewer (positive z)
                if (normalZ > 0) {
                    // Calculate lighting
                    const faceAngle = theta1;
                    const b = getShading(faceAngle - sunAngle) * (0.6 + Math.sin(phi1) * 0.4);

                    fill(cc.r * b, cc.g * b, cc.b * b, cc.a);
                    stroke(cc.r * b * 0.7, cc.g * b * 0.7, cc.b * b * 0.7, cc.a);

                    // Draw quad
                    beginShape();
                    vertex(vx1, vy1);
                    vertex(vx2, vy2);
                    vertex(vx3, vy3);
                    vertex(vx4, vy4);
                    endShape(CLOSE);
                }
            }
        }
    },

    /**
     * Draw extruded ring from vertex arrays
     */
    drawExtrudedRing: function (outerVerts, innerVerts, depth, col, angle, sunAngle) {
        const dv = this.getDepthVector(depth, angle);
        const cc = getColorComponents(col);
        strokeWeight(1);
        const len = outerVerts.length;

        // Bottom cap
        fill(cc.r * 0.5, cc.g * 0.5, cc.b * 0.5);
        stroke(cc.r * 0.4, cc.g * 0.4, cc.b * 0.4);

        const hasContour = typeof beginContour === 'function' && typeof endContour === 'function';
        if (hasContour) {
            try {
                beginShape();
                for (let v of outerVerts) vertex(v.x + dv.x, v.y + dv.y);
                beginContour();
                for (let i = len - 1; i >= 0; i--) vertex(innerVerts[i].x + dv.x, innerVerts[i].y + dv.y);
                endContour();
                endShape(CLOSE);
            } catch (e) {
                beginShape();
                for (let v of outerVerts) vertex(v.x + dv.x, v.y + dv.y);
                endShape(CLOSE);
                noStroke(); fill(0, 0, 0, 220);
                beginShape();
                for (let i = len - 1; i >= 0; i--) vertex(innerVerts[i].x + dv.x, innerVerts[i].y + dv.y);
                endShape(CLOSE);
                stroke(cc.r * 0.4, cc.g * 0.4, cc.b * 0.4);
            }
        } else {
            beginShape();
            for (let v of outerVerts) vertex(v.x + dv.x, v.y + dv.y);
            endShape(CLOSE);
            noStroke(); fill(0, 0, 0, 220);
            beginShape();
            for (let i = len - 1; i >= 0; i--) vertex(innerVerts[i].x + dv.x, innerVerts[i].y + dv.y);
            endShape(CLOSE);
            stroke(cc.r * 0.4, cc.g * 0.4, cc.b * 0.4);
        }

        // Sides
        for (let i = 0; i < len; i++) {
            const next = (i + 1) % len;

            // Outer face
            const v1 = outerVerts[i], v2 = outerVerts[next];
            const dx = v2.x - v1.x, dy = v2.y - v1.y;
            const faceAngle = Math.atan2(dx, -dy);
            const nx = Math.cos(faceAngle), ny = Math.sin(faceAngle);
            const dot = nx * dv.x + ny * dv.y;

            if (dot > 0.001) {
                const b = getShading(faceAngle - sunAngle);
                fill(cc.r * b, cc.g * b, cc.b * b);
                stroke(cc.r * b * 0.8, cc.g * b * 0.8, cc.b * b * 0.8);
                beginShape();
                vertex(v1.x + dv.x, v1.y + dv.y);
                vertex(v2.x + dv.x, v2.y + dv.y);
                vertex(v2.x, v2.y);
                vertex(v1.x, v1.y);
                endShape(CLOSE);
            }

            // Inner face
            const iv1 = innerVerts[i], iv2 = innerVerts[next];
            const idx = iv2.x - iv1.x, idy = iv2.y - iv1.y;
            const innerFaceAngle = Math.atan2(idx, -idy) + PI;
            const inx = Math.cos(innerFaceAngle), iny = Math.sin(innerFaceAngle);
            const idot = inx * dv.x + iny * dv.y;

            if (idot > 0.001) {
                const b = getShading(innerFaceAngle - sunAngle);
                fill(cc.r * b, cc.g * b, cc.b * b);
                stroke(cc.r * b * 0.8, cc.g * b * 0.8, cc.b * b * 0.8);
                beginShape();
                vertex(iv1.x + dv.x, iv1.y + dv.y);
                vertex(iv2.x + dv.x, iv2.y + dv.y);
                vertex(iv2.x, iv2.y);
                vertex(iv1.x, iv1.y);
                endShape(CLOSE);
            }
        }

        // Top cap
        fill(col);
        stroke(cc.r * 0.8, cc.g * 0.8, cc.b * 0.8);
        if (hasContour) {
            try {
                beginShape();
                for (let v of outerVerts) vertex(v.x, v.y);
                beginContour();
                for (let i = len - 1; i >= 0; i--) vertex(innerVerts[i].x, innerVerts[i].y);
                endContour();
                endShape(CLOSE);
            } catch (e) {
                beginShape();
                for (let v of outerVerts) vertex(v.x, v.y);
                endShape(CLOSE);
                noStroke(); fill(0, 0, 0, 220);
                beginShape();
                for (let i = len - 1; i >= 0; i--) vertex(innerVerts[i].x, innerVerts[i].y);
                endShape(CLOSE);
            }
        } else {
            beginShape();
            for (let v of outerVerts) vertex(v.x, v.y);
            endShape(CLOSE);
            noStroke(); fill(0, 0, 0, 220);
            beginShape();
            for (let i = len - 1; i >= 0; i--) vertex(innerVerts[i].x, innerVerts[i].y);
            endShape(CLOSE);
        }
    }
};

// ============================================================================
// OPTIMIZED SHIP EXTRUSION - For cached ship layers with wedge taper
// ============================================================================

/**
 * Optimized extruded polygon drawing for ships with wedge taper effect
 * @param {number} r - Base radius
 * @param {object} layerCache - Pre-computed layer cache from initShipCache
 * @param {number} depth - Extrusion depth
 * @param {number} angle - Extrusion angle
 * @param {number} localSunAngle - Sun angle for lighting
 * @param {number} layerIndex - Layer index (0 = base)
 * @param {string} mode - 'both', 'sides', or 'top'
 */
function drawExtrudedPolyOptimized(r, layerCache, depth, angle, localSunAngle, layerIndex = 0, mode = 'both') {
    // Only base layer (index 0) uses shrink for wedge taper effect.
    // Secondary layers (decals) use full radius to match their designed positions.
    const layerR = (layerIndex === 0) ? r : r;

    // Only the base layer (index 0) has physical depth/extrusion.
    // Secondary layers (index > 0) are flat decorative decals with no elevation.
    const depthScale = (layerIndex === 0) ? 1.0 : 0.0;
    const effDepth = depth * depthScale;
    const dvx = effDepth * Math.sin(angle);
    const dvy = effDepth * Math.cos(angle);

    const bluntness = 0.3;
    noStroke();

    // Draw Sides
    if (mode === 'both' || mode === 'sides') {
        const fillRGB = layerCache.fillRGB;
        for (let edge of layerCache.edges) {
            // Backface culling for CW winding
            if (edge.dx * dvy - edge.dy * dvx < 0) {
                const t1_mod = bluntness + (1 - bluntness) * edge.t1;
                const t2_mod = bluntness + (1 - bluntness) * edge.t2;

                const bx1 = (edge.v1.x * layerR) + dvx * t1_mod;
                const by1 = (edge.v1.y * layerR) + dvy * t1_mod;
                const bx2 = (edge.v2.x * layerR) + dvx * t2_mod;
                const by2 = (edge.v2.y * layerR) + dvy * t2_mod;

                const fx1 = edge.v1.x * layerR;
                const fy1 = edge.v1.y * layerR;
                const fx2 = edge.v2.x * layerR;
                const fy2 = edge.v2.y * layerR;

                // Use pre-computed faceAngle if available, else compute
                const faceAngle = edge.faceAngle !== undefined ? edge.faceAngle : Math.atan2(-edge.dx, edge.dy);
                const b = getShading(faceAngle - localSunAngle);

                fill(fillRGB.r * b, fillRGB.g * b, fillRGB.b * b);

                beginShape();
                vertex(bx1, by1);
                vertex(bx2, by2);
                vertex(fx2, fy2);
                vertex(fx1, fy1);
                endShape(CLOSE);
            }
        }
    }

    // Draw Top Face
    if (mode === 'both' || mode === 'top') {
        const ctx = drawingContext;
        const topBrightness = (layerIndex === 0) ? 1.0 : 1.05;
        const fr = Math.min(255, Math.round(layerCache.fillRGB.r * topBrightness));
        const fg = Math.min(255, Math.round(layerCache.fillRGB.g * topBrightness));
        const fb = Math.min(255, Math.round(layerCache.fillRGB.b * topBrightness));
        ctx.fillStyle = `rgb(${fr}, ${fg}, ${fb})`;
        noStroke();

        beginShape();
        for (let v of layerCache.vertexData) {
            vertex(v.x * layerR, v.y * layerR);
        }
        endShape(CLOSE);
        if (layerIndex === 0) {
            drawShipRimGlint(layerCache, layerR, localSunAngle);
        }
    }
}

/**
 * Symmetric extruded polygon for alien ships (no wedge taper)
 */
function drawExtrudedPolySymmetric(r, layerCache, depth, angle, localSunAngle, layerIndex = 0, mode = 'both') {
    // Only base layer (index 0) uses shrink for stacking effect.
    // Secondary layers (decals) use full radius to match their designed positions.
    const layerR = (layerIndex === 0) ? r : r;

    // Only the base layer (index 0) has physical depth/extrusion.
    // Secondary layers (index > 0) are flat decorative decals with no elevation.
    const depthScale = (layerIndex === 0) ? 1.0 : 0.0;
    const effDepth = depth * depthScale;
    const dvx = effDepth * Math.sin(angle);
    const dvy = effDepth * Math.cos(angle);

    noStroke();

    // Draw Sides - uniform depth (no taper)
    if (mode === 'both' || mode === 'sides') {
        const fillRGB = layerCache.fillRGB;
        for (let edge of layerCache.edges) {
            if (edge.dx * dvy - edge.dy * dvx < 0) {
                const bx1 = (edge.v1.x * layerR) + dvx;
                const by1 = (edge.v1.y * layerR) + dvy;
                const bx2 = (edge.v2.x * layerR) + dvx;
                const by2 = (edge.v2.y * layerR) + dvy;

                const fx1 = edge.v1.x * layerR;
                const fy1 = edge.v1.y * layerR;
                const fx2 = edge.v2.x * layerR;
                const fy2 = edge.v2.y * layerR;

                const faceAngle = edge.faceAngle !== undefined ? edge.faceAngle : Math.atan2(-edge.dx, edge.dy);
                const b = getShading(faceAngle - localSunAngle);

                fill(fillRGB.r * b, fillRGB.g * b, fillRGB.b * b);

                beginShape();
                vertex(bx1, by1);
                vertex(bx2, by2);
                vertex(fx2, fy2);
                vertex(fx1, fy1);
                endShape(CLOSE);
            }
        }
    }

    // Draw Top Face
    if (mode === 'both' || mode === 'top') {
        const ctx = drawingContext;
        const topBrightness = (layerIndex === 0) ? 1.0 : 1.05;
        const fr = Math.min(255, Math.round(layerCache.fillRGB.r * topBrightness));
        const fg = Math.min(255, Math.round(layerCache.fillRGB.g * topBrightness));
        const fb = Math.min(255, Math.round(layerCache.fillRGB.b * topBrightness));
        ctx.fillStyle = `rgb(${fr}, ${fg}, ${fb})`;
        noStroke();

        beginShape();
        for (let v of layerCache.vertexData) {
            vertex(v.x * layerR, v.y * layerR);
        }
        endShape(CLOSE);
        if (layerIndex === 0) {
            drawShipRimGlint(layerCache, layerR, localSunAngle);
        }
    }
}

// ============================================================================
// FACET SHADING - For asteroids and other faceted objects
// ============================================================================

/**
 * Calculate shading for a facet based on its normal and sun direction
 * @param {number} normalX - Normal X component (normalized)
 * @param {number} normalY - Normal Y component (normalized)
 * @param {number} sunDirX - Sun direction X (normalized)
 * @param {number} sunDirY - Sun direction Y (normalized)
 * @returns {number} Brightness multiplier (0.4 - 1.2)
 */
function getFacetShading(normalX, normalY, sunDirX, sunDirY) {
    const dot = normalX * sunDirX + normalY * sunDirY;
    return 0.4 + 0.8 * ((dot + 1) / 2);
}

/**
 * Draws a 3D visualization for a ship upgrade.
 * @param {string} type - Upgrade type (armor, engine, cargo, hardpoints)
 * @param {number} level - Upgrade level (1-3)
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} size - Base size unit
 * @param {number} angle - Rotation angle
 */
Draw3D.drawUpgradeModel = function (type, level, x, y, size, angle) {
    const sunAngle = -Math.PI / 4; // Standard lighting
    const time = (typeof millis === 'function' ? millis() : 0) / 1000;

    const getLevelColor = (baseCol) => {
        // Shift hue/sat slightly based on level
        if (level === 2) return color(red(baseCol) * 0.9, green(baseCol) * 1.1, blue(baseCol) * 1.1);
        if (level === 3) return color(red(baseCol) * 1.2, green(baseCol) * 0.8, blue(baseCol) * 0.8);
        return baseCol;
    };

    if (type === 'armor') {
        // ARMOR: Hexagon blobs - one per level
        const col = color(100, 100, 110);
        const depth = size * 0.5;
        const blobCount = level; // 1, 2, or 3 hexagons
        const hexSize = size * 0.6;
        const spacing = hexSize * 1.1;

        for (let i = 0; i < blobCount; i++) {
            const xOff = (i - (blobCount - 1) / 2) * spacing;
            this.drawPrism(x + xOff, y, hexSize, 6, depth, col, angle, sunAngle);
        }

    } else if (type === 'engine') {
        // ENGINE: Thruster array (static)
        const col = color(200, 100, 50);
        const engAngle = angle + Math.PI; // Pointing left

        // Main Bell
        this.drawCone(x, y, size * 0.6, size * 0.8, 12, col, engAngle, sunAngle);

        // Auxiliary Bells
        if (level >= 2) {
            this.drawCone(x, y - size * 0.4, size * 0.4, size * 0.6, 12, col, engAngle, sunAngle);
            this.drawCone(x, y + size * 0.4, size * 0.4, size * 0.6, 12, col, engAngle, sunAngle);
        }
        if (level >= 3) {
            this.drawCone(x - size * 0.3, y, size * 0.4, size * 0.6, 12, col, engAngle, sunAngle);
        }

        // Glow
        noStroke();
        fill(100, 200, 255, 150 + Math.sin(time * 10) * 50);
        ellipse(x - size * 0.4, y, size * 0.4, size * 0.8);


    } else if (type === 'cargo') {
        // CARGO: Stacked containers (static at 45 degree angle)
        const col = color(180, 140, 60);
        const containerH = size * 0.4;
        const stacks = level;
        const fixedAngle = Math.PI / 4; // 45 degrees

        for (let i = 0; i < stacks; i++) {
            const yOff = (i - (stacks - 1) / 2) * containerH * 1.2;
            this.drawBox3D(x, y - yOff, size * 0.9, containerH * 0.7, size, col, fixedAngle, sunAngle);
        }

    } else if (type === 'hardpoints') {
        // HARDPOINTS: Weapon mount visuals
        const col = color(80, 80, 95);

        // Base Unit
        this.drawBox3D(x, y, size, size * 0.3, size, col, angle, sunAngle);

        // Turret Mounts
        const mounts = level;
        for (let i = 0; i < mounts; i++) {
            const xOff = (i - (mounts - 1) / 2) * size * 0.5;
            this.drawCylinder(x + xOff, y - size * 0.2, size * 0.2, size * 0.4, 8, color(150, 150, 160), angle, sunAngle);
        }

    } else if (type === 'shield') {
        // SHIELD: Generator core with rings - different colors per level
        let ringCol, coreCol;
        if (level === 1) {
            // Level 1: Cyan/Blue
            ringCol = color(100, 200, 255);
            coreCol = color(50, 50, 80);
        } else if (level === 2) {
            // Level 2: Green
            ringCol = color(100, 255, 150);
            coreCol = color(50, 80, 50);
        } else {
            // Level 3: Purple/Magenta
            ringCol = color(200, 100, 255);
            coreCol = color(80, 50, 80);
        }

        // Core
        this.drawCylinder(x, y, size * 0.3, size * 0.6, 8, coreCol, angle, sunAngle);

        // Energy Rings
        noStroke();
        fill(red(ringCol), green(ringCol), blue(ringCol), 100 + Math.sin(time * 5) * 50);
        ellipse(x, y, size * 1.0, size * 0.3); // Horizontal ring
        ellipse(x, y, size * 0.3, size * 1.0); // Vertical ring

    } else if (type === 'cloak') {
        // CLOAK: Phase shift generator with rotating rings

        // Core hexagonal prism
        this.drawPrism(x, y, size * 0.4, 6, size * 0.3, color(30, 60, 80), angle, sunAngle);

        // Rotating phase rings based on level
        const ringCount = level;
        for (let i = 0; i < ringCount; i++) {
            const ringAngle = angle + time * (1 + i * 0.5) + (i * TWO_PI / ringCount);
            const ringSize = size * (0.7 + i * 0.15);

            // Phase distortion ring (stylized as offset ellipses)
            push();
            noFill();
            stroke(50, 150 + i * 30, 200 + i * 20, 150 + Math.sin(time * 4 + i) * 50);
            strokeWeight(2);
            translate(x, y);
            rotate(ringAngle);
            ellipse(0, 0, ringSize, ringSize * 0.3);
            pop();
        }

        // Central glow effect
        noStroke();
        const glowAlpha = 100 + Math.sin(time * 6) * 50;
        fill(100, 200, 255, glowAlpha);
        ellipse(x, y, size * 0.5, size * 0.5);

        // Shimmer particles
        for (let i = 0; i < level + 2; i++) {
            const particleAngle = time * 2 + i * TWO_PI / (level + 2);
            const px = x + Math.cos(particleAngle) * size * 0.6;
            const py = y + Math.sin(particleAngle) * size * 0.3;
            fill(200, 230, 255, 150 + Math.sin(time * 8 + i) * 100);
            ellipse(px, py, 4, 4);
        }

    } else if (type === 'booster') {
        // BOOSTER: Afterburner system with flame effects
        const bodyCol = color(80, 90, 110);
        const flameCol = level === 3 ? color(255, 150, 50) :
            level === 2 ? color(255, 200, 100) :
                color(200, 180, 150);

        // Main thruster body (horizontal cylinder-like)
        this.drawBox3D(x, y, size * 1.2, size * 0.5, size * 0.6, bodyCol, angle, sunAngle);

        // Intake vents based on level
        const ventCount = level;
        for (let i = 0; i < ventCount; i++) {
            const yOff = (i - (ventCount - 1) / 2) * size * 0.25;
            this.drawBox3D(x - size * 0.4, y + yOff, size * 0.3, size * 0.12, size * 0.2, color(50, 60, 70), angle, sunAngle);
        }

        // Exhaust nozzle
        this.drawCone(x + size * 0.5, y, size * 0.35, size * 0.5, 8, color(60, 70, 80), angle + Math.PI, sunAngle);

        // Animated flame effect
        noStroke();
        const flameLength = size * (0.4 + level * 0.2);
        const flicker = Math.sin(time * 15) * 0.3 + 0.7;

        // Outer flame glow
        fill(red(flameCol), green(flameCol), blue(flameCol), 80 * flicker);
        ellipse(x + size * 0.7 + flameLength * 0.3, y, flameLength * 1.2, size * 0.6);

        // Core flame
        fill(red(flameCol), green(flameCol), blue(flameCol), 180 * flicker);
        ellipse(x + size * 0.6 + flameLength * 0.2, y, flameLength * 0.7, size * 0.35);

        // Hot center
        fill(255, 255, 200, 200 * flicker);
        ellipse(x + size * 0.5, y, size * 0.3, size * 0.2);

        // Speed lines for effect
        stroke(red(flameCol), green(flameCol), blue(flameCol), 100);
        strokeWeight(1);
        for (let i = 0; i < level + 1; i++) {
            const lineY = y + (i - level / 2) * size * 0.2;
            const lineStart = x + size * 0.8;
            const lineEnd = lineStart + flameLength * (0.5 + Math.sin(time * 10 + i) * 0.2);
            line(lineStart, lineY, lineEnd, lineY);
        }

    } else {
        // Fallback generic box
        this.drawBox3D(x, y, size, size, size, color(100), angle, sunAngle);
    }
};

console.log("draw3d.js - Centralized Faux 3D Rendering System loaded.");

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Draw3D,
        computeShipRimGlintStrength,
        drawShipRimGlint,
        getNearestSunAngleForEntity
    };
}
