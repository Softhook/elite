// ****** enemyCargo.js ******
// Enemy Cargo Handling Methods - Stage 8
// Contains cargo spawn, jettison, drop, and detection methods

// NPC trade heuristics help haulers react to station prices instead of dumping stock blindly.
// NOTE: NPCs sell TO station (use station buyPrice), buy FROM station (use station sellPrice/buyPrice)
const NPC_TRADE_RULES = {
    // Selling thresholds (NPC → Station, compare station's buyPrice to base)
    SELL_FULL_RATIO: 0.95,          // >=95% of base -> good deal, unload full stack
    SELL_PARTIAL_RATIO: 0.85,       // 85%-95% of base -> acceptable, unload fraction
    SELL_PARTIAL_FRACTION: 0.5,     // Sell half when in partial range
    SELL_MIN_RATIO: 0.70,           // Below 70% of base -> hold cargo, price too low

    // Buying thresholds (Station → NPC, compare station's buyPrice to base)
    BUY_MAX_RATIO: 1.05,            // Don't buy above 105% of base price
    BUY_IDEAL_RATIO: 0.90,          // At/below 90% of base -> strong buy signal
    BUY_PARTIAL_FRACTION: 0.6,      // When price near base, buy smaller lots
    BUY_BULK_MULTIPLIER: 1.4        // When deeply discounted, increase purchase size
};

/**
 * EnemyCargo class contains cargo-related methods for enemies.
 * These methods are mixed into the Enemy prototype via applyEnemyCargoMethods().
 */
class EnemyCargo {

    initializeCargoInventory(shipDef) {
        this.cargoHold = Array.isArray(this.cargoHold) ? this.cargoHold : [];
        this.cargoCapacity = shipDef?.cargoCapacity || this.cargoCapacity || 0;

        if (!this.cargoCapacity) { return; }

        const pool = Array.isArray(shipDef?.typicalCargo) ? shipDef.typicalCargo.filter(Boolean) : [];

        let startingLoad = 0;
        switch (this.role) {
            case AI_ROLE.HAULER:
                startingLoad = Math.floor(this.cargoCapacity * random(0.5, 0.85));
                break;
            case AI_ROLE.TRANSPORT:
                startingLoad = Math.floor(this.cargoCapacity * random(0.3, 0.6));
                break;
            case AI_ROLE.PIRATE:
            case AI_ROLE.ALIEN:
            case AI_ROLE.POLICE:
            case AI_ROLE.GUARD:
            case AI_ROLE.BOUNTY_HUNTER:
            case AI_ROLE.MINER:
                startingLoad = 0;
                break;
            default:
                startingLoad = pool.length > 0 ? Math.floor(this.cargoCapacity * random(0.2, 0.5)) : 0;
                break;
        }

        // Start Pirates and Police with a little food
        if (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.POLICE) {
            this.addCargo('Food', Math.floor(random(5)));
        }

        startingLoad = Math.max(0, Math.min(this.cargoCapacity, startingLoad));

        if (startingLoad <= 0 || pool.length === 0) { return; }

        this._loadCargoFromOptions(pool, startingLoad);
    }

    getCargoAmount() {
        if (!Array.isArray(this.cargoHold)) { return 0; }
        return this.cargoHold.reduce((sum, item) => sum + (item?.quantity || 0), 0);
    }

    getRemainingCargoCapacity() {
        return Math.max(0, (this.cargoCapacity || 0) - this.getCargoAmount());
    }

    addCargo(commodityName, quantity, allowPartial = false) {
        if (!commodityName || !quantity || quantity <= 0) {
            return { success: false, added: 0 };
        }

        const spaceRemaining = this.getRemainingCargoCapacity();
        if (spaceRemaining <= 0) {
            return { success: false, added: 0 };
        }

        let amountToAdd = Math.floor(quantity);
        if (amountToAdd > spaceRemaining) {
            if (allowPartial) {
                amountToAdd = spaceRemaining;
            } else {
                return { success: false, added: 0 };
            }
        }

        if (amountToAdd <= 0) {
            return { success: false, added: 0 };
        }

        if (!Array.isArray(this.cargoHold)) {
            this.cargoHold = [];
        }

        const existing = this.cargoHold.find(item => item?.name === commodityName);
        if (existing) {
            existing.quantity += amountToAdd;
        } else {
            this.cargoHold.push({ name: commodityName, quantity: amountToAdd });
        }

        return { success: true, added: amountToAdd };
    }

    removeCargo(commodityName, quantity) {
        if (!commodityName || quantity <= 0 || !Array.isArray(this.cargoHold)) {
            return 0;
        }
        const idx = this.cargoHold.findIndex(item => item?.name === commodityName);
        if (idx === -1) {
            return 0;
        }
        const item = this.cargoHold[idx];
        const amountToRemove = Math.min(item.quantity, Math.floor(quantity));
        item.quantity -= amountToRemove;
        if (item.quantity <= 0) {
            this.cargoHold.splice(idx, 1);
        }
        return amountToRemove;
    }

    hasCargo(commodityName, quantity = 1) {
        if (!commodityName || quantity <= 0 || !Array.isArray(this.cargoHold)) {
            return false;
        }
        const item = this.cargoHold.find(entry => entry?.name === commodityName);
        return !!item && item.quantity >= quantity;
    }

    collectCargoFromWorld(cargo) {
        if (!cargo || cargo.collected) {
            return { added: 0, fullyCollected: false };
        }

        const desiredQuantity = Math.max(1, Math.floor(cargo.quantity || 1));
        const capacityBefore = this.getRemainingCargoCapacity();
        if (capacityBefore <= 0) {
            return { added: 0, fullyCollected: false, capacityFull: true };
        }

        const amountToTake = Math.min(desiredQuantity, capacityBefore);
        const addResult = this.addCargo(cargo.type, amountToTake, true);

        if (!addResult.success || addResult.added <= 0) {
            return { added: 0, fullyCollected: false };
        }

        if (addResult.added >= desiredQuantity) {
            cargo.collected = true;
            // Remove any HUD/minimap marker associated with this cargo
            try {
                if (cargo.eventMarkerId && typeof uiManager !== 'undefined' && typeof uiManager.removeEventMarker === 'function') {
                    uiManager.removeEventMarker(cargo.eventMarkerId);
                }
            } catch (e) { }
            // Remove cargo from its containing system if possible
            try {
                const sys = this.currentSystem || (typeof this.getSystem === 'function' ? this.getSystem() : null);
                if (sys && Array.isArray(sys.cargo)) {
                    const idx = sys.cargo.indexOf(cargo);
                    if (idx >= 0) {
                        if (typeof sys._fastRemove === 'function') sys._fastRemove(sys.cargo, idx);
                        else sys.cargo.splice(idx, 1);
                    }
                }
            } catch (e) { }
            return { added: addResult.added, fullyCollected: true, capacityFull: addResult.added >= capacityBefore };
        }

        const remaining = Math.max(0, desiredQuantity - addResult.added);
        cargo.quantity = remaining > 0 ? remaining : 0;
        if (remaining <= 0) {
            cargo.collected = true;
            try {
                if (cargo.eventMarkerId && typeof uiManager !== 'undefined' && typeof uiManager.removeEventMarker === 'function') {
                    uiManager.removeEventMarker(cargo.eventMarkerId);
                }
            } catch (e) { }
            try {
                const sys = this.currentSystem || (typeof this.getSystem === 'function' ? this.getSystem() : null);
                if (sys && Array.isArray(sys.cargo)) {
                    const idx2 = sys.cargo.indexOf(cargo);
                    if (idx2 >= 0) {
                        if (typeof sys._fastRemove === 'function') sys._fastRemove(sys.cargo, idx2);
                        else sys.cargo.splice(idx2, 1);
                    }
                }
            } catch (e) { }
        } else if (typeof Cargo !== 'undefined' && typeof Cargo.determineColor === 'function') {
            cargo.color = Cargo.determineColor(cargo.type);
        }

        return {
            added: addResult.added,
            fullyCollected: remaining <= 0,
            capacityFull: addResult.added >= capacityBefore
        };
    }

    handleStationDocking(system) {
        if (this._hasDockedThisPause) {
            return;
        }

        const eligibleRole = (this.role === AI_ROLE.HAULER || this.role === AI_ROLE.TRANSPORT || this.role === AI_ROLE.MINER);
        if (!eligibleRole) {
            this._hasDockedThisPause = true;
            return;
        }

        const station = system?.station;
        if (!station) {
            this._hasDockedThisPause = true;
            return;
        }

        const market = station.market;
        const saleSummary = this._sellCargoToMarket(market);

        if (saleSummary.totalUnits > 0) {
            if (typeof CARGO_LOGF === 'function') {
                CARGO_LOGF(() => {
                    const details = saleSummary.items
                        .map(item => {
                            const ratioText = Number.isFinite(item.priceRatio) ? item.priceRatio.toFixed(2) : 'n/a';
                            return `${item.name} x${item.quantity} @${ratioText}x`;
                        })
                        .join(', ');
                    return [`Hauler ${this.shipTypeName} sold ${saleSummary.totalUnits} units at ${station.name || 'station'}${details ? ` (${details})` : ''}`];
                });
            } else if (typeof CARGO_LOG === 'function') {
                CARGO_LOG(`Hauler ${this.shipTypeName} sold ${saleSummary.totalUnits} units at ${station.name || 'station'}`);
            }
        }

        const shipDef = SHIP_DEFINITIONS?.[this.shipTypeName];
        const targetLoad = Math.max(0, Math.min(this.cargoCapacity || 0, Math.floor((this.cargoCapacity || 0) * random(0.55, 0.9))));

        // Miners only sell ore, they don't buy cargo from stations
        // Haulers and transports both buy and sell
        const shouldLoadCargo = (this.role === AI_ROLE.HAULER || this.role === AI_ROLE.TRANSPORT);

        if (shouldLoadCargo && market && targetLoad > this.getCargoAmount()) {
            const options = this._determineStationCargoOptions(station, shipDef);
            if (options.length > 0) {
                const beforeLoad = this.getCargoAmount();
                this._loadCargoFromOptions(options, targetLoad, station);
                const gained = this.getCargoAmount() - beforeLoad;
                if (gained > 0) {
                    if (typeof CARGO_LOGF === 'function') {
                        CARGO_LOGF(() => [`Hauler ${this.shipTypeName} loaded ${gained} units at ${station.name || 'station'}`]);
                    } else if (typeof CARGO_LOG === 'function') {
                        CARGO_LOG(`Hauler ${this.shipTypeName} loaded ${this.getCargoAmount()} units at ${station.name || 'station'}`);
                    }
                }
            }
        }

        this._hasDockedThisPause = true;
    }

    _determineStationCargoOptions(station, shipDef) {
        const optionSet = new Set();

        if (Array.isArray(shipDef?.typicalCargo)) {
            shipDef.typicalCargo.filter(Boolean).forEach(type => optionSet.add(type));
        }

        if (station?.market?.commodities) {
            station.market.commodities
                .filter(comm => comm && comm.buyPrice > 0 && Math.max(0, Math.floor(comm.stock ?? 0)) > 0)
                .forEach(comm => optionSet.add(comm.name));
        }

        if (optionSet.size === 0 && typeof ECONOMY_EXPORTS !== 'undefined') {
            const exports = ECONOMY_EXPORTS[station?.systemType] || ECONOMY_EXPORTS['Default'];
            if (Array.isArray(exports)) {
                exports.forEach(name => optionSet.add(name));
            }
        }

        if (optionSet.size === 0 && typeof LEGAL_CARGO !== 'undefined') {
            LEGAL_CARGO.forEach(name => optionSet.add(name));
        }

        return Array.from(optionSet);
    }

    _sellCargoToMarket(market) {
        const summary = { totalUnits: 0, items: [] };
        if (!market || !Array.isArray(this.cargoHold) || this.cargoHold.length === 0) {
            return summary;
        }

        const holdings = this.cargoHold
            .filter(item => item && item.quantity > 0)
            .map(item => ({ name: item.name, quantity: item.quantity }));

        if (holdings.length === 0) {
            return summary;
        }

        // Check if illegal goods can be traded in this system
        const isAnarchySystem = this.currentSystem &&
            typeof this.currentSystem.securityLevel === 'string' &&
            this.currentSystem.securityLevel.toLowerCase() === 'anarchy';

        holdings.forEach(entry => {
            const comm = this._getMarketCommodity(market, entry.name);
            if (!comm) { return; }

            // Skip illegal goods in non-Anarchy systems
            if (!comm.isLegal && !isAnarchySystem) {
                return;
            }

            const quantityToSell = this._decideNpcSaleQuantity(entry.quantity, comm);
            if (quantityToSell <= 0) { return; }

            const removed = this.removeCargo(entry.name, quantityToSell);
            if (removed <= 0) { return; }

            if (typeof market.addStockFromNPC === 'function') {
                market.addStockFromNPC(entry.name, removed, { suppressPriceUpdate: true });
            }

            const baseSell = Math.max(1, comm.baseSell || comm.baseBuy || 1);
            const ratio = Math.max(0, (comm.sellPrice || 0) / baseSell);
            summary.totalUnits += removed;
            summary.items.push({ name: entry.name, quantity: removed, priceRatio: ratio });
        });

        if (summary.totalUnits > 0 && typeof market.updatePrices === 'function') {
            market.updatePrices();
        }

        return summary;
    }

    _getMarketCommodity(market, commodityName) {
        if (!market || !commodityName) {
            return null;
        }
        if (typeof market._getCommodity === 'function') {
            const resolved = market._getCommodity(commodityName);
            if (resolved) { return resolved; }
        }
        if (Array.isArray(market.commodities)) {
            return market.commodities.find(comm => comm && comm.name === commodityName);
        }
        return null;
    }

    _decideNpcSaleQuantity(availableQuantity, comm) {
        if (!comm || availableQuantity <= 0) {
            return 0;
        }

        // NPCs sell TO the station, so compare station's buyPrice (what they pay us) to baseSell
        const baseSell = Math.max(1, comm.baseSell || 1);
        if (!Number.isFinite(baseSell) || baseSell <= 0) {
            return 0; // Invalid base price, skip sale
        }

        // Station's sellPrice is what WE pay them; buyPrice is what they pay us (not in comm usually)
        // For NPCs selling, use sellPrice as proxy for what station offers
        const stationOffer = Math.max(1, comm.sellPrice || baseSell * 0.8);
        const ratio = stationOffer / baseSell;

        if (ratio >= NPC_TRADE_RULES.SELL_FULL_RATIO) {
            return availableQuantity; // Good price, sell everything
        }
        if (ratio >= NPC_TRADE_RULES.SELL_PARTIAL_RATIO) {
            return Math.max(1, Math.floor(availableQuantity * NPC_TRADE_RULES.SELL_PARTIAL_FRACTION));
        }
        if (ratio >= NPC_TRADE_RULES.SELL_MIN_RATIO) {
            // Marginal price, sell small amount
            return Math.max(1, Math.floor(availableQuantity * 0.25));
        }
        return 0; // Price too low, hold cargo
    }

    _loadCargoFromOptions(options, targetLoad, station = null) {
        if (!Array.isArray(options) || options.length === 0) {
            return;
        }

        const market = station?.market;
        const attempted = new Set();
        let guard = 0;

        while (this.getCargoAmount() < targetLoad && guard < 120) {
            guard++;
            const type = random(options);
            if (!type) { continue; }

            const remaining = targetLoad - this.getCargoAmount();
            const stackSize = Math.max(1, Math.min(remaining, Math.floor(random(2, 6))));
            let amountToLoad = stackSize;

            if (market) {
                const comm = this._getMarketCommodity(market, type);
                if (comm) {
                    // Skip illegal goods in non-Anarchy systems
                    const isAnarchySystem = this.currentSystem &&
                        typeof this.currentSystem.securityLevel === 'string' &&
                        this.currentSystem.securityLevel.toLowerCase() === 'anarchy';

                    if (!comm.isLegal && !isAnarchySystem) {
                        attempted.add(type);
                        if (attempted.size >= options.length) {
                            break;
                        }
                        continue; // Skip illegal goods in non-Anarchy systems
                    }

                    const baseBuy = Math.max(1, comm.baseBuy || 1);
                    if (!Number.isFinite(baseBuy) || baseBuy <= 0) {
                        attempted.add(type);
                        if (attempted.size >= options.length) {
                            break;
                        }
                        continue; // Invalid base price, skip this commodity
                    }

                    const currentPrice = Math.max(1, comm.buyPrice || baseBuy);
                    const ratio = currentPrice / baseBuy;

                    if (ratio >= NPC_TRADE_RULES.BUY_MAX_RATIO) {
                        attempted.add(type);
                        if (attempted.size >= options.length) {
                            break;
                        }
                        continue; // Too expensive, skip
                    }

                    if (ratio > NPC_TRADE_RULES.BUY_IDEAL_RATIO) {
                        // Near base price, buy smaller amounts
                        amountToLoad = Math.max(1, Math.floor(amountToLoad * NPC_TRADE_RULES.BUY_PARTIAL_FRACTION));
                    } else if (ratio <= NPC_TRADE_RULES.BUY_IDEAL_RATIO) {
                        // Good discount, increase purchase slightly
                        amountToLoad = Math.max(1, Math.min(remaining, Math.floor(amountToLoad * NPC_TRADE_RULES.BUY_BULK_MULTIPLIER)));
                    }
                }
            }

            const requestAmount = amountToLoad;

            if (market && typeof market.consumeStockForNPC === 'function') {
                amountToLoad = market.consumeStockForNPC(type, requestAmount, { allowPartial: true, suppressPriceUpdate: true });
                if (amountToLoad <= 0) {
                    attempted.add(type);
                    if (attempted.size >= options.length) {
                        break;
                    }
                    continue;
                }
            }

            const result = this.addCargo(type, amountToLoad, true);
            if (!result.success || result.added === 0) {
                if (market && amountToLoad > 0 && typeof market.addStockFromNPC === 'function') {
                    market.addStockFromNPC(type, amountToLoad, { suppressPriceUpdate: true });
                }
                break;
            }

            if (market && result.added < amountToLoad && typeof market.addStockFromNPC === 'function') {
                const difference = amountToLoad - result.added;
                if (difference > 0) {
                    market.addStockFromNPC(type, difference, { suppressPriceUpdate: true });
                }
            }
        }

        if (market && typeof market.updatePrices === 'function') {
            market.updatePrices();
        }
    }

    _selectRandomCargoEntry() {
        if (!Array.isArray(this.cargoHold) || this.cargoHold.length === 0) {
            return null;
        }
        const candidates = this.cargoHold.filter(item => item && item.quantity > 0);
        if (candidates.length === 0) {
            return null;
        }
        return random(candidates);
    }

    _spawnCargo(context, override = null) {
        const system = this.getSystem();
        if (!system || typeof system.addCargo !== 'function') {
            console.warn(`${this.shipTypeName} can't ${context} cargo - system or system.addCargo missing`);
            return false;
        }

        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        const fallbackPool = Array.isArray(shipDef?.typicalCargo) ? shipDef.typicalCargo.filter(Boolean) : [];

        const cargoType = override?.type || (fallbackPool.length > 0 ? random(fallbackPool) : null);
        if (!cargoType) {
            return false;
        }

        let quantity = override?.quantity;
        if (!Number.isFinite(quantity) || quantity <= 0) {
            if (context === 'destruction') {
                const capacity = this.cargoCapacity || shipDef?.cargoCapacity || 0;
                quantity = Math.max(1, Math.floor(Math.max(capacity, 3) / 3));
            } else {
                quantity = 1;
            }
        }
        quantity = Math.max(1, Math.floor(quantity));

        // Reduce cargo drop quantities for high-value goods to avoid dramatic economic impact
        // High-value goods: Narcotics, Weapons, Slaves, Luxury Goods, Adv Components
        if (context === 'destruction') {
            const highValueGoods = ['Narcotics', 'Weapons', 'Slaves'];
            const mediumValueGoods = ['Luxury Goods', 'Adv Components', 'Computers'];

            if (highValueGoods.includes(cargoType)) {
                // Reduce to 33% for highest value illegal goods
                quantity = Math.max(1, Math.floor(quantity * 0.33));
            } else if (mediumValueGoods.includes(cargoType)) {
                // Reduce to 50% for medium-high value goods
                quantity = Math.max(1, Math.floor(quantity * 0.5));
            }
        }

        let position = createVector(this.pos.x, this.pos.y);
        let velocity = createVector(0, 0);
        let message = '';

        if (context === 'jettison') {
            const offsetAngle = random(TWO_PI);
            const offsetDist = this.size * 0.6;
            position.add(cos(offsetAngle) * offsetDist, sin(offsetAngle) * offsetDist);
            if (this.vel) {
                velocity.add(p5.Vector.mult(this.vel, 0.3));
                velocity.add(p5.Vector.random2D().mult(random(0.5, 1.5)));
            }
            message = `${this.shipTypeName} jettisoned ${quantity} unit${quantity > 1 ? 's' : ''} of ${cargoType}`;
        } else if (context === 'destruction') {
            const offsetAngle = random(TWO_PI);
            const offsetDist = random(this.size * 0.2, this.size * 0.7);
            position.add(cos(offsetAngle) * offsetDist, sin(offsetAngle) * offsetDist);
            velocity = p5.Vector.random2D().mult(random(0.8, 2.0));
            message = `${this.shipTypeName} dropped ${quantity} units of ${cargoType}`;
            CARGO_LOG(`${this.shipTypeName} destroyed - dropping cargo: ${quantity} x ${cargoType}`);
        } else {
            console.error(`_spawnCargo called with invalid context: ${context}`);
            return false;
        }

        let cargoObject = null;
        try {
            cargoObject = new Cargo(position.x, position.y, cargoType, quantity);
            cargoObject.vel = velocity;
            cargoObject.size = 8;
        } catch (e) {
            console.error(`Error creating Cargo object in _spawnCargo (${context}) for ${this.shipTypeName}:`, e);
            return false;
        }

        if (system.addCargo(cargoObject)) {
            if (typeof uiManager !== 'undefined' && message) {
                uiManager.addMessage(message);
            }
            return true;
        }

        console.warn(`_spawnCargo: system.addCargo failed for ${cargoType} x${quantity}`);
        return false;
    }

    jettisonCargo() {
        const entry = this._selectRandomCargoEntry();
        if (!entry) {
            return false;
        }
        const quantity = Math.min(entry.quantity, 1);
        const spawned = this._spawnCargo('jettison', { type: entry.name, quantity });
        if (spawned) {
            this.removeCargo(entry.name, quantity);
        }
        return spawned;
    }

    dropCargo() {
        const total = this.getCargoAmount();
        if (total <= 0) {
            return false;
        }

        const inventorySnapshot = this.cargoHold
            .filter(item => item && item.quantity > 0)
            .map(item => ({ name: item.name, quantity: item.quantity }));

        if (inventorySnapshot.length === 0) {
            return false;
        }

        const targetDrop = Math.max(1, Math.floor(total * random(0.6, 0.9)));
        let remaining = targetDrop;
        let guard = 0;
        const drops = [];

        while (remaining > 0 && guard < 10) {
            guard++;
            const available = inventorySnapshot.filter(item => item.quantity > 0);
            if (available.length === 0) {
                break;
            }
            const entry = random(available);
            const maxForEntry = Math.min(entry.quantity, remaining);
            const qty = Math.max(1, Math.min(maxForEntry, Math.floor(maxForEntry * random(0.5, 1.0))));
            entry.quantity -= qty;
            remaining -= qty;
            drops.push({ type: entry.name, quantity: qty });
        }

        if (drops.length === 0) {
            return false;
        }

        drops.forEach(drop => {
            if (this._spawnCargo('destruction', drop)) {
                this.removeCargo(drop.type, drop.quantity);
            }
        });

        return true;
    }

    detectCargo(system) {
        if (typeof this.getRemainingCargoCapacity === 'function' && this.getRemainingCargoCapacity() <= 0) {
            return null;
        }
        if (!system?.cargo || system.cargo.length === 0) {
            return null;
        }

        let closestCargo = null;
        let closestDistance = Infinity;

        for (const cargo of system.cargo) {
            if (!cargo || cargo.collected) {
                continue;
            }

            const distance = dist(this.pos.x, this.pos.y, cargo.pos.x, cargo.pos.y);
            if (distance < this.cargoDetectionRange && distance < closestDistance) {
                closestCargo = cargo;
                closestDistance = distance;
            }
        }

        return closestCargo;
    }
}

/**
 * Apply EnemyCargo methods to Enemy prototype
 */
function applyEnemyCargoMethods() {
    // Get all method names from EnemyCargo prototype
    Object.getOwnPropertyNames(EnemyCargo.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyCargo.prototype[methodName];
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyCargo, applyEnemyCargoMethods };
    global.EnemyCargo = EnemyCargo;
    global.applyEnemyCargoMethods = applyEnemyCargoMethods;
}
