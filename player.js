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
    STARTING_CREDITS: 1000,

    // Visual trails
    TRAIL_SPEED_THRESHOLD_SQ: 49,
    TRAIL_MAX_LENGTH: 40
};

const DEFAULT_INSTALLED_UPGRADES = Object.freeze({
    armor: 0,
    engine: 0,
    cargo: 0,
    hardpoints: 0,
    shield: 0,
    cloak: 0,
    booster: 0
});

function createDefaultInstalledUpgrades() {
    return { ...DEFAULT_INSTALLED_UPGRADES };
}

const DEFAULT_FACTION_STANDING = Object.freeze({
    POLICE: 0,
    MILITARY: 0,
    IMPERIAL: 0,
    SEPARATIST: 0
});

function createDefaultFactionStanding() {
    return { ...DEFAULT_FACTION_STANDING };
}

const ALIEN_COMPANION_BONUS_SPECS = Object.freeze({
    SlitherCreature: Object.freeze({
        role: 'Engineer',
        powerText: 'Repairs 0.35 hull/sec after 6s without taking damage.',
        hullRegenPerSecond: 0.35,
        hullRegenDelayMs: 6000
    }),
    FloaterCreature: Object.freeze({
        role: 'Field Harmonist',
        powerText: 'Improves shield recharge by 12%.',
        shieldRechargeMultiplier: 1.12
    }),
    RollerCreature: Object.freeze({
        role: 'Impact Buffer',
        powerText: 'Reduces incoming damage by 5%.',
        damageTakenMultiplier: 0.95
    }),
    StalkCreature: Object.freeze({
        role: 'Helm Spotter',
        powerText: 'Improves turn rate by 7%.',
        turnRateMultiplier: 1.07
    }),
    HopperCreature: Object.freeze({
        role: 'Booster Tech',
        powerText: 'Recovers boost cooldown 12% faster.',
        boostCooldownRateMultiplier: 1.12
    }),
    GliderCreature: Object.freeze({
        role: 'Flight Trimmer',
        powerText: 'Improves max speed by 5%.',
        maxSpeedMultiplier: 1.05
    }),
    HexapodCreature: Object.freeze({
        role: 'Heat Siphon',
        powerText: 'Cools weapon heat 15% faster.',
        weaponCoolingMultiplier: 1.15
    })
});

/**
 * Deep-clones JSON-serializable state for save/load boundaries.
 * Returns the provided fallback when the source value is nullish.
 * @param {*} value
 * @param {*} fallback
 * @returns {*}
 */
function cloneSerializableState(value, fallback) {
    if (value === undefined || value === null) {
        return fallback;
    }

    return JSON.parse(JSON.stringify(value));
}

function cloneSerializableArray(value) {
    return Array.isArray(value) ? cloneSerializableState(value, []) : [];
}

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
        this.installedUpgrades = createDefaultInstalledUpgrades();
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
        this.loadWeaponsFromShipDefinition(this.shipTypeName);

        // Use armament array length as base weapon slots since ships don't have a weaponSlots property
        this.weaponSlots = (shipDef.armament && shipDef.armament.length) || 1;
        this.maxWeapons = this.weaponSlots;
        this.weaponIndex = 0;
        this.weaponHeat = {};
        this.weaponCooldowns = []; // Per-weapon cooldown timers
        this.currentWeapon = (typeof WEAPON_UPGRADES !== 'undefined')
            ? (WEAPON_UPGRADES.find(w => w.name === "Pulse Laser") || WEAPON_UPGRADES[0])
            : null;
        this.fireRate = this.currentWeapon?.fireRate || 0.5;
        this.fireCooldown = 0; // Legacy/Global cooldown (mostly unused now, kept for safety)

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

        // Surface companion state (set when a befriended alien boards the ship)
        this.alienCompanion = null;
        this.alienCompanionIntroShown = false;

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
        // Hull warning tracking: prevent repeated spamming of warning sounds
        // Keys are thresholds in percent: 100,90,80,...10
        this._hullWarningTriggered = {};
        [100, 90, 80, 70, 60, 50, 40, 30, 20, 10].forEach(t => this._hullWarningTriggered[t] = false);
        // Margin (percent) above threshold required to reset the triggered flag
        this._hullWarningResetMargin = 6; // percent
        // Track scheduled timeout IDs so they can be cleared on death/state change
        this._hullWarningTimeouts = [];
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
        // Special cargo sale missions are instant transactions and do not occupy activeMission
        const incomingType = missionInput instanceof Mission
            ? missionInput.type
            : (missionInput && missionInput.type);
        if (this.activeMission && incomingType !== MISSION_TYPE.SPECIAL_CARGO_SALE) {
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

        // Preserve existing active mission — special cargo sales are instant
        // transactions that must not displace a regular mission slot.
        const previousMission = this.activeMission;

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
                this.activeMission = previousMission;
                return false;
            }
        }

        MISSION_LOG(`   BEFORE activate() call: Mission Title = ${this.activeMission?.title}, Status = ${this.activeMission?.status}`);

        if (this.activeMission?.type === MISSION_TYPE.SPECIAL_CARGO_SALE) {
            const cargoType = this.activeMission.cargoType;
            const cargoQuantity = this.activeMission.cargoQuantity;
            if (!this.hasCargo(cargoType, cargoQuantity)) {
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage(`Cannot complete sale: missing ${cargoQuantity}t ${cargoType}`, [255, 100, 100]);
                }
                this.activeMission = previousMission;
                return false;
            }
        }

        try {
            MISSION_LOG(`   >>> Calling this.activeMission.activate() <<<`);
            const activateResult = this.activeMission.activate(); // <<< EXECUTE THE STATUS CHANGE
            MISSION_LOG(`   <<< Finished this.activeMission.activate() >>>`);

            // Check if activation failed (e.g., not enough cargo space)
            if (activateResult === false) {
                console.error("   Mission activation failed (returned false)");
                this.activeMission = previousMission;
                return false;
            }
        } catch (e) {
            console.error("   !!! ERROR during mission.activate():", e);
            this.activeMission = previousMission; // Restore mission if activation failed critically
            return false; // Indicate failure
        }

        MISSION_LOG(`   AFTER activate() call: Mission Status = ${this.activeMission?.status}`); // Check status immediately after
        // --- End Activation ---

        // Special cargo sale missions complete immediately upon acceptance
        if (this.activeMission?.type === MISSION_TYPE.SPECIAL_CARGO_SALE) {
            const cargoType = this.activeMission.cargoType;
            const cargoQuantity = this.activeMission.cargoQuantity;

            if (!this.removeCargo(cargoType, cargoQuantity)) {
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage(`Cannot complete sale: missing ${cargoQuantity}t ${cargoType}`, [255, 100, 100]);
                }
                this.activeMission = previousMission;
                return false;
            }

            this.activeMission.complete(this);
            // Restore pre-existing mission; complete() already persists via _recordCompletion
            this.activeMission = previousMission;

            if (soundManager?.playSound) {
                soundManager.playSound('missionComplete');
            }
            return true;
        }

        if (this.activeMission.status === 'Active') {
            MISSION_LOG(`--- Mission "${this.activeMission.title}" ACCEPTED & ACTIVATED successfully. ---`);
            if (typeof saveGame === 'function') saveGame();
            // Play mission accept sound
            if (soundManager?.playSound) {
                soundManager.playSound('click');
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
            if (DELIVERY_TYPES && DELIVERY_TYPES.has(this.activeMission.type)) {
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

            // --- BOUNTY MISSIONS (Check progress - all bounty types use same logic) ---
            else if (BOUNTY_TYPES && BOUNTY_TYPES.has(this.activeMission.type)) {
                const bountyLabel = this.activeMission.type === MISSION_TYPE.BOUNTY_PIRATE ? 'Pirate' : 
                                    this.activeMission.type === MISSION_TYPE.BOUNTY_POLICE ? 'Police' : 'Alien';
                MISSION_LOG(`   Bounty Check (${bountyLabel}): Progress ${this.activeMission.progressCount}/${this.activeMission.targetCount}`);
                if (this.activeMission.progressCount >= this.activeMission.targetCount) {
                    MISSION_LOG(`   Bounty Check (${bountyLabel}): Target count met. Allowing completion.`);
                    canComplete = true;
                } else {
                    console.warn(`   Complete failed: Bounty (${bountyLabel}) target count not met.`);
                    return false;
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
            else if (ALL_SABOTAGE_TYPES && ALL_SABOTAGE_TYPES.has(this.activeMission.type)) {
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
            const completedTitle = this.activeMission.title;
            const reward = this.activeMission.rewardCredits;
            
            MISSION_LOG(`   Completing mission: ${completedTitle}`);

            // Remove cargo ONLY for delivery missions (using global DELIVERY_TYPES set for consistency)
            if (DELIVERY_TYPES && DELIVERY_TYPES.has(this.activeMission.type)) {
                MISSION_LOG(`   Removing cargo: ${this.activeMission.cargoQuantity}t ${this.activeMission.cargoType}`);
                this.removeCargo(this.activeMission.cargoType, this.activeMission.cargoQuantity);
            }

            // Use shared completion logic to ensure consistency across both completion paths
            // This includes: credits, prestige, news generation, and illegal consequences
            this.activeMission._executeCompletion(this);

            this.activeMission = null; // Clear active mission from player
            MISSION_LOG(`   activeMission is now: null`);

            // --- Provide feedback ---
            MISSION_LOG(`!!! Mission Complete: ${completedTitle} | Reward: ${reward}cr !!!`);

            // Play mission complete sound
            if (soundManager?.playSound) {
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
        const preservedCompanion = Player.sanitizeAlienCompanionData(this.alienCompanion);
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
        this.weaponSlots = (def.armament && def.armament.length !== undefined) ? def.armament.length : 1;
        this.maxWeapons = this.weaponSlots; // Sync maxWeapons for UI compatibility

        // Update shield properties
        this.maxShield = def.baseShield || 0;
        this.shield = this.maxShield;
        this.shieldRechargeRate = def.shieldRecharge || 0;

        // Load weapons from ship definition
        this.loadWeaponsFromShipDefinition(shipTypeName);

        // Recalculate any derived properties
        this.installedUpgrades = createDefaultInstalledUpgrades(); // Reset upgrades on ship change
        this._applyDefaultUpgrades(def); // Apply default upgrades from definition
        this.recalculateStats(); // Apply bonuses from default upgrades
        this.hull = this.maxHull; // Full hull for new ship
        this.shield = this.maxShield; // Full shield for new ship

        // Ensure companions always persist when changing ships.
        this.alienCompanion = preservedCompanion;

        this.calculateRadianProperties && this.calculateRadianProperties();
        this.updateShipVisual && this.updateShipVisual();
    }

    /**
     * Ejects the player into an escape pod.
     * The original ship is left as a drifting, pilotless hull — enemies that
     * were targeting the player continue attacking it until it is destroyed.
     * The player's new EscapeCapsule fires in the opposite direction of travel.
     * @param {Object} system - The current star system
     */
    ejectEscapePod(system) {
        if (this.shipTypeName === 'EscapeCapsule') return; // Already in a pod

        // Snapshot current state before any transformation
        const oldShipType = this.shipTypeName;
        const oldHull = this.hull;
        const oldPosX = this.pos.x;
        const oldPosY = this.pos.y;
        const oldVelX = this.vel ? this.vel.x : 0;
        const oldVelY = this.vel ? this.vel.y : 0;
        const oldAngle = this.angle;
        const oldAltitude = this.altitude;
        const isSurfaceEjection = (
            typeof surfaceMode !== 'undefined' &&
            surfaceMode &&
            typeof surfaceMode.isActive === 'function' &&
            surfaceMode.isActive() &&
            surfaceMode.player === this
        );

        // Calculate ejection velocity for the capsule (opposite to current velocity)
        const speed = 5.0;
        const velMag = Math.sqrt(oldVelX ** 2 + oldVelY ** 2);
        const ejectionVx = velMag > 0.1 ? (-oldVelX / velMag) * speed : -Math.cos(oldAngle) * speed;
        const ejectionVy = velMag > 0.1 ? (-oldVelY / velMag) * speed : -Math.sin(oldAngle) * speed;

        // In surface mode, cache the abandoned hull as a parked ship descriptor so it remains
        // visible and persists with the same logic used for other parked player ships.
        if (isSurfaceEjection && typeof surfaceMode.cacheParkedPlayerShip === 'function') {
            const abandonedShipState = {
                shipTypeName: oldShipType,
                hull: oldHull,
                shield: this.shield,
                installedUpgrades: JSON.parse(JSON.stringify(this.installedUpgrades || {})),
                weapons: this.weapons ? this.weapons.map(w => w ? { ...w } : null) : [],
                cargo: this.cargo ? this.cargo.map(c => c ? { ...c } : null) : [],
                angle: oldAngle || 0,
                weaponIndex: this.weaponIndex || 0
            };
            const groundH = (typeof surfaceMode._getTerrainHeightAt === 'function')
                ? surfaceMode._getTerrainHeightAt(oldPosX, oldPosY)
                : 0;
            const landedAltitude = groundH + ((typeof SURFACE_CONFIG !== 'undefined' && SURFACE_CONFIG.MIN_ALTITUDE !== undefined) ? SURFACE_CONFIG.MIN_ALTITUDE : 10);
            surfaceMode.cacheParkedPlayerShip(oldPosX, oldPosY, abandonedShipState, landedAltitude);
        }
        // In space, spawn a drifting hull that enemies can continue to engage.
        else if (system && typeof Enemy !== 'undefined' && typeof AI_ROLE !== 'undefined') {
            try {
                const hull = new Enemy(oldPosX, oldPosY, this, oldShipType, AI_ROLE.HAULER);
                hull.pilotEjected = true;   // No AI, no weapons, drifts only
                hull.isPlayerHull = true;   // Flag used by enemy targeting to prefer the hull
                hull.hull = oldHull;        // Carry over current hull damage
                hull.vel.x = oldVelX;
                hull.vel.y = oldVelY;
                hull.angle = oldAngle;
                hull.currentState = AI_STATE.IDLE;
                hull.target = null;
                hull.displayName = null;
                hull.inCombat = false;
                hull.calculateRadianProperties?.();
                hull.initializeColors?.();
                system.addEnemy(hull);

                // Redirect every enemy currently targeting the player to the drifting hull
                if (system.enemies) {
                    for (const e of system.enemies) {
                        if (e !== hull && e.target === this) {
                            e.target = hull;
                        }
                    }
                }

                // Store hull reference so the targeting system can prefer it
                system.playerHull = hull;
            } catch (err) {
                console.error('Failed to spawn player hull:', err);
            }
        }

        // Transform the player object into an EscapeCapsule
        this.applyShipDefinition('EscapeCapsule');

        // Apply ejection velocity to the capsule
        if (this.vel && typeof this.vel.set === 'function') {
            this.vel.set(ejectionVx, ejectionVy);
        } else if (this.vel) {
            this.vel.x = ejectionVx;
            this.vel.y = ejectionVy;
        }

        // Drain cargo — no room in an escape pod
        this.cargo = [];

        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage("Escape pod ejected! Your ship's hull continues to drift.", [255, 200, 80]);
        }
    }

    /**
     * Applies a ship upgrade and recalculates stats.
     * @param {string} type - 'armor', 'engine', 'cargo', 'hardpoints'
     * @param {number} level - 1, 2, 3
     */
    applyUpgrade(type, level) {
        if (!this.installedUpgrades) this.installedUpgrades = createDefaultInstalledUpgrades();

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

        const companionBonus = this.getAlienCompanionBonusSpec();

        // Reset to base
        this.maxHull = def.baseHull;
        this.baseMaxSpeed = def.baseMaxSpeed;
        this.thrustForce = def.baseThrust;
        this.rotationSpeed = def.baseTurnRate;
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

        // Companion species passive bonuses.
        if (companionBonus?.maxSpeedMultiplier) {
            this.baseMaxSpeed *= companionBonus.maxSpeedMultiplier;
        }
        if (companionBonus?.turnRateMultiplier) {
            this.rotationSpeed *= companionBonus.turnRateMultiplier;
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
        let totalSlots = (def.armament && def.armament.length !== undefined) ? def.armament.length : 1; // Base slots from armament array
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

            // Resize weapons array
            while (this.weapons.length < totalSlots) {
                this.weapons.push(null);
            }

            // Resize cooldowns array
            if (!this.weaponCooldowns) this.weaponCooldowns = [];
            while (this.weaponCooldowns.length < totalSlots) {
                this.weaponCooldowns.push(0);
            }
            // Note: We don't truncate on downgrade here to avoid deleting items accidentally.
        }

        // Ensure cooldown array matches weapon count (safety check)
        if (!this.weaponCooldowns) this.weaponCooldowns = [];
        if (this.weaponCooldowns.length < this.weapons.length) {
            while (this.weaponCooldowns.length < this.weapons.length) {
                this.weaponCooldowns.push(0);
            }
        }

        // 5. Shield Upgrades
        this.maxShield = def.baseShield !== undefined ? def.baseShield : 100; // Reset to base
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
        if (this.weapons.length === 0 && shipTypeName !== "EscapeCapsule") {
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
        if (soundManager) {
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

        if (uiManager) {
            uiManager.addMessage("Cloaking device activated", [100, 200, 255]);
        }

        if (soundManager) {
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

        if (uiManager) {
            uiManager.addMessage("Cloak deactivated", [200, 200, 200]);
        }

        if (soundManager) {
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

        // Note: We do NOT reset or carry over fireCooldown here.
        // Each weapon slot tracks its own cooldown in this.weaponCooldowns.
        // The fireWeapon() method will check the specific cooldown for this slot.

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
        // Per-weapon cooldown checks are handled inside fireWeapon()
        // Don't block at this level with global cooldown - let fireWeapon() decide based on current weapon
        this.fireWeapon();
    }

    // =========================================================================
    // SECTION 4: MOVEMENT & INPUT
    // =========================================================================

    /** Handles continuous key presses for movement & new features */
    handleInput() {
        // [GHOST CONTROL FIX] 
        // If in surface mode and NOT controlling the ship (e.g. in ASTRONAUT mode), 
        // ignore all ship inputs to prevent "ghost" movements.
        if (typeof surfaceMode !== 'undefined' && surfaceMode &&
            typeof surfaceMode.isActive === 'function' && surfaceMode.isActive() &&
            surfaceMode.controlMode !== 'SHIP') {
            return;
        }

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

        // Update per-weapon cooldowns
        if (this.weaponCooldowns && this.weaponCooldowns.length > 0) {
            const dtSec = deltaTime * 0.001;
            for (let i = 0; i < this.weaponCooldowns.length; i++) {
                if (this.weaponCooldowns[i] > 0) {
                    this.weaponCooldowns[i] -= dtSec;
                }
            }
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

        // Trigger initial booster blast shake
        if (typeof cameraSystem !== 'undefined') {
            cameraSystem.triggerShake(8.5);
        }

        if (typeof soundManager !== 'undefined') {
            soundManager.playSound('shieldUp');
        }

        return true;
    }

    /** Apply a left-strafe (kite) thrust with optional analog strength. */
    kiteLeft(multiplier = 0.4) {
        if (typeof SharedPhysics !== 'undefined') {
            SharedPhysics.thrustStrafe(this, -1, multiplier);
        }
    }

    /** Apply a right-strafe (kite) thrust with optional analog strength. */
    kiteRight(multiplier = 0.4) {
        if (typeof SharedPhysics !== 'undefined') {
            SharedPhysics.thrustStrafe(this, 1, multiplier);
        }
    }


    /** 
     * Applies reverse thrust (slower backward movement)
     * Uses opposite direction from current facing angle.
     */
    reverseThrust(multiplier = PLAYER_CONFIG.REVERSE_THRUST_MULTIPLIER) {
        if (typeof SharedPhysics !== 'undefined') {
            SharedPhysics.thrustReverse(this, multiplier, false);
        } else {
            // Fallback if SharedPhysics missing (though unlikely to happen if setup correct)
            // IMPORTANT: Must apply timeScale for frame-rate independence
            const dt = (typeof deltaTime !== 'undefined' ? deltaTime / 1000 : 1 / 60);
            const timeScale = dt / (1 / 60);
            const reverseAngle = this.angle + PI;
            const reducedForce = this.thrustForce * multiplier;
            this.vel.add(cos(reverseAngle) * reducedForce * timeScale, sin(reverseAngle) * reducedForce * timeScale);
        }

        // Create thrust particles at ship's front sides for reverse thrusters
        if (this.thrustManager) {
            // Pre-calculate common values
            const cosA = cos(this.angle);
            const sinA = sin(this.angle);
            const thrustSize = this.size * 0.4; // Proportionate flame size

            let localX = this.size * 0.35; // Positioned near the front outline (fallback)
            let localY_left = -this.size * 0.15; // Left side offset (negative Y) (fallback)
            let localY_right = this.size * 0.15; // Right side offset (positive Y) (fallback)

            const cacheKey = this.shipTypeName + "_" + this.size;
            if (this._cachedFrontKey !== cacheKey) {
                if (this.shipTypeName && typeof SHIP_DEFINITIONS !== 'undefined' && SHIP_DEFINITIONS[this.shipTypeName]) {
                    const def = SHIP_DEFINITIONS[this.shipTypeName];
                    let vertices = [];
                    if (Array.isArray(def.vertexData)) {
                        vertices = def.vertexData;
                    } else if (Array.isArray(def.vertexLayers) && def.vertexLayers.length > 0) {
                        const layer = def.vertexLayers[0];
                        if (layer && Array.isArray(layer.vertexData)) {
                            vertices = layer.vertexData;
                        }
                    }

                    if (vertices.length > 1) {
                        // Find maxX (the front boundary/nose tip)
                        let maxX = -999;
                        for (let i = 0; i < vertices.length; i++) {
                            const vx = vertices[i].x;
                            if (vx > maxX) maxX = vx;
                        }

                        // Place front thrusters at 60% of maxX (40% back from nose tip)
                        const targetLocalX = maxX * 0.6;
                        let foundLeft = false;
                        let foundRight = false;
                        let y_left = 0;
                        let y_right = 0;

                        for (let i = 0; i < vertices.length; i++) {
                            const v1 = vertices[i];
                            const v2 = vertices[(i + 1) % vertices.length];

                            // Check if edge spans across targetLocalX
                            const minEdgeX = Math.min(v1.x, v2.x);
                            const maxEdgeX = Math.max(v1.x, v2.x);

                            if (targetLocalX >= minEdgeX && targetLocalX <= maxEdgeX && minEdgeX !== maxEdgeX) {
                                // Interpolate Y at targetLocalX
                                const t = (targetLocalX - v1.x) / (v2.x - v1.x);
                                const y_intersect = v1.y + t * (v2.y - v1.y);

                                if (y_intersect < 0) {
                                    if (!foundLeft || y_intersect < y_left) {
                                        y_left = y_intersect;
                                        foundLeft = true;
                                    }
                                } else {
                                    if (!foundRight || y_intersect > y_right) {
                                        y_right = y_intersect;
                                        foundRight = true;
                                    }
                                }
                            }
                        }

                        if (foundLeft && foundRight) {
                            const r = this.size * 0.5;
                            localX = targetLocalX * r;
                            // Add a tiny outward margin offset (1.5 units) so nozzle clearance is clean
                            localY_left = y_left * r - 1.5;
                            localY_right = y_right * r + 1.5;
                        }
                    }
                }
                this._cachedFrontKey = cacheKey;
                this._cachedFrontLocalX = localX;
                this._cachedFrontLocalYLeft = localY_left;
                this._cachedFrontLocalYRight = localY_right;
            } else {
                localX = this._cachedFrontLocalX;
                localY_left = this._cachedFrontLocalYLeft;
                localY_right = this._cachedFrontLocalYRight;
            }

            // Left nozzle position
            const leftPosX = this.pos.x + localX * cosA - localY_left * sinA;
            const leftPosY = this.pos.y + localX * sinA + localY_left * cosA;
            const leftExhaustAngle = this.angle - PI * 0.25; // Shoots forward-left diagonal

            // Right nozzle position
            const rightPosX = this.pos.x + localX * cosA - localY_right * sinA;
            const rightPosY = this.pos.y + localX * sinA + localY_right * cosA;
            const rightExhaustAngle = this.angle + PI * 0.25; // Shoots forward-right diagonal

            // Create thrust using cached position object to avoid allocations
            if (!this._tempThrustPos) this._tempThrustPos = createVector(0, 0);

            // particles fly in direction of exhaustAngle (so createThrust parameter is exhaustAngle - PI)
            this._tempThrustPos.set(leftPosX, leftPosY);
            this.thrustManager.createThrust(this._tempThrustPos, leftExhaustAngle - PI, thrustSize, 1, false, null, true, 'rear', multiplier);

            this._tempThrustPos.set(rightPosX, rightPosY);
            this.thrustManager.createThrust(this._tempThrustPos, rightExhaustAngle - PI, thrustSize, 1, false, null, true, 'rear', multiplier);

            // FALLBACK: Direct visual rendering if thrustManager isn't showing particles
            // This will ensure there's always a visual indicator even if the thrust particles fail
            push();
            fill(255, 150, 255, 200); // Bright magenta with some transparency
            noStroke();

            // Left thruster triangle (base at nozzle, tip pointing along leftExhaustAngle)
            translate(leftPosX, leftPosY);
            rotate(leftExhaustAngle);
            triangle(0, -3, 0, 3, 10, 0);

            // Right thruster triangle (base at nozzle, tip pointing along rightExhaustAngle)
            translate(rightPosX - leftPosX, rightPosY - leftPosY); // Relative translation
            rotate(rightExhaustAngle - leftExhaustAngle); // Relative rotation
            triangle(0, -3, 0, 3, 10, 0);

            pop();
        }
    }

    /** Applies forward thrust force based on current facing angle (radians). */
    thrust(multiplier = 1.0) {
        if (typeof SharedPhysics !== 'undefined') {
            // Enable particles here since we removed them from update() loop
            SharedPhysics.thrustForward(this, multiplier, true);
        } else {
            // Fallback if SharedPhysics missing
            // IMPORTANT: Must apply timeScale for frame-rate independence
            if (isNaN(this.angle)) { this.angle = 0; }
            const dt = (typeof deltaTime !== 'undefined' ? deltaTime / 1000 : 1 / 60);
            const timeScale = dt / (1 / 60);
            const force = this.thrustForce * multiplier;
            this.vel.add(cos(this.angle) * force * timeScale, sin(this.angle) * force * timeScale);
        }
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

        // Check if landed on planet surface (Safety Lock)
        // Access global surfaceMode instance if available
        if (typeof surfaceMode !== 'undefined' && surfaceMode &&
            typeof surfaceMode.isActive === 'function' && surfaceMode.isActive() &&
            surfaceMode.isLanded) {

            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage("Weapons Safety: Landed", [200, 200, 200], 2000);
            }
            if (typeof soundManager !== 'undefined') {
                soundManager.playSound('error');
            }
            return false;
        }

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
            // Barrier uses its own separate timer logic usually, but let's respect slot cooldown too
            const currentCooldown = this.weaponCooldowns[this.weaponIndex] || 0;
            if (currentCooldown <= 0) { // Check cooldown for barrier itself
                this.isBarrierActive = true;
                this.barrierDamageReduction = this.currentWeapon.damageReduction;
                this.barrierDurationTimer = this.currentWeapon.duration;
                this.barrierColor = this.currentWeapon.color;

                // Set cooldown for THIS specific weapon slot (not global fireCooldown)
                // This matches enemy behavior and prevents blocking other weapons
                const cooldownTime = this.computeCooldown(this.currentWeapon.fireRate);
                this.weaponCooldowns[this.weaponIndex] = cooldownTime;

                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage("Barrier Activated!", this.barrierColor, 2000);
                }
                if (typeof soundManager !== 'undefined') {
                    soundManager.playSound('barrierUp');
                }
                if (typeof WeaponSystem !== 'undefined' && typeof WeaponSystem.addMuzzleFlash === 'function') {
                    WeaponSystem.addMuzzleFlash(this, this.pos.x, this.pos.y, this.barrierColor, 30, this.angle);
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
        } else if (this.currentWeapon.type === WEAPON_TYPE.BEAM && this === player) {
            // Player beam aiming: gamepad twin-stick takes priority, then mouse fallback
            const inputMgr = globalThis._inputManager || globalThis.window?._inputManager;
            const gpBeamAngle = inputMgr?.getBeamAimAngle?.();
            if (gpBeamAngle !== null && gpBeamAngle !== undefined) {
                // Gamepad twin-stick: use the smoothed aim angle directly
                fireAngle = gpBeamAngle;
            } else if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                // Surface mode mouse: ship at screen center, aim at mouse position
                const dx = mouseX - width / 2;
                const dy = mouseY - height / 2;
                fireAngle = atan2(dy, dx);
            } else {
                // Normal space mode mouse: convert screen mouse position to world coordinates
                const worldMx = mouseX + (this.pos.x - width / 2);
                const worldMy = mouseY + (this.pos.y - height / 2);
                fireAngle = atan2(worldMy - this.pos.y, worldMx - this.pos.x);
            }
        }
        // For turrets, WeaponSystem.fireTurret handles its own aiming if no target is passed.
        // If a target is passed (effectiveTarget), it will be used.

        // Check weapon slot cooldown (except Barriers which handle it above)
        if (this.currentWeapon.type !== WEAPON_TYPE.BARRIER) {
            const cd = (this.weaponCooldowns && this.weaponCooldowns[this.weaponIndex]) || 0;
            if (cd > 0) return false;
        }

        const fired = WeaponSystem.fire(this, this.currentSystem, fireAngle, this.currentWeapon.type, effectiveTarget);
        if (fired) {
            // Set cooldown for THIS specific weapon slot
            const cooldownTime = this.computeCooldown(this.fireRate);
            this.weaponCooldowns[this.weaponIndex] = cooldownTime;

            // Keep legacy fireCooldown for backward compat (e.g. barriers or external checks)
            this.fireCooldown = cooldownTime;

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
        const companionBonus = this.getAlienCompanionBonusSpec();

        if (typeof WeaponSystem !== 'undefined' && Number.isFinite(deltaSeconds)) {
            const weaponCoolingMultiplier = companionBonus?.weaponCoolingMultiplier || 1;
            WeaponSystem.coolWeaponHeat(this, deltaSeconds * weaponCoolingMultiplier);
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

        // Note: Drag effect timer is now handled by SharedPhysics.updatePhysics()
        // We just need to show the UI message when the effect ends
        if (this.dragEffectTimer > 0) {
            // SharedPhysics handles the countdown, we just check for the transition
            // to show the restoration message
        } else if (this._wasTangled) {
            // Timer just expired - show message once
            this._wasTangled = false;
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage("Engines restored to normal operation.", "#30FFB4");
            }
        }
        // Track tangle state for UI message
        if (this.dragEffectTimer > 0) {
            this._wasTangled = true;
        }

        // Update cloak timers
        if (this.isCloaked) {
            this.cloakDurationTimer -= deltaSeconds;
            if (this.cloakDurationTimer <= 0) {
                this.deactivateCloak();
            }
        }
        if (this.cloakCooldownTimer > 0) {
            const cloakCooldownRate = companionBonus?.cloakCooldownRateMultiplier || 1;
            this.cloakCooldownTimer -= deltaSeconds * cloakCooldownRate;
            if (this.cloakCooldownTimer < 0) {
                this.cloakCooldownTimer = 0;
            }
        }
        // Reset hull-warning triggers when hull recovers sufficiently above thresholds
        try {
            if (typeof this._hullWarningTriggered === 'object' && this.maxHull > 0) {
                const hullPercentNow = (this.hull / this.maxHull) * 100;
                const resetMargin = Number(this._hullWarningResetMargin) || 6;
                const thresholdsToCheck = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
                for (const tt of thresholdsToCheck) {
                    if (this._hullWarningTriggered[tt] && hullPercentNow > (tt + resetMargin)) {
                        this._hullWarningTriggered[tt] = false;
                    }
                }
            }
        } catch (e) {
            // Non-fatal
        }
        // ---- End new section ----


        // Update booster cooldown timer
        if (this.boostCooldownTimer > 0) {
            const boostCooldownRate = companionBonus?.boostCooldownRateMultiplier || 1;
            this.boostCooldownTimer -= deltaSeconds * boostCooldownRate;
            if (this.boostCooldownTimer < 0) {
                this.boostCooldownTimer = 0;
            }
        }

        // --- Speed Burst Thrust & State Management ---
        if (this.isSpeedBursting) {
            // Update boost duration timer
            this.boostDurationTimer -= deltaSeconds;

            // Settle a slight vibration shake while booster is active
            if (typeof cameraSystem !== 'undefined') {
                cameraSystem.triggerShake(0.8);
            }

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

        // Physics update (Drag, Speed Cap, Movement) via SharedPhysics
        if (typeof SharedPhysics !== 'undefined') {
            SharedPhysics.updatePhysics(this, deltaSeconds);
        }

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
            const shieldRechargeMultiplier = companionBonus?.shieldRechargeMultiplier || 1;
            const rechargeAmount = this.shieldRechargeRate * SHIELD_RECHARGE_RATE_MULTIPLIER * shieldRechargeMultiplier * deltaSeconds;
            const prevShield = this.shield;
            const newShield = Math.min(this.maxShield, prevShield + rechargeAmount);
            // Play shield-up cue when recovering from 0
            if (prevShield === 0 && newShield > 0 && this._shieldWasZero) {
                if (typeof soundManager !== 'undefined') { soundManager.playSound('shieldUp', 1.0, this); }
                this._shieldWasZero = false;
            }
            this.shield = newShield;
        }

        // Minor out-of-combat hull repair for engineer companions.
        if (companionBonus?.hullRegenPerSecond > 0 && this.hull > 0 && this.hull < this.maxHull) {
            const hullRegenDelayMs = companionBonus.hullRegenDelayMs || 6000;
            if ((currentTime - this.lastDamageTime) > hullRegenDelayMs) {
                const hullRepairAmount = companionBonus.hullRegenPerSecond * deltaSeconds;
                this.hull = Math.min(this.maxHull, this.hull + hullRepairAmount);
            }
        }

        // Sync bodyguard status from their enemy references
        this.syncBodyguardStatus();

        // Per-frame mission monitoring (ensure mission logic runs each update)
        if (this.activeMission && typeof this.activeMission.update === 'function') {
            try {
                this.activeMission.update(this.currentSystem, this);
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

        // Update thrust particles
        if (this.thrustManager) {
            this.thrustManager.update();
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

    _updateVelocityTrail() {
        if (!this._velocityTrail) this._velocityTrail = [];
        const vx = this.vel?.x || 0;
        const vy = this.vel?.y || 0;
        const speedSq = vx * vx + vy * vy;

        if (speedSq > PLAYER_CONFIG.TRAIL_SPEED_THRESHOLD_SQ) {
            this._velocityTrail.push({ x: this.pos.x, y: this.pos.y });
            if (this._velocityTrail.length > PLAYER_CONFIG.TRAIL_MAX_LENGTH) this._velocityTrail.shift();
        } else if (this._velocityTrail.length > 0) {
            this._velocityTrail.shift();
        }
    }

    _drawVelocityTrail() {
        const trail = this._velocityTrail;
        if (!trail || trail.length < 2) return;

        const vx = this.vel?.x || 0;
        const vy = this.vel?.y || 0;
        const speed = Math.sqrt(vx * vx + vy * vy);
        const baseWidth = (this.size || 30) * 0.22;
        const speedScale = Math.min(2.0, speed / 7);

        push();
        noFill();
        blendMode(ADD);
        for (let i = 1; i < trail.length; i++) {
            const p0 = trail[i - 1];
            const p1 = trail[i];
            const lifeT = i / (trail.length - 1);
            const alpha = (10 + lifeT * 130) * speedScale;
            stroke(120, 200, 255, alpha);
            strokeWeight(Math.max(0.5, baseWidth * lifeT * lifeT));
            line(p0.x, p0.y, p1.x, p1.y);
        }
        blendMode(BLEND);
        pop();
    }

    /** Draws the player ship using its specific draw function. */
    draw(overrideSunAngle = null) {
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

        this._updateVelocityTrail();
        this._drawVelocityTrail();

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
        // For Surface Mode, we accept an override since (0,0) is not the sun.
        let sunAngle;
        if (overrideSunAngle !== null && overrideSunAngle !== undefined) {
            sunAngle = overrideSunAngle;
        } else if (typeof getNearestSunAngleForEntity === 'function') {
            sunAngle = getNearestSunAngleForEntity(this);
        } else {
            sunAngle = atan2(-this.pos.y, -this.pos.x);
        }
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

        // --- Health Bar ---
        // Show health bar below ship if damaged
        if (this.hull < this.maxHull && this.maxHull > 0) {
            push();
            rectMode(CORNER);
            translate(this.pos.x, this.pos.y);
            let healthPercent = this.hull / this.maxHull;
            let barW = this.size * 0.9;
            let barH = 6;
            let barX = -barW / 2;
            let barY = this.size / 2 + 5;

            noStroke();
            fill(HEALTH_BAR_COLORS.BG);
            rect(barX, barY, barW, barH);
            fill(HEALTH_BAR_COLORS.FILL);
            rect(barX, barY, barW * healthPercent, barH);
            pop();
        }
        // --- End Health Bar ---

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

        // Surface mode filter: skip force wave effect in surface mode (handled by surfaceMode._drawForceWaves)
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
            const beamAge    = millis() - this.lastBeam.time;
            const beamAlpha  = map(beamAge, 0, 150, 255, 0); // fade to transparent
            const sx         = this.lastBeam.start.x;
            const sy         = this.lastBeam.start.y;
            const ex         = this.lastBeam.end.x;
            const ey         = this.lastBeam.end.y;
            if (typeof LightingEffects !== 'undefined' && typeof LightingEffects.drawBeamGlow === 'function') {
                LightingEffects.drawBeamGlow(sx, sy, ex, ey, this.lastBeam.color, {
                    baseWidth: 2.8,
                    alphaScale: beamAlpha / 255,
                    outerAlpha: 46,
                    midAlpha: 89,
                    coreAlpha: 217,
                    whiteAlpha: 191
                });
            }
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

        // Mark the time of any incoming damage so systems (autopilot) can react
        this.lastDamageTime = millis();

        if (this.destroyed || amount <= 0) return { damage: 0, shieldHit: false };

        // Taking damage breaks cloak
        if (this.isCloaked) {
            this.deactivateCloak();
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage("Cloak disrupted by damage!", [255, 150, 100]);
            }
        }

        // Snapshot previous hull percent (used to detect threshold crossings)
        const prevHullPercent = (this.maxHull > 0) ? (this.hull / this.maxHull) * 100 : 0;

        let shieldHit = false;
        let actualDamage = amount;
        const companionBonus = this.getAlienCompanionBonusSpec();
        if (companionBonus?.damageTakenMultiplier) {
            actualDamage *= companionBonus.damageTakenMultiplier;
        }
        let hullDamageFromHit = 0;
        const triggerGamepadHitRumble = (isShieldHit, damageAmount) => {
            if (damageAmount <= 0) return;
            const gp = globalThis._gamepadManager || globalThis.window?._gamepadManager;
            if (!gp?.connected || typeof gp.rumble !== 'function') return;
            if (gp.state?.mode !== 'S-MODE (Switch)') return;

            const intensity = isShieldHit ? 0.35 : 0.6;
            const duration = isShieldHit ? 90 : 140;
            gp.rumble(intensity, duration);
        };

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
                triggerGamepadHitRumble(true, actualDamage);
                return { damage: actualDamage, shieldHit: true };
            } else {
                // Shield is depleted, remaining damage goes to hull
                const remainingDamage = actualDamage - this.shield;
                this.shield = 0;
                this.hull -= remainingDamage;
                hullDamageFromHit = remainingDamage;

                // CRITICAL FIX: This is STILL a shield hit even though it depleted the shield
                //uiManager.addMessage(`Shield down! Hull damage: ${remainingDamage.toFixed(1)}`, [255, 50, 50]);

                // Always report as a shield hit if shields absorbed ANY damage
                shieldHit = true;
            }
        } else {
            // No shields, damage hull directly
            this.hull -= actualDamage;
            hullDamageFromHit = actualDamage;
            //uiManager.addMessage(`Hull damage: ${actualDamage.toFixed(1)}`, [255, 50, 50]);
            shieldHit = false;
        }
        const isShieldOnlyHit = shieldHit && hullDamageFromHit <= 0;
        triggerGamepadHitRumble(isShieldOnlyHit, actualDamage);

        // Trigger camera shake on taking damage
        if (typeof cameraSystem !== 'undefined' && actualDamage > 0) {
            const shakeAmt = isShieldOnlyHit ? (actualDamage * 0.8) : (actualDamage * 2.5);
            cameraSystem.triggerShake(shakeAmt);
        }

        // Screen-flash lighting effect for significant hits
        if (typeof LightingEffects !== 'undefined' && actualDamage > 0) {
            if (!shieldHit) {
                // Hull hit: red flash, scaled with damage severity
                const hullPct = this.maxHull > 0 ? hullDamageFromHit / this.maxHull : 0;
                const flashAlpha = Math.min(110, 40 + hullPct * 350);
                LightingEffects.addScreenFlash([255, 30, 30], flashAlpha);
            } else if (isShieldOnlyHit) {
                // Shield-only hit: subtle cyan flash
                LightingEffects.addScreenFlash([80, 180, 255], 30);
            }
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

        // Faction ally aid: nearby same-faction NPCs may respond when the player takes hull damage
        if (hullDamageFromHit > 0 && attacker && typeof communicationSystem !== 'undefined' &&
            (this.playerFaction || this.isPolice) && this.currentSystem) {
            communicationSystem.handlePlayerUnderAttack(attacker, this.currentSystem);
        }

        // Check for destruction
        // Compute current hull percent and handle hull-warning thresholds
        const curHullPercent = (this.maxHull > 0) ? (this.hull / this.maxHull) * 100 : 0;

        try {
            // Update last damage timestamp (used by autopilot disable)
            this.lastDamageTime = millis();

            // Check threshold crossings (multiple thresholds may be crossed in one hit)
            const thresholds = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
            const playSpacingMs = 150; // spacing between consecutive threshold plays
            let playIndex = 0;
            for (const t of thresholds) {
                // Trigger when we moved from >= threshold to < threshold
                if (prevHullPercent >= t && curHullPercent < t && !this._hullWarningTriggered[t]) {
                    this._hullWarningTriggered[t] = true;

                    // Schedule single play for this threshold (spaced to avoid overlap)
                    try {
                        const timeoutId = setTimeout(() => {
                            if (!this.destroyed && typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
                                soundManager.playSound('warning');
                            }
                        }, playIndex * playSpacingMs);
                        this._hullWarningTimeouts.push(timeoutId);
                        playIndex++;
                    } catch (e) {
                        // ignore scheduling errors
                    }
                }
            }
        } catch (e) {
            // Non-fatal if sound system errors; continue with normal damage flow
            console.warn('Hull warning trigger failed:', e);
        }

        if (this.hull <= 0) {
            this.hull = 0;
            this.destroyed = true;
            this.explosionStartTime = millis(); // Track start time
            this.exploding = true; // Flag to track explosion sequence
            this.isDying = true; // Flag to prevent interactions during death animation

            // Clear any scheduled hull warning plays and reset flags on death
            try {
                if (Array.isArray(this._hullWarningTimeouts)) {
                    for (const id of this._hullWarningTimeouts) {
                        try { clearTimeout(id); } catch (_) { }
                    }
                    this._hullWarningTimeouts = [];
                }
                if (this._hullWarningTriggered) {
                    for (const k in this._hullWarningTriggered) {
                        this._hullWarningTriggered[k] = false;
                    }
                }
            } catch (e) {
                // non-fatal
            }

            // Create player explosion (larger, more dramatic)
            if (this.currentSystem && typeof this.currentSystem.addExplosion === 'function') {
                // Surface mode filter: check if we're in surface mode for proper explosion rendering
                const inSurfaceMode = typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive();

                if (inSurfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
                    // Use centralized surface mode API for projection
                    surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, this.altitude || 0, this.size * 3, [100, 150, 255]);
                } else {
                    // Space mode or fallback
                    this.currentSystem.addExplosion(this.pos.x, this.pos.y, this.size * 3, [100, 150, 255]);
                }

                // Create cascading secondary explosions
                for (let i = 0; i < 12; i++) { // More secondary explosions
                    setTimeout(() => {
                        // Check if currentSystem still exists when timeout runs
                        if (this.currentSystem && typeof this.currentSystem.addExplosion === 'function') {
                            const offX = random(-this.size * 1.2, this.size * 1.2);
                            const offY = random(-this.size * 1.2, this.size * 1.2);
                            const sz = this.size * random(0.7, 1.5);
                            const col = [random(100, 200), random(150, 255), random(200, 255)];

                            if (inSurfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
                                // Add random offsets in world space, the API will project them
                                surfaceMode._createSurfaceExplosion(this.pos.x + offX, this.pos.y + offY, this.altitude || 0, sz, col);
                            } else {
                                this.currentSystem.addExplosion(this.pos.x + offX, this.pos.y + offY, sz, col);
                            }
                        }
                    }, i * (1000 / 12)); // Spread over 1 second
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
        const radius = station.dockingRadius ?? 0;
        const speed = this.vel.mag();

        // Check range first
        if (d < radius) {
            // Check for specific docking blockers
            if (station.quarantineExpires && millis() < station.quarantineExpires) {
                // Debounce message every 2.5 seconds to avoid spamming while hovering
                // Only show if speed is relatively low (indicating intent to dock) to avoid spam during flybys
                if (speed < 2.0) {
                    if (!this._lastQuarantineMsg || millis() - this._lastQuarantineMsg > 2500) {
                        if (typeof uiManager !== 'undefined') {
                            uiManager.addMessage(`Docking Protocol Override: Station under Quarantine!`, [255, 80, 80]);
                            if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                        }
                        this._lastQuarantineMsg = millis();
                    }
                }
                return false;
            }
        }

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

    static sanitizeAlienCompanionData(data) {
        if (!data || typeof data !== 'object') return null;

        const safeString = (value, fallback, maxLen = 120) => {
            if (typeof value !== 'string') return fallback;
            const trimmed = value.trim();
            if (!trimmed) return fallback;
            return trimmed.slice(0, maxLen);
        };

        const coerceColor = (input) => {
            if (!Array.isArray(input) || input.length < 3) return [120, 220, 180];
            return [0, 1, 2].map(i => {
                const n = Number(input[i]);
                if (!Number.isFinite(n)) return 180;
                return Math.max(0, Math.min(255, Math.round(n)));
            });
        };

        const species = safeString(data.species, 'SurfaceFauna', 64);
        const fallbackPowerText = Player.getAlienCompanionPowerTextBySpecies(species);

        return {
            name: safeString(data.name, 'Laine', 48),
            species,
            description: safeString(
                data.description,
                `A curious alien lifeform that now travels with your crew. Companion power: ${fallbackPowerText}`,
                240
            ),
            portraitColor: coerceColor(data.portraitColor),
            seed: Number.isFinite(Number(data.seed)) ? Number(data.seed) : 0,
            size: Number.isFinite(Number(data.size)) ? Number(data.size) : 20,
            boardedAt: Number.isFinite(Number(data.boardedAt)) ? Number(data.boardedAt) : Date.now()
        };
    }

    static getAlienCompanionBonusSpecBySpecies(species) {
        if (typeof species !== 'string' || !species.trim()) return null;
        return ALIEN_COMPANION_BONUS_SPECS[species.trim()] || null;
    }

    static getAlienCompanionPowerTextBySpecies(species) {
        const bonusSpec = Player.getAlienCompanionBonusSpecBySpecies(species);
        return bonusSpec?.powerText || 'No special power identified yet.';
    }

    getAlienCompanionBonusSpec() {
        if (!this.alienCompanion) return null;
        return Player.getAlienCompanionBonusSpecBySpecies(this.alienCompanion.species);
    }

    getAlienCompanionPowerText(companionData = this.alienCompanion) {
        return Player.getAlienCompanionPowerTextBySpecies(companionData?.species);
    }

    setAlienCompanion(companionData) {
        this.alienCompanion = Player.sanitizeAlienCompanionData(companionData);
        this.recalculateStats();
        return this.alienCompanion;
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
            installedUpgrades: cloneSerializableState(this.installedUpgrades, createDefaultInstalledUpgrades()), // Save upgrades
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
            factionKills: cloneSerializableState(this.factionKills, createDefaultFactionStanding()),
            factionPrestige: cloneSerializableState(this.factionPrestige, createDefaultFactionStanding()),
            // --- Save the plain mission data object ---
            activeMission: missionDataToSave,
            weaponIndex: this.weaponIndex, // Save the index instead of just the name
            weapons: weaponsData
            ,
            // Persist hired bodyguards (only store serializable fields)
            activeBodyguards: (this.activeBodyguards || []).map(g => ({
                shipType: g.shipType,
                hull: (typeof g.hull === 'number') ? g.hull : null,
                maxHull: (typeof g.maxHull === 'number') ? g.maxHull : null,
                destroyed: !!g.destroyed,
                displayName: (typeof g.displayName === 'string') ? g.displayName : (g.enemyRef?.displayName || null),
                gender: (typeof g.gender === 'string') ? g.gender : (g.enemyRef?.gender || null)
            })),
            // Navigation preferences
            showSecretBaseNavigation: this.showSecretBaseNavigation || false,
            // Personal record tracking
            shipsDestroyed: cloneSerializableState(this.shipsDestroyed, []),
            systemsVisited: cloneSerializableState(this.systemsVisited, []),
            stationsTraded: cloneSerializableState(this.stationsTraded, []),
            factionsJoined: cloneSerializableState(this.factionsJoined, []),
            eliteStatusChanges: cloneSerializableState(this.eliteStatusChanges, []),
            missionsCompleted: cloneSerializableState(this.missionsCompleted, []),
            wantedStatusChanges: cloneSerializableState(this.wantedStatusChanges, []),
            shipsPurchased: cloneSerializableState(this.shipsPurchased, []),
            weaponsUpgraded: cloneSerializableState(this.weaponsUpgraded, []),
            // Secret base storage
            secretStorage: cloneSerializableState(this.secretStorage, []),
            // Surface companion
            alienCompanion: Player.sanitizeAlienCompanionData(this.alienCompanion),
            alienCompanionIntroShown: !!this.alienCompanionIntroShown
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

        // Restore upgrades from the save payload when explicitly present.
        this.installedUpgrades = cloneSerializableState(data.installedUpgrades, this.installedUpgrades);
        if (data.installedUpgrades != null) {
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

        const loadedMaxShield = data.maxShield;
        const loadedShield = data.shield;
        const loadedShieldRechargeRate = data.shieldRechargeRate;

        this.kills = data.kills ?? 0;

        // Load faction kills with defaults
        this.factionKills = cloneSerializableState(data.factionKills, createDefaultFactionStanding());
        // Ensure all faction keys exist (check for undefined/null, not falsy values)
        const requiredFactions = ['POLICE', 'MILITARY', 'IMPERIAL', 'SEPARATIST'];
        requiredFactions.forEach(faction => {
            if (this.factionKills[faction] === undefined || this.factionKills[faction] === null) {
                this.factionKills[faction] = 0;
            }
        });

        // Load faction prestige with defaults
        this.factionPrestige = cloneSerializableState(data.factionPrestige, createDefaultFactionStanding());
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
                    displayName: (typeof sb.displayName === 'string') ? sb.displayName : null,
                    gender: (typeof sb.gender === 'string') ? sb.gender : null,
                    enemyRef: null
                });
            });
            SAVE_LOG(`Restored ${this.activeBodyguards.length} hired bodyguard(s) from save data.`);
        } else {
            // Ensure property exists for runtime code
            this.activeBodyguards = this.activeBodyguards || [];
        }

        // Restore personal record tracking
        this.shipsDestroyed = cloneSerializableArray(data.shipsDestroyed);
        this.systemsVisited = cloneSerializableArray(data.systemsVisited);
        this.stationsTraded = cloneSerializableArray(data.stationsTraded);
        this.factionsJoined = cloneSerializableArray(data.factionsJoined);
        this.eliteStatusChanges = cloneSerializableArray(data.eliteStatusChanges);
        this.missionsCompleted = cloneSerializableArray(data.missionsCompleted);
        this.wantedStatusChanges = cloneSerializableArray(data.wantedStatusChanges);
        this.shipsPurchased = cloneSerializableArray(data.shipsPurchased);
        this.weaponsUpgraded = cloneSerializableArray(data.weaponsUpgraded);

        // Restore secret base storage
        this.secretStorage = cloneSerializableArray(data.secretStorage);

        // Restore surface companion
        this.alienCompanion = Player.sanitizeAlienCompanionData(data.alienCompanion);
        this.alienCompanionIntroShown = !!data.alienCompanionIntroShown;
        this.recalculateStats();
        this.maxShield = loadedMaxShield ?? this.maxShield;
        this.shield = loadedShield !== undefined ? constrain(loadedShield, 0, this.maxShield) : this.maxShield;
        this.shieldRechargeRate = loadedShieldRechargeRate ?? this.shieldRechargeRate;

        // Initialize session trade tracking (not saved, always starts fresh)
        this.currentSessionTradedLocations = new Set();

        // Restore navigation preferences
        this.showSecretBaseNavigation = data.showSecretBaseNavigation || false;

        SAVE_LOG(`Player data finished loading. Ship: ${this.shipTypeName}, Wanted: ${this.isWanted}, Mission Status: ${this.activeMission?.status || 'None'}`);
    }

    // Ensure you have a way to set this.target, e.g., via mouse click on an enemy:
    handleMousePressedForTargeting() { // Call this from your main sketch mousePressed
        if (mouseButton === LEFT) { // Or whatever button you use for targeting
            // === PATROL MISSION: Reject minimap clicks BEFORE any targeting ===
            // For patrol missions, we need to ensure clicks are on the main screen, not the minimap
            if (this.activeMission &&
                typeof FACTION_PATROL_TYPES !== 'undefined' &&
                FACTION_PATROL_TYPES.has(this.activeMission.type)) {

                // Check if click is on minimap
                if (typeof uiManager !== 'undefined' && uiManager.minimap &&
                    typeof uiManager.minimap.isClickInMinimap === 'function') {
                    if (uiManager.minimap.isClickInMinimap(mouseX, mouseY)) {
                        // Reject the click entirely for patrol missions
                        uiManager.addMessage('Cannot scan from radar! Target must be visible on main screen.', [255, 150, 0]);
                        return; // Exit early - don't process this click at all
                    }
                }
            }

            // Surface mode targeting - check surface objects (turrets, pirates, buildings)
            if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                const surfaceObj = this._checkSurfaceObjectClick();
                if (surfaceObj) {
                    if (this.target === surfaceObj) {
                        this.target = null;
                        if (typeof uiManager !== 'undefined') {
                            uiManager.addMessage(`Target unlocked.`, [255, 255, 0]);
                        }
                    } else {
                        this.target = surfaceObj;
                        // Get display name from type property or constructor name
                        const label = surfaceObj.type || surfaceObj.constructor?.name || 'Target';
                        if (typeof uiManager !== 'undefined') {
                            uiManager.addMessage(`Target locked: ${label}`, [0, 255, 0]);
                        }
                    }
                    return;
                }
                // If clicking on empty space in surface mode, clear target
                if (this.target !== null) {
                    this.target = null;
                    if (typeof uiManager !== 'undefined') {
                        uiManager.addMessage(`Target unlocked.`, [255, 255, 0]);
                    }
                }
                return;
            }

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
                        // Scanning requires TWO conditions (minimap check happens earlier):
                        // 1. Player must CLICK on the enemy to lock target (handled above in handleClick)
                        // 2. Enemy must be STRICTLY VISIBLE on screen (within actual viewport, not the generous _isOnScreen buffer)
                        // Note: Minimap clicks are rejected at the start of handleMousePressedForTargeting
                        if (clickedEnemy && this.activeMission &&
                            typeof FACTION_PATROL_TYPES !== 'undefined' &&
                            FACTION_PATROL_TYPES.has(this.activeMission.type)) {

                            // STRICT visibility check for scanning (no buffer like _isOnScreen has)
                            // Calculate if enemy is actually within the viewport boundaries
                            let isStrictlyVisible = false;
                            if (clickedEnemy.pos && this.pos) {
                                const dx = Math.abs(clickedEnemy.pos.x - this.pos.x);
                                const dy = Math.abs(clickedEnemy.pos.y - this.pos.y);
                                const viewportHalfWidth = (typeof width === 'number' ? width : 1000) / 2;
                                const viewportHalfHeight = (typeof height === 'number' ? height : 800) / 2;

                                // Enemy must be within the actual viewport (with small 50px tolerance for edge cases)
                                isStrictlyVisible = (dx < viewportHalfWidth - 50) && (dy < viewportHalfHeight - 50);
                            }

                            if (!isStrictlyVisible) {
                                // Enemy is not actually visible on the main screen
                                if (typeof uiManager !== 'undefined') {
                                    uiManager.addMessage('Target must be visible on screen to scan!', [255, 150, 0]);
                                }
                            } else {
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

    /**
     * Gets the target cycling range used by the nearby-hostile D-pad selector
     * and the left-joystick directional target selector.
     * Uses the current minimap zoom level (worldViewRange) as the spatial extent
     * when available, falling back to the system proximity radius otherwise.
     * @returns {number} Maximum target distance in world units
     * @private
     */
    _getCycleTargetMaxDistance() {
        // Prefer the minimap zoom level as the spatial extent for target cycling.
        if (typeof uiManager !== 'undefined' && uiManager?.minimapWorldViewRange > 0) {
            return uiManager.minimapWorldViewRange;
        }

        if (!this.currentSystem) return 5000;

        const TARGET_CYCLE_RADIUS_BUFFER = 900;

        if (typeof this.currentSystem._getDiagonalDistance === 'function') {
            const diagonalDistance = this.currentSystem._getDiagonalDistance();
            if (Number.isFinite(diagonalDistance) && diagonalDistance > 0) {
                // Match the minimap's dashed detection ring radius used for nearby awareness.
                return diagonalDistance + TARGET_CYCLE_RADIUS_BUFFER;
            }
        }

        if (typeof this.currentSystem.despawnRadius === 'number' && this.currentSystem.despawnRadius > 0) {
            return this.currentSystem.despawnRadius;
        }

        return 5000;
    }

    /**
     * Gets the player's effective targeting faction, preferring joined faction
     * and falling back to the current ship definition when needed.
     * @returns {string|null} Effective faction key
     * @private
     */
    _getCycleTargetFaction() {
        if (this.isPolice) return 'POLICE';
        if (this.playerFaction) return this.playerFaction;

        const shipDef = (typeof SHIP_DEFINITIONS !== 'undefined' && this.shipTypeName)
            ? SHIP_DEFINITIONS[this.shipTypeName]
            : null;

        if (!shipDef) return null;
        if (shipDef.faction) return shipDef.faction;
        if (Array.isArray(shipDef.aiRoles) && shipDef.aiRoles.includes('POLICE')) return 'POLICE';

        return null;
    }

    /**
     * Determines whether a target should appear in gamepad target cycling.
     * Restricts cycling to actual nearby hostiles rather than scenery.
     * @param {Object} target - Candidate target
     * @returns {boolean} True if target is hostile to the player
     * @private
     */
    _isCycleTargetHostile(target) {
        if (!target || target.destroyed || !target.pos) return false;

        const role = target.role;
        const faction = target.faction || null;
        // Runtime objects do not model pirate hostility consistently yet, so support
        // the existing flag, faction, and role variants used across the codebase.
        const isInherentlyHostile = target.isPirate || faction === 'PIRATE' ||
            role === AI_ROLE?.PIRATE || role === AI_ROLE?.ALIEN;

        if (target.type === 'Turret' || target.type === 'Defense Drone') return true;
        if (target.target === this || target.lastAttacker === this) return true;
        if (isInherentlyHostile) return true;

        const playerIsWanted = !!(this.isWanted || this.currentSystem?.isPlayerWanted?.());
        if (playerIsWanted && (role === AI_ROLE?.POLICE || role === AI_ROLE?.GUARD)) {
            return true;
        }

        const playerFaction = this._getCycleTargetFaction();
        if (!playerFaction) return false;

        if (playerFaction === 'POLICE') {
            return !!target.isWanted;
        }

        const hostileFactions = (typeof FACTION_ENEMY_MAP !== 'undefined')
            ? FACTION_ENEMY_MAP[playerFaction]
            : null;

        return !!(hostileFactions && faction && hostileFactions.includes(faction));
    }

    /**
     * Cycle through nearby targets using the D-pad (or keys).
     * Prioritizes nearby hostile targets, then other nearby ships.
     * Hostile entries are sorted by distance first, then non-hostile nearby entries.
     * @returns {Array<Object>} Target candidate entries with {target, distSq}
     * @private
     */
    _getCycleTargetEntries() {
        if (!this.currentSystem) return [];

        const maxDist = this._getCycleTargetMaxDistance();
        const maxDistSq = maxDist * maxDist;
        const hostileTargets = [];
        const nearbyTargets = [];

        const addTargetIfEligible = (target, allowNonHostile = false) => {
            if (!target || target.destroyed || !target.pos) return;

            const dx = this.pos.x - target.pos.x;
            const dy = this.pos.y - target.pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > maxDistSq) return;

            if (this._isCycleTargetHostile(target)) {
                hostileTargets.push({ target, distSq });
            } else if (allowNonHostile) {
                nearbyTargets.push({ target, distSq });
            }
        };

        const inSurfaceMode = typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive();

        if (inSurfaceMode) {
            if (surfaceMode.surfaceObjects) {
                for (const obj of surfaceMode.surfaceObjects) {
                    addTargetIfEligible(obj, false);
                }
            }
        } else if (this.currentSystem.enemies) {
            for (const enemy of this.currentSystem.enemies) {
                addTargetIfEligible(enemy, true);
            }
        }

        if (hostileTargets.length === 0 && nearbyTargets.length === 0) {
            if (this.target) {
                this.target = null;
                if (typeof uiManager !== 'undefined') uiManager.addMessage("No targets in range.", [255, 150, 0]);
            }
            return [];
        }

        hostileTargets.sort((a, b) => a.distSq - b.distSq);
        nearbyTargets.sort((a, b) => a.distSq - b.distSq);
        return hostileTargets.concat(nearbyTargets);
    }

    /**
     * @param {Object} newTarget - Target to lock
     * @private
     */
    _setCycleTarget(newTarget) {
        this.target = newTarget;
        if (typeof uiManager !== 'undefined') {
            let label = 'Target';
            if (newTarget.shipTypeName) label = newTarget.shipTypeName;
            else if (typeof newTarget.getDisplayName === 'function') label = newTarget.getDisplayName();
            else if (newTarget.displayName) label = newTarget.displayName;
            else if (newTarget.type) label = newTarget.type;
            else if (newTarget.constructor && newTarget.constructor.name === 'Asteroid') label = 'Asteroid';

            uiManager.addMessage(`Target locked: ${label}`, [0, 255, 0]);
        }
        if (typeof soundManager !== 'undefined') soundManager.playSound('click');
    }

    /**
     * Cycle through nearby targets using the D-pad (or keys).
     * Prioritizes nearby hostile targets, then other nearby ships.
     * @param {number} direction - 1 for next, -1 for previous
     */
    cycleTarget(direction = 1) {
        const targetEntries = this._getCycleTargetEntries();
        if (!targetEntries || targetEntries.length === 0) return;
        const targetList = targetEntries.map(entry => entry.target);

        // 3. Determine current index and move to next
        let currentIndex = targetList.indexOf(this.target);
        
        // If current target is not in list (e.g. out of range or just assigned), find starting point
        if (currentIndex === -1) {
            currentIndex = (direction > 0) ? -1 : targetList.length;
        }

        const nextIndex = (currentIndex + direction + targetList.length) % targetList.length;
        const newTarget = targetList[nextIndex];

        if (newTarget !== this.target) {
            this._setCycleTarget(newTarget);
        }
    }

    /**
     * Selects a nearby target in a spatial direction, for analog-stick targeting.
     * @param {number} dirX - Direction X from left stick
     * @param {number} dirY - Direction Y from left stick
     */
    selectTargetByDirection(dirX, dirY) {
        const targetEntries = this._getCycleTargetEntries();
        if (!targetEntries || targetEntries.length === 0) return;

        const MIN_STICK_MAGNITUDE = 0.2;
        const MIN_ALIGNMENT = 0.2;
        const MIN_TARGET_DISTANCE = 1;
        const ALIGNMENT_WEIGHT = 0.8;
        const PROXIMITY_WEIGHT = 0.2;

        const mag = Math.sqrt((dirX * dirX) + (dirY * dirY));
        if (mag < MIN_STICK_MAGNITUDE) return;
        const nx = dirX / mag;
        const ny = dirY / mag;
        const maxDist = Math.max(1, this._getCycleTargetMaxDistance());

        let bestEntry = null;
        let bestScore = -Infinity;
        for (const entry of targetEntries) {
            const target = entry.target;
            const toX = target.pos.x - this.pos.x;
            const toY = target.pos.y - this.pos.y;
            const toMag = Math.sqrt((toX * toX) + (toY * toY));
            if (toMag < MIN_TARGET_DISTANCE) continue;

            const align = ((toX / toMag) * nx) + ((toY / toMag) * ny);
            if (align < MIN_ALIGNMENT) continue;

            const proximity = 1 - Math.min(toMag / maxDist, 1);
            const score = (align * ALIGNMENT_WEIGHT) + (proximity * PROXIMITY_WEIGHT);
            if (score > bestScore) {
                bestScore = score;
                bestEntry = target;
            }
        }

        if (bestEntry && bestEntry !== this.target) {
            this._setCycleTarget(bestEntry);
        }
    }

    /**
     * Check if a surface object was clicked (for surface mode targeting)
     * @returns {SurfaceObject|null} The clicked surface object, or null if none
     * @private
     */
    _checkSurfaceObjectClick() {
        if (!surfaceMode || !surfaceMode.surfaceObjects) return null;

        // 1. Get current simulation/camera parameters from surfaceMode
        const perspectiveScale = (typeof surfaceMode._getPerspectiveScale === 'function')
            ? surfaceMode._getPerspectiveScale()
            : 1.0;
        const extrusionAngle = (typeof surfaceMode._getExtrusionAngle === 'function')
            ? surfaceMode._getExtrusionAngle()
            : 0.5;

        const sinE = Math.sin(extrusionAngle);
        const cosE = Math.cos(extrusionAngle);

        // [ZOOM FIX] Account for view zoom in astronaut mode
        const isTransitioning = surfaceMode.state === 'entering' || surfaceMode.state === 'exiting';
        const currentZoom = isTransitioning ? 1.0 : (surfaceMode.viewZoom || 1.0);
        const totalScale = perspectiveScale * currentZoom;

        // 2. Identify the camera's focus point in world coordinates
        // This matches the translation logic in surfaceMode.draw()
        const camFocusX = surfaceMode.surfaceX - (surfaceMode.altitude * sinE);
        const camFocusY = surfaceMode.surfaceY - (surfaceMode.altitude * cosE);

        // 3. Iterate through objects and find those that "look" like they contain the mouse
        let bestTarget = null;
        let closestDist = Infinity;

        for (const obj of surfaceMode.surfaceObjects) {
            if (!obj || obj.destroyed) continue;

            // Objects are projected based on their logic pos PLUS their current visual altitude
            // Logic: visualX = worldX - altitude * sin(E)
            const objAlt = (obj.altitude || obj.yOffset || 0);
            const objVisualWorldX = obj.pos.x - (objAlt * sinE);
            const objVisualWorldY = obj.pos.y - (objAlt * cosE);

            // Convert that visual world position to final screen coordinates
            const screenX = (objVisualWorldX - camFocusX) * totalScale + (width / 2);
            const screenY = (objVisualWorldY - camFocusY) * totalScale + (height / 2);

            // Distance check in screen space (pixels)
            const dx = mouseX - screenX;
            const dy = mouseY - screenY;
            const distSq = dx * dx + dy * dy;

            // Use the object's visual radius multiplied by total scale
            // Add a static pixel buffer (20px) to make clicking targets easier on high-alt views
            const clickRadius = ((obj.size || 40) / 2 * totalScale) + 20;
            const clickRadiusSq = clickRadius * clickRadius;

            if (distSq < clickRadiusSq && distSq < closestDist) {
                closestDist = distSq;
                bestTarget = obj;
            }
        }

        return bestTarget;
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
            // Reset system-specific cycle trackers when enabling a specific target manually
            this._autopilotServiceSeenTargets = new Set([target]);
            this._autopilotServiceCycleComplete = false;
            this._autopilotPlanetCycleComplete = false;

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
        this._autopilotServiceSeenTargets = this._autopilotServiceSeenTargets || new Set();
        this._autopilotServiceSeenTargets.add(target);

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
            default: return (typeof target === 'object' && target.type === 'planet') ? 'Planet' : target;
        }
    }

    /**
     * Checks if the player is already "at" an autopilot target location.
     * @param {string} target - 'station', 'jumpzone', or 'secretbase'
     * @returns {boolean} True if already within interaction/arrival range
     */
    _isAtAutopilotTarget(target) {
        if (!this.currentSystem) return false;

        if (target === 'station') {
            if (!this.currentSystem.station?.pos) return false;
            const dist = p5.Vector.dist(this.pos, this.currentSystem.station.pos);
            const r = this.currentSystem.station.dockingRadius ?? (this.currentSystem.station.size * 0.5);
            return dist < r + 20;
        }

        if (target === 'jumpzone') {
            if (!this.currentSystem.jumpZoneCenter) return false;
            const dist = p5.Vector.dist(this.pos, this.currentSystem.jumpZoneCenter);
            return dist < this.currentSystem.jumpZoneRadius * 0.9;
        }

        if (target === 'secretbase') {
            const secretStations = this.currentSystem.secretStations || [];
            const discoveredSecrets = secretStations.filter(s => s.discovered && s.pos);
            if (discoveredSecrets.length === 0) return false;

            // Check if at ANY of the discovered secret bases
            return discoveredSecrets.some(station => {
                const dist = p5.Vector.dist(this.pos, station.pos);
                const r = station.dockingRadius ?? (station.size * 0.5);
                return dist < r + 20;
            });
        }

        return false;
    }

    /** Disables autopilot - Ensures NO lingering effects */
    disableAutopilot() {
        if (this.autopilotEnabled) {
            PLAYER_LOG("Autopilot disabled");
            this.autopilotEnabled = false;
            this.autopilotTarget = null;
            // Preserve autopilotPlanetIndex for smarter cycling when re-enabled
            // Reset cycle completion flags so re-enabling starts a fresh cycle check
            this._autopilotPlanetCycleComplete = false;
            this._autopilotServiceCycleComplete = false;

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

        const planets = this.currentSystem.planets;
        if (!planets || planets.length <= 1) { // Skip if only sun exists
            console.error(`Autopilot error: No non-sun planets in ${this.currentSystem.name}.`);
            if (uiManager) uiManager.addMessage('No other planets in this system');
            return;
        }

        // Determine next index
        let next = 1;

        // If autopilot is currently disabled: enable and start a new cycle
        if (!this.autopilotEnabled) {
            // If we have a stored index, use it as a starting point, otherwise start at 1
            let startBase = (typeof this.autopilotPlanetIndex === 'number' && this.autopilotPlanetIndex >= 1)
                ? this.autopilotPlanetIndex
                : 0; // index 0 is sun, so (0 % length-1) + 1 = 1

            next = (startBase % (planets.length - 1)) + 1;

            // SAFETY: If we are ALREADY at the selected 'next' planet, cycle again
            // to find a planet the user actually wants to go to.
            let attempts = 0;
            while (attempts < planets.length) {
                const p = planets[next];
                const dist = p5.Vector.dist(this.pos, p.pos);
                const approachRadius = (p.size || 200) * 0.9; // Using slightly larger radius for disengagement buffer
                if (dist > approachRadius) break; // Found a destination we aren't at yet

                next = (next % (planets.length - 1)) + 1;
                attempts++;
            }

            this.autopilotEnabled = true;
            // reset planet-cycle tracking
            this._autopilotPlanetSeenIndices = new Set([next]);
            this._autopilotPlanetStartIndex = next;
            this._autopilotPlanetCycleComplete = false;

            this.autopilotTarget = { type: 'planet', index: next };
            this.autopilotPlanetIndex = next;

            const p0 = planets[next];
            const name0 = (p0 && p0.name) ? p0.name : `Planet ${next}`;
            if (uiManager) uiManager.addMessage(`Autopilot: Heading to ${name0} (1/${planets.length - 1})`);
            PLAYER_LOG(`Autopilot planet target set to index ${next} (${name0})`);
            return;
        }

        // If we've already completed a full cycle, the next press should disable autopilot
        if (this._autopilotPlanetCycleComplete) {
            this.disableAutopilot();
            return;
        }

        // Otherwise compute the next index in the cycle
        if (this.autopilotTarget && typeof this.autopilotTarget === 'object' && this.autopilotTarget.type === 'planet') {
            const cur = Number.isFinite(this.autopilotTarget.index) ? this.autopilotTarget.index : this.autopilotPlanetIndex;

            // Cycle through planets 1 to length-1, skipping current location if possible
            let attempts = 0;
            next = (typeof cur === 'number' && cur >= 1) ? 1 + (cur % (planets.length - 1)) : 1;

            while (attempts < planets.length) {
                const p = planets[next];
                const dist = p5.Vector.dist(this.pos, p.pos);
                const approachRadius = (p.size || 200) * 0.9;
                if (dist > approachRadius) break;

                next = (next % (planets.length - 1)) + 1;
                attempts++;
            }
        } else {
            next = 1;
        }

        // Set new planet target and record visit
        this.autopilotTarget = { type: 'planet', index: next };
        this.autopilotPlanetIndex = next;
        this._autopilotPlanetSeenIndices = this._autopilotPlanetSeenIndices || new Set();
        this._autopilotPlanetSeenIndices.add(next);

        const p = planets[next];
        const name = (p && p.name) ? p.name : `Planet ${next}`;
        if (uiManager) uiManager.addMessage(`Autopilot: Heading to ${name} (${this._autopilotPlanetSeenIndices.size}/${planets.length - 1})`);
        PLAYER_LOG(`Autopilot planet target set to index ${next} (${name})`);

        // If we've now visited every non-sun planet once, mark that the next autopilot press will disable
        if (this._autopilotPlanetSeenIndices.size >= planets.length - 1) {
            this._autopilotPlanetCycleComplete = true;
            if (uiManager) uiManager.addMessage('Autopilot: completed one planet cycle — next autopilot press will disable.');
        }
    }

    /**
     * Cycle autopilot to the next system service (Station -> Jump Zone -> Secret Base).
     * Includes "smart skipping" of targets the player is already close to.
     */
    cycleAutopilotService() {
        if (!this.currentSystem) {
            if (uiManager) uiManager.addMessage('Autopilot error: System data unavailable');
            return;
        }

        // Determine the available cycle order
        const hasDiscoveredSecretBase = this.currentSystem.secretStations?.some(s => s.discovered) || false;
        const cycleOrder = hasDiscoveredSecretBase
            ? ['station', 'jumpzone', 'secretbase']
            : ['station', 'jumpzone'];

        // Determine next target index
        let nextIdx = 0;

        if (!this.autopilotEnabled || typeof this.autopilotTarget !== 'string') {
            // First press or switching from planet autopilot: start from beginning of cycle
            this.autopilotEnabled = true;
            this._autopilotServiceSeenTargets = new Set();
            this._autopilotServiceCycleComplete = false;
            nextIdx = 0;
        } else if (this._autopilotServiceCycleComplete) {
            // Full cycle completed, disable
            this.disableAutopilot();
            return;
        } else {
            // Increment index
            const curIdx = cycleOrder.indexOf(this.autopilotTarget);
            nextIdx = (curIdx === -1) ? 0 : (curIdx + 1);
        }

        // SMART SKIPPING: Skip targets the player is already at
        let attempts = 0;
        while (attempts < cycleOrder.length) {
            const target = cycleOrder[nextIdx];
            if (!this._isAtAutopilotTarget(target)) {
                // Found a valid target we aren't at
                break;
            }
            // Already there, move to next
            nextIdx++;
            attempts++;

            if (nextIdx >= cycleOrder.length) {
                // Reached end of cycle while skipping
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage("Autopilot: all targets currently reached.");
                return;
            }
        }

        // Set the target
        const finalTarget = cycleOrder[nextIdx];
        this.autopilotTarget = finalTarget;
        this._autopilotServiceSeenTargets.add(finalTarget);

        // Update cycle completion state
        if (nextIdx === cycleOrder.length - 1) {
            this._autopilotServiceCycleComplete = true;
        }

        const name = this._getAutopilotTargetName(finalTarget);
        if (uiManager) uiManager.addMessage(`Autopilot: Heading to ${name}`);
        soundManager?.playSound('click');
        PLAYER_LOG(`Autopilot service target set to ${finalTarget}`);
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
                    this.size,
                    2,
                    false,
                    this.shipTypeName,
                    false,
                    'rear',
                    AUTOPILOT_THRUST
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
        this.currentWeapon = null;
        this.fireRate = 0.5;
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

            // Use unified pirate detection helper (role OR faction check, consistent across all systems)
            const isPirateTarget = isPirateShip(killTarget);

            // Police: get credit for killing pirates OR aliens
            if (this.isPolice) {
                if (isPirateTarget || killTarget.role === AI_ROLE.ALIEN) {
                    factionKillEligible = true;
                }
            }
            // Military: get credit for killing aliens OR pirates
            else if (this.playerFaction === 'MILITARY') {
                if (killTarget.role === AI_ROLE.ALIEN || isPirateTarget) {
                    factionKillEligible = true;
                }
            }
            // Imperial: get credit for killing Separatists
            else if (this.playerFaction === 'IMPERIAL') {
                if (killTarget.faction === 'SEPARATIST') {
                    factionKillEligible = true;
                }
            }
            // Separatist: get credit for killing Imperials
            else if (this.playerFaction === 'SEPARATIST') {
                if (killTarget.faction === 'IMPERIAL') {
                    factionKillEligible = true;
                }
            }

            // Increment faction kill count and award prestige/rank-up notification.
            // Credits are awarded separately by EnemyDamageSystem._awardFactionBounty.
            if (factionKillEligible && playerFactionKey) {
                // Award prestige for prestige-based factions (1 prestige per kill)
                // This will also handle rank-up notifications via addFactionPrestige
                const cfg = typeof FACTION_RANKS !== 'undefined' ? FACTION_RANKS[playerFactionKey] : null;
                if (cfg?.usesPrestige) {
                    // Track the kill
                    if (this.factionKills && this.factionKills[playerFactionKey] !== undefined) {
                        this.factionKills[playerFactionKey]++;
                    }
                    this.addFactionPrestige(playerFactionKey, 1);
                } else {
                    // For kill-based factions (Police): capture old rank BEFORE incrementing
                    const oldFactionRank = this.getFactionRank(playerFactionKey);
                    if (this.factionKills && this.factionKills[playerFactionKey] !== undefined) {
                        this.factionKills[playerFactionKey]++;
                    }
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
     * Returns the numeric rank level for a faction (0 = base, 1 = first threshold, etc.)
     * Used for computing mission reward multipliers.
     * @param {string} factionName
     * @returns {number}
     */
    getFactionRankLevel(factionName) {
        const cfg = FACTION_RANKS[factionName];
        if (!cfg) return 0;

        const progress = cfg.usesPrestige
            ? (this.factionPrestige?.[factionName] || 0)
            : (this.factionKills?.[factionName] || 0);

        for (let i = cfg.thresholds.length - 1; i >= 0; i--) {
            if (progress >= cfg.thresholds[i]) return i + 1;
        }
        return 0;
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

    /**
     * Returns true when a bodyguard runtime ref is still present in the given system enemy list.
     * @param {Object} guard - Bodyguard metadata entry
     * @param {StarSystem} system - System expected to contain the runtime enemy
     * @returns {boolean}
     * @private
     */
    _isBodyguardRefTrackedInSystem(guard, system) {
        if (!guard || !guard.enemyRef || !system) return false;
        return guard.enemyRef.currentSystem === system
            && Array.isArray(system.enemies)
            && system.enemies.includes(guard.enemyRef);
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

        if (!system || typeof system.addEnemy !== 'function' || !Array.isArray(system.enemies)) {
            PLAYER_LOG('Cannot spawn bodyguards: invalid system context');
            return;
        }

        // Clean up any destroyed bodyguards from the list
        this.activeBodyguards = this.activeBodyguards.filter(guard => !guard.destroyed);

        // Spawn each bodyguard near the player
        this.activeBodyguards.forEach((guard, index) => {
            // Check if guard has an existing enemyRef
            if (guard.enemyRef) {
                const guardStillInSystem = this._isBodyguardRefTrackedInSystem(guard, system);

                // If the guard's enemyRef is in a different system or marked for respawn, clean it up
                if (guard.enemyRef.currentSystem !== system || guard.enemyRef.destroyed || !guardStillInSystem) {
                    // Mark old reference as destroyed to clean it from old system
                    if (!guard.enemyRef.destroyed && guard.enemyRef.currentSystem !== system) {
                        guard.enemyRef.destroyed = true;
                    }
                    // Clear the reference so we can spawn a new one
                    guard.enemyRef = null;
                } else {
                    // Guard already exists in-system: refresh linkage in case it lost principal while player was docked.
                    guard.enemyRef.principal = this;
                    guard.enemyRef.isPlayerBodyguard = true;

                    // Reset stale friendly targets if guard was orphaned and retargeted while docked.
                    if (guard.enemyRef.target === this ||
                        (guard.enemyRef.target?.role === AI_ROLE.GUARD && guard.enemyRef.target.principal === this)) {
                        guard.enemyRef.target = null;
                    }

                    if (guard.enemyRef.lastAttacker === this ||
                        (guard.enemyRef.lastAttacker?.role === AI_ROLE.GUARD && guard.enemyRef.lastAttacker.principal === this)) {
                        guard.enemyRef.lastAttacker = null;
                    }

                    // Force guard behavior back to escort mode after relinking.
                    if (guard.enemyRef.currentState !== AI_STATE.GUARDING) {
                        guard.enemyRef.changeState(AI_STATE.GUARDING, { principal: this });
                    }

                    // Guard is already spawned in the current system and alive, no respawn needed.
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

            // Restore persisted identity (name and gender) so bodyguards keep their name across save/load
            if (guard.displayName) {
                bodyguardEnemy.displayName = guard.displayName;
            }
            if (guard.gender) {
                bodyguardEnemy.gender = guard.gender;
            }

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

            // Capture identity from spawned enemy if not yet persisted (first hire)
            if (!guard.displayName && bodyguardEnemy.displayName) {
                guard.displayName = bodyguardEnemy.displayName;
            }
            if (!guard.gender && bodyguardEnemy.gender) {
                guard.gender = bodyguardEnemy.gender;
            }

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
                // If runtime ref was culled from the system list, clear it so spawnBodyguards can recreate.
                const inCurrentSystem = guard.enemyRef.currentSystem === this.currentSystem;
                const stillTrackedBySystem = this._isBodyguardRefTrackedInSystem(guard, this.currentSystem);
                if (!guard.enemyRef.destroyed && inCurrentSystem && !stillTrackedBySystem) {
                    guard.enemyRef = null;
                    continue;
                }

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

// Export for module systems
// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
    global.Player = Player;
    global.PLAYER_CONFIG = PLAYER_CONFIG;
    global.FACTION_RANKS = FACTION_RANKS;
}
