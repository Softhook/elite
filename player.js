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
        this.currentSystem = null; this.fireCooldown = 0;
        this.currentWeapon = WEAPON_UPGRADES[0]; // Default to Pulse Laser
        this.fireRate = this.currentWeapon.fireRate;
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
        this.rotationSpeedDegrees = def.baseTurnRateDegrees;
        this.maxHull = def.baseHull;
        this.hull = def.baseHull;
        this.cargoCapacity = def.cargoCapacity;
        this.weaponSlots = def.weaponSlots;
        // ...copy any other relevant properties...

        // Recalculate any derived properties
        this.calculateRadianProperties && this.calculateRadianProperties();
        this.updateShipVisual && this.updateShipVisual();
    }

    calculateRadianProperties() {
        this.rotationSpeed = radians(this.rotationSpeedDegrees);
        // Other conversions can go here if needed.
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
        let proj = new Projectile(spawnPos.x, spawnPos.y, shootingAngleRad, this); // Pass `this` (the player object)
        this.currentSystem.addProjectile(proj);
    }

    /** Fires the current weapon based on its type using WeaponSystem. */
    fireWeapon(target = null) {
        if (!this.currentWeapon || !this.currentSystem) return;
        WeaponSystem.fire(this, this.currentSystem, this.angle, this.currentWeapon.type, target);
        //console.log(`${this.currentWeapon.name} fired by player at angle ${this.angle}`);
    }

    /** Updates player physics state. */
    update() {
        this.vel.mult(this.drag); this.vel.limit(this.maxSpeed);
        if (!isNaN(this.vel.x) && !isNaN(this.vel.y)) { this.pos.add(this.vel); }
        else { this.vel.set(0, 0); } // Reset invalid velocity
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
        
        if (isNaN(this.angle)) { return; } // Safety check
        
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName]; 
        const drawFunc = shipDef?.drawFunction;
        
        if (typeof drawFunc !== 'function') { return; }
        
        push(); 
        translate(this.pos.x, this.pos.y); 
        rotate(degrees(this.angle)); // Convert radians to degrees
        drawFunc(this.size, this.isThrusting); 
        pop();

        // Existing weapon effects
        if (this.lastForceWave && millis() - this.lastForceWave.time < 300) {
            // ...existing force wave drawing code...
        }

        if (this.lastBeam && millis() - this.lastBeam.time < 120) {
            // ...existing beam drawing code...
        }
    }

    /** Applies damage to the player's hull. */
    takeDamage(amount) {
        if (this.destroyed || amount <= 0) return;
        this.hull -= amount;
        console.log("Player took damage:", amount, "Current hull:", this.hull);
        if (this.hull <= 0) {
            this.hull = 0;
            this.destroyed = true;
            this.explosionStartTime = millis();
            this.exploding = true; // Flag to track explosion sequence
            
            // Create player explosion (larger, more dramatic)
            if (this.currentSystem && typeof this.currentSystem.addExplosion === 'function') {
                // Main large explosion
                this.currentSystem.addExplosion(
                    this.pos.x,
                    this.pos.y,
                    this.size * 3, // Larger explosion
                    [100, 150, 255]
                );
                
                // Create cascading secondary explosions
                for (let i = 0; i < 12; i++) { // More secondary explosions
                    setTimeout(() => {
                        if (this.currentSystem) {
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
                    }, i * 120); // Staggered timing for cascade effect
                }
                
                // CRITICAL: Delay game over screen until explosion sequence completes
                setTimeout(() => {
                    if (typeof gameStateManager !== "undefined" && gameStateManager) {
                        gameStateManager.setState("GAME_OVER");
                    } else {
                        alert("Game Over! Your ship has been destroyed.");
                        noLoop();
                    }
                }, 2000); // 2 second delay to allow explosion to finish
            } else {
                // Fallback if explosions not available
                if (typeof gameStateManager !== "undefined" && gameStateManager) {
                    gameStateManager.setState("GAME_OVER");
                } else {
                    alert("Game Over! Your ship has been destroyed.");
                    noLoop();
                }
            }
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
            // --- Save the plain mission data object ---
            activeMission: missionDataToSave,
            weaponName: this.currentWeapon?.name || null // <-- ADD THIS LINE
            // -----------------------------------------
        };
    }

    loadSaveData(data) {
        if (!data) { console.warn("Player.loadSaveData: No data provided."); return; }
        console.log("Player.loadSaveData: Loading data...");

        let typeToLoad = data.shipTypeName || "Sidewinder"; this.applyShipDefinition(typeToLoad);
        this.pos = data.pos ? createVector(data.pos.x, data.pos.y) : createVector(0, 0);
        this.vel = data.vel ? createVector(data.vel.x, data.vel.y) : createVector(0,0);
        let loadedAngle = data.angle ?? 0; if (typeof loadedAngle !== 'number' || isNaN(loadedAngle)) { this.angle = 0; } else { this.angle = (loadedAngle % TWO_PI + TWO_PI) % TWO_PI; }
        this.hull = data.hull !== undefined ? constrain(data.hull, 0, this.maxHull) : this.maxHull;
        this.credits = data.credits ?? 1000;
        this.cargo = Array.isArray(data.cargo) ? JSON.parse(JSON.stringify(data.cargo)) : [];
        this.isWanted = data.isWanted || false;

        // --- Load weapon ---
        if (data.weaponName) {
            this.setWeaponByName(data.weaponName);
        } else {
            this.currentWeapon = WEAPON_UPGRADES[0]; // Default to Pulse Laser if missing
            this.fireRate = this.currentWeapon.fireRate;
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

} // End of Player Class