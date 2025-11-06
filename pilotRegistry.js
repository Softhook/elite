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

        // Background role balancing parameters
        this.roleEvaluationIntervalMs = 60_000; // Evaluate role profitability every minute per pilot
        this.roleSwitchThreshold = 1200; // Require sizable upside before switching careers

        // Preferred ship options per role (used when switching careers)
        this.roleShipOptions = {
            trader: ['CobraMkIII', 'Python', 'Type6Transporter'],
            hauler: ['Anaconda', 'Python', 'Type9Heavy'],
            miner: ['Adder', 'CobraMkIII', 'ProspectorMiner'],
            bounty: ['Viper', 'FerDeLance', 'AspExplorer'],
            police: ['Viper', 'Sidewinder', 'ACAB'],
            pirate: ['KraitMKI', 'PirateMarauder', 'FerDeLance'],
            smuggler: ['CobraMkIII', 'KraitMKI', 'AspExplorer'],
            local_transporter: ['Keelback', 'Type6Transporter', 'CobraMkIII'],
            alien: ['Thargoid', 'GeometricDrone', 'BioFrigate'],
            guard: ['Viper', 'GladiusFighter'],
            default: ['CobraMkIII']
        };
        
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

        this.usedNames = new Set();
        this.availableNamePool = [];
        this.uniqueSuffixCounter = 1;

        this._refreshNamePool();

        // Dynamic bounty tracking state
        this.activeBounties = new Map();
        this.bountyHunterIds = new Set();
        this.lastBountySweepMs = 0;
        this.bountySweepIntervalMs = 60_000;
        this.maxTrackedBounties = 8;
        this.maxHuntersPerBounty = 2;
        this.bountyNotorietyThreshold = 450;
        this.bountyPayoutMultiplier = 15;
    }

    _normalizeName(name) {
        if (!name) return '';
        return String(name).trim().replace(/\s+/g, ' ');
    }

    _markNameUsed(name) {
        const normalized = this._normalizeName(name);
        if (!normalized) return;
        this.usedNames.add(normalized);

        if (Array.isArray(this.availableNamePool) && this.availableNamePool.length > 0) {
            const idx = this.availableNamePool.indexOf(normalized);
            if (idx !== -1) {
                this.availableNamePool.splice(idx, 1);
            }
        }
    }

    _refreshNamePool() {
        this.availableNamePool = [];

        for (const first of this.firstNames) {
            for (const last of this.lastNames) {
                const candidate = this._normalizeName(`${first} ${last}`);
                if (!this.usedNames.has(candidate)) {
                    this.availableNamePool.push(candidate);
                }
            }
        }

        for (let i = this.availableNamePool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = this.availableNamePool[i];
            this.availableNamePool[i] = this.availableNamePool[j];
            this.availableNamePool[j] = temp;
        }
    }

    _generateFallbackName(baseLabel = 'Callsign') {
        let attempts = 0;
        while (attempts < 5000) {
            const candidate = `${baseLabel} ${this.uniqueSuffixCounter++}`;
            if (!this.usedNames.has(candidate)) {
                this._markNameUsed(candidate);
                return candidate;
            }
            attempts++;
        }

        const fallback = `${baseLabel} ${Date.now()}`;
        this._markNameUsed(fallback);
        return fallback;
    }

    _generatePilotName() {
        if (!Array.isArray(this.availableNamePool)) {
            this.availableNamePool = [];
        }

        if (this.availableNamePool.length === 0) {
            this._refreshNamePool();
        }

        if (this.availableNamePool.length > 0) {
            const candidate = this.availableNamePool.pop();
            this._markNameUsed(candidate);
            return candidate;
        }

        return this._generateFallbackName();
    }

    _resolveUniqueName(desiredName) {
        const normalized = this._normalizeName(desiredName);
        if (!normalized) {
            return this._generatePilotName();
        }

        if (!this.usedNames.has(normalized)) {
            this._markNameUsed(normalized);
            return normalized;
        }

        for (let suffix = 2; suffix < 2500; suffix++) {
            const candidate = `${normalized} #${suffix}`;
            if (!this.usedNames.has(candidate)) {
                this._markNameUsed(candidate);
                return candidate;
            }
        }

        return this._generateFallbackName(normalized);
    }

    _ensurePilotNamesUnique() {
        this.usedNames = new Set();
        this.availableNamePool = [];

        for (const pilot of this.pilots) {
            if (!pilot) continue;
            const uniqueName = this._resolveUniqueName(pilot.name);
            pilot.name = uniqueName;
        }

        this.uniqueSuffixCounter = Math.max(this.usedNames.size + 1, this.uniqueSuffixCounter);
        this._refreshNamePool();
    }

    /**
     * Initialize the registry with seed pilots at major hubs.
     * @param {Galaxy} galaxyRef - Reference to the galaxy object
     * @param {number} count - Number of pilots to create
     */
    initializePilots(galaxyRef, count = 200) {
        if (!galaxyRef || !galaxyRef.systems || galaxyRef.systems.length === 0) {
            console.warn('PilotRegistry: Cannot initialize without valid galaxy');
            return;
        }

        this.activeBounties.clear();
        this.bountyHunterIds.clear();
        this.lastBountySweepMs = 0;

        console.log(`PilotRegistry: Initializing ${count} pilots...`);

        // Find systems with stations for seeding
        const systemsWithStations = galaxyRef.systems
            .map((sys, idx) => ({ sys, idx }))
            .filter(({ sys }) => sys.station);

        if (systemsWithStations.length === 0) {
            console.warn('PilotRegistry: No systems with stations found');
            return;
        }

        this._ensurePilotNamesUnique();

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
        
        // Generate unique name from pool
        const name = this._generatePilotName();

        // Assign role with weighted distribution
        const roleRoll = random();
        let role;
        if (roleRoll < 0.40) role = 'trader';       // 40% traders
        else if (roleRoll < 0.60) role = 'hauler';  // 20% haulers
        else if (roleRoll < 0.70) role = 'miner';   // 10% miners
        else if (roleRoll < 0.80) role = 'police';  // 10% police
        else if (roleRoll < 0.90) role = 'smuggler'; // 10% smugglers
        else role = 'pirate';                        // 10% pirates

        // Select ship type based on role
        const shipTypeId = this._assignShipForRole({ shipTypeId: null }, role);

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
            alive: true,
            lastRoleEvaluationMs: Date.now() + random(-5000, 5000),
            lastRoleSwitchMs: Date.now(),
            kills: 0,
            notoriety: 0,
            hasActiveBounty: false,
            bountyContractId: null,
            bountyTargetId: null,
            bountyTargetType: null,
            bountyPayout: null,
            isBountyHunter: false
        };
    }

    /**
     * Select preferred commodities based on role.
     * @param {string} role - Pilot role
     * @returns {Array<string>|null} Array of commodity names or null
     */
    _selectTradeFocus(role, context = null) {
        switch (role) {
            case 'trader':
                if (context && context.commodity) return [context.commodity];
                return random([
                    ['Food', 'Textiles'],
                    ['Machinery', 'Computers'],
                    ['Luxury Goods', 'Medicine']
                ]);
            case 'hauler':
                if (context && context.commodity) return [context.commodity];
                return ['Metals', 'Minerals', 'Machinery'];
            case 'miner':
                return ['Metals', 'Minerals'];
            case 'pirate':
                return ['Narcotics', 'Weapons', 'Slaves']; // Illegal goods
            case 'smuggler':
                if (context && context.commodity) return [context.commodity];
                return ['Narcotics', 'Weapons'];
            case 'local_transporter':
                if (context && context.commodity) return [context.commodity];
                return ['Food', 'Machinery'];
            default:
                return null;
        }
    }

    /**
     * Choose a suitable ship type for the target role, keeping the current hull if already appropriate.
     * @param {Object} pilot - Pilot data (only shipTypeId is read)
     * @param {string} role - Target career role
     * @returns {string} Ship definition key
     * @private
     */
    _assignShipForRole(pilot, role) {
        let options = this.roleShipOptions[role] || this.roleShipOptions.default;
        if (!Array.isArray(options) || options.length === 0) {
            options = this.roleShipOptions.default;
        }

        let validOptions = options.filter(id => SHIP_DEFINITIONS[id]);
        if (validOptions.length === 0) {
            validOptions = this.roleShipOptions.default.filter(id => SHIP_DEFINITIONS[id]);
        }

        if (pilot.shipTypeId && SHIP_DEFINITIONS[pilot.shipTypeId] && validOptions.includes(pilot.shipTypeId)) {
            return pilot.shipTypeId;
        }

        if (validOptions.length === 0) {
            if (pilot.shipTypeId && SHIP_DEFINITIONS[pilot.shipTypeId]) {
                return pilot.shipTypeId;
            }
            if (SHIP_DEFINITIONS.CobraMkIII) {
                return 'CobraMkIII';
            }
            return null;
        }

        const choice = random(validOptions);
        if (choice) return choice;
        if (pilot.shipTypeId && SHIP_DEFINITIONS[pilot.shipTypeId]) return pilot.shipTypeId;
        if (SHIP_DEFINITIONS.CobraMkIII) return 'CobraMkIII';
        return null;
    }

    registerEventPilot(params = {}) {
        const {
            role = 'pirate',
            shipTypeId,
            systemIndex = 0,
            position = null,
            legalStatus = null,
            name = null,
            riskTolerance = null,
            tradeContext = null,
            spawnSource = null,
            dockedStationId = null,
            credits = null,
            kills = 0,
            notoriety = 0,
            hasActiveBounty = false,
            bountyContractId = null,
            bountyTargetId = null,
            bountyTargetType = null,
            bountyPayout = null,
            isBountyHunter = false
        } = params || {};

        if (!shipTypeId || !SHIP_DEFINITIONS[shipTypeId]) {
            console.warn('PilotRegistry: Cannot register event pilot with invalid ship', shipTypeId);
            return null;
        }

        const id = this.nextPilotId++;
        const shipDef = SHIP_DEFINITIONS[shipTypeId];
        const now = Date.now();
        const pilotName = name ? this._resolveUniqueName(name) : this._generatePilotName();

        const pilot = {
            id,
            name: pilotName,
            factionId: null,
            role,
            shipTypeId,
            hull: shipDef ? shipDef.baseHull : 100,
            shields: shipDef ? (shipDef.baseShield || 0) : 0,
            currentSystemIndex: systemIndex,
            dockedStationId,
            pos: position ? { x: position.x, y: position.y } : null,
            itinerary: [],
            cargo: {},
            cargoCap: shipDef ? (shipDef.cargoCapacity || 20) : 20,
            credits: credits ?? random(2000, 45000),
            legalStatus: legalStatus || (role === 'pirate' ? 'wanted' : 'clean'),
            riskTolerance: riskTolerance ?? random(0.4, 0.9),
            tradeFocus: this._selectTradeFocus(role, tradeContext),
            missionIds: [],
            lastUpdateMs: now,
            alive: true,
            lastRoleEvaluationMs: now,
            lastRoleSwitchMs: now,
            isEventSpawn: true,
            spawnSource,
            kills: kills || 0,
            notoriety: notoriety || 0,
            hasActiveBounty: Boolean(hasActiveBounty),
            bountyContractId: bountyContractId || null,
            bountyTargetId: bountyTargetId ?? null,
            bountyTargetType: bountyTargetType || null,
            bountyPayout: bountyPayout ?? null,
            isBountyHunter: Boolean(isBountyHunter)
        };

        this.pilots.push(pilot);

        if (pilot.isBountyHunter) {
            this.bountyHunterIds.add(pilot.id);
        }

        return pilot;
    }

    /**
     * Update a limited number of pilots per frame (budgeted update).
     * @param {number} budget - Max number of pilots to update this call
     * @param {number} dtMs - Delta time in milliseconds
     * @param {Galaxy} galaxyRef - Reference to galaxy for routing
     */
    updateSome(budget, dtMs, galaxyRef, stationEconomyRegistry) {
        if (this.pilots.length === 0) return;

        const dtSec = dtMs / 1000.0;
        let updated = 0;

        // Round-robin through pilots
        while (updated < budget && updated < this.pilots.length) {
            const pilot = this.pilots[this.updateIndex];
            this._updatePilot(pilot, dtSec, galaxyRef, stationEconomyRegistry);

            this.updateIndex = (this.updateIndex + 1) % this.pilots.length;
            updated++;
        }

        this._updateBountySystem(galaxyRef);
    }

    /**
     * Update a single pilot's state (background simulation).
     * @param {Object} pilot - The pilot to update
     * @param {number} dtSec - Delta time in seconds
     * @param {Galaxy} galaxyRef - Reference to galaxy
     */
    _updatePilot(pilot, dtSec, galaxyRef, stationEconomyRegistry) {
        if (!pilot.alive) return;

        if (pilot.isEventSpawn) {
            pilot.lastUpdateMs = Date.now();
            return;
        }

        pilot.lastUpdateMs = Date.now();

        // Evaluate role profitability while docked to enable dynamic role shifts
        if (stationEconomyRegistry && pilot.dockedStationId) {
            this._maybeSwitchRole(pilot, galaxyRef, stationEconomyRegistry);
        }

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
     * Evaluate whether a docked pilot should change role based on current profitability.
     * @param {Object} pilot - Pilot data
     * @param {Galaxy} galaxyRef - Galaxy reference for system lookup
     * @param {StationEconomyRegistry} stationEconomyRegistry - Economy data access
     * @private
     */
    _maybeSwitchRole(pilot, galaxyRef, stationEconomyRegistry) {
        if (pilot?.isEventSpawn) return;

        const now = Date.now();
        if (!galaxyRef || !stationEconomyRegistry) return;

        const interval = this.roleEvaluationIntervalMs;
        if (!interval || interval <= 0) return;

        const lastEval = pilot.lastRoleEvaluationMs || 0;
        if (now - lastEval < interval) return;
        pilot.lastRoleEvaluationMs = now;

        const system = galaxyRef.systems?.[pilot.currentSystemIndex];
        if (!system || !system.station) return;

        const economy = stationEconomyRegistry.getEconomy(system.station.name);
        if (!economy) return;

        const roleProfits = this._calculateRoleProfits(pilot, system, economy, stationEconomyRegistry, galaxyRef);
        if (!roleProfits) return;

        const currentResult = roleProfits[pilot.role] || { profit: Number.NEGATIVE_INFINITY };
        let bestRole = pilot.role;
        let bestResult = currentResult;

        for (const [role, result] of Object.entries(roleProfits)) {
            if (!result) continue;
            const profit = result.profit ?? Number.NEGATIVE_INFINITY;
            const baseline = bestResult.profit ?? Number.NEGATIVE_INFINITY;
            if (profit > baseline + this.roleSwitchThreshold) {
                bestRole = role;
                bestResult = result;
            }
        }

        if (bestRole === pilot.role) return;

        const lastSwitch = pilot.lastRoleSwitchMs || 0;
        if (now - lastSwitch < interval) return;

        const previousRole = pilot.role;
        const switched = this._applyPilotRole(pilot, bestRole, bestResult?.context || bestResult);
        if (switched) {
            pilot.lastRoleSwitchMs = now;
            const systemName = system.name || `System ${system.systemIndex}`;
            console.log(`PilotRegistry: ${pilot.name} switched from ${previousRole} to ${bestRole} in ${systemName}`);
        }
    }

    /**
     * Calculate profitability projections for each role using current economic conditions.
     * @param {Object} pilot - Pilot data
     * @param {StarSystem} system - Current system
     * @param {Object} economy - Station economy state
     * @param {StationEconomyRegistry} stationEconomyRegistry - Economy registry
     * @param {Galaxy} galaxyRef - Galaxy reference
     * @returns {Object|null} Role profitability map
     * @private
     */
    _calculateRoleProfits(pilot, system, economy, stationEconomyRegistry, galaxyRef) {
        const metrics = this._computeSystemRoleMetrics(pilot, system, economy, stationEconomyRegistry, galaxyRef);
        if (!metrics) return null;

        return {
            police: { profit: this._scorePolice(metrics) },
            pirate: { profit: this._scorePirate(metrics), context: metrics.bestPirateContext },
            hauler: { profit: this._scoreHauler(metrics), context: metrics.bestHaulerOpportunity },
            trader: { profit: this._scoreTrader(metrics), context: metrics.bestHaulerOpportunity },
            local_transporter: { profit: this._scoreLocalTransport(metrics), context: metrics.bestLocalCommodity },
            smuggler: { profit: this._scoreSmuggler(metrics), context: metrics.bestSmugglerOpportunity },
            bounty: { profit: this._scoreBounty(metrics) },
            miner: { profit: this._scoreMiner(metrics) }
        };
    }

    /**
     * Apply new role attributes to a pilot.
     * @param {Object} pilot - Pilot to modify
     * @param {string} newRole - Target role
     * @param {Object|null} roleContext - Contextual data (best commodity/route)
     * @returns {boolean} True if the role changed
     * @private
     */
    _applyPilotRole(pilot, newRole, roleContext) {
        if (!pilot || !newRole || pilot.role === newRole) return false;

        const newShipTypeId = this._assignShipForRole(pilot, newRole);
        const shipChanged = newShipTypeId && newShipTypeId !== pilot.shipTypeId;

        pilot.role = newRole;
        if (newShipTypeId) {
            pilot.shipTypeId = newShipTypeId;

            if (shipChanged) {
                const shipDef = SHIP_DEFINITIONS[newShipTypeId];
                if (shipDef) {
                    pilot.hull = shipDef.baseHull;
                    pilot.shields = shipDef.baseShield || 0;
                    pilot.cargoCap = shipDef.cargoCapacity || pilot.cargoCap || 20;
                }
            } else if (!pilot.cargoCap) {
                const shipDef = SHIP_DEFINITIONS[newShipTypeId];
                if (shipDef) {
                    pilot.cargoCap = shipDef.cargoCapacity || pilot.cargoCap || 20;
                }
            }
        }

        pilot.tradeFocus = this._selectTradeFocus(newRole, roleContext);

        if (newRole === 'pirate' || newRole === 'smuggler') {
            pilot.legalStatus = 'wanted';
        } else if (pilot.legalStatus !== 'clean') {
            pilot.legalStatus = 'clean';
        }

        // Reset itinerary so the pilot can plan based on the new profession
        pilot.itinerary = [];
        return true;
    }

    /**
     * Gather per-role metrics for the pilot's current system.
     * @returns {Object|null} Computed metrics
     * @private
     */
    _computeSystemRoleMetrics(pilot, system, economy, stationEconomyRegistry, galaxyRef) {
        if (!system || !economy) return null;

        const cargoCap = Math.max(5, pilot.cargoCap || 15);
        const securityFactor = this._securityLevelToFactor(system.securityLevel);
        const connectedEconomies = this._gatherConnectedEconomies(system, stationEconomyRegistry, galaxyRef);

        const metrics = {
            cargoCap,
            securityFactor,
            connectedEconomies,
            bestHaulerOpportunity: null,
            bestSmugglerOpportunity: null,
            bestLocalCommodity: null,
            localSurplusScore: 0,
            illegalDemandScore: 0,
            haulerOpportunityValue: 0,
            piratePressure: 0,
            mineralOutputValue: 0,
            bestPirateContext: null
        };

        const commodityKeys = Object.keys(economy.stock || economy.basePrice || {});
        for (const commodity of commodityKeys) {
            const priceHere = this._getCommodityPrice(economy, commodity);
            if (!priceHere) continue;

            const stockHere = economy.stock?.[commodity] ?? 0;
            const baseDemand = economy.baseDemand?.[commodity] ?? 0;

            const surplusUnits = Math.max(0, stockHere - baseDemand);
            if (surplusUnits > 0) {
                const moveableUnits = Math.min(surplusUnits, cargoCap);
                const surplusValue = moveableUnits * priceHere;
                if (!metrics.bestLocalCommodity || surplusValue > metrics.bestLocalCommodity.surplusValue) {
                    metrics.bestLocalCommodity = {
                        commodity,
                        surplusUnits: moveableUnits,
                        availableSurplus: surplusUnits,
                        unitPrice: priceHere,
                        surplusValue
                    };
                }
            }

            if (!this._isCommodityIllegal(economy, commodity) && connectedEconomies.length > 0) {
                for (const neighbor of connectedEconomies) {
                    const destPrice = this._getCommodityPrice(neighbor.economy, commodity);
                    if (!destPrice) continue;
                    const perUnitProfit = destPrice - priceHere;
                    if (perUnitProfit <= 0) continue;

                    const quantity = Math.min(stockHere, cargoCap);
                    if (quantity <= 0) continue;

                    const totalProfit = perUnitProfit * quantity;
                    if (!metrics.bestHaulerOpportunity || totalProfit > metrics.bestHaulerOpportunity.profit) {
                        metrics.bestHaulerOpportunity = {
                            commodity,
                            profit: totalProfit,
                            perUnit: perUnitProfit,
                            destSystemIndex: neighbor.systemIndex,
                            destStationId: neighbor.stationId
                        };
                    }
                }
            }

            if (this._isCommodityIllegal(economy, commodity) && connectedEconomies.length > 0) {
                for (const neighbor of connectedEconomies) {
                    if (this._isCommodityIllegal(neighbor.economy, commodity)) continue;

                    const sourcePrice = this._getCommodityPrice(neighbor.economy, commodity);
                    const destPrice = priceHere;
                    if (!sourcePrice) continue;

                    const perUnitProfit = destPrice - sourcePrice;
                    if (perUnitProfit <= 0) continue;

                    const sourceStock = neighbor.economy.stock?.[commodity] ?? 0;
                    const quantity = Math.min(sourceStock, cargoCap);
                    if (quantity <= 0) continue;

                    const totalProfit = perUnitProfit * quantity;
                    if (!metrics.bestSmugglerOpportunity || totalProfit > metrics.bestSmugglerOpportunity.profit) {
                        metrics.bestSmugglerOpportunity = {
                            commodity,
                            profit: totalProfit,
                            perUnit: perUnitProfit,
                            sourceSystemIndex: neighbor.systemIndex,
                            sourceStationId: neighbor.stationId
                        };
                    }
                }
            }
        }

        metrics.localSurplusScore = metrics.bestLocalCommodity
            ? metrics.bestLocalCommodity.availableSurplus * metrics.bestLocalCommodity.unitPrice
            : 0;
        metrics.haulerOpportunityValue = metrics.bestHaulerOpportunity ? metrics.bestHaulerOpportunity.profit : 0;
        metrics.illegalDemandScore = metrics.bestSmugglerOpportunity ? metrics.bestSmugglerOpportunity.profit : 0;

        const metalsProd = economy.productionRate?.Metals || 0;
        const mineralsProd = economy.productionRate?.Minerals || 0;
        const metalPrice = this._getCommodityPrice(economy, 'Metals');
        const mineralPrice = this._getCommodityPrice(economy, 'Minerals');
        metrics.mineralOutputValue = (metalsProd * metalPrice + mineralsProd * mineralPrice) * 10;

        metrics.piratePressure = this._clamp(
            ((metrics.haulerOpportunityValue + metrics.illegalDemandScore) / Math.max(1, cargoCap * 200)) *
            (1 - securityFactor + 0.3),
            0,
            1
        );

        metrics.bestPirateContext = metrics.haulerOpportunityValue >= metrics.illegalDemandScore
            ? metrics.bestHaulerOpportunity
            : metrics.bestSmugglerOpportunity;

        return metrics;
    }

    _scorePolice(metrics) {
        const baseSalary = 1200;
        const riskBonus = (1 - metrics.securityFactor) * 600;
        const pirateBonus = metrics.piratePressure * 800;
        return baseSalary + riskBonus + pirateBonus;
    }

    _scorePirate(metrics) {
        const lootPotential = (metrics.haulerOpportunityValue * 0.7) + (metrics.illegalDemandScore * 0.5);
        const riskMultiplier = 1 + (1 - metrics.securityFactor);
        return lootPotential > 0 ? 500 + lootPotential * riskMultiplier : 0;
    }

    _scoreHauler(metrics) {
        if (!metrics.bestHaulerOpportunity) return 0;
        const safeMultiplier = 0.5 + metrics.securityFactor;
        return metrics.haulerOpportunityValue * safeMultiplier;
    }

    _scoreTrader(metrics) {
        if (!metrics.bestHaulerOpportunity) return 0;
        return 700 + metrics.haulerOpportunityValue * 0.45;
    }

    _scoreLocalTransport(metrics) {
        const best = metrics.bestLocalCommodity;
        if (!best) return 0;

        const minContractUnits = Math.max(6, metrics.cargoCap * 0.5);
        if (best.availableSurplus < minContractUnits) {
            return 180 + best.surplusValue * 0.06;
        }

        const perUnitReward = Math.min(best.unitPrice * 0.08, 45);
        const contractUnits = Math.min(best.availableSurplus, metrics.cargoCap);
        const contractValue = contractUnits * perUnitReward;
        const lowSecurityBonus = (1 - metrics.securityFactor) * 220;

        return 280 + contractValue + lowSecurityBonus;
    }

    _scoreSmuggler(metrics) {
        if (!metrics.bestSmugglerOpportunity) return 0;
        const riskMultiplier = 1 + (1 - metrics.securityFactor) * 0.7;
        return 600 + metrics.illegalDemandScore * riskMultiplier;
    }

    _scoreBounty(metrics) {
        const base = 800;
        return base + metrics.piratePressure * 900;
    }

    _scoreMiner(metrics) {
        return metrics.mineralOutputValue > 0 ? 500 + metrics.mineralOutputValue * 0.4 : 400;
    }

    _gatherConnectedEconomies(system, stationEconomyRegistry, galaxyRef) {
        if (!system || !Array.isArray(system.connectedSystemIndices)) return [];
        const results = [];
        for (const idx of system.connectedSystemIndices) {
            const neighbor = galaxyRef.systems?.[idx];
            if (!neighbor || !neighbor.station) continue;
            const stationId = neighbor.station.name;
            const economy = stationEconomyRegistry.getEconomy(stationId);
            if (!economy) continue;
            results.push({ systemIndex: idx, stationId, economy });
        }
        return results;
    }

    _getCommodityPrice(economy, commodity) {
        if (!economy) return 0;
        if (economy.currentPrices && economy.currentPrices[commodity] != null) {
            return economy.currentPrices[commodity];
        }
        if (economy.basePrice && economy.basePrice[commodity] != null) {
            return economy.basePrice[commodity];
        }
        return 0;
    }

    _isCommodityIllegal(economy, commodity) {
        if (!economy || !economy.illegal) return false;
        const illegal = economy.illegal;
        if (illegal instanceof Set) return illegal.has(commodity);
        if (Array.isArray(illegal)) return illegal.includes(commodity);
        if (typeof illegal === 'object') return Boolean(illegal[commodity]);
        return false;
    }

    _securityLevelToFactor(securityLevel) {
        if (!securityLevel || typeof securityLevel !== 'string') return 0.6;
        const value = securityLevel.toLowerCase();
        if (value.includes('anarchy')) return 0.1;
        if (value.includes('low')) return 0.35;
        if (value.includes('high')) return 0.85;
        if (value.includes('military')) return 0.9;
        return 0.6; // Medium/default
    }

    _clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
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

    _updateBountySystem(galaxyRef) {
        const now = Date.now();
        if (now - this.lastBountySweepMs < this.bountySweepIntervalMs) return;
        this.lastBountySweepMs = now;

        if (!galaxyRef || !Array.isArray(galaxyRef.systems)) return;

        const candidateMap = new Map();

        for (const pilot of this.pilots) {
            if (!pilot) continue;

            if (!pilot.alive) {
                if (pilot.hasActiveBounty) {
                    this._clearBountyForTarget(`pilot:${pilot.id}`);
                }
                continue;
            }

            pilot.notoriety = this._calculatePilotNotoriety(pilot);
            if (this._shouldIssueBounty(pilot, pilot.notoriety)) {
                const key = `pilot:${pilot.id}`;
                candidateMap.set(key, {
                    key,
                    targetType: 'pilot',
                    pilot,
                    notoriety: pilot.notoriety
                });
            }
        }

        const playerCandidate = this._evaluatePlayerForBounty(galaxyRef);
        if (playerCandidate) {
            candidateMap.set(playerCandidate.key, playerCandidate);
        }

        for (const key of Array.from(this.activeBounties.keys())) {
            if (!candidateMap.has(key)) {
                this._clearBountyForTarget(key);
            }
        }

        const ranked = Array.from(candidateMap.values())
            .sort((a, b) => b.notoriety - a.notoriety)
            .slice(0, this.maxTrackedBounties);

        const rankedKeys = new Set(ranked.map(entry => entry.key));
        for (const key of Array.from(this.activeBounties.keys())) {
            if (!rankedKeys.has(key)) {
                this._clearBountyForTarget(key);
            }
        }

        for (const entry of ranked) {
            const existing = this.activeBounties.get(entry.key);
            if (existing) {
                this._refreshBounty(existing, entry, galaxyRef);
            } else {
                const bounty = this._createBounty(entry, galaxyRef);
                if (bounty) {
                    this.activeBounties.set(entry.key, bounty);
                }
            }
        }
    }

    _refreshBounty(bounty, entry, galaxyRef) {
        bounty.notoriety = entry.notoriety;
        bounty.value = this._calculateBountyValue(entry.notoriety);
        bounty.lastKnownSystemIndex = this._resolveTargetSystemIndex(entry, galaxyRef, bounty.lastKnownSystemIndex);

        if (entry.targetType === 'pilot' && entry.pilot) {
            entry.pilot.hasActiveBounty = true;
            entry.pilot.bountyPayout = bounty.value;
        }

        this._ensureHuntersForBounty(bounty, galaxyRef);
    }

    _createBounty(entry, galaxyRef) {
        if (!entry) return null;

        const now = Date.now();
        const lastKnownSystemIndex = this._resolveTargetSystemIndex(entry, galaxyRef, 0);
        const bounty = {
            id: `bnty_${now}_${Math.floor(Math.random() * 1000)}`,
            targetKey: entry.key,
            targetType: entry.targetType,
            targetPilotId: entry.targetType === 'pilot' ? entry.pilot.id : null,
            targetName: entry.targetType === 'pilot' ? (entry.pilot.name || `Pilot ${entry.pilot.id}`) : (entry.name || 'Commander'),
            notoriety: entry.notoriety,
            value: this._calculateBountyValue(entry.notoriety),
            issuedAt: now,
            lastKnownSystemIndex,
            hunterIds: new Set()
        };

        if (entry.targetType === 'pilot' && entry.pilot) {
            entry.pilot.hasActiveBounty = true;
            entry.pilot.bountyPayout = bounty.value;
        }

        this._ensureHuntersForBounty(bounty, galaxyRef);
        return bounty;
    }

    _ensureHuntersForBounty(bounty, galaxyRef) {
        if (!bounty) return;

        const targetEntry = bounty.targetType === 'pilot'
            ? { targetType: 'pilot', pilot: this.getPilotById(bounty.targetPilotId), notoriety: bounty.notoriety }
            : { targetType: 'player', systemIndex: this._getPlayerSystemIndex(galaxyRef, bounty.lastKnownSystemIndex), notoriety: bounty.notoriety };

        if (targetEntry.targetType === 'pilot' && (!targetEntry.pilot || !targetEntry.pilot.alive)) {
            return;
        }

        bounty.lastKnownSystemIndex = this._resolveTargetSystemIndex(targetEntry, galaxyRef, bounty.lastKnownSystemIndex);

        const validHunterIds = new Set();
        if (bounty.hunterIds && bounty.hunterIds.size > 0) {
            for (const hunterId of bounty.hunterIds) {
                const hunter = this.getPilotById(hunterId);
                if (hunter && hunter.alive) {
                    hunter.currentSystemIndex = bounty.lastKnownSystemIndex;
                    hunter.dockedStationId = null;
                    hunter.pos = null;
                    hunter.bountyPayout = bounty.value;
                    hunter.bountyContractId = bounty.id;
                    hunter.bountyTargetId = bounty.targetPilotId;
                    hunter.bountyTargetType = bounty.targetType;
                    hunter.isBountyHunter = true;
                    validHunterIds.add(hunterId);
                    this.bountyHunterIds.add(hunterId);
                } else {
                    this.bountyHunterIds.delete(hunterId);
                }
            }
        }
        bounty.hunterIds = validHunterIds;

        while (bounty.hunterIds.size < this.maxHuntersPerBounty) {
            const hunter = this._spawnBountyHunter(bounty, galaxyRef);
            if (!hunter) break;
            bounty.hunterIds.add(hunter.id);
            this.bountyHunterIds.add(hunter.id);
        }
    }

    _spawnBountyHunter(bounty, galaxyRef) {
        const targetSystemIndex = bounty.lastKnownSystemIndex;
        if (targetSystemIndex === undefined || targetSystemIndex === null) return null;

        const shipTypeId = this._assignShipForRole({ shipTypeId: null }, 'bounty') || 'Viper';
        const shipDef = SHIP_DEFINITIONS[shipTypeId];
        const now = Date.now();
        const pilot = {
            id: this.nextPilotId++,
            name: this._generatePilotName(),
            factionId: null,
            role: 'bounty',
            shipTypeId,
            hull: shipDef ? shipDef.baseHull : 100,
            shields: shipDef ? (shipDef.baseShield || 0) : 0,
            currentSystemIndex: targetSystemIndex,
            dockedStationId: null,
            pos: null,
            itinerary: [],
            cargo: {},
            cargoCap: shipDef ? (shipDef.cargoCapacity || 20) : 20,
            credits: random(20000, 60000),
            legalStatus: 'clean',
            riskTolerance: random(0.6, 0.95),
            tradeFocus: null,
            missionIds: [],
            lastUpdateMs: now,
            alive: true,
            lastRoleEvaluationMs: now,
            lastRoleSwitchMs: now,
            kills: 0,
            notoriety: 0,
            hasActiveBounty: false,
            bountyContractId: bounty.id,
            bountyTargetId: bounty.targetPilotId,
            bountyTargetType: bounty.targetType,
            bountyPayout: bounty.value,
            isBountyHunter: true
        };

        this.pilots.push(pilot);
        return pilot;
    }

    _calculateBountyValue(notoriety) {
        return Math.max(500, Math.round(notoriety * this.bountyPayoutMultiplier));
    }

    _calculatePilotNotoriety(pilot) {
        if (!pilot) return 0;
        const creditsScore = (pilot.credits || 0) / 2000;
        const killScore = (pilot.kills || 0) * 80;
        const roleBonus = (pilot.role === 'pirate') ? 220 : (pilot.role === 'smuggler' ? 140 : 0);
        const wantedBonus = pilot.legalStatus === 'wanted' ? 180 : 0;
        const eventBonus = pilot.isEventSpawn ? 60 : 0;
        return Math.round(creditsScore + killScore + roleBonus + wantedBonus + eventBonus);
    }

    _shouldIssueBounty(pilot, notoriety) {
        if (!pilot) return false;
        if (notoriety < this.bountyNotorietyThreshold) return false;
        const isCriminal = pilot.legalStatus === 'wanted' || pilot.role === 'pirate' || pilot.role === 'smuggler';
        return isCriminal;
    }

    _evaluatePlayerForBounty(galaxyRef) {
        if (typeof player === 'undefined' || !player) return null;

        const pseudoPilot = {
            credits: player.credits || 0,
            kills: player.kills || 0,
            role: player.isWanted ? 'pirate' : 'trader',
            legalStatus: player.isWanted ? 'wanted' : 'clean',
            isEventSpawn: false
        };

        const notoriety = this._calculatePilotNotoriety(pseudoPilot);
        const isCriminal = player.isWanted || pseudoPilot.kills >= 24;
        if (!isCriminal || notoriety < this.bountyNotorietyThreshold) return null;

        const systemIndex = this._getPlayerSystemIndex(galaxyRef, 0);

        return {
            key: 'player',
            targetType: 'player',
            notoriety,
            name: 'Commander',
            systemIndex
        };
    }

    _resolveTargetSystemIndex(entry, galaxyRef, fallback = 0) {
        if (!entry) return fallback;
        if (entry.targetType === 'pilot' && entry.pilot) {
            return entry.pilot.currentSystemIndex ?? fallback;
        }
        if (entry.targetType === 'player') {
            return entry.systemIndex ?? this._getPlayerSystemIndex(galaxyRef, fallback);
        }
        return fallback;
    }

    _getPlayerSystemIndex(galaxyRef, fallback = 0) {
        if (typeof player !== 'undefined' && player?.currentSystem?.systemIndex != null) {
            return player.currentSystem.systemIndex;
        }
        if (galaxyRef && typeof galaxyRef.currentSystemIndex === 'number') {
            return galaxyRef.currentSystemIndex;
        }
        return fallback;
    }

    _clearBountyForTarget(key) {
        const bounty = this.activeBounties.get(key);
        if (!bounty) return;

        if (bounty.targetType === 'pilot' && bounty.targetPilotId != null) {
            const targetPilot = this.getPilotById(bounty.targetPilotId);
            if (targetPilot) {
                targetPilot.hasActiveBounty = false;
                targetPilot.bountyPayout = null;
            }
        }

        if (bounty.hunterIds && bounty.hunterIds.size > 0) {
            for (const hunterId of bounty.hunterIds) {
                const hunter = this.getPilotById(hunterId);
                if (hunter) {
                    hunter.bountyContractId = null;
                    hunter.bountyTargetId = null;
                    hunter.bountyTargetType = null;
                    hunter.bountyPayout = null;
                    hunter.isBountyHunter = false;
                    hunter.alive = false;
                }
                this.bountyHunterIds.delete(hunterId);
            }
        }

        this.activeBounties.delete(key);
    }

    updateLivePilotPosition(pilotId, systemIndex, pos) {
        if (pilotId == null || !pos) return;

        const pilot = this.getPilotById(pilotId);
        if (!pilot || !pilot.alive) return;

        if (systemIndex != null) {
            pilot.currentSystemIndex = systemIndex;
        }

        pilot.dockedStationId = null;
        if (!pilot.pos) {
            pilot.pos = { x: pos.x, y: pos.y };
        } else {
            pilot.pos.x = pos.x;
            pilot.pos.y = pos.y;
        }
        pilot.lastUpdateMs = Date.now();
    }

    /**
     * Get all pilots in a specific system.
     * @param {number} systemIndex - System index to query
     * @returns {Array} Array of pilots in that system
     */
    getPilotsInSystem(systemIndex) {
        return this.pilots.filter(p => {
            if (!p || !p.alive) return false;
            if (p.currentSystemIndex !== systemIndex) return false;

            if (p.role === 'bounty' && p.isBountyHunter) {
                return this._hunterShouldSpawnInSystem(p, systemIndex);
            }

            return true;
        });
    }

    _hunterShouldSpawnInSystem(hunter, systemIndex) {
        if (!hunter?.bountyContractId) return false;
        const bounty = this._findBountyById(hunter.bountyContractId);
        if (!bounty) return false;
        if (bounty.lastKnownSystemIndex !== systemIndex) return false;

        if (bounty.targetType === 'player') {
            return true;
        }

        const target = this.getPilotById(bounty.targetPilotId);
        return Boolean(target && target.alive && target.currentSystemIndex === systemIndex);
    }

    getPilotById(pilotId) {
        if (pilotId == null) return null;
        return this.pilots.find(p => p.id === pilotId) || null;
    }

    getActiveBounties(options = {}) {
        const { includePlayer = false } = options;
        const result = [];
        for (const bounty of this.activeBounties.values()) {
            if (!includePlayer && bounty.targetType === 'player') continue;
            result.push({
                id: bounty.id,
                targetKey: bounty.targetKey,
                targetType: bounty.targetType,
                targetPilotId: bounty.targetPilotId,
                targetName: bounty.targetName,
                notoriety: bounty.notoriety,
                value: bounty.value,
                lastKnownSystemIndex: bounty.lastKnownSystemIndex,
                hunterCount: bounty.hunterIds ? bounty.hunterIds.size : 0
            });
        }
        return result.sort((a, b) => b.value - a.value);
    }

    _findBountyById(bountyId) {
        if (!bountyId) return null;
        for (const bounty of this.activeBounties.values()) {
            if (bounty.id === bountyId) {
                return bounty;
            }
        }
        return null;
    }

    getBountyById(bountyId) {
        return this._findBountyById(bountyId);
    }

    resolveBountyForTarget(targetType, targetId = null) {
        const key = targetType === 'player' ? 'player' : `pilot:${targetId}`;
        this._clearBountyForTarget(key);
    }

    /**
     * Get save data for persistence.
     * @returns {Object} Compact save data
     */
    getSaveData() {
        return {
            pilots: this.pilots.map(p => ({
                id: p.id,
                name: p.name,
                factionId: p.factionId ?? null,
                role: p.role,
                shipTypeId: p.shipTypeId,
                hull: p.hull,
                shields: p.shields,
                currentSystemIndex: p.currentSystemIndex,
                dockedStationId: p.dockedStationId,
                itinerary: Array.isArray(p.itinerary) ? [...p.itinerary] : [],
                cargo: p.cargo || {},
                cargoCap: p.cargoCap,
                credits: p.credits,
                legalStatus: p.legalStatus,
                pos: p.pos ? { x: p.pos.x, y: p.pos.y } : null,
                riskTolerance: p.riskTolerance,
                tradeFocus: p.tradeFocus,
                missionIds: Array.isArray(p.missionIds) ? [...p.missionIds] : [],
                alive: p.alive,
                lastRoleEvaluationMs: p.lastRoleEvaluationMs,
                lastRoleSwitchMs: p.lastRoleSwitchMs,
                isEventSpawn: Boolean(p.isEventSpawn),
                spawnSource: p.spawnSource || null,
                kills: p.kills || 0,
                notoriety: p.notoriety || 0,
                hasActiveBounty: Boolean(p.hasActiveBounty),
                bountyContractId: p.bountyContractId || null,
                bountyTargetId: p.bountyTargetId ?? null,
                bountyTargetType: p.bountyTargetType || null,
                bountyPayout: p.bountyPayout ?? null,
                isBountyHunter: Boolean(p.isBountyHunter)
            })),
            nextPilotId: this.nextPilotId,
            activeBounties: Array.from(this.activeBounties.values()).map(b => ({
                id: b.id,
                targetKey: b.targetKey,
                targetType: b.targetType,
                targetPilotId: b.targetPilotId ?? null,
                targetName: b.targetName,
                notoriety: b.notoriety,
                value: b.value,
                issuedAt: b.issuedAt,
                lastKnownSystemIndex: b.lastKnownSystemIndex,
                hunterIds: Array.from(b.hunterIds || [])
            })),
            bountyHunterIds: Array.from(this.bountyHunterIds)
        };
    }

    /**
     * Load from save data.
     * @param {Object} data - Save data
     */
    loadSaveData(data) {
        if (!data || !Array.isArray(data.pilots)) return;

        const now = Date.now();

        this.pilots = data.pilots.map(p => {
            const shipDef = p.shipTypeId ? SHIP_DEFINITIONS[p.shipTypeId] : null;
            return {
                id: p.id,
                name: p.name,
                factionId: p.factionId ?? null,
                role: p.role,
                shipTypeId: p.shipTypeId,
                hull: p.hull ?? (shipDef ? shipDef.baseHull : 100),
                shields: p.shields ?? (shipDef ? (shipDef.baseShield || 0) : 0),
                currentSystemIndex: p.currentSystemIndex ?? 0,
                dockedStationId: p.dockedStationId ?? null,
                pos: p.pos ? { x: p.pos.x, y: p.pos.y } : null,
                itinerary: Array.isArray(p.itinerary) ? [...p.itinerary] : [],
                cargo: p.cargo ? { ...p.cargo } : {},
                cargoCap: p.cargoCap ?? (shipDef ? (shipDef.cargoCapacity || 20) : 20),
                credits: p.credits ?? 0,
                legalStatus: p.legalStatus || 'clean',
                riskTolerance: p.riskTolerance ?? 0.5,
                tradeFocus: p.tradeFocus ?? null,
                missionIds: Array.isArray(p.missionIds) ? [...p.missionIds] : [],
                lastUpdateMs: now,
                alive: p.alive !== false,
                lastRoleEvaluationMs: p.lastRoleEvaluationMs ?? now,
                lastRoleSwitchMs: p.lastRoleSwitchMs ?? now,
                isEventSpawn: Boolean(p.isEventSpawn),
                spawnSource: p.spawnSource || null,
                kills: p.kills || 0,
                notoriety: p.notoriety || 0,
                hasActiveBounty: Boolean(p.hasActiveBounty),
                bountyContractId: p.bountyContractId || null,
                bountyTargetId: p.bountyTargetId ?? null,
                bountyTargetType: p.bountyTargetType || null,
                bountyPayout: p.bountyPayout ?? null,
                isBountyHunter: Boolean(p.isBountyHunter)
            };
        });

        this._ensurePilotNamesUnique();

        this.nextPilotId = data.nextPilotId || (this.pilots.reduce((maxId, pilot) => Math.max(maxId, pilot.id || 0), 0) + 1);
        this.updateIndex = 0;

        this.activeBounties = new Map();
        this.bountyHunterIds = new Set(Array.isArray(data.bountyHunterIds) ? data.bountyHunterIds : []);

        if (Array.isArray(data.activeBounties)) {
            for (const entry of data.activeBounties) {
                const bounty = {
                    id: entry.id,
                    targetKey: entry.targetKey,
                    targetType: entry.targetType,
                    targetPilotId: entry.targetPilotId ?? null,
                    targetName: entry.targetName,
                    notoriety: entry.notoriety || 0,
                    value: entry.value || 0,
                    issuedAt: entry.issuedAt || now,
                    lastKnownSystemIndex: entry.lastKnownSystemIndex ?? 0,
                    hunterIds: new Set()
                };

                const recordedHunterIds = Array.isArray(entry.hunterIds) ? entry.hunterIds : [];
                for (const hunterId of recordedHunterIds) {
                    const hunter = this.getPilotById(hunterId);
                    if (!hunter || !hunter.alive) {
                        this.bountyHunterIds.delete(hunterId);
                        continue;
                    }

                    hunter.isBountyHunter = true;
                    hunter.bountyContractId = bounty.id;
                    hunter.bountyTargetId = bounty.targetPilotId;
                    hunter.bountyTargetType = bounty.targetType;
                    hunter.bountyPayout = bounty.value;

                    bounty.hunterIds.add(hunterId);
                    this.bountyHunterIds.add(hunterId);
                }

                this.activeBounties.set(bounty.targetKey, bounty);

                if (bounty.targetType === 'pilot' && bounty.targetPilotId != null) {
                    const targetPilot = this.getPilotById(bounty.targetPilotId);
                    if (targetPilot) {
                        targetPilot.hasActiveBounty = true;
                        targetPilot.bountyPayout = bounty.value;
                    }
                }
            }
        }

        this.lastBountySweepMs = now;

        console.log(`PilotRegistry: Loaded ${this.pilots.length} pilots from save (bounties: ${this.activeBounties.size})`);
    }
}
