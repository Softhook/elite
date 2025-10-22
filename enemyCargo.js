// ****** enemyCargo.js ******
// Enemy Cargo Handling Methods - Stage 8
// Contains cargo spawn, jettison, drop, and detection methods

/**
 * EnemyCargo class contains cargo-related methods for enemies.
 * These methods are mixed into the Enemy prototype via applyEnemyCargoMethods().
 */
class EnemyCargo {

    /**
     * Internal helper: Handles spawning cargo based on context (jettison or destruction).
     * Calculates parameters, creates the Cargo object, and calls system.addCargo().
     * @param {'jettison' | 'destruction'} context - The reason for spawning cargo.
     * @returns {boolean} True if cargo was spawned successfully, false otherwise.
     * @private
     */
    _spawnCargo(context) {
        // 1. Get System and check for addCargo method
        const system = this.getSystem();
        if (!system || typeof system.addCargo !== 'function') {
            console.warn(`${this.shipTypeName} can't ${context} cargo - system or system.addCargo method missing`);
            return false; // Good check
        }

        // 2. Get Ship Definition and check for cargo types
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        if (!shipDef || !shipDef.typicalCargo || shipDef.typicalCargo.length === 0) {
            return false; // Good check - no cargo defined
        }

        // 3. Initialize variables
        const cargoType = random(shipDef.typicalCargo); // Selects random type
        let quantity = 0;
        let position = createVector(this.pos.x, this.pos.y); // Starts at enemy pos
        let velocity = createVector(0, 0);
        let message = "";

        // 4. Context-Specific Calculations
        if (context === 'jettison') {
            quantity = 1; // Correct for jettison
            // Calculates offset position - seems reasonable
            const offsetAngle = random(TWO_PI);
            const offsetDist = this.size * 0.6;
            position.add(cos(offsetAngle) * offsetDist, sin(offsetAngle) * offsetDist);
            // Calculates velocity based on ship + random push - seems reasonable
            if (this.vel) {
                velocity.add(p5.Vector.mult(this.vel, 0.3));
                velocity.add(p5.Vector.random2D().mult(random(0.5, 1.5)));
            }
            message = `${this.shipTypeName} jettisoned ${quantity} unit of ${cargoType}`;

        } else if (context === 'destruction') {
            const cargoCapacity = shipDef.cargoCapacity || 0;
            if (cargoCapacity <= 0) return false; // Correct check
            quantity = Math.max(1, Math.floor(cargoCapacity / 3)); // Drops ~1/3 capacity, min 1 - reasonable
            // Calculates random offset position around destruction point - reasonable
            const offsetAngle = random(TWO_PI);
            const offsetDist = random(this.size * 0.2, this.size * 0.7);
            position.add(cos(offsetAngle) * offsetDist, sin(offsetAngle) * offsetDist);
            // Calculates random outward velocity - reasonable for explosion
            velocity = p5.Vector.random2D().mult(random(0.8, 2.0));
            message = `${this.shipTypeName} dropped ${quantity} units of ${cargoType}`;
            console.log(`${this.shipTypeName} destroyed - dropping cargo: ${quantity} x ${cargoType}`); // Good specific log

        } else {
            console.error(`_spawnCargo called with invalid context: ${context}`);
            return false; // Handles invalid context
        }

        // 5. Check Quantity
        if (quantity <= 0) return false; // Prevents spawning zero items

        // 6. Create Cargo Object
        let cargoObject = null;
        try {
            cargoObject = new Cargo(position.x, position.y, cargoType, quantity);
            cargoObject.vel = velocity;
            cargoObject.size = 8; // Standardizes size
        } catch (e) {
            console.error(`Error creating Cargo object in _spawnCargo (${context}) for ${this.shipTypeName}:`, e);
            return false; // Good error handling
        }

        // 7. Add Cargo to System using system.addCargo
        if (system.addCargo(cargoObject)) { // Correctly uses the existing method
            // Handle UI Message
            if (typeof uiManager !== 'undefined' && message) {
                uiManager.addMessage(message); // Displays appropriate message
            }
            return true; // Success
        } else {
            // system.addCargo should log its own failure, but add a warning here too
            console.warn(`_spawnCargo: system.addCargo failed for ${cargoType} x${quantity}`);
            return false; // Failure
        }
    }

    /**
     * Jettisons a single piece of cargo when hit (but not destroyed).
     * Calls the internal helper with 'jettison' context.
     */
    jettisonCargo() {
        this._spawnCargo('jettison');
    }

    /**
     * Drops cargo when ship is destroyed.
     * Calls the internal helper with 'destruction' context.
     */
    dropCargo() {
        this._spawnCargo('destruction');
    }

    /** 
     * Detects nearby cargo within range 
     * @param {Object} system - The current star system
     * @return {Object|null} The closest cargo or null if none found
     */
    detectCargo(system) {
        if (!system?.cargo || system.cargo.length === 0) return null;
        
        let closestCargo = null;
        let closestDistance = Infinity;
        
        for (const cargo of system.cargo) {
            if (cargo.collected) continue;
            
            const distance = dist(this.pos.x, this.pos.y, cargo.pos.x, cargo.pos.y);
            if (distance < this.cargoDetectionRange && distance < closestDistance) {
                closestCargo = cargo;
                closestDistance = distance;
            }
        }
        
        return closestCargo;
    }
}

/**
 * Apply EnemyCargo methods to Enemy prototype
 */
function applyEnemyCargoMethods() {
    // Get all method names from EnemyCargo prototype
    Object.getOwnPropertyNames(EnemyCargo.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyCargo.prototype[methodName];
        }
    });
}
