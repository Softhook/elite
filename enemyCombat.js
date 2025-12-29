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
        // If we only have one weapon (or none), return current state
        // Note: For unarmed ships, this returns null which is correct
        if (!this.weapons || this.weapons.length <= 1) return this.currentWeapon;

        // OPTIMIZATION: Skip weapon scoring for off-screen enemies, just use current
        if (this._isOnScreen === false) {
            return this.currentWeapon || (this.weapons && this.weapons.length > 0 ? this.weapons[0] : null);
        }

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

        // Check if target is already entangled (tangle effect) or currently harpooned by any active harpoon
        const targetAlreadyEntangled = target &&
            target.dragMultiplier > 1.0 &&
            target.dragEffectTimer > 0;

        // Detect whether the target is currently part of an active Harpoon tether in the system
        // Use a simple counter on the entity for O(1) checks (set when harpoon is created/broken)
        const targetHarpooned = !!(target && (((target._harpoonCount || 0) + (target._harpoonPending || 0)) > 0));

        // Also detect whether *we* (the owner) already have an active harpoon tether or
        // an outgoing harpoon projectile. If the ship already has a tether out or a pending
        // shot, it should not attempt to fire another one.
        const ownerHarpooned = !!((((this._harpoonCount || 0) + (this._harpoonPending || 0)) > 0));

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
            // Force weapons are area-of-effect weapons effective up to their maxRadius
            if (baseType === WEAPON_TYPE.FORCE) {
                const forceMaxRadius = weapon.maxRadius || 500; // Default to 500 if not specified

                // Force weapons are most effective when target is within 60% of maxRadius
                // and should be prioritized when within the actual blast radius
                if (distanceToTarget <= forceMaxRadius * 0.6) {
                    score += 5; // Highest priority within optimal range
                } else if (distanceToTarget <= forceMaxRadius) {
                    score += 3; // Good priority within blast radius
                } else if (distanceToTarget <= forceMaxRadius * 1.2) {
                    score += 1; // Mild bonus just outside range (they might move in)
                } else {
                    score -= 2; // Penalty when clearly out of range
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

            // --- HARPOON WEAPON LOGIC ---
            if (baseType === WEAPON_TYPE.HARPOON && target) {
                // Avoid firing harpoon at already entangled targets OR targets already attached to a harpoon
                // Also avoid selecting harpoon if *we* already have an active harpoon tether.
                if (targetAlreadyEntangled || targetHarpooned || ownerHarpooned) {
                    score -= 10;
                } else {
                    // Prefer harpoon when the target is faster than us or generally fast
                    const targetSpeed = target.maxSpeed || (target.vel ? Math.sqrt((target.vel.x || 0) * (target.vel.x || 0) + (target.vel.y || 0) * (target.vel.y || 0)) : 0);
                    const ourSpeed = this.maxSpeed || (this.vel ? Math.sqrt((this.vel.x || 0) * (this.vel.x || 0) + (this.vel.y || 0) * (this.vel.y || 0)) : 0);

                    // High priority when target is significantly faster or very fast in general
                    if (targetSpeed > ourSpeed + 1.5 || targetSpeed > 6) {
                        score += 6;
                    } else if (targetSpeed > ourSpeed) {
                        score += 3;
                    }

                    // Harpoon excels at Long ranges (throwing distance)
                    if (isMediumRange) score += 1;
                    else if (isLongRange) score += 2;

                    // Slight bonus vs larger targets (better to tether heavy ships)
                    if (target.size && target.size > 40) score += 1;
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
                // EXPLOIT FIX: Preserve existing cooldown when switching weapons
                // This prevents bypassing fire rate by rapidly switching weapons

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
     * Compute adjusted cooldown based on tangle/drag effects.
     * When a ship is tangled (`dragEffectTimer > 0`) increase cooldown proportionally
     * to the dragMultiplier but clamp the effect to avoid extreme slowdowns.
     * @param {number} baseCooldown - The base cooldown in seconds
     * @return {number} Adjusted cooldown in seconds
     */
    computeCooldown(baseCooldown) {
        if (!baseCooldown || baseCooldown <= 0) return baseCooldown;
        try {
            if (this.dragEffectTimer > 0 && this.dragMultiplier > 1.0) {
                // Scale factor: modest scaling of dragMultiplier (10 -> ~1.9x)
                const scale = 1 + Math.min(3, (this.dragMultiplier - 1.0) * 0.1);
                return baseCooldown * scale;
            }
        } catch (e) {
            // In case something is undefined on exotic objects, fall back to base
            return baseCooldown;
        }
        return baseCooldown;
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

    _hasClearShotToTarget(system, targetPos, distanceToTarget) {
        if (!system || !Array.isArray(system.asteroids) || !system.asteroids.length) return true;
        if (!targetPos || targetPos.x === undefined || targetPos.y === undefined) return true;
        const maxCheckDist = Math.min(
            isFinite(distanceToTarget) ? distanceToTarget : Infinity,
            (this.firingRange || distanceToTarget || 0) * 1.5 || Infinity
        );
        const maxCheckDistSq = isFinite(maxCheckDist) ? maxCheckDist * maxCheckDist : Infinity;

        // OPTIMIZATION: Skip LOS checks for off-screen enemies (trust they can hit)
        if (this._isOnScreen === false) return true;

        const p1x = this.pos?.x;
        const p1y = this.pos?.y;
        const p2x = targetPos.x;
        const p2y = targetPos.y;
        if (p1x === undefined || p1y === undefined) return true;

        const segDx = p2x - p1x;
        const segDy = p2y - p1y;
        const segLenSq = segDx * segDx + segDy * segDy;
        if (segLenSq === 0) return true;

        // Helper to check if a single entity blocks the line of fire
        const isBlockedBy = (cx, cy, radius) => {
            const distToEntitySq = (cx - p1x) * (cx - p1x) + (cy - p1y) * (cy - p1y);
            if (distToEntitySq > maxCheckDistSq + radius * radius) return false;

            const t = ((cx - p1x) * segDx + (cy - p1y) * segDy) / segLenSq;
            const clampedT = Math.max(0, Math.min(1, t));
            const projX = p1x + clampedT * segDx;
            const projY = p1y + clampedT * segDy;
            const closestDistSq = (projX - cx) * (projX - cx) + (projY - cy) * (projY - cy);
            const blockThreshold = (radius + Math.max(6, this.size * 0.15 || 0)) ** 2;
            return closestDistSq <= blockThreshold;
        };

        // Check asteroids
        for (const ast of system.asteroids) {
            if (!ast || ast.destroyed) continue;
            const cx = ast.pos?.x;
            const cy = ast.pos?.y;
            if (cx === undefined || cy === undefined) continue;
            const radius = ast.maxRadius || (ast.size ? ast.size * 0.5 : 0);
            if (!radius || radius < 6) continue;
            if (isBlockedBy(cx, cy, radius)) return false;
        }

        // Friendly-fire guard: do not shoot through allies in the same faction
        const ourFaction = this.faction || (typeof this._getShipFaction === 'function' ? this._getShipFaction(this) : null);
        if (ourFaction && Array.isArray(system.enemies)) {
            for (const ally of system.enemies) {
                if (!ally || ally === this || ally === this.target || ally.destroyed) continue;
                if (!ally.pos || ally.pos.x === undefined || ally.pos.y === undefined) continue;
                const allyFaction = ally.faction || (typeof ally._getShipFaction === 'function' ? ally._getShipFaction(ally) : null);
                if (!allyFaction || allyFaction !== ourFaction) continue;
                const radius = ally.size ? ally.size * 0.5 : (ally.maxRadius || 0) || 12;
                if (isBlockedBy(ally.pos.x, ally.pos.y, radius)) return false;
            }
        }
        return true;
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

        // Final sanity: if we have a target reference, verify it's still valid
        // This prevents race windows where a cached positional target remains
        // and the AI fires at an empty location after the entity was destroyed.
        try {
            if (this.target && typeof this.isTargetValid === 'function' && !this.isTargetValid(this.target)) {
                // Clear any precomputed attack pass position to avoid shooting at stale coords
                if (this.attackPassTargetPos) this.attackPassTargetPos = null;
                return;
            }
        } catch (e) {
            // defensive: if validation throws, bail out of firing for safety
            return;
        }

        // Safety: never fire at Cargo objects (should be collected instead)
        if (this.target && this.target.constructor && this.target.constructor.name === 'Cargo') {
            return;
        }

        // Only debug firing decisions against player
        const targetingPlayer = this.target instanceof Player;

        // Check if Hauler is in a valid combat state to fire
        if (!this._isInCombatState()) {
            return;
        }

        // Select best weapon (no debug)
        this.selectBestWeapon(distanceToTarget);

        // If the target is currently attached to an active Harpoon tether, avoid holding/firing a harpoon against it
        try {
            const targetIsHarpooned = !!(this.target && (((this.target._harpoonCount || 0) + (this.target._harpoonPending || 0)) > 0));
            const ownerHasHarpoon = !!((((this._harpoonCount || 0) + (this._harpoonPending || 0)) > 0));
            if ((targetIsHarpooned || ownerHasHarpoon) && this.currentWeapon) {
                const curBase = getBaseWeaponType(this.currentWeapon.type || '');
                if (curBase === WEAPON_TYPE.HARPOON) {
                    // Immediately cycle away from harpoon to avoid redundant shots
                    this.cycleWeapon();
                    // Small cooldown to avoid instant re-selection spam
                    this.fireCooldown = Math.max(this.fireCooldown || 0, 0.05);
                    if (typeof AI_LOG !== 'undefined') {
                        AI_LOG(`${this.shipTypeName} avoided firing duplicate harpoon (ownerHas=${ownerHasHarpoon}, targetHas=${targetIsHarpooned}) and switched weapon`);
                    }
                }
            }
        } catch (e) {
            // defensive: ignore unexpected structure
        }

        // Safety: unarmed ships should not reach here, but guard anyway
        if (!this.currentWeapon) return;

        // Adjust firing range based on weapon type
        let effectiveFiringRange = this.firingRange;
        if (this.currentWeapon) {
            const type = this.currentWeapon.type || '';
            const baseType = getBaseWeaponType(type);
            switch (baseType) {
                case WEAPON_TYPE.BEAM: effectiveFiringRange *= 1.2; break;
                case WEAPON_TYPE.MISSILE: effectiveFiringRange *= 1.8; break;
                case WEAPON_TYPE.TURRET: effectiveFiringRange *= 0.8; break;
                case WEAPON_TYPE.FORCE:
                    // Force weapons should use their actual maxRadius as effective range
                    effectiveFiringRange = this.currentWeapon.maxRadius || this.firingRange;
                    break;
            }
        }
        this.visualFiringRange = effectiveFiringRange;

        // Enhanced firing logic
        if (distanceToTarget < effectiveFiringRange && this.isWeaponReady()) {
            const clearShot = this._hasClearShotToTarget(system, this.target?.pos, distanceToTarget);
            if (!clearShot) {
                // Small cooldown bump so we do not spam checks every frame while blocked
                this.fireCooldown = Math.max(this.fireCooldown || 0, 0.08);
                return;
            }
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

                // DUAL-ENGAGE: Large ships can fire at a secondary target simultaneously
                if (typeof this.canDualEngage === 'function' && this.canDualEngage() &&
                    this.weapons && this.weapons.length >= 2) {
                    const secondaryTarget = this.findSecondaryTarget(system, this.target);
                    if (secondaryTarget) {
                        this.performSecondaryFiring(system, secondaryTarget);
                    }
                }
            } else if (targetingPlayer && this.currentState === AI_STATE.IDLE) {
                // Debug when IDLE pirates spot player
                AI_LOG(`🔫 PLAYER SPOTTED: ${this.shipTypeName} spotted player in range but can't fire yet`);
            }
        }

        // Update secondary fire cooldown (decrement each frame)
        if (this._secondaryFireCooldown > 0) {
            const dtSeconds = (typeof deltaTime === 'number' && isFinite(deltaTime)) ? (deltaTime / 1000) : DEFAULT_DELTA_SECONDS;
            this._secondaryFireCooldown = Math.max(0, this._secondaryFireCooldown - dtSeconds);
        }
    }

    /**
     * Check if this ship is in a valid combat state for attacking.
     * Haulers have special rules - they only attack in specific states.
     * @return {boolean} Whether the ship can engage in combat
     */
    _isInCombatState() {
        if (this.role !== AI_ROLE.HAULER) return true;
        return this.currentState === AI_STATE.APPROACHING ||
            this.currentState === AI_STATE.ATTACK_PASS ||
            this.currentState === AI_STATE.REPOSITIONING ||
            this.currentState === AI_STATE.SNIPING;
    }

    /** Creates and adds a projectile aimed in the specified direction (radians). */
    fire(system, fireAngleRadians) {
        if (!this._isInCombatState()) return;

        if (!system) { return; }
        if (isNaN(this.angle) || isNaN(fireAngleRadians)) { return; }
        const type = this.currentWeapon?.type || WEAPON_TYPE.PROJECTILE;
        const fired = WeaponSystem.fire(this, system, fireAngleRadians, type, this.target);
        if (fired) {
            this.fireCooldown = this.computeCooldown(this.fireRate);
        }
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
        let weaponType = (this.currentWeapon.type || '');

        // Prevent firing a second harpoon if either we already have an active tether
        // or the target is already attached to a harpoon. Cycle to another weapon instead.
        if (weaponType === WEAPON_TYPE.HARPOON) {
            const ownerHasHarpoon = !!((((this._harpoonCount || 0) + (this._harpoonPending || 0)) > 0));
            const targetHasHarpoon = !!(targetToPass && (((targetToPass._harpoonCount || 0) + (targetToPass._harpoonPending || 0)) > 0));
            if (ownerHasHarpoon || targetHasHarpoon) {
                this.cycleWeapon();
                this.fireCooldown = Math.max(this.fireCooldown || 0, 0.05);
                if (typeof AI_LOG !== 'undefined') AI_LOG(`${this.shipTypeName} avoided firing duplicate harpoon (ownerHas=${ownerHasHarpoon}, targetHas=${targetHasHarpoon})`);
                return;
            }
        }

        if (weaponType === WEAPON_TYPE.BEAM && typeof WeaponSystem !== 'undefined') {
            if (WeaponSystem.isBeamOverheated(this, this.currentWeapon)) {
                const switched = this._switchWeaponAfterBeamOverheat();
                if (!switched) {
                    return;
                }
                weaponType = (this.currentWeapon.type || '');
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
        if (weaponType === WEAPON_TYPE.MINE) {
            const firedMine = WeaponSystem.fire(this, this.currentSystem, fireAngle, this.currentWeapon.type, targetToPass);
            if (firedMine) {
                this.fireCooldown = this.computeCooldown(this.fireRate); // General weapon fire cooldown
            }

            // Immediately switch to a different weapon after dropping mine
            this.cycleWeapon();
            return;
        }

        // Rest of existing code remains unchanged
        if (weaponType === WEAPON_TYPE.MISSILE) {
            // Block missiles against invalid or non-hostile targets like cargo
            if (!targetToPass ||
                targetToPass.destroyed ||
                (targetToPass.hull !== undefined && targetToPass.hull <= 0) ||
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

        // If firing a harpoon, attempt a simple leading solution so the harpoon
        // projectile (which has significant speed) will intercept faster targets.
        if (weaponType === WEAPON_TYPE.HARPOON && targetToPass && targetToPass.pos && targetToPass.vel) {
            try {
                const tx = targetToPass.pos.x - this.pos.x;
                const ty = targetToPass.pos.y - this.pos.y;
                const tvx = targetToPass.vel.x || 0;
                const tvy = targetToPass.vel.y || 0;
                const s = (this.currentWeapon && this.currentWeapon.speed) ? this.currentWeapon.speed : 30;

                // Solve quadratic for interception time: (tv^2 - s^2) t^2 + 2*(r·v) t + r^2 = 0
                const a = (tvx * tvx + tvy * tvy) - (s * s);
                const b = 2 * (tx * tvx + ty * tvy);
                const c = tx * tx + ty * ty;
                let t = null;
                if (Math.abs(a) < 1e-6) {
                    // Degenerate to linear: b t + c = 0 -> t = -c/b
                    if (Math.abs(b) > 1e-6) {
                        const tl = -c / b;
                        if (tl > 0) t = tl;
                    }
                } else {
                    const disc = b * b - 4 * a * c;
                    if (disc >= 0) {
                        const sqrtD = Math.sqrt(disc);
                        const t1 = (-b - sqrtD) / (2 * a);
                        const t2 = (-b + sqrtD) / (2 * a);
                        // pick smallest positive time
                        const candidates = [t1, t2].filter(v => v > 0).sort((A, B) => A - B);
                        if (candidates.length) t = candidates[0];
                    }
                }

                if (t && isFinite(t) && t > 0) {
                    const aimX = targetToPass.pos.x + tvx * t;
                    const aimY = targetToPass.pos.y + tvy * t;
                    fireAngle = atan2(aimY - this.pos.y, aimX - this.pos.x);
                }
            } catch (e) {
                // If anything fails, fall back to non-leading fireAngle
            }
        }

        const fired = WeaponSystem.fire(this, this.currentSystem, fireAngle, weaponType, targetToPass);
        if (fired) {
            this.fireCooldown = this.computeCooldown(this.fireRate); // General weapon fire cooldown
        } else if (weaponType === WEAPON_TYPE.BEAM && typeof WeaponSystem !== 'undefined' &&
            WeaponSystem.isBeamOverheated(this, this.currentWeapon)) {
            this._switchWeaponAfterBeamOverheat();
        }

        // The barrier-specific logic is now at the top of the function.
        // The old block for barrier activation after WeaponSystem.fire is removed.
    }

    /** Cycles to the next available weapon */
    cycleWeapon() {
        if (!this.weapons || this.weapons.length <= 1) return;

        const originalIndex = this.weaponIndex;
        let attempts = 0;

        do {
            this.weaponIndex = (this.weaponIndex + 1) % this.weapons.length;
            const candidate = this.weapons[this.weaponIndex];

            // Skip overheated beams
            if (candidate && candidate.type === WEAPON_TYPE.BEAM &&
                typeof WeaponSystem !== 'undefined' &&
                WeaponSystem.isBeamOverheated(this, candidate)) {
                attempts++;
                continue;
            }

            // Found a usable weapon
            this.currentWeapon = candidate;
            this.fireRate = candidate.fireRate;
            return;

        } while (this.weaponIndex !== originalIndex && attempts < this.weapons.length);

        // If all weapons are overheated/unavailable, stay on current
        // (should rarely happen, but prevents infinite loop)
    }

    _switchWeaponAfterBeamOverheat() {
        if (!Array.isArray(this.weapons) || this.weapons.length <= 1) {
            return false;
        }

        const originalIndex = this.weaponIndex;
        for (let offset = 1; offset < this.weapons.length; offset++) {
            const candidateIndex = (originalIndex + offset) % this.weapons.length;
            const candidate = this.weapons[candidateIndex];
            if (!candidate) {
                continue;
            }
            if (candidate.type === WEAPON_TYPE.BARRIER) {
                continue;
            }
            if (candidate.type === WEAPON_TYPE.BEAM && typeof WeaponSystem !== 'undefined' &&
                WeaponSystem.isBeamOverheated(this, candidate)) {
                continue;
            }

            this.weaponIndex = candidateIndex;
            this.currentWeapon = candidate;
            this.fireRate = candidate.fireRate;
            return true;
        }

        return false;
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

    /**
     * Check if this ship can engage two targets simultaneously
     * @return {boolean} Whether ship has dual-engage capability
     */
    canDualEngage() {
        // Check ship definition for canDualEngage property
        if (this.shipTypeName && typeof SHIP_DEFINITIONS !== 'undefined') {
            const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
            return !!(shipDef && shipDef.canDualEngage);
        }
        return false;
    }

    /**
     * Find a secondary target for dual-engage capable ships
     * @param {Object} system - The current star system
     * @param {Object} primaryTarget - The current primary target to exclude
     * @return {Object|null} A secondary target or null if none found
     */
    findSecondaryTarget(system, primaryTarget) {
        if (!system || !this.pos) return null;

        const candidates = [];
        const firingRange = this.visualFiringRange || this.firingRange || 500;

        // Check enemies as potential secondary targets
        if (Array.isArray(system.enemies)) {
            for (const enemy of system.enemies) {
                // Skip self, primary target, destroyed, or invalid targets
                if (!enemy || enemy === this || enemy === primaryTarget) continue;
                if (enemy.destroyed || enemy.hull <= 0) continue;
                if (!enemy.pos) continue;

                // Skip same-faction targets
                if (typeof this._getShipFaction === 'function') {
                    const ourFaction = this._getShipFaction(this);
                    const theirFaction = this._getShipFaction(enemy);
                    if (ourFaction && theirFaction && ourFaction === theirFaction) continue;
                }

                // Check if within firing range
                const dx = enemy.pos.x - this.pos.x;
                const dy = enemy.pos.y - this.pos.y;
                const distSq = dx * dx + dy * dy;
                const rangeSq = firingRange * firingRange;

                if (distSq <= rangeSq) {
                    candidates.push({
                        target: enemy,
                        distSq: distSq
                    });
                }
            }
        }

        // Check player as potential secondary target
        if (system.player && system.player !== primaryTarget) {
            const player = system.player;
            if (player.pos && !player.destroyed && player.hull > 0) {
                // Only target player if they're hostile (wanted, attacked us, etc.)
                const shouldTargetPlayer = (
                    (typeof system.isPlayerWanted === 'function' && system.isPlayerWanted()) ||
                    this.lastAttacker === player ||
                    (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.ALIEN)
                );

                if (shouldTargetPlayer) {
                    const dx = player.pos.x - this.pos.x;
                    const dy = player.pos.y - this.pos.y;
                    const distSq = dx * dx + dy * dy;
                    const rangeSq = firingRange * firingRange;

                    if (distSq <= rangeSq) {
                        candidates.push({
                            target: player,
                            distSq: distSq
                        });
                    }
                }
            }
        }

        // Return closest secondary target
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => a.distSq - b.distSq);
        return candidates[0].target;
    }

    /**
     * Perform firing at a secondary target for dual-engage ships
     * Uses a different weapon than primary if multiple weapons available
     * @param {Object} system - The current star system
     * @param {Object} secondaryTarget - The secondary target to fire at
     */
    performSecondaryFiring(system, secondaryTarget) {
        // Debug: track entry
        const debugDualFire = false; // Set to true to enable verbose debug logging

        if (!secondaryTarget || !secondaryTarget.pos || !this.pos) {
            if (debugDualFire) AI_LOG(`${this.shipTypeName} DUAL FIRE: Exit - invalid target or position`);
            return;
        }
        if (!this.weapons || this.weapons.length < 2) {
            if (debugDualFire) AI_LOG(`${this.shipTypeName} DUAL FIRE: Exit - not enough weapons (${this.weapons?.length || 0})`);
            return;
        }

        // Calculate distance and angle to secondary target
        const dx = secondaryTarget.pos.x - this.pos.x;
        const dy = secondaryTarget.pos.y - this.pos.y;
        const distanceToSecondary = Math.sqrt(dx * dx + dy * dy);
        const angleToSecondary = atan2(dy, dx);

        // Check if secondary target is in range
        const effectiveRange = this.visualFiringRange || this.firingRange || 500;
        if (distanceToSecondary > effectiveRange) {
            if (debugDualFire) AI_LOG(`${this.shipTypeName} DUAL FIRE: Exit - secondary target out of range (${distanceToSecondary.toFixed(0)} > ${effectiveRange.toFixed(0)})`);
            return;
        }

        // Check clear shot to secondary target
        if (!this._hasClearShotToTarget(system, secondaryTarget.pos, distanceToSecondary)) {
            if (debugDualFire) AI_LOG(`${this.shipTypeName} DUAL FIRE: Exit - no clear shot to secondary target`);
            return;
        }

        // Find a secondary weapon (different from current weapon)
        // Priority: Turrets > Beams > Missiles > Projectile weapons
        let secondaryWeapon = null;
        let secondaryWeaponIndex = -1;
        const primaryWeaponIndex = this.weaponIndex || 0;

        // First pass: look for turrets (best for secondary fire - can aim independently)
        for (let i = 0; i < this.weapons.length; i++) {
            if (i === primaryWeaponIndex) continue;
            const weapon = this.weapons[i];
            if (!weapon) continue;

            const baseType = getBaseWeaponType(weapon.type);

            // Skip special weapons that shouldn't be used as secondary
            if (baseType === WEAPON_TYPE.BARRIER ||
                baseType === WEAPON_TYPE.MINE ||
                baseType === WEAPON_TYPE.HARPOON) continue;

            if (baseType === WEAPON_TYPE.TURRET) {
                secondaryWeapon = weapon;
                secondaryWeaponIndex = i;
                break;
            }
        }

        // Second pass: if no turret, look for beams or missiles
        if (!secondaryWeapon) {
            for (let i = 0; i < this.weapons.length; i++) {
                if (i === primaryWeaponIndex) continue;
                const weapon = this.weapons[i];
                if (!weapon) continue;

                const baseType = getBaseWeaponType(weapon.type);

                if (baseType === WEAPON_TYPE.BARRIER ||
                    baseType === WEAPON_TYPE.MINE ||
                    baseType === WEAPON_TYPE.HARPOON) continue;

                // Skip overheated beams
                if (baseType === WEAPON_TYPE.BEAM &&
                    typeof WeaponSystem !== 'undefined' &&
                    WeaponSystem.isBeamOverheated(this, weapon)) continue;

                if (baseType === WEAPON_TYPE.BEAM || baseType === WEAPON_TYPE.MISSILE) {
                    secondaryWeapon = weapon;
                    secondaryWeaponIndex = i;
                    break;
                }
            }
        }

        // Third pass: take any available weapon
        if (!secondaryWeapon) {
            for (let i = 0; i < this.weapons.length; i++) {
                if (i === primaryWeaponIndex) continue;
                const weapon = this.weapons[i];
                if (!weapon) continue;

                const baseType = getBaseWeaponType(weapon.type);

                if (baseType === WEAPON_TYPE.BARRIER ||
                    baseType === WEAPON_TYPE.MINE ||
                    baseType === WEAPON_TYPE.HARPOON) continue;

                secondaryWeapon = weapon;
                secondaryWeaponIndex = i;
                break;
            }
        }

        if (!secondaryWeapon) {
            if (debugDualFire) AI_LOG(`${this.shipTypeName} DUAL FIRE: Exit - no suitable secondary weapon found`);
            return;
        }

        // Check secondary cooldown (separate from primary)
        if (this._secondaryFireCooldown === undefined) this._secondaryFireCooldown = 0;
        if (this._secondaryFireCooldown > 0) {
            if (debugDualFire && this._secondaryFireCooldown > 0.5) {
                AI_LOG(`${this.shipTypeName} DUAL FIRE: On cooldown (${this._secondaryFireCooldown.toFixed(2)}s remaining)`);
            }
            return;
        }

        // Fire the secondary weapon at secondary target
        // Pass secondaryWeapon as weaponOverride so WeaponSystem.fire uses correct weapon properties
        const secondaryType = secondaryWeapon.type || WEAPON_TYPE.PROJECTILE;

        if (debugDualFire) AI_LOG(`${this.shipTypeName} DUAL FIRE: Attempting fire with ${secondaryWeapon.name} at ${secondaryTarget.shipTypeName || 'target'}`);

        const fired = WeaponSystem.fire(this, system, angleToSecondary, secondaryType, secondaryTarget, secondaryWeapon);

        if (fired) {
            this._secondaryFireCooldown = this.computeCooldown(secondaryWeapon.fireRate || 0.5);
            AI_LOG(`${this.shipTypeName} DUAL FIRE SUCCESS: ${secondaryWeapon.name} at ${secondaryTarget.shipTypeName || 'target'}, cooldown set to ${this._secondaryFireCooldown.toFixed(2)}s`);
        } else {
            if (debugDualFire) AI_LOG(`${this.shipTypeName} DUAL FIRE: WeaponSystem.fire returned false for ${secondaryWeapon.name}`);
        }
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

    if (typeof DEBUG_AI !== 'undefined' && DEBUG_AI) {
        AI_LOG(`Applied ${methodNames.length} combat methods to Enemy prototype:`, methodNames.join(', '));
    }
}
