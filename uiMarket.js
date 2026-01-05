// ****** uiMarket.js ******
// Market screen rendering and trading logic.
// This file must be loaded BEFORE uiManager.js
// Note: SPACE_OBJECT_PRODUCE_DISCOUNT and SPACE_OBJECT_DEMAND_PREMIUM are defined in uiManager.js

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
     * Calculates column positions for market table layout.
     * @param {number} tableWidth - Total table width
     * @param {number} startX - Starting X position
     * @param {number} btnW - Button width
     * @param {boolean} [includeStock=true] - Whether to include stock column
     * @returns {Object} Column positions and widths
     * @private
     */
    _calculateMarketColumns(tableWidth, startX, btnW, includeStock = true) {
        const btnSpacing = 5;
        const totalBtnWidth = (btnW * 4) + (btnSpacing * 3);
        const remainingWidth = tableWidth - totalBtnWidth;

        // Give commodity column more width (1.5x) to accommodate longer names like "Adv Components"
        const numDataColumns = includeStock ? 5 : 4;
        const commodityMultiplier = 1.5;
        const totalUnits = numDataColumns - 1 + commodityMultiplier; // Other columns get 1 unit, commodity gets 1.5x
        const unitWidth = Math.floor(remainingWidth / totalUnits);
        const commodityWidth = Math.floor(unitWidth * commodityMultiplier);
        const colWidth = unitWidth;

        if (includeStock) {
            return {
                commodityX: startX,
                commodityW: commodityWidth,
                buyX: startX + commodityWidth + colWidth / 2,
                sellX: startX + commodityWidth + colWidth + colWidth / 2,
                stockX: startX + commodityWidth + colWidth * 2 + colWidth / 2,
                cargoX: startX + commodityWidth + colWidth * 3 + colWidth / 2,
                buttonsStart: startX + tableWidth - totalBtnWidth,
                totalWidth: tableWidth,
                colWidth: colWidth,
                totalBtnWidth: totalBtnWidth,
                btnSpacing: btnSpacing
            };
        } else {
            return {
                commodityX: startX,
                commodityW: commodityWidth,
                buyX: startX + commodityWidth + colWidth / 2,
                sellX: startX + commodityWidth + colWidth + colWidth / 2,
                cargoX: startX + commodityWidth + colWidth * 2 + colWidth / 2,
                buttonsStart: startX + tableWidth - totalBtnWidth,
                totalWidth: tableWidth,
                colWidth: colWidth,
                totalBtnWidth: totalBtnWidth,
                btnSpacing: btnSpacing
            };
        }
    }

    /**
     * Draws market column headers.
     * @param {number} sX - Start X position
     * @param {number} headerY - Y position for headers
     * @param {Object} columns - Column positions from _calculateMarketColumns
     * @param {boolean} [showStock=true] - Whether to show stock column
     * @private
     */
    _drawMarketHeaders(sX, headerY, columns, showStock = true) {
        fill(255);
        textAlign(LEFT, CENTER);
        text("Commodity", sX + 10, headerY);
        textAlign(CENTER, CENTER);
        text("Buy", columns.buyX, headerY);
        text("Sell", columns.sellX, headerY);
        if (showStock && columns.stockX) {
            text("Stock", columns.stockX, headerY);
        }
        text("Cargo Hold", columns.cargoX, headerY);
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
            'Computers': 200,
            'Medicine': 120,
            'Adv Components': 280,
            'Luxury Goods': 320,
            'Narcotics': 350,
            'Weapons': 380,
            'Slaves': 400
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

        // Sync button areas array to UIManager (arrays sync by reference)
        uiManager.marketButtonAreas = this.buttonAreas;

        const panelRect = uiManager.getPanelRect();
        const { x: pX, y: pY, w: pW, h: pH } = panelRect;

        push();
        uiManager.drawPanelBG(STANDARD_PANEL_BG, [255, 100, 100]);

        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = uiManager.drawStationHeader("Commodity Market", station, player, system);

        // Table setup
        const sY = pY + headerHeight + 40;
        const tW = pW - 60;
        const sX = pX + 30;
        const rowH = 30;
        const btnW = 100;
        const btnH = rowH * 0.8;
        const maxDeviation = 0.8;

        // Column layout using helper
        const columns = this._calculateMarketColumns(tW, sX, btnW);

        // Draw column headers
        const headerY = sY - 20;
        this._drawMarketHeaders(sX, headerY, columns, true);

        // Draw commodity rows
        const commoditiesLen = commodities ? commodities.length : 0;
        for (let i = 0; i < commoditiesLen; i++) {
            const comm = commodities[i];
            if (!comm) continue;
            const yP = sY + i * rowH;
            const tY = yP + rowH / 2;

            // Alternating row background
            UIComponents.drawAlternatingRow(i, sX, yP, tW, rowH);

            const isIllegalInSystem = !comm.isLegal && system?.securityLevel !== 'Anarchy';
            const stockQty = Math.max(0, Math.floor(comm.stock ?? 0));
            const outOfStock = stockQty <= 0;

            // Commodity name
            fill(isIllegalInSystem ? 120 : 255);
            textAlign(LEFT, CENTER);
            text(comm.name || '?', sX + 10, tY, columns.commodityW - 15);

            if (!comm.isLegal && isIllegalInSystem) {
                fill(255, 0, 0);
                text("ILLEGAL", sX + 10 + textWidth(comm.name || '?') + 15, tY);
            }

            textAlign(CENTER, CENTER);

            // Buy price with color coding
            if (comm.baseBuy > 0) {
                const buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                fill(...UIComponents.getPriceDeviationColor(buyDeviation, false));
            } else {
                fill(255);
            }
            text(comm.buyPrice ?? '?', columns.buyX, tY);

            // Sell price with color coding
            if (comm.baseSell > 0) {
                const sellDeviation = (comm.sellPrice - comm.baseSell) / comm.baseSell;
                fill(...UIComponents.getPriceDeviationColor(sellDeviation, true));
            } else {
                fill(255);
            }
            text(comm.sellPrice ?? '?', columns.sellX, tY);

            // Stock display
            fill(...UIComponents.getStockColor(stockQty, outOfStock));
            text(stockQty, columns.stockX, tY);

            // Cargo display
            fill(255);
            text(comm.playerStock ?? '?', columns.cargoX, tY);

            // Price indicators
            if (comm.baseBuy > 0) {
                const buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                UIComponents.drawPriceIndicator(columns.buyX + columns.colWidth / 2, yP, rowH, buyDeviation, false, maxDeviation);
            }
            if (comm.baseSell > 0) {
                const sellDeviation = (comm.sellPrice - comm.baseSell) / comm.baseSell;
                UIComponents.drawPriceIndicator(columns.sellX + columns.colWidth / 2, yP, rowH, sellDeviation, true, maxDeviation);
            }

            // Buttons
            const isMissionCargo = player.activeMission?.cargoType === comm.name;
            const btnY = yP + (rowH - btnH) / 2;
            const buy1Enabled = !isIllegalInSystem && !outOfStock;
            const sellEnabled = !isIllegalInSystem && !isMissionCargo;

            // Buy 1 button
            const buy1X = columns.buttonsStart;
            const buy1Area = UIComponents.drawMarketButton(buy1X, btnY, btnW, btnH, "Buy 1", buy1Enabled, true, outOfStock ? "Out" : null);
            if (buy1Area) this.buttonAreas.push({ ...buy1Area, action: 'buy', quantity: 1, commodity: comm.name });

            // Buy All button
            const buyAllX = buy1X + btnW + columns.btnSpacing;
            const buyAllArea = UIComponents.drawMarketButton(buyAllX, btnY, btnW, btnH, "Buy All", buy1Enabled, true, outOfStock ? "Out" : null);
            if (buyAllArea) this.buttonAreas.push({ ...buyAllArea, action: 'buyAll', commodity: comm.name });

            // Sell 1 button
            const sell1X = buyAllX + btnW + 10;
            const sell1Area = UIComponents.drawMarketButton(sell1X, btnY, btnW, btnH, "Sell 1", sellEnabled, false);
            if (sell1Area) this.buttonAreas.push({ ...sell1Area, action: 'sell', quantity: 1, commodity: comm.name });

            // Sell All button
            const sellAllX = sell1X + btnW + columns.btnSpacing;
            const sellAllArea = UIComponents.drawMarketButton(sellAllX, btnY, btnW, btnH, "Sell All", sellEnabled, false);
            if (sellAllArea) this.buttonAreas.push({ ...sellAllArea, action: 'sellAll', commodity: comm.name });
        }

        // Back button
        this.backButtonArea = UIComponents.drawCenteredBackButton(pX, pY, pW, pH);

        // Sync back button area to UIManager AFTER it's drawn
        uiManager.marketBackButtonArea = this.backButtonArea;

        pop();
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

        // Sync button areas array to UIManager (arrays sync by reference)
        uiManager.spaceObjectMarketButtonAreas = this.spaceObjectButtonAreas;

        const panelRect = uiManager.getPanelRect();
        const { x: pX, y: pY, w: pW, h: pH } = panelRect;

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
        const sY = pY + headerHeight + 40;
        const tW = pW - 60;
        const sX = pX + 30;
        const rowH = 30;
        const btnW = 100;
        const btnH = rowH * 0.8;
        const maxDeviation = 0.8;

        // Column layout (no stock column for space objects)
        const columns = this._calculateMarketColumns(tW, sX, btnW, false);

        // Draw column headers
        const headerY = sY - 20;
        this._drawMarketHeaders(sX, headerY, columns, false);

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

            const yP = sY + i * rowH;
            const tY = yP + rowH / 2;

            // Alternating row background
            UIComponents.drawAlternatingRow(i, sX, yP, tW, rowH);

            // Get player cargo for this commodity
            const playerItem = player.cargo.find(item => item && item.name === commodityName);
            const playerQty = playerItem ? playerItem.quantity : 0;

            // Calculate prices
            let buyPrice = 0, sellPrice = 0, baseBuy = 0, baseSell = 0;

            if (stationMarket) {
                const stationPrices = stationMarket.getPrices();
                const stationComm = stationPrices ? stationPrices.find(c => c.name === commodityName) : null;
                if (stationComm) {
                    if (isProduced) {
                        const stationBuy = stationComm.buyPrice || stationComm.baseBuy || baseBuy;
                        buyPrice = Math.floor(stationBuy * SPACE_OBJECT_PRODUCE_DISCOUNT);
                        baseBuy = stationComm.baseBuy || stationBuy;
                    }
                    if (isBought) {
                        const stationSell = stationComm.sellPrice || stationComm.baseSell || baseSell;
                        sellPrice = Math.floor(stationSell * SPACE_OBJECT_DEMAND_PREMIUM);
                        baseSell = stationComm.baseSell || stationSell;
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

            // Ensure underground markets always offer a sell price for their buys, even if the station omits it
            if (isBought && sellPrice <= 0) {
                const fallbackBase = baseSell || this.getCommodityBasePrice(commodityName);
                sellPrice = Math.max(1, Math.floor(fallbackBase * SPACE_OBJECT_DEMAND_PREMIUM));
                baseSell = baseSell || fallbackBase;
            }

            // Commodity name
            textAlign(LEFT, CENTER);
            fill(isAvailable ? 255 : 100);
            text(commodityName || '?', sX + 10, tY, columns.commodityW - 15);

            // Buy price
            textAlign(CENTER, CENTER);
            if (isProduced && buyPrice > 0) {
                const buyDeviation = baseBuy > 0 ? (buyPrice - baseBuy) / baseBuy : 0;
                fill(...UIComponents.getPriceDeviationColor(buyDeviation, false));
                text(buyPrice, columns.buyX, tY);
            } else {
                fill(80);
                text("-", columns.buyX, tY);
            }

            // Sell price
            if (isBought && sellPrice > 0) {
                const sellDeviation = baseSell > 0 ? (sellPrice - baseSell) / baseSell : 0;
                fill(...UIComponents.getPriceDeviationColor(sellDeviation, true));
                text(sellPrice, columns.sellX, tY);
            } else {
                fill(80);
                text("-", columns.sellX, tY);
            }

            // Cargo amount
            fill(playerQty > 0 ? 255 : 80);
            text(playerQty, columns.cargoX, tY);

            // Price indicators
            if (isProduced && baseBuy > 0 && buyPrice > 0) {
                const buyDeviation = (buyPrice - baseBuy) / baseBuy;
                UIComponents.drawPriceIndicator(columns.buyX + columns.colWidth / 2, yP, rowH, buyDeviation, false, maxDeviation);
            }
            if (isBought && baseSell > 0 && sellPrice > 0) {
                const sellDeviation = (sellPrice - baseSell) / baseSell;
                UIComponents.drawPriceIndicator(columns.sellX + columns.colWidth / 2, yP, rowH, sellDeviation, true, maxDeviation);
            }

            // Buttons
            const isMissionCargo = player.activeMission?.cargoType === commodityName;
            const btnY = yP + (rowH - btnH) / 2;

            // Buy 1 button
            const buy1X = columns.buttonsStart;
            const canBuyOne = isProduced && buyPrice > 0 && player.credits >= buyPrice && player.getCargoAmount() < player.cargoCapacity;
            const buy1Area = UIComponents.drawMarketButton(buy1X, btnY, btnW, btnH, "Buy 1", canBuyOne, true, !isProduced ? null : null);
            if (buy1Area) {
                this.spaceObjectButtonAreas.push({
                    ...buy1Area, action: "BUY_COMMODITY", quantity: 1, commodity: commodityName, price: buyPrice
                });
            }

            // Buy All button
            const buyAllX = buy1X + btnW + columns.btnSpacing;
            const buyAllArea = UIComponents.drawMarketButton(buyAllX, btnY, btnW, btnH, "Buy All", canBuyOne, true);
            if (buyAllArea) {
                this.spaceObjectButtonAreas.push({
                    ...buyAllArea, action: "BUY_ALL_COMMODITY", commodity: commodityName, price: buyPrice
                });
            }

            // Sell 1 button
            const sell1X = buyAllX + btnW + 10;
            const canSellOne = isBought && !isMissionCargo && sellPrice > 0 && playerQty > 0;
            const sell1Area = UIComponents.drawMarketButton(sell1X, btnY, btnW, btnH, "Sell 1", canSellOne, false);
            if (sell1Area) {
                this.spaceObjectButtonAreas.push({
                    ...sell1Area, action: "SELL_COMMODITY", quantity: 1, commodity: commodityName, price: sellPrice
                });
            }

            // Sell All button
            const sellAllX = sell1X + btnW + columns.btnSpacing;
            const sellAllArea = UIComponents.drawMarketButton(sellAllX, btnY, btnW, btnH, "Sell All", canSellOne, false);
            if (sellAllArea) {
                this.spaceObjectButtonAreas.push({
                    ...sellAllArea, action: "SELL_ALL_COMMODITY", commodity: commodityName, price: sellPrice
                });
            }
        }

        // Back button
        this.spaceObjectBackButtonArea = UIComponents.drawCenteredBackButton(pX, pY, pW, pH);

        // Sync back button area to UIManager AFTER it's drawn
        uiManager.spaceObjectMarketBackButtonArea = this.spaceObjectBackButtonArea;

        pop();
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
                    if (soundManager) soundManager.playSound('buyConfirm');
                    if (hud) hud.addMessage(`Bought 1 ${btn.commodity} for ${price} credits`, [100, 200, 255]);
                    logTrade();
                } else {
                    if (soundManager) soundManager.playSound('error');
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
                    if (soundManager) soundManager.playSound('buyConfirm');
                    if (hud) hud.addMessage(`Bought ${qty} ${btn.commodity} for ${totalCost} credits`, [100, 200, 255]);
                    logTrade();
                } else {
                    if (soundManager) soundManager.playSound('error');
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
                    if (soundManager) soundManager.playSound('sellConfirm');
                    if (hud) hud.addMessage(`Sold 1 ${btn.commodity} for ${price} credits`, [100, 255, 100]);
                    logTrade();
                } else {
                    if (soundManager) soundManager.playSound('error');
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
                    if (soundManager) soundManager.playSound('sellConfirm');
                    if (hud) hud.addMessage(`Sold ${qty} ${btn.commodity} for ${total} credits`, [100, 255, 100]);
                    logTrade();
                } else {
                    if (soundManager) soundManager.playSound('error');
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
