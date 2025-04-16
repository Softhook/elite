// ****** projectile.js ******

class Projectile {
    constructor(x, y, angle, owner, speed = 8, damage = 10) {
        this.pos = createVector(x, y);
        this.owner = owner; // Store reference to the shooter object
        this.damage = damage;
        this.size = (owner && owner instanceof Player) ? 4 : 3;
        this.color = (owner && owner instanceof Player) ? color(0, 255, 0) : color(255, 0, 0);
        this.lifespan = 90; // Frames before disappearing
        console.log(`Projectile from shooter: ${owner.shipTypeName || "Player"}`);
        this.vel = p5.Vector.fromAngle(angle).mult(speed);
    }

    update() {
        this.pos.add(this.vel);
        this.lifespan--;
    }

    draw() {
        push();
        fill(this.color);
        noStroke();
        ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
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
        // Use a generous bound; adjust based on your world's scale.
        const bound = 10000; 
        return (
            this.pos.x < -bound ||
            this.pos.x > bound ||
            this.pos.y < -bound ||
            this.pos.y > bound
        );
    }
}