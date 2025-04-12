// ****** Enemy.js ******

// Define AI Roles
const AI_ROLE = { PIRATE: 'Pirate', POLICE: 'Police', HAULER: 'Hauler' };
// Define AI States
const AI_STATE = { IDLE: 0, APPROACHING: 1, ATTACK_PASS: 2, REPOSITIONING: 3, PATROLLING: 4, NEAR_STATION: 5, LEAVING_SYSTEM: 6 };

class Enemy {
    // --- constructor (as before) ---
    constructor(x, y, playerRef, shipTypeName, role) {
        const shipDef = SHIP_DEFINITIONS[shipTypeName] || SHIP_DEFINITIONS["Krait"];
        if (shipDef.name !== shipTypeName) { shipTypeName = shipDef.name; }
        this.shipTypeName = shipTypeName; this.role = role;
        this.pos = createVector(x, y); this.vel = createVector(0, 0); this.angle = random(TWO_PI);
        this.size = shipDef.size; this.baseMaxSpeed = shipDef.baseMaxSpeed; this.baseThrust = shipDef.baseThrust;
        this.baseTurnRateDegrees = shipDef.baseTurnRateDegrees;
        this.rotationSpeedDegrees = this.baseTurnRateDegrees * (this.role === AI_ROLE.HAULER ? 0.7 : 0.9);
        this.angleToleranceDegrees = 15; this.rotationSpeed = 0; this.angleTolerance = 0;
        this.maxSpeed = this.baseMaxSpeed * (this.role === AI_ROLE.HAULER ? 0.7 : 0.9);
        this.thrustForce = this.baseThrust * (this.role === AI_ROLE.HAULER ? 0.8 : 0.9);
        this.drag = 0.985; this.maxHull = shipDef.baseHull; this.hull = this.maxHull; this.destroyed = false;
        this.color = color(random(80, 180), random(80, 180), random(80, 180));
        switch(this.role) { case AI_ROLE.POLICE: this.strokeColor=color(100,150,255); break; case AI_ROLE.HAULER: this.strokeColor=color(200,200,100); break; case AI_ROLE.PIRATE: this.strokeColor=color(255,100,100); break; default: this.strokeColor=color(200); }
        this.isThargoid = (this.shipTypeName === "Thargoid");
        if (this.isThargoid) { this.rotationSpeedDegrees = this.baseTurnRateDegrees; this.angleToleranceDegrees = 5; /* ... other overrides ... */ this.strokeColor = color(0, 255, 150);}
        this.target = playerRef; this.currentState = AI_STATE.IDLE;
        this.repositionTarget = null; this.passTimer = 0; this.nearStationTimer = 0; this.hasPausedNearStation = false; this.patrolTargetPos = null;
        this.detectionRange = 450 + this.size; this.engageDistance = 180 + this.size * 0.5; this.firingRange = 280 + this.size * 0.3; this.repositionDistance = 300 + this.size; this.predictionTime = 0.4; this.passDuration = 1.0 + this.size * 0.01; this.stationPauseDuration = random(3, 7); this.stationProximityThreshold = 150;
        this.fireCooldown = random(1.0, 2.5); this.fireRate = 1.0 / max(0.5, this.rotationSpeedDegrees / 3.0);
        switch(this.role) { case AI_ROLE.HAULER: this.currentState = AI_STATE.PATROLLING; break; case AI_ROLE.POLICE: this.currentState = AI_STATE.PATROLLING; break; case AI_ROLE.PIRATE: this.currentState = AI_STATE.IDLE; break; default: this.currentState = AI_STATE.IDLE; }
        if (this.isThargoid) { this.currentState = AI_STATE.APPROACHING; }
        // Note: calculateRadianProperties() must be called externally after construction
    }

    /** Calculates and sets radian-based properties. */
    calculateRadianProperties() {
         if (typeof radians !== 'function') { this.rotationSpeed = 0.06; this.angleTolerance = 0.26; return; } // Fallback if p5 not ready
         try {
             this.rotationSpeed = radians(this.rotationSpeedDegrees); this.angleTolerance = radians(this.angleToleranceDegrees);
             if (isNaN(this.rotationSpeed) || isNaN(this.angleTolerance)) throw new Error("NaN result");
         } catch(e) { this.rotationSpeed = 0.06; this.angleTolerance = 0.26; } // Fallback values
    }

    /** Predicts player's future position. */
    predictTargetPosition() {
        if (!this.target?.pos || !this.target?.vel) return this.target?.pos || null;
        let predictionFactor = this.predictionTime * (deltaTime ? (60 / (1000/deltaTime)) : 60);
        return p5.Vector.add(this.target.pos, p5.Vector.mult(this.target.vel, predictionFactor));
    }

    /** Rotates towards target angle (radians). Returns remaining difference (radians). */
    rotateTowards(targetAngleRadians) {
        let angleDiff = targetAngleRadians - this.angle;
        while (angleDiff < -PI) angleDiff += TWO_PI; while (angleDiff > PI) angleDiff -= TWO_PI;
        const rotationThreshold = 0.02;
        if (abs(angleDiff) > rotationThreshold) {
            let rotationStep = constrain(angleDiff, -this.rotationSpeed, this.rotationSpeed);
            this.angle = (this.angle + rotationStep + TWO_PI) % TWO_PI;
            return angleDiff - rotationStep;
        }
        return 0;
    }

    /** Applies forward thrust. */
    thrustForward() {
        let force = p5.Vector.fromAngle(this.angle); force.mult(this.thrustForce); this.vel.add(force);
    }

    /**
     * Sets a target position far away for Haulers leaving the system.
     * @param {StarSystem} system - The current star system to get despawn radius from.
     */
    setLeavingSystemTarget(system) { // <-- Added system parameter
        let exitAngle = random(TWO_PI);
        // --- Use passed system parameter ---
        let exitDist = (system?.despawnRadius || 3000) * 1.5; // Use system's radius or fallback
        // ----------------------------------
        this.patrolTargetPos = createVector(cos(exitAngle) * exitDist, sin(exitAngle) * exitDist);
        this.currentState = AI_STATE.LEAVING_SYSTEM;
        this.hasPausedNearStation = false; // Reset flag
        console.log(`Hauler ${this.shipTypeName} leaving towards (${this.patrolTargetPos.x.toFixed(0)}, ${this.patrolTargetPos.y.toFixed(0)})`);
    }

    /** Updates the enemy's state machine, movement, and actions based on role. */
    update(system) {
        if (this.destroyed) return;
        this.fireCooldown -= deltaTime / 1000;
        // Delegate to role-specific update logic, passing system reference
        switch (this.role) {
            case AI_ROLE.PIRATE: this.updateCombatAI(system); break;
            case AI_ROLE.POLICE: this.updatePoliceAI(system); break;
            case AI_ROLE.HAULER: this.updateHaulerAI(system); break; // Pass system here
            default: this.vel.mult(this.drag * 0.95); break;
        }
        this.vel.mult(this.drag); this.vel.limit(this.maxSpeed); this.pos.add(this.vel); // Apply physics
    }

    /** Common Combat AI Logic (Attack Pass) - Used by Pirates and hostile Police. */
    updateCombatAI(system) {
        let targetExists = this.target?.hull > 0;
        let distanceToTarget = targetExists ? dist(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y) : Infinity;
        let desiredMovementTargetPos = null; let shootingAngle = this.angle;
        if (targetExists) { shootingAngle = radians(atan2(this.target.pos.y - this.pos.y, this.target.pos.x - this.pos.x)); }
        switch (this.currentState) { /* Pirate state machine logic */ }
        let angleDifference = this.performRotationAndThrust(desiredMovementTargetPos);
        this.performFiring(system, targetExists, distanceToTarget, shootingAngle);
    }

    /** Police AI Logic - Patrols, switches to Combat AI if player is wanted. */
    updatePoliceAI(system) {
        let targetExists = this.target?.hull > 0;
        let distanceToTarget = targetExists ? dist(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y) : Infinity;
        let isAggressive = targetExists && this.target.isWanted === true;
        let shootingAngle = this.angle; // Need to calculate if aggressive

        if (isAggressive && this.currentState === AI_STATE.PATROLLING) { this.currentState = AI_STATE.APPROACHING; }
        else if (!isAggressive && (this.currentState !== AI_STATE.PATROLLING && this.currentState !== AI_STATE.IDLE)) {
            this.currentState = AI_STATE.PATROLLING;
            if (system?.station) this.patrolTargetPos = system.station.pos.copy();
            else this.patrolTargetPos = createVector(random(-500, 500), random(-500, 500));
        }

        if (isAggressive) {
            if (targetExists) shootingAngle = radians(atan2(this.target.pos.y - this.pos.y, this.target.pos.x - this.pos.x));
             // --- Run Aggressive State Logic ---
             let desiredMovementTargetPos_Aggro = null;
             switch (this.currentState) { /* Attack Pass States */ }
             this.performRotationAndThrust(desiredMovementTargetPos_Aggro);
             this.performFiring(system, targetExists, distanceToTarget, shootingAngle); // Fire if aggressive state allows
        } else {
            // --- Run Patrolling Logic ---
            this.currentState = AI_STATE.PATROLLING;
            let desiredMovementTargetPos_Patrol = this.patrolTargetPos;
             let distToPatrolTarget = desiredMovementTargetPos_Patrol ? dist(this.pos.x, this.pos.y, desiredMovementTargetPos_Patrol.x, desiredMovementTargetPos_Patrol.y) : Infinity;
             if (!desiredMovementTargetPos_Patrol || distToPatrolTarget < 50) {
                 if(system?.station) this.patrolTargetPos = system.station.pos.copy();
                 else this.patrolTargetPos = createVector(random(-1000, 1000), random(-1000, 1000));
                 desiredMovementTargetPos_Patrol = this.patrolTargetPos;
             }
             this.performRotationAndThrust(desiredMovementTargetPos_Patrol);
             // Police do not fire when patrolling peacefully
        }
    } // End updatePoliceAI

    /** Hauler AI Logic - Moves between station and system edge. */
    updateHaulerAI(system) { // <--- Takes system as argument
         let desiredMovementTargetPos = null;
         switch (this.currentState) {
             case AI_STATE.PATROLLING: // GOING_TO_STATION
                 desiredMovementTargetPos = this.patrolTargetPos;
                 if (!desiredMovementTargetPos && system?.station) { this.patrolTargetPos = system.station.pos.copy(); desiredMovementTargetPos = this.patrolTargetPos; }
                 else if (!desiredMovementTargetPos) { this.setLeavingSystemTarget(system); desiredMovementTargetPos = this.patrolTargetPos; break; } // Pass system here
                 let distToStation = desiredMovementTargetPos ? dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y) : Infinity;
                 if (distToStation < this.stationProximityThreshold) { this.currentState = AI_STATE.NEAR_STATION; this.nearStationTimer = this.stationPauseDuration; this.vel.mult(0.1); }
                 break;
             case AI_STATE.NEAR_STATION:
                 this.vel.mult(0.8); this.nearStationTimer -= deltaTime / 1000;
                 if (this.nearStationTimer <= 0 && !this.hasPausedNearStation) { this.hasPausedNearStation = true; this.setLeavingSystemTarget(system); desiredMovementTargetPos = this.patrolTargetPos; } // Pass system here
                 break;
             case AI_STATE.LEAVING_SYSTEM:
                 desiredMovementTargetPos = this.patrolTargetPos;
                 if (!desiredMovementTargetPos) { this.setLeavingSystemTarget(system); desiredMovementTargetPos = this.patrolTargetPos; } // Pass system here
                 let distToExit = desiredMovementTargetPos ? dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y) : Infinity;
                 if (distToExit < 150) { this.destroyed = true; }
                 break;
              default: if(system?.station) { this.patrolTargetPos = system.station.pos.copy(); this.currentState = AI_STATE.PATROLLING; } else { this.setLeavingSystemTarget(system); } break; // Pass system here
         }
         this.performRotationAndThrust(desiredMovementTargetPos);
    } // End updateHaulerAI

    /** Helper method for rotation and thrust logic. Uses internal radian properties. */
    performRotationAndThrust(desiredMovementTargetPos) {
         let angleDifference = PI;
         if (desiredMovementTargetPos) {
             let targetMoveAngleRad = radians(atan2(desiredMovementTargetPos.y - this.pos.y, desiredMovementTargetPos.x - this.pos.x));
             angleDifference = this.rotateTowards(targetMoveAngleRad); // Uses radians speed/tolerance
         } else { angleDifference = 0; }
         if (this.currentState !== AI_STATE.IDLE && this.currentState !== AI_STATE.NEAR_STATION && abs(angleDifference) < this.angleTolerance) { // Uses radians tolerance
             this.thrustForward();
         }
         return angleDifference;
    }

     /** Helper method for firing logic. Uses internal radian properties. */
     performFiring(system, canFire, distanceToTarget, shootingAngleRad) {
         if (canFire && distanceToTarget < this.firingRange && this.fireCooldown <= 0) {
             if (this.currentState === AI_STATE.APPROACHING || this.currentState === AI_STATE.ATTACK_PASS || (this.isThargoid && this.currentState !== AI_STATE.IDLE)) {
                this.fire(system, shootingAngleRad); // Pass radians angle
                this.fireCooldown = this.fireRate;
             }
         }
     }

    /** Creates and adds a projectile aimed in the specified direction (radians). */
    fire(system, fireAngleRadians) {
        if (this.role === AI_ROLE.HAULER) return;
        // --- Added Check ---
        if (!system || typeof system.addProjectile !== 'function') {
            console.error(`Enemy ${this.shipTypeName} fire(): Invalid system object received! Cannot add projectile.`);
            return;
        }
        // --- End Check ---
        let spawnOffset = p5.Vector.fromAngle(this.angle).mult(this.size * 0.7);
        let spawnPos = p5.Vector.add(this.pos, spawnOffset);
        let proj = new Projectile(spawnPos.x, spawnPos.y, fireAngleRadians, 'ENEMY', 5, 5);
        system.addProjectile(proj); // Use validated system object
    }

    /** Draws the enemy ship using its defined draw function and role-based stroke. */
    draw() {
        if (this.destroyed) return;
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName]; const drawFunc = shipDef?.drawFunction;
        if (typeof drawFunc !== 'function') { /* Fallback */ return; }
        push(); translate(this.pos.x, this.pos.y); rotate(degrees(this.angle));
        stroke(this.strokeColor);
        let showThrust = (this.currentState !== AI_STATE.IDLE && this.currentState !== AI_STATE.NEAR_STATION);
        drawFunc(this.size, showThrust);
        pop();
        // --- DEBUG LINE ---
        if (this.target?.pos && this.role !== AI_ROLE.HAULER && (this.currentState === AI_STATE.APPROACHING || this.currentState === AI_STATE.ATTACK_PASS || this.isThargoid)) {
             push(); stroke(this.strokeColor, 100); strokeWeight(1); line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y); pop();
        }
    }

    // --- Standard Methods ---
    takeDamage(amount) { if(this.destroyed || amount<=0) return; this.hull-=amount; if(this.hull<=0){ this.hull=0; this.destroyed=true; }}
    isDestroyed() { return this.destroyed; }
    checkCollision(target) { if (!target?.pos || target.size===undefined) return false; let dSq = sq(this.pos.x - target.pos.x) + sq(this.pos.y - target.pos.y); let sumRadii = (target.size / 2) + (this.size / 2); return dSq < sq(sumRadii); }

} // End of Enemy Class