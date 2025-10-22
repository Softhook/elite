// ****** enemyDamageSystem.js ******
// Enemy Damage System Methods - Stage 9
// Contains damage processing, destruction handling, and related methods

/**
 * EnemyDamageSystem class contains damage-related methods for enemies.
 * These methods are mixed into the Enemy prototype via applyEnemyDamageSystemMethods().
 */
class EnemyDamageSystem {

    /**
     * Applies damage to the ship and handles destruction
     * @param {number} amount - Amount of damage to apply
     * @param {Object} attacker - Entity that caused the damage
     * @return {Object} Object containing damage dealt and shield hit status
     */
    takeDamage(amount, attacker = null, system = null) {
        // Allow callers to provide the current system explicitly (defensive against timing issues
        // where this.currentSystem may not yet be populated). Pass the resolved system to the
        // attacker handling helper so targeting updates will work immediately.
        const resolvedSystem = system || this.getSystem();
        this._handleAttackerReference(attacker, amount, resolvedSystem);

        // Skip damage processing if already destroyed or no damage
        if (this.destroyed || amount <= 0) return { damage: 0, shieldHit: false };

        const { damageDealt, shieldHit } = this._applyDamageDistribution(amount);

        // Check if destroyed after applying damage
        if (this.hull <= 0 && !this.destroyed) {
            this._processDestruction(attacker);
        } else {
            // Only check for random cargo drop if not destroyed
            this._checkRandomCargoDrop();
        }

        return { damage: damageDealt, shieldHit: shieldHit };
    }

    /**
     * Internal helper: Handles attacker reference and triggers targeting update.
     * @param {Object} attacker
     * @param {number} amount - Damage amount for logging purposes
     */
    _handleAttackerReference(attacker, amount, system = null) {
        if (attacker) {
            // Record attacker regardless of type
            this.lastAttacker = attacker;
            this.lastAttackTime = millis();
            
            // Debug log for tracking
            console.log(`%c🔫 ${this.shipTypeName} (${this.role}, ${AI_STATE_NAME[this.currentState]}) HIT by ${attacker.constructor.name} for ${amount.toFixed(1)} dmg`, 'color:orange; font-weight:bold');
            
            // Don't retarget if in SNIPING state (target lock)
            if (this.currentState === AI_STATE.SNIPING) {
                console.log(`%c   → SNIPING: Target locked, not retargeting`, 'color:purple');
                return;
            }
            
            // Always update targeting for any attacker
            const resolvedSystem = system || this.getSystem();
            if (resolvedSystem) {
                // Special debug for player attacks
                if (attacker instanceof Player) {
                    console.log(`%c🎯 PLAYER ATTACK: Force targeting update for ${this.shipTypeName}`, 'color:red; font-weight:bold');
                }
                
                // Update targeting immediately for all attackers
                const targetResult = this.updateTargeting(resolvedSystem);
                console.log(`%c   → Targeting result: ${targetResult}, target is now: ${this.target ? (this.target.constructor.name) : 'null'}`, 'color:cyan');
            } else {
                console.warn(`%c   ⚠️ NO SYSTEM available for ${this.shipTypeName} targeting update!`, 'color:red; font-weight:bold');
            }
        }
    }

    /**
     * Internal helper: Applies damage to shields first, then hull.
     * Updates this.shield and this.hull directly.
     * @param {number} amount - The incoming damage amount.
     * @return {Object} { damageDealt, shieldHit }
     */
    _applyDamageDistribution(amount) {
        let damageDealt = 0;
        let shieldHit = false;

        // Apply barrier damage reduction if active
        if (this.isBarrierActive && this.barrierDamageReduction > 0) {
            const originalAmount = amount;
            amount *= (1 - this.barrierDamageReduction);
            console.log(`${this.shipTypeName} barrier reduced damage from ${originalAmount.toFixed(1)} to ${amount.toFixed(1)}`);
        }

        // Skip shield check entirely if shields are disabled
        if (this.shield > 0 && !this.shieldsDisabled) {
            shieldHit = true;
            this.shieldHitTime = millis();
            this.lastShieldHitTime = millis();

            if (amount <= this.shield) {
                // Shield absorbs all damage
                this.shield -= amount;
                damageDealt = amount;
            } else {
                // Shield is depleted, remaining damage goes to hull
                damageDealt = this.shield; // Damage absorbed by shield
                const hullDamage = amount - this.shield;
                this.shield = 0;
                this.hull -= hullDamage;
                damageDealt += hullDamage; // Total damage dealt (shield + hull)
            }
        } else {
            // No shields, all damage to hull
            this.hull -= amount;
            damageDealt = amount;
        }
        // Ensure hull doesn't go below zero visually before destruction check
        this.hull = Math.max(0, this.hull);
        return { damageDealt, shieldHit };
    }

    /**
     * Internal helper: Processes the ship's destruction.
     * Sets flags, creates effects, drops cargo, handles wanted status.
     * @param {Object} attacker
     */
    _processDestruction(attacker) {
        this.destroyed = true;
        this.hull = 0; // Ensure hull is exactly 0
        this.target = null; // Prevent corpse targeting

        // Add these lines to clear all combat flags
        this.inCombat = false;
        this.haulerCombatTimer = undefined;
        this.forcedCombatTimer = 0;

        const system = this.getSystem();
        if (system) {
            // Create explosion effect
            this.currentSystem.addExplosion(
                this.pos.x,
                this.pos.y,
                this.size,
                [100, 150, 255] // Blueish-white core
            );

            // Drop cargo
            this.dropCargo();

            // Handle player-related consequences (mission progress, wanted status)
            if (attacker instanceof Player && system.player === attacker) {
                this._handlePlayerKillConsequences(attacker, system);
            }
        }
    }

    /**
     * Internal helper: Handles mission progress and wanted status if player killed the ship.
     * @param {Player} attacker
     * @param {StarSystem} system
     */
    _handlePlayerKillConsequences(attacker, system) {


        console.log(`BEFORE: Player kills = ${system.player.kills}`);
        system.player.addKill();
        console.log(`AFTER: Player kills = ${system.player.kills}, Rating: ${system.player.getEliteRating()}`);
        

        // Update mission progress
        if (attacker.activeMission) {
            if (attacker.activeMission.type === MISSION_TYPE.BOUNTY_PIRATE &&
                this.role === AI_ROLE.PIRATE) {
                attacker.activeMission.progressCount = (attacker.activeMission.progressCount || 0) + 1;
                console.log(`Updated bounty mission progress: ${attacker.activeMission.progressCount}/${attacker.activeMission.targetCount}`);
                if (attacker.activeMission.progressCount >= attacker.activeMission.targetCount) {
                    console.log("Bounty mission target count met! Completing mission...");
                    system.player.completeMission(); // <<< Use simpler call for auto-complete
               }
            }
        }

        // Set player wanted status if a non-pirate was destroyed
        if (this.role !== AI_ROLE.PIRATE && this.role !== AI_ROLE.ALIEN && this.role !== AI_ROLE.BOUNTY_HUNTER) {
            if (system.setPlayerWanted) {

                // If player is police, revoke status first
                if (attacker === system.player && system.player.isPolice) {
                    system.player.removePoliceStatus();
                }

                const wantedLevel = (this.role === AI_ROLE.POLICE) ? 3 : 1;
                system.setPlayerWanted(true, wantedLevel);
                console.log(`Player marked as WANTED (Level ${wantedLevel}) for destroying ${this.shipTypeName}`);
                uiManager.addMessage(`WANTED: For destroying ${this.role} ship!`, '#ff0000');
            } else {
                // Fallback if setPlayerWanted doesn't exist
                attacker.isWanted = true;
                console.log(`Player marked as WANTED (fallback) for destroying ${this.shipTypeName}`);
            }
        }
    }

    /**
     * Internal helper: Checks and potentially jettisons cargo on non-fatal hits.
     */
    _checkRandomCargoDrop() {
        // Random cargo drop chance when hit but not destroyed
        if (this.hull < this.maxHull * 0.5 && Math.random() < 0.05) {
            this.jettisonCargo();
        }
    }
}

/**
 * Apply EnemyDamageSystem methods to Enemy prototype
 */
function applyEnemyDamageSystemMethods() {
    // Get all method names from EnemyDamageSystem prototype
    Object.getOwnPropertyNames(EnemyDamageSystem.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyDamageSystem.prototype[methodName];
        }
    });
}
