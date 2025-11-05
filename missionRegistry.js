// ****** missionRegistry.js ******

/**
 * MissionRegistry manages dynamic mission generation and tracking.
 * Generates missions based on station economy needs.
 */
class MissionRegistry {
    constructor() {
        this.missions = []; // Array of all active missions
        this.nextMissionId = 1;
        this.lastGenerationMs = 0;
        this.generationIntervalMs = 10000; // Generate new missions every 10 seconds
    }

    /**
     * Update mission registry - generate new missions, expire old ones.
     * @param {number} dtMs - Delta time in milliseconds
     * @param {Galaxy} galaxyRef - Galaxy reference
     * @param {StationEconomyRegistry} economyRegistry - Economy registry reference
     */
    update(dtMs, galaxyRef, economyRegistry) {
        const now = Date.now();

        // Clean up expired or completed missions
        this.missions = this.missions.filter(m => 
            m.status !== 'completed' && m.status !== 'failed' &&
            (!m.deadlineMs || now < m.deadlineMs)
        );

        // Generate new missions periodically
        if (now - this.lastGenerationMs > this.generationIntervalMs) {
            this._generateMissions(galaxyRef, economyRegistry);
            this.lastGenerationMs = now;
        }
    }

    /**
     * Generate new missions based on station economy needs.
     * @param {Galaxy} galaxyRef - Galaxy reference
     * @param {StationEconomyRegistry} economyRegistry - Economy registry
     */
    _generateMissions(galaxyRef, economyRegistry) {
        if (!galaxyRef || !economyRegistry) return;

        // Limit total active missions
        const maxMissions = 50;
        if (this.missions.length >= maxMissions) return;

        // Check each station for deficit-based delivery missions
        galaxyRef.systems.forEach((system, systemIndex) => {
            if (!system.station) return;

            const stationId = system.station.name;
            const economy = economyRegistry.getEconomy(stationId);
            if (!economy) return;

            // Find commodities with low stock (potential delivery missions)
            for (const comm in economy.stock) {
                const stock = economy.stock[comm];
                const demand = economy.baseDemand[comm] || 100;
                const deficit = demand - stock;

                // Generate delivery mission if significant deficit
                if (deficit > 50 && random() < 0.1) { // 10% chance
                    this._createDeliveryMission(stationId, comm, Math.floor(deficit * 0.5), systemIndex, galaxyRef);
                }
            }
        });
    }

    /**
     * Create a delivery mission.
     * @param {string} destStationId - Destination station
     * @param {string} commodity - Commodity to deliver
     * @param {number} quantity - Quantity needed
     * @param {number} destSystemIndex - Destination system index
     * @param {Galaxy} galaxyRef - Galaxy reference
     */
    _createDeliveryMission(destStationId, commodity, quantity, destSystemIndex, galaxyRef) {
        const id = this.nextMissionId++;

        // Find a reasonable origin station (connected system)
        const destSystem = galaxyRef.systems[destSystemIndex];
        if (!destSystem || !destSystem.connectedSystemIndices || destSystem.connectedSystemIndices.length === 0) {
            return; // Can't create mission without connected systems
        }

        const originSystemIndex = random(destSystem.connectedSystemIndices);
        const originSystem = galaxyRef.systems[originSystemIndex];
        if (!originSystem || !originSystem.station) return;

        const originStationId = originSystem.station.name;

        // Calculate reward based on quantity and distance
        const baseReward = quantity * 10;
        const reward = Math.floor(baseReward * random(0.8, 1.2));

        // Set deadline (e.g., 5 minutes of real time)
        const deadlineMs = Date.now() + 300000; // 5 minutes

        const mission = {
            id,
            type: 'delivery',
            originStationId,
            destStationId,
            originSystemIndex,
            destSystemIndex,
            commodityId: commodity,
            quantity,
            deadlineMs,
            rewardCredits: reward,
            riskLevel: 1,
            postedAtMs: Date.now(),
            acceptedByPilotId: null,
            status: 'posted'
        };

        this.missions.push(mission);
        console.log(`Mission ${id}: Deliver ${quantity} ${commodity} from ${originStationId} to ${destStationId} for ${reward} credits`);
    }

    /**
     * Get all posted missions at a station.
     * @param {string} stationId - Station identifier
     * @returns {Array} Array of posted missions (wrapped as Mission objects for UI compatibility)
     */
    getPostedMissionsAtStation(stationId) {
        const rawMissions = this.missions.filter(m => 
            m.status === 'posted' && 
            (m.originStationId === stationId || m.destStationId === stationId)
        );
        
        // Wrap raw missions as Mission-compatible objects for UI
        return rawMissions.map(m => this._wrapMissionForUI(m));
    }
    
    /**
     * Wraps a MissionRegistry mission as a Mission-like object for UI compatibility.
     * @param {Object} rawMission - Raw mission data
     * @returns {Object} Mission-compatible object
     * @private
     */
    _wrapMissionForUI(rawMission) {
        // Create a Mission-like object that works with existing UI
        const wrapped = {
            id: rawMission.id,
            type: rawMission.type === 'delivery' ? MISSION_TYPE.DELIVERY_LEGAL : rawMission.type,
            title: this._generateMissionTitle(rawMission),
            description: this._generateMissionDescription(rawMission),
            originStation: rawMission.originStationId,
            originSystem: rawMission.originSystemIndex !== undefined ? `System ${rawMission.originSystemIndex}` : 'Unknown',
            destinationStation: rawMission.destStationId,
            destinationSystem: rawMission.destSystemIndex !== undefined ? `System ${rawMission.destSystemIndex}` : 'Unknown',
            cargoType: rawMission.commodityId,
            cargoQuantity: rawMission.quantity,
            rewardCredits: rawMission.rewardCredits,
            status: rawMission.status === 'posted' ? 'Available' : rawMission.status === 'accepted' ? 'Active' : rawMission.status,
            isIllegal: false,
            _registryMission: rawMission, // Keep reference to original
            
            // Add Mission-like methods
            getSummary: function() {
                return `${this.title} - ${this.rewardCredits}cr`;
            },
            
            getDetails: function() {
                let details = `Title: ${this.title}\n--------------------\n`;
                details += `Status: ${this.status}\n\n`;
                details += `${this.description}\n\n`;
                details += `Type: ${this.type}\n`;
                details += `Reward: ${this.rewardCredits} Credits\n`;
                details += `Origin: ${this.originStation}\n`;
                details += `Destination: ${this.destinationStation}\n`;
                if (this.cargoType) {
                    details += `Cargo: ${this.cargoQuantity}t ${this.cargoType}\n`;
                }
                return details;
            },
            
            activate: function() {
                this.status = 'Active';
            },
            
            complete: function(player) {
                if (player && typeof player.addCredits === 'function') {
                    player.addCredits(this.rewardCredits);
                    this.status = 'Completed';
                }
            }
        };
        
        return wrapped;
    }
    
    /**
     * Generate a mission title from raw mission data.
     * @param {Object} mission - Raw mission data
     * @returns {string} Generated title
     * @private
     */
    _generateMissionTitle(mission) {
        if (mission.type === 'delivery') {
            return `Deliver ${mission.quantity}t ${mission.commodityId}`;
        }
        return `Mission ${mission.id}`;
    }
    
    /**
     * Generate a mission description from raw mission data.
     * @param {Object} mission - Raw mission data
     * @returns {string} Generated description
     * @private
     */
    _generateMissionDescription(mission) {
        if (mission.type === 'delivery') {
            return `Transport ${mission.quantity} tons of ${mission.commodityId} from ${mission.originStationId} to ${mission.destStationId}. Time is of the essence.`;
        }
        return 'No description available.';
    }

    /**
     * Accept a mission (by player or NPC).
     * @param {number} missionId - Mission ID
     * @param {number|null} pilotId - Pilot ID (null for player)
     * @returns {Object|null} Mission object if successful
     */
    acceptMission(missionId, pilotId = null) {
        const mission = this.missions.find(m => m.id === missionId);
        if (!mission || mission.status !== 'posted') return null;

        mission.status = 'accepted';
        mission.acceptedByPilotId = pilotId;

        console.log(`Mission ${missionId} accepted by ${pilotId ? 'Pilot ' + pilotId : 'Player'}`);
        return mission;
    }

    /**
     * Complete a mission.
     * @param {number} missionId - Mission ID
     * @returns {boolean} True if successful
     */
    completeMission(missionId) {
        const mission = this.missions.find(m => m.id === missionId);
        if (!mission || mission.status !== 'accepted') return false;

        mission.status = 'completed';
        console.log(`Mission ${missionId} completed`);
        return true;
    }

    /**
     * Fail a mission.
     * @param {number} missionId - Mission ID
     * @returns {boolean} True if successful
     */
    failMission(missionId) {
        const mission = this.missions.find(m => m.id === missionId);
        if (!mission) return false;

        mission.status = 'failed';
        console.log(`Mission ${missionId} failed`);
        return true;
    }

    /**
     * Get missions accepted by a specific pilot.
     * @param {number} pilotId - Pilot ID
     * @returns {Array} Array of missions
     */
    getMissionsForPilot(pilotId) {
        return this.missions.filter(m => m.acceptedByPilotId === pilotId);
    }

    /**
     * Get save data for persistence.
     * @returns {Object} Save data
     */
    getSaveData() {
        return {
            missions: this.missions,
            nextMissionId: this.nextMissionId,
            lastGenerationMs: this.lastGenerationMs
        };
    }

    /**
     * Load from save data.
     * @param {Object} data - Save data
     */
    loadSaveData(data) {
        if (!data) return;

        this.missions = data.missions || [];
        this.nextMissionId = data.nextMissionId || 1;
        this.lastGenerationMs = data.lastGenerationMs || 0;

        console.log(`MissionRegistry: Loaded ${this.missions.length} missions from save`);
    }
}
