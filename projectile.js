// ****** projectile.js ******

class Projectile {
    constructor(x, y, angle, owner, speed = 8, damage = 10, colorOverride = null, type = "projectile", target = null) {
        const spawnOffset = p5.Vector.fromAngle(angle).mult(owner.size * 1.2); // was 0.7
        this.pos = createVector(x, y).add(spawnOffset);
        this.owner = owner;
        this.type = type; // Store weapon type for special behaviors
        this.target = target; // For homing missiles, etc.

        // Use weapon upgrade if owner is Player or Enemy with a weapon
        if (owner && owner.currentWeapon) {
            this.damage = owner.currentWeapon.damage;
            this.color = color(...owner.currentWeapon.color);
            this.type = owner.currentWeapon.type;
        } else {
            this.damage = damage;
            this.color = colorOverride ? color(...colorOverride) : color(255, 0, 0);
        }
        this.size = (owner && owner instanceof Player) ? 4 : 3;
        this.lifespan = 90;
        this.vel = p5.Vector.fromAngle(angle).mult(speed);
    }

    update() {
        // Homing missile logic
        if (this.type === "missile" && this.target && this.target.pos) {
            let desired = p5.Vector.sub(this.target.pos, this.pos).normalize().mult(this.vel.mag());
            this.vel.lerp(desired, 0.08); // Smoothly steer toward target
        }
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
    
    // Define isOffScreen to return true only if the projectile is really far out in world space.
    isOffScreen() {
        const bound = 10000; 
        return (
            this.pos.x < -bound ||
            this.pos.x > bound ||
            this.pos.y < -bound ||
            this.pos.y > bound
        );
    }
}

// Example usage of Projectile class
const proj = new Projectile(
    spawnPos.x, spawnPos.y, angle, this, // <-- this, not 'ENEMY'
    8, this.currentWeapon.damage, this.currentWeapon.color
);
this.currentSystem.addProjectile(proj);