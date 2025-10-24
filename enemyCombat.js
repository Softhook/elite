// ****** enemyCombat.js ******
// Enemy combat and weapons methods
// Extracted from Enemy class as part of Stage 6 refactoring

/**
 * EnemyCombat class contains all combat and weapon-related methods
 * for the Enemy class. These methods are applied to the Enemy prototype
 * via the applyEnemyCombatMethods() function.
 */
// Helper to normalize weapon type families (e.g., "straight3" -> "straight")
function getBaseWeaponType(type) {
    if (!type) return null;
    if (typeof type !== 'string') return type;
    if (type.startsWith(WEAPON_TYPE.STRAIGHT)) return WEAPON_TYPE.STRAIGHT;
    if (type.startsWith(WEAPON_TYPE.SPREAD)) return WEAPON_TYPE.SPREAD;
    return type;
}

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
        const barrierWeapon = this.weapons.find(w => w.type === WEAPON_TYPE.BARRIER);
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
        let currentWeaponScore = -1;

        // Check if target is already entangled
        const targetAlreadyEntangled = target && 
                                    target.dragMultiplier > 1.0 && 
                                    target.dragEffectTimer > 0;
        
        for (const weapon of this.weapons) {
            let score = 0;

            // Determine base type family (handles straightN/spreadN)
            const type = weapon.type || '';
            const baseType = getBaseWeaponType(type);

            // Range considerations (per-weapon effective range)
            let rangeMult = 1.0;
            switch (baseType) {
                case WEAPON_TYPE.BEAM: rangeMult = 1.2; break;
                case WEAPON_TYPE.MISSILE: rangeMult = 1.8; break;
                case WEAPON_TYPE.TURRET: rangeMult = 0.8; break;
                default: rangeMult = 1.0; break;
            }
            const effectiveRange = this.firingRange * rangeMult;
            const isLongRange = distanceToTarget > effectiveRange * MEDIUM_RANGE_MULT;
            const isMediumRange = distanceToTarget > effectiveRange * CLOSE_RANGE_MULT && distanceToTarget <= effectiveRange * MEDIUM_RANGE_MULT;
            const isShortRange = distanceToTarget <= effectiveRange * CLOSE_RANGE_MULT;
            const isVeryCloseRange = distanceToTarget <= effectiveRange * 0.2; // Very close = 20% of firing range
            
            // --- FORCE WEAPON LOGIC ---
            // Force weapons are highly effective at very close range
            if (baseType === WEAPON_TYPE.FORCE) {
                if (isVeryCloseRange) {
                    score += 5; // Highest priority at very close range
                } else if (!isShortRange) {
                    score -= 1; // Mild penalty outside close range
                }
            }

            // --- TANGLE WEAPON LOGIC ---
            if (baseType === WEAPON_TYPE.TANGLE && target) {
                // Only consider tangle weapons if target is NOT already entangled
                if (!targetAlreadyEntangled) {
                    // Extra effective against very fast targets
                    if (target.maxSpeed > 6.5) {
                        score += 5; // Highest priority for very fast targets
                    } 
                    // Good for fast targets
                    else if (target.maxSpeed > 5) {
                        score += 3;
                        if (isMediumRange) score += 1; // small bump at medium range vs fast targets
                    } 
                } else {
                    // Target is already entangled - significant penalty
                    score -= 10; // Strong negative score to discourage selection
                }
            }

            // --- MINE WEAPON LOGIC ---
            // Mines are good when being chased, fleeing, or very close
            if (baseType === WEAPON_TYPE.MINE && target) {
                // Compute relative angle
                const angleToTarget = atan2(target.pos.y - this.pos.y, target.pos.x - this.pos.x);
                const angleDiffToTarget = this.getAngleDifference(angleToTarget);
                const isBehind = Math.abs(angleDiffToTarget) > (Math.PI * 0.5); // > 90° behind

                // Weapon-specific radii if available
                const triggerR = weapon.triggerRadius || 80;
                const closeMineRange = triggerR * 1.75; // very close bonus window

                // Fleeing/low health context
                const lowHealth = (this.hull / this.maxHull) < 0.4;
                const isFleeing = this.currentState === AI_STATE.FLEEING || this.currentState === AI_STATE.REPOSITIONING;

                // Baseline desire to use mines when chased and reasonably close
                if (isBehind && distanceToTarget < effectiveRange * 1.6) {
                    score += 6; // stronger than before
                    if (isFleeing || lowHealth) score += 3; // drop more when escaping or hurt
                }

                // If target is very close, dropping a mine can still work even if not fully behind
                if (distanceToTarget < closeMineRange) {
                    score += 3; // proximity bonus
                }

                // Mild penalty when far and not behind
                if (!isBehind && distanceToTarget > effectiveRange * 0.6) {
                    score -= 4;
                }
            }

            // Score based on weapon type and range
            if (baseType === WEAPON_TYPE.BEAM && isLongRange) {
                score += 3; // Beams are good at long range
            } else if (baseType === WEAPON_TYPE.BEAM && isMediumRange) {
                score += 2;
            } else if (baseType === WEAPON_TYPE.BEAM && isShortRange) {
                score += 1;
            }
            
            if (baseType === WEAPON_TYPE.SPREAD && isShortRange) {
                score += 3; // now catches spread2/3/4/5
            } else if (baseType === WEAPON_TYPE.STRAIGHT && isMediumRange) {
                score += 2; // now catches straight2/3/4…
            } else if (baseType === WEAPON_TYPE.STRAIGHT && isLongRange) {
                score += 1;
            }
            
            if (baseType === WEAPON_TYPE.MISSILE && (isMediumRange || isLongRange)) {
                score += 3; // Missiles are best at medium to long range
            } else if (baseType === WEAPON_TYPE.MISSILE && isShortRange) {
                score += 1;
            }
            
            if (baseType === WEAPON_TYPE.TURRET) {
                score += 2; // Turrets are flexible at any range
            }
            
            // Target-specific considerations
            if (target) {
                // Against fast targets, prefer wide-angle weapons like spread
                if (target.maxSpeed > 5 && baseType === WEAPON_TYPE.SPREAD) {
                    score += 3;
                }    
                // Against slow targets, prefer missile weapons
                if (target.maxSpeed < 5 && baseType === WEAPON_TYPE.MISSILE) {
                    score += 2;
                }
                // Against large targets, prefer high damage weapons
                if (target.size > 50 && weapon.damage > 10) {
                    score += 2;
                }
                
            }
            
            // If this weapon scores better, select it
            if (weapon === this.currentWeapon) {
                currentWeaponScore = score;
            }
            if (score > bestScore) {
                bestScore = score;
                bestWeapon = weapon;
            }
        }
        
        // Only change weapons if the selected one is different and better by a threshold
        const improvement = (bestWeapon !== this.currentWeapon) ? (bestScore - (currentWeaponScore >= 0 ? currentWeaponScore : 0)) : 0;
        if (bestWeapon !== this.currentWeapon && improvement >= 0) {
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
                    AI_LOG(`${this.shipTypeName} switching to ${this.currentWeapon.name} at range ${distanceToTarget.toFixed(0)}`);
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
        const weaponType = this.currentWeapon && this.currentWeapon.type;
        const baseType = weaponType ? getBaseWeaponType(weaponType) : null;
        const isTurretWeapon = baseType === WEAPON_TYPE.TURRET;
        const angleDiff = this.getAngleDifference(targetAngle);

        // Mines: dropping doesn't require aiming toward the target
        // Always allow mine deployment when other gating checks pass (range, cooldown, etc.)
        if (baseType === WEAPON_TYPE.MINE) return true;

        if (this.currentState === AI_STATE.IDLE) return false;

        // Allow more permissive firing while REPOSITIONING so enemies can shoot while moving
        if (this.currentState === AI_STATE.REPOSITIONING) {
            if (baseType === WEAPON_TYPE.MISSILE) {
                // Missiles can be fired in any facing during repositioning
                return true;
            }
            if (isTurretWeapon) return true; // Turrets already unconstrained

            // Beams/spread get wider arc; straight projectiles slightly wider
            const isBeam = baseType === WEAPON_TYPE.BEAM;
            const isSpread = baseType === WEAPON_TYPE.SPREAD;
            const widened = (isBeam || isSpread) ? WIDE_ANGLE_RAD * 2.0 : WIDE_ANGLE_RAD * 1.35;
            return Math.abs(angleDiff) < Math.min(widened, PI);
        }

        // Default rule
        return isTurretWeapon || Math.abs(angleDiff) < WIDE_ANGLE_RAD; // Use constant
    }

    /** 
     * Checks conditions and calls fire() if appropriate.
     * @param {Object} system - The current star system
     * @param {boolean} targetExists - Whether we have a valid target
     * @param {number} distanceToTarget - Distance to target
     * @param {number} shootingAngle - Angle to target in radians
     */
    performFiring(system, targetExists, distanceToTarget, shootingAngle) {
        // Proactively activate barrier if needed regardless of target status
        this.activateBarrierIfNeeded();
        if (!targetExists) return;

        // Safety: never fire at Cargo objects (should be collected instead)
        if (this.target && this.target.constructor && this.target.constructor.name === 'Cargo') {
            return;
        }
        
        // Only debug firing decisions against player
        const targetingPlayer = this.target instanceof Player;
        
        // Check if Hauler is in a valid combat state to fire
        const isHaulerInValidCombatState = this.role !== AI_ROLE.HAULER || 
            (this.currentState === AI_STATE.APPROACHING || 
             this.currentState === AI_STATE.ATTACK_PASS || 
             this.currentState === AI_STATE.REPOSITIONING ||
             this.currentState === AI_STATE.SNIPING);
        
        // Don't proceed with firing logic if Hauler is not in valid combat state
        if (!isHaulerInValidCombatState) {
            return;
        }
        
        // Select best weapon (no debug)
        this.selectBestWeapon(distanceToTarget);
        
        // Adjust firing range based on weapon type
        let effectiveFiringRange = this.firingRange;
        if (this.currentWeapon) {
            const type = this.currentWeapon.type || '';
            const baseType = getBaseWeaponType(type);
            switch (baseType) {
                case WEAPON_TYPE.BEAM: effectiveFiringRange *= 1.2; break;
                case WEAPON_TYPE.MISSILE: effectiveFiringRange *= 1.8; break;
                case WEAPON_TYPE.TURRET: effectiveFiringRange *= 0.8; break;
            }
        }
        this.visualFiringRange = effectiveFiringRange;

        // Enhanced firing logic
        if (distanceToTarget < effectiveFiringRange && this.isWeaponReady()) {
            if (this.canFireAtTarget(shootingAngle)) {
                // Player-specific targeting debug (throttled to reduce spam)
                if (targetingPlayer) {
                    // Only log first shot or after 2 second cooldown
                    const now = millis();
                    if (!this._lastPlayerFireLog || (now - this._lastPlayerFireLog) > 2000) {
                        AI_LOG(`🔫 FIRING AT PLAYER: ${this.shipTypeName} firing ${this.currentWeapon?.name || 'weapon'} at player`);
                        this._lastPlayerFireLog = now;
                    }
                }
                // Weapon-specific behavior
                if (this.currentWeapon) {
                    // Standard firing for all weapon types (including missile, beam, and turret)
                    this.fireWeapon(shootingAngle, this.target);
                } else {
                    // Fallback if no weapon defined
                    this.fireWeapon(shootingAngle);
                }
            } else if (targetingPlayer && this.currentState === AI_STATE.IDLE) {
                // Debug when IDLE pirates spot player
                        AI_LOG(`🔫 PLAYER SPOTTED: ${this.shipTypeName} spotted player in range but can't fire yet`);
            }
        }
    }

    /** Creates and adds a projectile aimed in the specified direction (radians). */
    fire(system, fireAngleRadians) {
        // Allow haulers to fire if they're in a defensive combat mode
        if (this.role === AI_ROLE.HAULER && 
            !(this.currentState === AI_STATE.APPROACHING || 
              this.currentState === AI_STATE.ATTACK_PASS || 
              this.currentState === AI_STATE.REPOSITIONING ||
              this.currentState === AI_STATE.SNIPING)) {
            return; // Only block firing when not in combat states
        }
        
        if (!system) { return; }
        if (isNaN(this.angle) || isNaN(fireAngleRadians)) { return; }
        const type = this.currentWeapon?.type || WEAPON_TYPE.PROJECTILE;
        WeaponSystem.fire(this, system, fireAngleRadians, type, this.target);
    }

    /**
     * Try to activate barrier proactively, independent of having a firing target.
     * Returns true if barrier was activated this call.
     */
    activateBarrierIfNeeded() {
        if (!this.weapons || !this.weapons.length) return false;
        if (this.barrierCooldown > 0) return false;

        // Find barrier definition among equipped weapons
        const barrierWeapon = this.weapons.find(w => w.type === WEAPON_TYPE.BARRIER);
        if (!barrierWeapon) return false;

        const hullPct = this.maxHull > 0 ? (this.hull / this.maxHull) : 0;
        const shieldPct = this.maxShield > 0 ? (this.shield / this.maxShield) : 1;
        const shouldActivate = (hullPct < 0.3 || shieldPct < 0.3);
        if (!shouldActivate) return false;

        // Activate barrier using weapon's properties without switching currentWeapon
        this.isBarrierActive = true;
        this.barrierDamageReduction = barrierWeapon.damageReduction;
        this.barrierDurationTimer = barrierWeapon.duration;
        this.barrierColor = barrierWeapon.color || [100, 100, 255];
        this.barrierCooldown = barrierWeapon.fireRate;

        // Feedback
        AI_LOG?.(`${this.shipTypeName} activated barrier (auto): ${this.barrierDurationTimer}s, ${(this.barrierDamageReduction * 100).toFixed(0)}% DR`);
        if (typeof soundManager !== 'undefined') { soundManager.playSound('barrierUp'); }
        return true;
    }

    fireWeapon(preferredAngle = null, targetToPass = null) {
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
                        AI_LOG(`${this.shipTypeName} activated barrier: ${this.barrierDurationTimer}s duration, ${(this.barrierDamageReduction * 100).toFixed(0)}% DR. Cooldown: ${this.barrierCooldown}s`);
                
                // Sound effect for barrier activation (parity with player)
                if (typeof soundManager !== 'undefined') { soundManager.playSound('barrierUp'); }

                // Immediately switch weapon for next shot
                this.cycleWeapon();
                return; // Barrier activated, no projectile fired
            } else {
                // Barrier on cooldown - skip without logging to avoid spam
                // Auto-cycle to avoid a no-op if barrier is selected but cooling down
                this.cycleWeapon();
                return; // Barrier on cooldown
            }
        }
    
        // Default firing angle (ship's current heading)
        let fireAngle = (preferredAngle !== null && isFinite(preferredAngle)) ? preferredAngle : this.angle;
    
        // Check if target is stationary or very slow-moving
        if (preferredAngle === null && targetToPass && targetToPass.vel && 
            targetToPass.vel.magSq() < 0.25) { // threshold for "almost stationary"
            // Aim directly at the target's current position instead of predicted position
            fireAngle = atan2(
                targetToPass.pos.y - this.pos.y,
                targetToPass.pos.x - this.pos.x
            );
        }
        
        // Handle mine weapon - drop and switch to another weapon
        if ((this.currentWeapon.type || '') === WEAPON_TYPE.MINE) {
            WeaponSystem.fire(this, this.currentSystem, fireAngle, this.currentWeapon.type, targetToPass);
            this.fireCooldown = this.fireRate; // General weapon fire cooldown
            
            // Immediately switch to a different weapon after dropping mine
            this.cycleWeapon();
            return;
        }
        
        // Rest of existing code remains unchanged
        if ((this.currentWeapon.type || '') === WEAPON_TYPE.MISSILE) {
            // Block missiles against invalid or non-hostile targets like cargo
            if (!targetToPass ||
                targetToPass.destroyed ||
                (targetToPass.hull !== undefined && targetToPass.hull <=0) ||
                (targetToPass.constructor && targetToPass.constructor.name === 'Cargo')) {
                return; // Don't fire missile without a valid target
            }
        }
        
        // Check if weapons are disabled by EMP nebula
        if (this.weaponsDisabled) {
            // Silently fail - no console spam for enemies
            return;
        }
    
        // Extra safety: prevent firing at cargo with any weapon type
        if (targetToPass && targetToPass.constructor && targetToPass.constructor.name === 'Cargo') {
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
               this.currentState === AI_STATE.REPOSITIONING ||
               this.currentState === AI_STATE.SNIPING;
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
