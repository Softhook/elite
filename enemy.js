// ****** Enemy.js ******

// -------------------------
// --- Constants & Enums ---
// -------------------------

// Define AI Roles using a constant object for readability and maintainability
const AI_ROLE = {
    PIRATE: 'Pirate',
    POLICE: 'Police',
    HAULER: 'Hauler',
    TRANSPORT: 'Transport',  // local shuttles
    ALIEN: 'Alien',
    BOUNTY_HUNTER: 'BOUNTY_HUNTER',
    GUARD: 'Guard'
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
    COLLECTING_CARGO: 8,   // New state for cargo collection behavior
    FLEEING: 9,        // New state for damaged ships trying to escape
    GUARDING: 10,
    SNIPING: 11
};

// Reverse lookup for AI_STATE values to names
const AI_STATE_NAME = {};
for (const [k, v] of Object.entries(AI_STATE)) {
    AI_STATE_NAME[v] = k;
}

// --- AI Tuning Constants ---
const TIGHT_ANGLE_RAD = 0.17;  // ~10 degrees for weapon selection
const WIDE_ANGLE_RAD = 0.52;   // ~30 degrees for weapon selection
const CLOSE_RANGE_MULT = 0.4; // Multiplier of visualFiringRange
const MEDIUM_RANGE_MULT = 0.7; // Multiplier of visualFiringRange
const POLICE_WANTED_BASE_SCORE = 100;
const PIRATE_CARGO_BASE_SCORE = 30;
const PIRATE_CARGO_MULT = 1.5;
const RETALIATION_SCORE_BONUS = 60;
const FLEE_THRUST_MULT_TRANSPORT = 1.4;
const FLEE_THRUST_MULT_DEFAULT = 1.2;
const FLEE_MIN_DURATION_MS = 2000;
const FLEE_ESCAPE_DIST_MULT = 2.5; // Base multiplier for detectionRange
const TARGET_SCORE_INVALID = -Infinity; // Score for invalid/ignored targets
const TARGET_SCORE_BASE_WANTED = 100;   // Base score for police targeting wanted
const TARGET_SCORE_WANTED_PIRATE_BONUS = 20;
const TARGET_SCORE_PIRATE_CARGO_BASE = 30;
const TARGET_SCORE_PIRATE_CARGO_MULT = 1.5;
const TARGET_SCORE_PIRATE_PREY_HAULER = 40; // Score for targeting haulers/transports
const TARGET_SCORE_RETALIATION_PIRATE = 60; // Bonus for pirate retaliation
const TARGET_SCORE_RETALIATION_HAULER = 40; // Score for hauler/transport retaliation
const TARGET_SCORE_DISTANCE_PENALTY_MULT = 0.05; // Multiplier for distance penalty
const TARGET_SCORE_HULL_DAMAGE_MAX_BONUS = 30; // Max bonus score for damaged hull
const TARGET_SCORE_HULL_DAMAGE_MULT = 40; // Multiplier for hull damage bonus calculation

// --- NEW AI Attack Pass Tuning Constants ---
const ATTACK_PASS_STRAFE_OFFSET_MULT = 3; // Multiplier of enemy size for sideways offset
const ATTACK_PASS_AHEAD_DIST_MULT = 8;    // Multiplier of enemy size for how far ahead/past the side-strafe point to aim
const ATTACK_PASS_STRAFE_PREDICTION_FACTOR = 0.5; // How much of standard predictionTime to use for strafe point
const ATTACK_PASS_SPEED_BOOST_MULT = 1.1;         // Speed multiplier during attack pass
const ATTACK_PASS_COLLISION_AVOID_RANGE_FACTOR = 0.8; // Factor of combined sizes for emergency collision check
const ATTACK_PASS_COLLISION_AVOID_THRUST_REDUCTION = 0.3; // Thrust multiplier during emergency avoidance
const APPROACH_BRAKING_DISTANCE_FACTOR = 1.2; // Multiplier of combined (enemy+target) sizes to start braking in APPROACH
const APPROACH_CLOSE_THRUST_REDUCTION = 0.05; // Thrust multiplier when very close in APPROACH state (almost zero)


const SNIPING_IDEAL_RANGE_FACTOR = 0.9;         // Try to stay at 90% of visualFiringRange
const SNIPING_MIN_RANGE_EXIT_FACTOR = 0.4;    // If target closer than 50% of visualFiringRange, exit SNIPING
const SNIPING_MAX_RANGE_EXIT_FACTOR = 1.2;    // If target further than 110% of visualFiringRange, exit SNIPING
const SNIPING_BRAKE_FACTOR = 0.85;            // How quickly to slow down when trying to stay still
const SNIPING_POSITION_ADJUST_THRUST = 0.2;   // Gentle thrust for minor position adjustments
const SNIPING_STANDOFF_TOLERANCE_FACTOR = 0.1; // Allow 10% deviation from ideal range before adjusting
const SNIPING_HULL_DROP_EXIT_PERCENT = 0.15;  // Exit sniping if hull drops by 15% of maxHull since entering state

class Enemy {
    // ---------------------------------
    // --- Constructor & Initialization
    // ---------------------------------
    
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
        
        // Initialize thrust manager
        this.thrustManager = new ThrustManager();

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

        // Add forced combat timer
        this.forcedCombatTimer = 0;

        // After setting role in the constructor
        this.role = role;
        if (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.ALIEN) {
            // Pirates and Aliens are automatically wanted
            this.isWanted = true;
        } else {
            this.isWanted = false;
        }

        // Add unique ID for force wave tracking
        this.id = Date.now() + "_" + Math.floor(Math.random() * 1000);

        // --- Physics & Stats (using the final shipDef) ---
        this.pos = createVector(x, y); this.vel = createVector(0, 0); this.angle = random(TWO_PI); // Radians
        this.size = shipDef.size; this.baseMaxSpeed = shipDef.baseMaxSpeed; this.baseThrust = shipDef.baseThrust;
        // Add these critical initializations:
        this.thrustForce = this.baseThrust; // Initialize thrustForce from baseThrust
        this.maxSpeed = this.baseMaxSpeed; // Initialize maxSpeed from baseMaxSpeed

        this.baseTurnRate = shipDef.baseTurnRate; // Use direct radian value
        this.rotationSpeed = this.baseTurnRate * (this.role === AI_ROLE.HAULER ? 0.7 : 0.9);
        this.angleTolerance = 0.26; // About 15 degrees in radians

        // Apply NPC role modifiers (using degrees for turn rate calculation later)
        this.drag = 0.985; this.maxHull = shipDef.baseHull; this.hull = this.maxHull; this.destroyed = false;

        // --- Store Raw Color VALUES ---
        this.baseColorValue = [random(80, 180), random(80, 180), random(80, 180)]; // Store as [R, G, B] array
        this.strokeColorValue = [200, 200, 200]; // Default grey as [R, G, B]
        switch(this.role) {
            case AI_ROLE.POLICE: this.strokeColorValue = [100, 150, 255]; break; // Blue
            case AI_ROLE.HAULER: this.strokeColorValue = [200, 200, 100]; break; // Yellow
            case AI_ROLE.PIRATE: this.strokeColorValue = [255, 100, 100]; break; // Red
            case AI_ROLE.ALIEN:  this.strokeColorValue = shipDef.strokeColorValue || [0, 255, 150]; break;// Default Alien Green or from shipDef
            case AI_ROLE.BOUNTY_HUNTER:
            this.strokeColorValue = shipDef.strokeColorValue || [255, 165, 0]; // Orange stroke
            // Bounty hunters might have slightly better stats or use shipDef overrides
            this.rotationSpeed = shipDef.rotationSpeed || this.baseTurnRate * 1.1; // Slightly faster turning
            this.angleTolerance = shipDef.angleTolerance || (10 * PI/180); // Standard tolerance
            this.drag = shipDef.drag || 0.99; // Slightly less drag
            this.target = playerRef;
            break;
            case AI_ROLE.GUARD:
                this.strokeColorValue = shipDef.strokeColorValue || [150, 150, 220]; // Light purple/blue
                // Guards might inherit target from principal or player initially
                this.target = playerRef; // Default, can be overridden
                break;
        break;
        }

        this.strafeDirection = 0; // Will be -1 for left, 1 for right, 0 for none. Set in ATTACK_PASS entry.

        // Initialize p5.Color objects - set by initializeColors() later
        this.p5FillColor = null;
        this.p5StrokeColor = null;
        // ---

        // --- Targeting & AI ---
        this.target = playerRef; this.currentState = AI_STATE.IDLE; // Default state
        this.repositionTarget = null; this.passTimer = 0; this.nearStationTimer = 0; this.hasPausedNearStation = false; this.patrolTargetPos = null; // Target pos set in first update if needed
        // AI Tuning Parameters
        this.detectionRange = 450 + this.size; this.engageDistance = 180 + this.size * 0.5; this.firingRange = 350 + this.size * 0.3; this.visualFiringRange = this.firingRange; // Initialize with base range for drawing
        this.repositionDistance = 300 + this.size; this.predictionTime = 0.4; this.passDuration = 1.0 + this.size * 0.01; this.stationPauseDuration = random(3, 7); this.stationProximityThreshold = 150;

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
                uiManager.addMessage(`Detected ${this.shipTypeName} armed with ${this.currentWeapon.name}`);
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
        } else if (this.role === AI_ROLE.GUARD) {
            // Guard will start in GUARDING state if a principal is assigned soon after,
            // otherwise, it might start PATROLLING or IDLE until a principal is assigned.
            // For now, let's default to PATROLLING if no principal is immediately available.
            this.currentState = AI_STATE.PATROLLING;
        } else {
            // Existing role assignments – for Pirates/Police/Hauler, etc.
            switch(this.role) {
                case AI_ROLE.HAULER: this.currentState = AI_STATE.PATROLLING; break;
                case AI_ROLE.POLICE: this.currentState = AI_STATE.PATROLLING; break;
                case AI_ROLE.PIRATE: this.currentState = AI_STATE.IDLE; break;
                case AI_ROLE.ALIEN: this.currentState = AI_STATE.APPROACHING; break;
                case AI_ROLE.BOUNTY_HUNTER: this.currentState = AI_STATE.APPROACHING; break;
                default: this.currentState = AI_STATE.IDLE;
            }
        }

        //console.log(`Created Enemy: ${this.role} ${this.shipTypeName} (State: ${Object.keys(AI_STATE).find(key => AI_STATE[key] === this.currentState)})`);
        // IMPORTANT: calculateRadianProperties() and initializeColors() MUST be called AFTER construction.

        // Cargo collection behavior variables
        this.cargoTarget = null;
        this.cargoDetectionRange = 500; // How far ships can see cargo
        this.cargoCollectionCooldown = 0;
        this.previousState = null; // For returning to original state after collecting

        // Add thrust vector initialization
        this.thrustVector = createVector(0, 0);
        this.tempVector = createVector(0, 0);

        // Flag for thrusting
        this.isThrusting = false;

        // Initialize attack cooldown
        this.attackCooldown = 0;

        // Add shield properties
        this.maxShield = shipDef.baseShield || 0;
        this.shield = this.maxShield;
        this.shieldRechargeRate = shipDef.shieldRecharge || 0;

        // Add hit effect to shield tracking
        this.shieldHitTime = 0;

        // Shield recharge delay
        this.shieldRechargeDelay = 1000; // 3 seconds delay after shield hit
        this.lastShieldHitTime = 0; // Track when shield was last hit

        // --- Guard-specific properties ---
        this.principal = null; // The entity this guard is protecting
        this.guardFormationOffset = createVector(-70, 0); // Desired position relative to principal (x: behind/ahead, y: left/right)
        this.guardLeashDistance = 450;    // Max distance to stray from principal when not engaging
        this.guardEngageRange = 700;      // Range to detect and engage principal's attacker
        this.guardReactionTime = 0;       // Cooldown for reacting to principal's attacker
        // ---

        // --- Combat AI Flags ---
        this.combatFlagsInitialized = true; // Set flag here
        this.hasLoggedDamageActivation = false;
        this.hasLoggedPlayerTargeting = false;
        this.targetSwitchCooldown = 0;
        this.forcedCombatTimer = 0; // Initialize forced combat timer
        // --- End Combat AI Flags ---

        // --- Barrier System Properties ---
        this.isBarrierActive = false;
        this.barrierDamageReduction = 0;
        this.barrierDurationTimer = 0;
        this.barrierCooldown = 0;
        this.barrierRadius = 0;
        this.barrierColor = [100, 100, 255]; // Default blue
        // ---

        this.hasPlayedLockOnSound = false; // Add this new flag
        this.shieldPlusHullAtStateEntry = null; // For tracking combined health drop during certain states
    }

    // -----------------------------
    // --- Initialization Methods ---
    // -----------------------------
    
    /** Calculates and sets radian-based properties using p5.radians(). */
    calculateRadianProperties() {
         if (typeof radians !== 'function') {
             console.warn("Enemy.calculateRadianProperties: radians function not available!");
             return;
         }
         try {
             // No need to recalculate baseTurnRate - it's already in radians from constructor
             // Just set the derived properties:
             this.rotationSpeed = this.baseTurnRate * (this.role === AI_ROLE.HAULER ? 0.7 : 0.9);
             this.angleTolerance = 15 * PI/180; // This still converts 15 degrees to radians
         } catch(e) {
             console.error(`Error calc radians for Enemy ${this.shipTypeName}: ${e}`);
         }
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

    // -------------------------
    // --- Core Update Logic ---
    // -------------------------
    
    /** Updates the enemy's state machine, movement, and actions based on role. */
    update(system) {
        if (this.destroyed || !system) return;
    
        // Always update system reference when update is called
        this.currentSystem = system;
        
        // Update weapon cooldown
        this.fireCooldown -= deltaTime / 1000;
        
        // Cargo collection cooldown
        if (this.cargoCollectionCooldown > 0) {
            this.cargoCollectionCooldown -= deltaTime / 1000;
        }

        // Process hauler attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime / 1000;
        }

        // Regenerate shields only after recharge delay has passed
        const timeSinceShieldHit = millis() - this.lastShieldHitTime;
        if (this.shield < this.maxShield && !this.destroyed && timeSinceShieldHit > this.shieldRechargeDelay) {
            const timeScale = deltaTime ? (deltaTime / 16.67) : 1;
            const rechargeAmount = this.shieldRechargeRate * SHIELD_RECHARGE_RATE_MULTIPLIER * timeScale * 0.016;
            this.shield = Math.min(this.maxShield, this.shield + rechargeAmount);
        }

        // Update barrier cooldown and duration
        if (this.barrierCooldown > 0) {
            this.barrierCooldown -= deltaTime / 1000;
        }
        
        // Update barrier duration timer
        if (this.isBarrierActive && this.barrierDurationTimer > 0) {
            this.barrierDurationTimer -= deltaTime / 1000;
            if (this.barrierDurationTimer <= 0) {
                this.isBarrierActive = false;
                this.barrierDamageReduction = 0;
                this.barrierDurationTimer = 0;
                // Log barrier deactivation for debugging
                console.log(`${this.shipTypeName} barrier deactivated`);
            }
        }

            // Update drag effect timer
        if (this.dragEffectTimer > 0) {
            this.dragEffectTimer -= deltaTime / 1000; // Convert to seconds
            if (this.dragEffectTimer <= 0) {
                this.dragMultiplier = 1.0;
                this.dragEffectTimer = 0;
            }
        }

        // For pirates: Look for cargo first if not already collecting
        if (this.role === AI_ROLE.PIRATE && 
            this.currentState !== AI_STATE.COLLECTING_CARGO && 
            this.cargoCollectionCooldown <= 0) {
            
            const cargoTarget = this.detectCargo(system);
            if (cargoTarget) {
                this.cargoTarget = cargoTarget;
                this.changeState(AI_STATE.COLLECTING_CARGO);
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
                this.changeState(AI_STATE.COLLECTING_CARGO);
                console.log(`Transport ${this.shipTypeName} spotted cargo - deviating from route`);
            }
        }

        // Role-specific AI behavior updates
        try {
            if (this.role === AI_ROLE.TRANSPORT) {
                // Handle cargo collection first if applicable
                if (this.currentState === AI_STATE.COLLECTING_CARGO) {
                    if (!this.updateCargoCollectionAI(system)) {
                        // When done collecting, return to previous state
                        this.changeState(this.previousState || AI_STATE.TRANSPORTING);
                    }
                    this.updatePhysics();
                } else {
                    // Normal transport behavior
                    this.updateTransportAI(system);
                }
            } 
            // --- START OF NEW GUARD ROLE LOGIC ---
            else if (this.role === AI_ROLE.GUARD) {
                // *** ADD THIS CHECK ***
                if (this.currentState === AI_STATE.LEAVING_SYSTEM) {
                    // Use hauler jump logic for guards following their principal
                    this.updateHaulerAI(system);
                }
                else if (this.currentState === AI_STATE.GUARDING) {
                    this._updateState_GUARDING();
                }
                else {
                    this.updateCombatAI(system);
                }
                this.updatePhysics();
            }
            // --- END OF NEW GUARD ROLE LOGIC ---

            else {
                // Handle other role behaviors
                switch (this.role) {
                    case AI_ROLE.PIRATE:
                        if (this.currentState === AI_STATE.COLLECTING_CARGO) {
                            if (!this.updateCargoCollectionAI(system)) {
                                this.updateCombatAI(system);
                            }
                        } else {
                            this.updateCombatAI(system);
                        }
                        break;
                    case AI_ROLE.POLICE: 
                        this.updatePoliceAI(system); 
                        break;
                    case AI_ROLE.HAULER: 
                        this.updateHaulerAI(system); 
                        break;
                    case AI_ROLE.ALIEN: 
                        this.updateCombatAI(system);
                        break;
                    case AI_ROLE.BOUNTY_HUNTER:
                        this.updateCombatAI(system); // Bounty Hunters use combat AI
                        break;
                    default: 
                        // Default behavior for unknown roles
                        this.vel.mult(this.drag * 0.95); 
                        break;
                }
                
                // Update physics - except for Transport role which handles its own physics
                this.updatePhysics();
            }
        } catch (e) {
            console.error(`Error during AI update for ${this.role} ${this.shipTypeName}:`, e);
            this.changeState(AI_STATE.IDLE);
            this.updatePhysics(); // Still update physics even on error
        }
    }

    // ---------------------------
    // --- Role-Specific Updates ---
    // ---------------------------
    
/**
 * Updates the enemy's targeting information
 * @param {Object} system - The current star system
 * @return {boolean} Whether a valid target was found
 */
updateTargeting(system) {


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
        // Log all player evaluations
        //console.log(`%c🎯 PLAYER EVAL: ${this.shipTypeName} evaluating player: score=${playerScore}`, 'color:blue');
        if (playerScore > bestScore) {
            bestScore = playerScore;
            bestTarget = playerRef;
        }
    }
    
    // Evaluate other enemies (no debug)
    const canTargetOtherEnemies = (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.ALIEN); // <<< MODIFIED
    if (canTargetOtherEnemies && system.enemies) {
        for (const otherEnemy of system.enemies) {
            if (otherEnemy === this || otherEnemy === bestTarget || !this.isTargetValid(otherEnemy)) {
                continue;
            }
            // For Aliens, ensure they don't target other Aliens
            if (this.role === AI_ROLE.ALIEN && otherEnemy.role === AI_ROLE.ALIEN) {
                continue;
            }
            const enemyScore = this.evaluateTargetScore(otherEnemy, system);
            if (enemyScore > bestScore) {
                bestScore = enemyScore;
                bestTarget = otherEnemy;
            }
        }
    }

    // Evaluate cargo (no debug)
    if (this.role === AI_ROLE.PIRATE && system.cargo) {
        for (const cargoItem of system.cargo) {
            if (!cargoItem.collected && cargoItem !== bestTarget) {
                const cargoScore = this.evaluateTargetScore(cargoItem, system);
                if (cargoScore > bestScore) {
                    bestScore = cargoScore;
                    bestTarget = cargoItem;
                }
            }
        }
    }

    // Final target decision
    if (bestTarget && bestScore > 0) {
        const scoreThresholdForChange = 5;
        if (bestTarget !== this.target || bestScore > currentTargetScore + scoreThresholdForChange) {
            this.target = bestTarget;
            // Only debug if target is player
            if (bestTarget instanceof Player) {
                //console.log(`%c🎯 PLAYER TARGETED: ${this.shipTypeName} targeting player with score ${bestScore.toFixed(1)}`, 'color:red; background-color: black; font-weight:bold;');
            }
            return true;
        }
        return this.target !== null;
    } else {
        if (this.target instanceof Player) {
            //console.log(`%c🎯 PLAYER LOST: ${this.shipTypeName} stopped targeting player`, 'color:orange');
        }
        this.target = null;
        return false;
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
    return (function(enemy, target, system) {
        // Basic validity check
        if (!enemy.isTargetValid(target) || target === enemy) {
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
            
            // Original code - high priority for principal's attacker
            if (target === enemy.principal.lastAttacker && 
                enemy.isTargetValid(target) && 
                (enemy.principal.lastAttackTime && millis() - enemy.principal.lastAttackTime < 5000)) {
                //console.log(`${enemy.shipTypeName} (Guard) evaluating ${target.shipTypeName || 'Player'} as principal's attacker. HIGH SCORE.`);
                return 2000; // Very high score to engage principal's attacker
            }
            
            // Original code - only engage in self-defense otherwise
            if (target !== enemy.lastAttacker) { // If not self-defense
                return TARGET_SCORE_INVALID; // Guards don't pick fights otherwise
            }
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
        
        // Check if target is attacker
        let isAttacker = target === enemy.lastAttacker;
        if (!isAttacker && isPlayer && enemy.lastAttacker instanceof Player) {
            isAttacker = true;
            if (isPlayer) {
                //console.log(`%c🔍 PLAYER MATCH: ${enemy.shipTypeName} identified Player as attacker`, 'color:blue; font-weight:bold');
            }
        }
        
        // Add attacker bonus
        if (isAttacker && isPlayer) {
            _score += TARGET_SCORE_RETALIATION_PIRATE;
            _interesting = true;
            //console.log(`%c🔍 PLAYER RETALIATION: ${enemy.shipTypeName} responding to player attack: +${TARGET_SCORE_RETALIATION_PIRATE}, score now ${_score}`, 'color:green; font-weight:bold');
        } else if (isAttacker) {
            _score += TARGET_SCORE_RETALIATION_PIRATE;
            _interesting = true;
        }
        
        // Role-specific scoring - add based on enemy role
        switch (enemy.role) {
            case AI_ROLE.PIRATE:
                if (isPlayer) {
                    _interesting = true;
                    //console.log(`%c🔍 PIRATE TARGETING PLAYER: ${enemy.shipTypeName} base score: +20, score now ${_score}`, 'color:green');
                    
                    // Add cargo bonus
                    const cargoAmount = target.getCargoAmount ? target.getCargoAmount() : (target.cargo?.length || 0);
                    if (cargoAmount > 5) {
                        const cargoBonus = TARGET_SCORE_PIRATE_CARGO_BASE + cargoAmount * TARGET_SCORE_PIRATE_CARGO_MULT;
                        _score += cargoBonus;
                        //console.log(`%c🔍 PIRATE TARGETING PLAYER: Cargo bonus +${cargoBonus}, score now ${_score}`, 'color:green');
                    }
                } else if (target.role === AI_ROLE.HAULER || target.role === AI_ROLE.TRANSPORT) {
                    _score += TARGET_SCORE_PIRATE_PREY_HAULER;
                    _interesting = true;
                } else if (target.constructor?.name === 'Cargo') {
                    _score += TARGET_SCORE_PIRATE_CARGO_BASE;
                    _interesting = true;
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
            
                
            case AI_ROLE.ALIEN: // <<< NEW CASE
            if (target.role !== AI_ROLE.ALIEN) { // Target anything that is not an Alien
                _score += 50; // Base score for any non-alien target
                _interesting = true;
 
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
        }
        
        // Log before distance penalties
        if (isPlayer) {
            //console.log(`%c🔍 DEBUG: Before distance penalties, score is ${_score}`, 'color:purple');
        }
        
        // Distance penalties - Only if interesting
        if (_interesting) {
            const distance = enemy.distanceTo(target);
            
            // Reduced penalty for important targets
            let distancePenaltyMult = TARGET_SCORE_DISTANCE_PENALTY_MULT;
            if (isAttacker || isPlayer) {
                distancePenaltyMult *= 0.5;
            }
            
            // Calculate penalty with cap
            const distancePenalty = Math.min(40, distance * distancePenaltyMult);
            
            // Apply penalty with protection for important targets
            if ((isAttacker || isPlayer) && isPlayer) {
                const minScoreAfterPenalty = 10;
                const adjustedPenalty = Math.min(distancePenalty, Math.max(0, _score - minScoreAfterPenalty));
                _score -= adjustedPenalty;
                //console.log(`%c🔍 PLAYER DISTANCE PENALTY: ${adjustedPenalty.toFixed(1)} (capped from ${distancePenalty.toFixed(1)}), score now ${_score.toFixed(1)}`, 'color:blue');
            } else {
                _score -= distancePenalty;
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

    /**
     * Calculate optimal weapon for current combat situation
     * Takes into account range, target type, and weapon capabilities
     * @param {number} distanceToTarget - Distance to current target
     * @param {Object} target - The current target
     * @return {Object} The selected weapon definition
     */
    selectOptimalWeapon(distanceToTarget, target) {
        // If we only have one weapon, just use it
        if (!this.weapons || this.weapons.length <= 1) return this.currentWeapon;

        // Prioritize barrier if health or shield are low
        const barrierWeapon = this.weapons.find(w => w.type === 'barrier');
        if (barrierWeapon && this.barrierCooldown <= 0) {
            const hullPct = this.hull / this.maxHull;
            const shieldPct = this.maxShield > 0 ? this.shield / this.maxShield : 1;
            if (hullPct < 0.3 || shieldPct < 0.3) {
                return barrierWeapon;
            }
        }

        // Score each weapon based on situation
        let bestScore = -1;
        let bestWeapon = this.currentWeapon;

        // Check if target is already entangled
        const targetAlreadyEntangled = target && 
                                    target.dragMultiplier > 1.0 && 
                                    target.dragEffectTimer > 0;
        
        for (const weapon of this.weapons) {
            let score = 0;
            
            // Range considerations
            const isLongRange = distanceToTarget > this.visualFiringRange * MEDIUM_RANGE_MULT;
            const isMediumRange = distanceToTarget > this.visualFiringRange * CLOSE_RANGE_MULT && distanceToTarget <= this.visualFiringRange * MEDIUM_RANGE_MULT;
            const isShortRange = distanceToTarget <= this.visualFiringRange * CLOSE_RANGE_MULT;
            const isVeryCloseRange = distanceToTarget <= this.visualFiringRange * 0.2; // Very close = 20% of firing range
            
            // --- FORCE WEAPON LOGIC ---
            // Force weapons are highly effective at very close range
            if (weapon.type.includes('force') && isVeryCloseRange) {
                score += 5; // Highest priority at very close rangee
            }

            // --- TANGLE WEAPON LOGIC ---
            if (weapon.type.includes('tangle') && target) {
                // Only consider tangle weapons if target is NOT already entangled
                if (!targetAlreadyEntangled) {
                    // Extra effective against very fast targets
                    if (target.maxSpeed > 6.5) {
                        score += 5; // Highest priority for very fast targets
                    } 
                    // Good for fast targets
                    else if (target.maxSpeed > 5) {
                        score += 3;
                    } 
                } else {
                    // Target is already entangled - significant penalty
                    score -= 10; // Strong negative score to discourage selection
                }
            }

            // Score based on weapon type and range
            if (weapon.type.includes('beam') && isLongRange) {
                score += 3; // Beams are good at long range
            } else if (weapon.type.includes('beam') && isMediumRange) {
                score += 2;
            } else if (weapon.type.includes('beam') && isShortRange) {
                score += 1;
            }
            
            if (weapon.type.startsWith('spread') && isShortRange) {
                score += 3; // now catches spread2/3/4/5
            } else if (weapon.type.startsWith('straight') && isMediumRange) {
                score += 2; // now catches straight2/3/4…
            } else if (weapon.type.startsWith('straight') && isLongRange) {
                score += 1;
            }
            
            if (weapon.type === 'missile' && (isMediumRange || isLongRange)) {
                score += 3; // Missiles are best at medium to long range
            } else if (weapon.type === 'missile' && isShortRange) {
                score += 1;
            }
            
            if (weapon.type === 'turret') {
                score += 2; // Turrets are flexible at any range
            }
            
            // Target-specific considerations
            if (target) {
                // Against fast targets, prefer wide-angle weapons like spread
                if (target.maxSpeed > 5 && weapon.type.startsWith('spread')) {
                    score += 3;
                }    
                // Against slow targets, prefer missile weapons
                if (target.maxSpeed < 5 && weapon.type === 'missile') {
                    score += 2;
                }
                // Against large targets, prefer high damage weapons
                if (target.size > 50 && weapon.damage > 10) {
                    score += 2;
                }
                
            }
            
            // If this weapon scores better, select it
            if (score > bestScore) {
                bestScore = score;
                bestWeapon = weapon;
            }
        }
        
        // Only change weapons if the selected one is different and better by at least 2 points
        if (bestWeapon !== this.currentWeapon && bestScore > 0) {
            return bestWeapon;
        }
        
        // Otherwise stick with current weapon
        return this.currentWeapon;
    }

    /**
     * Select the appropriate weapon and set it as current
     * @param {number} distanceToTarget - Distance to current target
     */
    selectBestWeapon(distanceToTarget) {
        if (!this.weapons || this.weapons.length <= 1) return;
        
        // Use our new optimal weapon selection algorithm
        const optimalWeapon = this.selectOptimalWeapon(distanceToTarget, this.target);
        
        // If we got a different weapon, switch to it
        if (optimalWeapon !== this.currentWeapon) {
            // Find the index of the optimal weapon
            const newIndex = this.weapons.indexOf(optimalWeapon);
            if (newIndex !== -1) {
                this.weaponIndex = newIndex;
                this.currentWeapon = this.weapons[this.weaponIndex];
                this.fireRate = this.currentWeapon.fireRate;
                // Reset cooldown when switching weapons (half normal delay)
                this.fireCooldown = this.fireRate * 0.5;
                
                // Log weapon change for debugging
                if (this.lastWeaponSwitch === undefined || 
                    millis() - this.lastWeaponSwitch > 2000) {
                    console.log(`${this.shipTypeName} switching to ${this.currentWeapon.name} at range ${distanceToTarget.toFixed(0)}`);
                    this.lastWeaponSwitch = millis();
                }
            }
        }
    }

    /**
     * Calculate the movement target position based on current state and target
     * @param {number} distanceToTarget - Current distance to target
     * @return {p5.Vector|null} Position vector to move toward
     */
    getMovementTargetForState(distanceToTarget) {
        let desiredMovementTargetPos = null;
        
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
                        case AI_STATE.SNIPING: // <<< NEW CASE
                if (this.isTargetValid(this.target)) {
                    const idealSnipeRange = this.visualFiringRange * SNIPING_IDEAL_RANGE_FACTOR;
                    const rangeTolerance = idealSnipeRange * SNIPING_STANDOFF_TOLERANCE_FACTOR;

                    if (distanceToTarget > idealSnipeRange + rangeTolerance) {
                        // Too far, move slightly closer to target
                        let vecToTarget = p5.Vector.sub(this.target.pos, this.pos);
                        desiredMovementTargetPos = p5.Vector.add(this.pos, vecToTarget.setMag(distanceToTarget - idealSnipeRange));
                    } else if (distanceToTarget < idealSnipeRange - rangeTolerance) {
                        // Too close, move slightly away from target
                        let vecFromTarget = p5.Vector.sub(this.pos, this.target.pos);
                        desiredMovementTargetPos = p5.Vector.add(this.pos, vecFromTarget.setMag(idealSnipeRange - distanceToTarget));
                    } else {
                        // Within tolerance, try to stay put
                        desiredMovementTargetPos = this.pos.copy();
                    }
                } else {
                    desiredMovementTargetPos = this.pos.copy(); // No valid target, stay put
                }
                break;
        }
        
        return desiredMovementTargetPos;
    }

    /**
     * Update the enemy's combat state based on target and distance
     * @param {boolean} targetExists - Whether we have a valid target
     * @param {number} distanceToTarget - Distance to the current target
     */
// -------------------------
// Replace your existing updateCombatState with:
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
    }
}

// -------------------------
// Add these private helpers immediately below:

/** @private */
_updateState_IDLE(targetExists) {
    if (targetExists) {
        this.changeState(AI_STATE.APPROACHING);
    } else if (this.role === AI_ROLE.GUARD && this.principal && this.isTargetValid(this.principal)) {
        // If idle, is a guard, and has a valid principal, return to GUARDING state.
        this.changeState(AI_STATE.GUARDING);
    }
    // Otherwise, remains IDLE.
}

/** @private Handles state logic for SNIPING */
_updateState_SNIPING(targetExists, distanceToTarget) {
    if (!targetExists) {
        this.changeState(this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
        return;
    }

    // --- Check for significant damage taken (shield + hull) while sniping ---
    if (this.shieldPlusHullAtStateEntry !== null) {
        const totalMaxHealth = this.maxShield + this.maxHull;
        if (totalMaxHealth > 0) { // Ensure totalMaxHealth is positive
            const combinedHealthDropThreshold = totalMaxHealth * SNIPING_HULL_DROP_EXIT_PERCENT;
            const currentCombinedHealth = this.shield + this.hull;

            if (currentCombinedHealth < this.shieldPlusHullAtStateEntry - combinedHealthDropThreshold) {
                console.log(`${this.shipTypeName} (SNIPING): Took significant damage. Switching to ATTACK_PASS.`);
                this.changeState(AI_STATE.ATTACK_PASS);
                return; // Exit early after state change
            }
        }
    }
    // --- END NEW ---

    // Flee if damaged
    if (this.hull < this.maxHull * 0.3) { // Example flee threshold
        this.changeState(AI_STATE.FLEEING);
        return;
    }

    const idealSnipeRange = this.visualFiringRange * SNIPING_IDEAL_RANGE_FACTOR;
    const minSnipeRange = this.visualFiringRange * SNIPING_MIN_RANGE_EXIT_FACTOR;
    const maxSnipeRange = this.visualFiringRange * SNIPING_MAX_RANGE_EXIT_FACTOR;

    // Transition conditions
    if (distanceToTarget < minSnipeRange) {
        // Target is too close, decide to ATTACK_PASS or REPOSITION
        // For now, let's transition to ATTACK_PASS to be aggressive
        console.log(`${this.shipTypeName} (SNIPING): Target too close (${distanceToTarget.toFixed(0)} < ${minSnipeRange.toFixed(0)}), switching to ATTACK_PASS.`);
        this.changeState(AI_STATE.ATTACK_PASS);
    } else if (distanceToTarget > maxSnipeRange) {
        // Target is too far, need to APPROACH
        console.log(`${this.shipTypeName} (SNIPING): Target too far (${distanceToTarget.toFixed(0)} > ${maxSnipeRange.toFixed(0)}), switching to APPROACHING.`);
        this.changeState(AI_STATE.APPROACHING);
    } 
    // NEW: Add random chance to reposition or start an attack run
    else if (frameCount % 60 === 0 && random() < 0.05) { // Check every ~1 second with 5% chance
        // Decide between repositioning (30%) or attack run (70%)
        if (random() < 0.3) {
            console.log(`${this.shipTypeName} (SNIPING): Randomly repositioning for a better angle.`);
            let stateData = {};
            let v = p5.Vector.sub(this.pos, this.target.pos);
            v.rotate(random(-PI/2, PI/2)); // Shift angle randomly
            v.setMag(this.repositionDistance * random(0.8, 1.2)); // Vary distance slightly
            stateData.repositionTarget = p5.Vector.add(this.pos, v);
            this.changeState(AI_STATE.REPOSITIONING, stateData);
        } else {
            console.log(`${this.shipTypeName} (SNIPING): Initiating surprise attack run.`);
            this.changeState(AI_STATE.ATTACK_PASS);
        }
    }
    // Otherwise, stay in SNIPING state. Movement and firing are handled by
    // getMovementTargetForState, performRotationAndThrust, and performFiring.
}

/** @private */
_updateState_APPROACHING(targetExists, distanceToTarget) {
    if (!targetExists) {
        this.changeState(this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
        return;
    }

    // Condition to enter SNIPING state:
    // Target is within a good sniping range (e.g., 70% to 95% of visualFiringRange)
    // AND not yet close enough for a standard attack pass.
    const canSnipe = this.visualFiringRange > 0 && // Must have a firing range
                     distanceToTarget < this.visualFiringRange * SNIPING_IDEAL_RANGE_FACTOR * 1.1 && // Within 110% of ideal snipe range
                     distanceToTarget > this.engageDistance * 1.1; // Further than typical engage distance for attack pass

    if (canSnipe && this.hasGoodSnipingWeapon()) { // Add a check for suitable weapons
        console.log(`${this.shipTypeName} (APPROACHING): Target in snipe range (${distanceToTarget.toFixed(0)}), switching to SNIPING.`);
        this.changeState(AI_STATE.SNIPING);
    } else if (distanceToTarget < this.engageDistance) {
        this.changeState(AI_STATE.ATTACK_PASS);
    }
    // Otherwise, continue approaching.
}

/** @private */
_updateState_ATTACK_PASS(targetExists) {
    if (!targetExists) {
        this.changeState(this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
        return;
    }
    this.passTimer -= deltaTime / 1000;
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
                console.log(`${this.shipTypeName}: Attack pass complete, repositioning`);
                this.changeState(AI_STATE.REPOSITIONING, stateData);
            } else {
                // Go directly back to approaching state for another attack run
                console.log(`${this.shipTypeName}: Attack pass complete, resuming approach`);
                this.changeState(AI_STATE.APPROACHING);
            }
        } else {
            // If target is no longer valid, go to appropriate default state
            this.changeState(this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
        }
    }
}


/** @private */
_updateState_REPOSITIONING(targetExists, distanceToTarget) {
    if (!targetExists) {
        this.changeState(this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
        return;
    }

    let distToRepo = this.repositionTarget
        ? this.distanceTo(this.repositionTarget)
        : Infinity;

    // Condition to enter SNIPING state after repositioning:
    const canSnipeAfterReposition = this.visualFiringRange > 0 &&
                                   distanceToTarget < this.visualFiringRange * SNIPING_IDEAL_RANGE_FACTOR * 1.05 && // Within 105% of ideal
                                   distanceToTarget > this.engageDistance * 1.2; // Further than engage for attack pass

    if (distToRepo < 50 || distanceToTarget > this.repositionDistance * 0.9) { // Reached repo point or target moved far
        if (canSnipeAfterReposition && this.hasGoodSnipingWeapon()) {
            console.log(`${this.shipTypeName} (REPOSITIONING): Repositioned to snipe range (${distanceToTarget.toFixed(0)}), switching to SNIPING.`);
            this.changeState(AI_STATE.SNIPING);
        } else {
            this.changeState(AI_STATE.APPROACHING);
        }
    }
}

/** @private */
_updateState_PATROLLING(targetExists, distanceToTarget) {
    if (targetExists && distanceToTarget < this.detectionRange) {
        this.changeState(AI_STATE.APPROACHING);
    }
    // If patrolling and a principal is assigned, switch to GUARDING
    if (this.principal && this.isTargetValid(this.principal)) {
        this.changeState(AI_STATE.GUARDING);
    }
}



/** @private Handles state logic for GUARDING */
_updateState_GUARDING() {
    // Check if principal is missing, destroyed, or has left the system
    if (!this.principal || !this.isTargetValid(this.principal)) {
        const system = this.getSystem();
        
        // Principal Jumped: Check if principal was at jump zone when it disappeared
        if (this.principal && this.principal.destroyed && system?.jumpZoneCenter) {
            // Principal is gone - determine if it jumped or was destroyed
            console.log(`${this.shipTypeName} (Guard): Principal ${this.principal.shipTypeName} has left the system. Following...`);
            
            // Set up for system exit - always follow through jump zone
            this.setLeavingSystemTarget(system);
            this.changeState(AI_STATE.LEAVING_SYSTEM);
            
            // Apply velocity boost in jump direction
            if (system.jumpZoneCenter) {
                const jumpDir = p5.Vector.sub(system.jumpZoneCenter, this.pos).normalize();
                this.vel.add(jumpDir.mult(this.maxSpeed * 0.7));
            }
            return;
        }
        
        // Principal was destroyed or is invalid 
        console.log(`${this.shipTypeName} (Guard): Principal is invalid or destroyed. Reverting to default state.`);
        this.principal = null;
        this.changeState(this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
        return;
    }

    // Principal is valid - update guard reaction cooldown
    if (this.guardReactionTime > 0) {
        this.guardReactionTime -= deltaTime / 1000;
    }

    // Check if principal is being attacked
    const principalAttacker = this.principal.lastAttacker;
    const timeSincePrincipalAttack = this.principal.lastAttackTime ? millis() - this.principal.lastAttackTime : Infinity;

    if (this.guardReactionTime <= 0 && 
        principalAttacker && 
        this.isTargetValid(principalAttacker) && 
        principalAttacker !== this && 
        timeSincePrincipalAttack < 5000) { // React to attacks within last 5s
        
        const distToPrincipalAttacker = this.distanceTo(principalAttacker);

        if (distToPrincipalAttacker < this.guardEngageRange) {
            console.log(`${this.shipTypeName} (Guard): ${this.principal.shipTypeName || 'Principal'} is under attack by ${principalAttacker.shipTypeName || 'Unknown Attacker'}. Engaging!`);
            this.target = principalAttacker; // Set the attacker as the guard's target
            this.changeState(AI_STATE.APPROACHING); // Switch to combat mode
            this.guardReactionTime = 5.0; // Cooldown before checking for new attacker for principal
            return;
        }
    }

    // If no immediate threat to principal, maintain formation
    let desiredWorldPos;
    const principalAngle = this.principal.angle;
    const offsetX = this.guardFormationOffset.x; // e.g., -70 (behind)
    const offsetY = this.guardFormationOffset.y; // e.g.,   0 (directly behind) or +/- for side

    const cosP = cos(principalAngle);
    const sinP = sin(principalAngle);

    // Offset relative to principal's orientation
    // X component of offset is along principal's forward/backward axis
    // Y component of offset is along principal's left/right axis
    const localDeltaX = offsetX;
    const localDeltaY = offsetY;

    const worldDeltaX = cosP * localDeltaX - sinP * localDeltaY;
    const worldDeltaY = sinP * localDeltaX + cosP * localDeltaY;

    desiredWorldPos = createVector(this.principal.pos.x + worldDeltaX, this.principal.pos.y + worldDeltaY);

    const distToFormationPoint = this.distanceTo(desiredWorldPos);
    const distDirectToPrincipal = this.distanceTo(this.principal.pos);

    if (distDirectToPrincipal > this.guardLeashDistance || distToFormationPoint > this.size * 0.5) {
        // If too far from principal OR not in formation spot, move towards formation spot
        this.performRotationAndThrust(desiredWorldPos);
    } else {
        // In formation, match principal's velocity more precisely
        if (this.principal.vel) {
            // Calculate velocity difference
            let velDiff = p5.Vector.sub(this.principal.vel, this.vel);
            
            // Match speed more aggressively (25% per frame instead of 5%)
            this.vel.add(velDiff.mult(0.25));
            
            // No general damping when actively matching principal's speed
            // Only apply minor stabilization
            if (velDiff.magSq() < 0.1) { // If velocities are very close
                this.vel.mult(0.99); // Minimal damping for stability
            }
            
            // Match orientation too for better formation aesthetics
            this.rotateTowards(this.principal.angle);
        }
    }
    // Guards in GUARDING state don't typically fire unless they transition to a combat state
    // This is handled by the general takeDamage -> lastAttacker -> updateTargeting flow
}



  /** @private Handles state logic for FLEEING (movement + exit) */
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
      const returnState = this._determinePostFleeState();
      this.changeState(returnState);
      return;
    }

    // 3) Movement: thrust away from attacker
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
    this.thrustForward(fleeThrustMultiplier);

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
      console.log(`${this.shipTypeName} escaped successfully.`);
      this.lastAttacker = null;
      this.fleeStartTime = null;
      this.attackCooldown = (this.role === AI_ROLE.HAULER || this.role === AI_ROLE.TRANSPORT)
        ? 30.0 : 20.0;
      const returnState = this._determinePostFleeState();
      this.changeState(returnState);
    }
  }


/** @private */
_determinePostFleeState() {
    let state = AI_STATE.IDLE;
    if (this.role === AI_ROLE.POLICE) state = AI_STATE.PATROLLING;
    else if (this.role === AI_ROLE.HAULER) state = this.previousHaulerState || AI_STATE.PATROLLING;
    else if (this.role === AI_ROLE.TRANSPORT) state = this.previousTransportState || AI_STATE.TRANSPORTING;
    // never return into a combat pass
    if ([AI_STATE.APPROACHING, AI_STATE.ATTACK_PASS, AI_STATE.REPOSITIONING].includes(state)) {
        state = (this.role === AI_ROLE.POLICE || this.role === AI_ROLE.HAULER)
            ? AI_STATE.PATROLLING
            : AI_STATE.TRANSPORTING;
    }
    return state;
}

    /**
     * Private helper to manage the forced combat state for Haulers after being attacked.
     * Updates the timer and overrides the target if necessary.
     * @param {Object} system - The current star system (unused currently, but good practice)
     * @returns {boolean} True if currently in forced combat mode, false otherwise.
     * @private
     */
    _handleForcedCombat(system) {
        // Don’t override fleeing with forced combat
        if (this.currentState === AI_STATE.FLEEING) {
            return false;
        }


        let isInForcedCombat = false;

        // Check if forced combat should be initiated (Hauler role, recently attacked)
        if (this.lastAttacker && this.role === AI_ROLE.HAULER && this.forcedCombatTimer <= 0) {
            this.forcedCombatTimer = 5.0; // 5 seconds of forced combat
            console.log(`${this.shipTypeName} entering FORCED COMBAT MODE after attack`);
        }

        // Update and check the timer
        if (this.forcedCombatTimer > 0) {
            this.forcedCombatTimer -= deltaTime / 1000;
            isInForcedCombat = true;

            // Override target to the last attacker
            if (this.lastAttacker && this.isTargetValid(this.lastAttacker)) {
                this.target = this.lastAttacker;
                // Ensure the state is appropriate for combat
                if (this.currentState === AI_STATE.IDLE || this.currentState === AI_STATE.PATROLLING) {
                    this.changeState(AI_STATE.APPROACHING);
                }
            } else {
                // Attacker became invalid, end forced combat early
                this.forcedCombatTimer = 0;
                isInForcedCombat = false;
                this.lastAttacker = null; // Clear invalid attacker
            }
        }

        return isInForcedCombat;
    }

    /**
    * Helper to check if the current ship has weapons suitable for sniping.
     * @returns {boolean} True if a sniping weapon is equipped.
     */
    hasGoodSnipingWeapon() {
        if (!this.currentWeapon) return false;
        // Define what constitutes a "good sniping weapon"
        // Example: Beams, non-spread projectiles, or missiles.
        const weaponType = this.currentWeapon.type;
        return weaponType === WEAPON_TYPE.BEAM ||
               weaponType === WEAPON_TYPE.MISSILE ||
               (weaponType.startsWith(WEAPON_TYPE.PROJECTILE_STRAIGHT)) || // e.g. PROJECTILE_STRAIGHT, PROJECTILE_STRAIGHT_FAST
               weaponType === WEAPON_TYPE.TURRET; // Turrets can be good if accurate
    }

    /**
     * Main combat AI implementation - now using smaller helper methods
     * @param {Object} system - The current star system
     */
    updateCombatAI(system) {
        // 1. Handle forced‐combat mode (e.g., Hauler retaliation override)
        const isInForcedCombat = this._handleForcedCombat(system);
    
        // 2. Update targeting (may be overridden by forced combat)
        let targetExists = this.updateTargeting(system);
        targetExists = this.isTargetValid(this.target);
    
        // 3. Compute distance to target and angle for firing
        let distanceToTarget = targetExists ? this.distanceTo(this.target) : Infinity;
        let shootingAngle = this.angle;
        if (targetExists) {
            shootingAngle = atan2(
                this.target.pos.y - this.pos.y,
                this.target.pos.x - this.pos.x
            );
        }
    
        // 4. Run state‐transition logic.
        //    REMOVED: if (!isInForcedCombat)
        //    Allow updateCombatState to run even if in forced combat,
        //    so Haulers can transition from APPROACHING to ATTACK_PASS.
        this.updateCombatState(targetExists, distanceToTarget);
    
        // 5. If just entered (or still in) FLEEING, perform flee logic and exit
        // ← NO MORE "if (FLEEING) updateFleeingAI" here!
        if (this.currentState === AI_STATE.FLEEING) {
            // state helper handles movement & exit
            return;
        }
    
        // 6. Otherwise, do normal combat movement & firing
        const desiredMovementTargetPos = this.getMovementTargetForState(distanceToTarget);
        this.performRotationAndThrust(desiredMovementTargetPos);
        this.performFiring(system, targetExists, distanceToTarget, shootingAngle);
    }

    /**
     * Police AI Logic - Patrols, switches to Combat AI if player is wanted
     * @param {Object} system - The current star system
     */
    updatePoliceAI(system) {

        // Update to check system wanted status instead of player
        if (system.player && system.isPlayerWanted()) {
            // Always set player as target when wanted
            this.target = system.player;
            
            // MODIFIED: Immediately pursue if system-wide alert is active
            if (system.policeAlertSent && 
                (this.currentState === AI_STATE.PATROLLING || this.currentState === AI_STATE.IDLE)) {
                this.changeState(AI_STATE.APPROACHING);
                
                // Force rotation toward player
                if (this.pos && system.player.pos) {
                    let angleToPlayer = atan2(system.player.pos.y - this.pos.y, 
                                            system.player.pos.x - this.pos.x);
                    this.angle = angleToPlayer;
                }
                
                if (!this.hasReportedWantedPlayer) {
                    console.log(`Police ${this.shipTypeName} responding to system-wide alert`);
                    this.hasReportedWantedPlayer = true;
                }
            }
            
            // Use combat AI when player is wanted
            this.updateCombatAI(system);
            return;
        } else {
            // Reset flags when player is no longer wanted
            this.hasReportedWantedPlayer = false;
            this.reportedWantedTarget = false;
            
            // Clear system alert flag if needed
            if (system.player && !system.player.isWanted && system.policeAlertSent) {
                system.policeAlertSent = false;
            }
        }
        
        // Check for wanted ships
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
                this.changeState(AI_STATE.APPROACHING);
            }
            this.updateCombatAI(system);
        } else {
            // No wanted targets: Patrol
            if (this.currentState !== AI_STATE.PATROLLING) {
                this.changeState(AI_STATE.PATROLLING);
            }
            
            if (!this.patrolTargetPos) {
                this.patrolTargetPos = system?.station?.pos?.copy() || createVector(random(-500, 500), random(-500, 500));
            }
            
            let desiredMovementTargetPos = this.patrolTargetPos;
            let distToPatrolTarget = desiredMovementTargetPos
                ? dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y)
                : Infinity;
                
            if (distToPatrolTarget < 50) {
                // Select a new patrol target - sometimes station, sometimes elsewhere
                if (system?.station?.pos) {
                    if (random() < 0.2) { //20% chance to patrol back to station
                        this.patrolTargetPos = system.station.pos.copy();
                        //console.log(`Police ${this.shipTypeName} patrolling back to station`);
                    } else {
                        // 70% chance to patrol elsewhere in the system
                        const patrolRange = 2000; // Area to patrol within
                        const patrolAngle = random(TWO_PI);
                        const patrolDist = random(700, patrolRange);
                        
                        // Create patrol point relative to current position
                        this.patrolTargetPos = createVector(
                            this.pos.x + cos(patrolAngle) * patrolDist,
                            this.pos.y + sin(patrolAngle) * patrolDist
                        );
                        
                        //console.log(`Police ${this.shipTypeName} patrolling to new point at distance ${patrolDist.toFixed(0)}`);
                    }
                } else {
                    // No station, just patrol randomly
                    this.patrolTargetPos = createVector(random(-1000, 1000), random(-1000, 1000));
                }
                desiredMovementTargetPos = this.patrolTargetPos;
            }
            
            this.performRotationAndThrust(desiredMovementTargetPos);
        }
    }

    /** Hauler AI Logic - Moves between station and system edge. */
    updateHaulerAI(system) {
        // Check for attackers FIRST
        if (this.lastAttacker && this.isTargetValid(this.lastAttacker) &&
            this.currentState !== AI_STATE.FLEEING && // Don't interrupt fleeing
            this.currentState !== AI_STATE.APPROACHING && // Don't interrupt combat
            this.currentState !== AI_STATE.ATTACK_PASS &&
            this.currentState !== AI_STATE.REPOSITIONING &&
            (!this.attackCooldown || this.attackCooldown <= 0)) {

            const attackerDistance = this.distanceTo(this.lastAttacker);
            if (attackerDistance < this.detectionRange * 1.2) {
                // Store current state before switching to combat/fleeing
                this.previousHaulerState = this.currentState;
                this.previousTargetPos = this.patrolTargetPos ? this.patrolTargetPos.copy() : null;

                // Decide whether to fight or flee based on hull
                if (this.hull < this.maxHull * 0.5) { // Flee if below 50% hull
                    console.log(`Hauler ${this.shipTypeName} fleeing from attack by ${this.lastAttacker.shipTypeName || 'Player'}`);
                    this.target = this.lastAttacker;
                    this.changeState(AI_STATE.FLEEING);
                    if (uiManager) uiManager.addMessage(`${this.shipTypeName} fleeing from attack`);
                    // Apply immediate velocity boost away
                    if (this.target?.pos) { let escapeDir = p5.Vector.sub(this.pos, this.target.pos).normalize(); this.vel.add(escapeDir.mult(this.maxSpeed * 0.8)); }
                    this.attackCooldown = 15.0; // Cooldown before being provoked again
                    return; // Skip normal logic
                } else { // Retaliate if hull is okay
                    console.log(`Hauler ${this.shipTypeName} retaliating against attack from ${this.lastAttacker.shipTypeName || 'Player'}`);
                    this.target = this.lastAttacker;
                    this.changeState(AI_STATE.APPROACHING);
                    this.haulerCombatTimer = 10.0; // Timer to return to hauling
                    this.forcedCombatTimer = 5.0; // Force combat for 5 seconds
                    this.inCombat = true; // NEW FLAG: This explicitly marks the ship as in combat mode
                    //if (uiManager) uiManager.addMessage(`${this.shipTypeName} retaliating against attack`, null, true); // Only show once
                    
                    // IMPROVED FIX: Skip all normal hauler processing for this frame
                    this.updateCombatAI(system);
                    return;
                }
            }
        }

        // IMPROVED: Check explicit "in combat" flag first
        if (this.inCombat === true) {
            // Check combat timer
            if (this.haulerCombatTimer !== undefined) {
                this.haulerCombatTimer -= deltaTime / 1000;
                if (this.haulerCombatTimer <= 0) {
                    console.log(`Hauler ${this.shipTypeName} disengaging from combat.`);
                    this.haulerCombatTimer = undefined; // Clear timer
                    this.lastAttacker = null; // Forget attacker
                    this.target = null; // Clear target
                    this.inCombat = false; // Clear combat flag
                    
                    // Return to previous state or default
                    this.changeState(this.previousHaulerState || AI_STATE.PATROLLING);
                    this.patrolTargetPos = this.previousTargetPos || system?.station?.pos?.copy(); // Restore patrol target
                    
                    // Don't run combat AI this frame if disengaging
                    this.performRotationAndThrust(this.patrolTargetPos); // Move towards patrol target
                    this.updatePhysics();
                    return;
                }
            }

            // Force reinstate combat state if needed
            if (this.currentState !== AI_STATE.APPROACHING && 
                this.currentState !== AI_STATE.ATTACK_PASS &&
                this.currentState !== AI_STATE.REPOSITIONING &&
                this.currentState !== AI_STATE.FLEEING) {
                console.log(`Forcing hauler ${this.shipTypeName} back to APPROACHING state`);
                this.changeState(AI_STATE.APPROACHING);
            }

            // Check hull status - flee if heavily damaged during combat
            if (this.hull < this.maxHull * 0.4 && this.currentState !== AI_STATE.FLEEING) {
                console.log(`Damaged hauler ${this.shipTypeName} attempting to escape!`);
                this.target = this.lastAttacker || this.target; // Ensure we flee from *something*
                this.changeState(AI_STATE.FLEEING);
                if (this.target?.pos) { let escapeDir = p5.Vector.sub(this.pos, this.target.pos).normalize(); this.vel.add(escapeDir.mult(this.maxSpeed * 0.8)); }
            }


            this.updateCombatAI(system);
            this.updatePhysics();
            return; // Skip normal hauler logic
        }

        // Check the combat state flags as well (backup check)
        if (this.currentState === AI_STATE.FLEEING ||
            this.currentState === AI_STATE.APPROACHING ||
            this.currentState === AI_STATE.ATTACK_PASS ||
            this.currentState === AI_STATE.REPOSITIONING)
        {
            // Set the inCombat flag if needed
            this.inCombat = true;
            

            this.updateCombatAI(system);
            this.updatePhysics();
            return; // Skip normal hauler logic
        }

        // Reset combat flag if not in combat state
        this.inCombat = false;

        // --- Normal Hauler Logic (Patrolling, Near Station, Leaving) ---
        let desiredMovementTargetPos = null;
        let shouldMove = true; // Flag to control movement at the end

        switch (this.currentState) {
            case AI_STATE.PATROLLING:
                this.target = null; // Ensure target is null when patrolling
                let isTargetingStation = false; // Flag to know if the station is the intended target

                if (!this.patrolTargetPos) {
                    // Default to station if available, otherwise prepare to leave
                    if (system?.station?.pos) {
                        this.patrolTargetPos = system.station.pos.copy();
                        isTargetingStation = true; // Mark that we are initially targeting the station
                    } else {
                        // No station, immediately try to leave
                        this.changeState(AI_STATE.LEAVING_SYSTEM);
                        shouldMove = false; // Don't move this frame, let LEAVING_SYSTEM entry handle it
                        break; // Exit switch
                    }
                } else {
                    // If patrolTargetPos already exists, check if it's the station
                    if (system?.station?.pos && this.patrolTargetPos.dist(system.station.pos) < 1) {
                         isTargetingStation = true;
                    }
                }

                desiredMovementTargetPos = this.patrolTargetPos;

                // Check distance to current patrol target using p5.dist() directly
                // FIX: Use p5.dist() instead of this.distanceTo()
                let dS = dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y);

                if (dS < this.stationProximityThreshold) {
                    // If we are close AND our intended target was the station, transition
                    if (isTargetingStation) {
                         console.log(`Hauler ${this.shipTypeName} arriving near station (Dist: ${dS.toFixed(1)}).`);
                         this.changeState(AI_STATE.NEAR_STATION);
                         shouldMove = false; // Stop moving this frame, let NEAR_STATION handle braking/waiting
                    } else {
                         // Reached a non-station patrol point.
                         // For now, just treat it like arriving at the station for simplicity.
                         // Could add logic here later to pick a new patrol point or head towards station.
                         console.log(`Hauler ${this.shipTypeName} arriving near patrol point (Dist: ${dS.toFixed(1)}). Treating as station arrival.`);
                         this.changeState(AI_STATE.NEAR_STATION);
                         shouldMove = false;
                    }
                }
                break;

            case AI_STATE.NEAR_STATION:
                this.target = null; // Ensure target is null when near station
                this.vel.mult(0.8); // Apply braking continuously while near station
                shouldMove = false; // Don't actively thrust, just brake and wait

                if (this.nearStationTimer === undefined || this.nearStationTimer === null) {
                    this.nearStationTimer = this.stationPauseDuration; // Init timer if needed
                    console.log(`Hauler ${this.shipTypeName} starting pause near station for ${this.nearStationTimer.toFixed(1)}s`);
                }

                this.nearStationTimer -= deltaTime / 1000;

                if (this.nearStationTimer <= 0) {
                    console.log(`Hauler ${this.shipTypeName} finished pause, preparing to leave.`);
                    this.changeState(AI_STATE.LEAVING_SYSTEM);
                    // Movement target will be set by onStateEntry(LEAVING_SYSTEM) next frame
                }
                break;

            case AI_STATE.LEAVING_SYSTEM:
                this.target = null; // Ensure target is null when leaving
                desiredMovementTargetPos = this.patrolTargetPos;
                if (!desiredMovementTargetPos) {
                     console.warn(`Hauler ${this.shipTypeName} in LEAVING_SYSTEM state has no patrolTargetPos! Attempting recovery.`);
                     this.setLeavingSystemTarget(system);
                     desiredMovementTargetPos = this.patrolTargetPos;
                     if (!desiredMovementTargetPos) {
                         shouldMove = false;
                         break;
                     }
                }

                // --- DETAILED DEBUG LOGGING ---
              //  console.log(`--- Hauler Leaving Check: ${this.shipTypeName} ---`);
              //  console.log(`   Current Pos: (${this.pos.x.toFixed(1)}, ${this.pos.y.toFixed(1)})`);
              //  console.log(`   Target Pos (Jump Zone/Edge): (${desiredMovementTargetPos.x.toFixed(1)}, ${desiredMovementTargetPos.y.toFixed(1)})`);

                // Calculate distance to target (Jump Zone/Edge)
                let dE = dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y);
              //  console.log(`   Distance to Target (dE): ${dE.toFixed(1)}`);


                // ---  Exit Condition ---
                // Exit if:
                // 1. Arrived at the jump zone target (dE < 150)
                if (dE < 150) {
                    this.inCombat = false; // Add this line
                    this.haulerCombatTimer = undefined; // Add this line
                    this.destroyed = true;
                    // This log confirms the condition was met
                    console.log(`${this.role} ${this.shipTypeName} left the system.`);
                    shouldMove = false;
                }
                break; // End LEAVING_SYSTEM case

            default:
                this.target = null;
                console.log(`Hauler ${this.shipTypeName} in unexpected state ${this.currentState}. Resetting.`);
                if(system?.station?.pos) {
                    this.patrolTargetPos = system.station.pos.copy();
                    this.changeState(AI_STATE.PATROLLING);
                } else {
                    this.changeState(AI_STATE.LEAVING_SYSTEM);
                }
                shouldMove = false;
                break;
        }

        if (shouldMove) {
            this.performRotationAndThrust(desiredMovementTargetPos);
        }
        this.updatePhysics();
    }

    /** Transport AI Logic - Moves between two endpoints. */
    updateTransportAI(system) {
        if (!system) return;

        // Check for attackers FIRST
        if (this.lastAttacker && this.isTargetValid(this.lastAttacker) &&
            this.currentState !== AI_STATE.FLEEING &&
            (!this.attackCooldown || this.attackCooldown <= 0)) {

            const attackerDistance = this.distanceTo(this.lastAttacker);
            if (attackerDistance < this.detectionRange * 1.5) {
                // Store current state before fleeing
                this.previousTransportState = this.currentState;
                this.previousRoutePoints = this.routePoints ? [...this.routePoints] : null;
                this.previousRouteIndex = this.currentRouteIndex;

                //console.log(`Transport ${this.shipTypeName} fleeing from attack by ${this.lastAttacker.shipTypeName || 'Player'}`);
                this.target = this.lastAttacker; // Set attacker as target to flee from
                this.changeState(AI_STATE.FLEEING);
                if (uiManager) uiManager.addMessage(`${this.shipTypeName} fleeing from attack`);
                if (this.target?.pos) { let escapeDir = p5.Vector.sub(this.pos, this.target.pos).normalize(); this.vel.add(escapeDir.mult(this.maxSpeed * 0.9)); }
                this.attackCooldown = 15.0;
                // Fleeing logic is handled below or in next frame's state check
            }
        }

        // Handle Fleeing state
        if (this.currentState === AI_STATE.FLEEING) {
            // Delegate to the new state helper (which does movement + exit)
            this.updateCombatAI(system);
            this.updatePhysics();
            return;
       }

        // --- Normal Transport Logic ---
        this.target = null; // Ensure target is null during normal transport

        // Define routePoints if not yet set:
        // ... (existing route point setup logic) ...
        if (!this.routePoints) {
            // ... (code to set this.routePoints, this.currentRouteIndex, this.waitTimer) ...
             let pts = [];
             // ... (logic to find two points, e.g., planets or station) ...
             // Example:
             if (system.planets && system.planets.length > 1) {
                 pts.push(system.planets[0].pos.copy()); // Assuming planet 0 exists
                 pts.push(system.planets[1].pos.copy()); // Assuming planet 1 exists
             } else if (system.station) {
                 pts.push(system.station.pos.copy());
                 pts.push(p5.Vector.add(system.station.pos, createVector(random(-500, 500), random(-500, 500)))); // Point near station
             } else { // Fallback
                 pts.push(createVector(0,0)); pts.push(createVector(500,0));
             }
             this.routePoints = pts;
             this.currentRouteIndex = 1; // Start moving towards the second point
             this.waitTimer = 0;
             console.log(`Transporter ${this.shipTypeName} route set.`);
        }


        let destination = this.routePoints[this.currentRouteIndex];

        // ... (existing movement logic towards destination) ...
        this.tempVector.set(destination.x - this.pos.x, destination.y - this.pos.y);
        let distance = this.tempVector.mag();
        // ... (rest of movement, arrival check, wait timer, destination switching) ...

        // Arrival behavior:
        const arrivalThreshold = 30; // Increased threshold slightly
        const slowSpeedThreshold = 0.2;
        if (distance > arrivalThreshold) {
            // Move towards destination
            if (this.waitTimer !== 0) { this.waitTimer = 0; } // Reset timer if moving
            this.performRotationAndThrust(destination); // Use helper
        } else {
            // Arrival detected: apply braking.
            this.vel.mult(0.8);
            // If close enough AND moving very slowly, start/continue wait timer.
            if (this.vel.mag() < slowSpeedThreshold) {
                if (this.waitTimer === 0) {
                    this.waitTimer = random(1500, 4000); // Wait 1.5-4s
                    console.log(`Transporter ${this.shipTypeName} arrived. Waiting.`);
                } else {
                    this.waitTimer -= deltaTime;
                    if (this.waitTimer <= 0) {
                        // Switch destination.
                        this.currentRouteIndex = (this.currentRouteIndex + 1) % this.routePoints.length;
                        console.log(`Transporter ${this.shipTypeName} switching destination.`);
                        this.waitTimer = 0;
                        this.vel.set(0, 0); // Reset velocity
                    }
                }
            }
        }

        // Apply physics
        this.updatePhysics(); // Use centralized physics update
    }

    /** Handles cargo collection AI */
    updateCargoCollectionAI(system) {
        // If our target cargo disappeared or was collected, find a new one
        if (!this.cargoTarget || this.cargoTarget.collected) {
            this.cargoTarget = this.detectCargo(system);

            // If no cargo found, return to normal behavior
            if (!this.cargoTarget) {
                if (this.role === AI_ROLE.TRANSPORT) {
                    this.changeState(this.previousState || AI_STATE.TRANSPORTING);
                } else {
                    // Return pirates/others to IDLE or previous combat state if applicable
                    this.changeState(this.previousState || AI_STATE.IDLE);
                }
                return false; // No cargo to collect, resume normal behavior
            }
        }

        // Calculate distance and radii FIRST
        const distanceToCargo = dist(this.pos.x, this.pos.y, this.cargoTarget.pos.x, this.cargoTarget.pos.y);
        const collectionRadius = this.size / 2 + this.cargoTarget.size * 2; // Radius for successful pickup
        const brakingDistance = collectionRadius * 2.5; // Start braking when within 2.5x collection radius

        // --- Movement Logic ---
        // (Keep the existing role-specific movement logic here - performRotationAndThrust or Transport-specific movement)
        // Example placeholder for movement logic:
        const desiredMovementTargetPos = this.cargoTarget.pos;
        this.performRotationAndThrust(desiredMovementTargetPos); // Or the transport-specific movement
        // --- End Movement Logic ---


        // --- Apply Braking when close to cargo ---
        if (distanceToCargo < brakingDistance) {
            // Map distance to brake factor: stronger braking closer to target
            // Starts braking gently (~0.95) at brakingDistance, increases to strong braking (~0.75) near collectionRadius
            const brakeFactor = map(distanceToCargo, collectionRadius * 0.8, brakingDistance, 0.75, 0.95);
            this.vel.mult(constrain(brakeFactor, 0.75, 0.95)); // Apply constrained brake factor
            // Optional: Log braking
            // if (frameCount % 10 === 0) {
            //     console.log(`${this.shipTypeName} braking near cargo. Dist: ${distanceToCargo.toFixed(1)}, BrakeFactor: ${brakeFactor.toFixed(2)}`);
            // }
        }
        // --- End Braking ---


        // --- Check if we've reached the cargo for collection ---
        if (distanceToCargo < collectionRadius) {
            // Collection logic
            this.cargoTarget.collected = true; // Mark world cargo as collected

            // Remove from system array (important!)
            const cargoIndex = system.cargo.indexOf(this.cargoTarget);
            if (cargoIndex !== -1) {
                system.cargo.splice(cargoIndex, 1);
            } else {
                 console.warn(`${this.shipTypeName} collected cargo, but it wasn't found in system array?`);
            }

            console.log(`${this.shipTypeName} collected cargo ${this.cargoTarget.type}`);
            this.cargoTarget = null; // Clear local target reference
            // Set cooldown before looking for more cargo
            this.cargoCollectionCooldown = this.role === AI_ROLE.TRANSPORT ? 0.5 : 1.0;

            // Apply full stop after collection to prevent overshoot
            this.vel.mult(0.1);

            // Return false to indicate collection state is finished for this frame
            return false;
        }

        // If we haven't collected yet, return true to stay in this state
        return true;
    }


    // -----------------------
    // --- Movement & Physics ---
    // -----------------------
    
    /** Predicts player's future position. */
    predictTargetPosition() {
        if (!this.target?.pos || !this.target?.vel) return this.target?.pos || null;
        
        // Reuse the temp vector instead of creating new ones
        this.tempVector.set(this.target.vel.x, this.target.vel.y);
        let pf = this.predictionTime * (deltaTime ? (60 / (1000/deltaTime)) : 60);
        this.tempVector.mult(pf);
        this.tempVector.add(this.target.pos);
        return this.tempVector;
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
        return target && target.pos && 
               ((target.hull !== undefined && target.hull > 0) || target.hull === undefined) && 
               (target.destroyed === undefined || !target.destroyed);
    }

    /** 
     * Rotates towards target angle (radians). Returns remaining difference (radians).
     * @param {number} targetAngleRadians - The target angle to rotate towards
     * @return {number} The remaining angle difference
     */
    rotateTowards(targetAngleRadians) {
        if (isNaN(targetAngleRadians)) return 0;
        
        let diff = this.getAngleDifference(targetAngleRadians);
        
        const rotationThreshold = 0.02;
        if (abs(diff) > rotationThreshold) {
            // Use Math.sign for browser compatibility 
            const rotationAmount = Math.sign(diff) * 
                Math.min(Math.abs(diff), this.rotationSpeed * (deltaTime / 16.67));
            this.angle += rotationAmount;
        }
        return diff;
    }

    /** 
     * Applies forward thrust in current facing direction
     * @param {number} [multiplier=1.0] -
     * Optional thrust multiplier
     * @param {boolean} [createParticles=true] - Whether to create visual thrust particles
     */
    thrustForward(multiplier = 1.0, createParticles = true) {
        // Apply thrust in the direction we're facing
        const thrustVector = p5.Vector.fromAngle(this.angle);
        thrustVector.mult(this.thrustForce * multiplier);
        this.vel.add(thrustVector);
        
        this.isThrusting = true;
        
        // Create visual thrust particles (using the pool via thrustManager)
        if (createParticles && this.thrustManager) {
            this.thrustManager.createThrust(this.pos, this.angle, this.size);
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
            console.log(`Hauler ${this.shipTypeName} targeting Jump Zone at ${this.patrolTargetPos.x.toFixed(0)}, ${this.patrolTargetPos.y.toFixed(0)}`);
        } else {
            // --- Fallback: Target random point at edge ---
            console.warn(`Hauler ${this.shipTypeName}: Jump Zone not found in system ${system?.name}. Using fallback edge target.`);
            let angle = random(TWO_PI);
            // Use a large distance, slightly beyond despawn radius
            let dist = (system?.despawnRadius ?? 3000) * 1.5;
            this.patrolTargetPos = createVector(cos(angle) * dist, sin(angle) * dist);
        }

        // Ensure state is set correctly (might be redundant if called from changeState)
        if (this.currentState !== AI_STATE.LEAVING_SYSTEM) {
            this.changeState(AI_STATE.LEAVING_SYSTEM);
        }
        this.hasPausedNearStation = false; // Reset pause flag
    }


    /**
     * Applies energy tangle effect to impair movement
     * @param {number} duration - How long drag lasts in seconds
     * @param {number} multiplier - How much drag is increased
     */
    applyDragEffect(duration = 5.0, multiplier = 10.0) {
        // Use higher value if already affected
        this.dragMultiplier = Math.max(this.dragMultiplier || 1.0, multiplier);
        
        // ENHANCED: Extend duration for consecutive hits
        this.dragEffectTimer = Math.max(this.dragEffectTimer || 0, duration) + 
                            (this.dragEffectTimer > 0 ? duration * 0.5 : 0);
        
        // Visual effect timestamp
        this.tangleEffectTime = millis();
    }

    /** 
     * Helper: Rotates towards target, applies thrust if aligned. Returns angle difference.
     * @param {p5.Vector} desiredMovementTargetPos - Position to move towards
     * @return {number} The angle difference in radians
     */
    performRotationAndThrust(desiredMovementTargetPos) {
        let angleDifference = PI; // Default to max difference
        
        if (desiredMovementTargetPos?.x !== undefined && desiredMovementTargetPos?.y !== undefined) {
            let desiredDir = p5.Vector.sub(desiredMovementTargetPos, this.pos);
            if (desiredDir.magSq() > 0.001) { // Avoid normalizing a zero vector
                let desiredAngle = desiredDir.heading(); // Radians
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
                        let vecToActualTarget = p5.Vector.sub(this.target.pos, this.pos);
                        let angleToActualTargetCurrent = vecToActualTarget.heading();
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
            } else if (this.currentState === AI_STATE.SNIPING) { // <<<--- THIS IS THE NEWLY INTEGRATED BLOCK
                // For sniping, alignment for thrust can be more lenient for minor adjustments
                const isAlignedForSnipeThrust = abs(angleDifference) < this.angleTolerance * 1.5; 
                
                // Check if desiredMovementTargetPos is different from current position, indicating a need to adjust
                if (desiredMovementTargetPos && this.pos.dist(desiredMovementTargetPos) > this.size * 0.05) {// Small threshold to allow minor drift
                    if (isAlignedForSnipeThrust) {
                        effectiveThrustMultiplier = SNIPING_POSITION_ADJUST_THRUST;
                        canThrust = true;
                    } else {
                        canThrust = false; // Don't thrust if not aligned for adjustment
                    }
                } else { 
                    // If desiredMovementTargetPos is current position, or very close, try to stay still by braking
                    this.vel.mult(SNIPING_BRAKE_FACTOR); 
                    canThrust = false; // No active thrust, just braking
                }
            } else { // For other active states like REPOSITIONING, PATROLLING, TRANSPORTING, COLLECTING_CARGO
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
     * Updates the physics (drag, velocity, position) for the ship
     * Centralizes all physics calculations in one place
     */
updatePhysics() {
    // Skip if destroyed
    if (this.destroyed) return;
    
    // --- TANGLE WEAPON EFFECT ---
    if (this.dragMultiplier > 1.0 && this.dragEffectTimer > 0) {
        // First apply normal drag (always safe)
        this.vel.mult(this.drag);
        
        // Then apply the tangle effect with safety bounds
        const safeDragMultiplier = Math.max(this.dragMultiplier, 0.001); // Prevent division by zero
        const tangledSpeedFactor = Math.min(1 / safeDragMultiplier, 1.0); // Can't increase speed
        
        // Apply tangle effect if values are valid
        if (isFinite(tangledSpeedFactor) && tangledSpeedFactor > 0) {
            this.vel.mult(tangledSpeedFactor);
            
            // Add slight directional randomness to simulate being caught in energy net
            if (frameCount % 5 === 0) {
                this.vel.rotate(random(-0.1, 0.1));
            }
        }
        
        // Update drag timer
        this.dragEffectTimer -= deltaTime / 1000;
        if (this.dragEffectTimer <= 0) {
            this.dragMultiplier = 1.0;
            this.dragEffectTimer = 0;
        }
    } 
    // --- STATION PROXIMITY EFFECT ---
    else if (this.currentState === AI_STATE.NEAR_STATION) {
        // Station braking - stronger effect than normal drag
        this.vel.mult(this.drag * 0.8);
    } 
    // --- DEFAULT DRAG ---
    else {
        // Normal drag
        this.vel.mult(this.drag);
    }
    
    // Ensure we don't exceed max speed
    this.vel.limit(this.maxSpeed);
    
    // Update position only if velocity is valid
    if (!isNaN(this.vel.x) && !isNaN(this.vel.y)) {
        this.pos.add(this.vel);
    } else {
        console.warn(`Invalid velocity detected for ${this.shipTypeName}, resetting`);
        this.vel.set(0, 0);
    }
    
    // Update thrust particles
    if (this.thrustManager) {
        this.thrustManager.update();
    }

    this.isThrusting = false;
}

    // ---------------------------
    // --- Combat & Weapons ---
    // ---------------------------
    
    /**
     * Check if weapon cooldown is complete and ready to fire
     * @return {boolean} Whether weapon is ready to fire
     */
    isWeaponReady() {
        return this.fireCooldown <= 0;
    }

    /**
     * Check if we can fire at target based on angle difference
     * @param {number} targetAngle - Angle to target in radians
     * @return {boolean} Whether firing angle is acceptable
     */
    canFireAtTarget(targetAngle) {
        const isTurretWeapon = this.currentWeapon && this.currentWeapon.type === 'turret';
        const angleDiff = this.getAngleDifference(targetAngle);
        
        return this.currentState !== AI_STATE.IDLE && 
               (isTurretWeapon || Math.abs(angleDiff) < WIDE_ANGLE_RAD); // Use constant
    }

/** 
 * Checks conditions and calls fire() if appropriate.
 * @param {Object} system - The current star system
 * @param {boolean} targetExists - Whether we have a valid target
 * @param {number} distanceToTarget - Distance to target
 * @param {number} shootingAngle - Angle to target in radians
 */
performFiring(system, targetExists, distanceToTarget, shootingAngle) {

    if (!targetExists) return;
    
    // Only debug firing decisions against player
    const targetingPlayer = this.target instanceof Player;
    
    // Select best weapon (no debug)
    this.selectBestWeapon(distanceToTarget);
    
    // Adjust firing range based on weapon type
    let effectiveFiringRange = this.firingRange;
    if (this.currentWeapon) {
        switch (this.currentWeapon.type) {
            case 'beam': effectiveFiringRange *= 1.2; break;
            case 'missile': effectiveFiringRange *= 1.8; break;
            case 'turret': effectiveFiringRange *= 0.8; break;
        }
    }
    this.visualFiringRange = effectiveFiringRange;

    // Enhanced firing logic
    if (distanceToTarget < effectiveFiringRange && this.isWeaponReady()) {
        if (this.canFireAtTarget(shootingAngle)) {
            if (!this.currentSystem) this.currentSystem = system;
            
            // Player-specific targeting debug
            if (targetingPlayer) {
                console.log(`%c🔫 FIRING AT PLAYER: ${this.shipTypeName} firing ${this.currentWeapon?.name || 'weapon'} at player`, 
                    'color:red; font-weight:bold');
            }
            
            // Weapon-specific behavior
            if (this.currentWeapon) {
                // Standard firing for all weapon types (including missile, beam, and turret)
                this.fireWeapon(this.target);
            } else {
                // Fallback if no weapon defined
                this.fireWeapon();
            }
            
            this.fireCooldown = this.fireRate;
        } else if (targetingPlayer && this.currentState === AI_STATE.IDLE) {
            // Debug when IDLE pirates spot player
            console.log(`%c🔫 PLAYER SPOTTED: ${this.shipTypeName} spotted player in range but can't fire yet`, 'color:blue');
        }
    }
}

    /** Creates and adds a projectile aimed in the specified direction (radians). */
    fire(system, fireAngleRadians) {
        // Allow haulers to fire if they're in a defensive combat mode
        if (this.role === AI_ROLE.HAULER && 
            !(this.currentState === AI_STATE.APPROACHING || 
              this.currentState === AI_STATE.ATTACK_PASS || 
              this.currentState === AI_STATE.REPOSITIONING)) {
            return; // Only block firing when not in combat states
        }
        
        if (!system || typeof system.addProjectile !== 'function') { return; }
        if (isNaN(this.angle) || isNaN(fireAngleRadians)) { return; }
        let spawnOffset = p5.Vector.fromAngle(this.angle).mult(this.size * 0.7);
        let spawnPos = p5.Vector.add(this.pos, spawnOffset);
        let proj = new Projectile(spawnPos.x, spawnPos.y, fireAngleRadians, 'ENEMY', 5, 5);
        system.addProjectile(proj);
    }

    fireWeapon(targetToPass = null) {
        if (!this.currentWeapon || !this.currentSystem) return;

        // Barrier Activation: Check cooldown first, similar to player
        if (this.currentWeapon.type === WEAPON_TYPE.BARRIER) {
            if (this.barrierCooldown <= 0) {
                this.isBarrierActive = true;
                this.barrierDamageReduction = this.currentWeapon.damageReduction;
                this.barrierDurationTimer = this.currentWeapon.duration;
                this.barrierColor = this.currentWeapon.color || [100, 100, 255]; // Default color
                this.barrierCooldown = this.currentWeapon.fireRate; // Set cooldown for the barrier

                // Log barrier activation, similar to player's UI message
                console.log(`${this.shipTypeName} activated barrier: ${this.barrierDurationTimer}s duration, ${(this.barrierDamageReduction * 100).toFixed(0)}% DR. Cooldown: ${this.barrierCooldown}s`);
                
                // Sound effect (optional, for consistency if sounds are added later)
                // if (typeof soundManager !== 'undefined') { soundManager.playSound('shieldUp'); }

                // Immediately switch weapon for next shot
                this.cycleWeapon();
                return; // Barrier activated, no projectile fired
            } else {
                // Log barrier on cooldown
                console.log(`${this.shipTypeName} barrier on cooldown. Remaining: ${this.barrierCooldown.toFixed(1)}s`);
                return; // Barrier on cooldown
            }
        }
    
        // Default firing angle (ship's current heading)
        let fireAngle = this.angle;
    
        // Check if target is stationary or very slow-moving
        if (targetToPass && targetToPass.vel && 
            targetToPass.vel.magSq() < 0.25) { // threshold for "almost stationary"
            
            // Aim directly at the target's current position instead of predicted position
            fireAngle = atan2(
                targetToPass.pos.y - this.pos.y,
                targetToPass.pos.x - this.pos.x
            );
        }
        
        // Rest of existing code remains unchanged
        if (this.currentWeapon.type === 'missile') {
            if (!targetToPass || targetToPass.destroyed || (targetToPass.hull !== undefined && targetToPass.hull <=0)) {
                return; // Don't fire missile without a valid target
            }
        }
        
        // Check: EMP nebula check
        if (this.currentSystem?.isInEMPNebula && this.currentSystem.isInEMPNebula(this.pos)) {
            return;
        }
    
        WeaponSystem.fire(this, this.currentSystem, fireAngle, this.currentWeapon.type, targetToPass);
        this.fireCooldown = this.fireRate; // General weapon fire cooldown

        // The barrier-specific logic is now at the top of the function.
        // The old block for barrier activation after WeaponSystem.fire is removed.
    }

    /** Cycles to the next available weapon */
    cycleWeapon() {
        if (this.weapons && this.weapons.length > 1) {
            this.weaponIndex = (this.weaponIndex + 1) % this.weapons.length;
            this.currentWeapon = this.weapons[this.weaponIndex];
            this.fireRate = this.currentWeapon.fireRate;
            // Reset cooldown when switching weapons (optional)
            //this.fireCooldown = this.fireRate * 0.5; 
        }
    }

    /**
     * Check if this ship is armed with any weapons
     * @return {boolean} Whether ship has any weapons
     */
    isArmed() {
        return !!this.currentWeapon;
    }
    
    /**
     * Check if currently in a combat state
     * @return {boolean} Whether ship is in a combat-related state
     */
    isInCombatState() {
        return this.currentState === AI_STATE.APPROACHING || 
               this.currentState === AI_STATE.ATTACK_PASS || 
               this.currentState === AI_STATE.REPOSITIONING;
    }

    // -----------------
    // --- Rendering ---
    // -----------------
    
    /** Draws the enemy ship using its specific draw function and adds UI elements. */
    draw() {
        if (this.destroyed || isNaN(this.angle)) return;


        if (!this.p5FillColor || !this.p5StrokeColor) { this.initializeColors(); }
        if (!this.p5FillColor || !this.p5StrokeColor) { return; }

        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        const drawFunc = shipDef?.drawFunction;
        if (typeof drawFunc !== 'function') {
            console.error(`Enemy draw: No draw function for ${this.shipTypeName}`);
            push(); translate(this.pos.x, this.pos.y); fill(255,0,0, 150); noStroke(); ellipse(0,0,this.size,this.size); pop();
            return;
        }

       
        this.thrustManager.draw();



        // --- Start Ship Drawing Block ---
        push();
        translate(this.pos.x, this.pos.y);

        // --- Draw Info Label (BEFORE rotation) ---
        if (!this.destroyed) {
            push();
            textFont(font);
            textAlign(CENTER, BOTTOM);
            textSize(20);
            fill(255);
            noStroke();

            let stateKey = AI_STATE_NAME[this.currentState] || "UNKNOWN";
            let targetLabel = "None"; // Default

            // State-based target labeling for non-combat roles
            if (this.currentState === AI_STATE.PATROLLING || this.currentState === AI_STATE.NEAR_STATION) {
                // Check if patrol target is the station
                if (this.patrolTargetPos && this.currentSystem?.station?.pos &&
                    this.patrolTargetPos.dist(this.currentSystem.station.pos) < 50) {
                    targetLabel = "Station";
                } else {
                    targetLabel = "Patrol Point"; // Or just "Patrolling"
                }
            } else if (this.currentState === AI_STATE.LEAVING_SYSTEM) {
                 // Check if patrol target is the jump zone
                 if (this.patrolTargetPos && this.currentSystem?.jumpZoneCenter &&
                     this.patrolTargetPos.dist(this.currentSystem.jumpZoneCenter) < 50) {
                     targetLabel = "Jump Zone";
                 } else {
                     targetLabel = "System Edge"; // Fallback if jump zone unknown/not targeted
                 }
            } else if (this.currentState === AI_STATE.TRANSPORTING) {
                 // Could add logic here to identify destination type (planet/station)
                 targetLabel = "Delivery"; // Simple label for now
            }
            // --- End State-Based Labeling ---

            // --- Fallback to this.target if no state-based label was set ---
            // (Or if in a combat/other state where this.target is relevant)
            else if (this.target) { // Check if target exists
                if (this.currentState === AI_STATE.COLLECTING_CARGO && this.target instanceof Cargo) {
                    targetLabel = `Cargo (${this.target.type})`;
                } else if (this.target instanceof Player) {
                    targetLabel = "Player";
                } else if (this.target instanceof Enemy && this.target.shipTypeName) {
                    targetLabel = this.target.shipTypeName;
                } else if (this.target instanceof Cargo) {
                     targetLabel = `Cargo (${this.target.type})`;
                } else {
                    // Check for Station/Planet if targeted directly (less common now)
                    if (this.target.constructor.name === 'Station') targetLabel = "Station";
                    else if (this.target.constructor.name === 'Planet') targetLabel = this.target.name || "Planet";
                    else targetLabel = this.target.name || this.target.constructor.name || "Unknown";
                }
            } // targetLabel remains "None" if this.target is null and no state-based label applied

            // UPDATED: Add system name to label
            const system = this.getSystem();

            
            //let label = `${this.shipTypeName} (${this.role}) | ${stateKey} | Target: ${targetLabel}`;
            let label = `${shipDef?.name}  Target: ${targetLabel}`;
            text(label, 0, -this.size / 2 - 15);

            pop();
        }
        // --- End Info Label ---

        rotate(this.angle);

        fill(this.p5FillColor); stroke(this.p5StrokeColor);
        strokeWeight(1);
        let showThrust = (this.currentState !== AI_STATE.IDLE && this.currentState !== AI_STATE.NEAR_STATION);
        try { drawFunc(this.size, showThrust); } // Call specific draw function
        catch (e) { console.error(`Error executing draw function ${drawFunc.name || '?'} for ${this.shipTypeName}:`, e); ellipse(0,0,this.size, this.size); } // Fallback

        // Draw tangle effect if active
        if (this.dragMultiplier > 1.0) {
            // Simply check if we still have drag effect time remaining
            if (this.dragEffectTimer > 0) {
                // Calculate opacity - fade out during last second
                const opacity = this.dragEffectTimer < 1.0 ? 
                    map(this.dragEffectTimer, 0, 1.0, 0, 180) : 
                    180;
                
                // Draw energy tethers with proper opacity
                noFill();
                //stroke(30, 220, 120, opacity);
                stroke(200, 180);
                strokeWeight(2);
                
                for (let i = 0; i < 6; i++) {
                    let angle = frameCount * 0.03 + i * TWO_PI / 6;
                    let innerRadius = this.size * 0.6;
                    let outerRadius = this.size * (1.2 + 0.2 * sin(frameCount * 0.1 + i));
                    
                    beginShape();
                    for (let j = 0; j < 5; j++) {
                        let r = map(j % 2, 0, 1, innerRadius, outerRadius);
                        let jitterAmount = map(j, 0, 4, 0, 5);
                        let jitter = random(-jitterAmount, jitterAmount);
                        let x = cos(angle + j * 0.4) * r + jitter;
                        let y = sin(angle + j * 0.4) * r + jitter;
                        vertex(x, y);
                    }
                    endShape();
                }
            }
        }

        // --- NEW: Draw Player's Target Indicator ---
        // Check if THIS enemy instance is the player's current target.
        // Assumes 'player' is globally accessible (which it is in your sketch.js).
        if (typeof player !== 'undefined' && player.target === this) {
            push(); // Isolate transformations for this indicator

            // The canvas is already rotated to the enemy's angle.
            // Drawing here will make the indicator rotate with the enemy.
            noFill();
            stroke(0, 255, 0, 200); // Bright green, semi-transparent
            strokeWeight(2);

            // Example: A circle around the ship
            ellipse(0, 0, this.size * 1.6, this.size * 1.6); // Slightly larger than shield

            // Example: Corner brackets
            const bracketSize = this.size * 0.3;
            const offset = this.size * 0.7; // Adjust offset to position brackets correctly
            // Top-left
            line(-offset, -offset, -offset + bracketSize, -offset);
            line(-offset, -offset, -offset, -offset + bracketSize);
            // Top-right
            line(offset, -offset, offset - bracketSize, -offset);
            line(offset, -offset, offset, -offset + bracketSize);
            // Bottom-left
            line(-offset, offset, -offset + bracketSize, offset);
            line(-offset, offset, -offset, offset - bracketSize);
            // Bottom-right
            line(offset, offset, offset - bracketSize, offset);
            line(offset, offset, offset, offset - bracketSize);

            pop(); // Restore drawing state
        }
        // --- END NEW: Draw Player's Target Indicator ---

        // --- Draw Health Bar (AFTER rotation, relative to 0,0) ---
        if (!this.destroyed && this.hull < this.maxHull && this.maxHull > 0) {
            // Rotate canvas back temporarily to draw horizontal bar
            push();
            rotate(-this.angle); // Counter-rotate

            let healthPercent = this.hull / this.maxHull;
            let barW = this.size * 0.9;
            let barH = 6;
            // Position relative to the translated origin (0,0), offset below
            let barX = -barW / 2;
            let barY = this.size / 2 + 5;

            noStroke();
            fill(255, 0, 0); // Red background
            rect(barX, barY, barW, barH);
            fill(0, 255, 0); // Green health remaining
            rect(barX, barY, barW * healthPercent, barH);
            //stroke(0); strokeWeight(1); noFill(); // Black outline
            //rect(barX, barY, barW, barH);

            pop(); // Restore rotation state (ship is still rotated)
        }
        // --- End Health Bar ---

        pop(); // End Ship Drawing Block

        // --- Draw Shield Effect (Separate transformation) ---
        if (!this.destroyed && this.shield > 0 && !this.shieldsDisabled) {
            push(); // Isolate shield drawing
            translate(this.pos.x, this.pos.y); // Translate to ship center

            const shieldPercent = this.shield / this.maxShield;
            const shieldAlpha = map(shieldPercent, 0, 1, 40, 80);
            noFill(); stroke(100, 180, 255, shieldAlpha); strokeWeight(1.5);
            ellipse(0, 0, this.size * 1.3, this.size * 1.3);

            // Shield hit visual effect
            if (millis() - this.shieldHitTime < 300) {
                const hitOpacity = map(millis() - this.shieldHitTime, 0, 300, 200, 0);
                stroke(150, 220, 255, hitOpacity); strokeWeight(3);
                ellipse(0, 0, this.size * 1.4, this.size * 1.4);
            }
            pop(); // End shield drawing
        }
        // --- End Shield Effect ---

        // --- Draw Barrier Effect (Separate transformation) ---
        if (!this.destroyed && this.isBarrierActive) {
            push();
            translate(this.pos.x, this.pos.y);
            noFill();
            // Pulsating effect for the barrier (mirroring player.js)
            const barrierPulse = (sin(frameCount * 0.1) + 1) / 2; // Ranges from 0 to 1
            const barrierBaseRadius = this.size * 1.7; // Consistent base size with player
            const barrierRadius = barrierBaseRadius + barrierPulse * this.size * 0.2; // Pulsating outer radius

            // Alpha fades as duration runs out
            const barrierAlpha = map(this.barrierDurationTimer, 0, this.currentWeapon?.duration || 5, 50, 150);
            
            const activeBarrierColor = this.barrierColor || [100, 100, 255];

            strokeWeight(2 + barrierPulse * 1.5); // Thicker and pulsating stroke
            stroke(activeBarrierColor[0], activeBarrierColor[1], activeBarrierColor[2], barrierAlpha);
            ellipse(0, 0, barrierRadius * 2, barrierRadius * 2); // Diameter

            // Optional: Add a secondary, fainter pulsating ring (mirroring player.js)
            strokeWeight(1 + barrierPulse * 1);
            stroke(activeBarrierColor[0], activeBarrierColor[1], activeBarrierColor[2], barrierAlpha * 0.5);
            ellipse(0, 0, barrierRadius * 2 * 1.15, barrierRadius * 2 * 1.15); // Slightly larger diameter for second ring
            pop();
        }
        // --- End Barrier Effect ---

        // --- Draw Other Effects (Debug Line, Force Wave, Beam, Range) ---
        // These use absolute coordinates or manage their own transformations

        this._drawTargetLockOnEffect();
        // DEBUG LINE
        //if (this.target?.pos && this.role !== AI_ROLE.HAULER && (this.currentState === AI_STATE.APPROACHING || this.currentState === AI_STATE.ATTACK_PASS || this.role === AI_ROLE.ALIEN)) { 
        //     push(); let lineCol = this.p5StrokeColor; try { if (lineCol?.setAlpha) { lineCol.setAlpha(100); stroke(lineCol); } else { stroke(255, 0, 0, 100); } } catch(e) { stroke(255, 0, 0, 100); } strokeWeight(1); line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y); pop();
        //}

        // Force wave effect
        if (this.lastForceWave && millis() - this.lastForceWave.time < 300) {
            const timeSinceForce = millis() - this.lastForceWave.time;
            const alpha = map(timeSinceForce, 0, 300, 200, 0);
            push();
            translate(this.pos.x, this.pos.y); // Use absolute position
            noFill(); strokeWeight(3);
            stroke(this.lastForceWave.color[0], this.lastForceWave.color[1], this.lastForceWave.color[2], alpha);
            const radius = map(timeSinceForce, 0, 300, 10, 40);
            circle(0, 0, radius * 2);
            pop();
        }

        // Beam effect
        if (this.lastBeam && millis() - this.lastBeam.time < 150) {
            push();
            stroke(this.lastBeam.color); strokeWeight(3);
            line(this.lastBeam.start.x, this.lastBeam.start.y, this.lastBeam.end.x, this.lastBeam.end.y);
            stroke(this.lastBeam.color[0], this.lastBeam.color[1], this.lastBeam.color[2], 100); strokeWeight(6);
            line(this.lastBeam.start.x, this.lastBeam.start.y, this.lastBeam.end.x, this.lastBeam.end.y);
            pop();
        }

        // Weapon range indicator
        if (this.currentWeapon && this.target && this.isTargetValid(this.target) &&
            (this.currentState === AI_STATE.APPROACHING ||
             this.currentState === AI_STATE.ATTACK_PASS ||
             this.currentState === AI_STATE.REPOSITIONING)) {
            push();
            stroke(200, 200, 0, 100); noFill(); strokeWeight(1);
            circle(this.pos.x, this.pos.y, this.visualFiringRange * 2); // Use absolute position
            pop();
        }
        // --- End Other Effects ---

    } // End draw()



    /**
     * @private
     * Handles drawing the debug target line and playing the lock-on sound effect
     * when specific conditions are met.
     */
    _drawTargetLockOnEffect() {
        const conditionsMetForLine = this.isTargetValid(this.target) &&
                                     this.role !== AI_ROLE.HAULER &&
                                     (this.currentState === AI_STATE.APPROACHING ||
                                      this.currentState === AI_STATE.ATTACK_PASS ||
                                      this.role === AI_ROLE.ALIEN);

        if (conditionsMetForLine) {
            
        // --- Sound Logic: Play only when target is Player and sound hasn't been played for this lock ---
        if (this.target instanceof Player) { // Check if the current target is the player
            if (!this.hasPlayedLockOnSound) {
                if (typeof soundManager !== 'undefined' && soundManager.playSound) {
                    soundManager.playSound('targetlock'); // Ensure 'targetlock' (or 'targetLock') sound is loaded
                }
                this.hasPlayedLockOnSound = true; // Mark sound as played for this player lock-on period
            }
        } else {
            // If target is not the player (or no target), reset the sound flag.
            // This allows the sound to play again if the player is re-acquired.
            this.hasPlayedLockOnSound = false;
        }

            // Always draw the line if conditions are met
            let lineCol = this.p5StrokeColor;
            try {
                if (lineCol?.setAlpha) {
                    lineCol.setAlpha(100);
                    stroke(lineCol);
                } else { // Fallback if not a p5.Color or setAlpha fails
                    stroke(this.strokeColorValue[0], this.strokeColorValue[1], this.strokeColorValue[2], 100);
                }
            } catch (e) { // Further fallback
                stroke(255, 0, 0, 100);
            }
            strokeWeight(1);
            line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
        } else {
            // If conditions are NOT met, reset the sound flag so it can play next time
            this.hasPlayedLockOnSound = false;
        }
    }

    // ------------------
    // --- Cargo Handling ---
    // ------------------

    /**
     * Internal helper: Handles spawning cargo based on context (jettison or destruction).
     * Calculates parameters, creates the Cargo object, and calls system.addCargo().
     * @param {'jettison' | 'destruction'} context - The reason for spawning cargo.
     * @returns {boolean} True if cargo was spawned successfully, false otherwise.
     * @private
     */
    _spawnCargo(context) {
        // 1. Get System and check for addCargo method
        const system = this.getSystem();
        if (!system || typeof system.addCargo !== 'function') {
            console.warn(`${this.shipTypeName} can't ${context} cargo - system or system.addCargo method missing`);
            return false; // Good check
        }

        // 2. Get Ship Definition and check for cargo types
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        if (!shipDef || !shipDef.typicalCargo || shipDef.typicalCargo.length === 0) {
            return false; // Good check - no cargo defined
        }

        // 3. Initialize variables
        const cargoType = random(shipDef.typicalCargo); // Selects random type
        let quantity = 0;
        let position = createVector(this.pos.x, this.pos.y); // Starts at enemy pos
        let velocity = createVector(0, 0);
        let message = "";

        // 4. Context-Specific Calculations
        if (context === 'jettison') {
            quantity = 1; // Correct for jettison
            // Calculates offset position - seems reasonable
            const offsetAngle = random(TWO_PI);
            const offsetDist = this.size * 0.6;
            position.add(cos(offsetAngle) * offsetDist, sin(offsetAngle) * offsetDist);
            // Calculates velocity based on ship + random push - seems reasonable
            if (this.vel) {
                velocity.add(p5.Vector.mult(this.vel, 0.3));
                velocity.add(p5.Vector.random2D().mult(random(0.5, 1.5)));
            }
            message = `${this.shipTypeName} jettisoned ${quantity} unit of ${cargoType}`;

        } else if (context === 'destruction') {
            const cargoCapacity = shipDef.cargoCapacity || 0;
            if (cargoCapacity <= 0) return false; // Correct check
            quantity = Math.max(1, Math.floor(cargoCapacity / 3)); // Drops ~1/3 capacity, min 1 - reasonable
            // Calculates random offset position around destruction point - reasonable
            const offsetAngle = random(TWO_PI);
            const offsetDist = random(this.size * 0.2, this.size * 0.7);
            position.add(cos(offsetAngle) * offsetDist, sin(offsetAngle) * offsetDist);
            // Calculates random outward velocity - reasonable for explosion
            velocity = p5.Vector.random2D().mult(random(0.8, 2.0));
            message = `${this.shipTypeName} dropped ${quantity} units of ${cargoType}`;
            console.log(`${this.shipTypeName} destroyed - dropping cargo: ${quantity} x ${cargoType}`); // Good specific log

        } else {
            console.error(`_spawnCargo called with invalid context: ${context}`);
            return false; // Handles invalid context
        }

        // 5. Check Quantity
        if (quantity <= 0) return false; // Prevents spawning zero items

        // 6. Create Cargo Object
        let cargoObject = null;
        try {
            cargoObject = new Cargo(position.x, position.y, cargoType, quantity);
            cargoObject.vel = velocity;
            cargoObject.size = 8; // Standardizes size
        } catch (e) {
            console.error(`Error creating Cargo object in _spawnCargo (${context}) for ${this.shipTypeName}:`, e);
            return false; // Good error handling
        }

        // 7. Add Cargo to System using system.addCargo
        if (system.addCargo(cargoObject)) { // Correctly uses the existing method
            // Handle UI Message
            if (typeof uiManager !== 'undefined' && message) {
                uiManager.addMessage(message); // Displays appropriate message
            }
            return true; // Success
        } else {
            // system.addCargo should log its own failure, but add a warning here too
            console.warn(`_spawnCargo: system.addCargo failed for ${cargoType} x${quantity}`);
            return false; // Failure
        }
    }
    
/**
 * Gets the current star system reference
 * @return {StarSystem|null} The current system or null if not available
 */
getSystem() {
    return this.currentSystem;
}

    /**
     * Jettisons a single piece of cargo when hit (but not destroyed).
     * Calls the internal helper with 'jettison' context.
     */
    jettisonCargo() {
        this._spawnCargo('jettison');
    }

    /**
     * Drops cargo when ship is destroyed.
     * Calls the internal helper with 'destruction' context.
     */
    dropCargo() {
        this._spawnCargo('destruction');
    }

    /** 
     * Detects nearby cargo within range 
     * @param {Object} system - The current star system
     * @return {Object|null} The closest cargo or null if none found
     */
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

    // -----------------------
    // --- Utility Methods ---
    // -----------------------
    
/**
 * Applies damage to the ship and handles destruction
 * @param {number} amount - Amount of damage to apply
 * @param {Object} attacker - Entity that caused the damage
 * @return {Object} Object containing damage dealt and shield hit status
 */
takeDamage(amount, attacker = null) {
    this._handleAttackerReference(attacker, amount);

    // Skip damage processing if already destroyed or no damage
    if (this.destroyed || amount <= 0) return { damage: 0, shieldHit: false };

    const { damageDealt, shieldHit } = this._applyDamageDistribution(amount);

    // Check if destroyed after applying damage
    if (this.hull <= 0 && !this.destroyed) {
        this._processDestruction(attacker);
    } else {
        // Only check for random cargo drop if not destroyed
        this._checkRandomCargoDrop();
    }

    return { damage: damageDealt, shieldHit: shieldHit };
}

/**
 * Internal helper: Handles attacker reference and triggers targeting update.
 * @param {Object} attacker
 * @param {number} amount - Damage amount for logging purposes
 */
_handleAttackerReference(attacker, amount) {
    if (attacker) {
        // Record attacker regardless of type
        this.lastAttacker = attacker;
        this.lastAttackTime = millis();
        
        // Always update targeting for any attacker
        const system = this.getSystem();
        if (system) {
            // Special debug for player attacks if needed
            if (attacker instanceof Player) {
                //console.log(`%c🎯 PLAYER ATTACK: Force targeting update for ${this.shipTypeName}`, 'color:red');
            }
            
            // Update targeting immediately for all attackers
            const targetResult = this.updateTargeting(system);
        }
    }
}

/**
 * Internal helper: Applies damage to shields first, then hull.
 * Updates this.shield and this.hull directly.
 * @param {number} amount - The incoming damage amount.
 * @return {Object} { damageDealt, shieldHit }
 */
_applyDamageDistribution(amount) {
    let damageDealt = 0;
    let shieldHit = false;

    // Apply barrier damage reduction if active
    if (this.isBarrierActive && this.barrierDamageReduction > 0) {
        const originalAmount = amount;
        amount *= (1 - this.barrierDamageReduction);
        console.log(`${this.shipTypeName} barrier reduced damage from ${originalAmount.toFixed(1)} to ${amount.toFixed(1)}`);
    }

    // Skip shield check entirely if shields are disabled
    if (this.shield > 0 && !this.shieldsDisabled) {
        shieldHit = true;
        this.shieldHitTime = millis();
        this.lastShieldHitTime = millis();

        if (amount <= this.shield) {
            // Shield absorbs all damage
            this.shield -= amount;
            damageDealt = amount;
        } else {
            // Shield is depleted, remaining damage goes to hull
            damageDealt = this.shield; // Damage absorbed by shield
            const hullDamage = amount - this.shield;
            this.shield = 0;
            this.hull -= hullDamage;
            damageDealt += hullDamage; // Total damage dealt (shield + hull)
        }
    } else {
        // No shields, all damage to hull
        this.hull -= amount;
        damageDealt = amount;
    }
    // Ensure hull doesn't go below zero visually before destruction check
    this.hull = Math.max(0, this.hull);
    return { damageDealt, shieldHit };
}

/**
 * Internal helper: Processes the ship's destruction.
 * Sets flags, creates effects, drops cargo, handles wanted status.
 * @param {Object} attacker
 */
_processDestruction(attacker) {
    this.destroyed = true;
    this.hull = 0; // Ensure hull is exactly 0
    this.target = null; // Prevent corpse targeting

    // Add these lines to clear all combat flags
    this.inCombat = false;
    this.haulerCombatTimer = undefined;
    this.forcedCombatTimer = 0;

    const system = this.getSystem();
    if (system) {
        // Create explosion effect
        this.currentSystem.addExplosion(
            this.pos.x,
            this.pos.y,
            this.size,
            [100, 150, 255] // Blueish-white core
        );

        // Drop cargo
        this.dropCargo();

        // Handle player-related consequences (mission progress, wanted status)
        if (attacker instanceof Player && system.player === attacker) {
            this._handlePlayerKillConsequences(attacker, system);
        }
    }
}

/**
 * Internal helper: Handles mission progress and wanted status if player killed the ship.
 * @param {Player} attacker
 * @param {StarSystem} system
 */
_handlePlayerKillConsequences(attacker, system) {


    console.log(`BEFORE: Player kills = ${system.player.kills}`);
    system.player.addKill();
    console.log(`AFTER: Player kills = ${system.player.kills}, Rating: ${system.player.getEliteRating()}`);
    

    // Update mission progress
    if (attacker.activeMission) {
        if (attacker.activeMission.type === MISSION_TYPE.BOUNTY_PIRATE &&
            this.role === AI_ROLE.PIRATE) {
            attacker.activeMission.progressCount = (attacker.activeMission.progressCount || 0) + 1;
            console.log(`Updated bounty mission progress: ${attacker.activeMission.progressCount}/${attacker.activeMission.targetCount}`);
            if (attacker.activeMission.progressCount >= attacker.activeMission.targetCount) {
                console.log("Bounty mission target count met! Completing mission...");
                system.player.completeMission(); // <<< Use simpler call for auto-complete
           }
        }
    }

    // Set player wanted status if a non-pirate was destroyed
    if (this.role !== AI_ROLE.PIRATE && this.role !== AI_ROLE.ALIEN && this.role !== AI_ROLE.BOUNTY_HUNTER) {
        if (system.setPlayerWanted) {

            // If player is police, revoke status first
            if (attacker === system.player && system.player.isPolice) {
                system.player.removePoliceStatus();
            }

            const wantedLevel = (this.role === AI_ROLE.POLICE) ? 3 : 1;
            system.setPlayerWanted(true, wantedLevel);
            console.log(`Player marked as WANTED (Level ${wantedLevel}) for destroying ${this.shipTypeName}`);
            uiManager.addMessage(`WANTED: For destroying ${this.role} ship!`, '#ff0000');
        } else {
            // Fallback if setPlayerWanted doesn't exist
            attacker.isWanted = true;
            console.log(`Player marked as WANTED (fallback) for destroying ${this.shipTypeName}`);
        }
    }
}

/**
 * Internal helper: Checks and potentially jettisons cargo on non-fatal hits.
 */
_checkRandomCargoDrop() {
    // Random cargo drop chance when hit but not destroyed
    if (this.hull < this.maxHull * 0.5 && Math.random() < 0.05) {
        this.jettisonCargo();
    }
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
     * @param {Object} target - Entity to check collision with
     * @return {boolean} Whether collision occurred
     */
    checkCollision(target) { 
        if (!target?.pos || target.size === undefined) return false; 
        let dSq = sq(this.pos.x - target.pos.x) + sq(this.pos.y - target.pos.y); 
        let sumRadii = (target.size / 2) + (this.size / 2); 
        return dSq < sq(sumRadii);
    }
    

    // -----------------------
    // --- State Management ---
    // -----------------------

    /**
     * Changes the AI state with proper logging and initialization
     * @param {number} newState - The new AI state to transition to
     * @param {Object} [stateData={}] - Additional data needed for the new state
     */
    changeState(newState, stateData = {}) {
        // Prevent unarmed ships from entering combat states
        if (!this.isArmed() && 
            (newState === AI_STATE.APPROACHING || 
             newState === AI_STATE.ATTACK_PASS || 
             newState === AI_STATE.REPOSITIONING)) {
            
            console.log(`${this.role} ${this.shipTypeName} cannot enter combat state - unarmed`);
            
            // Choose appropriate non-combat state based on role
            if (this.role === AI_ROLE.HAULER || this.role === AI_ROLE.TRANSPORT) {
                // Haulers and transports flee when attacked
                newState = AI_STATE.FLEEING;
            } else {
                // Others go to their default non-combat state
                newState = this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE;
            }
        }
        
        // Don't do anything if it's the same state
        if (newState === this.currentState) return;
        
        const oldState = this.currentState;
        this.currentState = newState;
        
        // Log state changes with informative context
        //console.log(`${this.role} ${this.shipTypeName} state: ${AI_STATE_NAME[oldState]} -> ${AI_STATE_NAME[newState]}`);
        
        // Execute exit actions for the old state
        this.onStateExit(oldState, stateData);
        
        // Execute entry actions for the new state
        this.onStateEntry(newState, stateData);
    }

    /**
     * Handles actions when entering a new state
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

            case AI_STATE.SNIPING: // <<< EXISTING CASE
                this.vel.mult(0.5); // Attempt to slow down upon entering sniping mode
                this.shieldPlusHullAtStateEntry = this.shield + this.hull; // Store combined shield + hull
                console.log(`${this.shipTypeName} entering SNIPING state (Combined Health: ${this.shieldPlusHullAtStateEntry.toFixed(0)}).`);
            break;
                
            case AI_STATE.NEAR_STATION:
                // Reset timer on entry
                this.nearStationTimer = this.stationPauseDuration;
                this.vel.mult(0.1); // Apply strong initial brake
                break;
                
            case AI_STATE.LEAVING_SYSTEM:
                this.setLeavingSystemTarget(this.currentSystem);
                this.nearStationTimer = null; // Clear station timer
                break;
                
            case AI_STATE.COLLECTING_CARGO:
                // Store previous state to return to later
                if (this.currentState !== AI_STATE.COLLECTING_CARGO) {
                    this.previousState = oldState;
                }
                break;
            case AI_STATE.GUARDING:
                    if (stateData.principal && this.isTargetValid(stateData.principal)) {
                        this.principal = stateData.principal;
                        console.log(`${this.shipTypeName} entering GUARDING state, protecting ${this.principal.shipTypeName || 'entity'}`);
                    } else if (!this.principal) {
                        console.warn(`${this.shipTypeName} entering GUARDING state without a valid principal. Will likely revert.`);
                    }
                    this.target = null; // Guards focus on principal or its attacker, not general targets initially
                    this.guardReactionTime = 0; // Reset reaction time
                break;
        }
    }

    // Add this new method to calculate the attack path once
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
     * @param {number} state - The state being exited
     * @param {Object} stateData - Additional data for cleanup
     */
    onStateExit(state, stateData = {}) {
        switch(state) {
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
                break;

            case AI_STATE.FLEEING:
                this.fleeStartTime = null;
                break;

            case AI_STATE.LEAVING_SYSTEM:
                break;
            case AI_STATE.SNIPING: // <<< EXISTING CASE
                console.log(`${this.shipTypeName} exiting SNIPING state.`);
                this.shieldPlusHullAtStateEntry = null; // Clear stored combined health
                break;
        }
    }

    
}

