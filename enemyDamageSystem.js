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
            if (typeof communicationSystem !== 'undefined' && communicationSystem) {
                let playerSource = null;
                if (typeof Player !== 'undefined' && attacker instanceof Player) {
                    playerSource = attacker;
                } else if (attacker?.owner && typeof Player !== 'undefined' && attacker.owner instanceof Player) {
                    playerSource = attacker.owner;
                } else if (attacker?.source && typeof Player !== 'undefined' && attacker.source instanceof Player) {
                    playerSource = attacker.source;
                }
                if (playerSource) {
                    communicationSystem.handlePlayerDamageReaction(this, playerSource, amount);
                }
            }
            // Record attacker regardless of type
            this.lastAttacker = attacker;
            this.lastAttackTime = millis();
            
            // Debug log for tracking
            DAMAGE_LOG(`🔫 ${this.shipTypeName} (${this.role}, ${AI_STATE_NAME[this.currentState]}) HIT by ${attacker.constructor.name} for ${amount.toFixed(1)} dmg`);
            
            // Don't retarget if in SNIPING state (target lock)
            if (this.currentState === AI_STATE.SNIPING) {
                TARGETING_LOGF(() => {
                    const nameOf = (e) => e ? (e.shipTypeName || e.constructor?.name || 'Unknown') : 'none';
                    const attackerName = attacker ? (attacker.shipTypeName || attacker.constructor?.name || 'Unknown') : 'Unknown';
                    let distToAttacker = null;
                    try {
                        if (this.pos && attacker?.pos) {
                            distToAttacker = dist(this.pos.x, this.pos.y, attacker.pos.x, attacker.pos.y);
                        }
                    } catch (e) { /* p5 dist might be unavailable briefly; ignore */ }
                    return `   → SNIPING: ${this.shipTypeName} [${AI_STATE_NAME[this.currentState]}, ${this.role}] holding lock on ${nameOf(this.target)}; ignoring attacker ${attackerName}` +
                           (typeof distToAttacker === 'number' ? ` @${distToAttacker.toFixed(0)}u` : '');
                });
                return;
            }
            
            // Always update targeting for any attacker
            const resolvedSystem = system || this.getSystem();
            if (resolvedSystem) {
                // Special debug for player attacks
                if (attacker instanceof Player) {
                    DAMAGE_LOG(`🎯 PLAYER ATTACK: Force targeting update for ${this.shipTypeName}`);
                }
                
                // Update targeting immediately for all attackers
                const prevTarget = this.target;
                const targetResult = this.updateTargeting(resolvedSystem);
                const newTarget = this.target;
                const changed = prevTarget !== newTarget;
                TARGETING_LOGF(() => {
                    const nameOf = (e) => e ? (e.shipTypeName || e.constructor?.name || 'Unknown') : 'null';
                    const attackerName = attacker ? (attacker.shipTypeName || attacker.constructor?.name || 'Unknown') : 'Unknown';
                    let distToAttacker = null;
                    try {
                        if (this.pos && attacker?.pos) {
                            distToAttacker = dist(this.pos.x, this.pos.y, attacker.pos.x, attacker.pos.y);
                        }
                    } catch (e) { /* ignore */ }
                    const validNow = this.isTargetValid?.(newTarget);
                    return `   → Targeting: ${this.shipTypeName} [${AI_STATE_NAME[this.currentState]}, ${this.role}] ${changed ? 'switched' : 'kept'} target: ${nameOf(prevTarget)} -> ${nameOf(newTarget)} (valid=${validNow ? 'yes' : 'no'}, result=${!!targetResult}) after hit by ${attackerName}` +
                           (typeof distToAttacker === 'number' ? ` @${distToAttacker.toFixed(0)}u` : '');
                });

                // Immediate combat reaction for aggressive roles when idle
                // Do not override if fleeing or sniping (already engaged)
                const aggressiveRole = (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.ALIEN || this.role === AI_ROLE.BOUNTY_HUNTER);
                const passiveState = (this.currentState === AI_STATE.IDLE || this.currentState === AI_STATE.PATROLLING || this.currentState === AI_STATE.NEAR_STATION || this.currentState === AI_STATE.COLLECTING_CARGO);
                if (aggressiveRole && passiveState && this.isTargetValid(this.target) && this.isArmed() && this.currentState !== AI_STATE.FLEEING && this.currentState !== AI_STATE.SNIPING) {
                    this.changeState(AI_STATE.APPROACHING);
                }
            } else {
                if (DEBUG_DAMAGE || DEBUG_TARGETING) console.warn(`⚠️ NO SYSTEM available for ${this.shipTypeName} targeting update!`);
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
            DAMAGE_LOG(`${this.shipTypeName} barrier reduced damage from ${originalAmount.toFixed(1)} to ${amount.toFixed(1)}`);
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
                // Shield down audio cue (world-positioned)
                try {
                    if (!this._shieldWasZero) {
                        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player?.pos) {
                            soundManager.playWorldSound('shieldDown', this.pos.x, this.pos.y, player.pos);
                        }
                    }
                    this._shieldWasZero = true;
                } catch (e) { /* ignore */ }
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

        try {
            if (typeof communicationSystem !== 'undefined' && communicationSystem && typeof communicationSystem.handleEnemyDestroyed === 'function') {
                communicationSystem.handleEnemyDestroyed(this);
            }
        } catch (_) { /* ignore comm errors on destruction */ }

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


        AI_LOG(`BEFORE: Player kills = ${system.player.kills}`);
        system.player.addKill(this);
        AI_LOG(`AFTER: Player kills = ${system.player.kills}, Rating: ${system.player.getEliteRating()}`);
        

        // Update mission progress
        if (attacker.activeMission) {
            // Pirate bounty missions
            if (attacker.activeMission.type === MISSION_TYPE.BOUNTY_PIRATE &&
                this.role === AI_ROLE.PIRATE) {
                attacker.activeMission.progressCount = (attacker.activeMission.progressCount || 0) + 1;
                AI_LOG(`Updated pirate bounty mission progress: ${attacker.activeMission.progressCount}/${attacker.activeMission.targetCount}`);
                if (attacker.activeMission.progressCount >= attacker.activeMission.targetCount) {
                    AI_LOG("Pirate bounty mission target count met! Completing mission...");
                    system.player.completeMission(); // <<< Use simpler call for auto-complete
               }
            }
            // Police bounty missions
            else if (attacker.activeMission.type === MISSION_TYPE.BOUNTY_POLICE &&
                this.role === AI_ROLE.POLICE) {
                attacker.activeMission.progressCount = (attacker.activeMission.progressCount || 0) + 1;
                AI_LOG(`Updated police bounty mission progress: ${attacker.activeMission.progressCount}/${attacker.activeMission.targetCount}`);
                if (attacker.activeMission.progressCount >= attacker.activeMission.targetCount) {
                    AI_LOG("Police bounty mission target count met! Completing mission...");
                    system.player.completeMission(); // <<< Use simpler call for auto-complete
               }
            }
            // Alien bounty missions
            else if (attacker.activeMission.type === MISSION_TYPE.BOUNTY_ALIEN &&
                this.role === AI_ROLE.ALIEN) {
                attacker.activeMission.progressCount = (attacker.activeMission.progressCount || 0) + 1;
                AI_LOG(`Updated alien bounty mission progress: ${attacker.activeMission.progressCount}/${attacker.activeMission.targetCount}`);
                if (attacker.activeMission.progressCount >= attacker.activeMission.targetCount) {
                    AI_LOG("Alien bounty mission target count met! Completing mission...");
                    system.player.completeMission(); // <<< Use simpler call for auto-complete
               }
            }
        }

        // Award faction bounties
        this._awardFactionBounty(attacker);

        const isAnarchySystem = typeof system?.securityLevel === 'string' && system.securityLevel.toLowerCase() === 'anarchy';

        // Set player wanted status if a non-pirate/non-combat was destroyed
        // NOTE: Combat ships are considered legitimate engagement targets and
        // should not make the player wanted when destroyed.
        if (this.role !== AI_ROLE.PIRATE && this.role !== AI_ROLE.ALIEN && this.role !== AI_ROLE.BOUNTY_HUNTER && this.role !== AI_ROLE.COMBAT) {
            if (isAnarchySystem) {
                AI_LOG(`Wanted status skipped in ${system.name} (Anarchy system).`);
                return;
            }

            if (system.setPlayerWanted) {

                // If player is police, revoke status first
                if (attacker === system.player && system.player.isPolice) {
                    system.player.removePoliceStatus();
                }

                const wantedLevel = (this.role === AI_ROLE.POLICE) ? 3 : 1;
                system.setPlayerWanted(true, wantedLevel);
                AI_LOG(`Player marked as WANTED (Level ${wantedLevel}) for destroying ${this.shipTypeName}`);
                uiManager.addMessage(`WANTED: For destroying ${this.role} ship!`, '#ff0000');
            } else {
                // Fallback if setPlayerWanted doesn't exist
                attacker.isWanted = true;
                AI_LOG(`Player marked as WANTED (fallback) for destroying ${this.shipTypeName}`);
            }
        }
    }

    /**
     * Internal helper: Awards faction bounties based on player faction and killed enemy type.
     * @param {Player} attacker - The player who killed this enemy
     */
    _awardFactionBounty(attacker) {
        if (!attacker) return;

        let bountyAmount = 0;
        let bountyMessage = null;

        // Police bounties - 1,000 credits for killing aliens
        if (attacker.isPolice && this.role === AI_ROLE.ALIEN) {
            bountyAmount = 1000;
            bountyMessage = "Police bounty: 1,000 cr";
        }
        // Separatist bounties - 2,000 credits for killing Imperial ships
        else if (attacker.playerFaction === 'SEPARATIST' && this._isImperialShip()) {
            bountyAmount = 2000;
            bountyMessage = "Separatist bounty: 2,000 cr";
        }
        // Imperial bounties - 2,000 credits for killing Separatist ships
        else if (attacker.playerFaction === 'IMPERIAL' && this._isSeparatistShip()) {
            bountyAmount = 2000;
            bountyMessage = "Imperial bounty: 2,000 cr";
        }
        // Military bounties - 4,000 credits for killing Alien ships
        else if (attacker.playerFaction === 'MILITARY' && this.role === AI_ROLE.ALIEN) {
            bountyAmount = 4000;
            bountyMessage = "Military bounty: 4,000 cr";
        }
        // Military bounties - 1,000 credits for killing pirates
        else if (attacker.playerFaction === 'MILITARY' && this.role === AI_ROLE.PIRATE) {
            bountyAmount = 1000;
            bountyMessage = "Military bounty: 1,000 cr";
        }

        // Award the bounty
        if (bountyAmount > 0 && bountyMessage) {
            attacker.addCredits(bountyAmount);
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage(bountyMessage, [100, 255, 100]);
            }
            AI_LOG(`Faction bounty awarded: ${bountyAmount} credits (${bountyMessage})`);
        }
    }

    /**
     * Helper: Checks if this enemy is an Imperial ship
     * @returns {boolean}
     */
    _isImperialShip() {
        // Check if this ship type is in the IMPERIAL_SHIPS array
        return typeof IMPERIAL_SHIPS !== 'undefined' && 
               Array.isArray(IMPERIAL_SHIPS) && 
               IMPERIAL_SHIPS.includes(this.shipTypeName);
    }

    /**
     * Helper: Checks if this enemy is a Separatist ship
     * @returns {boolean}
     */
    _isSeparatistShip() {
        // Check if this ship type is in the SEPARATIST_SHIPS array
        return typeof SEPARATIST_SHIPS !== 'undefined' && 
               Array.isArray(SEPARATIST_SHIPS) && 
               SEPARATIST_SHIPS.includes(this.shipTypeName);
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
