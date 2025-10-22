// ****** weaponSystem.js ******

// Define weapon types as constants for better safety
const WEAPON_TYPE = {
    PROJECTILE: 'projectile',
    BEAM: 'beam',
    FORCE: 'force',
    TURRET: 'turret',
    STRAIGHT: 'straight',
    SPREAD: 'spread',
    MISSILE: 'missile',
    TANGLE: 'tangle',
    BARRIER: 'barrier' // Added Barrier type
};

class WeaponSystem {
    // Static regex for parsing weapon count from type string
    static _countRegex = /(\d+)$/;
    
    // Initialize projectile pool safely
    static init(initialPoolSize = 100) {
        try {
            if (typeof ObjectPool !== 'undefined') {
                if (!this.projectilePool) {
                    console.log(`Initializing projectile pool with ${initialPoolSize} projectiles`);
                    this.projectilePool = new ObjectPool(Projectile, initialPoolSize, 1000);
                }
                return true;
            } else {
                console.warn("ObjectPool class not found! Falling back to direct instantiation.");
                return false;
            }
        } catch (e) {
            console.error("Error initializing projectile pool:", e);
            return false;
        }
    }

    /** Provide reusable vectors for beam calculations to avoid GC churn */
    static _ensureBeamCache() {
        if (!this._beamCache) {
            this._beamCache = {
                start: createVector(0, 0),
                dir: createVector(0, 0),
                end: createVector(0, 0),
                hitPoint: createVector(0, 0),
                defaultEnd: createVector(0, 0)
                // Note: hitResult removed - now returns new object per call
            };
        }
        return this._beamCache;
    }
    
/** 
 * Handles force blast weapon (area effect damage)
 * @param {Object} owner - Entity firing the weapon
 * @param {Object} system - Current star system
 */
static fireForce(owner, system) {
    if (!owner || !system) return;
    
    console.log(`Force weapon fired by ${owner.constructor.name}`); // Debug output
    
    // Cache owner position in local variables for faster access
    const ownerX = owner.pos.x;
    const ownerY = owner.pos.y;
    
    // Each force wave needs its own position vector (can't share reference!)
    const wavePos = createVector(ownerX, ownerY);
    
    // Get owner's current weapon for properties
    const weapon = owner.currentWeapon;
    const damage = weapon?.damage || 20;
    const color = weapon?.color || [255, 0, 0];
    const maxRadius = weapon?.maxRadius || 1000; // INCREASED from 750 to 1000
    const currentTime = millis();
    
    // Pre-populate enemies to process - THIS IS THE KEY FIX
    let entitiesToProcess;
    if (owner === system.player) {
        // Player attacking enemies - use concat to avoid spread operator overhead
        entitiesToProcess = system.enemies.concat(system.asteroids);
        console.log(`Found ${entitiesToProcess.length} potential targets for force wave`);
    } else if (system.player) {
        // Enemy attacking player
        entitiesToProcess = [system.player];
    } else {
        entitiesToProcess = [];
    }
    
    // Create force wave in the system (reuse objects to minimize allocation)
    system.forceWaves.push({
        pos: wavePos,
        owner: owner,
        startTime: currentTime,
        radius: 50,
        maxRadius: maxRadius,
        growRate: 20, // INCREASED from 15 to 20
        damage: damage,
        color: color,
        processed: {},
        // Add batch processing properties with pre-populated entities
        processedCount: 0,
        entitiesToProcess: entitiesToProcess,
        maxProcessPerFrame: 20 // INCREASED from 10 to 20
    });
    
    console.log(`Force wave added with damage=${damage}, maxRadius=${maxRadius}`);
    
    // Store reference for drawing effects (reusing owner's lastForceWave if possible)
    if (!owner.lastForceWave) {
        owner.lastForceWave = {
            pos: createVector(ownerX, ownerY),
            time: currentTime,
            color: color
        };
    } else {
        owner.lastForceWave.pos.set(ownerX, ownerY);
        owner.lastForceWave.time = currentTime;
        owner.lastForceWave.color = color;
    }

    // Play force blast sound
    if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
        soundManager.playWorldSound('force', ownerX, ownerY, player.pos);
    }
}

    /** 
     * Generic fire method that dispatches to specific weapon handlers
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     * @param {string} type - Weapon type
     * @param {Object} target - Optional target for aimed weapons
     */
    static fire(owner, system, angle, type = WEAPON_TYPE.PROJECTILE, target = null) {
        if (!owner || !system) return;
        
        // Extract count from type name if present (e.g., "spread3" -> 3)
        let count = 1;
        const countMatch = this._countRegex.exec(type);
        if (countMatch) {
            count = parseInt(countMatch[1], 10);
            // Remove count from type to get base type
            type = type.substring(0, countMatch.index);
        }
        
        // Handle different weapon types
        switch(type) {
            case WEAPON_TYPE.FORCE:
                this.fireForce(owner, system);
                break;
                
            case WEAPON_TYPE.BEAM:
                this.fireBeam(owner, system, angle);
                break;
                
            case WEAPON_TYPE.TURRET:
                this.fireTurret(owner, system, target || angle);
                break;
                
            case WEAPON_TYPE.STRAIGHT:
                this.fireStraight(owner, system, angle, count);
                break;
                
            case WEAPON_TYPE.SPREAD:
                this.fireSpread(owner, system, angle, count);
                break;
            case WEAPON_TYPE.MISSILE:
                if (!target) {
                    target = WeaponSystem.findNearestTarget(owner, system);
                }
                this.fireMissile(owner, system, angle, target);
                break;
            case WEAPON_TYPE.TANGLE: // Add this case
                this.fireTangle(owner, system, angle);
                break;
            case WEAPON_TYPE.BARRIER: // Added Barrier case
                // Activation logic is handled within the Player/Enemy class fireWeapon method
                // No direct action needed in WeaponSystem.fire for barrier activation itself.
                // console.log(`${owner.constructor.name} activated barrier.`);
                break;       
            default:
                // Default to single projectile
                this.fireProjectile(owner, system, angle);
        }
    }

    /** 
     * Fire a single projectile, using object pool if available
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     */
    static fireProjectile(owner, system, angle) {
        if (!owner?.currentWeapon) return;
        
        const weapon = owner.currentWeapon;
        const speed = weapon.speed || 8; // Use defined speed with fallback
        const ownerX = owner.pos.x;
        const ownerY = owner.pos.y;
        let proj;
        
        // Use the speed variable instead of hardcoded 8
        if (this.projectilePool) {
            proj = this.projectilePool.get(
                ownerX, ownerY, angle, owner,
                speed, weapon.damage, weapon.color, "projectile", null, 90, 0, 0, 5.0, 10.0, 0.1, system
            );
        }
        
        if (!proj) {
            proj = new Projectile(
                ownerX, ownerY, angle, owner,
                speed, weapon.damage, weapon.color
            );
            proj.system = system;
        }
        system.addProjectile(proj);
        
        // Play laser sound using playWorldSound
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            soundManager.playWorldSound('laser', ownerX, ownerY, player.pos);
        }
    }

    static fireMissile(owner, system, angle, target) {
        if (!owner?.currentWeapon) {
            console.warn("fireMissile: Owner has no currentWeapon.");
            return;
        }
        const weapon = owner.currentWeapon;
        const ownerX = owner.pos.x;
        const ownerY = owner.pos.y;
        let proj;

        // Get missile-specific properties from the weapon definition
        const speed = weapon.speed || 4; // Missile's own travel speed
        const damage = weapon.damage;
        const color = weapon.color;
        const weaponType = weapon.type;
        const lifespan = weapon.lifespan || 180; // Missile's lifespan
        const turnRate = weapon.turnRate || 0.05; // Missile's turn rate

        if (this.projectilePool) {
            // Pass all necessary parameters including target, lifespan, turnRate, missileSpeed, and system
            proj = this.projectilePool.get(
                ownerX, ownerY, angle, owner,
                speed, damage, color, weaponType, target, lifespan, turnRate, speed, 5.0, 10.0, 0.1, system
            );
        }

        if (!proj) {
            proj = new Projectile(
                ownerX, ownerY, angle, owner,
                speed, damage, color, weaponType, target, lifespan, turnRate, speed
            );
            proj.system = system;
        }
        system.addProjectile(proj);

        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            // Consider adding a specific 'missileLaunch' sound
            soundManager.playWorldSound('missileLaunch', ownerX, ownerY, player.pos);
        }
    }


    /** 
     * Fire multiple projectiles in a spread pattern
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Base firing angle in radians
     * @param {number} count - Number of projectiles to fire
     */
    static fireSpread(owner, system, angle, count = 3) {
        if (count < 1 || !owner || !system) return;
        
        // Calculate appropriate spread based on count
        const spreadMap = { 2: 0.18, 3: 0.3, 4: 0.4, 5: 0.2 };
        const spread = spreadMap[count] || 0.3;
        const halfSpread = spread * 0.5;
        const step = count > 1 ? spread / (count - 1) : 0;
        
        // Pre-calculate angles for better performance
        for (let i = 0; i < count; i++) {
            const projectileAngle = angle - halfSpread + i * step;
            this.fireProjectile(owner, system, projectileAngle);
        }
    }

    /** 
     * Fire multiple projectiles in parallel
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     * @param {number} count - Number of projectiles to fire
     */
    static fireStraight(owner, system, angle, count = 3) {
        if (count < 1 || !owner || !system || !owner.currentWeapon) return;
 
        // Offset projectiles perpendicular to angle
        const spacing = 12; // pixels between projectiles
        const mid = (count - 1) * 0.5; // Use multiplication instead of division
        const perpAngle = angle + HALF_PI;
        
        // Calculate perpendicular direction directly (faster than creating/setting vector)
        const perpDirX = cos(perpAngle);
        const perpDirY = sin(perpAngle);
        
        const weapon = owner.currentWeapon;
        const speed = weapon.speed || 8; // Use defined speed with fallback
        const damage = weapon.damage;
        const color = weapon.color;
        
        // Cache owner position for faster access
        const ownerX = owner.pos.x;
        const ownerY = owner.pos.y;
        
        for (let i = 0; i < count; i++) {
            const offset = (i - mid) * spacing;
            // Calculate the position with minimal vector allocations
            const x = ownerX + perpDirX * offset;
            const y = ownerY + perpDirY * offset;
            
            // FIXED: Create projectile at the correct offset position
            let proj;
            if (this.projectilePool) {
                proj = this.projectilePool.get(
                    x, y, angle, owner,
                    speed, damage, color, "projectile", null, 90, 0, 0, 5.0, 10.0, 0.1, system
                );
            } else {
                proj = new Projectile(
                    x, y, angle, owner,
                    speed, damage, color
                );
                proj.system = system;
            }
            system.addProjectile(proj);
        }
        
        // Play sound once for all projectiles
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            soundManager.playWorldSound('laser', ownerX, ownerY, player.pos);
        }
    }

    /** 
     * Fire a beam weapon and handle hit detection
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     */
    static fireBeam(owner, system, angle) {
        if (!owner || !system) return;

        const cache = this._ensureBeamCache();
        const { start, dir, end } = cache;
        const weapon = owner.currentWeapon;
        
        // Validate angle
        if (isNaN(angle) || !isFinite(angle)) {
            console.error("Invalid angle in fireBeam:", angle);
            return;
        }
        
        // Get beam properties and cache position
        const beamLength = 1200;
        const ownerX = owner.pos.x;
        const ownerY = owner.pos.y;
        start.set(ownerX, ownerY);
        
        // Handle player aiming at mouse cursor
        if (owner instanceof Player) {
            // Convert screen mouse position to world coordinates - cache calculations
            const halfWidth = width * 0.5;
            const halfHeight = height * 0.5;
            const worldMx = mouseX + ownerX - halfWidth;
            const worldMy = mouseY + ownerY - halfHeight;
            
            // Calculate angle to mouse cursor
            angle = atan2(worldMy - ownerY, worldMx - ownerX);
        }
        
        // Calculate beam direction and endpoint
        dir.set(cos(angle), sin(angle));
        
        if (isNaN(dir.x) || isNaN(dir.y)) {
            console.error("Invalid beam direction from angle:", angle);
            return;
        }
        
        // Default beam end in case nothing is hit
        end.set(start.x + dir.x * beamLength, start.y + dir.y * beamLength);

        // Perform hit detection and update beam end point
        const hit = this.performBeamHitDetection(owner, system, cache, beamLength);
        if (hit && hit.point) {
            end.set(hit.point.x, hit.point.y);
        }
        
        // Store beam info for drawing - reuse lastBeam if possible
        if (!owner.lastBeam) {
            owner.lastBeam = {
                start: createVector(start.x, start.y),
                end: createVector(end.x, end.y),
                color: weapon?.color || [255, 0, 0],
                time: millis(),
                hit: hit.target !== null
            };
        } else {
            owner.lastBeam.start.set(start.x, start.y);
            owner.lastBeam.end.set(end.x, end.y);
            owner.lastBeam.color = weapon?.color || [255, 0, 0];
            owner.lastBeam.time = millis();
            owner.lastBeam.hit = hit.target !== null;
        }
        
        // Handle hit effects
        if (hit.target) {
            this.handleHitEffects(
                hit.target,
                hit.point,
                weapon?.damage || 10,
                owner,
                system,
                weapon?.color || [255, 0, 0]
            );
        }

        // Play sound using playWorldSound
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            soundManager.playWorldSound('beam', ownerX, ownerY, player.pos);
        }
    }
    
    /**
     * Performs hit detection for beam weapons using cached vectors.
     * @param {Object} owner - Entity firing the beam
     * @param {Object} system - Current star system
     * @param {Object} cache - Shared beam cache from _ensureBeamCache()
     * @param {number} beamLength - Length of the beam
     * @return {Object} Hit result with target and hit point
     */
    static performBeamHitDetection(owner, system, cache, beamLength) {
        const { start, dir, hitPoint, defaultEnd } = cache;
        let hitTarget = null;
        let minDist = beamLength;

        // Snapshot cache values to avoid race conditions with multiple beams
        const startX = start.x;
        const startY = start.y;
        const dirX = dir.x;
        const dirY = dir.y;

        defaultEnd.set(startX + dirX * beamLength, startY + dirY * beamLength);

        const evaluateTarget = (target, radius) => {
            if (!target || !target.pos) return;
            if (radius <= 0) return;
            if (typeof target.isDestroyed === 'function' && target.isDestroyed()) return;

            const relX = target.pos.x - startX;
            const relY = target.pos.y - startY;
            const projLength = relX * dirX + relY * dirY;

            if (projLength <= 0 || projLength > minDist) return;

            const radialSq = relX * relX + relY * relY - projLength * projLength;
            const radiusSq = radius * radius;
            
            if (radialSq <= radiusSq) {
                minDist = projLength;
                hitTarget = target;
                hitPoint.set(startX + dirX * projLength, startY + dirY * projLength);
            }
        };

        const isPlayer = owner instanceof Player;
        const isEnemy = owner instanceof Enemy;
        
        if (isPlayer && system?.enemies?.length) {
            const enemies = system.enemies;
            for (let i = 0, len = enemies.length; i < len; i++) {
                const enemy = enemies[i];
                if (enemy === owner) continue;
                const radius = enemy.size ? enemy.size * 0.5 : 0;
                evaluateTarget(enemy, radius);
            }
        }

        if (system?.asteroids?.length) {
            const asteroids = system.asteroids;
            for (let i = 0, len = asteroids.length; i < len; i++) {
                const asteroid = asteroids[i];
                const radius = asteroid.maxRadius !== undefined ? asteroid.maxRadius : (asteroid.size ? asteroid.size * 0.5 : 0);
                evaluateTarget(asteroid, radius);
            }
        }

        if (isEnemy) {
            if (system?.player) {
                const playerRadius = system.player.size ? system.player.size * 0.5 : 0;
                evaluateTarget(system.player, playerRadius);
            }

            if (system?.enemies?.length) {
                const enemies = system.enemies;
                for (let i = 0, len = enemies.length; i < len; i++) {
                    const enemy = enemies[i];
                    if (enemy === owner) continue;
                    const radius = enemy.size ? enemy.size * 0.5 : 0;
                    evaluateTarget(enemy, radius);
                }
            }
        }

        // Return new object instead of reusing hitResult to avoid race conditions
        // when multiple beams fire in the same frame
        return {
            target: hitTarget,
            point: hitTarget ? hitPoint : defaultEnd
        };
    }
    
    /**
     * Find the nearest valid target for a turret
     * @param {Object} owner - Entity firing the turret
     * @param {Object} system - Current star system
     * @return {Object|null} The nearest valid target or null
     */
    static findNearestTarget(owner, system) {
        if (!owner || !system) return null;
        
        // Find nearest enemy if player is firing
        if (owner instanceof Player) {
            const enemies = system.enemies;
            if (!enemies || enemies.length === 0) return null;
            
            let nearestEnemy = null;
            let closestDistSq = Infinity;
            const ownerX = owner.pos.x;
            const ownerY = owner.pos.y;
            
            // Use squared distance to avoid sqrt
            for (let i = 0, len = enemies.length; i < len; i++) {
                const enemy = enemies[i];
                if (!enemy?.pos) continue;
                
                const dx = enemy.pos.x - ownerX;
                const dy = enemy.pos.y - ownerY;
                const distSq = dx * dx + dy * dy;
                
                if (distSq < closestDistSq) {
                    nearestEnemy = enemy;
                    closestDistSq = distSq;
                }
            }
            
            return nearestEnemy;
        }
        // Find player if enemy is firing
        else if (owner instanceof Enemy && system.player?.pos) {
            return system.player;
        }
        
        return null;
    }

// Tangle weapons
    /**
     * Fire a tangle weapon that temporarily immobilizes the target
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     */

static fireTangle(owner, system, angle) {
    if (!owner?.currentWeapon) return;
    
    const weapon = owner.currentWeapon;
    const ownerX = owner.pos.x;
    const ownerY = owner.pos.y;
    const speed = weapon.speed || 6; // Slower than regular projectiles
    const tangleDuration = weapon.tangleDuration || 5.0;
    const dragMultiplier = weapon.dragMultiplier || 10.0;
    const rotationBlockMultiplier = weapon.rotationBlockMultiplier || 0.1;
    
    let proj;
    
    // Create projectile with tangle properties using unified duration
    if (this.projectilePool) {
        proj = this.projectilePool.get(
            ownerX, ownerY, angle, owner,
            speed, weapon.damage, weapon.color, 
            "tangle", null, 60, 0, 0, 
            tangleDuration, dragMultiplier,
            rotationBlockMultiplier, system
        );
    } else {
        proj = new Projectile(
            ownerX, ownerY, angle, owner,
            speed, weapon.damage, weapon.color, 
            "tangle", null, 60, 0, 0,
            tangleDuration, dragMultiplier,
            rotationBlockMultiplier
        );
        proj.system = system;
    }
    
    // Make projectile bigger
    proj.size = weapon.projectileSize || 7;
    system.addProjectile(proj);
    
    // Play tangle sound
    if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
        soundManager.playWorldSound('laser', ownerX, ownerY, player.pos);
    }
}

    /** 
     * Fire a turret weapon that auto-aims at the nearest target
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {Object|number} target - Target object or fallback angle
     */
    static fireTurret(owner, system, target) {
        if (!owner || !system) return;
        
        // If target is not provided or invalid, find one
        if (!target?.pos) {
            target = this.findNearestTarget(owner, system);
        }
        
        // If still no valid target, fire forward
        if (!target?.pos) {
            this.fireProjectile(owner, system, owner.angle);
            return;
        }
        
        // Calculate angle to target - use atan2 directly (Math. is faster than p5)
        const dx = target.pos.x - owner.pos.x;
        const dy = target.pos.y - owner.pos.y;
        const angleToTarget = atan2(dy, dx);
        
        // Fire the projectile at the calculated angle
        this.fireProjectile(owner, system, angleToTarget);
    }

    /**
     * Handles all weapon hit effects in one centralized place
     * @param {Object} target - The entity being hit
     * @param {Object} hitPoint - Position where the hit occurred
     * @param {number} damage - Amount of damage being dealt
     * @param {Object} owner - Entity that fired the weapon
     * @param {Object} system - Current star system
     * @param {Array|p5.Color} color - Weapon color for visual effects
     */
    static handleHitEffects(target, hitPoint, damage, owner, system, color) {
        // IMPORTANT: Check shield status BEFORE applying damage
        const targetHasShield = target.shield > 0;
        
        // Apply damage and get result, passing owner as the attacker
        target.takeDamage(damage, owner);
        
        // Set shield hit time if target has shields
        if (targetHasShield) {
            target.lastShieldHitTime = millis();
        }
        
        // Only create explosion if there were NO shields before the hit
        if (!targetHasShield && system.addExplosion) {
            // Convert color to safe format - cache isArray check
            const isColorArray = Array.isArray(color);
            const explosionColor = isColorArray ? color :
                (color && color.levels) ? [color.levels[0], color.levels[1], color.levels[2]] :
                [255, 0, 0];
            
            system.addExplosion(hitPoint.x, hitPoint.y, 5, explosionColor);
        }
    }
    
    /**
     * Clean up and release projectiles
     * This should be called by the system when projectiles are removed
     * @param {Projectile} projectile - The projectile to release back to pool
     */
    static releaseProjectile(projectile) {
        if (this.projectilePool && projectile) {
            this.projectilePool.release(projectile);
        }
    }
    
    /**
     * Get stats about the projectile pool
     * @return {Object} Stats object
     */
    static getPoolStats() {
        return this.projectilePool ? this.projectilePool.getStats() : null;
    }
}

