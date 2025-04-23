// ****** weaponSystem.js ******

// Define weapon types as constants for better safety
const WEAPON_TYPE = {
    PROJECTILE: 'projectile',
    BEAM: 'beam',
    FORCE: 'force',
    TURRET: 'turret',
    STRAIGHT: 'straight',
    SPREAD: 'spread'
};

class WeaponSystem {
    /** 
     * Handles force blast weapon (area effect damage)
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     */
    static fireForce(owner, system) {
        if (!owner || !system) return;
        
        // Get position to emit force wave from
        const forceWavePos = owner.pos.copy();
        
        // Get owner's current weapon for properties
        const weapon = owner.currentWeapon;
        const damage = weapon?.damage || 20;
        const color = weapon?.color || [255, 0, 0];
        const maxRadius = weapon?.maxRadius || 750;
        
        console.log(`Force wave fired by ${owner instanceof Player ? "player" : "enemy"} with damage ${damage}, maxRadius: ${maxRadius}`);
        
        // Create force wave in the system
        system.forceWaves.push({
            pos: forceWavePos,
            owner: owner,
            startTime: millis(),
            radius: 50,
            maxRadius: maxRadius,
            growRate: 15,
            damage: damage,
            color: color,
            processed: {},
        });
        
        // Store reference for drawing effects
        owner.lastForceWave = {
            pos: forceWavePos.copy(),
            time: millis(),
            color: color
        };
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
                
            default:
                // Default to single projectile
                this.fireProjectile(owner, system, angle);
        }
    }

    /** 
     * Fire a single projectile
     * @param {Object} owner - Entity firing the weapon
     * @param {Object} system - Current star system
     * @param {number} angle - Firing angle in radians
     */
    static fireProjectile(owner, system, angle) {
        if (!owner?.currentWeapon) return;
        
        const weapon = owner.currentWeapon;
        const proj = new Projectile(
            owner.pos.x, owner.pos.y, angle, owner,
            8, weapon.damage, weapon.color
        );
        system.addProjectile(proj);
        
        // Play laser sound
        if (typeof soundManager !== 'undefined') {
            soundManager.playSound('laser');
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
        
        // Offset projectiles perpendicular to angle
        const spacing = 12; // pixels between projectiles
        const mid = (count - 1) / 2;
        const perpAngle = angle + HALF_PI;
        
        // Cache the perpendicular vector direction
        const perpDir = p5.Vector.fromAngle(perpAngle);
        
        for (let i = 0; i < count; i++) {
            let offset = (i - mid) * spacing;
            // Calculate the position with minimal vector allocations
            let x = owner.pos.x + perpDir.x * offset;
            let y = owner.pos.y + perpDir.y * offset;
            
            const weapon = owner.currentWeapon;
            const proj = new Projectile(
                x, y, angle, owner,
                8, weapon.damage, weapon.color
            );
            system.addProjectile(proj);
        }
        
        // Play laser sound once for all projectiles
        if (typeof soundManager !== 'undefined') {
            soundManager.playSound('laser');
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
        const beamStart = owner.pos.copy();
        
        // Handle player aiming at mouse cursor
        if (owner instanceof Player) {
            // Convert screen mouse position to world coordinates
            const worldMx = mouseX + (owner.pos.x - width/2);
            const worldMy = mouseY + (owner.pos.y - height/2);
            
            // Calculate angle to mouse cursor
            angle = atan2(worldMy - owner.pos.y, worldMx - owner.pos.x);
        }
        
        // Calculate beam direction and endpoint
        const beamDir = p5.Vector.fromAngle(angle);
        if (!beamDir || isNaN(beamDir.x) || isNaN(beamDir.y)) {
            console.error("Invalid beam direction from angle:", angle);
            return;
        }
        
        const beamEnd = p5.Vector.add(beamStart, p5.Vector.mult(beamDir, beamLength));
        const beamDirNorm = beamDir.copy().normalize();
        
        // Perform hit detection
        const hit = this.performBeamHitDetection(owner, system, beamStart, beamDirNorm, beamLength);
        
        // Store beam info for drawing
        owner.lastBeam = {
            start: beamStart,
            end: beamEnd,
            color: owner.currentWeapon?.color || [255, 0, 0],
            time: millis(),
            hit: hit.target !== null
        };
        
        // Handle hit effects - replacing the old code with the new method
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
        let hitPoint = null;
        
        // Check enemies if owner is Player
        if (owner instanceof Player && system?.enemies) {
            for (let enemy of system.enemies) {
                if (!enemy?.pos || enemy === owner) continue;
                
                let toEnemy = p5.Vector.sub(enemy.pos, beamStart);
                let projLength = toEnemy.dot(beamDir);
                
                if (projLength > 0 && projLength < beamLength) {
                    let closestPoint = p5.Vector.add(
                        beamStart, 
                        p5.Vector.mult(beamDir, projLength)
                    );
                    
                    let distToBeam = p5.Vector.dist(enemy.pos, closestPoint);
                    if (distToBeam < enemy.size / 2 && projLength < minDist) {
                        minDist = projLength;
                        hitTarget = enemy;
                        hitPoint = closestPoint;
                    }
                }
            }
        }
        
        // Check player if owner is Enemy
        if (owner instanceof Enemy && system?.player?.pos) {
            let toPlayer = p5.Vector.sub(system.player.pos, beamStart);
            let projLength = toPlayer.dot(beamDir);
            
            if (projLength > 0 && projLength < beamLength) {
                let closestPoint = p5.Vector.add(
                    beamStart, 
                    p5.Vector.mult(beamDir, projLength)
                );
                
                let distToBeam = p5.Vector.dist(system.player.pos, closestPoint);
                if (distToBeam < system.player.size / 2 && projLength < minDist) {
                    minDist = projLength;
                    hitTarget = system.player;
                    hitPoint = closestPoint;
                }
            }
        }
        
        return {
            target: hitTarget,
            point: hitPoint || beamStart
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
            
            if (nearestEnemy) {
                console.log(`Turret targeting ${nearestEnemy.shipTypeName} at distance ${closestDist.toFixed(1)}`);
                return nearestEnemy;
            }
        }
        // Find player if enemy is firing
        else if (owner instanceof Enemy && system.player?.pos) {
            return system.player;
        }
        
        return null;
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
}

console.log("WeaponSystem loaded", typeof WeaponSystem);