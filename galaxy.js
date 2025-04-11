// ****** Galaxy.js ******

class Galaxy {
    constructor() {
        this.systems = []; // Array holding StarSystem objects
        this.currentSystemIndex = 0; // Index of the system the player is currently in
    }

    /**
     * Initializes the galaxy by creating StarSystem objects, passing each its index
     * which the StarSystem constructor uses for deterministic, seeded generation.
     */
    init() {
        console.log("Initializing Galaxy...");
        this.systems = []; // Ensure systems array is clear before init

        // Define system data including map positions used on the Galaxy Map screen
        const systemDefs = [
            { name: "Solara", type: "Industrial", x: width * 0.2, y: height * 0.5 },
            { name: "AgriPrime", type: "Agricultural", x: width * 0.5, y: height * 0.3 },
            { name: "Cygnus Tech", type: "Tech", x: width * 0.8, y: height * 0.6 },
            { name: "Border Outpost", type: "Industrial", x: width * 0.5, y: height * 0.8 }
            // Add more system definitions here
        ];

        // Create StarSystem instances, crucially passing the 'index' for seeding
        systemDefs.forEach((def, index) => {
            console.log(`Creating StarSystem: ${def.name}, Index: ${index}`);
            // The StarSystem constructor now uses 'index' to seed its random generation
            this.systems.push(new StarSystem(def.name, def.type, def.x, def.y, index));
        });


        // Mark starting system as visited and run its entry logic AFTER all systems are created
        if (this.systems.length > 0 && this.systems[0]) {
            // Pass player reference if available (should be, if called in setup after player creation)
             if (player) {
                this.systems[0].enterSystem(player); // Call enterSystem for index 0
             } else {
                 // This case should ideally not happen if init order is correct
                 console.warn("Galaxy.init: Player object not available for initial system entry logic.");
                 this.systems[0].visited = true; // Still mark as visited as fallback
             }
        } else {
             console.error("Galaxy.init: No valid starting system found after creation!");
        }
    }

    /**
     * Returns the StarSystem object the player is currently in.
     * @returns {StarSystem|null} The current StarSystem object or null if invalid.
     */
    getCurrentSystem() {
        if (this.currentSystemIndex >= 0 && this.currentSystemIndex < this.systems.length) {
            return this.systems[this.currentSystemIndex];
        }
        console.error(`getCurrentSystem: Invalid system index ${this.currentSystemIndex}`);
        return null;
    }

    /**
     * Handles the jump process to a new star system.
     * Changes current index, resets player position randomly, calls enterSystem for the new system.
     * @param {number} targetIndex - The index of the target system.
     */
    jumpToSystem(targetIndex) {
        // Validate target index
        if (targetIndex >= 0 && targetIndex < this.systems.length && targetIndex !== this.currentSystemIndex) {
            const oldSystemName = this.systems[this.currentSystemIndex]?.name || "Unknown";
            const newSystemName = this.systems[targetIndex]?.name || "Unknown";
            console.log(`Jumping from ${oldSystemName} to ${newSystemName}`);

            this.currentSystemIndex = targetIndex; // Update the current index
            const newSystem = this.getCurrentSystem(); // Get the new system object

            // Ensure player and new system are valid
            if (player && newSystem) {
                // Set Player to Random World Position upon Arrival (using non-seeded random)
                let arrivalAngle = random(TWO_PI);
                let arrivalDist = random(500, 1500); // Arrive within this radius from center
                player.pos.x = cos(arrivalAngle) * arrivalDist;
                player.pos.y = sin(arrivalAngle) * arrivalDist;
                player.vel = createVector(0, 0); // Reset velocity
                console.log(`Player arrived at world position: (${player.pos.x.toFixed(0)}, ${player.pos.y.toFixed(0)})`);

                // Update player's system reference and run entry logic for the new system
                player.currentSystem = newSystem;
                newSystem.enterSystem(player); // Pass player ref

            } else {
                console.error(`Error during jump: Player (${!!player}) or new system (${!!newSystem}) invalid!`);
            }
        } else {
            console.error(`Invalid jump index requested: ${targetIndex} (Current: ${this.currentSystemIndex})`);
        }
    } // --- End jumpToSystem ---


    /**
     * Retrieves data formatted for drawing the Galaxy Map UI.
     * @returns {Array} Array of objects describing each system node for the map.
     */
    getSystemDataForMap() {
        if (!this.systems) return [];
        return this.systems.map((sys, index) => {
            if (!sys) return null;
            return {
                name: sys.name || "Unnamed",
                x: sys.galaxyPos?.x || width * 0.5, // Map position X
                y: sys.galaxyPos?.y || height * 0.5, // Map position Y
                type: sys.economyType || "Unknown",
                visited: sys.visited || false,
                index: index
            };
        }).filter(Boolean); // Remove null entries
    }

    /**
     * Determines reachable systems from the current one (simple adjacency for MVP).
     * @returns {Array<number>} Array of indices of reachable systems.
     */
    getReachableSystems() {
        const reachable = [];
        const numSystems = this.systems.length;
        if (numSystems <= 1) return [];
        const prevIndex = (this.currentSystemIndex - 1 + numSystems) % numSystems;
        const nextIndex = (this.currentSystemIndex + 1) % numSystems;
        if (prevIndex !== this.currentSystemIndex) reachable.push(prevIndex);
        if (nextIndex !== this.currentSystemIndex) reachable.push(nextIndex);
        return reachable;
    }

    /**
     * Gathers save data for all systems (minimal: 'visited' status).
     * @returns {Array} Array of save data objects.
     */
    getSaveData() {
        if (!this.systems) return [];
        return this.systems.map(sys => sys?.getSaveData() || { visited: false }); // Safe access
    }

    /**
     * Loads saved data into the corresponding StarSystem objects.
     * @param {Array} systemsData - Array of save data objects.
     */
    loadSaveData(systemsData) {
        if (systemsData && Array.isArray(systemsData) && systemsData.length === this.systems.length) {
             for (let i = 0; i < this.systems.length; i++) {
                 if (this.systems[i] && systemsData[i]) {
                     this.systems[i].loadSaveData(systemsData[i]);
                 }
             }
             console.log("Loaded system visited data.");
         } else {
            console.log("No valid system visited data found or length mismatch, using defaults.");
            if (this.systems.length > 0 && this.currentSystemIndex < this.systems.length && this.systems[this.currentSystemIndex]) {
                 this.systems[this.currentSystemIndex].visited = true;
                 console.log(`Defaulted system ${this.currentSystemIndex} to visited.`);
            }
         }
     }
} // End Galaxy Class