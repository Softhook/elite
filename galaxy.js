// ****** Galaxy.js ******

class Galaxy {
    // --- Static Definition for Economy Types and Colors ---
    static ECONOMY_DATA = {
        "Industrial":   { color: [60, 120, 200, 210] }, // Blue
        "Agricultural": { color: [180, 120, 40, 210] }, // Brown/Orange
        "Mining":       { color: [160, 160, 170, 210] }, // Light Grey/Silver
        "Refinery":     { color: [160, 40, 40, 210] },   // Maroon
        "Post Human":    { color: [0, 200, 200, 210] },   // Cyan
        "Tourism":      { color: [200, 80, 200, 210] },  // Purple/Pink
        "Service":      { color: [200, 255, 255, 210] }, // 
        "Military":     { color: [200, 50, 50, 210] },   // Red
        "Offworld":     { color: [100, 180, 100, 210] }, // Light Green (Placeholder)
        "Separatist":   { color: [200, 100, 0, 210] },   // Orange (Placeholder)
        "Imperial":     { color: [218, 165, 32, 210] },  // Gold (Placeholder)
        "Alien":        { color: [100, 50, 150, 210] },  // Dark Purple
        "Default":      { color: [150, 150, 150, 210] }   // Default grey if type unknown
        // Add other properties like typical exports/imports here later if desired
    };
    // --- End Static Definition ---

    constructor() {
        this.systems = []; // Initialize systems as an empty array
        this.currentSystemIndex = 0;
        this.hyperdriveRange = 7; // Default hyperdrive range in light years
        // Add other galaxy-wide properties here (e.g., faction data, global events)
    }

    initGalaxySystems(globalSessionSeed) { // Add globalSessionSeed parameter
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
        const singleNames = ["Bastion", "Terminus", "Horizon", "Lewes", "Amhurst", "Elysium", "Crucible", "Aegis", "Threshold", "Meridian", "Solitude", "Valhalla", "Nexus", "Sanctuary"];
        const generatedNames = new Set();

        // --- Use Economy Data ---
        const economyTypeNames = Object.keys(Galaxy.ECONOMY_DATA).filter(k => k !== 'Default'); // Get type names from the static data, exclude Default
        const securityLevels = ["Anarchy", "Low", "Low", "Medium", "Medium", "Medium", "High", "High"];
        // ---

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

            // 3. Assign Economy/Security/Tech
            const economy = random(economyTypeNames); // Select a random economy NAME
            const security = random(securityLevels);
            const techLevel = floor(random(1, 6));

            // 4. Create StarSystem Object
            try {
                // Pass the economy NAME to the constructor
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
                 try { system.initStaticElements(globalSessionSeed); } // Pass globalSessionSeed
                 catch (e) { console.error(`Error during initStaticElements for system ${index} (${system?.name || 'N/A'}):`, e); }
             } else { console.warn(`Skipping initStaticElements for invalid system object at index ${index}.`); }
         });
        console.log("   Galaxy.initGalaxySystems: Finished initializing static elements.");

        // --- Final Setup ---
        this.currentSystemIndex = 0;
        if (this.systems.length > 0 && this.systems[this.currentSystemIndex]) {
            let startSystem = this.systems[this.currentSystemIndex];
            startSystem.visited = true;
            
            // Use the setter method to ensure consistency
            startSystem.setEconomyType(startSystem.economyType);
            
            console.log(`Galaxy.initGalaxySystems: Starting system set to ${startSystem.name} (Index ${this.currentSystemIndex}) and marked as discovered.`);
        } else {
            console.error("   Galaxy.initGalaxySystems: No valid starting system found after generation!");
        }

        if (this.systems.length > 0) {
            this.systems[0].discover(); // Mark the start system as discovered
        }

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

            // Move this INSIDE the loop - the bidirectional check needs the 'i' variable
            systemA.connectedSystemIndices.forEach(connectedIndex => {
                // Ensure the reverse connection exists
                if (!this.systems[connectedIndex].connectedSystemIndices.includes(i)) {
                    console.warn(`Adding missing reverse connection from ${connectedIndex} to ${i}`);
                    this.systems[connectedIndex].connectedSystemIndices.push(i);
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
        // Check if systems array exists and has been initialized
        if (!this.systems || !Array.isArray(this.systems)) {
            console.warn(`getCurrentSystem: Systems array not initialized yet.`);
            return null;
        }
        
        // Check index bounds
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
        // Get current system and check connections
        const currentSystemIndex = this.currentSystemIndex;
        const reachable = this.getReachableSystems();
        
        // ENFORCE connection check
        if (!reachable.includes(targetIndex)) {
            console.warn(`Attempted jump to unconnected system index: ${targetIndex}. Allowed: [${reachable.join(', ')}]`);
            if (uiManager) uiManager.addMessage("Jump failed: System not in range", [255, 100, 100]);
            return false; // Add explicit return to prevent jump
        }

        if (targetIndex >= 0 && targetIndex < this.systems.length && targetIndex !== this.currentSystemIndex) {
            const oldSystemName = this.systems[this.currentSystemIndex]?.name || "Unknown";
            const newSystemName = this.systems[targetIndex]?.name || "Unknown";
            console.log(`Jumping from ${oldSystemName} to ${newSystemName} (Index: ${targetIndex})`);

            this.currentSystemIndex = targetIndex;
            const newSystem = this.getCurrentSystem(); // Use the safer getter

            if (player && newSystem) { // Check if newSystem is valid
                // --- Clear player's nebula/storm effects from the PREVIOUS system ---
                player.shieldsDisabled = false;
                player.weaponsDisabled = false;
                player.inNebula = false;
                // If there are other specific flags set by storms/nebulas on the player, reset them here too.
                console.log(`Player effects cleared due to system jump. ShieldsDisabled: ${player.shieldsDisabled}, WeaponsDisabled: ${player.weaponsDisabled}, InNebula: ${player.inNebula}`);
                // --- End effect clearing ---

                const MIN_ARRIVAL_DISTANCE = 500;
                const MAX_ARRIVAL_DISTANCE = 1250;
                let arrivalAngle = random(TWO_PI);
                let arrivalDist = random(MIN_ARRIVAL_DISTANCE, MAX_ARRIVAL_DISTANCE);
                let arrivalPosition = p5.Vector.fromAngle(arrivalAngle).mult(arrivalDist);
                player.pos.set(arrivalPosition.x, arrivalPosition.y);
                player.vel.set(0, 0);
                console.log(`Player arrived in ${newSystemName} at angle ${(arrivalAngle * 180 / Math.PI).toFixed(1)} deg, dist ${arrivalDist.toFixed(0)}, final pos (${player.pos.x.toFixed(0)}, ${player.pos.y.toFixed(0)})`);
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

        // When loading a saved game, we do NOT want to use a new globalSessionSeed.
        // The original seed (this.systemIndex) is sufficient to reconstruct the saved state.
        this.systems.forEach((sys, idx) => {
            if (sys && typeof sys.initStaticElements === 'function') {
                try {
                    sys.initStaticElements(); // No globalSessionSeed here for loading
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

    /**
     * Returns the StarSystem object at the specified index.
     * Includes basic bounds checking.
     * @param {number} index - The index of the system to retrieve.
     * @returns {StarSystem|null} The StarSystem object or null if the index is invalid.
     */
    getSystemByIndex(index) {
        if (index >= 0 && index < this.systems.length) {
            return this.systems[index];
        } else {
            console.error(`Galaxy.getSystemByIndex: Invalid index ${index} requested.`);
            return null; // Return null for invalid indices
        }
    }

    // --- Helper to get color (can be static or instance method) ---
    static getEconomyColor(typeName) {
        return Galaxy.ECONOMY_DATA[typeName]?.color || Galaxy.ECONOMY_DATA['Default'].color;
    }
    // ---

} // End Galaxy Class