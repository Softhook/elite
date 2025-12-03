// ****** uiMarket.js ******
// Market screen rendering and trading logic.
// This file must be loaded BEFORE uiManager.js

// Constants for space object trading prices
const SPACE_OBJECT_PRODUCE_DISCOUNT = 0.60;
const SPACE_OBJECT_DEMAND_PREMIUM = 1.50;

/**
 * UIMarket - Handles all market-related UI rendering and trading.
 */
class UIMarket {
    constructor() {
        // Button areas for click detection
        this.buttonAreas = [];
        this.backButtonArea = {};
        
        // Space object market button areas
        this.spaceObjectButtonAreas = [];
        this.spaceObjectBackButtonArea = {};
        
        // Button repeat/hold state
        this.buttonHeld = null;
        this.lastButtonAction = 0;
        this.buttonRepeatDelay = 150;
    }

    /**
     * Returns a default list of commodities when station market is not available.
     * @returns {Array}
     */
    getDefaultCommodityList() {
        return [
            { name: 'Food' },
            { name: 'Textiles' },
            { name: 'Machinery' },
            { name: 'Metals' },
            { name: 'Minerals' },
            { name: 'Chemicals' },
            { name: 'Computers' },
            { name: 'Medicine' },
            { name: 'Adv Components' },
            { name: 'Luxury Goods' },
            { name: 'Narcotics' },
            { name: 'Weapons' },
            { name: 'Slaves' }
        ];
    }

    /**
     * Gets base price for a commodity.
     * @param {string} commodityName
     * @returns {number}
     */
    getCommodityBasePrice(commodityName) {
        const basePrices = {
            'Food': 10,
            'Textiles': 15,
            'Machinery': 100,
            'Metals': 50,
            'Minerals': 40,
            'Chemicals': 70,
            'Computers': 250,
            'Medicine': 150,
            'Adv Components': 400,
            'Luxury Goods': 500,
            'Narcotics': 800,
            'Weapons': 1200,
            'Slaves': 1500
        };
        return basePrices[commodityName] || 50;
    }

    /**
     * Draws the station commodity market screen.
     * @param {Market} market - The station market object
     * @param {Player} player - The player object
     * @param {UIManager} uiManager - The UI Manager instance
     */
    drawStationMarket(market, player, uiManager) {
        if (!market || !player || typeof market.getPrices !== 'function') return;
        
        market.updatePlayerCargo(player.cargo);
        const commodities = market.getPrices();
        this.buttonAreas = [];
        this.backButtonArea = {};
        
        // Sync button areas to UIManager for backward compatibility
        uiManager.marketButtonAreas = this.buttonAreas;
        uiManager.marketBackButtonArea = this.backButtonArea;

        const panelRect = uiManager.getPanelRect();
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        
        push();
        uiManager.drawPanelBG(STANDARD_PANEL_BG, [255, 100, 100]);
        
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = uiManager.drawStationHeader("Commodity Market", station, player, system);
        
        // Table setup
        let sY = pY + headerHeight + 40;
        let tW = pW - 60;
        let sX = pX + 30;
        
        const rowH = 30;
        const btnW = 100;
        const btnH = rowH * 0.8;
        
        // Column layout
        const numDataColumns = 5;
        const btnSpacing = 5;
        const totalBtnWidth = (btnW * 4) + (btnSpacing * 3);
        const remainingWidth = tW - totalBtnWidth;
        const colWidth = Math.floor(remainingWidth / numDataColumns);
        const colCommodity = colWidth;
        const colBuy = colWidth;
        const colSell = colWidth;
        const colStock = colWidth;
        const colCargo = colWidth;

        const maxDeviation = 0.8;

        // Draw column headers
        let headerY = sY - 20;
        fill(255);
        textAlign(LEFT, CENTER);
        text("Commodity", sX + 10, headerY);
        textAlign(CENTER, CENTER);
        text("Buy", sX + colCommodity + colBuy / 2, headerY);
        text("Sell", sX + colCommodity + colBuy + colSell / 2, headerY);
        text("Stock", sX + colCommodity + colBuy + colSell + colStock / 2, headerY);
        text("Cargo Hold", sX + colCommodity + colBuy + colSell + colStock + colCargo / 2, headerY);

        // Draw commodity rows
        const commoditiesLen = commodities ? commodities.length : 0;
        for (let i = 0; i < commoditiesLen; i++) {
            const comm = commodities[i];
            if (!comm) continue;
            let yP = sY + i * rowH;
            let tY = yP + rowH / 2;

            // Alternating row background
            UIComponents.drawAlternatingRow(i, sX, yP, tW, rowH);

            const isIllegalInSystem = !comm.isLegal && system?.securityLevel !== 'Anarchy';
            const stockQty = Math.max(0, Math.floor(comm.stock ?? 0));
            const outOfStock = stockQty <= 0;
            
            // Commodity name
            if (isIllegalInSystem) {
                fill(120);
            } else {
                fill(255);
            }
            
            textAlign(LEFT, CENTER);
            text(comm.name || '?', sX + 10, tY, colCommodity - 15);
            
            if (!comm.isLegal) {
                if (isIllegalInSystem) {
                    textAlign(LEFT, CENTER);
                    fill(255, 0, 0);
                    text("ILLEGAL", sX + 10 + textWidth(comm.name || '?') + 15, tY);
                } 
            }
            
            textAlign(CENTER, CENTER);
            
            // Buy price with color coding
            if (comm.baseBuy > 0) {
                let buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                fill(...UIComponents.getPriceDeviationColor(buyDeviation, false));
            } else {
                fill(255);
            }
            text(comm.buyPrice ?? '?', sX + colCommodity + colBuy / 2, tY);
            
            // Sell price with color coding
            if (comm.baseSell > 0) {
                let sellDeviation = (comm.sellPrice - comm.baseSell) / comm.baseSell;
                fill(...UIComponents.getPriceDeviationColor(sellDeviation, true));
            } else {
                fill(255);
            }
            text(comm.sellPrice ?? '?', sX + colCommodity + colBuy + colSell / 2, tY);

            // Stock display
            fill(...UIComponents.getStockColor(stockQty, outOfStock));
            text(stockQty, sX + colCommodity + colBuy + colSell + colStock / 2, tY);

            fill(255);
            text(comm.playerStock ?? '?', sX + colCommodity + colBuy + colSell + colStock + colCargo / 2, tY);

            // Price indicators
            if (comm.baseBuy > 0) {
                const buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                UIComponents.drawPriceIndicator(sX + colCommodity + colBuy + 5, yP, rowH, buyDeviation, false, maxDeviation);
            }
            if (comm.baseSell > 0) {
                const sellDeviation = (comm.sellPrice - comm.baseSell) / comm.baseSell;
                UIComponents.drawPriceIndicator(sX + colCommodity + colBuy + colSell + 5, yP, rowH, sellDeviation, true, maxDeviation);
            }

            // Buttons
            const rightEdge = sX + tW;
            let btnStartX = rightEdge - totalBtnWidth;
            const isMissionCargo = player.activeMission?.cargoType === comm.name;
            const btnY = yP + (rowH - btnH) / 2;

            // Buy 1 button
            let buy1X = btnStartX;
            const buy1Enabled = !isIllegalInSystem && !outOfStock;
            const buy1Area = UIComponents.drawMarketButton(buy1X, btnY, btnW, btnH, "Buy 1", buy1Enabled, true, outOfStock ? "Out" : null);
            if (buy1Area) this.buttonAreas.push({ ...buy1Area, action: 'buy', quantity: 1, commodity: comm.name });

            // Buy All button
            let buyAllX = buy1X + btnW + 5;
            const buyAllArea = UIComponents.drawMarketButton(buyAllX, btnY, btnW, btnH, "Buy All", buy1Enabled, true, outOfStock ? "Out" : null);
            if (buyAllArea) this.buttonAreas.push({ ...buyAllArea, action: 'buyAll', commodity: comm.name });

            // Sell 1 button
            let sell1X = buyAllX + btnW + 10;
            const sellEnabled = !isIllegalInSystem && !isMissionCargo;
            const sell1Area = UIComponents.drawMarketButton(sell1X, btnY, btnW, btnH, "Sell 1", sellEnabled, false);
            if (sell1Area) this.buttonAreas.push({ ...sell1Area, action: 'sell', quantity: 1, commodity: comm.name });

            // Sell All button
            let sellAllX = sell1X + btnW + 5;
            const sellAllArea = UIComponents.drawMarketButton(sellAllX, btnY, btnW, btnH, "Sell All", sellEnabled, false);
            if (sellAllArea) this.buttonAreas.push({ ...sellAllArea, action: 'sellAll', commodity: comm.name });
        }

        // Back button
        const backW = 100, backH = 30;
        const backX = pX + pW / 2 - backW / 2;
        const backY = pY + pH - backH - 15;
        this.backButtonArea = UIComponents.drawButton(backX, backY, backW, backH, "Back", [0, 80, 180], [100, 150, 255]);
    }

    /**
     * Draws the space object commodity market screen.
     * @param {SpaceObject} spaceObject - The space object
     * @param {Player} player - The player object
     * @param {UIManager} uiManager - The UI Manager instance
     */
    drawSpaceObjectMarket(spaceObject, player, uiManager) {
        if (!spaceObject || !player) return;
        
        this.spaceObjectButtonAreas = [];
        this.spaceObjectBackButtonArea = {};
        
        // Sync button areas to UIManager for backward compatibility
        uiManager.spaceObjectMarketButtonAreas = this.spaceObjectButtonAreas;
        uiManager.spaceObjectMarketBackButtonArea = this.spaceObjectBackButtonArea;
        
        const panelRect = uiManager.getPanelRect();
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        
        push();
        uiManager.drawPanelBG(STANDARD_PANEL_BG, [255, 100, 100]);
        
        const system = galaxy?.getCurrentSystem();
        const headerHeight = uiManager.drawSpaceObjectHeader("Commodity Market", spaceObject, player, system);
        
        // Get tradable commodities
        const tradable = spaceObject.getTradableCommodities ? spaceObject.getTradableCommodities() : { produces: [], buys: [] };
        const producesSet = new Set(tradable.produces || []);
        const buysSet = new Set(tradable.buys || []);
        
        // Get station market for price reference
        const station = system?.station;
        const stationMarket = station?.market;
        
        // Table setup
        let sY = pY + headerHeight + 40;
        let tW = pW - 60;
        let sX = pX + 30;
        
        const rowH = 30;
        const btnW = 100;
        const btnH = rowH * 0.8;
        
        const numDataColumns = 4;
        const btnSpacing = 5;
        const totalBtnWidth = (btnW * 4) + (btnSpacing * 3);
        const remainingWidth = tW - totalBtnWidth;
        const colWidth = Math.floor(remainingWidth / numDataColumns);
        const colCommodity = colWidth;
        const colBuy = colWidth;
        const colSell = colWidth;
        const colCargo = colWidth;
        
        const maxDeviation = 0.8;
        
        // Draw column headers
        let headerY = sY - 20;
        fill(255);
        textAlign(LEFT, CENTER);
        text("Commodity", sX + 10, headerY);
        textAlign(CENTER, CENTER);
        text("Buy", sX + colCommodity + colBuy / 2, headerY);
        text("Sell", sX + colCommodity + colBuy + colSell / 2, headerY);
        text("Cargo Hold", sX + colCommodity + colBuy + colSell + colCargo / 2, headerY);
        
        // Get all commodities
        const allCommodities = stationMarket ? stationMarket.getPrices() : this.getDefaultCommodityList();
        
        // Draw commodity rows
        for (let i = 0; i < allCommodities.length; i++) {
            const comm = allCommodities[i];
            if (!comm) continue;
            
            const commodityName = comm.name;
            const isProduced = producesSet.has(commodityName);
            const isBought = buysSet.has(commodityName);
            const isAvailable = isProduced || isBought;
            
            let yP = sY + i * rowH;
            let tY = yP + rowH / 2;
            
            // Alternating row background
            UIComponents.drawAlternatingRow(i, sX, yP, tW, rowH);
            
            // Get player cargo for this commodity
            const playerItem = player.cargo.find(item => item && item.name === commodityName);
            const playerQty = playerItem ? playerItem.quantity : 0;
            
            // Calculate prices
            let buyPrice = 0;
            let sellPrice = 0;
            let baseBuy = 0;
            let baseSell = 0;
            
            if (stationMarket) {
                const stationPrices = stationMarket.getPrices();
                const stationComm = stationPrices ? stationPrices.find(c => c.name === commodityName) : null;
                if (stationComm) {
                    if (isProduced) {
                        buyPrice = Math.floor(stationComm.buyPrice * SPACE_OBJECT_PRODUCE_DISCOUNT);
                        baseBuy = stationComm.baseBuy || stationComm.buyPrice;
                    }
                    if (isBought) {
                        sellPrice = Math.floor(stationComm.sellPrice * SPACE_OBJECT_DEMAND_PREMIUM);
                        baseSell = stationComm.baseSell || stationComm.sellPrice;
                    }
                }
            } else {
                const basePrice = this.getCommodityBasePrice(commodityName);
                if (isProduced) {
                    buyPrice = Math.floor(basePrice * 0.8);
                    baseBuy = basePrice;
                }
                if (isBought) {
                    sellPrice = Math.floor(basePrice * 1.2);
                    baseSell = basePrice;
                }
            }
            
            // Commodity name
            textAlign(LEFT, CENTER);
            fill(isAvailable ? 255 : 100);
            text(commodityName || '?', sX + 10, tY, colCommodity - 15);
            
            // Buy price
            textAlign(CENTER, CENTER);
            if (isProduced && buyPrice > 0) {
                if (baseBuy > 0) {
                    let buyDeviation = (buyPrice - baseBuy) / baseBuy;
                    fill(...UIComponents.getPriceDeviationColor(buyDeviation, false));
                } else {
                    fill(255);
                }
                text(buyPrice, sX + colCommodity + colBuy / 2, tY);
            } else {
                fill(80);
                text("-", sX + colCommodity + colBuy / 2, tY);
            }
            
            // Sell price
            if (isBought && sellPrice > 0) {
                if (baseSell > 0) {
                    let sellDeviation = (sellPrice - baseSell) / baseSell;
                    fill(...UIComponents.getPriceDeviationColor(sellDeviation, true));
                } else {
                    fill(255);
                }
                text(sellPrice, sX + colCommodity + colBuy + colSell / 2, tY);
            } else {
                fill(80);
                text("-", sX + colCommodity + colBuy + colSell / 2, tY);
            }
            
            // Cargo amount
            fill(playerQty > 0 ? 255 : 80);
            text(playerQty, sX + colCommodity + colBuy + colSell + colCargo / 2, tY);
            
            // Price indicators
            if (isProduced && baseBuy > 0 && buyPrice > 0) {
                const buyDeviation = (buyPrice - baseBuy) / baseBuy;
                UIComponents.drawPriceIndicator(sX + colCommodity + colBuy + 5, yP, rowH, buyDeviation, false, maxDeviation);
            }
            if (isBought && baseSell > 0 && sellPrice > 0) {
                const sellDeviation = (sellPrice - baseSell) / baseSell;
                UIComponents.drawPriceIndicator(sX + colCommodity + colBuy + colSell + 5, yP, rowH, sellDeviation, true, maxDeviation);
            }
            
            // Buttons
            const rightEdge = sX + tW;
            let btnStartX = rightEdge - totalBtnWidth;
            const isMissionCargo = player.activeMission?.cargoType === commodityName;
            
            // Buy 1 button
            let buy1X = btnStartX;
            let buy1Y = yP + (rowH - btnH) / 2;
            
            if (!isProduced) {
                fill(40); noStroke();
                rect(buy1X, buy1Y, btnW, btnH, 3);
                UIComponents.drawButtonLabel("Buy 1", buy1X, buy1Y, btnW, btnH, 60);
            } else {
                const canBuy = buyPrice > 0 && player.credits >= buyPrice && player.getCargoAmount() < player.cargoCapacity;
                if (canBuy) {
                    fill(0, 150, 0); stroke(0, 200, 0); strokeWeight(1);
                    rect(buy1X, buy1Y, btnW, btnH, 3);
                    UIComponents.drawButtonLabel("Buy 1", buy1X, buy1Y, btnW, btnH, 255);
                    this.spaceObjectButtonAreas.push({
                        x: buy1X, y: buy1Y, w: btnW, h: btnH,
                        action: "BUY_COMMODITY", quantity: 1, commodity: commodityName, price: buyPrice
                    });
                } else {
                    fill(60); stroke(80); strokeWeight(1);
                    rect(buy1X, buy1Y, btnW, btnH, 3);
                    UIComponents.drawButtonLabel("Buy 1", buy1X, buy1Y, btnW, btnH, 100);
                }
            }
            
            // Buy All button
            let buyAllX = buy1X + btnW + btnSpacing;
            let buyAllY = buy1Y;
            
            if (!isProduced) {
                fill(40); noStroke();
                rect(buyAllX, buyAllY, btnW, btnH, 3);
                UIComponents.drawButtonLabel("Buy All", buyAllX, buyAllY, btnW, btnH, 60);
            } else {
                const canBuy = buyPrice > 0 && player.credits >= buyPrice && player.getCargoAmount() < player.cargoCapacity;
                if (canBuy) {
                    fill(0, 180, 0); stroke(0, 220, 0); strokeWeight(1);
                    rect(buyAllX, buyAllY, btnW, btnH, 3);
                    UIComponents.drawButtonLabel("Buy All", buyAllX, buyAllY, btnW, btnH, 255);
                    this.spaceObjectButtonAreas.push({
                        x: buyAllX, y: buyAllY, w: btnW, h: btnH,
                        action: "BUY_ALL_COMMODITY", commodity: commodityName, price: buyPrice
                    });
                } else {
                    fill(60); stroke(80); strokeWeight(1);
                    rect(buyAllX, buyAllY, btnW, btnH, 3);
                    UIComponents.drawButtonLabel("Buy All", buyAllX, buyAllY, btnW, btnH, 100);
                }
            }
            
            // Sell 1 button
            let sell1X = buyAllX + btnW + 10;
            let sell1Y = buy1Y;
            
            if (!isBought || isMissionCargo) {
                fill(isMissionCargo ? 100 : 40);
                stroke(isMissionCargo ? 120 : 0);
                if (isMissionCargo) strokeWeight(1); else noStroke();
                rect(sell1X, sell1Y, btnW, btnH, 3);
                UIComponents.drawButtonLabel("Sell 1", sell1X, sell1Y, btnW, btnH, isMissionCargo ? 180 : 60);
            } else {
                const canSell = sellPrice > 0 && playerQty > 0;
                if (canSell) {
                    fill(150, 0, 0); stroke(200, 0, 0); strokeWeight(1);
                    rect(sell1X, sell1Y, btnW, btnH, 3);
                    UIComponents.drawButtonLabel("Sell 1", sell1X, sell1Y, btnW, btnH, 255);
                    this.spaceObjectButtonAreas.push({
                        x: sell1X, y: sell1Y, w: btnW, h: btnH,
                        action: "SELL_COMMODITY", quantity: 1, commodity: commodityName, price: sellPrice
                    });
                } else {
                    fill(60); stroke(80); strokeWeight(1);
                    rect(sell1X, sell1Y, btnW, btnH, 3);
                    UIComponents.drawButtonLabel("Sell 1", sell1X, sell1Y, btnW, btnH, 100);
                }
            }
            
            // Sell All button
            let sellAllX = sell1X + btnW + btnSpacing;
            let sellAllY = buy1Y;
            
            if (!isBought || isMissionCargo) {
                fill(isMissionCargo ? 100 : 40);
                stroke(isMissionCargo ? 120 : 0);
                if (isMissionCargo) strokeWeight(1); else noStroke();
                rect(sellAllX, sellAllY, btnW, btnH, 3);
                UIComponents.drawButtonLabel("Sell All", sellAllX, sellAllY, btnW, btnH, isMissionCargo ? 180 : 60);
            } else {
                const canSell = sellPrice > 0 && playerQty > 0;
                if (canSell) {
                    fill(180, 0, 0); stroke(220, 0, 0); strokeWeight(1);
                    rect(sellAllX, sellAllY, btnW, btnH, 3);
                    UIComponents.drawButtonLabel("Sell All", sellAllX, sellAllY, btnW, btnH, 255);
                    this.spaceObjectButtonAreas.push({
                        x: sellAllX, y: sellAllY, w: btnW, h: btnH,
                        action: "SELL_ALL_COMMODITY", commodity: commodityName, price: sellPrice
                    });
                } else {
                    fill(60); stroke(80); strokeWeight(1);
                    rect(sellAllX, sellAllY, btnW, btnH, 3);
                    UIComponents.drawButtonLabel("Sell All", sellAllX, sellAllY, btnW, btnH, 100);
                }
            }
        }
        
        // Back button
        const backW = 100, backH = 30;
        const backX = pX + pW / 2 - backW / 2;
        const backY = pY + pH - backH - 15;
        this.spaceObjectBackButtonArea = UIComponents.drawButton(backX, backY, backW, backH, "Back", [0, 80, 180], [100, 150, 255]);
    }

    /**
     * Handles mouse press on market screen.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Market} market - The market object
     * @param {Player} player - The player object
     * @returns {boolean} True if handled
     */
    handleMousePress(mx, my, market, player) {
        // Check back button
        if (UIComponents.isClickInArea(mx, my, this.backButtonArea)) { 
            if (gameStateManager) gameStateManager.setState("DOCKED"); 
            return true; 
        }
        
        // Check market buttons
        for (const btn of this.buttonAreas) {
            if (UIComponents.isClickInArea(mx, my, btn)) {
                this.buttonHeld = btn;
                this.performAction(btn, market, player);
                this.lastButtonAction = millis();
                return true;
            }
        }
        return false;
    }

    /**
     * Handles mouse release.
     */
    handleMouseRelease() {
        this.buttonHeld = null;
        return false;
    }

    /**
     * Checks for held buttons and repeats action.
     * @param {Market} market
     * @param {Player} player
     */
    checkButtonHeld(market, player) {
        if (this.buttonHeld && millis() - this.lastButtonAction > this.buttonRepeatDelay) {
            this.performAction(this.buttonHeld, market, player);
            this.lastButtonAction = millis();
        }
    }

    /**
     * Performs a market action.
     * @param {Object} btn - Button area with action info
     * @param {Market} market - The market object
     * @param {Player} player - The player object
     */
    performAction(btn, market, player) {
        if (!market || !player || !btn) return;
        
        switch (btn.action) {
            case 'buy':
                market.buy(btn.commodity, 1, player);
                break;
            case 'buyAll':
                const item = market.getPrices().find(c => c.name === btn.commodity);
                if (!item) return;
                
                const availableSpace = player.cargoCapacity - player.getCargoAmount();
                const maxAffordable = Math.floor(player.credits / item.buyPrice);
                const availableStock = Number.isFinite(item.stock) ? Math.max(0, Math.floor(item.stock)) : Number.POSITIVE_INFINITY;
                const quantity = Math.min(availableSpace, maxAffordable, availableStock);
                
                if (quantity > 0) {
                    market.buy(btn.commodity, quantity, player);
                }
                break;
            case 'sell':
                market.sell(btn.commodity, 1, player);
                break;
            case 'sellAll':
                const cargo = player.cargo.find(c => c.name === btn.commodity);
                if (cargo && cargo.quantity > 0) {
                    market.sell(btn.commodity, cargo.quantity, player);
                }
                break;
        }
    }

    /**
     * Handles commodity buy/sell click for space object markets.
     * @param {Object} btn - The clicked button area
     * @param {Player} player - The player object
     * @param {Object} tradeInfo - Info for logging
     * @param {UIHUD} hud - HUD for messages
     * @returns {boolean}
     */
    handleSpaceObjectTrade(btn, player, tradeInfo, hud) {
        if (!btn || !player) return false;
        
        const { locationName = 'Unknown', systemName = 'Unknown' } = tradeInfo;
        
        const logTrade = () => {
            if (typeof player.recordStationTrade === 'function') {
                player.recordStationTrade(locationName, systemName);
            }
            if (typeof saveGame === 'function') saveGame();
        };
        
        switch (btn.action) {
            case 'BUY_COMMODITY': {
                const price = btn.price || 0;
                if (player.credits >= price && player.getCargoAmount() < player.cargoCapacity) {
                    player.spendCredits(price);
                    player.addCargo(btn.commodity, 1);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('buyConfirm');
                    if (hud) hud.addMessage(`Bought 1 ${btn.commodity} for ${price} credits`, [100, 200, 255]);
                    logTrade();
                } else {
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                    if (hud) hud.addMessage(player.credits < price ? "Not enough credits" : "Cargo hold is full", [255, 100, 100]);
                }
                return true;
            }
            case 'BUY_ALL_COMMODITY': {
                const price = btn.price || 0;
                const space = player.cargoCapacity - player.getCargoAmount();
                const afford = Math.floor(player.credits / price);
                const qty = Math.min(space, afford);
                if (qty > 0) {
                    const totalCost = price * qty;
                    player.spendCredits(totalCost);
                    player.addCargo(btn.commodity, qty);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('buyConfirm');
                    if (hud) hud.addMessage(`Bought ${qty} ${btn.commodity} for ${totalCost} credits`, [100, 200, 255]);
                    logTrade();
                } else {
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                    if (hud) hud.addMessage(player.credits < price ? "Not enough credits" : "Cargo hold is full", [255, 100, 100]);
                }
                return true;
            }
            case 'SELL_COMMODITY': {
                const price = btn.price || 0;
                const cargo = player.cargo.find(c => c.name === btn.commodity);
                if (cargo?.quantity > 0) {
                    player.addCredits(price);
                    player.removeCargo(btn.commodity, 1);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('sellConfirm');
                    if (hud) hud.addMessage(`Sold 1 ${btn.commodity} for ${price} credits`, [100, 255, 100]);
                    logTrade();
                } else {
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
                return true;
            }
            case 'SELL_ALL_COMMODITY': {
                const price = btn.price || 0;
                const cargo = player.cargo.find(c => c.name === btn.commodity);
                if (cargo?.quantity > 0) {
                    const qty = cargo.quantity;
                    const total = price * qty;
                    player.addCredits(total);
                    player.removeCargo(btn.commodity, qty);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('sellConfirm');
                    if (hud) hud.addMessage(`Sold ${qty} ${btn.commodity} for ${total} credits`, [100, 255, 100]);
                    logTrade();
                } else {
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
                return true;
            }
        }
        
        return false;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.UIMarket = UIMarket;
}
