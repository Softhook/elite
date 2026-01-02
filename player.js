// ****** player.js ******

/**
 * Player Configuration Constants
 * Centralized configuration for player-specific values
 */
const PLAYER_CONFIG = {
    // Physics
    DEFAULT_DRAG: 0.985,
    REVERSE_THRUST_MULTIPLIER: 0.6,

    // Speed Burst
    SPEED_BURST_COOLDOWN: 10000,
    SPEED_BURST_MULTIPLIER: 2,
    SPEED_BURST_DURATION: 1000,

    // Shield
    SHIELD_RECHARGE_DELAY: 3000, // 3 seconds delay after shield hit

    // Autopilot
    AUTOPILOT_ROTATION_RATE: 0.03,
    AUTOPILOT_THRUST: 0.25,
    AUTOPILOT_THROTTLE_MULTIPLIER: 0.8,
    AUTOPILOT_ROTATION_MULTIPLIER: 0.9,

    // Bodyguards
    MAX_BODYGUARDS: 3,

    // Starting values
    STARTING_CREDITS: 1000
};

/**
 * Player class - represents the player's ship and state
 * 
 * Organization:
 * 1. Constructor & Initialization
 * 2. Ship Definition & Configuration
 * 3. Movement & Physics
 * 4. Combat & Weapons
 * 5. Damage & Health
 * 6. Mission Management
 * 7. Cargo & Credits
 * 8. Autopilot
 * 9. Faction & Status
 * 10. Bodyguard Management
 * 11. Personal Records
 * 12. Drawing & Rendering
 * 13. Save/Load
 */
class Player {
    // =========================================================================
    // SECTION 1: CONSTRUCTOR & INITIALIZATION
    // =========================================================================

    /**
     * Creates a Player instance
     * @param {string} [shipTypeName="Sidewinder"] - The type name of the ship to use
     */
    constructor(shipTypeName = "Sidewinder") {
        // Resolve and validate ship definition
        const shipDef = this._resolveShipDefinition(shipTypeName);

        // Runtime flag to allow safe player detection without relying on `instanceof Player`
        this.isPlayer = true;

        // Initialize all properties in logical groups
        this._initPhysicsProperties(shipDef);
        this._initCombatProperties(shipDef);
        this._initStatusProperties();
        this._initAutopilotProperties();
        this._initEffectProperties();
        this._initRecordProperties();

        // Apply stat bonuses from default upgrades and ensure full health
        this.recalculateStats();
        this.hull = this.maxHull;
        this.shield = this.maxShield;
    }

    /**
     * Resolves and validates the ship definition
     * @param {string} shipTypeName - Ship type to resolve
     * @returns {Object} Valid ship definition
     * @private
     */
    _resolveShipDefinition(shipTypeName) {
        this.shipTypeName = shipTypeName;
        let shipDef = (typeof SHIP_DEFINITIONS !== 'undefined') ? SHIP_DEFINITIONS[shipTypeName] : null;

        if (!shipDef) {
            console.error(`FATAL: Ship definition "${shipTypeName}" not found! Defaulting to Sidewinder.`);
            this.shipTypeName = "Sidewinder";
            shipDef = (typeof SHIP_DEFINITIONS !== 'undefined') ? SHIP_DEFINITIONS["Sidewinder"] : null;
        }

        // Store ship definition on instance for recalculateStats and other methods
        this.shipDefinition = shipDef;

        // Initialize installed upgrades tracking (all start at level 0)
        this.installedUpgrades = { armor: 0, engine: 0, cargo: 0, hardpoints: 0, shield: 0, cloak: 0, booster: 0 };
        this._applyDefaultUpgrades(shipDef);

        return shipDef;
    }

    /**
     * Applies default upgrades from ship definition
     * @param {Object} shipDef 
     * @private
     */
    _applyDefaultUpgrades(shipDef) {
        if (shipDef && Array.isArray(shipDef.upgrades) && typeof SHIP_UPGRADES !== 'undefined') {
            shipDef.upgrades.forEach(upgradeName => {
                const upgDef = SHIP_UPGRADES.find(u => u.name === upgradeName);
                if (upgDef) {
                    this.installedUpgrades[upgDef.type] = upgDef.level;
                    // Note: We don't call recalculateStats here because it might not be ready during constructor,
                    // but applyShipDefinition calls it explicitly after this.
                }
            });
        }
    }

    /**
     * Initializes physics-related properties
     * @param {Object} shipDef - Ship definition object
     * @private
     */
    _initPhysicsProperties(shipDef) {
        // Position & Movement
        this.pos = createVector(0, 0);
        this.vel = createVector(0, 0);
        this.angle = 0; // Current facing angle (RADIANS, 0 = right)
        this.drag = PLAYER_CONFIG.DEFAULT_DRAG;
        this.altitude = 0; // Surface mode altitude


        // Cached math constants for performance
        this._TWO_PI = TWO_PI;
        this._HALF_PI = HALF_PI;
        this._PI = PI;

        // Ship stats from definition
        this.size = shipDef.size;
        this.maxSpeed = shipDef.baseMaxSpeed;
        this.baseMaxSpeed = shipDef.baseMaxSpeed;
        this.thrustForce = shipDef.baseThrust;
        this.rotationSpeed = shipDef.baseTurnRate; // Already in RADIANS
        this.maxHull = shipDef.baseHull;
        this.cargoCapacity = shipDef.cargoCapacity;

        // Movement state flags
        this.isThrusting = false;
        this.isReverseThrusting = false;
        this.isStrafing = false;

        // Speed burst system (now upgrade-based)
        this.isSpeedBursting = false;
        this.speedBurstEnd = 0;
        this.isCoastingFromBurst = false;

        // Booster upgrade properties (set by recalculateStats)
        this.boostMaxDuration = 0;
        this.boostMaxCooldown = 0;
        this.boostMultiplier = 0;
        this.boostDurationTimer = 0;
        this.boostCooldownTimer = 0;

        // Thrust particles
        this.thrustManager = new ThrustManager();

        // Cached vectors for performance (lazy initialized)
        this._tempVector = null;
        this._tempThrustPos = null;
    }

    /**
     * Initializes combat-related properties
     * @param {Object} shipDef - Ship definition object
     * @private
     */
    _initCombatProperties(shipDef) {
        // Health
        this.hull = this.maxHull;
        this.destroyed = false;
        this.isDying = false;
        this.exploding = false;
        this.explosionStartTime = 0;

        // Shield system
        this.maxShield = shipDef.baseShield || 0;
        this.shield = this.maxShield;
        this.shieldRechargeRate = shipDef.shieldRecharge || 0;
        this.shieldRechargeDelay = PLAYER_CONFIG.SHIELD_RECHARGE_DELAY;
        this.lastShieldHitTime = 0;
        this.shieldHitTime = 0;
        this._shieldWasZero = (this.shield <= 0);

        // Weapons
        this.weapons = [];
        // Use armament array length as base weapon slots since ships don't have a weaponSlots property
        this.weaponSlots = (shipDef.armament && shipDef.armament.length) || 1;
        this.maxWeapons = this.weaponSlots;
        this.weaponIndex = 0;
        this.weaponHeat = {};
        this.currentWeapon = (typeof WEAPON_UPGRADES !== 'undefined')
            ? (WEAPON_UPGRADES.find(w => w.name === "Pulse Laser") || WEAPON_UPGRADES[0])
            : null;
        this.fireRate = this.currentWeapon?.fireRate || 0.5;
        this.fireCooldown = 0;

        // Targeting
        this.target = null;
        this.lastTurretFiringAngle = null;

        // Active deployables
        this.activeMines = [];

        // Barrier system
        this.isBarrierActive = false;
        this.barrierDurationTimer = 0;
        this.barrierDamageReduction = 0;
        this.barrierColor = null;

        // Kill tracking
        this.kills = 0;
        this.factionKills = {
            POLICE: 0,
            MILITARY: 0,
            IMPERIAL: 0,
            SEPARATIST: 0
        };

        // Prestige tracking (for faction rank progression - Imperial, Separatist, Military)
        this.factionPrestige = {
            POLICE: 0,
            MILITARY: 0,
            IMPERIAL: 0,
            SEPARATIST: 0
        };

        // Damage tracking
        this.lastDamageTime = 0;
        this.lastAttacker = null;
        this.lastAttackTime = 0;
    }

    /**
     * Initializes status-related properties
     * @private
     */
    _initStatusProperties() {
        // Economy
        this.credits = PLAYER_CONFIG.STARTING_CREDITS;
        this.cargo = [];

        // Secret base storage (separate from normal station storage)
        this.secretStorage = [];

        // System reference
        this.currentSystem = null;

        // Mission
        this.activeMission = null;

        // Legal status
        this.isWanted = false;
        this.isPolice = false;
        this.hasBeenPolice = false;

        // Faction
        this.playerFaction = null;
        this.hasJoinedFaction = false;
        this.factionShip = null;

        // Bodyguards
        this.activeBodyguards = [];
        this.bodyguardLimit = PLAYER_CONFIG.MAX_BODYGUARDS;

        // Navigation
        this.showSecretBaseNavigation = false;
        this._cachedNavigation = null;
    }

    /**
     * Initializes autopilot-related properties
     * @private
     */
    _initAutopilotProperties() {
        this.autopilotEnabled = false;
        this.autopilotTarget = null;
        this.autopilotPlanetIndex = -1;
        this.autopilotThrottleMultiplier = PLAYER_CONFIG.AUTOPILOT_THROTTLE_MULTIPLIER;
        this.autopilotRotationMultiplier = PLAYER_CONFIG.AUTOPILOT_ROTATION_MULTIPLIER;

        // Cycle tracking
        this.autopilotVisitedTargets = new Set();
        this._autopilotWillDisableOnNextToggle = false;
        this._autopilotPlanetSeenIndices = new Set();
        this._autopilotPlanetStartIndex = null;
    }

    /**
     * Initializes effect-related properties (debuffs, environmental effects)
     * @private
     */
    _initEffectProperties() {
        // Nebula effects
        this.shieldsDisabled = false;
        this.weaponsDisabled = false;
        this.inNebula = false;

        // Tangle weapon effects
        this.dragMultiplier = 1.0;
        this.dragEffectTimer = 0;
        this.tangleEffectTime = 0;
        this.rotationBlockMultiplier = 1.0;
        this.rotationBlockTimer = 0;

        // Cloaking device
        this.isCloaked = false;
        this.cloakDurationTimer = 0;
        this.cloakCooldownTimer = 0;
        this.cloakMaxDuration = 0;
        this.cloakMaxCooldown = 0;
        this.cloakActivatedTime = 0;

        // Visual effect tracking
        this.lastBeam = null;
        this.lastForceWave = null;
    }

    /**
     * Initializes personal record tracking properties
     * @private
     */
    _initRecordProperties() {
        this.shipsDestroyed = [];
        this.systemsVisited = [];
        this.stationsTraded = [];
        this.currentSessionTradedLocations = new Set();
        this.factionsJoined = [];
        this.eliteStatusChanges = [];
        this.missionsCompleted = [];
        this.wantedStatusChanges = [];
        this.shipsPurchased = [];
        this.weaponsUpgraded = [];
    }

    // =========================================================================
    // SECTION 2: MISSION MANAGEMENT
    // =========================================================================

    /**
     * Accepts a mission from the station's mission board
     * @param {Object|Mission} missionInput - The mission data object or Mission instance
     * @returns {boolean} Success status
     */
    acceptMission(missionInput) {
        MISSION_LOG("--- Player.acceptMission() called ---");

        // Check if player already has an active mission
        if (this.activeMission) {
            console.warn("Cannot accept mission: Player already has an active mission");
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage("Cannot accept mission: You already have an active mission", [255, 100, 100]);
            }
            return false;
        }

        // Validate mission input
        if (!missionInput) {
            console.error("acceptMission: No mission input provided");
            return false;
        }

        MISSION_LOG(`   Attempting to accept mission: ${missionInput.title}`);

        // Handle both Mission objects and mission data objects
        if (missionInput instanceof Mission) {
            // Already a Mission object, use it directly
            this.activeMission = missionInput;
            MISSION_LOG(`   Using existing Mission object: ${this.activeMission.title}`);
        } else {
            // Plain mission data object, create new Mission
            try {
                this.activeMission = new Mission(missionInput);
                MISSION_LOG(`   Mission object created: ${this.activeMission.title}`);
            } catch (e) {
                console.error("   Failed to create Mission object:", e);
                this.activeMission = null;
                return false;
            }
        }

        MISSION_LOG(`   BEFORE activate() call: Mission Title = ${this.activeMission?.title}, Status = ${this.activeMission?.status}`);

        try {
            MISSION_LOG(`   >>> Calling this.activeMission.activate() <<<`);
            const activateResult = this.activeMission.activate(); // <<< EXECUTE THE STATUS CHANGE
            MISSION_LOG(`   <<< Finished this.activeMission.activate() >>>`);

            // Check if activation failed (e.g., not enough cargo space)
            if (activateResult === false) {
                console.error("   Mission activation failed (returned false)");
                this.activeMission = null;
                return false;
            }
        } catch (e) {
            console.error("   !!! ERROR during mission.activate():", e);
            this.activeMission = null; // Clear mission if activation failed critically
            return false; // Indicate failure
        }

        MISSION_LOG(`   AFTER activate() call: Mission Status = ${this.activeMission?.status}`); // Check status immediately after
        // --- End Activation ---

        if (this.activeMission.status === 'Active') {
            MISSION_LOG(`--- Mission "${this.activeMission.title}" ACCEPTED & ACTIVATED successfully. ---`);
            if (typeof saveGame === 'function') saveGame();
            // Play mission accept sound
            if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
                soundManager.playSound('missionAccept');
            }
            return true; // Success
        } else {
            // This case should ideally not be reached if activate() works
            console.error(`--- Mission "${this.activeMission?.title}" ACCEPTED but FAILED TO ACTIVATE (Status: ${this.activeMission?.status}). ---`);
            this.activeMission = null; // Clear inconsistent mission
            return false; // Indicate failure
        }
    }

    /** Removes up to `quantity` units of `commodityName` from cargo */
    removeCargo(commodityName, quantity) {
        if (!commodityName || quantity <= 0) return false;
        const idx = this.cargo.findIndex(i => i.name === commodityName);
        if (idx === -1) return false;
        const item = this.cargo[idx];
        if (item.quantity < quantity) return false;
        item.quantity -= quantity;
        if (item.quantity === 0) this.cargo.splice(idx, 1);
        return true;
    }

    /** Abandon the active mission and strip its cargo */
    abandonMission() {
        if (!this.activeMission) return false;
        const type = this.activeMission.cargoType;
        const qty = this.activeMission.cargoQuantity;
        if (type && qty > 0) {
            this.removeCargo(type, qty);
        }
        this.activeMission.fail();
        this.activeMission = null;
        return true;
    }

    /** Checks if the player has a specific quantity of a commodity. */
    hasCargo(cargoType, quantity) {
        MISSION_LOG(`--- Player.hasCargo Check --- Type: ${cargoType}, Qty Needed: ${quantity}`); // Log input
        if (!cargoType || quantity <= 0) { MISSION_LOG("   Result: false (Invalid input)"); return false; }
        const item = this.cargo.find(i => i?.name === cargoType);
        MISSION_LOG(`   Found item in cargo:`, item); // Log the found item object (or undefined)
        // Ensure we always return a boolean, not undefined
        const result = !!(item && item.quantity >= quantity);
        MISSION_LOG(`   Result: ${result}`); // Log the boolean result
        return result;
    }

    /**
     * Completes the currently active mission.
     * Checks location/cargo ONLY if required by the mission type (e.g., Delivery).
     * Bounties can be completed anywhere once targets are met (if auto-complete is intended).
     * @param {StarSystem} [currentSystem] - The system the player is currently in (required for station-based completion).
     * @param {Station} [currentStation] - The station the player is docked at (required for station-based completion).
     */
    completeMission(currentSystem, currentStation) { // Keep params for potential station use
        MISSION_LOG("--- Attempting Player.completeMission() ---");
        if (!this.activeMission) { console.warn("Complete failed: No active mission."); return false; }

        MISSION_LOG(`   Checking Mission: ${this.activeMission.title}, Status: ${this.activeMission.status}`);
        // Log location only if provided (it won't be for auto-complete)
        if (currentSystem && currentStation) {
            MISSION_LOG(`   Current Location: ${currentStation.name} (${currentSystem.name})`);
        } else {
            MISSION_LOG(`   Completion triggered automatically (in space).`);
        }


        // --- Condition Checks ---
        let canComplete = false;

        if (this.activeMission.status === 'Active' || this.activeMission.status === 'Completable') { // Allow either status initially

            // --- DELIVERY MISSIONS (REQUIRE Location & Cargo) ---
            if (this.activeMission.type === MISSION_TYPE.DELIVERY_LEGAL || this.activeMission.type === MISSION_TYPE.DELIVERY_ILLEGAL) {
                // These *strictly* require the location context
                if (!currentSystem || !currentStation) {
                    console.warn("   Complete failed: Delivery missions require docking at the destination.");
                    return false; // Cannot complete delivery without station context
                }
                // Check location
                let isAtDestination = (currentSystem.name === this.activeMission.destinationSystem);
                MISSION_LOG(`   Delivery Check: Is at destination? ${isAtDestination}`);
                if (!isAtDestination) {
                    console.warn("   Complete failed: Not at destination station.");
                    return false;
                }
                // Check cargo
                let hasGoods = this.hasCargo(this.activeMission.cargoType, this.activeMission.cargoQuantity);
                MISSION_LOG(`   Delivery Check: Has required cargo (${this.activeMission.cargoQuantity}t ${this.activeMission.cargoType})? ${hasGoods}`);
                if (!hasGoods) {
                    console.warn("   Complete failed: Missing required cargo!");
                    return false;
                }
                canComplete = true; // All delivery checks passed
                console.warn("   canComplete!");
            }

            // --- BOUNTY MISSIONS (Check progress - Location check removed for auto-complete) ---
            else if (this.activeMission.type === MISSION_TYPE.BOUNTY_PIRATE) {
                MISSION_LOG(`   Bounty Check: Progress ${this.activeMission.progressCount}/${this.activeMission.targetCount}`);
                if (this.activeMission.progressCount >= this.activeMission.targetCount) {
                    MISSION_LOG("   Bounty Check: Target count met. Allowing completion.");
                    canComplete = true; // Allow completion anywhere once count is met
                } else {
                    console.warn("   Complete failed: Bounty target count not met."); return false;
                }
            }

            // --- NEW: COP KILLER BOUNTY MISSIONS (Check progress - Location check removed for auto-complete) ---
            else if (this.activeMission.type === MISSION_TYPE.BOUNTY_POLICE) {
                MISSION_LOG(`   Bounty Check (Police): Progress ${this.activeMission.progressCount}/${this.activeMission.targetCount}`);
                if (this.activeMission.progressCount >= this.activeMission.targetCount) {
                    MISSION_LOG("   Bounty Check (Police): Target count met. Allowing completion.");
                    canComplete = true; // Allow completion anywhere once count is met
                } else {
                    console.warn("   Complete failed: Bounty (Police) target count not met."); return false;
                }
            }
            // --- NEW: ALIEN BOUNTY MISSIONS (Check progress - Location check removed for auto-complete) ---
            else if (this.activeMission.type === MISSION_TYPE.BOUNTY_ALIEN) {
                MISSION_LOG(`   Bounty Check (Alien): Progress ${this.activeMission.progressCount}/${this.activeMission.targetCount}`);
                if (this.activeMission.progressCount >= this.activeMission.targetCount) {
                    MISSION_LOG("   Bounty Check (Alien): Target count met. Allowing completion.");
                    canComplete = true; // Allow completion anywhere once count is met
                } else {
                    console.warn("   Complete failed: Bounty (Alien) target count not met."); return false;
                }
            }

            // --- ASSASSINATION MISSIONS (Check if target was destroyed) ---
            else if (this.activeMission.type === MISSION_TYPE.ASSASSINATION) {
                MISSION_LOG(`   Assassination Check: Progress ${this.activeMission.progressCount}/${this.activeMission.targetCount || 1}`);
                // Assassination missions are auto-completed when the target is destroyed (via mission.update)
                // But we also allow manual completion if progressCount >= 1
                if (this.activeMission.progressCount >= 1 || this.activeMission.status === 'Completable') {
                    MISSION_LOG("   Assassination Check: Target eliminated. Allowing completion.");
                    canComplete = true;
                } else {
                    console.warn("   Complete failed: Assassination target not yet eliminated.");
                    return false;
                }
            }

            // --- SABOTAGE MISSIONS (Check if target object was destroyed) ---
            else if (this.activeMission.type === MISSION_TYPE.SABOTAGE) {
                MISSION_LOG(`   Sabotage Check: Progress ${this.activeMission.progressCount}, Status ${this.activeMission.status}`);
                // Sabotage missions are auto-completed when the target object is destroyed (via mission.update)
                // But we also allow manual completion if status is 'Completable' or progressCount >= 1
                if (this.activeMission.progressCount >= 1 || this.activeMission.status === 'Completable') {
                    MISSION_LOG("   Sabotage Check: Target destroyed. Allowing completion.");
                    canComplete = true;
                } else {
                    console.warn("   Complete failed: Sabotage target not yet destroyed.");
                    return false;
                }
            }

            // === FACTION KILL MISSIONS (Imperial Elimination/Strike, Separatist Raid/Strike, Military Extermination/Strike) ===
            else if (FACTION_KILL_TYPES && FACTION_KILL_TYPES.has(this.activeMission.type)) {
                MISSION_LOG(`   Faction Kill Check: Progress ${this.activeMission.progressCount}/${this.activeMission.targetCount}`);
                if (this.activeMission.progressCount >= this.activeMission.targetCount) {
                    MISSION_LOG("   Faction Kill Check: Target count met. Allowing completion.");
                    canComplete = true;
                } else {
                    console.warn("   Complete failed: Faction kill target count not met.");
                    return false;
                }
            }

            // === FACTION PATROL MISSIONS (Imperial Patrol, Military Defense) - require scans ===
            else if (FACTION_PATROL_TYPES && FACTION_PATROL_TYPES.has(this.activeMission.type)) {
                MISSION_LOG(`   Faction Patrol Check: Progress ${this.activeMission.progressCount}/${this.activeMission.targetCount}`);
                if (this.activeMission.progressCount >= this.activeMission.targetCount) {
                    MISSION_LOG("   Faction Patrol Check: Scan count met. Allowing completion.");
                    canComplete = true;
                } else {
                    console.warn("   Complete failed: Faction patrol scan count not met.");
                    return false;
                }
            }

            // === FACTION SABOTAGE MISSIONS (Imperial/Separatist/Military Sabotage) ===
            else if (FACTION_SABOTAGE_TYPES && FACTION_SABOTAGE_TYPES.has(this.activeMission.type)) {
                MISSION_LOG(`   Faction Sabotage Check: Progress ${this.activeMission.progressCount}, Status ${this.activeMission.status}`);
                if (this.activeMission.progressCount >= 1 || this.activeMission.status === 'Completable') {
                    MISSION_LOG("   Faction Sabotage Check: Target destroyed. Allowing completion.");
                    canComplete = true;
                } else {
                    console.warn("   Complete failed: Faction sabotage target not yet destroyed.");
                    return false;
                }
            }

            // === FACTION DELIVERY MISSIONS (Separatist Supply) ===
            else if (FACTION_DELIVERY_TYPES && FACTION_DELIVERY_TYPES.has(this.activeMission.type)) {
                // These require the location context like normal deliveries
                if (!currentSystem || !currentStation) {
                    console.warn("   Complete failed: Faction delivery requires docking at destination.");
                    return false;
                }
                // Check we're in the correct system (if specified)
                if (this.activeMission.destinationSystem && currentSystem.name !== this.activeMission.destinationSystem) {
                    console.warn("   Complete failed: Not at destination system.");
                    return false;
                }
                // Check we're at the correct station (if specified)
                if (this.activeMission.destinationStation && currentStation.name !== this.activeMission.destinationStation) {
                    console.warn("   Complete failed: Not at destination station.");
                    return false;
                }
                // Check cargo if required
                if (this.activeMission.cargoType && this.activeMission.cargoQuantity > 0) {
                    if (!this.hasCargo(this.activeMission.cargoType, this.activeMission.cargoQuantity)) {
                        console.warn("   Complete failed: Missing required cargo.");
                        return false;
                    }
                }
                MISSION_LOG("   Faction Delivery Check: All conditions met. Allowing completion.");
                canComplete = true;
            }

            // --- Add other mission type checks here later ---
            else {
                console.warn(`   Complete failed: Mission type ${this.activeMission.type} conditions not handled.`);
                return false;
            }

        } else { // End status check 'Active'/'Completable'
            console.warn(`   Complete failed: Mission status is '${this.activeMission.status}'.`);
            return false;
        }


        // --- Proceed with Completion ---
        if (canComplete) {
            MISSION_LOG(`   Completing mission: ${this.activeMission.title}`);



            let reward = this.activeMission.rewardCredits; let completedTitle = this.activeMission.title;

            // Remove cargo ONLY for delivery missions
            if (this.activeMission.type === MISSION_TYPE.DELIVERY_LEGAL || this.activeMission.type === MISSION_TYPE.DELIVERY_ILLEGAL) {
                MISSION_LOG(`   Removing cargo: ${this.activeMission.cargoQuantity}t ${this.activeMission.cargoType}`);
                this.removeCargo(this.activeMission.cargoType, this.activeMission.cargoQuantity);
            }

            MISSION_LOG(`   Calling addCredits(${reward}). Current Credits: ${this.credits}`);
            this.addCredits(reward);
            MISSION_LOG(`   Credits after addCredits call: ${this.credits}`);

            this.activeMission.status = 'Completed'; // Mark internal status (though we clear player ref next)

            // Record mission completion in personal record
            this.recordMissionCompletion(this.activeMission);

            // Award faction prestige if mission has a prestige reward
            if (this.activeMission.prestigeReward && this.activeMission.requiredFaction) {
                MISSION_LOG(`   Awarding ${this.activeMission.prestigeReward} prestige to ${this.activeMission.requiredFaction}`);
                this.addFactionPrestige(this.activeMission.requiredFaction, this.activeMission.prestigeReward);
            }

            if (this.activeMission && typeof uiManager !== 'undefined') {
                uiManager.inactiveMissionIds.add(this.activeMission.id);
                MISSION_LOG(`Added mission ID ${this.activeMission.id} to inactive missions list`);
            }

            this.activeMission = null; // Clear active mission from player
            MISSION_LOG(`   activeMission is now: ${this.activeMission}`);

            // --- Provide feedback ---
            //alert(`Mission Complete!\n${completedTitle}\nReward: ${reward} Credits`); // Replace with better UI message later
            MISSION_LOG(`!!! Mission Complete: ${completedTitle} | Reward: ${reward}cr !!!`);
            uiManager.addMessage(`Mission Complete: ${completedTitle} | Reward: ${reward}cr`);

            // Play mission complete sound
            if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
                soundManager.playSound('missionComplete');
            }

            if (typeof saveGame === 'function') saveGame(); // Save progress
            return true; // Success
        }

        console.warn("Player.completeMission() reached end without completing.");
        return false; // Indicate failure if somehow canComplete wasn't true
    } // --- End completeMission Method ---

    // =========================================================================
    // SECTION 3: SHIP DEFINITION & CONFIGURATION
    // =========================================================================

    /** Applies base stats and calculates Radian properties. */
    applyShipDefinition(shipTypeName) {
        this.shipTypeName = shipTypeName;
        const def = SHIP_DEFINITIONS[shipTypeName];
        if (!def) {
            console.error("Unknown ship type:", shipTypeName);
            return;
        }
        // Copy all relevant stats
        this.shipDefinition = def;
        this.size = def.size;
        this.maxSpeed = def.baseMaxSpeed;
        this.thrustForce = def.baseThrust;
        this.rotationSpeed = def.baseTurnRate; // Direct radian value
        this.maxHull = def.baseHull;
        this.hull = def.baseHull;
        this.cargoCapacity = def.cargoCapacity;
        // Use armament array length as base weapon slots since ships don't have a weaponSlots property
        this.weaponSlots = (def.armament && def.armament.length) || 1;
        this.maxWeapons = this.weaponSlots; // Sync maxWeapons for UI compatibility

        // Update shield properties
        this.maxShield = def.baseShield || 0;
        this.shield = this.maxShield;
        this.shieldRechargeRate = def.shieldRecharge || 0;

        // Load weapons from ship definition
        this.loadWeaponsFromShipDefinition(shipTypeName);

        // Recalculate any derived properties
        this.installedUpgrades = { armor: 0, engine: 0, cargo: 0, hardpoints: 0, shield: 0, cloak: 0, booster: 0 }; // Reset upgrades on ship change
        this._applyDefaultUpgrades(def); // Apply default upgrades from definition
        this.recalculateStats(); // Apply bonuses from default upgrades
        this.hull = this.maxHull; // Full hull for new ship
        this.shield = this.maxShield; // Full shield for new ship
        this.calculateRadianProperties && this.calculateRadianProperties();
        this.updateShipVisual && this.updateShipVisual();
    }

    /**
     * Applies a ship upgrade and recalculates stats.
     * @param {string} type - 'armor', 'engine', 'cargo', 'hardpoints'
     * @param {number} level - 1, 2, 3
     */
    applyUpgrade(type, level) {
        if (!this.installedUpgrades) this.installedUpgrades = { armor: 0, engine: 0, cargo: 0, hardpoints: 0, shield: 0, cloak: 0, booster: 0 };

        const oldMaxHull = this.maxHull;
        const oldMaxShield = this.maxShield;

        // Update state
        this.installedUpgrades[type] = level;

        // Apply effects
        this.recalculateStats();

        // For Armor upgrades, increase current hull by the gained amount
        if (type === 'armor') {
            const hullDiff = this.maxHull - oldMaxHull;
            if (hullDiff > 0) {
                this.hull += hullDiff;
            }
        }

        // For Shield upgrades, increase current shield by the gained amount
        if (type === 'shield') {
            const shieldDiff = this.maxShield - oldMaxShield;
            if (shieldDiff > 0) {
                this.shield += shieldDiff;
            }
        }

        // Feedback
        if (typeof uiManager !== 'undefined') {
            const upgName = SHIP_UPGRADES.find(u => u.type === type && u.level === level)?.name || "Upgrade";
            uiManager.addMessage(`Installed: ${upgName}`, [100, 255, 100]);
        }
    }

    /**
     * Recalculates ship stats based on base definition and active upgrades.
     */
    recalculateStats() {
        const def = this.shipDefinition;
        if (!def) return;

        // Reset to base
        this.maxHull = def.baseHull;
        this.baseMaxSpeed = def.baseMaxSpeed;
        this.thrustForce = def.baseThrust;
        this.cargoCapacity = def.cargoCapacity;
        // Weapon slots are tricky, we handle them carefully below

        // 1. Armor Upgrades
        if (this.installedUpgrades.armor > 0) {
            const upg = SHIP_UPGRADES.find(u => u.type === 'armor' && u.level === this.installedUpgrades.armor);
            if (upg) {
                this.maxHull += upg.hullBonus;
            }
        }
        // Clamp current hull to new max (don't heal implicitly, but cap it)
        this.hull = Math.min(this.hull, this.maxHull);

        // 2. Engine Upgrades
        if (this.installedUpgrades.engine > 0) {
            const upg = SHIP_UPGRADES.find(u => u.type === 'engine' && u.level === this.installedUpgrades.engine);
            if (upg) {
                this.baseMaxSpeed *= upg.speedMultiplier;
                this.thrustForce *= upg.thrustMultiplier;
            }
        }
        // Update derived speed (drag/boost rely on baseMaxSpeed, usually recalculated in update but good to set)
        this.maxSpeed = this.baseMaxSpeed;


        // 3. Cargo Upgrades
        if (this.installedUpgrades.cargo > 0) {
            const upg = SHIP_UPGRADES.find(u => u.type === 'cargo' && u.level === this.installedUpgrades.cargo);
            if (upg) {
                this.cargoCapacity += upg.cargoBonus;
            }
        }

        // 4. Hardpoint Upgrades (Weapon Slots)
        let totalSlots = (def.armament && def.armament.length) || 1; // Base slots from armament array
        if (this.installedUpgrades.hardpoints > 0) {
            const upg = SHIP_UPGRADES.find(u => u.type === 'hardpoints' && u.level === this.installedUpgrades.hardpoints);
            if (upg) {
                totalSlots += upg.bonusSlots;
            }
        }

        // Apply slot changes
        if (this.weaponSlots !== totalSlots) {
            this.maxWeapons = totalSlots; // Sync maxWeapons with totalSlots for UI compatibility
            this.weaponSlots = totalSlots;
            // Resize weapons array if needed
            if (this.weapons.length < totalSlots) {
                // Expand
                while (this.weapons.length < totalSlots) {
                    this.weapons.push(null);
                }
            }
            // Note: We don't truncate on downgrade here to avoid deleting items accidentally.
            // If we wanted to enforce strict limits on downgrade, we'd need complex logic to decide what to drop.
        }

        // 5. Shield Upgrades
        this.maxShield = def.baseShield || 100; // Reset to base
        if (this.installedUpgrades.shield > 0) {
            const upg = SHIP_UPGRADES.find(u => u.type === 'shield' && u.level === this.installedUpgrades.shield);
            if (upg) {
                this.maxShield += upg.shieldBonus;
            }
        }
        // Clamp current shield
        this.shield = Math.min(this.shield, this.maxShield);

        // 6. Cloaking Device
        if (this.installedUpgrades.cloak > 0) {
            const upg = SHIP_UPGRADES.find(u => u.type === 'cloak' && u.level === this.installedUpgrades.cloak);
            if (upg) {
                this.cloakMaxDuration = upg.cloakDuration;
                this.cloakMaxCooldown = upg.cloakCooldown;
            }
        } else {
            this.cloakMaxDuration = 0;
            this.cloakMaxCooldown = 0;
        }

        // 7. Booster
        if (this.installedUpgrades.booster > 0) {
            const upg = SHIP_UPGRADES.find(u => u.type === 'booster' && u.level === this.installedUpgrades.booster);
            if (upg) {
                this.boostMultiplier = upg.boostMultiplier;
                this.boostMaxDuration = upg.boostDuration;
                this.boostMaxCooldown = upg.boostCooldown;
            }
        } else {
            this.boostMultiplier = 0;
            this.boostMaxDuration = 0;
            this.boostMaxCooldown = 0;
        }
    }

    /** Loads weapons based on ship's standard armament */
    loadWeaponsFromShipDefinition(shipTypeName) {
        const shipDef = SHIP_DEFINITIONS[shipTypeName];

        // Initialize weapons array with pre-allocated size
        this.weapons = [];

        if (shipDef?.armament?.length) {
            // Pre-allocate array size for better performance
            const armament = shipDef.armament;
            const armamentLength = armament.length;
            this.weapons.length = armamentLength;

            // Load each weapon from ship's armament
            for (let i = 0; i < armamentLength; i++) {
                const weaponDef = WEAPON_UPGRADES.find(w => w.name === armament[i]);
                if (weaponDef) {
                    // Shallow clone is sufficient for most cases
                    this.weapons[i] = { ...weaponDef };
                } else {
                    this.weapons[i] = null; // Keep array structure
                }
            }
        }

        // Fallback if no valid weapons were found
        if (this.weapons.length === 0) {
            // Add default pulse laser if no weapons defined
            const defaultWeapon = WEAPON_UPGRADES.find(w => w.name === "Pulse Laser");
            if (defaultWeapon) {
                this.weapons.push({ ...defaultWeapon });
            } else {
                // Ultimate fallback
                this.weapons.push({
                    name: "Pulse Laser",
                    type: "projectile",
                    damage: 8,
                    color: [255, 0, 0],
                    fireRate: 0.5,
                    price: 0,
                    desc: "Basic energy weapon"
                });
            }
        }

        // Set current weapon to first one
        this.setCurrentWeapon(0);
    }

    /**
     * Applies energy tangle effect to impair player movement
     * @param {number} duration - How long drag lasts in seconds
     * @param {number} multiplier - How much drag is increased
     */
    applyDragEffect(duration = DRAG_EFFECT_DEFAULT_DURATION, multiplier = DRAG_EFFECT_DEFAULT_MULTIPLIER) {
        // Use higher value if already affected
        this.dragMultiplier = Math.max(this.dragMultiplier || 1.0, multiplier);

        // ENHANCED: Extend duration for consecutive hits
        this.dragEffectTimer = Math.max(this.dragEffectTimer || 0, duration) +
            (this.dragEffectTimer > 0 ? duration * DRAG_CONSECUTIVE_HIT_MULT : 0);

        // Visual effect timestamp
        this.tangleEffectTime = millis();

        // Player feedback
        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage("Ship caught in energy tangle! Engines affected!", "#30FFB4");
        }

        // Play sound effect if available
        if (typeof soundManager !== 'undefined') {
            soundManager.playWorldSound('electricField', this.pos.x, this.pos.y, this.pos);
        }
    }

    /**
     * Compute adjusted cooldown based on tangle/drag effects for player.
     * Mirrors Enemy.computeCooldown behavior so players also shoot slower when tangled.
     * @param {number} baseCooldown - Base cooldown in seconds
     * @returns {number} Adjusted cooldown
     */
    computeCooldown(baseCooldown) {
        if (!baseCooldown || baseCooldown <= 0) return baseCooldown;
        try {
            if (this.dragEffectTimer > 0 && this.dragMultiplier > 1.0) {
                const scale = 1 + Math.min(3, (this.dragMultiplier - 1.0) * 0.1);
                return baseCooldown * scale;
            }
        } catch (e) {
            return baseCooldown;
        }
        return baseCooldown;
    }

    /**
     * Activates the cloaking device if installed and off cooldown.
     * @returns {boolean} Whether cloak was activated
     */
    activateCloak() {
        // Check if cloak is installed
        if (!this.installedUpgrades?.cloak || this.cloakMaxDuration <= 0) {
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage("No cloaking device installed", [255, 100, 100]);
            }
            return false;
        }

        // Check if already cloaked
        if (this.isCloaked) {
            return false;
        }

        // Check cooldown
        if (this.cloakCooldownTimer > 0) {
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage(`Cloak recharging: ${this.cloakCooldownTimer.toFixed(1)}s`, [255, 200, 100]);
            }
            return false;
        }

        // Activate cloak
        this.isCloaked = true;
        this.cloakDurationTimer = this.cloakMaxDuration;
        this.cloakActivatedTime = millis();

        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage("Cloaking device activated", [100, 200, 255]);
        }

        if (typeof soundManager !== 'undefined') {
            soundManager.playSound('shieldUp', 1.0, this);
        }

        return true;
    }

    /**
     * Deactivates the cloaking device and starts cooldown.
     */
    deactivateCloak() {
        if (!this.isCloaked) return;

        this.isCloaked = false;
        this.cloakCooldownTimer = this.cloakMaxCooldown;
        this.cloakDurationTimer = 0;

        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage("Cloak deactivated", [200, 200, 200]);
        }

        if (typeof soundManager !== 'undefined') {
            soundManager.playSound('shieldDown', 1.0, this);
        }
    }

    /** Switches to the specified weapon index */
    switchToWeapon(index) {
        if (!this.weapons || !Array.isArray(this.weapons)) {
            // Initialize weapons array if it doesn't exist
            this.loadWeaponsFromShipDefinition(this.shipTypeName);
        }

        if (index < 0 || index >= this.weapons.length) {
            console.warn(`switchToWeapon: index ${index} out of bounds (length: ${this.weapons.length})`);
            return false;
        }

        const weapon = this.weapons[index];
        if (!weapon) {
            // Silently ignore - user pressed a slot key with no weapon
            return false;
        }

        // Already on this weapon - no action needed (also prevents exploit of spamming same key)
        if (index === this.weaponIndex) {
            return true;
        }

        this.weaponIndex = index;
        this.currentWeapon = weapon;
        this.fireRate = weapon.fireRate || 0.5;
        // EXPLOIT FIX: Preserve existing cooldown when switching weapons
        // This prevents bypassing fire rate by rapidly switching weapons
        // The cooldown remains from the previous weapon to prevent instant firing

        // Check if switching to an overheated beam and notify player
        if (weapon.type === WEAPON_TYPE.BEAM && typeof WeaponSystem !== 'undefined') {
            if (WeaponSystem.isBeamOverheated(this, weapon)) {
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage("Beam still cooling...", [255, 150, 80], 1000);
                }
            }
        }

        return true;
    }

    calculateRadianProperties() {
        // No conversion needed - the value is already in radians
        // Just copy it from the ship definition if needed
        // this.rotationSpeed = this.baseTurnRate;
    }

    /** Handles mouse click for firing attempt. */
    handleFireInput() {
        if (this.fireCooldown <= 0) {
            this.fireWeapon();
        }
    }

    // =========================================================================
    // SECTION 4: MOVEMENT & INPUT
    // =========================================================================

    /** Handles continuous key presses for movement & new features */
    handleInput() {
        // Reset per-frame thrust flags
        this.isThrusting = false;
        this.isReverseThrusting = false;
        this.isStrafing = false;

        // Check for ANY manual input that would disable autopilot
        const hasManualTurning = keyIsDown(LEFT_ARROW) || keyIsDown(81) || keyIsDown(RIGHT_ARROW) || keyIsDown(69);
        const hasManualThrust = keyIsDown(UP_ARROW) || keyIsDown(87) || keyIsDown(DOWN_ARROW) || keyIsDown(83);
        const hasManualStrafe = keyIsDown(65) || keyIsDown(68);
        const hasManualInput = hasManualTurning || hasManualThrust || hasManualStrafe;

        // If player uses ANY manual control while autopilot is active, disable it
        if (this.autopilotEnabled && hasManualInput) {
            this.disableAutopilot();
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage("Autopilot disengaged: On manual control");
            }
            // Allow the manual input to take effect immediately
        }

        // 1) Rotation (frame-rate independent)
        const rotTimeScale = (typeof deltaTime === 'number') ? deltaTime / FRAME_TIME_BASELINE_MS : 1;
        if (keyIsDown(LEFT_ARROW) || keyIsDown(81)) {      // Q 
            this.angle -= this.rotationSpeed * rotTimeScale;
        }
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(69)) {    // E 
            this.angle += this.rotationSpeed * rotTimeScale;
        }

        // 2) Sideways kiting (strafe)
        if (keyIsDown(65)) {     // A
            this.kiteLeft();
            this.isStrafing = true;
        }
        else if (keyIsDown(68)) { // D
            this.kiteRight();
            this.isStrafing = true;
        }

        // 3) Speed burst (R)
        if (keyIsDown(82)) {
            this.trySpeedBurst();
        }

        // 4) Forward / backward thrust (only if NOT strafing)
        if (!this.isStrafing) {
            if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
                this.isThrusting = true;
                this.thrust();
            }
            else if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
                this.isThrusting = true;
                this.isReverseThrusting = true;
                this.reverseThrust();
            }
        }

        // 5) Cooldowns & angle wrap (optimized)
        if (this.fireCooldown > 0) {
            this.fireCooldown -= deltaTime * 0.001;
        }
        // Normalize angle using cached TWO_PI
        const twoPi = this._TWO_PI || TWO_PI;
        this.angle = ((this.angle % twoPi) + twoPi) % twoPi;
    }

    /** Attempt a one-off forward speed burst if booster installed and off cooldown */
    trySpeedBurst() {
        // Check if booster is installed (silently fail - HUD shows status)
        if (!this.installedUpgrades?.booster || this.boostMaxDuration <= 0) {
            return false;
        }

        // Check if already boosting (silently fail)
        if (this.isSpeedBursting) {
            return false;
        }

        // Check cooldown (silently fail - HUD shows recharge progress)
        if (this.boostCooldownTimer > 0) {
            return false;
        }

        // Activate boost
        this.isSpeedBursting = true;
        this.isCoastingFromBurst = false;
        this.boostDurationTimer = this.boostMaxDuration;
        this.speedBurstEnd = millis() + (this.boostMaxDuration * 1000);

        // Immediately set velocity to max forward speed
        const maxBurstSpeed = this.baseMaxSpeed * this.boostMultiplier;
        this.vel.set(cos(this.angle) * maxBurstSpeed, sin(this.angle) * maxBurstSpeed);

        if (typeof soundManager !== 'undefined') {
            // soundManager.playSound('boost'); // TODO: Add boost sound
        }

        return true;
    }

    /** Apply a left‐strafe (kite) thrust */
    kiteLeft() {
        const angle = this.angle - (this._HALF_PI || HALF_PI);
        const force = this.thrustForce;
        this.vel.add(cos(angle) * force, sin(angle) * force);
        // draw particles
        this.thrustManager?.createThrust(this.pos, angle, this.size);
    }

    /** Apply a right‐strafe (kite) thrust */
    kiteRight() {
        const angle = this.angle + (this._HALF_PI || HALF_PI);
        const force = this.thrustForce;
        this.vel.add(cos(angle) * force, sin(angle) * force);
        this.thrustManager?.createThrust(this.pos, angle, this.size);
    }


    /** 
     * Applies reverse thrust (slower backward movement)
     * Uses opposite direction from current facing angle.
     */
    reverseThrust() {
        if (isNaN(this.angle)) {
            return;
        }

        // Calculate force in opposite direction (angle + PI) - optimized without vector allocation
        const reverseAngle = this.angle + (this._PI || PI);
        const reducedForce = this.thrustForce * PLAYER_CONFIG.REVERSE_THRUST_MULTIPLIER;
        this.vel.add(cos(reverseAngle) * reducedForce, sin(reverseAngle) * reducedForce);

        // Create thrust particles at ship's front sides for reverse thrusters
        if (this.thrustManager) {
            // Pre-calculate common values
            const piOver4 = PI * 0.25;
            const offset = this.size * 0.7;
            const offsetSide = this.size * 0.4;
            const thrustSize = this.size * 0.9;

            // Left thruster: 45 degrees from center
            const leftThrusterAngle = this.angle - piOver4;
            const leftPosX = this.pos.x + cos(this.angle) * offset + cos(leftThrusterAngle) * offsetSide;
            const leftPosY = this.pos.y + sin(this.angle) * offset + sin(leftThrusterAngle) * offsetSide;

            // Right thruster: 45 degrees from center
            const rightThrusterAngle = this.angle + piOver4;
            const rightPosX = this.pos.x + cos(this.angle) * offset + cos(rightThrusterAngle) * offsetSide;
            const rightPosY = this.pos.y + sin(this.angle) * offset + sin(rightThrusterAngle) * offsetSide;

            // Create thrust using cached position object to avoid allocations
            if (!this._tempThrustPos) this._tempThrustPos = createVector(0, 0);

            this._tempThrustPos.set(leftPosX, leftPosY);
            this.thrustManager.createThrust(this._tempThrustPos, leftThrusterAngle, thrustSize);

            this._tempThrustPos.set(rightPosX, rightPosY);
            this.thrustManager.createThrust(this._tempThrustPos, rightThrusterAngle, thrustSize);

            // FALLBACK: Direct visual rendering if thrustManager isn't showing particles
            // This will ensure there's always a visual indicator even if the thrust particles fail
            push();
            fill(255, 150, 255, 200); // Bright magenta with some transparency
            noStroke();

            // Left thruster triangle
            translate(leftPosX, leftPosY);
            rotate(leftThrusterAngle);
            triangle(0, 0, -10, -5, -10, 5);

            // Right thruster triangle
            translate(rightPosX - leftPosX, rightPosY - leftPosY); // Relative translation
            rotate(rightThrusterAngle - leftThrusterAngle); // Relative rotation
            triangle(0, 0, -10, -5, -10, 5);

            pop();
        }
    }

    /** Applies forward thrust force based on current facing angle (radians). */
    thrust() {
        if (isNaN(this.angle)) { this.angle = 0; } // Safety check
        const force = this.thrustForce;
        this.vel.add(cos(this.angle) * force, sin(this.angle) * force);
    }

    /** Fires a projectile towards the mouse cursor (world coordinates). */
    fire() {
        if (!this.currentSystem || isNaN(this.angle)) { return; } // Safety checks

        // Cache calculations
        const halfWidth = width * 0.5;
        const halfHeight = height * 0.5;
        const tx = halfWidth - this.pos.x;
        const ty = halfHeight - this.pos.y;
        const worldMx = mouseX - tx;
        const worldMy = mouseY - ty;
        const shootingAngle = atan2(worldMy - this.pos.y, worldMx - this.pos.x);

        // Reuse vector for spawn offset calculation
        const spawnOffset = this._tempVector || (this._tempVector = createVector(0, 0));
        spawnOffset.set(cos(this.angle), sin(this.angle)).mult(this.size * 0.7);

        const proj = new Projectile(this.pos.x + spawnOffset.x, this.pos.y + spawnOffset.y, shootingAngle, this);
        this.currentSystem.addProjectile(proj);
    }

    // =========================================================================
    // SECTION 5: COMBAT & WEAPONS
    // =========================================================================

    /** Fires the current weapon based on its type using WeaponSystem. */
    fireWeapon(target = null) {

        // Check if weapons are disabled by EMP nebula
        if (this.weaponsDisabled) {
            PLAYER_LOG("Weapons disabled by EMP nebula!");
            if (typeof uiManager !== 'undefined') { uiManager.addMessage("Weapons Disabled: EMP", [255, 100, 0], 2000); }
            if (typeof soundManager !== 'undefined') { soundManager.playSound('error'); }
            return false;
        }

        if (!this.currentWeapon || !this.currentSystem) return false;

        // Barrier Activation
        if (this.currentWeapon.type === WEAPON_TYPE.BARRIER) {
            if (this.fireCooldown <= 0) { // Check cooldown for barrier itself
                this.isBarrierActive = true;
                this.barrierDamageReduction = this.currentWeapon.damageReduction;
                this.barrierDurationTimer = this.currentWeapon.duration;
                this.barrierColor = this.currentWeapon.color;
                this.fireCooldown = this.computeCooldown(this.currentWeapon.fireRate); // Set cooldown for the barrier
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage("Barrier Activated!", this.barrierColor, 2000);
                }
                if (typeof soundManager !== 'undefined') {
                    soundManager.playSound('barrierUp');
                }
                return true; // Barrier activated, no projectile fired
            } else {
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage("Barrier recharging...", [200, 200, 0], 1000);
                }
                return false; // Barrier on cooldown
            }
        }

        let fireAngle = this.angle;
        let effectiveTarget = target || this.target; // Use passed target, fallback to player's locked target

        if (this.currentWeapon.type === WEAPON_TYPE.MISSILE) {
            // Allow firing missiles without a lock; they will fly straight.
            // If a target is locked (effectiveTarget is valid), the missile will home.
            // No explicit check needed here to prevent firing.
        } else if (this.currentWeapon.type === WEAPON_TYPE.BEAM && this === player) { // Player aims beams with mouse
            // Convert screen mouse position to world coordinates
            const worldMx = mouseX + (this.pos.x - width / 2);
            const worldMy = mouseY + (this.pos.y - height / 2);
            fireAngle = atan2(worldMy - this.pos.y, worldMx - this.pos.x);
        }
        // For turrets, WeaponSystem.fireTurret handles its own aiming if no target is passed.
        // If a target is passed (effectiveTarget), it will be used.

        const fired = WeaponSystem.fire(this, this.currentSystem, fireAngle, this.currentWeapon.type, effectiveTarget);
        if (fired) {
            this.fireCooldown = this.computeCooldown(this.fireRate);

            // Firing breaks cloak
            if (this.isCloaked) {
                this.deactivateCloak();
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage("Cloak disrupted by weapons fire!", [255, 150, 100]);
                }
            }

            return true;
        }
        return false;
    }

    /** Updates player position, physics, and state. */
    update() {
        // Cache time values to avoid redundant calculations
        const deltaSeconds = deltaTime * 0.001; // Pre-calculate milliseconds to seconds
        const currentTime = millis();

        if (typeof WeaponSystem !== 'undefined' && Number.isFinite(deltaSeconds)) {
            WeaponSystem.coolWeaponHeat(this, deltaSeconds);
        }

        // Barrier duration update
        if (this.isBarrierActive) {
            this.barrierDurationTimer -= deltaSeconds;
            if (this.barrierDurationTimer <= 0) {
                this.isBarrierActive = false;
                this.barrierDurationTimer = 0;
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage("Barrier Deactivated", this.barrierColor, 1500);
                }
                if (typeof soundManager !== 'undefined') {
                    soundManager.playSound('barrierDown');
                }
            }
        }

        // Update tangle effect timer
        if (this.dragEffectTimer > 0) {
            this.dragEffectTimer -= deltaSeconds;
            if (this.dragEffectTimer <= 0) {
                this.dragMultiplier = 1.0;
                this.dragEffectTimer = 0;
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage("Engines restored to normal operation.", "#30FFB4");
                }
            }
        }

        // Update cloak timers
        if (this.isCloaked) {
            this.cloakDurationTimer -= deltaSeconds;
            if (this.cloakDurationTimer <= 0) {
                this.deactivateCloak();
            }
        }
        if (this.cloakCooldownTimer > 0) {
            this.cloakCooldownTimer -= deltaSeconds;
            if (this.cloakCooldownTimer < 0) {
                this.cloakCooldownTimer = 0;
            }
        }
        // ---- End new section ----


        // Update booster cooldown timer
        if (this.boostCooldownTimer > 0) {
            this.boostCooldownTimer -= deltaSeconds;
            if (this.boostCooldownTimer < 0) {
                this.boostCooldownTimer = 0;
            }
        }

        // --- Speed Burst Thrust & State Management ---
        if (this.isSpeedBursting) {
            // Update boost duration timer
            this.boostDurationTimer -= deltaSeconds;

            if (currentTime < this.speedBurstEnd && this.boostDurationTimer > 0) {
                // Actively bursting: sustain with normal thrust application
                this.thrust();
            } else {
                // Burst thrust duration has ended
                this.isSpeedBursting = false;
                this.boostDurationTimer = 0;
                // Start cooldown
                this.boostCooldownTimer = this.boostMaxCooldown;

                // Only start coasting if velocity is still significantly above normal max speed.
                if (this.vel.magSq() > sq(this.baseMaxSpeed * 1.01)) { // Check if speed is > 101% of baseMaxSpeed
                    this.isCoastingFromBurst = true;
                } else {
                    this.isCoastingFromBurst = false; // Speed already low, no need to coast
                }
            }
        }
        // --- End Speed Burst Thrust & State Management ---

        // 1) Drag
        // Apply drag if not actively applying burst thrust (i.e., isSpeedBursting is false).
        // Drag should be active during the coasting phase.
        if (!this.isSpeedBursting) {
            if (this.dragMultiplier > 1.0 && this.dragEffectTimer > 0) {
                // First apply normal drag
                this.vel.mult(this.drag);

                // Then apply powerful velocity reduction with safety checks (cached calculation)
                const tangledSpeedFactor = Math.min(1 / Math.max(this.dragMultiplier, 0.001), 1.0);
                this.vel.mult(tangledSpeedFactor);

                // Timer-based visual jitter (every ~80ms for rotation, ~100ms for position)
                if (!this._tangledJitterTimer) this._tangledJitterTimer = 0;
                this._tangledJitterTimer += deltaSeconds;

                if (this._tangledJitterTimer >= 0.08) {
                    this._tangledJitterTimer -= 0.08;
                    this.vel.rotate(random(-0.1, 0.1));
                    // Occasional position jitter (every other trigger)
                    if (Math.random() < 0.5) {
                        this.vel.add(random(-0.03, 0.03), random(-0.03, 0.03));
                    }
                }
            } else {
                // Normal drag (typically ~0.985)
                this.vel.mult(this.drag);
            }
        }

        // 2) Speed cap
        let currentCap;
        if (this.isSpeedBursting || this.isCoastingFromBurst) {
            // Cache burst cap calculation
            if (!this._cachedBurstCap || this._cachedBurstCap !== this.baseMaxSpeed * this.speedBurstMultiplier) {
                this._cachedBurstCap = this.baseMaxSpeed * this.speedBurstMultiplier;
                this._cachedCoastThreshold = (this.baseMaxSpeed * 1.01) ** 2; // Pre-square for magSq comparison
            }
            currentCap = this._cachedBurstCap;

            // End coasting if speed has decayed (only check when coasting)
            if (this.isCoastingFromBurst && this.vel.magSq() < this._cachedCoastThreshold) {
                this.isCoastingFromBurst = false;
            }
        } else {
            // Normal flight, base cap
            currentCap = this.baseMaxSpeed;
        }
        this.vel.limit(currentCap);

        // The old section "3) Sustain extra thrust during burst window" is now integrated above.

        // 4) Usual thrust‐particle & movement logic (from handleInput)
        this.thrustManager.update();
        if (this.isThrusting && !this.isReverseThrusting) { // isThrusting is set by handleInput for W key
            this.thrustManager.createThrust(this.pos, this.angle, this.size);
        }

        // Position update (optimized NaN check) - frame-rate independent
        if (isNaN(this.vel.x) || isNaN(this.vel.y)) {
            this.vel.set(0, 0); // Safety net for NaN velocity
        }
        const moveTimeScale = (typeof deltaTime === 'number') ? deltaTime / FRAME_TIME_BASELINE_MS : 1;
        this.pos.add(p5.Vector.mult(this.vel, moveTimeScale));

        // Update cooldown timer using cached deltaSeconds
        if (this.fireCooldown > 0) {
            this.fireCooldown = Math.max(0, this.fireCooldown - deltaSeconds);
        }

        // Either handle autopilot OR normal input, never both
        if (this.autopilotEnabled) {
            this.updateAutopilot();
        }

        // Regenerate shields only after recharge delay has passed (and not disabled by Ion nebula)
        if (this.shield < this.maxShield && !this.shieldsDisabled && (currentTime - this.lastShieldHitTime) > this.shieldRechargeDelay) {
            // Use deltaSeconds for frame-rate independent recharge (shieldRechargeRate is per-second)
            const rechargeAmount = this.shieldRechargeRate * SHIELD_RECHARGE_RATE_MULTIPLIER * deltaSeconds;
            const prevShield = this.shield;
            const newShield = Math.min(this.maxShield, prevShield + rechargeAmount);
            // Play shield-up cue when recovering from 0
            if (prevShield === 0 && newShield > 0 && this._shieldWasZero) {
                if (typeof soundManager !== 'undefined') { soundManager.playSound('shieldUp', 1.0, this); }
                this._shieldWasZero = false;
            }
            this.shield = newShield;
        }

        // Sync bodyguard status from their enemy references
        this.syncBodyguardStatus();

        // Per-frame mission monitoring (ensure mission logic runs each update)
        if (this.activeMission && typeof this.activeMission.update === 'function') {
            try {
                this.activeMission.update(this.currentSystem);
            } catch (e) {
                console.error('Error during mission update:', e);
            }
        }

        // --- Secret Station Discovery ---
        // Only check for discoveries when we have secret stations and only every
        // few frames (now time-based ~150ms) to reduce cost.
        if (!this._lastSecretCheck || (currentTime - this._lastSecretCheck) > 150) {
            this._lastSecretCheck = currentTime;

            if (this.currentSystem && this.currentSystem.secretStations && this.currentSystem.secretStations.length > 0) {
                for (const station of this.currentSystem.secretStations) {
                    if (!station || station.discovered) continue;
                    // Use squared distance to avoid sqrt cost
                    const dx = this.pos.x - station.pos.x;
                    const dy = this.pos.y - station.pos.y;
                    const distSq = dx * dx + dy * dy;
                    const discoveryDistance = (station.size * 3) || 200; // fallback
                    const discoverySq = discoveryDistance * discoveryDistance;
                    if (distSq < discoverySq) {
                        station.discovered = true;
                        if (typeof uiManager !== 'undefined') uiManager.addMessage(`Secret Base Discovered: ${station.name}!`, [0, 255, 255]);
                        PLAYER_LOG(`Player discovered secret station: ${station.name}`);
                        // Clear any navigation cache so UI updates immediately
                        this._cachedNavigation = null;
                    }
                }
            }
        }
    }

    /**
     * Draws a small turret on top of the ship.
     * The turret will track the target when the turret weapon is selected.
     * This method is called within the ship's rotated coordinate space.
     */
    drawTurret() {
        // Turret is drawn in ship-local coordinates (already rotated with ship)
        const turretSize = this.size * 0.2; // Small turret relative to ship size

        // Calculate turret angle
        let turretAngle = 0; // Default: facing forward (ship's direction)

        // If this is the selected weapon and we have a target, track it
        if (this.currentWeapon && this.currentWeapon.type === WEAPON_TYPE.TURRET) {
            if (this.lastTurretFiringAngle !== null) {
                // Use the last firing angle to keep visual synced with bullets
                turretAngle = this.lastTurretFiringAngle - this.angle;
            } else {
                // Find nearest target for initial tracking
                const target = WeaponSystem.findNearestTarget(this, this.currentSystem);

                if (target && target.pos) {
                    // Calculate angle to target in world space
                    const dx = target.pos.x - this.pos.x;
                    const dy = target.pos.y - this.pos.y;
                    const angleToTarget = atan2(dy, dx);

                    // Convert to ship-local angle (subtract ship's angle since we're already rotated)
                    turretAngle = angleToTarget - this.angle;
                    // Set it for future use
                    this.lastTurretFiringAngle = angleToTarget;
                }
            }
        }

        // Draw turret base (centered on ship)
        push();
        fill(80, 90, 100);
        stroke(120, 130, 140);
        strokeWeight(1);
        ellipse(0, 0, turretSize * 1.2, turretSize * 1.2);

        // Draw turret barrel (rotates to track target)
        rotate(turretAngle);
        fill(60, 70, 80);
        stroke(100, 110, 120);
        strokeWeight(1);
        rect(0, -turretSize * 0.2, turretSize * 0.8, turretSize * 0.4);

        // Draw barrel tip
        fill(80, 90, 100);
        rect(turretSize * 0.8, -turretSize * 0.15, turretSize * 0.2, turretSize * 0.3);

        pop();
    }

    /** Draws the player ship using its specific draw function. */
    draw() {
        // Don't draw ship if exploding
        if (this.exploding) {
            // Show final flash during first 300ms (cache millis call)
            const timeElapsed = millis() - this.explosionStartTime;
            if (timeElapsed < 300) {
                push();
                translate(this.pos.x, this.pos.y);
                fill(255, 255, 255, map(timeElapsed, 0, 300, 255, 0));
                noStroke();
                ellipse(0, 0, this.size * 1.5);
                pop();
            }
            return; // Skip drawing the ship
        }

        if (isNaN(this.angle)) { return; } // Safety check

        // Cache ship definition lookup
        if (!this._cachedShipDef || this._cachedShipTypeName !== this.shipTypeName) {
            this._cachedShipDef = SHIP_DEFINITIONS[this.shipTypeName];
            this._cachedShipTypeName = this.shipTypeName;
        }
        const drawFunc = this._cachedShipDef?.drawFunction;

        if (typeof drawFunc !== 'function') { return; }

        push();
        translate(this.pos.x, this.pos.y);

        // Calculate sun angle relative to ship's rotation for 3D shading
        // Sun is at (0,0) in world space.
        const sunAngle = atan2(-this.pos.y, -this.pos.x);
        const localSunAngle = sunAngle - this.angle;

        // Apply cloak transparency effect
        if (this.isCloaked) {
            const flickerTime = (millis() - this.cloakActivatedTime) * 0.01;
            const baseAlpha = 0.25; // 25% opacity when cloaked
            const flickerAmount = 0.1 * sin(flickerTime * 3);
            drawingContext.globalAlpha = baseAlpha + flickerAmount;
        }

        rotate(this.angle);
        drawFunc(this.size, this.isThrusting, this.angle, localSunAngle);

        // Reset alpha after drawing ship
        if (this.isCloaked) {
            drawingContext.globalAlpha = 1.0;
        }

        // Turret drawing removed - bullets fire without visible turret
        pop();

        // Draw thrust particles ON TOP of the ship
        this.thrustManager.draw();

        // Draw shield effect with improved visuals
        if (this.shield > 0 && !this.shieldsDisabled) {
            push();
            translate(this.pos.x, this.pos.y);

            // Shield appearance based on shield percentage
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


        if (this.dragMultiplier > 1.0 && this.dragEffectTimer > 0) {
            push();
            translate(this.pos.x, this.pos.y);

            // Draw energy tethers
            noFill();
            stroke(200, 180);
            strokeWeight(2);

            for (let i = 0; i < 6; i++) {
                let angle = millis() * 0.0018 + i * TWO_PI / 6; // frameCount*0.03 -> millis*0.0018
                let innerRadius = this.size * 0.6;
                let outerRadius = this.size * (1.2 + 0.2 * sin(millis() * 0.006 + i)); // frameCount*0.1 -> millis*0.006

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

            pop();
        }

        // Draw Barrier Field Effect
        if (this.isBarrierActive) {
            push();
            translate(this.pos.x, this.pos.y);
            noFill();
            // Pulsating effect for the barrier
            const barrierPulse = (sin(millis() * 0.006) + 1) / 2; // Ranges from 0 to 1
            const barrierRadius = this.size * (1.7 + barrierPulse * 0.2); // Slightly larger and pulsating
            const barrierAlpha = map(this.barrierDurationTimer, 0, this.currentWeapon?.duration || 5, 50, 150);

            strokeWeight(2 + barrierPulse * 1.5); // Thicker and pulsating stroke
            stroke(this.barrierColor[0], this.barrierColor[1], this.barrierColor[2], barrierAlpha);
            ellipse(0, 0, barrierRadius * 2, barrierRadius * 2);

            // Optional: Add a secondary, fainter pulsating ring
            strokeWeight(1 + barrierPulse * 1);
            stroke(this.barrierColor[0], this.barrierColor[1], this.barrierColor[2], barrierAlpha * 0.5);
            ellipse(0, 0, barrierRadius * 2.3, barrierRadius * 2.3);
            pop();
        }

        // Draw force wave effect (skip in surface mode - handled by surfaceMode._drawForceWaves)
        const inSurfaceMode = typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive();
        if (!inSurfaceMode && this.lastForceWave && millis() - this.lastForceWave.time < 300) {
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

        // Existing weapon effects
        if (this.lastBeam && millis() - this.lastBeam.time < 120) {
            // ...existing beam drawing code...
        }

        // Draw beam if recently fired (skip in surface mode - handled by surfaceMode._drawBeams)
        if (!inSurfaceMode && this.lastBeam && millis() - this.lastBeam.time < 150) {
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

        // Draw line to secret base if feature is active (early exit if not active)
        if (this.showSecretBaseNavigation && this.currentSystem && this.currentSystem.secretStations &&
            this.currentSystem.secretStations.length > 0) {

            // Cache closest station data to avoid recalculating every frame
            const now = millis();
            if (!this._cachedNavigation || (now - this._cachedNavigation.lastUpdated) > 500) {
                // Only recalculate every 500ms or if cache is empty
                let closestStation = this.currentSystem.secretStations[0];
                let closestDist = Infinity;

                for (const station of this.currentSystem.secretStations) {
                    // Use faster squared distance calculation
                    const dx = this.pos.x - station.pos.x;
                    const dy = this.pos.y - station.pos.y;
                    const distSquared = dx * dx + dy * dy;

                    if (distSquared < closestDist) {
                        closestDist = distSquared;
                        closestStation = station;
                    }
                }

                // Now take the sqrt only once for the closest station
                closestDist = Math.sqrt(closestDist);

                // Cache the results
                this._cachedNavigation = {
                    station: closestStation,
                    distance: closestDist,
                    lastUpdated: now
                };
            }

            const closestStation = this._cachedNavigation.station;
            const closestDist = this._cachedNavigation.distance;

            // Draw line with dash effect
            push();
            stroke(0, 255, 255, 150); // Cyan color with transparency
            strokeWeight(2);

            // Calculate dash pattern based on distance
            const dashLength = map(closestDist, 0, 5000, 5, 20);
            drawingContext.setLineDash([dashLength, dashLength * 1.5]);

            // Draw the line
            line(this.pos.x, this.pos.y, closestStation.pos.x, closestStation.pos.y);

            // Draw distance text at a fixed position above the ship (independent of rotation)
            const nearX = this.pos.x;
            const nearY = this.pos.y - (this.size + 18);
            fill(0, 255, 255);
            noStroke();
            textFont(font);
            textAlign(CENTER, CENTER);
            textSize(STATION_TEXT_SIZE.BODY);

            // Show discovery status in distance text (draw near player)
            const statusText = closestStation.discovered ?
                `Secret Base: ${Math.floor(closestDist)} meters` :
                `Secret Base: ${Math.floor(closestDist)} meters`;
            text(statusText, nearX, nearY - 10);

            // Reset line dash
            drawingContext.setLineDash([]);
            pop();
        } else if (this._cachedNavigation) {
            // Clear cache when not in use to free memory
            this._cachedNavigation = null;
        }
    }

    // =========================================================================
    // SECTION 6: DAMAGE & HEALTH
    // =========================================================================

    /** Applies damage to the player's hull. */
    takeDamage(amount, attacker = null) {
        // Prevent damage during death animation
        if (this.isDying || this.destroyed) {
            return { damage: 0, shieldHit: false };
        }
        // Record attacker for bodyguard response
        if (attacker) {
            this.lastAttacker = attacker;
            this.lastAttackTime = millis();
        }

        if (this.destroyed || amount <= 0) return { damage: 0, shieldHit: false };

        // Taking damage breaks cloak
        if (this.isCloaked) {
            this.deactivateCloak();
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage("Cloak disrupted by damage!", [255, 150, 100]);
            }
        }

        let shieldHit = false;
        let actualDamage = amount;

        // Apply barrier damage reduction if active
        if (this.isBarrierActive && this.barrierDamageReduction > 0) {
            actualDamage *= (1 - this.barrierDamageReduction);
            if (actualDamage < 0) actualDamage = 0;
            // Optionally, add a UI message or sound for barrier absorbing damage
            // uiManager.addMessage(`Barrier absorbed ${((amount - actualDamage) / amount * 100).toFixed(0)}% damage!`, this.barrierColor, 800);
        }

        // If we have shields, damage them first
        const prevShield = this.shield;
        if (this.shield > 0) {
            // Record time of shield hit for visual effect AND recharge delay
            this.shieldHitTime = millis();
            this.lastShieldHitTime = millis(); // Set the recharge delay timer
            shieldHit = true; // IMPORTANT: If shield > 0, it's ALWAYS a shield hit

            if (actualDamage <= this.shield) {
                // Shield absorbs all damage
                this.shield -= actualDamage;
                //uiManager.addMessage(`Shield damage: ${actualDamage.toFixed(1)}`, [255, 100, 100]);
                return { damage: actualDamage, shieldHit: true };
            } else {
                // Shield is depleted, remaining damage goes to hull
                const remainingDamage = actualDamage - this.shield;
                this.shield = 0;
                this.hull -= remainingDamage;

                // CRITICAL FIX: This is STILL a shield hit even though it depleted the shield
                //uiManager.addMessage(`Shield down! Hull damage: ${remainingDamage.toFixed(1)}`, [255, 50, 50]);

                // Always report as a shield hit if shields absorbed ANY damage
                shieldHit = true;
            }
        } else {
            // No shields, damage hull directly
            this.hull -= actualDamage;
            //uiManager.addMessage(`Hull damage: ${actualDamage.toFixed(1)}`, [255, 50, 50]);
            shieldHit = false;
        }
        // Shield down cue on transition >0 -> 0
        if (prevShield > 0 && this.shield === 0) {
            if (typeof soundManager !== 'undefined') { soundManager.playSound('shieldDown', 1.0, this); }
            this._shieldWasZero = true;
        }

        // Enemy gloating when player is critically low on health
        if (this.maxHull > 0 && attacker && typeof communicationSystem !== 'undefined') {
            const healthPercent = (this.hull / this.maxHull) * 100;
            if (healthPercent <= 15) {
                communicationSystem.handlePlayerDying(attacker, healthPercent);
            }
        }

        // Check for destruction
        if (this.hull <= 0) {
            this.hull = 0;
            this.destroyed = true;
            this.explosionStartTime = millis(); // Track start time
            this.exploding = true; // Flag to track explosion sequence
            this.isDying = true; // Flag to prevent interactions during death animation

            // Create player explosion (larger, more dramatic)
            if (this.currentSystem && typeof this.currentSystem.addExplosion === 'function') {
                // Check if we're in surface mode for proper explosion rendering
                const inSurfaceMode = typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive();

                // Main large explosion
                this.currentSystem.addExplosion(
                    this.pos.x,
                    this.pos.y,
                    this.size * 3, // Larger explosion
                    [100, 150, 255], // Blueish-white core
                    inSurfaceMode // Mark as surface explosion if in surface mode
                );

                // Create cascading secondary explosions
                for (let i = 0; i < 12; i++) { // More secondary explosions
                    setTimeout(() => {
                        // Check if currentSystem still exists when timeout runs
                        if (this.currentSystem && typeof this.currentSystem.addExplosion === 'function') {
                            // Random offset explosions around ship
                            this.currentSystem.addExplosion(
                                this.pos.x + random(-this.size * 1.2, this.size * 1.2),
                                this.pos.y + random(-this.size * 1.2, this.size * 1.2),
                                this.size * random(0.7, 1.5), // Varied sizes
                                [
                                    random(100, 200), // Random blue tint
                                    random(150, 255),
                                    random(200, 255)
                                ],
                                inSurfaceMode // Mark as surface explosion if in surface mode
                            );
                        }
                    }, i * 120); // Staggered timing for cascade effect (total duration ~1.4 seconds)
                }

                // Delay GAME_OVER state change until after the explosion cascade
                setTimeout(() => {
                    // Clear any pending debounced saves before entering GAME_OVER
                    if (typeof __saveDebounceTimer !== 'undefined' && __saveDebounceTimer) {
                        clearTimeout(__saveDebounceTimer);
                        __saveDebounceTimer = null;
                    }

                    // Stop all sounds when entering GAME_OVER
                    if (typeof soundManager !== 'undefined' && typeof soundManager.stopAllSounds === 'function') {
                        soundManager.stopAllSounds();
                    }

                    gameStateManager.setState("GAME_OVER");
                }, 3000); // Increased delay to match explosion duration

            } else {
                // Fallback if system not available - immediate game over
                console.warn("Player destroyed but currentSystem or addExplosion invalid. Immediate GAME_OVER.");
                gameStateManager.setState("GAME_OVER");
            }
        }

        return { damage: amount, shieldHit: shieldHit };
    } // End takeDamage

    // =========================================================================
    // SECTION 7: DOCKING & CARGO
    // =========================================================================

    /** Checks if the player can dock with the station. */
    canDock(station) {
        if (!station?.pos) return false;
        const d = dist(this.pos.x, this.pos.y, station.pos.x, station.pos.y);
        const speed = this.vel.mag();
        const radius = station.dockingRadius ?? 0;
        return (d < radius && speed < 0.5);
    }

    /** Adds credits. Ensures the amount is an integer. */
    addCredits(amount) {
        if (amount > 0) {
            const integerAmount = Math.floor(amount); // Ensure amount is an integer
            this.credits += integerAmount;
            this.credits = Math.floor(this.credits); // Ensure total is integer
            PLAYER_LOG(`Added ${integerAmount} credits. New balance: ${this.credits}`);
            // Optionally update UI or trigger save
        }
    }

    /** Subtracts credits. Ensures the amount is an integer. Returns true if successful. */
    spendCredits(amount) {
        if (amount > 0) {
            const integerAmount = Math.floor(amount); // Ensure amount is an integer
            if (this.credits >= integerAmount) {
                this.credits -= integerAmount;
                this.credits = Math.floor(this.credits); // Ensure total is integer
                PLAYER_LOG(`Spent ${integerAmount} credits. Remaining: ${this.credits}`);
                return true; // Indicate success
            } else {
                PLAYER_LOG(`Failed to spend ${integerAmount} credits. Insufficient funds (${this.credits}).`);
                return false; // Indicate failure
            }
        }
        return false; // No amount to spend
    }

    /** Calculates total cargo quantity. */
    getCargoAmount() { return this.cargo.reduce((sum, item) => sum + (item?.quantity ?? 0), 0); }

    /** 
     * Adds cargo to player inventory, respecting capacity limits.
     * @param {string} commodityName - Type of cargo to add
     * @param {number} quantity - Amount to add
     * @param {boolean} [allowPartial=false] - Whether to add partial amount if full amount won't fit
     * @returns {object} {success: boolean, added: number} - Success status and amount actually added
     */
    addCargo(commodityName, quantity, allowPartial = false) {
        // Validate input
        if (!commodityName || !quantity || quantity <= 0) {
            return { success: false, added: 0 };
        }

        // Calculate available space
        const currentAmount = this.getCargoAmount();
        const spaceAvailable = this.cargoCapacity - currentAmount;

        // Nothing fits
        if (spaceAvailable <= 0) {
            return { success: false, added: 0 };
        }

        // Determine how much we can add
        let amountToAdd = quantity;

        // If it doesn't all fit and we allow partial collection
        if (quantity > spaceAvailable && allowPartial) {
            amountToAdd = spaceAvailable;
        }
        // If it doesn't all fit and we don't allow partial collection
        else if (quantity > spaceAvailable) {
            return { success: false, added: 0 };
        }

        // MODIFIED: Find existing item by type OR name
        const existingItem = this.cargo.find(item =>
            item?.name === commodityName || item?.type === commodityName
        );

        if (existingItem) {
            // Update existing
            existingItem.quantity += amountToAdd;
        } else {
            // Add new - standardize on using name property
            this.cargo.push({ name: commodityName, quantity: amountToAdd });
        }

        return { success: true, added: amountToAdd };
    }

    /** Moves any cargo above capacity into the provided station's storage. */
    offloadExcessCargoToStorage(station, notifyFn) {
        if (!station) return { overflow: 0, moved: 0 };

        // Normalize both inventories first
        this.cargo = Player.sanitizeCargoList(this.cargo, { convertTypeToName: true, mergeDuplicates: true });
        if (typeof sanitizeStorageList === 'function') {
            station.storage = sanitizeStorageList(station.storage);
        } else {
            station.storage = Array.isArray(station.storage) ? station.storage.filter(e => e?.name && e?.quantity > 0) : [];
        }

        const overflow = Math.max(0, this.getCargoAmount() - this.cargoCapacity);
        if (overflow <= 0) return { overflow: 0, moved: 0 };

        let remainingToMove = overflow;
        for (const item of this.cargo) {
            if (remainingToMove <= 0) break;
            if (!item || !item.name || item.quantity <= 0) continue;

            const moveQty = Math.min(item.quantity, remainingToMove);
            item.quantity -= moveQty;
            remainingToMove -= moveQty;

            const storageItem = station.storage.find(s => s?.name === item.name);
            if (storageItem) {
                storageItem.quantity += moveQty;
            } else {
                station.storage.push({ name: item.name, quantity: moveQty });
            }
        }

        // Clean zero-qty entries and ensure storage remains valid
        this.cargo = this.cargo.filter(i => i && i.quantity > 0);
        if (typeof sanitizeStorageList === 'function') {
            station.storage = sanitizeStorageList(station.storage);
        }

        const moved = overflow - remainingToMove;
        if (moved > 0 && typeof notifyFn === 'function') {
            notifyFn(`Moved ${moved}t of cargo into station storage due to reduced capacity.`);
        }
        return { overflow, moved };
    }

    /**
     * Collision check against another object.
     * Uses circle broadphase for fast rejection, then polygon narrowphase for on-screen accuracy.
     * @param {object} target - Object with pos {x, y} and size properties.
     * @returns {boolean} True if collision detected.
     */
    checkCollision(target) {
        // Basic safety check for target validity
        if (!target?.pos || target.size === undefined || typeof target.size !== 'number') {
            return false;
        }

        // Broadphase: Calculate distance squared between centers (inline for performance)
        const dx = this.pos.x - target.pos.x;
        const dy = this.pos.y - target.pos.y;
        const dSq = dx * dx + dy * dy;

        // Calculate sum of radii squared (using size as diameter, optimized)
        const sumRadii = (this.size + target.size) * 0.5;
        const sumRadiiSq = sumRadii * sumRadii;

        // Fast rejection - no collision possible if circles don't overlap
        if (dSq >= sumRadiiSq) return false;

        // Narrowphase: Polygon collision if target is on-screen (for visual accuracy)
        // Player is always "on-screen" from their own perspective
        if (typeof CollisionUtils !== 'undefined') {
            // Check if target is on-screen (asteroids use isOnScreen(), ships use _isOnScreen)
            let targetOnScreen = true; // Assume on-screen by default
            if (target._isOnScreen !== undefined) {
                targetOnScreen = target._isOnScreen;
            } else if (target.vertices) {
                // Asteroid - check with isOnScreen
                targetOnScreen = CollisionUtils.isOnScreen(target.pos);
            }

            if (targetOnScreen) {
                // Get polygon for player ship
                const polyA = CollisionUtils.getShipPolygon(this);

                // Get polygon for target (could be ship or asteroid)
                let polyB = null;
                if (target.vertices) {
                    // Target is an asteroid
                    polyB = CollisionUtils.getAsteroidPolygon(target);
                } else if (target.shipDef) {
                    // Target is a ship
                    polyB = CollisionUtils.getShipPolygon(target);
                }

                if (polyA && polyB) {
                    return CollisionUtils.polygonsCollide(polyA, polyB);
                }
            }
        }

        // Fallback: Broadphase already passed, assume collision
        return true;
    }

    /**
     * Checks if player is wanted in current system
     * @return {boolean} Whether player is wanted in current system
     */
    isWantedInCurrentSystem() {
        return this.currentSystem?.isPlayerWanted() || false;
    }

    // =========================================================================
    // SECTION 8: PERSONAL RECORDS
    // =========================================================================

    /** Records a ship destruction in the personal record */
    recordShipDestruction(enemy) {
        if (!enemy) return;
        const pilotName = enemy.displayName || enemy.captainName || "Unknown Pilot";
        const shipType = enemy.shipTypeName || "Unknown Ship";
        const role = enemy.role || "Unknown";
        const faction = enemy.faction || null; // Enemies may not have factions
        this.shipsDestroyed.push({
            pilotName: pilotName,
            shipType: shipType,
            role: role,
            faction: faction,
            timestamp: Date.now()
        });
    }

    /** Records a system visit in the personal record */
    recordSystemVisit(systemName, economyType = null, securityLevel = null) {
        if (!systemName) return;
        // Record every visit with economy and security context
        this.systemsVisited.push({
            systemName: systemName,
            economyType: economyType || 'Unknown',
            securityLevel: securityLevel || 'Unknown',
            timestamp: Date.now()
        });
    }

    /** Records a trade at a station in the personal record */
    recordStationTrade(stationName, systemName) {
        if (!stationName || !systemName) return;

        // Create a unique key for this location
        const locationKey = `${stationName}|${systemName}`;

        // Only record if we haven't already traded at this location in this session
        if (!this.currentSessionTradedLocations.has(locationKey)) {
            this.currentSessionTradedLocations.add(locationKey);
            this.stationsTraded.push({
                stationName: stationName,
                systemName: systemName,
                timestamp: Date.now()
            });
        }
    }

    /** Clears the session trade tracking (called when undocking) */
    clearSessionTradeTracking() {
        this.currentSessionTradedLocations.clear();
    }

    /** Records a faction join event in the personal record */
    recordFactionJoin(factionName) {
        if (!factionName) return;
        this.factionsJoined.push({
            factionName: factionName,
            timestamp: Date.now()
        });
    }

    /** Records an Elite status change in the personal record */
    recordEliteStatusChange(oldRating, newRating) {
        if (!newRating) return;
        this.eliteStatusChanges.push({
            oldRating: oldRating,
            newRating: newRating,
            kills: this.kills,
            timestamp: Date.now()
        });
    }

    /** Records a mission completion in the personal record */
    recordMissionCompletion(mission) {
        if (!mission) return;
        this.missionsCompleted.push({
            title: mission.title,
            type: mission.type,
            reward: mission.rewardCredits,
            description: mission.description || "",
            timestamp: Date.now()
        });
    }

    /** Records a wanted status change in the personal record */
    recordWantedStatusChange(isWanted, systemName) {
        if (!systemName) return;
        // Only record if status actually changed from previous state
        if (this.wantedStatusChanges.length === 0 ||
            this.wantedStatusChanges[this.wantedStatusChanges.length - 1].isWanted !== isWanted) {
            this.wantedStatusChanges.push({
                isWanted: isWanted,
                systemName: systemName,
                timestamp: Date.now()
            });
        }
    }

    /** Records a ship purchase in the personal record */
    recordShipPurchase(shipType, price, systemName) {
        if (!shipType) return;
        this.shipsPurchased.push({
            shipType: shipType,
            price: price || 0,
            systemName: systemName || 'Unknown',
            timestamp: Date.now()
        });
    }

    /** Records a weapon upgrade in the personal record */
    recordWeaponUpgrade(weaponName, weaponType, price, slotIndex, systemName) {
        if (!weaponName) return;
        this.weaponsUpgraded.push({
            weaponName: weaponName,
            weaponType: weaponType || 'Unknown',
            price: price || 0,
            slotIndex: slotIndex !== undefined ? slotIndex : -1,
            systemName: systemName || 'Unknown',
            timestamp: Date.now()
        });
    }

    // =========================================================================
    // SECTION 9: SAVE/LOAD
    // =========================================================================

    static sanitizeCargoList(list, { convertTypeToName = true, mergeDuplicates = true } = {}) {
        if (!Array.isArray(list)) return [];

        const cleaned = [];
        for (const entry of list) {
            const nameFromEntry = (typeof entry?.name === 'string') ? entry.name.trim() : '';
            const typeFallback = (convertTypeToName && typeof entry?.type === 'string') ? entry.type.trim() : '';
            const name = nameFromEntry || typeFallback;
            const qtyNum = Number(entry?.quantity);

            if (!name || !Number.isFinite(qtyNum) || qtyNum <= 0) continue;

            const quantity = Math.floor(qtyNum);
            if (mergeDuplicates) {
                const existing = cleaned.find(c => c.name === name);
                if (existing) {
                    existing.quantity += quantity;
                    continue;
                }
            }

            cleaned.push({ name, quantity });
        }

        return cleaned;
    }

    /** Save data for persistence */
    getSaveData() {
        // Normalize angle safely to prevent NaN or Infinity in save data
        let normalizedAngle = this.angle;
        if (isNaN(normalizedAngle) || !isFinite(normalizedAngle)) {
            console.warn("Player angle is NaN or Infinity during save, resetting to 0");
            normalizedAngle = 0;
            this.angle = 0; // Fix the corrupt state
        } else {
            normalizedAngle = ((this.angle % TWO_PI) + TWO_PI) % TWO_PI;
        }

        // --- Log Active Mission Status BEFORE Saving ---
        let missionDataToSave = null;
        if (this.activeMission) {
            SAVE_LOG(`SAVING DATA: Active Mission Title = ${this.activeMission.title}, Status = ${this.activeMission.status}`);
            // Use Mission's toJSON method for proper serialization
            // This excludes runtime references (_targetEnemyRef, _guardRefs) and saves IDs instead
            if (typeof this.activeMission.toJSON === 'function') {
                missionDataToSave = this.activeMission.toJSON();
            } else {
                // Fallback for older code, but this should not happen
                console.warn('Mission missing toJSON method, using fallback serialization');
                missionDataToSave = { ...this.activeMission };
            }
        } else {
            SAVE_LOG("SAVING DATA: No active mission.");
        }
        // ---

        const cleanedCargo = Player.sanitizeCargoList(this.cargo, { convertTypeToName: true, mergeDuplicates: true });
        this.cargo = cleanedCargo;

        // Save all weapons as an array with their full definitions
        const weaponsData = this.weapons.map(weapon => {
            // Only save non-null weapons
            return weapon ? {
                name: weapon.name,
                type: weapon.type,
                damage: weapon.damage,
                color: weapon.color,
                fireRate: weapon.fireRate,
                price: weapon.price,
                maxRadius: weapon.maxRadius,
                desc: weapon.desc
            } : null;
        });

        return {
            shipTypeName: this.shipTypeName,
            installedUpgrades: this.installedUpgrades || { armor: 0, engine: 0, cargo: 0, hardpoints: 0, shield: 0, cloak: 0, booster: 0 }, // Save upgrades
            pos: { x: this.pos.x, y: this.pos.y }, vel: { x: this.vel.x, y: this.vel.y }, angle: normalizedAngle,
            hull: this.hull, credits: this.credits, cargo: JSON.parse(JSON.stringify(cleanedCargo)),
            isWanted: this.isWanted,
            isPolice: this.isPolice,
            hasBeenPolice: this.hasBeenPolice,
            playerFaction: this.playerFaction,
            hasJoinedFaction: this.hasJoinedFaction,
            factionShip: this.factionShip,
            shield: this.shield,
            maxShield: this.maxShield,
            shieldRechargeRate: this.shieldRechargeRate,
            kills: this.kills,
            factionKills: this.factionKills || { POLICE: 0, MILITARY: 0, IMPERIAL: 0, SEPARATIST: 0 },
            factionPrestige: this.factionPrestige || { POLICE: 0, MILITARY: 0, IMPERIAL: 0, SEPARATIST: 0 },
            // --- Save the plain mission data object ---
            activeMission: missionDataToSave,
            weaponIndex: this.weaponIndex, // Save the index instead of just the name
            weapons: weaponsData
            ,
            // Persist hired bodyguards (only store serializable fields)
            activeBodyguards: (this.activeBodyguards || []).map(g => ({
                shipType: g.shipType,
                hull: (typeof g.hull === 'number') ? g.hull : null,
                maxHull: (typeof g.hull === 'number') ? g.maxHull : null,
                destroyed: !!g.destroyed
            })),
            // Navigation preferences
            showSecretBaseNavigation: this.showSecretBaseNavigation || false,
            // Personal record tracking
            shipsDestroyed: this.shipsDestroyed || [],
            systemsVisited: this.systemsVisited || [],
            stationsTraded: this.stationsTraded || [],
            factionsJoined: this.factionsJoined || [],
            eliteStatusChanges: this.eliteStatusChanges || [],
            missionsCompleted: this.missionsCompleted || [],
            wantedStatusChanges: this.wantedStatusChanges || [],
            shipsPurchased: this.shipsPurchased || [],
            weaponsUpgraded: this.weaponsUpgraded || [],
            // Secret base storage
            secretStorage: this.secretStorage || []
            // -----------------------------------------
        };
    }

    /** Load save data */
    loadSaveData(data) {
        if (!data) { console.warn("Player.loadSaveData: No data provided."); return; }

        // CRITICAL VALIDATION: Verify player is alive before loading
        if (data.hull <= 0) {
            console.warn("Cannot load save data: Player hull is <= 0");
            return false;
        }

        // CRITICAL VALIDATION: Verify player is not marked as destroyed
        if (data.destroyed === true || data.isDying === true || data.exploding === true) {
            console.warn("Cannot load save data: Player is marked as destroyed/dying/exploding");
            return false;
        }


        SAVE_LOG("Player.loadSaveData: Loading data...");

        // Apply ship definition based on loaded ship type
        // This will also initialize weapons if they are not explicitly saved or if ship type changed
        let typeToLoad = data.shipTypeName || "Sidewinder";
        this.applyShipDefinition(typeToLoad);

        // RESTORE UPGRADES - merge with defaults to handle new upgrade types from old saves
        if (data.installedUpgrades) {
            // Keep current defaults (which include all upgrade types like booster)
            // then overlay saved values on top
            this.installedUpgrades = { ...this.installedUpgrades, ...data.installedUpgrades };
            // Recalculate stats immediately to apply bonuses (hull, slots, etc.)
            this.recalculateStats();
        }

        this.pos = data.pos ? createVector(data.pos.x, data.pos.y) : createVector(0, 0);
        this.vel = data.vel ? createVector(data.vel.x, data.vel.y) : createVector(0, 0);
        let loadedAngle = data.angle ?? 0; if (typeof loadedAngle !== 'number' || isNaN(loadedAngle)) { this.angle = 0; } else { this.angle = (loadedAngle % TWO_PI + TWO_PI) % TWO_PI; }
        this.hull = data.hull !== undefined ? constrain(data.hull, 0, this.maxHull) : this.maxHull;

        // Defensive credit loading with repair detection
        if (typeof data.credits === 'number' && isFinite(data.credits) && data.credits >= 0) {
            this.credits = Math.floor(data.credits);
        } else {
            console.warn('Credits data invalid or missing, resetting to 1000');
            this.credits = 1000;
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage('Save data repaired: Credits reset to 1000', [255, 200, 0]);
            }
        }

        this.cargo = Array.isArray(data.cargo) ? JSON.parse(JSON.stringify(data.cargo)) : [];
        this.cargo = Player.sanitizeCargoList(this.cargo, { convertTypeToName: true, mergeDuplicates: true });
        this.isWanted = data.isWanted || false;
        this.isPolice = data.isPolice || false;
        this.hasBeenPolice = data.hasBeenPolice || false;
        this.playerFaction = data.playerFaction || null;

        // Safety guard: Ensure player can't be both police AND in another faction
        // If both are set (legacy/corrupted save), isPolice takes precedence
        if (this.isPolice && this.playerFaction) {
            console.warn('Save data inconsistency: Player was both police and in a faction. Clearing playerFaction.');
            this.playerFaction = null;
        }

        this.hasJoinedFaction = data.hasJoinedFaction || false;
        this.factionShip = data.factionShip || null;

        this.shield = data.shield !== undefined ? data.shield : this.maxShield;
        this.maxShield = data.maxShield || this.maxShield;
        this.shieldRechargeRate = data.shieldRechargeRate || this.shieldRechargeRate;

        this.kills = data.kills || 0;

        // Load faction kills with defaults
        this.factionKills = data.factionKills || { POLICE: 0, MILITARY: 0, IMPERIAL: 0, SEPARATIST: 0 };
        // Ensure all faction keys exist (check for undefined/null, not falsy values)
        const requiredFactions = ['POLICE', 'MILITARY', 'IMPERIAL', 'SEPARATIST'];
        requiredFactions.forEach(faction => {
            if (this.factionKills[faction] === undefined || this.factionKills[faction] === null) {
                this.factionKills[faction] = 0;
            }
        });

        // Load faction prestige with defaults
        this.factionPrestige = data.factionPrestige || { POLICE: 0, MILITARY: 0, IMPERIAL: 0, SEPARATIST: 0 };
        requiredFactions.forEach(faction => {
            if (this.factionPrestige[faction] === undefined || this.factionPrestige[faction] === null) {
                this.factionPrestige[faction] = 0;
            }
        });

        // Restore player weapons from saved data with defensive repair
        let weaponsRepaired = false;
        if (Array.isArray(data.weapons) && data.weapons.length > 0) {
            this.weapons = []; // Clear existing weapons array

            data.weapons.forEach(savedWeaponData => {
                if (savedWeaponData && typeof savedWeaponData.name === 'string' && typeof savedWeaponData.type === 'string') {
                    const matchedWeaponDefinition = WEAPON_UPGRADES.find(w => w.name === savedWeaponData.name);

                    if (matchedWeaponDefinition) {
                        // Create a deep clone of the weapon definition from WEAPON_UPGRADES
                        this.weapons.push(JSON.parse(JSON.stringify(matchedWeaponDefinition)));
                    } else {
                        console.warn(`Weapon definition for '${savedWeaponData.name}' not found in WEAPON_UPGRADES. Using null slot.`);
                        this.weapons.push(null); // Add null to keep weapon slot integrity
                        weaponsRepaired = true;
                    }
                } else {
                    // savedWeaponData is null, undefined, or lacks basic properties. Treat as an empty/invalid slot.
                    if (savedWeaponData) { // Log if it's not null but still invalid
                        console.warn(`Invalid or incomplete weapon data in save file: ${JSON.stringify(savedWeaponData)}. Treating as empty slot.`);
                        weaponsRepaired = true;
                    }
                    this.weapons.push(null);
                }
            });

            // Restore weapon index and current weapon
            this.weaponIndex = data.weaponIndex || 0;

            // Validate weaponIndex and ensure it points to a non-null weapon if possible
            if (this.weaponIndex < 0 || this.weaponIndex >= this.weapons.length || !this.weapons[this.weaponIndex]) {
                const firstValidWeaponIndex = this.weapons.findIndex(w => w !== null);
                if (firstValidWeaponIndex !== -1) {
                    SAVE_LOG(`Saved weaponIndex ${data.weaponIndex} is invalid or points to a null weapon. Setting to first available weapon: ${firstValidWeaponIndex}`);
                    this.weaponIndex = firstValidWeaponIndex;
                    weaponsRepaired = true;
                } else {
                    console.warn(`No valid weapons loaded from save. Falling back to ship defaults.`);
                    this.loadWeaponsFromShipDefinition(this.shipTypeName);
                    weaponsRepaired = true;
                }
            }
            this.setCurrentWeapon(this.weaponIndex);
        } else {
            // If no saved weapons array, initialize from ship definition
            console.warn("No weapon data array found in save data, loading default weapons from ship definition.");
            this.loadWeaponsFromShipDefinition(this.shipTypeName);
            weaponsRepaired = true;
        }

        // Notify player if weapons were repaired
        if (weaponsRepaired && typeof uiManager !== 'undefined') {
            uiManager.addMessage('Save data repaired: Weapons reloaded', [255, 200, 0]);
        }

        // --- Load active mission ---
        this.activeMission = null; // Start fresh before loading
        if (data.activeMission) {
            SAVE_LOG("   Found activeMission data in save:", data.activeMission);
            // Re-hydrate using the Mission constructor, passing the saved plain object
            try {
                this.activeMission = new Mission(data.activeMission); // Pass the loaded object to constructor
                // --- Log Status AFTER Re-hydration ---
                SAVE_LOG(`   LOADED DATA: Active Mission Title = ${this.activeMission?.title}, Status = ${this.activeMission?.status}, Progress = ${this.activeMission?.progressCount}`);
                // ---
            } catch (e) {
                console.error("   Error re-creating Mission object from saved data:", e);
                this.activeMission = null; // Clear if creation failed
            }
        } else {
            SAVE_LOG("   No active mission found in save data.");
        }
        // ----------------------------------

        // --- Restore active bodyguards list (do NOT auto-spawn enemies here) ---
        this.activeBodyguards = [];
        if (Array.isArray(data.activeBodyguards) && data.activeBodyguards.length > 0) {
            data.activeBodyguards.forEach(sb => {
                if (!sb || typeof sb.shipType !== 'string') return;
                this.activeBodyguards.push({
                    shipType: sb.shipType,
                    hull: (typeof sb.hull === 'number') ? sb.hull : null,
                    maxHull: (typeof sb.maxHull === 'number') ? sb.maxHull : null,
                    destroyed: !!sb.destroyed,
                    enemyRef: null
                });
            });
            SAVE_LOG(`Restored ${this.activeBodyguards.length} hired bodyguard(s) from save data.`);
        } else {
            // Ensure property exists for runtime code
            this.activeBodyguards = this.activeBodyguards || [];
        }

        // Restore personal record tracking
        this.shipsDestroyed = Array.isArray(data.shipsDestroyed) ? data.shipsDestroyed : [];
        this.systemsVisited = Array.isArray(data.systemsVisited) ? data.systemsVisited : [];
        this.stationsTraded = Array.isArray(data.stationsTraded) ? data.stationsTraded : [];
        this.factionsJoined = Array.isArray(data.factionsJoined) ? data.factionsJoined : [];
        this.eliteStatusChanges = Array.isArray(data.eliteStatusChanges) ? data.eliteStatusChanges : [];
        this.missionsCompleted = Array.isArray(data.missionsCompleted) ? data.missionsCompleted : [];
        this.wantedStatusChanges = Array.isArray(data.wantedStatusChanges) ? data.wantedStatusChanges : [];
        this.shipsPurchased = Array.isArray(data.shipsPurchased) ? data.shipsPurchased : [];
        this.weaponsUpgraded = Array.isArray(data.weaponsUpgraded) ? data.weaponsUpgraded : [];

        // Restore secret base storage
        this.secretStorage = Array.isArray(data.secretStorage) ? data.secretStorage : [];

        // Initialize session trade tracking (not saved, always starts fresh)
        this.currentSessionTradedLocations = new Set();

        // Restore navigation preferences
        this.showSecretBaseNavigation = data.showSecretBaseNavigation || false;

        SAVE_LOG(`Player data finished loading. Ship: ${this.shipTypeName}, Wanted: ${this.isWanted}, Mission Status: ${this.activeMission?.status || 'None'}`);
    }

    // Ensure you have a way to set this.target, e.g., via mouse click on an enemy:
    handleMousePressedForTargeting() { // Call this from your main sketch mousePressed
        if (mouseButton === LEFT) { // Or whatever button you use for targeting
            if (this.currentSystem && this.currentSystem.enemies) {
                const worldMx = mouseX + (this.pos.x - width / 2);
                const worldMy = mouseY + (this.pos.y - height / 2);

                let clickedEnemy = null;
                let clickedAsteroid = null;
                let clickedSpaceObject = null;

                // Check enemies first (preserve existing priority)
                for (let enemy of this.currentSystem.enemies) {
                    if (enemy && !enemy.destroyed && enemy.pos && enemy.size) {
                        let d = dist(worldMx, worldMy, enemy.pos.x, enemy.pos.y);
                        if (d < enemy.size / 2 + 10) { // Give a little buffer for clicking
                            clickedEnemy = enemy;
                            break;
                        }
                    }
                }

                // If no enemy clicked, check asteroids
                if (!clickedEnemy && Array.isArray(this.currentSystem.asteroids)) {
                    for (let ast of this.currentSystem.asteroids) {
                        if (!ast || ast.destroyed || !ast.pos) continue;
                        const d = dist(worldMx, worldMy, ast.pos.x, ast.pos.y);
                        const radius = (typeof ast.maxRadius === 'number') ? ast.maxRadius : (ast.size ? ast.size / 2 : 0);
                        if (d < radius + 10) {
                            clickedAsteroid = ast;
                            break;
                        }
                    }
                }

                // If still nothing, check space objects
                if (!clickedEnemy && !clickedAsteroid && Array.isArray(this.currentSystem.spaceObjects)) {
                    for (let so of this.currentSystem.spaceObjects) {
                        if (!so || so.destroyed || !so.pos) continue;
                        const d = dist(worldMx, worldMy, so.pos.x, so.pos.y);
                        const radius = (typeof so.collisionRadius === 'number') ? so.collisionRadius : (so.size ? so.size / 2 : 0);
                        if (d < radius + 10) {
                            clickedSpaceObject = so;
                            break;
                        }
                    }
                }

                // Determine which object was clicked (priority: enemy > asteroid > spaceObject)
                const clickedObj = clickedEnemy || clickedAsteroid || clickedSpaceObject;

                if (clickedObj) { // Some object was clicked
                    if (this.target === clickedObj) { // Clicked the already targeted object
                        this.target = null; // Deselect
                        if (typeof uiManager !== 'undefined') {
                            uiManager.addMessage(`Target unlocked.`, [255, 255, 0]);
                        }
                    } else { // Clicked a new object (or current target was null)
                        this.target = clickedObj;
                        if (typeof uiManager !== 'undefined') {
                            let label = 'Target';
                            if (clickedEnemy && clickedEnemy.shipTypeName) label = clickedEnemy.shipTypeName;
                            else if (clickedSpaceObject && typeof clickedSpaceObject.getDisplayName === 'function') label = clickedSpaceObject.getDisplayName();
                            else if (clickedAsteroid) label = 'Asteroid';
                            uiManager.addMessage(`Target locked: ${label}`, [0, 255, 0]);
                        }

                        // === PATROL MISSION SCAN PROGRESS ===
                        // If player has a patrol mission and locked onto an enemy, count as a scan
                        if (clickedEnemy && this.activeMission &&
                            typeof FACTION_PATROL_TYPES !== 'undefined' &&
                            FACTION_PATROL_TYPES.has(this.activeMission.type)) {

                            // Track scanned ships to avoid duplicate progress
                            if (!this.activeMission._scannedShipIds) {
                                this.activeMission._scannedShipIds = new Set();
                            }

                            const shipId = clickedEnemy.id || clickedEnemy;
                            if (!this.activeMission._scannedShipIds.has(shipId)) {
                                this.activeMission._scannedShipIds.add(shipId);
                                this.activeMission.progressCount = (this.activeMission.progressCount || 0) + 1;

                                const progress = this.activeMission.progressCount;
                                const targetCount = this.activeMission.targetCount;
                                if (typeof uiManager !== 'undefined') {
                                    uiManager.addMessage(`Vessel scanned: ${progress}/${targetCount}`, [255, 215, 0]);
                                }

                                // Check if mission is complete
                                if (progress >= targetCount) {
                                    if (typeof uiManager !== 'undefined') {
                                        uiManager.addMessage('Patrol objective complete! Return for payment.', [100, 255, 100]);
                                    }
                                    this.completeMission();
                                }
                            }
                        }
                    }
                } else { // No object was clicked (clicked on background)
                    if (this.target !== null) { // If there was a target, clear it
                        this.target = null;
                        if (typeof uiManager !== 'undefined') {
                            uiManager.addMessage(`Target unlocked.`, [255, 255, 0]);
                        }
                    }
                    // If no object clicked and no prior target, do nothing.
                }
            }
        }
    }

    // =========================================================================
    // SECTION 10: AUTOPILOT
    // =========================================================================

    /**
     * Toggles autopilot to the requested target
     * @param {string} target - 'station', 'jumpzone', or 'secretbase'
     */
    toggleAutopilot(target) {
        PLAYER_LOG(`toggleAutopilot called with target: ${target}`);
        PLAYER_LOG(`Current autopilot state: ${this.autopilotEnabled ? 'enabled' : 'disabled'}, target: ${this.autopilotTarget || 'none'}`);

        // If autopilot is not currently enabled -> enable and reset cycle tracking
        if (!this.autopilotEnabled) {
            this.autopilotEnabled = true;
            this.autopilotTarget = target;
            // Start a fresh cycle tracking set with this initial target
            this.autopilotVisitedTargets = new Set([target]);
            this._autopilotWillDisableOnNextToggle = false;

            // Make sure current system is defined
            if (!this.currentSystem) {
                console.error("Cannot enable autopilot: currentSystem is undefined");
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage("Autopilot error: System data unavailable");
                return;
            }

            // Display target-specific message
            const targetName = this._getAutopilotTargetName(target);
            PLAYER_LOG(`Autopilot enabled: Flying to ${target}`);
            if (uiManager) uiManager.addMessage(`Autopilot engaged: ${targetName}`);
            return;
        }

        // If pressing the same target again, disable autopilot (existing behaviour)
        if (this.autopilotTarget === target) {
            this.disableAutopilot();
            return;
        }

        // Otherwise, switch target and record it as visited in the cycle
        this.autopilotTarget = target;
        try {
            this.autopilotVisitedTargets.add(target);
        } catch (e) {
            this.autopilotVisitedTargets = new Set([this.autopilotTarget, target]);
        }

        // Display target-specific message
        const targetName = this._getAutopilotTargetName(target);
        if (uiManager) uiManager.addMessage(`Autopilot: now heading to ${targetName}`);
    }

    /**
     * Gets a display-friendly name for an autopilot target
     * @param {string} target - 'station', 'jumpzone', or 'secretbase'
     * @returns {string} Human-readable target name
     */
    _getAutopilotTargetName(target) {
        switch (target) {
            case 'station': return 'Station';
            case 'jumpzone': return 'Jump Zone';
            case 'secretbase': return 'Secret Base';
            default: return target;
        }
    }

    /** Disables autopilot - Ensures NO lingering effects */
    disableAutopilot() {
        if (this.autopilotEnabled) {
            PLAYER_LOG("Autopilot disabled");
            this.autopilotEnabled = false;
            this.autopilotTarget = null;
            this.autopilotPlanetIndex = -1;

            // Reset critical flags when disabling autopilot
            this.isThrusting = false;        // Ensure thrusting is stopped

            // DON'T modify fireCooldown or any other base ship properties

            // Only track when autopilot was disabled
            this.lastDisableTime = millis();
        }
    }

    /**
     * Cycle autopilot to the next planet in the current system.
     * If currently not autopiloting, or currently targeting the station,
     * this will enable autopilot and target the first planet.
     */
    cycleAutopilotPlanet() {
        if (!this.currentSystem) {
            if (uiManager) uiManager.addMessage('Autopilot error: System data unavailable');
            return;
        }

        const planets = this.currentSystem.planets || [];
        if (!planets || planets.length === 0) {
            console.error(`Autopilot error: No planets in ${this.currentSystem.name}. staticElementsInitialized: ${this.currentSystem.staticElementsInitialized}`);
            if (uiManager) uiManager.addMessage('No planets in this system');

            // Attempt to reinitialize static elements if they're missing
            if (this.currentSystem && typeof this.currentSystem.initStaticElements === 'function') {
                PLAYER_LOG('Attempting to reinitialize system static elements...');
                try {
                    this.currentSystem.initStaticElements();
                    if (this.currentSystem.planets && this.currentSystem.planets.length > 0) {
                        PLAYER_LOG(`Successfully reinitialized ${this.currentSystem.planets.length} planets`);
                        // Retry the autopilot command
                        return this.cycleAutopilotPlanet();
                    }
                } catch (e) {
                    console.error('Failed to reinitialize system:', e);
                }
            }
            return;
        }

        // Determine next index
        let next = 0;

        // If autopilot is currently disabled: enable and start a new cycle
        if (!this.autopilotEnabled) {
            next = 0; // start at first planet
            this.autopilotEnabled = true;
            this.autopilotVisitedTargets = this.autopilotVisitedTargets || new Set();
            // reset planet-cycle tracking
            this._autopilotPlanetSeenIndices = new Set([next]);
            this._autopilotPlanetStartIndex = next;
            this._autopilotWillDisableOnNextToggle = false;

            this.autopilotTarget = { type: 'planet', index: next };
            this.autopilotPlanetIndex = next;

            const p0 = planets[next];
            const name0 = (p0 && p0.name) ? p0.name : `Planet ${next + 1}`;
            if (uiManager) uiManager.addMessage(`Autopilot: Heading to ${name0} (${next + 1}/${planets.length})`);
            PLAYER_LOG(`Autopilot planet target set to index ${next} (${name0})`);
            return;
        }

        // If we've already completed a full cycle, the next press should disable autopilot
        if (this._autopilotWillDisableOnNextToggle) {
            this.disableAutopilot();
            return;
        }

        // Otherwise compute the next index in the cycle
        if (this.autopilotTarget && typeof this.autopilotTarget === 'object' && this.autopilotTarget.type === 'planet') {
            const cur = Number.isFinite(this.autopilotTarget.index) ? this.autopilotTarget.index : this.autopilotPlanetIndex;
            next = (typeof cur === 'number' && cur >= 0) ? (cur + 1) % planets.length : 0;
        } else {
            next = 0;
        }

        // Set new planet target and record visit
        this.autopilotTarget = { type: 'planet', index: next };
        this.autopilotPlanetIndex = next;
        this._autopilotPlanetSeenIndices = this._autopilotPlanetSeenIndices || new Set();
        this._autopilotPlanetSeenIndices.add(next);

        const p = planets[next];
        const name = (p && p.name) ? p.name : `Planet ${next + 1}`;
        if (uiManager) uiManager.addMessage(`Autopilot: Heading to ${name} (${next + 1}/${planets.length})`);
        PLAYER_LOG(`Autopilot planet target set to index ${next} (${name})`);

        // If we've now visited every planet once, mark that the next autopilot press will disable
        if (this._autopilotPlanetSeenIndices.size >= planets.length) {
            this._autopilotWillDisableOnNextToggle = true;
            if (uiManager) uiManager.addMessage('Autopilot: completed one planet cycle — next autopilot press will disable.');
        }
    }

    /**
     * Processes autopilot logic during update
     */
    updateAutopilot() {
        if (!this.autopilotEnabled || !this.currentSystem) return;

        // Disable autopilot if player was recently damaged
        if (millis() - this.lastDamageTime < 500) {
            PLAYER_LOG("Autopilot disabled: Recent damage detected");
            this.disableAutopilot();
            if (uiManager) uiManager.addMessage("Autopilot disengaged: Damage detected");
            return;
        }

        let targetPos;

        // Determine target position based on autopilot target
        if (this.autopilotTarget === 'station') {
            // Target the station if it exists
            if (!this.currentSystem.station || !this.currentSystem.station.pos) {
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage("Autopilot disengaged: No station in system");
                return;
            }
            targetPos = this.currentSystem.station.pos.copy();

            // Disable if we're very close to station — use dockingRadius (visual) instead of raw size
            const stationDistance = p5.Vector.dist(this.pos, targetPos);
            const dockRadius = this.currentSystem.station.dockingRadius ?? (this.currentSystem.station.size * 0.5);
            const margin = Math.max(10, dockRadius * 0.05);
            if (stationDistance < dockRadius + margin) {
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage("Autopilot disengaged: Approaching station");
                return;
            }
        }
        else if (this.autopilotTarget === 'jumpzone') {
            // Target the jump zone if it exists
            if (!this.currentSystem.jumpZoneCenter) {
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage("Autopilot disengaged: No jump zone found");
                return;
            }
            targetPos = this.currentSystem.jumpZoneCenter.copy();

            // Disable if we're in the jump zone
            const jumpZoneDistance = p5.Vector.dist(this.pos, targetPos);
            if (jumpZoneDistance < this.currentSystem.jumpZoneRadius * 0.8) {
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage("Autopilot disengaged: Jump zone reached");
                return;
            }
        }
        else if (this.autopilotTarget === 'secretbase') {
            // Target the closest discovered secret station
            const secretStations = this.currentSystem.secretStations || [];
            const discoveredSecrets = secretStations.filter(s => s.discovered && s.pos);

            if (discoveredSecrets.length === 0) {
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage("Autopilot disengaged: No discovered secret base");
                return;
            }

            // Find closest discovered secret station
            let closestStation = discoveredSecrets[0];
            let closestDist = p5.Vector.dist(this.pos, closestStation.pos);
            for (let i = 1; i < discoveredSecrets.length; i++) {
                const d = p5.Vector.dist(this.pos, discoveredSecrets[i].pos);
                if (d < closestDist) {
                    closestDist = d;
                    closestStation = discoveredSecrets[i];
                }
            }

            targetPos = closestStation.pos.copy();

            // Disable if we're very close to the secret station
            const secretDockRadius = closestStation.dockingRadius ?? (closestStation.size * 0.5);
            const secretMargin = Math.max(10, secretDockRadius * 0.05);
            if (closestDist < secretDockRadius + secretMargin) {
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage("Autopilot disengaged: Approaching secret base");
                return;
            }
        }
        // Planet target: object with {type:'planet', index: n}
        else if (this.autopilotTarget && typeof this.autopilotTarget === 'object' && this.autopilotTarget.type === 'planet') {
            const idx = Number.isFinite(this.autopilotTarget.index) ? this.autopilotTarget.index : this.autopilotPlanetIndex;
            const planets = this.currentSystem.planets || [];
            if (!planets || planets.length === 0 || idx < 0 || idx >= planets.length) {
                console.error(`Autopilot planet target invalid. Planets: ${planets?.length || 0}, Index: ${idx}, staticElementsInitialized: ${this.currentSystem?.staticElementsInitialized}`);

                // Attempt to reinitialize if planets are missing
                if ((!planets || planets.length === 0) && this.currentSystem && typeof this.currentSystem.initStaticElements === 'function') {
                    PLAYER_LOG('Attempting to reinitialize system for autopilot...');
                    try {
                        this.currentSystem.initStaticElements();
                        // Don't disable autopilot yet, let it retry on next update
                        return;
                    } catch (e) {
                        console.error('Failed to reinitialize:', e);
                    }
                }

                this.disableAutopilot();
                if (uiManager) uiManager.addMessage('Autopilot disengaged: No valid planet target');
                return;
            }
            const planet = planets[idx];
            if (!planet || !planet.pos) {
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage('Autopilot disengaged: Planet data unavailable');
                return;
            }
            targetPos = planet.pos.copy();

            // Consider autopilot finished when close enough to atmospheric radius / planet size
            const planetDistance = p5.Vector.dist(this.pos, targetPos);
            const approachRadius = (planet.size || 200) * 0.8;
            if (planetDistance < approachRadius) {
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage(`Autopilot disengaged: Approaching ${planet.name || 'planet'}`);
                return;
            }
        }

        if (!targetPos) {
            this.disableAutopilot();
            return;
        }

        // --- AUTOPILOT STEERING AND THRUST LOGIC ---
        // Calculate direction to target
        const toTarget = p5.Vector.sub(targetPos, this.pos);
        const targetAngle = toTarget.heading();

        // Normalize angles for comparison
        let angleDiff = targetAngle - this.angle;
        if (angleDiff > PI) angleDiff -= TWO_PI;
        if (angleDiff < -PI) angleDiff += TWO_PI;

        // Rotate towards target - Using FIXED values independent of player's rotation speed
        const AUTOPILOT_ROTATION_RATE = 0.03; // Fixed rotation speed for autopilot (per frame at 60fps)
        const autopilotTimeScale = (typeof deltaTime === 'number') ? deltaTime / FRAME_TIME_BASELINE_MS : 1;
        if (abs(angleDiff) > 0.05) {
            if (angleDiff > 0) {
                this.angle += AUTOPILOT_ROTATION_RATE * autopilotTimeScale;
            } else {
                this.angle -= AUTOPILOT_ROTATION_RATE * autopilotTimeScale;
            }
        }

        // Apply thrust if roughly facing the right direction
        if (abs(angleDiff) < 0.3) {
            // Use fixed thrust value independent of player's thrustForce
            const AUTOPILOT_THRUST = 0.25; // Fixed thrust amount for autopilot

            let force = p5.Vector.fromAngle(this.angle);
            force.mult(AUTOPILOT_THRUST);
            this.vel.add(force);

            // FIXED: Use the correct angle parameter - DON'T subtract PI here
            if (this.thrustManager) {
                this.thrustManager.createThrust(
                    this.pos,
                    this.angle,  // Use facing angle, not reversed
                    this.size
                );
            }

            this.isThrusting = true;
        } else {
            this.isThrusting = false;
        }
    }


    /**
     * Installs a weapon into a specific weapon slot
     * @param {Object} weapon - The weapon definition to install
     * @param {number} slotIndex - The slot index to install into
     * @returns {boolean} Success or failure
     */
    installWeaponToSlot(weapon, slotIndex) {
        if (!weapon || typeof weapon !== 'object') {
            console.warn("Invalid weapon data provided");
            return false;
        }

        // Validate required properties (barriers use damageReduction instead of damage)
        const isBarrier = weapon.type === 'barrier';
        const requiredProps = isBarrier
            ? ['name', 'type', 'damageReduction', 'fireRate']
            : ['name', 'type', 'damage', 'fireRate'];
        if (!requiredProps.every(prop => weapon[prop] !== undefined)) {
            console.warn(`Weapon missing required properties: ${JSON.stringify(weapon)}`);
            return false;
        }

        // Get slot count (use current capacity which accounts for upgrades)
        const availableSlots = this.weaponSlots || (SHIP_DEFINITIONS[this.shipTypeName]?.armament?.length || 1);

        // Validate slot index
        if (slotIndex < 0 || slotIndex >= availableSlots) {
            console.warn(`Invalid weapon slot index: ${slotIndex}, ship has ${availableSlots} slots`);
            return false;
        }

        // Ensure weapons array has enough positions
        while (this.weapons.length <= slotIndex) {
            this.weapons.push(null);
        }

        // Install a COPY of the weapon in the specified slot (avoid reference issues)
        this.weapons[slotIndex] = { ...weapon };

        // Set current weapon to the newly installed one
        return this.setCurrentWeapon(slotIndex);
    }

    /**
     * Sets the current weapon based on index
     * @param {number} index - The weapon index to set as current
     * @returns {boolean} Success or failure
     */
    setCurrentWeapon(index) {
        if (!Array.isArray(this.weapons)) {
            console.warn("Weapon array not initialized");
            return false;
        }

        if (index >= 0 && index < this.weapons.length && this.weapons[index]) {
            this.weaponIndex = index;
            this.currentWeapon = this.weapons[this.weaponIndex];
            this.fireRate = this.currentWeapon.fireRate || 0.5;
            return true;
        } else if (this.weapons.length > 0) {
            // Find the first non-null weapon
            const firstValidIndex = this.weapons.findIndex(w => w !== null);
            if (firstValidIndex >= 0) {
                this.weaponIndex = firstValidIndex;
                this.currentWeapon = this.weapons[firstValidIndex];
                this.fireRate = this.currentWeapon.fireRate || 0.5;
                return true;
            }
        }

        // No valid weapons found
        console.warn("No valid weapons available");
        return false;
    }

    /**
     * Increments the kill counter when the player destroys an enemy
     */
    addKill(enemy = null) {
        const oldRating = this.getEliteRating();

        // Increment global kills and compute new rating
        this.kills = (this.kills || 0) + 1;
        const newRating = this.getEliteRating();

        // Prefer the actual destroyed enemy when available; fall back to current target
        const killTarget = enemy || this.target;
        if (killTarget) {
            this.recordShipDestruction(killTarget);

            // Determine player's faction key (POLICE tracked by `isPolice`)
            const playerFactionKey = this.isPolice ? 'POLICE' : this.playerFaction;

            let factionKillEligible = false;
            let bountyAmount = 0;
            let bountyDescription = '';

            // Police: get credit and bounty for killing pirates OR aliens
            if (this.isPolice) {
                if (killTarget.role === AI_ROLE.PIRATE) {
                    factionKillEligible = true;
                    bountyAmount = 1000;
                    bountyDescription = 'Police bounty: 1,000 cr (Pirate)';
                } else if (killTarget.role === AI_ROLE.ALIEN) {
                    factionKillEligible = true;
                    bountyAmount = 1000;
                    bountyDescription = 'Police bounty: 1,000 cr (Alien)';
                }
            }
            // Military: get credit and bounty for killing aliens OR pirates
            else if (this.playerFaction === 'MILITARY') {
                if (killTarget.role === AI_ROLE.ALIEN) {
                    factionKillEligible = true;
                    bountyAmount = 4000;
                    bountyDescription = 'Military bounty: 4,000 cr (Alien)';
                } else if (killTarget.role === AI_ROLE.PIRATE) {
                    factionKillEligible = true;
                    bountyAmount = 1000;
                    bountyDescription = 'Military bounty: 1,000 cr (Pirate)';
                }
            }
            // Imperial: get credit and bounty for killing Separatists
            else if (this.playerFaction === 'IMPERIAL') {
                if (killTarget.faction === 'SEPARATIST') {
                    factionKillEligible = true;
                    bountyAmount = 2000;
                    bountyDescription = 'Imperial bounty: 2,000 cr (Separatist)';
                }
            }
            // Separatist: get credit and bounty for killing Imperials
            else if (this.playerFaction === 'SEPARATIST') {
                if (killTarget.faction === 'IMPERIAL') {
                    factionKillEligible = true;
                    bountyAmount = 2000;
                    bountyDescription = 'Separatist bounty: 2,000 cr (Imperial)';
                }
            }

            // Increment faction kill count and award prestige
            // NOTE: Faction bounty credits are awarded centrally by
            // EnemyDamageSystem._awardFactionBounty to avoid duplicate rewards.
            if (factionKillEligible && playerFactionKey) {
                // Track the kill
                if (this.factionKills && this.factionKills[playerFactionKey] !== undefined) {
                    this.factionKills[playerFactionKey]++;
                }

                // Award prestige for prestige-based factions (1 prestige per kill)
                // This will also handle rank-up notifications via addFactionPrestige
                const cfg = typeof FACTION_RANKS !== 'undefined' ? FACTION_RANKS[playerFactionKey] : null;
                if (cfg?.usesPrestige) {
                    this.addFactionPrestige(playerFactionKey, 1);
                } else {
                    // For kill-based factions (Police), check for rank change manually
                    const oldFactionRank = this.getFactionRank(playerFactionKey);
                    const newFactionRank = this.getFactionRank(playerFactionKey);
                    if (oldFactionRank !== newFactionRank) {
                        const factionDisplayName = this.getFactionDisplayName(playerFactionKey);
                        if (typeof uiManager !== "undefined") {
                            uiManager.addMessage(`${factionDisplayName} Rank: ${newFactionRank}!`, [100, 200, 255]);
                        }
                        if (typeof soundManager !== "undefined") {
                            soundManager.playSound("promotion");
                        }
                    }
                }
            }
        } else {
            // Ensure we always log a kill entry even when no enemy object is available
            this.recordShipDestruction({
                pilotName: 'Unknown Pilot',
                shipTypeName: 'Unknown',
                role: 'Unknown',
                faction: null,
                timestamp: Date.now()
            });
        }

        // Record Elite status change if rating changed
        if (oldRating !== newRating) {
            this.recordEliteStatusChange(oldRating, newRating);
            if (typeof uiManager !== "undefined") {
                uiManager.addMessage(`Combat Rating: ${newRating}!`, [255, 215, 0]);
            }
            if (typeof soundManager !== "undefined") {
                soundManager.playSound("promotion");
            }
        }

        PLAYER_LOG(`Kill count: ${this.kills}, Rating: ${newRating}`);
    }

    // =========================================================================
    // SECTION 11: FACTION & STATUS
    // =========================================================================

    /**
     * Determines player's Elite rating based on kill count
     * @returns {string} The Elite rating
     */
    getEliteRating() {
        if (this.kills >= 6400) return "Elite";
        if (this.kills >= 2560) return "Deadly";
        if (this.kills >= 512) return "Dangerous";
        if (this.kills >= 128) return "Competent";
        if (this.kills >= 64) return "Above Average";
        if (this.kills >= 32) return "Average";
        if (this.kills >= 16) return "Poor";
        if (this.kills >= 8) return "Mostly Harmless";
        return "Harmless";
    }

    /**
     * Determines player's faction rank based on faction-specific prestige or kills
     * @param {string} factionName - The faction name ("POLICE", "MILITARY", "IMPERIAL", "SEPARATIST")
     * @returns {string} The faction rank
     */
    getFactionRank(factionName) {
        const cfg = FACTION_RANKS[factionName];
        if (!cfg) return "Unknown";

        // Use prestige for prestige-based factions, kills for Police
        const progress = cfg.usesPrestige
            ? (this.factionPrestige?.[factionName] || 0)
            : (this.factionKills?.[factionName] || 0);

        // Iterate from highest threshold downwards
        for (let i = cfg.thresholds.length - 1; i >= 0; i--) {
            if (progress >= cfg.thresholds[i]) return cfg.ranks[i];
        }
        return cfg.base;
    }

    /**
     * Returns faction progress stats and progression toward next rank
     * Uses prestige for Imperial/Separatist/Military, kills for Police
     * @param {string} factionName
     * @returns {{progress:number, nextThreshold:number|null, toNext:number|null, nextRank:string|null, usesPrestige:boolean}}
     */
    getFactionKillsProgress(factionName) {
        const cfg = FACTION_RANKS[factionName];
        const usesPrestige = cfg?.usesPrestige || false;
        const progress = usesPrestige
            ? (this.factionPrestige?.[factionName] || 0)
            : (this.factionKills?.[factionName] || 0);

        if (!cfg) return { kills: progress, progress, nextThreshold: null, killsToNext: null, toNext: null, nextRank: null, usesPrestige };

        for (let i = 0; i < cfg.thresholds.length; i++) {
            if (progress < cfg.thresholds[i]) {
                return {
                    kills: progress, // backwards compatibility
                    progress,
                    nextThreshold: cfg.thresholds[i],
                    killsToNext: cfg.thresholds[i] - progress, // backwards compatibility
                    toNext: cfg.thresholds[i] - progress,
                    nextRank: cfg.ranks[i],
                    usesPrestige
                };
            }
        }
        return { kills: progress, progress, nextThreshold: null, killsToNext: null, toNext: null, nextRank: null, usesPrestige };
    }

    /**
     * Adds faction prestige and checks for rank promotion
     * @param {string} factionKey - The faction key
     * @param {number} amount - Amount of prestige to add
     */
    addFactionPrestige(factionKey, amount) {
        if (!factionKey || !amount || amount <= 0) return;
        if (!this.factionPrestige) {
            this.factionPrestige = { POLICE: 0, MILITARY: 0, IMPERIAL: 0, SEPARATIST: 0 };
        }
        if (this.factionPrestige[factionKey] === undefined) return;

        const oldRank = this.getFactionRank(factionKey);
        this.factionPrestige[factionKey] += amount;
        const newRank = this.getFactionRank(factionKey);

        // Notify player of faction rank change
        if (oldRank !== newRank) {
            const factionDisplayName = this.getFactionDisplayName(factionKey);
            if (typeof uiManager !== "undefined") {
                uiManager.addMessage(`${factionDisplayName} Rank: ${newRank}!`, [100, 200, 255]);
            }
            if (typeof soundManager !== "undefined") {
                soundManager.playSound("promotion");
            }
        }
    }

    /**
     * Converts a faction key to a display-friendly name
     * @param {string} factionKey - The faction key ("POLICE", "MILITARY", "IMPERIAL", "SEPARATIST")
     * @returns {string} The formatted faction display name
     */
    getFactionDisplayName(factionKey) {
        if (!factionKey) return null;
        // All faction keys are already in the format we want for display
        // POLICE -> Police, MILITARY -> Military, IMPERIAL -> Imperial, SEPARATIST -> Separatist
        return factionKey.charAt(0) + factionKey.slice(1).toLowerCase();
    }

    /**
     * Gets the player's current faction display name
     * @returns {string} The faction display name
     */
    getCurrentFactionDisplayName() {
        if (this.isPolice) return "Police";
        if (this.playerFaction === "MILITARY") return "Military";
        if (this.playerFaction === "IMPERIAL") return "Imperial";
        if (this.playerFaction === "SEPARATIST") return "Separatist";
        return null;
    }

    /**
     * Removes police status when player becomes wanted
     */
    removePoliceStatus() {
        if (this.isPolice) {
            this.hasBeenPolice = true;
            this.isPolice = false;

            // Show notification to player
            if (typeof uiManager !== "undefined") {
                uiManager.addMessage("Police status revoked due to criminal activity!", [255, 0, 0]);
            }

            PLAYER_LOG("Player's police status revoked, marked as former officer");
        }
    }

    // ======================================
    // Faction Management Methods
    // ======================================

    /**
     * Checks if the player can join a specific faction
     * @param {string} factionName - The faction to check ("IMPERIAL", "SEPARATIST", "MILITARY")
     * @returns {boolean} True if the player can join the faction
     */
    canJoinFaction(factionName) {
        // Can't join if already in a faction (including police)
        if (this.playerFaction || this.isPolice) {
            return false;
        }

        // Can't join if wanted (should be checked by UI, but double-check here)
        if (this.currentSystem && this.currentSystem.isPlayerWanted && this.currentSystem.isPlayerWanted()) {
            return false;
        }

        // Former police officers cannot rejoin the police force
        if (factionName === 'POLICE' && this.hasBeenPolice) {
            return false;
        }

        // Valid faction names (including POLICE)
        const validFactions = ["IMPERIAL", "SEPARATIST", "MILITARY", "POLICE"];
        return validFactions.includes(factionName);
    }

    /**
     * Gets the cheapest ship for a given faction
     * @param {string} factionName - The faction to get a ship for
     * @returns {string|null} The ship type name or null if no ships found
     * @private
     */
    _getCheapestFactionShip(factionName) {
        // Dynamically find the cheapest ship for the faction from SHIP_DEFINITIONS
        if (typeof SHIP_DEFINITIONS === 'undefined') {
            console.error("SHIP_DEFINITIONS not available");
            return null;
        }

        let cheapestShip = null;
        let lowestPrice = Infinity;

        // Iterate through all ships to find faction-specific ones
        for (const [shipName, shipDef] of Object.entries(SHIP_DEFINITIONS)) {
            let isFactionShip = false;

            if (factionName === 'POLICE') {
                // Police ships are identified by having "POLICE" in their aiRoles (role-based)
                isFactionShip = shipDef.aiRoles && Array.isArray(shipDef.aiRoles) && shipDef.aiRoles.includes('POLICE');
            } else {
                // Military, Imperial, Separatist ships are identified by faction property
                isFactionShip = shipDef.faction === factionName;
            }

            if (!isFactionShip) {
                continue; // Skip ships that don't match the faction
            }

            // Check if ship has a valid price
            if (shipDef.price && typeof shipDef.price === 'number' && shipDef.price > 0 && shipDef.price < lowestPrice) {
                lowestPrice = shipDef.price;
                cheapestShip = shipName;
            }
        }

        if (!cheapestShip) {
            console.warn(`No valid ships found for faction: ${factionName}`);
            return null;
        }

        PLAYER_LOG(`Cheapest ship for ${factionName}: ${cheapestShip} (price: ${lowestPrice})`);
        return cheapestShip;
    }

    /**
     * Joins a faction and receives a faction ship
     * @param {string} factionName - The faction to join ("IMPERIAL", "SEPARATIST", "MILITARY")
     * @returns {boolean} True if successfully joined, false otherwise
     */
    joinFaction(factionName) {
        // Validate if can join
        if (!this.canJoinFaction(factionName)) {
            PLAYER_LOG(`Cannot join faction: ${factionName}`);
            return false;
        }

        // Get the cheapest ship for this faction
        const shipType = this._getCheapestFactionShip(factionName);
        if (!shipType) {
            console.error(`No ships available for faction: ${factionName}`);
            return false;
        }

        // Verify the ship exists in SHIP_DEFINITIONS
        if (typeof SHIP_DEFINITIONS === 'undefined' || !SHIP_DEFINITIONS[shipType]) {
            console.error(`Ship definition not found for: ${shipType}`);
            return false;
        }

        // Save current cargo before switching ships
        const savedCargo = [...this.cargo];

        // Switch to the faction ship
        this.applyShipDefinition(shipType);

        // Restore cargo (up to new capacity)
        this.cargo = savedCargo.slice(0, this.cargoCapacity);

        // Set faction status (POLICE uses special isPolice flag)
        if (factionName === 'POLICE') {
            this.isPolice = true;
            // Clear wanted status when joining police
            if (this.currentSystem) {
                this.currentSystem.playerWanted = false;
                this.currentSystem.policeAlertSent = false;
            }
        } else {
            this.playerFaction = factionName;
        }
        this.hasJoinedFaction = true;
        this.factionShip = shipType;

        // Record faction joining in personal record
        this.recordFactionJoin(factionName);

        PLAYER_LOG(`Player joined ${factionName} faction and received ${shipType}`);
        return true;
    }

    /**
     * Leaves the current faction
     * @returns {boolean} True if successfully left faction, false otherwise
     */
    leaveFaction() {
        // Handle POLICE separately
        if (this.isPolice) {
            this.hasBeenPolice = true;
            this.isPolice = false;
            this.factionShip = null;
            PLAYER_LOG("Player left POLICE faction");
            return true;
        }

        if (!this.playerFaction) {
            PLAYER_LOG("Not currently in any faction");
            return false;
        }

        const oldFaction = this.playerFaction;
        this.playerFaction = null;
        this.factionShip = null;

        PLAYER_LOG(`Player left ${oldFaction} faction`);
        return true;
    }

    // ======================================
    // Bodyguard Management Methods
    // ======================================

    /**
     * Helper method to check if a bodyguard has been spawned
     * @param {Object} guard - The bodyguard object to check
     * @returns {boolean} True if the bodyguard has been spawned
     * @private
     */
    _isBodyguardSpawned(guard) {
        return guard.hull !== null && guard.maxHull !== null;
    }

    // =========================================================================
    // SECTION 12: BODYGUARD MANAGEMENT
    // =========================================================================

    /**
     * Returns count of active (alive) bodyguards
     * @returns {number} Number of active bodyguards
     */
    getActiveGuardsCount() {
        if (!this.activeBodyguards || this.activeBodyguards.length === 0) {
            return 0;
        }
        // Clean up in single pass - avoid creating new array if no destroyed guards
        let count = 0;
        const guards = this.activeBodyguards;
        for (let i = guards.length - 1; i >= 0; i--) {
            if (guards[i].destroyed) {
                // O(1) swap-and-pop removal (order doesn't matter for bodyguards)
                const lastIdx = guards.length - 1;
                if (i !== lastIdx) guards[i] = guards[lastIdx];
                guards.pop();
            } else {
                count++;
            }
        }
        return count;
    }

    /**
     * Returns information about damaged bodyguards
     * @returns {{count: number, totalCost: number}} Info about damaged bodyguards
     */
    getDamagedBodyguardsInfo() {
        if (!this.activeBodyguards || this.activeBodyguards.length === 0) {
            return { count: 0, totalCost: 0 };
        }

        // Single pass: filter destroyed and count damaged guards
        let damagedCount = 0;
        let totalCost = 0;
        const guards = this.activeBodyguards;

        for (let i = guards.length - 1; i >= 0; i--) {
            const guard = guards[i];
            if (guard.destroyed) {
                // O(1) swap-and-pop removal (order doesn't matter for bodyguards)
                const lastIdx = guards.length - 1;
                if (i !== lastIdx) guards[i] = guards[lastIdx];
                guards.pop();
            } else if (this._isBodyguardSpawned(guard) && guard.hull < guard.maxHull) {
                damagedCount++;
                totalCost += Math.floor((guard.maxHull - guard.hull) * 7);
            }
        }

        return {
            count: damagedCount,
            totalCost: totalCost
        };
    }

    /**
     * Hires a bodyguard of the specified ship type
     * @param {string} shipType - The ship type to hire (e.g., "GladiusFighter")
     * @param {number} cost - The cost to hire the bodyguard
     * @returns {boolean} True if hired successfully, false otherwise
     */
    hireBodyguard(shipType, cost) {
        // Check if player has space for more bodyguards
        if (this.getActiveGuardsCount() >= this.bodyguardLimit) {
            PLAYER_LOG("Cannot hire bodyguard: limit reached");
            return false;
        }

        // Check if player has enough credits
        if (this.credits < cost) {
            PLAYER_LOG("Cannot hire bodyguard: not enough credits");
            return false;
        }

        // Deduct credits
        this.credits -= cost;

        // Store bodyguard information (will be spawned when entering a system)
        this.activeBodyguards.push({
            shipType: shipType,
            hull: null, // Will be set when spawned
            maxHull: null, // Will be set when spawned
            destroyed: false,
            enemyRef: null // Reference to the actual Enemy object when spawned
        });

        PLAYER_LOG(`Hired ${shipType} bodyguard for ${cost} credits. Total bodyguards: ${this.activeBodyguards.length}`);
        return true;
    }

    /**
     * Dismisses all active bodyguards
     */
    dismissBodyguards() {
        if (!this.activeBodyguards || this.activeBodyguards.length === 0) {
            PLAYER_LOG("No bodyguards to dismiss");
            return;
        }

        // Remove bodyguards from the current system if they're spawned
        if (this.currentSystem) {
            this.activeBodyguards.forEach(guard => {
                if (guard.enemyRef && !guard.enemyRef.destroyed) {
                    guard.enemyRef.destroyed = true;
                }
            });
        }

        // Clear the bodyguards array
        const count = this.activeBodyguards.length;
        this.activeBodyguards = [];
        PLAYER_LOG(`Dismissed ${count} bodyguard(s)`);
    }

    /**
     * Spawns bodyguards in the current system
     * @param {StarSystem} system - The star system to spawn bodyguards in
     */
    spawnBodyguards(system) {
        if (!this.activeBodyguards || this.activeBodyguards.length === 0) {
            return;
        }

        // Clean up any destroyed bodyguards from the list
        this.activeBodyguards = this.activeBodyguards.filter(guard => !guard.destroyed);

        // Spawn each bodyguard near the player
        this.activeBodyguards.forEach((guard, index) => {
            // Check if guard has an existing enemyRef
            if (guard.enemyRef) {
                // If the guard's enemyRef is in a different system or marked for respawn, clean it up
                if (guard.enemyRef.currentSystem !== system || guard.enemyRef.destroyed) {
                    // Mark old reference as destroyed to clean it from old system
                    if (!guard.enemyRef.destroyed) {
                        guard.enemyRef.destroyed = true;
                    }
                    // Clear the reference so we can spawn a new one
                    guard.enemyRef = null;
                } else {
                    // Guard is already spawned in the current system and alive, skip
                    return;
                }
            }

            // Calculate spawn position near player
            const angle = (TWO_PI / this.activeBodyguards.length) * index;
            const distance = 150 + (index * 50); // Spread them out
            const spawnX = this.pos.x + cos(angle) * distance;
            const spawnY = this.pos.y + sin(angle) * distance;

            // Create the bodyguard enemy
            const bodyguardEnemy = new Enemy(spawnX, spawnY, this, guard.shipType, AI_ROLE.GUARD);
            bodyguardEnemy.principal = this; // Set player as the principal to protect
            bodyguardEnemy.isPlayerBodyguard = true; // Mark as player bodyguard to exclude from system save
            bodyguardEnemy.changeState(AI_STATE.GUARDING);

            // Restore hull if this bodyguard had previous damage
            if (guard.hull !== null && guard.maxHull !== null) {
                bodyguardEnemy.maxHull = guard.maxHull;
                bodyguardEnemy.hull = guard.hull;
            } else {
                // First time spawning, record max hull
                guard.maxHull = bodyguardEnemy.maxHull;
                guard.hull = bodyguardEnemy.hull;
            }

            // Store reference
            guard.enemyRef = bodyguardEnemy;

            // Add to system enemies (use addEnemy for proper Map tracking)
            system.addEnemy(bodyguardEnemy);

            PLAYER_LOG(`Spawned bodyguard ${guard.shipType} at ${spawnX.toFixed(0)}, ${spawnY.toFixed(0)}`);
        });
    }

    /**
     * Syncs bodyguard hull status from their enemy references
     * Should be called periodically to keep bodyguard data up to date
     */
    syncBodyguardStatus() {
        if (!this.activeBodyguards || this.activeBodyguards.length === 0) {
            return;
        }

        let lostCount = 0;
        const guards = this.activeBodyguards;

        // Sync and filter in single pass for better performance
        for (let i = guards.length - 1; i >= 0; i--) {
            const guard = guards[i];
            if (guard.enemyRef) {
                // Sync hull from enemy
                guard.hull = guard.enemyRef.hull;
                guard.maxHull = guard.enemyRef.maxHull;

                // Sync destroyed status
                if (guard.enemyRef.destroyed) {
                    guard.destroyed = true;
                    // O(1) swap-and-pop removal (order doesn't matter for bodyguards)
                    const lastIdx = guards.length - 1;
                    if (i !== lastIdx) guards[i] = guards[lastIdx];
                    guards.pop();
                    lostCount++;
                }
            } else if (guard.destroyed) {
                // O(1) swap-and-pop removal
                const lastIdx = guards.length - 1;
                if (i !== lastIdx) guards[i] = guards[lastIdx];
                guards.pop();
                lostCount++;
            }
        }

        if (lostCount > 0) {
            PLAYER_LOG(`Lost ${lostCount} bodyguard(s) in combat`);
        }
    }

    /**
     * Repairs all damaged bodyguards
     * @param {number} cost - The total cost to repair all damaged bodyguards
     * @returns {boolean} True if repairs were successful, false otherwise
     */
    repairBodyguards(cost) {
        // Check if player has enough credits
        if (this.credits < cost) {
            PLAYER_LOG("Cannot repair bodyguards: not enough credits");
            return false;
        }

        // Filter out destroyed bodyguards
        this.activeBodyguards = this.activeBodyguards.filter(guard => !guard.destroyed);

        // Repair all damaged bodyguards (only those that have been spawned)
        let repairedCount = 0;
        this.activeBodyguards.forEach(guard => {
            if (this._isBodyguardSpawned(guard) && guard.hull < guard.maxHull) {
                guard.hull = guard.maxHull;
                // Also repair the actual enemy if it's spawned
                if (guard.enemyRef && !guard.enemyRef.destroyed) {
                    guard.enemyRef.hull = guard.enemyRef.maxHull;
                }
                repairedCount++;
            }
        });

        // Deduct credits
        this.credits -= cost;

        PLAYER_LOG(`Repaired ${repairedCount} bodyguard(s) for ${cost} credits`);
        return true;
    }

    /**
     * Serializes the player to a JSON-compatible object.
     * Delegates to getSaveData() for consistency.
     */
    toJSON() {
        return this.getSaveData();
    }

    /**
     * Creates a new Player instance from a JSON object.
     * @param {Object} json - The JSON object to deserialize.
     * @returns {Player} The rehydrated Player object.
     */
    static fromJSON(json) {
        const player = new Player(json.shipTypeName || "Sidewinder");
        player.loadSaveData(json);
        return player;
    }
} // End of Player Class

// Single source-of-truth for faction thresholds, ranks and base rank
const FACTION_RANKS = {
    POLICE: {
        base: 'Recruit',
        thresholds: [10, 25, 50, 100, 250, 500, 1000],
        ranks: ['Constable', 'Officer', 'Corporal', 'Sergeant', 'Inspector', 'Chief Inspector', 'Commissioner'],
        usesPrestige: false // Police uses kills
    },
    MILITARY: {
        base: 'Trainee',
        thresholds: [5, 15, 35, 75, 150, 300, 600],
        ranks: ['Cadet', 'Ensign', 'Lieutenant', 'Commander', 'Captain', 'Commodore', 'Admiral'],
        usesPrestige: true // Military uses prestige
    },
    IMPERIAL: {
        base: 'Squire',
        thresholds: [10, 30, 70, 150, 300, 600, 1200],
        ranks: ['Knight', 'Baron', 'Count', 'Marquis', 'Duke', 'Grand Duke', 'Emperor'],
        usesPrestige: true // Imperial uses prestige
    },
    SEPARATIST: {
        base: 'Initiate',
        thresholds: [10, 30, 70, 150, 300, 600, 1200],
        ranks: ["Brawler", "Operative", "Cell Leader", "Collective Coordinator", "Regional Commissar", "Commissar-General", "People's Vanguard"],
        usesPrestige: true // Separatist uses prestige
    }
};