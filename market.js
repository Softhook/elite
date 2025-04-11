// ****** market.js ******

class Market {
    constructor(systemType) {
        this.systemType = systemType;
        this.commodities = [
            // Base prices - will be adjusted
            { name: 'Food', baseBuy: 10, baseSell: 8, buyPrice: 0, sellPrice: 0, playerStock: 0 },
            { name: 'Machinery', baseBuy: 100, baseSell: 90, buyPrice: 0, sellPrice: 0, playerStock: 0 },
            { name: 'Computers', baseBuy: 250, baseSell: 220, buyPrice: 0, sellPrice: 0, playerStock: 0 },
            // Add more later...
        ];
        this.updatePrices();
    }

    // Simple price adjustment based on economy type
    updatePrices() {
        this.commodities.forEach(comm => {
            comm.buyPrice = comm.baseBuy;
            comm.sellPrice = comm.baseSell;

            // Example adjustments - make more sophisticated later
            switch (this.systemType) {
                case 'Agricultural':
                    if (comm.name === 'Food') { comm.buyPrice *= 0.7; comm.sellPrice *= 0.8; }
                    if (comm.name === 'Machinery') { comm.buyPrice *= 1.1; comm.sellPrice *= 1.0; }
                    if (comm.name === 'Computers') { comm.buyPrice *= 1.3; comm.sellPrice *= 1.2; }
                    break;
                case 'Industrial':
                     if (comm.name === 'Food') { comm.buyPrice *= 1.2; comm.sellPrice *= 1.1; }
                    if (comm.name === 'Machinery') { comm.buyPrice *= 0.8; comm.sellPrice *= 0.9; }
                    if (comm.name === 'Computers') { comm.buyPrice *= 1.1; comm.sellPrice *= 1.0; }
                    break;
                case 'Tech':
                     if (comm.name === 'Food') { comm.buyPrice *= 1.5; comm.sellPrice *= 1.4; }
                     if (comm.name === 'Machinery') { comm.buyPrice *= 1.2; comm.sellPrice *= 1.1; }
                    if (comm.name === 'Computers') { comm.buyPrice *= 0.7; comm.sellPrice *= 0.8; }
                    break;
                 default: // No adjustments for unknown types
                     break;
            }
            // Ensure prices are integers and non-negative
            comm.buyPrice = max(1, floor(comm.buyPrice));
            comm.sellPrice = max(1, floor(comm.sellPrice));
        });
    }

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
        // Consider returning a deep copy if modification outside is a concern
        return this.commodities;
    }
} // End of Market Class