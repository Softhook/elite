// ****** uiStationMenus.js ******
// Station menu screens: Repairs, Police, Shipyard, Upgrades, Protection, Storage, Record.
// This file must be loaded BEFORE uiManager.js

/**
 * UIStationMenus - Handles all station menu screen rendering.
 */
class UIStationMenus {
    constructor() {
        // Repairs button areas
        this.repairsFullButtonArea = {};
        this.repairsHalfButtonArea = {};
        this.repairsBodyguardsButtonArea = {};
        this.repairsBackButtonArea = {};
        
        // Space object repairs button areas
        this.spaceObjectRepairsFullButtonArea = {};
        this.spaceObjectRepairsHalfButtonArea = {};
        this.spaceObjectRepairsBodyguardsButtonArea = {};
        this.spaceObjectRepairsBackButtonArea = {};
        
        // Police button areas
        this.policeButtonAreas = [];
        
        // Shipyard areas
        this.shipyardListAreas = [];
        this.shipyardDetailButtons = {};
        this.shipyardScrollOffset = 0;
        this.shipyardScrollMax = 0;
        this.shipyardScrollbarArea = {};
        
        // Upgrades areas
        this.upgradeListAreas = [];
        this.upgradeDetailButtons = {};
        this.upgradeScrollOffset = 0;
        this.upgradeScrollMax = 0;
        this.upgradeScrollbarArea = {};
        this.weaponSlotButtons = [];
        this.selectedWeaponSlot = 0;
        
        // Protection services
        this.protectionServicesButtons = [];
        
        // Storage areas
        this.storageButtonAreas = [];
        
        // Record areas
        this.recordButtonAreas = [];
        this.recordScrollOffset = 0;
        this.recordScrollMax = 0;
    }

    /**
     * Draws the shared repair content used by both station and space object repairs.
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     * @returns {Object} Button areas
     */
    _drawRepairsContent(player, panelRect, headerHeight) {
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        
        // Player ship repair section
        UIComponents.setTextStyle({ fill: 220, size: 20, alignH: CENTER, alignV: TOP });
        text(`Hull: ${floor(player.hull)} / ${player.maxHull}`, pX + pW / 2, pY + headerHeight + 10);
        
        let missing = player.maxHull - player.hull;
        let fullCost = Math.floor(missing * 10);
        let halfRepair = Math.min(missing, Math.ceil(player.maxHull / 2));
        let halfCost = Math.floor(halfRepair * 7);
        let btnW = pW * 0.5, btnH = 45, btnX = pX + pW / 2 - btnW / 2;
        let btnY1 = pY + headerHeight + 60, btnY2 = btnY1 + btnH + 20;
        
        const fullButtonArea = UIComponents.drawButton(btnX, btnY1, btnW, btnH, `Full Repair (${fullCost} cr)`, [0, 180, 0], [100, 255, 100]);
        const halfButtonArea = UIComponents.drawButton(btnX, btnY2, btnW, btnH, `50% Repair (${halfCost} cr)`, [180, 180, 0], [220, 220, 100]);
        
        // Bodyguard repair section
        const bodyguardInfo = player.getDamagedBodyguardsInfo ? player.getDamagedBodyguardsInfo() : { count: 0, totalCost: 0 };
        let btnY3 = btnY2 + btnH + 40;
        let bodyguardsButtonArea = {};
        
        if (bodyguardInfo.count > 0) {
            // Draw separator
            strokeWeight(1);
            stroke(255, 180, 100);
            line(pX + 50, btnY2 + btnH + 20, pX + pW - 50, btnY2 + btnH + 20);
            
            UIComponents.setTextStyle({ fill: 220, size: 20, alignH: CENTER, alignV: TOP, noStroke: true });
            
            bodyguardsButtonArea = UIComponents.drawButton(
                btnX, btnY3, btnW, btnH, 
                `Repair All Guards (${bodyguardInfo.totalCost} cr)`, 
                [0, 120, 180], [100, 200, 255]
            );
        }
        
        const backButtonArea = UIComponents.drawCenteredBackButton(pX, pY, pW, pH);
        
        return { full: fullButtonArea, half: halfButtonArea, bodyguards: bodyguardsButtonArea, back: backButtonArea };
    }

    /**
     * Draws the Repairs Menu.
     * @param {Player} player
     * @param {UIManager} uiManager
     */
    drawRepairsMenu(player, uiManager) {
        this.repairsFullButtonArea = {};
        this.repairsHalfButtonArea = {};
        this.repairsBodyguardsButtonArea = {};
        this.repairsBackButtonArea = {};
        
        if (!player) return;
        
        push();
        uiManager.drawPanelBG(STANDARD_PANEL_BG, [255, 180, 100]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = uiManager.drawStationHeader("Ship Repairs", station, player, system);
        const panelRect = uiManager.getPanelRect();
        
        const buttons = this._drawRepairsContent(player, panelRect, headerHeight, uiManager);
        this.repairsFullButtonArea = buttons.full;
        this.repairsHalfButtonArea = buttons.half;
        this.repairsBodyguardsButtonArea = buttons.bodyguards;
        this.repairsBackButtonArea = buttons.back;
        
        // Sync to UIManager for backward compatibility
        uiManager.repairsFullButtonArea = this.repairsFullButtonArea;
        uiManager.repairsHalfButtonArea = this.repairsHalfButtonArea;
        uiManager.repairsBodyguardsButtonArea = this.repairsBodyguardsButtonArea;
        uiManager.repairsBackButtonArea = this.repairsBackButtonArea;
        pop();
    }

    /**
     * Draws the Space Object Repairs Menu.
     * @param {SpaceObject} spaceObject
     * @param {Player} player
     * @param {UIManager} uiManager
     */
    drawSpaceObjectRepairsMenu(spaceObject, player, uiManager) {
        this.spaceObjectRepairsFullButtonArea = {};
        this.spaceObjectRepairsHalfButtonArea = {};
        this.spaceObjectRepairsBodyguardsButtonArea = {};
        this.spaceObjectRepairsBackButtonArea = {};
        
        if (!player) return;
        
        push();
        uiManager.drawPanelBG(STANDARD_PANEL_BG, [255, 180, 100]);
        const system = galaxy?.getCurrentSystem();
        const headerHeight = uiManager.drawSpaceObjectHeader("Ship Repairs", spaceObject, player, system);
        const panelRect = uiManager.getPanelRect();
        
        const buttons = this._drawRepairsContent(player, panelRect, headerHeight, uiManager);
        this.spaceObjectRepairsFullButtonArea = buttons.full;
        this.spaceObjectRepairsHalfButtonArea = buttons.half;
        this.spaceObjectRepairsBodyguardsButtonArea = buttons.bodyguards;
        this.spaceObjectRepairsBackButtonArea = buttons.back;
        
        // Sync to UIManager for backward compatibility
        uiManager.spaceObjectRepairsFullButtonArea = this.spaceObjectRepairsFullButtonArea;
        uiManager.spaceObjectRepairsHalfButtonArea = this.spaceObjectRepairsHalfButtonArea;
        uiManager.spaceObjectRepairsBodyguardsButtonArea = this.spaceObjectRepairsBodyguardsButtonArea;
        uiManager.spaceObjectRepairsBackButtonArea = this.spaceObjectRepairsBackButtonArea;
        pop();
    }

    /**
     * Draws the Police Menu.
     * @param {Player} player
     * @param {UIManager} uiManager
     */
    drawPoliceMenu(player, uiManager) {
        this.policeButtonAreas = [];
        if (!player) return;
        
        push();
        uiManager.drawPanelBG(STANDARD_PANEL_BG, [100, 150, 200]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = uiManager.drawStationHeader("Police Station", station, player, system);
        const panelRect = uiManager.getPanelRect();
        
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        const isAnarchySystem = typeof system?.securityLevel === 'string' && system.securityLevel.toLowerCase() === 'anarchy';
        
        if (isAnarchySystem) {
            UIComponents.setTextStyle({ fill: 220, size: 22, alignH: CENTER, alignV: TOP });
            const messageY = pY + headerHeight + 20;
            text("This anarchy system has no formal police presence.", pX + pW/2, messageY);
            UIComponents.setTextStyle({ fill: [180, 200, 255], size: 18 });
            text("Local disputes are settled without official intervention.", pX + pW/2, messageY + 35);
            
            this.policeButtonAreas.push(UIComponents.drawCenteredBackButton(pX, pY, pW, pH, {action:'back'}));
            
            // Sync to UIManager for backward compatibility
            uiManager.policeButtonAreas = this.policeButtonAreas;
            pop();
            return;
        }
        
        UIComponents.setTextStyle({ fill: 255, size: 20, align: [CENTER, TOP] });
        const isWanted = system?.isPlayerWanted();
        const statusText = isWanted ? "WANTED" : "CLEAN";
        const statusColor = isWanted ? [255, 50, 50] : [50, 255, 50];
        const contentY = pY + headerHeight + 10;
        text(`Legal Status in ${system?.name || 'Unknown'} System: `, pX+pW/2, contentY);
        UIComponents.setTextStyle({ fill: statusColor, size: 24 });
        text(statusText, pX+pW/2, contentY+30);
        
        // Display police bounty information
        if (player.isPolice) {
            UIComponents.setTextStyle({ fill: [100, 255, 100], size: 18 });
            text("Active Bounty: 1,000 cr per Pirate killed, 1,000 cr per Alien killed", pX+pW/2, contentY+65);
        }
        
        // Show police faction kill progress
        try {
            const pk = player.getFactionKillsProgress && player.getFactionKillsProgress('POLICE');
            if (pk) {
                UIComponents.setTextStyle({ fill: [200], size: 16, align: [CENTER, TOP] });
                if (pk.nextThreshold) {
                    text(`Police Kills: ${pk.kills} — ${pk.killsToNext} to ${pk.nextRank}`, pX + pW/2, contentY + 95);
                } else {
                    text(`Police Kills: ${pk.kills} — Max Rank`, pX + pW/2, contentY + 95);
                }
            }
        } catch (e) { /* fail silently */ }
        
        let fineAmount = 300;
        if (system?.securityLevel === 'High') fineAmount = 1000;
        else if (system?.securityLevel === 'Medium') fineAmount = 500;
        if (player.hasBeenPolice) {
            fineAmount *= 3;
            UIComponents.setTextStyle({ fill: [255, 200, 100], size: 16 });
            text("Fines tripled for former police officer", pX + pW/2, contentY + 95);
        }
        
        let btnW = pW*0.5, btnH = 45;
        let btnX = pX+pW/2-btnW/2;
        let btnY1 = contentY + (player.isPolice ? 100 : (player.hasBeenPolice ? 125 : 90));
        
        if (isWanted) {
            this.policeButtonAreas.push(
                UIComponents.drawButton(btnX, btnY1, btnW, btnH, `Pay Fine (${fineAmount} cr)`, [0,180,0], [100,255,100], 5, {action:'pay_fine', amount:fineAmount})
            );
        }
        
        const btnY2 = btnY1 + btnH + 20;
        if (!player.isPolice) {
            this.policeButtonAreas.push(
                UIComponents.drawButton(btnX, btnY2, btnW, btnH, "Join Police Force", [50,50,180], [100,100,255], 5, {action:'join_police'})
            );
        } else {
            UIComponents.setTextStyle({ fill: 255, size: 18, align: [CENTER, CENTER] });
            text("You are a member of the Police Force", pX+pW/2, btnY2+btnH/2);
        }
        
        this.policeButtonAreas.push(UIComponents.drawCenteredBackButton(pX, pY, pW, pH, {action:'back'}));
        
        // Sync to UIManager for backward compatibility
        uiManager.policeButtonAreas = this.policeButtonAreas;
        pop();
    }

    /**
     * Draws the Shipyard Menu.
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     * @param {StarSystem} system
     */
    drawShipyardMenu(player, panelRect, headerHeight, system) {
        if (!player) return;
        this.shipyardListAreas = [];
        
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        
        // Calculate trade-in value (70% of current ship's value)
        const currentShipType = player.shipTypeName || "Vulture";
        
        // IMPROVED LOOKUP LOGIC
        let currentShipDef = null;
        if (typeof SHIP_DEFINITIONS !== 'undefined') {
            if (SHIP_DEFINITIONS[currentShipType]) {
                currentShipDef = SHIP_DEFINITIONS[currentShipType];
            } else {
                currentShipDef = Object.values(SHIP_DEFINITIONS).find(ship => 
                    ship.name === currentShipType
                );
                if (!currentShipDef) {
                    currentShipDef = Object.values(SHIP_DEFINITIONS).find(ship => 
                        ship.name.toLowerCase() === currentShipType.toLowerCase()
                    );
                }
            }
        }
        
        const currentShipValue = currentShipDef ? Math.floor(currentShipDef.price * 0.7) : 0;
        
        // Show trade-in info at top
        UIComponents.setTextStyle({ fill: [180, 220, 255], size: 20, align: [LEFT, TOP] });
        text(`Your current ship: ${currentShipType} (Trade-in value: ${currentShipValue} credits)`, pX+20, pY+headerHeight);
        
        // FILTER SHIPS based on system properties
        const systemTechLevel = system?.techLevel || 1;
        const isMillitarySystem = system?.economyType === "Military";
        
        const availableShips = typeof SHIP_DEFINITIONS !== 'undefined' ? Object.entries(SHIP_DEFINITIONS).filter(([shipKey, shipData]) => {
            // Never show alien ships
            if (shipData.aiRoles && shipData.aiRoles.includes("ALIEN")) return false;
            // Only show military ships in military systems
            if (shipData.aiRoles && shipData.aiRoles.includes("MILITARY")) return isMillitarySystem;
            // Tech level filtering
            const shipTechLevel = shipData.techLevel || Math.min(5, Math.ceil(shipData.price / 40000));
            return shipTechLevel <= systemTechLevel;
        }) : [];
        
        // List ships
        let rowH = 40, startY = pY+headerHeight+30, visibleRows = floor((pH-headerHeight-90)/rowH);
        let totalRows = availableShips.length;
        let scrollAreaH = visibleRows * rowH;
        this.shipyardScrollMax = max(0, totalRows - visibleRows);
        this.shipyardScrollOffset = constrain(this.shipyardScrollOffset, 0, this.shipyardScrollMax);
        
        // Draw visible ships
        let firstRow = this.shipyardScrollOffset;
        let lastRow = min(firstRow + visibleRows, totalRows);
        textSize(18);
        
        for (let i = firstRow; i < lastRow; i++) {
            let [shipKey, ship] = availableShips[i];
            let y = startY + (i-firstRow)*rowH;
            
            const isCurrentShip = ship.name === currentShipType || 
                                (currentShipDef && ship.name === currentShipDef.name);
            
            const originalPrice = ship.price;
            const finalPrice = originalPrice - currentShipValue;
            const canAfford = finalPrice <= 0 || player.credits >= finalPrice;
            
            // Background
            if (isCurrentShip) {
                fill(40, 40, 80); 
            } else if (!canAfford) {
                fill(40, 40, 40);
            } else {
                fill(60, 60, 100);
            }
            
            stroke(canAfford ? 120 : 80, canAfford ? 180 : 100, canAfford ? 255 : 120);
            rect(pX+20, y, pW-40, rowH-6, 5);
            
            noStroke();
            
            if (isCurrentShip) {
                fill(100, 150, 255);
                textAlign(LEFT, CENTER);
                textSize(18);
                text(`${ship.name}`, pX+30, y+rowH/2);
                textAlign(RIGHT, CENTER);
                textSize(16);
                fill(150, 180, 255);
                text(`CURRENT SHIP`, pX+pW-30, y+rowH/2);
            } else {
                textAlign(LEFT, CENTER);
                textSize(16);
                fill(canAfford ? 255 : 120);
                const leftText = `${ship.name}  |  Hull: ${ship.baseHull}  |  Cargo: ${ship.cargoCapacity}`;
                text(leftText, pX+30, y+rowH/2);
                
                textAlign(RIGHT, CENTER);
                textSize(16);
                if (finalPrice > 0) {
                    fill(canAfford ? 255 : 120, canAfford ? 220 : 100, canAfford ? 100 : 50);
                    text(`${finalPrice} cr`, pX+pW-30, y+rowH/2);
                } else if (finalPrice < 0) {
                    fill(100, 255, 150);
                    text(`+${-finalPrice} cr`, pX+pW-30, y+rowH/2);
                } else {
                    fill(150, 255, 150);
                    text(`EVEN SWAP`, pX+pW-30, y+rowH/2);
                }
                
                this.shipyardListAreas.push({
                    x: pX+20, y: y, w: pW-40, h: rowH-6,
                    shipTypeKey: shipKey,
                    shipName: ship.name,
                    price: finalPrice, 
                    originalPrice: originalPrice,
                    canAfford: canAfford
                });
            }
        }
        
        // Draw scrollbar if needed
        this.shipyardScrollbarArea = UIComponents.drawScrollbar(
            pX + pW, startY, scrollAreaH,
            this.shipyardScrollOffset, this.shipyardScrollMax,
            visibleRows, totalRows,
            [60, 60, 100], [120, 180, 255]
        );
        
        // Back button
        this.shipyardDetailButtons = {back: UIComponents.drawCenteredBackButton(pX, pY, pW, pH)};
    }

    /**
     * Draws the Upgrades Menu.
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     * @param {StarSystem} system
     */
    drawUpgradesMenu(player, panelRect, headerHeight, system) {
        if (!player) return;
        this.upgradeListAreas = [];
        
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        
        // Weapon slot selection UI
        const slotPanelY = pY + headerHeight + 15;
        const slotPanelH = 80;
        
        fill(40, 40, 70);
        rect(pX + 10, slotPanelY, pW - 20, slotPanelH, 5);
        
        UIComponents.setTextStyle({ fill: 255, size: 16, align: [CENTER, TOP] });
        text("Select Weapon Slot", pX + pW/2, slotPanelY + 5);
        
        // Get available slots from ship's armament array
        const shipDef = typeof SHIP_DEFINITIONS !== 'undefined' ? SHIP_DEFINITIONS[player.shipTypeName] : null;
        const availableSlots = shipDef?.armament?.length || 1;
        
        // Draw slot buttons
        this.weaponSlotButtons = [];
        const slotBtnW = min(80, (pW - 40) / availableSlots);
        const slotBtnH = 40;
        const slotStartX = pX + (pW - (slotBtnW * availableSlots + 10 * (availableSlots-1))) / 2;
        
        for (let i = 0; i < availableSlots; i++) {
            const slotX = slotStartX + i * (slotBtnW + 10);
            const slotY = slotPanelY + 30;
            const isSelected = (this.selectedWeaponSlot === i);
            
            fill(isSelected ? 100 : 60, isSelected ? 100 : 60, isSelected ? 150 : 90);
            stroke(isSelected ? 150 : 100, isSelected ? 150 : 100, isSelected ? 255 : 150);
            strokeWeight(1);
            rect(slotX, slotY, slotBtnW, slotBtnH, 4);
            
            noStroke();
            UIComponents.setTextStyle({ fill: 230, size: 20, align: [CENTER, CENTER] });
            text(`Slot ${i+1}`, slotX + slotBtnW/2, slotY + 10);
            textSize(12);
            text((i < player.weapons.length) ? player.weapons[i]?.name : "Empty", slotX + slotBtnW/2, slotY + 25);
            
            this.weaponSlotButtons.push({
                x: slotX, y: slotY, w: slotBtnW, h: slotBtnH, 
                slotIndex: i
            });
        }
        
        // FILTER UPGRADES based on system tech level
        const systemTechLevel = system?.techLevel || 1;
        const availableWeapons = typeof WEAPON_UPGRADES !== 'undefined' ? WEAPON_UPGRADES.filter(weapon => {
            const weaponTechLevel = weapon.techLevel || Math.min(5, Math.ceil((weapon.damage * weapon.price) / 5000));
            return weaponTechLevel <= systemTechLevel;
        }) : [];
        
        // Continue with upgrade menu drawing
        let rowH = 40, startY = slotPanelY + slotPanelH + 10;
        let visibleRows = floor((pH - startY - 60) / rowH);
        let totalRows = availableWeapons.length;
        let scrollAreaH = visibleRows * rowH;
        this.upgradeScrollMax = max(0, totalRows - visibleRows);
        if (typeof this.upgradeScrollOffset !== "number") this.upgradeScrollOffset = 0;
        this.upgradeScrollOffset = constrain(this.upgradeScrollOffset, 0, this.upgradeScrollMax);
        
        // Draw visible upgrades
        let firstRow = this.upgradeScrollOffset;
        let lastRow = min(firstRow + visibleRows, totalRows);
        textSize(18);
        
        for (let i = firstRow; i < lastRow; i++) {
            let upg = availableWeapons[i];
            let y = startY + (i-firstRow)*rowH;
            
            const canAfford = player.credits >= upg.price;
            
            fill(canAfford ? 80 : 40, canAfford ? 60 : 40, canAfford ? 120 : 60);
            stroke(canAfford ? 180 : 100, canAfford ? 100 : 60, canAfford ? 255 : 140);
            rect(pX+20, y, pW-40, rowH-6, 5);
            
            noStroke();
            textAlign(LEFT, CENTER);
            textSize(16);
            fill(canAfford ? 255 : 120);
            const upgLeft = `${upg.name}  |  Type: ${upg.type}  |  DPS: ${upg.damage}`;
            text(upgLeft, pX+30, y+rowH/2);
            
            textAlign(RIGHT, CENTER);
            textSize(16);
            fill(canAfford ? 200 : 100, canAfford ? 150 : 80, canAfford ? 255 : 120);
            text(`${upg.price} cr`, pX+pW-30, y+rowH/2);
            
            this.upgradeListAreas.push({
                x: pX+20,
                y: y,
                w: pW-40,
                h: rowH-6,
                upgrade: upg,
                canAfford: canAfford
            });
        }
        
        // Draw scrollbar if needed
        this.upgradeScrollbarArea = UIComponents.drawScrollbar(
            pX + pW, startY, scrollAreaH,
            this.upgradeScrollOffset, this.upgradeScrollMax,
            visibleRows, totalRows,
            [60, 60, 100], [180, 100, 255]
        );
        
        // Back button
        this.upgradeDetailButtons = {back: UIComponents.drawCenteredBackButton(pX, pY, pW, pH)};
    }

    /**
     * Draws the Protection Services Menu.
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     */
    drawProtectionServicesMenu(player, panelRect, headerHeight) {
        if (!player) return;
        this.protectionServicesButtons = [];
        
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        
        // Draw description
        UIComponents.setTextStyle({ fill: 220, size: 24, align: [CENTER, TOP] });
        let descY = pY + headerHeight + 20;
        text("Hire professional security guards to protect you during your travels.", pX + pW/2, descY);
        
        // Show current bodyguard status
        UIComponents.setTextStyle({ fill: [180, 220, 255], size: 20 });
        let statusY = descY + 40;
        
        const activeGuardsCount = player.getActiveGuardsCount ? player.getActiveGuardsCount() : 0;
        const bodyguardLimit = player.bodyguardLimit || 0;
        text(`Active bodyguards: ${activeGuardsCount}/${bodyguardLimit}`, pX + pW/2, statusY);
        
        if (activeGuardsCount < bodyguardLimit) {
            UIComponents.setTextStyle({ fill: 230, size: 22, align: [LEFT, TOP] });
            text("Available Guards for Hire:", pX + 40, statusY + 40);
            
            const guardOptions = [
                { ship: "GladiusFighter", name: "Gladius Security", cost: 8000, description: "Standard security escort" },
                { ship: "Vulture", name: "Vulture Protector", cost: 12000, description: "Heavy combat protection" },
                { ship: "WaspAssault", name: "Wasp Security", cost: 6000, description: "Fast response protection" },
                { ship: "Viper", name: "Viper Guardian", cost: 10000, description: "Agile defender" }
            ];
            
            const affordableGuards = guardOptions.filter(guard => player.credits >= guard.cost);
            
            if (affordableGuards.length === 0) {
                UIComponents.setTextStyle({ fill: [255, 150, 150], size: 20, align: [CENTER, CENTER] });
                text("You don't have enough credits to hire any guards.", pX + pW / 2, statusY + 80);
            } else {
                let guardY = statusY + 80;
                textAlign(LEFT, TOP);
                
                affordableGuards.forEach((guard, i) => {
                    const btnX = pX + 40;
                    const btnY = guardY + i * 80;
                    const btnW = pW - 80;
                    const btnH = 70;
                    
                    fill(40, 60, 100);
                    stroke(100, 140, 200);
                    strokeWeight(1);
                    rect(btnX, btnY, btnW, btnH, 5);
                    
                    noStroke();
                    textSize(20);
                    fill(230);
                    textAlign(LEFT, CENTER);
                    text(`Slot ${i+1}: ${guard.name} (${guard.ship})`, btnX + 15, btnY + 15);
                    
                    textSize(16);
                    text(guard.description, btnX + 15, btnY + 40);
                    
                    textAlign(RIGHT, TOP);
                    fill(150, 230, 150);
                    text(`${guard.cost.toLocaleString()} Cr`, btnX + btnW - 100, btnY + 15);
                    
                    const hireBtn = UIComponents.drawButton(
                        btnX + btnW - 90, 
                        btnY + 10, 
                        80, 
                        30, 
                        "HIRE", 
                        [50, 100, 50], 
                        [100, 200, 100]
                    );
                    
                    hireBtn.action = "HIRE_BODYGUARD";
                    hireBtn.shipType = guard.ship;
                    hireBtn.cost = guard.cost;
                    
                    this.protectionServicesButtons.push(hireBtn);
                    textAlign(LEFT, TOP);
                });
            }
        } else {
            UIComponents.setTextStyle({ fill: [255, 200, 100], size: 20, align: [CENTER, CENTER] });
            text("Maximum number of bodyguards hired.", pX + pW / 2, statusY + 80);
        }
        
        const backY = pY + pH - 30 - 15;
        const dismissBtnY = backY - 50;
        
        // Draw dismiss button if player has active bodyguards
        if (activeGuardsCount > 0) {
            const dismissBtn = UIComponents.drawButton(
                pX + pW/2 - 100, 
                dismissBtnY, 
                200, 
                40, 
                "DISMISS ALL GUARDS", 
                [100, 50, 50], 
                [200, 100, 100]
            );
            dismissBtn.action = "DISMISS_BODYGUARDS";
            this.protectionServicesButtons.push(dismissBtn);
        }
        
        // Back button
        const backButton = UIComponents.drawButton(
            pX + pW/2 - 60, 
            backY, 
            120, 
            40, 
            "BACK", 
            [60, 60, 100], 
            [120, 120, 180]
        );
        backButton.action = "BACK";
        backButton.state = "DOCKED";
        this.protectionServicesButtons.push(backButton);
    }

    /**
     * Draws the Storage Locker Menu.
     * @param {Station} station
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     */
    drawStorageMenu(station, player, panelRect, headerHeight) {
        if (!player) return;
        this.storageButtonAreas = [];
        
        const activeStation = station || player?.currentSystem?.station || null;
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        
        if (!activeStation) {
            UIComponents.setTextStyle({ fill: 220, size: 22, align: [CENTER, CENTER] });
            text("No storage services are available in this location.", pX + pW/2, pY + pH/2 - 20);
            
            const backBtn = UIComponents.drawCenteredBackButton(pX, pY, pW, pH, {action: "BACK"});
            this.storageButtonAreas.push(backBtn);
            return;
        }
        
        // Ensure the station exposes a mutable storage array
        if (!Array.isArray(activeStation.storage)) {
            activeStation.storage = [];
        }
        
        UIComponents.setTextStyle({ fill: 220, size: 20, align: [CENTER, TOP] });
        const infoY = pY + headerHeight + 10;
        text("Store cargo safely at this station. Stored goods stay here until retrieved.", pX + pW/2, infoY);
        
        // Station storage contents
        UIComponents.setTextStyle({ fill: [180, 200, 255], size: 22, align: [LEFT, TOP] });
        text("Station Storage:", pX + 40, infoY + 40);
        
        const storage = activeStation.storage;
        let storageY = infoY + 70;
        
        if (storage.length === 0) {
            UIComponents.setTextStyle({ fill: 180, size: 18, align: [CENTER, CENTER] });
            text("Storage is empty", pX + pW / 2, storageY);
        } else {
            UIComponents.setTextStyle({ align: [LEFT, TOP], size: 20 });
            for (let i = 0; i < storage.length; i++) {
                const item = storage[i];
                const itemY = storageY + i * 40;
                
                fill(40, 50, 80);
                stroke(100, 120, 160);
                strokeWeight(1);
                rect(pX + 40, itemY, pW - 80, 35, 3);
                
                noStroke();
                fill(220);
                textAlign(LEFT, CENTER);
                text(`${item.name}: ${item.quantity}t`, pX + 50, itemY + 17.5);
                
                const btnW = 95;
                const btnH = 25;
                const btnX = pX + pW - 135;
                const btnY = itemY + 5;
                
                const retrieveBtn = UIComponents.drawButton(
                    btnX, btnY, btnW, btnH,
                    "Retrieve",
                    [0, 100, 0], [100, 200, 100],
                    3
                );
                retrieveBtn.action = "RETRIEVE_STORAGE";
                retrieveBtn.commodity = item.name;
                this.storageButtonAreas.push(retrieveBtn);
            }
        }
        
        // Player cargo section for depositing
        const cargoSectionY = storageY + Math.max(storage.length * 40, 60) + 30;
        UIComponents.setTextStyle({ fill: [180, 200, 255], size: 22, align: [LEFT, TOP] });
        text("Your Cargo (Tap to deposit):", pX + 40, cargoSectionY);
        
        const playerCargo = Array.isArray(player.cargo) ? player.cargo : [];
        let cargoY = cargoSectionY + 35;
        
        if (playerCargo.length === 0) {
            UIComponents.setTextStyle({ fill: 180, size: 18, align: [CENTER, CENTER] });
            text("No cargo in hold", pX + pW / 2, cargoY);
        } else {
            UIComponents.setTextStyle({ align: [LEFT, TOP], size: 20 });
            for (let i = 0; i < playerCargo.length; i++) {
                const item = playerCargo[i];
                const itemY = cargoY + i * 40;
                
                fill(40, 50, 80);
                stroke(100, 120, 160);
                strokeWeight(1);
                rect(pX + 40, itemY, pW - 80, 35, 3);
                
                noStroke();
                fill(220);
                textAlign(LEFT, CENTER);
                text(`${item.name}: ${item.quantity}t`, pX + 50, itemY + 17.5);
                
                const btnW = 95;
                const btnH = 25;
                const btnX = pX + pW - 135;
                const btnY = itemY + 5;
                
                const depositBtn = UIComponents.drawButton(
                    btnX, btnY, btnW, btnH,
                    "Deposit",
                    [80, 80, 0], [180, 180, 100],
                    3
                );
                depositBtn.action = "DEPOSIT_STORAGE";
                depositBtn.commodity = item.name;
                depositBtn.quantity = item.quantity;
                this.storageButtonAreas.push(depositBtn);
            }
        }
        
        // Back button
        const backBtn = UIComponents.drawCenteredBackButton(pX, pY, pW, pH, {action: "BACK"});
        this.storageButtonAreas.push(backBtn);
    }

    /**
     * Draws the Personal Record Menu.
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     * @param {Galaxy} galaxy
     */
    drawPersonalRecordMenu(player, panelRect, headerHeight, galaxy) {
        if (!player) return;
        this.recordButtonAreas = [];
        
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        const contentY = pY + headerHeight + 10;
        const contentH = pH - headerHeight - 60;
        const lineHeight = 22;
        
        const toArray = (candidate) => Array.isArray(candidate) ? candidate : [];
        const systemsVisited = toArray(player.systemsVisited);
        const shipsDestroyed = toArray(player.shipsDestroyed);
        const stationsTraded = toArray(player.stationsTraded);
        const factionsJoined = toArray(player.factionsJoined);
        const eliteStatusChanges = toArray(player.eliteStatusChanges);
        const missionsCompleted = toArray(player.missionsCompleted);
        const wantedStatusChanges = toArray(player.wantedStatusChanges);
        const shipsPurchased = toArray(player.shipsPurchased);
        const weaponsUpgraded = toArray(player.weaponsUpgraded);
        
        const events = [];
        const appendEvent = (timestamp, type, description) => {
            if (!description) return;
            let safeTs = Number.isFinite(timestamp) ? timestamp : NaN;
            events.push({ timestamp: safeTs, type, description });
        };
        
        const locateSystemByName = (name) => {
            if (!name || !Array.isArray(galaxy?.systems)) return null;
            for (let i = 0; i < galaxy.systems.length; i++) {
                const sys = galaxy.systems[i];
                if (sys?.name === name) return sys;
            }
            return null;
        };
        
        // Build events from player history
        const firstVisit = systemsVisited.length > 0 ? systemsVisited[0] : null;
        const fallbackSystem = player.currentSystem || locateSystemByName(firstVisit?.systemName);
        const startName = firstVisit?.systemName || fallbackSystem?.name || null;
        let startEventInfo = null;
        
        if (startName) {
            const startSystem = locateSystemByName(startName) || fallbackSystem;
            const startType = startSystem?.economyType || startSystem?.systemType || 'Unknown';
            const startSecurity = startSystem?.securityLevel || 'Unknown';
            const baseTimestamp = Number.isFinite(firstVisit?.timestamp) ? firstVisit.timestamp : Date.now();
            
            let deploymentDetails = [];
            if (firstVisit?.economyType && firstVisit.economyType !== 'Unknown') {
                deploymentDetails.push(firstVisit.economyType);
            } else if (startType !== 'Unknown') {
                deploymentDetails.push(startType);
            }
            if (firstVisit?.securityLevel && firstVisit.securityLevel !== 'Unknown') {
                deploymentDetails.push(firstVisit.securityLevel + ' Security');
            } else if (startSecurity !== 'Unknown') {
                deploymentDetails.push(startSecurity + ' Security');
            }
            
            const detailsStr = deploymentDetails.length > 0 ? ` (${deploymentDetails.join(', ')})` : '';
            startEventInfo = {
                description: `Deployment at ${startName}${detailsStr}`,
                baseTimestamp
            };
        }
        
        for (let rec of systemsVisited) {
            let visitDesc = `Visited ${rec.systemName}`;
            if (rec.economyType || rec.securityLevel) {
                const details = [];
                if (rec.economyType && rec.economyType !== 'Unknown') details.push(rec.economyType);
                if (rec.securityLevel && rec.securityLevel !== 'Unknown') details.push(rec.securityLevel + ' Security');
                if (details.length > 0) visitDesc += ` (${details.join(', ')})`;
            }
            appendEvent(rec.timestamp, 'Travel', visitDesc);
        }
        
        for (let rec of shipsDestroyed) {
            let roleText = rec.role || "Unknown";
            if (typeof AI_ROLE !== 'undefined') {
                if (rec.role === AI_ROLE.PIRATE) roleText = "Pirate";
                else if (rec.role === AI_ROLE.ALIEN) roleText = "Alien";
                else if (rec.role === AI_ROLE.POLICE) roleText = "Police";
                else if (rec.role === AI_ROLE.HAULER) roleText = "Hauler";
                else if (rec.role === AI_ROLE.TRANSPORT) roleText = "Transport";
                else if (rec.role === AI_ROLE.COMBAT) roleText = "Combat Ship";
                else if (rec.role === AI_ROLE.GUARD) roleText = "Guard";
                else if (rec.role === AI_ROLE.BOUNTY_HUNTER) roleText = "Bounty Hunter";
            }
            let description = `Destroyed ${rec.pilotName} (${rec.shipType}, ${roleText})`;
            if (rec.faction) description += ` - ${rec.faction} faction`;
            appendEvent(rec.timestamp, 'Combat', description);
        }
        
        for (let rec of stationsTraded) {
            appendEvent(rec.timestamp, 'Trade', `Traded at ${rec.stationName} (${rec.systemName})`);
        }
        
        for (let rec of factionsJoined) {
            appendEvent(rec.timestamp, 'Faction', `Joined ${rec.factionName} faction`);
        }
        
        for (let rec of eliteStatusChanges) {
            appendEvent(rec.timestamp, 'Elite', `Combat Rating: ${rec.oldRating} → ${rec.newRating} (${rec.kills} kills)`);
        }
        
        for (let rec of missionsCompleted) {
            appendEvent(rec.timestamp, 'Mission', `Completed: ${rec.title} (${rec.type}) - ${rec.reward}cr`);
        }
        
        for (let rec of wantedStatusChanges) {
            const statusText = rec.isWanted ? "WANTED" : "CLEAN";
            appendEvent(rec.timestamp, 'Legal', `Status changed to ${statusText} in ${rec.systemName}`);
        }
        
        for (let rec of shipsPurchased) {
            appendEvent(rec.timestamp, 'Ship', `Purchased ${rec.shipType} for ${rec.price}cr in ${rec.systemName}`);
        }
        
        for (let rec of weaponsUpgraded) {
            const slotText = rec.slotIndex >= 0 ? ` (Slot ${rec.slotIndex + 1})` : '';
            appendEvent(rec.timestamp, 'Weapon', `Upgraded to ${rec.weaponName} (${rec.weaponType})${slotText} for ${rec.price}cr in ${rec.systemName}`);
        }
        
        if (startEventInfo) {
            let startTimestamp = Number.isFinite(startEventInfo.baseTimestamp) ? startEventInfo.baseTimestamp : Infinity;
            for (let e of events) {
                if (Number.isFinite(e?.timestamp)) startTimestamp = Math.min(startTimestamp, e.timestamp);
            }
            if (!Number.isFinite(startTimestamp)) startTimestamp = Date.now();
            else startTimestamp -= 1;
            appendEvent(startTimestamp, 'Start', startEventInfo.description);
        }
        
        events.sort((a, b) => {
            const aTs = Number.isFinite(a.timestamp) ? a.timestamp : Infinity;
            const bTs = Number.isFinite(b.timestamp) ? b.timestamp : Infinity;
            if (aTs === bTs) return a.description.localeCompare(b.description);
            return aTs - bTs;
        });
        
        const totalEntries = events.length;
        const visibleLines = Math.max(1, Math.floor(contentH / lineHeight));
        this.recordScrollMax = Math.max(0, totalEntries - visibleLines);
        if (typeof this.recordScrollOffset !== 'number' || !isFinite(this.recordScrollOffset)) {
            this.recordScrollOffset = 0;
        }
        if (this.recordScrollMax === 0) {
            this.recordScrollOffset = 0;
        } else {
            this.recordScrollOffset = constrain(this.recordScrollOffset, 0, this.recordScrollMax);
        }
        
        let currentY = contentY;
        UIComponents.setTextStyle({ fill: [255, 200, 200], size: 24, align: [LEFT, TOP] });
        text(`Personal Log: ${totalEntries} entries`, pX + 30, currentY);
        currentY += 35;
        
        if (totalEntries === 0) {
            UIComponents.setTextStyle({ fill: 180, size: 16, align: [CENTER, CENTER] });
            text("No activity recorded yet.", pX + pW/2, currentY + (contentH - 35) / 2);
        } else {
            const startIndex = this.recordScrollOffset;
            let rowsRemaining = visibleLines;
            const typeColors = {
                Start: [255, 220, 140],
                Travel: [190, 220, 255],
                Combat: [255, 180, 180],
                Trade: [190, 255, 190],
                Faction: [255, 215, 0],
                Elite: [255, 215, 0],
                Mission: [220, 190, 255],
                Legal: [255, 200, 100],
                Ship: [255, 150, 50],
                Weapon: [200, 150, 255]
            };
            
            const formatLogTime = (timestamp) => {
                if (!Number.isFinite(timestamp)) return "--:--";
                const date = new Date(timestamp);
                const pad = (num) => `${num}`.padStart(2, '0');
                return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
            };
            
            const hasEarlier = startIndex > 0;
            if (hasEarlier && rowsRemaining > 0) {
                UIComponents.setTextStyle({ fill: 160, size: 14, align: [LEFT, TOP] });
                text("↑ Earlier entries", pX + 50, currentY);
                currentY += lineHeight;
                rowsRemaining--;
            }
            
            for (let i = startIndex; i < events.length && rowsRemaining > 0; i++) {
                const evt = events[i];
                const col = typeColors[evt.type] || [200, 200, 200];
                
                UIComponents.setTextStyle({ fill: col, size: 14, align: [LEFT, TOP] });
                
                const timeStr = formatLogTime(evt.timestamp);
                const line = `[${timeStr}] ${evt.description}`;
                text(line, pX + 30, currentY, pW - 60);
                
                currentY += lineHeight;
                rowsRemaining--;
            }
            
            const hasMore = startIndex + visibleLines < totalEntries;
            if (hasMore && rowsRemaining > 0) {
                UIComponents.setTextStyle({ fill: 160, size: 14, align: [LEFT, TOP] });
                text("↓ More entries", pX + 50, currentY);
            }
        }
        
        // Back button
        const backBtn = UIComponents.drawCenteredBackButton(pX, pY, pW, pH, {action: "BACK"});
        this.recordButtonAreas.push(backBtn);
    }

    /**
     * Handles scroll input for a specific scroll offset/max pair.
     * @param {string} offsetKey - Property name for scroll offset
     * @param {string} maxKey - Property name for scroll max
     * @param {number} delta - Scroll direction
     * @returns {boolean}
     */
    handleScroll(offsetKey, maxKey, delta) {
        if (this[maxKey] <= 0) return false;
        if (typeof this[offsetKey] !== "number") this[offsetKey] = 0;
        this[offsetKey] += delta > 0 ? 1 : -1;
        this[offsetKey] = constrain(this[offsetKey], 0, this[maxKey]);
        return true;
    }

    /**
     * Handles mouse wheel events for scrolling.
     * @param {Object} event
     * @param {string} currentState
     * @returns {boolean}
     */
    handleMouseWheel(event, currentState) {
        const scrollConfigs = {
            "VIEWING_SHIPYARD": ["shipyardScrollOffset", "shipyardScrollMax"],
            "VIEWING_UPGRADES": ["upgradeScrollOffset", "upgradeScrollMax"],
            "VIEWING_RECORD": ["recordScrollOffset", "recordScrollMax"]
        };
        
        const config = scrollConfigs[currentState];
        if (config) {
            return this.handleScroll(config[0], config[1], event.deltaY);
        }
        return false;
    }

    /**
     * Handles repair button clicks for both station and space object repairs.
     * @param {number} mx - Mouse X coordinate
     * @param {number} my - Mouse Y coordinate
     * @param {Player} player - The player object
     * @param {Object} fullButtonArea - Button area for full repair
     * @param {Object} halfButtonArea - Button area for 50% repair
     * @param {Object} bodyguardsButtonArea - Button area for bodyguard repairs
     * @param {Function} addMessageFn - Function to add UI messages
     * @returns {boolean} - True if a repair action was handled
     */
    handleRepairClick(mx, my, player, fullButtonArea, halfButtonArea, bodyguardsButtonArea, addMessageFn) {
        // Full repair
        if (fullButtonArea && UIComponents.isClickInArea(mx, my, fullButtonArea)) {
            let missing = player.maxHull - player.hull;
            let cost = Math.floor(missing * 10);
            if (missing <= 0) {
                addMessageFn("Your ship is already fully repaired!");
                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            } else if (player.credits >= cost) {
                player.spendCredits(cost);
                player.hull = player.maxHull;
                addMessageFn(`Ship fully repaired for ${cost} credits.`);
                if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                if (typeof saveGame === 'function') saveGame();
            } else {
                addMessageFn(`Not enough credits! Full repair costs ${cost} credits.`);
                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            }
            return true;
        }
        // 50% repair
        if (halfButtonArea && UIComponents.isClickInArea(mx, my, halfButtonArea)) {
            let missing = player.maxHull - player.hull;
            let repairAmt = Math.min(missing, Math.ceil(player.maxHull / 2));
            let cost = Math.floor(repairAmt * 7);
            if (missing <= 0) {
                addMessageFn("Your ship is already fully repaired!");
                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            } else if (player.credits >= cost) {
                player.spendCredits(cost);
                player.hull += repairAmt;
                if (player.hull > player.maxHull) player.hull = player.maxHull;
                addMessageFn(`Ship repaired by ${repairAmt} hull for ${cost} credits.`);
                if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                if (typeof saveGame === 'function') saveGame();
            } else {
                addMessageFn(`Not enough credits! 50% repair costs ${cost} credits.`);
                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            }
            return true;
        }
        // Bodyguard repairs
        if (bodyguardsButtonArea && UIComponents.isClickInArea(mx, my, bodyguardsButtonArea)) {
            const bodyguardInfo = player.getDamagedBodyguardsInfo();
            if (bodyguardInfo.count <= 0) {
                addMessageFn("No damaged bodyguards to repair.");
                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            } else if (player.credits >= bodyguardInfo.totalCost) {
                if (player.repairBodyguards(bodyguardInfo.totalCost)) {
                    addMessageFn(`${bodyguardInfo.count} bodyguard${bodyguardInfo.count > 1 ? 's' : ''} repaired for ${bodyguardInfo.totalCost} credits.`);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                    if (typeof saveGame === 'function') saveGame();
                }
            } else {
                addMessageFn(`Not enough credits! Bodyguard repairs cost ${bodyguardInfo.totalCost} credits.`);
                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            }
            return true;
        }
        return false;
    }

    /**
     * Handles shipyard click events.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Player} player - The player object
     * @param {Function} addMessageFn - Function to add UI messages
     * @param {string} returnState - State to return to when back is pressed (default: "DOCKED")
     * @returns {boolean} - True if handled
     */
    handleShipyardClick(mx, my, player, addMessageFn, returnState = "DOCKED") {
        // Check shipyard list areas
        for (const area of this.shipyardListAreas) {
            if (!UIComponents.isClickInArea(mx, my, area)) continue;
            
            const finalPrice = area.price; // Can be negative for refunds
            const systemName = (typeof galaxy !== 'undefined' && galaxy?.getCurrentSystem()?.name) || 'Unknown';
            
            if (finalPrice > 0) {
                // Player needs to pay
                if (player.credits >= finalPrice) {
                    player.spendCredits(finalPrice);
                    player.applyShipDefinition(area.shipTypeKey);
                    player.recordShipPurchase(area.shipName, finalPrice, systemName);
                    if (typeof saveGame === 'function') saveGame();
                    addMessageFn("You bought a " + area.shipName + "!");
                    if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                } else {
                    const shortfall = finalPrice - player.credits;
                    addMessageFn(`Not enough credits! Need ${shortfall} more for ${area.shipName}.`, [255, 150, 100]);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
            } else {
                // Player gets a refund or even swap
                player.addCredits(-finalPrice);
                player.applyShipDefinition(area.shipTypeKey);
                player.recordShipPurchase(area.shipName, finalPrice, systemName);
                if (typeof saveGame === 'function') saveGame();
                
                if (finalPrice < 0) {
                    addMessageFn(`You bought a ${area.shipName} and received ${-finalPrice} credits back!`);
                } else {
                    addMessageFn(`You swapped to a ${area.shipName} at no additional cost.`);
                }
                if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
            }
            return true;
        }
        
        // Back button
        if (this.shipyardDetailButtons?.back && UIComponents.isClickInArea(mx, my, this.shipyardDetailButtons.back)) {
            if (typeof gameStateManager !== 'undefined') gameStateManager.setState(returnState);
            return true;
        }
        return false;
    }

    /**
     * Handles upgrades click events.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Player} player - The player object
     * @param {Function} addMessageFn - Function to add UI messages
     * @param {string} returnState - State to return to when back is pressed (default: "DOCKED")
     * @returns {boolean} - True if handled
     */
    handleUpgradesClick(mx, my, player, addMessageFn, returnState = "DOCKED") {
        // Check weapon slot buttons first
        if (this.weaponSlotButtons && this.weaponSlotButtons.length > 0) {
            for (const btn of this.weaponSlotButtons) {
                if (UIComponents.isClickInArea(mx, my, btn)) {
                    this.selectedWeaponSlot = btn.slotIndex;
                    if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                    return true;
                }
            }
        }
        
        // Check upgrade list items
        for (const area of this.upgradeListAreas) {
            if (!UIComponents.isClickInArea(mx, my, area)) continue;
            
            if (player.credits >= area.upgrade.price) {
                // Check if ship has enough weapon slots
                const shipDef = (typeof SHIP_DEFINITIONS !== 'undefined') ? SHIP_DEFINITIONS[player.shipTypeName] : null;
                const availableSlots = shipDef?.armament?.length || 1;
                
                if (this.selectedWeaponSlot >= availableSlots) {
                    addMessageFn("Your ship doesn't have that weapon slot!", [255, 100, 100]);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                    return true;
                }
                
                player.spendCredits(area.upgrade.price);
                player.installWeaponToSlot(area.upgrade, this.selectedWeaponSlot);
                
                const systemName = (typeof galaxy !== 'undefined' && galaxy?.getCurrentSystem()?.name) || 'Unknown';
                player.recordWeaponUpgrade(
                    area.upgrade.name,
                    area.upgrade.type,
                    area.upgrade.price,
                    this.selectedWeaponSlot,
                    systemName
                );
                
                if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                addMessageFn("You bought the " + area.upgrade.name + "!");
                if (typeof saveGame === 'function') saveGame();
            } else {
                const shortfall = area.upgrade.price - player.credits;
                addMessageFn(`Not enough credits! Need ${shortfall} more for ${area.upgrade.name}.`, [255, 150, 100]);
                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            }
            return true;
        }
        
        // Back button
        if (this.upgradeDetailButtons?.back && UIComponents.isClickInArea(mx, my, this.upgradeDetailButtons.back)) {
            if (typeof gameStateManager !== 'undefined') gameStateManager.setState(returnState);
            return true;
        }
        return false;
    }

    /**
     * Handles police menu click events.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Player} player - The player object
     * @param {Function} addMessageFn - Function to add UI messages
     * @param {Function} processFinePaymentFn - Function to process fine payment
     * @returns {boolean} - True if handled
     */
    handlePoliceClick(mx, my, player, addMessageFn, processFinePaymentFn) {
        for (const area of this.policeButtonAreas) {
            if (!UIComponents.isClickInArea(mx, my, area)) continue;
            
            if (area.action === 'back') {
                if (typeof gameStateManager !== 'undefined') gameStateManager.setState("DOCKED");
                return true;
            }
            if (area.action === 'pay_fine' && player) {
                processFinePaymentFn(player, area.amount);
                return true;
            }
            if (area.action === 'join_police' && player) {
                player.applyShipDefinition('ACAB');
                addMessageFn("You have joined the Police Force!", 'lightblue');
                player.isPolice = true;
                player.recordFactionJoin("POLICE");
                if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                
                if (player.currentSystem) {
                    player.currentSystem.playerWanted = false;
                    player.currentSystem.policeAlertSent = false;
                }
                if (typeof saveGame === 'function') saveGame();
                return true;
            }
        }
        return false;
    }

    /**
     * Handles protection services click events.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Player} player - The player object
     * @param {Function} addMessageFn - Function to add UI messages
     * @returns {boolean} - True if handled
     */
    handleProtectionClick(mx, my, player, addMessageFn) {
        for (const btn of this.protectionServicesButtons) {
            if (!UIComponents.isClickInArea(mx, my, btn)) continue;
            
            if (btn.action === "HIRE_BODYGUARD") {
                const hired = player.hireBodyguard(btn.shipType, btn.cost);
                if (hired) {
                    addMessageFn(`Hired ${btn.shipType} bodyguard for ${btn.cost} credits.`, [150, 255, 150]);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                    if (typeof saveGame === 'function') saveGame();
                    if (player.activeBodyguards.length >= player.bodyguardLimit) {
                        if (typeof gameStateManager !== 'undefined') gameStateManager.setState("VIEWING_PROTECTION");
                    }
                } else {
                    addMessageFn("Failed to hire bodyguard.", [255, 100, 100]);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
                return true;
            }
            if (btn.action === "DISMISS_BODYGUARDS") {
                player.dismissBodyguards();
                addMessageFn("All bodyguards have been dismissed.", [255, 180, 100]);
                if (typeof soundManager !== 'undefined') soundManager.playSound('click_off');
                if (typeof saveGame === 'function') saveGame();
                if (typeof gameStateManager !== 'undefined') gameStateManager.setState("VIEWING_PROTECTION");
                return true;
            }
            if (btn.state === "DOCKED") {
                if (typeof gameStateManager !== 'undefined') gameStateManager.setState("DOCKED");
                return true;
            }
        }
        return false;
    }

    /**
     * Handles storage click events.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Player} player - The player object
     * @param {Station} station - The current station
     * @param {Function} addMessageFn - Function to add UI messages
     * @returns {boolean} - True if handled
     */
    handleStorageClick(mx, my, player, station, addMessageFn) {
        if (!Array.isArray(this.storageButtonAreas)) return false;
        
        const stationForStorage = station || player?.currentSystem?.station || null;
        if (stationForStorage && !Array.isArray(stationForStorage.storage)) {
            stationForStorage.storage = [];
        }
        
        for (const btn of this.storageButtonAreas) {
            if (!UIComponents.isClickInArea(mx, my, btn)) continue;
            
            if (btn.action === "BACK") {
                if (typeof gameStateManager !== 'undefined') gameStateManager.setState("DOCKED");
                return true;
            }
            if (btn.action === "DEPOSIT_STORAGE") {
                if (!stationForStorage) {
                    addMessageFn("No storage available here.", [255, 180, 120]);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                    return true;
                }
                const item = player.cargo.find(c => c.name === btn.commodity);
                if (item && item.quantity > 0) {
                    const storageItem = stationForStorage.storage.find(s => s.name === btn.commodity);
                    if (storageItem) {
                        storageItem.quantity += item.quantity;
                    } else {
                        stationForStorage.storage.push({name: btn.commodity, quantity: item.quantity});
                    }
                    player.cargo = player.cargo.filter(c => c.name !== btn.commodity);
                    addMessageFn(`Deposited ${item.quantity}t of ${btn.commodity} into storage.`, [100, 255, 100]);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                    if (typeof saveGame === 'function') saveGame();
                }
                return true;
            }
            if (btn.action === "RETRIEVE_STORAGE") {
                if (!stationForStorage) {
                    addMessageFn("No storage available here.", [255, 180, 120]);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                    return true;
                }
                const storageItem = stationForStorage.storage.find(s => s.name === btn.commodity);
                if (storageItem && storageItem.quantity > 0) {
                    const availableSpace = player.cargoCapacity - player.getCargoAmount();
                    const retrieveAmount = Math.min(storageItem.quantity, availableSpace);
                    
                    if (retrieveAmount > 0) {
                        player.addCargo(btn.commodity, retrieveAmount);
                        storageItem.quantity -= retrieveAmount;
                        if (storageItem.quantity <= 0) {
                            stationForStorage.storage = stationForStorage.storage.filter(s => s.name !== btn.commodity);
                        }
                        addMessageFn(`Retrieved ${retrieveAmount}t of ${btn.commodity} from storage.`, [100, 255, 100]);
                        if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                        if (typeof saveGame === 'function') saveGame();
                    } else {
                        addMessageFn("Not enough cargo space!", [255, 100, 100]);
                        if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                    }
                }
                return true;
            }
        }
        return false;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.UIStationMenus = UIStationMenus;
}
