// ****** enemyStateMachine.js ******
// Enemy State Machine Logic
// Handles AI state transitions and state-specific behaviors

/**
 * Enemy state machine methods as a mixin class
 * These methods handle state transitions and state-specific behaviors
 */
class EnemyStateMachine {
    /**
     * Gets delta time in seconds, safely handling undefined/invalid deltaTime
     * @return {number} Delta time in seconds
     * @private
     */
    _getDeltaSeconds() {
        return (typeof deltaTime === 'number' && isFinite(deltaTime)) ? (deltaTime / 1000) : DEFAULT_DELTA_SECONDS;
    }

    /**
     * Gets grudge-adjusted reposition chance (lower = more aggressive)
     * @param {Object} target - The target to check grudge against
     * @param {boolean} isAttackPass - If true, use ATTACK_PASS values (slightly higher chances)
     * @return {number} Probability (0-1) of choosing to reposition vs attack
     * @private
     */
    _getGrudgeBasedRepositionChance(target, isAttackPass = false) {
        const grudgeLevel = this._getGrudgeLevel ? this._getGrudgeLevel(target) : 0;

        if (isAttackPass) {
            // ATTACK_PASS uses slightly higher reposition chances
            if (grudgeLevel >= GRUDGE_LEVEL_5) return ATTACK_PASS_REPOSITION_AT_GRUDGE_5;
            if (grudgeLevel >= GRUDGE_LEVEL_4) return ATTACK_PASS_REPOSITION_AT_GRUDGE_4;
            if (grudgeLevel >= GRUDGE_LEVEL_3) return ATTACK_PASS_REPOSITION_AT_GRUDGE_3;
            if (grudgeLevel >= GRUDGE_LEVEL_2) return ATTACK_PASS_REPOSITION_AT_GRUDGE_2;
            return ATTACK_PASS_REPOSITION_AT_NO_GRUDGE;
        } else {
            // SNIPING uses lower reposition chances (more aggressive)
            if (grudgeLevel >= GRUDGE_LEVEL_5) return SNIPING_REPOSITION_AT_GRUDGE_5;
            if (grudgeLevel >= GRUDGE_LEVEL_4) return SNIPING_REPOSITION_AT_GRUDGE_4;
            if (grudgeLevel >= GRUDGE_LEVEL_3) return SNIPING_REPOSITION_AT_GRUDGE_3;
            if (grudgeLevel >= GRUDGE_LEVEL_2) return SNIPING_REPOSITION_AT_GRUDGE_2;
            return SNIPING_REPOSITION_CHANCE;
        }
    }

    /**
     * Gets grudge-adjusted tactic change chance (higher = more restless)
     * @param {Object} target - The target to check grudge against
     * @return {number} Probability (0-1) of changing tactics
     * @private
     */
    _getGrudgeBasedTacticChance(target) {
        const grudgeLevel = this._getGrudgeLevel ? this._getGrudgeLevel(target) : 0;
        if (grudgeLevel >= GRUDGE_LEVEL_5) return TACTIC_CHANGE_AT_GRUDGE_5;
        if (grudgeLevel >= GRUDGE_LEVEL_4) return TACTIC_CHANGE_AT_GRUDGE_4;
        if (grudgeLevel >= GRUDGE_LEVEL_3) return TACTIC_CHANGE_AT_GRUDGE_3;
        if (grudgeLevel >= GRUDGE_LEVEL_2) return TACTIC_CHANGE_AT_GRUDGE_2;
        return SNIPING_TACTIC_CHANGE_CHANCE;
    }

    /**
     * Updates combat state based on current AI state
     * Routes to appropriate state handler method
     * @param {boolean} targetExists - Whether a valid target exists
     * @param {number} distanceToTarget - Distance to current target
     */
    updateCombatState(targetExists, distanceToTarget) {
        switch (this.currentState) {
            case AI_STATE.IDLE:
                this._updateState_IDLE(targetExists);
                break;
            case AI_STATE.APPROACHING:
                this._updateState_APPROACHING(targetExists, distanceToTarget);
                break;
            case AI_STATE.ATTACK_PASS:
                this._updateState_ATTACK_PASS(targetExists);
                break;
            case AI_STATE.REPOSITIONING:
                this._updateState_REPOSITIONING(targetExists, distanceToTarget);
                break;
            case AI_STATE.PATROLLING:
                this._updateState_PATROLLING(targetExists, distanceToTarget);
                break;
            case AI_STATE.FLEEING:
                this._updateState_FLEEING(targetExists, distanceToTarget);
                break;
            case AI_STATE.SNIPING:
                this._updateState_SNIPING(targetExists, distanceToTarget);
                break;
            case AI_STATE.GUARDING:
                this._updateState_GUARDING();
                break;
            default:
                // Non-combat states (TRANSPORTING, COLLECTING_CARGO, NEAR_STATION, LEAVING_SYSTEM)
                // are handled by their respective role AI methods, not the combat state machine
                break;
        }
    }

    /**
     * Handles IDLE state logic
     * Transitions to APPROACHING if target exists, or GUARDING for guards with principal
     * Also prevents ships from being "sitting ducks" after fleeing
     * @param {boolean} targetExists - Whether a valid target exists
     * @private
     */
    _updateState_IDLE(targetExists) {
        const rankMods = this._getRankModifiers();
        const fleeDelay = rankMods?.fleeDecisionDelay ?? 0;
        const defaultIdleFleeThreshold = (typeof IDLE_FLEE_HULL_THRESHOLD !== 'undefined') ? IDLE_FLEE_HULL_THRESHOLD : 0.4;
        const fleeThreshold = rankMods?.fleeHullThreshold ?? defaultIdleFleeThreshold;

        const shouldFleeForLowHull = this.hull < this.maxHull * fleeThreshold;
        const hasFleeDelayElapsed = () => {
            if (!this._fleeDecisionStart) {
                this._fleeDecisionStart = millis();
            }
            return millis() - this._fleeDecisionStart > fleeDelay * 1000;
        };

        if (shouldFleeForLowHull) {
            if (hasFleeDelayElapsed()) {
                this.changeState(AI_STATE.FLEEING);
                return;
            }
        } else {
            this._fleeDecisionStart = null; // Reset if no longer fleeing
        }

        if (this.immobilized) return;

        if (targetExists) {
            this.changeState(AI_STATE.APPROACHING);
            return;
        }

        // Guards should return to guarding
        if (this.role === AI_ROLE.GUARD && this.isPrincipalValid(this.principal)) {
            this.changeState(AI_STATE.GUARDING);
            return;
        }

        // ANTI-SITTING-DUCK: If we have a lastAttacker that's still valid, react to it
        if (this.lastAttacker && this.isTargetValid(this.lastAttacker)) {
            const distToAttacker = this.distanceTo(this.lastAttacker);
            const now = millis();
            const recentlyDamaged = this.lastAttackTime && (now - this.lastAttackTime < 4000);

            // If attacker is close, we need to do something
            if (distToAttacker < this.detectionRange || recentlyDamaged) {
                // Low hull should respect the same delayed flee decision as the primary IDLE path.
                if (shouldFleeForLowHull) {
                    this.target = this.lastAttacker;
                    return;
                }
                // Otherwise, engage if we're armed OR if we are a Healer (who should stay and support)
                // Healers are technically "unarmed" (Barrier only) but should not flee immediately.
                if (this.isArmed() || this.role === AI_ROLE.HEALER) {
                    this.target = this.lastAttacker;
                    this.changeState(AI_STATE.APPROACHING);
                    return;
                }
                // Unarmed? Flee
                this.target = this.lastAttacker;
                if (hasFleeDelayElapsed()) {
                    this.changeState(AI_STATE.FLEEING);
                }
                return;
            }
        }

        // Otherwise, remains IDLE but apply gentle drift to avoid being completely static
        // This makes ships less predictable even when idle
    }

    /**
     * Helper to determine default state when losing target
     * Guards return to GUARDING, Police to PATROLLING, Bounty Hunters leave after contract, others to IDLE
     * @return {number} AI_STATE constant for default state
     * @private
     */
    _getDefaultStateForRole() {
        // Bounty hunters leave after completing their contract
        if (this.role === AI_ROLE.BOUNTY_HUNTER && this.hasCompletedContract) {
            return AI_STATE.LEAVING_SYSTEM;
        }
        if (this.role === AI_ROLE.GUARD && this.isPrincipalValid(this.principal)) {
            return AI_STATE.GUARDING;
        } else if (this.role === AI_ROLE.GUARD) {
            // Guard without valid principal - depart the system
            return AI_STATE.LEAVING_SYSTEM;
        } else if (this.role === AI_ROLE.POLICE) {
            return AI_STATE.PATROLLING;
        } else {
            return AI_STATE.IDLE;
        }
    }

    /**
     * Handles SNIPING state logic
     * Maintains optimal range for sniping weapons, transitions based on distance and damage
     * @param {boolean} targetExists - Whether a valid target exists
     * @param {number} distanceToTarget - Distance to current target
     * @private
     */
    _updateState_SNIPING(targetExists, distanceToTarget) {
        if (!targetExists) {
            this.changeState(this._getDefaultStateForRole());
            return;
        }

        // --- EXIT SNIPING if target is beyond weapon range ---
        const maxSnipingRange = (this.visualFiringRange || this.firingRange) * SNIPING_EXIT_MAX_FACTOR;
        if (distanceToTarget > maxSnipingRange) {
            AI_LOG(`${this.shipTypeName} (SNIPING): Target beyond range (${distanceToTarget.toFixed(0)} > ${maxSnipingRange.toFixed(0)}). Switching to APPROACHING.`);
            this.changeState(AI_STATE.APPROACHING);
            return;
        }
        // --- END RANGE CHECK ---

        // --- Check for significant damage taken (shield + hull) while sniping ---
        if (this.shieldPlusHullAtStateEntry !== null) {
            const totalMaxHealth = this.maxShield + this.maxHull;
            if (totalMaxHealth > 0) { // Ensure totalMaxHealth is positive
                const combinedHealthDropThreshold = totalMaxHealth * SNIPING_HULL_DROP_EXIT_PERCENT;
                const currentCombinedHealth = this.shield + this.hull;

                if (currentCombinedHealth < this.shieldPlusHullAtStateEntry - combinedHealthDropThreshold) {
                    AI_LOG(`${this.shipTypeName} (SNIPING): Took significant damage. Switching to ATTACK_PASS.`);
                    this.changeState(AI_STATE.ATTACK_PASS);
                    return; // Exit early after state change
                }
            }
        }
        // --- END NEW ---

        // RANK-BASED FLEE THRESHOLD: Rookies stubborn, Elites flee early
        const rankMods = this._getRankModifiers();
        const fleeThreshold = rankMods?.fleeHullThreshold ?? SNIPING_FLEE_HULL_THRESHOLD;

        // Flee if damaged
        if (this.hull < this.maxHull * fleeThreshold) {
            this.changeState(AI_STATE.FLEEING);
            return;
        }

        // Tactical decision timer - periodically consider switching tactics
        // GRUDGE-BASED: Higher grudge = faster decision checks (more restless)
        const grudgeLevel = this._getGrudgeLevel ? this._getGrudgeLevel(this.target) : 0;
        const baseTimerMin = Math.max(0.5, GRUDGE_DECISION_TIMER_MIN_BASE - grudgeLevel * GRUDGE_TIMER_MIN_REDUCTION_PER_LEVEL);
        const baseTimerMax = Math.max(1.5, GRUDGE_DECISION_TIMER_MAX_BASE - grudgeLevel * GRUDGE_TIMER_MAX_REDUCTION_PER_LEVEL);
        const decisionIntervalMult = rankMods?.decisionIntervalMultiplier ?? 1.0;
        const adjustedTimerMin = Math.max(0.2, baseTimerMin * decisionIntervalMult);
        const adjustedTimerMax = Math.max(adjustedTimerMin + 0.1, baseTimerMax * decisionIntervalMult);

        if (this._snipingDecisionTimer === null || this._snipingDecisionTimer === undefined) {
            this._snipingDecisionTimer = random(adjustedTimerMin, adjustedTimerMax);
        }
        this._snipingDecisionTimer = Math.max(0, this._snipingDecisionTimer - this._getDeltaSeconds());

        if (this._snipingDecisionTimer <= 0) {
            this._snipingDecisionTimer = random(adjustedTimerMin, adjustedTimerMax);

            const tacticChangeChance = this._getGrudgeBasedTacticChance(this.target);
            const repositionChance = this._getGrudgeBasedRepositionChance(this.target);

            // RANK-BASED TACTIC ADAPTATION: Rookies static, Elites dynamic
            const tacticMult = rankMods?.tacticChangeMultiplier ?? 1.0;
            const adjustedTacticChance = tacticChangeChance * tacticMult;

            if (random() < adjustedTacticChance) {
                if (random() < repositionChance) {
                    // Reposition to a new angle
                    let stateData = {};
                    let v = p5.Vector.sub(this.pos, this.target.pos);
                    v.rotate(random(-PI / 2, PI / 2)); // Shift angle randomly
                    v.setMag(this.repositionDistance * random(0.8, 1.2));
                    stateData.repositionTarget = p5.Vector.add(this.pos, v);
                    this.changeState(AI_STATE.REPOSITIONING, stateData);
                } else {
                    // Do an aggressive attack pass
                    AI_LOG(`${this.shipTypeName} (SNIPING): Grudge ${grudgeLevel} triggers attack pass!`);
                    this.changeState(AI_STATE.ATTACK_PASS);
                }
            }
        }
        // Otherwise, stay in SNIPING state. Movement and firing are handled by
        // getMovementTargetForState, performRotationAndThrust, and performFiring.
    }

    /**
     * Handles APPROACHING state logic
     * Transitions to SNIPING or ATTACK_PASS based on range and weapon capabilities
     * Also detects "kiting" - abandons pursuit if taking too much damage while chasing
     * @param {boolean} targetExists - Whether a valid target exists
     * @param {number} distanceToTarget - Distance to current target
     * @private
     */
    _updateState_APPROACHING(targetExists, distanceToTarget) {
        if (!targetExists) {
            this.changeState(this._getDefaultStateForRole());
            return;
        }

        // Get rank modifiers once for this function (avoid duplication and shadowing)
        const rankMods = this._getRankModifiers();

        // --- Kiting detection: abandon pursuit if taking heavy damage while chasing ---
        if (this.shieldPlusHullAtStateEntry !== null) {
            const totalMaxHealth = this.maxShield + this.maxHull;
            if (totalMaxHealth > 0) {
                // RANK-BASED PURSUIT: Rookies chase suicidally, Elites disengage tactically
                const pursuitMult = rankMods?.pursuitAbandonMultiplier ?? 1.0;
                const effectiveThreshold = totalMaxHealth * APPROACH_PURSUIT_ABANDON_THRESHOLD * pursuitMult;

                const currentHealth = this.shield + this.hull;
                if (currentHealth < this.shieldPlusHullAtStateEntry - effectiveThreshold) {
                    AI_LOG(`${this.shipTypeName} (APPROACHING): Lost ${APPROACH_PURSUIT_ABANDON_THRESHOLD * 100}% health while pursuing. Abandoning pursuit.`);
                    this.changeState(AI_STATE.FLEEING);
                    return;
                }
            }
        }

        // Tactical decision: Snipe (stationary turret) or Attack Pass (dynamic movement)
        // Choose sniping if we have suitable weapons and a random tactical choice
        const snipingChanceMult = rankMods?.snipingChanceMultiplier ?? 1.0;
        const shouldSnipe = this.hasGoodSnipingWeapon() &&
            random() < constrain(SNIPE_VS_ATTACK_CHANCE * snipingChanceMult, 0, 1);

        // RANK-BASED ENGAGE DISTANCE: Rookies get too close, Elites maintain range
        const distMult = rankMods?.engageDistanceMultiplier ?? 1.0;
        const effectiveEngageDistance = this.engageDistance * distMult;

        if (distanceToTarget < effectiveEngageDistance) {
            if (shouldSnipe) {
                this.changeState(AI_STATE.SNIPING);
            } else {
                this.changeState(AI_STATE.ATTACK_PASS);
            }
        }
        // Otherwise, continue approaching.
    }

    /**
     * Handles ATTACK_PASS state logic
     * Manages attack run timer and transitions after pass completion
     * @param {boolean} targetExists - Whether a valid target exists
     * @private
     */
    _updateState_ATTACK_PASS(targetExists) {
        if (!targetExists) {
            this.changeState(this._getDefaultStateForRole());
            return;
        }
        this.passTimer = Math.max(0, this.passTimer - this._getDeltaSeconds());
        if (this.passTimer <= 0) {
            // After attack pass completion, make a tactical decision
            if (this.isTargetValid(this.target)) {
                const repositionChance = this._getGrudgeBasedRepositionChance(this.target, true);
                const grudgeLevel = this._getGrudgeLevel ? this._getGrudgeLevel(this.target) : 0;

                if (random() < repositionChance) {
                    // Reposition after attack
                    let stateData = {};
                    let v = p5.Vector.sub(this.pos, this.target.pos);
                    v.setMag(this.repositionDistance * 1.5);
                    stateData.repositionTarget = p5.Vector.add(this.pos, v);
                    AI_LOG(`${this.shipTypeName}: Attack pass complete, repositioning (grudge: ${grudgeLevel})`);
                    this.changeState(AI_STATE.REPOSITIONING, stateData);
                } else {
                    // Go directly back to approaching state for another attack run
                    AI_LOG(`${this.shipTypeName}: Attack pass complete, resuming approach (grudge: ${grudgeLevel})`);
                    this.changeState(AI_STATE.APPROACHING);
                }
            } else {
                // If target is no longer valid, go to appropriate default state
                this.changeState(this._getDefaultStateForRole());
            }
        }
    }

    /**
     * Handles REPOSITIONING state logic
     * Moves to tactical position and transitions based on distance and range
     * @param {boolean} targetExists - Whether a valid target exists
     * @param {number} distanceToTarget - Distance to current target
     * @private
     */
    _updateState_REPOSITIONING(targetExists, distanceToTarget) {
        if (!targetExists) {
            this.changeState(this._getDefaultStateForRole());
            return;
        }

        let distToRepo = this.repositionTarget
            ? this.distanceTo(this.repositionTarget)
            : Infinity;

        // Reached repositioning point - choose next tactic
        if (distToRepo < REPOSITION_DISTANCE_THRESHOLD || distanceToTarget > this.repositionDistance * 0.9) {
            // Tactical choice: snipe or approach for another pass
            const shouldSnipe = this.hasGoodSnipingWeapon() &&
                random() < REPOSITION_SNIPE_CHANCE;

            if (shouldSnipe) {
                this.changeState(AI_STATE.SNIPING);
            } else {
                this.changeState(AI_STATE.APPROACHING);
            }
            return;
        }
    }

    /**
     * Handles PATROLLING state logic
     * Transitions to APPROACHING when target detected or GUARDING if principal exists
     * @param {boolean} targetExists - Whether a valid target exists
     * @param {number} distanceToTarget - Distance to current target
     * @private
     */
    _updateState_PATROLLING(targetExists, distanceToTarget) {
        const now = millis();
        const rankMods = this._getRankModifiers();
        const spottingDelay = rankMods?.targetSpottingDelay ?? 0;
        const recentlyDamaged = this.lastAttackTime && (now - this.lastAttackTime < 4000);
        const isRecentAttackerTarget = targetExists && this.lastAttacker && this.target === this.lastAttacker && recentlyDamaged;

        // Recent attacker targets should bypass spotting cadence to prevent delayed retaliation.
        if (isRecentAttackerTarget) {
            this.changeState(AI_STATE.APPROACHING);
            return;
        }

        if (!this._lastSpottingCheck || now - this._lastSpottingCheck > spottingDelay * 1000) {
            this._lastSpottingCheck = now;

            if (targetExists && distanceToTarget < this.detectionRange) {
                this.changeState(AI_STATE.APPROACHING);
                return;
            }
        }

        // If patrolling and a principal is assigned, switch to GUARDING
        if (this.role === AI_ROLE.GUARD && this.isPrincipalValid(this.principal)) {
            this.changeState(AI_STATE.GUARDING);
        }
    }

    /**
     * Handles GUARDING state logic
     * Protects principal and follows them through system jumps
     * @private
     */
    _updateState_GUARDING() {
        const principal = this.principal;
        const system = this.getSystem() || this.currentSystem;
        const rankMods = this._getRankModifiers();
        const guardReactionMultiplier = Math.min(Math.max(rankMods?.guardReactionTimeMultiplier ?? 1.0, 0.1), 2.0); // Clamp multiplier

        if (this.guardReactionTime > 0) {
            // Multiplier scales cooldown duration (0.8 = faster, 1.6 = slower).
            this.guardReactionTime = Math.max(0, this.guardReactionTime - (this._getDeltaSeconds() / guardReactionMultiplier));
        }

        const principalValid = this.isPrincipalValid(principal);
        if (!principalValid) {
            AI_LOG(`${this.shipTypeName} (Guard): Principal is invalid/destroyed. Reverting to default state.`);
            this.principal = null;
            this.changeState(this._getDefaultStateForRole());
            return;
        }

        // Follow principal ONLY if they have actually jumped to a different system
        // Do NOT prematurely head to jump zone just because principal is nearby
        // Note: Player instances don't have AI_STATE - only check if they're in a different system
        const principalSystem = principal.currentSystem;
        const principalInDifferentSystem = principalSystem && principalSystem !== this.currentSystem;

        // Only follow if principal is ACTUALLY in a different system (not just approaching jump zone)
        if (principalInDifferentSystem) {
            if (system?.jumpZoneCenter) {
                AI_LOG(`${this.shipTypeName} (Guard): Principal has jumped to another system. Following...`);
                this.setLeavingSystemTarget(system);
                this.changeState(AI_STATE.LEAVING_SYSTEM);

                if (system.jumpZoneCenter) {
                    this.tempVector.set(
                        system.jumpZoneCenter.x - this.pos.x,
                        system.jumpZoneCenter.y - this.pos.y
                    );
                    if (this.tempVector.magSq() > 0.0001) {
                        this.tempVector.normalize().mult(this.maxSpeed * 0.7);
                        this.vel.add(this.tempVector);
                    }
                }
            } else {
                AI_LOG(`${this.shipTypeName} (Guard): Principal left but no jump zone data. Standing down.`);
                this.principal = null;
                this.changeState(this._getDefaultStateForRole());
            }
            return;
        }

        const guardDistance = (principal.size || 10) * 3;
        const principalAttacker = principal.lastAttacker;
        const timeSincePrincipalAttack = principal.lastAttackTime ? millis() - principal.lastAttackTime : Infinity;

        if (this.guardReactionTime <= 0 &&
            principalAttacker &&
            principalAttacker !== this &&
            this.isTargetValid(principalAttacker) &&
            timeSincePrincipalAttack < GUARD_PRINCIPAL_ATTACK_WINDOW_MS) {

            const distToAttacker = this.distanceTo(principalAttacker);
            if (distToAttacker < this.guardEngageRange) {
                AI_LOG(`${this.shipTypeName} (Guard): Principal under attack! Engaging ${principalAttacker.shipTypeName || 'attacker'}.`);
                this.target = principalAttacker;
                // Maintain a short engagement lock to prevent target/idle flicker
                this.guardEngagementLock = Math.max(this.guardEngagementLock || 0, GUARD_ENGAGEMENT_LOCK_DURATION);
                this.changeState(AI_STATE.APPROACHING);
                this.guardReactionTime = GUARD_REACTION_COOLDOWN;
                return;
            }
        }

        // If we have a lingering target, decide whether to keep pursuing it
        if (this.target && this.isTargetValid(this.target)) {
            const threatToPrincipalDist = (this.target.pos && principal.pos)
                ? p5.Vector.dist(this.target.pos, principal.pos)
                : Infinity;

            if (threatToPrincipalDist < guardDistance * 2) {
                // Only switch to APPROACHING if we don't already have an active engagement lock
                // This prevents rapid state switching (jitter) when we're already engaged
                if (this.guardEngagementLock <= 0) {
                    this.guardEngagementLock = GUARD_ENGAGEMENT_LOCK_DURATION; // Set engagement lock when switching
                    this.changeState(AI_STATE.APPROACHING);
                }
                return;
            }

            if (threatToPrincipalDist > guardDistance * 4) {
                this.target = null;
            }
        } else {
            this.target = null;
        }

        // Maintain escort formation around principal when no immediate threat
        if (!principal.pos) {
            return;
        }

        const formationOffset = this.guardFormationOffset || createVector(-70, 0);
        const principalAngle = principal.angle || 0;
        const cosP = cos(principalAngle);
        const sinP = sin(principalAngle);

        const worldOffsetX = cosP * formationOffset.x - sinP * formationOffset.y;
        const worldOffsetY = sinP * formationOffset.x + cosP * formationOffset.y;

        const desiredX = principal.pos.x + worldOffsetX;
        const desiredY = principal.pos.y + worldOffsetY;
        const distToPrincipal = dist(this.pos.x, this.pos.y, principal.pos.x, principal.pos.y);
        const distToFormation = dist(this.pos.x, this.pos.y, desiredX, desiredY);

        if (!this._guardFormationTarget) {
            this._guardFormationTarget = createVector(desiredX, desiredY);
        } else {
            this._guardFormationTarget.set(desiredX, desiredY);
        }

        if (distToPrincipal > this.guardLeashDistance || distToFormation > (this.size || 1) * 0.5) {
            this.performRotationAndThrust(this._guardFormationTarget);
        } else {
            // Frame-rate independent velocity matching
            const guardTimeScale = (typeof deltaTime === 'number') ? deltaTime / FRAME_TIME_BASELINE_MS : 1;
            if (principal.vel) {
                this.tempVector.set(principal.vel.x - this.vel.x, principal.vel.y - this.vel.y);
                const velDiffMagSq = this.tempVector.magSq();
                this.tempVector.mult(0.25 * guardTimeScale);
                this.vel.add(this.tempVector);

                if (velDiffMagSq < 0.1) {
                    this.brakingMultiplier = 0.99;
                } else {
                    this.brakingMultiplier = 1.0;
                }
            } else {
                this.brakingMultiplier = 1.0;
            }

            this.rotateTowards(principalAngle);
        }
    }

    /**
     * Handles FLEEING state logic
     * Escapes from attacker and transitions when safe
     * @param {boolean} targetExists - Whether a valid target exists
     * @param {number} distanceToTarget - Distance to current target
     * @private
     */
    _updateState_FLEEING(targetExists, distanceToTarget) {
        // 1) Initialize flee timer
        if (!this.fleeStartTime) {
            this.fleeStartTime = millis();
            this.fleeMinDuration = FLEE_MIN_DURATION_MS;
        }

        // 2) If attacker no longer valid → exit immediately
        if (!this.isTargetValid(this.target)) {
            this.lastAttacker = null;
            this.fleeStartTime = null;
            this.target = null;
            const returnState = this._determinePostFleeState();
            this.changeState(returnState);
            return;
        }

        // 3) Movement: thrust away from attacker (target guaranteed valid here)
        //    Compute escape point
        this.tempVector
            .set(this.pos.x - this.target.pos.x, this.pos.y - this.target.pos.y)
            .normalize()
            .mult(this.detectionRange * 3);
        const escapeTargetPos = p5.Vector.add(this.pos, this.tempVector);

        //    Rotate & thrust toward escape point
        this.performRotationAndThrust(escapeTargetPos);
        const fleeThrustMultiplier = (this.role === AI_ROLE.TRANSPORT)
            ? FLEE_THRUST_MULT_TRANSPORT
            : FLEE_THRUST_MULT_DEFAULT;
        // Note: performRotationAndThrust already applies thrust for FLEEING when aligned,
        // using the correct flee multiplier. Avoid double thrust here.

        //    Occasional random jiggle (~0.5 second interval)
        if (!this._fleeJiggleTimer) this._fleeJiggleTimer = 0;
        this._fleeJiggleTimer += this._getDeltaSeconds();
        if (this._fleeJiggleTimer >= 0.5) {
            this._fleeJiggleTimer = 0;
            this.tempVector.set(random(-1, 1), random(-1, 1)).normalize().mult(0.3);
            this.vel.add(this.tempVector);
        }

        // 4) Exit condition: ran long enough AND far enough
        const timeInFlee = millis() - this.fleeStartTime;
        const escapeDist = this.detectionRange *
            ((this.role === AI_ROLE.TRANSPORT) ? FLEE_ESCAPE_DIST_MULT + 0.5 : FLEE_ESCAPE_DIST_MULT);
        if (timeInFlee > this.fleeMinDuration && this.distanceTo(this.target) > escapeDist) {
            AI_LOG(`${this.shipTypeName} escaped successfully.`);
            this.lastAttacker = null;
            this.target = null;
            this.fleeStartTime = null;
            this.attackCooldown = (this.role === AI_ROLE.HAULER || this.role === AI_ROLE.TRANSPORT)
                ? 30.0 : 20.0;
            const returnState = this._determinePostFleeState();
            this.changeState(returnState);
        }
    }

    /**
     * Determines appropriate state to return to after fleeing
     * Builds on _getDefaultStateForRole with additional handling for haulers/transports
     * and ensures we never return to a combat state after fleeing
     * @return {number} AI_STATE constant for post-flee state
     * @private
     */
    _determinePostFleeState() {
        let state;

        // Determine base state based on role
        if (this.role === AI_ROLE.GUARD && this.isPrincipalValid(this.principal)) {
            state = AI_STATE.GUARDING;
        } else if (this.role === AI_ROLE.GUARD) {
            // Guard without valid principal after fleeing - depart the system
            state = AI_STATE.LEAVING_SYSTEM;
        } else if (this.role === AI_ROLE.POLICE) {
            state = AI_STATE.PATROLLING;
        } else if (this.role === AI_ROLE.HAULER) {
            // Haulers return to previous state or default to PATROLLING
            state = this.previousHaulerState || AI_STATE.PATROLLING;
        } else if (this.role === AI_ROLE.TRANSPORT) {
            // Transports return to previous state or default to TRANSPORTING
            state = this.previousTransportState || AI_STATE.TRANSPORTING;
        } else if (this.role === AI_ROLE.BOUNTY_HUNTER && this.hasCompletedContract) {
            state = AI_STATE.LEAVING_SYSTEM;
        } else {
            state = AI_STATE.IDLE;
        }

        // Safety check: never return into a combat state after fleeing
        const combatStates = [AI_STATE.APPROACHING, AI_STATE.ATTACK_PASS, AI_STATE.REPOSITIONING, AI_STATE.SNIPING];
        if (combatStates.includes(state)) {
            if (this.role === AI_ROLE.POLICE || this.role === AI_ROLE.HAULER) {
                state = AI_STATE.PATROLLING;
            } else if (this.role === AI_ROLE.TRANSPORT) {
                state = AI_STATE.TRANSPORTING;
            } else {
                // Pirates, Aliens, Bounty Hunters return to IDLE
                state = AI_STATE.IDLE;
            }
        }
        return state;
    }

    /**
     * Changes the current AI state with validation and callbacks
     * Prevents unarmed ships from entering combat states
     * @param {number} newState - The state to transition to
     * @param {Object} stateData - Additional data for state initialization
     */
    changeState(newState, stateData = {}) {
        // Prevent unarmed ships from entering combat states
        // EXCEPTION: Healers can enter APPROACHING to reach healing targets (they won't attack)
        const isHealerApproaching = (this.role === AI_ROLE.HEALER && newState === AI_STATE.APPROACHING);

        if (!this.isArmed() &&
            !isHealerApproaching &&
            (newState === AI_STATE.APPROACHING ||
                newState === AI_STATE.ATTACK_PASS ||
                newState === AI_STATE.REPOSITIONING ||
                newState === AI_STATE.SNIPING)) {

            if (this._unarmedCombatLogState !== newState) {
                AI_LOG(`${this.role} ${this.shipTypeName} cannot enter combat state - unarmed`);
                this._unarmedCombatLogState = newState;
            }

            // Choose appropriate non-combat state based on role
            if ((this.role === AI_ROLE.HAULER || this.role === AI_ROLE.TRANSPORT) &&
                this.lastAttacker && this.isTargetValid(this.lastAttacker)) {
                // Haulers and transports flee only if they have a valid attacker
                this.target = this.lastAttacker;
                newState = AI_STATE.FLEEING;
            } else {
                // Others go to their default non-combat state, or haulers without attackers
                newState = this._getDefaultStateForRole();
            }
        }

        // Don't do anything if it's the same state
        if (newState === this.currentState) return;

        const oldState = this.currentState;

        // Prevent stale delayed-flee carry-over when IDLE is interrupted by other states.
        if (oldState === AI_STATE.IDLE && newState !== AI_STATE.IDLE) {
            this._fleeDecisionStart = null;
        }

        this.currentState = newState;

        // Make the previous state available to entry/exit handlers
        if (stateData) {
            stateData.oldState = oldState;
        }

        // Log state changes with informative context
        //console.log(`${this.role} ${this.shipTypeName} state: ${AI_STATE_NAME[oldState]} -> ${AI_STATE_NAME[newState]}`);

        // Execute exit actions for the old state
        this.onStateExit(oldState, stateData);

        // Execute entry actions for the new state
        this.onStateEntry(newState, stateData);

        if (typeof communicationSystem !== 'undefined' && communicationSystem?.handleStateChange) {
            communicationSystem.handleStateChange(this, oldState, newState);
        }

        // Reset braking multiplier on state change unless explicitly set by the new state
        this.brakingMultiplier = undefined;
    }

    /**
     * Handles actions when entering a new state
     * Initializes state-specific variables and behaviors
     * @param {number} state - The state being entered
     * @param {Object} stateData - Additional data for state initialization
     */
    onStateEntry(state, stateData = {}) {
        switch (state) {
            case AI_STATE.APPROACHING:
                // Store combined health for kiting detection (low CPU: single assignment)
                this.shieldPlusHullAtStateEntry = this.shield + this.hull;
                break;

            case AI_STATE.ATTACK_PASS:
                // Initialize attack pass with timer
                // GRUDGE-BASED: Higher grudge = longer attack passes
                const rankMods = this._getRankModifiers();
                const grudgeLevel = this._getGrudgeLevel ? this._getGrudgeLevel(this.target) : 0;
                const grudgeMultiplier = 1 + Math.min(grudgeLevel * GRUDGE_PASS_DURATION_MULT_PER_LEVEL, GRUDGE_PASS_DURATION_MULT_CAP);
                const passDurationMult = rankMods?.attackPassDurationMultiplier ?? 1.0;
                const basePassDuration = this.passDuration * passDurationMult;
                this.passTimer = basePassDuration * random(0.85, 1.25) * grudgeMultiplier;
                this.strafeDirection = random([-1, 1]); // -1 for left, 1 for right

                // CALCULATE STRAFE TARGET ONCE - upon entering state
                if (this.isTargetValid(this.target)) {
                    // Calculate and store the strafe target position - do this only once
                    this.attackPassTargetPos = this.calculateAttackPassTarget();
                }
                break;

            case AI_STATE.REPOSITIONING:
                // Set repositioning target if we have a valid target
                if (stateData.repositionTarget) {
                    this.repositionTarget = stateData.repositionTarget;
                } else if (this.isTargetValid(this.target)) {
                    let v = p5.Vector.sub(this.pos, this.target.pos);
                    v.setMag(this.repositionDistance * 1.5);
                    this.repositionTarget = p5.Vector.add(this.pos, v);
                }
                break;

            case AI_STATE.SNIPING:
                const rankSnipingMods = this._getRankModifiers();
                const decisionIntervalMult = rankSnipingMods?.decisionIntervalMultiplier ?? 1.0;
                this.vel.mult(0.5); // Slow down upon entering stationary turret mode
                this.shieldPlusHullAtStateEntry = this.shield + this.hull; // Store health for damage checking
                this._snipingDecisionTimer = random(
                    Math.max(0.2, GRUDGE_DECISION_TIMER_MIN_BASE * decisionIntervalMult),
                    Math.max(GRUDGE_DECISION_TIMER_MIN_BASE * decisionIntervalMult + 0.1, GRUDGE_DECISION_TIMER_MAX_BASE * decisionIntervalMult)
                );
                break;

            case AI_STATE.NEAR_STATION:
                // Reset timer on entry
                this.nearStationTimer = this.stationPauseDuration;
                this.vel.mult(0.1); // Apply strong initial brake
                this._hasDockedThisPause = false;
                if (typeof this.handleStationDocking === 'function') {
                    this.handleStationDocking(this.getSystem());
                }
                break;

            case AI_STATE.LEAVING_SYSTEM:
                // Ensure leaving ships have a proper long-range target (jump zone)
                try {
                    const sys = this.getSystem() || this.currentSystem;
                    if (typeof this.setLeavingSystemTarget === 'function') {
                        this.setLeavingSystemTarget(sys);
                    } else {
                        // Fallback: attempt to set via direct access to jumpZoneCenter
                        if (sys?.jumpZoneCenter) {
                            this.patrolTargetPos = sys.jumpZoneCenter.copy();
                        }
                    }
                    // Clear any station pause timers
                    this.nearStationTimer = null;
                    // If we're already at the jump zone, initiate the fade immediately
                    try {
                        if (sys?.jumpZoneCenter) {
                            const d = dist(this.pos.x, this.pos.y, sys.jumpZoneCenter.x, sys.jumpZoneCenter.y);
                            if (d < 150) {
                                if (typeof this.initiateJumpFade === 'function') {
                                    this.initiateJumpFade(JUMP_FADE_OUT_DURATION, JUMP_FADE_IN_DURATION);
                                }
                            }
                        }
                    } catch (e) { /* ignore distance/fade errors */ }
                } catch (e) {
                    console.warn(`${this.shipTypeName}: onStateEntry(LEAVING_SYSTEM) failed:`, e);
                }
                break;

            case AI_STATE.FLEEING:
                // Show message when enemy starts fleeing
                if (typeof uiManager !== 'undefined' && typeof window !== 'undefined' && this.target === window.player) {
                    const shipName = this.displayName || this.shipTypeName || "Enemy ship";
                    uiManager.addMessage(`${shipName} is fleeing!`, [255, 165, 0]);
                }
                break;

            case AI_STATE.COLLECTING_CARGO: {
                // Remember where we came from so we can resume after collecting
                const priorState = (stateData && stateData.previousState !== undefined)
                    ? stateData.previousState
                    : stateData?.oldState;
                if (priorState !== undefined) {
                    this.previousState = priorState;
                }
                break;
            }
            case AI_STATE.GUARDING:
                if (stateData.principal && this.isTargetValid(stateData.principal)) {
                    this.principal = stateData.principal;
                    AI_LOG(`${this.shipTypeName} entering GUARDING state, protecting ${this.principal.shipTypeName || 'entity'}`);
                } else if (!this.principal) {
                    console.warn(`${this.shipTypeName} entering GUARDING state without a valid principal. Will likely revert.`);
                }
                this.target = null; // Guards focus on principal or its attacker, not general targets initially
                {
                    const rankMods = this._getRankModifiers();
                    const guardReactionMultiplier = Math.min(Math.max(rankMods?.guardReactionTimeMultiplier ?? 1.0, 0.1), 2.0);
                    this.guardReactionTime = GUARD_REACTION_COOLDOWN * guardReactionMultiplier;
                }
                break;
        }
    }

    /**
     * Calculates the attack pass target position
     * Computed once when entering ATTACK_PASS state for consistent strafing
     * @return {p5.Vector} The calculated attack pass target position
     */
    calculateAttackPassTarget() {
        // Similar logic to what's in getMovementTargetForState but happens ONCE
        let enemyPos = this.pos.copy();

        let targetActualPos = this.target.pos.copy();
        let targetVel = this.target.vel ? this.target.vel.copy() : createVector(0, 0);

        // Use consistent values for this entire attack pass
        const strafeMultFactor = random(0.7, 1.3); // Calculate ONCE
        const aheadDistFactor = random(0.8, 1.2);   // Calculate ONCE

        // Predict target's future position for calculating the strafe point
        let strafePredictionFrames = this.predictionTime * ATTACK_PASS_STRAFE_PREDICTION_FACTOR * (deltaTime ? (60 / (1000 / deltaTime)) : 60);
        let predictedTargetPos = p5.Vector.add(targetActualPos, targetVel.mult(strafePredictionFrames));

        // Direction from enemy to predicted target position
        let vecToPredictedTarget = p5.Vector.sub(predictedTargetPos, enemyPos);
        if (vecToPredictedTarget.magSq() < 0.1) {
            vecToPredictedTarget = p5.Vector.sub(targetActualPos, enemyPos);
            if (vecToPredictedTarget.magSq() < 0.1) {
                vecToPredictedTarget = p5.Vector.random2D();
            }
        }
        let passDirectionNormalized = vecToPredictedTarget.copy().normalize();

        // Calculate side strafe point
        const strafeOffsetValue = this.size * (ATTACK_PASS_STRAFE_OFFSET_MULT * strafeMultFactor) * this.strafeDirection;
        let perpendicularVec = createVector(-passDirectionNormalized.y, passDirectionNormalized.x).mult(strafeOffsetValue);
        let sideStrafePoint = p5.Vector.add(predictedTargetPos, perpendicularVec);

        // Add a single jitter value that remains consistent for this pass
        const jitterMagnitude = this.size * random(0.3, 0.8);
        let jitterVector = p5.Vector.random2D().mult(jitterMagnitude);
        sideStrafePoint.add(jitterVector);

        // Calculate the final aim point
        let vectorToSideStrafePoint = p5.Vector.sub(sideStrafePoint, enemyPos);
        let aheadDistanceForPass = this.size * (ATTACK_PASS_AHEAD_DIST_MULT * aheadDistFactor);

        let finalTarget;
        if (vectorToSideStrafePoint.magSq() > 0.001) {
            finalTarget = p5.Vector.add(sideStrafePoint, vectorToSideStrafePoint.normalize().mult(aheadDistanceForPass));
        } else {
            finalTarget = p5.Vector.add(sideStrafePoint, passDirectionNormalized.mult(aheadDistanceForPass));
        }

        return finalTarget;
    }

    /**
     * Handles actions when exiting a state
     * Cleans up state-specific variables
     * @param {number} state - The state being exited
     * @param {Object} stateData - Additional data for cleanup
     */
    onStateExit(state, stateData = {}) {
        switch (state) {
            case AI_STATE.ATTACK_PASS:
                this.attackPassTargetPos = null;
                break;

            case AI_STATE.REPOSITIONING:
                this.repositionTarget = null;
                break;

            case AI_STATE.COLLECTING_CARGO:
                // Reset cargo target when leaving collection state
                this.cargoTarget = null;
                this.cargoCollectionCooldown = this.role === AI_ROLE.TRANSPORT ? 0.5 : 1.0;
                break;

            case AI_STATE.APPROACHING:
                // Clear tracking for kiting detection
                this.shieldPlusHullAtStateEntry = null;
                break;

            case AI_STATE.NEAR_STATION:
                // Clear timer on exit
                this.nearStationTimer = null;
                this._hasDockedThisPause = false;
                break;

            case AI_STATE.FLEEING:
                this.fleeStartTime = null;
                break;

            case AI_STATE.LEAVING_SYSTEM:
                break;
            case AI_STATE.SNIPING:
                this.shieldPlusHullAtStateEntry = null; // Clear stored health
                this._snipingDecisionTimer = null; // Clear tactical timer
                this._sniperStrafeTimer = null; // Clear strafe decision timer
                this._sniperStrafeDir = null; // Reset strafe direction
                this._sniperThrustVariance = null; // Clear per-ship variance
                this._sniperReactionDelay = null; // Clear reaction delay
                this._snipingDriftTarget = null; // Clear drift target vector
                break;
        }
    }
}

// Apply state machine methods to Enemy prototype
// This will be called after Enemy class is defined
function applyEnemyStateMachineMethods() {
    if (typeof Enemy === 'undefined') {
        console.error('Enemy class not found - cannot apply state machine methods');
        return;
    }

    // Copy all methods from EnemyStateMachine to Enemy prototype
    Object.getOwnPropertyNames(EnemyStateMachine.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyStateMachine.prototype[methodName];
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyStateMachine, applyEnemyStateMachineMethods };
    global.EnemyStateMachine = EnemyStateMachine;
    global.applyEnemyStateMachineMethods = applyEnemyStateMachineMethods;
}
