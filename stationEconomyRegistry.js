// ****** stationEconomyRegistry.js ******

/**
 * StationEconomyRegistry manages dynamic economy for all stations.
 * Tracks stock, production, consumption, and calculates dynamic prices.
 */
class StationEconomyRegistry {
    constructor() {
        this.economies = new Map(); // Map<stationId, economyState>
        this.updateIndex = 0;
        this.stationIds = []; // For round-robin updates
    }

    /**
     * Initialize economy state for all stations in the galaxy.
     * @param {Galaxy} galaxyRef - Reference to galaxy
     */
    initializeEconomies(galaxyRef) {
        if (!galaxyRef || !galaxyRef.systems) {
            console.warn('StationEconomyRegistry: Cannot initialize without valid galaxy');
            return;
        }

        console.log('StationEconomyRegistry: Initializing station economies...');

        galaxyRef.systems.forEach((system, systemIndex) => {
            if (system.station) {
                const stationId = system.station.name;
                const economy = this._createEconomyState(stationId, system.economyType, systemIndex);
                this.economies.set(stationId, economy);
                this.stationIds.push(stationId);
            }
        });

        console.log(`StationEconomyRegistry: Initialized ${this.economies.size} station economies`);
    }

    /**
     * Create initial economy state for a station.
     * @param {string} stationId - Station identifier
     * @param {string} economyType - System economy type
     * @param {number} systemIndex - System index
     * @returns {Object} Economy state object
     */
    _createEconomyState(stationId, economyType, systemIndex) {
        // Define all commodities
        const commodities = [
            'Food', 'Textiles', 'Machinery', 'Metals', 'Minerals', 'Chemicals',
            'Computers', 'Medicine', 'Adv Components', 'Luxury Goods',
            'Narcotics', 'Weapons', 'Slaves'
        ];

        const stock = {};
        const basePrice = {};
        const baseDemand = {};
        const productionRate = {};
        const consumptionRate = {};
        const elasticity = {};
        const illegal = new Set();

        // Base prices (from market.js)
        const basePrices = {
            'Food': 10, 'Textiles': 15, 'Machinery': 100, 'Metals': 50, 'Minerals': 40,
            'Chemicals': 70, 'Computers': 250, 'Medicine': 150, 'Adv Components': 400,
            'Luxury Goods': 500, 'Narcotics': 800, 'Weapons': 1200, 'Slaves': 1500
        };

        // Illegal goods (except in Anarchy systems)
        if (economyType !== 'Anarchy') {
            illegal.add('Narcotics');
            illegal.add('Weapons');
            illegal.add('Slaves');
        }

        commodities.forEach(comm => {
            // Initialize stock to moderate levels
            stock[comm] = random(50, 200);
            basePrice[comm] = basePrices[comm] || 100;
            baseDemand[comm] = 100; // Units per "day" (abstract time unit)
            
            // Set production/consumption based on economy type
            const rates = this._getProductionConsumptionRates(comm, economyType);
            productionRate[comm] = rates.production;
            consumptionRate[comm] = rates.consumption;
            
            // Elasticity: how sensitive price is to supply/demand ratio
            elasticity[comm] = 0.5; // Default moderate elasticity
        });

        return {
            stationId,
            systemIndex,
            economyType,
            stock,
            basePrice,
            baseDemand,
            productionRate,
            consumptionRate,
            elasticity,
            illegal,
            lastUpdateMs: Date.now(),
            currentPrices: {} // Computed dynamically
        };
    }

    /**
     * Get production and consumption rates for a commodity based on economy type.
     * @param {string} commodity - Commodity name
     * @param {string} economyType - System economy type
     * @returns {Object} {production, consumption} rates per abstract time unit
     */
    _getProductionConsumptionRates(commodity, economyType) {
        let production = 0;
        let consumption = 0;

        // Default consumption for all systems
        consumption = 1.0;

        switch (economyType) {
            case 'Agricultural':
                if (['Food', 'Textiles'].includes(commodity)) {
                    production = 5.0;
                    consumption = 0.5;
                } else if (['Machinery', 'Chemicals', 'Medicine', 'Computers'].includes(commodity)) {
                    production = 0;
                    consumption = 2.0;
                }
                break;

            case 'Industrial':
                if (commodity === 'Machinery') {
                    production = 4.0;
                    consumption = 0.5;
                } else if (['Food', 'Metals', 'Minerals', 'Chemicals'].includes(commodity)) {
                    production = 0;
                    consumption = 2.5;
                } else if (['Computers', 'Adv Components'].includes(commodity)) {
                    production = 2.0;
                    consumption = 1.0;
                }
                break;

            case 'Mining':
                if (['Metals', 'Minerals'].includes(commodity)) {
                    production = 6.0;
                    consumption = 0.3;
                } else if (['Food', 'Machinery'].includes(commodity)) {
                    consumption = 2.0;
                }
                break;

            case 'Refinery':
                if (['Chemicals', 'Adv Components'].includes(commodity)) {
                    production = 3.0;
                    consumption = 1.0;
                } else if (['Metals', 'Minerals'].includes(commodity)) {
                    production = 0;
                    consumption = 3.0;
                }
                break;

            case 'Tourism':
                if (['Luxury Goods', 'Food'].includes(commodity)) {
                    production = 0;
                    consumption = 3.0;
                }
                break;

            case 'Post Human':
                if (['Computers', 'Medicine', 'Adv Components'].includes(commodity)) {
                    production = 4.0;
                    consumption = 0.5;
                }
                break;

            case 'Military':
                if (['Weapons', 'Machinery'].includes(commodity)) {
                    production = 3.0;
                    consumption = 1.0;
                } else if (['Food', 'Medicine'].includes(commodity)) {
                    consumption = 2.0;
                }
                break;

            default:
                // Standard economy
                production = 1.0;
                consumption = 1.0;
        }

        return { production, consumption };
    }

    /**
     * Update stock levels and prices for a limited number of stations (budgeted).
     * @param {number} budget - Max stations to update this call
     * @param {number} dtMs - Delta time in milliseconds
     */
    updateSome(budget, dtMs) {
        if (this.stationIds.length === 0) return;

        const dtSec = dtMs / 1000.0;
        let updated = 0;

        while (updated < budget && updated < this.stationIds.length) {
            const stationId = this.stationIds[this.updateIndex];
            const economy = this.economies.get(stationId);
            
            if (economy) {
                this._updateEconomy(economy, dtSec);
            }

            this.updateIndex = (this.updateIndex + 1) % this.stationIds.length;
            updated++;
        }
    }

    /**
     * Update a single station's economy.
     * @param {Object} economy - Economy state
     * @param {number} dtSec - Delta time in seconds
     */
    _updateEconomy(economy, dtSec) {
        economy.lastUpdateMs = Date.now();

        // Update stocks based on production and consumption
        for (const comm in economy.stock) {
            const prod = economy.productionRate[comm] || 0;
            const cons = economy.consumptionRate[comm] || 0;
            
            // Scale by time: rates are per abstract "day", scale to actual time
            const timeScale = dtSec / 60.0; // Assume 60 sec = 1 abstract day
            economy.stock[comm] += (prod - cons) * timeScale;
            
            // Clamp stock to reasonable bounds
            economy.stock[comm] = Math.max(0, Math.min(economy.stock[comm], 1000));
        }

        // Recalculate prices
        this._updatePrices(economy);
    }

    /**
     * Calculate dynamic prices based on supply and demand.
     * Uses elastic demand formula: p = p0 * (D / S)^ε
     * @param {Object} economy - Economy state
     */
    _updatePrices(economy) {
        const eps = 0.01; // Small value to prevent division by zero
        const rMin = 0.25; // Minimum price ratio
        const rMax = 4.0;  // Maximum price ratio

        for (const comm in economy.stock) {
            const p0 = economy.basePrice[comm];
            const S = Math.max(economy.stock[comm], eps);
            const D = economy.baseDemand[comm] || 100;
            const e = economy.elasticity[comm] || 0.5;

            // Calculate ratio and clamp
            const ratio = Math.max(rMin, Math.min(rMax, D / S));
            
            // Apply elasticity
            const targetPrice = p0 * Math.pow(ratio, e);

            // Store computed price (could add smoothing here)
            economy.currentPrices[comm] = Math.round(targetPrice);
        }
    }

    /**
     * Get current price for a commodity at a station.
     * @param {string} stationId - Station identifier
     * @param {string} commodity - Commodity name
     * @returns {number} Current price or base price if not found
     */
    getPrice(stationId, commodity) {
        const economy = this.economies.get(stationId);
        if (!economy) return 0;

        // Return current dynamic price if available, else base price
        return economy.currentPrices[commodity] || economy.basePrice[commodity] || 0;
    }

    /**
     * Get current stock for a commodity at a station.
     * @param {string} stationId - Station identifier
     * @param {string} commodity - Commodity name
     * @returns {number} Current stock level
     */
    getStock(stationId, commodity) {
        const economy = this.economies.get(stationId);
        if (!economy) return 0;
        return economy.stock[commodity] || 0;
    }

    /**
     * Process a trade transaction (buy/sell).
     * @param {string} stationId - Station identifier
     * @param {string} commodity - Commodity name
     * @param {number} quantity - Amount traded (positive = buy from station, negative = sell to station)
     * @returns {boolean} True if trade was successful
     */
    processTrade(stationId, commodity, quantity) {
        const economy = this.economies.get(stationId);
        if (!economy) return false;

        // Check if commodity is illegal
        if (economy.illegal.has(commodity)) {
            console.warn(`Trade denied: ${commodity} is illegal at ${stationId}`);
            return false;
        }

        // Update stock
        economy.stock[commodity] = Math.max(0, (economy.stock[commodity] || 0) - quantity);
        
        // Recalculate prices immediately after trade
        this._updatePrices(economy);
        
        return true;
    }

    /**
     * Get economy state for a station (for debugging/UI).
     * @param {string} stationId - Station identifier
     * @returns {Object|null} Economy state or null
     */
    getEconomy(stationId) {
        return this.economies.get(stationId) || null;
    }

    /**
     * Get save data for persistence.
     * @returns {Object} Compact save data (only deltas from defaults)
     */
    getSaveData() {
        const data = {};
        
        this.economies.forEach((economy, stationId) => {
            // Only save stock levels (other values can be regenerated)
            data[stationId] = {
                stock: { ...economy.stock },
                lastUpdateMs: economy.lastUpdateMs
            };
        });

        return data;
    }

    /**
     * Load from save data.
     * @param {Object} data - Save data
     * @param {Galaxy} galaxyRef - Galaxy reference for re-initialization
     */
    loadSaveData(data, galaxyRef) {
        if (!data) return;

        // Re-initialize base structure
        this.initializeEconomies(galaxyRef);

        // Apply saved stock levels
        for (const stationId in data) {
            const economy = this.economies.get(stationId);
            if (economy && data[stationId].stock) {
                economy.stock = { ...data[stationId].stock };
                economy.lastUpdateMs = data[stationId].lastUpdateMs || Date.now();
                this._updatePrices(economy); // Recalculate prices
            }
        }

        console.log(`StationEconomyRegistry: Loaded economy data for ${Object.keys(data).length} stations`);
    }
}
