/**
 * Shared Physics Module
 * Contains common physics and movement logic shared between Player and Enemy classes.
 * Reduces duplication and ensures consistent behavior for thrust, drag, and effects.
 * 
 * FRAME-RATE INDEPENDENCE:
 * All physics calculations use a 60 FPS baseline (16.67ms per frame) as the reference.
 * The timeScale multiplier normalizes all frame rates to this baseline:
 * - At 60fps: timeScale = 1.0 (baseline)
 * - At 30fps: timeScale = 2.0 (apply 2x force per frame to compensate for half the frames)
 * - At 120fps: timeScale = 0.5 (apply half force per frame to compensate for double frames)
 * 
 * This ensures consistent game speed regardless of frame rate.
 * All thrust and drag operations MUST apply timeScale or behavior will be frame-rate dependent.
 */

// Constants for shared physics behavior
const SHARED_PHYSICS_CONFIG = {
    // Tangle effect settings
    TANGLE_JITTER_INTERVAL: 0.08, // Seconds between jitter updates
    TANGLE_ROTATION_MAGNITUDE: 0.1, // Radians
    TANGLE_POSITION_JITTER_CHANCE: 0.5,
    TANGLE_POSITION_MAGNITUDE: 0.03,

    // Thresholds
    MIN_THRUST_THRESHOLD: 0.01,

    // Particle sizing
    STRAFE_PARTICLE_SIZE_MULT: 0.8,
    REVERSE_PARTICLE_SIZE_MULT: 0.6,
    RETRO_THRUST_ANGLE_OFFSET: 0.15, // Percent of PI

    // Analog visual scaling for thrust particles
    MIN_THRUST_PARTICLES: 2,
    MAX_THRUST_PARTICLES: 6,
    THRUST_PARTICLE_SCALE: 3
};

class SharedPhysics {
    // Static temporary vector for performance (avoid per-frame allocation)
    static _tempVec = null;

    static _getThrustParticleCount(multiplier) {
        return Math.max(
            SHARED_PHYSICS_CONFIG.MIN_THRUST_PARTICLES,
            Math.min(
                SHARED_PHYSICS_CONFIG.MAX_THRUST_PARTICLES,
                Math.ceil(multiplier * SHARED_PHYSICS_CONFIG.THRUST_PARTICLE_SCALE)
            )
        );
    }

    /**
     * Applies forward thrust to an entity
     * @param {Object} entity - The ship entity (Player or Enemy)
     * @param {number} multiplier - Thrust strength multiplier (default 1.0)
     * @param {boolean} createParticles - Whether to generate visual particles
     * @param {number|null} dt - Delta time in seconds (optional)
     */
    static thrustForward(entity, multiplier = 1.0, createParticles = true, dt = null) {
        if (!entity || !entity.pos || !entity.vel) return;

        // Handle persisted thrust for AI throttling if property exists
        if (entity._persistedThrust !== undefined) {
            entity._persistedThrust = multiplier;
        }

        if (multiplier <= SHARED_PHYSICS_CONFIG.MIN_THRUST_THRESHOLD) {
            // Signal stop if below threshold (optional but good for visuals)
            if (multiplier === 0) entity.isThrusting = false;
            return;
        }

        const actualDt = dt !== null ? dt : (typeof getDeltaSeconds === 'function' ? getDeltaSeconds() : (typeof deltaTime !== 'undefined' ? deltaTime / 1000 : 1 / 60));
        const timeScale = actualDt / (1 / 60);

        // Ensure angle is valid
        if (isNaN(entity.angle)) entity.angle = 0;

        // Calculate thrust vector
        const force = (entity.thrustForce || 0) * multiplier;

        // Apply to velocity (Frame-rate independent: scaled by timeScale)
        entity.vel.add(cos(entity.angle) * force * timeScale, sin(entity.angle) * force * timeScale);

        // Update state flag
        entity.isThrusting = true;

        // Visual particles
        if (createParticles && entity.thrustManager) {
            // Check for alien ship flag (Enemy specific)
            const isAlien = (typeof entity._isAlienShip === 'function') ? entity._isAlienShip() : false;

            if (!isAlien) {
                const isBoosting = !!entity.isSpeedBursting;
                let thrustCount = SharedPhysics._getThrustParticleCount(multiplier);
                if (isBoosting) {
                    thrustCount = Math.ceil(thrustCount * 2.5);
                }
                entity.thrustManager.createThrust(entity.pos, entity.angle, entity.size, thrustCount, isBoosting);
            }
        }
    }

    /**
     * Applies strafing thrust (left/right)
     * @param {Object} entity - The ship entity
     * @param {number} direction - -1 for Left, 1 for Right
     * @param {number} multiplier - Thrust multiplier
     * @param {boolean} createParticles - Whether to create visual thrust particles
     * @param {number|null} dt - Delta time in seconds (optional)
     */
    static thrustStrafe(entity, direction, multiplier = 0.8, createParticles = true, dt = null) {
        if (!entity || !entity.pos || !entity.vel) return;

        if (multiplier <= SHARED_PHYSICS_CONFIG.MIN_THRUST_THRESHOLD) return;
        if (isNaN(entity.angle)) entity.angle = 0;

        const actualDt = dt !== null ? dt : (typeof getDeltaSeconds === 'function' ? getDeltaSeconds() : (typeof deltaTime !== 'undefined' ? deltaTime / 1000 : 1 / 60));
        const timeScale = actualDt / (1 / 60);

        // Calculate angle (Left = -PI/2, Right = +PI/2)
        const strafeAngle = entity.angle + (direction * HALF_PI);
        const force = (entity.thrustForce || 0) * multiplier;

        // Apply to velocity (Frame-rate independent: scaled by timeScale)
        entity.vel.add(cos(strafeAngle) * force * timeScale, sin(strafeAngle) * force * timeScale);

        // Update state flag (Strafe is still thrusting)
        entity.isThrusting = true;

        // Visual particles
        if (createParticles && entity.thrustManager) {
            const isAlien = (typeof entity._isAlienShip === 'function') ? entity._isAlienShip() : false;

            if (!isAlien) {
                const thrustCount = SharedPhysics._getThrustParticleCount(multiplier);

                entity.thrustManager.createThrust(
                    entity.pos,
                    strafeAngle,
                    entity.size * SHARED_PHYSICS_CONFIG.STRAFE_PARTICLE_SIZE_MULT,
                    thrustCount
                );
            }
        }
    }

    /**
     * Applies reverse thrust
     * @param {Object} entity - The ship entity
     * @param {number} multiplier - Thrust multiplier
     * @param {boolean} createParticles - Whether to create visual thrust particles
     * @param {number|null} dt - Delta time in seconds (optional)
     */
    static thrustReverse(entity, multiplier = 0.6, createParticles = true, dt = null) {
        if (!entity || !entity.pos || !entity.vel) return;

        if (multiplier <= SHARED_PHYSICS_CONFIG.MIN_THRUST_THRESHOLD) return;

        const actualDt = dt !== null ? dt : (typeof getDeltaSeconds === 'function' ? getDeltaSeconds() : (typeof deltaTime !== 'undefined' ? deltaTime / 1000 : 1 / 60));
        const timeScale = actualDt / (1 / 60);

        if (isNaN(entity.angle)) entity.angle = 0;
        const reverseAngle = entity.angle + PI;
        const force = (entity.thrustForce || 0) * multiplier;

        // Apply to velocity (Frame-rate independent: scaled by timeScale)
        entity.vel.add(cos(reverseAngle) * force * timeScale, sin(reverseAngle) * force * timeScale);

        // Update state flag (Reverse is still thrusting)
        entity.isThrusting = true;

        // Visual particles (retro-thrusters)
        if (createParticles && entity.thrustManager) {
            const isAlien = (typeof entity._isAlienShip === 'function') ? entity._isAlienShip() : false;

            if (!isAlien) {
                const offset = PI * SHARED_PHYSICS_CONFIG.RETRO_THRUST_ANGLE_OFFSET;
                const size = entity.size * SHARED_PHYSICS_CONFIG.REVERSE_PARTICLE_SIZE_MULT;
                const thrustCount = SharedPhysics._getThrustParticleCount(multiplier);

                // Front-left and Front-right retro thrusters
                entity.thrustManager.createThrust(entity.pos, entity.angle + PI - offset, size, thrustCount);
                entity.thrustManager.createThrust(entity.pos, entity.angle + PI + offset, size, thrustCount);
            }
        }
    }

    /**
     * Updates physics state: applies drag, tangle effects, and speed capping
     * @param {Object} entity - The ship entity
     * @param {number} deltaTimeSeconds - Delta time in seconds
     */
    static updatePhysics(entity, deltaTimeSeconds) {
        if (!entity || !entity.vel) return;
        if (entity.destroyed) return;

        // Establish time scale for frame-rate independence (normalized to ~60fps)
        const physicsTimeScale = (isNaN(deltaTimeSeconds) || deltaTimeSeconds <= 0)
            ? 1.0
            : deltaTimeSeconds / (1.0 / 60.0);

        // 1. DRAG & TANGLE PHASES

        // Skip drag if speed bursting (unless coasting logic handles it differently in specific classes,
        // but generally burst overrides drag)
        if (!entity.isSpeedBursting) {

            // Check for Tangle/Web effect
            const hasTangle = (entity.dragMultiplier > 1.0 && entity.dragEffectTimer > 0);

            if (hasTangle) {
                // Apply normal drag first
                const baseDrag = (typeof entity.drag === 'number') ? entity.drag : 0.985;
                const dragFactor = Math.pow(baseDrag, physicsTimeScale);
                entity.vel.mult(dragFactor);

                // Calculate tangle limitation
                // entity.dragMultiplier comes from weapon effect (e.g. 10.0)
                // We want speed to be 1/10th or similar.
                // Formula matched from Player.js/EnemyMovement.js
                const safeMult = Math.max(entity.dragMultiplier, 0.001);
                const tangledSpeedFactor = Math.min(1 / safeMult, 1.0);

                // Apply tangle factor
                entity.vel.mult(Math.pow(tangledSpeedFactor, physicsTimeScale));

                // Apply Jitter (Visual effect of being tangled)
                SharedPhysics._applyTangleJitter(entity, deltaTimeSeconds);

                // Tick down timer
                entity.dragEffectTimer -= deltaTimeSeconds;
                if (entity.dragEffectTimer <= 0) {
                    entity.dragMultiplier = 1.0;
                    entity.dragEffectTimer = 0;
                }
            } else {
                // Normal Drag
                let effectiveDrag = (typeof entity.drag === 'number') ? entity.drag : 0.985;

                // Braking support (for AI states like NEAR_STATION)
                if (typeof entity.brakingMultiplier === 'number') {
                    effectiveDrag *= entity.brakingMultiplier;
                } else if (typeof AI_STATE !== 'undefined' && entity.currentState === AI_STATE.NEAR_STATION) {
                    // Legacy fallback for AI roles not yet using brakingMultiplier
                    effectiveDrag *= 0.8;
                }

                entity.vel.mult(Math.pow(effectiveDrag, physicsTimeScale));
            }

            // Coasting logic
            if (entity.isCoastingFromBurst) {
                // Use current maxSpeed (which includes engine upgrades) as floor
                const baseSpeed = entity.maxSpeed || entity.baseMaxSpeed || 5;
                if (entity.vel.magSq() < (baseSpeed * 1.05) ** 2) {
                    entity.isCoastingFromBurst = false;
                }
            }
        }

        // 2. SPEED CAPPING

        const currentSpeed = entity.vel.mag();
        let currentCap = entity.maxSpeed;

        // Boost override
        if ((entity.isSpeedBursting || entity.isCoastingFromBurst)) {
            const boostMult = entity.speedBurstMultiplier || entity.boostMultiplier || 1;
            if (boostMult > 1) {
                const baseSpeed = entity.baseMaxSpeed || entity.maxSpeed || 0;
                currentCap = baseSpeed * boostMult;
            }
        }

        if (currentSpeed > currentCap) {
            // Speed burst or coasting: Soft decay of excess speed
            if (entity.isSpeedBursting || entity.isCoastingFromBurst) {
                const excess = currentSpeed - currentCap;
                const decayedExcess = excess * Math.pow(0.9, physicsTimeScale);
                entity.vel.setMag(currentCap + decayedExcess);
            } else {
                // Normal flight: Hard clamp (Prevents "speed-cheating" during strafe turns)
                entity.vel.limit(currentCap);
            }
        }

        // 3. POSITION UPDATE
        if (!isNaN(entity.vel.x) && !isNaN(entity.vel.y)) {
            // Optimized position update avoiding per-frame vector allocation
            if (!SharedPhysics._tempVec) {
                SharedPhysics._tempVec = (typeof createVector === 'function') ? createVector(0, 0) : { x: 0, y: 0 };
            }

            // In p5.js environment, we use the vector methods
            if (typeof SharedPhysics._tempVec.set === 'function') {
                SharedPhysics._tempVec.set(entity.vel.x, entity.vel.y).mult(physicsTimeScale);
                entity.pos.add(SharedPhysics._tempVec);
            } else {
                // Fallback for non-p5 environments
                entity.pos.x += entity.vel.x * physicsTimeScale;
                entity.pos.y += entity.vel.y * physicsTimeScale;
            }
        } else {
            entity.vel.set(0, 0);
        }

        // 4. THRUST MANAGER UPDATE
        if (entity.thrustManager) {
            entity.thrustManager.update();
        }

        // Note: isThrusting flag is NOT reset here.
        // Player resets it per-frame in handleInput().
        // Enemy resets it in updatePhysics() (handled by EnemyMovement's original logic preserved separately).
    }

    /**
     * Internal helper for tangle jitter
     * Unified logic from Player and Enemy
     */
    static _applyTangleJitter(entity, dt) {
        // Use a property on entity to track jitter timer
        // Standardize on _tangleJitterTimer
        if (!entity._tangleJitterTimer) entity._tangleJitterTimer = 0;

        entity._tangleJitterTimer += dt;

        if (entity._tangleJitterTimer >= SHARED_PHYSICS_CONFIG.TANGLE_JITTER_INTERVAL) {
            entity._tangleJitterTimer -= SHARED_PHYSICS_CONFIG.TANGLE_JITTER_INTERVAL;

            // Rotation jitter
            // Using simple random rotate
            const rotMag = SHARED_PHYSICS_CONFIG.TANGLE_ROTATION_MAGNITUDE;
            entity.vel.rotate(random(-rotMag, rotMag));

            // Position jitter (Player had this, Enemy didn't - adding for both for consistency)
            // It adds a nice "struggling" feel
            if (random() < SHARED_PHYSICS_CONFIG.TANGLE_POSITION_JITTER_CHANCE) {
                const posMag = SHARED_PHYSICS_CONFIG.TANGLE_POSITION_MAGNITUDE;
                entity.vel.add(random(-posMag, posMag), random(-posMag, posMag));
            }
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SharedPhysics, SHARED_PHYSICS_CONFIG };
    // Also expose to global scope for browser without modules
    global.SharedPhysics = SharedPhysics;
}
