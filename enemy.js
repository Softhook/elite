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

        // Regenerate shields only after recharge delay has passed (and not disabled by Ion nebula)
        const timeSinceShieldHit = currentTime - this.lastShieldHitTime;
        if (this.shield < this.maxShield && !this.destroyed && !this.shieldsDisabled && timeSinceShieldHit > this.shieldRechargeDelay) {
            const timeScale = deltaTime ? (deltaTime / 16.67) : 1;
            const rechargeAmount = this.shieldRechargeRate * SHIELD_RECHARGE_RATE_MULTIPLIER * timeScale * 0.016;
            this.shield = Math.min(this.maxShield, this.shield + rechargeAmount);
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
                // Log barrier deactivation for debugging
                console.log(`${this.shipTypeName} barrier deactivated`);
            }
        }

            // Update drag effect timer
        if (this.dragEffectTimer > 0) {
            this.dragEffectTimer -= deltaSeconds;
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
    
    // getSystem moved to enemyUtils.js

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

