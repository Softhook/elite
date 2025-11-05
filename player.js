// ****** player.js ******

class Player {
    /**
     * Creates a Player instance. Stores speeds/rates
     * @param {string} [shipTypeName="Sidewinder"] - The type name of the ship to use.
     */
    constructor(shipTypeName = "Sidewinder") {
        // console.log(`Creating Player instance with ship: ${shipTypeName}`); // Optional log
        this.shipTypeName = shipTypeName; // Store the type name initially
        let shipDef = SHIP_DEFINITIONS[this.shipTypeName]; // Get definition first
        if (!shipDef) {
            console.error(`FATAL: Ship definition "${shipTypeName}" not found! Defaulting to Sidewinder.`);
            this.shipTypeName = "Sidewinder";
            shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        }

        this.activeMission = null;  // Holds the currently accepted Mission object or null

        // --- Initialize Position & Basic Physics ---
        this.pos = createVector(0, 0);
        this.vel = createVector(0, 0);
        this.angle = 0; // Current facing angle (RADIANS, 0 = right)
        this.drag = 0.985;
        
        // Cache frequently used constants
        this._TWO_PI = TWO_PI;
        this._HALF_PI = HALF_PI;
        this._PI = PI;

        // --- Store Base Stats from Definition ---
        this.size = shipDef.size;
        this.maxSpeed = shipDef.baseMaxSpeed;
        this.thrustForce = shipDef.baseThrust;
        this.rotationSpeed = shipDef.baseTurnRate; // Already in RADIANS
        this.maxHull = shipDef.baseHull;
        this.cargoCapacity = shipDef.cargoCapacity;


        // Autopilot properties
        this.autopilotEnabled = false;
        this.autopilotTarget = null; // 'station' or 'jumpzone'
        this.autopilotThrottleMultiplier = 0.8; // Conservative speed for safety
        this.autopilotRotationMultiplier = 0.9; // Slightly reduced rotation speed
        this.lastDamageTime = 0; // Track when player was last hit


        // --- Initialize Radian properties (calculated AFTER constructor) ---
        this.rotationSpeed = 0; // RADIANS per frame

        // --- Current State ---
        this.hull = this.maxHull; this.credits = 1000; this.cargo = [];
        this.currentSystem = null; this.fireCooldown = 0;
        this.currentWeapon = WEAPON_UPGRADES.find(w => w.name === "Tangle Projector") || WEAPON_UPGRADES[0]; // Default to Tangle Projector for testing
        this.fireRate = this.currentWeapon.fireRate;
        this.isThrusting = false; 
        this.isReverseThrusting = false; // Add this line

        this.target = null; // Add this to store the player's current target for missiles etc.

        // Add police status
        this.isPolice = false;
        this.hasBeenPolice = false;

        // Add faction status properties
        this.playerFaction = null; // Current faction: null, "IMPERIAL", "SEPARATIST", "MILITARY"
        this.hasJoinedFaction = false; // Whether player has ever joined a faction
        this.factionShip = null; // Ship received when joining faction

        // Nebula effect properties
        this.shieldsDisabled = false;
        this.weaponsDisabled = false;
        this.inNebula = false;

        // Initialize weapons array based on ship definition
        this.weapons = [];
        this.weaponIndex = 0;
        this.weaponHeat = {};

        // Track active mines deployed by this player (max 5)
        this.activeMines = [];

        // Initialize thrust manager
        this.thrustManager = new ThrustManager();

        // Add shield properties from ship definition
        this.maxShield = shipDef.baseShield || 0;
        this.shield = this.maxShield;
        this.shieldRechargeRate = shipDef.shieldRecharge || 0;

        // Add hit effect to shield tracking
        this.shieldHitTime = 0;

        // Shield recharge delay
        this.shieldRechargeDelay = 1000; // 3 seconds delay after shield hit
        this.lastShieldHitTime = 0; // Track when shield was last hit

        // Track shield-down/up transitions for audio cues
        this._shieldWasZero = (this.shield <= 0);

        // Add tangle weapon effect properties
        this.dragMultiplier = 1.0;   // Default - normal drag
        this.dragEffectTimer = 0;    // Countdown timer for tangle effect
        this.tangleEffectTime = 0;   // Visual effect timestamp
        this.rotationBlockMultiplier = 1.0; // Default - normal rotation
        this.rotationBlockTimer = 0; // Countdown timer for rotation block effect

        // Track enemy kills for Elite rating
        this.kills = 0;

        // Initialize wanted status
        this.isWanted = false;

        // --- Kiting & Speed Burst setup ---
        this.baseMaxSpeed        = this.maxSpeed;         // remember original cap
        this.speedBurstCooldown  = 10000;
        this.lastBurstTime       = -Infinity;
        this.speedBurstMultiplier= 2;
        this.isSpeedBursting     = false;
        this.speedBurstEnd       = 0; // Keep one
        this.isCoastingFromBurst = false; // Add this new flag
        
        // Secret base navigation feature
        this.showSecretBaseNavigation = false; // Feature flag for drawing path to secret base
        this._cachedNavigation = null; // Cache for navigation calculations
        
        // Bodyguards for protection
        this.activeBodyguards = []; // Tracks hired bodyguards - destroyed ones are automatically removed
        this.bodyguardLimit = 3; // Maximum number of bodyguards allowed

        // Barrier properties
        this.isBarrierActive = false;
        this.barrierDurationTimer = 0;
        this.barrierDamageReduction = 0;
        this.barrierColor = [100, 100, 255]; // Default color, will be overridden by weapon

        // Death state properties
        this.destroyed = false;
        this.exploding = false;
        this.explosionStartTime = 0;
        this.isDying = false; // Flag to prevent interactions during death animation

        // Note: applyShipDefinition (called later) calculates this.rotationSpeed.
    }


    /** Accepts a mission if none is active and requirements are met. */
    acceptMission(mission) {
        console.log(`--- Attempting Player.acceptMission() for: ${mission?.title || 'Invalid Mission'}`);

        if (this.activeMission) { console.warn("Accept Failed: Mission already active."); return false; }
        if (!mission) { console.warn("Accept Failed: Invalid mission object provided."); return false; }
        if (mission.status !== 'Available') { console.warn(`Accept Failed: Mission status is '${mission.status}'.`); return false; }
        if (typeof mission.activate !== 'function') { console.warn("Accept Failed: Mission missing activate method."); return false; }

        console.log(`   Mission "${mission.title}" checks passed (status: ${mission.status}).`);

        // Check cargo space for delivery missions
        if (mission.type === MISSION_TYPE.DELIVERY_LEGAL || mission.type === MISSION_TYPE.DELIVERY_ILLEGAL) {
             let spaceNeeded = mission.cargoQuantity || 0;
             let currentCargo = this.getCargoAmount();
             console.log(`   Delivery Check: Need=${spaceNeeded}, Have=${this.cargoCapacity - currentCargo} free.`);
             if (currentCargo + spaceNeeded > this.cargoCapacity) {
                  console.warn(`   Accept Failed: Not enough cargo space.`); return false;
             }
             // Add cargo if needed
             if (mission.cargoType && spaceNeeded > 0) {
                 console.log(`   Adding mission cargo: ${spaceNeeded}t ${mission.cargoType}`);
                 this.addCargo(mission.cargoType, spaceNeeded);
             }
        }

        // --- Assign and ACTIVATE ---
        console.log(`   Assigning mission object to player.activeMission...`);
        this.activeMission = mission; // Assign the reference
        console.log(`   BEFORE activate() call: Mission Title = ${this.activeMission?.title}, Status = ${this.activeMission?.status}`);

        try {
            console.log(`   >>> Calling this.activeMission.activate() <<<`);
            this.activeMission.activate(); // <<< EXECUTE THE STATUS CHANGE
            console.log(`   <<< Finished this.activeMission.activate() >>>`);
            
            // If this is a MissionRegistry mission, update the registry
            // null parameter = player is accepting (not an NPC pilot)
            if (mission._registryMission && typeof worldSimulation !== 'undefined' && worldSimulation?.missionRegistry) {
                worldSimulation.missionRegistry.acceptMission(mission._registryMission.id, null);
                console.log(`   Updated MissionRegistry for mission ${mission._registryMission.id}`);
            }
        } catch(e) {
            console.error("   !!! ERROR during mission.activate():", e);
            this.activeMission = null; // Clear mission if activation failed critically
            return false; // Indicate failure
        }

        console.log(`   AFTER activate() call: Mission Status = ${this.activeMission?.status}`); // Check status immediately after
        // --- End Activation ---

        if (this.activeMission.status === 'Active') {
            console.log(`--- Mission "${this.activeMission.title}" ACCEPTED & ACTIVATED successfully. ---`);
            saveGame();
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
    } // --- End acceptMission method ---

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
        const qty  = this.activeMission.cargoQuantity;
        if (type && qty > 0) {
            this.removeCargo(type, qty);
        }
        this.activeMission.fail();
        this.activeMission = null;
        return true;
    }

 /** Checks if the player has a specific quantity of a commodity. */
    hasCargo(cargoType, quantity) {
        console.log(`--- Player.hasCargo Check --- Type: ${cargoType}, Qty Needed: ${quantity}`); // Log input
        if (!cargoType || quantity <= 0) { console.log("   Result: false (Invalid input)"); return false; }
        const item = this.cargo.find(i => i?.name === cargoType);
        console.log(`   Found item in cargo:`, item); // Log the found item object (or undefined)
        let result = item && item.quantity >= quantity;
        console.log(`   Result: ${result}`); // Log the boolean result
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
    console.log("--- Attempting Player.completeMission() ---");
    if (!this.activeMission) { console.warn("Complete failed: No active mission."); return false; }

    console.log(`   Checking Mission: ${this.activeMission.title}, Status: ${this.activeMission.status}`);
    // Log location only if provided (it won't be for auto-complete)
    if (currentSystem && currentStation) {
        console.log(`   Current Location: ${currentStation.name} (${currentSystem.name})`);
    } else {
         console.log(`   Completion triggered automatically (in space).`);
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
             console.log(`   Delivery Check: Is at destination? ${isAtDestination}`);
             if (!isAtDestination) {
                  console.warn("   Complete failed: Not at destination station.");
                  return false;
             }
             // Check cargo
             let hasGoods = this.hasCargo(this.activeMission.cargoType, this.activeMission.cargoQuantity);
             console.log(`   Delivery Check: Has required cargo (${this.activeMission.cargoQuantity}t ${this.activeMission.cargoType})? ${hasGoods}`);
             if (!hasGoods) {
                  console.warn("   Complete failed: Missing required cargo!");
                  return false;
             }
             canComplete = true; // All delivery checks passed
             console.warn("   canComplete!");
        }

        // --- BOUNTY MISSIONS (Check progress - Location check removed for auto-complete) ---
        else if (this.activeMission.type === MISSION_TYPE.BOUNTY_PIRATE) {
            console.log(`   Bounty Check: Progress ${this.activeMission.progressCount}/${this.activeMission.targetCount}`);
            if (this.activeMission.progressCount >= this.activeMission.targetCount) {
                console.log("   Bounty Check: Target count met. Allowing completion.");
                canComplete = true; // Allow completion anywhere once count is met
            } else {
                 console.warn("   Complete failed: Bounty target count not met."); return false;
            }
        }
        
        // --- NEW: COP KILLER BOUNTY MISSIONS (Check progress - Location check removed for auto-complete) ---
        else if (this.activeMission.type === MISSION_TYPE.BOUNTY_POLICE) {
            console.log(`   Bounty Check (Police): Progress ${this.activeMission.progressCount}/${this.activeMission.targetCount}`);
            if (this.activeMission.progressCount >= this.activeMission.targetCount) {
                console.log("   Bounty Check (Police): Target count met. Allowing completion.");
                canComplete = true; // Allow completion anywhere once count is met
            } else {
                 console.warn("   Complete failed: Bounty (Police) target count not met."); return false;
            }
        }
        // --- NEW: ALIEN BOUNTY MISSIONS (Check progress - Location check removed for auto-complete) ---
        else if (this.activeMission.type === MISSION_TYPE.BOUNTY_ALIEN) {
            console.log(`   Bounty Check (Alien): Progress ${this.activeMission.progressCount}/${this.activeMission.targetCount}`);
            if (this.activeMission.progressCount >= this.activeMission.targetCount) {
                console.log("   Bounty Check (Alien): Target count met. Allowing completion.");
                canComplete = true; // Allow completion anywhere once count is met
            } else {
                 console.warn("   Complete failed: Bounty (Alien) target count not met."); return false;
            }
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
        console.log(`   Completing mission: ${this.activeMission.title}`);

        
        let reward = this.activeMission.rewardCredits; let completedTitle = this.activeMission.title;

        // Remove cargo ONLY for delivery missions
        if (this.activeMission.type === MISSION_TYPE.DELIVERY_LEGAL || this.activeMission.type === MISSION_TYPE.DELIVERY_ILLEGAL) {
             console.log(`   Removing cargo: ${this.activeMission.cargoQuantity}t ${this.activeMission.cargoType}`);
             this.removeCargo(this.activeMission.cargoType, this.activeMission.cargoQuantity);
        }

        console.log(`   Calling addCredits(${reward}). Current Credits: ${this.credits}`);
        this.addCredits(reward);
        console.log(`   Credits after addCredits call: ${this.credits}`);

        this.activeMission.status = 'Completed'; // Mark internal status (though we clear player ref next)

        // Update MissionRegistry if this is a registry mission
        if (this.activeMission._registryMission && typeof worldSimulation !== 'undefined' && worldSimulation?.missionRegistry) {
            worldSimulation.missionRegistry.completeMission(this.activeMission._registryMission.id);
            console.log(`   Updated MissionRegistry for completed mission ${this.activeMission._registryMission.id}`);
        }

        if (this.activeMission && typeof uiManager !== 'undefined') {
            uiManager.inactiveMissionIds.add(this.activeMission.id);
            console.log(`Added mission ID ${this.activeMission.id} to inactive missions list`);
        }
        
        this.activeMission = null; // Clear active mission from player
        console.log(`   activeMission is now: ${this.activeMission}`);

        // --- Provide feedback ---
        //alert(`Mission Complete!\n${completedTitle}\nReward: ${reward} Credits`); // Replace with better UI message later
        console.log(`!!! Mission Complete: ${completedTitle} | Reward: ${reward}cr !!!`);
        uiManager.addMessage(`Mission Complete: ${completedTitle} | Reward: ${reward}cr`);

        // Play mission complete sound
        if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
            soundManager.playSound('missionComplete');
        }

        saveGame(); // Save progress
        return true; // Success
    }

    console.warn("Player.completeMission() reached end without completing.");
    return false; // Indicate failure if somehow canComplete wasn't true
} // --- End completeMission Method ---




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
        this.weaponSlots = def.weaponSlots;

        // Update shield properties
        this.maxShield = def.baseShield || 0;
        this.shield = this.maxShield;
        this.shieldRechargeRate = def.shieldRecharge || 0;

        // Load weapons from ship definition
        this.loadWeaponsFromShipDefinition(shipTypeName);

        // Recalculate any derived properties
        this.calculateRadianProperties && this.calculateRadianProperties();
        this.updateShipVisual && this.updateShipVisual();
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
                    this.weapons[i] = {...weaponDef};
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
                this.weapons.push({...defaultWeapon});
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
applyDragEffect(duration = 5.0, multiplier = 10.0) {
    // Use higher value if already affected
    this.dragMultiplier = Math.max(this.dragMultiplier || 1.0, multiplier);
    
    // ENHANCED: Extend duration for consecutive hits
    this.dragEffectTimer = Math.max(this.dragEffectTimer || 0, duration) + 
                          (this.dragEffectTimer > 0 ? duration * 0.5 : 0);
    
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
            console.warn(`switchToWeapon: no weapon at index ${index}`);
            return false;
        }
        
        this.weaponIndex = index;
        this.currentWeapon = weapon;
        this.fireRate = weapon.fireRate || 0.5;
        // Reset cooldown on weapon switch (optional)
        this.fireCooldown = 0;
        
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

/** Handles continuous key presses for movement & new features */
handleInput() {
    // DON’T mix manual input & autopilot
    if (this.autopilotEnabled) return;
  
    // Reset per-frame thrust flags
    this.isThrusting = false;
    this.isReverseThrusting = false;
    this.isStrafing = false;
  
    // 1) Rotation
    if (keyIsDown(LEFT_ARROW) || keyIsDown(81)) {      // Q 
      this.angle -= this.rotationSpeed;
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(69)) {    // E 
        this.angle += this.rotationSpeed;
    }
  
    // 2) Sideways kiting (strafe)
    if (keyIsDown(65)) {     // A
      this.kiteLeft();
      this.isStrafing  = true;
    }
    else if (keyIsDown(68)) { // D
      this.kiteRight();
      this.isStrafing  = true;
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
        this.isThrusting        = true;
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
  
  /** Attempt a one-off forward speed burst if off cooldown */
  trySpeedBurst() {
    const now = millis();
    if (now - this.lastBurstTime > this.speedBurstCooldown && !this.isSpeedBursting) {
      this.isSpeedBursting = true;
      this.isCoastingFromBurst = false; // Reset coasting flag when a new burst starts
      this.speedBurstEnd   = now + 1000;  // 1000ms burst window
      this.lastBurstTime   = now;
  
      // Big impulse (optimized - avoid vector allocation)
      const burstForce = this.thrustForce * this.speedBurstMultiplier;
      this.vel.add(cos(this.angle) * burstForce, sin(this.angle) * burstForce);
  
      uiManager?.addMessage("Speed Burst!", 'lightblue');
    }
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
        const reducedForce = this.thrustForce * 0.6;
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

    /** Fires the current weapon based on its type using WeaponSystem. */
    fireWeapon(target = null) { // Allow target to be passed (e.g. from AI or future auto-turrets)
   
        // Check if weapons are disabled by EMP nebula
        if (this.weaponsDisabled) {
            console.log("Weapons disabled by EMP nebula!");
            if (typeof uiManager !== 'undefined') { uiManager.addMessage("Weapons Disabled: EMP", [255,100,0], 2000); }
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
                this.fireCooldown = this.currentWeapon.fireRate; // Set cooldown for the barrier
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage("Barrier Activated!", this.barrierColor, 2000);
                }
                if (typeof soundManager !== 'undefined') {
                    soundManager.playSound('barrierUp');
                }
                return true; // Barrier activated, no projectile fired
            } else {
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage("Barrier recharging...", [200,200,0], 1000);
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
            const worldMx = mouseX + (this.pos.x - width/2);
            const worldMy = mouseY + (this.pos.y - height/2);
            fireAngle = atan2(worldMy - this.pos.y, worldMx - this.pos.x);
        }
        // For turrets, WeaponSystem.fireTurret handles its own aiming if no target is passed.
        // If a target is passed (effectiveTarget), it will be used.

        const fired = WeaponSystem.fire(this, this.currentSystem, fireAngle, this.currentWeapon.type, effectiveTarget);
        if (fired) {
            this.fireCooldown = this.fireRate;
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
        // ---- End new section ----

        // --- Speed Burst Thrust & State Management ---
        if (this.isSpeedBursting) {
            if (currentTime < this.speedBurstEnd) {
                // Actively bursting: sustain with normal thrust application
                this.thrust();
            } else {
                // Burst thrust duration has ended
                this.isSpeedBursting = false;
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
                
                // Reduce visual effect frequency for performance
                const fc = frameCount;
                if (fc % 5 === 0) {
                    this.vel.rotate(random(-0.1, 0.1));
                } else if (fc % 6 === 0) {
                    this.vel.add(random(-0.03, 0.03), random(-0.03, 0.03));
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

        // Position update (optimized NaN check)
        if (isNaN(this.vel.x) || isNaN(this.vel.y)) {
            this.vel.set(0, 0); // Safety net for NaN velocity
        }
        this.pos.add(this.vel);

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
            // Pre-calculate recharge amount (scale by deltaTime for consistent rate)
            const rechargeAmount = this.shieldRechargeRate * SHIELD_RECHARGE_RATE_MULTIPLIER * (deltaTime * 0.00096); // 0.016 / 16.67
            const prevShield = this.shield;
            const newShield = Math.min(this.maxShield, prevShield + rechargeAmount);
            // Play shield-up cue when recovering from 0
            if (prevShield === 0 && newShield > 0 && this._shieldWasZero) {
                if (typeof soundManager !== 'undefined') { soundManager.playSound('shieldUp'); }
                this._shieldWasZero = false;
            }
            this.shield = newShield;
        }

        // Sync bodyguard status from their enemy references
        this.syncBodyguardStatus();
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
        
        // Draw thrust particles BEHIND the ship
        this.thrustManager.draw();
        
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
        rotate(this.angle);
        drawFunc(this.size, this.isThrusting); 
        pop();

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
            
            pop();
        }

        // Draw Barrier Field Effect
        if (this.isBarrierActive) {
            push();
            translate(this.pos.x, this.pos.y);
            noFill();
            // Pulsating effect for the barrier
            const barrierPulse = (sin(frameCount * 0.1) + 1) / 2; // Ranges from 0 to 1
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

        // Existing weapon effects
        if (this.lastBeam && millis() - this.lastBeam.time < 120) {
            // ...existing beam drawing code...
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
    }

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
                //uiManager.addMessage(`Shield damage: ${actualDamage.toFixed(1)}`);
                return { damage: actualDamage, shieldHit: true };
            } else {
                // Shield is depleted, remaining damage goes to hull
                const remainingDamage = actualDamage - this.shield;
                this.shield = 0;
                this.hull -= remainingDamage;
                
                // CRITICAL FIX: This is STILL a shield hit even though it depleted the shield
                //uiManager.addMessage(`Shield down! Hull damage: ${remainingDamage.toFixed(1)}`);
                
                // Always report as a shield hit if shields absorbed ANY damage
                shieldHit = true;
            }
        } else {
            // No shields, damage hull directly
            this.hull -= actualDamage;
            //uiManager.addMessage(`Hull damage: ${actualDamage.toFixed(1)}`);
            shieldHit = false;
        }
        // Shield down cue on transition >0 -> 0
        if (prevShield > 0 && this.shield === 0) {
            if (typeof soundManager !== 'undefined') { soundManager.playSound('shieldDown'); }
            this._shieldWasZero = true;
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
                // Main large explosion
                this.currentSystem.addExplosion(
                    this.pos.x,
                    this.pos.y,
                    this.size * 3, // Larger explosion
                    [100, 150, 255] // Blueish-white core
                );

                // Create cascading secondary explosions
                for (let i = 0; i < 12; i++) { // More secondary explosions
                    setTimeout(() => {
                        // Check if currentSystem still exists when timeout runs
                        if (this.currentSystem && typeof this.currentSystem.addExplosion === 'function') {
                            // Random offset explosions around ship
                            this.currentSystem.addExplosion(
                                this.pos.x + random(-this.size*1.2, this.size*1.2),
                                this.pos.y + random(-this.size*1.2, this.size*1.2),
                                this.size * random(0.7, 1.5), // Varied sizes
                                [
                                    random(100, 200), // Random blue tint
                                    random(150, 255),
                                    random(200, 255)
                                ]
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

    /** Checks if the player can dock with the station. */
    canDock(station) {
        if (!station?.pos) return false; let d = dist(this.pos.x, this.pos.y, station.pos.x, station.pos.y);
        let speed = this.vel.mag(); let radius = station.dockingRadius ?? 0;
        return (d < radius && speed < 0.5);
    }

    /** Adds credits. Ensures the amount is an integer. */
    addCredits(amount) {
        if (amount > 0) {
            const integerAmount = Math.floor(amount); // Ensure amount is an integer
            this.credits += integerAmount;
            this.credits = Math.floor(this.credits); // Ensure total is integer
            console.log(`Added ${integerAmount} credits. New balance: ${this.credits}`);
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
                console.log(`Spent ${integerAmount} credits. Remaining: ${this.credits}`);
                return true; // Indicate success
            } else {
                console.log(`Failed to spend ${integerAmount} credits. Insufficient funds (${this.credits}).`);
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
        if (!commodityName || quantity <= 0) {
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

    /**
     * Basic circle-based collision check against another object.
     * @param {object} target - Object with pos {x, y} and size properties.
     * @returns {boolean} True if collision detected based on overlapping circular bounds.
     */
    checkCollision(target) {
        // Basic safety check for target validity
        if (!target?.pos || target.size === undefined || typeof target.size !== 'number') {
            return false;
        }
        
        // Calculate distance squared between centers (inline for performance)
        const dx = this.pos.x - target.pos.x;
        const dy = this.pos.y - target.pos.y;
        const dSq = dx * dx + dy * dy;
        
        // Calculate sum of radii squared (using size as diameter, optimized)
        const sumRadii = (this.size + target.size) * 0.5;
        const sumRadiiSq = sumRadii * sumRadii;
        
        // Collision occurs if distance squared is less than sum of radii squared
        return dSq < sumRadiiSq;
    }
    
    /**
     * Checks if player is wanted in current system
     * @return {boolean} Whether player is wanted in current system
     */
    isWantedInCurrentSystem() {
        return this.currentSystem?.isPlayerWanted() || false;
    }

    // --- Save/Load Functionality ---
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
            console.log(`SAVING DATA: Active Mission Title = ${this.activeMission.title}, Status = ${this.activeMission.status}`);
            // Create a plain object copy for saving (prevents saving methods etc.)
            missionDataToSave = { ...this.activeMission };
            // Or be more explicit:
            // missionDataToSave = {
            //      id: this.activeMission.id, type: this.activeMission.type, title: this.activeMission.title,
            //      description: this.activeMission.description, originSystem: this.activeMission.originSystem,
            //      originStation: this.activeMission.originStation, destinationSystem: this.activeMission.destinationSystem,
            //      destinationStation: this.activeMission.destinationStation, targetDesc: this.activeMission.targetDesc,
            //      targetCount: this.activeMission.targetCount, cargoType: this.activeMission.cargoType,
            //      cargoQuantity: this.activeMission.cargoQuantity, rewardCredits: this.activeMission.rewardCredits,
            //      isIllegal: this.activeMission.isIllegal, requiredRep: this.activeMission.requiredRep,
            //      timeLimit: this.activeMission.timeLimit, status: this.activeMission.status, // <= INCLUDE STATUS
            //      progressCount: this.activeMission.progressCount // <= INCLUDE PROGRESS
            // };
        } else {
            console.log("SAVING DATA: No active mission.");
        }
        // ---

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
            pos: { x: this.pos.x, y: this.pos.y }, vel: { x: this.vel.x, y: this.vel.y }, angle: normalizedAngle,
            hull: this.hull, credits: this.credits, cargo: JSON.parse(JSON.stringify(this.cargo)),
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
                destroyed: !!g.destroyed
            }))
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

        
        console.log("Player.loadSaveData: Loading data...");

        // Load ship definition (which will populate weapons array)
        let typeToLoad = data.shipTypeName || "Sidewinder"; this.applyShipDefinition(typeToLoad);
        this.pos = data.pos ? createVector(data.pos.x, data.pos.y) : createVector(0, 0);
        this.vel = data.vel ? createVector(data.vel.x, data.vel.y) : createVector(0,0);
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
        this.isWanted = data.isWanted || false;
        this.isPolice = data.isPolice || false;
        this.hasBeenPolice = data.hasBeenPolice || false;
        this.playerFaction = data.playerFaction || null;
        this.hasJoinedFaction = data.hasJoinedFaction || false;
        this.factionShip = data.factionShip || null;

        this.shield = data.shield !== undefined ? data.shield : this.maxShield;
        this.maxShield = data.maxShield || this.maxShield;
        this.shieldRechargeRate = data.shieldRechargeRate || this.shieldRechargeRate;

        this.kills = data.kills || 0;

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
                    console.log(`Saved weaponIndex ${data.weaponIndex} is invalid or points to a null weapon. Setting to first available weapon: ${firstValidWeaponIndex}`);
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
             console.log("   Found activeMission data in save:", data.activeMission);
             // Re-hydrate using the Mission constructor, passing the saved plain object
             try {
                  this.activeMission = new Mission(data.activeMission); // Pass the loaded object to constructor
                  // --- Log Status AFTER Re-hydration ---
                  console.log(`   LOADED DATA: Active Mission Title = ${this.activeMission?.title}, Status = ${this.activeMission?.status}, Progress = ${this.activeMission?.progressCount}`);
                  // ---
             } catch (e) {
                  console.error("   Error re-creating Mission object from saved data:", e);
                  this.activeMission = null; // Clear if creation failed
             }
        } else {
             console.log("   No active mission found in save data.");
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
            console.log(`Restored ${this.activeBodyguards.length} hired bodyguard(s) from save data.`);
        } else {
            // Ensure property exists for runtime code
            this.activeBodyguards = this.activeBodyguards || [];
        }

        console.log(`Player data finished loading. Ship: ${this.shipTypeName}, Wanted: ${this.isWanted}, Mission Status: ${this.activeMission?.status || 'None'}`);
    }

        // Ensure you have a way to set this.target, e.g., via mouse click on an enemy:
        handleMousePressedForTargeting() { // Call this from your main sketch mousePressed
            if (mouseButton === LEFT) { // Or whatever button you use for targeting
                if (this.currentSystem && this.currentSystem.enemies) {
                    const worldMx = mouseX + (this.pos.x - width / 2);
                    const worldMy = mouseY + (this.pos.y - height / 2);
    
                    let clickedEnemy = null;
                    for (let enemy of this.currentSystem.enemies) {
                        if (enemy && !enemy.destroyed && enemy.pos && enemy.size) {
                            let d = dist(worldMx, worldMy, enemy.pos.x, enemy.pos.y);
                            if (d < enemy.size / 2 + 10) { // Give a little buffer for clicking
                                clickedEnemy = enemy;
                                break; 
                            }
                        }
                    }

                    if (clickedEnemy) { // An enemy was clicked
                        if (this.target === clickedEnemy) { // Clicked the already targeted enemy
                            this.target = null; // Deselect
                            if (typeof uiManager !== 'undefined') {
                                uiManager.addMessage(`Target unlocked.`, [255,255,0]);
                            }
                        } else { // Clicked a new enemy (or current target was null)
                            this.target = clickedEnemy;
                            if (typeof uiManager !== 'undefined') {
                                uiManager.addMessage(`Target locked: ${clickedEnemy.shipTypeName}`, [0,255,0]);
                            }
                        }
                    } else { // No enemy was clicked (clicked on background)
                        if (this.target !== null) { // If there was a target, clear it
                            this.target = null;
                            if (typeof uiManager !== 'undefined') {
                                uiManager.addMessage(`Target unlocked.`, [255,255,0]);
                            }
                        }
                        // If no enemy clicked and no prior target, do nothing.
                    }
                }
            }
        }

          /**
     * Toggles autopilot to the requested target
     * @param {string} target - 'station' or 'jumpzone'
     */
          toggleAutopilot(target) {
            console.log(`toggleAutopilot called with target: ${target}`);
            console.log(`Current autopilot state: ${this.autopilotEnabled ? 'enabled' : 'disabled'}, target: ${this.autopilotTarget || 'none'}`);
            
            // If already headed to this target, disable autopilot
            if (this.autopilotEnabled && this.autopilotTarget === target) {
                console.log("Same target detected - disabling autopilot");
                this.disableAutopilot();
                return;
            }
            
            // Otherwise, enable autopilot to the requested target
            this.autopilotEnabled = true;
            this.autopilotTarget = target;
            
            // Make sure current system is defined
            if (!this.currentSystem) {
                console.error("Cannot enable autopilot: currentSystem is undefined");
                this.disableAutopilot();
                if (uiManager) uiManager.addMessage("Autopilot error: System data unavailable");
                return;
            }
            
            console.log(`Autopilot enabled: Flying to ${target}`);
            if (uiManager) uiManager.addMessage(`Autopilot engaged: ${target === 'station' ? 'Station' : 'Jump Zone'}`);
        }
    
        /** Disables autopilot - Ensures NO lingering effects */
        disableAutopilot() {
        if (this.autopilotEnabled) {
            console.log("Autopilot disabled");
            this.autopilotEnabled = false;
            this.autopilotTarget = null;
            
            // Reset critical flags when disabling autopilot
            this.isThrusting = false;        // Ensure thrusting is stopped
            
            // DON'T modify fireCooldown or any other base ship properties
            
            // Only track when autopilot was disabled
            this.lastDisableTime = millis();
        }
    }
    
    /**
     * Processes autopilot logic during update
     */
    updateAutopilot() {
        if (!this.autopilotEnabled || !this.currentSystem) return;
        
        // Disable autopilot if player was recently damaged
        if (millis() - this.lastDamageTime < 500) {
            console.log("Autopilot disabled: Recent damage detected");
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
            
            // Disable if we're very close to station
            const stationDistance = p5.Vector.dist(this.pos, targetPos);
            if (stationDistance < this.currentSystem.station.size * 2) {
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
        const AUTOPILOT_ROTATION_RATE = 0.03; // Fixed rotation speed for autopilot
        if (abs(angleDiff) > 0.05) {
            if (angleDiff > 0) {
                this.angle += AUTOPILOT_ROTATION_RATE;
            } else {
                this.angle -= AUTOPILOT_ROTATION_RATE;
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
        
        // Validate required properties
        const requiredProps = ['name', 'type', 'damage', 'fireRate'];
        if (!requiredProps.every(prop => weapon[prop] !== undefined)) {
            console.warn(`Weapon missing required properties: ${JSON.stringify(weapon)}`);
            return false;
        }
        
        // Get slot count from armament array length
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        const availableSlots = shipDef?.armament?.length || 1;
        
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
        this.weapons[slotIndex] = {...weapon};
        
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
    addKill() {
        this.kills++;
        PLAYER_LOG(`Kill count: ${this.kills}, Rating: ${this.getEliteRating()}`);
    }

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
     * Removes police status when player becomes wanted
     */
    removePoliceStatus() {
        if (this.isPolice) {
            this.hasBeenPolice = true;
            this.isPolice = false;
            
            // Show notification to player
            if (typeof uiManager !== "undefined") {
                uiManager.addMessage("Police status revoked due to criminal activity!", [255, 0,  0]);
            }
            
            console.log("Player's police status revoked, marked as former officer");
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
        // Can't join if already in a faction
        if (this.playerFaction) {
            return false;
        }
        
        // Can't join if wanted (should be checked by UI, but double-check here)
        if (this.currentSystem && this.currentSystem.isPlayerWanted && this.currentSystem.isPlayerWanted()) {
            return false;
        }
        
        // Valid faction names
        const validFactions = ["IMPERIAL", "SEPARATIST", "MILITARY"];
        return validFactions.includes(factionName);
    }

    /**
     * Gets the cheapest ship for a given faction
     * @param {string} factionName - The faction to get a ship for
     * @returns {string|null} The ship type name or null if no ships found
     * @private
     */
    _getCheapestFactionShip(factionName) {
        // Define faction-specific ships with their prices
        const factionShips = {
            "IMPERIAL": [
                { name: "ImperialCourier", price: 50000 },
                { name: "ImperialEagleMkII", price: 58000 },
                { name: "ImperialLancer", price: 62000 }
            ],
            "SEPARATIST": [
                { name: "SeparatistPartisan", price: 28000 },
                { name: "SeparatistLiberator", price: 52000 },
                { name: "SeparatistOutlander", price: 70000 }
            ],
            "MILITARY": [
                { name: "Vulture", price: 40000 },
                { name: "Viper", price: 60000 },
                { name: "FederalAssaultShip", price: 90000 }
            ]
        };

        const ships = factionShips[factionName];
        if (!ships || ships.length === 0) {
            return null;
        }

        // Sort by price and return the cheapest
        ships.sort((a, b) => a.price - b.price);
        return ships[0].name;
    }

    /**
     * Joins a faction and receives a faction ship
     * @param {string} factionName - The faction to join ("IMPERIAL", "SEPARATIST", "MILITARY")
     * @returns {boolean} True if successfully joined, false otherwise
     */
    joinFaction(factionName) {
        // Validate if can join
        if (!this.canJoinFaction(factionName)) {
            console.log(`Cannot join faction: ${factionName}`);
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

        // Set faction status
        this.playerFaction = factionName;
        this.hasJoinedFaction = true;
        this.factionShip = shipType;

        console.log(`Player joined ${factionName} faction and received ${shipType}`);
        return true;
    }

    /**
     * Leaves the current faction
     * @returns {boolean} True if successfully left faction, false otherwise
     */
    leaveFaction() {
        if (!this.playerFaction) {
            console.log("Not currently in any faction");
            return false;
        }

        const oldFaction = this.playerFaction;
        this.playerFaction = null;
        this.factionShip = null;

        console.log(`Player left ${oldFaction} faction`);
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
     * Returns count of active (alive) bodyguards
     * @returns {number} Number of active bodyguards
     */
    getActiveGuardsCount() {
        if (!this.activeBodyguards || this.activeBodyguards.length === 0) {
            return 0;
        }
        // Clean up in single pass - avoid creating new array if no destroyed guards
        let count = 0;
        for (let i = this.activeBodyguards.length - 1; i >= 0; i--) {
            if (this.activeBodyguards[i].destroyed) {
                this.activeBodyguards.splice(i, 1);
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
        
        for (let i = this.activeBodyguards.length - 1; i >= 0; i--) {
            const guard = this.activeBodyguards[i];
            if (guard.destroyed) {
                this.activeBodyguards.splice(i, 1);
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
            console.log("Cannot hire bodyguard: limit reached");
            return false;
        }

        // Check if player has enough credits
        if (this.credits < cost) {
            console.log("Cannot hire bodyguard: not enough credits");
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

        console.log(`Hired ${shipType} bodyguard for ${cost} credits. Total bodyguards: ${this.activeBodyguards.length}`);
        return true;
    }

    /**
     * Dismisses all active bodyguards
     */
    dismissBodyguards() {
        if (!this.activeBodyguards || this.activeBodyguards.length === 0) {
            console.log("No bodyguards to dismiss");
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
        console.log(`Dismissed ${count} bodyguard(s)`);
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

            // Add to system enemies
            system.enemies.push(bodyguardEnemy);

            console.log(`Spawned bodyguard ${guard.shipType} at ${spawnX.toFixed(0)}, ${spawnY.toFixed(0)}`);
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
                    guards.splice(i, 1);
                    lostCount++;
                }
            } else if (guard.destroyed) {
                guards.splice(i, 1);
                lostCount++;
            }
        }
        
        if (lostCount > 0) {
            console.log(`Lost ${lostCount} bodyguard(s) in combat`);
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
            console.log("Cannot repair bodyguards: not enough credits");
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

        console.log(`Repaired ${repairedCount} bodyguard(s) for ${cost} credits`);
        return true;
    }

} // End of Player Class