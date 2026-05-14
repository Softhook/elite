// ****** asteroid.js ******

class Asteroid {
    constructor(x, y, size) {
        this.pos = createVector(x, y);

        // Vary asteroid sizes: normal, large, very large
        let r = random(1);
        if (r < 0.05) { // 5% chance for very large
            this.size = size || random(200, 350);
        } else if (r < 0.20) { // 15% chance for large
            this.size = size || random(100, 199);
        } else { // 80% chance for normal
            this.size = size || random(30, 99);
        }

        this.maxHealth = floor(this.size * 8); // Health scales with size
        this.health = this.maxHealth;

        // Mineral richness properties
        this.isRich = random(1) < 0.2; // 20% chance of being a rich asteroid
        this.mineralMultiplier = 1;
        this.seamColor = null;

        this.isComet = false; // Flag for special comet behavior

        if (this.isRich) {
            // Gold: color(218, 165, 32, 180), MediumSeaGreen: color(60, 179, 113, 180)
            this.seamColor = random(1) < 0.5 ? color(218, 165, 32, 180) : color(60, 179, 113, 180);
            this.mineralMultiplier = floor(random(2, 5)); // Drops 2x to 4x minerals
        }

        this.vel = p5.Vector.random2D().mult(random(0.1, 0.6));
        this.angle = random(0, TWO_PI);
        this.rotationSpeed = random(-0.01, 0.01);

        // Generate vertices in strict clockwise order
        this.vertices = this._generateVertices();

        // Generate irregular facets for Voronoi-like look
        this.facets = this._generateFacets();

        this.color = color(random(120, 180)); // Lighter gray for better visibility
        this.destroyed = false;
    }

    /**
     * Generates the asteroid's vertices in strict clockwise order.
     * @returns {p5.Vector[]} Array of vertex vectors.
     */
    _generateVertices() {
        const numVertices = floor(random(8, 12));
        const baseRadius = this.size / 2;
        let maxRadius = baseRadius;

        // Generate angles in ascending order
        const angles = Array.from({ length: numVertices }, (_, i) => i * TWO_PI / numVertices);
        angles.sort((a, b) => a - b);

        // Create vertices
        const vertices = angles.map(angle => {
            const radius = baseRadius * random(0.75, 1.25);
            if (radius > maxRadius) maxRadius = radius;
            return createVector(cos(angle) * radius, sin(angle) * radius);
        });
        this.maxRadius = maxRadius;
        return vertices;
    }

    /**
     * Generates irregular facets using multiple internal centers (Dual or Triple split).
     * This creates a fractured, rocky look.
     * @returns {Array} Array of facets, where each facet is [v1, v2, v3] (vectors).
     */
    _generateFacets() {
        if (!this.vertices || this.vertices.length < 3) return [];

        const facets = [];
        const outer = this.vertices;
        const numOuter = outer.length;

        // Strategy: Randomly choose between Dual (2 centers) and Triple (3 centers)
        const numCenters = random(1) < 0.5 ? 2 : 3;
        const centers = [];

        // Generate centers
        for (let i = 0; i < numCenters; i++) {
            let c;
            let attempts = 0;
            do {
                // Pick a random point inside, spread out a bit
                c = p5.Vector.random2D().mult(random(this.size * 0.1, this.size * 0.4));
                attempts++;

                // Check distance against existing centers to ensure spread
                let tooClose = false;
                for (let existing of centers) {
                    if (c.dist(existing) < this.size * 0.15) {
                        tooClose = true;
                        break;
                    }
                }
                if (!tooClose) break;
            } while (attempts < 10);
            centers.push(c);
        }

        // Helper to find closest center to a vertex
        const getClosestCenter = (v) => {
            let closest = centers[0];
            let minD = v.dist(centers[0]);
            for (let i = 1; i < numCenters; i++) {
                const d = v.dist(centers[i]);
                if (d < minD) {
                    minD = d;
                    closest = centers[i];
                }
            }
            return closest;
        };

        for (let i = 0; i < numOuter; i++) {
            const v1 = outer[i];
            const v2 = outer[(i + 1) % numOuter];

            const c1 = getClosestCenter(v1);
            const c2 = getClosestCenter(v2);

            if (c1 === c2) {
                // Both vertices belong to the same center region
                facets.push([c1, v1, v2]);
            } else {
                // Transition zone: Bridge the two centers
                // We create two triangles to fill the quad (c1, v1, v2, c2)
                // Triangle 1: c1, v1, v2
                // Triangle 2: c1, v2, c2
                facets.push([c1, v1, v2]);
                facets.push([c1, v2, c2]);
            }
        }

        // Fix for holes: Fill the internal polygon formed by the centers
        // If we have 3 centers, the area between them (c1-c2-c3) is not covered by the fans above.
        if (numCenters === 3) {
            facets.push([centers[0], centers[1], centers[2]]);
        }

        return facets;
    }

    update() {
        if (this.destroyed) return;
        const timeScale = (typeof deltaTime === 'number') ? deltaTime / 16.67 : 1;
        this.pos.add(p5.Vector.mult(this.vel, timeScale));
        this.angle = (this.angle + this.rotationSpeed * timeScale) % TWO_PI;
        if (this.angle < 0) this.angle += TWO_PI;
    }

    draw() {
        if (this.destroyed) return;

        if (this.isComet) {
            // Draw a massive debris-trail tail for the giant asteroid.
            const vx = this.vel?.x || 0;
            const vy = this.vel?.y || 0;
            const speed = Math.sqrt(vx * vx + vy * vy);
            if (speed > 0.01) {
                const nx = vx / speed;
                const ny = vy / speed;
                // Perpendicular axis for spreading the debris fan
                const px = -ny;
                const py = nx;
                const tailLen = this.size * 5;

                push();
                // Wide central debris tail – multiple parallel strands
                const numStrands = 7;
                for (let s = 0; s < numStrands; s++) {
                    const spread = lerp(-this.size * 0.8, this.size * 0.8, s / (numStrands - 1));
                    const strandAlphaBase = s === Math.floor(numStrands / 2) ? 160 : 80;
                    const segments = 6;
                    for (let i = 0; i < segments; i++) {
                        const t0 = i / segments;
                        const t1 = (i + 1) / segments;
                        const fanSpread0 = spread * (1 + t0 * 2.5);
                        const fanSpread1 = spread * (1 + t1 * 2.5);
                        const alpha = lerp(strandAlphaBase, 0, t0 * t0);
                        const w = lerp(Math.max(3, this.size * 0.06), 1, t0);
                        stroke(200, 150, 90, alpha);
                        strokeWeight(w);
                        const sx = this.pos.x - nx * tailLen * t0 + px * fanSpread0;
                        const sy = this.pos.y - ny * tailLen * t0 + py * fanSpread0;
                        const ex = this.pos.x - nx * tailLen * t1 + px * fanSpread1;
                        const ey = this.pos.y - ny * tailLen * t1 + py * fanSpread1;
                        line(sx, sy, ex, ey);
                    }
                }
                noStroke();
                // Wide outer dust coma
                fill(180, 130, 70, 30);
                ellipse(this.pos.x, this.pos.y, this.size * 4, this.size * 4);
                // Inner glowing halo
                fill(230, 180, 100, 60);
                ellipse(this.pos.x, this.pos.y, this.size * 2.2, this.size * 2.2);
                pop();
            }
        }

        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle);

        // --- Faux 3D Faceted Rendering ---

        // Calculate Sun direction in local space
        // Sun is at (0,0) in world space. Vector to sun is -this.pos
        let sunDirX = -this.pos.x;
        let sunDirY = -this.pos.y;

        // Normalize sun vector
        let mag = Math.sqrt(sunDirX * sunDirX + sunDirY * sunDirY);
        if (mag > 0) {
            sunDirX /= mag;
            sunDirY /= mag;
        } else {
            sunDirX = 1; sunDirY = 0;
        }

        // Rotate sun vector by -this.angle to match local space
        let c = Math.cos(this.angle);
        let s = Math.sin(this.angle);
        // Rotation for -angle:
        // x' = x cos(a) + y sin(a)
        // y' = -x sin(a) + y cos(a)
        let localSunX = sunDirX * c + sunDirY * s;
        let localSunY = -sunDirX * s + sunDirY * c;

        // Base color value (grayscale)
        let baseGray = this.color.levels ? this.color.levels[0] : 127;
        let r = baseGray;
        let g = baseGray;
        let b = baseGray;

        // Comets are giant rocky asteroids – give them a dark brownish-red tone
        if (this.isComet) {
            r = 130; g = 90; b = 60;
        }

        // Apply tint if rich
        if (this.isRich && this.seamColor) {
            // Mix base gray with seam color
            const mixAmount = 0.4; // Strength of the tint
            const sr = this.seamColor.levels[0];
            const sg = this.seamColor.levels[1];
            const sb = this.seamColor.levels[2];

            r = lerp(r, sr, mixAmount);
            g = lerp(g, sg, mixAmount);
            b = lerp(b, sb, mixAmount);
        }

        strokeWeight(1);

        // Draw facets
        const facetsToDraw = this.facets && this.facets.length > 0 ? this.facets : null;

        if (facetsToDraw) {
            for (let i = 0; i < facetsToDraw.length; i++) {
                const f = facetsToDraw[i];
                const v1 = f[0];
                const v2 = f[1];
                const v3 = f[2];

                // Calculate normal of the face (cross product of two edges)
                // Edge 1: v2 - v1
                // Edge 2: v3 - v1
                // 2D "Normal" for lighting? 
                // Actually, for 2D faux-3D, we can just use the face center direction or a pre-calculated normal.
                // Let's use the face center direction relative to asteroid center (0,0).
                let cx = (v1.x + v2.x + v3.x) / 3;
                let cy = (v1.y + v2.y + v3.y) / 3;

                // Normalize center vector
                let mag = Math.sqrt(cx * cx + cy * cy);
                if (mag > 0) { cx /= mag; cy /= mag; }

                // Dot product with local sun direction
                let dot = cx * localSunX + cy * localSunY;

                // Map dot (-1 to 1) to brightness multiplier
                // -1 (facing away) -> 0.4
                // 1 (facing sun) -> 1.2
                let brightness = 0.4 + 0.8 * ((dot + 1) / 2);

                // Add some random variation per facet for "rocky" texture
                // Use a pseudo-random based on vertex coords to be consistent
                let noise = (Math.sin(v1.x * 12.9898 + v1.y * 78.233) * 43758.5453) % 1;
                brightness += (noise - 0.5) * 0.15;

                // Apply brightness to the calculated RGB
                let fr = Math.max(0, Math.min(255, r * brightness));
                let fg = Math.max(0, Math.min(255, g * brightness));
                let fb = Math.max(0, Math.min(255, b * brightness));

                fill(fr, fg, fb);
                noStroke(); // Remove stroke as requested

                triangle(v1.x, v1.y, v2.x, v2.y, v3.x, v3.y);
            }
        } else {
            // Fallback to simple fan if no facets (legacy support)
            for (let i = 0, len = this.vertices.length; i < len; i++) {
                const v1 = this.vertices[i];
                const v2 = this.vertices[(i + 1) % len];
                // ... (Simple lighting logic from before)
                let mx = (v1.x + v2.x) * 0.5;
                let my = (v1.y + v2.y) * 0.5;
                let mMag = Math.sqrt(mx * mx + my * my);
                if (mMag > 0) { mx /= mMag; my /= mMag; }
                let dot = mx * localSunX + my * localSunY;
                let brightness = 0.4 + 0.8 * ((dot + 1) / 2);
                let fr = Math.max(0, Math.min(255, r * brightness));
                let fg = Math.max(0, Math.min(255, g * brightness));
                let fb = Math.max(0, Math.min(255, b * brightness));
                fill(fr, fg, fb);
                noStroke();
                triangle(0, 0, v1.x, v1.y, v2.x, v2.y);
            }
        }


        // --- Draw Player's Target Indicator for this asteroid ---
        if (typeof player !== 'undefined' && player.target === this) {
            // Target highlighting logic moved to centralized UIHUD.drawTargetReticle()
        }

        pop();

    }

    /** Applies damage to the asteroid's health. */
    takeDamage(amount, attacker = null, system = null) {
        if (this.destroyed || amount <= 0) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.destroyed = true;
        }
    }

    /** @returns {boolean} True if the asteroid is destroyed. */
    isDestroyed() {
        return this.destroyed;
    }

    getMineralMultiplier() {
        return this.mineralMultiplier;
    }

    /**
     * Collision detection with polygon narrowphase for on-screen accuracy.
     * Uses circle broadphase (maxRadius) for fast rejection, then polygon SAT for visible collisions.
     * @param {object} target - Object with pos {x, y} and size properties.
     * @returns {boolean} True if collision detected.
     */
    checkCollision(target) {
        if (!target || !target.pos || typeof target.size !== 'number') return false;

        // Broadphase: Circle check using maxRadius (covers all rotations)
        const dSq = sq(this.pos.x - target.pos.x) + sq(this.pos.y - target.pos.y);
        const targetRadius = target.size / 2;
        const sumRadii = targetRadius + this.maxRadius;
        if (dSq >= sq(sumRadii)) return false; // Fast rejection

        // Narrowphase: Polygon collision if on-screen (for visual accuracy)
        if (typeof CollisionUtils !== 'undefined' && CollisionUtils.isOnScreen(this.pos)) {
            // Get polygon for this asteroid
            const polyA = CollisionUtils.getAsteroidPolygon(this);

            // Get polygon for target (could be ship or asteroid)
            let polyB = null;
            if (target.vertices) {
                // Target is an asteroid
                polyB = CollisionUtils.getAsteroidPolygon(target);
            } else if (target.shipDef) {
                // Target is a ship
                polyB = CollisionUtils.getShipPolygon(target);
            }

            if (polyA && polyB) {
                return CollisionUtils.polygonsCollide(polyA, polyB);
            }
        }

        // Fallback: Broadphase already passed, assume collision
        return true;
    }

    toJSON() {
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            vel: { x: this.vel.x, y: this.vel.y },
            size: this.size,
            health: this.health,
            maxHealth: this.maxHealth,
            isRich: !!this.isRich,
            mineralMultiplier: this.mineralMultiplier,
            isComet: !!this.isComet,
            angle: this.angle,
            rotationSpeed: this.rotationSpeed,
            maxRadius: this.maxRadius,
            vertices: Array.isArray(this.vertices) ? this.vertices.map(v => ({ x: v.x, y: v.y })) : null,
            // Serialize facets as flat array of points to save space/complexity
            // Each facet is 3 points. 
            facets: this.facets ? this.facets.map(f => [{ x: f[0].x, y: f[0].y }, { x: f[1].x, y: f[1].y }, { x: f[2].x, y: f[2].y }]) : null,
            color: this.color && this.color.levels ? this.color.levels.slice(0, 3) : null,
            seamColor: this.seamColor && this.seamColor.levels ? this.seamColor.levels.slice(0, 4) : null,
            destroyed: !!this.destroyed
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        const a = new Asteroid((data.pos && data.pos.x) || 0, (data.pos && data.pos.y) || 0, data.size || 50);
        a.size = data.size || a.size;
        a.maxHealth = data.maxHealth || a.maxHealth;
        a.health = (typeof data.health === 'number') ? data.health : a.health;
        a.isRich = !!data.isRich;
        a.mineralMultiplier = data.mineralMultiplier || a.mineralMultiplier;
        a.isComet = !!data.isComet;
        if (data.vel) a.vel = createVector(data.vel.x || 0, data.vel.y || 0);
        a.angle = (data.angle !== undefined) ? data.angle : a.angle;
        a.rotationSpeed = (data.rotationSpeed !== undefined) ? data.rotationSpeed : a.rotationSpeed;
        if (typeof data.maxRadius === 'number') a.maxRadius = data.maxRadius;
        if (Array.isArray(data.vertices)) {
            a.vertices = data.vertices.map(v => createVector(v.x || 0, v.y || 0));
        }
        // Restore facets
        if (Array.isArray(data.facets)) {
            a.facets = data.facets.map(f => [
                createVector(f[0].x, f[0].y),
                createVector(f[1].x, f[1].y),
                createVector(f[2].x, f[2].y)
            ]);
        } else if (a.vertices) {
            // Legacy save support: generate facets from vertices
            a.facets = a._generateFacets();
        }

        if (Array.isArray(data.color)) a.color = color(data.color[0], data.color[1], data.color[2]);
        if (Array.isArray(data.seamColor)) a.seamColor = color(data.seamColor[0], data.seamColor[1], data.seamColor[2], data.seamColor[3] || 180);
        a.destroyed = !!data.destroyed;
        return a;
    }
} // End of Asteroid Class

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Asteroid };
    global.Asteroid = Asteroid;
}