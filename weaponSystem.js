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
    TANGLE: 'tangle'
};

// --- Helper functions ---
function getWeaponProp(weapon, prop, fallback) {
    return (weapon && weapon[prop] !== undefined) ? weapon[prop] : fallback;
}
function playWorldSound(type, owner) {
    if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
        soundManager.playWorldSound(type, owner.pos.x, owner.pos.y, player.pos);
    }
}

class WeaponSystem {
    // Initialize all object pools
    static init(initialPoolSize = 100) {
        try {
            if (typeof ObjectPool === 'undefined') {
                console.warn("ObjectPool class not found! Falling back to direct instantiation.");
                return false;
            }
            
            // Initialize projectile pool
            if (!this.projectilePool) {
                console.log(`Initializing projectile pool with ${initialPoolSize} projectiles`);
                this.projectilePool = new ObjectPool(Projectile, initialPoolSize, 2000);
            }
            
            // Initialize explosion pool if Explosion class exists
            if (typeof Explosion !== 'undefined' && !this.explosionPool) {
                console.log("Initializing explosion effect pool");
                this.explosionPool = new ObjectPool(Explosion, 50, 300);
            }
            
            // Initialize beam pool if Beam class exists
            if (typeof Beam !== 'undefined' && !this.beamPool) {
                console.log("Initializing beam effect pool");
                this.beamPool = new ObjectPool(Beam, 10, 50);
            }
            
            // Initialize force wave pool if ForceWave class exists
            if (typeof ForceWave !== 'undefined' && !this.forceWavePool) {
                console.log("Initializing force wave pool");
                this.forceWavePool = new ObjectPool(ForceWave, 5, 20);
            }
            
            // Track pooled entity types for debugging
            this._pooledTypes = ['projectile'];
            if (typeof Explosion !== 'undefined') this._pooledTypes.push('explosion');
            if (typeof Beam !== 'undefined') this._pooledTypes.push('beam');
            if (typeof ForceWave !== 'undefined') this._pooledTypes.push('forceWave');
            
            console.log(`Weapon system initialized with ${this._pooledTypes.length} object pools`);
            return true;
        } catch (e) {
            console.error("Error initializing weapon system pools:", e);
            return false;
        }
    }
    
    /**
     * Get an object from its pool or create directly if pool doesn't exist
     * @param {string} type - The type of object to get
     * @param {Array} args - Arguments to pass to constructor/reset
     * @returns {Object} The pooled object
     */
    static getPooledObject(type, ...args) {
        let obj = null;
        
        try {
            switch(type) {
                case 'projectile':
                    if (this.projectilePool) {
                        obj = this.projectilePool.get(...args);
                    } else if (typeof Projectile !== 'undefined') {
                        obj = new Projectile(...args);
                    }
                    break;
                    
                case 'explosion':
                    if (this.explosionPool) {
                        obj = this.explosionPool.get(...args);
                    } else if (typeof Explosion !== 'undefined') {
                        obj = new Explosion(...args);
                    }
                    break;
                    
                case 'beam':
                    if (this.beamPool) {
                        obj = this.beamPool.get(...args);
                    } else if (typeof Beam !== 'undefined') {
                        obj = new Beam(...args);
                    }
                    break;
                
                case 'forceWave':
                    if (this.forceWavePool && typeof ForceWave !== 'undefined') {
                        obj = this.forceWavePool.get(...args);
                    } else if (typeof ForceWave !== 'undefined') {
                        obj = new ForceWave(...args);
                    }
                    break;
                    
                default:
                    console.warn(`Unknown object type '${type}' in getPooledObject`);
                    break;
            }
            
            if (!obj) {
                console.warn(`Failed to get pooled object of type '${type}'`);
            }
        } catch (error) {
            console.error(`Error in getPooledObject for type '${type}':`, error);
        }
        
        return obj;
    }
    
    /**
     * Return an object to its pool
     * @param {Object} obj - The object to release
     * @param {string} type - The type of object
     */
    static releasePooledObject(obj, type) {
        if (!obj) return;
        
        try {
            switch(type) {
                case 'projectile':
                    if (this.projectilePool) this.projectilePool.release(obj);
                    break;
                    
                case 'explosion':
                    if (this.explosionPool) this.explosionPool.release(obj);
                    break;
                    
                case 'beam':
                    if (this.beamPool) this.beamPool.release(obj);
                    break;
                    
                case 'forceWave':
                    if (this.forceWavePool) this.forceWavePool.release(obj);
                    break;
                    
                default:
                    console.warn(`Unknown object type '${type}' in releasePooledObject`);
                    break;
            }
        } catch (error) {
            console.error(`Error in releasePooledObject for type '${type}':`, error);
        }
    }
    
/** 
 * Handles force blast weapon (area effect damage)
 * @param {Object} owner - Entity firing the weapon
 * @param {Object} system - Current star system
 */
static fireForce(owner, system) {
    if (!owner || !system) return;
    
    console.log(`Force weapon fired by ${owner.constructor.name}`); // Debug output
    
    // Initialize static force wave position vector if not exists
    if (!this._forceWavePos) {
        this._forceWavePos = createVector(0, 0);
    }
    
    // Reuse vector instead of creating a new one
    this._forceWavePos.set(owner.pos.x, owner.pos.y);
    
    // Get owner's current weapon for properties
    const weapon = owner.currentWeapon;
    const damage = weapon?.damage || 20;
    const color = weapon?.color || [255, 0, 0];
    const maxRadius = weapon?.maxRadius || 1000; // INCREASED from 750 to 1000
    
    // Pre-populate enemies to process - THIS IS THE KEY FIX
    let entitiesToProcess = [];
    if (owner === system.player) {
        // Player attacking enemies
        entitiesToProcess = [...system.enemies, ...system.asteroids];
        console.log(`Found ${entitiesToProcess.length} potential targets for force wave`);
    } else if (system.player) {
        // Enemy attacking player
        entitiesToProcess = [system.player];
    }
    
    // Create force wave in the system (reuse objects to minimize allocation)
    system.forceWaves.push({
        pos: this._forceWavePos,
        owner: owner,
        startTime: millis(),
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
            pos: createVector(this._forceWavePos.x, this._forceWavePos.y),
            time: millis(),
            color: color
        };
    } else {
        owner.lastForceWave.pos.set(this._forceWavePos.x, this._forceWavePos.y);
        owner.lastForceWave.time = millis();
        owner.lastForceWave.color = color;
    }

    // Play force blast sound
    if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
        soundManager.playWorldSound('force', owner.pos.x, owner.pos.y, player.pos);
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
        const countMatch = /(\d+)$/.exec(type);
        if (countMatch) {
            count = parseInt(countMatch[1]);
            // Remove count from type to get base type
            type = type.replace(/\d+$/, '');
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
            case WEAPON_TYPE.MISSILE: // New case for missiles
                this.fireMissile(owner, system, angle, target);
                break;
            case WEAPON_TYPE.TANGLE: // Add this case
                this.fireTangle(owner, system, angle);
                break;       
            default:
                // Default to single projectile
                this.fireProjectile(owner, system, angle);
        }
    }

    /** 
     * Get or create a vector, reusing cached instance if available
     * @param {string} cacheProp - Property name for cached vector
     * @param {number} x - Initial x value (optional)
     * @param {number} y - Initial y value (optional)
     * @returns {p5.Vector} The vector instance
     */
    static getOrCreateVector(cacheProp, x = 0, y = 0) {
        if (!this[cacheProp]) this[cacheProp] = createVector(x, y);
        else this[cacheProp].set(x, y);
        return this[cacheProp];
    }

    /** 
     * Get a pooled object or create a new instance if pool is not available
     * @param {string} type - The type of object to get
     * @param {Array} args - Arguments to pass to constructor/reset
     * @returns {Object} The pooled or newly created object
     */
    static getPooledOrNew(type, ...args) {
        switch(type) {
            case 'projectile':
                return this.projectilePool ? this.projectilePool.get(...args) : new Projectile(...args);
            case 'explosion':
                return this.explosionPool ? this.explosionPool.get(...args) : new Explosion(...args);
            case 'beam':
                return this.beamPool ? this.beamPool.get(...args) : new Beam(...args);
            case 'forceWave':
                return this.forceWavePool ? this.forceWavePool.get(...args) : new ForceWave(...args);
            default:
                console.warn(`Unknown pooled type: ${type}`);
                return null;
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
        const speed = getWeaponProp(weapon, 'speed', 8);
        const proj = this.getPooledOrNew('projectile', owner.pos.x, owner.pos.y, angle, owner, speed, weapon.damage, weapon.color);
        proj.system = system;
        system.addProjectile(proj);
        
        playWorldSound('laser', owner);
    }

    static fireMissile(owner, system, angle, target) {
        if (!owner?.currentWeapon) return;
        
        // Log missile firing attempt with owner information
        console.log(`Firing missile from ${owner.constructor.name} ${owner.shipTypeName || 'unknown'} at target:`, target ? target.constructor.name : 'no target');
        
        const w = owner.currentWeapon;
        const args = [owner.pos.x, owner.pos.y, angle, owner, getWeaponProp(w, 'speed', 4), w.damage, w.color, w.type, target, getWeaponProp(w, 'lifespan', 180), getWeaponProp(w, 'turnRate', 0.05), getWeaponProp(w, 'speed', 4)];
        const proj = this.getPooledOrNew('projectile', ...args);
        if (proj && target) proj.target = target;
        proj.system = system;
        system.addProjectile(proj);
        
        playWorldSound('missileLaunch', owner);
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
        const spread = {2:0.18,3:0.3,4:0.4,5:0.2}[count] || 0.3;
        const start = -spread / 2, step = count > 1 ? spread / (count - 1) : 0;
        
        for (let i = 0; i < count; i++) this.fireProjectile(owner, system, angle + start + i * step);
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
 
        const spacing = 12, mid = (count - 1) / 2, perpAngle = angle + HALF_PI;
        const perpDir = this.getOrCreateVector('_perpDir', cos(perpAngle), sin(perpAngle));
        const weapon = owner.currentWeapon, speed = getWeaponProp(weapon, 'speed', 8);
        
        for (let i = 0; i < count; i++) {
            let offset = (i - mid) * spacing;
            let x = owner.pos.x + perpDir.x * offset, y = owner.pos.y + perpDir.y * offset;
            const proj = this.getPooledOrNew('projectile', x, y, angle, owner, speed, weapon.damage, weapon.color);
            proj.system = system;
            system.addProjectile(proj);
        }
        
        playWorldSound('laser', owner);
    }

    /** 
     * Fire a beam weapon and handle hit detection
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     */
    static fireBeam(owner, system, angle) {
        if (!owner || !system) return;
        
        // Validate angle
        if (isNaN(angle) || !isFinite(angle)) {
            console.error("Invalid angle in fireBeam:", angle);
            return;
        }
        
        // Get beam properties
        const beamLength = 1200;
        
        // Reuse vectors to avoid garbage collection
        const beamStart = this.getOrCreateVector('_beamStart', owner.pos.x, owner.pos.y);
        const beamDir = this.getOrCreateVector('_beamDir', cos(angle), sin(angle));
        const beamEnd = this.getOrCreateVector('_beamEnd');
        
        // Handle player aiming at mouse cursor
        if (owner instanceof Player) {
            // Convert screen mouse position to world coordinates
            const worldMx = mouseX + (owner.pos.x - width/2);
            const worldMy = mouseY + (owner.pos.y - height/2);
            
            // Calculate angle to mouse cursor
            angle = atan2(worldMy - owner.pos.y, worldMx - owner.pos.x);
            beamDir.set(cos(angle), sin(angle));
        }
        
        // Calculate beam direction and endpoint
        const hit = this.performBeamHitDetection(owner, system, beamStart, beamDir, beamLength);
        if (hit && hit.point && hit.target) {
            // If the target has a shield, draw to the edge of the shield
            if (typeof hit.target.shield === 'number' && hit.target.shield > 0 && hit.target.pos) {
                // Calculate direction from beam start to target center
                const dirToTarget = p5.Vector.sub(hit.target.pos, beamStart).normalize();
                // Use the same shield radius as in collision: target.size * 0.6
                const shieldRadius = (hit.target.size || 20) * 0.6;
                // Set endpoint to the edge of the shield
                beamEnd.set(
                    hit.target.pos.x - dirToTarget.x * shieldRadius,
                    hit.target.pos.y - dirToTarget.y * shieldRadius
                );
            } else {
                beamEnd.set(hit.point.x, hit.point.y);
            }
        } else {
            beamEnd.set(beamStart.x + beamDir.x * beamLength, beamStart.y + beamDir.y * beamLength);
        }
        // Store beam info for drawing - reuse lastBeam if possible
        if (!owner.lastBeam) {
            owner.lastBeam = {
                start: createVector(beamStart.x, beamStart.y),
                end: createVector(beamEnd.x, beamEnd.y),
                color: owner.currentWeapon?.color || [255, 0, 0],
                time: millis(),
                hit: !!(hit && hit.target)
            };
        } else {
            owner.lastBeam.start.set(beamStart.x, beamStart.y);
            owner.lastBeam.end.set(beamEnd.x, beamEnd.y);
            owner.lastBeam.color = owner.currentWeapon?.color || [255, 0, 0];
            owner.lastBeam.time = millis();
            owner.lastBeam.hit = !!(hit && hit.target);
        }
        
        // Handle hit effects
        if (hit.target) {
            this.handleHitEffects(
                hit.target,
                hit.point,
                getWeaponProp(owner.currentWeapon, 'damage', 10),
                owner,
                system,
                owner.currentWeapon?.color || [255, 0, 0]
            );
        }

        playWorldSound('beam', owner);
    }
    
    /**
     * Performs hit detection for beam weapons
     * @param {Object} owner - Entity firing the beam
     * @param {Object} system - Current star system
     * @param {p5.Vector} beamStart - Starting position of beam
     * @param {p5.Vector} beamDir - Normalized direction vector
     * @param {number} beamLength - Length of the beam
     * @return {Object} Hit result with target and hit point
     */
    static performBeamHitDetection(owner, system, beamStart, beamDir, beamLength) {
        let hitTarget = null;
        let minDist = Infinity;
        // Reuse static vectors for temp calculations
        if (!this._toTarget) this._toTarget = createVector(0, 0);
        if (!this._hitPoint) this._hitPoint = createVector(0, 0);
        // Cache references
        const isPlayer = owner instanceof Player;
        const isEnemy = owner instanceof Enemy;
        const enemies = system?.enemies;
        const player = system?.player;
        const asteroids = system?.asteroids;
        const enemyShieldMult = 0.6;
        const asteroidShieldMult = 0.6;
        // Check enemies if owner is Player
        if (isPlayer && enemies && enemies.length) {
            for (let i = 0, len = enemies.length; i < len; i++) {
                const enemy = enemies[i];
                if (enemy === owner || (enemy.isDestroyed && enemy.isDestroyed()) || !enemy?.pos) continue;
                this._toTarget.set(enemy.pos.x - beamStart.x, enemy.pos.y - beamStart.y);
                const projLen = this._toTarget.dot(beamDir);
                if (projLen < 0 || projLen > beamLength) continue;
                const closestX = beamStart.x + beamDir.x * projLen;
                const closestY = beamStart.y + beamDir.y * projLen;
                const size = enemy.size * enemyShieldMult;
                const distToLine = dist(enemy.pos.x, enemy.pos.y, closestX, closestY);
                if (distToLine < size && projLen < minDist) {
                    minDist = projLen;
                    hitTarget = enemy;
                    this._hitPoint.set(closestX, closestY);
                    if (projLen === 0) break; // Can't get closer
                }
            }
        }
        // Check player if owner is Enemy
        if (isEnemy && player?.pos && player !== owner) {
            this._toTarget.set(player.pos.x - beamStart.x, player.pos.y - beamStart.y);
            const projLen = this._toTarget.dot(beamDir);
            if (projLen >= 0 && projLen <= beamLength) {
                const closestX = beamStart.x + beamDir.x * projLen;
                const closestY = beamStart.y + beamDir.y * projLen;
                const size = player.size * enemyShieldMult;
                const distToLine = dist(player.pos.x, player.pos.y, closestX, closestY);
                if (distToLine < size && projLen < minDist) {
                    minDist = projLen;
                    hitTarget = player;
                    this._hitPoint.set(closestX, closestY);
                    if (projLen === 0) return { target: hitTarget, point: this._hitPoint, length: minDist };
                }
            }
        }
        // Check asteroids for beam collision
        if (asteroids && Array.isArray(asteroids)) {
            for (let i = 0, len = asteroids.length; i < len; i++) {
                const asteroid = asteroids[i];
                if (!asteroid?.pos || asteroid.destroyed || asteroid === owner) continue;
                this._toTarget.set(asteroid.pos.x - beamStart.x, asteroid.pos.y - beamStart.y);
                const projLen = this._toTarget.dot(beamDir);
                if (projLen < 0 || projLen > beamLength) continue;
                const closestX = beamStart.x + beamDir.x * projLen;
                const closestY = beamStart.y + beamDir.y * projLen;
                const size = (asteroid.size || 20) * asteroidShieldMult;
                const distToLine = dist(asteroid.pos.x, asteroid.pos.y, closestX, closestY);
                if (distToLine < size && projLen < minDist) {
                    minDist = projLen;
                    hitTarget = asteroid;
                    this._hitPoint.set(closestX, closestY);
                    if (projLen === 0) break;
                }
            }
        }
        if (hitTarget) {
            return {
                target: hitTarget,
                point: this._hitPoint,
                length: minDist
            };
        }
        return {
            target: null,
            point: beamStart,
            length: beamLength
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
        if (owner instanceof Player && system.enemies?.length > 0) {
            let nearestEnemy = null;
            let closestDist = Infinity;
            
            for (const enemy of system.enemies) {
                if (!enemy?.pos) continue;
                
                const dist = p5.Vector.dist(owner.pos, enemy.pos);
                if (dist < closestDist) {
                    nearestEnemy = enemy;
                    closestDist = dist;
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
    
    const w = owner.currentWeapon;
    const args = [owner.pos.x, owner.pos.y, angle, owner, getWeaponProp(w, 'speed', 6), w.damage, w.color, "tangle", null, 60, 0, 0, getWeaponProp(w, 'dragDuration', 5.0), getWeaponProp(w, 'dragMultiplier', 10.0)];
    const proj = this.getPooledOrNew('projectile', ...args);
    proj.size = getWeaponProp(w, 'projectileSize', 7);
    proj.system = system;
    system.addProjectile(proj);
    
    playWorldSound('laser', owner);
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
        
        // Calculate angle to target
        const dx = target.pos.x - owner.pos.x;
        const dy = target.pos.y - owner.pos.y;
        const angleToTarget = Math.atan2(dy, dx);
        
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
        
        // Apply damage and get result
        target.takeDamage(damage, owner);
        
        // Set shield hit time if target has shields
        if (targetHasShield) {
            target.lastShieldHitTime = millis();
        }
        
        // Only create explosion if there were NO shields before the hit
        if (!targetHasShield && system.addExplosion) {
            // Convert color to safe format
            let explosionColor;
            if (Array.isArray(color)) {
                explosionColor = color;
            } else if (color && color.levels) {
                explosionColor = [color.levels[0], color.levels[1], color.levels[2]];
            } else {
                explosionColor = [255, 0, 0];
            }
            
            system.addExplosion(hitPoint.x, hitPoint.y, 5, explosionColor);
        }
        // Missile explosion effect
        const isMissile = owner?.currentWeapon?.type === WEAPON_TYPE.MISSILE || owner?.type === WEAPON_TYPE.MISSILE;
        if (isMissile && hitPoint && system && typeof system.addExplosion === 'function') {
            const explosionSize = owner?.currentWeapon?.explosionSize || 18;
            // Defensive color fallback: ensure color is array or p5.Color
            let explosionColor = color;
            if (!explosionColor || typeof explosionColor === 'number' || (Array.isArray(explosionColor) && explosionColor.length < 3)) {
                explosionColor = [255, 180, 80];
            }
            system.addExplosion(hitPoint.x, hitPoint.y, explosionSize, explosionColor);
        }
    }
    
    /**
     * Clean up and release projectiles
     * This should be called by the system when projectiles are removed
     * @param {Projectile} projectile - The projectile to release back to pool
     */
    static releaseProjectile(projectile) {
        if (projectile) {
            this.releasePooledObject(projectile, 'projectile');
        }
    }
    
    /** Release an explosion back to the pool */
    static releaseExplosion(explosion) {
        if (explosion) {
            this.releasePooledObject(explosion, 'explosion');
        }
    }
    
    /** Release a beam back to the pool */
    static releaseBeam(beam) {
        if (beam) {
            this.releasePooledObject(beam, 'beam');
        }
    }
    
    /** Release a force wave back to the pool */
    static releaseForceWave(forceWave) {
        if (forceWave) {
            this.releasePooledObject(forceWave, 'forceWave');
        }
    }
    
    /**
     * Get stats about all object pools
     * @return {Object} Stats object with detailed information for each pool type
     */
    static getPoolStats() {
        const stats = {};
        
        if (this.projectilePool) {
            stats.projectile = this.projectilePool.getStats();
        }
        
        if (this.explosionPool) {
            stats.explosion = this.explosionPool.getStats();
        }
        
        if (this.beamPool) {
            stats.beam = this.beamPool.getStats();
        }
        
        if (this.forceWavePool) {
            stats.forceWave = this.forceWavePool.getStats();
        }
        
        return stats;
    }
}

