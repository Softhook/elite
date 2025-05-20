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
        this.currentWeapon = WEAPON_UPGRADES[0]; // Default to Pulse Laser
        this.fireRate = this.currentWeapon.fireRate;
        this.isThrusting = false; 
        this.isReverseThrusting = false; // Add this line

        this.target = null; // Add this to store the player's current target for missiles etc.

        // Add police status
        this.isPolice = false;
        this.hasBeenPolice = false;

        // Initialize weapons array based on ship definition
        this.weapons = [];
        this.weaponIndex = 0;

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

        // Add tangle weapon effect properties
        this.dragMultiplier = 1.0;   // Default - normal drag
        this.dragEffectTimer = 0;    // Countdown timer for tangle effect
        this.tangleEffectTime = 0;   // Visual effect timestamp

        // Track enemy kills for Elite rating
        this.kills = 0;

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
        
        // Initialize weapons array
        this.weapons = [];
        
        if (shipDef && shipDef.armament && shipDef.armament.length) {
            // Load each weapon from ship's armament
            for (const weaponName of shipDef.armament) {
                const weaponDef = WEAPON_UPGRADES.find(w => w.name === weaponName);
                if (weaponDef) {
                    this.weapons.push({...weaponDef}); // Clone weapon definition
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
        
        if (index >= 0 && index < this.weapons.length) {
            this.weaponIndex = index;
            this.currentWeapon = this.weapons[this.weaponIndex];
            this.fireRate = this.currentWeapon.fireRate || 0.5;
            // Reset cooldown on weapon switch (optional)
            this.fireCooldown = 0;
            return true;
        }
        return false;
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
            this.fireCooldown = this.fireRate;
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
  
    // 5) Cooldowns & angle wrap
    if (this.fireCooldown > 0) {
      this.fireCooldown -= deltaTime / 1000;
    }
    this.angle = (this.angle % TWO_PI + TWO_PI) % TWO_PI;
  }
  
  /** Attempt a one-off forward speed burst if off cooldown */
  trySpeedBurst() {
    const now = millis();
    if (now - this.lastBurstTime > this.speedBurstCooldown && !this.isSpeedBursting) {
      this.isSpeedBursting = true;
      this.isCoastingFromBurst = false; // Reset coasting flag when a new burst starts
      this.speedBurstEnd   = now + 1000;  // 1000ms burst window
      this.lastBurstTime   = now;
  
      // Big impulse (will now exceed normal cap)
      const burstImpulseForce = this.thrustForce * this.speedBurstMultiplier;
      const burst = p5.Vector.fromAngle(this.angle).mult(burstImpulseForce);
      this.vel.add(burst);
  
      uiManager?.addMessage("Speed Burst!", 'lightblue');
    }
  }

    /** Apply a left‐strafe (kite) thrust */
    kiteLeft() {
        const force = p5.Vector.fromAngle(this.angle - HALF_PI).mult(this.thrustForce);
        this.vel.add(force);
        // draw particles
        if (this.thrustManager) {
            this.thrustManager.createThrust(this.pos, this.angle - HALF_PI, this.size);
        }
    }

    /** Apply a right‐strafe (kite) thrust */
    kiteRight() {
        const force = p5.Vector.fromAngle(this.angle + HALF_PI).mult(this.thrustForce);
        this.vel.add(force);
        if (this.thrustManager) {
            this.thrustManager.createThrust(this.pos, this.angle + HALF_PI, this.size);
        }
    }


    /** 
     * Applies reverse thrust (slower backward movement)
     * Uses opposite direction from current facing angle.
     */
    reverseThrust() {
        
        if (isNaN(this.angle)) {

            return;
        }
        
        // Calculate force in opposite direction (angle + PI)
        let reverseAngle = this.angle + PI;
        let force = p5.Vector.fromAngle(reverseAngle);
        
        // Apply reduced force (60% of forward thrust)
        force.mult(this.thrustForce * 0.6);
        this.vel.add(force);
        
        // Create thrust particles at ship's front sides for reverse thrusters
        if (this.thrustManager) {
            // Move thrusters further out to the sides and forward
            const offset = this.size * 0.7; // Position more in front of the ship
            
            // Left thruster: 45 degrees from center
            const leftThrusterAngle = this.angle - PI/4;
            const leftThrusterPos = p5.Vector.fromAngle(this.angle).mult(offset)
                .add(p5.Vector.fromAngle(leftThrusterAngle).mult(this.size * 0.4));
            
            // Right thruster: 45 degrees from center
            const rightThrusterAngle = this.angle + PI/4;
            const rightThrusterPos = p5.Vector.fromAngle(this.angle).mult(offset)
                .add(p5.Vector.fromAngle(rightThrusterAngle).mult(this.size * 0.4));
            
            // CRITICAL FIX: Match the parameter signature of the standard createThrust() call
            // Left thruster - use standard parameter structure
            this.thrustManager.createThrust(
                p5.Vector.add(this.pos, leftThrusterPos),
                leftThrusterAngle,
                this.size * 0.9  // Just pass position, angle and size
            );
            
            // Right thruster - use standard parameter structure 
            this.thrustManager.createThrust(
                p5.Vector.add(this.pos, rightThrusterPos),
                rightThrusterAngle,
                this.size * 0.9
            );
            
            // FALLBACK: Direct visual rendering if thrustManager isn't showing particles
            // This will ensure there's always a visual indicator even if the thrust particles fail
            push();
            fill(255, 150, 255, 200); // Bright magenta with some transparency
            noStroke();
            
            // Left thruster triangle
            const leftPos = p5.Vector.add(this.pos, leftThrusterPos);
            translate(leftPos.x, leftPos.y);
            rotate(leftThrusterAngle);
            triangle(0, 0, -10, -5, -10, 5);
            
            // Right thruster triangle
            const rightPos = p5.Vector.add(this.pos, rightThrusterPos);
            translate(rightPos.x - leftPos.x, rightPos.y - leftPos.y); // Relative translation
            rotate(rightThrusterAngle - leftThrusterAngle); // Relative rotation
            triangle(0, 0, -10, -5, -10, 5);
            
            pop();
        }
    }

    /** Applies forward thrust force based on current facing angle (radians). */
    thrust() {
        if (isNaN(this.angle)) { this.angle = 0; } // Safety check
        let force = p5.Vector.fromAngle(this.angle); force.mult(this.thrustForce); this.vel.add(force);
    }

    /** Fires a projectile towards the mouse cursor (world coordinates). */
    fire() {
        if (!this.currentSystem || isNaN(this.angle)) { return; } // Safety checks
        let tx = width / 2 - this.pos.x; let ty = height / 2 - this.pos.y;
        let worldMx = mouseX - tx; let worldMy = mouseY - ty;
        let shootingAngle = atan2(worldMy - this.pos.y, worldMx - this.pos.x);
        let spawnOffset = p5.Vector.fromAngle(this.angle).mult(this.size * 0.7);
        let spawnPos = p5.Vector.add(this.pos, spawnOffset);
        let proj = new Projectile(spawnPos.x, spawnPos.y, shootingAngle, this); // Pass `this` (the player object)
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

        let fireAngle = this.angle;
        let effectiveTarget = target || this.target; // Use passed target, fallback to player's locked target

        if (this.currentWeapon.type === WEAPON_TYPE.MISSILE) {
            if (!effectiveTarget || effectiveTarget.destroyed || (effectiveTarget.hull !== undefined && effectiveTarget.hull <=0)) {
                if (typeof uiManager !== 'undefined' && this === player) { // only show message for player
                    uiManager.addMessage("No target locked for missile.", [255,100,100]);
                }
                return false; // Don't fire missile without a valid target
            }
        } else if (this.currentWeapon.type === WEAPON_TYPE.BEAM && this === player) { // Player aims beams with mouse
            // Convert screen mouse position to world coordinates
            const worldMx = mouseX + (this.pos.x - width/2);
            const worldMy = mouseY + (this.pos.y - height/2);
            fireAngle = atan2(worldMy - this.pos.y, worldMx - this.pos.x);
        }
        // For turrets, WeaponSystem.fireTurret handles its own aiming if no target is passed.
        // If a target is passed (effectiveTarget), it will be used.

        WeaponSystem.fire(this, this.currentSystem, fireAngle, this.currentWeapon.type, effectiveTarget);
        this.fireCooldown = this.fireRate;
        return true;
    }

    /** Updates player position, physics, and state. */
    update() {


        // Update tangle effect timer
        if (this.dragEffectTimer > 0) {
            this.dragEffectTimer -= deltaTime / 1000; // Convert to seconds
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
            if (millis() < this.speedBurstEnd) {
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
                
                // Then apply powerful velocity reduction with safety checks
                const safeDragMultiplier = Math.max(this.dragMultiplier, 0.001); // Prevent division by zero
                const tangledSpeedFactor = Math.min(1 / safeDragMultiplier, 1.0); // Can't increase speed
                
                // Apply tangle effect if values are valid
                if (isFinite(tangledSpeedFactor) && tangledSpeedFactor > 0) {
                    this.vel.mult(tangledSpeedFactor);
                    
                    // Add slight directional randomness to simulate being caught in energy net
                    if (frameCount % 5 === 0) {
                        this.vel.rotate(random(-0.1, 0.1));
                    }
                    
                    // Add subtle jitter to visualize energy field disruption
                    if (frameCount % 6 === 0) {
                        const jitterAmount = 0.03;
                        this.vel.add(random(-jitterAmount, jitterAmount), random(-jitterAmount, jitterAmount));
                    }
                }
            } else {
                // Normal drag (typically ~0.985)
                this.vel.mult(this.drag);
            }
        }

        // 2) Speed cap
        let currentCap;
        if (this.isSpeedBursting) {
            // Actively bursting (thrust being applied), high cap
            currentCap = this.baseMaxSpeed * this.speedBurstMultiplier;
        } else if (this.isCoastingFromBurst) {
            // Coasting after burst: maintain the high cap, let drag reduce speed.
            currentCap = this.baseMaxSpeed * this.speedBurstMultiplier;
            // End coasting if speed has decayed close to or below normal max speed.
            // Using 1.01 (101%) as a threshold to ensure a smooth transition to the normal cap.
            if (this.vel.magSq() < sq(this.baseMaxSpeed * 1.01)) {
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

        // Position update
        if (!isNaN(this.vel.x) && !isNaN(this.vel.y)) {
            this.pos.add(this.vel);
        } else {
            this.vel.set(0,0); // Safety net for NaN velocity
        }

        // Update cooldown timer
        if (this.fireCooldown > 0) {
            this.fireCooldown -= deltaTime / 1000;
        }

        // Either handle autopilot OR normal input, never both
        if (this.autopilotEnabled) {
            this.updateAutopilot();
        }

        // Regenerate shields only after recharge delay has passed
        const timeSinceShieldHit = millis() - this.lastShieldHitTime;
        if (this.shield < this.maxShield && timeSinceShieldHit > this.shieldRechargeDelay) {
            // Scale by deltaTime for consistent recharge rate
            const timeScale = deltaTime ? (deltaTime / 16.67) : 1; // Normalize to ~60fps
            const rechargeAmount = this.shieldRechargeRate * SHIELD_RECHARGE_RATE_MULTIPLIER * timeScale * 0.016; // Per-frame rate
            this.shield = Math.min(this.maxShield, this.shield + rechargeAmount);
        }

        // --- Secret Station Discovery ---
        // Only check for discoveries when we have secret stations and only every 10 frames to improve performance
        if (this.currentSystem && this.currentSystem.secretStations && 
            this.currentSystem.secretStations.length > 0 && frameCount % 10 === 0) {
            for (const station of this.currentSystem.secretStations) {
                if (!station.discovered) {
                    // Use faster distance check (squared distance comparison avoids costly sqrt operations)
                    const dx = this.pos.x - station.pos.x;
                    const dy = this.pos.y - station.pos.y;
                    const distSquared = dx*dx + dy*dy;
                    
                    // Discovery distance is proportional to station size (squared for comparison)
                    const discoveryDistance = station.size * 3;
                    const discoveryDistSquared = discoveryDistance * discoveryDistance;
                    
                    if (distSquared < discoveryDistSquared) {
                        station.discovered = true;
                        uiManager.addMessage(`Secret Base Discovered: ${station.name}!`, [0, 255, 255]);
                        console.log(`Player discovered secret station: ${station.name}`);
                    }
                }
            }
        }
        // --- End Secret Station Discovery ---
    }

    /** Draws the player ship using its specific draw function. */
    draw() {
        // Don't draw ship if exploding
        if (this.exploding) {
            // Show final flash during first 300ms
            if (millis() - this.explosionStartTime < 300) {
                push();
                translate(this.pos.x, this.pos.y);
                fill(255, 255, 255, map(millis() - this.explosionStartTime, 0, 300, 255, 0));
                noStroke();
                ellipse(0, 0, this.size * 1.5);
                pop();
            }
            return; // Skip drawing the ship
        }
        
        // Draw thrust particles BEHIND the ship
        this.thrustManager.draw();
        
        if (isNaN(this.angle)) { return; } // Safety check
        
        // Draw line to secret base if feature is active (early exit if not active)
        if (this.showSecretBaseNavigation && this.currentSystem && this.currentSystem.secretStations && 
            this.currentSystem.secretStations.length > 0) {
            
            // Cache closest station data to avoid recalculating every frame
            if (!this._cachedNavigation || frameCount % 30 === 0) {
                // Only recalculate every 30 frames or if cache is empty
                let closestStation = this.currentSystem.secretStations[0];
                let closestDist = Infinity;
                
                for (const station of this.currentSystem.secretStations) {
                    // Use faster squared distance calculation
                    const dx = this.pos.x - station.pos.x;
                    const dy = this.pos.y - station.pos.y;
                    const distSquared = dx*dx + dy*dy;
                    
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
                    lastUpdated: frameCount
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
            
            // Draw distance text
            const midX = (this.pos.x + closestStation.pos.x) / 2;
            const midY = (this.pos.y + closestStation.pos.y) / 2;
            fill(0, 255, 255);
            textAlign(CENTER, CENTER);
            textSize(14);
            
            // Show discovery status in distance text
            const statusText = closestStation.discovered ? 
                `Secret Base: ${Math.floor(closestDist)} units` : 
                `Locate Secret Base: ${Math.floor(closestDist)} units`;
            text(statusText, midX, midY - 15);
            
            // Reset line dash
            drawingContext.setLineDash([]);
            pop();
        } else if (this._cachedNavigation) {
            // Clear cache when not in use to free memory
            this._cachedNavigation = null;
        }
        
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName]; 
        const drawFunc = shipDef?.drawFunction;
        
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
        // Record attacker for bodyguard response
        if (attacker) {
            this.lastAttacker = attacker;
            this.lastAttackTime = millis();
        }
        
        if (this.destroyed || amount <= 0) return { damage: 0, shieldHit: false };
        
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
                //uiManager.addMessage(`Shield damage: ${amount.toFixed(1)}`);
                return { damage: amount, shieldHit: true };
            } else {
                // Shield is depleted, remaining damage goes to hull
                const remainingDamage = amount - this.shield;
                this.shield = 0;
                this.hull -= remainingDamage;
                
                // CRITICAL FIX: This is STILL a shield hit even though it depleted the shield
                //uiManager.addMessage(`Shield down! Hull damage: ${remainingDamage.toFixed(1)}`);
                
                // Always report as a shield hit if shields absorbed ANY damage
                shieldHit = true;
            }
        } else {
            // No shields, damage hull directly
            this.hull -= amount;
            //uiManager.addMessage(`Hull damage: ${amount.toFixed(1)}`);
            shieldHit = false;
        }
        
        // Check for destruction
        if (this.hull <= 0) {
            this.hull = 0;
            this.destroyed = true;
            this.explosionStartTime = millis(); // Track start time
            this.exploding = true; // Flag to track explosion sequence

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
            // console.warn("Player checkCollision: Invalid target provided.", target); // Optional log
            return false;
        }
        
        // Calculate distance squared between centers
        let dSq = sq(this.pos.x - target.pos.x) + sq(this.pos.y - target.pos.y);
        
        // Calculate sum of radii squared (using size as diameter)
        let targetRadius = target.size / 2;
        let myRadius = this.size / 2;
        let sumRadiiSq = sq(targetRadius + myRadius);
        
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
        let normalizedAngle = (this.angle % TWO_PI + TWO_PI) % TWO_PI; if (isNaN(normalizedAngle)) normalizedAngle = 0;

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
        
        // Save bodyguard data
        const bodyguardsData = this.activeBodyguards.map(bodyguard => {
            return {
                shipType: bodyguard.shipType,
                cost: bodyguard.cost,
                hireTime: bodyguard.hireTime,
                id: bodyguard.id
            };
        });

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
            shield: this.shield,
            maxShield: this.maxShield,
            shieldRechargeRate: this.shieldRechargeRate,
            kills: this.kills,
            showSecretBaseNavigation: this.showSecretBaseNavigation, // Save secret base navigation state
            // --- Save the plain mission data object ---
            activeMission: missionDataToSave,
            weaponIndex: this.weaponIndex, // Save the index instead of just the name
            weapons: weaponsData,
            // Save bodyguard data for persistence
            bodyguards: bodyguardsData
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

        
        console.log("Player.loadSaveData: Loading data...");

        // Load ship definition (which will populate weapons array)
        let typeToLoad = data.shipTypeName || "Sidewinder"; this.applyShipDefinition(typeToLoad);
        this.pos = data.pos ? createVector(data.pos.x, data.pos.y) : createVector(0, 0);
        this.vel = data.vel ? createVector(data.vel.x, data.vel.y) : createVector(0,0);
        let loadedAngle = data.angle ?? 0; if (typeof loadedAngle !== 'number' || isNaN(loadedAngle)) { this.angle = 0; } else { this.angle = (loadedAngle % TWO_PI + TWO_PI) % TWO_PI; }
        this.hull = data.hull !== undefined ? constrain(data.hull, 0, this.maxHull) : this.maxHull;
        this.credits = data.credits !== undefined ? Math.floor(data.credits) : 1000; // Ensure loaded credits are integer
        this.cargo = Array.isArray(data.cargo) ? JSON.parse(JSON.stringify(data.cargo)) : [];
        this.isWanted = data.isWanted || false;
        this.isPolice = data.isPolice || false;
        
        // Load secret base navigation state
        this.showSecretBaseNavigation = data.showSecretBaseNavigation || false;

        this.shield = data.shield !== undefined ? data.shield : this.maxShield;
        this.maxShield = data.maxShield || this.maxShield;
        this.shieldRechargeRate = data.shieldRechargeRate || this.shieldRechargeRate;

        this.kills = data.kills || 0;
        
        // Load bodyguard data
        this.activeBodyguards = [];
        if (Array.isArray(data.bodyguards)) {
            this.activeBodyguards = data.bodyguards.map(bodyguardData => ({
                shipType: bodyguardData.shipType,
                cost: bodyguardData.cost,
                hireTime: bodyguardData.hireTime || millis(),
                id: bodyguardData.id || (Date.now() + "_" + Math.floor(Math.random() * 1000))
            }));
            console.log(`Loaded ${this.activeBodyguards.length} bodyguards from save data`);
        }

        // Restore player weapons from saved data
        if (Array.isArray(data.weapons)) {
            // Clear existing weapons array
            this.weapons = [];
            
            // Restore weapons from saved data
            data.weapons.forEach(weaponData => {
                if (weaponData) {
                    // Required properties check
                    const requiredProps = ['name', 'type', 'damage', 'fireRate'];
                    const hasRequiredProps = requiredProps.every(prop => weaponData[prop] !== undefined);
                    
                    if (!hasRequiredProps) {
                        console.warn(`Weapon data missing required properties: ${JSON.stringify(weaponData)}`);
                        this.weapons.push(null);
                        return;
                    }
                    
                    // Try to find matching weapon definition for consistency
                    const matchedWeapon = WEAPON_UPGRADES.find(w => w.name === weaponData.name);
                    if (matchedWeapon) {
                        // Create a deep copy to avoid modifying base definition
                        this.weapons.push({...matchedWeapon});
                    } else {
                        // If not found in definitions, still create a copy
                        this.weapons.push({...weaponData});
                    }
                } else {
                    // Add null placeholder for empty slots
                    this.weapons.push(null);
                }
            });
            
            // Restore weapon index and current weapon
            this.weaponIndex = data.weaponIndex || 0;
            this.setCurrentWeapon(this.weaponIndex); // Use centralized method
        } else {
            // If no saved weapons, initialize from ship definition
            console.log("No weapon data found, loading defaults from ship definition");
            this.loadWeaponsFromShipDefinition(this.shipTypeName);
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

        console.log(`Player data finished loading. Ship: ${this.shipTypeName}, Wanted: ${this.isWanted}, Mission Status: ${this.activeMission?.status || 'None'}`);
    }

        // Utility: Check if an object is a valid enemy target
    isValidEnemyTarget(enemy) {
        return enemy && typeof enemy === 'object' && !enemy.destroyed && enemy.pos && typeof enemy.pos.x === 'number' && typeof enemy.pos.y === 'number' && typeof enemy.size === 'number' && typeof enemy.shipTypeName === 'string' && typeof enemy.hull !== 'undefined';
    }

    handleMousePressedForTargeting() { // Call this from your main sketch mousePressed
        if (mouseButton === LEFT) { // Or whatever button you use for targeting
            if (this.currentSystem && this.currentSystem.enemies) {
                const worldMx = mouseX + (this.pos.x - width / 2);
                const worldMy = mouseY + (this.pos.y - height / 2);

                for (let enemy of this.currentSystem.enemies) {
                    if (this.isValidEnemyTarget(enemy)) {
                        let d = dist(worldMx, worldMy, enemy.pos.x, enemy.pos.y);
                        if (d < enemy.size / 2 + 10) { // Give a little buffer for clicking
                            this.target = enemy;
                            if (typeof uiManager !== 'undefined') {
                                uiManager.addMessage(`Target locked: ${enemy.shipTypeName}`, [0,255,0]);
                            }
                            return; // Target found and set
                        }
                    }
                }
                // If no enemy was clicked, clear target
                if (this.target) {
                    if (typeof uiManager !== 'undefined') {
                        uiManager.addMessage(`Target unlocked.`, [255,255,0]);
                    }
                }
                this.target = null;
            }
        }
    }

    setWeaponByName(name) {
        const found = WEAPON_UPGRADES.find(w => w.name === name);
        if (found) {
            this.currentWeapon = found;
            this.fireRate = found.fireRate;
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
        console.log(`Kill count: ${this.kills}, Rating: ${this.getEliteRating()}`);
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
                uiManager.addMessage("Police status revoked due to criminal activity!", [255, 0, 0]);
            }
            
            console.log("Player's police status revoked, marked as former officer");
        }
    }

    /** 
     * Hire a new bodyguard if player has enough credits and space
     * @param {string} shipType - The type of ship from GUARD_SHIPS array
     * @param {number} cost - The cost in credits
     * @return {boolean} Whether hiring was successful
     */
    hireBodyguard(shipType, cost) {
        // Validate inputs
        if (!shipType || cost <= 0) {
            console.warn(`Invalid bodyguard hire request: ${shipType}, ${cost}`);
            return false;
        }
        
        // Check if player has space for more bodyguards
        if (this.activeBodyguards.length >= this.bodyguardLimit) {
            console.log("Bodyguard limit reached");
            return false;
        }
        
        // Check if player has enough credits
        if (!this.spendCredits(cost)) {
            console.log("Not enough credits to hire bodyguard");
            return false;
        }
        
        // Store info about the hired bodyguard
        // The actual guard ship will be spawned when player undocks
        const bodyguard = {
            shipType: shipType,
            cost: cost,
            hireTime: millis(),
            id: Date.now() + "_" + Math.floor(Math.random() * 1000) // Unique ID
        };
        
        this.activeBodyguards.push(bodyguard);
        console.log(`Bodyguard hired: ${shipType} for ${cost} credits`);
        
        return true;
    }
    
    /**
     * Spawns all hired bodyguards in the current system
     * @param {StarSystem} system - The current system where guards should be spawned
     */
    spawnBodyguards(system) {
        if (!system || !this.activeBodyguards.length) return;
        
        // No need to filter - destroyed bodyguards are automatically removed
        const activeGuardsToSpawn = this.activeBodyguards;
        
        console.log(`Attempting to spawn ${activeGuardsToSpawn.length} bodyguards`);
        
        // Check for existing bodyguards to prevent duplicates
        const alreadySpawnedIds = new Set();
        
        // Find existing bodyguards in the system
        if (system.enemies) {
            system.enemies.forEach(enemy => {
                if (enemy.role === AI_ROLE.GUARD && enemy.principal === this && enemy.guardId) {
                    alreadySpawnedIds.add(enemy.guardId);
                }
            });
        }
        
        console.log(`Found ${alreadySpawnedIds.size} bodyguards already spawned in system`);
        
        activeGuardsToSpawn.forEach(bodyguardInfo => {
            // Skip if this bodyguard is already spawned in the system
            if (alreadySpawnedIds.has(bodyguardInfo.id)) {
                console.log(`Skipping bodyguard ${bodyguardInfo.id}, already present in system`);
                return;
            }
            
            try {
                // Spawn the bodyguard ship near the player
                const offsetDist = this.size * 3 + 50;
                const angle = random(TWO_PI);
                const spawnX = this.pos.x + cos(angle) * offsetDist;
                const spawnY = this.pos.y + sin(angle) * offsetDist;
                
                // Create the bodyguard ship
                const guard = new Enemy(spawnX, spawnY, this, bodyguardInfo.shipType, AI_ROLE.GUARD);
                
                // Store the bodyguard ID for tracking
                guard.guardId = bodyguardInfo.id;
                
                // Set this player as the principal to protect
                guard.principal = this;
                guard.changeState(AI_STATE.GUARDING, { principal: this });
                
                // Add the guard to the system
                if (system.addEnemy(guard)) {
                    console.log(`Successfully spawned bodyguard ${bodyguardInfo.shipType} (ID: ${bodyguardInfo.id})`);
                } else {
                    console.warn(`Failed to add bodyguard to system: ${bodyguardInfo.shipType}`);
                }
            } catch (e) {
                console.error(`Error spawning bodyguard ${bodyguardInfo.shipType}:`, e);
            }
        });
    }
    
    /**
     * Dismiss all bodyguards
     */
    dismissBodyguards() {
        if (!this.currentSystem || this.activeBodyguards.length === 0) return;
        
        // Find and remove the actual guard ships from the system
        const system = this.currentSystem;
        
        if (system && system.enemies) {
            // Mark guards for removal
            system.enemies.forEach(enemy => {
                if (enemy.role === AI_ROLE.GUARD && enemy.principal === this) {
                    enemy.destroyed = true;
                }
            });
        }
        
        // Clear the bodyguards list
        const count = this.activeBodyguards.length;
        this.activeBodyguards = [];
        
        console.log(`Dismissed ${count} bodyguards`);
    }
    
    /**
     * Dismiss a specific destroyed bodyguard from tracking
     * @param {string} bodyguardId - The ID of the destroyed bodyguard to remove
     * @return {boolean} True if the bodyguard was removed, false otherwise
     */
    dismissDestroyedBodyguard(bodyguardId) {
        // Find the index of the bodyguard ID in the destroyed list
        const index = this.destroyedBodyguards.indexOf(bodyguardId);
        if (index !== -1) {
            // Remove this ID from the destroyed list
            this.destroyedBodyguards.splice(index, 1);
            
            // Also remove from activeBodyguards if it's still there
            const activeIndex = this.activeBodyguards.findIndex(guard => guard.id === bodyguardId);
            if (activeIndex !== -1) {
                this.activeBodyguards.splice(activeIndex, 1);
            }
            
            console.log(`Dismissed destroyed bodyguard ${bodyguardId}`);
            return true;
        }
        
        return false;
    }

    /**
     * Get the count of active bodyguards
     * @return {number} Count of active bodyguards
     */
    getActiveGuardsCount() {
        // If there are no active bodyguards, return 0
        if (!this.activeBodyguards || this.activeBodyguards.length === 0) {
            return 0;
        }
        
        // Since destroyed bodyguards are automatically removed,
        // we can just return the length of the activeBodyguards array
        return this.activeBodyguards.length;
    }
    
}// End of Player Class