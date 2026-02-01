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
    constructor(x, y, angle, owner, speed = DEFAULT_WEAPON_CONFIG.PROJECTILE_SPEED, damage = DEFAULT_WEAPON_CONFIG.PROJECTILE_DAMAGE, colorOverride = null,
        type = "projectile", target = null, lifespan = DEFAULT_WEAPON_CONFIG.PROJECTILE_LIFESPAN, turnRate = 0,
        missileSpeed = 0, tangleDuration = DRAG_EFFECT_DEFAULT_DURATION, dragMultiplier = DRAG_EFFECT_DEFAULT_MULTIPLIER,
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
        this._isStorm = false;  // Storm weapon projectile
        this.stormConfig = null; // Storm configuration for spawning mini-storms
        this.destroyed = false;
        this.altitude = 0; // Current altitude for surface mode
        this.startAltitude = 0; // Starting altitude for interpolation
        this.targetAltitude = 0; // Target altitude for interpolation
        this.isSurface = false; // Whether this is a surface mode projectile
        this.ownerType = 'ship'; // 'ship' or 'turret'
        this._timeCorrection = 1.0;

        // Call reset if parameters provided
        if (x !== undefined) {
            this.reset(x, y, angle, owner, speed, damage, colorOverride, type, target,
                lifespan, turnRate, missileSpeed, tangleDuration, dragMultiplier,
                rotationBlockMultiplier);
        }
    }

    // Reset method for object pooling
    reset(x, y, angle, owner, speed = DEFAULT_WEAPON_CONFIG.PROJECTILE_SPEED, damage = DEFAULT_WEAPON_CONFIG.PROJECTILE_DAMAGE, colorOverride = null,
        type = "projectile", target = null, lifespan = DEFAULT_WEAPON_CONFIG.PROJECTILE_LIFESPAN, turnRate = 0,
        missileSpeed = 0, tangleDuration = DRAG_EFFECT_DEFAULT_DURATION, dragMultiplier = DRAG_EFFECT_DEFAULT_MULTIPLIER,
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
        this.altitude = 0;
        this.startAltitude = 0;
        this.targetAltitude = 0;
        this._isPlayer = !!owner && (
            (typeof Player !== 'undefined' && owner instanceof Player) ||
            (typeof player !== 'undefined' && owner === player) ||
            (owner && owner.isPlayer === true) ||
            (owner && owner.constructor && owner.constructor.name === 'Player')
        );

        // Type will be determined from weapon or parameter below
        // Cache type checks will be set after finalizing this.type
        // NOTE: Spawn offset is now handled by WeaponSystem._getSpawnPosition()

        // Use weapon upgrade if owner has a weapon
        if (owner && owner.currentWeapon) {
            const weapon = owner.currentWeapon;
            this.damage = weapon.damage;

            // Update color efficiently
            const weaponColor = weapon.color;
            if (Array.isArray(weaponColor) && weaponColor.length >= 3) {
                if (this.color) {
                    this.color.setRed(weaponColor[0]);
                    this.color.setGreen(weaponColor[1]);
                    this.color.setBlue(weaponColor[2]);
                } else {
                    this.color = color(weaponColor[0], weaponColor[1], weaponColor[2]);
                }
            } else {
                // If weapon has no color specified, ensure we at least have a sensible default
                if (!this.color) {
                    this.color = color(255, 0, 0);
                }
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
        this._isStorm = (this.type === "storm");

        this.lifespan = this.initialLifespan;
        this.destroyed = false;

        // Set velocity vector
        const effectiveSpeed = this._isMissile ? this.missileSpeed : speed;
        this.vel.set(1, 0).rotate(angle).mult(effectiveSpeed);

        return this;
    }

    update() {
        // Frame-rate independent time scaling
        const timeScale = (typeof deltaTime === 'number') ? deltaTime / FRAME_TIME_BASELINE_MS : 1;

        // Homing missile logic (using cached type check)
        if (this._isMissile && this.target && this.target.pos && !this.target.destroyed && (this.target.hull === undefined || this.target.hull > 0)) {
            // Calculate desired direction vector
            let targetX, targetY;
            
            // In surface mode, use visual coordinates for accurate homing
            if (this.isSurface && typeof SurfaceUtils !== 'undefined') {
                const missileAlt = this.altitude || 0;
                const targetAlt = this.target.altitude || this.target.yOffset || 0;
                
                const missileVisualX = SurfaceUtils.toVisualX(this.pos.x, missileAlt);
                const missileVisualY = SurfaceUtils.toVisualY(this.pos.y, missileAlt);
                const targetVisualX = SurfaceUtils.toVisualX(this.target.pos.x, targetAlt);
                const targetVisualY = SurfaceUtils.toVisualY(this.target.pos.y, targetAlt);
                
                targetX = targetVisualX - missileVisualX;
                targetY = targetVisualY - missileVisualY;
            } else {
                // Normal space mode - use world coordinates
                targetX = this.target.pos.x - this.pos.x;
                targetY = this.target.pos.y - this.pos.y;
            }
            
            this._tempVec.set(targetX, targetY);
            this._tempVec.setMag(this.missileSpeed);

            // Calculate steering force (reuse steer vector)
            this._steerVec.set(this._tempVec.x - this.vel.x, this._tempVec.y - this.vel.y);

            // Scale turnRate by timeScale for frame-rate independence
            this._steerVec.limit(this.turnRate * timeScale);

            this.vel.add(this._steerVec);
            this.vel.setMag(this.missileSpeed);
        }

        // Move projectile (frame-rate independent)
        this.pos.add(p5.Vector.mult(this.vel, timeScale));
        this.lifespan -= timeScale;

        // Smoothly interpolate altitude for surface projectiles
        // DISABLED: This causes visual offset as projectiles arc from start to target altitude
        // Projectiles should maintain constant altitude for accurate visual representation
        // if (this.isSurface && this.initialLifespan > 0) {
        //     const lifeRatio = Math.max(0, this.lifespan / this.initialLifespan);
        //     // Interpolate from startAltitude at lifeRatio=1 to targetAltitude at lifeRatio=0
        //     this.altitude = this.targetAltitude + (this.startAltitude - this.targetAltitude) * lifeRatio;
        // }
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

                if (this.isSurface && typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
                    surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, this.altitude || 0, 8, col);
                } else {
                    system.addExplosion(this.pos.x, this.pos.y, 8, col);
                }
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

                if (this.isSurface && typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
                    surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, this.altitude || 0, 12, col);
                } else {
                    system.addExplosion(this.pos.x, this.pos.y, 12, col);
                }
            }
        }
    }

    /**
     * Draw the projectile
     * @param {number} x - Optional override x (default: this.pos.x)
     * @param {number} y - Optional override y (default: this.pos.y)
     * @param {number} sunAngle - Optional sun angle (default: 0)
     * @param {number} counterScale - Optional scale multiplier (default: 1.0)
     */
    draw(x, y, sunAngle, counterScale = 1.0) {
        const drawX = (x !== undefined) ? x : this.pos.x;
        const drawY = (y !== undefined) ? y : this.pos.y;

        // Apply visual altitude offset for surface projectiles
        let finalX = drawX;
        let finalY = drawY;
        if (this.isSurface) {
            const alt = this.altitude || 0;
            
            // Use shared SurfaceUtils if available, otherwise fallback to direct calculation
            if (typeof SurfaceUtils !== 'undefined') {
                finalX = SurfaceUtils.toVisualX(drawX, alt);
                finalY = SurfaceUtils.toVisualY(drawY, alt);
            } else {
                const extrusionAngle = 0.5; // Fallback constant
                finalX = drawX - alt * Math.sin(extrusionAngle);
                finalY = drawY - alt * Math.cos(extrusionAngle);
            }
        }

        // Use cached type checks to avoid repeated string comparisons
        if (this._isMissile) {
            push();
            translate(finalX, finalY);
            scale(counterScale);
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
                const barWidth = this.size * 2 * counterScale;
                const barHeight = 2 * counterScale;
                const barX = drawX - barWidth / 2;
                const barY = finalY - (this.size * 2.5 * counterScale) - barHeight - 1; // Above the missile
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
            translate(finalX, finalY);
            scale(counterScale);

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
            // Use millis() for frame-rate independent animation
            const frameOffset = (typeof millis === 'function' ? millis() : Date.now()) * 0.006; // 0.1*60 = 6 rad/s -> 0.006/ms
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
                let ownerVisualY = ownerPos.y;
                let ownerVisualX = ownerPos.x;
                if (this.isSurface) {
                    const ownerAlt = (this.owner.altitude !== undefined) ? this.owner.altitude : (this.owner.yOffset || 0);

                    ownerVisualX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                        ? surfaceMode._toVisualX(ownerPos.x, ownerAlt)
                        : ownerPos.x - ownerAlt * Math.sin(extrusionAngle);

                    ownerVisualY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                        ? surfaceMode._toVisualY(ownerPos.y, ownerAlt)
                        : ownerPos.y - ownerAlt * Math.cos(extrusionAngle);
                }
                line(ownerVisualX, ownerVisualY, finalX, finalY);
            } else {
                // Fallback to a short line pointing to the projectile
                line(finalX - (this.size * 2), finalY, finalX, finalY);
            }
            pop();
        } else if (this._isStorm) {
            // Storm projectile: swirling energy orb
            push();
            translate(finalX, finalY);
            scale(counterScale);
            const timeNow = (typeof millis === 'function') ? millis() : Date.now();
            const pulse = 1 + Math.sin(timeNow * 0.01) * 0.2;
            const rot = timeNow * 0.003;
            rotate(rot);

            // Get color components
            const c0 = this.color.levels ? this.color.levels[0] : (Array.isArray(this.color) ? this.color[0] : 100);
            const c1 = this.color.levels ? this.color.levels[1] : (Array.isArray(this.color) ? this.color[1] : 100);
            const c2 = this.color.levels ? this.color.levels[2] : (Array.isArray(this.color) ? this.color[2] : 255);

            // Outer glow
            noStroke();
            fill(c0, c1, c2, 80);
            ellipse(0, 0, this.size * 4 * pulse, this.size * 4 * pulse);

            // Core
            fill(c0, c1, c2, 200);
            ellipse(0, 0, this.size * 2, this.size * 2);

            // Energy tendrils
            stroke(255, 255, 255, 150);
            strokeWeight(1);
            noFill();
            for (let i = 0; i < 3; i++) {
                const a = (i * TWO_PI / 3) + rot;
                line(0, 0, Math.cos(a) * this.size * 2.5, Math.sin(a) * this.size * 2.5);
            }
            pop();
        } else {
            // Standard projectile drawing
            push();
            translate(finalX, finalY);
            scale(counterScale);
            fill(this.color);
            noStroke();
            ellipse(0, 0, this.size * 2, this.size * 2);
            pop();
        }
    }

    // Collision check with polygon narrowphase for on-screen accuracy
    // Uses circle broadphase for fast rejection, then circle-polygon check for visible targets
    checkCollision(target) {
        if (!target || !target.pos || typeof target.size !== 'number') return false;

        // Broadphase: Inline distance calculation (avoid p5.js dist() function call overhead)
        const dx = this.pos.x - target.pos.x;
        const dy = this.pos.y - target.pos.y;
        const distSq = dx * dx + dy * dy;

        // Use squared distance to avoid sqrt
        const combinedRadius = (target.size * 0.5) + this.size;
        const combinedRadiusSq = combinedRadius * combinedRadius;

        // Fast rejection - no collision possible
        if (distSq >= combinedRadiusSq) return false;

        // Narrowphase: Circle-polygon for on-screen targets (visual accuracy)
        if (typeof CollisionUtils !== 'undefined') {
            // Check if target is on-screen (asteroids use isOnScreen(), ships use _isOnScreen)
            let isOnScreen = target.isPlayer; // Player always visible
            if (!isOnScreen && target._isOnScreen !== undefined) {
                isOnScreen = target._isOnScreen;
            } else if (!isOnScreen && target.vertices) {
                // Asteroid - check with isOnScreen
                isOnScreen = CollisionUtils.isOnScreen(target.pos);
            } else if (!isOnScreen && target._isOnScreen === undefined && target.shipDef) {
                // Ship without _isOnScreen tracking, assume visible
                isOnScreen = true;
            }

            if (isOnScreen) {
                // Get polygon for target (could be ship or asteroid)
                let polygon = null;
                if (target.vertices) {
                    // Target is an asteroid
                    polygon = CollisionUtils.getAsteroidPolygon(target);
                } else if (target.shipDef) {
                    // Target is a ship
                    polygon = CollisionUtils.getShipPolygon(target);
                }

                if (polygon) {
                    return CollisionUtils.circlePolygonCollide(
                        this.pos.x, this.pos.y, this.size, polygon
                    );
                }
            }
        }

        // Fallback: Broadphase already passed, assume collision
        return true;
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
        const speed = (data.vel && (Math.hypot(data.vel.x || 0, data.vel.y || 0))) || (data._meta && data._meta.missileSpeed) || DEFAULT_WEAPON_CONFIG.PROJECTILE_SPEED;
        const proj = new Projectile((data.pos && data.pos.x) || 0, (data.pos && data.pos.y) || 0, angle, null, speed, data.damage || DEFAULT_WEAPON_CONFIG.PROJECTILE_DAMAGE, data.color || null, data.type || 'projectile', null, data.lifespan || DEFAULT_WEAPON_CONFIG.PROJECTILE_LIFESPAN, (data._meta && data._meta.turnRate) || 0, (data._meta && data._meta.missileSpeed) || 0);
        if (data.vel) proj.vel.set(data.vel.x || 0, data.vel.y || 0);
        if (typeof data.lifespan === 'number') proj.lifespan = data.lifespan;
        if (typeof data.hull === 'number') proj.hull = data.hull;
        if (typeof data.maxHull === 'number') proj.maxHull = data.maxHull;
        proj.destroyed = !!data.destroyed;
        return proj;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Projectile };
    global.Projectile = Projectile;
}
