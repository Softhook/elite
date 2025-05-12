// ****** projectile.js ******

class Projectile {
        constructor(x, y, angle, owner, speed = 8, damage = 10, colorOverride = null, 
           type = "projectile", target = null, lifespan = 90, turnRate = 0, 
           missileSpeed = 0, dragDuration = 5.0, dragMultiplier = 10.0) {
        // Create vectors just once at construction time
        this.pos = createVector(0, 0);
        this.vel = createVector(0, 0);
        
        // Set default values (will be overridden by reset())
        this.size = 3;
        this.lifespan = 90; // Default lifespan
        this.initialLifespan = 90; // Store initial for reset
        this.damage = 10;
        this.owner = null;
        this.type = "projectile";
        this.target = null; // For homing missiles
        this.color = color(255, 0, 0);
        this.turnRate = 0; // For homing missiles
        this.missileSpeed = 0; // Specific speed for missiles

        this.dragDuration = dragDuration;
        this.dragMultiplier = dragMultiplier;

        // Call reset if parameters provided
        if (x !== undefined) {
            this.reset(x, y, angle, owner, speed, damage, colorOverride, type, target, 
                    lifespan, turnRate, missileSpeed, dragDuration, dragMultiplier);
        }
    }

    // Reset method for object pooling
    reset(x, y, angle, owner, speed = 8, damage = 10, colorOverride = null, 
     type = "projectile", target = null, lifespan = 90, turnRate = 0, 
     missileSpeed = 0, dragDuration = 5.0, dragMultiplier = 10.0) {
        try {
            // Validate position inputs
            if (isNaN(x) || isNaN(y)) {
                console.warn(`Invalid projectile position: x=${x}, y=${y}`);
                if (owner && owner.pos) {
                    x = owner.pos.x;
                    y = owner.pos.y;
                } else {
                    x = 0; y = 0; // Last resort
                }
            }
            
            this.pos.set(x, y);
            this.owner = owner;
            this.type = type;
            this.target = target; // Store the target for homing
            this.turnRate = turnRate;
            this.missileSpeed = missileSpeed || speed; // Use missileSpeed if provided, else general speed

            this.dragDuration = dragDuration;
            this.dragMultiplier = dragMultiplier;

            // Apply spawn offset (reuse velocity vector temporarily)
            if (owner && owner.size) {
                this.vel.set(1, 0).rotate(angle).mult(owner.size * 1.2);
                this.pos.add(this.vel);
            }


            // Use weapon upgrade if owner is Player or Enemy with a weapon
            if (owner && owner.currentWeapon) {
                this.damage = owner.currentWeapon.damage;
                
                if (this.color) {
                    this.color.setRed(owner.currentWeapon.color[0]);
                    this.color.setGreen(owner.currentWeapon.color[1]);
                    this.color.setBlue(owner.currentWeapon.color[2]);
                } else {
                    this.color = color(...owner.currentWeapon.color);
                }
                
                this.type = owner.currentWeapon.type; // Ensure type is from weapon
                // Missile-specific properties from weapon definition
                if (this.type === "missile") {
                    this.missileSpeed = owner.currentWeapon.speed || speed;
                    this.turnRate = owner.currentWeapon.turnRate || 0;
                    this.initialLifespan = owner.currentWeapon.lifespan || lifespan;
                } else {
                    this.initialLifespan = lifespan; // Default lifespan for non-missiles
                }
            } else { // Fallback if no owner or currentWeapon
                this.damage = damage;
                if (this.color && colorOverride) {
                    this.color.setRed(colorOverride[0]);
                    this.color.setGreen(colorOverride[1]);
                    this.color.setBlue(colorOverride[2]);
                } else {
                    this.color = colorOverride ? color(...colorOverride) : color(255, 0, 0);
                }
                this.initialLifespan = lifespan;
            }
            
            this.size = (owner && owner instanceof Player) ? 4 : 3;
            if (this.type === "missile") {
                this.size = owner.currentWeapon.projectileSize;
            }
            this.lifespan = this.initialLifespan;
            
            // Set velocity vector
            const effectiveSpeed = (this.type === "missile") ? this.missileSpeed : speed;
            this.vel.set(1, 0).rotate(angle).mult(effectiveSpeed);
            
            return this;
        } catch (e) {
            console.error("Error resetting projectile:", e);
            this.pos.set(0, 0);
            this.vel.set(0, 0);
            this.size = 3;
            this.lifespan = 1; // Make it expire quickly
            this.damage = 0;
            this.type = "error";
            return this;
        }
    }

    update() {
        // Homing missile logic
        if (this.type === "missile" && this.target && this.target.pos && !this.target.destroyed && (this.target.hull === undefined || this.target.hull > 0)) {
            // Calculate desired direction vector
            let desiredVel = p5.Vector.sub(this.target.pos, this.pos);
            desiredVel.setMag(this.missileSpeed); // Set to missile's defined speed

            // Calculate steering force
            let steer = p5.Vector.sub(desiredVel, this.vel);
            // Scale turnRate by deltaTime for frame-rate independence, assuming deltaTime is in ms
            // If deltaTime is 1 for 60fps, then 16.67 is the target ms per frame.
            // Adjust this scaling factor if your deltaTime is different (e.g., if it's already in seconds, multiply by turnRate directly)
            const timeCorrection = deltaTime ? (deltaTime / (1000/60)) : 1; // Assumes 60 FPS target for scaling
            steer.limit(this.turnRate * timeCorrection); 

            this.vel.add(steer);
            this.vel.setMag(this.missileSpeed); // Re-normalize to maintain constant speed after steering
        }
        
        // Move projectile
        this.pos.add(this.vel);
        this.lifespan--;
    }

    draw() {
        push();
        if (this.type === "missile") {
            translate(this.pos.x, this.pos.y);
            rotate(this.vel.heading()); // Point in direction of velocity
            fill(this.color);
            noStroke();
            // Simple triangle shape for missile
            triangle(-this.size * 1.5, -this.size * 0.7,
                     -this.size * 1.5,  this.size * 0.7,
                      this.size * 1.3,  0);
            // Optional: Add a small particle trail (can be expanded with a particle system)
            fill(255, constrain(this.lifespan * 3, 0, 150), 0, constrain(this.lifespan * 2, 0, 100)); // Fading orange trail
            ellipse(-this.size * 2, 0, this.size * 1.5, this.size * 0.8);

            } else if (this.type === "tangle") { // Add this section
            translate(this.pos.x, this.pos.y);
            
            // Energy field background
            noStroke();
            fill(this.color[0], this.color[1], this.color[2], 60);
            ellipse(0, 0, this.size * 3, this.size * 2);
            
            // Core
            fill(this.color[0], this.color[1], this.color[2], 150);
            ellipse(0, 0, this.size * 1.5, this.size * 1.5);
            
            // Bright center
            fill(255, 255, 255, 180);
            ellipse(0, 0, this.size * 0.5, this.size * 0.5);
            
            // Energy strands
            stroke(this.color[0], this.color[1], this.color[2], 200);
            strokeWeight(1.5);
            noFill();
        
            // Draw tethers/tendrils
            for (let i = 0; i < 8; i++) {
                const angle = (frameCount * 0.1 + i * PI/4) % TWO_PI;
                beginShape();
                for (let j = 0; j < 4; j++) {
                    const radius = map(j, 0, 3, this.size * 0.5, this.size * 1.8);
                    const jitter = map(j, 0, 3, 0, this.size * 0.3);
                    const x = cos(angle + j * 0.2) * radius + random(-jitter, jitter);
                    const y = sin(angle + j * 0.2) * radius + random(-jitter, jitter);
                    vertex(x, y);
                }
                endShape();
            }
        } else { // Standard projectile drawing
            fill(this.color);
            noStroke();
            ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
        }
        pop();
    }

    // Collision check against any target that has pos and size
    checkCollision(target) {
        if (!target || !target.pos || typeof target.size !== 'number') return false;
        let d = dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
        let targetRadius = target.size / 2;
        let projectileRadius = this.size;
        
        return d < (targetRadius + projectileRadius);
    }
    
    isOffScreen() {
        const playerPos = this.system?.player?.pos || createVector(0, 0);
        
        // Calculate screen coordinates relative to player/camera
        const screenX = width/2 + (this.pos.x - playerPos.x);
        const screenY = height/2 + (this.pos.y - playerPos.y);
        
        const margin = 100;
        
        return (screenX < -margin || 
                screenX > width + margin || 
                screenY < -margin || 
                screenY > height + margin);
    }
}
