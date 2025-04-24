// ****** Enemy.js ******

// -------------------------
// --- Constants & Enums ---
// -------------------------

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
    COLLECTING_CARGO: 8,   // New state for cargo collection behavior
    FLEEING: 9        // New state for damaged ships trying to escape
};

// Reverse lookup for AI_STATE values to names
const AI_STATE_NAME = {};
for (const [k, v] of Object.entries(AI_STATE)) {
    AI_STATE_NAME[v] = k;
}

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
        }
        this.isThargoid = (this.shipTypeName === "Thargoid Interceptor"); // Match exact name
        if (this.isThargoid) { // Thargoid specific overrides
            this.rotationSpeed = this.baseTurnRate; this.angleTolerance = 5 * PI/180;
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

        // Store reference to current system
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
            const rechargeAmount = this.shieldRechargeRate * timeScale * 0.016;
            this.shield = Math.min(this.maxShield, this.shield + rechargeAmount);
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
                } else {
                    // Normal transport behavior
                    this.updateTransportAI(system);
                }
            } else {
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
        // Update cooldown timer
        if (this.targetSwitchCooldown > 0) {
            this.targetSwitchCooldown -= deltaTime / 1000;
        }
        
        // If we've been attacked, consider retaliating
        if (this.lastAttacker && this.isTargetValid(this.lastAttacker) && 
            this.targetSwitchCooldown <= 0) {
            
            const attackerDistance = this.distanceTo(this.lastAttacker);
            const attackerIsThreat = this.lastAttacker.hull > this.hull * 0.3; // Only worry about threats
            
            // Different rules for different roles
            if (this.role === AI_ROLE.PIRATE && attackerDistance < this.detectionRange * 1.5) {
                // Pirates more likely to retaliate against attackers
                console.log(`Pirate ${this.shipTypeName} responding to attack from ${this.lastAttacker.shipTypeName}`);
                this.target = this.lastAttacker;
                this.changeState(AI_STATE.APPROACHING);
                this.targetSwitchCooldown = 2.0;
                return true;
            } else if (this.role === AI_ROLE.POLICE && attackerDistance < this.detectionRange && attackerIsThreat) {
                // Police will attack threats more cautiously
                if (this.lastAttacker.isWanted) {
                    console.log(`Police ${this.shipTypeName} pursuing wanted attacker ${this.lastAttacker.shipTypeName}`);
                    this.target = this.lastAttacker;
                    this.changeState(AI_STATE.APPROACHING);
                    this.targetSwitchCooldown = 1.5;
                    return true;
                }
            } else if (this.role === AI_ROLE.HAULER && 
                       attackerDistance < this.detectionRange &&
                       (!this.attackCooldown || this.attackCooldown <= 0)) {
                // Haulers should always respond to attacks, regardless of threat level
                
                // Store current hauler state to return to later
                this.previousHaulerState = this.currentState;
                this.previousTargetPos = this.patrolTargetPos ? this.patrolTargetPos.copy() : null;
                
                // Temporarily switch to combat mode
                console.log(`Hauler ${this.shipTypeName} defending against attack from ${this.lastAttacker.shipTypeName}`);
                this.target = this.lastAttacker;
                this.changeState(AI_STATE.APPROACHING);
                this.targetSwitchCooldown = 3.0; // Longer cooldown - haulers aren't combat ships
                this.haulerCombatTimer = 10.0; // Set timer to return to hauling
                return true;
            }
        }
        
        // Pirates proactively hunt the player
        if (this.role === AI_ROLE.PIRATE &&
            (this.currentState === AI_STATE.IDLE || !this.isTargetValid(this.target)) &&
            this.isTargetValid(system.player)) {
            
            const playerDistance = this.distanceTo(system.player);
            const playerValue = system.player.credits > 10000 ? 1.5 : 1.0; // More interested in wealthy players
            
            if (playerDistance < this.detectionRange * playerValue) {
                if (!this.hasLoggedPlayerTargeting || this.target !== system.player) {
                    console.log(`Pirate ${this.shipTypeName} actively targeting Player at distance ${playerDistance.toFixed(2)}`);
                    this.hasLoggedPlayerTargeting = true;
                }
                
                this.target = system.player;
                this.changeState(AI_STATE.APPROACHING);
                this.targetSwitchCooldown = 1.0;
                return true;
            }
        }
        
        // Reset player targeting log flag when we change targets
        if (this.target !== system.player) {
            this.hasLoggedPlayerTargeting = false;
        }
        
        // Target switching logic - possibly switch to a better target
        if (this.isTargetValid(this.target) && this.targetSwitchCooldown <= 0) {
            // Check for better targets
            let bestTarget = this.target;
            let bestScore = this.evaluateTargetScore(this.target, system); // Pass system here
            
            // Consider the player
            if (this.isTargetValid(system.player) && this.target !== system.player) {
                const playerScore = this.evaluateTargetScore(system.player, system) * 1.2; // Pass system here
                if (playerScore > bestScore) {
                    bestTarget = system.player;
                    bestScore = playerScore;
                }
            }
            
            // Consider other enemies
            if (system.enemies && system.enemies.length > 0) {
                for (const enemy of system.enemies) {
                    // Skip ourselves and invalid targets
                    if (enemy === this || !this.isTargetValid(enemy)) continue;
                    
                    // Skip non-wanted ships for police
                    if (this.role === AI_ROLE.POLICE && !enemy.isWanted) continue;
                    
                    const enemyScore = this.evaluateTargetScore(enemy, system); // Pass system here
                    if (enemyScore > bestScore) {
                        bestTarget = enemy;
                        bestScore = enemyScore;
                    }
                }
            }
            
            // Switch to best target if it's different
            if (bestTarget !== this.target) {
                console.log(`${this.shipTypeName} switching target to ${bestTarget.shipTypeName || 'Player'} (score: ${bestScore.toFixed(1)})`);
                this.target = bestTarget;
                this.targetSwitchCooldown = 2.0;
            }
        }
        
        return this.isTargetValid(this.target);
    }

    /**
     * Evaluate how attractive a target is based on various factors
     * Higher score = more attractive target
     * @param {Object} target - The target to evaluate
     * @param {Object} system - The current star system
     * @return {number} A score representing target attractiveness
     */
    evaluateTargetScore(target, system) {
        if (!this.isTargetValid(target)) return 0;
        
        let score = 100; // Base score
        
        // Distance factor - closer targets are more attractive
        const distance = this.distanceTo(target);
        score -= distance * 0.1; // Reduce score based on distance
        
        // Hull factor - weaker targets are more attractive
        if (target.hull !== undefined && target.maxHull !== undefined) {
            const hullPercent = target.hull / target.maxHull;
            score += (1 - hullPercent) * 30; // Up to 30 points for damaged targets
        }
        
        // Role-specific factors
        if (this.role === AI_ROLE.PIRATE) {
            // Pirates prefer valuable targets
            if (target === system.player) {
                // Players with cargo are more attractive
                if (target.cargo && target.cargo.length > 0) {
                    score += target.cargo.length * 10;
                }
                
                // Damaged players are more attractive
                if (target.hull < target.maxHull * 0.5) {
                    score += 30;
                }
            } else if (target.role === AI_ROLE.HAULER) {
                // Haulers might have valuable cargo
                score += 20;
            } else if (target.role === AI_ROLE.POLICE) {
                // Pirates generally avoid police unless they attacked first
                score -= 30;
                
                // Unless this police attacked us
                if (target === this.lastAttacker) {
                    score += 50;
                }
            }
        } else if (this.role === AI_ROLE.POLICE) {
            // Police prioritize wanted ships
            if (target.isWanted) {
                score += 50;
                
                // Even more if they're actively committing crimes
                if (target.role === AI_ROLE.PIRATE) {
                    score += 20;
                }
            } else {
                // Police should ignore non-wanted ships
                score = 0;
            }
        }
        
        return score;
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
        
        // Score each weapon based on situation
        let bestScore = -1;
        let bestWeapon = this.currentWeapon;
        
        for (const weapon of this.weapons) {
            let score = 0;
            
            // Range considerations
            const isLongRange = distanceToTarget > this.firingRange * 0.7;
            const isMediumRange = distanceToTarget > this.firingRange * 0.4 && distanceToTarget <= this.firingRange * 0.7;
            const isShortRange = distanceToTarget <= this.firingRange * 0.4;
            
            // Score based on weapon type and range
            if (weapon.type.includes('beam') && isLongRange) {
                score += 3; // Beams are good at long range
            } else if (weapon.type.includes('beam') && isMediumRange) {
                score += 2;
            } else if (weapon.type.includes('beam') && isShortRange) {
                score += 1;
            }
            
            if (weapon.type === 'projectile' && isShortRange) {
                score += 3; // Projectiles are best at short range
            } else if (weapon.type === 'projectile' && isMediumRange) {
                score += 2;
            } else if (weapon.type === 'projectile' && isLongRange) {
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
                // Against fast targets, prefer weapons with higher accuracy
                if (target.maxSpeed > 5 && weapon.type === 'turret') {
                    score += 2;
                }
                
                // Against large targets, prefer high damage weapons
                if (target.size > 50 && weapon.damage > 10) {
                    score += 2;
                }
                
                // Against armored targets (high hull), prefer armor penetrating weapons
                if (target.maxHull > 100 && weapon.armorPiercing) {
                    score += 3;
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
                if (this.isTargetValid(this.target)) {
                    if (this.target.vel) {
                        desiredMovementTargetPos = p5.Vector.add(
                            this.target.pos, 
                            this.target.vel.copy().setMag(100)
                        );
                    } else {
                        desiredMovementTargetPos = this.target.pos;
                    }
                }
                break;
                
            case AI_STATE.REPOSITIONING:
                desiredMovementTargetPos = this.repositionTarget;
                break;
                
            case AI_STATE.PATROLLING:
                desiredMovementTargetPos = this.patrolTargetPos;
                break;
        }
        
        return desiredMovementTargetPos;
    }

    /**
     * Update the enemy's combat state based on target and distance
     * @param {boolean} targetExists - Whether we have a valid target
     * @param {number} distanceToTarget - Distance to the current target
     */
    updateCombatState(targetExists, distanceToTarget) {
        switch (this.currentState) {
            case AI_STATE.IDLE:
                // Transition to APPROACHING if we have a valid target
                if (targetExists) {
                    this.changeState(AI_STATE.APPROACHING);
                }
                break;
                
            case AI_STATE.APPROACHING:
                // Transition to ATTACK_PASS when close enough
                if (targetExists && distanceToTarget < this.engageDistance) {
                    this.changeState(AI_STATE.ATTACK_PASS);
                } else if (!targetExists) {
                    this.changeState(this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
                }
                break;
                
            case AI_STATE.ATTACK_PASS:
                if (!targetExists) {
                    this.changeState(this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
                    break;
                }
                
                // Transition to REPOSITIONING when pass timer expires
                this.passTimer -= deltaTime / 1000;
                if (this.passTimer <= 0) {
                    // Prepare data for repositioning
                    let stateData = {};
                    if (targetExists) {
                        let v = p5.Vector.sub(this.pos, this.target.pos);
                        v.setMag(this.repositionDistance * 1.5);
                        stateData.repositionTarget = p5.Vector.add(this.pos, v);
                    }
                    this.changeState(AI_STATE.REPOSITIONING, stateData);
                }
                break;
                
            case AI_STATE.REPOSITIONING:
                if (!targetExists) {
                    this.changeState(this.role === AI_ROLE.POLICE ? AI_STATE.PATROLLING : AI_STATE.IDLE);
                    break;
                }
                
                // Check if we've reached the repositioning target or target is too far
                let distToRepo = this.repositionTarget ? 
                    this.distanceTo(this.repositionTarget) : Infinity;
                    
                if (distanceToTarget > this.repositionDistance || distToRepo < 50) {
                    this.changeState(AI_STATE.APPROACHING);
                }
                break;
                
            case AI_STATE.PATROLLING:
                // Transition to APPROACHING if in detection range
                if (targetExists && distanceToTarget < this.detectionRange) {
                    this.changeState(AI_STATE.APPROACHING);
                }
                break;

            case AI_STATE.FLEEING:
                // Add a minimum flee time to prevent premature exit
                if (!this.fleeStartTime) {
                    this.fleeStartTime = millis();
                    this.fleeMinDuration = 2000; // Minimum 2 seconds of fleeing
                }
                
                // When fleeing, move away from attacker and increase speed
                if (this.target && this.target.pos) {
                    let escapeVector = p5.Vector.sub(this.pos, this.target.pos);
                    escapeVector.normalize().mult(2000);  // Aim very far away
                    this.escapeTarget = p5.Vector.add(this.pos, escapeVector);
                    
                    // Apply stronger thrust for escape
                    this.performRotationAndThrust(this.escapeTarget);
                    this.thrustForward(1.2);  // Apply extra thrust when fleeing
                    
                    // Add some randomness to make escape path less predictable
                    if (frameCount % 20 === 0) {
                        this.vel.add(p5.Vector.random2D().mult(0.5));
                    }
                }
                
                // Only exit FLEEING when truly safe AND minimum flee time has passed
                const timeInFlee = millis() - (this.fleeStartTime || 0);
                if (timeInFlee > this.fleeMinDuration && 
                    (!this.isTargetValid(this.target) || 
                     this.distanceTo(this.target) > this.detectionRange * 2.0)) {
                    
                    console.log(`${this.shipTypeName} escaped successfully!`);
                    
                    // Add a long cooldown before we can be provoked again
                    this.attackCooldown = 20.0;
                    this.lastAttacker = null;  // Reset attacker reference
                    this.fleeStartTime = null;  // Reset flee timer
                    
                    // Always return to a non-combat state (PATROLLING or previous state)
                    // IMPORTANT: Never return to a combat state like ATTACK_PASS
                    if (this.previousHaulerState && 
                        this.previousHaulerState !== AI_STATE.APPROACHING && 
                        this.previousHaulerState !== AI_STATE.ATTACK_PASS && 
                        this.previousHaulerState !== AI_STATE.REPOSITIONING) {
                        this.changeState(this.previousHaulerState);
                    } else {
                        this.changeState(AI_STATE.PATROLLING);
                    }
                }
                break;
        }
    }

    /**
     * Main combat AI implementation - now using smaller helper methods
     * @param {Object} system - The current star system
     */
    updateCombatAI(system) {
        // Initialize flags if not already set
        if (this.combatFlagsInitialized === undefined) {
            this.combatFlagsInitialized = true;
            this.hasLoggedDamageActivation = false;
            this.hasLoggedPlayerTargeting = false;
            this.targetSwitchCooldown = 0;
        }
        
        // Update targeting information
        const targetExists = this.updateTargeting(system);
        
        // Calculate distance to target and shooting angle
        let distanceToTarget = targetExists ? this.distanceTo(this.target) : Infinity;
        let shootingAngle = this.angle;
        
        if (targetExists) {
            shootingAngle = atan2(
                this.target.pos.y - this.pos.y, 
                this.target.pos.x - this.pos.x
            );
        }
        
        // Update state based on conditions
        this.updateCombatState(targetExists, distanceToTarget);
        
        // Get movement target based on current state
        const desiredMovementTargetPos = this.getMovementTargetForState(distanceToTarget);
        
        // Perform movement and firing
        this.performRotationAndThrust(desiredMovementTargetPos);
        this.performFiring(system, targetExists, distanceToTarget, shootingAngle);
    }

    /**
     * Police AI Logic - Patrols, switches to Combat AI if player is wanted
     * @param {Object} system - The current star system
     */
    updatePoliceAI(system) {

        // FIRST check if player is wanted - prioritize player over other NPCs
        if ((system.player && system.player.isWanted && system.player.hull > 0) || 
            (system.policeAlertSent && system.player && system.player.hull > 0)) {
            
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
                    if (random() < 0.3) { // 30% chance to patrol back to station
                        this.patrolTargetPos = system.station.pos.copy();
                        console.log(`Police ${this.shipTypeName} patrolling back to station`);
                    } else {
                        // 70% chance to patrol elsewhere in the system
                        const patrolRange = 800; // Area to patrol within
                        const patrolAngle = random(TWO_PI);
                        const patrolDist = random(300, patrolRange);
                        
                        // Create patrol point relative to current position
                        this.patrolTargetPos = createVector(
                            this.pos.x + cos(patrolAngle) * patrolDist,
                            this.pos.y + sin(patrolAngle) * patrolDist
                        );
                        
                        console.log(`Police ${this.shipTypeName} patrolling to new point at distance ${patrolDist.toFixed(0)}`);
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
        // ADD THIS SECTION: Check for attackers at the beginning of the method
        // regardless of current state
        if (this.lastAttacker && this.isTargetValid(this.lastAttacker) && 
            this.currentState !== AI_STATE.APPROACHING && 
            this.currentState !== AI_STATE.ATTACK_PASS &&
            this.currentState !== AI_STATE.REPOSITIONING &&
            this.currentState !== AI_STATE.FLEEING &&
            (!this.attackCooldown || this.attackCooldown <= 0)) {  // Add this line
            
            const attackerDistance = this.distanceTo(this.lastAttacker);
            
            if (attackerDistance < this.detectionRange * 1.2) {
                // Store current hauler state to return to later
                this.previousHaulerState = this.currentState;
                this.previousTargetPos = this.patrolTargetPos ? this.patrolTargetPos.copy() : null;
                
                // Temporarily switch to combat mode
                console.log(`Hauler ${this.shipTypeName} retaliating against attack from ${this.lastAttacker.shipTypeName || 'Player'}`);
                this.target = this.lastAttacker;
                this.changeState(AI_STATE.APPROACHING);
                this.haulerCombatTimer = 10.0; // Set timer to return to hauling
                
                // Add a message to UI for player feedback
                if (uiManager && typeof uiManager.addMessage === 'function') {
                    uiManager.addMessage(`${this.shipTypeName} retaliating against attack`);
                }
            }
        }

        // Then continue with existing combat state check and normal hauler logic
        if ((this.currentState === AI_STATE.APPROACHING || 
             this.currentState === AI_STATE.ATTACK_PASS ||
             this.currentState === AI_STATE.REPOSITIONING) && 
            this.haulerCombatTimer !== undefined) {
            
            // Update the combat timer
            this.haulerCombatTimer -= deltaTime / 1000;
            
            // Check hull status - flee if heavily damaged
            if (this.hull < this.maxHull * 0.4 && 
                this.currentState !== AI_STATE.FLEEING) {
                console.log(`Damaged hauler ${this.shipTypeName} attempting to escape!`);
                
                // Change to actual fleeing state
                this.changeState(AI_STATE.FLEEING);
                
                // Apply immediate velocity away from the threat
                if (this.target && this.target.pos) {
                    let escapeDir = p5.Vector.sub(this.pos, this.target.pos).normalize();
                    this.vel.add(escapeDir.mult(this.maxSpeed * 0.8));
                }
                
                return; // Skip other combat logic
            }
            
            // Original combat handling code continues...
            this.updateCombatAI(system);
            return;
        }
        
        // Original hauler logic for normal operations...
        let desiredMovementTargetPos = null;
        switch (this.currentState) {
            case AI_STATE.PATROLLING: 
                // Existing patrolling code... 
                if (!this.patrolTargetPos) { 
                    this.patrolTargetPos = system?.station?.pos?.copy(); 
                } 
                desiredMovementTargetPos = this.patrolTargetPos; 
                if (!desiredMovementTargetPos) { 
                    this.setLeavingSystemTarget(system); 
                    desiredMovementTargetPos = this.patrolTargetPos; 
                    break; 
                } 
                let dS = dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y); 
                if (dS < this.stationProximityThreshold) { 
                    this.changeState(AI_STATE.NEAR_STATION); 
                } 
                break;
                
            case AI_STATE.NEAR_STATION: 
                // Existing near station code... 
                this.vel.mult(0.8); 
                this.nearStationTimer -= deltaTime / 1000; 
                if (this.nearStationTimer <= 0 && !this.hasPausedNearStation) { 
                    this.hasPausedNearStation = true; 
                    this.changeState(AI_STATE.LEAVING_SYSTEM); 
                    desiredMovementTargetPos = this.patrolTargetPos; 
                } 
                break;
                
            case AI_STATE.LEAVING_SYSTEM: 
                // Existing leaving system code... 
                if (!this.patrolTargetPos) { 
                    this.setLeavingSystemTarget(system); 
                } 
                desiredMovementTargetPos = this.patrolTargetPos; 
                if (!desiredMovementTargetPos) break; 
                let dE = dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y); 
                if (dE < 150) { 
                    this.destroyed = true; 
                } 
                break;
                
            case AI_STATE.FLEEING:
                // Handle fleeing directly in hauler update loop
                if (this.target && this.target.pos) {
                    // Calculate escape vector away from threat
                    const escapeVector = p5.Vector.sub(this.pos, this.target.pos);
                    escapeVector.normalize().mult(2000);
                    const escapeTargetPos = p5.Vector.add(this.pos, escapeVector);
                    
                    // Use strong thrust to escape
                    const angleToEscape = this.performRotationAndThrust(escapeTargetPos);
                    
                    // Apply extra thrust when generally pointing in escape direction
                    if (Math.abs(angleToEscape) < this.angleTolerance * 2) {
                        this.thrustForward(1.5); // 50% more thrust when fleeing
                    }
                    
                    // Add randomness to make escape path less predictable
                    if (frameCount % 20 === 0) {
                        this.vel.add(p5.Vector.random2D().mult(0.5));
                    }
                    
                    // Check if we've escaped far enough
                    if (!this.isTargetValid(this.target) || 
                        this.distanceTo(this.target) > this.detectionRange * 2.5) {
                        console.log(`${this.shipTypeName} escaped successfully!`);
                        
                        // Add long cooldown before we can be provoked again
                        this.attackCooldown = 20.0;
                        this.lastAttacker = null; // Reset attacker reference
                        
                        // Return to normal hauling
                        if (this.previousHaulerState) {
                            this.changeState(this.previousHaulerState);
                        } else {
                            this.changeState(AI_STATE.PATROLLING);
                        }
                    }
                    
                    // Skip the normal movement code below
                    return;
                } else {
                    // No valid target to flee from, return to normal
                    this.changeState(AI_STATE.PATROLLING);
                    return;
                }
                
            default: 
                // Existing default code... 
                if(system?.station?.pos) { 
                    this.patrolTargetPos = system.station.pos.copy(); 
                    this.changeState(AI_STATE.PATROLLING); 
                } else { 
                    this.changeState(AI_STATE.LEAVING_SYSTEM); 
                } 
                break;
        }
        
        // Existing movement code...
        this.performRotationAndThrust(desiredMovementTargetPos);
    }

    /** Transport AI Logic - Moves between two endpoints. */
    updateTransportAI(system) {
        if (!system) return;
        
        // Add attack response logic for transports
        if (this.lastAttacker && this.isTargetValid(this.lastAttacker) && 
            this.currentState !== AI_STATE.FLEEING &&
            (!this.attackCooldown || this.attackCooldown <= 0)) {
            
            const attackerDistance = this.distanceTo(this.lastAttacker);
            
            if (attackerDistance < this.detectionRange * 1.5) {
                // Store current state to return to later
                this.previousTransportState = this.currentState;
                this.previousRoutePoints = this.routePoints ? [...this.routePoints] : null;
                this.previousRouteIndex = this.currentRouteIndex;
                
                // Unlike haulers, transports should immediately flee (no combat)
                console.log(`Transport ${this.shipTypeName} fleeing from attack by ${this.lastAttacker.shipTypeName || 'Player'}`);
                this.target = this.lastAttacker; // Set attacker as target to flee from
                this.changeState(AI_STATE.FLEEING);
                
                // Add a message to UI for player feedback
                if (uiManager && typeof uiManager.addMessage === 'function') {
                    uiManager.addMessage(`${this.shipTypeName} fleeing from attack`);
                }
                
                // Apply immediate velocity boost away from attacker
                if (this.target && this.target.pos) {
                    let escapeDir = p5.Vector.sub(this.pos, this.target.pos).normalize();
                    this.vel.add(escapeDir.mult(this.maxSpeed * 0.9));
                }
                
                // Set cooldown to prevent immediate re-engagement
                this.attackCooldown = 15.0;
                return; // Skip normal transport behavior
            }
        }
        
        // Check if we're fleeing
        if (this.currentState === AI_STATE.FLEEING) {
            if (this.target && this.target.pos) {
                // Calculate escape vector away from threat
                this.tempVector.set(this.pos.x - this.target.pos.x, this.pos.y - this.target.pos.y);
                this.tempVector.normalize().mult(2000);
                const escapeTargetPos = createVector(this.pos.x + this.tempVector.x, this.pos.y + this.tempVector.y);
                
                // Use strong thrust to escape
                const angleToEscape = this.performRotationAndThrust(escapeTargetPos);
                
                // Apply extra thrust when pointed in escape direction
                if (Math.abs(angleToEscape) < this.angleTolerance * 2) {
                    this.thrustForward(1.8); // 80% more thrust when fleeing (more than haulers)
                }
                
                // Add more randomness to make transport escape harder to predict
                if (frameCount % 15 === 0) {
                    this.vel.add(p5.Vector.random2D().mult(0.8));
                }
                
                // Check if we've escaped far enough
                if (!this.isTargetValid(this.target) || 
                    this.distanceTo(this.target) > this.detectionRange * 3.0) {
                    console.log(`Transport ${this.shipTypeName} escaped successfully!`);
                    
                    // Add long cooldown before we can be provoked again
                    this.attackCooldown = 30.0; // Longer than haulers
                    this.lastAttacker = null; // Reset attacker reference
                    
                    // Return to normal transport route
                    if (this.previousTransportState) {
                        this.changeState(this.previousTransportState);
                        // Restore previous route if needed
                        if (this.previousRoutePoints) {
                            this.routePoints = this.previousRoutePoints;
                            this.currentRouteIndex = this.previousRouteIndex;
                        }
                    } else {
                        this.changeState(AI_STATE.TRANSPORTING);
                    }
                }
                
                // Handle physics in fleeing state
                this.vel.mult(this.drag);
                this.vel.limit(this.maxSpeed * 1.2); // Allow slightly higher speed when fleeing
                this.pos.add(this.vel);
                return; // Skip normal transport behavior
            } else {
                // No valid target to flee from, return to normal
                this.changeState(AI_STATE.TRANSPORTING);
            }
        }
        
        // Original transport logic continues...
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
        
        // Reuse the tempVector to avoid creating new vectors
        this.tempVector.set(destination.x - this.pos.x, destination.y - this.pos.y);
        let distance = this.tempVector.mag();
        this.tempVector.normalize();
        let targetAngle = this.tempVector.heading();
        
        // FIX: Use the rotateTowards method for consistency
        this.rotateTowards(targetAngle);
        
        // FIX: Make sure angle difference is properly normalized before comparison
        let angleDiff = targetAngle - this.angle;
        angleDiff = ((angleDiff % TWO_PI) + TWO_PI) % TWO_PI;
        if (angleDiff > PI) angleDiff -= TWO_PI;
        
        if (abs(angleDiff) < this.angleTolerance) {
            this.thrustForward();
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
                    this.changeState(AI_STATE.IDLE);
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
            diff = ((diff % TWO_PI) + TWO_PI) % TWO_PI;
            if (diff > PI) diff -= TWO_PI;
            
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
     * @param {number} targetAngle - The target angle in radians
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
     * @param {number} [multiplier=1.0] - Optional thrust multiplier
     * @param {boolean} [createParticles=true] - Whether to create visual thrust particles
     */
    thrustForward(multiplier = 1.0, createParticles = true) {
        if (isNaN(this.angle)) return;
        
        // Calculate thrust vector
        this.thrustVector.set(cos(this.angle), sin(this.angle));
        this.thrustVector.mult(this.thrustForce * multiplier);
        
        // Apply thrust to velocity
        this.vel.add(this.thrustVector);
        
        // Flag that we're thrusting - particles will be created in updatePhysics
        if (createParticles) {
            this.isThrusting = true;
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
     * Helper: Rotates towards target, applies thrust if aligned. Returns angle difference.
     * @param {p5.Vector} desiredMovementTargetPos - Position to move towards
     * @return {number} The angle difference in radians
     */
    performRotationAndThrust(desiredMovementTargetPos) {
        let angleDifference = PI;
        
        if (desiredMovementTargetPos?.x !== undefined && desiredMovementTargetPos?.y !== undefined) {
            // Calculate direction vector correctly
            let desiredDir = p5.Vector.sub(desiredMovementTargetPos, this.pos);
            
            // Only compute angle if length isn't zero
            if (desiredDir.magSq() > 0.001) {
                let desiredAngle = desiredDir.heading();
                angleDifference = this.rotateTowards(desiredAngle);
            }
        }
        
        // Add proper thrust logic
        if (this.currentState !== AI_STATE.IDLE && 
            this.currentState !== AI_STATE.NEAR_STATION && 
            abs(angleDifference) < this.angleTolerance) {
            this.thrustForward();
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
        
        // Apply drag based on role
        const effectiveDrag = this.currentState === AI_STATE.NEAR_STATION ? this.drag * 0.8 : this.drag;
        this.vel.mult(effectiveDrag);
        
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
        
        // Create thrust particles if actively thrusting
        // This will be controlled by a separate flag now
        if (this.isThrusting) {
            if (this.thrustManager) {
                this.thrustManager.createThrust(this.pos, this.angle, this.size);
            }
            this.isThrusting = false; // Reset for next frame
        }
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
        const firingAngleTolerance = 0.52;
        
        return this.currentState !== AI_STATE.IDLE && 
               (isTurretWeapon || Math.abs(angleDiff) < firingAngleTolerance);
    }

    /** 
     * Helper: Checks conditions and calls fire() if appropriate.
     * @param {Object} system - The current star system
     * @param {boolean} targetExists - Whether target is valid
     * @param {number} distanceToTarget - Distance to target
     * @param {number} shootingAngle - Angle to target in radians
     */
    performFiring(system, targetExists, distanceToTarget, shootingAngle) {
        if (!targetExists) return;
        
        // Select best weapon for current situation
        this.selectBestWeapon(distanceToTarget);
        
        // Adjust firing range based on weapon type
        let effectiveFiringRange = this.firingRange;
        if (this.currentWeapon) {
            switch (this.currentWeapon.type) {
                case 'beam':
                    effectiveFiringRange *= 1.2; // Beams have longer range
                    break;
                case 'missile':
                    effectiveFiringRange *= 1.3; // Missiles have even longer range
                    break;
                case 'turret':
                    effectiveFiringRange *= 0.9; // Turrets have slightly shorter range
                    break;
            }
        }
        
        // Enhanced firing logic with weapon-specific behaviors
        if (distanceToTarget < effectiveFiringRange && this.isWeaponReady()) {
            // Check if we can fire at the target
            if (this.canFireAtTarget(shootingAngle)) {
                if (!this.currentSystem) this.currentSystem = system; // Ensure system is set
                
                // Weapon-specific behavior
                if (this.currentWeapon) {
                    if (this.currentWeapon.type === 'turret') {
                        // Turrets track the target
                        this.fireWeapon(this.target);
                    } else if (this.currentWeapon.type === 'missile' && 
                              this.role !== AI_ROLE.POLICE && 
                              random() < 0.7) {
                        // Non-police ships sometimes hold missile fire to conserve ammo
                        console.log(`${this.shipTypeName} holding missile fire to conserve ammo`);
                    } else if (this.currentWeapon.type === 'beam' && 
                              distanceToTarget > this.firingRange * 0.8 && 
                              random() < 0.4) {
                        // Sometimes hold beam fire at extreme ranges due to damage falloff
                        console.log(`${this.shipTypeName} holding beam fire at extreme range`);
                    } else {
                        // Standard firing
                        this.fireWeapon();
                    }
                } else {
                    // Fallback if no weapon defined
                    this.fireWeapon();
                }
                
                // Set cooldown based on fire rate
                this.fireCooldown = this.fireRate;
                
                // Add a slight movement pause after firing for more realistic combat
                if (this.currentWeapon && this.currentWeapon.type === 'projectile' && random() < 0.3) {
                    this.vel.mult(0.9); // Slow down slightly
                }
            } else if (this.currentState === AI_STATE.IDLE && targetExists && this.role === AI_ROLE.PIRATE) {
                // Force IDLE pirates who want to fire to transition to APPROACHING
                console.log(`IDLE ${this.shipTypeName} spotted player in range - activating!`);
                this.changeState(AI_STATE.APPROACHING);
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

    /**
     * Check if this ship is armed with any weapons
     * @return {boolean} Whether ship has any weapons
     */
    isArmed() {
        return !!this.currentWeapon;
    }
    
    /**
     * Check if currently in a combat state
     * @return {boolean} Whether in a combat-related state
     */
    isInCombatState() {
        return this.currentState === AI_STATE.APPROACHING || 
               this.currentState === AI_STATE.ATTACK_PASS || 
               this.currentState === AI_STATE.REPOSITIONING;
    }

    // -----------------
    // --- Rendering ---
    // -----------------
    
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

        push(); translate(this.pos.x, this.pos.y); rotate(this.angle); // Already in radians
        // Use initialized p5.Color objects
        fill(this.p5FillColor); stroke(this.p5StrokeColor);
        strokeWeight(1);
        let showThrust = (this.currentState !== AI_STATE.IDLE && this.currentState !== AI_STATE.NEAR_STATION);
        try { drawFunc(this.size, showThrust); } // Call specific draw function
        catch (e) { console.error(`Error executing draw function ${drawFunc.name || '?'} for ${this.shipTypeName}:`, e); ellipse(0,0,this.size, this.size); } // Fallback
        pop();

        // --- Draw Health Bar (only when damaged) ---
        if (this.hull < this.maxHull && this.maxHull > 0) {
            let healthPercent = this.hull / this.maxHull;
            let barW = this.size * 0.9; // Make slightly wider than for asteroids
            let barH = 6;
            let barX = this.pos.x - barW / 2;
            let barY = this.pos.y + this.size/2 + 5; // Position above ship

            push();
            noStroke();
            // Red background
            fill(255, 0, 0);
            rect(barX, barY, barW, barH);
            // Green health remaining
            fill(0, 255, 0);
            rect(barX, barY, barW * healthPercent, barH);
            
            // Optional: Add black outline for better visibility
            stroke(0);
            strokeWeight(1);
            noFill();
            rect(barX, barY, barW, barH);
            pop();
        }

        // Draw shield effect separately (not rotated with ship)
        if (this.shield > 0) {
            push();
            translate(this.pos.x, this.pos.y);

            // Shield appearance based on percentage
            const shieldPercent = this.shield / this.maxShield;
            const shieldAlpha = map(shieldPercent, 0, 1, 40, 80);

            noFill();
            stroke(100, 180, 255, shieldAlpha);
            strokeWeight(1.5);
            ellipse(0, 0, this.size * 1.3, this.size * 1.3);

            // Add shield hit visual effect
            if (millis() - this.shieldHitTime < 300) {
                const hitOpacity = map(millis() - this.shieldHitTime, 0, 300, 200, 0);
                stroke(150, 220, 255, hitOpacity);
                strokeWeight(3);
                ellipse(0, 0, this.size * 1.4, this.size * 1.4);
            }

            pop();
        }

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

        // Draw weapon range indicator in combat (debug)
        if (this.currentWeapon && this.target && 
            (this.currentState === AI_STATE.APPROACHING || 
             this.currentState === AI_STATE.ATTACK_PASS)) {
            
            push();
            stroke(200, 200, 0, 50);
            noFill();
            strokeWeight(1);
            let effectiveRange = this.firingRange;
            
            // Adjust range circle based on weapon type
            if (this.currentWeapon.type === 'beam') effectiveRange *= 1.2;
            else if (this.currentWeapon.type === 'missile') effectiveRange *= 1.3;
            else if (this.currentWeapon.type === 'turret') effectiveRange *= 0.9;
            
            circle(this.pos.x, this.pos.y, effectiveRange * 2);
            pop();
        }
    }

    // ------------------
    // --- Cargo Handling ---
    // ------------------
    
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
     * Drops cargo when ship is destroyed - each cargo represents 1/3 of ship capacity
     */
    dropCargo() {
        if (!this.currentSystem) return;
        
        // Get ship definition with cargo capacity
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        if (!shipDef || !shipDef.typicalCargo || shipDef.typicalCargo.length === 0) return;
        
        // Get the ship's cargo capacity
        const cargoCapacity = shipDef.cargoCapacity || 0;
        if (cargoCapacity <= 0) return;
        
        // Each cargo container represents 1/3 of ship's capacity
        const cargoQuantity = Math.floor(cargoCapacity / 3);
        
        console.log(`${this.shipTypeName} destroyed - dropping cargo worth ${cargoQuantity} units (1/3 of ${cargoCapacity} capacity)`);
        
        // Select a random cargo type from this ship's typical cargo
        const cargoType = random(shipDef.typicalCargo);
        
        // Only drop if quantity is meaningful
        if (cargoQuantity > 0) {
            // Calculate position around the ship's destruction point
            const offsetAngle = random(TWO_PI);
            const offsetDist = random(this.size * 0.2, this.size * 0.7);
            const offsetX = this.pos.x + cos(offsetAngle) * offsetDist;
            const offsetY = this.pos.y + sin(offsetAngle) * offsetDist;
            
            // Create cargo with quantity
            const cargo = new Cargo(offsetX, offsetY, cargoType, cargoQuantity);
            
            // Give cargo some velocity from the explosion
            cargo.vel = p5.Vector.random2D().mult(random(0.8, 2.0));
            
            // Add cargo to system
            if (typeof this.currentSystem.addCargo === 'function') {
                this.currentSystem.addCargo(cargo);
                uiManager.addMessage(`${this.shipTypeName} dropped ${cargoQuantity} units of ${cargoType}`);
            }
        }
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
        if (attacker && amount > 0) {
            this.lastAttacker = attacker;
        }

        if (this.destroyed || amount <= 0) return { damage: 0, shieldHit: false };

        let damageDealt = 0;
        let shieldHit = false;

        // If we have shields, damage them first
        if (this.shield > 0) {
            // Record time of shield hit for visual effect AND recharge delay
            this.shieldHitTime = millis();
            this.lastShieldHitTime = millis(); // Set the recharge delay timer
            shieldHit = true; // IMPORTANT: If shield > 0, it's ALWAYS a shield hit

            if (amount <= this.shield) {
                // Shield absorbs all damage
                this.shield -= amount;
                damageDealt = amount;
            } else {
                // Shield is depleted, remaining damage goes to hull
                const remainingDamage = amount - this.shield;
                damageDealt = amount;
                this.shield = 0;
                this.hull -= remainingDamage;
                
                // CRITICAL FIX: This is STILL a shield hit even though it depleted the shield
                // Always report as a shield hit if shields absorbed ANY damage
                shieldHit = true;
            }
        } else {
            // No shields, damage hull directly
            this.hull -= amount;
            damageDealt = amount;
            shieldHit = false;
        }

        // Handle destruction
        if (this.hull <= 0) {
            this.hull = 0;
            this.destroyed = true;
            console.log(`ENEMY DESTROYED: ${this.shipTypeName}`); // Log destruction

            // Create a large explosion when ship is destroyed
            if (this.currentSystem && typeof this.currentSystem.addExplosion === 'function') {
                console.log(`   CurrentSystem valid. Explosions array length BEFORE: ${this.currentSystem.explosions?.length ?? 'N/A'}`);

                // --- NEW Cascading Explosion Logic ---
                const baseExplosionSize = this.size / 2; // Base size scales with ship
                const numExplosions = Math.max(3, Math.min(10, 3 + Math.floor(this.size / 15))); // 3-10 explosions based on size
                const cascadeDelay = 80; // Delay between explosions in ms
                const explosionColor = this.role === AI_ROLE.PIRATE ?
                    [255, 100, 30] : // Orange/Red for Pirates
                    [255, 165, 0];  // Orange for others

                console.log(`   Creating ${numExplosions} cascading explosions...`);

                // Create cascading secondary explosions
                for (let i = 0; i < numExplosions; i++) {
                    setTimeout(() => {
                        // Check if currentSystem still exists when timeout runs
                        if (this.currentSystem && typeof this.currentSystem.addExplosion === 'function') {
                            // Random offset explosions around ship
                            const offsetX = random(-this.size * 0.8, this.size * 0.8);
                            const offsetY = random(-this.size * 0.8, this.size * 0.8);
                            const currentExplosionSize = baseExplosionSize * random(0.6, 1.3); // Varied sizes

                            // Use the determined enemy color
                            this.currentSystem.addExplosion(
                                this.pos.x + offsetX,
                                this.pos.y + offsetY,
                                currentExplosionSize,
                                explosionColor // Use the enemy-specific color
                            );
                        }
                    }, i * cascadeDelay); // Staggered timing for cascade effect
                }
                // --- End NEW Logic ---

                console.log(`   ...Finished scheduling explosions.`);
                // Note: The AFTER log won't reflect timed explosions immediately
                // console.log(`   Explosions array length AFTER: ${this.currentSystem.explosions?.length ?? 'N/A'}`);

                // Drop cargo when destroyed
                this.dropCargo();
            } else {
                console.log("   CurrentSystem or addExplosion invalid!"); // Log if system/function is missing
            }

            // Handle attacker-specific logic if attacker is provided
            if (attacker instanceof Player) {
                // Credit the player for the kill
                if (attacker.activeMission) {
                    // Update progress for bounty missions
                    if (attacker.activeMission.type === MISSION_TYPE.BOUNTY_PIRATE &&
                        this.role === AI_ROLE.PIRATE) {
                        attacker.activeMission.progressCount = (attacker.activeMission.progressCount || 0) + 1;
                        console.log(`Updated bounty mission progress: ${attacker.activeMission.progressCount}/${attacker.activeMission.targetCount}`);
                        // NOTE: Credits for the mission itself are awarded upon completion, not here.
                    }
                }
            }
        }

        return { damage: damageDealt, shieldHit: shieldHit };
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
        console.log(`${this.role} ${this.shipTypeName} state: ${AI_STATE_NAME[oldState]} -> ${AI_STATE_NAME[AI_STATE[newState]]}`);
        
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
                this.passTimer = this.passDuration;
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
                
            case AI_STATE.NEAR_STATION:
                // Initialize station timer
                this.nearStationTimer = this.stationPauseDuration;
                this.vel.mult(0.1); // Slow down immediately
                break;
                
            case AI_STATE.LEAVING_SYSTEM:
                // Call the modified function to set the target (Jump Zone or fallback)
                this.setLeavingSystemTarget(this.currentSystem); // Ensure currentSystem is valid
                break;
                
            case AI_STATE.COLLECTING_CARGO:
                // Store previous state to return to later
                if (this.currentState !== AI_STATE.COLLECTING_CARGO) {
                    this.previousState = oldState;
                }
                break;
        }
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

            case AI_STATE.FLEEING:
                this.fleeStartTime = null;
                break;
        }
    }
}

