// ****** Galaxy.js ******

class Galaxy {
    /**
     * Constructor for the Galaxy class. Initializes empty systems array.
     * System population moved to initGalaxySystems().
     */
    constructor() {
        console.log(">>> Galaxy Constructor called."); // Log constructor start
        this.systems = []; // Initialize as empty array
        this.currentSystemIndex = 0; // Default starting index
        // DO NOT call init() here anymore
        console.log("<<< Galaxy Constructor finished (Systems array empty)."); // Log constructor end
    }

    /**
     * Initializes the galaxy by creating StarSystem objects using provided definitions.
     * This should be called from sketch.js setup() AFTER p5 is ready.
     */
    initGalaxySystems() {
        console.log(">>> Galaxy.initGalaxySystems() called."); // Log init start
        this.systems = []; // Ensure systems array is clear before population

        // Define data for the star systems in the galaxy
        const systemDefs = [
            { name: "Solara", type: "Industrial", x: width * 0.2, y: height * 0.5 },
            { name: "AgriPrime", type: "Agricultural", x: width * 0.5, y: height * 0.3 },
            { name: "Cygnus Tech", type: "Tech", x: width * 0.8, y: height * 0.6 },
            { name: "Border Outpost", type: "Industrial", x: width * 0.5, y: height * 0.8 }
        ];

        // Create StarSystem instances using the definitions, passing the index for seeding
        systemDefs.forEach((def, index) => {
            console.log(`   Galaxy.initGalaxySystems: Creating StarSystem: ${def.name}, Index: ${index}`);
            try {
                // Create the system - Its constructor handles seeded generation & logs internally
                let newSystem = new StarSystem(def.name, def.type, def.x, def.y, index);
                // If constructor completed without error, push the result
                this.systems.push(newSystem);
                console.log(`      -> StarSystem ${index} (${def.name}) pushed successfully.`);
            } catch (e) {
                 // Log any errors during system creation (e.g., if StarSystem constructor fails)
                 console.error(`      !!! ERROR creating StarSystem ${index} (${def.name}):`, e);
            }
        });

        console.log(`   Galaxy.initGalaxySystems: Finished creating systems loop. Total systems pushed: ${this.systems.length}`); // Log final count

        // Mark the starting system (index 0) as visited initially.
        if (this.systems.length > 0 && this.systems[0]) {
             this.systems[0].visited = true; // Mark as visited
             console.log(`   Galaxy.initGalaxySystems: Marked system 0 (${this.systems[0].name}) as visited.`);
        } else {
             // This indicates a problem with system creation if index 0 doesn't exist
             console.error("   Galaxy.initGalaxySystems: No valid starting system [0] found in array!");
        }
         console.log("<<< Galaxy.initGalaxySystems() finished."); // Log init end
    }

    /**
     * Returns the StarSystem object the player is currently in based on currentSystemIndex.
     * Includes detailed logging for debugging.
     * @returns {StarSystem|null} The current StarSystem object or null if invalid.
     */
    getCurrentSystem() {
        // Log input values for debugging
        console.log(`>>> Galaxy.getCurrentSystem() called. Requesting Index: ${this.currentSystemIndex}, Total Systems in Array: ${this.systems.length}`);

        // Check 1: Is the index within the valid bounds of the array?
        let indexIsValid = (this.currentSystemIndex >= 0 && this.currentSystemIndex < this.systems.length);
        // console.log(`   getCurrentSystem: Is index within bounds? ${indexIsValid}`); // Verbose log

        // Check 2: Does the systems array actually contain an object at that index?
        let systemExistsAtIndex = indexIsValid && this.systems[this.currentSystemIndex];
        // console.log(`   getCurrentSystem: Does system object exist at index ${this.currentSystemIndex}? ${!!systemExistsAtIndex}`); // Verbose log

        // Proceed only if both checks pass
        if (indexIsValid && systemExistsAtIndex) {
            // console.log(`   getCurrentSystem: Success! Returning valid system: ${this.systems[this.currentSystemIndex].name}`); // Verbose log
            return this.systems[this.currentSystemIndex]; // Return the actual system object
        } else {
            // Log detailed failure information
            console.error(`   getCurrentSystem: Failed to get system! Reason(s): IndexValid=${indexIsValid}, SystemExists=${!!systemExistsAtIndex}. Index=${this.currentSystemIndex}, ArrayLength=${this.systems.length}`);
            return null; // Return null indicating failure
        }
    }

    /** Handles the jump process to a new star system. */
    jumpToSystem(targetIndex) {
        if (targetIndex >= 0 && targetIndex < this.systems.length && targetIndex !== this.currentSystemIndex) {
            const oldSystemName = this.systems[this.currentSystemIndex]?.name || "Unknown";
            const newSystemName = this.systems[targetIndex]?.name || "Unknown";
            console.log(`Jumping from ${oldSystemName} to ${newSystemName}`);
            this.currentSystemIndex = targetIndex;
            const newSystem = this.getCurrentSystem(); // Get new system using updated index
            if (player && newSystem) {
                // Set Player to Random World Position upon Arrival
                let arrivalAngle = random(TWO_PI); let arrivalDist = random(500, 1500);
                player.pos.x = cos(arrivalAngle) * arrivalDist; player.pos.y = sin(arrivalAngle) * arrivalDist;
                player.vel.set(0, 0); // Reset velocity
                console.log(`Player arrived at world pos: (${player.pos.x.toFixed(0)}, ${player.pos.y.toFixed(0)})`);
                // Update player ref and call enterSystem
                player.currentSystem = newSystem;
                newSystem.enterSystem(player);
            } else { console.error(`Error during jump completion: Player/NewSystem invalid!`); }
        } else { console.error(`Invalid jump index requested: ${targetIndex}`); }
    } // --- End jumpToSystem ---


    /** Retrieves data formatted for drawing the Galaxy Map UI. */
    getSystemDataForMap() {
        if (!this.systems) return [];
        return this.systems.map((sys, index) => {
            if (!sys) { console.warn(`getSystemDataForMap: Found null system at index ${index}`); return null; }
            return { name: sys.name || "Unnamed", x: sys.galaxyPos?.x ?? width * 0.5, y: sys.galaxyPos?.y ?? height * 0.5, type: sys.economyType || "Unknown", visited: sys.visited || false, index: index };
        }).filter(Boolean);
    }

    /** Determines reachable systems from the current one (MVP: adjacency). */
    getReachableSystems() {
        const reachable = []; const numSystems = this.systems.length; if (numSystems <= 1) return [];
        const prevIndex = (this.currentSystemIndex - 1 + numSystems) % numSystems; const nextIndex = (this.currentSystemIndex + 1) % numSystems;
        if (prevIndex !== this.currentSystemIndex) reachable.push(prevIndex); if (nextIndex !== this.currentSystemIndex) reachable.push(nextIndex);
        return reachable;
    }

    /** Gathers save data for all systems (minimal: 'visited' status). */
    getSaveData() {
        if (!this.systems) return [];
        return this.systems.map(sys => sys?.getSaveData() || { visited: false });
    }

    /** Loads saved data into the corresponding StarSystem objects. */
    loadSaveData(systemsData) {
        if (systemsData && Array.isArray(systemsData) && systemsData.length === this.systems.length) {
             for (let i = 0; i < this.systems.length; i++) { if (this.systems[i] && systemsData[i]) { this.systems[i].loadSaveData(systemsData[i]); } }
             console.log("Loaded system visited data.");
         } else {
            console.log("No valid system visited data found or length mismatch, using defaults.");
            if (this.systems.length > 0 && this.currentSystemIndex < this.systems.length && this.systems[this.currentSystemIndex]) { this.systems[this.currentSystemIndex].visited = true; }
         }
     }
} // End Galaxy Class