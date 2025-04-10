// ****** player.js ******

class Player {
    constructor() {
        this.pos = createVector(width / 2, height / 2);
        this.vel = createVector(0, 0);
        this.angle = 0; // Start pointing RIGHT (0 degrees), matches draw() orientation
        this.size = 20; // Diameter for collision/drawing ref

        // --- Movement Properties ---
        // Note: These are currently frame-rate dependent.
        // For frame-rate independence, multiply by deltaTime adjustment in handleInput/thrust.
        this.rotationSpeed = 4;     // Degrees per frame
        this.thrustForce = 0.15;    // Acceleration units per frame
        this.drag = 0.985;          // Multiplier applied to velocity each frame (closer to 1 = less drag)
        this.maxSpeed = 5;          // Maximum magnitude of velocity vector

        // --- Stats ---
        this.hull = 100;
        this.maxHull = 100;
        this.credits = 1000; // Starting credits

        // --- Cargo ---
        this.cargo = []; // Array of { name: string, quantity: number }
        this.cargoCapacity = 10; // Max total quantity of items

        // --- System Link ---
        this.currentSystem = null; // Reference to the StarSystem object the player is in

        // --- Weapon ---
        this.fireCooldown = 0;      // Timer until next shot is allowed
        this.fireRate = 0.25;       // Seconds between shots (lower = faster)
    }

    // Called from sketch.js mousePressed - Handles the action of attempting to fire
    handleFireInput() {
        // Check cooldown BEFORE calling the actual fire method
        if (this.fireCooldown <= 0) {
             this.fire(); // Attempt to fire projectile
             this.fireCooldown = this.fireRate; // Reset cooldown timer
        }
    }

    // Handles continuous key presses for movement (called every frame in IN_FLIGHT state)
    handleInput() {
        // Rotation based on keyIsDown (uses degrees, as angleMode is DEGREES)
        if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { // A key
           this.angle -= this.rotationSpeed; // Adjust angle directly
        }
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { // D key
           this.angle += this.rotationSpeed; // Adjust angle directly
        }

        // Thrust based on keyIsDown
        if (keyIsDown(UP_ARROW) || keyIsDown(87)) { // W key
            this.thrust(); // Apply thrust force
        }

        // Update weapon cooldown timer (if active)
        if (this.fireCooldown > 0) {
            // deltaTime is p5's time since last frame in milliseconds
            this.fireCooldown -= deltaTime / 1000; // Decrease cooldown by elapsed seconds
        }
    }

    // Applies thrust force in the direction the ship is currently facing
    thrust() {
        // p5.Vector.fromAngle expects RADIANS. Convert player's angle (degrees) first.
        let force = p5.Vector.fromAngle(radians(this.angle));
        force.mult(this.thrustForce); // Scale force by thrust value
        this.vel.add(force); // Add force to velocity
    }

    // Creates and launches a projectile towards the mouse cursor
    fire() {
        // Ensure we are in a system to add projectiles to
        if (!this.currentSystem) {
            console.warn("Player attempting to fire but not in a valid system.");
            return;
        }

        // Calculate angle from player's position to the mouse cursor position.
        // atan2(y, x) SHOULD return radians, but logs suggest it might be returning degrees
        // due to angleMode(DEGREES) influencing it unexpectedly.
        let angleToMouse_PossiblyDegrees = atan2(mouseY - this.pos.y, mouseX - this.pos.x);

        // --- FIX: Convert the result to RADIANS explicitly ---
        // If atan2 was already returning radians, radians() applied again might cause issues in some libraries,
        // but in standard p5.js, applying radians() to a radian value often has no effect or converts based on current mode.
        // However, given the logs, the most robust fix is to ensure we have radians.
        // Let's *assume* it returned degrees and convert using p5's radians() function.
        let angleToMouse = radians(angleToMouse_PossiblyDegrees);
        // --------

        // --- Debug Log Comparison (Optional) ---
        // console.log(`Angle from atan2 (Possibly Deg): ${angleToMouse_PossiblyDegrees.toFixed(2)}, Converted Angle (Rad): ${angleToMouse.toFixed(3)}`);
        // --------

        // Calculate the spawn position slightly ahead of the ship's nose based on its current angle.
        // Use player's angle (degrees converted to radians) for the offset direction.
        let spawnOffset = p5.Vector.fromAngle(radians(this.angle)).mult(this.size * 0.7);
        let spawnPos = p5.Vector.add(this.pos, spawnOffset);

        // Create a new projectile instance. Pass the CORRECTED angleToMouse (which is now definitely radians).
        let proj = new Projectile(spawnPos.x, spawnPos.y, angleToMouse, 'PLAYER');
        this.currentSystem.addProjectile(proj); // Add the projectile to the current system's list
    }

    // Updates player physics state (called every frame in IN_FLIGHT state)
    update() {
        // Apply drag/friction to slow down the ship gradually
        this.vel.mult(this.drag);

        // Limit the ship's speed to the maximum allowed
        this.vel.limit(this.maxSpeed);

        // Update position based on current velocity
        this.pos.add(this.vel);

        // Handle screen wrapping (teleport to other side if going off-screen)
        this.wrapAround();
    }

    // Draws the player ship and associated effects (like thrust flame)
    draw() {
        push(); // Isolate drawing transformations to this ship
        translate(this.pos.x, this.pos.y); // Move the origin (0,0) to the player's position

        // Rotate the coordinate system based on the player's angle (using degrees)
        rotate(this.angle);

        // Draw the ship's body (triangle pointing right along +X axis when angle is 0)
        fill(200); // Ship color
        stroke(255); // Outline color
        strokeWeight(1);
        let r = this.size / 2; // Radius based on size property
        // Points: Nose(+x, 0), BackTop(-x, -y), BackBottom(-x, +y)
        triangle(r, 0, -r, -r * 0.7, -r, r * 0.7);

        // Draw thrust flame visual effect if thrust key is pressed
        if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
            fill(255, 150, 0); // Orange flame color
            noStroke();
            // Flame shape originating from the back of the ship (-x direction)
            let flameLength = r * 1.8;
            let flameWidth = r * 0.6;
            triangle(-r * 1.05, flameWidth / 2, -r * 1.05, -flameWidth / 2, -flameLength, 0);
        }

        pop(); // Restore original drawing matrix and styles
    }

    // Reduces player hull and checks for destruction
    takeDamage(amount) {
        if (amount <= 0) return; // No effect if damage is zero or negative

        this.hull -= amount;
        console.log(`Player took ${amount} damage, Hull: ${this.hull}`);

        // Check if hull has dropped to or below zero
        if (this.hull <= 0) {
            this.hull = 0; // Clamp hull at zero, prevent negative values
            console.log("Player Destroyed! GAME OVER.");

            // Access the global gameStateManager to change the game state.
            // Note: This global access is functional for MVP but less ideal for larger projects.
            if (gameStateManager) {
                gameStateManager.setState("GAME_OVER");
            } else {
                // This should not happen if gameStateManager is initialized correctly in sketch.js
                console.error("CRITICAL: gameStateManager not accessible from Player.takeDamage!");
            }
        }
    }

    // Checks conditions for docking with a given station object
    canDock(station) {
        // Check if the station object is valid
        if (!station || !station.pos) { // Add check for station.pos existence
             console.warn("canDock check failed: Invalid station object provided.");
             return false;
        }

        // Calculate distance between player center and station center
        let d = dist(this.pos.x, this.pos.y, station.pos.x, station.pos.y);
        // Calculate the player's current speed (magnitude of velocity)
        let speed = this.vel.mag();
        // Get station docking radius (ensure it exists)
        let radius = station.dockingRadius !== undefined ? station.dockingRadius : 0;

        // --- Debugging Log ---
        // Log the values being compared ONLY when the check might trigger a dock
        let potentialDock = (d < radius && speed < 0.5);
        if (potentialDock && gameStateManager?.currentState === "IN_FLIGHT") { // Only log when IN_FLIGHT and potentially docking
             console.log(`--- canDock Check Triggering Dock ---`);
             console.log(`Player Pos: (${this.pos.x.toFixed(1)}, ${this.pos.y.toFixed(1)})`);
             console.log(`Station Pos: (${station.pos.x.toFixed(1)}, ${station.pos.y.toFixed(1)})`);
             console.log(`Distance (d): ${d.toFixed(2)}`);
             console.log(`Docking Radius: ${radius.toFixed(2)}`);
             console.log(`Player Speed: ${speed.toFixed(3)}`);
             console.log(`Condition Met? (d < radius && speed < 0.5): ${potentialDock}`);
             console.log(`--- End canDock Check ---`);
        }
        // --- End Debugging Log ---


        // Conditions: Player must be within the station's docking radius AND moving slowly enough.
        return d < radius && speed < 0.5;
    }

    // Calculates the total quantity of all items currently held in cargo
    getCargoAmount() {
        // Use array reduce to sum the 'quantity' property of all items in the cargo array
        return this.cargo.reduce((sum, item) => sum + item.quantity, 0);
    }

    // Adds a specified quantity of a commodity to the cargo hold
    addCargo(commodityName, quantity) {
        // Ignore requests to add zero or negative quantities
        if (quantity <= 0) {
            console.log("Attempted to add non-positive quantity to cargo.");
            return;
        }

        // Find if the item already exists in cargo
        const existingItem = this.cargo.find(item => item.name === commodityName);
        const currentAmount = this.getCargoAmount();

        // Check if adding this quantity would exceed the cargo capacity
        if (currentAmount + quantity > this.cargoCapacity) {
            console.log(`Cannot add ${quantity} ${commodityName}. Cargo full (${currentAmount}/${this.cargoCapacity}).`);
            // Optional: Implement logic to add only a partial amount if space allows.
            return; // Prevent adding if it overflows
        }

        // If the item already exists, increase its quantity
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            // If it's a new item type, add it to the cargo array
            this.cargo.push({ name: commodityName, quantity: quantity });
        }
        console.log("Cargo updated:", this.cargo); // Log current cargo state
    }

    // Removes a specified quantity of a commodity from the cargo hold
    removeCargo(commodityName, quantity) {
        // Ignore requests to remove zero or negative quantities
        if (quantity <= 0) {
            console.log("Attempted to remove non-positive quantity from cargo.");
            return;
        }

        // Find the index of the item in the cargo array
        const itemIndex = this.cargo.findIndex(item => item.name === commodityName);

        // Check if the item exists in cargo
        if (itemIndex > -1) {
            // Check if trying to remove more than the available quantity
            if (this.cargo[itemIndex].quantity < quantity) {
                console.log(`Cannot remove ${quantity} ${commodityName}, only have ${this.cargo[itemIndex].quantity}.`);
                return; // Prevent removal if insufficient stock
            }

            // Subtract the quantity from the item stack
            this.cargo[itemIndex].quantity -= quantity;

            // If the quantity drops to zero or below, remove the item entry entirely from the array
            if (this.cargo[itemIndex].quantity <= 0) {
                this.cargo.splice(itemIndex, 1);
            }
            console.log("Cargo updated:", this.cargo); // Log current cargo state
        } else {
            // Item to remove was not found in cargo
            console.log(`Cannot remove ${commodityName}, item not found in cargo.`);
        }
    }

    // Adds credits to the player's total
    addCredits(amount) {
        if (amount > 0) { // Only add positive amounts
            this.credits += amount;
        } else {
            console.log("Attempted to add zero or negative credits.");
        }
    }

    // Subtracts credits if the player has enough; returns true if successful, false otherwise
    spendCredits(amount) {
        // Check for valid positive amount and sufficient funds
        if (amount > 0 && amount <= this.credits) {
            this.credits -= amount;
            return true; // Indicate successful transaction
        }
        // Log failure reason
        if (amount <= 0) {
            console.log("Attempted to spend zero or negative credits.");
        } else {
            console.log(`Failed to spend ${amount} credits. Current credits: ${this.credits}`);
        }
        return false; // Indicate failed transaction
    }

    // Teleports the player to the opposite side of the screen if they go out of bounds
    wrapAround() {
        let buffer = this.size / 2; // Use half ship size as buffer to prevent partial wrapping visually
        if (this.pos.x < -buffer) this.pos.x = width + buffer;
        if (this.pos.x > width + buffer) this.pos.x = -buffer;
        if (this.pos.y < -buffer) this.pos.y = height + buffer;
        if (this.pos.y > height + buffer) this.pos.y = -buffer;
    }

    // --- Save/Load Functionality ---

    // Returns an object containing the player's current state for saving
    getSaveData() {
        return {
            // Position/Velocity: Saving these allows resuming exactly where left off mid-flight.
            // Alternatively, could save docked status and system index, then reset pos/vel on load.
            pos: { x: this.pos.x, y: this.pos.y },
            vel: { x: this.vel.x, y: this.vel.y },
            angle: this.angle, // Save current orientation

            // Core Stats
            hull: this.hull,
            credits: this.credits,

            // Cargo (needs deep copy to prevent reference issues)
            cargo: JSON.parse(JSON.stringify(this.cargo)),

            // Location within galaxy (handled by global galaxy object)
            currentSystemIndex: galaxy ? galaxy.currentSystemIndex : 0 // Save system index
        };
    }

    // Loads player state from a provided data object (from saved game file)
    loadSaveData(data) {
        // Check if valid save data object was provided
        if (!data) {
            console.warn("No player save data provided to loadSaveData.");
            return;
        }

        console.log("Loading player save data...");

        // Load Position, Velocity, Angle - or reset if not found in save data
        this.pos = data.pos ? createVector(data.pos.x, data.pos.y) : createVector(width/2, height/2);
        this.vel = data.vel ? createVector(data.vel.x, data.vel.y) : createVector(0,0);
        this.angle = data.angle !== undefined ? data.angle : 0; // Load angle or default to 0

        // Load Stats - Use defaults if values missing or invalid (e.g., undefined)
        this.hull = data.hull !== undefined ? data.hull : this.maxHull;
        this.credits = data.credits !== undefined ? data.credits : 1000;

        // Load Cargo - Ensure it's an array, default to empty if missing/invalid
        this.cargo = Array.isArray(data.cargo) ? JSON.parse(JSON.stringify(data.cargo)) : [];

        // Note: currentSystemIndex is handled by the main loadGame function in sketch.js
        // because it needs access to the initialized galaxy object to set player.currentSystem correctly.

        console.log("Player data loaded from save.");
    }

} // End of Player Class