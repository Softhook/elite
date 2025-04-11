// ****** asteroid.js ******

class Asteroid {
    constructor(x, y, size) {
        this.pos = createVector(x, y); // World coordinates
        this.size = size; // Average diameter
        this.maxHealth = floor(size * 2); // Health scales with size
        this.health = this.maxHealth;

        // Random initial velocity and rotation
        this.vel = p5.Vector.random2D().mult(random(0.1, 0.8)); // Slow random drift
        this.angle = random(TWO_PI); // Radians
        this.rotationSpeed = random(-0.01, 0.01); // Radians per frame

        // Generate irregular shape vertices
        this.vertices = [];
        let numVertices = floor(random(6, 12)); // Random number of points
        for (let i = 0; i < numVertices; i++) {
            let angle = map(i, 0, numVertices, 0, TWO_PI);
            // Vary radius for irregularity
            let r = this.size / 2 * random(0.7, 1.3);
            this.vertices.push(createVector(cos(angle) * r, sin(angle) * r));
        }

        this.color = color(random(100, 160)); // Shades of grey
        this.destroyed = false;
    }

    update() {
        if (this.destroyed) return;
        // Update position and rotation
        this.pos.add(this.vel);
        this.angle += this.rotationSpeed;
    }

    draw() {
        if (this.destroyed) return;
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle); // Apply rotation (radians)

        // Draw irregular polygon shape
        fill(this.color);
        stroke(red(this.color) * 1.2, green(this.color) * 1.2, blue(this.color) * 1.2); // Slightly lighter stroke
        strokeWeight(1);
        beginShape();
        for (let v of this.vertices) {
            vertex(v.x, v.y);
        }
        endShape(CLOSE);

        // Optional: Draw health bar (only if damaged)
        if (this.health < this.maxHealth) {
            let healthPercent = this.health / this.maxHealth;
            let barW = this.size * 0.8;
            let barH = 4;
            let barY = -this.size / 2 - 8; // Position above asteroid
            fill(255, 0, 0); // Red background
            rect(-barW / 2, barY, barW, barH);
            fill(0, 255, 0); // Green foreground
            rect(-barW / 2, barY, barW * healthPercent, barH);
        }

        pop();
    }

    takeDamage(amount) {
        if (this.destroyed || amount <= 0) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.destroyed = true;
            console.log("Asteroid destroyed!");
            // Could trigger breakApart() here later
        }
    }

    isDestroyed() {
        return this.destroyed;
    }

    // Simple circle collision check (using average size)
    checkCollision(target) {
        if (!target || !target.pos || target.size === undefined) return false;
        let d = dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
        let targetRadius = target.size / 2;
        let myRadius = this.size / 2;
        return d < targetRadius + myRadius;
    }

    // Optional: Later implement breaking into smaller pieces
    // breakApart() { ... }
}