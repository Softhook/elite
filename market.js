// ****** market.js ******

// Debug flag to control logging verbosity
const MARKET_DEBUG = false; // Set to true during development

// Constants for price calculations
const PRODUCTION_DISCOUNT_BUY = 0.7;   // Systems produce goods at discount
const PRODUCTION_DISCOUNT_SELL = 0.8;  // Selling price for produced goods
const IMPORT_PREMIUM_BUY = 1.2;        // Systems import needed goods at premium
const IMPORT_PREMIUM_SELL = 1.1;       // Selling price for imported goods
const SELL_RATIO_SAFETY = 0.8;         // Ensure sell price is at most this % of buy price

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

        this.commodities = [
            // Name, Base Buy, Base Sell, Current Buy, Current Sell, Player Stock, Legal Status
            // Basic Goods
            { name: 'Food',           baseBuy: 10,   baseSell: 8,    buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: true },
            { name: 'Textiles',       baseBuy: 15,   baseSell: 12,   buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: true },
            // Industrial Goods
            { name: 'Machinery',      baseBuy: 100,  baseSell: 90,   buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: true },
            // Raw Materials
            { name: 'Metals',         baseBuy: 50,   baseSell: 40,   buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: true },
            { name: 'Minerals',       baseBuy: 40,   baseSell: 30,   buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: true },
            { name: 'Chemicals',      baseBuy: 70,   baseSell: 60,   buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: true },
            // Tech Goods
            { name: 'Computers',      baseBuy: 250,  baseSell: 220,  buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: true },
            { name: 'Medicine',       baseBuy: 150,  baseSell: 130,  buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: true },
            { name: 'Adv Components', baseBuy: 400,  baseSell: 350,  buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: true },
            // Luxury Goods
            { name: 'Luxury Goods',   baseBuy: 500,  baseSell: 450,  buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: true },
                    // ILLEGAL GOODS - higher profit margins but only available in Anarchy systems
            { name: 'Narcotics',      baseBuy: 800,  baseSell: 700,  buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: false },
            { name: 'Weapons',        baseBuy: 1200, baseSell: 1000, buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: false },
            { name: 'Slaves',         baseBuy: 1500, baseSell: 1300, buyPrice: 0, sellPrice: 0, playerStock: 0, isLegal: false },
        ];

        this.updatePrices();
        if (MARKET_DEBUG) console.log(`Market initialized for system type: ${this.systemType} with ${this.commodities.length} commodities.`);
    }

    // Price adjustment based on economy type
    updatePrices() {
        // Skip if no commodities (for Alien systems)
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
                case 'High Tech':
                    if (['Computers', 'Medicine', 'Adv Components'].includes(comm.name)) { comm.buyPrice *= 0.7; comm.sellPrice *= 0.8; }
                    if (['Food', 'Metals', 'Chemicals', 'Minerals'].includes(comm.name)) { comm.buyPrice *= 1.4; comm.sellPrice *= 1.3; }
                    if (['Luxury Goods'].includes(comm.name)) { comm.buyPrice *= 1.1; comm.sellPrice *= 1.05; }
                    break;
                case 'Tourism':
                    if (['Food', 'Medicine', 'Luxury Goods', 'Textiles'].includes(comm.name)) { comm.buyPrice *= 1.3; comm.sellPrice *= 1.2; }
                    if (['Metals', 'Minerals', 'Chemicals', 'Machinery'].includes(comm.name)) { comm.buyPrice *= 1.5; comm.sellPrice *= 1.4; }
                    break; // <--- THIS IS IMPORTANT
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
            
            // CRITICAL SAFETY CHECK: Ensure sell price is always lower than buy price
            if (comm.sellPrice >= comm.buyPrice) {
                comm.sellPrice = Math.floor(comm.buyPrice * SELL_RATIO_SAFETY);
            }
            
            // Ensure prices are integers and never zero
            comm.buyPrice = max(1, floor(comm.buyPrice));
            comm.sellPrice = max(1, floor(comm.sellPrice));
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

        const comm = this.commodities.find(c => c.name === commodityName);
        if (!comm) { console.error(`SELL FAILED: ${commodityName} not found`); return false; }
        
        // Check if this is a legal transaction
        const currentSystem = player.currentSystem;
        if (!comm.isLegal && currentSystem?.securityLevel !== 'Anarchy') {
            console.log(`SELL FAILED: Cannot sell illegal goods in non-Anarchy system.`);
            uiManager.addMessage(`Can't sell illegal goods in ${currentSystem?.securityLevel} security.`, 'crimson');
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
        this.updatePlayerCargo(player.cargo);

        // Save  Game
        saveGame();
        
        return true;
    }

    // Returns a copy of commodities with current prices
    getPrices() {
        // More efficient than JSON.parse/stringify for shallow copies
        return this.commodities.map(c => ({...c}));
    }

    // --- updatePlayerCargo, buy, getPrices remain the same ---
    // Updates the 'playerStock' field for market display based on player's cargo
    updatePlayerCargo(playerCargo) {
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
        console.log(`--- Market.buy Attempt ---`);
        console.log(`Item: ${commodityName}, Qty: ${quantity}`);

        // Essential checks
        if (!player) { console.error("BUY FAILED: Player object missing."); return false; }
        if (quantity <= 0) { console.log("BUY FAILED: Quantity <= 0."); return false; }

        const comm = this.commodities.find(c => c.name === commodityName);
        if (!comm) { console.error(`BUY FAILED: Commodity ${commodityName} not found in market.`); return false; }
        
        // Check if this is a legal transaction
        const currentSystem = player.currentSystem;
        if (!comm.isLegal && currentSystem?.securityLevel !== 'Anarchy') {
            console.log(`BUY FAILED: Cannot buy illegal goods in non-Anarchy system.`);
            uiManager.addMessage(`Can't buy illegal goods in ${currentSystem?.securityLevel} security.`, 'crimson');
            return false;
        }

        const cost = Math.floor(comm.buyPrice * quantity); // Floor the total cost
        const currentCargoAmount = player.getCargoAmount();
        const remainingCapacity = player.cargoCapacity - currentCargoAmount;

        console.log(`Cost: ${cost}, Player Credits: ${player.credits}`);
        console.log(`Cargo Space Needed: ${quantity}, Remaining Capacity: ${remainingCapacity}`);

        // Check Credits
        if (cost > player.credits) {
            console.log("BUY FAILED: Not enough credits!");
            // Add UI feedback later (e.g., flash credits red)
            return false;
        }

        // Check Cargo Space
        if (quantity > remainingCapacity) {
            console.log("BUY FAILED: Not enough cargo space!");
            // Add UI feedback later
            return false;
        }

        // --- If checks pass, proceed with transaction ---
        console.log("Checks passed. Attempting transaction...");
        console.log(`Spending ${cost} credits...`);
        let spendSuccess = player.spendCredits(cost); // Pass floored cost
        console.log(`player.spendCredits returned: ${spendSuccess}`);

        if (spendSuccess) {
            // If credits were spent successfully, add cargo
            console.log(`Adding ${quantity} ${commodityName} to cargo...`);
            player.addCargo(commodityName, quantity); // Add item(s) to player inventory
            this.updatePlayerCargo(player.cargo); // Update market display immediately
            console.log(`--- Market.buy SUCCESS: Bought ${quantity} ${commodityName} for ${cost} credits. ---`);
            // Consider saving game state after a successful trade
            if (typeof saveGame === 'function') { // Check if saveGame exists globally
                saveGame();
            }
            return true; // Indicate successful purchase
        } else {
            // This case (having enough credits but spendCredits failing) indicates an issue in Player.spendCredits
            console.error(`BUY FAILED: player.spendCredits(${cost}) failed unexpectedly even though checks passed.`);
            return false; // Indicate failed purchase
        }
    }

} // End of Market Class