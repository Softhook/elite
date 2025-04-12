// ****** player.js ******

class Player {
    /**
     * Creates a Player instance. Stores speeds/rates in degrees initially.
     * Radian properties are calculated by applyShipDefinition.
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

        // --- Store Base Stats from Definition (Including Degrees) ---
        this.size = shipDef.size;
        this.maxSpeed = shipDef.baseMaxSpeed;
        this.thrustForce = shipDef.baseThrust;
        this.rotationSpeedDegrees = shipDef.baseTurnRateDegrees; // STORE DEGREES
        this.maxHull = shipDef.baseHull;
        this.cargoCapacity = shipDef.cargoCapacity;

        // --- Initialize Radian properties (calculated AFTER constructor) ---
        this.rotationSpeed = 0; // RADIANS per frame

        // --- Current State ---
        this.hull = this.maxHull; this.credits = 1000; this.cargo = [];
        this.currentSystem = null; this.fireCooldown = 0; this.fireRate = 0.25;
        this.isThrusting = false; this.isWanted = false;

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

    abandonMission() {
        if (this.activeMission) {
            console.log("Abandoning mission:", this.activeMission.title);
            // TODO: Apply penalties? Remove mission cargo?
            if (this.activeMission.cargoType && this.activeMission.cargoQuantity > 0) {
                 // Need to handle removal of cargo if mission abandoned
                 console.warn(`Need to implement removal of ${this.activeMission.cargoQuantity}t ${this.activeMission.cargoType} on abandon!`);
                 // this.removeCargo(this.activeMission.cargoType, this.activeMission.cargoQuantity); // Be careful with quantities
            }
            this.activeMission.status = 'Failed'; // Mark as failed perhaps? Or just clear?
            this.activeMission = null;
             // TODO: UI Feedback
            return true;
        }
        return false;
    }

    /** Completes the currently active mission, granting rewards. */
    completeMission() {
        console.log("--- Attempting Player.completeMission() ---"); // Log entry

        // Check if there IS an active mission AND it's in a state that allows completion
        // For auto-complete bounties, the status might still be 'Active' when called from StarSystem
        if (this.activeMission && (this.activeMission.status === 'Active' || this.activeMission.status === 'Completable')) {
            console.log(`   Completing mission: ${this.activeMission.title}`);
            console.log(`   Current Status: ${this.activeMission.status}`);
            console.log(`   Reward to grant: ${this.activeMission.rewardCredits}`);

            let reward = this.activeMission.rewardCredits; // Store reward value
            let completedTitle = this.activeMission.title; // Store title for logging/alert

            // --- Grant FULL Mission Reward ---
            console.log(`   Calling addCredits(${reward}). Current Credits: ${this.credits}`);
            this.addCredits(reward); // Call the credit adding function
            console.log(`   Credits after addCredits call: ${this.credits}`);
            // ---

            // --- Mark internal status and clear ---
            this.activeMission.status = 'Completed'; // Mark mission object itself (might be redundant if clearing)
            console.log(`   Setting activeMission to null (was: ${this.activeMission.title})`);
            this.activeMission = null; // Clear active mission reference from player
            console.log(`   activeMission is now: ${this.activeMission}`);
            // ---

            // --- ADD USER FEEDBACK ---
            // Using alert for testing - replace with UI message later
            try {
                 alert(`Mission Complete!\n${completedTitle}\nReward: ${reward} Credits`);
                 console.log("   Alert displayed.");
            } catch (e) {
                 console.error("Error displaying alert:", e);
                 // Fallback log if alert fails (e.g., in some environments)
                 console.log(`!!! Mission Complete! ${completedTitle} +${reward}cr !!!`);
            }
            // ---

            console.log(`   Mission ${completedTitle} officially complete. Saving game...`);
            saveGame(); // Auto-save progress after mission completion

            return true; // Indicate success
        } else {
            // Log why completion failed
            console.warn("Player.completeMission() called, but conditions not met.");
            if (!this.activeMission) {
                 console.warn("   Reason: No active mission.");
            } else {
                 console.warn(`   Reason: Active mission status is '${this.activeMission.status}', not 'Active' or 'Completable'.`);
            }
            return false; // Indicate failure
        }
    } // --- End completeMission Method ---




    /** Applies base stats and calculates Radian properties. */
    applyShipDefinition(typeName) {
        // console.log(`Player applying definition for: ${typeName}`); // Optional log
        const shipDef = SHIP_DEFINITIONS[typeName] || SHIP_DEFINITIONS[this.shipTypeName] || SHIP_DEFINITIONS["Sidewinder"];
        typeName = shipDef.name; // Ensure typeName matches the actual definition used

        this.shipTypeName = typeName; this.size = shipDef.size; this.maxSpeed = shipDef.baseMaxSpeed;
        this.thrustForce = shipDef.baseThrust; this.rotationSpeedDegrees = shipDef.baseTurnRateDegrees;
        this.maxHull = shipDef.baseHull; this.cargoCapacity = shipDef.cargoCapacity;

        try {
             this.rotationSpeed = radians(this.rotationSpeedDegrees); // Calculate radians/frame
             if (isNaN(this.rotationSpeed)) throw new Error("radians() resulted in NaN");
        } catch (e) {
             console.error(`Error converting degrees to radians for Player ${this.shipTypeName}:`, e);
             this.rotationSpeed = 0.06; // Fallback radians value
        }
        // console.log(` Applied definition: RotSpeed=${this.rotationSpeed.toFixed(4)} rad/f`); // Optional log
    }

    /** Handles mouse click for firing attempt. */
    handleFireInput() {
        if (this.fireCooldown <= 0) { this.fire(); this.fireCooldown = this.fireRate; }
    }

    /** Handles continuous key presses for movement. Normalizes angle. */
    handleInput() {
        if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { this.angle -= this.rotationSpeed; } // Radians
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { this.angle += this.rotationSpeed; } // Radians
        if (keyIsDown(UP_ARROW) || keyIsDown(87)) { this.thrust(); this.isThrusting = true; }
        else { this.isThrusting = false; }
        if (this.fireCooldown > 0) { this.fireCooldown -= deltaTime / 1000; }
        this.angle = (this.angle % TWO_PI + TWO_PI) % TWO_PI; // Normalize angle [0, 2PI)
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
        let shootingAngleDeg = atan2(worldMy - this.pos.y, worldMx - this.pos.x);
        let shootingAngleRad = radians(shootingAngleDeg); // Ensure Radians
        let spawnOffset = p5.Vector.fromAngle(this.angle).mult(this.size * 0.7);
        let spawnPos = p5.Vector.add(this.pos, spawnOffset);
        let proj = new Projectile(spawnPos.x, spawnPos.y, shootingAngleRad, 'PLAYER');
        this.currentSystem.addProjectile(proj);
    }

    /** Updates player physics state. */
    update() {
        this.vel.mult(this.drag); this.vel.limit(this.maxSpeed);
        if (!isNaN(this.vel.x) && !isNaN(this.vel.y)) { this.pos.add(this.vel); }
        else { this.vel.set(0, 0); } // Reset invalid velocity
    }

    /** Draws the player ship using its specific draw function. */
    draw() {
         if (isNaN(this.angle)) { /* Draw fallback */ return; } // Safety check
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName]; const drawFunc = shipDef?.drawFunction;
        if (typeof drawFunc !== 'function') { /* Draw fallback */ return; }
        push(); translate(this.pos.x, this.pos.y); rotate(degrees(this.angle)); // Convert radians to degrees
        drawFunc(this.size, this.isThrusting); pop();
    }

    /** Applies damage to the player's hull. */
    takeDamage(amount) {
        if (amount <= 0) return; this.hull -= amount;
        if (this.hull <= 0) {
            this.hull = 0; console.log("Player Destroyed! GAME OVER.");
            if (gameStateManager) gameStateManager.setState("GAME_OVER");
        }
    }

    /** Checks if the player can dock with the station. */
    canDock(station) {
        if (!station?.pos) return false; let d = dist(this.pos.x, this.pos.y, station.pos.x, station.pos.y);
        let speed = this.vel.mag(); let radius = station.dockingRadius ?? 0;
        return (d < radius && speed < 0.5);
    }

    /** Adds credits. */
    addCredits(amount) { if (typeof amount === 'number' && amount > 0 && isFinite(amount)) { this.credits += amount; } }

    /** Subtracts credits. */
    spendCredits(amount) { if (typeof amount === 'number' && amount > 0 && isFinite(amount) && amount <= this.credits) { this.credits -= amount; return true; } return false; }

    /** Calculates total cargo quantity. */
    getCargoAmount() { return this.cargo.reduce((sum, item) => sum + (item?.quantity ?? 0), 0); }

    /** Adds cargo. */
    addCargo(commodityName, quantity) { if (quantity <= 0) return; const existingItem = this.cargo.find(item => item?.name === commodityName); if (this.getCargoAmount() + quantity > this.cargoCapacity) { return; } if (existingItem) { existingItem.quantity += quantity; } else { this.cargo.push({ name: commodityName, quantity: quantity }); } }

    /** Removes cargo. */
    removeCargo(commodityName, quantity) { if (quantity <= 0) return; const itemIndex = this.cargo.findIndex(item => item?.name === commodityName); if (itemIndex > -1) { if (this.cargo[itemIndex].quantity < quantity) { return; } this.cargo[itemIndex].quantity -= quantity; if (this.cargo[itemIndex].quantity <= 0) { this.cargo.splice(itemIndex, 1); } } }

    // --- ADDED checkCollision Method ---
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
    // --- END checkCollision Method ---

    // --- Save/Load Functionality ---
    getSaveData() {
        let normalizedAngle = (this.angle % TWO_PI + TWO_PI) % TWO_PI; if (isNaN(normalizedAngle)) normalizedAngle = 0;
        return {
            shipTypeName: this.shipTypeName,
            pos: { x: this.pos.x, y: this.pos.y }, vel: { x: this.vel.x, y: this.vel.y }, angle: normalizedAngle,
            hull: this.hull, credits: this.credits, cargo: JSON.parse(JSON.stringify(this.cargo)),
            isWanted: this.isWanted,
            // --- ADDED: Save active mission (if any) ---
            // Note: Saving the whole object might save redundant data. Could save only essential IDs/progress.
            activeMission: this.activeMission ? JSON.parse(JSON.stringify(this.activeMission)) : null
            // -------------------------------------------
        };
    }

    loadSaveData(data) {
        if (!data) { return; }
        console.log("Player.loadSaveData: Loading data...");
        let typeToLoad = data.shipTypeName || "Sidewinder"; this.applyShipDefinition(typeToLoad);
        this.pos = data.pos ? createVector(data.pos.x, data.pos.y) : createVector(0, 0);
        this.vel = data.vel ? createVector(data.vel.x, data.vel.y) : createVector(0,0);
        let loadedAngle = data.angle ?? 0; if (typeof loadedAngle !== 'number' || isNaN(loadedAngle)) { this.angle = 0; } else { this.angle = (loadedAngle % TWO_PI + TWO_PI) % TWO_PI; }
        this.hull = data.hull !== undefined ? constrain(data.hull, 0, this.maxHull) : this.maxHull;
        this.credits = data.credits ?? 1000;
        this.cargo = Array.isArray(data.cargo) ? JSON.parse(JSON.stringify(data.cargo)) : [];
        this.isWanted = data.isWanted || false;
        // --- ADDED: Load active mission ---
        if (data.activeMission) {
             // Re-hydrate the mission object from saved data
             // We need to be careful here - if the Mission class changes, old saves might break.
             // A safer approach uses IDs and regenerates/looks up mission details.
             // For now, simple rehydration:
             this.activeMission = new Mission(data.activeMission); // Recreate object from saved data
             console.log("   Loaded active mission:", this.activeMission.title);
        } else {
             this.activeMission = null;
        }
        // ----------------------------------
        console.log(`Player data finished loading. Ship: ${this.shipTypeName}, Wanted: ${this.isWanted}, Mission: ${this.activeMission?.title || 'None'}`);
    }

} // End of Player Class