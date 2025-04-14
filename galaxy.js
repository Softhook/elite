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
            // Add more systems here if desired
        ];

        // Step 1: Create StarSystem instances (minimal constructor)
        systemDefs.forEach((def, index) => {
            console.log(`   Galaxy.initGalaxySystems: Creating StarSystem Shell: ${def.name}, Index: ${index}`);
            try {
                // Pass tech/security if defined, otherwise defaults in StarSystem constructor handle it
                let newSystem = new StarSystem(def.name, def.type, def.x, def.y, index, def.tech, def.security);
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
                     system.initStaticElements(); // Call the method to generate planets, stars etc.
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
            const oldSystemName = this.systems[this.currentSystemIndex]?.name || "Unknown";
            const newSystemName = this.systems[targetIndex]?.name || "Unknown";
            console.log(`Jumping from ${oldSystemName} to ${newSystemName} (Index: ${targetIndex})`);

            this.currentSystemIndex = targetIndex;
            const newSystem = this.getCurrentSystem(); // Get the system object for the new index

            if (player && newSystem) {
                // --- Define Arrival Parameters ---
                // Increase range to make variation more noticeable
                const MIN_ARRIVAL_DISTANCE = 5000; // Min distance from system center (0,0)
                const MAX_ARRIVAL_DISTANCE = 10000; // Max distance from system center (0,0)

                // --- Calculate Random Arrival Position ---
                // 1. Get a random angle (0 to TWO_PI radians)
                let arrivalAngle = random(TWO_PI); // random() returns a float between 0 and TWO_PI

                // 2. Get a random distance within the defined range
                let arrivalDist = random(MIN_ARRIVAL_DISTANCE, MAX_ARRIVAL_DISTANCE);

                // 3. Calculate the position using the angle and distance from the center (0,0)
                // Using p5.Vector.fromAngle is slightly clearer
                let arrivalPosition = p5.Vector.fromAngle(arrivalAngle); // Creates a unit vector in the random direction
                arrivalPosition.mult(arrivalDist); // Scales the vector to the random distance

                // 4. Set the player's position using the vector's components
                player.pos.set(arrivalPosition.x, arrivalPosition.y); // Use .set() to update the vector

                // --- Reset Player Velocity ---
                player.vel.set(0, 0); // Stop the player upon arrival

                // --- Log the details for verification ---
                console.log(`Player arrived in ${newSystemName} at angle ${degrees(arrivalAngle).toFixed(1)} deg, dist ${arrivalDist.toFixed(0)}, final pos (${player.pos.x.toFixed(0)}, ${player.pos.y.toFixed(0)})`);

                // --- Link Player and System ---
                player.currentSystem = newSystem; // Set player's current system reference

                // --- Trigger System Entry Logic ---
                // This resets enemies/asteroids etc. for the newly entered system
                newSystem.enterSystem(player);

            } else {
                // Added more detailed error logging
                console.error(`Error during jump completion: Player object or New System object invalid! Player: ${!!player}, NewSystem: ${!!newSystem}`);
            }
        } else {
            // Added more detailed error logging
            console.error(`Invalid jump index requested: ${targetIndex}. Current: ${this.currentSystemIndex}, Total Systems: ${this.systems.length}`);
        }
    } // --- End jumpToSystem ---


    /** Retrieves data formatted for drawing the Galaxy Map UI. */
    getSystemDataForMap() {
        if (!this.systems) return [];
        // Ensure galaxyPos exists and has x/y before accessing
        return this.systems.map((sys, index) => {
            if (!sys) return null;
            const gx = sys.galaxyPos?.x ?? width * 0.5; // Use optional chaining and default
            const gy = sys.galaxyPos?.y ?? height * 0.5; // Use optional chaining and default
            return {
                name: sys.name || "Unnamed",
                x: gx,
                y: gy,
                type: sys.economyType || "Unknown",
                visited: sys.visited || false,
                index: index
            };
        }).filter(Boolean); // Filter out any null entries if a system was invalid
    }

    /** Determines reachable systems from the current one (MVP: adjacency). */
    getReachableSystems() {
        const reachable = [];
        const numSystems = this.systems.length;
        if (numSystems <= 1) return []; // Can't jump if only one system

        // Calculate previous and next indices correctly with wrap-around
        const prevIndex = (this.currentSystemIndex - 1 + numSystems) % numSystems;
        const nextIndex = (this.currentSystemIndex + 1) % numSystems;

        // Add them if they are different from the current index (handles the 2-system case)
        if (prevIndex !== this.currentSystemIndex) reachable.push(prevIndex);
        if (nextIndex !== this.currentSystemIndex && nextIndex !== prevIndex) reachable.push(nextIndex); // Avoid adding same index twice if only 2 systems

        // Future expansion: Could check fuel range, distance, etc. here
        return reachable;
    }


    /** Gathers save data for all systems (minimal: 'visited' status). */
    getSaveData() {
        if (!this.systems) return { systems: [], currentSystemIndex: 0 }; // Return default structure if no systems
        return {
             systems: this.systems.map(sys => sys?.getSaveData() || { visited: false }), // Get visited data
             currentSystemIndex: this.currentSystemIndex // Save current location index
         };
    }

    /** Loads saved data into the corresponding StarSystem objects and sets current index. */
    loadSaveData(galaxyData) {
         // Load current system index first
         this.currentSystemIndex = galaxyData?.currentSystemIndex ?? 0;
         // Ensure index is valid bounds after loading
         if (this.currentSystemIndex < 0 || this.currentSystemIndex >= this.systems.length) {
              console.warn(`Loaded invalid currentSystemIndex (${galaxyData?.currentSystemIndex}). Resetting to 0.`);
              this.currentSystemIndex = 0;
         }

         // Load visited status for each system
         const systemsSaveData = galaxyData?.systems;
        if (systemsSaveData && Array.isArray(systemsSaveData) && systemsSaveData.length === this.systems.length) {
             console.log("Loading system visited data...");
             for (let i = 0; i < this.systems.length; i++) {
                 if (this.systems[i] && systemsSaveData[i]) {
                     this.systems[i].loadSaveData(systemsSaveData[i]);
                 }
             }
         } else {
            console.log("No valid system visited data found or length mismatch, using defaults.");
            // Ensure the system the player is starting in (after potentially loading index) is marked visited
            if (this.systems.length > 0 && this.systems[this.currentSystemIndex]) {
                 this.systems[this.currentSystemIndex].visited = true;
            }
         }
     } // --- End loadSaveData ---

} // End Galaxy Class