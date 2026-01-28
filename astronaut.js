/**
 * Astronaut class - Player control on planet surface
 */
class Astronaut {
    constructor(startPos) {
        this.pos = startPos.copy();

        // Offset slightly to prevent clipping/instant re-boarding
        this.pos.x += 30;

        this.vel = createVector(0, 0);
        this.facingAngle = 0; // Radians
        this.speed = 0;
        this.maxSpeed = 40; // Walking speed (much slower than ship)
        this.turnSpeed = 4.0;
        this.size = 10; // Small size
        this.height = 15; // Visual height

        // State
        this.health = 100;
        this.maxHealth = 100;
        this.isAstronaut = true;
        this.destroyed = false;

        // Animation
        this.walkCycle = 0;

        // Grenade system
        this.grenadeCooldown = 0;
        this.grenadeMaxCooldown = 60; // 1 second at 60fps
    }

    /**
     * Handle input for astronaut movement
     * @returns {boolean} True if input was handled
     */
    handleInput(surfaceMode) {
        if (!surfaceMode) return false;

        const dt = deltaTime / 1000;
        let isMoving = false;

        // Directional Input Vector
        let dx = 0;
        let dy = 0;

        // Horizontal (A/D or Left/Right)
        if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1; // Left
        if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1; // Right

        // Vertical (W/S or Up/Down)
        if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1; // Up (Screen/World Y-)
        if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1; // Down (Screen/World Y+)

        if (dx !== 0 || dy !== 0) {
            isMoving = true;

            // Normalize vector to prevent faster diagonal movement
            // We can use a simple magnitude check or p5 vector normalize if available, 
            // but simple math avoids object creation overhead
            const mag = Math.sqrt(dx * dx + dy * dy);
            if (mag > 0) {
                dx /= mag;
                dy /= mag;
            }

            // Set Velocity
            this.vel.x = dx * this.maxSpeed;
            this.vel.y = dy * this.maxSpeed;

            // Update facing angle to match movement direction
            this.facingAngle = Math.atan2(dy, dx);

            // Animation
            this.walkCycle += dt * 10;
        } else {
            // Stop immediately if not moving
            this.vel.set(0, 0);
            this.walkCycle = 0;
        }

        // Grenade Throw (Space)
        if (keyIsDown(32)) { // Space
            this.throwGrenade(surfaceMode);
        }

        return isMoving;
    }

    /**
     * Throw a grenade
     */
    throwGrenade(surfaceMode) {
        if (this.grenadeCooldown > 0) return;

        this.grenadeCooldown = this.grenadeMaxCooldown;

        // Spawn grenade projectile
        // Velocity vector based on facing angle + arc
        const throwSpeed = 150;
        const vx = Math.cos(this.facingAngle) * throwSpeed;
        const vy = Math.sin(this.facingAngle) * throwSpeed;

        if (surfaceMode && surfaceMode.starSystem) {
            // Create grenade object
            // Pass current altitude (this.altitude)
            const grenade = new Grenade(this.pos.x, this.pos.y, vx, vy, this.facingAngle, this.altitude);
            // Add to system projectiles (or handling list)
            // We can treat it as a special projectile or add to surface objects temporarily?
            // Ideally projectiles list. Since it's a surface projectile, make sure it has isSurface=true
            surfaceMode.starSystem.projectiles.push(grenade);

            if (typeof soundManager !== 'undefined') {
                soundManager.playSound('click'); // Placeholder - ideally 'throw' or 'whoosh'
            }
        }
    }

    /**
     * Update physics
     */
    update(dt) {
        this.pos.add(p5.Vector.mult(this.vel, dt));

        // Cooldowns
        if (this.grenadeCooldown > 0) this.grenadeCooldown--;
    }

    /**
     * Draw the astronaut
     */
    draw(x, y, sunAngle) {
        // Simple figure
        const extrusionAngle = 0.5;
        const sz = this.size;

        // Bobbing animation
        const bob = Math.sin(this.walkCycle) * 2;

        // Use Draw3D logic (simplified here as direct calls or Draw3D methods)

        // Body color
        const bodyColor = color(200, 200, 200); // White suit
        const helmetColor = color(255, 180, 50); // Gold visor

        // Body
        Draw3D.drawBox3D(x, y + bob, sz, sz, this.height, bodyColor, extrusionAngle, sunAngle);

        // Helmet
        Draw3D.drawDome(x, y + bob - this.height / 2 - 2, sz * 0.4, 6, helmetColor, extrusionAngle, sunAngle);

        // Backpack
        const backX = x - Math.cos(this.facingAngle) * sz * 0.4;
        const backY = y - Math.sin(this.facingAngle) * sz * 0.4;
        Draw3D.drawBox3D(backX, y + bob - 5, sz * 0.6, sz * 0.4, 8, color(150), extrusionAngle, sunAngle);
    }
}

/**
 * Grenade Projectile
 * Arcs through the air and explodes on impact
 */
class Grenade {
    constructor(x, y, vx, vy, angle, startAltitude = 0) {
        this.pos = createVector(x, y);
        this.vel = createVector(vx, vy);
        this.size = 6;
        this.color = color(50, 255, 50);

        this.altitude = startAltitude + 15; // Start at hand height above ground
        this.verticalVel = 40; // Initial upward velocity for arc
        this.gravity = -80; // Gravity pulling down

        this.isSurface = true;
        this.owner = { isPlayer: true }; // Acts as player for damage
        this.damage = 150; // High damage

        this.destroyed = false;
        this.lifespan = 300; // Failsafe
    }

    update() {
        // We need 'dt' passed in, but projectile.js usually just calls update()? 
        // StarSystem calls update(dt) on projectiles if we modify it, but standard might not.
        // Assuming 60fps for simple physics if dt missing, or 1/60
        const dt = 1 / 60;

        this.pos.add(p5.Vector.mult(this.vel, dt));

        // Vertical Arc Physics
        this.verticalVel += this.gravity * dt;
        this.altitude += this.verticalVel * dt;

        this.lifespan--;
        if (this.lifespan <= 0) this.destroyed = true;
    }

    // Custom check collision method called by SurfaceMode
    checkTerrainCollision(terrainHeight) {
        if (this.altitude <= terrainHeight) {
            return true; // Hit ground
        }
        return false;
    }

    /**
     * Draw the grenade
     * @param {number} x - Optional override x (default: this.pos.x)
     * @param {number} y - Optional override y (default: this.pos.y)
     * @param {number} sunAngle - Optional sun angle (default: 0)
     */
    draw(x, y, sunAngle) {
        // Handle no-arg call from surfaceMode which expects instance properties
        const drawX = (x !== undefined) ? x : this.pos.x;
        const drawY = (y !== undefined) ? y : this.pos.y;

        // Simple 3D projection for altitude
        const extrusionAngle = 0.5; // Match global
        const visualY = drawY - (this.altitude * Math.cos(extrusionAngle)); // Visual height offset

        // Draw grenade body
        fill(this.color);
        noStroke();
        ellipse(drawX, visualY, this.size, this.size);

        // Shadow on ground
        fill(0, 0, 0, 100);
        ellipse(drawX, drawY, this.size, this.size * 0.5);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Astronaut, Grenade };
    global.Astronaut = Astronaut;
    global.Grenade = Grenade;
}
