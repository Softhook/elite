// ****** enemyTargeting.js ******
// Enemy Targeting Logic
// Handles target selection and evaluation for Enemy AI

/**
 * Enemy targeting methods as a mixin class
 * These methods handle target selection and scoring
 */
class EnemyTargeting {
    // --- NEW: Docking helpers for TRANSPORT robustness ---
    _isDockingTargetValid(target) {
        // Basic defensive checks to ensure dockingTarget is still usable.
        if (!target) return false;
        if (target.isDestroyed || target.removed) return false;
        // Prefer explicit API if provided
        if (typeof target.canDock === 'function') {
            try { return !!target.canDock(); } catch (e) { return false; }
        }
        if (typeof target.acceptsDocking !== 'undefined') {
            return !!target.acceptsDocking;
        }
        // Fallback: assume valid
        return true;
    }

    // Throttled trade/docking message emitter.
    // Records the dockingTarget that has been "traded with" so we can conclude the docking sequence.
    shouldSendTradeMessage() {
        const now = (typeof millis === 'function') ? millis() : Date.now();

        // If we're not in trading, reset any per-dock bookkeeping so next trade is fresh.
        if (this.currentState !== AI_STATE.TRADING) {
            this._lastTradeMessageTime = undefined;
            this._tradeCompletedForTarget = undefined;
            this._tradeMessageSentTime = undefined;
            this._pendingUndockTime = undefined;
            return true;
        }

        const target = this.dockingTarget;
        if (!target) return false;

        const cooldown = this.tradeMessageCooldownMs || 10000; // default 10s between repeated messages

        // If we've already emitted a trade message for this dockingTarget, throttle further messages
        if (this._tradeCompletedForTarget === target) {
            if (!this._lastTradeMessageTime || (now - this._lastTradeMessageTime) > cooldown) {
                this._lastTradeMessageTime = now;
                return true;
            }
            return false;
        }

        // First time reporting trade for this docking target: mark and allow the message,
        // and schedule a short undock delay so trade effects can complete.
        this._tradeCompletedForTarget = target;
        this._lastTradeMessageTime = now;
        this._tradeMessageSentTime = now;
        this._pendingUndockTime = now + (this.postTradeUndockDelayMs || 1000); // ms
        return true;
    }
    // --- END NEW ---

    /**
     * Updates the enemy's targeting information
     * @param {Object} system - The current star system
     * @return {boolean} Whether a valid target was found
     */
    updateTargeting(system) {
        // --- OFF-SCREEN OPTIMIZATION ---
        if (this._isOnScreen === false) {
            // Periodic Scan Override: Ensure we don't stay "blind" to new nearby enemies forever.
            // Run full targeting logic once every ~1 second.
            const scanIntervalSeconds = 1.0;

            // Initialize timer if needed
            if (this.offScreenTargetTimer === undefined) {
                this.offScreenTargetTimer = Math.random() * scanIntervalSeconds;
            }

            // Accumulate time
            const dt = (typeof deltaTime === 'number') ? deltaTime / 1000 : 0.016;
            this.offScreenTargetTimer += dt;

            const isScanFrame = this.offScreenTargetTimer >= scanIntervalSeconds;

            if (isScanFrame) {
                this.offScreenTargetTimer %= scanIntervalSeconds;
            }

            if (!isScanFrame) {
                // Simplified targeting: Stick to lastAttacker or existing target
                if (this.lastAttacker && this.isTargetValid(this.lastAttacker)) {
                    this.target = this.lastAttacker;
                    return true;
                }
                if (this.target && this.isTargetValid(this.target)) {
                    return true;
                }
                // Optimized Off-Screen Scanning:
                // Instead of blindly targeting the player, scan for High Priority targets (Rivals/Prey).
                // Falls back to player only if no better target matches.

                let bestOffScreenTarget = null;
                let bestOffScreenDistSq = Infinity;

                // 1. Consider Player as baseline (if hostile/wanted)
                const isHostileToPlayer = (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.ALIEN || this.role === AI_ROLE.BOUNTY_HUNTER);
                // Police only target wanted players
                const isPoliceVsWanted = (this.role === AI_ROLE.POLICE || this.role === AI_ROLE.GUARD) && system.player && system.player.isWanted;

                if ((isHostileToPlayer || isPoliceVsWanted) && system.player && this.isTargetValid(system.player)) {
                    bestOffScreenTarget = system.player;
                    const dx = this.pos.x - system.player.pos.x;
                    const dy = this.pos.y - system.player.pos.y;
                    bestOffScreenDistSq = dx * dx + dy * dy;
                }

                // 2. Scan other enemies (Sampling for performance)
                if (system.enemies) {
                    // Check every 2nd enemy for better coverage while still saving CPU
                    const startIdx = (this._scanOffset || 0) % 2;
                    for (let i = startIdx; i < system.enemies.length; i += 2) {
                        const e = system.enemies[i];
                        if (e === this || !e.pos || e.destroyed) continue;

                        // Check Faction/Role Priorities using central constants
                        let isPriority = false;

                        // 1. Check Faction Rivalries
                        if (typeof FACTION_ENEMY_MAP !== 'undefined' && this.faction && e.faction) {
                            const hatedFactions = FACTION_ENEMY_MAP[this.faction];
                            if (hatedFactions && hatedFactions.includes(e.faction)) {
                                isPriority = true;
                            }
                        }

                        // 1b. Check direct hatred (e.g. Police vs Pirate)
                        // Handled via ROLE_ENEMY_MAP usually, but ensure basics:
                        if (e.role === AI_ROLE.PIRATE && (this.role === AI_ROLE.POLICE || this.role === AI_ROLE.GUARD)) isPriority = true;

                        // 2. Check Role Hostilities (if not already found)
                        if (!isPriority && typeof ROLE_ENEMY_MAP !== 'undefined' && this.role) {
                            const hatedRoles = ROLE_ENEMY_MAP[this.role];
                            if (hatedRoles && (hatedRoles.includes(e.role) || hatedRoles.includes(e.faction))) {
                                isPriority = true;
                            }
                        }

                        // 3. Fallback for Alien vs faction specific case if not covered by maps
                        if (!isPriority && this.faction === 'MILITARY' && e.role === AI_ROLE.ALIEN) isPriority = true;

                        if (isPriority) {
                            const dx = this.pos.x - e.pos.x;
                            const dy = this.pos.y - e.pos.y;
                            const d2 = dx * dx + dy * dy;
                            // Switch if this rival is closer than current best (or if current best is the player)
                            // We heavily bias towards Rivals over Player
                            if (!bestOffScreenTarget || bestOffScreenTarget === system.player || d2 < bestOffScreenDistSq) {
                                bestOffScreenTarget = e;
                                bestOffScreenDistSq = d2;
                            }
                        }
                    }
                }

                if (bestOffScreenTarget) {
                    this.target = bestOffScreenTarget;
                    return true;
                }
                this.target = null;
                return false;
            }
            // If isScanFrame is true, FALL THROUGH to full targeting logic below!
        }
        // -------------------------------

        // Prevent transporters from retargeting while actively docking/trading/approaching or already docked.
        // Allow only emergency self-defense (lastAttacker/forced combat) so transports can finish trading/docking.
        if (this.role === AI_ROLE.TRANSPORT) {
            const dockingStates = [
                AI_STATE.TRADING,
                AI_STATE.DOCKING,
                AI_STATE.DOCKING_APPROACH
            ];
            const inDockSequence =
                dockingStates.some(s => this.currentState === s) ||
                !!this.isDocked ||
                !!this.dockingTarget ||
                !!this._approachTarget;

            if (inDockSequence) {
                // Validate docking target; if invalid, abort docking and fallback to default state.
                if (this.dockingTarget && !this._isDockingTargetValid(this.dockingTarget)) {
                    // Clear docking bookkeeping and force undock so the transport can move again
                    this.dockingTarget = null;
                    this._dockingStartTime = undefined;
                    this._tradeCompletedForTarget = undefined;
                    this._tradeMessageSentTime = undefined;
                    this._pendingUndockTime = undefined;
                    this._approachTarget = undefined;
                    if (typeof this.undock === 'function') {
                        try { this.undock(); } catch (e) { /* ignore */ }
                    } else {
                        this.isDocked = false;
                    }
                    if (typeof this.changeState === 'function') {
                        this.changeState(this._getDefaultStateForRole ? this._getDefaultStateForRole() : AI_STATE.IDLE);
                    }
                    // allow retargeting next tick
                } else {
                    // Track start time so transports don't get stuck forever
                    const now = (typeof millis === 'function') ? millis() : Date.now();
                    if (!this._dockingStartTime) this._dockingStartTime = now;
                    const elapsed = now - this._dockingStartTime;
                    const dockingTimeoutMs = this.dockingTimeoutMs || 20000; // default 20s

                    // ARRIVAL: If we're close enough to dock but not marked docked, snap into TRADING/docked state
                    if (this.dockingTarget && !this.isDocked && typeof this.distanceTo === 'function') {
                        const distance = this.distanceTo(this.dockingTarget);
                        const dockRadius = this.dockingRange || this.dockingTarget.dockRadius || 32;
                        if (distance <= dockRadius) {
                            this.isDocked = true;
                            this.currentState = AI_STATE.TRADING;
                            // ensure docking start is recent
                            this._dockingStartTime = now;
                        }
                    }

                    // If we've already emitted a trade message for this dockingTarget while in TRADING,
                    // wait for the pending undock delay then perform undock/cleanup so the ship can resume normal behavior.
                    if (this.currentState === AI_STATE.TRADING && this._tradeCompletedForTarget && this._tradeCompletedForTarget === this.dockingTarget) {
                        // initialize pending undock if not set (covers cases where message flag was set externally)
                        if (!this._pendingUndockTime) {
                            this._pendingUndockTime = now + (this.postTradeUndockDelayMs || 1000);
                        }
                        // perform undock after delay
                        if (now >= this._pendingUndockTime) {
                            this.dockingTarget = null;
                            this._dockingStartTime = undefined;
                            this._tradeCompletedForTarget = undefined;
                            this._tradeMessageSentTime = undefined;
                            this._pendingUndockTime = undefined;
                            this._approachTarget = undefined;
                            if (typeof this.undock === 'function') {
                                try { this.undock(); } catch (e) { /* ignore */ }
                            } else {
                                this.isDocked = false;
                            }
                            if (typeof this.changeState === 'function') {
                                this.changeState(this._getDefaultStateForRole ? this._getDefaultStateForRole() : AI_STATE.IDLE);
                            }
                            // allow retargeting next tick
                            return false;
                        }
                        // still in post-trade wait window: remain trading (prevents immediate repeated messages)
                        return this.target !== null;
                    }

                    if (elapsed > dockingTimeoutMs) {
                        // Abort docking sequence and reset — ensure transport actually undocks/moves
                        this.dockingTarget = null;
                        this._dockingStartTime = undefined;
                        this._tradeCompletedForTarget = undefined;
                        this._tradeMessageSentTime = undefined;
                        this._pendingUndockTime = undefined;
                        this._approachTarget = undefined;
                        if (typeof this.undock === 'function') {
                            try { this.undock(); } catch (e) { /* ignore */ }
                        } else {
                            this.isDocked = false;
                        }
                        if (typeof this.changeState === 'function') {
                            this.changeState(this._getDefaultStateForRole ? this._getDefaultStateForRole() : AI_STATE.IDLE);
                        }
                        // allow retargeting next tick
                    } else {
                        // If attacked, defend; otherwise skip retargeting so docking/trading can complete
                        if (this.lastAttacker && this.isTargetValid(this.lastAttacker)) {
                            if (this.target !== this.lastAttacker) this.target = this.lastAttacker;
                            return true;
                        }
                        return this.target !== null;
                    }
                }
            } else {
                // Leaving docking sequence: clear start time and any pending undock
                if (this._dockingStartTime) this._dockingStartTime = undefined;
                this._pendingUndockTime = undefined;
            }
        }

        // --- BOUNTY HUNTER: Always target player ---
        if (this.role === AI_ROLE.BOUNTY_HUNTER) {
            const playerRef = system.player || this.target; // Ensure we have a reference to player
            if (playerRef instanceof Player && this.isTargetValid(playerRef)) {
                if (this.target !== playerRef) {
                    this.target = playerRef;
                }
                return true; // Player is the target
            } else {
                this.target = null; // Player is not valid (e.g., destroyed, not in system)
                return false;
            }
        }
        // --- END BOUNTY HUNTER ---

        // --- SNIPING: Lock onto current target, don't retarget ---
        if (this.currentState === AI_STATE.SNIPING) {
            if (this.isTargetValid(this.target)) {
                return true; // Keep current target locked during sniping
            } else {
                // Target became invalid, exit sniping state to appropriate default
                this.target = null;
                this.changeState(this._getDefaultStateForRole());
                return false;
            }
        }
        // --- END SNIPING ---

        // --- GUARD ENGAGEMENT LOCK: Maintain target during active engagement ---
        if (this.role === AI_ROLE.GUARD && this.guardEngagementLock > 0) {
            if (this.isTargetValid(this.target)) {
                // Keep current target locked during engagement lock period
                return true;
            }
            // If target becomes invalid during lock, allow retargeting but keep the lock active
            // The lock will naturally expire via the timer in enemy.js
        }
        // --- END GUARD ENGAGEMENT LOCK ---

        let bestScore = TARGET_SCORE_INVALID;
        let bestTarget = null;
        let currentTargetScore = TARGET_SCORE_INVALID;

        // Evaluate current target (no debug)
        if (this.isTargetValid(this.target)) {
            currentTargetScore = this.evaluateTargetScore(this.target, system);
            bestScore = currentTargetScore;
            bestTarget = this.target;
        } else {
            this.target = null;
        }

        // Evaluate lastAttacker (no debug)
        if (this.lastAttacker && this.lastAttacker !== bestTarget && this.isTargetValid(this.lastAttacker)) {
            const attackerScore = this.evaluateTargetScore(this.lastAttacker, system);
            if (attackerScore > bestScore) {
                bestScore = attackerScore;
                bestTarget = this.lastAttacker;
            }
        }

        // Evaluate Player (with debug)
        const playerRef = system.player || this.target;
        if (playerRef instanceof Player && playerRef !== bestTarget && this.isTargetValid(playerRef)) {
            const playerScore = this.evaluateTargetScore(playerRef, system);
            if (playerScore > bestScore) {
                bestScore = playerScore;
                bestTarget = playerRef;
            }
        }

        // Evaluate other enemies (optimized with spatial hash)
        const canTargetOtherEnemies = (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.ALIEN || this.role === AI_ROLE.COMBAT);
        if (canTargetOtherEnemies && system.enemies && system.enemies.length > 0) {
            const isAlien = this.role === AI_ROLE.ALIEN;

            // Use spatial hash if available for O(1) nearby lookup
            // Search radius based on weapon range + some buffer for approach
            const targetingRadius = (this.weaponRange || 400) + 200;
            const candidates = (system.spatialHash) ?
                system.spatialHash.getNearby(this.pos.x, this.pos.y, targetingRadius) :
                system.enemies;

            for (let i = 0, len = candidates.length; i < len; i++) {
                const otherEnemy = candidates[i];
                // Skip non-enemies (spatial hash may include asteroids, cargo, etc.)
                if (!(otherEnemy instanceof Enemy)) continue;
                if (otherEnemy === this || otherEnemy === bestTarget) {
                    continue;
                }
                // For Aliens, ensure they don't target other Aliens
                if (isAlien && otherEnemy.role === AI_ROLE.ALIEN) {
                    continue;
                }
                // Skip allies (same faction) - applies to all roles
                // The faction penalty in evaluateTargetScore will handle nuanced scoring,
                // but we skip evaluation entirely here for efficiency
                if (this._getShipFaction) {
                    const myFaction = this._getShipFaction(this);
                    const theirFaction = this._getShipFaction(otherEnemy);
                    // Empty string means "no faction" - treat like UNKNOWN
                    if (myFaction && theirFaction && myFaction === theirFaction && myFaction !== 'UNKNOWN') {
                        continue; // Don't even evaluate allies
                    }
                }
                if (!this.isTargetValid(otherEnemy)) {
                    continue;
                }
                const enemyScore = this.evaluateTargetScore(otherEnemy, system);
                if (enemyScore > bestScore) {
                    bestScore = enemyScore;
                    bestTarget = otherEnemy;
                }
            }
        }

        // NOTE: Do NOT evaluate cargo here. Pirates use dedicated cargo collection logic
        // in update() via detectCargo() and the COLLECTING_CARGO state. Including cargo
        // in combat targeting leads to unwanted behavior (shooting cargo). Intentionally omitted.

        // Final target decision
        if (bestTarget && bestScore > 0) {
            const scoreThresholdForChange = 25;

            if (bestTarget !== this.target) {
                // Switching to a different target
                // Allow immediate switch if we have no target, otherwise require cooldown + score threshold
                if (this.target === null) {
                    // No current target, immediate acquisition allowed
                    this.target = bestTarget;
                    this.targetSwitchCooldown = 2.0; // Set cooldown for future switches
                    if (typeof communicationSystem !== 'undefined' && communicationSystem?.handleTargetAcquired) {
                        communicationSystem.handleTargetAcquired(this, bestTarget, { reason: 'initial' });
                    }

                    // Special handling for guards: set engagement lock when acquiring principal's attacker
                    if (this.role === AI_ROLE.GUARD && this.principal &&
                        bestTarget === this.principal.lastAttacker) {
                        this.guardEngagementLock = GUARD_ENGAGEMENT_LOCK_DURATION; // Lock for engagement
                    }
                    return true;
                } else if (this.targetSwitchCooldown <= 0 && bestScore > currentTargetScore + scoreThresholdForChange) {
                    // Have a target, cooldown expired, and new target is significantly better
                    this.target = bestTarget;
                    this.targetSwitchCooldown = 2.0;
                    if (typeof communicationSystem !== 'undefined' && communicationSystem?.handleTargetAcquired) {
                        communicationSystem.handleTargetAcquired(this, bestTarget, { reason: 'retarget' });
                    }

                    // Special handling for guards: set engagement lock when acquiring principal's attacker
                    if (this.role === AI_ROLE.GUARD && this.principal &&
                        bestTarget === this.principal.lastAttacker) {
                        this.guardEngagementLock = GUARD_ENGAGEMENT_LOCK_DURATION; // Lock for engagement
                    }
                    return true;
                }
                // Else: cooldown active or score not good enough - keep current target
            }
            // Either keeping same target or couldn't switch yet
            return this.target !== null;
        } else {
            // No valid target found
            // IMPORTANT: Don't clear target while cooldown is active to prevent rapid switching exploit
            // where target becomes null, then new target is acquired as 'initial' (bypassing cooldown)
            if (this.targetSwitchCooldown <= 0) {
                if (this.target instanceof Player) {
                    //console.log(`%c🎯 PLAYER LOST: ${this.shipTypeName} stopped targeting player`, 'color:orange');
                }
                this.target = null;
            }
            // Return whether we still have a valid target
            return this.target !== null && this.isTargetValid(this.target);
        }
    }

    /**
     * Evaluates how attractive a target is for this enemy - with isolation from global scope
     * @param {Object} target - The target to evaluate
     * @param {Object} system - The current star system
     * @return {number} A score representing how attractive this target is
     */
    evaluateTargetScore(target, system) {
        // Use an immediately-invoked function expression (IIFE) for complete scope isolation
        return (function (enemy, target, system) {
            // Basic validity check
            if (!enemy.isTargetValid(target) || target === enemy) {
                return TARGET_SCORE_INVALID;
            }

            // Never target asteroids - collisions with asteroids should not trigger combat
            if (target && target.constructor && target.constructor.name === 'Asteroid') {
                return TARGET_SCORE_INVALID;
            }

            // --- GUARD: Prioritize Principal's Attacker (with friendly fire prevention) ---
            if (enemy.role === AI_ROLE.GUARD && enemy.principal && enemy.isTargetValid(enemy.principal)) {
                // FRIENDLY FIRE PREVENTION: Never target principal
                if (target === enemy.principal) {
                    return TARGET_SCORE_INVALID;
                }

                // FRIENDLY FIRE PREVENTION: Never target fellow guards protecting same principal
                if (target.role === AI_ROLE.GUARD && target.principal === enemy.principal) {
                    return TARGET_SCORE_INVALID;
                }

                // CRITICAL FIX: Check if we're currently locked onto THIS target
                // This prevents flickering when principal.lastAttacker changes or becomes invalid
                // NOTE: The friendly fire checks above already returned INVALID for principal/fellow guards
                // so if we reach here with a lock, it's a valid hostile target
                const isLockedOn = enemy.guardEngagementLock > 0 && target === enemy.target;
                if (isLockedOn) {
                    // Maintain lock with consistent high score regardless of lastAttacker status
                    // This keeps the guard committed to the threat even if principal's reference changes
                    return 2500; // Higher than initial engagement to prevent target loss/switching
                }

                // High priority for principal's attacker (initial engagement)
                const isPrincipalAttacker = target === enemy.principal.lastAttacker &&
                    enemy.isTargetValid(target) &&
                    (enemy.principal.lastAttackTime && millis() - enemy.principal.lastAttackTime < 5000);

                if (isPrincipalAttacker) {
                    //console.log(`${enemy.shipTypeName} (Guard) evaluating ${target.shipTypeName || 'Player'} as principal's attacker. HIGH SCORE.`);
                    return 2000; // Very high score to engage principal's attacker
                }

                // Self-defense: if this guard was attacked, can engage the attacker
                // BUT NOT if the attacker is the principal or a fellow guard (friendly fire prevention)
                if (target === enemy.lastAttacker) {
                    // Don't retaliate against principal
                    if (target === enemy.principal) {
                        return TARGET_SCORE_INVALID;
                    }
                    // Don't retaliate against fellow guards protecting the same principal
                    if (target.role === AI_ROLE.GUARD && target.principal === enemy.principal) {
                        return TARGET_SCORE_INVALID;
                    }
                    return 1500; // High score for self-defense, but lower than principal defense
                }

                // Otherwise, guards don't pick fights - return invalid
                return TARGET_SCORE_INVALID;
            }

            // FRIENDLY FIRE PREVENTION: Principals never target their own guards
            if (target.role === AI_ROLE.GUARD && target.principal === enemy) {
                return TARGET_SCORE_INVALID;
            }
            // --- END GUARD ---

            // --- BOUNTY HUNTER: Only cares about the player ---
            if (enemy.role === AI_ROLE.BOUNTY_HUNTER) {
                if (target instanceof Player) {
                    return 1000; // Very high score for the player
                } else {
                    return TARGET_SCORE_INVALID; // Ignore all other targets
                }
            }
            // --- END BOUNTY HUNTER ---

            // Create completely private scoring variables
            let _score = 0;
            let _interesting = false;
            const isPlayer = target instanceof Player;

            if (isPlayer) {
                //console.log(`%c🔍 DEBUG: ${enemy.shipTypeName} evaluating player - starting score calculation`, 'color:purple');
            }

            // Check if target is in our attacker history (any past attacker, not just the last one)
            // This allows ships to retaliate against multiple attackers with "grudge" scaling
            let isAttacker = false;
            let attackTimestamp = null;
            let hitCount = 0; // Number of times this attacker has hit us (grudge level)

            if (enemy.attackerHistory && enemy.attackerHistory.has(target)) {
                const entry = enemy.attackerHistory.get(target);
                isAttacker = true;
                // Handle both old format (timestamp only) and new format ({timestamp, hitCount})
                if (typeof entry === 'object' && entry.timestamp) {
                    attackTimestamp = entry.timestamp;
                    hitCount = entry.hitCount || 1;
                } else {
                    attackTimestamp = entry; // Old format fallback
                    hitCount = 1;
                }
            } else if (target === enemy.lastAttacker) {
                // Fallback for backwards compatibility
                isAttacker = true;
                attackTimestamp = enemy.lastAttackTime;
                hitCount = 1;
            }

            // Special case: Player might be stored differently
            if (!isAttacker && isPlayer && enemy.lastAttacker instanceof Player) {
                isAttacker = true;
                attackTimestamp = enemy.lastAttackTime;
                hitCount = 1;
            }

            // Add attacker bonus - with "grudge" scaling based on hit count
            // More hits = stronger desire to retaliate
            if (isAttacker) {
                // Base retaliation + grudge bonus (capped at 3x for 5+ hits)
                const grudgeMultiplier = Math.min(1 + (hitCount - 1) * 0.5, 3.0);
                let retaliationBonus = TARGET_SCORE_RETALIATION_PIRATE * grudgeMultiplier;

                // Apply time-based decay for non-hostile attackers
                // This allows initial retaliation but ships will eventually give up chasing neutrals
                if (enemy._getShipFaction && attackTimestamp) {
                    const myFaction = enemy._getShipFaction(enemy);
                    const targetFaction = (target instanceof Player)
                        ? (target.playerFaction || 'UNKNOWN')
                        : (enemy._getShipFaction ? enemy._getShipFaction(target) : 'UNKNOWN');

                    // Check if target is a legitimate hostile for this ship
                    const isHostileRole = target.role === AI_ROLE.PIRATE || target.role === AI_ROLE.ALIEN;
                    const isFactionRival = (myFaction === 'IMPERIAL' && targetFaction === 'SEPARATIST') ||
                        (myFaction === 'SEPARATIST' && targetFaction === 'IMPERIAL') ||
                        (myFaction === 'MILITARY' && target.role === AI_ROLE.ALIEN);

                    // Police consider pirates and aliens as hostile
                    const isPoliceHostile = enemy.role === AI_ROLE.POLICE &&
                        (target.role === AI_ROLE.PIRATE || target.role === AI_ROLE.ALIEN);

                    // Player-specific hostility checks:
                    // - Player is wanted (always hostile to law-abiding ships)
                    // - Player has a rival faction to this ship
                    // - This ship is an aggressive role (pirates/aliens/bounty hunters attack players on sight)
                    let isPlayerHostile = false;
                    if (isPlayer) {
                        const playerIsWanted = target.isWanted || (system && system.isPlayerWanted && system.isPlayerWanted());
                        const playerIsFactionRival = isFactionRival; // Already calculated above
                        const shipIsAggressive = enemy.role === AI_ROLE.PIRATE ||
                            enemy.role === AI_ROLE.ALIEN ||
                            enemy.role === AI_ROLE.BOUNTY_HUNTER;
                        isPlayerHostile = playerIsWanted || playerIsFactionRival || shipIsAggressive;
                    }

                    // Combined hostile check - NOTE: Players are only hostile under specific conditions
                    const isHostileTarget = isPlayerHostile || isHostileRole || isFactionRival || isPoliceHostile;

                    // Only apply decay for non-hostile targets
                    if (!isHostileTarget) {
                        const timeSinceAttack = millis() - attackTimestamp;

                        // GRUDGE-BASED: Higher grudge = longer retaliation window
                        // Base: 10 seconds, +3 seconds per grudge level, cap at 25 seconds
                        const RETALIATION_TIMEOUT_MS = Math.min(10000 + hitCount * 3000, 25000);
                        const decayStart = RETALIATION_TIMEOUT_MS * 0.5; // Decay starts at 50% of timeout

                        if (timeSinceAttack > RETALIATION_TIMEOUT_MS) {
                            // Timeout expired - no retaliation bonus for neutral targets
                            retaliationBonus = 0;
                        } else {
                            // Decay retaliation bonus over time (full bonus until decayStart, then linear decay)
                            if (timeSinceAttack > decayStart) {
                                const decayProgress = (timeSinceAttack - decayStart) / (RETALIATION_TIMEOUT_MS - decayStart);
                                retaliationBonus = TARGET_SCORE_RETALIATION_PIRATE * (1 - decayProgress);
                            }
                        }
                    }
                }

                if (retaliationBonus > 0) {
                    _score += retaliationBonus;
                    _interesting = true;
                }
            }

            // --- FACTION CHECK: Apply large penalty for same-faction targeting ---
            // This prevents friendly fire between ships of the same faction
            // Exception: Allow brief retaliation if same-faction ship attacked us
            if (enemy._getShipFaction) {
                const myFaction = enemy._getShipFaction(enemy);
                // For Player targets, use their faction directly (or 'UNKNOWN' if null)
                // For NPC targets, get faction via ship faction check
                const targetFaction = (target instanceof Player)
                    ? (target.playerFaction || 'UNKNOWN')
                    : enemy._getShipFaction(target);

                // Only apply faction logic if both have known factions (not UNKNOWN or empty string)
                // Empty string means "no faction" and should not trigger same-faction penalties
                if (myFaction && myFaction !== 'UNKNOWN' && targetFaction && targetFaction !== 'UNKNOWN' && myFaction === targetFaction) {
                    // Same faction - apply large penalty to discourage targeting
                    // But still allow retaliation if they attacked us first
                    if (!isAttacker) {
                        // Not our attacker - heavily discourage targeting same faction
                        _score -= TARGET_SCORE_SAME_FACTION_PENALTY;
                    } else {
                        // They attacked us - allow brief retaliation but with reduced enthusiasm
                        // The retaliation bonus is already added above, but we'll add a moderate penalty
                        // This means they CAN retaliate but won't prioritize it as much
                        _score -= (TARGET_SCORE_SAME_FACTION_PENALTY * 0.5);
                    }
                }
            }
            // --- END FACTION CHECK ---

            // Role-specific scoring - add based on enemy role
            switch (enemy.role) {
                case AI_ROLE.PIRATE:
                    if (isPlayer) {
                        _interesting = true;

                        // Add cargo bonus
                        const cargoAmount = target.getCargoAmount ? target.getCargoAmount() : (target.cargo?.length || 0);
                        if (cargoAmount > 5) {
                            const cargoBonus = TARGET_SCORE_PIRATE_CARGO_BASE + cargoAmount * TARGET_SCORE_PIRATE_CARGO_MULT;
                            _score += cargoBonus;
                        }
                    } else if (target.role === AI_ROLE.HAULER || target.role === AI_ROLE.TRANSPORT) {
                        _score += TARGET_SCORE_PIRATE_PREY_HAULER;
                        _interesting = true;
                    } else if (target && target.constructor?.name === 'Cargo') {
                        // Never treat Cargo as a hostile combat target; handled by cargo AI
                        return TARGET_SCORE_INVALID;
                    }
                    break;

                case AI_ROLE.POLICE:
                    if (isPlayer && system?.isPlayerWanted()) {
                        _score += TARGET_SCORE_BASE_WANTED;
                        _interesting = true;
                        //console.log(`%c🔍 POLICE TARGETING WANTED PLAYER: ${enemy.shipTypeName} base score: +${TARGET_SCORE_BASE_WANTED}, score now ${_score}`, 'color:green');
                    } else if (target.isWanted) {
                        _score += TARGET_SCORE_BASE_WANTED;
                        _interesting = true;
                        if (target.role === AI_ROLE.PIRATE) {
                            _score += TARGET_SCORE_WANTED_PIRATE_BONUS;
                        }
                    }
                    break;


                case AI_ROLE.ALIEN:
                    // Aliens target ALL non-alien ships equally - no faction priority
                    if (target.role !== AI_ROLE.ALIEN) {
                        _score += 50; // Base score for any non-alien target (human ships)
                        _interesting = true;
                        // Note: Aliens don't prioritize any specific faction - all humans are equal targets
                    }
                    break;

                case AI_ROLE.HAULER:
                case AI_ROLE.TRANSPORT:
                    if (isPlayer && (isAttacker || enemy.forcedCombatTimer > 0)) {
                        //console.log(`%c🔍 HAULER TARGETING PLAYER: ${enemy.shipTypeName} evaluating player as attacker`, 'color:green');
                        _score += TARGET_SCORE_RETALIATION_HAULER;
                        _interesting = true;

                        if (enemy.hull < enemy.maxHull * 0.5) {
                            _score -= 20;
                            //console.log(`%c🔍 HAULER TARGETING PLAYER: ${enemy.shipTypeName} damaged - may flee instead, score now ${_score}`, 'color:orange');
                        }
                    } else if (isAttacker && !isPlayer) {
                        _score += TARGET_SCORE_RETALIATION_HAULER;
                        _interesting = true;
                        if (enemy.hull < enemy.maxHull * 0.5) _score -= 20;
                    }
                    break;

                case AI_ROLE.COMBAT:
                    // Combat ships prioritize based on faction
                    // Use the faction property set in constructor (no redundant lookups)
                    const myFaction = enemy.faction || 'MILITARY';
                    // For Player targets, use their faction directly; for enemies, use faction property
                    const targetFaction = (target instanceof Player)
                        ? (target.playerFaction || 'UNKNOWN')
                        : (target.faction || 'UNKNOWN');

                    // Military ships prioritize aliens with significant bonus
                    if (myFaction === 'MILITARY' && target.role === AI_ROLE.ALIEN) {
                        _score += TARGET_SCORE_COMBAT_VS_ALIEN_BONUS; // Strong bonus for military vs aliens
                        _interesting = true;
                    }
                    // Imperial and Separatist ships prioritize each other with strong bonus
                    else if ((myFaction === 'IMPERIAL' && targetFaction === 'SEPARATIST') ||
                        (myFaction === 'SEPARATIST' && targetFaction === 'IMPERIAL')) {
                        _score += TARGET_SCORE_COMBAT_RIVALRY_BONUS; // Strong bonus for faction rivalry
                        _interesting = true;
                    }
                    // Standard combat targets - Pirates and Aliens are always valid targets
                    else if (target.role === AI_ROLE.PIRATE || target.role === AI_ROLE.ALIEN) {
                        _score += TARGET_SCORE_COMBAT_STANDARD_ENGAGE; // Standard combat priority
                        _interesting = true;
                    }
                    // IMPORTANT: Don't mark other ships (Police, Haulers, Transports, etc) as interesting
                    // Combat ships should only engage specific threats, not neutral traffic
                    break;
            }

            // Log before distance penalties
            if (isPlayer) {
                //console.log(`%c🔍 DEBUG: Before distance penalties, score is ${_score}`, 'color:purple');
            }

            // Distance penalties - Only if interesting
            if (_interesting) {
                const distance = enemy.distanceTo(target);

                // 1. Base distance penalty (stronger than before)
                let distancePenaltyMult = TARGET_SCORE_DISTANCE_PENALTY_MULT;
                if (isAttacker || isPlayer) {
                    distancePenaltyMult *= 0.6; // Reduced penalty for important targets
                }

                // Calculate penalty with higher cap
                const distancePenalty = Math.min(TARGET_SCORE_DISTANCE_PENALTY_CAP, distance * distancePenaltyMult);

                // Apply penalty with protection for important targets
                if ((isAttacker || isPlayer) && isPlayer) {
                    const minScoreAfterPenalty = 10;
                    const adjustedPenalty = Math.min(distancePenalty, Math.max(0, _score - minScoreAfterPenalty));
                    _score -= adjustedPenalty;
                    //console.log(`%c🔍 PLAYER DISTANCE PENALTY: ${adjustedPenalty.toFixed(1)} (capped from ${distancePenalty.toFixed(1)}), score now ${_score.toFixed(1)}`, 'color:blue');
                } else {
                    _score -= distancePenalty;
                }

                // 2. Proximity bonus - reward targeting nearby enemies
                if (distance < TARGET_SCORE_PROXIMITY_THRESHOLD) {
                    const proximityFactor = 1 - (distance / TARGET_SCORE_PROXIMITY_THRESHOLD);
                    const proximityBonus = proximityFactor * TARGET_SCORE_PROXIMITY_BONUS_MAX;
                    _score += proximityBonus;
                }

                // 3. Ally engagement penalty - encourage target distribution
                // Count same-faction allies already targeting this same target
                if (system?.enemies && enemy._getShipFaction) {
                    const myFaction = enemy._getShipFaction(enemy);
                    let alliesTargetingSame = 0;

                    // OPTIMIZATION: Use spatial hash to find allies near the TARGET (swarming behavior)
                    // instead of iterating all global enemies. Radius 1000 covers most engagement ranges.
                    const potentialAllies = (system.spatialHash && target.pos) ?
                        system.spatialHash.getNearby(target.pos.x, target.pos.y, 1000) :
                        system.enemies;

                    for (let i = 0, len = potentialAllies.length; i < len; i++) {
                        const ally = potentialAllies[i];
                        if (ally === enemy || !ally.target) continue;

                        // Strict check: Must be an Enemy ship (spatial hash contains other things)
                        // and logic must hold: target match + faction match
                        // Also ensure ally is actually an Enemy instance
                        if ((ally instanceof Enemy) && ally.target === target && ally.role) {
                            const allyFaction = enemy._getShipFaction(ally);
                            // Empty string means "no faction" - treat like UNKNOWN
                            if (allyFaction && myFaction && allyFaction === myFaction && myFaction !== 'UNKNOWN') {
                                alliesTargetingSame++;
                            }
                        }
                    }

                    if (alliesTargetingSame > 0) {
                        let allyPenalty = Math.min(
                            TARGET_SCORE_ALLY_ENGAGED_CAP,
                            alliesTargetingSame * TARGET_SCORE_ALLY_ENGAGED_PENALTY
                        );

                        // Scale penalty by distance - ships already close should still engage
                        // Ships far away should have full penalty to prevent convergence
                        const closeEngagementDistance = 200; // Ships within this range can engage despite allies
                        if (distance < closeEngagementDistance) {
                            // Reduce penalty for close ships (linear scale from 0% at 0 distance to 100% at closeEngagementDistance)
                            const distanceScale = distance / closeEngagementDistance;
                            allyPenalty *= distanceScale;
                        }
                        // Ships beyond closeEngagementDistance get full penalty

                        _score -= allyPenalty;
                    }
                }

                // Add hull damage bonus
                if (target.hull !== undefined && target.maxHull !== undefined) {
                    const damagePercent = 1 - (target.hull / target.maxHull);
                    const damageBonus = Math.min(TARGET_SCORE_HULL_DAMAGE_MAX_BONUS, damagePercent * TARGET_SCORE_HULL_DAMAGE_MULT);
                    _score += damageBonus;

                    if (isPlayer && damageBonus > 0) {
                        //console.log(`%c🔍 DEBUG: Added damage bonus ${damageBonus.toFixed(1)}, score now ${_score.toFixed(1)}`, 'color:purple');
                    }
                }
            }

            // Safety check
            if (_score < -1000) {
                //console.error(`🚨 CORRUPT SCORE DETECTED: ${_score}, resetting to 10`);
                _score = 10;
            }

            // Mark uninteresting if score too low
            if (_interesting && _score <= 0) {
                if (isPlayer) {
                    //console.log(`%c🔍 PLAYER TARGET REJECTED: Score too low (${_score})`, 'color:orange');
                }
                _interesting = false;
            }

            // Final debug log
            if (isPlayer) {
                //console.log(`%c🔍 FINAL PLAYER SCORE: ${enemy.shipTypeName} rates player at ${_score.toFixed(1)} (interesting: ${_interesting})`, _interesting ? 'color:green; font-weight:bold' : 'color:orange');
            }

            // Return appropriate final score
            if (!_interesting) {
                return TARGET_SCORE_INVALID;
            }

            return _score;
        })(this, target, system); // Pass current context to IIFE
    }
}

// Apply targeting methods to Enemy prototype
// This will be called after Enemy class is defined
function applyEnemyTargetingMethods() {
    if (typeof Enemy === 'undefined') {
        console.error('Enemy class not found - cannot apply targeting methods');
        return;
    }

    // Copy all methods from EnemyTargeting to Enemy prototype
    Object.getOwnPropertyNames(EnemyTargeting.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyTargeting.prototype[methodName];
        }
    });
}
