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
        // --- OPTIMIZATION: Hoist rank modifiers to avoid redundant calls ---
        const rankMods = this._getRankModifiers ? this._getRankModifiers() : null;

        // --- OFF-SCREEN OPTIMIZATION ---
        if (this._isOnScreen === false) {
            // Periodic Scan Override: Ensure we don't stay "blind" to new nearby enemies forever.
            // RANK-BASED VIGILANCE: Elites scan more often than Rookies
            const scanIntervalSeconds = rankMods?.scanInterval ?? DEFAULT_SCAN_INTERVAL;

            // Initialize timer if needed
            if (this.offScreenTargetTimer === undefined) {
                this.offScreenTargetTimer = Math.random() * scanIntervalSeconds;
            }

            // Accumulate time
            const dt = (typeof deltaTime === 'number') ? deltaTime / 1000 : DEFAULT_DELTA_SECONDS;
            this.offScreenTargetTimer += dt;

            const isScanFrame = this.offScreenTargetTimer >= scanIntervalSeconds;

            if (isScanFrame) {
                this.offScreenTargetTimer %= scanIntervalSeconds;
            }

            if (!isScanFrame) {
                // Throttled: Only maintain existing engagement
                if (this.lastAttacker && this.isTargetValid(this.lastAttacker)) {
                    this.target = this.lastAttacker;
                    return true;
                }
                if (this.target && this.isTargetValid(this.target)) {
                    return true;
                }
                // No current engagement and not a scan frame - stay dormant
                return false;
            }

            // --- SCAN FRAME: Sensor sweep for new targets ---

            // 1. Check Player (High Priority Acquisition)
            const isHostileToPlayer = (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.ALIEN || this.role === AI_ROLE.BOUNTY_HUNTER);
            const isPoliceVsWanted = (this.role === AI_ROLE.POLICE || this.role === AI_ROLE.GUARD) && system.player && system.player.isWanted;

            // Track if we already checked player to avoid redundant evaluation in main loop
            this._playerAlreadyChecked = false;

            if ((isHostileToPlayer || isPoliceVsWanted) && system.player && this.isTargetValid(system.player)) {
                // RANK-BASED SENSOR CUTOFF
                const sensorMult = rankMods?.longRangeSensorMultiplier ?? 2.5;
                const sensorMaxDistSq = Math.pow(this.detectionRange * sensorMult, 2);

                const dx = this.pos.x - system.player.pos.x;
                const dy = this.pos.y - system.player.pos.y;
                const d2 = dx * dx + dy * dy;

                this._playerAlreadyChecked = true; // Mark checked regardless of range

                if (d2 < sensorMaxDistSq) {
                    this.target = system.player;
                    return true;
                }
            }

            // If no player found, we FALL THROUGH to the main targeting logic below
            // which will use Spatial Hash to find NPC rivals. This is more efficient
            // than the previous manual iteration of system.enemies.
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

        // --- BOUNTY HUNTER: Target assigned bountyTarget, or wanted player ---
        if (this.role === AI_ROLE.BOUNTY_HUNTER) {
            // If contract is already completed, head to jump zone
            // [FIX] Allow self-defense: Only force leaving if NOT currently in combat
            if (this.hasCompletedContract && !this.inCombat) {
                this.target = null;
                if (this.currentState !== AI_STATE.LEAVING_SYSTEM) {
                    // setLeavingSystemTarget internally calls changeState
                    this.setLeavingSystemTarget(system);
                }
                return false;
            }

            // Check if assigned bounty target is still valid
            if (this.bountyTarget) {
                if (this.isTargetValid(this.bountyTarget)) {
                    if (this.target !== this.bountyTarget) {
                        this.target = this.bountyTarget;
                    }
                    return true;
                } else {
                    // Target destroyed - contract complete, time to leave
                    this.hasCompletedContract = true;
                    this.bountyTarget = null;
                    this.target = null;
                    // setLeavingSystemTarget internally calls changeState
                    if (system) {
                        this.setLeavingSystemTarget(system);
                    } else {
                        this.changeState(AI_STATE.LEAVING_SYSTEM);
                    }
                    AI_LOG(`${this.shipTypeName} (Bounty Hunter): Contract complete, leaving system.`);
                    return false;
                }
            }

            // No assigned target - only target player if they are wanted
            const playerRef = system.player || this.target;
            if (playerRef instanceof Player && this.isTargetValid(playerRef)) {
                // CRITICAL FIX: Only target player if they are wanted
                const playerIsWanted = playerRef.isWanted || (system && system.isPlayerWanted && system.isPlayerWanted());
                if (playerIsWanted) {
                    if (this.target !== playerRef) {
                        this.target = playerRef;
                    }
                    return true;
                }
            }

            // No valid target - bounty hunters don't attack non-wanted ships
            this.target = null;
            return false;
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

        // Evaluate Player (with debug) - Skip if already checked in off-screen branch
        if (!this._playerAlreadyChecked) {
            const playerRef = system.player || this.target;
            if (playerRef instanceof Player && playerRef !== bestTarget && this.isTargetValid(playerRef)) {
                const playerScore = this.evaluateTargetScore(playerRef, system);
                if (playerScore > bestScore) {
                    bestScore = playerScore;
                    bestTarget = playerRef;
                }
            }
        }
        // Reset flag for next targeting cycle
        this._playerAlreadyChecked = false;

        // Evaluate other enemies (optimized with spatial hash)
        const canTargetOtherEnemies = (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.ALIEN || this.role === AI_ROLE.COMBAT);
        if (canTargetOtherEnemies && system.enemies && system.enemies.length > 0) {
            const isAlien = this.role === AI_ROLE.ALIEN;

            // Use spatial hash if available for O(1) nearby lookup
            // MISSION-CRITICAL FIX: Use rank-based detectionRange instead of hardcoded radius
            // NOTE: rankMods already calculated at top of function
            const sensorMult = rankMods?.longRangeSensorMultiplier ?? 2.0;
            const rawTargetingRadius = (this.detectionRange * sensorMult) || (this.weaponRange || 400) + 200;
            const targetingRadius = Math.min(rawTargetingRadius, MAX_TARGETING_RADIUS); // Cap to prevent overflow
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
                    this._summonFactionAlliesForTarget(system, bestTarget);

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
                    this._summonFactionAlliesForTarget(system, bestTarget);

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

    _summonFactionAlliesForTarget(system, target) {
        if (this.role !== AI_ROLE.COMBAT || !system?.enemies || !this._getShipFaction || !target) return;

        const myFaction = this._getShipFaction(this);
        if (!myFaction || myFaction === 'UNKNOWN') return;

        const targetFaction = (target instanceof Player)
            ? (target.playerFaction || 'UNKNOWN')
            : (this._getShipFaction(target) || 'UNKNOWN');
        const isFactionRivalTarget = (myFaction === 'IMPERIAL' && targetFaction === 'SEPARATIST') ||
            (myFaction === 'SEPARATIST' && targetFaction === 'IMPERIAL');
        const isMilitaryAlienTarget = myFaction === 'MILITARY' && target.role === AI_ROLE.ALIEN;
        const isSharedThreatTarget = target.role === AI_ROLE.PIRATE || target.role === AI_ROLE.ALIEN;
        if (!isFactionRivalTarget && !isMilitaryAlienTarget && !isSharedThreatTarget) return;

        const summonRadius = COMBAT_ALLY_SUMMON_RADIUS;
        const summonRadiusSq = summonRadius * summonRadius;

        for (let i = 0, len = system.enemies.length; i < len; i++) {
            const ally = system.enemies[i];
            if (!(ally instanceof Enemy) || ally === this || ally.destroyed) continue;
            if (ally.role !== AI_ROLE.COMBAT || !ally.isTargetValid || !ally.isTargetValid(target)) continue;

            const allyFaction = this._getShipFaction(ally);
            if (!allyFaction || allyFaction !== myFaction) continue;

            if (ally.target && ally.isTargetValid(ally.target)) continue;

            if (ally.pos && this.pos) {
                const dx = ally.pos.x - this.pos.x;
                const dy = ally.pos.y - this.pos.y;
                if ((dx * dx + dy * dy) > summonRadiusSq) continue;
            }

            ally.target = target;
            ally.targetSwitchCooldown = Math.max(ally.targetSwitchCooldown || 0, COMBAT_SUMMON_TARGET_COOLDOWN);
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

            // --- RANGE CHECK: Do not acquire targets beyond detection range ---
            // EXCEPTIONS: 
            // 1. Current target (tracking is more persistent than acquisition)
            // 2. Active attackers (retaliation logic)
            // 3. Mission targets (special awareness)
            // 4. Guard principal defense
            const dx = enemy.pos.x - target.pos.x;
            const dy = enemy.pos.y - target.pos.y;
            const distSq = dx * dx + dy * dy;
            const _isAttacker = (enemy.attackerHistory && enemy.attackerHistory.has(target)) || (target === enemy.lastAttacker);
            const isCurrentTarget = target === enemy.target;

            // Get mission status once
            let isMissionTarget = false;
            if (enemy.role === AI_ROLE.BOUNTY_HUNTER && enemy.bountyTarget === target) isMissionTarget = true;
            if (system?.player === target && system?.isMissionTarget?.(enemy, target)) isMissionTarget = true;

            // Guard Principal Attacker Exception
            let isPrincipalAttacker = false;
            if (enemy.role === AI_ROLE.GUARD && enemy.principal && enemy.isTargetValid(enemy.principal) && enemy.principal.lastAttacker === target) {
                // Guards "hear" the distress call from their principal, bypassing distance limits for acquisition
                isPrincipalAttacker = true;
            }

            // Use Rank-based Sensor Cutoff (Long Range Sensors)
            const rankMods = enemy._getRankModifiers ? enemy._getRankModifiers() : null;
            const sensorMult = rankMods?.longRangeSensorMultiplier ?? 2.0;
            const maxAcquisitionDistSq = Math.pow(enemy.detectionRange * sensorMult, 2);

            const isAcquisitionExempt = isCurrentTarget || _isAttacker || isMissionTarget || isPrincipalAttacker;

            if (!isAcquisitionExempt && distSq > maxAcquisitionDistSq) {
                return TARGET_SCORE_INVALID;
            }

            // Never target asteroids - collisions with asteroids should not trigger combat
            if (target && target.constructor && target.constructor.name === 'Asteroid') {
                return TARGET_SCORE_INVALID;
            }

            // --- GUARD: Prioritize Principal's Attacker (with friendly fire prevention) ---
            if (enemy.role === AI_ROLE.GUARD && enemy.principal) {
                // FRIENDLY FIRE PREVENTION: Never target principal (applies even when principal is docked/cloaked)
                if (target === enemy.principal) {
                    return TARGET_SCORE_INVALID;
                }

                // FRIENDLY FIRE PREVENTION: Never target fellow guards protecting same principal
                if (target.role === AI_ROLE.GUARD && target.principal === enemy.principal) {
                    return TARGET_SCORE_INVALID;
                }

                // Active combat logic requires the principal to be a valid (non-docked, non-cloaked) target
                if (enemy.isTargetValid(enemy.principal)) {
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
                    // (principal and fellow guards are already blocked by the checks above)
                    if (target === enemy.lastAttacker) {
                        return 1500; // High score for self-defense, but lower than principal defense
                    }
                }

                // Otherwise, guards don't pick fights - return invalid
                return TARGET_SCORE_INVALID;
            }

            // FRIENDLY FIRE PREVENTION: Principals never target their own guards
            if (target.role === AI_ROLE.GUARD && target.principal === enemy) {
                return TARGET_SCORE_INVALID;
            }
            // --- END GUARD ---

            // --- BOUNTY HUNTER: Target assigned bountyTarget or default to player ---
            if (enemy.role === AI_ROLE.BOUNTY_HUNTER) {
                // Assigned bounty target gets highest priority
                if (enemy.bountyTarget && target === enemy.bountyTarget) {
                    return TARGET_SCORE_BOUNTY_CONTRACT; // 1000
                }
                // No assigned target - fall back to player (backward compatibility)
                if (!enemy.bountyTarget && target instanceof Player) {
                    return TARGET_SCORE_BOUNTY_CONTRACT;
                }
                // Ignore everything else
                return TARGET_SCORE_INVALID;
            }
            // --- END BOUNTY HUNTER ---

            // Create completely private scoring variables
            let _score = 0;
            let _interesting = false;

            // --- PERSISTENCE: Maintain interest in current target or attackers ---
            if (target === enemy.target || _isAttacker) {
                _score += TARGET_SCORE_CURRENT_TARGET_BONUS;
                _interesting = true;
            }
            // Robust check: instanceof Player OR explicit flag (useful for tests/mixins)
            const isPlayer = (typeof Player !== 'undefined' && target instanceof Player) || (target && target.isPlayer === true);

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
                    } else if (target.role === AI_ROLE.HAULER || target.role === AI_ROLE.TRANSPORT || target.role === AI_ROLE.MINER || target.role === AI_ROLE.MISSIONARY) {
                        // Pirates prey on commerce ships and missionaries (easy targets)
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
                const distance = Math.sqrt(distSq); // OPTIMIZATION: Reuse distSq from line ~490

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

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyTargeting, applyEnemyTargetingMethods };
    global.EnemyTargeting = EnemyTargeting;
    global.applyEnemyTargetingMethods = applyEnemyTargetingMethods;
}
