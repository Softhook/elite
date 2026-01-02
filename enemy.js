// ****** Enemy.js ******
// Main Enemy class implementation
// Constants and enums are loaded from enemyConstants.js

// Backwards-compatibility aliases for name arrays (now in enemyConstants.js)
const HUMAN_ENEMY_FIRST_NAMES = (typeof NPC_FIRST_NAMES !== 'undefined') ? NPC_FIRST_NAMES : [];
const HUMAN_ENEMY_LAST_NAMES = (typeof NPC_LAST_NAMES !== 'undefined') ? NPC_LAST_NAMES : [];

// Use centralized name generation from enemyConstants.js
function generateHumanEnemyName() {
    return (typeof generateNPCName === 'function') ? generateNPCName() : '';
}

// Generate name with gender info for voice selection
function generateGenderedHumanEnemyName() {
    return (typeof generateGenderedNPCName === 'function')
        ? generateGenderedNPCName()
        : { name: '', gender: 'male' };
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
        let shipDef = (typeof SHIP_DEFINITIONS !== 'undefined') ? SHIP_DEFINITIONS[actualShipTypeName] : null;

        // Initialize thrust manager
        this.thrustManager = new ThrustManager();

        // Handle fallback if type not found
        if (!shipDef) {
            console.warn(`Enemy constructor: Ship type "${shipTypeName}" not found! Defaulting to Sidewinder.`);
            // Try Sidewinder first as it is the starter ship
            if (typeof SHIP_DEFINITIONS !== 'undefined' && SHIP_DEFINITIONS["Sidewinder"]) {
                actualShipTypeName = "Sidewinder";
                shipDef = SHIP_DEFINITIONS["Sidewinder"];
            } else {
                // Determine fallback - check for KraitMKI
                actualShipTypeName = "KraitMKI";
                shipDef = (typeof SHIP_DEFINITIONS !== 'undefined') ? SHIP_DEFINITIONS[actualShipTypeName] : null;
            }

            // Safety check for the default definition itself
            if (!shipDef) {
                console.error("FATAL: Default ship definition is missing from SHIP_DEFINITIONS! Cannot create enemy properly.");
                // Make enemy unusable if fallback is also missing
                this.hull = 0; this.destroyed = true; shipTypeName = "ErrorShip"; role = "Error"; // Prevent further errors
                // Minimal dummy values with expected property names
                shipDef = { name: "ErrorShip", size: 10, baseMaxSpeed: 0, baseThrust: 0, baseTurnRate: 0, baseHull: 1, baseShield: 0, shieldRecharge: 0, cargoCapacity: 0 };
            }
        }
        // --- End Lookup ---

        // --- Assign CORRECT Properties ---
        this.shipTypeName = actualShipTypeName; // Store the ACTUAL KEY used to find the definition
        this.role = role;

        // Generate name with gender for voice selection
        if (this.role === AI_ROLE.ALIEN) {
            this.displayName = null;
            this.gender = null; // Aliens don't have human gender
        } else {
            const nameData = generateGenderedHumanEnemyName();
            this.displayName = nameData.name;
            this.gender = nameData.gender; // 'male' or 'female'
        }

        // Assign faction - prefer explicit shipDef.faction, then infer from role
        this.faction = null;

        // Use explicit faction from ship definition if defined (including empty string for neutral)
        if (shipDef && shipDef.faction !== undefined && shipDef.faction !== null) {
            this.faction = shipDef.faction; // Can be "", "MILITARY", "IMPERIAL", etc.
        }
        // No fallback - if no faction defined, it stays null

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

        // Cargo bookkeeping
        this.cargoHold = [];
        this.cargoCapacity = shipDef.cargoCapacity || 0;
        this._hasDockedThisPause = false;

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
        switch (this.role) {
            case AI_ROLE.POLICE: this.strokeColorValue = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.POLICE : [30, 144, 255]; break;
            case AI_ROLE.HAULER: this.strokeColorValue = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.HAULER : [255, 215, 0]; break;
            case AI_ROLE.PIRATE: this.strokeColorValue = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.PIRATE : [220, 20, 20]; break;
            case AI_ROLE.ALIEN: this.strokeColorValue = shipDef.strokeColorValue || [0, 255, 150]; break;// Default Alien Green or from shipDef
            case AI_ROLE.BOUNTY_HUNTER:
                this.strokeColorValue = shipDef.strokeColorValue || [255, 165, 0]; // Orange stroke
                // Bounty hunters might have slightly better stats or use shipDef overrides
                this.rotationSpeed = shipDef.rotationSpeed || this.baseTurnRate * 1.1; // Slightly faster turning
                this.angleTolerance = shipDef.angleTolerance || (10 * PI / 180); // Standard tolerance
                this.drag = shipDef.drag || 0.99; // Slightly less drag
                this.target = playerRef;
                // Bounty hunter contract properties
                this.bountyTarget = null;           // Assigned target (player, enemy, or assassination target)
                this.hasCompletedContract = false;  // Set true when bountyTarget is destroyed
                break;
            case AI_ROLE.GUARD:
                this.strokeColorValue = shipDef.strokeColorValue || [150, 150, 220]; // Light purple/blue
                // Guards might inherit target from principal or player initially
                this.target = null; // Default, can be overridden
                break;
        }

        this.strafeDirection = 0; // Will be -1 for left, 1 for right, 0 for none. Set in ATTACK_PASS entry.

        // Initialize p5.Color objects - set by initializeColors() later
        this.p5FillColor = null;
        this.p5StrokeColor = null;
        // ---

        // NOTE: Ship upgrades are applied at the END of the constructor,
        // after all default property values have been initialized.

        // --- Targeting & AI ---
        this.target = null; this.currentState = AI_STATE.IDLE; // Default state
        this.repositionTarget = null; this.passTimer = 0; this.nearStationTimer = 0; this.hasPausedNearStation = false; this.hasRepairedAtStation = false; this.patrolTargetPos = null; // Target pos set in first update if needed
        // AI Tuning Parameters
        this.detectionRange = 450 + this.size; this.engageDistance = 180 + this.size * 0.5; this.firingRange = 350 + this.size * 0.3; this.visualFiringRange = this.firingRange; // Initialize with base range for drawing
        this.repositionDistance = 300 + this.size; this.predictionTime = 0.4; this.passDuration = 1.0 + this.size * 0.01; this.stationPauseDuration = random(3, 7); this.stationProximityThreshold = 340;

        // --- Weapon Assignment Based on Ship Definition ---
        this.fireCooldown = random(1.0, 2.5);
        this.weaponIndex = 0; // To track which weapon is currently active if ship has multiple
        this.weaponHeat = {};

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
            this._tradedAtCurrentStop = false; // Flag to prevent duplicate trade messages
        } else if (this.role === AI_ROLE.GUARD) {
            // Guard will start in GUARDING state if a principal is assigned soon after,
            // otherwise, it might start PATROLLING or IDLE until a principal is assigned.
            // For now, let's default to PATROLLING if no principal is immediately available.
            this.currentState = AI_STATE.PATROLLING;
        } else if (this.role === AI_ROLE.MINER) {
            // Miners start with random timing offset to prevent synchronization
            this.currentState = AI_STATE.IDLE;
            // Add random offset to patrol timing (0-5 seconds)
            this._minerInitOffset = random(0, 5);
            this._minerElapsedTime = 0;
        } else {
            // Existing role assignments – for Pirates/Police/Hauler, etc.
            switch (this.role) {
                case AI_ROLE.HAULER: this.currentState = AI_STATE.PATROLLING; break;
                case AI_ROLE.POLICE: this.currentState = AI_STATE.PATROLLING; break;
                case AI_ROLE.PIRATE: this.currentState = AI_STATE.IDLE; break;
                case AI_ROLE.ALIEN: this.currentState = AI_STATE.APPROACHING; break;
                case AI_ROLE.BOUNTY_HUNTER: this.currentState = AI_STATE.APPROACHING; break;
                default: this.currentState = AI_STATE.IDLE;
            }
        }

        // Cover behavior state
        this.coverEvalTimer = 0;
        this.coverTarget = null;
        this.coverPeekTimer = 0;

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
        this._persistedThrust = 0; // Initialize persisted thrust
        this.tempVector = createVector(0, 0);

        // Flag for thrusting
        this.isThrusting = false;

        // Initialize attack cooldown
        this.attackCooldown = 0;

        // Combat engagement tracking (for combat role ships)
        this.combatEngagementTimer = 0;
        this.inCombat = false;

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

        // --- Cloak Properties ---
        this.isCloaked = false;
        this.cloakDurationTimer = 0;
        this.cloakCooldownTimer = 0;
        this.cloakMaxDuration = 0;
        this.cloakMaxCooldown = 0;
        // ---

        // --- Booster Properties ---
        this.isSpeedBursting = false;
        this.isCoastingFromBurst = false; // Smooth deceleration after boost ends
        this.boostDurationTimer = 0;
        this.boostCooldownTimer = 0;
        this.boostMultiplier = 0;
        this.boostMaxDuration = 0;
        this.boostMaxCooldown = 0;
        // ---

        // --- Nebula Effect Properties ---
        this.weaponsDisabled = false; // Set by EMP nebula
        this.shieldsDisabled = false; // Set by Ion nebula
        this.inNebula = false; // General nebula presence flag
        // ---

        this.hasPlayedLockOnSound = false; // Add this new flag
        this.shieldPlusHullAtStateEntry = null; // For tracking combined health drop during certain states

        // Turret firing angle sync
        this.lastTurretFiringAngle = null;

        // Initialize cargo inventory based on role/ship definition
        if (typeof this.initializeCargoInventory === 'function') {
            this.initializeCargoInventory(shipDef);
        }

        // --- Apply Default Ship Upgrades (MUST be at end of constructor) ---
        // This ensures all properties are initialized before upgrades modify them
        if (shipDef.upgrades && Array.isArray(shipDef.upgrades) && typeof SHIP_UPGRADES !== 'undefined') {
            shipDef.upgrades.forEach(upgradeName => {
                const upgDef = SHIP_UPGRADES.find(u => u.name === upgradeName);
                if (upgDef) {
                    // Apply based on type
                    if (upgDef.type === 'armor') {
                        this.maxHull += (upgDef.hullBonus || 0);
                        this.hull = this.maxHull; // Heal to full
                    } else if (upgDef.type === 'engine') {
                        if (upgDef.speedMultiplier) {
                            this.baseMaxSpeed *= upgDef.speedMultiplier;
                            this.maxSpeed = this.baseMaxSpeed;
                        }
                        if (upgDef.thrustMultiplier) {
                            this.baseThrust *= upgDef.thrustMultiplier;
                            this.thrustForce = this.baseThrust;
                        }
                    } else if (upgDef.type === 'shield') {
                        this.maxShield += (upgDef.shieldBonus || 0);
                        this.shield = this.maxShield;
                    } else if (upgDef.type === 'cloak') {
                        this.cloakMaxDuration = upgDef.cloakDuration;
                        this.cloakMaxCooldown = upgDef.cloakCooldown;
                    } else if (upgDef.type === 'booster') {
                        this.boostMultiplier = upgDef.boostMultiplier;
                        this.boostMaxDuration = upgDef.boostDuration;
                        this.boostMaxCooldown = upgDef.boostCooldown;
                    }
                }
            });
        }
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
            this.angleTolerance = 15 * PI / 180; // This still converts 15 degrees to radians
        } catch (e) {
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
        } catch (e) { console.error(`Error creating colors for Enemy ${this.shipTypeName}:`, e); this.p5FillColor = color(180); this.p5StrokeColor = color(255); } // Fallbacks
    }

    // -------------------------
    // --- Core Update Logic ---
    // -------------------------

    /** Updates the enemy's state machine, movement, and actions based on role. */
    update(system) {
        // Allow update to continue during jump-fade even if `destroyed` is set,
        // so we can complete the visual fade-back phase after logical destruction.
        if ((this.destroyed && !this._isJumpFading) || !system) return;

        // Always update system reference when update is called
        this.currentSystem = system;

        // Cache time values to avoid redundant calculations
        const deltaSeconds = deltaTime / 1000;
        const currentTime = millis();

        // -------------------------------------------------------------------------
        // PERFORMANCE OPTIMIZATION: On-Screen Check & Off-Screen Throttling
        // -------------------------------------------------------------------------
        // Calculate on-screen status (+margin) once per frame
        // Margin of 200px ensures we process entities just outside view
        // Calculate on-screen status with hysteresis to prevent rapid toggling at the edge
        if (system.player) {
            const distX = Math.abs(this.pos.x - system.player.pos.x);
            const distY = Math.abs(this.pos.y - system.player.pos.y);
            // Use global p5 width/height if available, otherwise fallback (defensive)
            const w = (typeof width === 'number') ? width : 1000;
            const h = (typeof height === 'number') ? height : 800;
            const limitX = w / 2;
            const limitY = h / 2;

            if (this._isOnScreen) {
                // Hysteresis: Harder to leave screen (must go 250px beyond edge)
                // Reduced from 300 to minimize AI mode flickering at screen edge
                this._isOnScreen = (distX < limitX + 250) && (distY < limitY + 250);
            } else {
                // Harder to enter screen (must come within 200px of edge)
                this._isOnScreen = (distX < limitX + 200) && (distY < limitY + 200);
            }
        } else {
            this._isOnScreen = false;
        }

        // For off-screen enemies: skip update periodically to save CPU.
        // We now throttle even in combat, UNLESS they are very close to the player (active threat).
        // 1500 is roughly (width/2 + 600), safe buffer for player interaction.
        const isNearPlayer = system.player && this.distanceTo(system.player) < 1500;

        // Ensure we don't skip the periodic scan frame
        // Replaced frame-based scan with time-based scan (every 0.5s)
        const scanIntervalSeconds = 0.5;
        if (this.scanTimer === undefined) this.scanTimer = Math.random() * scanIntervalSeconds;

        // Accumulate time (using global deltaTime if available, or approximating)
        const dtSec = (typeof deltaSeconds === 'number') ? deltaSeconds : (deltaTime / 1000);
        this.scanTimer += dtSec;

        this.isScanFrame = false;
        if (this.scanTimer >= scanIntervalSeconds) {
            this.scanTimer -= scanIntervalSeconds; // Keep remainder to prevent drift
            this.isScanFrame = true;
        }

        const forceUpdate = this._isOnScreen || isNearPlayer || this.isScanFrame;

        // [FIX] Reset persisted thrust on active frames so we capture fresh intent from AI
        if (forceUpdate) {
            this._persistedThrust = 0;
        }

        // --- TIMER UPDATES (Time-Critical) ---
        // We MUST update cooldowns and timers every frame, even if we skip the AI logic/physics step.
        // Otherwise, off-screen enemies experienced "Time Dilation" (3x slower cooldowns).

        // Update weapon cooldown
        this.fireCooldown -= deltaSeconds;

        if (typeof WeaponSystem !== 'undefined' && Number.isFinite(deltaSeconds)) {
            WeaponSystem.coolWeaponHeat(this, deltaSeconds);
        }

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

        // Regenerate shields
        const timeSinceShieldHit = currentTime - this.lastShieldHitTime;
        if (this.shield < this.maxShield && !this.destroyed && !this.shieldsDisabled && timeSinceShieldHit > this.shieldRechargeDelay) {
            // Use deltaSeconds for frame-rate independent recharge (shieldRechargeRate is per-second)
            const rechargeAmount = this.shieldRechargeRate * SHIELD_RECHARGE_RATE_MULTIPLIER * deltaSeconds;
            const prevShield = this.shield;
            const newShield = Math.min(this.maxShield, prevShield + rechargeAmount);
            if (prevShield === 0 && newShield > 0 && this._shieldWasZero) {
                // World-positioned cue for enemies
                if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player?.pos) {
                    soundManager.playWorldSound('shieldUp', this.pos.x, this.pos.y, player.pos, this);
                }
                this._shieldWasZero = false;
            }
            this.shield = newShield;
        }

        // Update barrier cooldown and duration
        if (this.barrierCooldown > 0) {
            this.barrierCooldown -= deltaSeconds;
        }
        if (this.isBarrierActive && this.barrierDurationTimer > 0) {
            this.barrierDurationTimer -= deltaSeconds;
            if (this.barrierDurationTimer <= 0) {
                this.isBarrierActive = false;
                this.barrierDamageReduction = 0;
                this.barrierDurationTimer = 0;
                if (typeof soundManager !== 'undefined') { soundManager.playSound('barrierDown', 1.0, this); }
            }
        }

        // Update cloak timers (only for enemies with cloak capability)
        if (this.cloakMaxDuration > 0) {
            if (this.isCloaked) {
                this.cloakDurationTimer -= deltaSeconds;
                if (this.cloakDurationTimer <= 0) {
                    if (typeof this.deactivateCloak === 'function') {
                        this.deactivateCloak();
                    } else {
                        this.isCloaked = false;
                        this.cloakCooldownTimer = this.cloakMaxCooldown;
                        this.cloakDurationTimer = 0;
                    }
                }
            }
            if (this.cloakCooldownTimer > 0) {
                this.cloakCooldownTimer -= deltaSeconds;
            }
        }

        // Update booster timers (only for enemies with booster capability)
        if (this.boostMaxDuration > 0) {
            if (this.isSpeedBursting) {
                this.boostDurationTimer -= deltaSeconds;

                // SUSTAINED THRUST: Like player, sustain boost speed with thrust each frame
                // This matches player.js line ~1467: "Actively bursting: sustain with normal thrust application"
                // NOTE: Use 1.0 multiplier like player does, not boostMultiplier (velocity already set high at activation)
                if (this.boostDurationTimer > 0) {
                    this.thrustForward(1.0, false); // Normal thrust, no particles during boost
                } else {
                    // Boost ended - deactivate
                    if (typeof this.deactivateBoost === 'function') {
                        this.deactivateBoost();
                    } else {
                        this.isSpeedBursting = false;
                        this.boostCooldownTimer = this.boostMaxCooldown;
                    }
                    // Start coasting phase like player.js line ~1477
                    const baseSpeed = this.baseMaxSpeed || this.maxSpeed || 5;
                    if (this.vel.magSq() > (baseSpeed * 1.01) ** 2) {
                        this.isCoastingFromBurst = true;
                    } else {
                        this.isCoastingFromBurst = false;
                    }
                }
            }
            if (this.boostCooldownTimer > 0) {
                this.boostCooldownTimer -= deltaSeconds;
            }
        }

        // Drag effect handling (part of physics, but dragTimer might need continuous update? 
        // updatePhysics handles drag, and we call it in the skipped block, so that's fine/redundant but safe)

        // --- END TIMER UPDATES ---

        if (!forceUpdate) {
            // Off-screen throttling: update AI only every ~50ms (was 3 frames)
            const offScreenInterval = 0.05;
            if (this.offScreenTimer === undefined) this.offScreenTimer = Math.random() * offScreenInterval;

            this.offScreenTimer += deltaSeconds;

            if (this.offScreenTimer < offScreenInterval) {
                // Skipping AI update - just maintain physics/thrust
                if (this._persistedThrust > 0) {
                    this.thrustForward(this._persistedThrust, false);
                }

                // Cap velocity to prevent runaway acceleration
                const speed = this.vel.mag();
                if (speed > this.maxSpeed) {
                    this.vel.mult(this.maxSpeed / speed);
                }

                // Persistent firing for off-screen enemies
                if (this._persistedFiring && this.fireCooldown <= 0 && this.isTargetValid(this.target)) {
                    this.performFiring(system, true, this._persistedFiring.distance, this._persistedFiring.angle);
                }

                this.updatePhysics();
                return;
            }

            // Reset timer (keep overflow for timing accuracy)
            this.offScreenTimer -= offScreenInterval;
        }
        // -------------------------------------------------------------------------

        // If we're in the jump-fade phase, progress the timer and handle two phases:
        //  - 'out': fade to white, then mark destroyed (logical removal)
        //  - 'in' : fade back to transparent, then finish fade and clear flags
        if (this._isJumpFading) {
            // Use separate durations for out/in phases for smoother timing
            const outDur = (this._jumpFadeOutDuration && this._jumpFadeOutDuration > 0) ? this._jumpFadeOutDuration : 0.35;
            const inDur = (this._jumpFadeInDuration && this._jumpFadeInDuration > 0) ? this._jumpFadeInDuration : 1.2;
            if (typeof this._jumpFadeTimer !== 'number') this._jumpFadeTimer = (this._jumpFadePhase === 'in') ? inDur : outDur;

            this._jumpFadeTimer -= deltaSeconds;
            if (this._jumpFadeTimer < 0) this._jumpFadeTimer = 0;

            // Freeze motion and actions while fading
            if (this.vel && typeof this.vel.set === 'function') this.vel.set(0, 0);
            this.isThrusting = false;
            this.currentWeapon = null;

            if (!this._jumpFadePhase) this._jumpFadePhase = 'out';

            if (this._jumpFadePhase === 'out' && this._jumpFadeTimer <= 0) {
                // Midpoint reached: perform logical destruction so game state can treat ship as destroyed
                this.destroyed = true;

                // Start fade-back phase using the slower in-duration
                this._jumpFadePhase = 'in';
                this._jumpFadeTimer = inDur;
            } else if (this._jumpFadePhase === 'in' && this._jumpFadeTimer <= 0) {
                // Fade-back complete: clear fading flags but keep `destroyed` true for logic
                this._isJumpFading = false;
                this._jumpFadePhase = undefined;
                this._jumpFadeTimer = undefined;
                // Note: the object remains `destroyed` so other systems can clean it up
            }

            return; // Skip normal updates while performing jump-fade
        }

        // [MOVED UP] Timer/Cooldown updates moved to start of method to avoid time dilation.


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

        // For police: Check for cargo when patrolling (not fighting)
        if (this.role === AI_ROLE.POLICE &&
            this.currentState !== AI_STATE.COLLECTING_CARGO &&
            this.currentState !== AI_STATE.APPROACHING &&
            this.currentState !== AI_STATE.ATTACK_PASS &&
            this.currentState !== AI_STATE.REPOSITIONING &&
            this.currentState !== AI_STATE.SNIPING &&
            this.cargoCollectionCooldown <= 0) {

            const cargoTarget = this.detectCargo(system);
            if (cargoTarget) {
                this.previousState = this.currentState;
                this.cargoTarget = cargoTarget;
                this.changeState(AI_STATE.COLLECTING_CARGO);
                CARGO_LOG(`Police ${this.shipTypeName} spotted cargo - moving to collect`);
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
                        if (this.currentState === AI_STATE.COLLECTING_CARGO) {
                            if (!this.updateCargoCollectionAI(system)) {
                                // When done collecting, return to patrol
                                this.changeState(this.previousState || AI_STATE.PATROLLING);
                            }
                        } else {
                            this.updatePoliceAI(system);
                        }
                        break;
                    case AI_ROLE.HAULER:
                        this.updateHaulerAI(system);
                        break;
                    case AI_ROLE.MINER:
                        this.updateMinerAI(system);
                        break;
                    case AI_ROLE.REPAIR:
                        this.updateRepairAI(system);
                        break;
                    case AI_ROLE.COMBAT:
                        this.updateCombatRoleAI(system); // New combat role AI
                        break;
                    case AI_ROLE.ALIEN:
                        this.updateCombatAI(system);
                        break;
                    case AI_ROLE.BOUNTY_HUNTER:
                        // Bounty hunters use hauler AI when leaving system after contract completion
                        if (this.currentState === AI_STATE.LEAVING_SYSTEM) {
                            this.updateHaulerAI(system);
                        } else {
                            this.updateCombatAI(system);
                        }
                        break;
                    case AI_ROLE.MISSIONARY:
                        this.updateMissionaryAI(system);
                        break;
                    default:
                        // Default behavior for unknown roles (frame-rate independent)
                        const defaultTimeScale = (typeof deltaTime === 'number') ? deltaTime / FRAME_TIME_BASELINE_MS : 1;
                        this.vel.mult(Math.pow(this.drag * 0.95, defaultTimeScale));
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
     * Serialize this Enemy to a plain object for saving.
     */
    toJSON() {
        return {
            id: this.id,
            shipTypeName: this.shipTypeName,
            role: this.role,
            faction: this.faction,
            pos: this.pos ? { x: this.pos.x, y: this.pos.y } : null,
            vel: this.vel ? { x: this.vel.x, y: this.vel.y } : null,
            hull: this.hull,
            maxHull: this.maxHull,
            shield: this.shield,
            maxShield: this.maxShield,
            angle: this.angle,
            currentState: this.currentState,
            shipDisplayName: this.displayName,
            gender: this.gender, // For voice selection
            cargoHold: Array.isArray(this.cargoHold) ? this.cargoHold.map(c => (typeof c.toJSON === 'function' ? c.toJSON() : c)) : [],
            weapons: Array.isArray(this.weapons) ? this.weapons.map(w => (w && w.name) ? w.name : w) : [],
            strokeColorValue: this.strokeColorValue,
            baseColorValue: this.baseColorValue,
            isWanted: !!this.isWanted,
            isAssassinationTarget: !!this.isAssassinationTarget,
            isAssassinationGuard: !!this.isAssassinationGuard,
            isMissionSpecific: !!this.isMissionSpecific,
            isEventEntity: !!this.isEventEntity,
            bountyTargetId: (this.bountyTarget && this.bountyTarget.id) ? this.bountyTarget.id : null
            , principalId: (this.principal && this.principal.id) ? this.principal.id : null
        };
    }

    /**
     * Reconstruct an Enemy from saved data.
     * Returns an Enemy instance or null on failure.
     */
    static fromJSON(data) {
        try {
            if (!data) return null;
            const x = data.pos?.x ?? 0;
            const y = data.pos?.y ?? 0;
            const shipType = data.shipTypeName || data.shipType || 'Krait';
            const role = data.role || null;

            // playerRef is not restored here; it will be set when the system calls enterSystem
            const enemy = new Enemy(x, y, null, shipType, role);

            // Basic numeric properties
            if (data.hull !== undefined) enemy.hull = data.hull;
            if (data.maxHull !== undefined) enemy.maxHull = data.maxHull;
            if (data.shield !== undefined) enemy.shield = data.shield;
            if (data.maxShield !== undefined) enemy.maxShield = data.maxShield;
            if (data.angle !== undefined) enemy.angle = data.angle;

            // Safety check: skip enemies with no hull (they were destroyed and shouldn't be restored)
            if (enemy.hull <= 0) {
                console.warn(`Enemy.fromJSON: Skipping destroyed enemy with hull=${enemy.hull}: ${data.shipTypeName}`);
                return null;
            }

            // Velocity
            if (data.vel && enemy.vel) { enemy.vel.x = data.vel.x || 0; enemy.vel.y = data.vel.y || 0; }

            // ID and identity
            enemy.id = data.id || (Date.now() + '_' + Math.floor(Math.random() * 1000));
            enemy.displayName = data.shipDisplayName || enemy.displayName;
            enemy.gender = data.gender || enemy.gender; // Restore gender for voice selection
            enemy.faction = data.faction || enemy.faction;
            enemy.isWanted = !!data.isWanted;
            enemy.isAssassinationTarget = !!data.isAssassinationTarget;
            enemy.isAssassinationGuard = !!data.isAssassinationGuard;
            enemy.isMissionSpecific = !!data.isMissionSpecific;
            enemy.isEventEntity = !!data.isEventEntity;

            // Store target IDs for relinking phase
            enemy._bountyTargetId = data.bountyTargetId || null;

            // Colors
            if (Array.isArray(data.baseColorValue)) enemy.baseColorValue = data.baseColorValue;
            if (Array.isArray(data.strokeColorValue)) enemy.strokeColorValue = data.strokeColorValue;

            // Cargo
            enemy.cargoHold = [];
            if (Array.isArray(data.cargoHold)) {
                if (typeof Cargo !== 'undefined' && typeof Cargo.fromJSON === 'function') {
                    try { enemy.cargoHold = data.cargoHold.map(cd => Cargo.fromJSON(cd)); } catch (e) { console.error('Error restoring cargoHold', e); }
                } else {
                    // Minimal fallback: keep raw objects
                    enemy.cargoHold = data.cargoHold.map(cd => cd);
                }
            }

            // Weapons: try to re-resolve by name
            if (Array.isArray(data.weapons) && data.weapons.length > 0 && typeof WEAPON_UPGRADES !== 'undefined') {
                enemy.weapons = [];
                for (const wname of data.weapons) {
                    if (!wname) continue;
                    const wdef = WEAPON_UPGRADES.find(w => w.name === wname);
                    if (wdef) enemy.weapons.push(wdef);
                }
                enemy.currentWeapon = enemy.weapons[0] || enemy.currentWeapon;
            }

            // State restore: assign state directly during deserialization.
            // Avoid calling `changeState` here because `currentSystem` may not
            // yet be assigned by the caller (StarSystem.fromJSON). State
            // entry logic will be invoked later during the system relink step
            // when the enemy's `currentSystem` is available.
            if (data.currentState !== undefined) {
                enemy.currentState = data.currentState;
            }

            // Recompute derived properties and colors (p5 must be ready for colors)
            try { enemy.calculateRadianProperties(); } catch (_) { }
            try { enemy.initializeColors(); } catch (_) { }

            // Preserve principal reference id for guards so relinker can restore it
            enemy._principalId = data.principalId || null;

            return enemy;
        } catch (e) {
            console.error('Enemy.fromJSON failed:', e, data);
            return null;
        }
    }

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

// Apply ability methods from enemyAbilities.js to Enemy prototype
if (typeof applyEnemyAbilityMethods === 'function') {
    applyEnemyAbilityMethods();
}

