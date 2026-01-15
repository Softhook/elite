// ****** enemyUtils.js ******
// Enemy Utility Methods
// Common utility functions used by Enemy class

// -------------------------
// --- Time Scaling Utilities ---
// -------------------------
// These functions reduce code duplication across the enemy AI files

/**
 * Gets delta time in seconds with safety checks
 * @returns {number} Delta time in seconds (defaults to ~60fps if unavailable)
 */
function getDeltaSeconds() {
    return (typeof deltaTime === 'number' && isFinite(deltaTime))
        ? (deltaTime / 1000)
        : DEFAULT_DELTA_SECONDS;
}

/**
 * Gets frame-rate independent time scale (for multiplying per-frame values)
 * Based on 60fps baseline (16.67ms per frame)
 * @returns {number} Time scale multiplier
 */
function getTimeScale() {
    return (typeof deltaTime === 'number' && isFinite(deltaTime))
        ? (deltaTime / FRAME_TIME_BASELINE_MS)
        : 1;
}

/**
 * Enemy utility methods as a mixin class
 * These methods can be added to the Enemy prototype
 */
class EnemyUtils {
    // -------------------------
    // --- Helper Methods ---
    // -------------------------

    /**
     * Checks if this ship is an Alien role (uses different propulsion visuals)
     * @return {boolean} Whether this ship is an Alien
     */
    _isAlienShip() {
        return typeof AI_ROLE !== 'undefined' && this.role === AI_ROLE.ALIEN;
    }

    /**
     * Ensures thrustVector exists for thrust calculations
     * Call at the start of thrust methods to avoid repeated fallback checks
     */
    _ensureThrustVector() {
        if (!this.thrustVector) {
            this.thrustVector = createVector(0, 0);
        }
    }

    // -------------------------
    // --- Position & Angle Utilities ---
    // -------------------------

    /**
     * Predicts future position of current target based on velocity
     * @return {p5.Vector|null} Predicted position or null if no valid target
     */
    predictTargetPosition() {
        if (!this.target?.pos || !this.target?.vel) return this.target?.pos;

        // Reuse the temp vector for calculation, but return a copy
        // to prevent corruption if caller stores the result
        this.tempVector.set(this.target.vel.x, this.target.vel.y);
        // Use getTimeScale for frame-rate independent prediction
        const pf = this.predictionTime * getTimeScale() * PREDICTION_FPS_BASELINE;
        this.tempVector.mult(pf);
        this.tempVector.add(this.target.pos);
        return this.tempVector.copy();
    }

    /** 
     * Normalizes an angle to the range [-PI, PI]
     * @param {number} angle - The angle to normalize
     * @return {number} The normalized angle
     */
    normalizeAngle(angle) {
        let normalized = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
        if (normalized > PI) normalized -= TWO_PI;
        return normalized;
    }

    /** 
     * Gets the signed angle difference between target angle and current angle 
     * @param {number} targetAngle - The target angle to rotate towards
     * @return {number} The normalized angle difference in range [-PI, PI]
     */
    getAngleDifference(targetAngle) {
        let diff = targetAngle - this.angle;
        return this.normalizeAngle(diff);
    }

    /** 
     * Calculates distance to target entity
     * @param {Object} target - Entity with pos property
     * @return {number} Distance to target or Infinity if invalid
     */
    distanceTo(target) {
        if (!target?.pos) return Infinity;
        return dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
    }

    /**
     * Checks if target is valid (exists, has position, positive hull, not destroyed)
     * @param {Object} target - The target to validate
     * @return {boolean} Whether target is valid
     */
    isTargetValid(target) {
        // Never allow cargo to be a combat target
        if (target && target.constructor && target.constructor.name === 'Cargo') {
            return false;
        }
        // Never allow asteroids to be a combat target (bumping into them shouldn't trigger retaliation)
        if (target && target.constructor && target.constructor.name === 'Asteroid') {
            return false;
        }
        // Player is not a valid target while docked (invulnerable at station)
        if (target && target.isDockedAndInvulnerable) {
            return false;
        }
        // Player is not a valid target while cloaked (invisible)
        if (target && target.isCloaked) {
            return false;
        }
        // Player is not a valid target while dying (prevents flickering target displays)
        if (target && target.isDying) {
            return false;
        }
        return target && target.pos &&
            ((target.hull !== undefined && target.hull > 0) || target.hull === undefined) &&
            (target.destroyed === undefined || !target.destroyed);
    }

    /**
     * Gets the current star system reference
     * @return {StarSystem|null} The current system or null if not available
     */
    getSystem() {
        return this.currentSystem;
    }

    /** 
     * Rotates towards target angle (radians). Returns remaining difference (radians).
     * @param {number} targetAngleRadians - The target angle to rotate towards
     * @return {number} The remaining angle difference
     */
    rotateTowards(targetAngleRadians) {
        if (isNaN(targetAngleRadians)) return 0;

        const diff = this.getAngleDifference(targetAngleRadians);

        if (abs(diff) > ROTATION_THRESHOLD_RAD) {
            // Use Math.sign for browser compatibility 
            const rotationAmount = Math.sign(diff) *
                Math.min(Math.abs(diff), this.rotationSpeed * getTimeScale());
            this.angle += rotationAmount;
        }
        return diff;
    }

    /** 
     * Applies forward thrust in current facing direction
     * @param {number} [multiplier=1.0] - Optional thrust multiplier
     * @param {boolean} [createParticles=true] - Whether to create visual thrust particles
     * @param {number|null} [dt=null] - Delta time in seconds (optional, for precise timing)
     */
    thrustForward(multiplier = 1.0, createParticles = true, dt = null) {
        if (typeof SharedPhysics !== 'undefined') {
            SharedPhysics.thrustForward(this, multiplier, createParticles, dt);
        }
    }

    /**
     * Applies left strafe thrust (perpendicular to facing direction)
     * @param {number} [multiplier=STRAFE_THRUST_MULTIPLIER] - Thrust multiplier (strafe is weaker than forward)
     */
    thrustLeft(multiplier = STRAFE_THRUST_MULTIPLIER) {
        if (typeof SharedPhysics !== 'undefined') {
            SharedPhysics.thrustStrafe(this, -1, multiplier);
        }
    }

    /**
     * Applies right strafe thrust (perpendicular to facing direction)
     * @param {number} [multiplier=STRAFE_THRUST_MULTIPLIER] - Thrust multiplier (strafe is weaker than forward)
     */
    thrustRight(multiplier = STRAFE_THRUST_MULTIPLIER) {
        if (typeof SharedPhysics !== 'undefined') {
            SharedPhysics.thrustStrafe(this, 1, multiplier);
        }
    }

    /**
     * Applies reverse thrust (backward movement while maintaining facing)
     * @param {number} [multiplier=REVERSE_THRUST_MULTIPLIER] - Thrust multiplier (reverse is weaker than forward)
     */
    thrustReverse(multiplier = REVERSE_THRUST_MULTIPLIER) {
        if (typeof SharedPhysics !== 'undefined') {
            SharedPhysics.thrustReverse(this, multiplier);
        }
    }

    /** 
     * Sets a target position far away for Haulers leaving the system.
     * MODIFIED: Now targets the system's jump zone if available.
     * @param {Object} system - The current star system, expected to have jumpZoneCenter.
     */
    setLeavingSystemTarget(system) {
        if (system?.jumpZoneCenter) {
            // --- Target the Jump Zone ---
            this.patrolTargetPos = system.jumpZoneCenter.copy();
            AI_LOG(`Hauler ${this.shipTypeName} targeting Jump Zone at ${this.patrolTargetPos.x.toFixed(0)}, ${this.patrolTargetPos.y.toFixed(0)}`);
        } else {
            // --- Fallback: Target random point at edge ---
            console.warn(`Hauler ${this.shipTypeName}: Jump Zone not found in system ${system?.name}. Using fallback edge target.`);
            const angle = random(TWO_PI);
            // Use a large distance, slightly beyond despawn radius
            const dist = (system?.despawnRadius ?? 3000) * DESPAWN_DISTANCE_MULTIPLIER;
            this.patrolTargetPos = createVector(cos(angle) * dist, sin(angle) * dist);
        }

        // Ensure state is set correctly (might be redundant if called from changeState)
        if (this.currentState !== AI_STATE.LEAVING_SYSTEM) {
            this.changeState(AI_STATE.LEAVING_SYSTEM);
        }
        this.hasPausedNearStation = false; // Reset pause flag
    }

    /**
     * Initiate a jump fade effect (fade out -> mark destroyed -> fade in).
     * This centralizes the visual jump/despawn behavior so all ship roles
     * can use the same smooth effect instead of instant destruction.
     * @param {number} [outDuration=JUMP_FADE_OUT_DURATION] - Fade-to-white duration (seconds)
     * @param {number} [inDuration=JUMP_FADE_IN_DURATION] - Fade-back duration (seconds)
     */
    initiateJumpFade(outDuration = JUMP_FADE_OUT_DURATION, inDuration = JUMP_FADE_IN_DURATION) {
        try {
            this._isJumpFading = true;
            this._jumpFadeOutDuration = outDuration;
            this._jumpFadeInDuration = inDuration;
            this._jumpFadePhase = 'out';
            this._jumpFadeTimer = outDuration;

            // Stop motion and weapons immediately
            if (this.vel && typeof this.vel.set === 'function') this.vel.set(0, 0);
            this.isThrusting = false;
            this.currentWeapon = null;
        } catch (e) {
            // Defensive fallback: if anything fails, mark destroyed so the ship is removed
            this.destroyed = true;
        }
    }

    /**
     * Applies energy tangle effect to impair movement
     * @param {number} duration - How long drag lasts in seconds
     * @param {number} multiplier - How much drag is increased
     */
    applyDragEffect(duration = DRAG_EFFECT_DEFAULT_DURATION, multiplier = DRAG_EFFECT_DEFAULT_MULTIPLIER) {
        // Use higher value if already affected
        this.dragMultiplier = Math.max(this.dragMultiplier || 1.0, multiplier);

        // ENHANCED: Extend duration for consecutive hits
        this.dragEffectTimer = Math.max(this.dragEffectTimer || 0, duration) +
            (this.dragEffectTimer > 0 ? duration * DRAG_CONSECUTIVE_HIT_MULT : 0);

        // Visual effect timestamp
        this.tangleEffectTime = millis();
    }

    /**
     * Checks if ship has been destroyed
     * @return {boolean} Whether ship is destroyed
     */
    isDestroyed() {
        return this.destroyed;
    }

    /**
     * Checks for collision with target entity
     * Uses circle broadphase for fast rejection, then polygon narrowphase for on-screen accuracy
     * @param {Object} target - Entity to check collision with
     * @return {boolean} Whether collision occurred
     */
    checkCollision(target) {
        if (!target?.pos || target.size === undefined) return false;

        // Broadphase: Quick circle check first
        const dSq = sq(this.pos.x - target.pos.x) + sq(this.pos.y - target.pos.y);
        const sumRadii = (target.size / 2) + (this.size / 2);
        if (dSq >= sq(sumRadii)) return false; // Fast rejection - no collision possible

        // Narrowphase: Polygon collision if on-screen (for visual accuracy)
        if (typeof CollisionUtils !== 'undefined') {
            // Check if either entity is on-screen
            // Note: Asteroids don't have _isOnScreen, so check with CollisionUtils.isOnScreen
            let eitherOnScreen = this._isOnScreen || target.isPlayer;
            if (!eitherOnScreen && target._isOnScreen !== undefined) {
                eitherOnScreen = target._isOnScreen;
            } else if (!eitherOnScreen && target.vertices) {
                // Target is an asteroid - check screen visibility
                eitherOnScreen = CollisionUtils.isOnScreen(target.pos);
            }

            if (eitherOnScreen) {
                // Get polygon for this ship
                const polyA = CollisionUtils.getShipPolygon(this);

                // Get polygon for target (could be ship or asteroid)
                let polyB = null;
                if (target.vertices) {
                    // Target is an asteroid
                    polyB = CollisionUtils.getAsteroidPolygon(target);
                } else if (target.shipDef) {
                    // Target is a ship
                    polyB = CollisionUtils.getShipPolygon(target);
                }

                if (polyA && polyB) {
                    return CollisionUtils.polygonsCollide(polyA, polyB);
                }
            }
        }

        // Fallback: Broadphase already passed, assume collision
        return true;
    }

    /**
     * Helper to determine ship faction from ship definition or player faction property
     * @param {Object} ship - The ship to check (enemy or player)
     * @returns {string} - Faction identifier: 'IMPERIAL', 'SEPARATIST', 'MILITARY', '' (neutral), or 'UNKNOWN'
     */
    _getShipFaction(ship) {
        if (!ship) return 'UNKNOWN';

        // Check runtime faction property first (set in Enemy constructor)
        // Note: Empty string "" is valid (neutral/civilian ships)
        if (ship.faction !== undefined && ship.faction !== null) {
            return ship.faction;
        }

        // Check if this is a player with a faction
        if (ship.playerFaction !== undefined && ship.playerFaction !== null) {
            return ship.playerFaction;
        }

        // Check ship definition for faction property
        if (ship.shipTypeName && typeof SHIP_DEFINITIONS !== 'undefined') {
            const shipDef = SHIP_DEFINITIONS[ship.shipTypeName];
            if (shipDef && shipDef.faction !== undefined && shipDef.faction !== null) {
                return shipDef.faction;
            }
        }

        return 'UNKNOWN';
    }

    /**
     * Gets the grudge level (hit count) against a specific target
     * Higher grudge = more aggressive behavior
     * @param {Object} target - The target to check grudge against
     * @returns {number} - Grudge level (0 = no grudge, 1+ = number of times hit by target)
     */
    _getGrudgeLevel(target) {
        if (!target || !this.attackerHistory) return 0;

        const entry = this.attackerHistory.get(target);
        if (!entry) return 0;

        // Handle both old format (timestamp only) and new format ({timestamp, hitCount})
        if (typeof entry === 'object' && entry.hitCount) {
            return entry.hitCount;
        }
        return 1; // Old format fallback
    }
}

// Apply utility methods to Enemy prototype
// This will be called after Enemy class is defined
function applyEnemyUtilityMethods() {
    if (typeof Enemy === 'undefined') {
        console.error('Enemy class not found - cannot apply utility methods');
        return;
    }

    // Copy all methods from EnemyUtils to Enemy prototype
    Object.getOwnPropertyNames(EnemyUtils.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyUtils.prototype[methodName];
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyUtils, applyEnemyUtilityMethods, getDeltaSeconds, getTimeScale };
    global.EnemyUtils = EnemyUtils;
    global.applyEnemyUtilityMethods = applyEnemyUtilityMethods;
    global.getDeltaSeconds = getDeltaSeconds;
    global.getTimeScale = getTimeScale;
}
