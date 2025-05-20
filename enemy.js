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
const JUMP_EFFECT_DURATION_MS = 1500;   // Duration of the jump visual effect in milliseconds
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
        
        // Initialize tangle effect properties
        this.dragMultiplier = 1.0;   // Default - normal drag 
        this.dragEffectTimer = 0;    // Countdown timer for tangle effect
        this.tangleEffectTime = 0;   // Visual effect timestamp

        // --- Guard-specific properties ---
        this.principal = null; // The entity this guard is protecting
        this.guardFormationOffset = createVector(-70, 0); // Desired position relative to principal (x: behind/ahead, y: left/right)
        this.guardLeashDistance = 450;    // Max distance to stray from principal when not engaging
        this.guardEngageRange = 700;      // Range to detect and engage principal's attacker
        this.guardReactionTime = 0;       // Cooldown for reacting to principal's attacker
        this.currentEngagementTarget = null; // Track who the guard is currently engaging
        this.lastEngagementTime = 0;      // When the guard started engaging the current target
        this.engagementDuration = 12000;  // Min time to stick with a target (12 seconds)
        // ---

        // --- Combat AI Flags ---
        this.combatFlagsInitialized = true; // Set flag here
        this.hasLoggedDamageActivation = false;
        this.hasLoggedPlayerTargeting = false;
        this.targetSwitchCooldown = 0;
        this.forcedCombatTimer = 0; // Initialize forced combat timer
        // --- End Combat AI Flags ---

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
    
        // Check if jump effect is active and should be completed
        if (this.jumpingEffect && this.jumpEffectStartTime) {
            const currentTime = millis();
            const elapsedTime = currentTime - this.jumpEffectStartTime;
            
            if (elapsedTime >= JUMP_EFFECT_DURATION_MS) {
                // Jump effect finished, destroy the enemy
                console.log(`${this.role} ${this.shipTypeName} jump effect complete, destroying.`);
                this.destroy();
                return;
            }
        }
    
        // Always update system reference
        this.currentSystem = system;
        
        // Use a single multiplier for time-based cooldowns (deltaTime in seconds)
        const dtSeconds = deltaTime / 1000;
        
        // Process all cooldowns in a batch with a single calculation
        this.fireCooldown -= dtSeconds;
        if (this.cargoCollectionCooldown > 0) this.cargoCollectionCooldown -= dtSeconds;
        if (this.attackCooldown > 0) this.attackCooldown -= dtSeconds;
        
        // Optimize shield regeneration with cached values and faster checks
        if (this.shield < this.maxShield && !this.destroyed) {
            const currentTime = millis();
            if (currentTime - this.lastShieldHitTime > this.shieldRechargeDelay) {
                // Cache the time scale computation
                const timeScaleFactor = this._getTimeScale() * 0.016;
                const rechargeAmount = this.shieldRechargeRate * SHIELD_RECHARGE_RATE_MULTIPLIER * timeScaleFactor;
                
                this.shield = Math.min(this.maxShield, this.shield + rechargeAmount);
            }
        }
        
        // Update tangle effect timer
        if (this.dragEffectTimer > 0) {
            this.dragEffectTimer -= dtSeconds;
            if (this.dragEffectTimer <= 0) {
                this.dragMultiplier = 1.0;
                this.dragEffectTimer = 0;
            }
        }
        
        // Optimize cargo detection logic - only run every 5 frames
        if (frameCount % 5 === 0) {
            // For pirates and transporters - only check for cargo when needed
            if ((this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.TRANSPORT) && 
                this.currentState !== AI_STATE.COLLECTING_CARGO && 
                this.cargoCollectionCooldown <= 0) {
                
                const cargoTarget = this.detectCargo(system);
                if (cargoTarget) {
                    if (this.role === AI_ROLE.TRANSPORT) {
                        this.previousState = this.currentState;  // Remember state for transports
                    }
                    this.cargoTarget = cargoTarget;
                    this.changeState(AI_STATE.COLLECTING_CARGO);
                }
            }
        }

        // Role-specific AI behavior updates - optimize with lookup table instead of if/else chain
        try {
            // Use role as key for direct lookup
            switch (this.role) {
                case AI_ROLE.TRANSPORT:
                    if (this.currentState === AI_STATE.COLLECTING_CARGO) {
                        if (!this.updateCargoCollectionAI(system)) {
                            this.changeState(this.previousState || AI_STATE.TRANSPORTING);
                        }
                        this.updatePhysics();
                    } else {
                        this.updateTransportAI(system);
                    }
                    break;
                    
                case AI_ROLE.GUARD:
                    if (this.currentState === AI_STATE.LEAVING_SYSTEM) {
                        this.updateHaulerAI(system);
                        this.updatePhysics();
                    } else if (this.currentState === AI_STATE.GUARDING) {
                        this._updateState_GUARDING();
                        this.updatePhysics();
                    } else {
                        this.updateCombatAI(system);
                        this.updatePhysics();
                    }
                    break;
                    
                case AI_ROLE.PIRATE:
                    if (this.currentState === AI_STATE.COLLECTING_CARGO) {
                        if (!this.updateCargoCollectionAI(system)) {
                            this.updateCombatAI(system);
                        }
                    } else {
                        this.updateCombatAI(system);
                    }
                    this.updatePhysics();
                    break;
                    
                case AI_ROLE.POLICE:
                    this.updatePoliceAI(system);
                    this.updatePhysics();
                    break;
                    
                case AI_ROLE.HAULER:
                    this.updateHaulerAI(system);
                    this.updatePhysics();
                    break;
                    
                case AI_ROLE.ALIEN:
                case AI_ROLE.BOUNTY_HUNTER:
                    // Both use the same combat AI
                    this.updateCombatAI(system);
                    this.updatePhysics();
                    break;
                    
                default:
                    // Minimal default behavior
                    this.vel.x *= (this.drag * 0.95);
                    this.vel.y *= (this.drag * 0.95);
                    this.updatePhysics();
                    break;
            }
        } catch (e) {
            console.error(`Error in ${this.role} ${this.shipTypeName} update:`, e);
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
     * Calculate optimal weapon for current combat situation with optimized scoring
     * @param {number} distanceToTarget - Distance to current target
     * @param {Object} target - The current target
     * @return {Object} The selected weapon definition
     */
    selectOptimalWeapon(distanceToTarget, target) {
        // Fast path for common case
        if (!this.weapons || this.weapons.length <= 1) return this.currentWeapon;
        
        // Cache range calculations once
        const visualFiringRange = this.visualFiringRange;
        const mediumRangeThreshold = visualFiringRange * MEDIUM_RANGE_MULT;
        const closeRangeThreshold = visualFiringRange * CLOSE_RANGE_MULT;
        const veryCloseRangeThreshold = visualFiringRange * 0.2;
        
        // Fast range classification using single checks
        let rangeType;
        if (distanceToTarget <= veryCloseRangeThreshold) {
            rangeType = 0; // Very close
        } else if (distanceToTarget <= closeRangeThreshold) {
            rangeType = 1; // Short range
        } else if (distanceToTarget <= mediumRangeThreshold) {
            rangeType = 2; // Medium range
        } else {
            rangeType = 3; // Long range
        }
        
        // Cache target properties once to avoid repeated property access
        const targetAlreadyEntangled = target?.dragMultiplier > 1.0 && target?.dragEffectTimer > 0;
        const targetMaxSpeed = target?.maxSpeed || 0;
        const targetSize = target?.size || 0;
        const targetIsFast = targetMaxSpeed > 5;
        const targetIsVerySlow = targetMaxSpeed < 5;
        const targetIsLarge = targetSize > 50;
        
        // Lookup tables for optimal performance
        // Organized as [veryClose, shortRange, mediumRange, longRange]
        const weaponRangeScores = {
            'beam': [1, 1, 2, 3],
            'spread': [3, 3, 1, 0],
            'straight': [1, 0, 2, 1],
            'missile': [0, 1, 3, 3],
            'turret': [2, 2, 2, 2],
            'force': [5, 2, 0, 0],
            'tangle': targetAlreadyEntangled ? [-10, -10, -10, -10] : [3, 2, 1, 0]
        };
        
        // Weapon match bonuses for target types to avoid nested ifs
        const targetTypeScores = {
            // Faster target - spread weapons bonus
            'spread_fast': targetIsFast ? 3 : 0,
            // Slow target - missile bonus
            'missile_slow': targetIsVerySlow ? 2 : 0,
            // Very fast target - additional tangle weapon bonus
            'tangle_veryFast': targetMaxSpeed > 6.5 ? 2 : 0
        };
        
        let bestScore = -1;
        let bestWeapon = this.currentWeapon;
        
        // Use traditional loop for better performance
        const weaponCount = this.weapons.length;
        for (let i = 0; i < weaponCount; i++) {
            const weapon = this.weapons[i];
            let score = 0;
            
            // Fast base type determination
            let baseType = '';
            const weaponType = weapon.type;
            
            // Use early-return string operations for efficient type detection
            // Order these by frequency of occurrence for optimization
            if (weaponType === 'missile') baseType = 'missile';
            else if (weaponType === 'turret') baseType = 'turret';
            else if (weaponType.startsWith('spread')) baseType = 'spread';
            else if (weaponType.startsWith('straight')) baseType = 'straight';
            else if (weaponType.includes('beam')) baseType = 'beam';
            else if (weaponType.includes('force')) baseType = 'force';
            else if (weaponType.includes('tangle')) baseType = 'tangle';
            
            // Score by range using direct lookup - one access instead of multiple conditions
            if (baseType in weaponRangeScores) {
                score += weaponRangeScores[baseType][rangeType];
            }
            
            // Add target-specific bonuses using lookup tables
            if (target) {
                // Add spread weapon bonus against fast targets
                if (baseType === 'spread') {
                    score += targetTypeScores.spread_fast;
                }
                
                // Add missile bonus against slow targets
                if (baseType === 'missile') {
                    score += targetTypeScores.missile_slow;
                }
                
                // Add extra tangle bonus for very fast targets
                if (baseType === 'tangle' && !targetAlreadyEntangled) {
                    score += targetTypeScores.tangle_veryFast;
                }
                
                // Add damage bonus against large targets - use direct property access
                if (targetIsLarge && (weapon.damage || 0) > 10) {
                    score += 2;
                }
            }
            
            // Update best weapon using direct comparison
            if (score > bestScore) {
                bestScore = score;
                bestWeapon = weapon;
            }
        }
        
        // Only change weapons if significant improvement
        if (bestWeapon !== this.currentWeapon && bestScore > 0) {
            return bestWeapon;
        }
        
        return this.currentWeapon;
    }

    /**
     * Select the appropriate weapon and set it as current
     * @param {number} distanceToTarget - Distance to current target
     */
    selectBestWeapon(distanceToTarget) {
        // Fast path for common case - only one weapon
        if (!this.weapons || this.weapons.length <= 1) return;
        
        // Don't switch weapons too frequently - add rate limiting
        const currentTime = millis();
        if (this._lastWeaponCheckTime && currentTime - this._lastWeaponCheckTime < 500) {
            // Only check weapon every 500ms to reduce processing
            return;
        }
        this._lastWeaponCheckTime = currentTime;
        
        // Use optimal weapon selection algorithm
        const optimalWeapon = this.selectOptimalWeapon(distanceToTarget, this.target);
        
        // Skip further processing if already using optimal weapon
        if (optimalWeapon === this.currentWeapon) return;
        
        // Find the index directly instead of using indexOf
        let newIndex = -1;
        const len = this.weapons.length;
        for (let i = 0; i < len; i++) {
            if (this.weapons[i] === optimalWeapon) {
                newIndex = i;
                break;
            }
        }
        
        if (newIndex !== -1) {
            this.weaponIndex = newIndex;
            this.currentWeapon = this.weapons[this.weaponIndex];
            this.fireRate = this.currentWeapon.fireRate;
            
            // Reset cooldown when switching weapons (half normal delay)
            this.fireCooldown = this.fireRate * 0.5;
            
            // Rate-limit debug logging
            if (this.lastWeaponSwitch === undefined || 
                currentTime - this.lastWeaponSwitch > 2000) {
                // Only log weapon changes every 2 seconds to reduce console spam
                console.log(`${this.shipTypeName} switching to ${this.currentWeapon.name} at range ${Math.round(distanceToTarget)}`);
                this.lastWeaponSwitch = currentTime;
            }
        }
    }

    /**
     * Calculate the movement target position based on current state and target
     * @param {number} distanceToTarget - Current distance to target
     * @return {p5.Vector|null} Position vector to move toward
     */
    getMovementTargetForState(distanceToTarget) {
        // Cache target validity check to avoid multiple calls
        const targetValid = this.isTargetValid(this.target);
        
        // Initialize the movement target vector that will be returned
        let desiredMovementTargetPos = null;
        
        switch (this.currentState) {
            case AI_STATE.APPROACHING:
                if (targetValid) {
                    return this.predictTargetPosition();
                }
                break;
                
            case AI_STATE.ATTACK_PASS:
                if (this.attackPassTargetPos && targetValid) {
                    // Use the pre-calculated target position
                    return this.attackPassTargetPos;
                } else if (targetValid) {
                    // Fallback if somehow we don't have a pre-calculated target
                    this.attackPassTargetPos = this.calculateAttackPassTarget();
                    return this.attackPassTargetPos;
                } else {
                    // If target becomes invalid during attack pass, aim at current position
                    return this.pos.copy();
                }
                break;
                
            case AI_STATE.REPOSITIONING:
                desiredMovementTargetPos = this.repositionTarget;
                break;
                
            case AI_STATE.PATROLLING:
                desiredMovementTargetPos = this.patrolTargetPos;
                break;
                        
            case AI_STATE.SNIPING:
                if (this.isTargetValid(this.target)) {
                    const distanceToTarget = this.pos.dist(this.target.pos); // ADD THIS LINE
                    // Cache calculations for reuse
                    const idealSnipeRange = this.visualFiringRange * SNIPING_IDEAL_RANGE_FACTOR;
                    const rangeTolerance = idealSnipeRange * SNIPING_STANDOFF_TOLERANCE_FACTOR;

                    if (distanceToTarget > idealSnipeRange + rangeTolerance) {
                        // Too far, move slightly closer to target
                        // Reuse this.tempVector instead of creating new vectors
                        this.tempVector.set(this.target.pos.x - this.pos.x, this.target.pos.y - this.pos.y);
                        this.tempVector.setMag(distanceToTarget - idealSnipeRange);
                        return createVector(this.pos.x + this.tempVector.x, this.pos.y + this.tempVector.y);
                    } else if (distanceToTarget < idealSnipeRange - rangeTolerance) {
                        // Too close, move slightly away from target
                        this.tempVector.set(this.pos.x - this.target.pos.x, this.pos.y - this.target.pos.y);
                        this.tempVector.setMag(idealSnipeRange - distanceToTarget);
                        return createVector(this.pos.x + this.tempVector.x, this.pos.y + this.tempVector.y);
                    } else {
                        // Within tolerance, try to stay put BUT ALWAYS FACE THE TARGET
                        // Return the target's position for rotation purposes
                        // This will ensure the ship always faces the target even when not moving
                        return this.predictTargetPosition();
                    }
                } else {
                    return this.pos.copy(); // No valid target, stay put
                }
                break;
        }
        
        // Return the calculated position or null if no valid position found
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

    // If we're currently engaged in combat to protect the principal, 
    // don't immediately switch back to formation
    if (this.currentEngagementTarget && 
        this.isTargetValid(this.currentEngagementTarget) && 
        (this.currentState === AI_STATE.APPROACHING || 
        this.currentState === AI_STATE.ATTACK_PASS || 
        this.currentState === AI_STATE.REPOSITIONING ||
        this.currentState === AI_STATE.SNIPING)) {
        
        // Stay with current target until combat is resolved (or attacker escapes)
        return;
    }

    // Check if principal is being attacked
    const principalAttacker = this.principal.lastAttacker;
    const timeSincePrincipalAttack = this.principal.lastAttackTime ? millis() - this.principal.lastAttackTime : Infinity;
    const currentTime = millis();
    
    // If we're already engaged with a target and the engagement is still fresh, 
    // stay with the current target even if the principal is being attacked by someone else
    if (this.currentEngagementTarget && 
        this.isTargetValid(this.currentEngagementTarget) && 
        currentTime - this.lastEngagementTime < this.engagementDuration) {
        
        // Continue with current target even if principal is attacked by someone else
        this.target = this.currentEngagementTarget;
        
        // Only change state if not already in a combat state
        if (this.currentState !== AI_STATE.APPROACHING && 
            this.currentState !== AI_STATE.ATTACK_PASS && 
            this.currentState !== AI_STATE.REPOSITIONING &&
            this.currentState !== AI_STATE.SNIPING) {
            this.changeState(AI_STATE.APPROACHING); // Ensure we're in combat mode
        }
        return;
    }

    // Check for new threats to the principal
    if (this.guardReactionTime <= 0 && 
        principalAttacker && 
        this.isTargetValid(principalAttacker) && 
        principalAttacker !== this && 
        timeSincePrincipalAttack < 5000) { // React to attacks within last 5s
        
        const distToPrincipalAttacker = this.distanceTo(principalAttacker);

        // Don't keep announcing the same engagement
        const isNewEngagement = this.currentEngagementTarget !== principalAttacker;

        if (distToPrincipalAttacker < this.guardEngageRange) {
            if (isNewEngagement) {
                console.log(`${this.shipTypeName} (Guard): ${this.principal.shipTypeName || 'Principal'} is under attack by ${principalAttacker.shipTypeName || 'Unknown Attacker'}. Engaging!`);
            }
            
            this.target = principalAttacker; // Set the attacker as the guard's target
            this.currentEngagementTarget = principalAttacker; // Remember who we're engaging
            this.lastEngagementTime = currentTime; // Track when we started this engagement
            this.changeState(AI_STATE.APPROACHING); // Switch to combat mode
            this.guardReactionTime = 10.0; // Extended cooldown to reduce constant re-engaging
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

        // NEW: Select best weapon for the current situation if we have a target
        if (targetExists) {
            this.selectBestWeapon(distanceToTarget);
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
                if (dE < 150 && !this.jumpingEffect) {
                    this.inCombat = false;
                    this.haulerCombatTimer = undefined;
                    
                    // Start jump effect instead of immediately destroying
                    this.jumpingEffect = true;
                    this.jumpEffectStartTime = millis();
                    
                    // This log confirms the condition was met
                    console.log(`${this.role} ${this.shipTypeName} triggered jump effect.`);
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
        // Cache deltaTime calculation to avoid conditional in high-frequency calls
        const timeScale = this._getTimeScale();
        let pf = this.predictionTime * timeScale;
        this.tempVector.mult(pf);
        this.tempVector.add(this.target.pos);
        return this.tempVector;
    }
    
    /** @private Get normalized time scale factor for consistent speed regardless of framerate */
    _getTimeScale() {
        // Cache this calculation since multiple methods use it
        return deltaTime ? (60 / (1000/deltaTime)) : 60;
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
        // Direct component calculation is faster than dist() function call
        const dx = this.pos.x - target.pos.x;
        const dy = this.pos.y - target.pos.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /** 
     * Calculates squared distance to target entity (faster than distanceTo when just comparing)
     * @param {Object} target - Entity with pos property
     * @return {number} Squared distance to target or Infinity if invalid
     */
    distanceToSquared(target) {
        if (!target?.pos) return Infinity;
        const dx = this.pos.x - target.pos.x;
        const dy = this.pos.y - target.pos.y;
        return dx * dx + dy * dy;
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
     * Helper: Rotates towards the target position.
     * @param {p5.Vector} desiredMovementTargetPos - Position to move towards.
     * @return {number} The angle difference in radians.
     * @private
     */
    _performRotation(desiredMovementTargetPos) {
        let angleDifference = Math.PI; // Default to max difference
        
        if (desiredMovementTargetPos?.x !== undefined && desiredMovementTargetPos?.y !== undefined) {
            let desiredDir = p5.Vector.sub(desiredMovementTargetPos, this.pos);
            if (desiredDir.magSq() > 0.001) { // Avoid normalizing a zero vector
                let desiredAngle = desiredDir.heading(); // Radians
                angleDifference = this.rotateTowards(desiredAngle);
            }
        }
        return angleDifference;
    }

    /**
     * Helper: Calculates thrust parameters for the ATTACK_PASS state.
     * @param {number} angleDifference - Current angle difference to the movement target.
     * @return {{canThrust: boolean, effectiveThrustMultiplier: number}}
     * @private
     */
    _getAttackPassThrustParams(angleDifference) {
        let effectiveThrustMultiplier = ATTACK_PASS_SPEED_BOOST_MULT;
        let canThrust = false;
        let forceThrustForAttackPassEmergency = false;

        if (this.isTargetValid(this.target)) {
            let distToActualTarget = this.distanceTo(this.target);
            let criticalCollisionRange = (this.size + (this.target.size || this.size)) * ATTACK_PASS_COLLISION_AVOID_RANGE_FACTOR;
            if (distToActualTarget < criticalCollisionRange) {
                let vecToActualTarget = p5.Vector.sub(this.target.pos, this.pos);
                let angleToActualTargetCurrent = vecToActualTarget.heading();
                let diffAngleToActualTarget = this.normalizeAngle(angleToActualTargetCurrent - this.angle);
                if (Math.abs(diffAngleToActualTarget) < this.angleTolerance * 1.5 && Math.abs(angleDifference) > this.angleTolerance * 0.5) {
                    effectiveThrustMultiplier = ATTACK_PASS_COLLISION_AVOID_THRUST_REDUCTION;
                    forceThrustForAttackPassEmergency = true;
                }
            }
        }
        const isAlignedForThrust = Math.abs(angleDifference) < this.angleTolerance;
        if (isAlignedForThrust || forceThrustForAttackPassEmergency) {
            canThrust = true;
        }
        return { canThrust, effectiveThrustMultiplier };
    }

    /**
     * Helper: Calculates thrust parameters for the APPROACHING state.
     * @param {number} angleDifference - Current angle difference to the movement target.
     * @return {{canThrust: boolean, effectiveThrustMultiplier: number}}
     * @private
     */
    _getApproachingThrustParams(angleDifference) {
        let effectiveThrustMultiplier = 1.0;
        let canThrust = false;

        if (this.isTargetValid(this.target)) {
            let distToActualTarget = this.distanceTo(this.target);
            let targetSize = this.target.size || (this.target.width / 2) || this.size;
            let approachBrakingZone = (this.size + targetSize) * APPROACH_BRAKING_DISTANCE_FACTOR;
            
            if (distToActualTarget < approachBrakingZone) {
                effectiveThrustMultiplier = APPROACH_CLOSE_THRUST_REDUCTION;
            }
        }
        const isAlignedForThrust = Math.abs(angleDifference) < this.angleTolerance;
        if (isAlignedForThrust) {
            canThrust = true;
        }
        return { canThrust, effectiveThrustMultiplier };
    }

    /**
     * Helper: Calculates thrust parameters for the FLEEING state.
     * @param {number} angleDifference - Current angle difference to the movement target.
     * @return {{canThrust: boolean, effectiveThrustMultiplier: number}}
     * @private
     */
    _getFleeingThrustParams(angleDifference) {
        let effectiveThrustMultiplier = (this.role === AI_ROLE.TRANSPORT)
                                        ? FLEE_THRUST_MULT_TRANSPORT
                                        : FLEE_THRUST_MULT_DEFAULT;
        const isAlignedForThrust = Math.abs(angleDifference) < this.angleTolerance;
        return { canThrust: isAlignedForThrust, effectiveThrustMultiplier };
    }

    /**
     * Helper: Calculates thrust parameters for the SNIPING state.
     * @param {p5.Vector} desiredMovementTargetPos - Position to move towards.
     * @param {number} angleDifference - Current angle difference to the movement target.
     * @return {{canThrust: boolean, thrustMultiplier: number, shouldBrake: boolean}}
     * @private
     */
    _getSnipingThrustParams(desiredMovementTargetPos, angleDifference) {
        let thrustMultiplier = SNIPING_POSITION_ADJUST_THRUST;
        let canThrust = false;
        let shouldBrake = false;

        const isAlignedForSnipeThrust = Math.abs(angleDifference) < this.angleTolerance * 1.5; 
        
        if (desiredMovementTargetPos && desiredMovementTargetPos instanceof p5.Vector && this.pos.dist(desiredMovementTargetPos) > this.size * 0.05) {
            if (isAlignedForSnipeThrust) {
                canThrust = true;
            }
        } else { 
            shouldBrake = true;
        }
        return { canThrust, thrustMultiplier, shouldBrake };
    }

    /**
     * Helper: Calculates thrust parameters for default active states.
     * @param {number} angleDifference - Current angle difference to the movement target.
     * @return {{canThrust: boolean, effectiveThrustMultiplier: number}}
     * @private
     */
    _getDefaultActiveStateThrustParams(angleDifference) {
        const effectiveThrustMultiplier = 1.0;
        const isAlignedForThrust = Math.abs(angleDifference) < this.angleTolerance;
        return { canThrust: isAlignedForThrust, effectiveThrustMultiplier };
    }

    /**
     * Helper: Determines thrust applicability and multiplier based on current AI state.
     * @param {p5.Vector} desiredMovementTargetPos - Position to move towards.
     * @param {number} angleDifference - Current angle difference to the movement target.
     * @return {{canThrust: boolean, effectiveThrustMultiplier: number}}
     * @private
     */
    _calculateThrustParameters(desiredMovementTargetPos, angleDifference) {
        let effectiveThrustMultiplier = 1.0;
        let canThrust = false;

        switch (this.currentState) {
            case AI_STATE.IDLE:
            case AI_STATE.NEAR_STATION:
                // canThrust remains false
                break;
            case AI_STATE.ATTACK_PASS:
                ({ canThrust, effectiveThrustMultiplier } = this._getAttackPassThrustParams(angleDifference));
                break;
            case AI_STATE.APPROACHING:
                ({ canThrust, effectiveThrustMultiplier } = this._getApproachingThrustParams(angleDifference));
                break;
            case AI_STATE.FLEEING:
                ({ canThrust, effectiveThrustMultiplier } = this._getFleeingThrustParams(angleDifference));
                break;
            case AI_STATE.SNIPING:
                const snipeResult = this._getSnipingThrustParams(desiredMovementTargetPos, angleDifference);
                canThrust = snipeResult.canThrust;
                effectiveThrustMultiplier = snipeResult.thrustMultiplier;
                if (snipeResult.shouldBrake) {
                    this.vel.mult(SNIPING_BRAKE_FACTOR);
                }
                break;
            default: // For other active states like REPOSITIONING, PATROLLING, TRANSPORTING, COLLECTING_CARGO
                ({ canThrust, effectiveThrustMultiplier } = this._getDefaultActiveStateThrustParams(angleDifference));
                break;
        }
        return { canThrust, effectiveThrustMultiplier };
    }

    /** 
     * Rotates towards target, applies thrust if aligned. Returns angle difference.
     * @param {p5.Vector} desiredMovementTargetPos - Position to move towards
     * @return {number} The angle difference in radians
     */
    performRotationAndThrust(desiredMovementTargetPos) {
        const angleDifference = this._performRotation(desiredMovementTargetPos);
        const { canThrust, effectiveThrustMultiplier } = this._calculateThrustParameters(desiredMovementTargetPos, angleDifference);

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
    
    // Cache frequently used values
    const velX = this.vel.x;
    const velY = this.vel.y;
    
    let dragFactor;
    
    // --- TANGLE WEAPON EFFECT ---
    if (this.dragMultiplier > 1.0 && this.dragEffectTimer > 0) {
        // First apply normal drag
        dragFactor = this.drag;
        
        // Then apply tangle effect with safety bounds
        const safeDragMultiplier = Math.max(this.dragMultiplier, 0.001);
        const tangledSpeedFactor = Math.min(1 / safeDragMultiplier, 1.0);
        
        // Apply combined drag factor directly to components
        if (isFinite(tangledSpeedFactor) && tangledSpeedFactor > 0) {
            dragFactor *= tangledSpeedFactor;
            
            // Add randomness only occasionally to reduce calculations
            if (frameCount % 5 === 0) {
                const randomAngle = random(-0.1, 0.1);
                const cosAngle = Math.cos(randomAngle);
                const sinAngle = Math.sin(randomAngle);
                
                // Manual rotation calculation
                this.vel.x = velX * cosAngle - velY * sinAngle;
                this.vel.y = velX * sinAngle + velY * cosAngle;
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
        // Stronger braking - avoid extra multiplication
        dragFactor = this.drag * 0.8;
    } 
    // --- DEFAULT DRAG ---
    else {
        dragFactor = this.drag;
    }
    
    // Apply drag directly to components
    this.vel.x *= dragFactor;
    this.vel.y *= dragFactor;
    
    // Optimized max speed check using squared magnitude comparison
    const speedSquared = this.vel.x * this.vel.x + this.vel.y * this.vel.y;
    const maxSpeedSquared = this.maxSpeed * this.maxSpeed;
    
    if (speedSquared > maxSpeedSquared) {
        const scaleFactor = this.maxSpeed / Math.sqrt(speedSquared);
        this.vel.x *= scaleFactor;
        this.vel.y *= scaleFactor;
    }
    
    // Fast NaN check without using isNaN
    if (this.vel.x === this.vel.x && this.vel.y === this.vel.y) {
        // Direct component addition for better performance
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
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
        // Check weapon type for special aiming rules
        const currentWeaponType = this.currentWeapon?.type;
        const isTurretWeapon = currentWeaponType === 'turret';
        const isMissileWeapon = currentWeaponType === 'missile';
        const angleDiff = this.getAngleDifference(targetAngle);
        
        // Allow wider angle for missile weapons (missiles can be fired at greater angles than standard weapons)
        const missileAngleTolerance = WIDE_ANGLE_RAD * 2.5; // Much wider acceptance angle for missiles
        
        return this.currentState !== AI_STATE.IDLE && 
               (isTurretWeapon || 
                isMissileWeapon && Math.abs(angleDiff) < missileAngleTolerance ||
                Math.abs(angleDiff) < WIDE_ANGLE_RAD); // Standard weapons use normal tolerance
    }

/** 
 * Checks conditions and calls fire() if appropriate.
 * @param {Object} system - The current star system
 * @param {boolean} targetExists - Whether we have a valid target
 * @param {number} distanceToTarget - Distance to target
 * @param {number} shootingAngle - Angle to target in radians
 */
performFiring(system, targetExists, distanceToTarget, shootingAngle) {
    // Early exit conditions - quick checks first
    if (!targetExists || !this.isWeaponReady() || this.currentState === AI_STATE.IDLE) return;
    
    // Fast path check for weapon
    if (!this.currentWeapon) {
        // No weapon to fire
        return;
    }
    
    // Cache weapon type
    const weaponType = this.currentWeapon.type;
    
    // Fast weapon range calculation with lookup
    const rangeFactor = 
        weaponType === 'beam' ? 1.2 :
        weaponType === 'missile' ? 1.8 :
        weaponType === 'turret' ? 0.8 : 1.0;
    
    const effectiveFiringRange = this.firingRange * rangeFactor;
    
    // Store for visualization
    this.visualFiringRange = effectiveFiringRange;
    
    // Early range check
    if (distanceToTarget >= effectiveFiringRange) return;
    
    // Firing angle check
    if (!this.canFireAtTarget(shootingAngle)) {
        // Only log for player targets in certain conditions (reduced logging)
        if (this.target instanceof Player && frameCount % 60 === 0) {
            // Log once per second instead of every frame
            console.log(`${this.shipTypeName} targeting player but angle not aligned`);
        }
        return;
    }
    
    // System reference check
    if (!this.currentSystem) this.currentSystem = system;
    
    // Fire the weapon
    this.fireWeapon(this.target);
    
    // Reset cooldown
    this.fireCooldown = this.fireRate;
    
    // Only log player targeting when it actually happens
    if (this.target instanceof Player && frameCount % 30 === 0) {
        // Reduce logging frequency to every half second
        console.log(`${this.shipTypeName} firing ${this.currentWeapon.name} at player`);
    }
}

    /**
     * Creates and adds a projectile aimed in the specified direction (radians)
     * Optimized with improved vector calculations
     * @param {Object} system - The current star system
     * @param {number} fireAngleRadians - The angle to fire at
     */
    fire(system, fireAngleRadians) {
        // Early exit for hauler safety check
        const isHaulerCanFire = this.role !== AI_ROLE.HAULER || 
                              this.currentState === AI_STATE.APPROACHING || 
                              this.currentState === AI_STATE.ATTACK_PASS || 
                              this.currentState === AI_STATE.REPOSITIONING;
                              
        if (!isHaulerCanFire) return;
        
        // System validity check
        if (!system || typeof system.addProjectile !== 'function') return;
        
        // Angle validity check (NaN protection)
        if (isNaN(this.angle) || isNaN(fireAngleRadians)) return;
        
        // Calculate spawn position directly with trig functions - avoid vector creation
        const spawnDistance = this.size * 0.7;
        const cosAngle = Math.cos(this.angle);
        const sinAngle = Math.sin(this.angle);
        
        const spawnX = this.pos.x + cosAngle * spawnDistance;
        const spawnY = this.pos.y + sinAngle * spawnDistance;
        
        // Create projectile directly with coordinates
        const proj = new Projectile(spawnX, spawnY, fireAngleRadians, 'ENEMY', 5, 5);
        system.addProjectile(proj);
    }

    /**
     * Fires the currently equipped weapon with advanced targeting
     * Optimized for different weapon types and targeting scenarios
     * @param {Object} targetToPass - The target to fire at
     */
    fireWeapon(targetToPass = null) {
        // Early return checks with combined condition
        if (!this.currentWeapon || !this.currentSystem) return;
        
        // Check if weapons are disabled (by EMP nebula, for example)
        if (this.weaponsDisabled) {
            // Cannot fire weapons when disabled
            return;
        }
        
        // Cached system and weapon type for multiple uses
        const system = this.currentSystem;
        const weaponType = this.currentWeapon.type;
        
        // For missiles, ensure we always have the main target
        if (weaponType === WEAPON_TYPE.MISSILE) {
            // If no target was passed in, use the enemy's current target
            if (!targetToPass && this.target) {
                targetToPass = this.target;
                console.log(`${this.shipTypeName}: Using main target for missile firing`);
            }
            
            // Debug output if we're still missing a target
            if (!targetToPass) {
                console.log(`${this.shipTypeName}: Tried to fire missile but no target available`);
            }
        }
        
        // Combined target validation with short-circuit evaluation
        const isValidMissileTarget = !(
            weaponType === WEAPON_TYPE.MISSILE && 
            (!targetToPass || 
             targetToPass.destroyed || 
             (targetToPass.hull !== undefined && targetToPass.hull <= 0))
        );
        
        if (!isValidMissileTarget) {
            console.log(`${this.shipTypeName}: Invalid missile target, aborting missile launch`);
            return;
        }
        
        // Remove legacy EMP check that uses a non-existent method
        // if (system.isInEMPNebula?.(this.pos)) return;
        
        // Calculate firing angle with optimized path selection
        let fireAngle;
        
        if (!targetToPass || !targetToPass.pos) {
            // No target - use ship angle
            fireAngle = this.angle;
        } else {
            // Cache position components for multiple calculations
            const targetX = targetToPass.pos.x;
            const targetY = targetToPass.pos.y;
            const shipX = this.pos.x;
            const shipY = this.pos.y;
            
            // Compute target vector components
            const dX = targetX - shipX;
            const dY = targetY - shipY;
            
            // Fast stationary target check with direct component calculation
            const isStationaryTarget = !targetToPass.vel || 
                         (targetToPass.vel.x * targetToPass.vel.x + 
                          targetToPass.vel.y * targetToPass.vel.y) < 0.25;
                          
            if (isStationaryTarget) {
                // Direct angle calculation for stationary or slow targets
                fireAngle = Math.atan2(dY, dX);
            } else {
                // For fast-moving targets, use ship's current facing
                fireAngle = this.angle;
                
                // Future enhancement: Add predictive targeting here
                // We could calculate target's future position based on velocity
                // and distance, then aim at that predicted position
            }
        }
        
        // Fire the weapon using the WeaponSystem
        WeaponSystem.fire(this, system, fireAngle, weaponType, targetToPass);
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
        // Quick early returns - fundamental checks first
        if (this.destroyed || isNaN(this.angle)) return;
        if (!this.p5FillColor || !this.p5StrokeColor) { 
            this.initializeColors(); 
            if (!this.p5FillColor || !this.p5StrokeColor) return; // Still missing colors after init
        }

        // Handle jump effect animation if active
        if (this.jumpingEffect && this.jumpEffectStartTime) {
            const currentTime = millis();
            const elapsedTime = currentTime - this.jumpEffectStartTime;
            const progress = Math.min(elapsedTime / JUMP_EFFECT_DURATION_MS, 1.0);
            
            push();
            translate(this.pos.x, this.pos.y);
            
            // Phase 1: Ship fades to white (0% to 30%)
            if (progress < 0.3) {
                const fadeToWhite = progress / 0.3;
                const whiteness = 255 * fadeToWhite;
                const originalColor = 255 * (1 - fadeToWhite);
                
                rotate(this.angle);
                // Blend original color with white
                const r = originalColor + whiteness;
                const g = originalColor + whiteness;
                const b = originalColor + whiteness;
                fill(r, g, b);
                stroke(255);
                strokeWeight(1);
                
                // Draw the ship using its defined drawing function
                const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
                const drawFunc = shipDef?.drawFunction;
                if (typeof drawFunc === 'function') {
                    drawFunc(this.size, false);
                } else {
                    ellipse(0, 0, this.size, this.size);
                }
            } 
            // Phase 2: Transform to white ball and fade out (30% to 100%)
            else {
                const fadeOutProgress = (progress - 0.3) / 0.7;
                const alpha = 255 * (1 - fadeOutProgress);
                
                // No rotation needed for ball
                fill(255, 255, 255, alpha);
                noStroke();
                
                // Ball starts at ship size and shrinks slightly
                const ballSize = this.size * (1 - fadeOutProgress * 0.2);
                ellipse(0, 0, ballSize, ballSize);
                
                // Optional: Add a subtle glow effect
                if (alpha > 30) {
                    fill(255, 255, 255, alpha * 0.5);
                    ellipse(0, 0, ballSize * 1.5, ballSize * 1.5);
                }
            }
            
            pop();
            return;  // Skip normal drawing when jump effect is active
        }

        // Cache ship definition and draw function - multiple accesses previously
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        const drawFunc = shipDef?.drawFunction;
        if (typeof drawFunc !== 'function') {
            console.error(`Enemy draw: No draw function for ${this.shipTypeName}`);
            push(); translate(this.pos.x, this.pos.y); fill(255,0,0, 150); noStroke(); ellipse(0,0,this.size,this.size); pop();
            return;
        }
        
        // Handle thrust drawing first - this was isolated before
        this.thrustManager.draw();
        
        // Cache current time - used multiple times for various effects
        const currentTime = millis();
        
        // Cache common size calculations for various elements
        const shieldRadius = this.size * 1.3;
        const shieldHitRadius = this.size * 1.4;
        const targetCircleRadius = this.size * 1.6;

        // --- START MAIN SHIP DRAWING BLOCK ---
        push();
        translate(this.pos.x, this.pos.y);

        // --- Draw Info Label (BEFORE rotation) ---
        if (!this.destroyed) {
            this._drawInfoLabel(shipDef);
        }

        // Apply rotation and draw the ship itself - core drawing
        rotate(this.angle);
        fill(this.p5FillColor); 
        stroke(this.p5StrokeColor);
        strokeWeight(1);
        
        // Optimize showThrust condition - used in drawFunc
        const showThrust = (this.currentState !== AI_STATE.IDLE && this.currentState !== AI_STATE.NEAR_STATION);
        
        // Draw the ship
        try { 
            drawFunc(this.size, showThrust);
        } catch (e) { 
            console.error(`Error executing draw function ${drawFunc.name || '?'} for ${this.shipTypeName}:`, e); 
            ellipse(0, 0, this.size, this.size);
        }
        
        // Draw tangle effect if active - this remains in the rotated context
        this._drawTangleEffectIfActive(currentTime);

        // Draw player's target indicator - remains in rotated context
        if (typeof player !== 'undefined' && player.target === this) {
            this._drawTargetIndicator(targetCircleRadius);
        }

        // Draw health bar (counter-rotated to stay level)
        if (!this.destroyed && this.hull < this.maxHull && this.maxHull > 0) {
            this._drawHealthBar();
        }

        pop(); // End ship drawing block (resets the translation and rotation)
        
        // --- Draw Shield Effect (new transformation) ---
        if (!this.destroyed && this.shield > 0 && !this.shieldsDisabled) {
            this._drawShieldEffect(currentTime, shieldRadius, shieldHitRadius);
        }

        // --- Draw special effects (target line, force waves, beams, etc) ---
        this._drawTargetLockOnEffect();
        this._drawForceWaveEffect(currentTime);
        this._drawBeamEffect(currentTime);
        this._drawWeaponRangeIndicator();
    } // End draw()
    
    /**
     * @private
     * Draw the info label above the ship
     */
    _drawInfoLabel(shipDef) {
        push();
        textFont(font);
        textAlign(CENTER, BOTTOM);
        textSize(20);
        fill(255);
        noStroke();

        // Get target label with optimized determination logic
        const targetLabel = this._getTargetLabel();
        
        // Draw the label with ship name and target info
        const label = `${shipDef?.name}  Target: ${targetLabel}`;
        text(label, 0, -this.size / 2 - 15);
        pop();
    }
    
    /**
     * @private
     * Determine target label with optimized branching
     * @return {string} The appropriate target label
     */
    _getTargetLabel() {
        // Fast path for most common states with fixed labels - no distance checks needed
        if (this.currentState === AI_STATE.TRANSPORTING) return "Delivery";
        if (!this.target && this.currentState !== AI_STATE.PATROLLING && 
            this.currentState !== AI_STATE.NEAR_STATION && 
            this.currentState !== AI_STATE.LEAVING_SYSTEM) return "None";
        
        // Cache target for multiple accesses
        const target = this.target;
        
        // Cache frequently used values to reduce repeated property access
        switch (this.currentState) {
            case AI_STATE.PATROLLING:
            case AI_STATE.NEAR_STATION: {
                // Use squared distance check - more efficient than dist()
                const patrolPos = this.patrolTargetPos;
                const station = this.currentSystem?.station?.pos;
                
                if (patrolPos && station) {
                    const dx = patrolPos.x - station.x;
                    const dy = patrolPos.y - station.y;
                    if (dx * dx + dy * dy < 2500) { // 50^2 = 2500
                        return "Station";
                    }
                }
                return "Patrol Point";
            }
                
            case AI_STATE.LEAVING_SYSTEM: {
                // Use squared distance check
                const patrolPos = this.patrolTargetPos;
                const jumpZone = this.currentSystem?.jumpZoneCenter;
                
                if (patrolPos && jumpZone) {
                    const dx = patrolPos.x - jumpZone.x;
                    const dy = patrolPos.y - jumpZone.y;
                    if (dx * dx + dy * dy < 2500) { // 50^2 = 2500
                        return "Jump Zone";
                    }
                }
                return "System Edge";
            }
        }
        
        // Fast path for common target types - check specific properties first, then instanceof
        if (!target) return "None";
        
        // Check for specific properties that identify object types
        // This avoids costly instanceof checks when possible
        if (target.isPlayer === true) return "Player"; 
        if (target.shipTypeName) return target.shipTypeName; // Enemy ships
        if (target.type && !target.shipTypeName) return `Cargo (${target.type})`;
        
        // Only do instanceof checks if absolutely necessary
        if (typeof Player !== 'undefined' && target instanceof Player) return "Player";
        if (typeof Enemy !== 'undefined' && target instanceof Enemy) return target.shipTypeName || "Enemy Ship";
        if (typeof Cargo !== 'undefined' && target instanceof Cargo) return `Cargo (${target.type})`;
        
        // Final checks for other known types
        if (target.constructor) {
            const targetType = target.constructor.name;
            if (targetType === 'Station') return "Station";
            if (targetType === 'Planet') return target.name || "Planet";
            return targetType || "Unknown";
        }
        
        // Last resort
        return target.name || "Unknown";
    }
    
    /**
     * @private
     * Draw tangle effect if the enemy ship is affected
     * Heavily optimized with lookup tables, reduced calculations, and better caching
     */
    _drawTangleEffectIfActive(currentTime) {
        // Fast early exit
        if (this.dragMultiplier <= 1.0 || this.dragEffectTimer <= 0) return;
        
        // Initialize tangle effect cache if needed
        if (!this._tangleCache) {
            this._tangleCache = {
                // Pre-calculate angle offsets and store them
                angleOffsets: [0, 0.4, 0.8, 1.2, 1.6],
                // Scale random ranges for each vertex
                randomFactors: [1.25, 2.5, 3.75, 5.0, 6.25],
                // Vertex coordinate caches
                xCache: new Array(30), // 6 segments * 5 vertices
                yCache: new Array(30),
                // Animation state
                lastUpdateFrame: 0,
                // Reusable segment angle values
                segmentAngles: new Array(6),
                // Pre-computed sin values for animation
                tangleSinValues: new Array(6),
                // Static random values (update less frequently)
                randomCache: new Array(30),
                // Last time randomization occurred
                lastRandomTime: 0,
                // Store pre-calculated vertex coordinates
                vertices: new Array(6).fill().map(() => []),
                // Reuse a single shape for better performance
                shape: null
            };
            
            // Precalculate the segment angles once (these don't change)
            const segmentAngle = TWO_PI / 6;
            for (let i = 0; i < 6; i++) {
                this._tangleCache.segmentAngles[i] = i * segmentAngle;
                // Initialize vertex arrays
                this._tangleCache.vertices[i] = new Array(5);
            }
        }
        
        // Calculate opacity - fade out during last second
        const opacity = this.dragEffectTimer < 1.0 ? 
            Math.floor(this.dragEffectTimer * 180) : 180;
        
        // Cache calculations that don't change during this frame
        const innerRadius = this.size * 0.6;
        const baseOuterRadius = this.size * 1.2;
        const radiusFactor = this.size * 0.2;
        const cache = this._tangleCache;
        
        // OPTIMIZATION: Update animation parameters less frequently (every 10 frames)
        // This significantly reduces computation while maintaining visual quality
        if (frameCount % 10 === 0 || frameCount !== cache.lastUpdateFrame) {
            cache.lastUpdateFrame = frameCount;
            
            // Animation timing - modulo to keep values from growing too large
            const animFrame = frameCount % 360;
            const frameAngle = animFrame * 0.03;
            const frameSin = animFrame * 0.1;
            
            // Pre-compute sin values for animation (once per update)
            for (let i = 0; i < 6; i++) {
                cache.tangleSinValues[i] = sin(frameSin + i);
            }
            
            // OPTIMIZATION: Update random values less frequently (every 200ms)
            // Reduces CPU usage while maintaining visual variation
            const now = millis();
            if (now - cache.lastRandomTime > 200) {
                cache.lastRandomTime = now;
                
                // Pre-generate random values (less frequently)
                for (let idx = 0; idx < cache.randomCache.length; idx++) {
                    const j = idx % cache.angleOffsets.length;
                    const randomFactor = cache.randomFactors[j];
                    cache.randomCache[idx] = [
                        random(-randomFactor, randomFactor),
                        random(-randomFactor, randomFactor)
                    ];
                }
            }
            
            // Pre-generate all vertex coordinates
            for (let i = 0; i < 6; i++) {
                const baseAngle = frameAngle + cache.segmentAngles[i];
                const outerRadius = baseOuterRadius + radiusFactor * cache.tangleSinValues[i];
                
                // Generate vertices for this segment
                for (let j = 0; j < cache.angleOffsets.length; j++) {
                    const idx = i * cache.angleOffsets.length + j;
                    const angle = baseAngle + cache.angleOffsets[j];
                    const radius = (j % 2 === 0) ? innerRadius : outerRadius;
                    
                    // Calculate base coordinates
                    const cosVal = cos(angle);
                    const sinVal = sin(angle);
                    
                    // Store pre-calculated vertex coordinates
                    const randomOffset = cache.randomCache[idx];
                    cache.vertices[i][j] = [
                        cosVal * radius + randomOffset[0],
                        sinVal * radius + randomOffset[1]
                    ];
                }
            }
        }
        
        // Set up drawing style once
        noFill();
        stroke(200, opacity);
        strokeWeight(2);
        
        // OPTIMIZATION: Draw fewer segments at greater distances
        // Reduces draw calls based on distance from camera
        const segmentsToRender = this.distFromCamera ? 
            Math.min(6, Math.max(2, Math.ceil(12 / (this.distFromCamera * 0.01 + 1)))) : 6;
        
        // Draw all segments with cached values
        for (let i = 0; i < segmentsToRender; i++) {
            beginShape();
            
            // Use pre-computed vertices directly
            const vertices = cache.vertices[i];
            for (let j = 0; j < vertices.length; j++) {
                vertex(vertices[j][0], vertices[j][1]);
            }
            
            endShape();
        }
    }
    
    /**
     * @private
     * Draw the target indicator when this ship is the player's target
     */
    _drawTargetIndicator(radius) {
        // Reuse rendering constants
        const strokeAlpha = 200;
        const bracketSize = this.size * 0.3;
        const offset = this.size * 0.7;
        
        // Set styles only once
        noFill();
        stroke(0, 255, 0, strokeAlpha);
        strokeWeight(2);
        
        // Draw circle - more visible than individual elements
        ellipse(0, 0, radius, radius);
        
        // Draw brackets in a single loop with pre-calculated positions
        const positions = [
            {x: -offset, y: -offset, dx: bracketSize, dy: 0},  // Top-left horizontal
            {x: -offset, y: -offset, dx: 0, dy: bracketSize},  // Top-left vertical
            {x: offset, y: -offset, dx: -bracketSize, dy: 0},  // Top-right horizontal
            {x: offset, y: -offset, dx: 0, dy: bracketSize},   // Top-right vertical
            {x: -offset, y: offset, dx: bracketSize, dy: 0},   // Bottom-left horizontal
            {x: -offset, y: offset, dx: 0, dy: -bracketSize},  // Bottom-left vertical
            {x: offset, y: offset, dx: -bracketSize, dy: 0},   // Bottom-right horizontal
            {x: offset, y: offset, dx: 0, dy: -bracketSize}    // Bottom-right vertical
        ];
        
        for (const pos of positions) {
            line(pos.x, pos.y, pos.x + pos.dx, pos.y + pos.dy);
        }
    }
    
    /**
     * @private
     * Draw the health bar below the ship
     */
    _drawHealthBar() {
        push();
        rotate(-this.angle); // Counter-rotate to keep bar level
        
        const healthPercent = this.hull / this.maxHull;
        const barW = this.size * 0.9;
        const barH = 6;
        const barX = -barW / 2;
        const barY = this.size / 2 + 5;
        
        noStroke();
        
        // Draw red background and green health in one pass with fewer state changes
        fill(255, 0, 0);
        rect(barX, barY, barW, barH);
        
        fill(0, 255, 0);
        rect(barX, barY, barW * healthPercent, barH);
        
        pop();
    }
    
    /**
     * @private
     * Draw shield effects
     */
    _drawShieldEffect(currentTime, shieldRadius, shieldHitRadius) {
        push();
        translate(this.pos.x, this.pos.y);
        
        const shieldPercent = this.shield / this.maxShield;
        const shieldAlpha = map(shieldPercent, 0, 1, 40, 80);
        
        noFill();
        stroke(100, 180, 255, shieldAlpha);
        strokeWeight(1.5);
        ellipse(0, 0, shieldRadius, shieldRadius);
        
        // Only draw hit effect if a recent hit occurred
        const timeSinceHit = currentTime - this.shieldHitTime;
        if (timeSinceHit < 300) {
            const hitOpacity = map(timeSinceHit, 0, 300, 200, 0);
            stroke(150, 220, 255, hitOpacity);
            strokeWeight(3);
            ellipse(0, 0, shieldHitRadius, shieldHitRadius);
        }
        
        pop();
    }
    
    /**
     * @private
     * Draw force wave visual effect
     */
    _drawForceWaveEffect(currentTime) {
        if (this.lastForceWave && currentTime - this.lastForceWave.time < 300) {
            const timeSinceForce = currentTime - this.lastForceWave.time;
            const alpha = map(timeSinceForce, 0, 300, 200, 0);
            const radius = map(timeSinceForce, 0, 300, 10, 40);
            
            push();
            translate(this.pos.x, this.pos.y);
            noFill();
            strokeWeight(3);
            
            // Use destructured color for more readable code
            const [r, g, b] = this.lastForceWave.color;
            stroke(r, g, b, alpha);
            
            circle(0, 0, radius * 2);
            pop();
        }
    }
    
    /**
     * @private
     * Draw beam visual effect 
     */
    _drawBeamEffect(currentTime) {
        if (this.lastBeam && currentTime - this.lastBeam.time < 150) {
            push();
            const color = this.lastBeam.color;
            const [r, g, b] = color; // Destructure once for multiple uses
            
            // Draw the beam with inner and outer glow in one push/pop cycle
            stroke(color);
            strokeWeight(3);
            line(this.lastBeam.start.x, this.lastBeam.start.y, this.lastBeam.end.x, this.lastBeam.end.y);
            
            stroke(r, g, b, 100);
            strokeWeight(6);
            line(this.lastBeam.start.x, this.lastBeam.start.y, this.lastBeam.end.x, this.lastBeam.end.y);
            
            pop();
        }
    }
    
    /**
     * @private
     * Draw weapon range indicator with improved performance
     */
    _drawWeaponRangeIndicator() {
        // Early return for the most common case
        if (!this.currentWeapon || !this.target) return;
        
        // Fast path checking: First check the state as it's fastest
        const isAttackState = (this.currentState === AI_STATE.APPROACHING ||
                              this.currentState === AI_STATE.ATTACK_PASS ||
                              this.currentState === AI_STATE.REPOSITIONING);
        
        if (!isAttackState) return;
        
        // Only then check target validity which is more expensive
        if (!this.isTargetValid(this.target)) return;
        
        // Draw the circle without push/pop for better performance
        // The global drawing state is already clean at this point in the draw() method
        stroke(200, 200, 0, 100);
        noFill();
        strokeWeight(1);
        circle(this.pos.x, this.pos.y, this.visualFiringRange * 2);
        // No need for pop() as there was no push()
    }



    /**
     * @private
     * Handles drawing the debug target line and playing the lock-on sound effect
     * when specific conditions are met.
     */
    _drawTargetLockOnEffect() {
        // Short-circuit if no target - avoids unnecessary checks
        if (!this.target || !this.isTargetValid(this.target)) {
            this.hasPlayedLockOnSound = false;
            return;
        }
        
        // Check if the conditions are met for drawing the target line
        const isTargeting = this.role !== AI_ROLE.HAULER && 
                           (this.currentState === AI_STATE.APPROACHING ||
                            this.currentState === AI_STATE.ATTACK_PASS ||
                            this.role === AI_ROLE.ALIEN);
                            
        if (!isTargeting) {
            this.hasPlayedLockOnSound = false;
            return;
        }
        
        // Sound logic (only execute when targeting the player)
        if (this.target instanceof Player) {
            if (!this.hasPlayedLockOnSound && typeof soundManager !== 'undefined' && soundManager.playSound) {
                soundManager.playSound('targetlock');
                this.hasPlayedLockOnSound = true;
            }
        } else {
            this.hasPlayedLockOnSound = false;
        }

        // Draw the targeting line with improved error handling
        const strokeColor = this.p5StrokeColor;
        
        push();
        strokeWeight(1);
        
        // Simplified color selection with fallbacks
        if (strokeColor?.setAlpha) {
            try {
                strokeColor.setAlpha(100);
                stroke(strokeColor);
            } catch {
                // Use stored color values as backup
                if (this.strokeColorValue) {
                    stroke(this.strokeColorValue[0], this.strokeColorValue[1], this.strokeColorValue[2], 100);
                } else {
                    stroke(255, 0, 0, 100); // Ultimate fallback
                }
            }
        } else {
            // Use stored color values as primary fallback
            if (this.strokeColorValue) {
                stroke(this.strokeColorValue[0], this.strokeColorValue[1], this.strokeColorValue[2], 100);
            } else {
                stroke(255, 0, 0, 100); // Ultimate fallback
            }
        }
        
        // Draw the line - this is always valid at this point since we checked isTargetValid
        line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
        pop();
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

        // If this is a bodyguard, track destruction in player
        if (this.role === AI_ROLE.GUARD && this.principal instanceof Player) {
            // Find the bodyguard ID in activeBodyguards array that matches this ship
            const activeGuards = this.principal.activeBodyguards;
            for (let i = 0; i < activeGuards.length; i++) {
                if (activeGuards[i].id === this.guardId) {
                    // Add this ID to destroyedBodyguards list
                    if (!this.principal.destroyedBodyguards.includes(activeGuards[i].id)) {
                        this.principal.destroyedBodyguards.push(activeGuards[i].id);
                        console.log(`Bodyguard ${activeGuards[i].id} marked as destroyed`);
                    }
                    break;
                }
            }
        }

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
     * Destroys the enemy, setting the destroyed flag to true
     * This allows the star system to remove it from the enemies array
     */
    destroy() {
        if (this.destroyed) return; // Already destroyed
        
        console.log(`${this.role} ${this.shipTypeName} destroy() called`);
        this.destroyed = true;
        this.hull = 0;
        
        // Clear all state flags
        this.inCombat = false;
        this.haulerCombatTimer = undefined;
        this.forcedCombatTimer = 0;
        this.target = null;
        
        // Don't create an explosion - this is for enemies that leave the system
        // The _processDestruction method handles explosions for enemies that are destroyed by damage
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
        
        // Add previous state to the stateData for context in state transitions
        stateData.previousState = oldState;
        
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
                
            case AI_STATE.GUARDING:
                // Reset targeting when returning to guard state
                if (this.principal) {
                    const currentTime = millis();
                    const combatStates = [AI_STATE.APPROACHING, AI_STATE.ATTACK_PASS, AI_STATE.REPOSITIONING, AI_STATE.SNIPING];
                    const wasPreviouslyInCombat = combatStates.includes(stateData.previousState);
                    const timeInEngagement = this.lastEngagementTime ? currentTime - this.lastEngagementTime : Infinity;
                    
                    // Reset engagement if:
                    // 1. We've been engaged for longer than our persistence duration, OR
                    // 2. We're coming from a non-combat state, OR
                    // 3. Our previous engagement target is no longer valid
                    if (timeInEngagement > this.engagementDuration || 
                        !wasPreviouslyInCombat ||
                        !this.isTargetValid(this.currentEngagementTarget)) {
                        
                        // Clear engagement tracking
                        this.currentEngagementTarget = null;
                        this.lastEngagementTime = 0;
                    }
                }
                
                // Apply initial braking when entering guarding state
                if (this.vel) {
                    this.vel.mult(0.8);
                }
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

    /**
     * Calculate the attack pass target position with optimized vector operations
     * @return {p5.Vector} The calculated attack pass target position
     */
    calculateAttackPassTarget() {
        // Don't create new vectors for positions - access components directly
        const enemyPosX = this.pos.x;
        const enemyPosY = this.pos.y;
        
        // Basic validity check for target
        if (!this.target?.pos) {
            // Return a position slightly ahead of current position if no target
            return createVector(
                enemyPosX + Math.cos(this.angle) * (this.size * 5),
                enemyPosY + Math.sin(this.angle) * (this.size * 5)
            );
        }
        
        const targetPosX = this.target.pos.x;
        const targetPosY = this.target.pos.y;
        
        // Get target velocity components with safe fallbacks
        const targetVelX = this.target.vel ? this.target.vel.x : 0;
        const targetVelY = this.target.vel ? this.target.vel.y : 0;
        
        // Use consistent random values for this entire attack pass
        const strafeMultFactor = random(0.7, 1.3);
        const aheadDistFactor = random(0.8, 1.2);
        
        // Calculate prediction frames using cached time scale
        const timeScale = this._getTimeScale();
        const strafePredictionFrames = this.predictionTime * ATTACK_PASS_STRAFE_PREDICTION_FACTOR * timeScale;
        
        // Calculate predicted target position directly with components
        const predictedTargetPosX = targetPosX + (targetVelX * strafePredictionFrames);
        const predictedTargetPosY = targetPosY + (targetVelY * strafePredictionFrames);
        
        // Direction vector from enemy to predicted target position
        let vecToTargetX = predictedTargetPosX - enemyPosX;
        let vecToTargetY = predictedTargetPosY - enemyPosY;
        
        // Check if the direction vector is too small (near-zero)
        const vecToTargetMagSq = vecToTargetX * vecToTargetX + vecToTargetY * vecToTargetY;
        if (vecToTargetMagSq < 0.1) {
            // Try using actual position instead
            vecToTargetX = targetPosX - enemyPosX;
            vecToTargetY = targetPosY - enemyPosY;
            
            const altVecMagSq = vecToTargetX * vecToTargetX + vecToTargetY * vecToTargetY;
            if (altVecMagSq < 0.1) {
                // If still too small, use a random direction
                const randAngle = random(TWO_PI);
                vecToTargetX = Math.cos(randAngle);
                vecToTargetY = Math.sin(randAngle);
            }
        }
        
        // Normalize the direction vector
        const vecToTargetMag = Math.sqrt(vecToTargetX * vecToTargetX + vecToTargetY * vecToTargetY);
        const passDirectionX = vecToTargetX / vecToTargetMag;
        const passDirectionY = vecToTargetY / vecToTargetMag;
        
        // Calculate strafe offset (perpendicular to direction)
        const strafeOffsetValue = this.size * (ATTACK_PASS_STRAFE_OFFSET_MULT * strafeMultFactor) * this.strafeDirection;
        
        // Calculate perpendicular vector (-y, x) for strafe without creating new vector
        const perpX = -passDirectionY * strafeOffsetValue;
        const perpY = passDirectionX * strafeOffsetValue;
        
        // Calculate strafe point
        const sideStrafePointX = predictedTargetPosX + perpX;
        const sideStrafePointY = predictedTargetPosY + perpY;
        
        // Add jitter to strafe point
        const jitterMagnitude = this.size * random(0.3, 0.8);
        const jitterAngle = random(TWO_PI);
        const jitterX = Math.cos(jitterAngle) * jitterMagnitude;
        const jitterY = Math.sin(jitterAngle) * jitterMagnitude;
        
        const finalStrafeX = sideStrafePointX + jitterX;
        const finalStrafeY = sideStrafePointY + jitterY;
        
        // Calculate vector to strafe point
        const vecToStrafeX = finalStrafeX - enemyPosX;
        const vecToStrafeY = finalStrafeY - enemyPosY;
        const vecToStrafeMagSq = vecToStrafeX * vecToStrafeX + vecToStrafeY * vecToStrafeY;
        
        // Calculate final target based on strafe vector
        const aheadDistanceForPass = this.size * (ATTACK_PASS_AHEAD_DIST_MULT * aheadDistFactor);
        
        let finalTargetX, finalTargetY;
        
        if (vecToStrafeMagSq > 0.001) {
            // Normalize vector to strafe point and extend by ahead distance
            const vecToStrafeMag = Math.sqrt(vecToStrafeMagSq);
            const normVecToStrafeX = vecToStrafeX / vecToStrafeMag;
            const normVecToStrafeY = vecToStrafeY / vecToStrafeMag;
            
            finalTargetX = finalStrafeX + (normVecToStrafeX * aheadDistanceForPass);
            finalTargetY = finalStrafeY + (normVecToStrafeY * aheadDistanceForPass);
        } else {
            // Use pass direction if strafe vector is too small
            finalTargetX = finalStrafeX + (passDirectionX * aheadDistanceForPass);
            finalTargetY = finalStrafeY + (passDirectionY * aheadDistanceForPass);
        }
        
        // Only create one new vector at the end
        return createVector(finalTargetX, finalTargetY);
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

