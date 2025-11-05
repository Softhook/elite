// ****** worldSimulation.js ******

/**
 * WorldSimulation coordinates background updates for the living universe.
 * Manages budgeted time-sliced updates for pilots, economies, and missions.
 */
class WorldSimulation {
    constructor() {
        this.pilotRegistry = null;
        this.stationEconomyRegistry = null;
        this.missionRegistry = null;
        this.galaxyRef = null;

        // Budget configuration (items to update per frame)
        this.pilotUpdateBudget = 25;
        this.stationUpdateBudget = 10;

        // Timing
        this.lastUpdateMs = Date.now();
        this.accumulatedTimeMs = 0;
        this.updateIntervalMs = 100; // Update background simulation every 100ms

        this.isInitialized = false;
    }

    /**
     * Initialize the world simulation with registries.
     * @param {Galaxy} galaxyRef - Reference to galaxy
     */
    initialize(galaxyRef) {
        if (!galaxyRef) {
            console.warn('WorldSimulation: Cannot initialize without galaxy');
            return;
        }

        console.log('WorldSimulation: Initializing...');

        this.galaxyRef = galaxyRef;

        // Create registries
        this.pilotRegistry = new PilotRegistry();
        this.stationEconomyRegistry = new StationEconomyRegistry();
        this.missionRegistry = new MissionRegistry();

        // Initialize registries with galaxy data
        this.stationEconomyRegistry.initializeEconomies(galaxyRef);
        this.pilotRegistry.initializePilots(galaxyRef, 50);

        this.lastUpdateMs = Date.now();
        this.isInitialized = true;

        console.log('WorldSimulation: Initialization complete');
    }

    /**
     * Update the world simulation (called from draw loop).
     * Uses time-slicing to spread updates across frames.
     * @param {number} dtMs - Delta time in milliseconds
     */
    update(dtMs) {
        if (!this.isInitialized) return;

        this.accumulatedTimeMs += dtMs;

        // Only update at fixed intervals to reduce overhead
        if (this.accumulatedTimeMs >= this.updateIntervalMs) {
            const updateDt = this.accumulatedTimeMs;
            this.accumulatedTimeMs = 0;

            // Update registries with budgeted updates
            if (this.pilotRegistry) {
                this.pilotRegistry.updateSome(this.pilotUpdateBudget, updateDt, this.galaxyRef);
            }

            if (this.stationEconomyRegistry) {
                this.stationEconomyRegistry.updateSome(this.stationUpdateBudget, updateDt);
            }

            if (this.missionRegistry) {
                this.missionRegistry.update(updateDt, this.galaxyRef, this.stationEconomyRegistry);
            }

            this.lastUpdateMs = Date.now();
        }
    }

    /**
     * Get all NPCs that should be active in a given system.
     * @param {number} systemIndex - System index
     * @returns {Array} Array of pilot objects
     */
    getActivePilotsInSystem(systemIndex) {
        if (!this.pilotRegistry) return [];
        return this.pilotRegistry.getPilotsInSystem(systemIndex);
    }

    /**
     * Get station economy for price/stock queries.
     * @param {string} stationId - Station identifier
     * @returns {Object|null} Economy state or null
     */
    getStationEconomy(stationId) {
        if (!this.stationEconomyRegistry) return null;
        return this.stationEconomyRegistry.getEconomy(stationId);
    }

    /**
     * Process a trade transaction.
     * @param {string} stationId - Station identifier
     * @param {string} commodity - Commodity name
     * @param {number} quantity - Quantity traded
     * @returns {boolean} True if successful
     */
    processTrade(stationId, commodity, quantity) {
        if (!this.stationEconomyRegistry) return false;
        return this.stationEconomyRegistry.processTrade(stationId, commodity, quantity);
    }

    /**
     * Get current price for a commodity.
     * @param {string} stationId - Station identifier
     * @param {string} commodity - Commodity name
     * @returns {number} Current price
     */
    getPrice(stationId, commodity) {
        if (!this.stationEconomyRegistry) return 0;
        return this.stationEconomyRegistry.getPrice(stationId, commodity);
    }

    /**
     * Get current stock for a commodity.
     * @param {string} stationId - Station identifier
     * @param {string} commodity - Commodity name
     * @returns {number} Current stock
     */
    getStock(stationId, commodity) {
        if (!this.stationEconomyRegistry) return 0;
        return this.stationEconomyRegistry.getStock(stationId, commodity);
    }

    /**
     * Get posted missions at a station.
     * @param {string} stationId - Station identifier
     * @returns {Array} Array of missions
     */
    getPostedMissions(stationId) {
        if (!this.missionRegistry) return [];
        return this.missionRegistry.getPostedMissionsAtStation(stationId);
    }

    /**
     * Get save data for all registries.
     * @returns {Object} Combined save data
     */
    getSaveData() {
        if (!this.isInitialized) return null;

        return {
            pilots: this.pilotRegistry.getSaveData(),
            economy: this.stationEconomyRegistry.getSaveData(),
            missions: this.missionRegistry.getSaveData()
        };
    }

    /**
     * Load from save data.
     * @param {Object} data - Save data
     * @param {Galaxy} galaxyRef - Galaxy reference
     */
    loadSaveData(data, galaxyRef) {
        if (!data || !galaxyRef) return;

        console.log('WorldSimulation: Loading save data...');

        this.galaxyRef = galaxyRef;

        // Create or reset registries
        if (!this.pilotRegistry) this.pilotRegistry = new PilotRegistry();
        if (!this.stationEconomyRegistry) this.stationEconomyRegistry = new StationEconomyRegistry();
        if (!this.missionRegistry) this.missionRegistry = new MissionRegistry();

        // Load data
        if (data.pilots) {
            this.pilotRegistry.loadSaveData(data.pilots);
        }

        if (data.economy) {
            this.stationEconomyRegistry.loadSaveData(data.economy, galaxyRef);
        }

        if (data.missions) {
            this.missionRegistry.loadSaveData(data.missions);
        }

        this.lastUpdateMs = Date.now();
        this.isInitialized = true;

        console.log('WorldSimulation: Save data loaded successfully');
    }

    /**
     * Reset the simulation (for new game).
     */
    reset() {
        this.pilotRegistry = null;
        this.stationEconomyRegistry = null;
        this.missionRegistry = null;
        this.galaxyRef = null;
        this.isInitialized = false;
        console.log('WorldSimulation: Reset complete');
    }
}
