// ****** projectile.js ******

class Projectile {
    constructor(x, y, angle, owner, speed = 8, damage = 10, colorOverride = null, type = "projectile", target = null) {
        // Create vectors just once at construction time
        this.pos = createVector(0, 0);
        this.vel = createVector(0, 0);
        
        // Set default values (will be overridden by reset())
        this.size = 3;
        this.lifespan = 90;
        this.damage = 10;
        this.owner = null;
        this.type = "projectile";
        this.target = null;
        this.color = color(255, 0, 0);
        
        // Call reset if parameters provided
        if (x !== undefined) {
            this.reset(x, y, angle, owner, speed, damage, colorOverride, type, target);
        }
    }

    // Reset method for object pooling
    reset(x, y, angle, owner, speed = 8, damage = 10, colorOverride = null, type = "projectile", target = null) {
        try {
            // Validate position inputs
            if (isNaN(x) || isNaN(y)) {
                console.warn(`Invalid projectile position: x=${x}, y=${y}`);
                // Use owner position if available
                if (owner && owner.pos) {
                    x = owner.pos.x;
                    y = owner.pos.y;
                } else {
                    x = 0; y = 0; // Last resort
                }
            }
            
            // Reset position without creating a new vector
            this.pos.set(x, y);
            this.owner = owner;
            this.type = type;
            this.target = target;
            
            // Apply spawn offset (reuse velocity vector temporarily)
            this.vel.set(1, 0).rotate(angle).mult(owner.size * 1.2);
            this.pos.add(this.vel);

            // Use weapon upgrade if owner is Player or Enemy with a weapon
            if (owner && owner.currentWeapon) {
                this.damage = owner.currentWeapon.damage;
                
                // Reuse color object if possible
                if (this.color) {
                    this.color.setRed(owner.currentWeapon.color[0]);
                    this.color.setGreen(owner.currentWeapon.color[1]);
                    this.color.setBlue(owner.currentWeapon.color[2]);
                } else {
                    this.color = color(...owner.currentWeapon.color);
                }
                
                this.type = owner.currentWeapon.type;
            } else {
                this.damage = damage;
                
                // Reuse color object if possible
                if (this.color && colorOverride) {
                    this.color.setRed(colorOverride[0]);
                    this.color.setGreen(colorOverride[1]);
                    this.color.setBlue(colorOverride[2]);
                } else {
                    this.color = colorOverride ? color(...colorOverride) : color(255, 0, 0);
                }
            }
            
            this.size = (owner && owner instanceof Player) ? 4 : 3;
            this.lifespan = 90;
            
            // Set velocity vector without creating a new one
            this.vel.set(1, 0).rotate(angle).mult(speed);
            
            return this;
        } catch (e) {
            // Handle any errors
            console.error("Error resetting projectile:", e);
            this.pos.set(0, 0);
            this.vel.set(0, 0);
            this.size = 3;
            this.lifespan = 1;
            this.damage = 0;
            this.type = "error";
            return this;
        }
    }

    update() {
        // Homing missile logic
        if (this.type === "missile" && this.target && this.target.pos) {
            // Calculate desired direction without creating new vectors
            let dx = this.target.pos.x - this.pos.x;
            let dy = this.target.pos.y - this.pos.y;
            let mag = Math.sqrt(dx*dx + dy*dy);
            
            // Only steer if we have a valid target position
            if (mag > 0) {
                // Calculate steering force (8% turn rate)
                let speedMag = this.vel.mag();
                dx = (dx / mag) * speedMag;
                dy = (dy / mag) * speedMag;
                
                // Apply steering gradually
                this.vel.x = this.vel.x * 0.92 + dx * 0.08;
                this.vel.y = this.vel.y * 0.92 + dy * 0.08;
            }
        }
        
        // Move projectile
        this.pos.add(this.vel);
        this.lifespan--;
    }

    draw() {
        push();
        fill(this.color);
        noStroke();
        ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);

        // Optional: Draw a different shape for missiles or force projectiles
        if (this.type === "missile") {
            stroke(255, 100, 0);
            line(this.pos.x, this.pos.y, this.pos.x - this.vel.x * 2, this.pos.y - this.vel.y * 2);
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
