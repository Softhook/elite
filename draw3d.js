// ****** draw3d.js ******
// Centralized Faux 3D Rendering System
// Provides optimized 3D-style drawing primitives for ships, cargo, asteroids, and space objects
// MUST be loaded BEFORE ships.js, cargo.js, spaceObjects.js, and asteroid.js

// ============================================================================
// SHADING LOOKUP TABLE - Pre-computed for performance
// ============================================================================
const SHADE_TABLE_SIZE = 360;
const SHADE_TABLE = new Float32Array(SHADE_TABLE_SIZE);
for (let i = 0; i < SHADE_TABLE_SIZE; i++) {
    const angle = (i / SHADE_TABLE_SIZE) * Math.PI * 2;
    // Formula: 0.5 + (cos(angle) + 1) * 0.25 → range ~0.5 - 1.0
    SHADE_TABLE[i] = 0.5 + (Math.cos(angle) + 1) * 0.25;
}

/**
 * Fast shading lookup using pre-computed table
 * @param {number} angleDiff - Angle difference in radians
 * @returns {number} Brightness multiplier (0.5 - 1.0)
 */
function getShading(angleDiff) {
    let normalized = angleDiff % (Math.PI * 2);
    if (normalized < 0) normalized += Math.PI * 2;
    const index = Math.floor((normalized / (Math.PI * 2)) * SHADE_TABLE_SIZE) % SHADE_TABLE_SIZE;
    return SHADE_TABLE[index];
}

/**
 * Compute shading using direct formula (for cases where lookup isn't beneficial)
 * @param {number} angleDiff - Angle difference in radians
 * @returns {number} Brightness multiplier (0.5 - 1.0)
 */
function computeShading(angleDiff) {
    return 0.5 + (Math.cos(angleDiff) + 1) * 0.25;
}

// ============================================================================
// DRAW3D OBJECT - Centralized 3D rendering helpers
// ============================================================================
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
     */
    drawPrism: function (x, y, r, sides, depth, col, angle, sunAngle) {
        const dv = this.getDepthVector(depth, angle);
        const angleStep = TWO_PI / sides;

        strokeWeight(1);

        // Draw Bottom Cap
        fill(red(col) * 0.5, green(col) * 0.5, blue(col) * 0.5, alpha(col));
        stroke(red(col) * 0.4, green(col) * 0.4, blue(col) * 0.4, alpha(col));
        beginShape();
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep - PI / 2;
            vertex(x + Math.cos(ang) * r + dv.x, y + Math.sin(ang) * r + dv.y);
        }
        endShape(CLOSE);

        // Draw sides with backface culling
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep - PI / 2;
            const nextAng = (i + 1) * angleStep - PI / 2;
            const faceAngle = (i + 0.5) * angleStep - PI / 2;

            const nx = Math.cos(faceAngle);
            const ny = Math.sin(faceAngle);
            const dot = nx * dv.x + ny * dv.y;

            if (dot > 0.001) {
                const vx = x + Math.cos(ang) * r;
                const vy = y + Math.sin(ang) * r;
                const nvx = x + Math.cos(nextAng) * r;
                const nvy = y + Math.sin(nextAng) * r;

                const b = getShading(faceAngle - sunAngle);

                fill(red(col) * b, green(col) * b, blue(col) * b, alpha(col));
                stroke(red(col) * b * 0.8, green(col) * b * 0.8, blue(col) * b * 0.8, alpha(col));

                beginShape();
                vertex(vx + dv.x, vy + dv.y);
                vertex(nvx + dv.x, nvy + dv.y);
                vertex(nvx, nvy);
                vertex(vx, vy);
                endShape(CLOSE);
            }
        }

        // Draw Top
        fill(col);
        stroke(red(col) * 0.8, green(col) * 0.8, blue(col) * 0.8, alpha(col));
        beginShape();
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep - PI / 2;
            vertex(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
        }
        endShape(CLOSE);
    },

    /**
     * Draw a prism in stages (bottom/sides/top separately)
     */
    drawPrismSplit: function (x, y, r, sides, depth, col, angle, sunAngle, stage) {
        const dv = this.getDepthVector(depth, angle);
        const angleStep = TWO_PI / sides;

        strokeWeight(1);

        if (stage === 'bottom') {
            fill(red(col) * 0.5, green(col) * 0.5, blue(col) * 0.5, alpha(col));
            stroke(red(col) * 0.4, green(col) * 0.4, blue(col) * 0.4, alpha(col));
            beginShape();
            for (let i = 0; i < sides; i++) {
                const ang = i * angleStep - PI / 2;
                vertex(x + Math.cos(ang) * r + dv.x, y + Math.sin(ang) * r + dv.y);
            }
            endShape(CLOSE);
            return;
        }

        if (stage === 'sides') {
            for (let i = 0; i < sides; i++) {
                const ang = i * angleStep - PI / 2;
                const nextAng = (i + 1) * angleStep - PI / 2;
                const faceAngle = (i + 0.5) * angleStep - PI / 2;
                const nx = Math.cos(faceAngle);
                const ny = Math.sin(faceAngle);
                const dot = nx * dv.x + ny * dv.y;

                if (dot > 0.001) {
                    const vx = x + Math.cos(ang) * r;
                    const vy = y + Math.sin(ang) * r;
                    const nvx = x + Math.cos(nextAng) * r;
                    const nvy = y + Math.sin(nextAng) * r;
                    const b = getShading(faceAngle - sunAngle);

                    fill(red(col) * b, green(col) * b, blue(col) * b, alpha(col));
                    stroke(red(col) * b * 0.8, green(col) * b * 0.8, blue(col) * b * 0.8, alpha(col));
                    beginShape();
                    vertex(vx + dv.x, vy + dv.y);
                    vertex(nvx + dv.x, nvy + dv.y);
                    vertex(nvx, nvy);
                    vertex(vx, vy);
                    endShape(CLOSE);
                }
            }
            return;
        }

        if (stage === 'top') {
            fill(col);
            stroke(red(col) * 0.8, green(col) * 0.8, blue(col) * 0.8, alpha(col));
            beginShape();
            for (let i = 0; i < sides; i++) {
                const ang = i * angleStep - PI / 2;
                vertex(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
            }
            endShape(CLOSE);
            return;
        }
    },

    /**
     * Draw a 3D extruded box
     */
    drawBox3D: function (x, y, w, h, depth, col, angle, sunAngle) {
        const dv = this.getDepthVector(depth, angle);
        const hw = w / 2;
        const hh = h / 2;

        const faceAngles = [-PI / 2, 0, PI / 2, PI];

        strokeWeight(1);

        // Bottom Cap
        fill(red(col) * 0.5, green(col) * 0.5, blue(col) * 0.5, alpha(col));
        stroke(red(col) * 0.4, green(col) * 0.4, blue(col) * 0.4, alpha(col));
        beginShape();
        vertex(x - hw + dv.x, y - hh + dv.y);
        vertex(x + hw + dv.x, y - hh + dv.y);
        vertex(x + hw + dv.x, y + hh + dv.y);
        vertex(x - hw + dv.x, y + hh + dv.y);
        endShape(CLOSE);

        // Sides with backface culling
        for (let i = 0; i < 4; i++) {
            const nx = Math.cos(faceAngles[i]);
            const ny = Math.sin(faceAngles[i]);
            const dot = nx * dv.x + ny * dv.y;

            if (dot > 0.001) {
                const b = getShading(faceAngles[i] - sunAngle);

                fill(red(col) * b, green(col) * b, blue(col) * b, alpha(col));
                stroke(red(col) * b * 0.8, green(col) * b * 0.8, blue(col) * b * 0.8, alpha(col));

                beginShape();
                let x1, y1, x2, y2;
                if (i === 0) { x1 = x - hw; y1 = y - hh; x2 = x + hw; y2 = y - hh; }
                else if (i === 1) { x1 = x + hw; y1 = y - hh; x2 = x + hw; y2 = y + hh; }
                else if (i === 2) { x1 = x + hw; y1 = y + hh; x2 = x - hw; y2 = y + hh; }
                else { x1 = x - hw; y1 = y + hh; x2 = x - hw; y2 = y - hh; }

                vertex(x1 + dv.x, y1 + dv.y);
                vertex(x2 + dv.x, y2 + dv.y);
                vertex(x2, y2);
                vertex(x1, y1);
                endShape(CLOSE);
            }
        }

        // Top
        fill(col);
        stroke(red(col) * 0.8, green(col) * 0.8, blue(col) * 0.8, alpha(col));
        rectMode(CENTER);
        rect(x, y, w, h);
    },

    /**
     * Draw an extruded arbitrary shape from vertices
     */
    drawExtrudedShape: function (vertices, depth, col, angle, sunAngle, cull = true) {
        const dv = this.getDepthVector(depth, angle);

        strokeWeight(1);
        const len = vertices.length;

        // Bottom Cap
        fill(red(col) * 0.5, green(col) * 0.5, blue(col) * 0.5, alpha(col));
        stroke(red(col) * 0.4, green(col) * 0.4, blue(col) * 0.4, alpha(col));
        beginShape();
        for (let i = 0; i < len; i++) {
            vertex(vertices[i].x + dv.x, vertices[i].y + dv.y);
        }
        endShape(CLOSE);

        // Sides
        for (let i = 0; i < len; i++) {
            const next = (i + 1) % len;
            const v1 = vertices[i];
            const v2 = vertices[next];

            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            const faceAngle = Math.atan2(dx, -dy);

            const nx = Math.cos(faceAngle);
            const ny = Math.sin(faceAngle);
            const dot = nx * dv.x + ny * dv.y;

            if (!cull || dot > 0.001) {
                const b = getShading(faceAngle - sunAngle);

                fill(red(col) * b, green(col) * b, blue(col) * b, alpha(col));
                stroke(red(col) * b * 0.8, green(col) * b * 0.8, blue(col) * b * 0.8, alpha(col));

                beginShape();
                vertex(v1.x + dv.x, v1.y + dv.y);
                vertex(v2.x + dv.x, v2.y + dv.y);
                vertex(v2.x, v2.y);
                vertex(v1.x, v1.y);
                endShape(CLOSE);
            }
        }

        // Top
        fill(col);
        stroke(red(col) * 0.8, green(col) * 0.8, blue(col) * 0.8, alpha(col));
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
        const angleStep = TWO_PI / sides;

        strokeWeight(1);

        // Bottom cap with contour for hole
        const hasContour = typeof beginContour === 'function' && typeof endContour === 'function';

        fill(red(col) * 0.5, green(col) * 0.5, blue(col) * 0.5, alpha(col));
        stroke(red(col) * 0.4, green(col) * 0.4, blue(col) * 0.4, alpha(col));

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
                fill(red(col) * b, green(col) * b, blue(col) * b, alpha(col));
                stroke(red(col) * b * 0.8, green(col) * b * 0.8, blue(col) * b * 0.8, alpha(col));
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
                fill(red(col) * bIn, green(col) * bIn, blue(col) * bIn, alpha(col));
                stroke(red(col) * bIn * 0.8, green(col) * bIn * 0.8, blue(col) * bIn * 0.8, alpha(col));
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
        stroke(red(col) * 0.8, green(col) * 0.8, blue(col) * 0.8, alpha(col));
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
        stroke(red(col) * 0.8, green(col) * 0.8, blue(col) * 0.8, alpha(col));
    },

    /**
     * Draw extruded ring from vertex arrays
     */
    drawExtrudedRing: function (outerVerts, innerVerts, depth, col, angle, sunAngle) {
        const dv = this.getDepthVector(depth, angle);
        strokeWeight(1);
        const len = outerVerts.length;

        // Bottom cap
        fill(red(col) * 0.5, green(col) * 0.5, blue(col) * 0.5);
        stroke(red(col) * 0.4, green(col) * 0.4, blue(col) * 0.4);

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
                stroke(red(col) * 0.4, green(col) * 0.4, blue(col) * 0.4);
            }
        } else {
            beginShape();
            for (let v of outerVerts) vertex(v.x + dv.x, v.y + dv.y);
            endShape(CLOSE);
            noStroke(); fill(0, 0, 0, 220);
            beginShape();
            for (let i = len - 1; i >= 0; i--) vertex(innerVerts[i].x + dv.x, innerVerts[i].y + dv.y);
            endShape(CLOSE);
            stroke(red(col) * 0.4, green(col) * 0.4, blue(col) * 0.4);
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
                fill(red(col) * b, green(col) * b, blue(col) * b);
                stroke(red(col) * b * 0.8, green(col) * b * 0.8, blue(col) * b * 0.8);
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
                fill(red(col) * b, green(col) * b, blue(col) * b);
                stroke(red(col) * b * 0.8, green(col) * b * 0.8, blue(col) * b * 0.8);
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
        stroke(red(col) * 0.8, green(col) * 0.8, blue(col) * 0.8);
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
    const shrinkPerLayer = 0.03;
    const layerR = r * Math.max(0.85, 1 - layerIndex * shrinkPerLayer);
    const depthScale = (layerIndex === 0) ? 1.0 : 0.35;
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
                const faceAngle = edge.faceAngle !== undefined ? edge.faceAngle : Math.atan2(edge.dx, -edge.dy);
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
    }
}

/**
 * Symmetric extruded polygon for alien ships (no wedge taper)
 */
function drawExtrudedPolySymmetric(r, layerCache, depth, angle, localSunAngle, layerIndex = 0, mode = 'both') {
    const shrinkPerLayer = 0.03;
    const layerR = r * Math.max(0.85, 1 - layerIndex * shrinkPerLayer);
    const depthScale = (layerIndex === 0) ? 1.0 : 0.35;
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

                const faceAngle = edge.faceAngle !== undefined ? edge.faceAngle : Math.atan2(edge.dx, -edge.dy);
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

console.log("draw3d.js - Centralized Faux 3D Rendering System loaded.");
