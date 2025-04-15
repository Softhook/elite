// ****** Galaxy.js ******

class Galaxy {
    // ... (constructor remains the same) ...

    initGalaxySystems() {
        console.log(">>> Galaxy.initGalaxySystems() called for procedural generation.");
        this.systems = []; // Ensure clear array

        // --- Generation Parameters ---
        // ... (parameters remain the same) ...
        const NUM_SYSTEMS = 16;
        const MIN_SEPARATION = max(width, height) * 0.15;
        const PLACEMENT_BORDER = 50;
        const MAX_PLACEMENT_ATTEMPTS = 150;
        const NEAREST_NEIGHBORS_TO_CONNECT = 3;

        // --- Name Generation Components ---
        // ... (name lists remain the same) ...
        const namePrefixes = ["Ache", "Ali", "An", "Bei", "Beta", "Ceo", "Ceti", "Cor", "Cygn", "Delta", "Diso", "Ep", "Era", "Eta", "Exo", "Glie", "Hep", "Hip", "Kap", "Kru", "Lave", "Mu", "Neu", "Novi", "Omi", "Pro", "Rho", "Ross", "Sol", "Tau", "Uma", "Uri", "Xi", "Zaon", "Zeta"];
        const nameRoots = ["mar", "ath", "dan", "dis", "gon", "lia", "nar", "nus", "on", "or", "phi", "qua", "ri", "sus", "tei", "tis", "tor", "us", "ve", "xe", "za"];
        const nameSuffixes = ["", "a", "i", "o", "us", "is", " Prime", " Minor", " Major", " Gateway", " Reach", " Verge", " Drift", " Abyss", " Point", " Outpost", " Landing", " VII", " IX", " IV"];
        const singleNames = ["Bastion", "Terminus", "Horizon", "Elysium", "Crucible", "Aegis", "Threshold", "Meridian", "Solitude", "Valhalla", "Nexus", "Sanctuary"];
        const generatedNames = new Set();
        const economyTypes = ["Industrial", "Agricultural", "Tech", "Extraction", "Refinery", "High Tech", "Tourism", "Service"];
        const securityLevels = ["Anarchy", "Low", "Low", "Medium", "Medium", "Medium", "High", "High"];


        console.log(`   Attempting to place ${NUM_SYSTEMS} systems...`);
        for (let i = 0; i < NUM_SYSTEMS; i++) {
            // *** CORRECTED NAME GENERATION SCOPE ***
            let systemName = "Unnamed System"; // Initialize systemName for this iteration
            let systemX = -1, systemY = -1;
            let validPosition = false;
            let placementAttempts = 0;

            // 1. Generate Unique Name
            let nameAttempts = 0;
            while (nameAttempts < 50) {
                nameAttempts++; // Increment attempts
                let potentialName = ""; // Declare potentialName *inside* the loop
                if (random() < 0.15 && singleNames.length > 0) {
                    potentialName = random(singleNames);
                } else {
                    potentialName = random(namePrefixes) + random(nameRoots) + random(nameSuffixes);
                }
                potentialName = potentialName.replace(/\s+/g, ' ').trim();

                // Check if the generated name is unique
                if (!generatedNames.has(potentialName)) {
                    systemName = potentialName; // Assign to the outer scope variable
                    generatedNames.add(systemName); // Add the unique name to the set
                    // console.log(`      Generated unique name: ${systemName}`); // Optional log
                    break; // Exit the while loop, name is found
                }
                // If not unique, the while loop continues
            } // End name attempt loop

            // Fallback if unique name wasn't found after attempts
            if (systemName === "Unnamed System") {
                 systemName = `System ${i + 1}`;
                 generatedNames.add(systemName); // Add fallback name to set
                 console.warn(`   -> Using fallback name: ${systemName}`);
            }
            // *** END NAME GENERATION CORRECTION ***


            // 2. Find Valid Position (logic remains the same)
            placementAttempts = 0;
            while (!validPosition && placementAttempts < MAX_PLACEMENT_ATTEMPTS) {
                placementAttempts++;
                let tryX = random(PLACEMENT_BORDER, width - PLACEMENT_BORDER);
                let tryY = random(PLACEMENT_BORDER, height - PLACEMENT_BORDER);
                let tooClose = false;
                for (let j = 0; j < this.systems.length; j++) {
                    if (this.systems[j]?.galaxyPos) {
                        let d = dist(tryX, tryY, this.systems[j].galaxyPos.x, this.systems[j].galaxyPos.y);
                        if (d < MIN_SEPARATION) { tooClose = true; break; }
                    }
                }
                if (!tooClose) { validPosition = true; systemX = tryX; systemY = tryY; }
            }
            if (!validPosition) {
                console.warn(`!!! Galaxy Gen: Could not find valid position for system ${i} (${systemName}). Placing approx.`);
                systemX = systemX === -1 ? random(PLACEMENT_BORDER, width - PLACEMENT_BORDER) : systemX;
                systemY = systemY === -1 ? random(PLACEMENT_BORDER, height - PLACEMENT_BORDER) : systemY;
            }

            // 3. Assign Economy/Security/Tech (logic remains the same)
            const economy = random(economyTypes);
            const security = random(securityLevels);
            const techLevel = floor(random(2, 9));

            // 4. Create StarSystem Object (logic remains the same)
            try {
                let newSystem = new StarSystem(systemName, economy, systemX, systemY, i, techLevel, security);
                if (newSystem) { this.systems.push(newSystem); }
                else { console.error(`!!! FAILED to create StarSystem object for index ${i} (${systemName})`); }
            } catch (e) { console.error(`!!! ERROR creating StarSystem ${i} (${systemName}):`, e); }

        } // End main generation loop

        console.log(`   Galaxy.initGalaxySystems: Finished generating system definitions. Actual count: ${this.systems.length}.`);
        if(this.systems.length !== NUM_SYSTEMS) { console.warn(`!!! Expected ${NUM_SYSTEMS} systems, but only created ${this.systems.length}.`); }

        // --- Generate connections ---
        if (this.systems.length >= 2) { this.generateConnections(NEAREST_NEIGHBORS_TO_CONNECT); }
        else { console.log("   Skipping connection generation (less than 2 systems created)."); }

        console.log("System connections after generation:");
        this.systems.forEach((sys, idx) => {
            console.log(`${idx} (${sys.name}): [${sys.connectedSystemIndices.join(', ')}]`);
        });

        // --- Initialize Static Elements ---
        console.log("   Galaxy.initGalaxySystems: Initializing static elements for each system...");
        this.systems.forEach((system, index) => { /* ... same init logic ... */
             if (system && system.initStaticElements) {
                 try { system.initStaticElements(); }
                 catch (e) { console.error(`Error during initStaticElements for system ${index} (${system?.name || 'N/A'}):`, e); }
             } else { console.warn(`Skipping initStaticElements for invalid system object at index ${index}.`); }
         });
        console.log("   Galaxy.initGalaxySystems: Finished initializing static elements.");

        // --- Final Setup ---
        // ... (same final setup logic) ...
        this.currentSystemIndex = 0;
        if (this.systems.length > 0 && this.systems[this.currentSystemIndex]) {
             this.systems[this.currentSystemIndex].visited = true;
             console.log(`   Galaxy.initGalaxySystems: Starting system set to ${this.systems[this.currentSystemIndex].name} (Index ${this.currentSystemIndex})`);
        } else { console.error("   Galaxy.initGalaxySystems: No valid starting system found after generation!"); }


        console.log("<<< Galaxy.initGalaxySystems() finished procedural generation.");
    }

    /**
     * Generates connections between systems based on proximity (k-nearest neighbors).
     * Establishes mutual connections.
     * @param {number} k - The number of nearest neighbors to connect to.
     */
    generateConnections(k = 3) {
        console.log(`   Generating galaxy connections (k=${k})...`);
        if (!this.systems || this.systems.length < 2) {
            console.log("   Skipping connection generation (not enough systems).");
            return;
        }

        for (let i = 0; i < this.systems.length; i++) {
            const systemA = this.systems[i];
            if (!Array.isArray(systemA.connectedSystemIndices)) {
                console.warn("Forcing connectedSystemIndices to [] for", systemA.name);
                systemA.connectedSystemIndices = [];
            }
            // Ensure system A and its position/connections array are valid
            if (!systemA?.galaxyPos || !Array.isArray(systemA.connectedSystemIndices)) {
                console.warn(`   Skipping connections for invalid system or connections array at index ${i}`);
                // **Ensure array exists even if object was problematic earlier**
                if (systemA && !Array.isArray(systemA.connectedSystemIndices)) {
                    systemA.connectedSystemIndices = []; // Attempt recovery
                    console.log(`   -> Recovered connections array for system ${i}`);
                }
                continue;
            }

            let distances = [];
            for (let j = 0; j < this.systems.length; j++) {
                if (i === j) continue;
                const systemB = this.systems[j];
                // Ensure system B and its position are valid
                if (!systemB?.galaxyPos) {
                    console.warn(`   Skipping distance calculation to invalid system at index ${j}`);
                    continue;
                }
                let d = dist(systemA.galaxyPos.x, systemA.galaxyPos.y, systemB.galaxyPos.x, systemB.galaxyPos.y);
                distances.push({ index: j, distance: d });
            }

            distances.sort((a, b) => a.distance - b.distance);
            let neighborsToConnect = distances.slice(0, k);

            neighborsToConnect.forEach(neighbor => {
                const neighborIndex = neighbor.index;
                const systemB = this.systems[neighborIndex];

                // More robust check before attempting to push
                if (systemB && Array.isArray(systemB.connectedSystemIndices)) {
                    // Add mutual connection if it doesn't already exist
                    if (!systemA.connectedSystemIndices.includes(neighborIndex)) {
                        systemA.connectedSystemIndices.push(neighborIndex);
                    }
                    if (!systemB.connectedSystemIndices.includes(i)) {
                        systemB.connectedSystemIndices.push(i);
                    }
                } else {
                    console.warn(`   Could not add connection between ${i} (${systemA.name}) and ${neighborIndex} (${systemB?.name || 'Invalid'}) due to invalid system B or its connection array.`);
                }
            });
        }
         console.log("   Finished generating galaxy connections.");
         // Optional: Log connections for debugging
         // this.systems.forEach((sys, idx) => { console.log(`   System ${idx} (${sys?.name}) connections: [${sys?.connectedSystemIndices?.join(',')}]`); });
    } // --- End generateConnections ---


    /**
     * Returns the StarSystem object the player is currently in.
     * @returns {StarSystem|null} The current StarSystem object or null.
     */
    getCurrentSystem() {
        // Check index bounds first
        if (this.currentSystemIndex < 0 || this.currentSystemIndex >= this.systems.length) {
            console.error(`getCurrentSystem: currentSystemIndex (${this.currentSystemIndex}) is out of bounds for systems array (length ${this.systems.length}).`);
            return null;
        }
        const system = this.systems[this.currentSystemIndex];
        // Check if the system object itself is valid
        if (!system) {
             console.error(`getCurrentSystem: System object at index ${this.currentSystemIndex} is null or undefined.`);
             return null;
        }
        return system;
    }

    /** Handles the jump process to a new star system. */
    jumpToSystem(targetIndex) {
        const reachable = this.getReachableSystems();
        if (!reachable.includes(targetIndex)) {
             console.warn(`Attempted jump to unconnected system index: ${targetIndex}. Allowed: [${reachable.join(', ')}]`);
             return;
        }

        if (targetIndex >= 0 && targetIndex < this.systems.length && targetIndex !== this.currentSystemIndex) {
            const oldSystemName = this.systems[this.currentSystemIndex]?.name || "Unknown";
            const newSystemName = this.systems[targetIndex]?.name || "Unknown";
            console.log(`Jumping from ${oldSystemName} to ${newSystemName} (Index: ${targetIndex})`);

            this.currentSystemIndex = targetIndex;
            const newSystem = this.getCurrentSystem(); // Use the safer getter

            if (player && newSystem) { // Check if newSystem is valid
                const MIN_ARRIVAL_DISTANCE = 1000;
                const MAX_ARRIVAL_DISTANCE = 2500;
                let arrivalAngle = random(TWO_PI);
                let arrivalDist = random(MIN_ARRIVAL_DISTANCE, MAX_ARRIVAL_DISTANCE);
                let arrivalPosition = p5.Vector.fromAngle(arrivalAngle).mult(arrivalDist);
                player.pos.set(arrivalPosition.x, arrivalPosition.y);
                player.vel.set(0, 0);
                console.log(`Player arrived in ${newSystemName} at angle ${degrees(arrivalAngle).toFixed(1)} deg, dist ${arrivalDist.toFixed(0)}, final pos (${player.pos.x.toFixed(0)}, ${player.pos.y.toFixed(0)})`);
                player.currentSystem = newSystem;
                newSystem.enterSystem(player); // Should be safe if newSystem is valid
            } else { console.error(`Error during jump completion: Player (${!!player}) or New System (${!!newSystem}) object invalid!`); }
        } else { console.error(`Invalid jump target index: ${targetIndex} or already in system.`); }
    } // --- End jumpToSystem ---


   /**
     * Calculates the minimum number of jumps between two systems using BFS.
     * @param {number} startIndex - The index of the starting system.
     * @param {number} endIndex - The index of the destination system.
     * @returns {number} The minimum number of jumps, or Infinity if unreachable.
     */
    getJumpDistance(startIndex, endIndex) {
        // Basic validation
        if (startIndex < 0 || startIndex >= this.systems.length ||
            endIndex < 0 || endIndex >= this.systems.length) {
            console.warn(`getJumpDistance: Invalid start (${startIndex}) or end (${endIndex}) index.`);
            return Infinity;
        }
        if (startIndex === endIndex) {
            return 0; // No jumps needed for same system
        }
        if (!this.systems[startIndex] || !this.systems[endIndex]) {
            console.warn(`getJumpDistance: Invalid system object at start (${startIndex}) or end (${endIndex}).`);
            return Infinity; // Cannot calculate if systems don't exist
        }

        let queue = [];       // Queue stores arrays: [systemIndex, distance]
        let visited = new Set(); // Keep track of visited system indices

        // Start BFS from the startIndex
        queue.push([startIndex, 0]);
        visited.add(startIndex);

        while (queue.length > 0) {
            let [currentIndex, currentDistance] = queue.shift(); // Dequeue the next system

            // Get neighbors (connected systems)
            const currentSystem = this.systems[currentIndex];
            if (!currentSystem || !Array.isArray(currentSystem.connectedSystemIndices)) {
                console.warn(`getJumpDistance: Skipping invalid system or connections at index ${currentIndex} during BFS.`);
                continue; // Skip this node if invalid
            }
            let neighbors = currentSystem.connectedSystemIndices;

            for (let neighborIndex of neighbors) {
                // Validate neighbor index
                 if (neighborIndex < 0 || neighborIndex >= this.systems.length || !this.systems[neighborIndex]) {
                     // console.warn(`getJumpDistance: Skipping invalid neighbor index ${neighborIndex} from system ${currentIndex}.`);
                     continue;
                 }

                // Check if we reached the destination
                if (neighborIndex === endIndex) {
                    return currentDistance + 1; // Found the shortest path
                }

                // If neighbor hasn't been visited, add it to the queue
                if (!visited.has(neighborIndex)) {
                    visited.add(neighborIndex);
                    queue.push([neighborIndex, currentDistance + 1]);
                }
            }
        }

        // If the queue becomes empty and we haven't found the end index, it's unreachable
        console.warn(`getJumpDistance: Destination (${endIndex}) unreachable from start (${startIndex}).`);
        return Infinity;
    } // --- End getJumpDistance ---


    /** Retrieves data formatted for drawing the Galaxy Map UI. */
    getSystemDataForMap() {
        if (!this.systems) return [];
        return this.systems.map((sys, index) => {
            if (!sys) return null; // Skip if system object is invalid
            const gx = sys.galaxyPos?.x ?? width * 0.5;
            const gy = sys.galaxyPos?.y ?? height * 0.5;
            return {
                name: sys.name || "Unnamed", x: gx, y: gy,
                type: sys.economyType || "Unknown",
                visited: sys.visited || false, index: index
            };
        }).filter(Boolean); // Filter out nulls
    }

    /**
     * Determines reachable systems based on the pre-calculated connections.
     */
    getReachableSystems() {
        const currentSystem = this.getCurrentSystem(); // Use the safer getter

        // Check if the current system and its connections property are valid
        if (!currentSystem || !Array.isArray(currentSystem.connectedSystemIndices)) {
            // Use a more specific log message based on what failed
            if (!currentSystem) {
                 console.warn(`getReachableSystems: Current system object is invalid (Index: ${this.currentSystemIndex}). Cannot determine reachable systems.`);
            } else {
                 console.warn(`getReachableSystems: System ${this.currentSystemIndex} (${currentSystem.name}) connections property is not a valid array. Type: ${typeof currentSystem.connectedSystemIndices}`);
                 // Attempt recovery if possible
                 if (typeof currentSystem.connectedSystemIndices === 'undefined') {
                    console.log(" -> Attempting to initialize connections array.");
                    currentSystem.connectedSystemIndices = [];
                 }
            }
            return []; // Return empty array if invalid
        }

        // Return the list of connected indices if valid
        // console.log(`Reachable from ${this.currentSystemIndex}: [${currentSystem.connectedSystemIndices.join(',')}]`); // Debug log
        return currentSystem.connectedSystemIndices;
    } // --- End getReachableSystems ---


    /** Gathers save data for all systems and current index. */
    getSaveData() {
        return {
            systems: this.systems.map(sys => (typeof sys.toJSON === 'function' ? sys.toJSON() : null)),
            currentSystemIndex: this.currentSystemIndex
        };
    }

    /** Loads saved data into systems and sets current index. Regenerates connections. */
    loadSaveData(data) {
        console.log("Galaxy.loadSaveData called with data:", data);

        if (!data || !Array.isArray(data.systems)) {
            console.warn("Galaxy.loadSaveData: No data or systems array missing.");
            return;
        }

        // Debug: Check if StarSystem is defined and has fromJSON
        console.log("StarSystem in loadSaveData:", typeof StarSystem, StarSystem);
        if (!StarSystem || typeof StarSystem.fromJSON !== 'function') {
            console.error("StarSystem.fromJSON is not a function!", StarSystem);
        }

        // Debug: Log the first system data to be loaded
        if (data.systems.length > 0) {
            console.log("First system data to load:", data.systems[0]);
        }

        this.systems = data.systems.map((sysData, idx) => {
            const sys = StarSystem.fromJSON(sysData);
            if (!sys) {
                console.warn(`StarSystem.fromJSON returned null/undefined for system at index ${idx}:`, sysData);
            }
            return sys;
        }).filter(Boolean);

        this.systems.forEach((sys, idx) => {
            if (sys && typeof sys.initStaticElements === 'function') {
                try {
                    sys.initStaticElements();
                } catch (e) {
                    console.error(`Error during initStaticElements for loaded system ${idx} (${sys?.name || 'N/A'}):`, e);
                }
            }
        });

        this.currentSystemIndex = data.currentSystemIndex ?? 0;

        // Debug: Log the loaded systems
        console.log("Loaded systems after fromJSON:", this.systems);

        this.systems.forEach((sys, idx) => {
            sys.connectedSystems = (sys.connectedSystemIndices || []).map(i => this.systems[i]);
            // Debug: Log each system's connections
            console.log(`System ${idx} (${sys.name}) connections:`, sys.connectedSystemIndices);
        });
    }

} // End Galaxy Class