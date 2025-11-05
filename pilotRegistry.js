// ****** pilotRegistry.js ******

/**
 * PilotRegistry manages all NPC pilots in the galaxy.
 * Handles background simulation of pilot behavior, trading, movement, and state.
 */
class PilotRegistry {
    constructor() {
        this.pilots = []; // Array of all NPC pilots
        this.nextPilotId = 1;
        this.updateIndex = 0; // Round-robin index for budgeted updates
        
        // Name generation data (simple for now)
        this.firstNames = [
            'Alex', 'Blake', 'Casey', 'Dana', 'Ellis', 'Finley', 'Gray', 'Harper',
            'Jordan', 'Kelly', 'Lane', 'Morgan', 'Nova', 'Parker', 'Quinn', 'River',
            'Sage', 'Taylor', 'Val', 'Zephyr', 'Aria', 'Cade', 'Echo', 'Frost',
            'Kai', 'Luna', 'Orion', 'Phoenix', 'Raven', 'Storm', 'Ash', 'Blaze'
        ];
        this.lastNames = [
            'Chen', 'Garcia', 'Ivanov', 'Kim', 'Li', 'Martinez', 'Nguyen', 'Okafor',
            'Patel', 'Rodriguez', 'Santos', 'Smith', 'Takahashi', 'Volkov', 'Wang',
            'Yamamoto', 'Zhou', 'Anderson', 'Brown', 'Davis', 'Jensen', 'Singh',
            'Torres', 'Wilson', 'Cooper', 'Morgan', 'Reed', 'Stone', 'Vale', 'West'
        ];
    }

    /**
     * Initialize the registry with seed pilots at major hubs.
     * @param {Galaxy} galaxyRef - Reference to the galaxy object
     * @param {number} count - Number of pilots to create
     */
    initializePilots(galaxyRef, count = 50) {
        if (!galaxyRef || !galaxyRef.systems || galaxyRef.systems.length === 0) {
            console.warn('PilotRegistry: Cannot initialize without valid galaxy');
            return;
        }

        console.log(`PilotRegistry: Initializing ${count} pilots...`);

        // Find systems with stations for seeding
        const systemsWithStations = galaxyRef.systems
            .map((sys, idx) => ({ sys, idx }))
            .filter(({ sys }) => sys.station);

        if (systemsWithStations.length === 0) {
            console.warn('PilotRegistry: No systems with stations found');
            return;
        }

        // Create initial pilot population
        for (let i = 0; i < count; i++) {
            const startSystem = random(systemsWithStations);
            const pilot = this.createPilot(startSystem.idx, startSystem.sys.station.name);
            this.pilots.push(pilot);
        }

        console.log(`PilotRegistry: Created ${this.pilots.length} initial pilots`);
    }

    /**
     * Create a new pilot with generated attributes.
     * @param {number} systemIndex - Starting system index
     * @param {string} stationId - Starting station ID (docked)
     * @returns {Object} New pilot object
     */
    createPilot(systemIndex, stationId) {
        const id = this.nextPilotId++;
        
        // Generate name using simple random selection
        const firstName = random(this.firstNames);
        const lastName = random(this.lastNames);
        const name = `${firstName} ${lastName}`;

        // Assign role with weighted distribution
        const roleRoll = random();
        let role;
        if (roleRoll < 0.40) role = 'trader';       // 40% traders
        else if (roleRoll < 0.60) role = 'hauler';  // 20% haulers (renamed from courier)
        else if (roleRoll < 0.70) role = 'miner';   // 10% miners
        else if (roleRoll < 0.80) role = 'bounty';  // 10% bounty hunters
        else if (roleRoll < 0.90) role = 'police';  // 10% police
        else role = 'pirate';                        // 10% pirates

        // Select ship type based on role
        let shipTypeId;
        switch (role) {
            case 'trader':
                shipTypeId = random(['CobraMkIII', 'Python', 'Type6Transporter']);
                break;
            case 'hauler':
                shipTypeId = random(['Anaconda', 'Python', 'Type9Heavy']);
                break;
            case 'miner':
                shipTypeId = random(['Adder', 'CobraMkIII', 'ProspectorMiner']);
                break;
            case 'bounty':
                shipTypeId = random(['Viper', 'FerDeLance', 'AspExplorer']);
                break;
            case 'police':
                shipTypeId = random(['Viper', 'Sidewinder', 'ACAB']);
                break;
            case 'pirate':
                shipTypeId = random(['KraitMKI', 'PirateMarauder', 'FerDeLance']);
                break;
            default:
                shipTypeId = 'CobraMkIII';
        }

        // Get ship stats for capacity
        const shipDef = SHIP_DEFINITIONS[shipTypeId];
        const cargoCap = shipDef ? (shipDef.cargoCapacity || 20) : 20;

        return {
            id,
            name,
            factionId: null,
            role,
            shipTypeId,
            hull: shipDef ? shipDef.baseHull : 100,
            shields: shipDef ? (shipDef.baseShield || 0) : 0,
            currentSystemIndex: systemIndex,
            dockedStationId: stationId,
            pos: null, // Only populated in active system
            itinerary: [], // Next system indices to visit
            cargo: {}, // {commodityName: quantity}
            cargoCap,
            credits: random(1000, 50000),
            legalStatus: (role === 'pirate') ? 'wanted' : 'clean',
            riskTolerance: random(0.2, 0.8),
            tradeFocus: this._selectTradeFocus(role),
            missionIds: [],
            lastUpdateMs: Date.now(),
            alive: true
        };
    }

    /**
     * Select preferred commodities based on role.
     * @param {string} role - Pilot role
     * @returns {Array<string>|null} Array of commodity names or null
     */
    _selectTradeFocus(role) {
        switch (role) {
            case 'trader':
                return random([
                    ['Food', 'Textiles'],
                    ['Machinery', 'Computers'],
                    ['Luxury Goods', 'Medicine']
                ]);
            case 'hauler':
                return ['Metals', 'Minerals', 'Machinery'];
            case 'miner':
                return ['Metals', 'Minerals'];
            case 'pirate':
                return ['Narcotics', 'Weapons', 'Slaves']; // Illegal goods
            default:
                return null;
        }
    }

    /**
     * Update a limited number of pilots per frame (budgeted update).
     * @param {number} budget - Max number of pilots to update this call
     * @param {number} dtMs - Delta time in milliseconds
     * @param {Galaxy} galaxyRef - Reference to galaxy for routing
     */
    updateSome(budget, dtMs, galaxyRef) {
        if (this.pilots.length === 0) return;

        const dtSec = dtMs / 1000.0;
        let updated = 0;

        // Round-robin through pilots
        while (updated < budget && updated < this.pilots.length) {
            const pilot = this.pilots[this.updateIndex];
            this._updatePilot(pilot, dtSec, galaxyRef);

            this.updateIndex = (this.updateIndex + 1) % this.pilots.length;
            updated++;
        }
    }

    /**
     * Update a single pilot's state (background simulation).
     * @param {Object} pilot - The pilot to update
     * @param {number} dtSec - Delta time in seconds
     * @param {Galaxy} galaxyRef - Reference to galaxy
     */
    _updatePilot(pilot, dtSec, galaxyRef) {
        if (!pilot.alive) return;

        pilot.lastUpdateMs = Date.now();

        // Basic state machine
        if (pilot.dockedStationId) {
            // Pilot is docked - may trade, plan route, or depart
            this._updateDockedPilot(pilot, dtSec, galaxyRef);
        } else if (pilot.itinerary && pilot.itinerary.length > 0) {
            // Pilot is traveling - simulate movement
            this._updateTravelingPilot(pilot, dtSec, galaxyRef);
        } else {
            // Idle - plan next action
            this._planNextAction(pilot, galaxyRef);
        }
    }

    /**
     * Update pilot while docked at a station.
     * @param {Object} pilot - The pilot
     * @param {number} dtSec - Delta time in seconds
     * @param {Galaxy} galaxyRef - Galaxy reference
     */
    _updateDockedPilot(pilot, dtSec, galaxyRef) {
        // For now, just occasionally undock and pick a destination
        // This is a placeholder for future trading logic
        if (random() < 0.01) { // 1% chance per update to depart
            // Pick a random connected system
            const currentSystem = galaxyRef.systems[pilot.currentSystemIndex];
            if (currentSystem && currentSystem.connectedSystemIndices && 
                currentSystem.connectedSystemIndices.length > 0) {
                const destIndex = random(currentSystem.connectedSystemIndices);
                pilot.itinerary = [destIndex];
                pilot.dockedStationId = null;
                console.log(`Pilot ${pilot.name} departed for system ${destIndex}`);
            }
        }
    }

    /**
     * Update pilot while traveling between systems.
     * @param {Object} pilot - The pilot
     * @param {number} dtSec - Delta time in seconds
     * @param {Galaxy} galaxyRef - Galaxy reference
     */
    _updateTravelingPilot(pilot, dtSec, galaxyRef) {
        // Simple travel: arrive after a fixed time delay
        // In a real implementation, this would be based on actual distance
        if (random() < 0.005) { // Small chance to arrive each update
            const destIndex = pilot.itinerary.shift();
            pilot.currentSystemIndex = destIndex;

            // Dock at station if available
            const destSystem = galaxyRef.systems[destIndex];
            if (destSystem && destSystem.station) {
                pilot.dockedStationId = destSystem.station.name;
                console.log(`Pilot ${pilot.name} arrived and docked at ${destSystem.name}`);
            }

            // If no more destinations, we're done traveling
            if (pilot.itinerary.length === 0) {
                pilot.itinerary = [];
            }
        }
    }

    /**
     * Plan next action for idle pilot.
     * @param {Object} pilot - The pilot
     * @param {Galaxy} galaxyRef - Galaxy reference
     */
    _planNextAction(pilot, galaxyRef) {
        // Simple planning: pick a random destination
        const currentSystem = galaxyRef.systems[pilot.currentSystemIndex];
        if (currentSystem && currentSystem.connectedSystemIndices && 
            currentSystem.connectedSystemIndices.length > 0) {
            const destIndex = random(currentSystem.connectedSystemIndices);
            pilot.itinerary = [destIndex];
        }
    }

    /**
     * Get all pilots in a specific system.
     * @param {number} systemIndex - System index to query
     * @returns {Array} Array of pilots in that system
     */
    getPilotsInSystem(systemIndex) {
        return this.pilots.filter(p => p.currentSystemIndex === systemIndex && p.alive);
    }

    /**
     * Get save data for persistence.
     * @returns {Object} Compact save data
     */
    getSaveData() {
        return {
            pilots: this.pilots.map(p => ({
                // Only save essential data, omit transient fields like pos
                id: p.id,
                name: p.name,
                role: p.role,
                shipTypeId: p.shipTypeId,
                hull: p.hull,
                shields: p.shields,
                currentSystemIndex: p.currentSystemIndex,
                dockedStationId: p.dockedStationId,
                itinerary: p.itinerary,
                cargo: p.cargo,
                cargoCap: p.cargoCap,
                credits: p.credits,
                legalStatus: p.legalStatus,
                riskTolerance: p.riskTolerance,
                tradeFocus: p.tradeFocus,
                missionIds: p.missionIds,
                alive: p.alive
            })),
            nextPilotId: this.nextPilotId
        };
    }

    /**
     * Load from save data.
     * @param {Object} data - Save data
     */
    loadSaveData(data) {
        if (!data || !data.pilots) return;
        
        this.pilots = data.pilots.map(p => ({
            ...p,
            pos: null, // Reset transient field
            lastUpdateMs: Date.now()
        }));
        this.nextPilotId = data.nextPilotId || this.pilots.length + 1;
        this.updateIndex = 0;
        
        console.log(`PilotRegistry: Loaded ${this.pilots.length} pilots from save`);
    }
}
