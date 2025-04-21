// ****** asteroid.js ******

class Asteroid {
    constructor(x, y, size) {
        this.pos = createVector(x, y);
        this.size = size || random(40, 90);
        this.maxHealth = floor(this.size * 1.5);
        this.health = this.maxHealth;

        this.vel = p5.Vector.random2D().mult(random(0.1, 0.6));
        this.angle = random(0, TWO_PI);
        this.rotationSpeed = random(-0.01, 0.01);

        // Generate vertices in strict clockwise order
        this.vertices = [];
        let numVertices = floor(random(8, 12));
        let baseRadius = this.size / 2;
        this.maxRadius = baseRadius;

        // Generate angles first, ensure they're in ascending order
        let angles = [];
        for (let i = 0; i < numVertices; i++) {
            angles.push(i * TWO_PI / numVertices);
        }
        
        // Sort angles to ensure clockwise order (not strictly necessary in this case,
        // but good practice for vertex generation)
        angles.sort((a, b) => a - b);
        
        // Now create vertices with these ordered angles
        for (let angle of angles) {
            let radius = baseRadius * random(0.75, 1.25);
            this.vertices.push(createVector(cos(angle) * radius, sin(angle) * radius));
            if (radius > this.maxRadius) this.maxRadius = radius;
        }

        this.color = color(random(120, 180)); // Lighter gray for better visibility
        this.destroyed = false;
    }

    update() {
        if (this.destroyed) return;
        this.pos.add(this.vel);
        this.angle += this.rotationSpeed;
        this.angle = (this.angle + TWO_PI) % TWO_PI;
    }

    draw() {
        if (this.destroyed) return;

        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle);

        fill(this.color);
       // stroke(80);
       // strokeWeight(2);

        // Draw a square using vertices, inscribed in the collision circle
        let r = this.size / 2;
        let s = r * Math.SQRT1_2; // side from center to corner for inscribed square
        beginShape();
        vertex(-s, -s);
        vertex(s, -s);
        vertex(s, s);
        vertex(-s, s);
        endShape(CLOSE);
        pop();

        // --- Draw Health Bar ---
        if (this.health < this.maxHealth && this.maxHealth > 0) {
            let healthPercent = this.health / this.maxHealth;
            let barW = this.size * 0.7;
            let barH = 5;
            let barX = this.pos.x - barW / 2;
            let barY = this.pos.y - r - 14;

            push();
            noStroke();
            fill(255, 0, 0);
            rect(barX, barY, barW, barH);
            fill(0, 255, 0);
            rect(barX, barY, barW * healthPercent, barH);
            pop();
        }

        // --- Draw Collision Circle for Debugging ---
        push();
        noFill();
        stroke(0, 255, 255, 120);
        strokeWeight(1);
        ellipse(this.pos.x, this.pos.y, r * 2, r * 2);
        pop();
    }

    /**
     * Applies damage to the asteroid's health.
     */
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

    /**
     * Improved collision: use maxRadius to cover all rotations.
     * @param {object} target - Object with pos {x, y} and size properties.
     * @returns {boolean} True if collision detected based on overlapping circular bounds.
     */
    checkCollision(target) {
        if (!target || !target.pos || typeof target.size !== 'number') {
            return false;
        }
        let dSq = sq(this.pos.x - target.pos.x) + sq(this.pos.y - target.pos.y);
        let targetRadius = target.size / 2;
        let sumRadii = targetRadius + this.maxRadius;
        return dSq < sq(sumRadii);
    }

} // End of Asteroid Class