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
    BARRIER: 'barrier', // Added Barrier type
    MINE: 'mine', // Added Mine type
    HARPOON: 'harpoon' // Harpoon tether
};

class WeaponSystem {
    // Scale angle jitter by disruption level (0..1)
    static _applyAngleJitter(owner, angle) {
        const d = owner && owner.targetingDisruption ? owner.targetingDisruption : 0;
        if (!d) return angle;
        const maxJitter = 0.55 * d; //
        const jitter = (Math.random() * 2 - 1) * maxJitter;
        return angle + jitter;
    }

    // Whether targeting/locks should be disabled at this disruption level
    static _isLockDisabled(owner) {
        const d = owner && owner.targetingDisruption ? owner.targetingDisruption : 0;
        return d > 0.15; // disable auto-target/locks when notable disruption
    }
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

    static _getHeatKey(weapon) {
        if (!weapon) return null;
        if (typeof weapon.name === 'string' && weapon.name.length > 0) {
            return weapon.name;
        }
        if (weapon.type) {
            return weapon.type;
        }
        return null;
    }

    static _getHeatState(owner, weapon, create = true) {
        if (!owner || !weapon) return null;
        const key = this._getHeatKey(weapon);
        if (!key) return null;

        if (!owner.weaponHeat) {
            if (!create) return null;
            owner.weaponHeat = {};
        }

        let state = owner.weaponHeat[key];
        const maxHeat = weapon.maxHeat ?? 1.0;
        const heatPerShot = weapon.heatPerShot ?? 0.15;
        const heatDissipation = weapon.heatDissipation ?? 0.3;
        const recoveryRaw = weapon.heatRecoveryFactor ?? 0.25;
        const recovery = Math.min(Math.max(recoveryRaw, 0.05), 0.95);

        if (!state) {
            if (!create) return null;
            state = {
                key,
                heat: 0,
                overheated: false,
                maxHeat,
                heatPerShot,
                heatDissipation,
                heatRecoveryFactor: recovery,
                overheatMessageShown: false,
                readyMessageShown: true
            };
            owner.weaponHeat[key] = state;
        } else if (create) {
            state.maxHeat = maxHeat;
            state.heatPerShot = heatPerShot;
            state.heatDissipation = heatDissipation;
            state.heatRecoveryFactor = recovery;
        }

        return state;
    }

    static _notifyBeamOverheated(owner, state) {
        if (!state) return;
        if (owner === player && typeof uiManager !== 'undefined' && !state.overheatMessageShown) {
            uiManager.addMessage("Beam overheated!", [255, 120, 80], 1200);
        }
        state.overheatMessageShown = true;
        state.readyMessageShown = false;
    }

    static _notifyBeamReady(owner, state) {
        if (!state) return;
        if (owner === player && typeof uiManager !== 'undefined' && !state.readyMessageShown) {
            uiManager.addMessage("Beam cooled", [120, 255, 180], 900);
        }
        state.readyMessageShown = true;
        state.overheatMessageShown = false;
    }

    static _canFireBeam(owner, weapon) {
        const state = this._getHeatState(owner, weapon, true);
        if (!state) return true;

        if (state.overheated || state.heat >= state.maxHeat - 1e-4) {
            state.overheated = true;
            state.heat = Math.min(state.heat, state.maxHeat);
            this._notifyBeamOverheated(owner, state);
            return false;
        }
        return true;
    }

    static _applyBeamHeat(owner, weapon) {
        const state = this._getHeatState(owner, weapon, true);
        if (!state) return;

        if (state.heatPerShot > 0) {
            state.heat = Math.min(state.maxHeat, state.heat + state.heatPerShot);
        }

        if (state.heat >= state.maxHeat - 1e-4) {
            state.heat = state.maxHeat;
            state.overheated = true;
            this._notifyBeamOverheated(owner, state);
        }
    }

    static coolWeaponHeat(owner, deltaSeconds) {
        if (!owner || !owner.weaponHeat) return;
        if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;

        // Cap deltaSeconds to prevent anomalies from pausing/tab switching
        const cappedDelta = Math.min(deltaSeconds, 0.5);

        const keys = Object.keys(owner.weaponHeat);
        if (!keys.length) return;

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const state = owner.weaponHeat[key];
            if (!state) continue;

            if (state.heat > 0 && state.heatDissipation > 0) {
                state.heat = Math.max(0, state.heat - state.heatDissipation * cappedDelta);
            }

            if (state.overheated) {
                const threshold = state.maxHeat * state.heatRecoveryFactor;
                if (state.heat <= threshold) {
                    state.overheated = false;
                    this._notifyBeamReady(owner, state);
                }
            }

            if (!state.overheated && state.heat <= 0) {
                delete owner.weaponHeat[key];
            }
        }

    }

    static getHeatRatio(owner, weapon) {
        const state = this._getHeatState(owner, weapon, false);
        if (!state || !state.maxHeat) return 0;
        return Math.min(1, Math.max(0, state.heat / state.maxHeat));
    }

    static isBeamOverheated(owner, weapon) {
        const state = this._getHeatState(owner, weapon, false);
        return !!(state && state.overheated);
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
        if (!owner || !system) return false;
        
        // Extract count from type name if present (e.g., "spread3" -> 3)
        let count = 1;
        const countMatch = this._countRegex.exec(type);
        if (countMatch) {
            count = parseInt(countMatch[1], 10);
            // Remove count from type to get base type
            type = type.substring(0, countMatch.index);
        }

        const weapon = owner.currentWeapon;

        // Apply aim jitter from EM disruption for angle-driven weapons
        if (type !== WEAPON_TYPE.TURRET && type !== WEAPON_TYPE.MISSILE) {
            angle = this._applyAngleJitter(owner, angle);
        }

        if (type === WEAPON_TYPE.BEAM && weapon?.type === WEAPON_TYPE.BEAM) {
            if (!this._canFireBeam(owner, weapon)) {
                return false;
            }
        }
        
        // Handle different weapon types
        let fired = false;
        switch(type) {
            case WEAPON_TYPE.FORCE:
                this.fireForce(owner, system);
                fired = true;
                break;
                
            case WEAPON_TYPE.BEAM:
                this.fireBeam(owner, system, angle);
                fired = true;
                break;
                
            case WEAPON_TYPE.TURRET:
                // If disrupted, skip auto-targeting and fire forward with jitter
                if (this._isLockDisabled(owner)) {
                    const fwd = this._applyAngleJitter(owner, owner.angle || angle || 0);
                    this.fireProjectile(owner, system, fwd);
                } else {
                    this.fireTurret(owner, system, target || angle);
                }
                fired = true;
                break;
                
            case WEAPON_TYPE.STRAIGHT:
                this.fireStraight(owner, system, angle, count);
                fired = true;
                break;
                
            case WEAPON_TYPE.SPREAD:
                this.fireSpread(owner, system, angle, count);
                fired = true;
                break;
            case WEAPON_TYPE.MISSILE:
                // Disable lock/auto-acquire under disruption
                if (this._isLockDisabled(owner)) {
                    target = null;
                } else if (!target) {
                    target = WeaponSystem.findNearestTarget(owner, system);
                }
                this.fireMissile(owner, system, angle, target);
                fired = true;
                break;
            case WEAPON_TYPE.TANGLE: // Add this case
                this.fireTangle(owner, system, angle);
                fired = true;
                break;
            case WEAPON_TYPE.HARPOON:
                this.fireHarpoon(owner, system, angle);
                fired = true;
                break;
            case WEAPON_TYPE.BARRIER: // Added Barrier case
                // Activation logic is handled within the Player/Enemy class fireWeapon method
                // No direct action needed in WeaponSystem.fire for barrier activation itself.
                // console.log(`${owner.constructor.name} activated barrier.`);
                break;
            case WEAPON_TYPE.MINE: // Added Mine case
                this.fireMine(owner, system);
                fired = true;
                break;
            default:
                // Default to single projectile
                this.fireProjectile(owner, system, angle);
                fired = true;
        }
        return fired;
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
        
        // Play weapon-specific sound using playWorldSound
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            let soundName = 'laser';
            const wType = weapon?.type;
            if (wType === WEAPON_TYPE.TURRET) {
                soundName = 'turretFire';
            } else if (wType === WEAPON_TYPE.PROJECTILE || wType === WEAPON_TYPE.SPREAD || wType === WEAPON_TYPE.STRAIGHT) {
                soundName = 'laser';
            }
            soundManager.playWorldSound(soundName, ownerX, ownerY, player.pos);
        }
    }

    static fireMissile(owner, system, angle, target) {
        if (!owner?.currentWeapon) {
            console.warn("fireMissile: Owner has no currentWeapon.");
            return;
        }
        // Apply jitter to initial heading under disruption
        angle = this._applyAngleJitter(owner, angle);
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
        
        // Apply aim jitter from disruption, then calculate direction and endpoint
        angle = this._applyAngleJitter(owner, angle);
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

        if (weapon?.type === WEAPON_TYPE.BEAM) {
            this._applyBeamHeat(owner, weapon);
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
        // Under electromagnetic disruption, disable auto-acquisition
        if (this._isLockDisabled(owner)) return null;
        
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
        soundManager.playWorldSound('tangleCast', ownerX, ownerY, player.pos);
    }
}

/**
 * Fire a harpoon projectile. On hit the projectile will spawn a Harpoon tether.
 */
static fireHarpoon(owner, system, angle) {
    if (!owner?.currentWeapon || !system) return;
    const weapon = owner.currentWeapon;
    const ownerX = owner.pos.x;
    const ownerY = owner.pos.y;
    const speed = weapon.speed || 30; // increased default harpoon projectile speed to fly quickly

    let proj;
    if (this.projectilePool) {
        proj = this.projectilePool.get(
            ownerX, ownerY, angle, owner,
            speed, weapon.damage, weapon.color, "harpoon", null, 120, 0, 0, 5.0, 10.0, 0.1, system
        );
    }
    if (!proj) {
        proj = new Projectile(ownerX, ownerY, angle, owner, speed, weapon.damage, weapon.color, "harpoon");
        proj.system = system;
    }
    proj.size = weapon.projectileSize || 6;
    system.addProjectile(proj);

        if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
            console.log('Harpoon fired', { owner: owner && owner.constructor ? owner.constructor.name : owner, ownerX, ownerY, speed, weaponName: weapon?.name });
        }

    if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
        try { soundManager.playWorldSound('harpoonFire', ownerX, ownerY, player.pos); } catch(_) {}
    }
}


    /**
     * Fire/drop a proximity mine
     * @param {Object} owner - Entity dropping the mine
     * @param {Object} system - Current star system
     */
    static fireMine(owner, system) {
        if (!owner?.currentWeapon || !system) return;
        
        const weapon = owner.currentWeapon;
        const ownerX = owner.pos.x;
        const ownerY = owner.pos.y;
        
        // Get mine properties from weapon definition
        const damage = weapon.damage || 80;
        const blastRadius = weapon.blastRadius || 150;
        const triggerRadius = weapon.triggerRadius || 80;
        const color = weapon.color || [255, 100, 0];
        const health = weapon.mineHealth || 30;
        
        // Create mine slightly behind the ship
        const dropOffset = owner.size ? owner.size * 1.5 : 20;
        const dropAngle = owner.angle + Math.PI; // Behind the ship
        const dropX = ownerX + Math.cos(dropAngle) * dropOffset;
        const dropY = ownerY + Math.sin(dropAngle) * dropOffset;
        
        // Create the mine
        const mine = new Mine(dropX, dropY, owner, damage, blastRadius, triggerRadius, color, health);
        mine.system = system;
        
        // Enforce 5-mine limit per owner
        // Initialize activeMines array if it doesn't exist
        if (!owner.activeMines) {
            owner.activeMines = [];
        }
        
        // If owner already has 5 mines, remove the oldest one
        if (owner.activeMines.length >= 5) {
            const oldestMine = owner.activeMines.shift(); // Remove first (oldest) mine from owner's array
            if (oldestMine && !oldestMine.destroyed) {
                // Mark as destroyed - the system's updateMines will clean it up
                oldestMine.destroyed = true;
                // Also remove from system immediately for efficiency
                if (system.mines) {
                    const mineIndex = system.mines.indexOf(oldestMine);
                    if (mineIndex !== -1) {
                        system.mines.splice(mineIndex, 1);
                    }
                }
            }
        }
        
        // Add new mine to owner's tracking array
        owner.activeMines.push(mine);
        
        // Add mine to system
        if (system.addMine) {
            system.addMine(mine);
        }
        
        // Play mine drop sound
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            soundManager.playWorldSound('mineDrop', ownerX, ownerY, player.pos);
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
        
        // Update turret firing angle for visual sync
        owner.lastTurretFiringAngle = angleToTarget;
        
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
        
        // Apply damage and get result, passing owner as the attacker and system for immediate targeting
        // (some targets may not have currentSystem populated at the instant of hit)
        if (typeof target.takeDamage === 'function') {
            try {
                target.takeDamage(damage, owner, system);
            } catch (e) {
                console.error('Error calling takeDamage on target:', e);
            }
        }
        
        // Set shield hit time if target has shields
        if (targetHasShield) {
            target.lastShieldHitTime = millis();
        }
        
        // Play a lightweight hit sound when shields absorb damage (throttled)
        if (targetHasShield) {
            try {
                const now = millis ? millis() : Date.now();
                const last = target._lastShieldHitSoundTime || 0;
                if (now - last > 150) { // throttle to avoid spam on beams/rapid fire
                    if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player?.pos) {
                        soundManager.playWorldSound('hit', hitPoint.x, hitPoint.y, player.pos);
                    }
                    target._lastShieldHitSoundTime = now;
                }
            } catch (e) { /* non-fatal */ }
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

