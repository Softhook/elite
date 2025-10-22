// ****** enemyCombat.js ******
// Enemy combat and weapons methods
// Extracted from Enemy class as part of Stage 6 refactoring

/**
 * EnemyCombat class contains all combat and weapon-related methods
 * for the Enemy class. These methods are applied to the Enemy prototype
 * via the applyEnemyCombatMethods() function.
 */
class EnemyCombat {
    /**
     * Calculate optimal weapon for current combat situation
     * Takes into account range, target type, and weapon capabilities
     * @param {number} distanceToTarget - Distance to current target
     * @param {Object} target - The current target
     * @return {Object} The selected weapon definition
     */
    selectOptimalWeapon(distanceToTarget, target) {
        // If we only have one weapon, just use it
        if (!this.weapons || this.weapons.length <= 1) return this.currentWeapon;

        // Prioritize barrier if health or shield are low
        const barrierWeapon = this.weapons.find(w => w.type === 'barrier');
        if (barrierWeapon && this.barrierCooldown <= 0) {
            const hullPct = this.hull / this.maxHull;
            const shieldPct = this.maxShield > 0 ? this.shield / this.maxShield : 1;
            if (hullPct < 0.3 || shieldPct < 0.3) {
                return barrierWeapon;
            }
        }

        // Score each weapon based on situation
        let bestScore = -1;
        let bestWeapon = this.currentWeapon;

        // Check if target is already entangled
        const targetAlreadyEntangled = target && 
                                    target.dragMultiplier > 1.0 && 
                                    target.dragEffectTimer > 0;
        
        for (const weapon of this.weapons) {
            let score = 0;
            
            // Range considerations
            const isLongRange = distanceToTarget > this.visualFiringRange * MEDIUM_RANGE_MULT;
            const isMediumRange = distanceToTarget > this.visualFiringRange * CLOSE_RANGE_MULT && distanceToTarget <= this.visualFiringRange * MEDIUM_RANGE_MULT;
            const isShortRange = distanceToTarget <= this.visualFiringRange * CLOSE_RANGE_MULT;
            const isVeryCloseRange = distanceToTarget <= this.visualFiringRange * 0.2; // Very close = 20% of firing range
            
            // --- FORCE WEAPON LOGIC ---
            // Force weapons are highly effective at very close range
            if (weapon.type.includes('force') && isVeryCloseRange) {
                score += 5; // Highest priority at very close rangee
            }

            // --- TANGLE WEAPON LOGIC ---
            if (weapon.type.includes('tangle') && target) {
                // Only consider tangle weapons if target is NOT already entangled
                if (!targetAlreadyEntangled) {
                    // Extra effective against very fast targets
                    if (target.maxSpeed > 6.5) {
                        score += 5; // Highest priority for very fast targets
                    } 
                    // Good for fast targets
                    else if (target.maxSpeed > 5) {
                        score += 3;
                    } 
                } else {
                    // Target is already entangled - significant penalty
                    score -= 10; // Strong negative score to discourage selection
                }
            }

            // Score based on weapon type and range
            if (weapon.type.includes('beam') && isLongRange) {
                score += 3; // Beams are good at long range
            } else if (weapon.type.includes('beam') && isMediumRange) {
                score += 2;
            } else if (weapon.type.includes('beam') && isShortRange) {
                score += 1;
            }
            
            if (weapon.type.startsWith('spread') && isShortRange) {
                score += 3; // now catches spread2/3/4/5
            } else if (weapon.type.startsWith('straight') && isMediumRange) {
                score += 2; // now catches straight2/3/4…
            } else if (weapon.type.startsWith('straight') && isLongRange) {
                score += 1;
            }
            
            if (weapon.type === 'missile' && (isMediumRange || isLongRange)) {
                score += 3; // Missiles are best at medium to long range
            } else if (weapon.type === 'missile' && isShortRange) {
                score += 1;
            }
            
            if (weapon.type === 'turret') {
                score += 2; // Turrets are flexible at any range
            }
            
            // Target-specific considerations
            if (target) {
                // Against fast targets, prefer wide-angle weapons like spread
                if (target.maxSpeed > 5 && weapon.type.startsWith('spread')) {
                    score += 3;
                }    
                // Against slow targets, prefer missile weapons
                if (target.maxSpeed < 5 && weapon.type === 'missile') {
                    score += 2;
                }
                // Against large targets, prefer high damage weapons
                if (target.size > 50 && weapon.damage > 10) {
                    score += 2;
                }
                
            }
            
            // If this weapon scores better, select it
            if (score > bestScore) {
                bestScore = score;
                bestWeapon = weapon;
            }
        }
        
        // Only change weapons if the selected one is different and better by at least 2 points
        if (bestWeapon !== this.currentWeapon && bestScore > 0) {
            return bestWeapon;
        }
        
        // Otherwise stick with current weapon
        return this.currentWeapon;
    }

    /**
     * Select the appropriate weapon and set it as current
     * @param {number} distanceToTarget - Distance to current target
     */
    selectBestWeapon(distanceToTarget) {
        if (!this.weapons || this.weapons.length <= 1) return;
        
        // Use our new optimal weapon selection algorithm
        const optimalWeapon = this.selectOptimalWeapon(distanceToTarget, this.target);
        
        // If we got a different weapon, switch to it
        if (optimalWeapon !== this.currentWeapon) {
            // Find the index of the optimal weapon
            const newIndex = this.weapons.indexOf(optimalWeapon);
            if (newIndex !== -1) {
                this.weaponIndex = newIndex;
                this.currentWeapon = this.weapons[this.weaponIndex];
                this.fireRate = this.currentWeapon.fireRate;
                // Reset cooldown when switching weapons (half normal delay)
                this.fireCooldown = this.fireRate * 0.5;
                
                // Log weapon change for debugging
                if (this.lastWeaponSwitch === undefined || 
                    millis() - this.lastWeaponSwitch > 2000) {
                    console.log(`${this.shipTypeName} switching to ${this.currentWeapon.name} at range ${distanceToTarget.toFixed(0)}`);
                    this.lastWeaponSwitch = millis();
                }
            }
        }
    }

    /**
     * Check if weapon cooldown is complete and ready to fire
     * @return {boolean} Whether weapon is ready to fire
     */
    isWeaponReady() {
        return this.fireCooldown <= 0;
    }

    /**
     * Check if we can fire at target based on angle difference
     * @param {number} targetAngle - Angle to target in radians
     * @return {boolean} Whether firing angle is acceptable
     */
    canFireAtTarget(targetAngle) {
        const isTurretWeapon = this.currentWeapon && this.currentWeapon.type === 'turret';
        const angleDiff = this.getAngleDifference(targetAngle);
        
        return this.currentState !== AI_STATE.IDLE && 
               (isTurretWeapon || Math.abs(angleDiff) < WIDE_ANGLE_RAD); // Use constant
    }

    /** 
     * Checks conditions and calls fire() if appropriate.
     * @param {Object} system - The current star system
     * @param {boolean} targetExists - Whether we have a valid target
     * @param {number} distanceToTarget - Distance to target
     * @param {number} shootingAngle - Angle to target in radians
     */
    performFiring(system, targetExists, distanceToTarget, shootingAngle) {

        if (!targetExists) return;
        
        // Only debug firing decisions against player
        const targetingPlayer = this.target instanceof Player;
        
        // Select best weapon (no debug)
        this.selectBestWeapon(distanceToTarget);
        
        // Adjust firing range based on weapon type
        let effectiveFiringRange = this.firingRange;
        if (this.currentWeapon) {
            switch (this.currentWeapon.type) {
                case 'beam': effectiveFiringRange *= 1.2; break;
                case 'missile': effectiveFiringRange *= 1.8; break;
                case 'turret': effectiveFiringRange *= 0.8; break;
            }
        }
        this.visualFiringRange = effectiveFiringRange;

        // Enhanced firing logic
        if (distanceToTarget < effectiveFiringRange && this.isWeaponReady()) {
            if (this.canFireAtTarget(shootingAngle)) {
                if (!this.currentSystem) this.currentSystem = system;
                
                // Player-specific targeting debug
                if (targetingPlayer) {
                    console.log(`%c🔫 FIRING AT PLAYER: ${this.shipTypeName} firing ${this.currentWeapon?.name || 'weapon'} at player`, 
                        'color:red; font-weight:bold');
                }
                
                // Weapon-specific behavior
                if (this.currentWeapon) {
                    // Standard firing for all weapon types (including missile, beam, and turret)
                    this.fireWeapon(this.target);
                } else {
                    // Fallback if no weapon defined
                    this.fireWeapon();
                }
                
                this.fireCooldown = this.fireRate;
            } else if (targetingPlayer && this.currentState === AI_STATE.IDLE) {
                // Debug when IDLE pirates spot player
                console.log(`%c🔫 PLAYER SPOTTED: ${this.shipTypeName} spotted player in range but can't fire yet`, 'color:blue');
            }
        }
    }

    /** Creates and adds a projectile aimed in the specified direction (radians). */
    fire(system, fireAngleRadians) {
        // Allow haulers to fire if they're in a defensive combat mode
        if (this.role === AI_ROLE.HAULER && 
            !(this.currentState === AI_STATE.APPROACHING || 
              this.currentState === AI_STATE.ATTACK_PASS || 
              this.currentState === AI_STATE.REPOSITIONING)) {
            return; // Only block firing when not in combat states
        }
        
        if (!system || typeof system.addProjectile !== 'function') { return; }
        if (isNaN(this.angle) || isNaN(fireAngleRadians)) { return; }
        let spawnOffset = p5.Vector.fromAngle(this.angle).mult(this.size * 0.7);
        let spawnPos = p5.Vector.add(this.pos, spawnOffset);
        let proj = new Projectile(spawnPos.x, spawnPos.y, fireAngleRadians, 'ENEMY', 5, 5);
        system.addProjectile(proj);
    }

    fireWeapon(targetToPass = null) {
        if (!this.currentWeapon || !this.currentSystem) return;

        // Barrier Activation: Check cooldown first, similar to player
        if (this.currentWeapon.type === WEAPON_TYPE.BARRIER) {
            if (this.barrierCooldown <= 0) {
                this.isBarrierActive = true;
                this.barrierDamageReduction = this.currentWeapon.damageReduction;
                this.barrierDurationTimer = this.currentWeapon.duration;
                this.barrierColor = this.currentWeapon.color || [100, 100, 255]; // Default color
                this.barrierCooldown = this.currentWeapon.fireRate; // Set cooldown for the barrier

                // Log barrier activation, similar to player's UI message
                console.log(`${this.shipTypeName} activated barrier: ${this.barrierDurationTimer}s duration, ${(this.barrierDamageReduction * 100).toFixed(0)}% DR. Cooldown: ${this.barrierCooldown}s`);
                
                // Sound effect (optional, for consistency if sounds are added later)
                // if (typeof soundManager !== 'undefined') { soundManager.playSound('shieldUp'); }

                // Immediately switch weapon for next shot
                this.cycleWeapon();
                return; // Barrier activated, no projectile fired
            } else {
                // Log barrier on cooldown
                console.log(`${this.shipTypeName} barrier on cooldown. Remaining: ${this.barrierCooldown.toFixed(1)}s`);
                return; // Barrier on cooldown
            }
        }
    
        // Default firing angle (ship's current heading)
        let fireAngle = this.angle;
    
        // Check if target is stationary or very slow-moving
        if (targetToPass && targetToPass.vel && 
            targetToPass.vel.magSq() < 0.25) { // threshold for "almost stationary"
            
            // Aim directly at the target's current position instead of predicted position
            fireAngle = atan2(
                targetToPass.pos.y - this.pos.y,
                targetToPass.pos.x - this.pos.x
            );
        }
        
        // Rest of existing code remains unchanged
        if (this.currentWeapon.type === 'missile') {
            if (!targetToPass || targetToPass.destroyed || (targetToPass.hull !== undefined && targetToPass.hull <=0)) {
                return; // Don't fire missile without a valid target
            }
        }
        
        // Check if weapons are disabled by EMP nebula
        if (this.weaponsDisabled) {
            // Silently fail - no console spam for enemies
            return;
        }
    
        WeaponSystem.fire(this, this.currentSystem, fireAngle, this.currentWeapon.type, targetToPass);
        this.fireCooldown = this.fireRate; // General weapon fire cooldown

        // The barrier-specific logic is now at the top of the function.
        // The old block for barrier activation after WeaponSystem.fire is removed.
    }

    /** Cycles to the next available weapon */
    cycleWeapon() {
        if (this.weapons && this.weapons.length > 1) {
            this.weaponIndex = (this.weaponIndex + 1) % this.weapons.length;
            this.currentWeapon = this.weapons[this.weaponIndex];
            this.fireRate = this.currentWeapon.fireRate;
            // Reset cooldown when switching weapons (optional)
            //this.fireCooldown = this.fireRate * 0.5; 
        }
    }

    /**
     * Check if this ship is armed with any weapons
     * @return {boolean} Whether ship has any weapons
     */
    isArmed() {
        return !!this.currentWeapon;
    }
    
    /**
     * Check if currently in a combat state
     * @return {boolean} Whether ship is in a combat-related state
     */
    isInCombatState() {
        return this.currentState === AI_STATE.APPROACHING || 
               this.currentState === AI_STATE.ATTACK_PASS || 
               this.currentState === AI_STATE.REPOSITIONING;
    }
}

/**
 * Applies all EnemyCombat methods to the Enemy prototype
 * This function should be called after the Enemy class is defined
 * and before any Enemy instances are created.
 */
function applyEnemyCombatMethods() {
    if (typeof Enemy === 'undefined') {
        console.error('applyEnemyCombatMethods: Enemy class not defined yet!');
        return;
    }

    // Get all method names from EnemyCombat prototype (excluding constructor)
    const methodNames = Object.getOwnPropertyNames(EnemyCombat.prototype)
        .filter(name => name !== 'constructor');

    // Copy each method to Enemy prototype
    methodNames.forEach(methodName => {
        Enemy.prototype[methodName] = EnemyCombat.prototype[methodName];
    });

    console.log(`Applied ${methodNames.length} combat methods to Enemy prototype:`, methodNames.join(', '));
}
