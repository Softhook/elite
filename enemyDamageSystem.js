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
        if (!attacker) return;

        // Skip everything for non-combat objects like asteroids and cargo
        const isNonCombatObject = attacker?.constructor?.name === 'Asteroid' ||
            attacker?.constructor?.name === 'Cargo';
        if (isNonCombatObject) return;

        // Trigger communication reaction for player attacks
        this._triggerPlayerDamageReaction(attacker, amount);

        // Skip recording for friendly fire and same-faction
        if (this._shouldIgnoreAttacker(attacker)) return;

        const now = millis();
        const retaliationDelayMs = this._getCognitiveRetaliationDelayMs();

        // Lower-rank pilots should not instantly process incoming threats.
        // Buffer retaliation context and apply it after a cognitive delay.
        if (retaliationDelayMs > 0) {
            this._scheduleDelayedRetaliation(attacker, system, now, retaliationDelayMs);
            DAMAGE_LOG(`🧠 ${this.shipTypeName} delaying retaliation by ${retaliationDelayMs.toFixed(0)}ms (rank cognitive delay)`);
            return;
        }

        // Track attacker in grudge system (elite / zero-delay fallback)
        this._updateAttackerHistory(attacker, now);

        // Smart lastAttacker update to prevent oscillation
        this._updateLastAttacker(attacker, now);

        // Debug log for tracking
        DAMAGE_LOG(`🔫 ${this.shipTypeName} (${this.role}, ${AI_STATE_NAME[this.currentState]}) HIT by ${attacker.constructor.name} for ${amount.toFixed(1)} dmg`);

        // Handle targeting update and combat reactions
        this._handleTargetingAfterHit(attacker, system);
    }

    /**
     * Returns the rank-based cognitive delay (ms) before reacting to incoming damage.
     * Elite and Veteran remain effectively immediate; lower ranks react slower.
     * @returns {number}
     */
    _getCognitiveRetaliationDelayMs() {
        const rankMods = (typeof this._getRankModifiers === 'function') ? this._getRankModifiers() : null;
        const reactionDelayBonusSec = Number(rankMods?.reactionDelayBonus ?? 0);
        if (!Number.isFinite(reactionDelayBonusSec)) return 0;
        return Math.max(0, reactionDelayBonusSec * 1000);
    }

    /**
     * Schedules delayed retaliation processing for lower-rank cognitive realism.
     * Newer hits replace pending retaliation context but do NOT extend
     * the original delay window started by the first hit.
     */
    _scheduleDelayedRetaliation(attacker, system, now, delayMs) {
        this._pendingRetaliationAttacker = attacker;
        this._pendingRetaliationSystem = system || this.getSystem();

        // Preserve the first-hit response window. Additional hits update context
        // only, preventing sustained fire from postponing retaliation forever.
        if (this._pendingRetaliationTimerId) {
            return;
        }

        this._pendingRetaliationReadyAt = now + Math.max(0, delayMs);
        const waitMs = Math.max(0, this._pendingRetaliationReadyAt - now);
        this._pendingRetaliationTimerId = setTimeout(() => {
            this._pendingRetaliationTimerId = null;

            if (this.destroyed) {
                this._pendingRetaliationAttacker = null;
                this._pendingRetaliationSystem = null;
                this._pendingRetaliationReadyAt = 0;
                return;
            }

            const pendingAttacker = this._pendingRetaliationAttacker;
            const pendingSystem = this._pendingRetaliationSystem || this.getSystem();
            this._pendingRetaliationAttacker = null;
            this._pendingRetaliationSystem = null;
            this._pendingRetaliationReadyAt = 0;

            if (!pendingAttacker) return;

            const reactionNow = millis();
            this._updateAttackerHistory(pendingAttacker, reactionNow);
            this._updateLastAttacker(pendingAttacker, reactionNow);

            DAMAGE_LOG(`🧠 ${this.shipTypeName} cognitive delay elapsed; processing retaliation now`);
            this._handleTargetingAfterHit(pendingAttacker, pendingSystem);
        }, waitMs);
    }

    /**
     * Triggers communication system reaction when player deals damage.
     * @param {Object} attacker
     * @param {number} amount
     */
    _triggerPlayerDamageReaction(attacker, amount) {
        if (typeof communicationSystem === 'undefined' || !communicationSystem) return;

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

    /**
     * Determines if an attacker should be ignored for grudge/targeting purposes.
     * Note: Non-combat objects (asteroids, cargo) are handled earlier in _handleAttackerReference.
     * @param {Object} attacker
     * @returns {boolean} True if attacker should be ignored
     */
    _shouldIgnoreAttacker(attacker) {
        // Friendly fire prevention for guards
        if (this.role === AI_ROLE.GUARD && this.principal) {
            if (attacker === this.principal) return true;
            if (attacker?.role === AI_ROLE.GUARD && attacker.principal === this.principal) return true;
        }
        if (attacker?.role === AI_ROLE.GUARD && attacker.principal === this) return true;

        // Same-faction check - handles both Enemy and Player via _getShipFaction helper
        if (typeof this._getShipFaction === 'function') {
            const myFaction = this._getShipFaction(this);
            const attackerFaction = this._getShipFaction(attacker);

            // If we are in the same known faction, ignore this attacker for targeting purposes (collision safety)
            // EXCEPTION: If the attacker is the PLAYER and they are already WANTED in this system, 
            // do not ignore the hit. Criminals lose the benefit of faction protection.
            if (myFaction && myFaction !== 'UNKNOWN' && attackerFaction && attackerFaction !== 'UNKNOWN' && myFaction === attackerFaction) {
                const isPlayerAttacker = (attacker?.isPlayer) || (attacker?.constructor?.name === 'Player');
                if (isPlayerAttacker) {
                    const resolvedSystem = this.getSystem();
                    const isWanted = (typeof resolvedSystem?.isPlayerWanted === 'function') && resolvedSystem.isPlayerWanted();

                    // If player is not wanted, ignore the hit (accidental collision protection)
                    if (!isWanted) return true;

                    // If they ARE wanted, they are a criminal; treat them as a valid attacker
                } else {
                    // NPC hitting another same-faction NPC: always ignore for targeting (prevents fleet infighting)
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Updates attacker history for the grudge system.
     * @param {Object} attacker
     * @param {number} now - Current timestamp
     */
    _updateAttackerHistory(attacker, now) {
        if (!this.attackerHistory) {
            this.attackerHistory = new Map();
        }

        // Clean up old entries and destroyed attackers to prevent memory growth
        for (const [oldAttacker, data] of this.attackerHistory) {
            if (now - data.timestamp > GRUDGE_MEMORY_MS || oldAttacker.destroyed) {
                this.attackerHistory.delete(oldAttacker);
            }
        }

        const isCurrentTarget = this.target === attacker;
        const existingEntry = this.attackerHistory.get(attacker);

        if (existingEntry) {
            existingEntry.hitCount = Math.min(existingEntry.hitCount + 1, MAX_GRUDGE_HIT_COUNT);
            if (!isCurrentTarget) {
                existingEntry.timestamp = now;
            }
        } else {
            this.attackerHistory.set(attacker, { timestamp: now, hitCount: 1 });
        }
    }

    /**
     * Smart lastAttacker update to prevent rapid oscillation between threats.
     * @param {Object} attacker
     * @param {number} now - Current timestamp
     */
    _updateLastAttacker(attacker, now) {
        const currentAttackerEntry = this.lastAttacker ? this.attackerHistory.get(this.lastAttacker) : null;
        const newAttackerEntry = this.attackerHistory.get(attacker);

        let shouldSwitch = false;

        if (!this.lastAttacker || !this.isTargetValid(this.lastAttacker)) {
            shouldSwitch = true;
        } else if (attacker === this.lastAttacker) {
            this.lastAttackTime = now;
            return;
        } else {
            const newGrudge = newAttackerEntry?.hitCount || 1;
            const currentGrudge = currentAttackerEntry?.hitCount || 0;
            const timeSinceLastHit = currentAttackerEntry ? (now - currentAttackerEntry.timestamp) : Infinity;

            if (newGrudge > currentGrudge || timeSinceLastHit > LAST_ATTACKER_SWITCH_COOLDOWN_MS) {
                shouldSwitch = true;
            }
        }

        if (shouldSwitch) {
            this.lastAttacker = attacker;
            this.lastAttackTime = now;
        }
    }

    /**
     * Handles targeting update and combat state transitions after being hit.
     * @param {Object} attacker
     * @param {Object} system - Optional system reference
     */
    _handleTargetingAfterHit(attacker, system) {
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
            if (typeof Player !== 'undefined' && attacker instanceof Player) {
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

            // ============================================
            // UNIVERSAL DAMAGE REACTION: Acquire attacker as target
            // All enemies should acquire their attacker as a target when damaged
            // State machine will handle appropriate response on next update
            // ============================================
            
            // Ensure target is set to the attacker if updateTargeting found them
            if (this.isTargetValid(this.target)) {
                // Target was successfully acquired - state machine will respond on next frame
                DAMAGE_LOG(`🎯 ${this.shipTypeName} acquired target ${this.target.shipTypeName || 'Unknown'}`);
            }
            // FALLBACK: If target acquisition failed but we have lastAttacker, force acquisition
            // This handles the case where updateTargeting couldn't find the attacker
            else if (this.lastAttacker && this.isTargetValid(this.lastAttacker)) {
                // Try to acquire lastAttacker even if updateTargeting failed
                this.target = this.lastAttacker;
                DAMAGE_LOG(`⚠️ FALLBACK: ${this.shipTypeName} forced target to lastAttacker (${this.lastAttacker.shipTypeName || 'Unknown'})`);
            }
        } else {
            if (DEBUG_DAMAGE || DEBUG_TARGETING) console.warn(`⚠️ NO SYSTEM available for ${this.shipTypeName} targeting update!`);
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
            const now = millis();
            this.shieldHitTime = now;
            this.lastShieldHitTime = now;

            if (amount <= this.shield) {
                // Shield absorbs all damage
                this.shield -= amount;
                damageDealt = amount;
                // Reset shield-down flag while shields are still up
                this._shieldWasZero = false;
            } else {
                // Shield is depleted, remaining damage goes to hull
                damageDealt = this.shield; // Damage absorbed by shield
                const hullDamage = amount - this.shield;
                this.shield = 0;
                this.hull -= hullDamage;
                // Shield down audio cue (world-positioned)
                try {
                    if (!this._shieldWasZero) {
                        if (soundManager && player?.pos) {
                            soundManager.playWorldSound('shieldDown', this.pos.x, this.pos.y, player.pos, this);
                        }
                    }
                    this._shieldWasZero = true;
                } catch (e) {
                    console.error('Shield down sound error:', e);
                }
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

        // Clear any delayed retaliation work once the ship is destroyed.
        if (this._pendingRetaliationTimerId) {
            clearTimeout(this._pendingRetaliationTimerId);
            this._pendingRetaliationTimerId = null;
        }
        this._pendingRetaliationAttacker = null;
        this._pendingRetaliationSystem = null;
        this._pendingRetaliationReadyAt = 0;

        // Add these lines to clear all combat flags
        this.inCombat = false;
        this.haulerCombatTimer = undefined;
        this.forcedCombatTimer = 0;

        // Clear ability states on death
        this.isCloaked = false;
        this.isSpeedBursting = false;

        try {
            if (communicationSystem?.handleEnemyDestroyed) {
                communicationSystem.handleEnemyDestroyed(this);
            }
        } catch (err) {
            console.error('Communication system error on enemy destruction:', err);
        }

        const system = this.getSystem();
        if (system) {
            // Create explosion effect
            system.addExplosion(
                this.pos.x,
                this.pos.y,
                this.size,
                [100, 150, 255] // Blueish-white core
            );

            // Drop cargo
            this.dropCargo();

            // Track this destruction for combat news
            if (typeof system.recordDestruction === 'function') {
                system.recordDestruction(this, attacker);
            }

            // Handle player-related consequences (mission progress, wanted status)
            const playerAttacker = this._resolvePlayerAttacker(attacker);
            if (playerAttacker && system.player === playerAttacker) {
                this._handlePlayerKillConsequences(playerAttacker, system);
                
                // Add news item if player destroyed a notorious pirate
                if (this.isNotoriousPirate && typeof newsManager !== 'undefined' && newsManager) {
                    newsManager.addAssassinationNews(this.displayName, this.currentSystem?.name || 'Unknown Sector');
                }
            }
        }
    }

    /**
     * Resolves the player responsible for a kill, including weapon/projectile owners.
     * @param {Object} attacker
     * @returns {Player|null}
     */
    _resolvePlayerAttacker(attacker) {
        if (!attacker) return null;

        if (typeof Player !== 'undefined' && attacker instanceof Player) {
            return attacker;
        }

        const owner = attacker.owner || attacker.source || attacker.launcher || null;
        if (typeof Player !== 'undefined' && owner instanceof Player) {
            return owner;
        }

        return null;
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

        // Update mission progress using helper to reduce code duplication
        if (attacker.activeMission) {
            const mission = attacker.activeMission;
            const missionType = mission.type;

            // Define mission-to-target mappings for automatic progress tracking
            const missionTargetMap = {
                // Standard bounty missions
                [MISSION_TYPE.BOUNTY_PIRATE]: {
                    checkFn: () => isPirateShip(this),
                    logName: 'pirate bounty'
                },
                [MISSION_TYPE.BOUNTY_POLICE]: {
                    validRoles: [AI_ROLE.POLICE],
                    logName: 'police bounty'
                },
                [MISSION_TYPE.BOUNTY_ALIEN]: {
                    validRoles: [AI_ROLE.ALIEN],
                    logName: 'alien bounty'
                },
                // Faction kill missions
                [MISSION_TYPE.IMPERIAL_ELIMINATION]: {
                    checkFn: () => isShipOfFaction(this, 'SEPARATIST') || this.role === AI_ROLE.PIRATE,
                    logName: 'Imperial',
                    msgColor: [255, 215, 0]
                },
                [MISSION_TYPE.IMPERIAL_STRIKE]: {
                    checkFn: () => isShipOfFaction(this, 'SEPARATIST') || this.role === AI_ROLE.PIRATE,
                    logName: 'Imperial',
                    msgColor: [255, 215, 0]
                },
                [MISSION_TYPE.SEPARATIST_RAID]: {
                    checkFn: () => isShipOfFaction(this, 'IMPERIAL') || this.role === AI_ROLE.POLICE,
                    logName: 'Separatist',
                    msgColor: [100, 200, 100]
                },
                [MISSION_TYPE.SEPARATIST_STRIKE]: {
                    checkFn: () => isShipOfFaction(this, 'IMPERIAL') || this.role === AI_ROLE.POLICE,
                    logName: 'Separatist',
                    msgColor: [100, 200, 100]
                },
                [MISSION_TYPE.MILITARY_EXTERMINATION]: {
                    validRoles: [AI_ROLE.ALIEN, AI_ROLE.PIRATE],
                    logName: 'Military',
                    msgColor: [100, 200, 100]
                },
                [MISSION_TYPE.MILITARY_STRIKE]: {
                    validRoles: [AI_ROLE.ALIEN, AI_ROLE.PIRATE],
                    logName: 'Military',
                    msgColor: [100, 200, 100]
                }
            };

            const missionConfig = missionTargetMap[missionType];
            if (missionConfig) {
                // Check if this kill counts toward the mission
                const countsForMission = missionConfig.checkFn
                    ? missionConfig.checkFn()
                    : (missionConfig.validRoles && missionConfig.validRoles.includes(this.role));

                if (countsForMission) {
                    mission.updateProgress(1);
                    AI_LOG(`Updated ${missionConfig.logName} mission progress: ${mission.progressCount}/${mission.targetCount}`);

                    // Show UI message for faction missions
                    if (missionConfig.msgColor && typeof uiManager !== 'undefined') {
                        uiManager.addMessage(
                            `${missionConfig.logName} objective: ${mission.progressCount}/${mission.targetCount}`,
                            missionConfig.msgColor
                        );
                    }

                    // Auto-complete when target count is met
                    if (mission.progressCount >= mission.targetCount) {
                        AI_LOG(`${missionConfig.logName} mission target count met! Completing mission...`);
                        system.player.completeMission();
                    }
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
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage(`WANTED: For destroying ${this.role} ship!`, '#ff0000');
                }
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

        // Notorious pirate extra bounty
        if (this.isNotoriousPirate) {
            bountyAmount = 10000;
            bountyMessage = `Notorious Pirate Bounty: 10,000 cr`;
            attacker.addCredits(bountyAmount);
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage(bountyMessage, [100, 255, 100]);
            }
            // Reset so standard faction bounty below adds to it if applicable, or we just award this one
            bountyAmount = 0;
            bountyMessage = null;
        }

        // Use unified pirate detection helper (consistent with addKill and mission checks)
        const isPirateEnemy = isPirateShip(this);

        // Police bounties for killing aliens or pirates
        if (attacker.isPolice && (this.role === AI_ROLE.ALIEN || isPirateEnemy)) {
            bountyAmount = BOUNTY_POLICE_ALIEN_PIRATE;
            bountyMessage = `Police bounty: ${BOUNTY_POLICE_ALIEN_PIRATE.toLocaleString()} cr`;
        }
        // Separatist bounties for killing Imperial ships
        else if (attacker.playerFaction === 'SEPARATIST' && isShipOfFaction(this, 'IMPERIAL')) {
            bountyAmount = BOUNTY_FACTION_RIVALRY;
            bountyMessage = `Separatist bounty: ${BOUNTY_FACTION_RIVALRY.toLocaleString()} cr`;
        }
        // Imperial bounties for killing Separatist ships
        else if (attacker.playerFaction === 'IMPERIAL' && isShipOfFaction(this, 'SEPARATIST')) {
            bountyAmount = BOUNTY_FACTION_RIVALRY;
            bountyMessage = `Imperial bounty: ${BOUNTY_FACTION_RIVALRY.toLocaleString()} cr`;
        }
        // Military bounties for killing Alien ships
        else if (attacker.playerFaction === 'MILITARY' && this.role === AI_ROLE.ALIEN) {
            bountyAmount = BOUNTY_MILITARY_ALIEN;
            bountyMessage = `Military bounty: ${BOUNTY_MILITARY_ALIEN.toLocaleString()} cr`;
        }
        // Military bounties for killing pirates
        else if (attacker.playerFaction === 'MILITARY' && isPirateEnemy) {
            bountyAmount = BOUNTY_MILITARY_PIRATE;
            bountyMessage = `Military bounty: ${BOUNTY_MILITARY_PIRATE.toLocaleString()} cr`;
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
     * Internal helper: Checks and potentially jettisons cargo on non-fatal hits.
     */
    _checkRandomCargoDrop() {
        // Random cargo drop chance when hit but not destroyed
        if (this.hull < this.maxHull * DAMAGE_CARGO_DROP_HULL_THRESHOLD && Math.random() < DAMAGE_CARGO_DROP_CHANCE) {
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

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyDamageSystem, applyEnemyDamageSystemMethods };
    global.EnemyDamageSystem = EnemyDamageSystem;
    global.applyEnemyDamageSystemMethods = applyEnemyDamageSystemMethods;
}
