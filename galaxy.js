// ****** Galaxy.js ******

class Galaxy {
    /**
     * Constructor for the Galaxy class. Initializes empty systems array.
     * System population moved to initGalaxySystems().
     */
    constructor() {
        console.log(">>> Galaxy Constructor called.");
        this.systems = []; // Initialize as empty array
        this.currentSystemIndex = 0; // Default starting index
        console.log("<<< Galaxy Constructor finished (Systems array empty).");
    }

    /**
     * Initializes the galaxy: Creates StarSystem objects, then calls their
     * static element initialization. Should be called from sketch.js setup().
     */
    initGalaxySystems() {
        console.log(">>> Galaxy.initGalaxySystems() called.");
        this.systems = []; // Ensure clear array

        // Define data for the star systems in the galaxy
        const systemDefs = [
            { name: "Solara", type: "Industrial", x: width * 0.2, y: height * 0.5 },
            { name: "AgriPrime", type: "Agricultural", x: width * 0.5, y: height * 0.3 },
            { name: "Cygnus Tech", type: "Tech", x: width * 0.8, y: height * 0.6 },
            { name: "Border Outpost", type: "Industrial", x: width * 0.5, y: height * 0.8 }
        ];

        // Step 1: Create StarSystem instances (minimal constructor)
        systemDefs.forEach((def, index) => {
            console.log(`   Galaxy.initGalaxySystems: Creating StarSystem Shell: ${def.name}, Index: ${index}`);
            try {
                let newSystem = new StarSystem(def.name, def.type, def.x, def.y, index);
                this.systems.push(newSystem); // Add shell to array
            } catch (e) {
                 console.error(`      !!! ERROR creating StarSystem SHELL ${index} (${def.name}):`, e);
            }
        });
        console.log(`   Galaxy.initGalaxySystems: Finished creating system shells. Count: ${this.systems.length}`);

        // Step 2: Initialize static elements for each created system (now p5 functions are ready)
        console.log("   Galaxy.initGalaxySystems: Initializing static elements for each system...");
        this.systems.forEach((system, index) => {
             // Check if system object is valid and has the init method
             if (system && typeof system.initStaticElements === 'function') {
                 console.log(`      Calling initStaticElements for system ${index} (${system.name})...`);
                 try {
                     system.initStaticElements(); // Call the new method to generate planets, stars etc.
                 } catch (e) {
                     console.error(`      !!! ERROR during initStaticElements for system ${index} (${system.name}):`, e);
                 }
             } else {
                  console.warn(`      Skipping initStaticElements for invalid system or missing method at index ${index}.`);
             }
        });
        console.log("   Galaxy.initGalaxySystems: Finished initializing static elements.");

        // Mark starting system visited (do this AFTER initStaticElements if needed)
        if (this.systems.length > 0 && this.systems[0]) {
             this.systems[0].visited = true;
             console.log(`   Galaxy.initGalaxySystems: Marked system 0 (${this.systems[0].name}) as visited.`);
        } else {
             console.error("   Galaxy.initGalaxySystems: No valid starting system [0] found after initialization!");
        }
         console.log("<<< Galaxy.initGalaxySystems() finished.");
    }

    /**
     * Returns the StarSystem object the player is currently in. Includes logging.
     * @returns {StarSystem|null} The current StarSystem object or null.
     */
    getCurrentSystem() {
        // console.log(`>>> Galaxy.getCurrentSystem() called. Requesting Index: ${this.currentSystemIndex}, Total Systems: ${this.systems.length}`); // Verbose
        let indexIsValid = (this.currentSystemIndex >= 0 && this.currentSystemIndex < this.systems.length);
        let systemExistsAtIndex = indexIsValid && this.systems[this.currentSystemIndex];
        if (indexIsValid && systemExistsAtIndex) {
            // console.log(`   getCurrentSystem: Success! Returning valid system: ${this.systems[this.currentSystemIndex].name}`); // Verbose
            return this.systems[this.currentSystemIndex];
        } else {
            console.error(`   getCurrentSystem: Failed! IndexValid=${indexIsValid}, SystemExists=${!!systemExistsAtIndex}. Index=${this.currentSystemIndex}, ArrayLength=${this.systems.length}`);
            return null;
        }
    }

    /** Handles the jump process to a new star system. */
    jumpToSystem(targetIndex) {
        if (targetIndex >= 0 && targetIndex < this.systems.length && targetIndex !== this.currentSystemIndex) {
            const oldSystemName = this.systems[this.currentSystemIndex]?.name || "Unknown"; const newSystemName = this.systems[targetIndex]?.name || "Unknown";
            console.log(`Jumping from ${oldSystemName} to ${newSystemName}`);
            this.currentSystemIndex = targetIndex; const newSystem = this.getCurrentSystem();
            if (player && newSystem) {
                let arrivalAngle = random(TWO_PI); let arrivalDist = random(500, 1500);
                player.pos.x = cos(arrivalAngle) * arrivalDist; player.pos.y = sin(arrivalAngle) * arrivalDist;
                player.vel.set(0, 0); console.log(`Player arrived at world pos: (${player.pos.x.toFixed(0)}, ${player.pos.y.toFixed(0)})`);
                player.currentSystem = newSystem; newSystem.enterSystem(player);
            } else { console.error(`Error during jump completion: Player/NewSystem invalid!`); }
        } else { console.error(`Invalid jump index requested: ${targetIndex}`); }
    }

    /** Retrieves data formatted for drawing the Galaxy Map UI. */
    getSystemDataForMap() {
        if (!this.systems) return [];
        return this.systems.map((sys, index) => { if (!sys) return null; return { name: sys.name || "Unnamed", x: sys.galaxyPos?.x ?? width * 0.5, y: sys.galaxyPos?.y ?? height * 0.5, type: sys.economyType || "Unknown", visited: sys.visited || false, index: index }; }).filter(Boolean);
    }

    /** Determines reachable systems from the current one (MVP: adjacency). */
    getReachableSystems() {
        const reachable = []; const numSystems = this.systems.length; if (numSystems <= 1) return []; const prevIndex = (this.currentSystemIndex - 1 + numSystems) % numSystems; const nextIndex = (this.currentSystemIndex + 1) % numSystems; if (prevIndex !== this.currentSystemIndex) reachable.push(prevIndex); if (nextIndex !== this.currentSystemIndex) reachable.push(nextIndex); return reachable;
    }

    /** Gathers save data for all systems (minimal: 'visited' status). */
    getSaveData() {
        if (!this.systems) return []; return this.systems.map(sys => sys?.getSaveData() || { visited: false });
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