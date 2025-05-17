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
     * Fire a single projectile, using object pool if available
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     */
    static fireProjectile(owner, system, angle) {
        if (!owner?.currentWeapon) return;
        
        const weapon = owner.currentWeapon;
        const speed = weapon.speed || 8; // Use defined speed with fallback
        let proj;
        
        // Use the speed variable instead of hardcoded 8
        if (this.projectilePool) {
            proj = this.projectilePool.get(
                owner.pos.x, owner.pos.y, angle, owner,
                speed, weapon.damage, weapon.color
            );
        }
        
        if (!proj) {
            proj = new Projectile(
                owner.pos.x, owner.pos.y, angle, owner,
                speed, weapon.damage, weapon.color
            );
        }
            
        // Add reference to system for proper cleanup
        proj.system = system;
        system.addProjectile(proj);
        
        // Play laser sound using playWorldSound
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            soundManager.playWorldSound('laser', owner.pos.x, owner.pos.y, player.pos);
        }
    }

    static fireMissile(owner, system, angle, target) {
        if (!owner?.currentWeapon) {
            console.warn("fireMissile: Owner has no currentWeapon.");
            return;
        }
        
        // Log missile firing attempt with owner information
        console.log(`Firing missile from ${owner.constructor.name} ${owner.shipTypeName || 'unknown'} at target:`, target ? target.constructor.name : 'no target');
        
        const weapon = owner.currentWeapon;
        let proj;

        // Get missile-specific properties from the weapon definition
        const speed = weapon.speed || 4; // Missile's own travel speed
        const damage = weapon.damage;
        const color = weapon.color;
        const lifespan = weapon.lifespan || 180; // Missile's lifespan
        const turnRate = weapon.turnRate || 0.05; // Missile's turn rate

        if (this.projectilePool) {
            // Pass all necessary parameters including target, lifespan, turnRate, and missileSpeed
            proj = this.projectilePool.get(
                owner.pos.x, owner.pos.y, angle, owner,
                speed, damage, color, weapon.type, target, lifespan, turnRate, speed // last 'speed' is missileSpeed
            );
        }

        if (!proj) {
            proj = new Projectile(
                owner.pos.x, owner.pos.y, angle, owner,
                speed, damage, color, weapon.type, target, lifespan, turnRate, speed // last 'speed' is missileSpeed
            );
        }
        
        // Ensure the missile has a target reference (important for tracking)
        if (proj && target) {
            proj.target = target;
            console.log(`Missile projectile created with target:`, target.constructor.name);
        } else if (proj) {
            console.log(`WARNING: Missile created without target!`);
        }

        proj.system = system;
        system.addProjectile(proj);

        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            // Consider adding a specific 'missileLaunch' sound
            soundManager.playWorldSound('missileLaunch', owner.pos.x, owner.pos.y, player.pos);
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
        
        const start = -spread / 2;
        const step = count > 1 ? spread / (count - 1) : 0;
        
        for (let i = 0; i < count; i++) {
            this.fireProjectile(owner, system, angle + start + i * step);
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
 
        // Initialize perpendicular direction vector if not exists
        if (!this._perpDir) {
            this._perpDir = createVector(0, 0);
        }
        
        // Offset projectiles perpendicular to angle
        const spacing = 12; // pixels between projectiles
        const mid = (count - 1) / 2;
        const perpAngle = angle + HALF_PI;
        
        // Set the vector direction without creating a new one
        this._perpDir.set(cos(perpAngle), sin(perpAngle));
        
        const weapon = owner.currentWeapon;
        const speed = weapon.speed || 8; // Use defined speed with fallback
        
        for (let i = 0; i < count; i++) {
            let offset = (i - mid) * spacing;
            // Calculate the position with minimal vector allocations
            let x = owner.pos.x + this._perpDir.x * offset;
            let y = owner.pos.y + this._perpDir.y * offset;
            
            // FIXED: Create projectile at the correct offset position
            let proj;
            if (this.projectilePool) {
                proj = this.projectilePool.get(
                    x, y, angle, owner,
                    speed, weapon.damage, weapon.color
                );
            } else {
                proj = new Projectile(
                    x, y, angle, owner,
                    speed, weapon.damage, weapon.color
                );
            }
            
            // Add reference to system for proper cleanup
            proj.system = system;
            system.addProjectile(proj);
        }
        
        // Play sound once for all projectiles
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            soundManager.playWorldSound('laser', owner.pos.x, owner.pos.y, player.pos);
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
        
        // Validate angle
        if (isNaN(angle) || !isFinite(angle)) {
            console.error("Invalid angle in fireBeam:", angle);
            return;
        }
        
        // Get beam properties
        const beamLength = 1200;
        
        // Reuse vectors to avoid garbage collection
        if (!this._beamStart) {
            this._beamStart = createVector(0, 0);
            this._beamDir = createVector(0, 0);
            this._beamEnd = createVector(0, 0);
        }
        
        this._beamStart.set(owner.pos.x, owner.pos.y);
        
        // Handle player aiming at mouse cursor
        if (owner instanceof Player) {
            // Convert screen mouse position to world coordinates
            const worldMx = mouseX + (owner.pos.x - width/2);
            const worldMy = mouseY + (owner.pos.y - height/2);
            
            // Calculate angle to mouse cursor
            angle = atan2(worldMy - owner.pos.y, worldMx - owner.pos.x);
        }
        
        // Calculate beam direction and endpoint
        this._beamDir.set(cos(angle), sin(angle));
        
        if (isNaN(this._beamDir.x) || isNaN(this._beamDir.y)) {
            console.error("Invalid beam direction from angle:", angle);
            return;
        }
        
        this._beamEnd.set(
            this._beamStart.x + this._beamDir.x * beamLength,
            this._beamStart.y + this._beamDir.y * beamLength
        );
        
        // Perform hit detection
        const hit = this.performBeamHitDetection(owner, system, this._beamStart, this._beamDir, beamLength);
        
        // Store beam info for drawing - reuse lastBeam if possible
        if (!owner.lastBeam) {
            owner.lastBeam = {
                start: createVector(this._beamStart.x, this._beamStart.y),
                end: createVector(this._beamEnd.x, this._beamEnd.y),
                color: owner.currentWeapon?.color || [255, 0, 0],
                time: millis(),
                hit: hit.target !== null
            };
        } else {
            owner.lastBeam.start.set(this._beamStart.x, this._beamStart.y);
            owner.lastBeam.end.set(this._beamEnd.x, this._beamEnd.y);
            owner.lastBeam.color = owner.currentWeapon?.color || [255, 0, 0];
            owner.lastBeam.time = millis();
            owner.lastBeam.hit = hit.target !== null;
        }
        
        // Handle hit effects
        if (hit.target) {
            this.handleHitEffects(
                hit.target,
                hit.point,
                owner.currentWeapon?.damage || 10,
                owner,
                system,
                owner.currentWeapon?.color || [255, 0, 0]
            );
        }

        // Play sound using playWorldSound
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            soundManager.playWorldSound('beam', owner.pos.x, owner.pos.y, player.pos);
        }
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
        
        // Reuse vectors for calculations
        if (!this._toTarget) {
            this._toTarget = createVector(0, 0);
            this._closestPoint = createVector(0, 0);
            this._hitPoint = createVector(0, 0);
        }
        
        // Check enemies if owner is Player
        if (owner instanceof Player && system?.enemies) {
            for (let enemy of system.enemies) {
                if (!enemy?.pos || enemy === owner) continue;
                
                // Calculate vector from beam start to enemy
                this._toTarget.set(enemy.pos.x - beamStart.x, enemy.pos.y - beamStart.y);
                let projLength = this._toTarget.dot(beamDir);
                
                if (projLength > 0 && projLength < beamLength) {
                    // Calculate closest point on beam to enemy
                    this._closestPoint.set(
                        beamStart.x + beamDir.x * projLength,
                        beamStart.y + beamDir.y * projLength
                    );
                    
                    // Calculate distance from enemy to closest point on beam
                    let distToBeam = dist(enemy.pos.x, enemy.pos.y, 
                                          this._closestPoint.x, this._closestPoint.y);
                    
                    if (distToBeam < enemy.size / 2 && projLength < minDist) {
                        minDist = projLength;
                        hitTarget = enemy;
                        this._hitPoint.set(this._closestPoint.x, this._closestPoint.y);
                    }
                }
            }
        }
        
        // Check player if owner is Enemy
        if (owner instanceof Enemy && system?.player?.pos) {
            // Calculate vector from beam start to player
            this._toTarget.set(system.player.pos.x - beamStart.x, 
                              system.player.pos.y - beamStart.y);
            let projLength = this._toTarget.dot(beamDir);
            
            if (projLength > 0 && projLength < beamLength) {
                // Calculate closest point on beam to player
                this._closestPoint.set(
                    beamStart.x + beamDir.x * projLength,
                    beamStart.y + beamDir.y * projLength
                );
                
                // Calculate distance from player to closest point on beam
                let distToBeam = dist(system.player.pos.x, system.player.pos.y, 
                                      this._closestPoint.x, this._closestPoint.y);
                
                if (distToBeam < system.player.size / 2 && projLength < minDist) {
                    minDist = projLength;
                    hitTarget = system.player;
                    this._hitPoint.set(this._closestPoint.x, this._closestPoint.y);
                }
            }
        }

            // NEW: Check other enemies if owner is Enemy (for enemy-to-enemy combat)
        if (owner instanceof Enemy && system?.enemies) {
            for (let enemy of system.enemies) {
                // Skip if not valid or is the same ship firing
                if (!enemy?.pos || enemy === owner) continue;
                
                // Calculate vector from beam start to enemy
                this._toTarget.set(enemy.pos.x - beamStart.x, enemy.pos.y - beamStart.y);
                let projLength = this._toTarget.dot(beamDir);
                
                if (projLength > 0 && projLength < beamLength) {
                    // Calculate closest point on beam to enemy
                    this._closestPoint.set(
                        beamStart.x + beamDir.x * projLength,
                        beamStart.y + beamDir.y * projLength
                    );
                    
                    // Calculate distance from enemy to closest point on beam
                    let distToBeam = dist(enemy.pos.x, enemy.pos.y, 
                                        this._closestPoint.x, this._closestPoint.y);
                    
                    if (distToBeam < enemy.size / 2 && projLength < minDist) {
                        minDist = projLength;
                        hitTarget = enemy;
                        this._hitPoint.set(this._closestPoint.x, this._closestPoint.y);
                    }
                }
            }
        }
        
        return {
            target: hitTarget,
            point: hitTarget ? this._hitPoint : beamStart
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
    
    const weapon = owner.currentWeapon;
    const speed = weapon.speed || 6; // Slower than regular projectiles
    const dragDuration = weapon.dragDuration || 5.0;
    const dragMultiplier = weapon.dragMultiplier || 10.0;
    
    let proj;
    
    // Create projectile with tangle properties
    if (this.projectilePool) {
        proj = this.projectilePool.get(
            owner.pos.x, owner.pos.y, angle, owner,
            speed, weapon.damage, weapon.color, 
            "tangle", null, 60, 0, 0, 
            dragDuration, dragMultiplier
        );
    } else {
        proj = new Projectile(
            owner.pos.x, owner.pos.y, angle, owner,
            speed, weapon.damage, weapon.color, 
            "tangle", null, 60, 0, 0,
            dragDuration, dragMultiplier
        );
    }
    
    // Make projectile bigger
    proj.size = weapon.projectileSize || 7;
    
    // Add reference to system for proper cleanup
    proj.system = system;
    system.addProjectile(proj);
    
    // Play tangle sound
    if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
        soundManager.playWorldSound('laser', owner.pos.x, owner.pos.y, player.pos);
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

