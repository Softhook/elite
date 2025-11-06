// ****** enemyCargo.js ******
// Enemy Cargo Handling Methods - Stage 8
// Contains cargo spawn, jettison, drop, and detection methods

/**
 * EnemyCargo class contains cargo-related methods for enemies.
 * These methods are mixed into the Enemy prototype via applyEnemyCargoMethods().
 */
class EnemyCargo {

    initializeCargoHoldFromPilot(pilotCargo, capacity) {
        const cap = Number.isFinite(capacity) ? Math.max(0, Math.floor(capacity)) : (this.cargoCapacity || 0);
        this.cargoCapacity = cap;
        this.cargoHold = {};

        if (pilotCargo && typeof pilotCargo === 'object') {
            for (const [type, quantity] of Object.entries(pilotCargo)) {
                const amount = Math.max(0, Math.floor(quantity));
                if (amount > 0) {
                    this.cargoHold[type] = amount;
                }
            }
        }

        this._enforceCargoLimits();
        this._syncCargoToPilotRegistry();
    }

    getCargoLoad() {
        if (!this.cargoHold) return 0;
        let total = 0;
        for (const quantity of Object.values(this.cargoHold)) {
            total += Math.max(0, Math.floor(quantity));
        }
        return total;
    }

    getCargoFreeSpace() {
        const cap = Math.max(0, this.cargoCapacity || 0);
        return Math.max(0, cap - this.getCargoLoad());
    }

    exportCargoState() {
        const snapshot = {};
        if (this.cargoHold) {
            for (const [type, quantity] of Object.entries(this.cargoHold)) {
                const amount = Math.max(0, Math.floor(quantity));
                if (amount > 0) {
                    snapshot[type] = amount;
                }
            }
        }
        return snapshot;
    }

    absorbCargo(type, quantity) {
        if (!type) return 0;
        const freeSpace = this.getCargoFreeSpace();
        const amount = Math.min(freeSpace, Math.max(0, Math.floor(quantity)));
        if (amount <= 0) return 0;
        if (!this.cargoHold) this.cargoHold = {};
        this.cargoHold[type] = (this.cargoHold[type] || 0) + amount;
        this._enforceCargoLimits();
        this._syncCargoToPilotRegistry();
        return amount;
    }

    removeCargo(type, quantity) {
        if (!this.cargoHold || !this.cargoHold[type]) return 0;
        const amount = Math.min(Math.max(0, Math.floor(quantity)), this.cargoHold[type]);
        if (amount <= 0) return 0;
        this.cargoHold[type] -= amount;
        if (this.cargoHold[type] <= 0) {
            delete this.cargoHold[type];
        }
        this._enforceCargoLimits();
        this._syncCargoToPilotRegistry();
        return amount;
    }

    _clearCargoHold() {
        this.cargoHold = {};
        this._syncCargoToPilotRegistry();
    }

    _enforceCargoLimits() {
        const cap = Math.max(0, this.cargoCapacity || 0);
        if (!this.cargoHold) {
            this.cargoHold = {};
            return;
        }
        if (cap <= 0) {
            this.cargoHold = {};
            return;
        }

        let total = this.getCargoLoad();
        if (total <= cap) return;

        for (const [type, quantity] of Object.entries({ ...this.cargoHold })) {
            if (total <= cap) break;
            const overflow = Math.min(quantity, total - cap);
            this.cargoHold[type] -= overflow;
            total -= overflow;
            if (this.cargoHold[type] <= 0) {
                delete this.cargoHold[type];
            }
        }
    }

    _syncCargoToPilotRegistry() {
        if (this.pilotId == null) return;
        if (typeof worldSimulation === 'undefined' || !worldSimulation?.pilotRegistry) return;

        const registry = worldSimulation.pilotRegistry;
        const snapshot = this.exportCargoState();
        registry.updatePilotCargo(this.pilotId, snapshot);
    }

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

        // 2. Initialize variables
        let position = createVector(this.pos.x, this.pos.y); // Starts at enemy pos
        let velocity = createVector(0, 0);
        let message = "";

        // 3. Context-Specific Calculations
        if (context === 'jettison') {
            if (!this.cargoHold || Object.keys(this.cargoHold).length === 0) {
                return false;
            }

            const availableTypes = Object.entries(this.cargoHold).filter(([_, qty]) => qty > 0);
            if (availableTypes.length === 0) {
                return false;
            }

            const [cargoType] = random(availableTypes);
            const removed = this.removeCargo(cargoType, 1);
            if (removed <= 0) {
                return false;
            }

            const offsetAngle = random(TWO_PI);
            const offsetDist = this.size * 0.6;
            position.add(cos(offsetAngle) * offsetDist, sin(offsetAngle) * offsetDist);
            // Calculates velocity based on ship + random push - seems reasonable
            if (this.vel) {
                velocity.add(p5.Vector.mult(this.vel, 0.3));
                velocity.add(p5.Vector.random2D().mult(random(0.5, 1.5)));
            }
            message = `${this.shipTypeName} jettisoned 1 unit of ${cargoType}`;

            let cargoObject;
            try {
                cargoObject = new Cargo(position.x, position.y, cargoType, 1);
                cargoObject.vel = velocity;
                cargoObject.size = 8;
            } catch (e) {
                console.error(`Error creating Cargo object in _spawnCargo (jettison) for ${this.shipTypeName}:`, e);
                return false;
            }

            if (system.addCargo(cargoObject)) {
                if (typeof uiManager !== 'undefined' && message) {
                    uiManager.addMessage(message);
                }
                return true;
            }
            return false;
        } else if (context === 'destruction') {
            if (!this.cargoHold || Object.keys(this.cargoHold).length === 0) {
                CARGO_LOG(`${this.shipTypeName} destroyed but has no cargo to drop (cargoHold empty)`);
                return false;
            }

            CARGO_LOG(`${this.shipTypeName} destroyed - attempting to drop cargo:`, this.cargoHold);
            let droppedAny = false;
            for (const [cargoType, qtyRaw] of Object.entries(this.cargoHold)) {
                let remaining = Math.max(0, Math.floor(qtyRaw));
                while (remaining > 0) {
                    const dropQty = Math.min(remaining, 50);
                    remaining -= dropQty;

                    const dropPos = position.copy();
                    const offsetAngle = random(TWO_PI);
                    const offsetDist = random(this.size * 0.2, this.size * 0.7);
                    dropPos.add(cos(offsetAngle) * offsetDist, sin(offsetAngle) * offsetDist);

                    const dropVelocity = p5.Vector.random2D().mult(random(0.8, 2.0));

                    let cargoObject;
                    try {
                        cargoObject = new Cargo(dropPos.x, dropPos.y, cargoType, dropQty);
                        cargoObject.vel = dropVelocity;
                        cargoObject.size = 8;
                    } catch (e) {
                        console.error(`Error creating Cargo object in _spawnCargo (destruction) for ${this.shipTypeName}:`, e);
                        continue;
                    }

                    if (system.addCargo(cargoObject)) {
                        droppedAny = true;
                        CARGO_LOG(`${this.shipTypeName} destroyed - dropped ${dropQty} ${cargoType}`);
                    }
                }
            }

            if (droppedAny) {
                this._clearCargoHold();
            }

            return droppedAny;

        } else {
            console.error(`_spawnCargo called with invalid context: ${context}`);
            return false; // Handles invalid context
        }
        return false;
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
