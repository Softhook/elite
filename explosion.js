/**
 * Explosion class creates particle-based explosions when ships are destroyed.
 * The animation has multiple phases - initial flash, debris ejection, and fading smoke.
 */
class Explosion {
    constructor(x, y, size, baseColor = [255, 160, 30], isSurface = false) {
        // Create position vector just once (reused by reset)
        this.pos = createVector(0, 0);

        // Initialize empty arrays (reused by reset)
        this.particles = [];
        this.debris = [];

        // Set default values (will be overridden by reset)
        this.size = 30;
        this.baseColor = [255, 160, 30];
        this.duration = 60;
        this.currentFrame = 0;
        this.isSurface = isSurface;

        // Call reset if parameters provided
        if (x !== undefined) {
            this.reset(x, y, size, baseColor, isSurface);
        }
    }

    /**
     * Reset method for object pooling
     * @param {number} x - X position of explosion
     * @param {number} y - Y position of explosion
     * @param {number} size - Size of explosion
     * @param {Array} baseColor - Base color of explosion
     * @param {boolean} isSurface - Whether this is a surface mode explosion
     */
    reset(x, y, size, baseColor = [255, 160, 30], isSurface = false) {
        // Update position vector
        this.pos.set(x, y);

        // Set/reset properties
        this.size = size || 30;
        this.baseColor = baseColor;
        this.duration = 60; // Frames until complete
        this.currentFrame = 0;
        this.isSurface = isSurface;

        // Clear arrays for reuse
        this.particles.length = 0;
        this.debris.length = 0;

        // Create initial explosion particles
        this.generateParticles();
        this.generateDebris();

        // Play sound via the manager, passing position and listener
        // Ensure 'player' global object is accessible
        if (soundManager && player?.pos) {
            soundManager.playExplosion(this.size, this.pos.x, this.pos.y, player.pos, this);
        }
    }

    generateParticles() {
        // Create main explosion particles
        const particleCount = floor(this.size / 2) + 15;

        for (let i = 0; i < particleCount; i++) {
            const angle = random(TWO_PI);
            // More consistent particle speed with better size scaling
            const speed = random(1, 4) * constrain(this.size / 30, 0.5, 3);
            const vel = p5.Vector.fromAngle(angle).mult(speed);

            // Randomize particle properties
            this.particles.push({
                pos: this.pos.copy(),
                vel: vel,
                size: random(this.size / 5, this.size / 2.5),
                color: [...this.baseColor],
                opacity: 255,
                decay: random(3, 6),
                drag: random(0.92, 0.96)
            });
        }

        // Add bright core particles
        for (let i = 0; i < particleCount / 2; i++) {
            const angle = random(TWO_PI);
            const speed = random(0.5, 3) * constrain(this.size / 30, 0.5, 2.5);
            const vel = p5.Vector.fromAngle(angle).mult(speed);

            this.particles.push({
                pos: this.pos.copy(),
                vel: vel,
                size: random(this.size / 6, this.size / 3),
                color: [255, 255, 220], // Bright yellow-white center
                opacity: 255,
                decay: random(5, 10),
                drag: random(0.9, 0.95)
            });
        }
    }

    generateDebris() {
        // Create ship debris particles
        const debrisCount = floor(this.size / 8) + 5;

        for (let i = 0; i < debrisCount; i++) {
            const angle = random(TWO_PI);
            // Reduce speed range to keep debris closer
            const speed = random(1.5, 4.5) * constrain(this.size / 30, 0.6, 1.8);
            const vel = p5.Vector.fromAngle(angle).mult(speed);

            // Make debris smaller
            const size = random(2, 5);
            const rotation = random(TWO_PI);
            // Adjust rotation for radians
            const rotSpeed = random(-0.05, 0.05);

            this.debris.push({
                pos: this.pos.copy(),
                vel: vel,
                size: size,
                rotation: rotation,
                rotSpeed: rotSpeed,
                vertices: this.generateDebrisShape(size),
                color: this.adjustColor([...this.baseColor], -30), // Darker than base
                opacity: 255,
                decay: random(1.5, 3),
                // Increase drag to slow debris faster
                drag: random(0.94, 0.96)
            });
        }
    }

    generateDebrisShape(size) {
        // Create random polygon shape for debris
        const vertices = [];
        const pointCount = floor(random(3, 6));

        for (let i = 0; i < pointCount; i++) {
            const angle = map(i, 0, pointCount, 0, TWO_PI);
            const radius = size * random(0.5, 1.0);
            vertices.push(createVector(cos(angle) * radius, sin(angle) * radius));
        }

        return vertices;
    }

    adjustColor(color, amount) {
        // Adjust color brightness while keeping within valid range
        return color.map(c => constrain(c + amount, 0, 255));
    }

    update() {
        this.currentFrame++;

        // Generate second wave of particles
        if (this.currentFrame === 5) {
            this.generateSecondaryExplosion();
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            // Scale decay by deltaTime for consistent animation speed
            const timeScale = deltaTime ? (deltaTime / 16.67) : 1;
            p.pos.add(p5.Vector.mult(p.vel, timeScale));
            p.vel.mult(Math.pow(p.drag, timeScale));
            p.opacity -= p.decay * timeScale;

            if (p.opacity <= 0) {
                // O(1) swap-and-pop removal (order doesn't matter for particles)
                const lastIdx = this.particles.length - 1;
                if (i !== lastIdx) this.particles[i] = this.particles[lastIdx];
                this.particles.pop();
            }
        }

        // Update debris
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            const timeScale = deltaTime ? (deltaTime / 16.67) : 1;
            d.pos.add(p5.Vector.mult(d.vel, timeScale));
            d.vel.mult(Math.pow(d.drag, timeScale));
            d.rotation += d.rotSpeed * timeScale;
            d.opacity -= d.decay * timeScale;

            if (d.opacity <= 0) {
                // O(1) swap-and-pop removal (order doesn't matter for debris)
                const lastIdx = this.debris.length - 1;
                if (i !== lastIdx) this.debris[i] = this.debris[lastIdx];
                this.debris.pop();
            }
        }
    }

    generateSecondaryExplosion() {
        // Add secondary burst
        const burstCount = floor(this.size / 4) + 8;

        for (let i = 0; i < burstCount; i++) {
            const angle = random(TWO_PI);
            // Reduce speed of secondary burst
            const speed = random(2, 4) * constrain(this.size / 30, 0.5, 1.5);
            const vel = p5.Vector.fromAngle(angle).mult(speed);

            this.particles.push({
                pos: this.pos.copy(),
                vel: vel,
                size: random(this.size / 4, this.size / 2),
                color: this.adjustColor([...this.baseColor], 50), // Brighter
                opacity: 200,
                decay: random(4, 8),
                drag: random(0.92, 0.96)
            });
        }
    }

    draw() {
        push();
        blendMode(ADD); // Makes overlapping particles brighter
        noStroke();

        // Draw initial flash
        if (this.currentFrame < 10) {
            const flashOpacity = map(this.currentFrame, 0, 10, 150, 0);
            const flashSize = this.size * map(this.currentFrame, 0, 10, 1.0, 2.0);
            fill(255, 255, 200, flashOpacity);
            ellipse(this.pos.x, this.pos.y, flashSize, flashSize);
        }

        // Draw particles
        for (let i = 0, len = this.particles.length; i < len; i++) {
            const p = this.particles[i];
            fill(p.color[0], p.color[1], p.color[2], p.opacity);
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
        }

        // Reset blend mode for debris
        blendMode(BLEND);

        // Draw debris
        for (let i = 0, len = this.debris.length; i < len; i++) {
            const d = this.debris[i];
            push();
            translate(d.pos.x, d.pos.y);
            rotate(d.rotation % TWO_PI); // Normalize rotation angle
            fill(d.color[0], d.color[1], d.color[2], d.opacity);
            stroke(0, min(d.opacity, 100));
            strokeWeight(1);

            beginShape();
            for (let j = 0, vlen = d.vertices.length; j < vlen; j++) {
                const v = d.vertices[j];
                vertex(v.x, v.y);
            }
            endShape(CLOSE);
            pop();
        }

        pop();
    }

    isDone() {
        return this.particles.length === 0 &&
            this.debris.length === 0 &&
            this.currentFrame > 10;
    }

    toJSON() {
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            size: this.size,
            baseColor: Array.isArray(this.baseColor) ? this.baseColor : this.baseColor,
            duration: this.duration,
            currentFrame: this.currentFrame,
            // particles and debris are transient; we store a minimal fingerprint
            particlesCount: this.particles.length,
            debrisCount: this.debris.length
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        const e = new Explosion((data.pos && data.pos.x) || 0, (data.pos && data.pos.y) || 0, data.size || 30, data.baseColor || [255, 160, 30]);
        e.duration = data.duration || e.duration;
        e.currentFrame = data.currentFrame || e.currentFrame;
        // Do not attempt to fully reconstruct particles/debris; they will regenerate on reset as needed
        return e;
    }
}