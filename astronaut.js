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
        const throwSpeed = 150; // restore previous throw speed for familiar feel
        const vx = Math.cos(this.facingAngle) * throwSpeed;
        const vy = Math.sin(this.facingAngle) * throwSpeed;

        if (surfaceMode && surfaceMode.starSystem) {
            // Create grenade object (Using world coordinates - no visual offsets)
            // Astronaut.pos is already in world space.
            const grenade = new Grenade(this.pos.x, this.pos.y, vx, vy, this.facingAngle, this.altitude);
            // Attach to starSystem so grenade can create explosions via system APIs
            grenade.system = surfaceMode.starSystem;
            // Associate owner with player for damage attribution
            grenade.owner = (surfaceMode.player || this);
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
        // Improved 3D-looking astronaut using Draw3D primitives and consistent projection helpers
        const sz = this.size;

        // Use surfaceMode helpers if present for consistent projection
        const extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
            ? surfaceMode._getExtrusionAngle()
            : 0.5;

        const toVisualY = (worldY, alt) => {
            if (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY) return surfaceMode._toVisualY(worldY, alt);
            return worldY - (alt * Math.cos(extrusionAngle));
        };

        // Visual base (on ground) and small bob when walking
        const groundVisualY = toVisualY(y, this.altitude || 0);
        const bob = Math.sin(this.walkCycle) * 2;
        const baseY = groundVisualY + bob;

        // Lighting: approximate diffuse based on sun angle (2D projection)
        const sunDirX = Math.cos(sunAngle);
        const sunDirY = Math.sin(sunAngle);
        const light = 0.5 + 0.5 * Math.max(0, sunDirX * Math.cos(this.facingAngle) + sunDirY * Math.sin(this.facingAngle));

        const suitBase = color(220 * light, 220 * light, 230 * light);
        const suitShade = color(120 * light, 120 * light, 130 * light);
        const visor = color(255 * (0.6 + 0.4 * light), 200 * (0.6 + 0.4 * light), 80 * (0.6 + 0.4 * light));

        // Torso (extruded box) - drawBox3D expects top position, so compute top Y
        const torsoH = this.height * 0.6;
        const torsoTopY = baseY - torsoH * Math.cos(extrusionAngle);
        Draw3D.drawBox3D(x, torsoTopY, sz * 0.9, sz * 0.6, torsoH, suitBase, extrusionAngle, sunAngle);

        // Backpack - behind torso
        const backOffsetX = -Math.cos(this.facingAngle) * sz * 0.35;
        const backX = x + backOffsetX;
        const backTopY = torsoTopY - (torsoH * 0.15);
        Draw3D.drawBox3D(backX, backTopY, sz * 0.45, sz * 0.5, torsoH * 0.6, suitShade, extrusionAngle, sunAngle);

        // Legs - two extruded boxes; position relative to base
        const legH = this.height * 0.5;
        const legYOffset = sz * 0.2;
        const leftLegX = x - legYOffset;
        const rightLegX = x + legYOffset;
        const legTopY = baseY - legH * Math.cos(extrusionAngle);
        Draw3D.drawBox3D(leftLegX, legTopY, sz * 0.25, sz * 0.45, legH, suitBase, extrusionAngle, sunAngle);
        Draw3D.drawBox3D(rightLegX, legTopY, sz * 0.25, sz * 0.45, legH, suitBase, extrusionAngle, sunAngle);

        // Arms - small boxes rotated slightly by facing angle
        const armLen = sz * 0.7;
        const armW = sz * 0.18;
        // Left arm
        push();
        translate(x - sz * 0.45, torsoTopY + sz * 0.05);
        rotate(this.facingAngle * 0.2);
        Draw3D.drawBox3D(0, 0 - (armLen * Math.cos(extrusionAngle) * 0.5), armW, armLen, armW, suitBase, extrusionAngle, sunAngle);
        pop();
        // Right arm
        push();
        translate(x + sz * 0.45, torsoTopY + sz * 0.05);
        rotate(-this.facingAngle * 0.2);
        Draw3D.drawBox3D(0, 0 - (armLen * Math.cos(extrusionAngle) * 0.5), armW, armLen, armW, suitBase, extrusionAngle, sunAngle);
        pop();

        // Helmet - dome on top of torso
        const helmetRadius = sz * 0.45;
        const helmetY = torsoTopY - helmetRadius * Math.cos(extrusionAngle) - sz * 0.05;
        Draw3D.drawDome(x, helmetY, helmetRadius, 8, visor, extrusionAngle, sunAngle);

        // SurfaceMode already draws the ground shadow; avoid duplicate shadow here.
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
        this.color = color(50, 255, 50); // green like earlier commit

        this.altitude = startAltitude + 15; // Start at hand height above ground
        this.verticalVel = 40; // Initial upward velocity for arc (restored)
        this.gravity = -80; // Gravity pulling down (restored)

        // Track previous position for trail rendering and maintain history
        this.prevPos = this.pos.copy();
        this.trail = [];
        this.trailMax = 12;

        this.isSurface = true;
        this.owner = { isPlayer: true }; // Acts as player for damage
        this.damage = 150; // High damage

        this.destroyed = false;
        this.lifespan = 300; // Failsafe
    }

    update() {
        // Use fixed-step physics here to match previous behavior and ensure a clear arc
        const dt = 1 / 60;

        // Move in world plane
        this.pos.add(p5.Vector.mult(this.vel, dt));

        // Vertical arc physics (fixed dt)
        this.verticalVel += this.gravity * dt;
        this.altitude += this.verticalVel * dt;

        // Lifespan (frame-independent not necessary for grenade feel)
        this.lifespan -= 1;
        if (this.lifespan <= 0) this.destroyed = true;

        // After moving, record trail point so the trajectory reflects the arc
        if (!this.prevPos) this.prevPos = this.pos.copy();
        this.prevPos.set(this.pos.x, this.pos.y);
        this.trail.push({ x: this.pos.x, y: this.pos.y, alt: this.altitude });
        if (this.trail.length > this.trailMax) this.trail.shift();

        // Terrain collision: if we have a global surfaceMode, sample terrain and explode on impact
        if (!this.destroyed && typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._getTerrainHeightAt === 'function') {
            const terrainH = surfaceMode._getTerrainHeightAt(this.pos.x, this.pos.y);
            if (this.altitude <= terrainH) {
                try {
                    if (typeof surfaceMode._createSurfaceExplosion === 'function') {
                        surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, terrainH, 24, [255, 200, 50]);
                    } else if (this.system && typeof this.system.addExplosion === 'function') {
                        this.system.addExplosion(this.pos.x, this.pos.y, 24, [255, 200, 50], true, false, terrainH);
                    }
                } catch (e) { }
                this.destroyed = true;
            }
        }
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
     * @param {number} counterScale - Optional scale multiplier (default: 1.0)
     */
    draw(x, y, sunAngle, counterScale = 1.0) {
        // Handle no-arg call from surfaceMode which expects instance properties
        const drawX = (x !== undefined) ? x : this.pos.x;
        const drawY = (y !== undefined) ? y : this.pos.y;

        // Use surfaceMode projection helpers when available
        const extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
            ? surfaceMode._getExtrusionAngle()
            : 0.5;
        const toVisualY = (worldY, alt) => {
            if (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY) return surfaceMode._toVisualY(worldY, alt);
            return worldY - (alt * Math.cos(extrusionAngle));
        };

        const terrainH = (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._getTerrainHeightAt === 'function')
            ? surfaceMode._getTerrainHeightAt(drawX, drawY)
            : 0;

        const groundVisualY = toVisualY(drawY, terrainH);
        const visualY = toVisualY(drawY, this.altitude || 0);

        // Shadow oriented by sunAngle (small ellipse)
        push();
        const shadowOffset = 2;
        const offsetX = Math.cos(sunAngle + Math.PI) * shadowOffset;
        const offsetY = Math.sin(sunAngle + Math.PI) * shadowOffset;
        translate(drawX + offsetX, groundVisualY + offsetY);
        rotate(sunAngle + Math.PI / 2);
        noStroke();
        fill(0, 0, 0, 100);
        ellipse(0, 0, this.size * counterScale, this.size * 0.5 * counterScale);
        pop();

        // Draw trailing curved trajectory from stored trail points
        if (this.trail && this.trail.length > 0) {
            // Draw a smooth curve through trail points using curveVertex
            noFill();
            beginShape();
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i];
                const ty = toVisualY(t.y, t.alt || 0);
                stroke(50, 255, 50, map(i, 0, this.trail.length - 1, 60, 200));
                strokeWeight((1 + i * 0.1) * counterScale);
                curveVertex(t.x, ty);
            }
            // connect to current position for a smooth tip
            curveVertex(drawX, visualY);
            endShape();
        }

        // Draw grenade body at visual height
        push();
        translate(drawX, visualY);
        scale(counterScale);
        noStroke();
        fill(this.color);
        ellipse(0, 0, this.size, this.size);
        pop();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Astronaut, Grenade };
    global.Astronaut = Astronaut;
    global.Grenade = Grenade;
}
