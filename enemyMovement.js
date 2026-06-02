// ****** enemyMovement.js ******
// Enemy movement and physics methods
// Extracted from Enemy class as part of Stage 5 refactoring

/**
 * EnemyMovement class contains all movement and physics-related methods
 * for the Enemy class. These methods are applied to the Enemy prototype
 * via the applyEnemyMovementMethods() function.
 */
class EnemyMovement {
    /**
     * Helper: Rotates towards target, applies thrust if aligned. Returns angle difference.
     * @param {p5.Vector} desiredMovementTargetPos - Position to move towards
     * @return {number} The angle difference in radians
     */
    performRotationAndThrust(desiredMovementTargetPos) {
        let angleDifference = PI; // Default to max difference

        // BOOST OVERRIDE: When speed bursting, skip normal thrust to let boost work properly.
        // The boost sets velocity directly and should not be fought by regular thrust.
        // We still allow rotation so the ship can aim during boost.
        if (this.isSpeedBursting) {
            // Only rotate toward target if we have one (for aiming during boost)
            if (desiredMovementTargetPos?.x !== undefined && desiredMovementTargetPos?.y !== undefined &&
                !isNaN(desiredMovementTargetPos.x) && !isNaN(desiredMovementTargetPos.y)) {
                this.tempVector.set(
                    desiredMovementTargetPos.x - this.pos.x,
                    desiredMovementTargetPos.y - this.pos.y
                );
                if (this.tempVector.magSq() > 0.001) {
                    let desiredAngle = this.tempVector.heading();
                    angleDifference = this.rotateTowards(desiredAngle);
                }
            }
            // Skip thrust - boost handles velocity
            return angleDifference;
        }

        if (desiredMovementTargetPos?.x !== undefined && desiredMovementTargetPos?.y !== undefined &&
            !isNaN(desiredMovementTargetPos.x) && !isNaN(desiredMovementTargetPos.y)) {
            // Reuse tempVector to avoid allocations
            this.tempVector.set(
                desiredMovementTargetPos.x - this.pos.x,
                desiredMovementTargetPos.y - this.pos.y
            );
            if (this.tempVector.magSq() > 0.001) { // Avoid normalizing a zero vector
                let desiredAngle = this.tempVector.heading(); // Radians
                angleDifference = this.rotateTowards(desiredAngle);
            }
        }

        // Default thrust multiplier
        let effectiveThrustMultiplier = 1.0;
        let canThrust = false; // Master flag to decide if thrusting happens
        let forceThrustForAttackPassEmergency = false; // Special flag for attack pass emergency

        // Determine thrust conditions based on state
        if (this.currentState === AI_STATE.IDLE || this.currentState === AI_STATE.NEAR_STATION) {
            canThrust = false;
        } else {
            // For all other active states, assume thrust is possible if aligned,
            // then apply state-specific multipliers or conditions.
            const isAlignedForThrust = abs(angleDifference) < this.angleTolerance;

            if (this.currentState === AI_STATE.ATTACK_PASS) {
                effectiveThrustMultiplier = ATTACK_PASS_SPEED_BOOST_MULT;
                if (this.isTargetValid(this.target)) {
                    let distToActualTarget = this.distanceTo(this.target);
                    let criticalCollisionRange = (this.size + (this.target.size || this.size)) * ATTACK_PASS_COLLISION_AVOID_RANGE_FACTOR;
                    if (distToActualTarget < criticalCollisionRange) {
                        // Reuse tempVector for angle calculation
                        this.tempVector.set(this.target.pos.x - this.pos.x, this.target.pos.y - this.pos.y);
                        let angleToActualTargetCurrent = this.tempVector.heading();
                        let diffAngleToActualTarget = this.normalizeAngle(angleToActualTargetCurrent - this.angle);
                        if (abs(diffAngleToActualTarget) < this.angleTolerance * 1.5 && abs(angleDifference) > this.angleTolerance * 0.5) {
                            effectiveThrustMultiplier = ATTACK_PASS_COLLISION_AVOID_THRUST_REDUCTION;
                            forceThrustForAttackPassEmergency = true; // Force thrust for emergency maneuver
                        }
                    }
                }
                if (isAlignedForThrust || forceThrustForAttackPassEmergency) {
                    canThrust = true;
                }

            } else if (this.currentState === AI_STATE.APPROACHING) {
                // effectiveThrustMultiplier is 1.0 by default for APPROACHING
                if (this.isTargetValid(this.target)) {
                    let distToActualTarget = this.distanceTo(this.target);
                    // Calculate the distance at which braking should occur
                    let targetSize = this.target.size || (this.target.width / 2) || this.size; // Estimate target size if not standard
                    let approachBrakingZone = (this.size + targetSize) * APPROACH_BRAKING_DISTANCE_FACTOR;

                    if (distToActualTarget < approachBrakingZone) {
                        effectiveThrustMultiplier = APPROACH_CLOSE_THRUST_REDUCTION;
                        // console.log(`${this.shipTypeName} in APPROACH braking zone. Dist: ${distToActualTarget.toFixed(0)}, Multiplier: ${effectiveThrustMultiplier}`);
                    }
                }
                if (isAlignedForThrust) {
                    // If APPROACH_CLOSE_THRUST_REDUCTION is 0, this will result in no thrust.
                    // If it's > 0, minimal thrust will be applied if aligned.
                    canThrust = true;
                }

            } else if (this.currentState === AI_STATE.FLEEING) {
                effectiveThrustMultiplier = (this.role === AI_ROLE.TRANSPORT)
                    ? FLEE_THRUST_MULT_TRANSPORT
                    : FLEE_THRUST_MULT_DEFAULT;
                if (isAlignedForThrust) { // Fleeing ships should always try to thrust if aligned
                    canThrust = true;
                }
            } else if (this.currentState === AI_STATE.SNIPING) {
                // RANK CHECK: Rookies don't use side thrusters (no kiting)
                const rankMods = this._getRankModifiers();
                const canStrafe = rankMods?.canStrafe ?? true;

                // Rookies skip all strafe logic - early return for performance
                if (!canStrafe) {
                    // Rookies don't strafe, skip to next state logic
                    // They will still rotate and fire, just no lateral movement
                } else {
                    // SNIPING: Use strafe thrusters for tactical positioning while maintaining aim
                    // This creates more unpredictable, human-like movement patterns

                    if (this.isTargetValid(this.target)) {
                        const distToTarget = this.distanceTo(this.target);
                        const targetSize = this.target.size || this.size;
                        const minSafeDistance = (this.size + targetSize) * 1.5;
                        const firingRange = this.visualFiringRange || this.firingRange || 400;

                        // Initialize strafe state if needed
                        if (this._sniperStrafeTimer == null) {
                            this._sniperStrafeTimer = random(1.0, 2.5);
                            this._sniperStrafeDir = 0; // 0 = none, -1 = left, 1 = right
                            this._sniperThrustVariance = random(0.8, 1.2); // Per-ship variance
                            this._sniperReactionDelay = 0; // Reaction delay before executing new direction
                        }

                        const strafeTimeScale = (typeof deltaTime === 'number') ? deltaTime / 1000 : DEFAULT_DELTA_SECONDS;
                        this._sniperStrafeTimer -= strafeTimeScale;

                        // Count down reaction delay if set
                        if (this._sniperReactionDelay > 0) {
                            this._sniperReactionDelay -= strafeTimeScale;
                        }

                        let isActivelyManeuvering = false;

                        // If too close, use reverse thrust to back away while keeping aim
                        if (distToTarget < minSafeDistance) {
                            // Human-like: slight hesitation 15% of frames
                            if (random() > 0.15) {
                                const reverseStrength = random(0.4, 0.7) * this._sniperThrustVariance;
                                this.thrustReverse(reverseStrength);
                                isActivelyManeuvering = true;
                            }
                        }
                        // If at good range, randomly strafe to be unpredictable
                        else if (this._sniperStrafeTimer <= 0) {
                            // Make a new strafe decision with reaction delay
                            this._sniperStrafeTimer = random(0.6, 3.0); // More variable timing

                            // RANK-BASED REACTION DELAY: Rookies hesitate, Elites react instantly
                            const baseReactionDelay = random(0.05, 0.25);
                            const rankBonus = rankMods?.reactionDelayBonus || 0;
                            this._sniperReactionDelay = Math.max(0, baseReactionDelay + rankBonus);

                            this._sniperThrustVariance = random(0.7, 1.3); // Re-roll variance

                            // 35% chance left, 35% chance right, 30% chance to pause
                            const roll = random();
                            if (roll < 0.35) {
                                this._sniperStrafeDir = -1;
                            } else if (roll < 0.70) {
                                this._sniperStrafeDir = 1;
                            } else {
                                this._sniperStrafeDir = 0;
                            }
                        }

                        // Apply the strafe (only if reaction delay has passed)
                        if (this._sniperStrafeDir !== 0 &&
                            this._sniperReactionDelay <= 0 &&
                            distToTarget >= minSafeDistance &&
                            distToTarget < firingRange * 1.1) {

                            // Human-like: occasional hesitation (skip ~10% of frames)
                            if (random() > 0.10) {
                                // Variable thrust strength for organic feel
                                const strafeStrength = random(0.35, 0.65) * this._sniperThrustVariance;

                                if (this._sniperStrafeDir < 0) {
                                    this.thrustLeft(strafeStrength);
                                } else {
                                    this.thrustRight(strafeStrength);
                                }
                                isActivelyManeuvering = true;
                            }
                        }

                        // Apply braking - lighter when actively maneuvering so strafe is visible
                        this.brakingMultiplier = constrain(isActivelyManeuvering ? 0.96 : SNIPING_BRAKE_FACTOR, 0.6, 0.99);
                        canThrust = false; // Strafe/reverse already handled above
                    } else {
                        // No valid target - just brake
                        this.brakingMultiplier = constrain(SNIPING_BRAKE_FACTOR, 0.6, 0.99);
                        canThrust = false;
                    }
                } // End veteran/elite strafe logic
            } else if (this.currentState === AI_STATE.REPOSITIONING || this.currentState === AI_STATE.PATROLLING) {
                // effectiveThrustMultiplier is 1.0 by default

                // Add braking when close to target to prevent overshooting/ramming
                if (desiredMovementTargetPos && !isNaN(desiredMovementTargetPos.x) && !isNaN(desiredMovementTargetPos.y)) {
                    const distToTarget = dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y);
                    const brakingDist = this.size * 4.0;

                    if (distToTarget < brakingDist) {
                        effectiveThrustMultiplier = map(distToTarget, this.size, brakingDist, 0.2, 1.0, true);
                    }
                }

                if (isAlignedForThrust) {
                    canThrust = true;
                }
            } else { // For other active states like PATROLLING, TRANSPORTING, COLLECTING_CARGO
                // effectiveThrustMultiplier is 1.0 by default
                if (isAlignedForThrust) {
                    canThrust = true;
                }
            }
        }

        if (canThrust) {
            this.thrustForward(effectiveThrustMultiplier);
        }

        return angleDifference;
    }

    /**
     * Calculate the movement target position based on current state and target
     * @param {number} distanceToTarget - Current distance to target
     * @return {p5.Vector|null} Position vector to move toward
     */
    getMovementTargetForState(distanceToTarget) {
        let desiredMovementTargetPos = null;

        // Reset transient physics flags for this frame
        this.brakingMultiplier = undefined;

        switch (this.currentState) {
            case AI_STATE.APPROACHING:
                if (this.isTargetValid(this.target)) {
                    desiredMovementTargetPos = this.predictTargetPosition();
                }
                break;

            case AI_STATE.ATTACK_PASS:
                if (this.attackPassTargetPos && this.isTargetValid(this.target)) {
                    // Use the pre-calculated target position
                    desiredMovementTargetPos = this.attackPassTargetPos;
                } else if (this.isTargetValid(this.target)) {
                    // Fallback if somehow we don't have a pre-calculated target
                    this.attackPassTargetPos = this.calculateAttackPassTarget();
                    desiredMovementTargetPos = this.attackPassTargetPos;
                } else {
                    // If target becomes invalid during attack pass, aim at current position
                    desiredMovementTargetPos = this.pos.copy();
                }
                break;

            case AI_STATE.REPOSITIONING:
                desiredMovementTargetPos = this.repositionTarget;
                break;

            case AI_STATE.PATROLLING:
                desiredMovementTargetPos = this.patrolTargetPos;
                break;

            case AI_STATE.LEAVING_SYSTEM:
                // Use patrolTargetPos which is set to jump zone by setLeavingSystemTarget()
                desiredMovementTargetPos = this.patrolTargetPos;
                break;

            case AI_STATE.SNIPING:
                // Turret mode with subtle forward drift toward target (no standoff maintenance)
                if (this.isTargetValid(this.target)) {
                    // Compute distance using provided argument when possible to avoid recomputing
                    let safeDistance = (typeof distanceToTarget === 'number' && isFinite(distanceToTarget))
                        ? distanceToTarget
                        : this.distanceTo(this.target);

                    // Soft stop near collision range
                    const targetSize = this.target.size || this.size;
                    const combinedSize = (this.size + targetSize);
                    const minApproachDistance = combinedSize * 1.2;

                    if (safeDistance > minApproachDistance) {
                        // Reuse tempVector to point from self to target, then clamp to a tiny step
                        this.tempVector.set(this.target.pos.x - this.pos.x, this.target.pos.y - this.pos.y);
                        const magSq = this.tempVector.magSq();
                        if (magSq > 0.0001) {
                            // Step is small but above thrust threshold check (size * 0.05)
                            const minStep = this.size * 0.08;
                            const maxStep = this.size * 0.9;
                            const distStep = safeDistance * 0.02; // 2% of current distance
                            const step = constrain(distStep, minStep, maxStep);
                            this.tempVector.normalize().mult(step);

                            // Use a reusable vector for drift target to avoid per-frame allocations
                            if (!this._snipingDriftTarget) {
                                this._snipingDriftTarget = createVector(0, 0);
                            }
                            this._snipingDriftTarget.set(this.pos.x + this.tempVector.x, this.pos.y + this.tempVector.y);
                            desiredMovementTargetPos = this._snipingDriftTarget;
                            break;
                        }
                    }
                }
                // Default: stay put and rotate to face target; braking handled in thrust logic
                desiredMovementTargetPos = this.pos.copy();
                break;
        }

        return desiredMovementTargetPos;
    }

    /**
     * Updates the physics (drag, velocity, position) for the ship
     * Centralizes all physics calculations in one place
     */
    updatePhysics() {
        if (typeof SharedPhysics !== 'undefined') {
            const dt = (typeof getDeltaSeconds === 'function') ? getDeltaSeconds() : (deltaTime / 1000);
            SharedPhysics.updatePhysics(this, dt);
        }

        // Reset isThrusting flag at end of physics update
        // (Original Enemy behavior - Player handles this in handleInput() instead)
        this.isThrusting = false;
    }
}

/**
 * Applies all EnemyMovement methods to the Enemy prototype
 * This function should be called after the Enemy class is defined
 * and before any Enemy instances are created.
 */
function applyEnemyMovementMethods() {
    if (typeof Enemy === 'undefined') {
        console.error('applyEnemyMovementMethods: Enemy class not defined yet!');
        return;
    }

    // Get all method names from EnemyMovement prototype (excluding constructor)
    const methodNames = Object.getOwnPropertyNames(EnemyMovement.prototype)
        .filter(name => name !== 'constructor');

    // Copy each method to Enemy prototype
    methodNames.forEach(methodName => {
        Enemy.prototype[methodName] = EnemyMovement.prototype[methodName];
    });

    if (typeof DEBUG_AI !== 'undefined' && DEBUG_AI) {
        console.log(`Applied ${methodNames.length} movement methods to Enemy prototype:`, methodNames.join(', '));
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyMovement, applyEnemyMovementMethods };
    global.EnemyMovement = EnemyMovement;
    global.applyEnemyMovementMethods = applyEnemyMovementMethods;
}
