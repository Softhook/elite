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
            }
            // Ensure prices are integers and non-negative
            comm.buyPrice = max(1, floor(comm.buyPrice));
            comm.sellPrice = max(1, floor(comm.sellPrice));
        });
    }

    updatePlayerCargo(playerCargo) {
         this.commodities.forEach(comm => {
             const itemInCargo = playerCargo.find(item => item.name === comm.name);
             comm.playerStock = itemInCargo ? itemInCargo.quantity : 0;
         });
    }


    buy(commodityName, quantity, player) {
        const comm = this.commodities.find(c => c.name === commodityName);
        if (!comm) return false;

        const cost = comm.buyPrice * quantity;
        const currentCargoAmount = player.getCargoAmount();
        const remainingCapacity = player.cargoCapacity - currentCargoAmount;

        if (quantity <= 0) return false;
        if (cost > player.credits) {
            console.log("Not enough credits!");
            // Add UI feedback later
            return false;
        }
        if (quantity > remainingCapacity) {
             console.log("Not enough cargo space!");
             // Add UI feedback later
            return false;
        }

        player.spendCredits(cost);
        player.addCargo(commodityName, quantity);
        this.updatePlayerCargo(player.cargo); // Update market view
        console.log(`Bought ${quantity} ${commodityName} for ${cost} credits.`);
        return true;
    }

    sell(commodityName, quantity, player) {
        const comm = this.commodities.find(c => c.name === commodityName);
        if (!comm) return false;

        const itemInCargo = player.cargo.find(item => item.name === commodityName);
         if (!itemInCargo || itemInCargo.quantity < quantity) {
            console.log("Not enough items to sell!");
            // Add UI feedback later
            return false;
         }
         if (quantity <= 0) return false;

        const income = comm.sellPrice * quantity;
        player.addCredits(income);
        player.removeCargo(commodityName, quantity);
        this.updatePlayerCargo(player.cargo); // Update market view
        console.log(`Sold ${quantity} ${commodityName} for ${income} credits.`);
        return true;
    }

    getPrices() {
        return this.commodities;
    }
}