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

        // Ship Detail Screen
        this.selectedShipForDetail = null;
        this.shipDetailButtons = {};
        this.availableShipsList = []; // List of filtered ships for prev/next navigation
        this.currentShipIndex = -1;   // Index of currently viewed ship in availableShipsList
        this._fullFilteredShips = []; // Full list of filtered ships (not just visible)

        // Upgrades areas
        this.upgradeListAreas = [];
        this.upgradeDetailButtons = {};
        this.upgradeScrollOffset = 0;
        this.upgradeScrollMax = 0;
        this.upgradeScrollbarArea = {};
        this.weaponSlotButtons = [];
        this.selectedWeaponSlot = 0;

        // Weapon detail areas
        this.selectedWeaponForDetail = null;
        this.weaponDetailButtons = {};
        this.availableWeaponsList = []; // List of filtered weapons for prev/next navigation
        this.currentWeaponIndex = -1;   // Index of currently viewed weapon in availableWeaponsList
        this._fullFilteredWeapons = []; // Full list of filtered weapons (not just visible)

        // Slot picker popup state
        this.showingSlotPicker = false;
        this.slotPickerButtons = [];
        this.pendingWeaponPurchase = null; // Stores weapon data while picking slot

        // Protection services
        this.protectionServicesButtons = [];

        // Storage areas
        this.storageButtonAreas = [];

        // Record areas
        this.recordButtonAreas = [];
        this.recordScrollOffset = 0;
        this.recordScrollMax = 0;

        // News areas
        this.newsButtonAreas = [];
        this.newsScrollOffset = 0;
        this.newsScrollMax = 0;
    }

    /**
     * Draws the News Menu (The Galactic Echo).
     * Compact 2-line layout: Headline + Body text
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     */
    drawNewsMenu(player, panelRect, headerHeight) {
        if (!player) return;
        this.newsButtonAreas = [];

        const { x: pX, y: pY, w: pW, h: pH } = panelRect;
        const contentY = pY + headerHeight + 10;
        const contentH = pH - headerHeight - 60;

        // Get news items
        const newsItems = (typeof GameGlobals !== 'undefined' && GameGlobals.newsManager)
            ? GameGlobals.newsManager.getNewsItems()
            : [];

        // Header with styling
        push();
        noStroke();
        fill(255, 200, 100);
        textSize(22);
        textAlign(LEFT, TOP);
        textStyle(BOLD);
        text("THE GALACTIC ECHO", pX + 30, contentY);
        textStyle(NORMAL);
        fill(180);
        textSize(14);
        text("Your Trusted Source Across the Sectors", pX + 30, contentY + 26);
        pop();

        let currentY = contentY + 55;
        const availableHeight = contentH - 55;

        if (newsItems.length === 0) {
            UIComponents.setTextStyle({ fill: 180, size: 16, align: [CENTER, CENTER] });
            text("No news reports available.", pX + pW / 2, currentY + availableHeight / 2);
        } else {
            // Compact 2-line layout: much smaller item height
            const itemHeight = 58;
            const visibleItems = Math.floor(availableHeight / itemHeight);
            const totalItems = newsItems.length;

            this.newsScrollMax = Math.max(0, totalItems - visibleItems);
            this.newsScrollOffset = constrain(this.newsScrollOffset, 0, this.newsScrollMax);

            const startIndex = this.newsScrollOffset;
            const endIndex = Math.min(startIndex + visibleItems, totalItems);

            for (let i = startIndex; i < endIndex; i++) {
                const item = newsItems[i];
                const itemY = currentY + (i - startIndex) * itemHeight;

                // Determine border color based on category/priority
                let borderColor = [60, 60, 80];
                const category = item.category || 'LOCAL_EVENT';
                const priority = item.priority || 2;

                if (category === 'PLAYER_ACTION' || priority >= 4) {
                    borderColor = [200, 100, 100]; // Red for breaking/player action
                } else if (category === 'GALAXY_NEWS') {
                    borderColor = [100, 150, 200]; // Blue for galaxy news
                } else if (category === 'LOCAL_EVENT') {
                    borderColor = [150, 150, 80]; // Yellow-ish for local
                }

                // Draw compact item background
                fill(18, 18, 28);
                stroke(borderColor);
                strokeWeight(1);
                rect(pX + 20, itemY, pW - 40, itemHeight - 6, 4);
                noStroke();

                // "BREAKING" badge for high priority player actions
                let headlineStartX = pX + 28;
                if (priority >= 4) {
                    // Draw breaking badge
                    fill(180, 40, 40);
                    noStroke();
                    rect(pX + 25, itemY + 6, 60, 16, 3);
                    fill(255);
                    textSize(10);
                    textAlign(CENTER, CENTER);
                    textStyle(BOLD);
                    text("BREAKING", pX + 55, itemY + 14);
                    textStyle(NORMAL);
                    headlineStartX = pX + 92;
                }

                // Headline (line 1) - bold, larger
                const sourceColor = item.sourceColor || [200, 200, 200];
                fill(255, 230, 120);
                textSize(15);
                textAlign(LEFT, TOP);
                textStyle(BOLD);

                // Truncate headline if too long
                const headline = item.headline || item.title || "News Update";
                const maxHeadlineWidth = pW - (headlineStartX - pX) - 100;
                let displayHeadline = headline;
                if (textWidth(headline) > maxHeadlineWidth) {
                    while (textWidth(displayHeadline + "...") > maxHeadlineWidth && displayHeadline.length > 10) {
                        displayHeadline = displayHeadline.slice(0, -1);
                    }
                    displayHeadline += "...";
                }
                text(displayHeadline, headlineStartX, itemY + 8);
                textStyle(NORMAL);

                // Source on right side (line 1)
                fill(sourceColor);
                textSize(11);
                textAlign(RIGHT, TOP);
                text(item.source || "Echo", pX + pW - 28, itemY + 10);

                // Body text (line 2) - smaller, dimmer, truncated
                fill(170);
                textSize(12);
                textAlign(LEFT, TOP);

                const bodyText = item.body || "";
                const maxBodyWidth = pW - 70;
                let displayBody = bodyText;
                if (textWidth(bodyText) > maxBodyWidth) {
                    while (textWidth(displayBody + "...") > maxBodyWidth && displayBody.length > 10) {
                        displayBody = displayBody.slice(0, -1);
                    }
                    displayBody += "...";
                }
                text(displayBody, pX + 28, itemY + 30);

                // Time ago indicator (bottom right, very subtle)
                fill(100);
                textSize(10);
                textAlign(RIGHT, TOP);
                const ageMs = Date.now() - (item.timestamp || Date.now());
                const ageMins = Math.floor(ageMs / 60000);
                let ageStr;
                if (ageMins < 1) ageStr = "just now";
                else if (ageMins < 60) ageStr = `${ageMins}m ago`;
                else if (ageMins < 1440) ageStr = `${Math.floor(ageMins / 60)}h ago`;
                else ageStr = `${Math.floor(ageMins / 1440)}d ago`;
                text(ageStr, pX + pW - 28, itemY + 32);
            }

            // Draw scrollbar if needed
            if (this.newsScrollMax > 0) {
                this.newsScrollbarArea = UIComponents.drawScrollbar(
                    pX + pW, currentY, visibleItems * itemHeight,
                    this.newsScrollOffset, this.newsScrollMax,
                    visibleItems, totalItems,
                    [60, 60, 100], [120, 180, 255]
                );
            }
        }

        // Back button
        const backBtn = UIComponents.drawCenteredBackButton(pX, pY, pW, pH, { action: "BACK" });
        this.newsButtonAreas.push(backBtn);
    }

    /**
     * Draws the shared repair content used by both station and space object repairs.
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     * @returns {Object} Button areas
     */
    _drawRepairsContent(player, panelRect, headerHeight) {
        const { x: pX, y: pY, w: pW, h: pH } = panelRect;

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

        const { x: pX, y: pY, w: pW, h: pH } = panelRect;
        const isAnarchySystem = typeof system?.securityLevel === 'string' && system.securityLevel.toLowerCase() === 'anarchy';

        if (isAnarchySystem) {
            UIComponents.setTextStyle({ fill: 220, size: 22, alignH: CENTER, alignV: TOP });
            const messageY = pY + headerHeight + 20;
            text("This anarchy system has no formal police presence.", pX + pW / 2, messageY);
            UIComponents.setTextStyle({ fill: [180, 200, 255], size: 18 });
            text("Local disputes are settled without official intervention.", pX + pW / 2, messageY + 35);

            this.policeButtonAreas.push(UIComponents.drawCenteredBackButton(pX, pY, pW, pH, { action: 'back' }));

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
        text(`Legal Status in ${system?.name || 'Unknown'} System: `, pX + pW / 2, contentY);
        UIComponents.setTextStyle({ fill: statusColor, size: 24 });
        text(statusText, pX + pW / 2, contentY + 30);

        // Display police bounty information
        if (player.isPolice) {
            UIComponents.setTextStyle({ fill: [100, 255, 100], size: 18 });
            text("Active Bounty: 1,000 cr per Pirate killed, 1,000 cr per Alien killed", pX + pW / 2, contentY + 65);
        }

        // Show police faction kill progress
        try {
            const pk = player.getFactionKillsProgress && player.getFactionKillsProgress('POLICE');
            if (pk) {
                UIComponents.setTextStyle({ fill: [200], size: 16, align: [CENTER, TOP] });
                if (pk.nextThreshold) {
                    text(`Police Kills: ${pk.kills} — ${pk.killsToNext} to ${pk.nextRank}`, pX + pW / 2, contentY + 95);
                } else {
                    text(`Police Kills: ${pk.kills} — Max Rank`, pX + pW / 2, contentY + 95);
                }
            }
        } catch (e) { /* fail silently */ }

        let fineAmount = 300;
        if (system?.securityLevel === 'High') fineAmount = 1000;
        else if (system?.securityLevel === 'Medium') fineAmount = 500;
        if (player.hasBeenPolice) {
            fineAmount *= 3;
            UIComponents.setTextStyle({ fill: [255, 200, 100], size: 16 });
            text("Fines tripled for former police officer", pX + pW / 2, contentY + 95);
        }

        let btnW = pW * 0.5, btnH = 45;
        let btnX = pX + pW / 2 - btnW / 2;
        let btnY1 = contentY + (player.isPolice ? 100 : (player.hasBeenPolice ? 125 : 90));

        if (isWanted) {
            this.policeButtonAreas.push(
                UIComponents.drawButton(btnX, btnY1, btnW, btnH, `Pay Fine (${fineAmount} cr)`, [0, 180, 0], [100, 255, 100], 5, { action: 'pay_fine', amount: fineAmount })
            );
        }

        const btnY2 = btnY1 + btnH + 20;
        if (!player.isPolice) {
            this.policeButtonAreas.push(
                UIComponents.drawButton(btnX, btnY2, btnW, btnH, "Join Police Force", [50, 50, 180], [100, 100, 255], 5, { action: 'join_police' })
            );
        } else {
            UIComponents.setTextStyle({ fill: 255, size: 18, align: [CENTER, CENTER] });
            text("You are a member of the Police Force", pX + pW / 2, btnY2 + btnH / 2);
        }

        this.policeButtonAreas.push(UIComponents.drawCenteredBackButton(pX, pY, pW, pH, { action: 'back' }));

        // Sync to UIManager for backward compatibility
        uiManager.policeButtonAreas = this.policeButtonAreas;
        pop();
    }

    /**
     * Generates welcome text for the shipyard based on tech level, economy type, and system name.
     * @param {number} techLevel - System's tech level
     * @param {string} economyType - System's economy type
     * @param {string} systemName - System's name
     * @returns {string} Single line welcome message
     */
    _getShipyardWelcomeText(techLevel, economyType, systemName) {
        const name = systemName || "this station";

        if (economyType === "Imperial") {
            return techLevel >= 5
                ? `Welcome to ${name}. We stock the finest Imperial vessels here—nothing but the best for the Empire.`
                : `Here at ${name}, we carry Imperial craft up to tech ${techLevel}. For capital ships, visit a core Imperial world.`;
        } else if (economyType === "Separatist") {
            return techLevel >= 5
                ? `Welcome to ${name}. We've got the full Separatist fleet available—built for those who value independence.`
                : `${name} shipworks, tech ${techLevel}. We build them tough here—for heavier craft, try our main Separatist yards.`;
        } else if (economyType === "Military") {
            return techLevel >= 5
                ? `${name} Military Yards. We stock everything from patrol craft to heavy destroyers.`
                : `${name} Military Shipyard, tech ${techLevel}. Solid hardware here—classified vessels require higher clearance.`;
        } else {
            if (techLevel <= 2) {
                return `Welcome to ${name}. We carry basic vessels here—for more advanced ships, try a higher-tech system.`;
            } else if (techLevel <= 4) {
                return `${name} shipyard. We've got a good selection up to tech ${techLevel}—for cutting-edge craft, head to a tech 5 world.`;
            } else {
                return `Welcome to ${name}. We stock all the latest vessels here—take your time browsing.`;
            }
        }
    }

    /**
     * Generates welcome text for the upgrades menu based on tech level, economy type, and system name.
     * @param {number} techLevel - System's tech level
     * @param {string} economyType - System's economy type
     * @param {string} systemName - System's name
     * @returns {string} Single line welcome message
     */
    _getUpgradesWelcomeText(techLevel, economyType, systemName) {
        const name = systemName || "this station";

        if (economyType === "Military") {
            return techLevel >= 5
                ? `${name} Armoury. We carry the full military weapons catalog here.`
                : `${name} Military Arms, tech ${techLevel}. Good hardware—advanced ordnance available at higher-tech bases.`;
        } else if (economyType === "Imperial") {
            return techLevel >= 5
                ? `${name} Imperial Arms. We stock the finest weapons the Empire has to offer.`
                : `${name} Imperial Arms, tech ${techLevel}. Quality weapons here—prestige pieces in the core worlds.`;
        } else if (economyType === "Separatist") {
            return techLevel >= 5
                ? `${name} Revolutionary Arms. We've got everything you need for the cause.`
                : `${name} Separatist Armoury, tech ${techLevel}. Solid gear—heavier ordnance at our main bases.`;
        } else {
            if (techLevel <= 2) {
                return `${name} weapons dealer. We carry basic armaments—for advanced weapons, try a higher-tech system.`;
            } else if (techLevel <= 4) {
                return `${name} upgrades, tech ${techLevel}. Reliable gear here—for premium weapons, visit a tech 5 world.`;
            } else {
                return `${name} armoury. We stock all the latest weapons—browse at your leisure.`;
            }
        }
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

        const { x: pX, y: pY, w: pW, h: pH } = panelRect;

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

        // FILTER SHIPS based on system properties
        const systemTechLevel = system?.techLevel || 1;
        const economyType = system?.economyType || "";
        const isImperialSystem = economyType === "Imperial";
        const isSeparatistSystem = economyType === "Separatist";
        const isMillitarySystem = economyType === "Military";

        const availableShips = typeof SHIP_DEFINITIONS !== 'undefined' ? Object.entries(SHIP_DEFINITIONS).filter(([shipKey, shipData]) => {
            // Never show alien ships
            if (shipData.aiRoles && shipData.aiRoles.includes("ALIEN")) return false;

            // Faction-specific ship filtering
            // Imperial ships only in Imperial systems
            if (shipData.aiRoles?.includes("IMPERIAL") && !isImperialSystem) return false;
            // Separatist ships only in Separatist systems
            if (shipData.aiRoles?.includes("SEPARATIST") && !isSeparatistSystem) return false;
            // Military ships only in Military systems
            if (shipData.aiRoles?.includes("MILITARY") && !isMillitarySystem) return false;

            // Tech level filtering
            const shipTechLevel = shipData.techLevel || Math.min(5, Math.ceil(shipData.price / 40000));
            return shipTechLevel <= systemTechLevel;
        }) : [];

        // Store full filtered list for navigation (not just visible items)
        this._fullFilteredShips = availableShips;

        // Draw welcome text (single line)
        const systemName = system?.name || "Unknown";
        const welcomeText = this._getShipyardWelcomeText(systemTechLevel, economyType, systemName);
        UIComponents.setTextStyle({ fill: [255, 230, 150], size: 16, align: [LEFT, TOP] });
        text(welcomeText, pX + 20, pY + headerHeight);

        // Show trade-in info
        UIComponents.setTextStyle({ fill: [180, 220, 255], size: 16, align: [LEFT, TOP] });
        text(`Your ship: ${currentShipType} (Trade-in: ${currentShipValue} cr)`, pX + 20, pY + headerHeight + 22);

        // List ships - adjusted startY for welcome text
        let rowH = 40, startY = pY + headerHeight + 50, visibleRows = floor((pH - headerHeight - 100) / rowH);
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
            let y = startY + (i - firstRow) * rowH;

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
            rect(pX + 20, y, pW - 40, rowH - 6, 5);

            noStroke();

            if (isCurrentShip) {
                fill(100, 150, 255);
                textAlign(LEFT, CENTER);
                textSize(18);
                text(`${ship.name}`, pX + 30, y + rowH / 2);
                textAlign(RIGHT, CENTER);
                textSize(16);
                fill(150, 180, 255);
                text(`CURRENT SHIP`, pX + pW - 30, y + rowH / 2);
            } else {
                textAlign(LEFT, CENTER);
                textSize(16);
                fill(canAfford ? 255 : 120);
                const leftText = `${ship.name}  |  Hull: ${ship.baseHull}  |  Cargo: ${ship.cargoCapacity}`;
                text(leftText, pX + 30, y + rowH / 2);

                textAlign(RIGHT, CENTER);
                textSize(16);
                if (finalPrice > 0) {
                    fill(canAfford ? 255 : 120, canAfford ? 220 : 100, canAfford ? 100 : 50);
                    text(`${finalPrice} cr`, pX + pW - 30, y + rowH / 2);
                } else if (finalPrice < 0) {
                    fill(100, 255, 150);
                    text(`+${-finalPrice} cr`, pX + pW - 30, y + rowH / 2);
                } else {
                    fill(150, 255, 150);
                    text(`EVEN SWAP`, pX + pW - 30, y + rowH / 2);
                }
            }

            // Always add to clickable areas (including current ship)
            this.shipyardListAreas.push({
                x: pX + 20, y: y, w: pW - 40, h: rowH - 6,
                shipTypeKey: shipKey,
                shipName: ship.name,
                price: finalPrice,
                originalPrice: originalPrice,
                canAfford: canAfford,
                isCurrentShip: isCurrentShip
            });
        }

        // Draw scrollbar if needed
        this.shipyardScrollbarArea = UIComponents.drawScrollbar(
            pX + pW, startY, scrollAreaH,
            this.shipyardScrollOffset, this.shipyardScrollMax,
            visibleRows, totalRows,
            [60, 60, 100], [120, 180, 255]
        );

        // Back button
        this.shipyardDetailButtons = { back: UIComponents.drawCenteredBackButton(pX, pY, pW, pH) };
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

        // Clear any popup state from weapon detail screen
        this.showingSlotPicker = false;
        this.pendingWeaponPurchase = null;

        const { x: pX, y: pY, w: pW, h: pH } = panelRect;

        // FILTER UPGRADES based on system tech level
        const systemTechLevel = system?.techLevel || 1;
        const economyType = system?.economyType || "";
        const availableWeapons = typeof WEAPON_UPGRADES !== 'undefined' ? WEAPON_UPGRADES.filter(weapon => {
            // Use weapon's explicit techLevel, or calculate from damage/price
            // For barrier weapons (no damage property), use price-based calculation with fallback
            const damage = weapon.damage || 1; // Fallback for barrier weapons that use damageReduction
            const weaponTechLevel = weapon.techLevel || Math.min(5, Math.ceil((damage * weapon.price) / 5000));
            return weaponTechLevel <= systemTechLevel;
        }) : [];

        // Store full filtered list for navigation (not just visible items)
        this._fullFilteredWeapons = availableWeapons;

        // Draw welcome text (single line)
        const systemName = system?.name || "Unknown";
        const welcomeText = this._getUpgradesWelcomeText(systemTechLevel, economyType, systemName);
        UIComponents.setTextStyle({ fill: [255, 200, 150], size: 16, align: [LEFT, TOP] });
        text(welcomeText, pX + 20, pY + headerHeight);

        // Continue with upgrade menu drawing
        let rowH = 40, startY = pY + headerHeight + 28;
        let visibleRows = floor((pH - headerHeight - 80) / rowH);
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
            let y = startY + (i - firstRow) * rowH;

            const canAfford = player.credits >= upg.price;

            fill(canAfford ? 80 : 40, canAfford ? 60 : 40, canAfford ? 120 : 60);
            stroke(canAfford ? 180 : 100, canAfford ? 100 : 60, canAfford ? 255 : 140);
            rect(pX + 20, y, pW - 40, rowH - 6, 5);

            noStroke();
            textAlign(LEFT, CENTER);
            textSize(16);
            fill(canAfford ? 255 : 120);
            const upgLeft = `${upg.name}  |  Type: ${upg.type}  |  DPS: ${upg.damage}`;
            text(upgLeft, pX + 30, y + rowH / 2);

            textAlign(RIGHT, CENTER);
            textSize(16);
            fill(canAfford ? 200 : 100, canAfford ? 150 : 80, canAfford ? 255 : 120);
            text(`${upg.price} cr`, pX + pW - 30, y + rowH / 2);

            this.upgradeListAreas.push({
                x: pX + 20,
                y: y,
                w: pW - 40,
                h: rowH - 6,
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
        this.upgradeDetailButtons = { back: UIComponents.drawCenteredBackButton(pX, pY, pW, pH) };
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

        const { x: pX, y: pY, w: pW, h: pH } = panelRect;

        // Draw description
        UIComponents.setTextStyle({ fill: 220, size: 24, align: [CENTER, TOP] });
        let descY = pY + headerHeight + 20;
        text("Hire professional security guards to protect you during your travels.", pX + pW / 2, descY);

        // Show current bodyguard status
        UIComponents.setTextStyle({ fill: [180, 220, 255], size: 20 });
        let statusY = descY + 40;

        const activeGuardsCount = player.getActiveGuardsCount ? player.getActiveGuardsCount() : 0;
        const bodyguardLimit = player.bodyguardLimit || 0;
        text(`Active bodyguards: ${activeGuardsCount}/${bodyguardLimit}`, pX + pW / 2, statusY);

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
                    text(`Slot ${i + 1}: ${guard.name} (${guard.ship})`, btnX + 15, btnY + 15);

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
                pX + pW / 2 - 100,
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
            pX + pW / 2 - 60,
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
        const { x: pX, y: pY, w: pW, h: pH } = panelRect;

        if (!activeStation) {
            UIComponents.setTextStyle({ fill: 220, size: 22, align: [CENTER, CENTER] });
            text("No storage services are available in this location.", pX + pW / 2, pY + pH / 2 - 20);

            const backBtn = UIComponents.drawCenteredBackButton(pX, pY, pW, pH, { action: "BACK" });
            this.storageButtonAreas.push(backBtn);
            return;
        }

        // Ensure the station exposes a mutable storage array
        if (!Array.isArray(activeStation.storage)) {
            activeStation.storage = [];
        }

        UIComponents.setTextStyle({ fill: 220, size: 20, align: [CENTER, TOP] });
        const infoY = pY + headerHeight + 10;
        text("Store cargo safely at this station. Stored goods stay here until retrieved.", pX + pW / 2, infoY);

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

                // Check for mission match
                const isMissionItem = player.activeMission && player.activeMission.cargoType === item.name;

                if (isMissionItem) {
                    fill(255, 200, 100);
                } else {
                    fill(220);
                }

                textAlign(LEFT, CENTER);

                let labelText = `${item.name}: ${item.quantity}t`;
                if (isMissionItem) {
                    const req = player.activeMission.cargoQuantity || 0;
                    const missionAmount = Math.min(item.quantity, req);
                    const extraAmount = Math.max(0, item.quantity - req);

                    if (extraAmount > 0) {
                        labelText = `${item.name}: ${missionAmount} (Mission) + ${extraAmount} (Free)`;
                    } else {
                        labelText = `${item.name}: ${missionAmount} / ${req} (Mission)`;
                    }
                }

                text(labelText, pX + 50, itemY + 17.5);

                if (isMissionItem) {
                    push();
                    fill(200, 150, 0);
                    rect(pX + 380, itemY + 8, 60, 18, 4); // Moved right
                    fill(20);
                    textSize(11);
                    textAlign(CENTER, CENTER);
                    text("MISSION", pX + 410, itemY + 18);
                    pop();
                }

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

                // Check for mission match
                const isMissionItem = player.activeMission && player.activeMission.cargoType === item.name;

                if (isMissionItem) {
                    fill(255, 200, 100);
                } else {
                    fill(220);
                }

                textAlign(LEFT, CENTER);

                let labelText = `${item.name}: ${item.quantity}t`;
                if (isMissionItem) {
                    const req = player.activeMission.cargoQuantity || 0;
                    const missionAmount = Math.min(item.quantity, req);
                    const extraAmount = Math.max(0, item.quantity - req);

                    if (extraAmount > 0) {
                        labelText = `${item.name}: ${missionAmount} (Mission) + ${extraAmount} (Free)`;
                    } else {
                        labelText = `${item.name}: ${missionAmount} / ${req} (Mission)`;
                    }
                }

                text(labelText, pX + 50, itemY + 17.5);

                if (isMissionItem) {
                    push();
                    fill(200, 150, 0);
                    rect(pX + 380, itemY + 8, 60, 18, 4); // Moved right
                    fill(20);
                    textSize(11);
                    textAlign(CENTER, CENTER);
                    text("MISSION", pX + 410, itemY + 18);
                    pop();
                }

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
        const backBtn = UIComponents.drawCenteredBackButton(pX, pY, pW, pH, { action: "BACK" });
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

        const { x: pX, y: pY, w: pW, h: pH } = panelRect;
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
            text("No activity recorded yet.", pX + pW / 2, currentY + (contentH - 35) / 2);
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
        const backBtn = UIComponents.drawCenteredBackButton(pX, pY, pW, pH, { action: "BACK" });
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
            "VIEWING_RECORD": ["recordScrollOffset", "recordScrollMax"],
            "VIEWING_NEWS": ["newsScrollOffset", "newsScrollMax"]
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
        for (let i = 0; i < this.shipyardListAreas.length; i++) {
            const area = this.shipyardListAreas[i];
            if (!UIComponents.isClickInArea(mx, my, area)) continue;

            // Build full navigation list from ALL filtered ships (not just visible)
            // This ensures arrow key navigation goes through the complete list
            const currentShipType = player.shipTypeName || "Vulture";
            let currentShipDef = null;
            if (typeof SHIP_DEFINITIONS !== 'undefined') {
                currentShipDef = SHIP_DEFINITIONS[currentShipType] ||
                    Object.values(SHIP_DEFINITIONS).find(s => s.name === currentShipType);
            }
            const currentShipValue = currentShipDef ? Math.floor(currentShipDef.price * 0.7) : 0;

            this.availableShipsList = this._fullFilteredShips.map(([shipKey, shipData]) => {
                const originalPrice = shipData.price;
                const finalPrice = originalPrice - currentShipValue;
                const canAfford = finalPrice <= 0 || player.credits >= finalPrice;
                const isCurrentShip = shipData.name === currentShipType ||
                    (currentShipDef && shipData.name === currentShipDef.name);
                return {
                    shipTypeKey: shipKey,
                    shipName: shipData.name,
                    shipDef: shipData,
                    price: finalPrice,
                    originalPrice: originalPrice,
                    canAfford: canAfford,
                    isCurrentShip: isCurrentShip,
                    returnState: returnState
                };
            });

            // Find the correct index in the FULL list based on the clicked item
            const clickedShipKey = area.shipTypeKey;
            this.currentShipIndex = this._fullFilteredShips.findIndex(([key]) => key === clickedShipKey);

            // Store selected ship data for the detail screen
            this.selectedShipForDetail = this.availableShipsList[this.currentShipIndex];

            // Navigate to ship detail screen
            if (typeof gameStateManager !== 'undefined') {
                gameStateManager.setState('VIEWING_SHIP_DETAIL');
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
     * Draws the Ship Detail Menu.
     * Shows a large 3D preview of the selected ship with specifications.
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     */
    drawShipDetailMenu(player, panelRect, headerHeight) {
        if (!player || !this.selectedShipForDetail) return;

        const { x: pX, y: pY, w: pW, h: pH } = panelRect;
        const shipData = this.selectedShipForDetail;
        const shipDef = shipData.shipDef;

        if (!shipDef) {
            UIComponents.drawCenteredInfo("Ship data not available", pX + pW / 2, pY + pH / 2);
            this.shipDetailButtons = { back: UIComponents.drawCenteredBackButton(pX, pY, pW, pH) };
            return;
        }

        // Layout constants
        const LAYOUT = {
            leftWidthRatio: 0.5,
            rightWidthRatio: 0.5,
            leftPadding: 20,
            columnGap: 40,
            topPadding: 10,
            bottomPadding: 60,
            previewSizeRatio: 0.6,
            priceBottomOffset: 110,
            buttonsBottomOffset: 80
        };

        // Calculate layout dimensions
        const leftW = pW * LAYOUT.leftWidthRatio;
        const rightW = pW * LAYOUT.rightWidthRatio;
        const leftX = pX + LAYOUT.leftPadding;
        const rightX = pX + leftW + LAYOUT.columnGap;
        const contentY = pY + headerHeight + LAYOUT.topPadding;
        const contentH = pH - headerHeight - LAYOUT.bottomPadding;

        // Render ship preview (left side)
        this._drawShipPreview(shipData, leftX, leftW, contentY, contentH, LAYOUT.previewSizeRatio);

        // Get current ship definition for comparison
        const currentShipType = player.shipTypeName || "Vulture";
        let currentShipDef = null;
        if (typeof SHIP_DEFINITIONS !== 'undefined') {
            if (SHIP_DEFINITIONS[currentShipType]) {
                currentShipDef = SHIP_DEFINITIONS[currentShipType];
            } else {
                currentShipDef = Object.values(SHIP_DEFINITIONS).find(ship =>
                    ship.name === currentShipType || ship.name.toLowerCase() === currentShipType.toLowerCase()
                );
            }
        }

        // Check if viewing current ship
        const isCurrentShip = shipDef.name === currentShipType ||
            (currentShipDef && shipDef.name === currentShipDef.name);

        // Render specifications (right side)
        this._drawShipSpecifications(shipDef, currentShipDef, rightX, rightW, contentY);

        // Render price information (right column)
        const priceY = pY + pH - LAYOUT.priceBottomOffset;
        this._drawPriceInfo(shipData, player, rightX, rightW, priceY);

        // Render action buttons (right column, at standard back button height)
        const BTN_HEIGHT = 30;
        const btnY = pY + pH - BTN_HEIGHT - 15;
        this.shipDetailButtons = this._drawActionButtons(shipData.canAfford, rightX, rightW, btnY, isCurrentShip);
    }

    /**
     * Draws the 3D ship preview section.
     * @private
     * @param {Object} shipData - Selected ship data
     * @param {number} leftX - Left area X position
     * @param {number} leftW - Left area width
     * @param {number} contentY - Content area Y position
     * @param {number} contentH - Content area height
     * @param {number} sizeRatio - Preview size ratio
     */
    _drawShipPreview(shipData, leftX, leftW, contentY, contentH, sizeRatio) {
        const previewCenterX = leftX + leftW / 2;
        const previewCenterY = contentY + contentH / 2;
        const previewSize = Math.min(leftW, contentH) * sizeRatio;

        // Ship name at top of preview area
        fill(180, 220, 255);
        noStroke();
        textSize(24);
        textAlign(CENTER, TOP);
        text(shipData.shipName, previewCenterX, contentY + 10);

        // Draw rotating ship
        UIComponents.drawRotatingShip(shipData.shipDef, previewCenterX, previewCenterY, previewSize, 0.0008);
    }

    /**
     * Draws the ship specifications section.
     * @private
     * @param {Object} shipDef - Ship definition
     * @param {Object} currentShipDef - Current ship definition for comparison
     * @param {number} specX - Specifications X position
     * @param {number} rightW - Right area width
     * @param {number} contentY - Content area Y position
     */
    _drawShipSpecifications(shipDef, currentShipDef, specX, rightW, contentY) {
        let specY = contentY + 10;
        const lineH = 32;

        // Ship description with dynamic height calculation
        fill(200, 200, 255);
        textSize(18);
        textAlign(LEFT, TOP);

        // Calculate how many lines the description will need
        const descriptionText = shipDef.description || "No description available.";
        const maxDescWidth = rightW - 40; // Extra padding to prevent touching right edge

        // Use textLeading to get line spacing, default to textSize * 1.25 if not set
        const leading = textLeading() || 18 * 1.25;

        // Draw the description with proper wrapping
        text(descriptionText, specX, specY, maxDescWidth);

        // Calculate actual height used by description
        // Estimate lines based on character width (rough approximation)
        const avgCharWidth = textWidth('M') * 0.6; // Average character width
        const charsPerLine = Math.floor(maxDescWidth / avgCharWidth);
        const estimatedLines = Math.ceil(descriptionText.length / charsPerLine);
        const descriptionHeight = estimatedLines * leading + 10; // Add small padding

        specY += descriptionHeight + 15; // Move down by actual description height + spacing

        // Ship role and category header
        fill(255, 200, 100);
        textSize(20);
        text(`${shipDef.role} (${shipDef.sizeCategory})`, specX, specY);
        specY += lineH * 1.2;

        // Core stats in two columns
        const columnsStartY = specY;
        this._drawShipStats(shipDef, currentShipDef, specX, rightW, columnsStartY, lineH);

        // Weapons/armament section (moved down for 4 stats instead of 3)
        specY = columnsStartY + (lineH * 0.9 * 4) + 15;
        this._drawArmamentSection(shipDef, specX, specY, lineH);
    }

    /**
     * Draws ship stats in two columns with comparison to current ship.
     * @private
     * @param {Object} shipDef - Ship definition
     * @param {Object} currentShipDef - Current ship definition for comparison
     * @param {number} specX - Specifications X position
     * @param {number} rightW - Right area width
     * @param {number} startY - Starting Y position
     * @param {number} lineH - Line height
     */
    _drawShipStats(shipDef, currentShipDef, specX, rightW, startY, lineH) {
        textSize(16);
        textAlign(LEFT, TOP);
        const colW = rightW * 0.5;
        const col2X = specX + colW;

        // Helper to draw stat with comparison
        const drawStatWithComparison = (label, value, currentValue, x, y, decimals = 0) => {
            fill(220);
            const valueStr = decimals > 0 ? value.toFixed(decimals) : value;
            text(`${label}: ${valueStr}`, x, y);

            if (currentShipDef && currentValue !== undefined) {
                const diff = value - currentValue;
                if (Math.abs(diff) > 0.01) {
                    const diffStr = decimals > 0 ? diff.toFixed(decimals) : Math.floor(diff);
                    const sign = diff > 0 ? '+' : '';
                    const comparison = `(${sign}${diffStr})`;

                    // Measure the base text to position the comparison
                    const baseText = `${label}: ${valueStr}  `;
                    const baseWidth = textWidth(baseText);

                    // Color code: green for positive, red for negative
                    fill(diff > 0 ? [100, 255, 100] : [255, 100, 100]);
                    text(comparison, x + baseWidth, y);
                }
            }
        };

        // Column 1: Hull, Shield, Shield Recharge, Cargo
        let col1Y = startY;
        drawStatWithComparison('Hull', shipDef.baseHull, currentShipDef?.baseHull, specX, col1Y);
        col1Y += lineH * 0.9;
        drawStatWithComparison('Shield', shipDef.baseShield, currentShipDef?.baseShield, specX, col1Y);
        col1Y += lineH * 0.9;
        drawStatWithComparison('Shield Rchg', shipDef.shieldRecharge || 0, currentShipDef?.shieldRecharge, specX, col1Y, 1);
        col1Y += lineH * 0.9;
        drawStatWithComparison('Cargo', shipDef.cargoCapacity, currentShipDef?.cargoCapacity, specX, col1Y);

        // Column 2: Speed, Thrust, Turn
        let col2Y = startY;
        drawStatWithComparison('Speed', shipDef.baseMaxSpeed, currentShipDef?.baseMaxSpeed, col2X, col2Y, 1);
        col2Y += lineH * 0.9;
        drawStatWithComparison('Thrust', shipDef.baseThrust, currentShipDef?.baseThrust, col2X, col2Y, 2);
        col2Y += lineH * 0.9;
        drawStatWithComparison('Turn', shipDef.baseTurnRate * 100, currentShipDef ? currentShipDef.baseTurnRate * 100 : undefined, col2X, col2Y, 1);
    }

    /**
     * Draws the armament/weapons section.
     * @private
     * @param {Object} shipDef - Ship definition
     * @param {number} specX - Specifications X position
     * @param {number} startY - Starting Y position
     * @param {number} lineH - Line height
     */
    _drawArmamentSection(shipDef, specX, startY, lineH) {
        let y = startY;

        // Section header
        fill(255, 200, 100);
        textSize(20);
        textAlign(LEFT, TOP);
        text("Armament:", specX, y);
        y += lineH * 0.8;

        // Weapon list
        textSize(16);
        if (shipDef.armament && shipDef.armament.length > 0) {
            fill(200);
            for (let i = 0; i < shipDef.armament.length; i++) {
                text(`• ${shipDef.armament[i]}`, specX + 10, y);
                y += lineH * 0.6;
            }
        } else {
            fill(150);
            text("None", specX + 10, y);
        }
    }

    /**
     * Draws the price information section.
     * @private
     * @param {Object} shipData - Selected ship data
     * @param {Player} player - Player object
     * @param {number} x - X position
     * @param {number} rightW - Right area width
     * @param {number} y - Y position
     */
    _drawPriceInfo(shipData, player, x, rightW, y) {
        const finalPrice = shipData.price;
        const canAfford = shipData.canAfford;

        // Price label
        fill(180, 220, 255);
        noStroke();
        textSize(15);
        textAlign(LEFT, TOP);
        text("Price (after trade-in):", x, y);

        // Price value with color coding
        textSize(20);
        if (finalPrice > 0) {
            fill(canAfford ? [100, 255, 100] : [255, 150, 150]);
            text(`${finalPrice} cr`, x, y + 20);
        } else if (finalPrice < 0) {
            fill(100, 255, 150);
            text(`+${-finalPrice} cr`, x, y + 20);
        } else {
            fill(150, 255, 150);
            text("EVEN SWAP", x, y + 20);
        }

        // Affordability warning
        if (!canAfford && finalPrice > 0) {
            fill(255, 150, 150);
            textSize(12);
            textAlign(CENTER, TOP);
            const shortfall = finalPrice - player.credits;
            text(`Need ${shortfall} more cr`, x + rightW / 2, y + 22);
        }
    }

    /**
     * Draws the action buttons (Prev/Next/Buy/Back).
     * @private
     * @param {boolean} canAfford - Whether player can afford the ship
     * @param {number} columnX - Right column X position
     * @param {number} columnW - Right column width
     * @param {number} y - Y position
     * @param {boolean} isCurrentShip - Whether this is the player's current ship
     * @returns {Object} Button areas {prev, next, buy, back}
     */
    _drawActionButtons(canAfford, columnX, columnW, y, isCurrentShip = false) {
        const BTN_WIDTH = 70;
        const BTN_HEIGHT = 30;
        const BTN_SPACING = 8;

        let currentX = columnX;

        // Previous button
        const hasPrev = this.currentShipIndex > 0;
        let prevBtn = null;
        if (hasPrev) {
            prevBtn = UIComponents.drawButton(currentX, y, BTN_WIDTH, BTN_HEIGHT, "< PREV", [80, 80, 120], [150, 150, 200]);
        } else {
            // Draw disabled prev button
            fill(40, 40, 40);
            stroke(60, 60, 60);
            strokeWeight(1);
            rect(currentX, y, BTN_WIDTH, BTN_HEIGHT, 5);
            fill(80);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(14);
            text("< PREV", currentX + BTN_WIDTH / 2, y + BTN_HEIGHT / 2);
        }
        currentX += BTN_WIDTH + BTN_SPACING;

        // Next button
        const hasNext = this.currentShipIndex < this.availableShipsList.length - 1;
        let nextBtn = null;
        if (hasNext) {
            nextBtn = UIComponents.drawButton(currentX, y, BTN_WIDTH, BTN_HEIGHT, "NEXT >", [80, 80, 120], [150, 150, 200]);
        } else {
            // Draw disabled next button
            fill(40, 40, 40);
            stroke(60, 60, 60);
            strokeWeight(1);
            rect(currentX, y, BTN_WIDTH, BTN_HEIGHT, 5);
            fill(80);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(14);
            text("NEXT >", currentX + BTN_WIDTH / 2, y + BTN_HEIGHT / 2);
        }
        currentX += BTN_WIDTH + BTN_SPACING;

        // Buy button (only show if not current ship)
        let buyBtn = null;
        if (!isCurrentShip) {
            if (canAfford) {
                buyBtn = UIComponents.drawButton(currentX, y, BTN_WIDTH, BTN_HEIGHT, "BUY", [0, 150, 0], [100, 255, 100]);
            } else {
                // Draw disabled button
                fill(40, 40, 40);
                stroke(80, 80, 80);
                strokeWeight(1);
                rect(currentX, y, BTN_WIDTH, BTN_HEIGHT, 5);
                fill(100);
                noStroke();
                textAlign(CENTER, CENTER);
                textSize(16);
                text("BUY", currentX + BTN_WIDTH / 2, y + BTN_HEIGHT / 2);
            }
            currentX += BTN_WIDTH + BTN_SPACING;
        }

        // Back button
        const backBtn = UIComponents.drawButton(currentX, y, BTN_WIDTH, BTN_HEIGHT, "BACK", [80, 80, 150], [150, 150, 255]);

        return { prev: prevBtn, next: nextBtn, buy: buyBtn, back: backBtn };
    }

    /**
     * Handles ship detail click events.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Player} player - The player object
     * @param {Function} addMessageFn - Function to add UI messages
     * @returns {boolean} - True if handled
     */
    handleShipDetailClick(mx, my, player, addMessageFn) {
        if (!this.selectedShipForDetail) return false;

        const shipData = this.selectedShipForDetail;

        // Buy button
        if (this.shipDetailButtons?.buy && UIComponents.isClickInArea(mx, my, this.shipDetailButtons.buy)) {
            const finalPrice = shipData.price;
            const systemName = (typeof galaxy !== 'undefined' && galaxy?.getCurrentSystem()?.name) || 'Unknown';

            if (finalPrice > 0) {
                // Player needs to pay
                if (player.credits >= finalPrice) {
                    player.spendCredits(finalPrice);
                    player.applyShipDefinition(shipData.shipTypeKey);
                    player.recordShipPurchase(shipData.shipName, finalPrice, systemName);
                    if (typeof saveGame === 'function') saveGame();
                    addMessageFn("You bought a " + shipData.shipName + "!");
                    if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');

                    // Return to docked state
                    const returnState = shipData.returnState || "DOCKED";
                    if (typeof gameStateManager !== 'undefined') gameStateManager.setState(returnState);
                } else {
                    const shortfall = finalPrice - player.credits;
                    addMessageFn(`Not enough credits! Need ${shortfall} more for ${shipData.shipName}.`, [255, 150, 100]);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
            } else {
                // Player gets a refund or even swap
                player.addCredits(-finalPrice);
                player.applyShipDefinition(shipData.shipTypeKey);
                player.recordShipPurchase(shipData.shipName, finalPrice, systemName);
                if (typeof saveGame === 'function') saveGame();

                if (finalPrice < 0) {
                    addMessageFn(`You bought a ${shipData.shipName} and received ${-finalPrice} credits back!`);
                } else {
                    addMessageFn(`You swapped to a ${shipData.shipName} at no additional cost.`);
                }
                if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');

                // Return to docked state
                const returnState = shipData.returnState || "DOCKED";
                if (typeof gameStateManager !== 'undefined') gameStateManager.setState(returnState);
            }
            return true;
        }

        // Previous button - go to previous ship
        if (this.shipDetailButtons?.prev && UIComponents.isClickInArea(mx, my, this.shipDetailButtons.prev)) {
            if (this.currentShipIndex > 0) {
                this.currentShipIndex--;
                this.selectedShipForDetail = this.availableShipsList[this.currentShipIndex];
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
            }
            return true;
        }

        // Next button - go to next ship
        if (this.shipDetailButtons?.next && UIComponents.isClickInArea(mx, my, this.shipDetailButtons.next)) {
            if (this.currentShipIndex < this.availableShipsList.length - 1) {
                this.currentShipIndex++;
                this.selectedShipForDetail = this.availableShipsList[this.currentShipIndex];
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
            }
            return true;
        }

        // Back button
        if (this.shipDetailButtons?.back && UIComponents.isClickInArea(mx, my, this.shipDetailButtons.back)) {
            // Return to shipyard list
            if (typeof gameStateManager !== 'undefined') {
                gameStateManager.setState('VIEWING_SHIPYARD');
            }
            return true;
        }

        return false;
    }

    /**
     * Draws the Weapon Detail Menu.
     * Shows an animated 3D visualization of the weapon with specifications.
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     */
    drawWeaponDetailMenu(player, panelRect, headerHeight) {
        if (!player || !this.selectedWeaponForDetail) return;

        const { x: pX, y: pY, w: pW, h: pH } = panelRect;
        const weaponData = this.selectedWeaponForDetail;
        const weaponDef = weaponData.weaponDef;

        if (!weaponDef) {
            UIComponents.drawCenteredInfo("Weapon data not available", pX + pW / 2, pY + pH / 2);
            this.weaponDetailButtons = { back: UIComponents.drawCenteredBackButton(pX, pY, pW, pH) };
            return;
        }

        // Layout constants
        const LAYOUT = {
            leftWidthRatio: 0.5,
            rightWidthRatio: 0.45,
            leftPadding: 20,
            columnGap: 40,
            topPadding: 10,
            bottomPadding: 60,
            priceBottomOffset: 110,
            buttonsBottomOffset: 80
        };

        // Calculate layout dimensions
        const leftW = pW * LAYOUT.leftWidthRatio;
        const rightW = pW * LAYOUT.rightWidthRatio;
        const leftX = pX + LAYOUT.leftPadding;
        const rightX = pX + leftW + LAYOUT.columnGap;
        const contentY = pY + headerHeight + LAYOUT.topPadding;
        const contentH = pH - headerHeight - LAYOUT.bottomPadding;

        // Render weapon visualization (left side)
        this._drawWeaponVisualizationSection(weaponData, leftX, leftW, contentY, contentH, player);

        // Render specifications (right side)
        this._drawWeaponSpecifications(weaponDef, rightX, rightW, contentY);

        // Render price information (right column)
        const priceY = pY + pH - LAYOUT.priceBottomOffset;
        this._drawWeaponPriceInfo(weaponData, player, rightX, rightW, priceY);

        // Render action buttons (right column, at standard back button height)
        const BTN_HEIGHT = 30;
        const btnY = pY + pH - BTN_HEIGHT - 15;
        this.weaponDetailButtons = this._drawWeaponActionButtons(weaponData.canAfford, rightX, rightW, btnY);

        // Draw slot picker popup overlay if active
        this._drawSlotPickerPopup(player);
    }

    /**
     * Draws the weapon visualization section.
     * @private
     */
    _drawWeaponVisualizationSection(weaponData, leftX, leftW, contentY, contentH, player) {
        const visualCenterX = leftX + leftW / 2;
        const visualCenterY = contentY + contentH / 2;
        const visualSize = Math.min(leftW, contentH) * 1.2;

        // Weapon name at top of visual area
        fill(180, 220, 255);
        noStroke();
        textSize(24);
        textAlign(CENTER, TOP);
        text(weaponData.weaponDef.name, visualCenterX, contentY + 10);

        // Draw animated weapon visualization with player's ship and panel bounds for clipping
        UIComponents.drawWeaponVisualization(weaponData.weaponDef, visualCenterX, visualCenterY, visualSize, player, leftX, leftW);
    }

    /**
     * Draws the weapon specifications section.
     * @private
     */
    _drawWeaponSpecifications(weaponDef, specX, rightW, contentY) {
        let specY = contentY + 10;
        const lineH = 28;

        // Weapon description
        fill(200, 200, 255);
        textSize(16);
        textAlign(LEFT, TOP);
        const descriptionText = weaponDef.desc || "No description available.";
        const maxDescWidth = rightW - 60;
        text(descriptionText, specX, specY, maxDescWidth);

        // Calculate description height
        const leading = textLeading() || 16 * 1.25;
        const avgCharWidth = textWidth('M') * 0.6;
        const charsPerLine = Math.floor(maxDescWidth / avgCharWidth);
        const estimatedLines = Math.ceil(descriptionText.length / charsPerLine);
        const descriptionHeight = estimatedLines * leading + 10;
        specY += descriptionHeight + 15;

        // Stats header
        fill(255, 200, 100);
        textSize(20);
        text("Specifications", specX, specY);
        specY += lineH * 1.2;

        // Draw weapon stats
        this._drawWeaponStats(weaponDef, specX, specY, lineH);
    }

    /**
     * Draws weapon statistics.
     * @private
     */
    _drawWeaponStats(weaponDef, specX, specY, lineH) {
        textSize(16);
        textAlign(LEFT, TOP);
        fill(220);

        let y = specY;

        // Damage (or damageReduction for barriers)
        if (weaponDef.type === 'barrier') {
            const reduction = Math.floor((weaponDef.damageReduction || 0) * 100);
            text(`Damage Reduction: ${reduction}%`, specX, y);
        } else {
            text(`Damage: ${weaponDef.damage || 0}`, specX, y);
        }
        y += lineH;

        // Fire Rate
        text(`Fire Rate: ${weaponDef.fireRate || 0}s`, specX, y);
        y += lineH;

        // Special properties based on weapon type
        const type = weaponDef.type;
        if (type === 'beam') {
            text(`Max Heat: ${weaponDef.maxHeat || 1.0}`, specX, y);
            y += lineH;
            text(`Heat Per Shot: ${weaponDef.heatPerShot || 0}`, specX, y);
            y += lineH;
            text(`Heat Dissipation: ${weaponDef.heatDissipation || 0}`, specX, y);
            y += lineH;
        } else if (type === 'missile') {
            text(`Speed: ${weaponDef.speed || 0}`, specX, y);
            y += lineH;
            text(`Turn Rate: ${weaponDef.turnRate || 0}`, specX, y);
            y += lineH;
            text(`Missile Hull: ${weaponDef.missileHull || 0}`, specX, y);
            y += lineH;
            text(`Lifespan: ${weaponDef.lifespan || 0} frames`, specX, y);
            y += lineH;
        } else if (type === 'force') {
            text(`Max Radius: ${weaponDef.maxRadius || 0}`, specX, y);
            y += lineH;
        } else if (type === 'tangle' || type === 'harpoon') {
            if (weaponDef.tangleDuration) {
                text(`Duration: ${weaponDef.tangleDuration}s`, specX, y);
                y += lineH;
            }
            if (weaponDef.dragMultiplier) {
                text(`Drag Multiplier: ${weaponDef.dragMultiplier}x`, specX, y);
                y += lineH;
            }
        } else if (type === 'mine') {
            text(`Blast Radius: ${weaponDef.blastRadius || 0}`, specX, y);
            y += lineH;
            text(`Trigger Radius: ${weaponDef.triggerRadius || 0}`, specX, y);
            y += lineH;
            text(`Mine Health: ${weaponDef.mineHealth || 0}`, specX, y);
            y += lineH;
        } else if (type === 'barrier') {
            text(`Duration: ${weaponDef.duration || 0}s`, specX, y);
            y += lineH;
        }
    }

    /**
     * Draws weapon price information.
     * @private
     */
    _drawWeaponPriceInfo(weaponData, player, x, rightW, y) {
        const price = weaponData.price;
        const canAfford = weaponData.canAfford;

        // Price label
        fill(180, 220, 255);
        noStroke();
        textSize(15);
        textAlign(LEFT, TOP);
        text("Price:", x, y);

        // Price value with color coding
        textSize(20);
        fill(canAfford ? [100, 255, 100] : [255, 150, 150]);
        text(`${price} cr`, x, y + 20);

        // Affordability warning
        if (!canAfford) {
            fill(255, 150, 150);
            textSize(12);
            textAlign(CENTER, TOP);
            const shortfall = price - player.credits;
            text(`Need ${shortfall} more cr`, x + rightW / 2, y + 22);
        }
    }

    /**
     * Draws weapon action buttons (Prev/Next/Buy/Back).
     * @private
     */
    _drawWeaponActionButtons(canAfford, columnX, columnW, y) {
        const BTN_WIDTH = 70;
        const BTN_HEIGHT = 30;
        const BTN_SPACING = 8;

        let currentX = columnX;

        // Previous button
        const hasPrev = this.currentWeaponIndex > 0;
        let prevBtn = null;
        if (hasPrev) {
            prevBtn = UIComponents.drawButton(currentX, y, BTN_WIDTH, BTN_HEIGHT, "< PREV", [80, 80, 120], [150, 150, 200]);
        } else {
            // Draw disabled prev button
            fill(40, 40, 40);
            stroke(60, 60, 60);
            strokeWeight(1);
            rect(currentX, y, BTN_WIDTH, BTN_HEIGHT, 5);
            fill(80);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(14);
            text("< PREV", currentX + BTN_WIDTH / 2, y + BTN_HEIGHT / 2);
        }
        currentX += BTN_WIDTH + BTN_SPACING;

        // Next button
        const hasNext = this.currentWeaponIndex < this.availableWeaponsList.length - 1;
        let nextBtn = null;
        if (hasNext) {
            nextBtn = UIComponents.drawButton(currentX, y, BTN_WIDTH, BTN_HEIGHT, "NEXT >", [80, 80, 120], [150, 150, 200]);
        } else {
            // Draw disabled next button
            fill(40, 40, 40);
            stroke(60, 60, 60);
            strokeWeight(1);
            rect(currentX, y, BTN_WIDTH, BTN_HEIGHT, 5);
            fill(80);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(14);
            text("NEXT >", currentX + BTN_WIDTH / 2, y + BTN_HEIGHT / 2);
        }
        currentX += BTN_WIDTH + BTN_SPACING;

        // Buy button
        let buyBtn = null;
        if (canAfford) {
            buyBtn = UIComponents.drawButton(currentX, y, BTN_WIDTH, BTN_HEIGHT, "BUY", [0, 150, 0], [100, 255, 100]);
        } else {
            // Draw disabled button
            fill(40, 40, 40);
            stroke(80, 80, 80);
            strokeWeight(1);
            rect(currentX, y, BTN_WIDTH, BTN_HEIGHT, 5);
            fill(100);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(16);
            text("BUY", currentX + BTN_WIDTH / 2, y + BTN_HEIGHT / 2);
        }
        currentX += BTN_WIDTH + BTN_SPACING;

        // Back button
        const backBtn = UIComponents.drawButton(currentX, y, BTN_WIDTH, BTN_HEIGHT, "BACK", [80, 80, 150], [150, 150, 255]);

        return { prev: prevBtn, next: nextBtn, buy: buyBtn, back: backBtn };
    }

    /**
     * Draws the slot picker popup overlay.
     * @param {Player} player - The player object
     * @private
     */
    _drawSlotPickerPopup(player) {
        if (!this.showingSlotPicker || !this.pendingWeaponPurchase) return;

        // Semi-transparent overlay
        fill(0, 0, 0, 180);
        noStroke();
        rect(0, 0, width, height);

        // Popup panel
        const popupW = min(500, width * 0.8);
        const popupH = 300;
        const popupX = (width - popupW) / 2;
        const popupY = (height - popupH) / 2;

        fill(30, 30, 50);
        stroke(100, 150, 200);
        strokeWeight(2);
        rect(popupX, popupY, popupW, popupH, 10);

        // Title
        fill(200, 220, 255);
        noStroke();
        textAlign(CENTER, TOP);
        textSize(22);
        text("Select Weapon Slot", popupX + popupW / 2, popupY + 15);

        // Get ship's weapon slots
        const shipDef = typeof SHIP_DEFINITIONS !== 'undefined' ? SHIP_DEFINITIONS[player.shipTypeName] : null;
        const availableSlots = shipDef?.armament?.length || 1;

        // Draw slot buttons
        this.slotPickerButtons = [];
        const slotBtnW = min(100, (popupW - 60) / availableSlots);
        const slotBtnH = 80;
        const slotStartX = popupX + (popupW - (slotBtnW * availableSlots + 10 * (availableSlots - 1))) / 2;
        const slotY = popupY + 70;

        for (let i = 0; i < availableSlots; i++) {
            const slotX = slotStartX + i * (slotBtnW + 10);
            const currentWeapon = (i < player.weapons.length) ? player.weapons[i] : null;

            // Button background
            fill(50, 60, 90);
            stroke(120, 140, 200);
            strokeWeight(2);
            rect(slotX, slotY, slotBtnW, slotBtnH, 6);

            // Slot number
            noStroke();
            fill(180, 200, 255);
            textAlign(CENTER, TOP);
            textSize(24);
            text(`Slot ${i + 1}`, slotX + slotBtnW / 2, slotY + 8);

            // Current weapon name
            textSize(12);
            fill(150, 170, 200);
            const weaponText = currentWeapon?.name || "Empty";
            text(weaponText, slotX + slotBtnW / 2, slotY + 40);

            // Will replace warning
            if (currentWeapon) {
                fill(255, 200, 100);
                textSize(10);
                text("(replaces)", slotX + slotBtnW / 2, slotY + 55);
            }

            // Store button area
            this.slotPickerButtons.push({
                x: slotX, y: slotY, w: slotBtnW, h: slotBtnH,
                slotIndex: i
            });
        }

        // Cancel button
        const cancelBtnW = 120;
        const cancelBtnH = 35;
        const cancelBtnX = popupX + (popupW - cancelBtnW) / 2;
        const cancelBtnY = popupY + popupH - cancelBtnH - 20;

        const cancelBtn = UIComponents.drawButton(
            cancelBtnX, cancelBtnY, cancelBtnW, cancelBtnH,
            "CANCEL", [80, 80, 100], [150, 150, 180]
        );
        this.slotPickerButtons.push({
            ...cancelBtn,
            action: "CANCEL"
        });
    }

    /**
     * Handles weapon detail click events.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Player} player - The player object
     * @param {Function} addMessageFn - Function to add UI messages
     * @returns {boolean} - True if handled
     */
    handleWeaponDetailClick(mx, my, player, addMessageFn) {
        // Handle slot picker popup clicks first (if showing)
        if (this.showingSlotPicker && this.slotPickerButtons.length > 0) {
            for (const btn of this.slotPickerButtons) {
                if (!UIComponents.isClickInArea(mx, my, btn)) continue;

                // Cancel button
                if (btn.action === "CANCEL") {
                    this.showingSlotPicker = false;
                    this.pendingWeaponPurchase = null;
                    if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                    return true;
                }

                // Slot selection button
                if (typeof btn.slotIndex === 'number' && this.pendingWeaponPurchase) {
                    const weaponDef = this.pendingWeaponPurchase.weaponDef;
                    const price = this.pendingWeaponPurchase.price;
                    const slotIndex = btn.slotIndex;
                    const systemName = (typeof galaxy !== 'undefined' && galaxy?.getCurrentSystem()?.name) || 'Unknown';

                    // Complete the purchase
                    player.spendCredits(price);
                    player.installWeaponToSlot(weaponDef, slotIndex);

                    player.recordWeaponUpgrade(
                        weaponDef.name,
                        weaponDef.type,
                        price,
                        slotIndex,
                        systemName
                    );

                    if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                    addMessageFn(`Purchased ${weaponDef.name} and installed in Slot ${slotIndex + 1}!`, [100, 255, 100]);
                    if (typeof saveGame === 'function') saveGame();

                    // Close popup and return to upgrades menu
                    this.showingSlotPicker = false;
                    this.pendingWeaponPurchase = null;
                    if (typeof gameStateManager !== 'undefined') {
                        gameStateManager.setState('VIEWING_UPGRADES');
                    }
                    return true;
                }
            }
            return true; // Consume click if popup is showing
        }

        if (!this.selectedWeaponForDetail) return false;

        const weaponData = this.selectedWeaponForDetail;

        // Buy button - show slot picker popup
        if (this.weaponDetailButtons?.buy && UIComponents.isClickInArea(mx, my, this.weaponDetailButtons.buy)) {
            const price = weaponData.price;

            if (player.credits >= price) {
                // Store weapon data and show slot picker
                this.pendingWeaponPurchase = {
                    weaponDef: weaponData.weaponDef,
                    price: price
                };
                this.showingSlotPicker = true;
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
            } else {
                addMessageFn(`Not enough credits! ${weaponData.weaponDef.name} costs ${price} cr.`, [255, 150, 150]);
                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            }
            return true;
        }

        // Previous button - go to previous weapon
        if (this.weaponDetailButtons?.prev && UIComponents.isClickInArea(mx, my, this.weaponDetailButtons.prev)) {
            if (this.currentWeaponIndex > 0) {
                this.currentWeaponIndex--;
                this.selectedWeaponForDetail = this.availableWeaponsList[this.currentWeaponIndex];
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
            }
            return true;
        }

        // Next button - go to next weapon
        if (this.weaponDetailButtons?.next && UIComponents.isClickInArea(mx, my, this.weaponDetailButtons.next)) {
            if (this.currentWeaponIndex < this.availableWeaponsList.length - 1) {
                this.currentWeaponIndex++;
                this.selectedWeaponForDetail = this.availableWeaponsList[this.currentWeaponIndex];
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
            }
            return true;
        }

        // Back button
        if (this.weaponDetailButtons?.back && UIComponents.isClickInArea(mx, my, this.weaponDetailButtons.back)) {
            // Clear popup state if showing
            if (this.showingSlotPicker) {
                this.showingSlotPicker = false;
                this.pendingWeaponPurchase = null;
            }

            // Return to upgrades menu
            if (typeof gameStateManager !== 'undefined') {
                gameStateManager.setState('VIEWING_UPGRADES');
            }
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
        // Check upgrade list items
        for (let i = 0; i < this.upgradeListAreas.length; i++) {
            const area = this.upgradeListAreas[i];
            if (!UIComponents.isClickInArea(mx, my, area)) continue;

            // Build full navigation list from ALL filtered weapons (not just visible)
            // This ensures arrow key navigation goes through the complete list
            this.availableWeaponsList = this._fullFilteredWeapons.map(weapon => ({
                weaponDef: weapon,
                price: weapon.price,
                canAfford: player.credits >= weapon.price
            }));

            // Find the correct index in the FULL list based on the clicked item
            const clickedWeapon = area.upgrade;
            this.currentWeaponIndex = this._fullFilteredWeapons.findIndex(w => w.name === clickedWeapon.name);

            // Store selected weapon data for the detail screen
            this.selectedWeaponForDetail = this.availableWeaponsList[this.currentWeaponIndex];

            // Navigate to weapon detail screen
            if (typeof gameStateManager !== 'undefined') {
                gameStateManager.setState('VIEWING_WEAPON_DETAIL');
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
                        stationForStorage.storage.push({ name: btn.commodity, quantity: item.quantity });
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
