// ****** player.js ******

class Player {
    constructor() {
        // Start player at world origin (0,0) for simplicity, or load saved position
        this.pos = createVector(0, 0);
        this.vel = createVector(0, 0);
        this.angle = 0; // Pointing RIGHT (0 degrees)
        this.size = 20; // Diameter

        // --- Movement Properties ---
        this.rotationSpeed = 4;
        this.thrustForce = 0.15;
        this.drag = 0.985;
        this.maxSpeed = 5;

        // --- Stats ---
        this.hull = 100;
        this.maxHull = 100;
        this.credits = 1000; // Starting credits

        // --- Cargo ---
        this.cargo = []; // Array of { name: string, quantity: number }
        this.cargoCapacity = 10; // Max total quantity of items

        // --- System Link ---
        this.currentSystem = null; // Reference set by sketch/galaxy logic

        // --- Weapon ---
        this.fireCooldown = 0;
        this.fireRate = 0.25;
    }

    // Called from sketch.js mousePressed - Handles the action of attempting to fire
    handleFireInput() {
        if (this.fireCooldown <= 0) {
             this.fire(); // Call the fire method
             this.fireCooldown = this.fireRate; // Reset cooldown
        }
    }

    // Handles continuous key presses for movement (called every frame in IN_FLIGHT state)
    handleInput() {
        if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { this.angle -= this.rotationSpeed; }
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { this.angle += this.rotationSpeed; }
        if (keyIsDown(UP_ARROW) || keyIsDown(87)) { this.thrust(); }
        if (this.fireCooldown > 0) { this.fireCooldown -= deltaTime / 1000; }
    }

    // Applies thrust force in the direction the ship is currently facing
    thrust() {
        let force = p5.Vector.fromAngle(radians(this.angle)); // Convert angle to radians
        force.mult(this.thrustForce);
        this.vel.add(force);
    }

    // Fires a projectile towards the mouse cursor (using world coordinates)
    fire() {
        if (!this.currentSystem) {
            console.warn("Player.fire: Attempting to fire but not in a valid system.");
            return;
        }

        // Calculate World Mouse Coordinates relative to the current view translation
        let translateX = width / 2 - this.pos.x;
        let translateY = height / 2 - this.pos.y;
        let worldMouseX = mouseX - translateX;
        let worldMouseY = mouseY - translateY;

        // Calculate angle from player's world position to mouse's world position
        let angleToMouse_PossiblyDegrees = atan2(worldMouseY - this.pos.y, worldMouseX - this.pos.x);
        let angleToMouse = radians(angleToMouse_PossiblyDegrees); // Explicitly ensure Radians

        // Calculate spawn position slightly ahead of the ship's nose
        let spawnOffset = p5.Vector.fromAngle(radians(this.angle)).mult(this.size * 0.7);
        let spawnPos = p5.Vector.add(this.pos, spawnOffset);

        // Create projectile
        let proj = new Projectile(spawnPos.x, spawnPos.y, angleToMouse, 'PLAYER');
        this.currentSystem.addProjectile(proj);
    }


    // Updates player physics state (called every frame in IN_FLIGHT state)
    update() {
        // Apply physics
        this.vel.mult(this.drag);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);

        // No screen wrapping in scrolling view
    }

    // Draws the player ship (handles its own local translation and rotation)
    draw() {
        push();
        translate(this.pos.x, this.pos.y); // Move to player's world position
        rotate(this.angle); // Rotate to player's angle (using degrees)

        // Draw ship body (triangle pointing right)
        fill(200); stroke(255); strokeWeight(1);
        let r = this.size / 2;
        triangle(r, 0, -r, -r * 0.7, -r, r * 0.7);

        // Draw thrust flame if thrusting
        if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
            fill(255, 150, 0); noStroke();
            let flameLength = r * 1.8; let flameWidth = r * 0.6;
            triangle(-r * 1.05, flameWidth / 2, -r * 1.05, -flameWidth / 2, -flameLength, 0);
        }
        pop();
    }

    // Reduces player hull and checks for destruction
    takeDamage(amount) {
        if (amount <= 0) return;
        this.hull -= amount;
        console.log(`Player took ${amount} damage, Hull: ${this.hull}`);
        if (this.hull <= 0) {
            this.hull = 0;
            console.log("Player Destroyed! GAME OVER.");
            if (gameStateManager) {
                gameStateManager.setState("GAME_OVER");
            } else { console.error("CRITICAL: gameStateManager not accessible from Player.takeDamage!"); }
        }
    }

    // Checks conditions for docking with a given station object
    canDock(station) {
        if (!station || !station.pos) { return false; }
        let d = dist(this.pos.x, this.pos.y, station.pos.x, station.pos.y);
        let speed = this.vel.mag();
        let radius = station.dockingRadius !== undefined ? station.dockingRadius : 0;
        let potentialDock = (d < radius && speed < 0.5);
        // Optional logging (keep for debugging if needed)
        // if (potentialDock && gameStateManager?.currentState === "IN_FLIGHT") {
        //      console.log(`--- canDock Check --- D: ${d.toFixed(1)}, R: ${radius.toFixed(1)}, Spd: ${speed.toFixed(2)} -> ${potentialDock}`);
        // }
        return potentialDock;
    }

    // --- Credit Methods with Validation and Logging ---
    addCredits(amount) {
        // Ensure amount is a valid positive number
        if (typeof amount === 'number' && amount > 0 && isFinite(amount)) {
            this.credits += amount;
            console.log(`Player.addCredits: Added ${amount}, New Total: ${this.credits}`);
        } else {
            console.warn(`Player.addCredits: Invalid amount skipped (${amount})`);
        }
    }

    spendCredits(amount) {
        console.log(`Player.spendCredits: Trying to spend ${amount}, Has ${this.credits}`);
        // Check for valid positive amount and sufficient funds
        if (typeof amount === 'number' && amount > 0 && isFinite(amount) && amount <= this.credits) {
            this.credits -= amount;
            console.log(`Player.spendCredits: Success. Remaining credits: ${this.credits}`);
            return true; // Indicate successful transaction
        }
        // Log failure reason
        if (amount <= 0 || !isFinite(amount) || typeof amount !== 'number') {
            console.warn(`Player.spendCredits: Invalid amount (${amount})`);
        } else if (amount > this.credits) {
            console.warn(`Player.spendCredits: Insufficient funds.`);
        }
        return false; // Indicate failed transaction
    }


    // --- Cargo Methods (Mostly Unchanged, added validation) ---
    getCargoAmount() { return this.cargo.reduce((sum, item) => sum + (item ? item.quantity : 0), 0); } // Added item check

    addCargo(commodityName, quantity) {
        if (quantity <= 0) { console.log("Player.addCargo: Quantity <= 0."); return; }
        const existingItem = this.cargo.find(item => item && item.name === commodityName); // Added item check
        const currentAmount = this.getCargoAmount();
        if (currentAmount + quantity > this.cargoCapacity) {
            console.log(`Player.addCargo: Not enough space for ${quantity} ${commodityName}.`);
            return;
        }
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cargo.push({ name: commodityName, quantity: quantity });
        }
        console.log("Player Cargo updated:", this.cargo);
    }

    removeCargo(commodityName, quantity) {
        if (quantity <= 0) { console.log("Player.removeCargo: Quantity <= 0."); return; }
        const itemIndex = this.cargo.findIndex(item => item && item.name === commodityName); // Added item check
        if (itemIndex > -1) {
            if (this.cargo[itemIndex].quantity < quantity) {
                console.log(`Player.removeCargo: Cannot remove ${quantity} ${commodityName}, only have ${this.cargo[itemIndex].quantity}.`);
                return;
            }
            this.cargo[itemIndex].quantity -= quantity;
            if (this.cargo[itemIndex].quantity <= 0) {
                this.cargo.splice(itemIndex, 1);
            }
            console.log("Player Cargo updated:", this.cargo);
        } else {
            console.log(`Player.removeCargo: Item ${commodityName} not found.`);
        }
    }

    // --- Save/Load Functionality ---
    getSaveData() {
         console.log(`Player.getSaveData: Saving Pos (${this.pos.x.toFixed(1)}, ${this.pos.y.toFixed(1)})`);
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            vel: { x: this.vel.x, y: this.vel.y },
            angle: this.angle,
            hull: this.hull,
            credits: this.credits,
            cargo: JSON.parse(JSON.stringify(this.cargo)), // Deep copy is important
            // currentSystemIndex is saved globally in sketch.js saveGame
        };
    }

    loadSaveData(data) {
        if (!data) { console.warn("Player.loadSaveData: No data provided."); return; }
        console.log("Player.loadSaveData: Loading data...", data);

        // Load Position, Velocity, Angle - use defaults if missing
        this.pos = data.pos ? createVector(data.pos.x, data.pos.y) : createVector(0, 0); // Default to world origin
        this.vel = data.vel ? createVector(data.vel.x, data.vel.y) : createVector(0,0);
        this.angle = data.angle !== undefined ? data.angle : 0;
        console.log(`Player.loadSaveData: Loaded Pos (${this.pos.x.toFixed(1)}, ${this.pos.y.toFixed(1)}) Angle ${this.angle.toFixed(1)}`);

        // Load Stats
        this.hull = data.hull !== undefined ? data.hull : this.maxHull;
        this.credits = data.credits !== undefined ? data.credits : 1000;
        // Load Cargo
        this.cargo = Array.isArray(data.cargo) ? JSON.parse(JSON.stringify(data.cargo)) : [];

        console.log("Player data finished loading from save.");
    }

} // End of Player Class