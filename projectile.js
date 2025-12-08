// ****** projectile.js ******
// Optimized for performance with object pooling support
// Key optimizations:
// - Reusable temp vectors (_tempVec, _steerVec) to eliminate allocations in update loop
// - Cached type checks (_isMissile, _isTangle, _isPlayer) to avoid repeated string comparisons
// - Inline distance calculations using squared distance (avoids sqrt)
// - Pre-calculated size multipliers in draw() to reduce repeated operations
// - Streamlined reset() logic with early validation and efficient color updates
// - Removed try-catch from hot path (reset) for better JIT optimization

class Projectile {
    constructor(x, y, angle, owner, speed = 8, damage = 10, colorOverride = null,
        type = "projectile", target = null, lifespan = 90, turnRate = 0,
        missileSpeed = 0, tangleDuration = 5.0, dragMultiplier = 10.0,
        rotationBlockMultiplier = 0.1) {
        // Create vectors just once at construction time (reused for entire lifecycle)
        this.pos = createVector(0, 0);
        this.vel = createVector(0, 0);

        // Reusable vectors for calculations (avoid allocations in update/collision)
        this._tempVec = createVector(0, 0);
        this._steerVec = createVector(0, 0);

        // Set default values (will be overridden by reset())
        this.size = 3;
        // Hull for destructible projectiles (missiles/mines)
        this.maxHull = 0;
        this.hull = 0;
        this.destroyed = false;
        this.lifespan = 90;
        this.initialLifespan = 90;
        this.damage = 10;
        this.owner = null;
        this.type = "projectile";
        this.target = null;
        this.color = color(255, 0, 0);
        this.turnRate = 0;
        this.missileSpeed = 0;
        this.tangleDuration = tangleDuration;
        this.dragMultiplier = dragMultiplier;
        this.rotationBlockMultiplier = rotationBlockMultiplier;

        // Cache frequently accessed values
        this._isPlayer = false;
        this._isMissile = false;
        this._isTangle = false;
        this._isHarpoon = false;
        this._timeCorrection = 1.0;

        // Call reset if parameters provided
        if (x !== undefined) {
            this.reset(x, y, angle, owner, speed, damage, colorOverride, type, target,
                lifespan, turnRate, missileSpeed, tangleDuration, dragMultiplier,
                rotationBlockMultiplier);
        }
    }

    // Reset method for object pooling
    reset(x, y, angle, owner, speed = 8, damage = 10, colorOverride = null,
        type = "projectile", target = null, lifespan = 90, turnRate = 0,
        missileSpeed = 0, tangleDuration = 5.0, dragMultiplier = 10.0,
        rotationBlockMultiplier = 0.1, system = null) {
        // Validate position inputs (early return on invalid)
        if (isNaN(x) || isNaN(y)) {
            console.warn(`Invalid projectile position: x=${x}, y=${y}`);
            if (owner && owner.pos) {
                x = owner.pos.x;
                y = owner.pos.y;
            } else {
                x = 0; y = 0;
            }
        }

        // Set basic properties
        this.pos.set(x, y);
        this.owner = owner;
        this.system = system; // Set system reference for isOffScreen() and cleanup
        this.target = target;
        this.turnRate = turnRate;
        this.missileSpeed = missileSpeed || speed;
        this.tangleDuration = tangleDuration;
        this.dragMultiplier = dragMultiplier;
        this.rotationBlockMultiplier = rotationBlockMultiplier;
        this._isPlayer = (owner && owner instanceof Player);

        // Type will be determined from weapon or parameter below
        // Cache type checks will be set after finalizing this.type

        // Apply spawn offset (reuse velocity vector temporarily)
        if (owner && owner.size) {
            this.vel.set(1, 0).rotate(angle).mult(owner.size * 1.2);
            this.pos.add(this.vel);
        }

        // Use weapon upgrade if owner has a weapon
        if (owner && owner.currentWeapon) {
            const weapon = owner.currentWeapon;
            this.damage = weapon.damage;

            // Update color efficiently
            const weaponColor = weapon.color;
            if (this.color) {
                this.color.setRed(weaponColor[0]);
                this.color.setGreen(weaponColor[1]);
                this.color.setBlue(weaponColor[2]);
            } else {
                this.color = color(weaponColor[0], weaponColor[1], weaponColor[2]);
            }

            // Set type from weapon (takes priority over parameter)
            this.type = weapon.type;

            // Missile-specific properties from weapon definition
            if (weapon.type === "missile") {
                this.missileSpeed = weapon.speed || speed;
                this.turnRate = weapon.turnRate || 0;
                this.initialLifespan = weapon.lifespan || lifespan;
                this.size = weapon.projectileSize || 3;
                // Hull for missiles: allow weapons to specify `missileHull` else derive a reasonable default
                this.maxHull = weapon.missileHull || Math.max(20, Math.floor((weapon.damage || 10) * 2));
                this.hull = this.maxHull;
            } else {
                this.initialLifespan = lifespan;
                this.size = this._isPlayer ? 4 : 3;
            }

        } else {
            // Fallback if no owner or currentWeapon
            this.damage = damage;
            this.type = type; // Use parameter type
            if (colorOverride) {
                if (this.color) {
                    this.color.setRed(colorOverride[0]);
                    this.color.setGreen(colorOverride[1]);
                    this.color.setBlue(colorOverride[2]);
                } else {
                    this.color = color(colorOverride[0], colorOverride[1], colorOverride[2]);
                }
            } else if (!this.color) {
                this.color = color(255, 0, 0);
            }
            this.initialLifespan = lifespan;
            this.size = this._isPlayer ? 4 : 3;
        }

        // Update cached type checks AFTER type is finalized
        // Note: External code should use these cached flags instead of comparing this.type
        this._isMissile = (this.type === "missile");
        this._isTangle = (this.type === "tangle");
        this._isHarpoon = (this.type === "harpoon" || this.type === "HARPOON");

        this.lifespan = this.initialLifespan;
        this.destroyed = false;

        // Set velocity vector
        const effectiveSpeed = this._isMissile ? this.missileSpeed : speed;
        this.vel.set(1, 0).rotate(angle).mult(effectiveSpeed);

        return this;
    }

    update() {
        // Homing missile logic (using cached type check)
        if (this._isMissile && this.target && this.target.pos && !this.target.destroyed && (this.target.hull === undefined || this.target.hull > 0)) {
            // Calculate desired direction vector (reuse temp vectors)
            this._tempVec.set(this.target.pos.x - this.pos.x, this.target.pos.y - this.pos.y);
            this._tempVec.setMag(this.missileSpeed);

            // Calculate steering force (reuse steer vector)
            this._steerVec.set(this._tempVec.x - this.vel.x, this._tempVec.y - this.vel.y);

            // Scale turnRate by deltaTime for frame-rate independence
            this._timeCorrection = deltaTime ? (deltaTime / 16.666667) : 1; // 1000/60 = 16.666667
            this._steerVec.limit(this.turnRate * this._timeCorrection);

            this.vel.add(this._steerVec);
            this.vel.setMag(this.missileSpeed);
        }

        // Move projectile
        this.pos.add(this.vel);
        this.lifespan--;
    }

    /** Apply damage to this projectile (used primarily for missiles/mines)
     * @param {number} damage
     * @param {Object} attacker
     * @param {Object} system
     */
    takeDamage(damage, attacker, system) {
        if (!Number.isFinite(damage)) damage = 0;
        // If this projectile has no hull, treat as instant-death (legacy behavior)
        if (!this.maxHull || this.maxHull <= 0) {
            this.lifespan = 0;
            this.destroyed = true;
            if (system && typeof system.addExplosion === 'function') {
                const col = Array.isArray(this.color) ? this.color : (this.color && this.color.levels) ? [this.color.levels[0], this.color.levels[1], this.color.levels[2]] : [255, 150, 0];
                system.addExplosion(this.pos.x, this.pos.y, 8, col);
            }
            return;
        }

        this.hull -= Math.max(0, Math.floor(damage));
        if (this.hull <= 0) {
            this.hull = 0;
            this.destroyed = true;
            this.lifespan = 0;
            if (system && typeof system.addExplosion === 'function') {
                const col = Array.isArray(this.color) ? this.color : (this.color && this.color.levels) ? [this.color.levels[0], this.color.levels[1], this.color.levels[2]] : [255, 150, 0];
                system.addExplosion(this.pos.x, this.pos.y, 12, col);
            }
        }
    }

    draw() {
        // Use cached type checks to avoid repeated string comparisons
        if (this._isMissile) {
            push();
            translate(this.pos.x, this.pos.y);
            rotate(this.vel.heading());
            fill(this.color);
            noStroke();
            // Simple triangle shape for missile
            const s1 = this.size * 1.5;
            const s2 = this.size * 0.7;
            const s3 = this.size * 1.3;
            triangle(-s1, -s2, -s1, s2, s3, 0);
            // Fading orange trail
            const lifeAlpha1 = this.lifespan * 3;
            const lifeAlpha2 = this.lifespan * 2;
            fill(255, lifeAlpha1 > 150 ? 150 : lifeAlpha1, 0, lifeAlpha2 > 100 ? 100 : lifeAlpha2);
            ellipse(-this.size * 2, 0, this.size * 1.5, this.size * 0.8);
            pop();

            // Draw hull bar for missiles only if damaged
            if (this.hull !== undefined && this.maxHull !== undefined && this.hull < this.maxHull) {
                const barWidth = this.size * 2;
                const barHeight = 2;
                const barX = this.pos.x - barWidth / 2;
                const barY = this.pos.y - this.size * 2.5 - barHeight - 1; // Above the missile
                // Background
                fill(0, 0, 0, 150);
                noStroke();
                rect(barX, barY, barWidth, barHeight);
                // Hull
                const hullRatio = this.hull / this.maxHull;
                fill(0, 255, 0, 200); // Green
                rect(barX, barY, barWidth * hullRatio, barHeight);
            }
        } else if (this._isTangle) {
            push();
            translate(this.pos.x, this.pos.y);

            // Energy field background
            noStroke();
            fill(200, 150);
            const sizeMult2 = this.size * 2;
            ellipse(0, 0, sizeMult2, sizeMult2);

            // Energy strands
            stroke(255);
            strokeWeight(1.5);
            noFill();

            // Draw tethers/tendrils (optimized - reduced random calls)
            const frameOffset = frameCount * 0.1;
            const piOver4 = PI / 4;
            // Cache random jitter values (only 4 instead of 64 per frame)
            const jitter1 = random(-1, 1);
            const jitter2 = random(-1, 1);
            const jitter3 = random(-1, 1);
            const jitter4 = random(-1, 1);

            for (let i = 0; i < 8; i++) {
                const angle = (frameOffset + i * piOver4) % TWO_PI;
                beginShape();
                for (let j = 0; j < 4; j++) {
                    const t = j / 3;
                    const radius = this.size * (0.5 + t * 1.3);
                    const jitterScale = this.size * t * 0.3;
                    // Reuse cached jitter values rotated by tendril
                    const jitterOffset = (i % 4);
                    const jitterX = (jitterOffset === 0 ? jitter1 : jitterOffset === 1 ? jitter2 : jitterOffset === 2 ? jitter3 : jitter4);
                    const jitterY = (jitterOffset === 1 ? jitter1 : jitterOffset === 2 ? jitter2 : jitterOffset === 3 ? jitter3 : jitter4);
                    const x = cos(angle + j * 0.2) * radius + jitterX * jitterScale;
                    const y = sin(angle + j * 0.2) * radius + jitterY * jitterScale;
                    vertex(x, y);
                }
                endShape();
            }
            pop();
        } else if (this._isHarpoon) {
            // Harpoon projectile: render as a single straight tether line (matches Harpoon tether color/weight)
            push();
            stroke(180, 220, 255);
            strokeWeight(2);
            noFill();
            const ownerPos = this.owner && this.owner.pos ? this.owner.pos : null;
            if (ownerPos) {
                line(ownerPos.x, ownerPos.y, this.pos.x, this.pos.y);
            } else {
                // Fallback to a short line pointing to the projectile
                line(this.pos.x - (this.size * 2), this.pos.y, this.pos.x, this.pos.y);
            }
            pop();
        } else {
            // Standard projectile drawing (no push/pop needed)
            fill(this.color);
            noStroke();
            ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
        }
    }

    // Optimized collision check (inline distance calculation)
    checkCollision(target) {
        if (!target || !target.pos || typeof target.size !== 'number') return false;

        // Inline distance calculation (avoid p5.js dist() function call overhead)
        const dx = this.pos.x - target.pos.x;
        const dy = this.pos.y - target.pos.y;
        const distSq = dx * dx + dy * dy;

        // Use squared distance to avoid sqrt
        const combinedRadius = (target.size * 0.5) + this.size;
        const combinedRadiusSq = combinedRadius * combinedRadius;

        return distSq < combinedRadiusSq;
    }

    isOffScreen() {
        // Safety check for uninitialized dimensions
        if (!width || !height) return false;

        // Avoid vector allocation in fallback case
        const playerPos = this.system?.player?.pos;
        const playerX = playerPos ? playerPos.x : 0;
        const playerY = playerPos ? playerPos.y : 0;

        // Calculate screen coordinates relative to player/camera
        const screenX = width / 2 + (this.pos.x - playerX);
        const screenY = height / 2 + (this.pos.y - playerY);

        const margin = 100;

        return (screenX < -margin ||
            screenX > width + margin ||
            screenY < -margin ||
            screenY > height + margin);
    }

    toJSON() {
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            vel: { x: this.vel.x, y: this.vel.y },
            angle: this.vel.heading(),
            size: this.size,
            type: this.type,
            damage: this.damage,
            lifespan: this.lifespan,
            initialLifespan: this.initialLifespan,
            ownerId: this.owner ? (this.owner.id || this.owner.shipTypeName || null) : null,
            hull: this.hull,
            maxHull: this.maxHull,
            color: this.color && this.color.levels ? this.color.levels.slice(0, 3) : null,
            _meta: {
                turnRate: this.turnRate,
                missileSpeed: this.missileSpeed
            }
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        // Create with minimal sensible defaults. Owner/target linking should happen after full system is restored.
        const angle = 0;
        const speed = (data.vel && (Math.hypot(data.vel.x || 0, data.vel.y || 0))) || (data._meta && data._meta.missileSpeed) || 8;
        const proj = new Projectile((data.pos && data.pos.x) || 0, (data.pos && data.pos.y) || 0, angle, null, speed, data.damage || 10, data.color || null, data.type || 'projectile', null, data.lifespan || 90, (data._meta && data._meta.turnRate) || 0, (data._meta && data._meta.missileSpeed) || 0);
        if (data.vel) proj.vel.set(data.vel.x || 0, data.vel.y || 0);
        if (typeof data.lifespan === 'number') proj.lifespan = data.lifespan;
        if (typeof data.hull === 'number') proj.hull = data.hull;
        if (typeof data.maxHull === 'number') proj.maxHull = data.maxHull;
        proj.destroyed = !!data.destroyed;
        return proj;
    }
}
