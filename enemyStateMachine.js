// ****** enemyStateMachine.js ******
// Enemy State Machine Logic
// Handles AI state transitions and state-specific behaviors

/**
 * Enemy state machine methods as a mixin class
 * These methods handle state transitions and state-specific behaviors
 */
class EnemyStateMachine {
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
            case AI_STATE.SNIPING: // <<< NEW CASE
                this._updateState_SNIPING(targetExists, distanceToTarget);
                break;
            case AI_STATE.GUARDING:
                this._updateState_GUARDING();
                break;
            default:
                // States like TRANSPORTING, COLLECTING_CARGO, NEAR_STATION, LEAVING_SYSTEM
                // are handled by their respective role AI methods, not the combat state machine
                break;
        }
    }

    /**
     * Handles IDLE state logic
     * Transitions to APPROACHING if target exists, or GUARDING for guards with principal
     * @param {boolean} targetExists - Whether a valid target exists
     * @private
     */
    _updateState_IDLE(targetExists) {
        if (targetExists) {
            this.changeState(AI_STATE.APPROACHING);
        } else if (this.role === AI_ROLE.GUARD && this.principal && this.isTargetValid(this.principal)) {
            // If idle, is a guard, and has a valid principal, return to GUARDING state.
            this.changeState(AI_STATE.GUARDING);
        }
        // Otherwise, remains IDLE.
    }
    
    /**
     * Helper to determine default state when losing target
     * Guards return to GUARDING, Police to PATROLLING, others to IDLE
     * @return {number} AI_STATE constant for default state
     * @private
     */
    _getDefaultStateForRole() {
        if (this.role === AI_ROLE.GUARD && this.principal && this.isTargetValid(this.principal)) {
            return AI_STATE.GUARDING;
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

        // Flee if damaged
        if (this.hull < this.maxHull * 0.3) {
            this.changeState(AI_STATE.FLEEING);
            return;
        }

        // Tactical decision timer - periodically consider switching tactics
        if (this._snipingDecisionTimer === null || this._snipingDecisionTimer === undefined) {
            this._snipingDecisionTimer = random(2.0, 4.0); // Check every 2-4 seconds
        }
        const deltaSeconds = (typeof deltaTime === 'number' && isFinite(deltaTime)) ? (deltaTime / 1000) : 0;
        this._snipingDecisionTimer = Math.max(0, this._snipingDecisionTimer - deltaSeconds);

        if (this._snipingDecisionTimer <= 0) {
            this._snipingDecisionTimer = random(2.0, 4.0);
            
            // Random chance to switch to more aggressive tactics
            if (random() < 0.15) { // 15% chance every 2-4 seconds
                if (random() < 0.4) {
                    // 40% of the time, reposition to a new angle
                    let stateData = {};
                    let v = p5.Vector.sub(this.pos, this.target.pos);
                    v.rotate(random(-PI/2, PI/2)); // Shift angle randomly
                    v.setMag(this.repositionDistance * random(0.8, 1.2));
                    stateData.repositionTarget = p5.Vector.add(this.pos, v);
                    this.changeState(AI_STATE.REPOSITIONING, stateData);
                } else {
                    // 60% of the time, do an attack pass
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
     * @param {boolean} targetExists - Whether a valid target exists
     * @param {number} distanceToTarget - Distance to current target
     * @private
     */
    _updateState_APPROACHING(targetExists, distanceToTarget) {
        if (!targetExists) {
            this.changeState(this._getDefaultStateForRole());
            return;
        }

        // Tactical decision: Snipe (stationary turret) or Attack Pass (dynamic movement)
        // Choose sniping if we have suitable weapons and a random tactical choice
        const shouldSnipe = this.hasGoodSnipingWeapon && 
                           this.hasGoodSnipingWeapon() && 
                           random() < 0.6; // 60% chance to choose sniping over attack pass

        if (distanceToTarget < this.engageDistance) {
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
        const deltaSeconds = (typeof deltaTime === 'number' && isFinite(deltaTime)) ? (deltaTime / 1000) : 0;
        this.passTimer = Math.max(0, this.passTimer - deltaSeconds);
        if (this.passTimer <= 0) {
            // After attack pass completion, make a tactical decision
            if (this.isTargetValid(this.target)) {
                // 50% chance to reposition, 50% chance to go back to approaching
                if (random() < 0.5) {
                    // Reposition after attack
                    let stateData = {};
                    let v = p5.Vector.sub(this.pos, this.target.pos);
                    v.setMag(this.repositionDistance * 1.5);
                    stateData.repositionTarget = p5.Vector.add(this.pos, v);
                    AI_LOG(`${this.shipTypeName}: Attack pass complete, repositioning`);
                    this.changeState(AI_STATE.REPOSITIONING, stateData);
                } else {
                    // Go directly back to approaching state for another attack run
                    AI_LOG(`${this.shipTypeName}: Attack pass complete, resuming approach`);
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
        if (distToRepo < 50 || distanceToTarget > this.repositionDistance * 0.9) {
            // Tactical choice: snipe or approach for another pass
            const shouldSnipe = this.hasGoodSnipingWeapon && 
                               this.hasGoodSnipingWeapon() && 
                               random() < 0.5; // 50% chance after repositioning
            
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
        if (targetExists && distanceToTarget < this.detectionRange) {
            this.changeState(AI_STATE.APPROACHING);
            return;
        }
        // If patrolling and a principal is assigned, switch to GUARDING
        if (this.role === AI_ROLE.GUARD && this.principal && this.isTargetValid(this.principal)) {
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
        const system = this.getSystem();

        // Validate principal reference and ensure we can track them
        const principalValid = principal && this.isTargetValid(principal) && principal.pos;
        if (!principalValid) {
            AI_LOG(`${this.shipTypeName} (Guard): Principal is invalid/destroyed. Reverting to default state.`);
            this.principal = null;
            this.changeState(this._getDefaultStateForRole());
            return;
        }

        // Follow principal if they are leaving or have already jumped
        const principalSystem = principal.currentSystem;
        const principalLeaving = principal.currentState === AI_STATE.LEAVING_SYSTEM;
        const principalOutsideSystem = principalSystem && principalSystem !== this.currentSystem;
        if (principalLeaving || principalOutsideSystem) {
            if (system?.jumpZoneCenter) {
                AI_LOG(`${this.shipTypeName} (Guard): Principal ${principal.shipTypeName} is leaving the system. Following...`);
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

        // Maintain guard reaction cooldown so we don't spam engagements
        if (this.guardReactionTime > 0) {
            const deltaSeconds = (typeof deltaTime === 'number' && isFinite(deltaTime)) ? (deltaTime / 1000) : 0;
            this.guardReactionTime = Math.max(0, this.guardReactionTime - deltaSeconds);
        }

        const guardDistance = (principal.size || 10) * 3;
        const principalAttacker = principal.lastAttacker;
        const timeSincePrincipalAttack = principal.lastAttackTime ? millis() - principal.lastAttackTime : Infinity;

        if (this.guardReactionTime <= 0 &&
            principalAttacker &&
            principalAttacker !== this &&
            this.isTargetValid(principalAttacker) &&
            timeSincePrincipalAttack < 5000) {

            const distToAttacker = this.distanceTo(principalAttacker);
            if (distToAttacker < this.guardEngageRange) {
                AI_LOG(`${this.shipTypeName} (Guard): Principal under attack! Engaging ${principalAttacker.shipTypeName || 'attacker'}.`);
                this.target = principalAttacker;
                // Maintain a short engagement lock to prevent target/idle flicker
                this.guardEngagementLock = Math.max(this.guardEngagementLock || 0, 3.0);
                this.changeState(AI_STATE.APPROACHING);
                this.guardReactionTime = 5.0;
                return;
            }
        }

        // If we have a lingering target, decide whether to keep pursuing it
        if (this.target && this.isTargetValid(this.target)) {
            const threatToPrincipalDist = (this.target.pos && principal.pos)
                ? p5.Vector.dist(this.target.pos, principal.pos)
                : Infinity;

            if (threatToPrincipalDist < guardDistance * 2) {
                this.changeState(AI_STATE.APPROACHING);
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
            if (principal.vel) {
                this.tempVector.set(principal.vel.x - this.vel.x, principal.vel.y - this.vel.y);
                const velDiffMagSq = this.tempVector.magSq();
                this.tempVector.mult(0.25);
                this.vel.add(this.tempVector);

                if (velDiffMagSq < 0.1) {
                    this.vel.mult(0.99);
                }
            } else {
                this.vel.mult(0.985);
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

        //    Occasional random jiggle
        if (frameCount % 30 === 0) {
            this.tempVector.set(random(-1,1), random(-1,1)).normalize().mult(0.3);
            this.vel.add(this.tempVector);
        }

        // 4) Exit condition: ran long enough AND far enough
        const timeInFlee = millis() - this.fleeStartTime;
        const escapeDist = this.detectionRange *
            ((this.role === AI_ROLE.TRANSPORT) ? FLEE_ESCAPE_DIST_MULT+0.5 : FLEE_ESCAPE_DIST_MULT);
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
     * @return {number} AI_STATE constant for post-flee state
     * @private
     */
    _determinePostFleeState() {
        let state = AI_STATE.IDLE;
        if (this.role === AI_ROLE.GUARD && this.principal && this.isTargetValid(this.principal)) {
            state = AI_STATE.GUARDING;
        } else if (this.role === AI_ROLE.POLICE) {
            state = AI_STATE.PATROLLING;
        } else if (this.role === AI_ROLE.HAULER) {
            state = this.previousHaulerState || AI_STATE.PATROLLING;
        } else if (this.role === AI_ROLE.TRANSPORT) {
            state = this.previousTransportState || AI_STATE.TRANSPORTING;
        }
        // never return into a combat state
        if ([AI_STATE.APPROACHING, AI_STATE.ATTACK_PASS, AI_STATE.REPOSITIONING, AI_STATE.SNIPING].includes(state)) {
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
        if (!this.isArmed() && 
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
    }

    /**
     * Handles actions when entering a new state
     * Initializes state-specific variables and behaviors
     * @param {number} state - The state being entered
     * @param {Object} stateData - Additional data for state initialization
     */
    onStateEntry(state, stateData = {}) {
        switch(state) {
        case AI_STATE.ATTACK_PASS:
            // Initialize attack pass with timer
            const basePassDuration = this.passDuration;
            this.passTimer = basePassDuration * random(0.85, 1.25);
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
                this.vel.mult(0.5); // Slow down upon entering stationary turret mode
                this.shieldPlusHullAtStateEntry = this.shield + this.hull; // Store health for damage checking
                this._snipingDecisionTimer = random(2.0, 4.0); // Initialize tactical decision timer
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
                this.setLeavingSystemTarget(this.currentSystem);
                this.nearStationTimer = null; // Clear station timer
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
                    this.guardReactionTime = 0; // Reset reaction time
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
        let targetVel = this.target.vel ? this.target.vel.copy() : createVector(0,0);

        // Use consistent values for this entire attack pass
        const strafeMultFactor = random(0.7, 1.3); // Calculate ONCE
        const aheadDistFactor = random(0.8, 1.2);   // Calculate ONCE

        // Predict target's future position for calculating the strafe point
        let strafePredictionFrames = this.predictionTime * ATTACK_PASS_STRAFE_PREDICTION_FACTOR * (deltaTime ? (60 / (1000/deltaTime)) : 60);
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
        switch(state) {
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
