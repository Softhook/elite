// ****** Enemy.js ******

// Define AI Roles using a constant object for readability and maintainability
const AI_ROLE = {
    PIRATE: 'Pirate',
    POLICE: 'Police',
    HAULER: 'Hauler',
    TRANSPORT: 'Transport'  // New role for local shuttles
};

// Define AI States (Shared across roles, but used differently)
const AI_STATE = {
    IDLE: 0,          // Doing nothing specific, often for Pirates or Police off-duty
    APPROACHING: 1,   // Detected player, moving towards an intercept point (Pirate/Police when hostile)
    ATTACK_PASS: 2,   // Flying past player while firing (Pirate/Police when hostile)
    REPOSITIONING: 3, // Moving away after pass (Pirate/Police when hostile)
    PATROLLING: 4,    // Moving towards a point (e.g., station or patrol route) - Police/Hauler
    NEAR_STATION: 5,  // Paused near station - Hauler only
    LEAVING_SYSTEM: 6,// Moving towards exit point - Hauler only
    TRANSPORTING: 7,  // New state for transport behaviour
    COLLECTING_CARGO: 8   // New state for cargo collection behavior
};

// Reverse lookup for AI_STATE values to names
const AI_STATE_NAME = {};
for (const [k, v] of Object.entries(AI_STATE)) {
    AI_STATE_NAME[v] = k;
}

class Enemy {
    /**
     * Creates an Enemy instance with role-specific behavior and ship type.
     * Stores speeds/rates/colors initially as raw values.
     * Radian properties and p5.Color objects MUST be calculated AFTER construction
     * via calculateRadianProperties() and initializeColors().
     * @param {number} x - Initial world X coordinate.
     * @param {number} y - Initial world Y coordinate.
     * @param {Player} playerRef - A reference to the player object.
     * @param {string} shipTypeName - The type name of the ship (key in SHIP_DEFINITIONS).
     * @param {string} role - The role of this NPC (e.g., AI_ROLE.PIRATE).
     */
    constructor(x, y, playerRef, shipTypeName, role) {
        // --- Robust Ship Definition Lookup ---
        let actualShipTypeName = shipTypeName; // Store the name passed in
        let shipDef = SHIP_DEFINITIONS[actualShipTypeName]; // Try to find definition

        // Handle fallback if type not found
        if (!shipDef) {
            console.warn(`Enemy constructor: Ship type "${shipTypeName}" not found! Defaulting to Krait.`);
            actualShipTypeName = "Krait"; // Use the KEY of the fallback
            shipDef = SHIP_DEFINITIONS[actualShipTypeName]; // Get the default definition using the correct key
            // Safety check for the default definition itself
            if (!shipDef) {
                 console.error("FATAL: Default ship definition 'Krait' is missing from SHIP_DEFINITIONS! Cannot create enemy properly.");
                 // Make enemy unusable if Krait is also missing
                 this.hull = 0; this.destroyed = true; shipTypeName="ErrorShip"; role="Error"; // Prevent further errors
                 shipDef = { name: "ErrorShip", size: 10, baseMaxSpeed: 0, baseThrust: 0, baseTurnRateDegrees: 0, baseHull: 1, cargoCapacity: 0 }; // Minimal dummy values
            }
        }
        // --- End Lookup ---

        // --- Assign CORRECT Properties ---
        this.shipTypeName = actualShipTypeName; // Store the ACTUAL KEY used to find the definition
        this.role = role;
        // ---

        // After setting role in the constructor
        this.role = role;
        if (this.role === AI_ROLE.PIRATE) {
            // Pirates are automatically wanted
            this.isWanted = true;
        } else {
            this.isWanted = false;
        }

        // Add unique ID for force wave tracking
        this.id = Date.now() + "_" + Math.floor(Math.random() * 1000);

        // --- Physics & Stats (using the final shipDef) ---
        this.pos = createVector(x, y); this.vel = createVector(0, 0); this.angle = random(TWO_PI); // Radians
        this.size = shipDef.size; this.baseMaxSpeed = shipDef.baseMaxSpeed; this.baseThrust = shipDef.baseThrust;
        this.baseTurnRateDegrees = shipDef.baseTurnRateDegrees; // Store DEGREES from definition
        // Apply NPC role modifiers (using degrees for turn rate calculation later)
        this.rotationSpeedDegrees = this.baseTurnRateDegrees * (this.role === AI_ROLE.HAULER ? 0.7 : 0.9);
        this.angleToleranceDegrees = 15; // Store tolerance in DEGREES
        // Initialize radian properties - set by calculateRadianProperties() later
        this.rotationSpeed = 0; // Radians / frame
        this.angleTolerance = 0; // Radians
        // Apply modifiers to final speed/thrust
        this.maxSpeed = this.baseMaxSpeed * (this.role === AI_ROLE.HAULER ? 0.7 : 0.9);
        this.thrustForce = this.baseThrust * (this.role === AI_ROLE.HAULER ? 0.8 : 0.9);
        this.drag = 0.985; this.maxHull = shipDef.baseHull; this.hull = this.maxHull; this.destroyed = false;

        // --- Store Raw Color VALUES ---
        this.baseColorValue = [random(80, 180), random(80, 180), random(80, 180)]; // Store as [R, G, B] array
        this.strokeColorValue = [200, 200, 200]; // Default grey as [R, G, B]
        switch(this.role) {
            case AI_ROLE.POLICE: this.strokeColorValue = [100, 150, 255]; break; // Blue
            case AI_ROLE.HAULER: this.strokeColorValue = [200, 200, 100]; break; // Yellow
            case AI_ROLE.PIRATE: this.strokeColorValue = [255, 100, 100]; break; // Red
        }
        this.isThargoid = (this.shipTypeName === "Thargoid Interceptor"); // Match exact name
        if (this.isThargoid) { // Thargoid specific overrides
            this.rotationSpeedDegrees = this.baseTurnRateDegrees; this.angleToleranceDegrees = 5;
            this.maxSpeed = this.baseMaxSpeed; this.thrustForce = this.baseThrust; this.drag = 0.995;
            this.strokeColorValue = [0, 255, 150]; // Thargoid Green
        }
        // Initialize p5.Color objects - set by initializeColors() later
        this.p5FillColor = null;
        this.p5StrokeColor = null;
        // ---

        // --- Targeting & AI ---
        this.target = playerRef; this.currentState = AI_STATE.IDLE; // Default state
        this.repositionTarget = null; this.passTimer = 0; this.nearStationTimer = 0; this.hasPausedNearStation = false; this.patrolTargetPos = null; // Target pos set in first update if needed
        // AI Tuning Parameters
        this.detectionRange = 450 + this.size; this.engageDistance = 180 + this.size * 0.5; this.firingRange = 280 + this.size * 0.3; this.repositionDistance = 300 + this.size; this.predictionTime = 0.4; this.passDuration = 1.0 + this.size * 0.01; this.stationPauseDuration = random(3, 7); this.stationProximityThreshold = 150;

        // --- Weapon Assignment Based on Ship Definition ---
        this.fireCooldown = random(1.0, 2.5);
        this.weaponIndex = 0; // To track which weapon is currently active if ship has multiple
        
        // Get weapons from ship definition instead of random assignment
        if (shipDef.armament && shipDef.armament.length > 0) {
            // Store all weapons the ship has
            this.weapons = [];
            
            for (let weaponName of shipDef.armament) {
                // Find the weapon definition
                if (typeof WEAPON_UPGRADES !== "undefined" && WEAPON_UPGRADES.length > 0) {
                    const weaponDef = WEAPON_UPGRADES.find(w => w.name === weaponName);
                    if (weaponDef) {
                        this.weapons.push(weaponDef);
                    }
                }
            }
            
            // Set the current weapon to the first one
            if (this.weapons.length > 0) {
                this.currentWeapon = this.weapons[0];
                this.fireRate = this.currentWeapon.fireRate;
                console.log(`${this.shipTypeName} armed with ${this.currentWeapon.name}`);
            } else {
                // Fallback: basic projectile weapon if no matching weapons found
                this.currentWeapon = {
                    name: "Default Laser",
                    type: "projectile",
                    damage: 8,
                    color: [255, 0, 0],
                    fireRate: 0.5,
                    price: 0,
                    desc: "Fallback weapon."
                };
                this.weapons = [this.currentWeapon];
            }
        } else {
            // Fallback: basic projectile weapon if ship has no defined armament
            this.currentWeapon = {
                name: "Default Laser",
                type: "projectile",
                damage: 8,
                color: [255, 0, 0],
                fireRate: 0.5,
                price: 0,
                desc: "Fallback weapon."
            };
            this.weapons = [this.currentWeapon];
        }
        
        // --- Role-Specific Initial State ---
        this.role = role;
        if (this.role === AI_ROLE.TRANSPORT) {
            // For transport shuttles, use lower speed and a fixed route behavior.
            this.currentState = AI_STATE.TRANSPORTING;
            // Set lower speed multipliers for smoother shuttle motion.
            this.maxSpeed = this.baseMaxSpeed * 0.5;
            this.thrustForce = this.baseThrust * 0.6;
            // Prepare route properties (to be assigned later)
            this.routePoints = null;         // Array of two p5.Vector points [pointA, pointB]
            this.currentRouteIndex = 0;      // Which point we're moving toward
        } else {
            // Existing role assignments – for Pirates/Police/Hauler, etc.
            switch(this.role) {
                case AI_ROLE.HAULER: this.currentState = AI_STATE.PATROLLING; break;
                case AI_ROLE.POLICE: this.currentState = AI_STATE.PATROLLING; break;
                case AI_ROLE.PIRATE: this.currentState = AI_STATE.IDLE; break;
                default: this.currentState = AI_STATE.IDLE;
            }
            if (this.isThargoid) { this.currentState = AI_STATE.APPROACHING; }
        }

        console.log(`Created Enemy: ${this.role} ${this.shipTypeName} (State: ${Object.keys(AI_STATE).find(key => AI_STATE[key] === this.currentState)})`);
        // IMPORTANT: calculateRadianProperties() and initializeColors() MUST be called AFTER construction.

        // Initialize thrust manager
        this.thrustManager = new ThrustManager();

        // Cargo collection behavior variables
        this.cargoTarget = null;
        this.cargoDetectionRange = 500; // How far ships can see cargo
        this.cargoCollectionCooldown = 0;
        this.previousState = null; // For returning to original state after collecting
    }

    /** Calculates and sets radian-based properties using p5.radians(). */
    calculateRadianProperties() {
         if (typeof radians !== 'function') { this.rotationSpeed = 0.06; this.angleTolerance = 0.26; return; } // Fallback
         try {
             this.rotationSpeed = radians(this.rotationSpeedDegrees); // rad/frame
             this.angleTolerance = radians(this.angleToleranceDegrees); // rad
             if (isNaN(this.rotationSpeed) || isNaN(this.angleTolerance)) throw new Error("NaN result");
             // console.log(` Enemy ${this.shipTypeName} Radian Props Calculated.`); // Optional
         } catch(e) { console.error(`Error calc radians for Enemy ${this.shipTypeName}:`, e); this.rotationSpeed = 0.06; this.angleTolerance = 0.26; } // Fallback
    }

    /** Creates p5.Color objects using stored values. Must be called after p5 is ready. */
    initializeColors() {
         if (typeof color !== 'function') { return; } // Skip if p5 not ready
         try {
             this.p5FillColor = color(this.baseColorValue[0], this.baseColorValue[1], this.baseColorValue[2]);
             this.p5StrokeColor = color(this.strokeColorValue[0], this.strokeColorValue[1], this.strokeColorValue[2]);
             // console.log(` Enemy ${this.shipTypeName} Colors Initialized.`); // Optional
         } catch(e) { console.error(`Error creating colors for Enemy ${this.shipTypeName}:`, e); this.p5FillColor = color(180); this.p5StrokeColor = color(255); } // Fallbacks
    }

    /** Predicts player's future position. */
    predictTargetPosition() {
        if (!this.target?.pos || !this.target?.vel) return this.target?.pos || null;
        let pf = this.predictionTime * (deltaTime ? (60 / (1000/deltaTime)) : 60);
        return p5.Vector.add(this.target.pos, p5.Vector.mult(this.target.vel, pf));
    }

    /** Rotates towards target angle (radians). Returns remaining difference (radians). */
    rotateTowards(targetAngleRadians) {
        if (isNaN(targetAngleRadians)) return PI;
        
        let diff = targetAngleRadians - this.angle; 
        
        // Fixed: Add proper braces to angle normalization loops
        while (diff < -PI) {
            diff += TWO_PI;
        }
        while (diff > PI) {
            diff -= TWO_PI;
        }
        
        const rotationThreshold = 0.02;
        if (abs(diff) > rotationThreshold) { 
            let step = constrain(diff, -this.rotationSpeed, this.rotationSpeed); 
            this.angle = (this.angle + step + TWO_PI) % TWO_PI; 
            return diff - step; 
        }
        return 0; // Aligned
    }

    /** Applies forward thrust. */
    thrustForward() { if (isNaN(this.angle)) { this.angle = 0; return; } let f = p5.Vector.fromAngle(this.angle); f.mult(this.thrustForce); this.vel.add(f); }

    /** Sets a target position far away for Haulers leaving the system. */
    setLeavingSystemTarget(system) {
        let angle = random(TWO_PI); let dist = (system?.despawnRadius ?? 3000) * 1.5;
        this.patrolTargetPos = createVector(cos(angle) * dist, sin(angle) * dist);
        this.currentState = AI_STATE.LEAVING_SYSTEM; this.hasPausedNearStation = false;
        // console.log(`Hauler ${this.shipTypeName} leaving towards target`); // Optional log
    }

    /** Updates the enemy's state machine, movement, and actions based on role. */
    update(system) {
        if (this.destroyed || !system) return;

        // Update thrust particles
        this.thrustManager.update();

        this.fireCooldown -= deltaTime / 1000;

        this.currentSystem = system;

        // For pirates: Look for cargo first if not already collecting
        if (this.role === AI_ROLE.PIRATE && 
            this.currentState !== AI_STATE.COLLECTING_CARGO && 
            this.cargoCollectionCooldown <= 0) {
            
            const cargoTarget = this.detectCargo(system);
            if (cargoTarget) {
                this.cargoTarget = cargoTarget;
                this.currentState = AI_STATE.COLLECTING_CARGO;
                console.log(`${this.shipTypeName} detected cargo - moving to collect`);
            }
        }

        // For transporters: Check for cargo like pirates do
        if (this.role === AI_ROLE.TRANSPORT && 
            this.currentState !== AI_STATE.COLLECTING_CARGO && 
            this.cargoCollectionCooldown <= 0) {
            
            const cargoTarget = this.detectCargo(system);
            if (cargoTarget) {
                // Remember current state to return to after collection
                this.previousState = this.currentState;
                this.cargoTarget = cargoTarget;
                this.currentState = AI_STATE.COLLECTING_CARGO;
                console.log(`Transport ${this.shipTypeName} spotted cargo - deviating from route`);
            }
        }

        // New branch for TRANSPORT role:
        if (this.role === AI_ROLE.TRANSPORT) {
            // Handle cargo collection first if applicable
            if (this.currentState === AI_STATE.COLLECTING_CARGO) {
                if (!this.updateCargoCollectionAI(system)) {
                    // When done collecting, return to previous state
                    this.currentState = this.previousState || AI_STATE.TRANSPORTING;
                }
            } else {
                // Normal transport behavior
                this.updateTransportAI(system);
            }
        } else {
            try {
                // Existing role-specific updates.
                switch (this.role) {
                    case AI_ROLE.PIRATE:
                        // Handle cargo collection first if applicable
                        if (this.currentState === AI_STATE.COLLECTING_CARGO) {
                            if (!this.updateCargoCollectionAI(system)) {
                                // If no cargo to collect, resume combat AI
                                this.updateCombatAI(system);
                            }
                        } else {
                            // No cargo collecting, use normal combat AI
                            this.updateCombatAI(system);
                        }
                        break;
                    case AI_ROLE.POLICE: this.updatePoliceAI(system); break;
                    case AI_ROLE.HAULER: this.updateHaulerAI(system); break;
                    default: this.vel.mult(this.drag * 0.95); break;
                }
            } catch (e) {
                console.error(`Error during AI update for ${this.role} ${this.shipTypeName}:`, e);
                this.currentState = AI_STATE.IDLE;
            }
            this.vel.mult(this.drag);
            this.vel.limit(this.maxSpeed);
            if (!isNaN(this.vel.x) && !isNaN(this.vel.y)) { 
                this.pos.add(this.vel); 
            } else { 
                this.vel.set(0, 0); 
            }
        }

        // Add thrust particles after movement logic
        if (this.currentState !== AI_STATE.IDLE && this.currentState !== AI_STATE.NEAR_STATION) {
            this.thrustManager.createThrust(this.pos, this.angle, this.size);
        }
    } // End update

    /** Common Combat AI Logic (Attack Pass) - Used by Pirates and hostile Police. */
    updateCombatAI(system) {
        // --- Initialize flags if not present ---
        if (this.combatFlagsInitialized === undefined) {
            this.combatFlagsInitialized = true;
            this.hasLoggedDamageActivation = false;
            this.hasLoggedPlayerTargeting = false;
            this.targetSwitchCooldown = 0; // INITIALIZE COOLDOWN
        }

        // Update cooldown timer
        if (this.targetSwitchCooldown > 0) {
            this.targetSwitchCooldown -= deltaTime / 1000;
        }
        
        // IMPROVED: Check if being attacked by police (for pirates)
        if (this.role === AI_ROLE.PIRATE && this.lastAttacker && 
            this.lastAttacker.role === AI_ROLE.POLICE && 
            this.targetSwitchCooldown <= 0) {
            
            let attackerDistance = dist(this.pos.x, this.pos.y, this.lastAttacker.pos.x, this.lastAttacker.pos.y);
            
            // ENHANCED: More responsive switching when attacked
            // Prioritize defending against active attackers!
            if (attackerDistance < this.detectionRange * 1.5) {
                console.log(`Pirate ${this.shipTypeName} responding to police attack from ${this.lastAttacker.shipTypeName}`);
                this.target = this.lastAttacker;
                this.currentState = AI_STATE.APPROACHING;
                this.targetSwitchCooldown = 2.0;
            }
        }
        
        // Existing target validity checking and cooldown logic...
        
        // MODIFIED: AGGRESSIVE PIRATE RETARGETING WITH STATE TRACKING
        if (this.role === AI_ROLE.PIRATE &&
            (this.currentState === AI_STATE.IDLE || !this.target || !this.target.pos || this.target.hull <= 0) &&
            system.player && !system.player.destroyed) {
            
            let playerDistance = dist(this.pos.x, this.pos.y, system.player.pos.x, system.player.pos.y);
            
            if (playerDistance < this.detectionRange * 1.5) {
                // Only log targeting once per state change
                if (!this.hasLoggedPlayerTargeting || this.target !== system.player) {
                    console.log(`IDLE Pirate ${this.shipTypeName} actively targeting Player at distance ${playerDistance.toFixed(2)}`);
                    this.hasLoggedPlayerTargeting = true;
                }
                
                this.target = system.player;
                this.currentState = AI_STATE.APPROACHING;
                this.targetSwitchCooldown = 1.0;
            }
        }
        
        // Reset player targeting log flag when we change targets
        if (this.target !== system.player) {
            this.hasLoggedPlayerTargeting = false;
        }
        
        // Existing targeting switching logic based on proximity...
        
        // MODIFIED: Make switching to player more likely
        if (this.role === AI_ROLE.PIRATE && 
            this.target && 
            !(this.target instanceof Player) && 
            system.player && 
            !system.player.destroyed && 
            this.targetSwitchCooldown <= 0) {
            
            let currentTargetDistance = dist(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
            let playerDistance = dist(this.pos.x, this.pos.y, system.player.pos.x, system.player.pos.y);
            
            // More lenient switching: Only need player to be 20% closer (was 40%)
            // OR within absolute engagement distance threshold
            if (playerDistance < currentTargetDistance * 0.8 || playerDistance < this.engageDistance * 1.5) {
                console.log(`${this.shipTypeName} opportunistically switching target from ${this.target.shipTypeName} to Player (${playerDistance.toFixed(2)})`);
                this.target = system.player;
                this.targetSwitchCooldown = 2.0;
            }
        }
        
        // Rest of the combat AI logic...
        let targetExists = this.target?.hull > 0;
        let distanceToTarget = targetExists
             ? dist(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y)
             : Infinity;
        let desiredMovementTargetPos = null;
        let shootingAngle = this.angle;
        if (targetExists && this.target.pos) {
            shootingAngle = radians(atan2(this.target.pos.y - this.pos.y, this.target.pos.x - this.pos.x));
        }
        let previousState = this.currentState;

        // --- Combat State Machine ---
        switch (this.currentState) {
            case AI_STATE.IDLE:
                this.vel.mult(this.drag * 0.95);
                if (system.player && !system.player.destroyed) {
                    this.target = system.player;
                    this.currentState = AI_STATE.APPROACHING;
                }
                break;
            case AI_STATE.PATROLLING:
                this.vel.mult(this.drag * 0.95);
                if (targetExists && distanceToTarget < this.detectionRange) {
                    this.currentState = AI_STATE.APPROACHING;
                }
                break;
            case AI_STATE.APPROACHING:
                if (!targetExists || distanceToTarget > this.detectionRange * 1.1) {
                    this.currentState = (this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
                    break;
                }
                desiredMovementTargetPos = this.predictTargetPosition() || this.target?.pos;
                if (distanceToTarget < this.engageDistance) {
                    this.currentState = AI_STATE.ATTACK_PASS;
                    this.passTimer = this.passDuration;
                }
                break;
            case AI_STATE.ATTACK_PASS:
                if (!targetExists) {
                    this.currentState = (this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
                    break;
                }
                this.passTimer -= deltaTime / 1000;
                if (this.target?.vel) {
                    desiredMovementTargetPos = p5.Vector.add(this.target.pos, this.target.vel.copy().setMag(100));
                } else {
                    desiredMovementTargetPos = this.target?.pos;
                }
                if (this.passTimer <= 0 || !desiredMovementTargetPos) {
                    this.currentState = AI_STATE.REPOSITIONING;
                    if (targetExists) {
                        let v = p5.Vector.sub(this.pos, this.target.pos);
                        v.setMag(this.repositionDistance * 1.5);
                        this.repositionTarget = p5.Vector.add(this.pos, v);
                    } else {
                        this.repositionTarget = null;
                    }
                }
                break;
            case AI_STATE.REPOSITIONING:
                if (!targetExists) {
                    this.currentState = (this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
                    break;
                }
                desiredMovementTargetPos = this.repositionTarget;
                let distToRepo = this.repositionTarget ? dist(this.pos.x, this.pos.y, this.repositionTarget.x, this.repositionTarget.y) : Infinity;
                if (!desiredMovementTargetPos || distanceToTarget > this.repositionDistance || distToRepo < 50) {
                    this.currentState = AI_STATE.APPROACHING;
                    this.repositionTarget = null;
                }
                break;
            default:
                this.currentState = (this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
                break;
        }

        this.performRotationAndThrust(desiredMovementTargetPos);
        this.performFiring(system, targetExists, distanceToTarget, shootingAngle);
    } // End updateCombatAI

    /** Police AI Logic - Patrols, switches to Combat AI if player is wanted. */
    updatePoliceAI(system) {
        // FIRST check if player is wanted - prioritize player over other NPCs
        if (system.player && system.player.isWanted && system.player.hull > 0) {
            // Target wanted player
            this.target = system.player;
            
            // Log when police first detect wanted player - ONLY log state transitions
            if ((this.currentState === AI_STATE.PATROLLING || this.currentState === AI_STATE.IDLE) && 
                !this.reportedWantedTarget) {
                // Only log once per police ship by using a flag
                this.reportedWantedTarget = true;
                // Only log for the first police ship that spots the player
                if (!system.policeAlertSent) {
                    console.log(`ALERT: Police responding to wanted status in ${system.name || ""} system`);
                    system.policeAlertSent = true;
                }
                this.currentState = AI_STATE.APPROACHING;
            }
            
            // Use combat AI against wanted player
            this.updateCombatAI(system);
            return;
        } else {
            // Reset flag when player is no longer wanted
            this.reportedWantedTarget = false;
            // Clear system alert flag if needed
            if (system.player && !system.player.isWanted && system.policeAlertSent) {
                system.policeAlertSent = false;
            }
        }
        
        // Rest of the police AI logic remains unchanged
        let wantedTarget = null;
        if (system.enemies && system.enemies.length > 0) {
            for (let e of system.enemies) {
                if (e !== this && e.hull > 0 && e.isWanted) {
                    wantedTarget = e;
                    break;
                }
            }
        }
        
        if (wantedTarget) {
            // Target any wanted ship
            this.target = wantedTarget;
            if (this.currentState === AI_STATE.PATROLLING || this.currentState === AI_STATE.IDLE) {
                this.currentState = AI_STATE.APPROACHING;
            }
            this.updateCombatAI(system);
        } else {
            // No wanted targets: Patrol
            this.currentState = AI_STATE.PATROLLING;
            if (!this.patrolTargetPos) {
                this.patrolTargetPos = system?.station?.pos?.copy() || createVector(random(-500, 500), random(-500, 500));
            }
            let desiredMovementTargetPos = this.patrolTargetPos;
            let distToPatrolTarget = desiredMovementTargetPos
                ? dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y)
                : Infinity;
            if (distToPatrolTarget < 50) {
                if(system?.station?.pos)
                    this.patrolTargetPos = system.station.pos.copy();
                else
                    this.patrolTargetPos = createVector(random(-1000, 1000), random(-1000, 1000));
                desiredMovementTargetPos = this.patrolTargetPos;
            }
            this.performRotationAndThrust(desiredMovementTargetPos);
        }
    } // End updatePoliceAI

    /** Hauler AI Logic - Moves between station and system edge. */
    updateHaulerAI(system) {
         let desiredMovementTargetPos = null;
         switch (this.currentState) {
             case AI_STATE.PATROLLING: if (!this.patrolTargetPos) { this.patrolTargetPos = system?.station?.pos?.copy(); } desiredMovementTargetPos = this.patrolTargetPos; if (!desiredMovementTargetPos) { this.setLeavingSystemTarget(system); desiredMovementTargetPos = this.patrolTargetPos; break; } let dS = dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y); if (dS < this.stationProximityThreshold) { this.currentState = AI_STATE.NEAR_STATION; this.nearStationTimer = this.stationPauseDuration; this.vel.mult(0.1); } break;
             case AI_STATE.NEAR_STATION: this.vel.mult(0.8); this.nearStationTimer -= deltaTime / 1000; if (this.nearStationTimer <= 0 && !this.hasPausedNearStation) { this.hasPausedNearStation = true; this.setLeavingSystemTarget(system); desiredMovementTargetPos = this.patrolTargetPos; } break;
             case AI_STATE.LEAVING_SYSTEM: if (!this.patrolTargetPos) { this.setLeavingSystemTarget(system); } desiredMovementTargetPos = this.patrolTargetPos; if (!desiredMovementTargetPos) break; let dE = dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y); if (dE < 150) { this.destroyed = true; } break;
             default: if(system?.station?.pos) { this.patrolTargetPos = system.station.pos.copy(); this.currentState = AI_STATE.PATROLLING; } else { this.setLeavingSystemTarget(system); } break;
         }
         this.performRotationAndThrust(desiredMovementTargetPos); // Haulers just move
    } // End updateHaulerAI

    /** Transport AI Logic - Moves between two endpoints chosen among
        non-sun planets or falls back to station + planet.
        When near an endpoint (within arrivalThreshold), the ship pauses
        for a short period before switching destinations.
    */
    updateTransportAI(system) {
        if (!system) return;
        
        // Define routePoints if not yet set:
        if (!this.routePoints) {
            let pts = [];
            if (system.planets && system.planets.length > 1) {
                let candidateIndices = [];
                for (let i = 1; i < system.planets.length; i++) {
                    candidateIndices.push(i);
                }
                if (candidateIndices.length >= 2) {
                    let shuffled = shuffle(candidateIndices, true);
                    pts.push(system.planets[shuffled[0]].pos.copy());
                    pts.push(system.planets[shuffled[1]].pos.copy());
                } else {
                    pts.push(system.planets[1].pos.copy());
                    pts.push(system.station ? system.station.pos.copy() : p5.Vector.add(system.planets[1].pos, createVector(300, 0)));
                }
            } else if (system.station) {
                pts.push(system.station.pos.copy());
                pts.push(p5.Vector.add(system.station.pos, createVector(300, 0)));
            } else {
                pts.push(createVector(0, 0));
                pts.push(createVector(300, 300));
            }
            this.routePoints = pts;
            // Start with destination index 1
            this.currentRouteIndex = 1;
            // Reset wait timer when first setting route.
            this.waitTimer = 0;
            console.log(`Transporter ${this.shipTypeName} route set to endpoints: (${pts[0].x.toFixed(1)}, ${pts[0].y.toFixed(1)}) and (${pts[1].x.toFixed(1)}, ${pts[1].y.toFixed(1)})`);
        }
        
        let destination = this.routePoints[this.currentRouteIndex];
        let desiredDir = p5.Vector.sub(destination, this.pos);
        let distance = desiredDir.mag();
        desiredDir.normalize();
        
        // Rotate smoothly towards the destination.
        let targetAngle = desiredDir.heading();
        let diff = targetAngle - this.angle;
        while (diff < -PI) diff += TWO_PI;
        while (diff > PI) diff -= TWO_PI;
        if (abs(diff) > 0.01) {
            let rotationStep = constrain(diff, -this.rotationSpeed, this.rotationSpeed);
            this.angle += rotationStep;
            this.angle = (this.angle + TWO_PI) % TWO_PI;
        }
        
        // Arrival behavior:
        const arrivalThreshold = 20;     // Consider "arrived" if within 20 units
        const slowSpeedThreshold = 0.1;    // And if nearly stopped
        if (distance > arrivalThreshold) {
            // Not yet near destination: reset waitTimer and thrust toward destination.
            if (this.waitTimer !== 0) {
                console.log(`Transporter ${this.shipTypeName} resuming travel (distance: ${distance.toFixed(2)})`);
            }
            this.waitTimer = 0;
            let thrustVec = p5.Vector.fromAngle(this.angle);
            thrustVec.mult(this.thrustForce);
            this.vel.add(thrustVec);
        } else {
            // Arrival detected: apply braking.
            this.vel.mult(0.8);
            // If close enough OR moving very slowly, start counting down a wait timer.
            if (distance < arrivalThreshold || this.vel.mag() < slowSpeedThreshold) {
                if (this.waitTimer === 0) {
                    this.waitTimer = random(1000, 3600); // wait duration in milliseconds
                    console.log(`Transporter ${this.shipTypeName} arrived. Waiting for ${(this.waitTimer / 1000).toFixed(2)}s before turning.`);
                } else {
                    this.waitTimer -= deltaTime;
                    if (this.waitTimer <= 0) {
                        // Switch destination.
                        this.currentRouteIndex = (this.currentRouteIndex + 1) % this.routePoints.length;
                        console.log(`Transporter ${this.shipTypeName} switching destination to endpoint ${this.currentRouteIndex} at (${this.routePoints[this.currentRouteIndex].x.toFixed(1)}, ${this.routePoints[this.currentRouteIndex].y.toFixed(1)})`);
                        this.waitTimer = 0;
                        // Optionally reset velocity for a fresh start.
                        this.vel.set(0, 0);
                    }
                }
            }
        }
        
        // Apply drag and update position.
        this.vel.mult(this.drag);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
    }

    /** Helper: Rotates towards target, applies thrust if aligned. Returns angle difference. */
    performRotationAndThrust(desiredMovementTargetPos) {
         let angleDifference = PI;
         if (desiredMovementTargetPos?.x !== undefined && desiredMovementTargetPos?.y !== undefined) {
             let targetMoveAngleRad = radians(atan2(desiredMovementTargetPos.y - this.pos.y, desiredMovementTargetPos.x - this.pos.x));
             if (!isNaN(targetMoveAngleRad)) { angleDifference = this.rotateTowards(targetMoveAngleRad); } else { angleDifference = PI; }
         } else { angleDifference = 0; }
         if (this.currentState !== AI_STATE.IDLE && this.currentState !== AI_STATE.NEAR_STATION && abs(angleDifference) < this.angleTolerance) { this.thrustForward(); }
         return angleDifference;
    }

    /** Helper: Checks conditions and calls fire() if appropriate. */
    performFiring(system, targetExists, distanceToTarget, shootingAngle) {
        if (!targetExists) return;
        
        // Check if we should switch weapons based on range
        if (this.weapons && this.weapons.length > 1) {
            // Example logic: use beam weapons at long range, projectiles at short range
            const isLongRange = distanceToTarget > this.firingRange * 0.7;
            const currentIsBeam = this.currentWeapon.type.includes('beam');
            
            if ((isLongRange && !currentIsBeam) || (!isLongRange && currentIsBeam)) {
                this.cycleWeapon();
            }
        }
        
        // Check if target is in firing range and cooldown is ready
        if (distanceToTarget < this.firingRange && this.fireCooldown <= 0) {
            // Calculate angle difference between current angle and angle to target
            let angleDiff = shootingAngle - this.angle;
            
            // Fixed: Add proper braces to angle normalization loops
            while (angleDiff < -PI) {
                angleDiff += TWO_PI;
            }
            while (angleDiff > PI) {
                angleDiff -= TWO_PI;
            }
            
            // Check if weapon is a turret (can fire in any direction)
            const isTurretWeapon = this.currentWeapon && this.currentWeapon.type === 'turret';
            
            // MODIFIED: Only check firing angle for non-turret weapons
            // Turrets can fire in any direction regardless of ship orientation
            const firingAngleTolerance = radians(30);
            
            if (this.currentState !== AI_STATE.IDLE && 
                (isTurretWeapon || abs(angleDiff) < firingAngleTolerance)) {
                
                if (!this.currentSystem) this.currentSystem = system; // Ensure system is set
                
                // For turrets, pass the player/target as the target parameter
                // so the weapon system can calculate the correct firing angle
                if (isTurretWeapon) {
                    this.fireWeapon(this.target);
                    console.log(`${this.shipTypeName} turret fired at target at distance ${distanceToTarget.toFixed(2)}`);
                } else {
                    this.fireWeapon();
                    console.log(`${this.shipTypeName} fired at target at distance ${distanceToTarget.toFixed(2)}`);
                }
                
                this.fireCooldown = this.fireRate;
            } else if (this.currentState === AI_STATE.IDLE && targetExists && this.role === AI_ROLE.PIRATE) {
                // CRITICAL FIX: Force IDLE pirates who want to fire to transition to APPROACHING
                console.log(`IDLE ${this.shipTypeName} spotted player in range - activating!`);
                this.currentState = AI_STATE.APPROACHING;
            }
        }
    }

    /** Creates and adds a projectile aimed in the specified direction (radians). */
    fire(system, fireAngleRadians) {
        if (this.role === AI_ROLE.HAULER) return;
        if (!system || typeof system.addProjectile !== 'function') { return; }
        if (isNaN(this.angle) || isNaN(fireAngleRadians)) { return; }
        let spawnOffset = p5.Vector.fromAngle(this.angle).mult(this.size * 0.7);
        let spawnPos = p5.Vector.add(this.pos, spawnOffset);
        let proj = new Projectile(spawnPos.x, spawnPos.y, fireAngleRadians, 'ENEMY', 5, 5);
        system.addProjectile(proj);
    }

    fireWeapon(target = null) {
        if (!this.currentWeapon || !this.currentSystem) return;
        WeaponSystem.fire(this, this.currentSystem, this.angle, this.currentWeapon.type, target);
    }

    /** Cycles to the next available weapon */
    cycleWeapon() {
        if (this.weapons && this.weapons.length > 1) {
            this.weaponIndex = (this.weaponIndex + 1) % this.weapons.length;
            this.currentWeapon = this.weapons[this.weaponIndex];
            this.fireRate = this.currentWeapon.fireRate;
            // Reset cooldown when switching weapons (optional)
            this.fireCooldown = this.fireRate * 0.5; 
        }
    }

    /** Draws the enemy ship using its defined draw function and role-based stroke. */
    draw() {
        if (this.destroyed || isNaN(this.angle)) return;

        // Draw thrust particles BEHIND the ship
        this.thrustManager.draw();

        if (!this.p5FillColor || !this.p5StrokeColor) { this.initializeColors(); } // Attempt init if needed
        if (!this.p5FillColor || !this.p5StrokeColor) { return; } // Skip draw if colors still bad

        const shipDef = SHIP_DEFINITIONS[this.shipTypeName]; const drawFunc = shipDef?.drawFunction;
        // Use a more specific check for the function
        if (typeof drawFunc !== 'function') {
            console.error(`Enemy draw: No draw function for ${this.shipTypeName}`);
            push(); translate(this.pos.x, this.pos.y); fill(255,0,0, 150); noStroke(); ellipse(0,0,this.size,this.size); pop(); // Draw fallback red circle
            return;
        }

        push(); translate(this.pos.x, this.pos.y); rotate(degrees(this.angle));
        // Use initialized p5.Color objects
        fill(this.p5FillColor); stroke(this.p5StrokeColor);
        strokeWeight(1);
        let showThrust = (this.currentState !== AI_STATE.IDLE && this.currentState !== AI_STATE.NEAR_STATION);
        try { drawFunc(this.size, showThrust); } // Call specific draw function
        catch (e) { console.error(`Error executing draw function ${drawFunc.name || '?'} for ${this.shipTypeName}:`, e); ellipse(0,0,this.size, this.size); } // Fallback
        pop();

        // --- DEBUG LINE ---
        if (this.target?.pos && this.role !== AI_ROLE.HAULER && (this.currentState === AI_STATE.APPROACHING || this.currentState === AI_STATE.ATTACK_PASS || this.isThargoid)) {
             push(); let lineCol = this.p5StrokeColor; try { if (lineCol?.setAlpha) { lineCol.setAlpha(100); stroke(lineCol); } else { stroke(255, 0, 0, 100); } } catch(e) { stroke(255, 0, 0, 100); } strokeWeight(1); line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y); pop();
        }

        // Draw force wave effect
        if (this.lastForceWave && millis() - this.lastForceWave.time < 300) {
            const timeSinceForce = millis() - this.lastForceWave.time;
            const alpha = map(timeSinceForce, 0, 300, 200, 0);
            
            push();
            translate(this.pos.x, this.pos.y);
            noFill();
            strokeWeight(3);
            stroke(this.lastForceWave.color[0], 
                   this.lastForceWave.color[1], 
                   this.lastForceWave.color[2], 
                   alpha);
            
            // Expanding circle at ship
            const radius = map(timeSinceForce, 0, 300, 10, 40);
            circle(0, 0, radius * 2);
            pop();
        }

        // Draw beam if recently fired
        if (this.lastBeam && millis() - this.lastBeam.time < 150) {
            push();
            stroke(this.lastBeam.color);
            strokeWeight(3);
            line(this.lastBeam.start.x, this.lastBeam.start.y, 
                 this.lastBeam.end.x, this.lastBeam.end.y);
            
            // Add a glow effect
            stroke(this.lastBeam.color[0], this.lastBeam.color[1], this.lastBeam.color[2], 100);
            strokeWeight(6);
            line(this.lastBeam.start.x, this.lastBeam.start.y, 
                 this.lastBeam.end.x, this.lastBeam.end.y);
            pop();
        }

        // Draw always-horizontal info label above the ship
        if (!this.destroyed) {
            push();
            textAlign(CENTER, BOTTOM);
            textSize(12);
            fill(255);
            noStroke();
            // Get state name from AI_STATE value
            let stateKey = Object.keys(AI_STATE).find(k => AI_STATE[k] === this.currentState) || "";
            let targetLabel = "";
            
            if (this.currentState === AI_STATE.COLLECTING_CARGO && this.cargoTarget) {
                targetLabel = "Cargo";
            } else if (this.target && this.target.shipTypeName) {
                targetLabel = this.target.shipTypeName;
            } else {
                targetLabel = "None";
            }
            
            let label = `${this.role} | ${stateKey} | Target: ${targetLabel}`;
            text(label, this.pos.x, this.pos.y - this.size / 2 - 5);
            pop();
        }
    }

    // --- Standard Methods ---
    takeDamage(amount, attacker = null) { 
        if(this.destroyed || amount <= 0) return;
        
        this.hull -= amount; 
        
        // Track who's attacking us
        if (attacker) {
            this.lastAttacker = attacker;
            this.targetSwitchCooldown = 0; // Allow immediate targeting of attackers
        }
        
        // Chance to jettison cargo when hit hard enough
        if (amount > 5 && random() < 0.1) { // 10% chance
            this.jettisionCargo();
        }
        
        if (this.hull <= 0) {
            this.hull = 0;
            this.destroyed = true;
            
            // Drop cargo on destruction
            this.dropCargo();
            
            // Create explosion at destruction position
            if (this.currentSystem && typeof this.currentSystem.addExplosion === 'function') {
                this.currentSystem.addExplosion(this.pos.x, this.pos.y, this.size, [200, 100, 30]);
            }
            
            console.log(`${this.role} ${this.shipTypeName} destroyed!`);
        }
    }

    /**
     * Jettisons a single piece of cargo when hit
     */
    jettisionCargo() {
        if (!this.currentSystem) return;
        
        // Get cargo types for this ship
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        if (!shipDef || !shipDef.typicalCargo || shipDef.typicalCargo.length === 0) return;
        
        // Select a random cargo type and create it
        const cargoType = random(shipDef.typicalCargo);
        
        // Calculate a position slightly offset from the ship
        const offsetAngle = random(TWO_PI);
        const offsetDist = this.size * 0.6;
        const offsetX = this.pos.x + cos(offsetAngle) * offsetDist;
        const offsetY = this.pos.y + sin(offsetAngle) * offsetDist;
        
        // Create and add cargo to the system
        const cargo = new Cargo(offsetX, offsetY, cargoType);
        
        // Give cargo some velocity based on ship's velocity
        if (this.vel) {
            cargo.vel.add(p5.Vector.mult(this.vel, 0.3));
            cargo.vel.add(p5.Vector.random2D().mult(random(0.5, 1.5)));
        }
        
        // Add cargo to system's cargo array
        if (typeof this.currentSystem.addCargo === 'function') {
            this.currentSystem.addCargo(cargo);
        }
    }

    /**
     * Drops multiple cargo items when ship is destroyed
     */
    dropCargo() {
        if (!this.currentSystem) return;
        
        // Get cargo types for this ship
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        if (!shipDef || !shipDef.typicalCargo || shipDef.typicalCargo.length === 0) return;
        
        // Determine how many cargo items to drop based on ship size
        const cargoDropCount = Math.floor(map(this.size, 20, 120, 1, 5));
        
        for (let i = 0; i < cargoDropCount; i++) {
            // Select a random cargo type from this ship's typical cargo
            const cargoType = random(shipDef.typicalCargo);
            
            // Calculate a random position around the ship's destruction point
            const offsetAngle = random(TWO_PI);
            const offsetDist = random(this.size * 0.2, this.size * 0.7);
            const offsetX = this.pos.x + cos(offsetAngle) * offsetDist;
            const offsetY = this.pos.y + sin(offsetAngle) * offsetDist;
            
            // Create and add cargo to the system
            const cargo = new Cargo(offsetX, offsetY, cargoType);
            
            // Give cargo some velocity from the explosion
            cargo.vel = p5.Vector.random2D().mult(random(0.8, 2.0));
            
            // Add cargo to system
            if (typeof this.currentSystem.addCargo === 'function') {
                this.currentSystem.addCargo(cargo);
            }
        }
    }

    isDestroyed() { return this.destroyed; }
    checkCollision(target) { if (!target?.pos || target.size===undefined) return false; let dSq = sq(this.pos.x - target.pos.x) + sq(this.pos.y - target.pos.y); let sumRadii = (target.size / 2) + (this.size / 2); return dSq < sq(sumRadii); }

    /** Detects nearby cargo within range */
    detectCargo(system) {
        if (!system?.cargo || system.cargo.length === 0) return null;
        
        let closestCargo = null;
        let closestDistance = Infinity;
        
        for (const cargo of system.cargo) {
            if (cargo.collected) continue;
            
            const distance = dist(this.pos.x, this.pos.y, cargo.pos.x, cargo.pos.y);
            if (distance < this.cargoDetectionRange && distance < closestDistance) {
                closestCargo = cargo;
                closestDistance = distance;
            }
        }
        
        return closestCargo;
    }

    /** Handles cargo collection AI */
    updateCargoCollectionAI(system) {
        // If our target cargo disappeared or was collected, find a new one
        if (!this.cargoTarget || this.cargoTarget.collected) {
            this.cargoTarget = this.detectCargo(system);
            
            // If no cargo found, return to normal behavior
            if (!this.cargoTarget) {
                if (this.role === AI_ROLE.TRANSPORT) {
                    this.currentState = this.previousState || AI_STATE.TRANSPORTING;
                } else {
                    this.currentState = AI_STATE.IDLE;
                }
                return false; // No cargo to collect, resume normal behavior
            }
        }
        
        // Different movement handling for transporters vs. other roles
        if (this.role === AI_ROLE.TRANSPORT) {
            // Use direct thrust approach like in updateTransportAI
            let desiredDir = p5.Vector.sub(this.cargoTarget.pos, this.pos);
            let distance = desiredDir.mag();
            desiredDir.normalize();
            
            // Rotate smoothly towards the cargo
            let targetAngle = desiredDir.heading();
            let diff = targetAngle - this.angle;
            while (diff < -PI) diff += TWO_PI;
            while (diff > PI) diff -= TWO_PI;
            
            // CHANGE 1: Use a smaller rotation step to prevent overshooting
            if (abs(diff) > 0.02) {
                // Reduce rotation speed by half for more precise movement
                let rotationStep = constrain(diff, -this.rotationSpeed * 0.5, this.rotationSpeed * 0.5);
                this.angle += rotationStep;
                this.angle = (this.angle + TWO_PI) % TWO_PI;
            }
            
            // CHANGE 2: Always apply some thrust, but vary the amount based on alignment
            // This ensures the ship is always making forward progress
            let thrustScale = 0.2; // Minimum thrust even when poorly aligned
            
            if (abs(diff) < 0.8) { // Much wider tolerance (about 45 degrees)
                // Scale thrust based on alignment and distance
                thrustScale = map(abs(diff), 0, 0.8, 1.0, 0.2);
                
                const arrivalDistance = 100; // Start slowing down within this distance
                if (distance < arrivalDistance) {
                    thrustScale *= map(distance, 0, arrivalDistance, 0.2, 1.0);
                }
            }
            
            // Apply thrust with calculated scale
            let thrustVec = p5.Vector.fromAngle(this.angle);
            thrustVec.mult(this.thrustForce * thrustScale);
            this.vel.add(thrustVec);
            
            // CHANGE 3: Add stronger directional damping to prevent circling
            // Apply more damping to velocity component perpendicular to desired direction
            let velParallel = desiredDir.copy().mult(desiredDir.dot(this.vel));
            let velPerp = p5.Vector.sub(this.vel, velParallel);
            velPerp.mult(0.7); // Dampen perpendicular component more aggressively
            this.vel = p5.Vector.add(velParallel, velPerp);
            
            // Additional damping when close to cargo
            if (distance < 50) {
                this.vel.mult(0.85);
            }
            
            // Apply standard physics updates
            this.vel.mult(this.drag);
            this.vel.limit(this.maxSpeed);
            
            // Update position
            if (!isNaN(this.vel.x) && !isNaN(this.vel.y)) {
                this.pos.add(this.vel);
                
                // Debug log to track progress
                if (frameCount % 30 === 0) {
                    console.log(`Transport moving toward cargo: Vel(${this.vel.x.toFixed(2)},${this.vel.y.toFixed(2)}), Dist:${distance.toFixed(2)}, Angle diff:${diff.toFixed(3)}, Thrust:${thrustScale.toFixed(2)}`);
                }
            } else {
                this.vel.set(0, 0);
                console.error(`Invalid velocity for ${this.shipTypeName} during cargo collection`);
            }
        } else {
            // Original approach for pirates and other ships
            const desiredMovementTargetPos = this.cargoTarget.pos;
            this.performRotationAndThrust(desiredMovementTargetPos);
        }
        
        // Check if we've reached the cargo
        const distanceToCargo = dist(this.pos.x, this.pos.y, this.cargoTarget.pos.x, this.cargoTarget.pos.y);
        
        // When close enough to collect
        if (distanceToCargo < this.size/2 + this.cargoTarget.size*2) {
            // Collection logic unchanged
            this.cargoTarget.collected = true;
            
            const cargoIndex = system.cargo.indexOf(this.cargoTarget);
            if (cargoIndex !== -1) {
                system.cargo.splice(cargoIndex, 1);
            }
            
            console.log(`${this.shipTypeName} collected cargo`);
            this.cargoTarget = null;
            this.cargoCollectionCooldown = this.role === AI_ROLE.TRANSPORT ? 0.5 : 1.0;
            return true;
        }
        
        return true; // Still collecting
    }
} // End of Enemy Class

