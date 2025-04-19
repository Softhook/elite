// ****** mission.js ******

// Define Mission Types using a constant object for better readability and safety
const MISSION_TYPE = {
    DELIVERY_LEGAL: 'delivery_legal',
    DELIVERY_ILLEGAL: 'delivery_illegal',
    BOUNTY_PIRATE: 'bounty_pirate',
    BOUNTY_POLICE: 'bounty_police', // Add this new type
    // Add more types as needed:
    // ASSASSINATION_CLEAN: 'Assassination (Clean Target)',
    // ASSASSINATION_WANTED: 'Assassination (Criminal)',
    // COURIER: 'Courier (Data Delivery)',
    // MINING: 'Mining Contract',
    // RESCUE: 'Search and Rescue',
};

class Mission {
    /**
     * Represents an available or active mission.
     * Can be initialized from a configuration object generated by MissionGenerator,
     * or rehydrated from saved data object loaded from localStorage.
     * @param {object} data - Configuration object OR loaded save data object. It should contain properties matching the class fields.
     */
    constructor(data) {
        // --- Core Mission Details ---
        // Use provided data value OR a default value if data property is missing/nullish
        this.id = data.id || (Date.now() + Math.random()); // Use saved ID or generate a new simple unique ID
        this.type = data.type || 'Unknown'; // Mission type from MISSION_TYPE enum
        this.title = data.title || 'Unnamed Mission'; // Short display title
        this.description = data.description || 'No description provided.'; // Longer flavor text
        this.originSystem = data.originSystem || 'Unknown System'; // System where mission was generated
        this.originStation = data.originStation || 'Unknown Station'; // Station where mission was generated

        // --- Target/Destination Details (nullable) ---
        this.destinationSystem = data.destinationSystem || null; // Target system name (for delivery/assassination)
        this.destinationStation = data.destinationStation || null; // Target station name (for delivery)
        this.targetDesc = data.targetDesc || null; // Description of bounty target (e.g., "3 Pirate Kraits")
        this.targetCount = data.targetCount || 0; // Number of targets to destroy/collect (for bounty/collection)

        // --- Cargo Details (nullable) ---
        this.cargoType = data.cargoType || null;   // Type of commodity for delivery missions
        this.cargoQuantity = data.cargoQuantity || 0;  // Amount of cargo for delivery

        // --- Rewards & Penalties ---
        this.rewardCredits = data.rewardCredits || 0; // Credits awarded on completion
        this.isIllegal = data.isIllegal || false; // Flag for illegal missions (smuggling, etc.)
        this.requiredRep = data.requiredRep || 0;    // Placeholder for reputation needed later
        this.timeLimit = data.timeLimit || null;    // Placeholder for time limit later (e.g., seconds)

        // --- Tracking Properties ---
        // Initialize status and progress from saved data if present, otherwise use defaults for a new mission
        this.status = data.status || 'Available'; // 'Available', 'Active', 'Completable', 'Completed', 'Failed'
        this.progressCount = data.progressCount || 0; // e.g., number of pirates killed so far

        // Optional log to trace object creation/rehydration
        // console.log(`Mission object created/rehydrated: ID=${this.id.toString().slice(-5)}, Title=${this.title}, Status=${this.status}, Progress=${this.progressCount}`);
    }

    /** Sets the mission status to 'Active'. Called by Player.acceptMission. */
    activate() {
        console.log(`      >>> Mission.activate() called for: ${this.title}`); // Log entry
        if (this.status === 'Available') { // Only activate if it was available
             this.status = 'Active';
             console.log(`      <<< Mission status set to: ${this.status}`); // Log exit
        } else {
             console.warn(`Mission.activate() called on mission with status ${this.status}. Should be 'Available'.`);
        }
    }

    /**
     * Marks the mission as completed, adds reward to player. Called by Player.completeMission.
     * @param {Player} player - Reference to the player object to add credits to.
     */
    complete(player) {
        // Note: Player.completeMission should ideally check if conditions are met before calling this.
        // This method primarily handles the reward and status change.
        console.log(`   Mission.complete() called for: ${this.title}`);
        if (player && typeof player.addCredits === 'function') {
            console.log(`      -> Granting reward: ${this.rewardCredits} Credits`);
            player.addCredits(this.rewardCredits);
            this.status = 'Completed'; // Mark as completed
            // TODO: Add reputation changes or other effects later
        } else {
            console.error("Mission.complete() called without valid player object or addCredits method!");
        }
    }

    /** Marks the mission as failed. Called potentially by Player.abandonMission or time limits. */
    fail() {
        console.log(`Mission Failed: ${this.title}`);
        this.status = 'Failed';
         // TODO: Add penalties (credits, rep) or consequences later
    }

    /** Returns a short summary string for display on the mission board list. */
    getSummary() {
        // Basic summary - can be enhanced
        return `${this.title} (${this.type}) - Reward: ${this.rewardCredits}cr`;
    }

    /** Returns a detailed multi-line string for the mission details panel. */
    getDetails() {
         // Build the details string step-by-step
         let details = `Title: ${this.title}\n--------------------\n`;
         details += `Status: ${this.status}\n\n`; // Show current status
         details += `${this.description}\n\n`;
         details += `Type: ${this.type}\n`;
         details += `Reward: ${this.rewardCredits} Credits\n`;
         details += `Origin: ${this.originStation} (${this.originSystem})\n`;

         // Add optional details based on mission type
         if (this.destinationSystem) details += `Destination: ${this.destinationStation || 'System Wide'} (${this.destinationSystem})\n`;
         if (this.cargoType) details += `Cargo: ${this.cargoQuantity}t ${this.cargoType}\n`;
         if (this.targetDesc) {
             details += `Target: ${this.targetDesc}`;
             // Add progress for bounty missions if active
             if (this.status === 'Active' && this.type === MISSION_TYPE.BOUNTY_PIRATE) {
                  details += ` (${this.progressCount}/${this.targetCount} destroyed)\n`;
             } else {
                  details += `\n`;
             }
         }
         if (this.timeLimit) details += `Time Limit: ${this.timeLimit} seconds\n`; // Placeholder display
         if (this.requiredRep) details += `Requires Reputation: ${this.requiredRep}\n`; // Placeholder display

         // Add warning for illegal missions
         if (this.isIllegal) {
             details += `\n!! WARNING:\nThis mission involves illegal activity. Discovery by authorities may lead to fines, bounties, or destruction. Proceed with caution. !!\n`;
         }

         return details;
    }
} // End of Mission Class