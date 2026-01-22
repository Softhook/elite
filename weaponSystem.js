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
    HARPOON: 'harpoon', // Harpoon tether
    STORM: 'storm' // Storm weapons - alien specialty area-denial
};

class WeaponSystem {
    // Scale angle jitter by disruption level (0..1)
    // Also applies inherent inaccuracy for NPC beam weapons
    static _applyAngleJitter(owner, angle, weaponType = null) {
        let totalJitter = 0;

        // Disruption-based jitter (affects all weapons)
        const d = owner && owner.targetingDisruption ? owner.targetingDisruption : 0;
        if (d > 0) {
            const maxDisruptionJitter = 0.55 * d;
            totalJitter += (Math.random() * 2 - 1) * maxDisruptionJitter;
        }

        // NPC beam accuracy penalty - beams are harder for AI to aim precisely
        // Player beams are mouse-aimed so they skip this penalty
        if (weaponType === WEAPON_TYPE.BEAM && !(owner instanceof Player)) {
            // Base inaccuracy: ~5-12 degrees of random scatter
            // This represents the difficulty of maintaining a precise beam lock
            const baseBeamInaccuracy = 0.06; // halved (~3.5 degrees base)
            const beamJitter = (Math.random() * 2 - 1) * baseBeamInaccuracy;
            totalJitter += beamJitter;

            // Additional inaccuracy based on target movement speed
            // Fast-moving targets are harder to track with a beam
            if (owner.target && owner.target.vel) {
                const targetSpeed = Math.sqrt(
                    owner.target.vel.x * owner.target.vel.x +
                    owner.target.vel.y * owner.target.vel.y
                );
                // Add up to ~6 more degrees for very fast targets (speed > 8)
                const speedFactor = Math.min(1, targetSpeed / 8);
                const speedJitter = (Math.random() * 2 - 1) * 0.05 * speedFactor;
                totalJitter += speedJitter;
            }
        }

        if (totalJitter === 0) return angle;
        return angle + totalJitter;
    }

    // Whether targeting/locks should be disabled at this disruption level
    static _isLockDisabled(owner) {
        const d = owner && owner.targetingDisruption ? owner.targetingDisruption : 0;
        return d > 0.15; // disable auto-target/locks when notable disruption
    }

    /**
     * Calculate spawn position at ship's forward edge.
     * Uses ship's facing angle (owner.angle) for spawn position, not firing angle.
     * This ensures projectiles emerge from visible ship edge.
     * @param {Object} owner - Entity firing the weapon
     * @param {number} firingAngle - Angle projectile will travel (fallback if no owner.angle)
     * @param {boolean} fromCenter - If true, spawn from center (for turrets/force weapons)
     * @returns {Object} {x, y} spawn position
     */
    static _getSpawnPosition(owner, firingAngle, fromCenter = false) {
        if (!owner?.pos) {
            return { x: 0, y: 0 };
        }

        // For turrets and force weapons, spawn from center
        if (fromCenter || !owner.size) {
            return { x: owner.pos.x, y: owner.pos.y };
        }

        // Spawn at ship's forward edge using ship's facing angle
        // Use owner.angle if available (ship facing), else fall back to firing angle
        const spawnAngle = (owner.angle !== undefined && !isNaN(owner.angle)) ? owner.angle : firingAngle;
        const offset = owner.size * 0.55; // Just past visible ship edge

        return {
            x: owner.pos.x + Math.cos(spawnAngle) * offset,
            y: owner.pos.y + Math.sin(spawnAngle) * offset
        };
    }

    // Static regex for parsing weapon count from type string
    static _countRegex = /(\d+)$/;

    // Initialize projectile pool safely
    static init(initialPoolSize = 100) {
        try {
            if (typeof ObjectPool !== 'undefined') {
                if (!this.projectilePool) {
                    WEAPON_LOG(`Initializing projectile pool with ${initialPoolSize} projectiles`);
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

        WEAPON_LOG(`Force weapon fired by ${owner.constructor.name}`); // Debug output

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

            // Surface mode filter: also target surface objects (turrets, buildings) in surface mode
            if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                const surfaceObjects = surfaceMode.surfaceObjects;
                if (surfaceObjects && surfaceObjects.length) {
                    entitiesToProcess = entitiesToProcess.concat(surfaceObjects);
                }
            }

            WEAPON_LOG(`Found ${entitiesToProcess.length} potential targets for force wave`);
        } else if (system.player) {
            // Enemy attacking player
            entitiesToProcess = [system.player];
        } else {
            entitiesToProcess = [];
        }

        // Surface mode filter: track whether this is a surface mode force wave
        const isSurfaceWave = typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive();

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
            processed: new Set(), // Initialize as Set directly
            // Add batch processing properties with pre-populated entities
            entitiesToProcess: entitiesToProcess,
            isSurface: isSurfaceWave // Track whether this wave belongs to surface mode
        });

        WEAPON_LOG(`Force wave added with damage=${damage}, maxRadius=${maxRadius}`);

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
        if (soundManager && player?.pos) {
            soundManager.playWorldSound('force', ownerX, ownerY, player.pos, owner);
        }
    }

    /** 
     * Generic fire method that dispatches to specific weapon handlers
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     * @param {string} type - Weapon type
     * @param {Object} target - Optional target for aimed weapons
     * @param {Object} weaponOverride - Optional weapon to use instead of owner.currentWeapon (for dual-engage secondary fire)
     */
    static fire(owner, system, angle, type = WEAPON_TYPE.PROJECTILE, target = null, weaponOverride = null) {
        if (!owner || !system) return false;

        // Extract count from type name if present (e.g., "spread3" -> 3)
        let count = 1;
        const countMatch = this._countRegex.exec(type);
        if (countMatch) {
            count = parseInt(countMatch[1], 10);
            // Remove count from type to get base type
            type = type.substring(0, countMatch.index);
        }

        // Use weaponOverride if provided, otherwise use owner's currentWeapon
        // This fixes dual-engage secondary fire using wrong weapon properties
        const weapon = weaponOverride || owner.currentWeapon;

        // Temporarily set owner.currentWeapon to the weapon being fired
        // so that downstream methods (fireProjectile, fireTangle, etc.) use correct properties
        const originalWeapon = owner.currentWeapon;
        if (weaponOverride) {
            owner.currentWeapon = weaponOverride;
        }

        // Apply aim jitter from EM disruption for angle-driven weapons
        // Exclude beams here so beam-specific inaccuracy is applied only inside fireBeam
        if (type !== WEAPON_TYPE.TURRET && type !== WEAPON_TYPE.MISSILE && type !== WEAPON_TYPE.BEAM) {
            angle = this._applyAngleJitter(owner, angle, type);
        }

        if (type === WEAPON_TYPE.BEAM && weapon?.type === WEAPON_TYPE.BEAM) {
            if (!this._canFireBeam(owner, weapon)) {
                return false;
            }
        }

        // Handle different weapon types
        let fired = false;
        switch (type) {
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
            case WEAPON_TYPE.STORM: // Storm weapons - alien specialty
                this.fireStorm(owner, system, angle, target);
                fired = true;
                break;
            default:
                // Default to single projectile
                this.fireProjectile(owner, system, angle);
                fired = true;
        }

        // Restore original weapon if we used an override
        if (weaponOverride && originalWeapon !== undefined) {
            owner.currentWeapon = originalWeapon;
        }

        return fired;
    }

    /** 
     * Fire a single projectile, using object pool if available
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     * @param {boolean} fromCenter - Spawn from center (for turrets)
     */
    static fireProjectile(owner, system, angle, fromCenter = false) {
        if (!owner?.currentWeapon) return;

        const weapon = owner.currentWeapon;
        const speed = weapon.speed || DEFAULT_WEAPON_CONFIG.PROJECTILE_SPEED; // Use defined speed with fallback

        // Get spawn position at ship's forward edge (or center for turrets)
        const spawnPos = this._getSpawnPosition(owner, angle, fromCenter);
        const spawnX = spawnPos.x;
        const spawnY = spawnPos.y;
        let proj;

        // Use the speed variable instead of hardcoded 8
        if (this.projectilePool) {
            proj = this.projectilePool.get(
                spawnX, spawnY, angle, owner,
                speed, weapon.damage, weapon.color, "projectile", null, DEFAULT_WEAPON_CONFIG.PROJECTILE_LIFESPAN, 0, 0, 5.0, 10.0, 0.1, system
            );
        }

        if (!proj) {
            proj = new Projectile(
                spawnX, spawnY, angle, owner,
                speed, weapon.damage, weapon.color
            );
            proj.system = system;
        }
        if (system && typeof system.addProjectile === 'function') {
            system.addProjectile(proj);
        } else if (system && Array.isArray(system.projectiles)) {
            system.projectiles.push(proj);
        }

        // Apply altitude for surface mode
        this._applySurfaceProperties(proj, owner);

        // Play weapon-specific sound using playWorldSound
        if (soundManager && player?.pos) {
            let soundName = 'laser';
            const wType = weapon?.type;
            if (wType === WEAPON_TYPE.TURRET) {
                soundName = 'turretFire';
            } else if (wType === WEAPON_TYPE.PROJECTILE || wType === WEAPON_TYPE.SPREAD || wType === WEAPON_TYPE.STRAIGHT) {
                soundName = 'laser';
            }
            soundManager.playWorldSound(soundName, spawnX, spawnY, player.pos, owner);
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

        // Get spawn position at ship's forward edge
        const spawnPos = this._getSpawnPosition(owner, angle);
        const spawnX = spawnPos.x;
        const spawnY = spawnPos.y;
        let proj;

        // Get missile-specific properties from the weapon definition
        const speed = weapon.speed || DEFAULT_WEAPON_CONFIG.MISSILE_SPEED; // Missile's own travel speed
        const damage = weapon.damage;
        const color = weapon.color;
        const weaponType = weapon.type;
        const lifespan = weapon.lifespan || DEFAULT_WEAPON_CONFIG.MISSILE_LIFESPAN; // Missile's lifespan
        const turnRate = weapon.turnRate || DEFAULT_WEAPON_CONFIG.MISSILE_TURN_RATE; // Missile's turn rate

        if (this.projectilePool) {
            // Pass all necessary parameters including target, lifespan, turnRate, missileSpeed, and system
            proj = this.projectilePool.get(
                spawnX, spawnY, angle, owner,
                speed, damage, color, weaponType, target, lifespan, turnRate, speed, 5.0, 10.0, 0.1, system
            );
        }

        if (!proj) {
            proj = new Projectile(
                spawnX, spawnY, angle, owner,
                speed, damage, color, weaponType, target, lifespan, turnRate, speed
            );
            proj.system = system;
        }
        if (system && typeof system.addProjectile === 'function') {
            system.addProjectile(proj);
        } else if (system && Array.isArray(system.projectiles)) {
            system.projectiles.push(proj);
        }

        // Apply surface mode properties
        this._applySurfaceProperties(proj, owner);

        if (soundManager && player?.pos) {
            // Consider adding a specific 'missileLaunch' sound
            soundManager.playWorldSound('missileLaunch', spawnX, spawnY, player.pos, owner);
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
     * Apply surface mode properties to a projectile if applicable
     * @param {Projectile} proj - The projectile to update
     * @param {Object} owner - The entity firing the weapon
     * @private
     */
    static _applySurfaceProperties(proj, owner) {
        // Surface mode filter: apply surface-specific properties to projectiles
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
            proj.altitude = (owner.altitude || 0) + (owner.yOffset || 0);
            proj.ownerType = (owner.shipDef) ? 'ship' : 'turret';
            proj.isSurface = true;
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
        const speed = weapon.speed || DEFAULT_WEAPON_CONFIG.PROJECTILE_SPEED; // Use defined speed with fallback
        const damage = weapon.damage;
        const color = weapon.color;

        // Get base spawn position at ship's forward edge
        const spawnPos = this._getSpawnPosition(owner, angle);
        const baseX = spawnPos.x;
        const baseY = spawnPos.y;

        for (let i = 0; i < count; i++) {
            const offset = (i - mid) * spacing;
            // Calculate the position with minimal vector allocations (offset from ship edge)
            const x = baseX + perpDirX * offset;
            const y = baseY + perpDirY * offset;

            // Create projectile at the correct offset position
            let proj;
            if (this.projectilePool) {
                proj = this.projectilePool.get(
                    x, y, angle, owner,
                    speed, damage, color, "projectile", null, DEFAULT_WEAPON_CONFIG.PROJECTILE_LIFESPAN, 0, 0, 5.0, 10.0, 0.1, system
                );
            } else {
                proj = new Projectile(
                    x, y, angle, owner,
                    speed, damage, color
                );
                proj.system = system;
            }

            // Apply surface mode properties
            this._applySurfaceProperties(proj, owner);

            system.addProjectile(proj);
        }

        // Play sound once for all projectiles
        if (soundManager && player?.pos) {
            soundManager.playWorldSound('laser', baseX, baseY, player.pos, owner);
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

        // Start beam at ship's center (not forward edge)
        const spawnPos = this._getSpawnPosition(owner, angle, true);
        start.set(spawnPos.x, spawnPos.y);

        // Note: Player beam aiming is handled in player.fireWeapon() before calling WeaponSystem.fire()
        // The angle passed in is already calculated to point at the mouse cursor
        // We only apply jitter here (disruption affects player, NPC inaccuracy affects enemies)
        angle = this._applyAngleJitter(owner, angle, WEAPON_TYPE.BEAM);
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
        if (soundManager && player?.pos) {
            soundManager.playWorldSound('beam', spawnPos.x, spawnPos.y, player.pos, owner);
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

            // Broadphase: Circle check
            const radialSq = relX * relX + relY * relY - projLength * projLength;
            const radiusSq = radius * radius;

            if (radialSq <= radiusSq) {
                // Narrowphase: Polygon check for on-screen ships/asteroids
                let usedPolygon = false;

                if (typeof CollisionUtils !== 'undefined') {
                    const isOnScreen = target._isOnScreen !== false || target.isPlayer;

                    if (isOnScreen) {
                        // Get polygon for target
                        let polygon = null;
                        if (target.vertices) {
                            // Asteroid
                            polygon = CollisionUtils.getAsteroidPolygon(target);
                        } else if (target.shipDef) {
                            // Ship
                            polygon = CollisionUtils.getShipPolygon(target);
                        }

                        if (polygon) {
                            usedPolygon = true;
                            // Line-polygon intersection for accurate hit
                            // Use beamLength for the full line, not minDist (which may be shortened)
                            const beamEnd = { x: startX + dirX * beamLength, y: startY + dirY * beamLength };
                            const hit = CollisionUtils.linePolygonIntersect(
                                startX, startY, beamEnd.x, beamEnd.y, polygon
                            );

                            if (hit) {
                                // Polygon hit - use exact intersection point
                                const actualDist = hit.t * beamLength;
                                if (actualDist < minDist && actualDist > 0) {
                                    minDist = actualDist;
                                    hitTarget = target;
                                    hitPoint.set(hit.x, hit.y);
                                }
                            }
                            // If polygon check fails (no hit), don't register this target
                            // The beam visually missed the ship's actual shape
                        }
                    }
                }

                // Fallback: Circle hit (for off-screen or non-polygon targets)
                if (!usedPolygon) {
                    minDist = projLength;
                    hitTarget = target;
                    hitPoint.set(startX + dirX * projLength, startY + dirY * projLength);
                }
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

        // Allow beams to hit missiles (projectiles) as well
        if (system?.projectiles && system.projectiles.length) {
            const projList = system.projectiles;
            for (let i = 0, len = projList.length; i < len; i++) {
                const p = projList[i];
                if (!p || !p.pos) continue;
                // Only consider missiles (or other destructible projectiles)
                if (!p._isMissile) continue;
                // Don't hit our own missiles
                if (p.owner === owner) continue;
                const radius = p.size ? p.size * 0.5 : 0;
                evaluateTarget(p, radius);
            }
        }

        // Allow beams to hit mines
        if (system?.mines && system.mines.length) {
            const mineList = system.mines;
            for (let i = 0, len = mineList.length; i < len; i++) {
                const mine = mineList[i];
                if (!mine || !mine.pos || mine.destroyed) continue;
                // Don't hit our own mines
                if (mine.owner === owner) continue;
                const radius = mine.size ? mine.size * 0.5 : 4; // Default radius if not set
                evaluateTarget(mine, radius);
            }
        }

        // Allow beams to hit spaceObjects (satellites, debris, platforms, etc.)
        if (system?.spaceObjects && system.spaceObjects.length) {
            const soList = system.spaceObjects;
            for (let i = 0, len = soList.length; i < len; i++) {
                const so = soList[i];
                if (!so || !so.pos) continue;
                // Some spaceObjects may be indestructible; only consider those with a size or takeDamage
                const hasTakeDamage = typeof so.takeDamage === 'function';
                const radius = so.size ? so.size * 0.5 : (hasTakeDamage ? 20 : 0);
                if (radius <= 0) continue;
                // Avoid hitting owner's own deployed objects if applicable
                if (so.owner && so.owner === owner) continue;
                evaluateTarget(so, radius);
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

        // Surface mode filter: allow beams to hit surface objects when in surface mode
        if (isPlayer && typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
            const surfaceObjects = surfaceMode.surfaceObjects;
            if (surfaceObjects && surfaceObjects.length) {
                for (let i = 0, len = surfaceObjects.length; i < len; i++) {
                    const obj = surfaceObjects[i];
                    if (!obj || !obj.pos || obj.destroyed) continue;
                    // Use object's size for collision radius
                    const radius = obj.size ? obj.size * 0.5 : 20;
                    evaluateTarget(obj, radius);
                }
            }
        }

        if (isEnemy) {
            if (system?.player && !system.player.isDockedAndInvulnerable) {
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
            // Surface mode filter: target surface objects instead of space enemies in surface mode
            if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                const surfaceObjects = surfaceMode.surfaceObjects;
                if (!surfaceObjects || surfaceObjects.length === 0) return null;

                let nearestTarget = null;
                let closestDistSq = Infinity;
                const ownerX = owner.pos.x;
                const ownerY = owner.pos.y;

                for (let i = 0, len = surfaceObjects.length; i < len; i++) {
                    const obj = surfaceObjects[i];
                    if (!obj?.pos || obj.destroyed) continue;

                    const dx = obj.pos.x - ownerX;
                    const dy = obj.pos.y - ownerY;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < closestDistSq) {
                        nearestTarget = obj;
                        closestDistSq = distSq;
                    }
                }

                return nearestTarget;
            }

            // Normal space mode: target enemies
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

        // Get spawn position at ship's forward edge
        const spawnPos = this._getSpawnPosition(owner, angle);
        const spawnX = spawnPos.x;
        const spawnY = spawnPos.y;

        const speed = weapon.speed || DEFAULT_WEAPON_CONFIG.TANGLE_SPEED; // Slower than regular projectiles
        const tangleDuration = weapon.tangleDuration || 5.0;
        const dragMultiplier = weapon.dragMultiplier || 10.0;
        const rotationBlockMultiplier = weapon.rotationBlockMultiplier || 0.1;

        let proj;

        // Create projectile with tangle properties using unified duration
        if (this.projectilePool) {
            proj = this.projectilePool.get(
                spawnX, spawnY, angle, owner,
                speed, weapon.damage, weapon.color,
                "tangle", null, DEFAULT_WEAPON_CONFIG.TANGLE_LIFESPAN, 0, 0,
                tangleDuration, dragMultiplier,
                rotationBlockMultiplier, system
            );
        } else {
            proj = new Projectile(
                spawnX, spawnY, angle, owner,
                speed, weapon.damage, weapon.color,
                "tangle", null, DEFAULT_WEAPON_CONFIG.TANGLE_LIFESPAN, 0, 0,
                tangleDuration, dragMultiplier,
                rotationBlockMultiplier
            );
            proj.system = system;
        }

        // Make projectile bigger
        proj.size = weapon.projectileSize || 7;

        // Apply surface mode properties if in surface mode
        this._applySurfaceProperties(proj, owner);

        if (system && typeof system.addProjectile === 'function') {
            system.addProjectile(proj);
        } else if (system && Array.isArray(system.projectiles)) {
            system.projectiles.push(proj);
        }

        // Play tangle sound
        if (soundManager && player?.pos) {
            soundManager.playWorldSound('tangleCast', spawnX, spawnY, player.pos, owner);
        }
    }

    /**
     * Fire a harpoon projectile. On hit the projectile will spawn a Harpoon tether.
     */
    static fireHarpoon(owner, system, angle) {
        if (!owner?.currentWeapon || !system) return;
        const weapon = owner.currentWeapon;

        // Get spawn position at ship's forward edge
        const spawnPos = this._getSpawnPosition(owner, angle);
        const spawnX = spawnPos.x;
        const spawnY = spawnPos.y;

        const speed = weapon.speed || DEFAULT_WEAPON_CONFIG.HARPOON_SPEED; // increased default harpoon projectile speed to fly quickly

        let proj;
        if (this.projectilePool) {
            proj = this.projectilePool.get(
                spawnX, spawnY, angle, owner,
                speed, weapon.damage, weapon.color, "harpoon", null, DEFAULT_WEAPON_CONFIG.HARPOON_LIFESPAN, 0, 0, 5.0, 10.0, 0.1, system
            );
        }
        if (!proj) {
            proj = new Projectile(spawnX, spawnY, angle, owner, speed, weapon.damage, weapon.color, "harpoon");
            proj.system = system;
        }
        proj.size = weapon.projectileSize || 6;

        // Apply surface mode properties if in surface mode
        this._applySurfaceProperties(proj, owner);

        if (system && typeof system.addProjectile === 'function') {
            system.addProjectile(proj);
        } else if (system && Array.isArray(system.projectiles)) {
            system.projectiles.push(proj);
        }

        // Mark owner as having an outgoing harpoon to prevent immediate re-fire
        try {
            if (owner) owner._harpoonPending = (owner._harpoonPending || 0) + 1;
            proj._harpoonPending = true;
        } catch (e) { /* defensive */ }

        if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
            WEAPON_LOG('Harpoon fired', { owner: owner && owner.constructor ? owner.constructor.name : owner, spawnX, spawnY, speed, weaponName: weapon?.name });
        }

        if (soundManager && player?.pos) {
            soundManager.playWorldSound('harpoonFire', spawnX, spawnY, player.pos, owner);
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
        if (soundManager && player?.pos) {
            soundManager.playWorldSound('mineDrop', ownerX, ownerY, player.pos, owner);
        }
    }

    /**
     * Fire a storm weapon projectile that spawns a miniature storm on impact/timeout
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     * @param {Object} target - Optional target for predictive aiming
     */
    static fireStorm(owner, system, angle, target) {
        if (!owner?.currentWeapon || !system) return;

        const weapon = owner.currentWeapon;

        let firingAngle = angle;
        const isPlayer = !!(owner && (owner.isPlayer || (owner.constructor && owner.constructor.name === 'Player')));

        // For player, prioritize ship facing for storms to ensure they fire straight ahead.
        // For non-players (AI), we trust the passed 'angle' which is already predictively 
        // calculated in enemyCombat.js, ensuring consistency with other weapons.
        if (isPlayer) {
            firingAngle = (owner.angle !== undefined && !isNaN(owner.angle)) ? owner.angle : angle;
        }

        // Get spawn position at ship's forward edge (using calculated firing angle)
        const spawnPos = this._getSpawnPosition(owner, firingAngle);
        const spawnX = spawnPos.x;
        const spawnY = spawnPos.y;

        // Get storm weapon properties
        const speed = weapon.projectileSpeed || 5;
        const colorArr = weapon.color || [100, 100, 255];

        // Create storm projectile
        let proj;
        if (this.projectilePool) {
            proj = this.projectilePool.get(
                spawnX, spawnY, firingAngle, owner,
                speed, 0, colorArr, 'storm', null, 120, 0.02, speed, 5.0, 10.0, 0.1, system
            );
        }

        if (!proj) {
            proj = new Projectile(
                spawnX, spawnY, firingAngle, owner,
                speed, 0, colorArr, 'storm', null, 120, 0.02, speed
            );
            proj.system = system;
        }

        // IMPORTANT: Clear any stale target reference that might cause aiming issues in pooled projectiles
        proj.target = null;

        // Attach storm configuration to projectile
        proj.stormConfig = {
            type: weapon.stormType || 'electromagnetic',
            radius: weapon.stormRadius || 80,
            duration: weapon.stormDuration || 8000,
            owner: owner
        };
        proj.size = weapon.projectileSize || 6;
        proj._isStorm = true;

        // Add to system
        if (system && typeof system.addProjectile === 'function') {
            system.addProjectile(proj);
        } else if (system && Array.isArray(system.projectiles)) {
            system.projectiles.push(proj);
        }

        // Play storm launch sound (uses force sound - similar energy weapon)
        if (soundManager && player?.pos) {
            soundManager.playWorldSound('force', spawnX, spawnY, player.pos, owner);
        }

        WEAPON_LOG(`Storm weapon fired: ${weapon.name} by ${owner.shipTypeName || owner.constructor.name}`);
    }

    /** 
     * Fire a turret weapon that auto-aims at targets
     * Prioritizes owner's locked target, then falls back to nearest enemy
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {Object|number} target - Target object or fallback angle
     */
    static fireTurret(owner, system, target) {
        if (!owner || !system) return;

        // Priority 1: Use owner's locked target if valid
        if (owner.target?.pos && !owner.target.isDestroyed?.()) {
            target = owner.target;
        }
        // Priority 2: If no locked target, find nearest enemy
        else if (!target?.pos) {
            target = this.findNearestTarget(owner, system);
        }

        // If still no valid target, fire forward
        if (!target?.pos) {
            // Turrets spawn from center (they sit on top of ship, can fire any direction)
            this.fireProjectile(owner, system, owner.angle, true);
            return;
        }

        // Calculate angle to target - use atan2 directly (Math. is faster than p5)
        const dx = target.pos.x - owner.pos.x;
        const dy = target.pos.y - owner.pos.y;
        const angleToTarget = atan2(dy, dx);

        // Update turret firing angle for visual sync
        owner.lastTurretFiringAngle = angleToTarget;

        // Fire the projectile at the calculated angle (from center for turrets)
        this.fireProjectile(owner, system, angleToTarget, true);
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
                // Mining Laser Bonus: 2x effectiveness against asteroids
                let finalDamage = damage;
                if (owner && owner.currentWeapon && owner.currentWeapon.name === "Mining Laser") {
                    // Check if target is an asteroid (by class name or property)
                    if (target.constructor && target.constructor.name === "Asteroid") {
                        finalDamage *= 2;
                    }
                }

                target.takeDamage(finalDamage, owner, system);
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
                    if (soundManager && player?.pos) {
                        soundManager.playWorldSound('hit', hitPoint.x, hitPoint.y, player.pos, target);
                    }
                    target._lastShieldHitSoundTime = now;
                }
            } catch (e) {
                console.error('Shield hit sound error:', e);
            }
        }

        // Create explosion/spark effect for ALL hits (shields or hull)
        if (system.addExplosion) {
            // Determine effective color: generic weapon color or specific shield flare
            let hitColor;
            let hitSize = 5;

            if (targetHasShield) {
                // Shield hit: Cyan/Blue sparks
                hitColor = [100, 200, 255];
                hitSize = 4;
            } else {
                // Hull hit: Weapon color
                const isColorArray = Array.isArray(color);
                hitColor = isColorArray ? color :
                    (color && color.levels) ? [color.levels[0], color.levels[1], color.levels[2]] :
                        [255, 0, 0];
            }

            // Surface mode filter: pass isSurface flag so explosions render in surface mode
            const inSurfaceMode = typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive();
            system.addExplosion(hitPoint.x, hitPoint.y, hitSize, hitColor, inSurfaceMode);
        }
    }

    /**
     * Clean up and release projectiles
     * This should be called by the system when projectiles are removed
     * @param {Projectile} projectile - The projectile to release back to pool
     */
    static releaseProjectile(projectile) {
        if (this.projectilePool && projectile) {
            // If this was a harpoon projectile that was pending (not yet converted to a Harpoon tether),
            // decrement the owner's pending counter so the owner can fire again when appropriate.
            try {
                if (projectile && (projectile._isHarpoon || projectile.type === 'harpoon')) {
                    const owner = projectile.owner;
                    if (owner && owner._harpoonPending) {
                        // Only decrement if this projectile had the pending flag set
                        if (projectile._harpoonPending) owner._harpoonPending = Math.max(0, (owner._harpoonPending || 0) - 1);
                    }
                    // Clear the projectile pending marker to avoid double-decrement
                    projectile._harpoonPending = false;
                }
            } catch (e) { /* defensive */ }

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

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WeaponSystem, WEAPON_TYPE };
    global.WeaponSystem = WeaponSystem;
    global.WEAPON_TYPE = WEAPON_TYPE;
}

