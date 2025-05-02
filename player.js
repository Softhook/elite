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

            // Add police status
        this.isPolice = false;

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
            this.weapons.push(WEAPON_UPGRADES.find(w => w.name === "Pulse Laser") || {
                name: "Pulse Laser",
                type: "projectile",
                damage: 8,
                color: [255, 0, 0],
                fireRate: 0.5,
                price: 0,
                desc: "Basic energy weapon"
            });
        }
        
        // Set current weapon to first one
        this.weaponIndex = 0;
        this.currentWeapon = this.weapons[this.weaponIndex];
        console.log(`Loaded ${this.weapons.length} weapons for ${shipTypeName}:`, 
                    this.weapons.map(w => w.name).join(', '));
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

    /** Handles continuous key presses for movement. Normalizes angle. */
    handleInput() {
        if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { // Left arrow or A
            this.angle -= this.rotationSpeed;
        }
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { // Right arrow or D
            this.angle += this.rotationSpeed;
        }
        
        // Reset reverse thrust flag first
        this.isReverseThrusting = false;
        
        if (keyIsDown(UP_ARROW) || keyIsDown(87)) { // Up arrow or W
            this.isThrusting = true;
            this.thrust();
        }
        // Add new reverse thrust control
        else if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { // Down arrow or S
            this.isThrusting = true;
            this.isReverseThrusting = true; // Set the flag to indicate reverse thrust
            this.reverseThrust();
        }
        else {
            this.isThrusting = false;
        }
        
        if (this.fireCooldown > 0) {
            this.fireCooldown -= deltaTime / 1000;
        }
        this.angle %= TWO_PI;
        if (this.angle < 0) this.angle += TWO_PI;
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
    fireWeapon(target = null) {
        if (!this.currentWeapon || !this.currentSystem) return;
        WeaponSystem.fire(this, this.currentSystem, this.angle, this.currentWeapon.type, target);

        //console.log(`${this.currentWeapon.name} fired by player at angle ${this.angle}`);
    }

    /** Updates player position, physics, and state. */
    update() {
        this.vel.mult(this.drag); 
        this.vel.limit(this.maxSpeed);
        
        // Update thrust particles
        this.thrustManager.update();
        
        // Create thrust particles if thrusting - BUT ONLY FOR FORWARD THRUST
        // We need to track whether we're in reverse thrust mode
        if (this.isThrusting && !this.isReverseThrusting) {
            this.thrustManager.createThrust(this.pos, this.angle, this.size);
        }
        
        if (!isNaN(this.vel.x) && !isNaN(this.vel.y)) { this.pos.add(this.vel); }
        else { this.vel.set(0, 0); } // Reset invalid velocity

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
        
        // Remove the spacebar-specific firing code from here since we're handling it in draw()
        // This eliminates any potential inconsistency between the flag and actual key state
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
        
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName]; 
        const drawFunc = shipDef?.drawFunction;
        
        if (typeof drawFunc !== 'function') { return; }
        
        push(); 
        translate(this.pos.x, this.pos.y); 
        rotate(this.angle);
        drawFunc(this.size, this.isThrusting); 
        pop();

        // Draw shield effect with improved visuals
        if (this.shield > 0) {
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
    takeDamage(amount) {
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
                uiManager.addMessage(`Shield down! Hull damage: ${remainingDamage.toFixed(1)}`);
                
                // Always report as a shield hit if shields absorbed ANY damage
                shieldHit = true;
            }
        } else {
            // No shields, damage hull directly
            this.hull -= amount;
            uiManager.addMessage(`Hull damage: ${amount.toFixed(1)}`);
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

        return {
            shipTypeName: this.shipTypeName,
            pos: { x: this.pos.x, y: this.pos.y }, vel: { x: this.vel.x, y: this.vel.y }, angle: normalizedAngle,
            hull: this.hull, credits: this.credits, cargo: JSON.parse(JSON.stringify(this.cargo)),
            isWanted: this.isWanted,
            isPolice: this.isPolice,
            shield: this.shield,
            maxShield: this.maxShield,
            shieldRechargeRate: this.shieldRechargeRate,
            // --- Save the plain mission data object ---
            activeMission: missionDataToSave,
            weaponIndex: this.weaponIndex, // Save the index instead of just the name
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

        this.shield = data.shield !== undefined ? data.shield : this.maxShield;
        this.maxShield = data.maxShield || this.maxShield;
        this.shieldRechargeRate = data.shieldRechargeRate || this.shieldRechargeRate;

        // Set the weapon index if saved
        if (data.weaponIndex !== undefined && 
            data.weaponIndex >= 0 && 
            data.weaponIndex < this.weapons.length) {
            this.switchToWeapon(data.weaponIndex);
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

} // End of Player Class