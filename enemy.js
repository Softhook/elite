// ****** Enemy.js ******

// Define AI States using a constant object for readability and maintainability
const AI_STATE = {
    IDLE: 0,          // Doing nothing, player too far or non-existent
    APPROACHING: 1,   // Detected player, moving towards an intercept point
    ATTACK_PASS: 2,   // Close to player, performing a fly-by maneuver while firing
    REPOSITIONING: 3  // Moving away after a pass to set up the next approach
};

class Enemy {
    /**
     * Creates an Enemy instance with attack pass AI using realistic thrust/rotation.
     * @param {number} x - Initial world X coordinate.
     * @param {number} y - Initial world Y coordinate.
     * @param {Player} playerRef - A reference to the player object for targeting.
     */
    constructor(x, y, playerRef) {
        this.pos = createVector(x, y); // World coordinates
        this.vel = createVector(0, 0); // Start with zero velocity for controlled movement
        this.angle = random(TWO_PI);   // Initial random facing direction (Radians, 0 = right)
        this.size = 25;                // Visual diameter and approx collision size

        // --- Core Movement Properties ---
        this.maxSpeed = 1.8;           // Maximum movement speed
        this.thrustForce = 0.08;       // Force applied when thrusting forward (adjust for acceleration)
        this.rotationSpeed = radians(3.5); // Max rotation per frame (RADIANS) - adjust for turn rate
        this.drag = 0.985;             // Friction/drag factor (closer to 1 = less drag)
        // Angle tolerance (RADIANS): Thrust is applied if angle difference is less than this
        this.angleTolerance = radians(15); // e.g., Allow thrust if within 15 degrees of target

        // --- Stats ---
        this.hull = 30;
        this.maxHull = 30;
        this.destroyed = false; // Flag indicating if the enemy is destroyed

        // --- Visuals ---
        this.color = color(255, 50, 50); // Red body
        this.strokeColor = color(255, 150, 150); // Lighter red outline

        // --- Targeting ---
        this.target = playerRef; // Reference to the player object (needs pos and vel)

        // --- AI State & Variables ---
        this.currentState = AI_STATE.IDLE;     // Initial state
        this.repositionTarget = null;          // Target position vector for repositioning state
        // Removed passTargetPoint, simplifying pass behavior
        this.passTimer = 0;                    // Timer for duration of the ATTACK_PASS state

        // --- AI Tuning Parameters (Adjust these to change behavior) ---
        this.detectionRange = 450;         // Distance to notice player and switch to APPROACHING
        this.engageDistance = 180;         // Distance to switch from APPROACHING to ATTACK_PASS
        this.firingRange = 300;            // Maximum weapon range
        this.repositionDistance = 350;     // Distance to move away during REPOSITIONING before turning back
        this.predictionTime = 0.4;         // How far ahead (in seconds, approx) to predict player pos for intercept
        // Removed passOffsetDistance
        this.passDuration = 1.0;           // How long (seconds) the ATTACK_PASS state lasts before repositioning
        // --- End Tuning ---

        // --- Weapon ---
        this.fireCooldown = random(0.5, 1.5); // Initial random firing delay
        this.fireRate = 1.0;                  // Seconds between shots
    }

    /**
     * Predicts the player's future position based on current position and velocity.
     * Note: Simple linear prediction; accuracy depends on stable frame rate if player velocity isn't deltaTime adjusted.
     * @returns {p5.Vector | null} Predicted position vector or null if target is invalid.
     */
    predictTargetPosition() {
        if (!this.target || !this.target.pos || !this.target.vel) {
            return this.target?.pos || null; // Return current pos or null
        }
        // Simple prediction: current_pos + velocity * prediction_time_scaled
        // Scale predictionTime (seconds) by approx framerate (60 FPS baseline)
        let predictionFactor = this.predictionTime * (deltaTime ? (60 / (1000 / deltaTime)) : 60);
        let predictedPos = p5.Vector.add(this.target.pos, p5.Vector.mult(this.target.vel, predictionFactor));
        return predictedPos;
    }

    /**
     * Rotates the enemy towards a target angle, respecting max rotation speed.
     * Stores angle internally in radians.
     * @param {number} targetAngleRadians - The desired angle in radians.
     * @returns {number} The actual angle difference remaining after rotation (in radians).
     */
    rotateTowards(targetAngleRadians) {
        // Calculate the shortest angle difference (in radians) between current and target angle
        let angleDiff = targetAngleRadians - this.angle;
        // Adjust difference to be in the range -PI to PI for accurate rotation direction
        while (angleDiff < -PI) angleDiff += TWO_PI;
        while (angleDiff > PI) angleDiff -= TWO_PI;

        // Apply rotation only if the difference is larger than a small threshold (prevents wobbling)
        const rotationThreshold = 0.02; // Approx 1 degree in radians
        if (abs(angleDiff) > rotationThreshold) {
            // Determine the amount to rotate this frame, limited by max rotationSpeed
            let rotationStep = constrain(angleDiff, -this.rotationSpeed, this.rotationSpeed);
            this.angle += rotationStep; // Update the facing angle
            // Normalize angle to be within 0 to TWO_PI range (optional but good practice)
            this.angle = (this.angle + TWO_PI) % TWO_PI;
            // Return the difference *after* this rotation step
            return angleDiff - rotationStep;
        } else {
             // If difference is within threshold, consider it aligned
             // Optional: Snap perfectly? this.angle = targetAngleRadians;
             return 0; // Report zero difference if aligned or nearly aligned
        }
    }

    /**
     * Applies forward thrust force based on the ship's current facing angle.
     * Modifies the velocity vector.
     */
    thrustForward() {
        // Create a force vector pointing in the ship's current direction (this.angle is radians)
        let force = p5.Vector.fromAngle(this.angle); // fromAngle expects radians
        force.mult(this.thrustForce); // Scale by the thrust magnitude
        this.vel.add(force); // Add force to the current velocity
    }

    /**
     * Updates the enemy's state machine, rotation, thrust, and firing logic each frame.
     * @param {StarSystem} system - Reference to the current star system (for adding projectiles).
     */
    update(system) {
        if (this.destroyed) return; // Do nothing if destroyed

        // Update weapon cooldown
        this.fireCooldown -= deltaTime / 1000;

        // --- State Determination ---
        let targetExists = this.target && this.target.hull > 0;
        let distanceToTarget = targetExists ? dist(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y) : Infinity;
        let desiredMovementTargetPos = null; // Position the ship WANTS to move towards
        let finalShootingAngle = this.angle; // Angle to shoot towards (Radians), defaults to current facing

        // --- Calculate Direct Angle to Player (if target exists) - DO THIS ONCE ---
        // Explicitly convert the result of atan2 to radians, just in case angleMode interferes.
        if (targetExists) {
            let directAngleToPlayerDeg = atan2(this.target.pos.y - this.pos.y, this.target.pos.x - this.pos.x);
            finalShootingAngle = radians(directAngleToPlayerDeg); // Ensure radians for firing
        }
        // ---

        // --- State Machine Logic ---
        switch (this.currentState) {
            case AI_STATE.IDLE:
                this.vel.mult(this.drag * 0.95); // Slow down faster when idle
                if (targetExists && distanceToTarget < this.detectionRange) {
                    this.currentState = AI_STATE.APPROACHING;
                }
                // No movement target when idle
                break;

            case AI_STATE.APPROACHING:
                if (!targetExists || distanceToTarget > this.detectionRange * 1.1) { // Lose target check
                    this.currentState = AI_STATE.IDLE; break;
                }
                // Target predicted player position for movement interception
                desiredMovementTargetPos = this.predictTargetPosition();
                // Shooting angle is already calculated (direct angle to player)

                // Transition to attack pass if close enough
                if (distanceToTarget < this.engageDistance) {
                    this.currentState = AI_STATE.ATTACK_PASS;
                    this.passTimer = this.passDuration;
                    // Pass target logic removed for simplification
                }
                break;

            case AI_STATE.ATTACK_PASS:
                if (!targetExists) { this.currentState = AI_STATE.IDLE; break; } // Lose target check
                this.passTimer -= deltaTime / 1000;

                // Movement target during pass: Aim slightly ahead of player
                 if (this.target?.vel) {
                     let pointAhead = p5.Vector.add(this.target.pos, this.target.vel.copy().setMag(100)); // Aim 100 units ahead
                     desiredMovementTargetPos = pointAhead;
                 } else {
                     desiredMovementTargetPos = this.target?.pos; // Fallback: aim at current pos
                 }
                // Shooting angle is already calculated (direct angle to player)

                // Transition out of pass state when timer expires
                if (this.passTimer <= 0) {
                    this.currentState = AI_STATE.REPOSITIONING;
                    if (targetExists) { // Calculate repo target only if player exists
                        let vectorAway = p5.Vector.sub(this.pos, this.target.pos);
                        vectorAway.setMag(this.repositionDistance * 1.5); // Aim further out
                        this.repositionTarget = p5.Vector.add(this.pos, vectorAway);
                    } else { this.repositionTarget = null; }
                }
                break;

            case AI_STATE.REPOSITIONING:
                 if (!targetExists) { this.currentState = AI_STATE.IDLE; break; } // Lose target check
                 // Movement target is the reposition point
                 desiredMovementTargetPos = this.repositionTarget;
                 // Don't typically fire while repositioning

                 // Check conditions to transition back to APPROACHING
                 let distToRepoTarget = this.repositionTarget ? dist(this.pos.x, this.pos.y, this.repositionTarget.x, this.repositionTarget.y) : Infinity;
                 // Transition if target point missing, or far enough from player, or near the repo target
                 if (!desiredMovementTargetPos || distanceToTarget > this.repositionDistance || distToRepoTarget < 50) {
                     this.currentState = AI_STATE.APPROACHING;
                     this.repositionTarget = null; // Clear the reposition target
                 }
                 break;

             default: // Fallback for unknown state
                 console.error("Enemy in unknown AI state:", this.currentState);
                 this.currentState = AI_STATE.IDLE;
                 break;
        } // End State Machine Switch

        // --- Perform Rotation & Thrust ---
        let angleDifference = PI; // Assume max difference if no target
        if (desiredMovementTargetPos) {
            // Calculate angle needed to face the desired movement target (assume degrees, convert)
            let targetMoveAngleDeg = atan2(desiredMovementTargetPos.y - this.pos.y, desiredMovementTargetPos.x - this.pos.x);
            let targetMoveAngleRad = radians(targetMoveAngleDeg); // Ensure Radians
            // Rotate the ship towards that movement angle
            angleDifference = this.rotateTowards(targetMoveAngleRad);
        } else if (this.currentState === AI_STATE.IDLE) {
             // If idle with no target, don't rotate, just drift
             angleDifference = 0; // Allow drag only
        }

        // Apply forward thrust ONLY if facing roughly the correct direction for movement
        if (this.currentState !== AI_STATE.IDLE && abs(angleDifference) < this.angleTolerance) {
            this.thrustForward();
        }

        // --- Apply Physics ---
        this.vel.mult(this.drag); // Apply drag
        this.vel.limit(this.maxSpeed); // Clamp speed
        this.pos.add(this.vel); // Update position

        // --- Firing Logic ---
        if (targetExists && distanceToTarget < this.firingRange && this.fireCooldown <= 0) {
            // Only fire in attacking states
            if (this.currentState === AI_STATE.APPROACHING || this.currentState === AI_STATE.ATTACK_PASS) {
                // Use the finalShootingAngle (already calculated and verified as radians)
                this.fire(system, finalShootingAngle);
                this.fireCooldown = this.fireRate;
            }
        }

    } // End update method

    /**
     * Creates and adds a projectile aimed in the specified direction.
     * @param {StarSystem} system - The system to add the projectile to.
     * @param {number} fireAngleRadians - The angle (in radians) for the projectile's velocity.
     */
    fire(system, fireAngleRadians) {
        if (!system) { console.warn("Enemy.fire called without system."); return; }

        // Calculate spawn position slightly ahead of the enemy ship's nose (using current FACING angle)
        let spawnOffset = p5.Vector.fromAngle(this.angle).mult(this.size * 0.7); // this.angle is radians
        let spawnPos = p5.Vector.add(this.pos, spawnOffset);

        // Create projectile using the passed fireAngle (radians) for its direction
        let proj = new Projectile(spawnPos.x, spawnPos.y, fireAngleRadians, 'ENEMY', 5, 5);
        system.addProjectile(proj);
    }

    /**
     * Draws the enemy ship and the debug line to the player.
     */
    draw() {
        if (this.destroyed) return; // Don't draw if destroyed

        push(); // Isolate transformations for the ship body
        translate(this.pos.x, this.pos.y); // Move origin to enemy's world position
        rotate(degrees(this.angle)); // Apply rotation (convert internal radians angle to degrees)

        // Draw ship body (triangle pointing right)
        fill(this.color); stroke(this.strokeColor); strokeWeight(1);
        let r = this.size / 2;
        triangle(r, 0, -r, -r*0.7, -r, r*0.7); // Shape vertices
        pop(); // Restore previous drawing state

        // --- DEBUG LINE from Enemy to Player ---
        // Only draw if target exists AND enemy is in an attacking/approaching state
        if (this.target && this.target.pos &&
            (this.currentState === AI_STATE.APPROACHING || this.currentState === AI_STATE.ATTACK_PASS))
        {
             push();
             stroke(255, 0, 0, 100); // Red, semi-transparent line
             strokeWeight(1);
             // Line from enemy center (world coords) to player center (world coords)
             line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
             pop();
        }
        // --- END DEBUG LINE ---

        // --- Optional DEBUG STATE TEXT (remains commented out) ---
        // ...
        // --- END DEBUG ---
    }

    /**
     * Applies damage to the enemy's hull.
     * @param {number} amount - The amount of damage.
     */
    takeDamage(amount) {
        if (this.destroyed || amount <= 0) return;
        this.hull -= amount;
        if (this.hull <= 0) {
            this.hull = 0; this.destroyed = true;
            console.log("Enemy destroyed!");
        }
    }

    /** @returns {boolean} True if the enemy is destroyed. */
    isDestroyed() { return this.destroyed; }

    /**
     * Basic circle-based collision check.
     * @param {object} target - Object with pos {x, y} and size properties.
     * @returns {boolean} True if collision detected.
     */
    checkCollision(target) {
        if (!target || !target.pos || target.size === undefined) return false;
        let d = dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
        let tr = target.size / 2; let mr = this.size / 2;
        return d < tr + mr;
    }

} // End of Enemy Class