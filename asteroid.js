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

        this.maxHealth = floor(this.size * 2); // Health scales with size
        this.health = this.maxHealth;

        // Mineral richness properties
        this.isRich = random(1) < 0.2; // 20% chance of being a rich asteroid
        this.mineralMultiplier = 1;
        this.seamColor = null;

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
        const angles = Array.from({length: numVertices}, (_, i) => i * TWO_PI / numVertices);
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
        for (const v of this.vertices) {
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
} // End of Asteroid Class