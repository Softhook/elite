// ****** enemy.js ******

class Enemy {
    constructor(x, y, playerRef) {
        this.pos = createVector(x, y); // World coordinates
        this.vel = createVector(random(-1, 1), random(-1, 1)).mult(0.5); // Start with slight random drift
        this.angle = 0;
        this.size = 25; // Diameter
        this.maxSpeed = 1.5;
        this.maxForce = 0.05; // Steering force
        this.hull = 30;
        this.maxHull = 30;
        this.color = color(255, 50, 50);
        this.strokeColor = color(255, 150, 150);

        this.target = playerRef; // Reference to the player object
        this.detectionRange = 400;
        this.firingRange = 300;
        this.fireCooldown = random(0.5, 2.0); // Stagger initial firing
        this.fireRate = 1.5; // Seconds between shots
        this.destroyed = false;
    }

    // Calculates steering force towards a target world position
    seek(targetPos) {
        let desired = p5.Vector.sub(targetPos, this.pos);
        // Don't normalize if already close to avoid jitter? Optional.
        // let d = desired.mag();
        // if (d < 10) { desired.setMag(map(d, 0, 10, 0, this.maxSpeed)); }
        // else { desired.setMag(this.maxSpeed); }
        desired.setMag(this.maxSpeed); // Simple version: always desire max speed towards target

        let steer = p5.Vector.sub(desired, this.vel);
        steer.limit(this.maxForce);
        return steer;
    }

    // Update enemy state (AI, movement, firing)
    update(system) { // Pass system reference for adding projectiles
        if (this.destroyed) return;

        // Update cooldown timer
        this.fireCooldown -= deltaTime / 1000;

        // Basic AI logic
        if (this.target) { // Check if target (player) exists
            let distanceToTarget = dist(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);

            // If player is within detection range, react
            if (distanceToTarget < this.detectionRange) {
                // Calculate steering force towards the player
                let force = this.seek(this.target.pos);
                this.vel.add(force);
                this.vel.limit(this.maxSpeed); // Apply speed limit

                // Aim towards target (or face direction of movement)
                 this.angle = this.vel.heading(); // Point in direction of velocity (preferred)
                 // let angleToPlayer = atan2(this.target.pos.y - this.pos.y, this.target.pos.x - this.pos.x);
                 // this.angle = degrees(angleToPlayer); // Alternative: always point directly at player

                // Fire weapon if in range and cooldown ready
                if (distanceToTarget < this.firingRange && this.fireCooldown <= 0) {
                    this.fire(system); // Call fire method
                    this.fireCooldown = this.fireRate; // Reset cooldown
                }
            } else {
                // If player is outside detection range, maybe wander or slow down
                this.vel.mult(0.98); // Simple drag/slowdown
            }
        } else {
            // If no target (e.g., player destroyed?), just drift and slow down
            this.vel.mult(0.98);
        }

        // Update position based on velocity
        this.pos.add(this.vel);

        // NO MORE SCREEN WRAPPING
        // this.wrapAround();
    }

    // Fire a projectile towards the current target (player)
    fire(system) {
        if (!this.target || !system) return; // Safety checks

        // Calculate angle towards player's current world position
        let angleToPlayer = atan2(this.target.pos.y - this.pos.y, this.target.pos.x - this.pos.x);
        // Note: Assuming atan2 returns radians here, which Projectile expects. If issues persist, might need radians() wrapper here too.

        // Calculate spawn position slightly ahead of the enemy ship nose
        let spawnOffset = p5.Vector.fromAngle(this.angle).mult(this.size / 2 + 5); // angle is likely radians from vel.heading()
        let spawnPos = p5.Vector.add(this.pos, spawnOffset);

        // Create enemy projectile (slower, less damage than player?)
        let proj = new Projectile(spawnPos.x, spawnPos.y, angleToPlayer, 'ENEMY', 5, 5);
        system.addProjectile(proj); // Add to the system's projectile list
    }

    // Draw the enemy ship
    draw() {
        if (this.destroyed) return; // Don't draw if destroyed
        push();
        translate(this.pos.x, this.pos.y); // Move to enemy's world position
        rotate(degrees(this.angle)); // Rotate (vel.heading() returns radians, rotate() needs degrees if angleMode is DEGREES)
        fill(this.color);
        stroke(this.strokeColor);
        strokeWeight(1);
        // Simple triangle shape pointing right
        let r = this.size / 2;
        triangle(r, 0, -r, -r*0.7, -r, r*0.7);
        pop();
    }

    // Reduce hull on taking damage
    takeDamage(amount) {
        if (this.destroyed || amount <= 0) return; // Ignore if already dead or no damage
        this.hull -= amount;
        if (this.hull <= 0) {
            this.hull = 0;
            this.destroyed = true;
            console.log("Enemy destroyed!");
            // Could trigger explosion effect here
        }
    }

    // Check if enemy is destroyed
    isDestroyed() {
        return this.destroyed;
    }

    // --- NO wrapAround() method ---

} // End of Enemy Class