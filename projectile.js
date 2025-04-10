// ****** projectile.js ******

class Projectile {
    // Angle parameter here is expected by Player.fire() to be in RADIANS
    constructor(x, y, angle, owner, speed = 8, damage = 10) {
        this.pos = createVector(x, y);
        this.owner = owner; // "PLAYER" or "ENEMY"
        this.damage = damage;
        this.size = (owner === 'PLAYER') ? 4 : 3;
        this.color = (owner === 'PLAYER') ? color(0, 255, 0) : color(255, 0, 0);
        this.lifespan = 90; // Frames before disappearing

        // --- Debugging the Velocity Calculation ---
        console.log(`Projectile (${this.owner}) received angle (radians): ${angle.toFixed(3)}`);

        // p5.Vector.fromAngle requires RADIANS. Player.fire() uses atan2 which returns radians.
        this.vel = p5.Vector.fromAngle(angle).mult(speed);

        console.log(`Projectile calculated velocity: (${this.vel.x.toFixed(2)}, ${this.vel.y.toFixed(2)})`);
        // --- End Debugging ---

    }

    update() {
        // Simple linear motion
        this.pos.add(this.vel);
        this.lifespan--;
    }

    draw() {
        push();
        fill(this.color);
        noStroke();
        ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2); // Draw as ellipse

        // --- Optional: Draw velocity vector ---
        // stroke(255, 100); // White, faint
        // line(this.pos.x, this.pos.y, this.pos.x + this.vel.x * 5, this.pos.y + this.vel.y * 5);
        // --- End Optional Draw ---

        pop();
    }

    // Basic circle collision check against a target object with pos and size properties
    checkCollision(target) {
        // Basic safety check for target validity
        if (!target || typeof target.pos === 'undefined' || typeof target.size === 'undefined') {
            // console.error("Invalid target for collision check:", target); // Can be noisy
            return false;
        }
        // Calculate distance between centers
        let d = dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
        // Collision occurs if distance is less than sum of radii (target.size is diameter)
        let targetRadius = target.size / 2;
        let projectileRadius = this.size; // Using this.size as radius here for simplicity
        return d < targetRadius + projectileRadius;
    }

    // Check if projectile is off screen (basic bounds check)
    isOffScreen() {
        let buffer = this.size * 2; // Add a small buffer
        return (this.pos.x < -buffer || this.pos.x > width + buffer || this.pos.y < -buffer || this.pos.y > height + buffer);
    }
}