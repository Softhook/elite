class Galaxy {
    constructor() {
        this.systems = [];
        this.currentSystemIndex = 0; // Start in the first system
    }

    init() {
        // Define the fixed systems for the MVP
        // Positions are for the Galaxy Map screen
        this.systems.push(new StarSystem("Solara", "Industrial", width * 0.2, height * 0.5));
        this.systems.push(new StarSystem("AgriPrime", "Agricultural", width * 0.5, height * 0.3));
        this.systems.push(new StarSystem("Cygnus Tech", "Tech", width * 0.8, height * 0.6));
        this.systems.push(new StarSystem("Border Outpost", "Industrial", width * 0.5, height * 0.8));

        // Mark starting system as visited
        if(this.systems.length > 0) {
           this.systems[0].enterSystem(); // Call enterSystem on the initial system
        }
    }

    getCurrentSystem() {
        if (this.currentSystemIndex >= 0 && this.currentSystemIndex < this.systems.length) {
            return this.systems[this.currentSystemIndex];
        }
        return null; // Should not happen in normal flow
    }

    jumpToSystem(targetIndex) {
        if (targetIndex >= 0 && targetIndex < this.systems.length && targetIndex !== this.currentSystemIndex) {
            console.log(`Jumping from ${this.systems[this.currentSystemIndex].name} to ${this.systems[targetIndex].name}`);
            this.currentSystemIndex = targetIndex;
            const newSystem = this.getCurrentSystem();
            newSystem.enterSystem(); // Prepare the new system
            player.currentSystem = newSystem; // Update player's reference
            // Reset player position to center-ish on jump arrival
            player.pos = createVector(width / 2, height / 2);
            player.vel = createVector(0, 0); // Stop the ship after jump
        } else {
            console.error("Invalid jump index:", targetIndex);
        }
    }

    getSystemDataForMap() {
        return this.systems.map((sys, index) => ({
            name: sys.name,
            x: sys.galaxyPos.x,
            y: sys.galaxyPos.y,
            type: sys.economyType,
            visited: sys.visited,
            index: index
        }));
    }

    // Get system indices reachable from the current system (simple adjacency for MVP)
    getReachableSystems() {
        const reachable = [];
        // Example: Allow jumping to +/- 1 index (wrap around for first/last)
        const numSystems = this.systems.length;
        if (numSystems <= 1) return [];

        const prevIndex = (this.currentSystemIndex - 1 + numSystems) % numSystems;
        const nextIndex = (this.currentSystemIndex + 1) % numSystems;

        if (prevIndex !== this.currentSystemIndex) reachable.push(prevIndex);
        if (nextIndex !== this.currentSystemIndex) reachable.push(nextIndex);

        // Could add more complex logic (distance based, jump drive range etc.) later
        return reachable;
    }

     getSaveData() {
         // Save visited status for each system
         return this.systems.map(sys => sys.getSaveData());
     }

     loadSaveData(systemsData) {
         if (systemsData && systemsData.length === this.systems.length) {
             for (let i = 0; i < this.systems.length; i++) {
                 this.systems[i].loadSaveData(systemsData[i]);
             }
             console.log("Loaded system visited data.");
         } else {
            console.log("No valid system visited data found or mismatch, using defaults.");
            // Ensure starting system is marked visited if loading fails partially
            if (this.systems.length > 0 && this.currentSystemIndex < this.systems.length) {
                 this.systems[this.currentSystemIndex].visited = true;
            }
         }
     }
}