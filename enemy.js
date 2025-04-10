class Enemy {
    constructor(x, y, playerRef) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.angle = 0;
        this.size = 25; // Diameter
        this.maxSpeed = 1.5;
        this.maxForce = 0.05; // Steering force
        this.hull = 30; // Less health than player
        this.maxHull = 30;
        this.color = color(255, 50, 50);
        this.strokeColor = color(255, 150, 150);

        this.target = playerRef; // Reference to the player object
        this.detectionRange = 400;
        this.firingRange = 300;
        this.fireCooldown = 0;
        this.fireRate = 1.5; // Seconds between shots
        this.destroyed = false;
    }

    seek(targetPos) {
        let desired = p5.Vector.sub(targetPos, this.pos);
        desired.setMag(this.maxSpeed);
        let steer = p5.Vector.sub(desired, this.vel);
        steer.limit(this.maxForce);
        return steer;
    }

    update(system) { // Pass system to allow firing
        if (this.destroyed) return;

        this.fireCooldown -= deltaTime / 1000;

        if (this.target) {
            let distanceToTarget = dist(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);

            if (distanceToTarget < this.detectionRange) {
                // Seek the target
                let force = this.seek(this.target.pos);
                this.vel.add(force);
                this.vel.limit(this.maxSpeed);

                 // Aim towards target
                this.angle = this.vel.heading(); // Make enemy face direction of movement

                // Fire if in range and cooldown ready
                if (distanceToTarget < this.firingRange && this.fireCooldown <= 0) {
                     this.fire(system);
                     this.fireCooldown = this.fireRate;
                }
            } else {
                 // Simple wander or idle behavior (just slow down for MVP)
                 this.vel.mult(0.95);
            }
        } else {
             // No target? Slow down.
             this.vel.mult(0.95);
        }


        this.pos.add(this.vel);
        // Basic screen wrapping (optional)
        this.wrapAround();
    }

     fire(system) {
         // Calculate angle towards player
         let angleToPlayer = atan2(this.target.pos.y - this.pos.y, this.target.pos.x - this.pos.x);
         // Add slight inaccuracy? (optional)
         // angleToPlayer += random(-0.1, 0.1);

         // Create projectile slightly ahead of the enemy ship
         let spawnOffset = p5.Vector.fromAngle(this.angle).mult(this.size / 2 + 5);
         let spawnPos = p5.Vector.add(this.pos, spawnOffset);

         let proj = new Projectile(spawnPos.x, spawnPos.y, angleToPlayer, 'ENEMY', 5, 5); // Enemy shots slower/weaker
         system.addProjectile(proj); // Add to the system's list
    }


    draw() {
        if (this.destroyed) return;
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle); // Use calculated angle
        fill(this.color);
        stroke(this.strokeColor);
        strokeWeight(1);
        // Simple triangle shape for enemy
        triangle(-this.size / 2, -this.size / 3, -this.size / 2, this.size / 3, this.size / 2, 0);
        pop();

        // Optional: Draw health bar
        // fill(255,0,0);
        // rect(this.pos.x - this.size/2, this.pos.y - this.size/2 - 10, this.size, 5);
        // fill(0,255,0);
        // let healthW = map(this.hull, 0, this.maxHull, 0, this.size);
        // rect(this.pos.x - this.size/2, this.pos.y - this.size/2 - 10, healthW, 5);
    }

    takeDamage(amount) {
        this.hull -= amount;
        if (this.hull <= 0) {
            this.hull = 0;
            this.destroyed = true;
            console.log("Enemy destroyed!");
            // Trigger explosion effect later
        }
    }

    isDestroyed() {
        return this.destroyed;
    }

     wrapAround() {
        if (this.pos.x < -this.size/2) this.pos.x = width + this.size/2;
        if (this.pos.x > width + this.size/2) this.pos.x = -this.size/2;
        if (this.pos.y < -this.size/2) this.pos.y = height + this.size/2;
        if (this.pos.y > height + this.size/2) this.pos.y = -this.size/2;
    }
}