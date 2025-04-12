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

    /** Gathers player data for saving. */
    getSaveData() {
        let normalizedAngle = (this.angle % TWO_PI + TWO_PI) % TWO_PI; if (isNaN(normalizedAngle)) normalizedAngle = 0;
        return { shipTypeName: this.shipTypeName, pos: { x: this.pos.x, y: this.pos.y }, vel: { x: this.vel.x, y: this.vel.y }, angle: normalizedAngle, hull: this.hull, credits: this.credits, cargo: JSON.parse(JSON.stringify(this.cargo)), isWanted: this.isWanted };
    }

    /** Loads player state from saved data object. */
    loadSaveData(data) {
        if (!data) return;
        let typeToLoad = data.shipTypeName || "Sidewinder"; this.applyShipDefinition(typeToLoad);
        this.pos = data.pos ? createVector(data.pos.x, data.pos.y) : createVector(0, 0);
        this.vel = data.vel ? createVector(data.vel.x, data.vel.y) : createVector(0,0);
        let loadedAngle = data.angle ?? 0; if (typeof loadedAngle !== 'number' || isNaN(loadedAngle)) { this.angle = 0; } else { this.angle = (loadedAngle % TWO_PI + TWO_PI) % TWO_PI; } // Load & normalize radians
        this.hull = data.hull !== undefined ? constrain(data.hull, 0, this.maxHull) : this.maxHull;
        this.credits = data.credits ?? 1000;
        this.cargo = Array.isArray(data.cargo) ? JSON.parse(JSON.stringify(data.cargo)) : [];
        this.isWanted = data.isWanted || false;
        console.log(`Player loaded: ${this.shipTypeName}, Wanted: ${this.isWanted}, Angle: ${this.angle.toFixed(3)} rad`);
    }

} // End of Player Class