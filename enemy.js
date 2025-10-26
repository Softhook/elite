// ****** Enemy.js ******
// Main Enemy class implementation
// Constants and enums are loaded from enemyConstants.js

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
                  // Minimal dummy values with expected property names
                  shipDef = { name: "ErrorShip", size: 10, baseMaxSpeed: 0, baseThrust: 0, baseTurnRate: 0, baseHull: 1, baseShield: 0, shieldRecharge: 0, cargoCapacity: 0 };
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
        
        // Track active mines deployed by this enemy (max 5)
        this.activeMines = [];
        
        // Resolve weapons strictly from ship definition. Do NOT auto-arm unarmed ships.
        this.weapons = [];
        this.currentWeapon = null;
        this.fireRate = 0;

        const intendedArmament = Array.isArray(shipDef.armament) ? shipDef.armament : [];
        if (intendedArmament.length > 0 && typeof WEAPON_UPGRADES !== 'undefined' && WEAPON_UPGRADES.length > 0) {
            for (let weaponName of intendedArmament) {
                const weaponDef = WEAPON_UPGRADES.find(w => w.name === weaponName);
                if (weaponDef) this.weapons.push(weaponDef);
            }
        }

        if (this.weapons.length > 0) {
            this.currentWeapon = this.weapons[0];
            this.fireRate = this.currentWeapon.fireRate;
            if (typeof uiManager !== 'undefined' && uiManager?.addMessage) {
                uiManager.addMessage(`Detected ${this.shipTypeName} armed with ${this.currentWeapon.name}`);
            }
        } else {
            // No weapons resolved. Keep ship unarmed. Certain combat-centric roles may receive a safe fallback.
            const combatRole = (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.ALIEN || this.role === AI_ROLE.BOUNTY_HUNTER || this.role === AI_ROLE.POLICE || this.role === AI_ROLE.GUARD);
            if (combatRole && intendedArmament.length > 0) {
                // Only fallback-arm if the ship was intended to be armed but lookup failed.
                this.currentWeapon = {
                    name: "Default Laser",
                    type: WEAPON_TYPE.PROJECTILE || 'projectile',
                    damage: 8,
                    color: [255, 0, 0],
                    fireRate: 0.5,
                    price: 0,
                    desc: "Fallback weapon."
                };
                this.weapons = [this.currentWeapon];
                this.fireRate = this.currentWeapon.fireRate;
                if (typeof uiManager !== 'undefined' && uiManager?.addMessage) {
                    uiManager.addMessage(`Arming ${this.shipTypeName} with fallback weapon due to missing defs`);
                }
            } else {
                // Explicitly unarmed (e.g., SystemShuttle): leave currentWeapon null and weapons empty
                this.weapons = [];
                this.currentWeapon = null;
                this.fireRate = 0;
            }
        }
        
        // --- Role-Specific Initial State ---
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

        // Track range stalemates so we can force aggressive maneuvers when fights stall
        this._rangeStallTimer = 0;
        this._lastRangeSample = null;
        this._rangeStallState = null;
        this._rangeStallCooldown = 0;

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
        this.shieldRechargeDelay = 3000; // 3 seconds delay after shield hit
        this.lastShieldHitTime = 0; // Track when shield was last hit

        // Track shield transitions for audio cues
        this._shieldWasZero = (this.shield <= 0);

        // --- Guard-specific properties ---
        this.principal = null; // The entity this guard is protecting
        this.guardFormationOffset = createVector(-70, 0); // Desired position relative to principal (x: behind/ahead, y: left/right)
        this.guardLeashDistance = 450;    // Max distance to stray from principal when not engaging
        this.guardEngageRange = 700;      // Range to detect and engage principal's attacker
        this.guardReactionTime = 0;       // Cooldown for reacting to principal's attacker
        this.guardEngagementLock = 0;     // Timer to maintain engagement with principal's attacker (prevents flickering)
        // ---

        // --- Combat AI Flags ---
        this.combatFlagsInitialized = true; // Set flag here
        this.hasLoggedDamageActivation = false;
        this.hasLoggedPlayerTargeting = false;
        this.targetSwitchCooldown = 0;
            this.dragMultiplier = 1.0;   // Default - normal drag
            this.dragEffectTimer = 0;    // Countdown timer for tangle effect
        // --- End Combat AI Flags ---

        // --- Barrier System Properties ---
        this.isBarrierActive = false;
        this.barrierDamageReduction = 0;
        this.barrierDurationTimer = 0;
        this.barrierCooldown = 0;
        this.barrierRadius = 0;
        this.barrierColor = [100, 100, 255]; // Default blue
        // ---

        // --- Nebula Effect Properties ---
        this.weaponsDisabled = false; // Set by EMP nebula
        this.shieldsDisabled = false; // Set by Ion nebula
        this.inNebula = false; // General nebula presence flag
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
        
        // Cache time values to avoid redundant calculations
        const deltaSeconds = deltaTime / 1000;
        const currentTime = millis();
        
        // Update weapon cooldown
        this.fireCooldown -= deltaSeconds;
        
        // Cargo collection cooldown
        if (this.cargoCollectionCooldown > 0) {
            this.cargoCollectionCooldown -= deltaSeconds;
        }

        // Process hauler attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaSeconds;
        }
        
        // Process target switch cooldown
        if (this.targetSwitchCooldown > 0) {
            this.targetSwitchCooldown -= deltaSeconds;
        }
        
        // Process guard engagement lock timer
        if (this.guardEngagementLock > 0) {
            this.guardEngagementLock -= deltaSeconds;
        }

        // Regenerate shields only after recharge delay has passed (and not disabled by Ion nebula)
        const timeSinceShieldHit = currentTime - this.lastShieldHitTime;
        if (this.shield < this.maxShield && !this.destroyed && !this.shieldsDisabled && timeSinceShieldHit > this.shieldRechargeDelay) {
            const timeScale = deltaTime ? (deltaTime / 16.67) : 1;
            const rechargeAmount = this.shieldRechargeRate * SHIELD_RECHARGE_RATE_MULTIPLIER * timeScale * 0.016;
            const prevShield = this.shield;
            const newShield = Math.min(this.maxShield, prevShield + rechargeAmount);
            if (prevShield === 0 && newShield > 0 && this._shieldWasZero) {
                // World-positioned cue for enemies
                if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player?.pos) {
                    soundManager.playWorldSound('shieldUp', this.pos.x, this.pos.y, player.pos);
                }
                this._shieldWasZero = false;
            }
            this.shield = newShield;
        }

        // Update barrier cooldown and duration
        if (this.barrierCooldown > 0) {
            this.barrierCooldown -= deltaSeconds;
        }
        
        // Update barrier duration timer
        if (this.isBarrierActive && this.barrierDurationTimer > 0) {
            this.barrierDurationTimer -= deltaSeconds;
            if (this.barrierDurationTimer <= 0) {
                this.isBarrierActive = false;
                this.barrierDamageReduction = 0;
                this.barrierDurationTimer = 0;
                // Audio cue for barrier deactivation (parity with player)
                if (typeof soundManager !== 'undefined') { soundManager.playSound('barrierDown'); }
                // Log barrier deactivation for debugging
                console.log(`${this.shipTypeName} barrier deactivated`);
            }
        }

        // Proactively attempt barrier activation even without a valid target (defensive behavior)
        if (typeof this.activateBarrierIfNeeded === 'function') {
            this.activateBarrierIfNeeded();
        }

        // Drag effect timer is handled centrally in updatePhysics();
        // avoid decrementing here to prevent double counting.

        // For pirates: Look for cargo first if not already collecting
        if (this.role === AI_ROLE.PIRATE && 
            this.currentState !== AI_STATE.COLLECTING_CARGO && 
            this.cargoCollectionCooldown <= 0) {
            
            const cargoTarget = this.detectCargo(system);
            if (cargoTarget) {
                this.cargoTarget = cargoTarget;
                this.changeState(AI_STATE.COLLECTING_CARGO);
                CARGO_LOG(`${this.shipTypeName} detected cargo - moving to collect`);
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
                CARGO_LOG(`Transport ${this.shipTypeName} spotted cargo - deviating from route`);
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
    
    // Targeting methods moved to enemyTargeting.js

    // Combat and weapons methods (selectOptimalWeapon, selectBestWeapon, isWeaponReady, 
    // canFireAtTarget, performFiring, fire, fireWeapon, cycleWeapon, isArmed, isInCombatState)
    // are loaded from enemyCombat.js

    // Movement methods (getMovementTargetForState, performRotationAndThrust, updatePhysics) 
    // are loaded from enemyMovement.js


    // ----------------------
    // --- AI Behavior Methods ---
    // ----------------------
    // AI Behavior methods moved to enemyAIBehaviors.js
    // - _handleForcedCombat()
    // - hasGoodSnipingWeapon()
    // - updateCombatAI()
    // - updatePoliceAI()
    // - updateHaulerAI()
    // - updateTransportAI()
    // - updateCargoCollectionAI()



    // -----------------------
    // --- Movement & Physics ---
    // -----------------------
    
    /** Predicts player's future position. */
    // Utility methods moved to enemyUtils.js

    // Combat methods moved to enemyCombat.js

    // -----------------
    // --- Rendering ---
    // -----------------
    // Rendering methods moved to enemyRendering.js
    // - draw()
    // - _drawTargetLockOnEffect()



    // ------------------
    // --- Cargo Handling ---
    // ------------------
    // Cargo handling methods moved to enemyCargo.js
    // - _spawnCargo()
    // - jettisonCargo()
    // - dropCargo()
    // - detectCargo()


    // -----------------------
    // --- Utility Methods ---
    // -----------------------
    
/**
 * Damage System Methods
 * All damage-related methods moved to enemyDamageSystem.js
 * - takeDamage()
 * - _handleAttackerReference()
 * - _applyDamageDistribution()
 * - _processDestruction()
 * - _handlePlayerKillConsequences()
 * - _checkRandomCargoDrop()
 */


    // isDestroyed and checkCollision moved to enemyUtils.js

    // -----------------------
    // --- State Management ---
    // -----------------------

    /**
     * Changes the AI state with proper logging and initialization
     * @param {number} newState - The new AI state to transition to
     * @param {Object} [stateData={}] - Additional data needed for the new state
     */

    /**
     * Handles actions when entering a new state
     * @param {number} state - The state being entered
     * @param {Object} stateData - Additional data for state initialization
     */

    // Add this new method to calculate the attack path once

    /**
     * Handles actions when exiting a state
     * @param {number} state - The state being exited
     * @param {Object} stateData - Additional data for cleanup
     */
}

// Apply utility methods from enemyUtils.js to Enemy prototype
// This is called after Enemy class definition is complete
if (typeof applyEnemyUtilityMethods === 'function') {
    applyEnemyUtilityMethods();
}

// Apply targeting methods from enemyTargeting.js to Enemy prototype
if (typeof applyEnemyTargetingMethods === 'function') {
    applyEnemyTargetingMethods();
}

// Apply state machine methods from enemyStateMachine.js to Enemy prototype
if (typeof applyEnemyStateMachineMethods === 'function') {
    applyEnemyStateMachineMethods();
}

// Apply movement methods from enemyMovement.js to Enemy prototype
if (typeof applyEnemyMovementMethods === 'function') {
    applyEnemyMovementMethods();
}

// Apply combat methods from enemyCombat.js to Enemy prototype
if (typeof applyEnemyCombatMethods === 'function') {
    applyEnemyCombatMethods();
}

// Apply AI behavior methods from enemyAIBehaviors.js to Enemy prototype
if (typeof applyEnemyAIBehaviorMethods === 'function') {
    applyEnemyAIBehaviorMethods();
}

// Apply cargo handling methods from enemyCargo.js to Enemy prototype
if (typeof applyEnemyCargoMethods === 'function') {
    applyEnemyCargoMethods();
}

// Apply damage system methods from enemyDamageSystem.js to Enemy prototype
if (typeof applyEnemyDamageSystemMethods === 'function') {
    applyEnemyDamageSystemMethods();
}

// Apply rendering methods from enemyRendering.js to Enemy prototype
if (typeof applyEnemyRenderingMethods === 'function') {
    applyEnemyRenderingMethods();
}

