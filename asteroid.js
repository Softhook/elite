// ****** asteroid.js ******

class Asteroid {
    /**
     * Creates an Asteroid instance.
     * @param {number} x - Initial world X coordinate.
     * @param {number} y - Initial world Y coordinate.
     * @param {number} size - Average diameter of the asteroid.
     */
    constructor(x, y, size) {
        this.pos = createVector(x, y); // World coordinates
        // --- Increase Default Size Range ---
        this.size = size || random(40, 90); // Default size range 40-90
        // ----------------------------------
        this.maxHealth = floor(this.size * 1.5); // Health scales with size (Adjusted scaling factor?)
        this.health = this.maxHealth;

        // Physics properties
        this.vel = p5.Vector.random2D().mult(random(0.1, 0.6)); // Slightly slower max drift?
        this.angle = random(TWO_PI); // Initial facing angle (RADIANS)
        this.rotationSpeed = random(-0.01, 0.01); // Rotation speed (RADIANS per frame)

        // Procedural shape generation
        this.vertices = []; // Array to store p5.Vector vertices relative to center (0,0)
        let numVertices = floor(random(7, 14)); // More vertices for larger size?
        // console.log(`Asteroid Size: ${this.size.toFixed(1)}, Vertices: ${numVertices}`);
        for (let i = 0; i < numVertices; i++) {
            let angle = map(i, 0, numVertices, 0, TWO_PI);
            let r = this.size / 2 * random(0.6, 1.4); // Allow more variation?
            r = max(this.size * 0.2, r); // Minimum 20% radius
            this.vertices.push(createVector(cos(angle) * r, sin(angle) * r));
        }
        if (this.vertices.length < 3) { // Ensure at least 3 vertices
            console.warn("Failed to generate sufficient asteroid vertices, creating default circle.");
            this.vertices = []; // Clear potentially bad vertices
            let r = this.size/2;
             this.vertices.push(createVector(r, 0));
             this.vertices.push(createVector(-r*0.5, r*0.866)); // approx equilateral triangle
             this.vertices.push(createVector(-r*0.5, -r*0.866));
        }

        // Visuals
        this.color = color(random(90, 150)); // Slightly adjusted grey range?

        // State
        this.destroyed = false;
    }

    /**
     * Updates the asteroid's position and rotation.
     */
    update() {
        if (this.destroyed) return;
        this.pos.add(this.vel);
        this.angle += this.rotationSpeed;
        this.angle = (this.angle + TWO_PI) % TWO_PI; // Normalize angle
    }

    /**
     * Draws the asteroid at its current world position and orientation.
     * Health bar is drawn horizontally regardless of asteroid rotation.
     */
    draw() {
        if (this.destroyed) return;

        // --- Draw Asteroid Body (Rotated) ---
        push(); // Isolate transformations for the body
        translate(this.pos.x, this.pos.y); // Move origin to asteroid's world position
        rotate(degrees(this.angle)); // Apply rotation (convert radians to degrees)

        // Draw irregular polygon shape
        fill(this.color);
        stroke(min(255, red(this.color) * 1.2), min(255, green(this.color) * 1.2), min(255, blue(this.color) * 1.2));
        strokeWeight(1);

        if (this.vertices.length > 2) {
            beginShape();
            for (let v of this.vertices) {
                vertex(v.x, v.y);
            }
            endShape(CLOSE);
        } else {
            // Fallback drawing if vertices are wrong
            ellipse(0, 0, this.size, this.size);
        }
        pop(); // Restore matrix (removes translate and rotate)
        // --- End Asteroid Body ---


        // --- Draw Health Bar (Horizontal - AFTER popping rotation) ---
        if (this.health < this.maxHealth && this.maxHealth > 0) {
            let healthPercent = this.health / this.maxHealth;
            let barW = this.size * 0.7; // Width relative to asteroid size
            let barH = 5; // Slightly thicker bar?
            // Position ABOVE the asteroid's world position
            let barX = this.pos.x - barW / 2; // Centered horizontally on asteroid's world X
            let barY = this.pos.y - this.size / 2 - 10; // Positioned above the asteroid's world Y

            push(); // Isolate health bar style
            noStroke();
            // Draw red background bar
            fill(255, 0, 0);
            rect(barX, barY, barW, barH);
            // Draw green foreground bar representing current health
            fill(0, 255, 0);
            rect(barX, barY, barW * healthPercent, barH);
            pop(); // Restore style
        }
        // --- End Health Bar ---
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
            console.log("Asteroid destroyed!");
        }
    }

    /** @returns {boolean} True if the asteroid is destroyed. */
    isDestroyed() {
        return this.destroyed;
    }

    /**
     * Basic circle-based collision check using the asteroid's average size.
     * This is an approximation for performance. More accurate polygon collision is complex.
     * @param {object} target - Object with pos {x, y} and size properties.
     * @returns {boolean} True if collision detected based on overlapping circular bounds.
     */
    checkCollision(target) {
        // Check if target is valid and has necessary properties
        if (!target || !target.pos || typeof target.size !== 'number') {
             // console.warn("Asteroid checkCollision: Invalid target provided.", target); // Can be noisy
             return false;
        }
        // Calculate distance between centers (squared distance is often faster if only comparing)
        let dSq = sq(this.pos.x - target.pos.x) + sq(this.pos.y - target.pos.y);
        // Calculate sum of radii
        let targetRadius = target.size / 2;
        let myRadius = this.size / 2;
        let sumRadii = targetRadius + myRadius;
        // Collision occurs if distance squared is less than sum of radii squared
        return dSq < sq(sumRadii);
    }

} // End of Asteroid Class