// ****** market.js ******

// Debug flag to control logging verbosity
const MARKET_DEBUG = false; // Set to true during development

// Utility helper
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Constants for price calculations
const PRODUCTION_DISCOUNT_BUY = 0.7;   // Systems produce goods at discount
const PRODUCTION_DISCOUNT_SELL = 0.8;  // Selling price for produced goods
const IMPORT_PREMIUM_BUY = 1.2;        // Systems import needed goods at premium
const IMPORT_PREMIUM_SELL = 1.1;       // Selling price for imported goods
const SELL_RATIO_SAFETY = 0.8;         // Ensure sell price is at most this % of buy price

// Stock profile constants
const DEFAULT_BASE_STOCK = 120;
const BASE_STOCK_LEVELS = {
    'Food': 480,
    'Textiles': 360,
    'Machinery': 120,
    'Metals': 260,
    'Minerals': 240,
    'Chemicals': 140,
    'Computers': 90,
    'Medicine': 110,
    'Adv Components': 60,
    'Luxury Goods': 40,
    'Narcotics': 30,
    'Weapons': 55,
    'Slaves': 18
};

const STOCK_ABUNDANT_MULT = 2.2;
const STOCK_SCARCE_MULT = 0.45;
const STOCK_CEILING_MULT = 3.5;
const STOCK_FLOOR_MULT = 0.12;

// Supply/Demand price elasticity
const PRICE_BUY_ELASTICITY = 1.15;
const PRICE_SELL_ELASTICITY = 0.85;
const PRICE_BUY_MIN_MULT = 0.45;
const PRICE_BUY_MAX_MULT = 2.75;
const PRICE_SELL_MIN_MULT = 0.5;
const PRICE_SELL_MAX_MULT = 2.2;

class Market {
    constructor(systemType) {
        this.systemType = systemType;
        this.systemName = null; // Will be set by Station
        
        // If Alien, no goods available - return early
        if (systemType === 'Alien') {
            this.commodities = [];
            if (MARKET_DEBUG) console.log("Market initialized for Alien system: No goods available.");
            return;
        }

        this._initializeCommodities();
        this.updatePrices();
        if (MARKET_DEBUG) console.log(`Market initialized for system type: ${this.systemType} with ${this.commodities.length} commodities.`);
    }

    /**
     * Initializes the commodities array with default values.
     * Used during construction and when converting from Alien to another economy type.
     * @private
     */
    _initializeCommodities() {
        const definitions = [
            // Name, Base Buy, Base Sell, Player Stock, Legal Status
            { name: 'Food',           baseBuy: 10,   baseSell: 8,    isLegal: true },
            { name: 'Textiles',       baseBuy: 15,   baseSell: 12,   isLegal: true },
            { name: 'Machinery',      baseBuy: 100,  baseSell: 90,   isLegal: true },
            { name: 'Metals',         baseBuy: 50,   baseSell: 40,   isLegal: true },
            { name: 'Minerals',       baseBuy: 40,   baseSell: 30,   isLegal: true },
            { name: 'Chemicals',      baseBuy: 70,   baseSell: 60,   isLegal: true },
            { name: 'Computers',      baseBuy: 250,  baseSell: 220,  isLegal: true },
            { name: 'Medicine',       baseBuy: 150,  baseSell: 130,  isLegal: true },
            { name: 'Adv Components', baseBuy: 400,  baseSell: 350,  isLegal: true },
            { name: 'Luxury Goods',   baseBuy: 500,  baseSell: 450,  isLegal: true },
            { name: 'Narcotics',      baseBuy: 800,  baseSell: 700,  isLegal: false },
            { name: 'Weapons',        baseBuy: 1200, baseSell: 1000, isLegal: false },
            { name: 'Slaves',         baseBuy: 1500, baseSell: 1300, isLegal: false },
        ];

        this.commodities = definitions.map(def => {
            const defaultBaseStock = BASE_STOCK_LEVELS[def.name] ?? DEFAULT_BASE_STOCK;
            const baseStock = Math.max(1, Math.round(defaultBaseStock));
            const stockCeiling = Math.max(baseStock, Math.round(baseStock * STOCK_CEILING_MULT));
            const stockFloor = Math.max(0, Math.floor(baseStock * STOCK_FLOOR_MULT));

            return {
                ...def,
                buyPrice: 0,
                sellPrice: 0,
                playerStock: 0,
                defaultBaseStock,
                baseStock,
                stock: baseStock,
                stockCeiling,
                stockFloor,
                stockRatio: 1
            };
        });

        this._applyEconomyStockProfile(true);
    }

    _applyEconomyStockProfile(resetCurrentStock = false) {
        if (!Array.isArray(this.commodities) || this.commodities.length === 0) {
            return;
        }

        const abundant = new Set();
        const scarce = new Set();

        const promote = (list = [], targetSet = abundant) => {
            if (!Array.isArray(list)) return;
            list.forEach(name => { if (name) targetSet.add(name); });
        };

        switch (this.systemType) {
            case 'Agricultural':
                promote(['Food', 'Textiles']);
                promote(['Machinery', 'Chemicals', 'Medicine', 'Computers', 'Adv Components'], scarce);
                break;
            case 'Industrial':
                promote(['Machinery', 'Metals', 'Chemicals']);
                promote(['Food', 'Luxury Goods'], scarce);
                break;
            case 'Mining':
                promote(['Metals', 'Minerals']);
                promote(['Food', 'Medicine', 'Computers'], scarce);
                break;
            case 'Military':
                promote(['Weapons', 'Machinery', 'Metals']);
                promote(['Luxury Goods', 'Textiles'], scarce);
                break;
            case 'Offworld':
            case 'Tourism':
                promote(['Luxury Goods', 'Food']);
                promote(['Metals', 'Minerals', 'Chemicals'], scarce);
                break;
            case 'Refinery':
                promote(['Metals', 'Chemicals']);
                promote(['Minerals', 'Food'], scarce);
                break;
            case 'Post Human':
                promote(['Computers', 'Adv Components', 'Medicine']);
                promote(['Food', 'Minerals'], scarce);
                break;
            case 'Service':
                promote(['Food', 'Medicine', 'Textiles']);
                promote(['Metals', 'Minerals'], scarce);
                break;
            case 'Separatist':
                promote(['Weapons', 'Chemicals']);
                promote(['Luxury Goods', 'Computers'], scarce);
                break;
            case 'Imperial':
                promote(['Luxury Goods', 'Adv Components']);
                promote(['Food', 'Textiles'], scarce);
                break;
            case 'Alien':
                // No goods handled in Alien markets
                break;
            default:
                break;
        }

        this.commodities.forEach(comm => {
            const baseLevel = comm.defaultBaseStock ?? DEFAULT_BASE_STOCK;
            let multiplier = 1;
            if (abundant.has(comm.name)) {
                multiplier = STOCK_ABUNDANT_MULT;
            } else if (scarce.has(comm.name)) {
                multiplier = STOCK_SCARCE_MULT;
            }

            comm.baseStock = Math.max(1, Math.round(baseLevel * multiplier));
            comm.stockCeiling = Math.max(comm.baseStock, Math.round(comm.baseStock * STOCK_CEILING_MULT));
            comm.stockFloor = Math.max(0, Math.floor(comm.baseStock * STOCK_FLOOR_MULT));

            if (resetCurrentStock || !Number.isFinite(comm.stock)) {
                comm.stock = comm.baseStock;
            } else {
                comm.stock = Math.round(clamp(comm.stock, 0, comm.stockCeiling));
            }

            comm.stockRatio = comm.baseStock > 0 ? comm.stock / comm.baseStock : 1;
        });
    }

    // Price adjustment based on economy type
    updatePrices() {
        // If changing from Alien to another economy type, initialize commodities
        if ((!this.commodities || this.commodities.length === 0) && this.systemType !== 'Alien') {
            if (MARKET_DEBUG) console.log(` -> Initializing commodities for economy type change from Alien to ${this.systemType}`);
            this._initializeCommodities();
        }
        
        // Clear commodities if changing to Alien
        if (this.systemType === 'Alien') {
            this.commodities = [];
            if (MARKET_DEBUG) console.log(` -> Cleared commodities for Alien economy type`);
            return;
        }
        
        // Skip if no commodities (shouldn't happen now, but safety check)
        if (!this.commodities || this.commodities.length === 0) return;
        
        if (MARKET_DEBUG) console.log(` -> Updating prices for: ${this.systemType}`);
        
        this.commodities.forEach(comm => {
            // Reset to base prices before applying adjustments
            comm.buyPrice = comm.baseBuy;
            comm.sellPrice = comm.baseSell;
            
            // Apply system economy adjustments using constants instead of magic numbers
            switch (this.systemType) {
                case 'Agricultural':
                    if (['Food', 'Textiles'].includes(comm.name)) { 
                        comm.buyPrice *= PRODUCTION_DISCOUNT_BUY; 
                        comm.sellPrice *= PRODUCTION_DISCOUNT_SELL; 
                    }
                    if (['Machinery', 'Chemicals', 'Medicine', 'Computers'].includes(comm.name)) { 
                        comm.buyPrice *= IMPORT_PREMIUM_BUY; 
                        comm.sellPrice *= IMPORT_PREMIUM_SELL; 
                    }
                    break;
                case 'Industrial':
                    if (comm.name === 'Machinery') { comm.buyPrice *= 0.8; comm.sellPrice *= 0.9; }
                    if (['Food', 'Metals', 'Minerals', 'Chemicals'].includes(comm.name)) { comm.buyPrice *= 1.2; comm.sellPrice *= 1.1; }
                    if (['Computers', 'Adv Components'].includes(comm.name)) { comm.buyPrice *= 1.1; comm.sellPrice *= 1.05; }
                    break;
                case 'Mining':
                    if (['Metals', 'Minerals'].includes(comm.name)) { comm.buyPrice *= PRODUCTION_DISCOUNT_BUY; comm.sellPrice *= PRODUCTION_DISCOUNT_SELL; }
                    if (['Food', 'Machinery', 'Medicine', 'Computers'].includes(comm.name)) { comm.buyPrice *= 1.3; comm.sellPrice *= 1.2; }
                    break;
                case 'Military':
                    if (['Machinery', 'Metals', 'Computers', 'Medicine'].includes(comm.name)) { comm.buyPrice *= 0.8; comm.sellPrice *= 0.85; }
                    if (['Luxury Goods', 'Textiles', 'Food'].includes(comm.name)) { comm.buyPrice *= 1.4; comm.sellPrice *= 1.3; }
                    break;
                case 'Offworld':
                    if (['Luxury Goods', 'Computers', 'Adv Components'].includes(comm.name)) { comm.buyPrice *= 0.8; comm.sellPrice *= 0.85; }
                    if (['Food', 'Textiles', 'Metals'].includes(comm.name)) { comm.buyPrice *= 1.3; comm.sellPrice *= 1.2; }
                    break;
                case 'Alien':
                    if (['Luxury Goods', 'Adv Components'].includes(comm.name)) { comm.buyPrice *= 0.5; comm.sellPrice *= 0.6; }
                    if (['Food', 'Textiles', 'Machinery', 'Medicine'].includes(comm.name)) { comm.buyPrice *= 2.0; comm.sellPrice *= 1.8; }
                    break;
                case 'Refinery':
                    if (['Metals', 'Chemicals'].includes(comm.name)) { comm.buyPrice *= 0.75; comm.sellPrice *= 0.85; }
                    if (['Minerals', 'Machinery', 'Food', 'Computers'].includes(comm.name)) { comm.buyPrice *= 1.25; comm.sellPrice *= 1.15; }
                    break;
                case 'Post Human':
                    if (['Computers', 'Medicine', 'Adv Components'].includes(comm.name)) { comm.buyPrice *= 0.7; comm.sellPrice *= 0.8; }
                    if (['Food', 'Metals', 'Chemicals', 'Minerals'].includes(comm.name)) { comm.buyPrice *= 1.4; comm.sellPrice *= 1.3; }
                    if (['Luxury Goods'].includes(comm.name)) { comm.buyPrice *= 1.1; comm.sellPrice *= 1.05; }
                    break;
                case 'Tourism':
                    if (['Food', 'Medicine', 'Luxury Goods', 'Textiles'].includes(comm.name)) { comm.buyPrice *= 1.3; comm.sellPrice *= 1.2; }
                    if (['Metals', 'Minerals', 'Chemicals', 'Machinery'].includes(comm.name)) { comm.buyPrice *= 1.5; comm.sellPrice *= 1.4; }
                    break;
                case 'Service':
                    if (['Food', 'Computers', 'Machinery', 'Medicine', 'Textiles'].includes(comm.name)) { comm.buyPrice *= 1.2; comm.sellPrice *= 1.1; }
                    if (['Metals', 'Minerals', 'Chemicals', 'Luxury Goods', 'Adv Components'].includes(comm.name)) { comm.buyPrice *= 1.4; comm.sellPrice *= 1.3; }
                    break;
                case 'Separatist':
                    if (['Machinery', 'Chemicals'].includes(comm.name)) { comm.buyPrice *= 0.8; comm.sellPrice *= 0.9; }
                    if (['Metals', 'Food', 'Medicine', 'Adv Components'].includes(comm.name)) { comm.buyPrice *= 1.3; comm.sellPrice *= 1.2; }
                    if (['Computers'].includes(comm.name)) { comm.buyPrice *= 1.1; comm.sellPrice *= 1.05; }
                    break;
                case 'Imperial':
                    if (['Luxury Goods', 'Adv Components', 'Computers'].includes(comm.name)) { comm.buyPrice *= 0.6; comm.sellPrice *= 0.7; }
                    if (['Food', 'Textiles', 'Metals', 'Machinery'].includes(comm.name)) { comm.buyPrice *= 1.2; comm.sellPrice *= 1.1; }
                    if (['Medicine'].includes(comm.name)) { comm.buyPrice *= 0.9; comm.sellPrice *= 0.95; }
                    break;
                default:
                    if (MARKET_DEBUG) console.warn(`Market: Unhandled economy type '${this.systemType}' - using base prices.`);
                    break;
            }
            
            const baseStock = Math.max(1, comm.baseStock || 1);
            const currentStock = Math.max(0, Number.isFinite(comm.stock) ? comm.stock : baseStock);
            const stockRatio = currentStock / baseStock;
            comm.stockRatio = stockRatio;

            const buySupplyMult = clamp(1 + (1 - stockRatio) * PRICE_BUY_ELASTICITY, PRICE_BUY_MIN_MULT, PRICE_BUY_MAX_MULT);
            const sellSupplyMult = clamp(1 + (1 - stockRatio) * PRICE_SELL_ELASTICITY, PRICE_SELL_MIN_MULT, PRICE_SELL_MAX_MULT);

            comm.buyPrice *= buySupplyMult;
            comm.sellPrice *= sellSupplyMult;

            // CRITICAL SAFETY CHECK: Ensure sell price is always lower than buy price
            if (comm.sellPrice >= comm.buyPrice) {
                comm.sellPrice = comm.buyPrice * SELL_RATIO_SAFETY;
            }
            
            // Ensure prices are integers and never zero
            comm.buyPrice = Math.max(1, Math.floor(comm.buyPrice));
            comm.sellPrice = Math.max(1, Math.floor(comm.sellPrice));
        });
        
        if (MARKET_DEBUG) console.log(` <- Prices updated.`);
    }

    // Handles player attempt to sell commodities
    sell(commodityName, quantity, player) {
        if (MARKET_DEBUG) console.log(`--- Market.sell Attempt: ${commodityName}, Qty: ${quantity} ---`);

        // CRITICAL NEW CHECK: Prevent selling mission cargo
        if (player.activeMission?.cargoType === commodityName) {
            console.log("SELL FAILED: Cannot sell mission cargo");
            return false;
        }

        // Essential checks
        if (!player) { console.error("SELL FAILED: Player missing"); return false; }
        if (quantity <= 0) { return false; }

        const comm = this._getCommodity(commodityName);
        if (!comm) { console.error(`SELL FAILED: ${commodityName} not found`); return false; }
        
        // Check if this is a legal transaction
        const currentSystem = player.currentSystem;
        if (!comm.isLegal && currentSystem && currentSystem.securityLevel !== 'Anarchy') {
            console.log(`SELL FAILED: Cannot sell illegal goods in non-Anarchy system.`);
            if (typeof uiManager !== 'undefined' && typeof uiManager.addMessage === 'function') {
                uiManager.addMessage(`Can't sell illegal goods in ${currentSystem.securityLevel} security.`, 'crimson');
            }
            return false;
        }

        // Check cargo amount
        const itemInCargo = player.cargo.find(item => item && item.name === commodityName);
        if (!itemInCargo || itemInCargo.quantity < quantity) {
            return false;
        }

        // Perform transaction
        const income = Math.floor(comm.sellPrice * quantity);
        player.addCredits(income);
        player.removeCargo(commodityName, quantity);
        this._applyStockChange(comm, quantity);
        this.updatePlayerCargo(player.cargo);
        this.updatePrices();

        // Save  Game
        if (typeof saveGame === 'function') {
            saveGame();
        }
        
        // Play sell confirm sound
        if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
            soundManager.playSound('sellConfirm');
        }
        
        return true;
    }

    // Returns a copy of commodities with current prices
    getPrices() {
        // More efficient than JSON.parse/stringify for shallow copies
        if (!Array.isArray(this.commodities)) {
            return [];
        }
        return this.commodities.map(c => ({...c}));
    }

    // --- updatePlayerCargo, buy, getPrices remain the same ---
    // Updates the 'playerStock' field for market display based on player's cargo
    updatePlayerCargo(playerCargo) {
        if (!Array.isArray(this.commodities)) {
            return;
        }
        if (!Array.isArray(playerCargo)) {
            console.warn("updatePlayerCargo received invalid playerCargo:", playerCargo);
            // Reset stocks if cargo is invalid
            this.commodities.forEach(comm => { comm.playerStock = 0; });
            return;
        }
        this.commodities.forEach(comm => {
            const itemInCargo = playerCargo.find(item => item && item.name === comm.name); // Added check for item existence
            comm.playerStock = itemInCargo ? itemInCargo.quantity : 0;
        });
    }

    // Handles player attempt to buy commodities
    buy(commodityName, quantity, player) {
        if (MARKET_DEBUG) {
            console.log(`--- Market.buy Attempt: ${commodityName}, Qty: ${quantity} ---`);
        }

        if (!player) { console.error("BUY FAILED: Player object missing."); return false; }

        let requestedQuantity = Math.floor(quantity ?? 0);
        if (requestedQuantity <= 0) {
            if (MARKET_DEBUG) console.log("BUY FAILED: Quantity <= 0.");
            return false;
        }

        const comm = this._getCommodity(commodityName);
        if (!comm) {
            console.error(`BUY FAILED: Commodity ${commodityName} not found in market.`);
            return false;
        }
        
        const currentSystem = player.currentSystem;
        if (!comm.isLegal && currentSystem && currentSystem.securityLevel !== 'Anarchy') {
            if (MARKET_DEBUG) console.log(`BUY FAILED: Cannot buy illegal goods in non-Anarchy system.`);
            if (typeof uiManager !== 'undefined' && typeof uiManager.addMessage === 'function') {
                uiManager.addMessage(`Can't buy illegal goods in ${currentSystem.securityLevel} security.`, 'crimson');
            }
            return false;
        }

        const availableStock = Math.max(0, Math.floor(Number(comm.stock) || 0));
        if (availableStock <= 0) {
            if (typeof uiManager !== 'undefined' && typeof uiManager.addMessage === 'function') {
                uiManager.addMessage(`${commodityName} is out of stock.`, 'orange');
            }
            if (MARKET_DEBUG) console.log(`BUY FAILED: ${commodityName} out of stock.`);
            return false;
        }

        if (requestedQuantity > availableStock) {
            if (typeof uiManager !== 'undefined' && typeof uiManager.addMessage === 'function') {
                uiManager.addMessage(`Only ${availableStock} units of ${commodityName} available.`, 'orange');
            }
            requestedQuantity = availableStock;
        }

        const currentCargoAmount = player.getCargoAmount();
        const remainingCapacity = player.cargoCapacity - currentCargoAmount;
        if (requestedQuantity > remainingCapacity) {
            if (MARKET_DEBUG) console.log("BUY FAILED: Not enough cargo space!");
            if (typeof uiManager !== 'undefined' && typeof uiManager.addMessage === 'function') {
                uiManager.addMessage(`Not enough cargo space. Need ${requestedQuantity}, have ${remainingCapacity}.`, 'orange');
            }
            return false;
        }

        const cost = Math.floor(comm.buyPrice * requestedQuantity);
        if (cost > player.credits) {
            if (MARKET_DEBUG) console.log("BUY FAILED: Not enough credits!");
            if (typeof uiManager !== 'undefined' && typeof uiManager.addMessage === 'function') {
                uiManager.addMessage(`Not enough credits to buy ${requestedQuantity} ${commodityName}.`, 'orange');
            }
            return false;
        }

        if (MARKET_DEBUG) {
            console.log(`Cost: ${cost}, Player Credits: ${player.credits}, Stock Before: ${comm.stock}`);
        }

        const spendSuccess = player.spendCredits(cost);
        if (!spendSuccess) {
            console.error(`BUY FAILED: player.spendCredits(${cost}) failed unexpectedly.`);
            return false;
        }

        player.addCargo(commodityName, requestedQuantity);
        this._applyStockChange(comm, -requestedQuantity);
        this.updatePlayerCargo(player.cargo);
        this.updatePrices();

        if (MARKET_DEBUG) {
            console.log(`--- Market.buy SUCCESS: Bought ${requestedQuantity} ${commodityName} for ${cost} credits. Stock now ${comm.stock}. ---`);
        }

        if (typeof saveGame === 'function') {
            saveGame();
        }

        if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
            soundManager.playSound('buyConfirm');
        }

        return true;
    }

    getAvailableStock(commodityName) {
        const comm = this._getCommodity(commodityName);
        return comm ? Math.max(0, Math.floor(Number(comm.stock) || 0)) : 0;
    }

    addStockFromNPC(commodityName, quantity, options = {}) {
        const comm = this._getCommodity(commodityName);
        if (!comm) { return 0; }
        const amount = Math.max(0, Math.floor(quantity ?? 0));
        if (amount <= 0) { return 0; }
        const delta = this._applyStockChange(comm, amount);
        if (!options.suppressPriceUpdate) {
            this.updatePrices();
        }
        return delta;
    }

    consumeStockForNPC(commodityName, quantity, options = {}) {
        const comm = this._getCommodity(commodityName);
        if (!comm) { return 0; }
        const available = Math.max(0, Math.floor(Number(comm.stock) || 0));
        if (available <= 0) { return 0; }

        let request = Math.max(0, Math.floor(quantity ?? 0));
        if (request <= 0) { return 0; }

        if (request > available) {
            if (options.allowPartial) {
                request = available;
            } else {
                return 0;
            }
        }

        const delta = this._applyStockChange(comm, -request);
        if (!options.suppressPriceUpdate) {
            this.updatePrices();
        }
        return Math.abs(delta);
    }

    setEconomyType(newType, { resetStock = false } = {}) {
        this.systemType = newType;
        this._applyEconomyStockProfile(resetStock);
        this.updatePrices();
    }

    toJSON() {
        return {
            systemType: this.systemType,
            commodities: Array.isArray(this.commodities) ? this.commodities.map(comm => ({
                name: comm.name,
                stock: Math.max(0, Math.floor(Number(comm.stock) || 0)),
                baseStock: Math.max(1, Math.floor(Number(comm.baseStock) || 1)),
                defaultBaseStock: Math.max(1, Math.floor(Number(comm.defaultBaseStock) || 1)),
                stockCeiling: Math.max(0, Math.floor(Number(comm.stockCeiling) || 0)),
                stockFloor: Math.max(0, Math.floor(Number(comm.stockFloor) || 0))
            })) : []
        };
    }

    static fromJSON(data, fallbackType = 'Unknown') {
        if (!data) { return new Market(fallbackType); }
        const market = new Market(data.systemType || fallbackType);

        if (Array.isArray(data.commodities)) {
            data.commodities.forEach(saved => {
                if (!saved || !saved.name) { return; }
                const comm = market._getCommodity(saved.name);
                if (!comm) { return; }

                if (Number.isFinite(saved.defaultBaseStock)) {
                    comm.defaultBaseStock = Math.max(1, Math.round(saved.defaultBaseStock));
                }
                if (Number.isFinite(saved.baseStock)) {
                    comm.baseStock = Math.max(1, Math.round(saved.baseStock));
                }
                if (Number.isFinite(saved.stockCeiling)) {
                    comm.stockCeiling = Math.max(comm.baseStock, Math.round(saved.stockCeiling));
                } else {
                    comm.stockCeiling = Math.max(comm.baseStock, Math.round(comm.baseStock * STOCK_CEILING_MULT));
                }
                if (Number.isFinite(saved.stockFloor)) {
                    comm.stockFloor = Math.max(0, Math.floor(saved.stockFloor));
                }
                if (Number.isFinite(saved.stock)) {
                    comm.stock = Math.max(0, Math.round(saved.stock));
                } else {
                    comm.stock = comm.baseStock;
                }
                comm.stockRatio = comm.baseStock > 0 ? comm.stock / comm.baseStock : 1;
            });
        }

        market.updatePrices();
        return market;
    }

    _getCommodity(name) {
        if (!Array.isArray(this.commodities)) { return null; }
        return this.commodities.find(c => c.name === name) || null;
    }

    _applyStockChange(comm, delta) {
        if (!comm || !Number.isFinite(delta)) { return 0; }
        const before = Number.isFinite(comm.stock) ? comm.stock : (comm.baseStock || 0);
        let after = before + delta;
        if (after < 0) { after = 0; }
        const ceiling = comm.stockCeiling || Math.round((comm.baseStock || DEFAULT_BASE_STOCK) * STOCK_CEILING_MULT);
        if (after > ceiling) { after = ceiling; }
        comm.stock = Math.round(after);
        comm.stockRatio = comm.baseStock > 0 ? comm.stock / comm.baseStock : 1;
        return comm.stock - before;
    }

} // End of Market Class