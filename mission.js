// ****** mission.js ******

// Define Mission Types (Constants)
const MISSION_TYPE = {
    DELIVERY_LEGAL: 'Delivery (Legal)',
    DELIVERY_ILLEGAL: 'Delivery (Smuggling)',
    BOUNTY_PIRATE: 'Bounty (Pirates)',
    // Add more later: ASSASSINATION, COURIER, MINING, RESCUE etc.
};

class Mission {
    /**
     * Represents an available or active mission.
     * @param {object} config - Configuration object for the mission.
     */
    constructor({
        type,               // MISSION_TYPE constant
        title,              // Short display title (e.g., "Deliver Food to AgriPrime")
        description,        // Longer flavor text description
        originSystem,       // Name of the system where mission was generated
        originStation,      // Name of the station where mission was generated
        destinationSystem = null, // Target system name (for delivery/assassination)
        destinationStation = null, // Target station name (for delivery)
        targetDesc = null,  // Description of bounty target (e.g., "3 Pirate Kraits")
        targetCount = 0,    // Number of targets to destroy/collect (for bounty/collection)
        cargoType = null,   // Type of commodity for delivery missions
        cargoQuantity = 0,  // Amount of cargo for delivery
        rewardCredits,      // Credits awarded on completion
        isIllegal = false,  // Flag for illegal missions (smuggling, assassination of clean targets)
        requiredRep = 0,    // Placeholder for reputation needed later
        timeLimit = null    // Placeholder for time limit later (e.g., seconds)
    }) {
        this.id = Date.now() + Math.random(); // Simple unique ID
        this.type = type;
        this.title = title;
        this.description = description;
        this.originSystem = originSystem;
        this.originStation = originStation;
        this.destinationSystem = destinationSystem;
        this.destinationStation = destinationStation;
        this.targetDesc = targetDesc;
        this.targetCount = targetCount;
        this.cargoType = cargoType;
        this.cargoQuantity = cargoQuantity;
        this.rewardCredits = rewardCredits;
        this.isIllegal = isIllegal;
        this.requiredRep = requiredRep;
        this.timeLimit = timeLimit;

        // --- Tracking Properties (for active missions) ---
        this.status = 'Available'; // 'Available', 'Active', 'Completed', 'Failed'
        this.progressCount = 0; // e.g., number of pirates killed so far
    }

    // --- Methods for active missions (can be expanded) ---
    activate() {
        console.log(`      >>> Mission.activate() called for: ${this.title}`); // Log entry
        this.status = 'Active'; // Change status
        console.log(`      <<< Mission status set to: ${this.status}`); // Log exit
    }

    complete(player) {
        console.log(`Mission Completed: ${this.title}`);
        player.addCredits(this.rewardCredits);
        this.status = 'Completed';
        // TODO: Add reputation changes later
    }

    fail() {
        console.log(`Mission Failed: ${this.title}`);
        this.status = 'Failed';
         // TODO: Add penalties (credits, rep) later
    }

    // Simple display for mission board
    getSummary() {
        return `${this.title} (${this.type}) - Reward: ${this.rewardCredits}cr`;
    }

    getDetails() {
         let details = `${this.description}\n`;
         details += `Type: ${this.type}\n`;
         details += `Reward: ${this.rewardCredits} Credits\n`;
         if (this.destinationSystem) details += `Destination: ${this.destinationStation} (${this.destinationSystem})\n`;
         if (this.cargoType) details += `Cargo: ${this.cargoQuantity} x ${this.cargoType}\n`;
         if (this.targetDesc) details += `Target: ${this.targetDesc}\n`;
         if (this.isIllegal) details += `\n!! WARNING: This mission involves illegal activity. Failure or detection may result in fines or hostility! !!\n`;
         // Add reputation/time limit later
         return details;
    }
}