// ****** enemyAbilities.js ******
// Enemy Ability Methods - Cloak and Booster AI
// Strategic usage of cloaking devices and boosters

/**
 * Enemy ability methods as a mixin class
 * These methods handle cloak and booster AI decisions
 */
class EnemyAbilities {
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

        // Throttle: only evaluate cloak decision once per second
        const now = typeof millis === 'function' ? millis() : Date.now();
        if (this._lastCloakDecisionTime && now - this._lastCloakDecisionTime < 1000) {
            return false; // Already decided recently, don't re-roll
        }
        this._lastCloakDecisionTime = now;

        // EMERGENCY CLOAK: Cloak when recently damaged (defensive escape)
        // Check if we were attacked in the last 2 seconds
        const recentlyDamaged = this.lastAttackTime && (now - this.lastAttackTime < 2000);
        if (recentlyDamaged && this.hull < this.maxHull * 0.7) {
            // High chance to emergency cloak when hurt
            return random() < 0.7;
        }

        // FLEE CLOAK: Higher chance when fleeing
        if (this.currentState === AI_STATE.FLEEING) {
            return random() < 0.6;
        }

        // SURPRISE ATTACK CLOAK: Only at medium range, not during attack pass
        if (this.currentState !== AI_STATE.ATTACK_PASS && this.target && this.isTargetValid(this.target)) {
            const idealCloakRange = this.detectionRange * 0.8;
            const tooFar = distanceToTarget > idealCloakRange;
            if (!tooFar) {
                return random() < 0.4;
            }
        }

        return false;
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

        // Throttle: only evaluate boost decision once per second
        const now = typeof millis === 'function' ? millis() : Date.now();
        if (this._lastBoostDecisionTime && now - this._lastBoostDecisionTime < 1000) {
            return false;
        }
        this._lastBoostDecisionTime = now;

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

    /** AI decision: should we boost for surprise attack run? */
    shouldBoostForAttack(distanceToTarget) {
        if (!this.hasBoosterReady()) return false;
        if (!this.target || !this.isTargetValid(this.target)) return false;

        // Boost during approach when at good distance
        const idealBoostRange = this.detectionRange * 0.6;
        const goodDistance = distanceToTarget > this.engageDistance * 1.2 &&
            distanceToTarget < idealBoostRange;

        if (!goodDistance) return false;

        // Only boost in approaching state
        if (this.currentState !== AI_STATE.APPROACHING) return false;

        // Random chance (more likely if we have grudge)
        const grudgeLevel = this._getGrudgeLevel ? this._getGrudgeLevel(this.target) : 0;
        const boostChance = 0.2 + (grudgeLevel * 0.1); // 20% base, +10% per grudge level
        return random() < boostChance;
    }

    /** Main update for strategic ability usage - call from combat AI */
    updateCombatAbilities(distanceToTarget) {
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
            const now = typeof millis === 'function' ? millis() : Date.now();
            const recentlyDamaged = this.lastAttackTime && (now - this.lastAttackTime < 2000);
            if (recentlyDamaged && this.hull < this.maxHull * 0.5) {
                // Emergency boost to escape - high chance
                if (random() < 0.6) {
                    this.activateBoost();
                    return; // Exit early after emergency boost
                }
            }

            // Normal boost decisions
            if (this.shouldBoostForFlee()) {
                this.activateBoost();
            } else if (this.shouldBoostForAttack(distanceToTarget)) {
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

