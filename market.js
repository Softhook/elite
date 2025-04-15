// ****** market.js ******

class Market {
    constructor(systemType) {
        this.systemType = systemType;
        this.commodities = [
            // Name, Base Buy, Base Sell, Current Buy, Current Sell, Player Stock
            // Basic Goods
            { name: 'Food',           baseBuy: 10,   baseSell: 8,    buyPrice: 0, sellPrice: 0, playerStock: 0 },
            { name: 'Textiles',       baseBuy: 15,   baseSell: 12,   buyPrice: 0, sellPrice: 0, playerStock: 0 }, // Added
            // Industrial Goods
            { name: 'Machinery',      baseBuy: 100,  baseSell: 90,   buyPrice: 0, sellPrice: 0, playerStock: 0 },
            // Raw Materials
            { name: 'Metals',         baseBuy: 50,   baseSell: 40,   buyPrice: 0, sellPrice: 0, playerStock: 0 }, // Added
            { name: 'Minerals',       baseBuy: 40,   baseSell: 30,   buyPrice: 0, sellPrice: 0, playerStock: 0 }, // Added
            { name: 'Chemicals',      baseBuy: 70,   baseSell: 60,   buyPrice: 0, sellPrice: 0, playerStock: 0 }, // Added
            // Tech Goods
            { name: 'Computers',      baseBuy: 250,  baseSell: 220,  buyPrice: 0, sellPrice: 0, playerStock: 0 },
            { name: 'Medicine',       baseBuy: 150,  baseSell: 130,  buyPrice: 0, sellPrice: 0, playerStock: 0 },
            { name: 'Adv Components', baseBuy: 400,  baseSell: 350,  buyPrice: 0, sellPrice: 0, playerStock: 0 }, // Added
            // Luxury Goods
            { name: 'Luxury Goods',   baseBuy: 500,  baseSell: 450,  buyPrice: 0, sellPrice: 0, playerStock: 0 }, // Added
            // Add Slaves, Weapons, Narcotics if needed for illegal market later
        ];
        // Assign a placeholder for 'Raw Materials' if needed generically, though specific types are better
        // Example: { name: 'Raw Materials', baseBuy: 30, baseSell: 25, buyPrice: 0, sellPrice: 0, playerStock: 0 }

        this.updatePrices();
        console.log(`Market initialized for system type: ${this.systemType} with ${this.commodities.length} commodities.`); // Log type
    }

    // Price adjustment based on economy type
    updatePrices() {
        console.log(` -> Updating prices for: ${this.systemType}`); // Log when updating
        this.commodities.forEach(comm => {
            // Reset to base prices before applying adjustments
            comm.buyPrice = comm.baseBuy;
            comm.sellPrice = comm.baseSell;
            let caseHit = 'default'; // Debugging

            // Apply adjustments based on system economy
            // Lower buy/sell price means the system PRODUCES it (cheap supply)
            // Higher buy/sell price means the system NEEDS it (high demand)
            switch (this.systemType) {
                case 'Agricultural':
                    caseHit = 'Agricultural'; // Produces Food, Textiles. Needs Machinery, Chemicals, Medicine.
                    if (['Food', 'Textiles'].includes(comm.name)) { comm.buyPrice *= 0.7; comm.sellPrice *= 0.8; }
                    if (['Machinery', 'Chemicals', 'Medicine', 'Computers'].includes(comm.name)) { comm.buyPrice *= 1.2; comm.sellPrice *= 1.1; }
                    break;
                case 'Industrial':
                    caseHit = 'Industrial'; // Produces Machinery. Needs Food, Metals, Minerals, Chemicals.
                    if (comm.name === 'Machinery') { comm.buyPrice *= 0.8; comm.sellPrice *= 0.9; }
                    if (['Food', 'Metals', 'Minerals', 'Chemicals'].includes(comm.name)) { comm.buyPrice *= 1.2; comm.sellPrice *= 1.1; }
                    if (['Computers', 'Adv Components'].includes(comm.name)) { comm.buyPrice *= 1.1; comm.sellPrice *= 1.05; } // Slight need for tech
                    break;
                case 'Extraction':
                    caseHit = 'Extraction'; // Produces Metals, Minerals. Needs Food, Machinery, Medicine.
                    if (['Metals', 'Minerals'].includes(comm.name)) { comm.buyPrice *= 0.7; comm.sellPrice *= 0.8; }
                    if (['Food', 'Machinery', 'Medicine', 'Computers'].includes(comm.name)) { comm.buyPrice *= 1.3; comm.sellPrice *= 1.2; }
                    break;
                case 'Refinery':
                    caseHit = 'Refinery'; // Produces Metals, Chemicals. Needs Minerals, Machinery, Food.
                    if (['Metals', 'Chemicals'].includes(comm.name)) { comm.buyPrice *= 0.75; comm.sellPrice *= 0.85; }
                    if (['Minerals', 'Machinery', 'Food', 'Computers'].includes(comm.name)) { comm.buyPrice *= 1.25; comm.sellPrice *= 1.15; }
                    break;
                case 'Tech': // Falls through to High Tech (can separate later if needed)
                case 'High Tech':
                    caseHit = 'Tech/High Tech'; // Produces Computers, Medicine, Adv Components. Needs Food, Metals, Chemicals, Luxury.
                    if (['Computers', 'Medicine', 'Adv Components'].includes(comm.name)) { comm.buyPrice *= 0.7; comm.sellPrice *= 0.8; }
                    if (['Food', 'Metals', 'Chemicals', 'Minerals'].includes(comm.name)) { comm.buyPrice *= 1.4; comm.sellPrice *= 1.3; }
                    if (['Luxury Goods'].includes(comm.name)) { comm.buyPrice *= 1.1; comm.sellPrice *= 1.05; } // Slightly higher demand
                    break;
                case 'Tourism':
                    caseHit = 'Tourism'; // Needs Food, Medicine, Luxury Goods, Textiles.
                    if (['Food', 'Medicine', 'Luxury Goods', 'Textiles'].includes(comm.name)) { comm.buyPrice *= 1.3; comm.sellPrice *= 1.2; }
                    if (['Metals', 'Minerals', 'Chemicals', 'Machinery'].includes(comm.name)) { comm.buyPrice *= 1.5; comm.sellPrice *= 1.4; } // No production
                    break;
                case 'Service':
                    caseHit = 'Service'; // Needs Food, Computers, Machinery, Medicine, Textiles.
                    if (['Food', 'Computers', 'Machinery', 'Medicine', 'Textiles'].includes(comm.name)) { comm.buyPrice *= 1.2; comm.sellPrice *= 1.1; }
                     if (['Metals', 'Minerals', 'Chemicals', 'Luxury Goods', 'Adv Components'].includes(comm.name)) { comm.buyPrice *= 1.4; comm.sellPrice *= 1.3; } // No production
                    break;
                default:
                    caseHit = 'default';
                    console.warn(`Market: Unhandled or default economy type '${this.systemType}' - using base prices.`);
                    break;
            }
            // Ensure prices are integers and non-negative, avoid zero prices
            comm.buyPrice = max(1, floor(comm.buyPrice));
            comm.sellPrice = max(1, floor(comm.sellPrice));
            // console.log(`     -> ${comm.name}: Buy=${comm.buyPrice}, Sell=${comm.sellPrice} (Case: ${caseHit})`); // Debug log
        });
         console.log(` <- Prices updated.`);
    }

    // --- updatePlayerCargo, buy, sell, getPrices remain the same ---
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

        const cost = comm.buyPrice * quantity;
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
        let spendSuccess = player.spendCredits(cost); // Attempt to deduct credits
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

    // Handles player attempt to sell commodities
    sell(commodityName, quantity, player) {
        console.log(`--- Market.sell Attempt ---`);
        console.log(`Item: ${commodityName}, Qty: ${quantity}`);

        // Essential checks
        if (!player) { console.error("SELL FAILED: Player object missing."); return false; }
        if (quantity <= 0) { console.log("SELL FAILED: Quantity <= 0."); return false; }

        const comm = this.commodities.find(c => c.name === commodityName);
        if (!comm) { console.error(`SELL FAILED: Commodity ${commodityName} not found in market.`); return false; }

        // Check if player actually has enough of the item
        const itemInCargo = player.cargo.find(item => item && item.name === commodityName); // Added check for item
         if (!itemInCargo || itemInCargo.quantity < quantity) {
            console.log(`SELL FAILED: Not enough ${commodityName} in cargo (Have: ${itemInCargo ? itemInCargo.quantity : 0}, Need: ${quantity})`);
            return false;
         }

        // --- If checks pass, proceed ---
        const income = comm.sellPrice * quantity;
        console.log(`Attempting to sell ${quantity} ${commodityName} for ${income} credits.`);

        // Perform transaction: Add credits, remove cargo
        player.addCredits(income);
        player.removeCargo(commodityName, quantity);
        this.updatePlayerCargo(player.cargo); // Update market display

        console.log(`--- Market.sell SUCCESS ---`);
        // Consider saving game state after a successful trade
         if (typeof saveGame === 'function') {
             saveGame();
         }
        return true; // Indicate successful sale
    }

    // Returns the list of commodities with current prices and player stock
    getPrices() {
        // Return a deep copy to prevent external modification of market state
        return JSON.parse(JSON.stringify(this.commodities));
        // Or just return the reference if performance is critical and external mutation isn't a concern:
        // return this.commodities;
    }

} // End of Market Class