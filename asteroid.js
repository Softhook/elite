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

    update() {
        if (this.destroyed) return;
        this.pos.add(this.vel);
        this.angle = (this.angle + this.rotationSpeed) % TWO_PI;
        if (this.angle < 0) this.angle += TWO_PI;
    }

    draw() {
        if (this.destroyed) return;

        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle);

        fill(this.color);
        stroke(80);
        strokeWeight(1);

        // Draw an irregular shape using pre-generated vertices
        beginShape();
        for (let i = 0, len = this.vertices.length; i < len; i++) {
            const v = this.vertices[i];
            vertex(v.x, v.y);
        }
        endShape(CLOSE);

        // Draw mineral seams if the asteroid is rich
        if (this.isRich && this.seamColor) {
            push();
            stroke(this.seamColor);
            strokeWeight(max(1.5, this.size / 30)); // Seam thickness, ensuring visibility
            noFill(); // Seams are lines

            // Draw seams along some edges (e.g., every 2nd or 3rd edge)
            for (let i = 0; i < this.vertices.length; i++) {
                if (i % 3 === 0) { // Adjust frequency as needed for visual subtlety
                    const v1 = this.vertices[i];
                    const v2 = this.vertices[(i + 1) % this.vertices.length];
                    line(v1.x, v1.y, v2.x, v2.y);
                }
            }
            pop();
        }
        // --- Draw Player's Target Indicator for this asteroid ---
        if (typeof player !== 'undefined' && player.target === this) {
            // Draw ship-style reticle (matching enemyRendering.js)
            push();
            noFill();
            stroke(0, 255, 0, 200); // Bright green, semi-transparent
            strokeWeight(2);

            // Circle around the asteroid (using size like ships do)
            ellipse(0, 0, this.size * 1.6, this.size * 1.6);

            // Corner brackets (matching ship style)
            const bracketSize = this.size * 0.3;
            const offset = this.size * 0.7;
            // Top-left
            line(-offset, -offset, -offset + bracketSize, -offset);
            line(-offset, -offset, -offset, -offset + bracketSize);
            // Top-right
            line(offset, -offset, offset - bracketSize, -offset);
            line(offset, -offset, offset, -offset + bracketSize);
            // Bottom-left
            line(-offset, offset, -offset + bracketSize, offset);
            line(-offset, offset, -offset, offset - bracketSize);
            // Bottom-right
            line(offset, offset, offset - bracketSize, offset);
            line(offset, offset, offset, offset - bracketSize);
            pop();
        }

        pop();

        // --- Draw Health Bar ---
        if (this.health < this.maxHealth && this.maxHealth > 0) {
            const healthPercent = this.health / this.maxHealth;
            const barW = this.size * 0.7;
            const barH = 5;
            const barX = this.pos.x - barW / 2;
            const barY = this.pos.y - this.maxRadius - 14;

            push();
            noStroke();
            fill(255, 0, 0);
            rect(barX, barY, barW, barH);
            fill(0, 255, 0);
            rect(barX, barY, barW * healthPercent, barH);
            pop();
        }
    }

    /** Applies damage to the asteroid's health. */
    takeDamage(amount) {
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
     * Improved collision: use maxRadius to cover all rotations.
     * @param {object} target - Object with pos {x, y} and size properties.
     * @returns {boolean} True if collision detected based on overlapping circular bounds.
     */
    checkCollision(target) {
        if (!target || !target.pos || typeof target.size !== 'number') return false;
        const dSq = sq(this.pos.x - target.pos.x) + sq(this.pos.y - target.pos.y);
        const targetRadius = target.size / 2;
        const sumRadii = targetRadius + this.maxRadius;
        return dSq < sq(sumRadii);
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
        if (Array.isArray(data.color)) a.color = color(data.color[0], data.color[1], data.color[2]);
        if (Array.isArray(data.seamColor)) a.seamColor = color(data.seamColor[0], data.seamColor[1], data.seamColor[2], data.seamColor[3] || 180);
        a.destroyed = !!data.destroyed;
        return a;
    }
} // End of Asteroid Class