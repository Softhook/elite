// ****** enemyAbilities.js ******
// Enemy Ability Methods - Cloak and Booster AI
// Strategic usage of cloaking devices and boosters

/**
 * Enemy ability methods as a mixin class
 * These methods handle cloak and booster AI decisions
 */
class EnemyAbilities {
    /** Returns true when a probabilistic ability action should trigger for this rank. */
    _rollAbilityChance(baseChance) {
        const rankMods = this._getRankModifiers ? this._getRankModifiers() : null;
        const triggerMult = rankMods?.abilityTriggerChanceMultiplier ?? 1.0;
        const adjustedChance = Math.max(0, Math.min(1, baseChance * triggerMult));
        return random() < adjustedChance;
    }

    // --- CLOAK METHODS ---

    /** Check if cloak is available to use */
    hasCloakReady() {
        return this.cloakMaxDuration > 0 &&
            !this.isCloaked &&
            this.cloakCooldownTimer <= 0;
    }

    /** Activate cloaking device */
    activateCloak() {
        if (!this.hasCloakReady()) return false;

        this.isCloaked = true;
        this.cloakDurationTimer = this.cloakMaxDuration;

        // Play sound positioned in world
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player?.pos) {
            soundManager.playWorldSound('shieldUp', this.pos.x, this.pos.y, player.pos, this);
        }

        AI_LOG(`${this.shipTypeName} activating cloak`);
        return true;
    }

    /** Deactivate cloaking device */
    deactivateCloak() {
        if (!this.isCloaked) return;

        this.isCloaked = false;
        this.cloakCooldownTimer = this.cloakMaxCooldown;
        this.cloakDurationTimer = 0;

        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player?.pos) {
            soundManager.playWorldSound('shieldDown', this.pos.x, this.pos.y, player.pos, this);
        }

        AI_LOG(`${this.shipTypeName} cloak deactivated`);
    }

    /** AI decision: should we cloak? Multiple tactical reasons */
    shouldCloakForSurpriseAttack(distanceToTarget) {
        if (!this.hasCloakReady()) return false;

        // NOTE: Throttling is now done in updateCombatAbilities() at entry point
        const now = typeof millis === 'function' ? millis() : Date.now();

        // EMERGENCY CLOAK: Cloak when recently damaged (defensive escape)
        // Check if we were attacked in the last 2 seconds
        const recentlyDamaged = this.lastAttackTime && (now - this.lastAttackTime < 2000);
        if (recentlyDamaged && this.hull < this.maxHull * 0.7) {
            // High chance to emergency cloak when hurt
            return this._rollAbilityChance(0.7);
        }

        // FLEE CLOAK: Higher chance when fleeing
        if (this.currentState === AI_STATE.FLEEING) {
            return this._rollAbilityChance(0.6);
        }

        // WEAPON COOLDOWN CLOAK: Cloak while waiting for weapon to recharge
        // This prevents "sitting duck" behavior after firing a big weapon
        if (this.shouldCloakWhileWeaponCooldown()) {
            return true;
        }

        // SURPRISE ATTACK CLOAK: Only at medium range, not during attack pass
        if (this.currentState !== AI_STATE.ATTACK_PASS && this.target && this.isTargetValid(this.target)) {
            const idealCloakRange = this.detectionRange * 0.8;
            const tooFar = distanceToTarget > idealCloakRange;
            if (!tooFar) {
                return this._rollAbilityChance(0.4);
            }
        }

        return false;
    }

    /**
     * Check if weapon is on a significant cooldown (e.g., after firing a missile)
     * @return {boolean} Whether weapon has a notable remaining cooldown
     */
    hasSignificantWeaponCooldown() {
        // Weapon must be on cooldown
        if (!this.fireCooldown || this.fireCooldown <= 0) return false;

        // Only consider it "significant" if more than 1 second remaining
        // This distinguishes big weapons (missiles, beams) from rapid-fire lasers
        return this.fireCooldown > 1.0;
    }

    /**
     * AI decision: should we cloak while waiting for weapon to recharge?
     * Cloaking during weapon cooldown makes the enemy harder to hit while they can't shoot back
     * @return {boolean} Whether to cloak for weapon cooldown evasion
     */
    shouldCloakWhileWeaponCooldown() {
        if (!this.hasCloakReady()) return false;
        if (!this.hasSignificantWeaponCooldown()) return false;

        // Must have a valid target (otherwise no need for evasion)
        if (!this.target || !this.isTargetValid(this.target)) return false;

        // Only evade in stationary combat states where we'd otherwise be a sitting duck
        const stationaryStates = [AI_STATE.SNIPING, AI_STATE.APPROACHING];
        if (!stationaryStates.includes(this.currentState)) return false;

        // More likely to cloak if cooldown is long (over 2 seconds)
        const longCooldown = this.fireCooldown > 2.0;
        const cloakChance = longCooldown ? 0.6 : 0.35;

        return this._rollAbilityChance(cloakChance);
    }

    /** AI decision: should we decloak to attack? */
    shouldDecloakToAttack(distanceToTarget) {
        if (!this.isCloaked) return false;
        if (!this.target || !this.isTargetValid(this.target)) return true; // Decloak if no valid target

        // Decloak when close enough to attack
        return distanceToTarget < this.engageDistance * 0.9;
    }

    // --- BOOSTER METHODS ---

    /** Check if booster is available */
    hasBoosterReady() {
        return this.boostMaxDuration > 0 &&
            !this.isSpeedBursting &&
            this.boostCooldownTimer <= 0;
    }

    /** Activate speed boost */
    activateBoost() {
        if (!this.hasBoosterReady()) return false;

        this.isSpeedBursting = true;
        this.boostDurationTimer = this.boostMaxDuration;

        // Apply immediate velocity boost in facing direction
        // Guard against missing baseMaxSpeed
        const baseSpeed = this.baseMaxSpeed || this.maxSpeed || 5;
        const maxBurstSpeed = baseSpeed * this.boostMultiplier;
        this.vel.set(cos(this.angle) * maxBurstSpeed, sin(this.angle) * maxBurstSpeed);

        // Note: No boost sound exists in soundManager (player doesn't use one either)
        // if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player?.pos) {
        //     soundManager.playWorldSound('boost', this.pos.x, this.pos.y, player.pos, this);
        // }

        AI_LOG(`${this.shipTypeName} activating booster`);
        return true;
    }

    /** Deactivate speed boost (called when duration expires) */
    deactivateBoost() {
        if (!this.isSpeedBursting) return;

        this.isSpeedBursting = false;
        this.boostCooldownTimer = this.boostMaxCooldown;
        this.boostDurationTimer = 0;

        // Optional: play sound when boost ends
        // if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player?.pos) {
        //     soundManager.playWorldSound('boostEnd', this.pos.x, this.pos.y, player.pos, this);
        // }

        AI_LOG(`${this.shipTypeName} boost deactivated`);
    }

    /** AI decision: should we boost for fleeing? */
    shouldBoostForFlee() {
        if (!this.hasBoosterReady()) return false;
        if (this.currentState !== AI_STATE.FLEEING) return false;

        // NOTE: Throttling is now done in updateCombatAbilities() at entry point

        // Use lastAttacker if target is lost (common during flee)
        const threat = this.target && this.isTargetValid(this.target)
            ? this.target
            : this.lastAttacker;

        if (!threat || !threat.pos) return false;

        // Use squared distance to avoid sqrt calculation
        const dx = this.pos.x - threat.pos.x;
        const dy = this.pos.y - threat.pos.y;
        const distSq = dx * dx + dy * dy;
        const thresholdSq = (this.detectionRange * 0.7) ** 2;
        return distSq < thresholdSq;
    }

    /** AI decision: should we boost for repositioning? 
     *  Note: Boosting during attack runs is NOT advisable because the high speed
     *  makes it difficult to aim and track targets. Instead, we use boost for
     *  tactical repositioning to get to cover or optimal firing positions faster.
     */
    shouldBoostForReposition() {
        if (!this.hasBoosterReady()) return false;
        if (!this.target || !this.isTargetValid(this.target)) return false;

        // Only boost when repositioning
        if (this.currentState !== AI_STATE.REPOSITIONING) return false;

        // Check if we have a reposition target and are far from it
        if (!this.repositionTarget) return false;

        const distToRepoTarget = dist(this.pos.x, this.pos.y,
            this.repositionTarget.x, this.repositionTarget.y);

        // Only boost if we have a decent distance to cover (worthwhile to boost)
        const worthwhileDistance = this.size * 8; // About 8x ship sizes
        if (distToRepoTarget < worthwhileDistance) return false;

        // Random chance (more likely if we have grudge - want to get back in the fight)
        const grudgeLevel = this._getGrudgeLevel ? this._getGrudgeLevel(this.target) : 0;
        const boostChance = 0.35 + (grudgeLevel * 0.1); // 35% base, +10% per grudge level
        return this._rollAbilityChance(boostChance);
    }

    /**
     * AI decision: should we boost to evade while weapon is on cooldown?
     * When weapon is recharging, boosting away prevents being a static target.
     * Unlike repositioning boost, this is purely for evasion.
     * @return {boolean} Whether to boost for weapon cooldown evasion
     */
    shouldBoostWhileWeaponCooldown() {
        if (!this.hasBoosterReady()) return false;
        if (!this.hasSignificantWeaponCooldown()) return false;

        // Must have a valid target (otherwise no point evading)
        if (!this.target || !this.isTargetValid(this.target)) return false;

        // Only evade in stationary states where we'd be a sitting duck
        // Don't boost from SNIPING - that breaks the sniping position advantage
        // But DO boost from APPROACHING if we can't fire yet
        if (this.currentState !== AI_STATE.SNIPING &&
            this.currentState !== AI_STATE.APPROACHING) return false;

        // Check if target is close enough to be a threat
        const distToTarget = this.distanceTo(this.target);
        const threatRange = this.firingRange * 1.2; // Within our firing range = threatening
        if (distToTarget > threatRange) return false;

        // More likely to boost-evade if cooldown is very long (over 2.5 seconds)
        const longCooldown = this.fireCooldown > 2.5;
        const boostChance = longCooldown ? 0.5 : 0.25;

        return this._rollAbilityChance(boostChance);
    }

    /**
     * Check if this enemy has any special abilities (cloak or booster).
     * Used for early bailout to save CPU on ships without abilities.
     * @return {boolean} Whether the enemy has any special ability
     */
    hasAnyAbility() {
        return (this.cloakMaxDuration > 0) || (this.boostMaxDuration > 0);
    }

    /** Main update for strategic ability usage - call from combat AI */
    updateCombatAbilities(distanceToTarget) {
        // PERFORMANCE: Early bailout for enemies without any abilities.
        // Most enemies don't have cloak or booster, so skip entirely for them.
        if (!this.hasAnyAbility()) return;

        // PERFORMANCE: Throttle ability decisions to once per second
        // This prevents expensive random rolls and calculations every frame
        const now = typeof millis === 'function' ? millis() : Date.now();
        const rankMods = this._getRankModifiers ? this._getRankModifiers() : null;
        const abilityDecisionMult = rankMods?.abilityDecisionIntervalMultiplier ?? 1.0;
        const abilityDecisionIntervalMs = Math.max(250, 1000 * abilityDecisionMult);

        if (this._lastAbilityUpdateTime && now - this._lastAbilityUpdateTime < abilityDecisionIntervalMs) {
            // Still need to check decloak conditions more frequently for responsiveness
            if (this.isCloaked && this.shouldDecloakToAttack(distanceToTarget)) {
                this.deactivateCloak();
            }
            return;
        }
        this._lastAbilityUpdateTime = now;

        // Cloak AI
        if (this.isCloaked) {
            // Check if should decloak
            if (this.shouldDecloakToAttack(distanceToTarget)) {
                this.deactivateCloak();
            }
        } else if (this.hasCloakReady()) {
            // Check if should cloak for surprise attack
            if (this.shouldCloakForSurpriseAttack(distanceToTarget)) {
                this.activateCloak();
            }
        }

        // Booster AI - only when NOT cloaked (cloaked ships sneak, don't boost)
        if (!this.isCloaked && this.hasBoosterReady()) {
            // EMERGENCY BOOST: When recently damaged and low on health, try to escape
            // Reuse the 'now' variable from above instead of calling millis() again
            const recentlyDamaged = this.lastAttackTime && (now - this.lastAttackTime < 2000);
            if (recentlyDamaged && this.hull < this.maxHull * 0.5) {
                // Emergency boost to escape - high chance
                if (this._rollAbilityChance(0.6)) {
                    this.activateBoost();
                    return; // Exit early after emergency boost
                }
            }

            // Normal boost decisions
            if (this.shouldBoostForFlee()) {
                this.activateBoost();
            } else if (this.shouldBoostForReposition()) {
                // Boost for rapid repositioning to get to optimal firing position
                this.activateBoost();
            } else if (this.shouldBoostWhileWeaponCooldown()) {
                // Boost to evade while weapon is recharging - don't be a sitting duck
                AI_LOG(`${this.shipTypeName} boosting to evade while weapon on cooldown (${(this.fireCooldown || 0).toFixed(1)}s remaining)`);
                this.activateBoost();
            }
        }
    }
}

// Apply ability methods to Enemy prototype
function applyEnemyAbilityMethods() {
    if (typeof Enemy === 'undefined') {
        console.error('Enemy class not found - cannot apply ability methods');
        return;
    }

    Object.getOwnPropertyNames(EnemyAbilities.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyAbilities.prototype[methodName];
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyAbilities, applyEnemyAbilityMethods };
    global.EnemyAbilities = EnemyAbilities;
    global.applyEnemyAbilityMethods = applyEnemyAbilityMethods;
}

