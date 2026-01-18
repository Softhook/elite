// ****** uiStationMenus.js ******
// Station menu screens: Repairs, Police, Shipyard, Upgrades, Protection, Storage, Record.
// This file must be loaded BEFORE uiManager.js
// Note: STATION_TEXT_SIZE is defined in uiComponents.js

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
        this.newsSourceFilter = 'ALL';
    }

    /**
     * Draws the News Menu (The Galactic Echo).
     * Compact 2-line layout: Headline + Body text
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     */
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
        const L = STATION_LAYOUT; // Shorthand
        const contentY = pY + headerHeight + L.CONTENT_START;
        const contentH = pH - headerHeight - L.BACK_BUTTON_MARGIN - 10;

        // Get news items
        let newsItems = (typeof GameGlobals !== 'undefined' && GameGlobals.newsManager)
            ? GameGlobals.newsManager.getNewsItems()
            : [];

        // Apply source filter
        if (this.newsSourceFilter !== 'ALL') {
            newsItems = newsItems.filter(item => item.source === this.newsSourceFilter);
        }

        // Draw Filter Buttons at the top
        const filterY = contentY;
        const filterSources = [
            { id: 'ALL', label: 'All Sources' },
            { id: 'The Core Echo', label: 'The Core Echo' },
            { id: 'Freedom', label: 'Freedom' },
            { id: 'The Freight Log', label: 'The Freight Log' }
        ];

        const filterBtnW = (pW - L.CONTENT_PADDING * 2 - L.BTN_SPACING * 3) / 4;
        const filterBtnH = L.BTN_HEIGHT_SMALL + 5;

        for (let i = 0; i < filterSources.length; i++) {
            const src = filterSources[i];
            const btnX = pX + L.CONTENT_PADDING + i * (filterBtnW + L.BTN_SPACING);
            const isActive = this.newsSourceFilter === src.id;

            // Highlight active button
            const fillCol = isActive ? [100, 150, 255] : [40, 40, 60];

            const btnArea = UIComponents.drawButton(
                btnX, filterY, filterBtnW, filterBtnH,
                src.label, fillCol, [120, 180, 255],
                3, { action: 'FILTER', source: src.id, textSize: STATION_TEXT_SIZE.SMALL }
            );
            this.newsButtonAreas.push(btnArea);
        }

        const listStartY = filterY + filterBtnH + L.BTN_SPACING;
        const listContentH = contentH - (filterBtnH + L.BTN_SPACING);
        const availableHeight = listContentH;

        if (newsItems.length === 0) {
            UIComponents.setTextStyle({ fill: 180, size: STATION_TEXT_SIZE.BODY, align: [CENTER, CENTER] });
            text("No news reports available for this source.", pX + pW / 2, listStartY + availableHeight / 2);
        } else {
            // Compact 2-line layout: much smaller item height
            const itemHeight = 60; // Standardized height
            const visibleItems = Math.floor(availableHeight / itemHeight);
            const totalItems = newsItems.length;

            this.newsScrollMax = Math.max(0, totalItems - visibleItems);
            this.newsScrollOffset = constrain(this.newsScrollOffset, 0, this.newsScrollMax);

            const startIndex = this.newsScrollOffset;
            const endIndex = Math.min(startIndex + visibleItems, totalItems);

            for (let i = startIndex; i < endIndex; i++) {
                const item = newsItems[i];
                const itemY = listStartY + (i - startIndex) * itemHeight;

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

                // Draw standardized row
                const rowArea = UIComponents.drawListRow({
                    x: pX + L.CONTENT_PADDING,
                    y: itemY,
                    w: pW - L.CONTENT_PADDING * 2,
                    h: itemHeight,
                    index: i - startIndex, // Alternating colors based on view index
                    isHighlighted: false
                });

                // Custom border overlay for categories
                if (borderColor) {
                    noFill();
                    stroke(borderColor);
                    strokeWeight(1);
                    rect(rowArea.x, rowArea.y, rowArea.w, rowArea.h, 5);
                }

                // "BREAKING" badge for high priority player actions
                let headlineStartX = pX + L.CONTENT_PADDING + 10;
                if (priority >= 4) {
                    // Draw breaking badge
                    fill(180, 40, 40);
                    noStroke();
                    rect(headlineStartX, itemY + 8, 80, 20, 3);
                    UIComponents.setTextStyle({ fill: 255, size: STATION_TEXT_SIZE.SMALL, align: [CENTER, CENTER] });
                    textStyle(BOLD);
                    text("BREAKING", headlineStartX + 40, itemY + 18);
                    textStyle(NORMAL);
                    headlineStartX += 90;
                }

                // Headline (line 1)
                const sourceColor = item.sourceColor || [200, 200, 200];

                // Check for icon token at start of headline
                const headline = item.headline || item.title || "News Update";
                let displayHeadline = headline;
                let iconOffset = 0;

                // Detect and draw icon if present
                if (typeof NewsIcons !== 'undefined') {
                    const iconType = NewsIcons.getIconToken(headline);
                    if (iconType) {
                        // Draw the icon
                        const iconSize = 16;
                        NewsIcons.draw(iconType, headlineStartX + iconSize / 2, itemY + 10 + iconSize / 2, iconSize);
                        iconOffset = iconSize + 6; // Icon width + spacing
                        // Remove the token from display text
                        displayHeadline = NewsIcons.stripIconToken(headline);
                    }
                }

                // Truncate headline
                const maxHeadlineWidth = pW - (headlineStartX - pX) - 130 - iconOffset;
                if (textWidth(displayHeadline) > maxHeadlineWidth) {
                    // simple truncation estimation
                    // ... implementation handled by p5 usually but doing manual for safety
                }

                // Use drawListRowText structure or manual for complex layout?
                // Manual is better here due to badges and icons, but using standard styles.

                // Headline
                UIComponents.setTextStyle({ fill: [255, 230, 120], size: STATION_TEXT_SIZE.HEADER, align: [LEFT, TOP], noStroke: true });
                textStyle(BOLD);
                text(displayHeadline, headlineStartX + iconOffset, itemY + 8);
                textStyle(NORMAL);

                // Source
                UIComponents.setTextStyle({ fill: sourceColor, size: STATION_TEXT_SIZE.BODY, align: [RIGHT, TOP] });
                text(item.source || "Echo", pX + pW - L.CONTENT_PADDING - 10, itemY + 8);

                // Body text (line 2)
                const bodyText = item.body || "";
                UIComponents.setTextStyle({ fill: UIComponents.STATION_COLORS.TEXT_SECONDARY, size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
                text(bodyText, pX + L.CONTENT_PADDING + 10, itemY + 32);

                // Time ago
                const ageMs = Date.now() - (item.timestamp || Date.now());
                const ageMins = Math.floor(ageMs / 60000);
                let ageStr;
                if (ageMins < 1) ageStr = "just now";
                else if (ageMins < 60) ageStr = `${ageMins}m ago`;
                else if (ageMins < 1440) ageStr = `${Math.floor(ageMins / 60)}h ago`;
                else ageStr = `${Math.floor(ageMins / 1440)}d ago`;

                UIComponents.setTextStyle({ fill: [100], size: STATION_TEXT_SIZE.HELPER, align: [RIGHT, TOP] });
                text(ageStr, pX + pW - L.CONTENT_PADDING - 10, itemY + 34);
            }

            // Draw scrollbar if needed
            if (this.newsScrollMax > 0) {
                this.newsScrollbarArea = UIComponents.drawScrollbar(
                    pX + pW, listStartY, visibleItems * itemHeight,
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
        const L = STATION_LAYOUT; // Shorthand

        // Screen description
        const contentY = UIComponents.drawScreenDescription(
            `Hull Integrity: ${floor(player.hull)} / ${player.maxHull}`,
            pX, pY, pW, headerHeight,
            { color: [180, 220, 255], size: STATION_TEXT_SIZE.HEADER }
        );

        // Calculate repair costs
        let missing = player.maxHull - player.hull;
        let fullCost = Math.floor(missing * 10);
        let halfRepair = Math.min(missing, Math.ceil(player.maxHull / 2));
        let halfCost = Math.floor(halfRepair * 7);

        // Standardized list layout
        const rowH = 50;
        let currentY = contentY;

        // 1. Full Repair Option
        const fullRow = UIComponents.drawListRow({
            x: pX + L.CONTENT_PADDING,
            y: currentY,
            w: pW - L.CONTENT_PADDING * 2,
            h: rowH,
            index: 0,
            isHighlighted: true,
            canAfford: player.credits >= fullCost
        });

        UIComponents.drawListRowText({
            leftText: "Full Repair",
            subText: "Restore hull to 100% integrity",
            rightText: `${fullCost} cr`,
            rowX: fullRow.x,
            rowY: fullRow.y,
            rowW: fullRow.w - 100, // Leave space for button
            rowH: fullRow.h,
            leftColor: [200, 255, 200]
        });

        const fullBtn = UIComponents.drawButton(
            fullRow.x + fullRow.w - 90, fullRow.y + (fullRow.h - L.BTN_HEIGHT_SMALL) / 2,
            80, L.BTN_HEIGHT_SMALL,
            "REPAIR",
            [0, 100, 0], [0, 180, 0], // Green for repair
            3, { textSize: STATION_TEXT_SIZE.SMALL }
        );

        // Map to what handleRepairClick expects
        const fullButtonArea = { ...fullBtn, action: "REPAIR_FULL", cost: fullCost };
        currentY += rowH + L.BTN_SPACING;

        // 2. Partial Repair Option
        const halfRow = UIComponents.drawListRow({
            x: pX + L.CONTENT_PADDING,
            y: currentY,
            w: pW - L.CONTENT_PADDING * 2,
            h: rowH,
            index: 1,
            isHighlighted: false,
            canAfford: player.credits >= halfCost
        });

        UIComponents.drawListRowText({
            leftText: "50% Repair",
            subText: "Emergency patch for critical systems",
            rightText: `${halfCost} cr`,
            rowX: halfRow.x,
            rowY: halfRow.y,
            rowW: halfRow.w - 100,
            rowH: halfRow.h,
            leftColor: [200, 200, 100]
        });

        const halfBtn = UIComponents.drawButton(
            halfRow.x + halfRow.w - 90, halfRow.y + (halfRow.h - L.BTN_HEIGHT_SMALL) / 2,
            80, L.BTN_HEIGHT_SMALL,
            "REPAIR",
            [120, 120, 0], [180, 180, 0], // Yellowish for partial
            3, { textSize: STATION_TEXT_SIZE.SMALL }
        );

        const halfButtonArea = { ...halfBtn, action: "REPAIR_HALF", cost: halfCost };
        currentY += rowH + L.SECTION_GAP;

        // Bodyguard repair section
        const bodyguardInfo = player.getDamagedBodyguardsInfo ? player.getDamagedBodyguardsInfo() : { count: 0, totalCost: 0 };
        let bodyguardsButtonArea = {};

        if (bodyguardInfo.count > 0) {
            currentY = UIComponents.drawSectionHeader("Fleet Repairs", pX + L.CONTENT_PADDING, currentY);

            const bgRow = UIComponents.drawListRow({
                x: pX + L.CONTENT_PADDING,
                y: currentY,
                w: pW - L.CONTENT_PADDING * 2,
                h: rowH,
                index: 2,
                isHighlighted: true,
                canAfford: player.credits >= bodyguardInfo.totalCost
            });

            UIComponents.drawListRowText({
                leftText: `Repair ${bodyguardInfo.count} Escort${bodyguardInfo.count > 1 ? 's' : ''}`,
                subText: "Full repairs for all active wingmen",
                rightText: `${bodyguardInfo.totalCost} cr`,
                rowX: bgRow.x,
                rowY: bgRow.y,
                rowW: bgRow.w - 100,
                rowH: bgRow.h,
                leftColor: [100, 200, 255]
            });

            const bgBtn = UIComponents.drawButton(
                bgRow.x + bgRow.w - 90, bgRow.y + (bgRow.h - L.BTN_HEIGHT_SMALL) / 2,
                80, L.BTN_HEIGHT_SMALL,
                "REPAIR",
                [0, 80, 120], [0, 120, 180], // Blue for fleet
                3, { textSize: STATION_TEXT_SIZE.SMALL }
            );

            bodyguardsButtonArea = { ...bgBtn, action: "REPAIR_BODYGUARDS", cost: bodyguardInfo.totalCost };
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
        const L = STATION_LAYOUT; // Shorthand
        const isAnarchySystem = typeof system?.securityLevel === 'string' && system.securityLevel.toLowerCase() === 'anarchy';

        if (isAnarchySystem) {
            const contentY = UIComponents.drawScreenDescription(
                "This anarchy system has no formal police presence.",
                pX, pY, pW, headerHeight
            );
            UIComponents.setTextStyle({ fill: [180, 200, 255], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
            text("Local disputes are settled without official intervention.", pX + pW / 2, contentY);

            this.policeButtonAreas.push(UIComponents.drawCenteredBackButton(pX, pY, pW, pH, { action: 'back' }));
            uiManager.policeButtonAreas = this.policeButtonAreas;
            pop();
            return;
        }

        // Legal status display
        const isWanted = system?.isPlayerWanted();
        const statusText = isWanted ? "WANTED" : "CLEAN";
        const statusColor = isWanted ? [255, 50, 50] : [50, 255, 50];

        const statusDesc = `Legal Status in ${system?.name || 'Unknown'} System:`;
        const contentY = UIComponents.drawScreenDescription(statusDesc, pX, pY, pW, headerHeight);

        UIComponents.setTextStyle({ fill: statusColor, size: STATION_TEXT_SIZE.HEADER, align: [CENTER, TOP] });
        text(statusText, pX + pW / 2, contentY);

        let infoY = contentY + STATION_TEXT_SIZE.HEADER + L.BTN_SPACING;

        // Display police bounty information
        if (player.isPolice) {
            UIComponents.setTextStyle({ fill: [100, 255, 100], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
            text("Active Bounty: 1,000 cr per Pirate killed, 1,000 cr per Alien killed", pX + pW / 2, infoY);
            infoY += STATION_TEXT_SIZE.BODY + L.BTN_SPACING;
        }

        // Show police faction kill progress
        try {
            const pk = player.getFactionKillsProgress && player.getFactionKillsProgress('POLICE');
            if (pk) {
                UIComponents.setTextStyle({ fill: [200], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
                if (pk.nextThreshold) {
                    text(`Police Kills: ${pk.kills} — ${pk.killsToNext} to ${pk.nextRank}`, pX + pW / 2, infoY);
                } else {
                    text(`Police Kills: ${pk.kills} — Max Rank`, pX + pW / 2, infoY);
                }
                infoY += STATION_TEXT_SIZE.BODY + L.BTN_SPACING;
            }
        } catch (e) { /* fail silently */ }

        let fineAmount = 300;
        if (system?.securityLevel === 'High') fineAmount = 1000;
        else if (system?.securityLevel === 'Medium') fineAmount = 500;
        if (player.hasBeenPolice) {
            fineAmount *= 3;
            UIComponents.setTextStyle({ fill: [255, 200, 100], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
            text("Fines tripled for former police officer", pX + pW / 2, infoY);
            infoY += STATION_TEXT_SIZE.BODY + L.BTN_SPACING;
        }

        // Buttons - using standardized sizing and rows
        const rowH = 50;
        let btnY = infoY + L.SECTION_GAP;

        if (isWanted) {
            const canAfford = player.credits >= fineAmount;
            const fineRow = UIComponents.drawListRow({
                x: pX + L.CONTENT_PADDING,
                y: btnY,
                w: pW - L.CONTENT_PADDING * 2,
                h: rowH,
                index: 0,
                isHighlighted: true,
                canAfford: canAfford
            });

            UIComponents.drawListRowText({
                leftText: `Pay Fine (${fineAmount} cr)`,
                subText: "Clear WANTED status and restore legal standing",
                rowX: fineRow.x,
                rowY: fineRow.y,
                rowW: fineRow.w - 100, // Leave room for button
                rowH: fineRow.h,
                leftColor: canAfford ? [100, 255, 100] : [255, 100, 100]
            });

            if (canAfford) {
                const fineBtnRender = UIComponents.drawButton(
                    fineRow.x + fineRow.w - 90, fineRow.y + (fineRow.h - L.BTN_HEIGHT_SMALL) / 2,
                    80, L.BTN_HEIGHT_SMALL,
                    "PAY",
                    [0, 100, 0], [0, 180, 0],
                    3, { textSize: STATION_TEXT_SIZE.SMALL }
                );
                // Map to button action expected by handler
                const fineBtn = { ...fineBtnRender, action: 'pay_fine', amount: fineAmount };
                this.policeButtonAreas.push(fineBtn);
            } else {
                UIComponents.setTextStyle({ fill: [255, 100, 100], size: STATION_TEXT_SIZE.SMALL, align: [RIGHT, CENTER] });
                text("INSUFFICIENT FUNDS", fineRow.x + fineRow.w - L.ROW_PADDING, fineRow.y + fineRow.h / 2);
            }

            btnY += rowH + L.BTN_SPACING;
        }

        if (!player.isPolice) {
            const joinRow = UIComponents.drawListRow({
                x: pX + L.CONTENT_PADDING,
                y: btnY,
                w: pW - L.CONTENT_PADDING * 2,
                h: rowH,
                index: 1,
                isHighlighted: true
            });

            UIComponents.drawListRowText({
                leftText: "Join Police Force",
                subText: "Enforce the law and earn bounties",
                rowX: joinRow.x,
                rowY: joinRow.y,
                rowW: joinRow.w - 100,
                rowH: joinRow.h,
                leftColor: [100, 150, 255]
            });

            const joinBtnRender = UIComponents.drawButton(
                joinRow.x + joinRow.w - 90, joinRow.y + (joinRow.h - L.BTN_HEIGHT_SMALL) / 2,
                80, L.BTN_HEIGHT_SMALL,
                "JOIN",
                [0, 50, 150], [0, 80, 200],
                3, { textSize: STATION_TEXT_SIZE.SMALL }
            );

            const joinBtn = { ...joinBtnRender, action: 'join_police' };
            this.policeButtonAreas.push(joinBtn);
        } else {
            UIComponents.setTextStyle({ fill: [100, 255, 100], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
            text("You are a member of the Police Force", pX + pW / 2, btnY + rowH / 2);
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
        } else if (economyType === "Post Human") {
            return techLevel >= 5
                ? `Welcome to ${name}. We offer the most advanced transhumanist vessels—clean, efficient, and beyond traditional limits.`
                : `${name} Transhumanist Works, tech ${techLevel}. Advanced engineering for those seeking the next step in evolution.`;
        } else if (economyType === "Offworld") {
            return techLevel >= 5
                ? `Welcome to ${name}. We specialize in deep-space habitats and orbital-optimized craft—built for life amongst the stars.`
                : `${name} Orbital Shipyards, tech ${techLevel}. Reliable offworld vessels for pioneers and settlers.`;
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
        } else if (economyType === "Post Human") {
            return techLevel >= 5
                ? `${name} Synthesis Lab. Our enhancements integrate seamlessly with both ship and pilot.`
                : `${name} Augmented Systems, tech ${techLevel}. High-precision components for advanced pilots.`;
        } else if (economyType === "Offworld") {
            return techLevel >= 5
                ? `${name} Orbital Outfitting. Premium components designed for the rigors of deep space.`
                : `${name} Offworld Supplies, tech ${techLevel}. Rugged components for the adventurous explorer.`;
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
            // Never show police, guard, or bounty hunter ships
            if (shipData.aiRoles && shipData.aiRoles.includes("POLICE")) return false;
            if (shipData.aiRoles && shipData.aiRoles.includes("GUARD")) return false;
            if (shipData.aiRoles && shipData.aiRoles.includes("BOUNTY_HUNTER")) return false;

            // Faction-specific ship filtering (using faction property)
            // Imperial ships only in Imperial systems
            if (shipData.faction === "IMPERIAL" && !isImperialSystem) return false;
            // Separatist ships only in Separatist systems
            if (shipData.faction === "SEPARATIST" && !isSeparatistSystem) return false;
            // Military ships only in Military systems
            if (shipData.faction === "MILITARY" && !isMillitarySystem) return false;

            // Tech level filtering
            const shipTechLevel = shipData.techLevel || Math.min(5, Math.ceil(shipData.price / 40000));
            return shipTechLevel <= systemTechLevel;
        }) : [];

        // Store full filtered list for navigation (not just visible items)
        this._fullFilteredShips = availableShips;
        const L = STATION_LAYOUT; // Shorthand

        // Draw welcome text using standardized description
        const systemName = system?.name || "Unknown";
        const welcomeText = this._getShipyardWelcomeText(systemTechLevel, economyType, systemName);
        const contentY = UIComponents.drawScreenDescription(welcomeText, pX, pY, pW, headerHeight, { color: [255, 230, 150] });

        // Show trade-in info
        UIComponents.setTextStyle({ fill: [180, 220, 255], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
        text(`Your ship: ${currentShipType} (Trade-in: ${currentShipValue} cr)`, pX + L.CONTENT_PADDING, contentY);

        // List ships - using standardized row height
        const rowH = L.ROW_HEIGHT;
        const startY = contentY + STATION_TEXT_SIZE.BODY + L.BTN_SPACING;
        const visibleRows = floor((pH - (startY - pY) - L.BACK_BUTTON_MARGIN) / rowH);
        let totalRows = availableShips.length;
        let scrollAreaH = visibleRows * rowH;
        this.shipyardScrollMax = max(0, totalRows - visibleRows);
        this.shipyardScrollOffset = constrain(this.shipyardScrollOffset, 0, this.shipyardScrollMax);

        // Draw visible ships
        let firstRow = this.shipyardScrollOffset;
        let lastRow = min(firstRow + visibleRows, totalRows);

        for (let i = firstRow; i < lastRow; i++) {
            let [shipKey, ship] = availableShips[i];
            let y = startY + (i - firstRow) * rowH;

            const isCurrentShip = ship.name === currentShipType ||
                (currentShipDef && ship.name === currentShipDef.name);

            const originalPrice = ship.price;
            const finalPrice = originalPrice - currentShipValue;
            const canAfford = finalPrice <= 0 || player.credits >= finalPrice;

            // Draw row background
            // const canAfford = finalPrice <= 0 || player.credits >= finalPrice; // Already declared above
            const rowArea = UIComponents.drawListRow({
                x: pX + L.CONTENT_PADDING,
                y: y,
                w: pW - L.CONTENT_PADDING * 2,
                h: rowH,
                index: i,
                isCurrent: isCurrentShip,
                canAfford: canAfford
            });

            // Prepare text
            let rightText = "";
            let rightColor = null;

            if (isCurrentShip) {
                rightText = "CURRENT SHIP";
                rightColor = UIComponents.STATION_COLORS.TEXT_SECONDARY;
            } else {
                if (finalPrice > 0) {
                    rightText = `${finalPrice} cr`;
                    // Default price color
                } else if (finalPrice < 0) {
                    rightText = `+${-finalPrice} cr`;
                    rightColor = [100, 255, 150];
                } else {
                    rightText = "EVEN SWAP";
                    rightColor = [150, 255, 150];
                }
            }

            const leftText = isCurrentShip
                ? ship.name
                : `${ship.name}  |  Hull: ${ship.baseHull}  |  Cargo: ${ship.cargoCapacity}`;

            const leftColor = isCurrentShip ? [100, 150, 255] : null;

            // Draw text
            UIComponents.drawListRowText({
                leftText,
                rightText,
                rowX: rowArea.x,
                rowY: rowArea.y,
                rowW: rowArea.w,
                rowH: rowArea.h,
                leftColor,
                rightColor,
                isDisabled: !canAfford && !isCurrentShip
            });

            // Always add to clickable areas (including current ship)
            this.shipyardListAreas.push({
                x: rowArea.x, y: rowArea.y, w: rowArea.w, h: rowArea.h,
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
            // [STORM CRITICAL FIX] Hide alien storm weapons from player menu
            if (weapon.type === 'storm') return false;

            // Use weapon's explicit techLevel, or calculate from damage/price
            // For barrier weapons (no damage property), use price-based calculation with fallback
            const damage = weapon.damage || 1; // Fallback for barrier weapons that use damageReduction
            const weaponTechLevel = weapon.techLevel || Math.min(5, Math.ceil((damage * weapon.price) / 5000));
            return weaponTechLevel <= systemTechLevel;
        }) : [];

        // ADD SHIP UPGRADES (Armor, Engine, Cargo, Hardpoints)
        const availableShipUpgrades = typeof SHIP_UPGRADES !== 'undefined' ? SHIP_UPGRADES.filter(upg => {
            // Basic tech level check (assume upgrades have techLevel or low default)
            // Most early upgrades should be available
            return (upg.level * 2 - 1) <= systemTechLevel; // Level 1->TL1, Level 2->TL3, Level 3->TL5 roughly
        }) : [];

        // Merge lists - Upgrades first or last? Let's put them AT THE END as requested ("below weapons")
        const allItems = [...availableWeapons, ...availableShipUpgrades];

        // Store full filtered list for navigation (not just visible items)
        this._fullFilteredWeapons = allItems;
        const L = STATION_LAYOUT; // Shorthand

        // Draw welcome text using standardized description
        const systemName = system?.name || "Unknown";
        const welcomeText = this._getUpgradesWelcomeText(systemTechLevel, economyType, systemName);
        const contentY = UIComponents.drawScreenDescription(welcomeText, pX, pY, pW, headerHeight, { color: [255, 200, 150] });

        // Continue with upgrade menu drawing - using standardized row height
        const rowH = L.ROW_HEIGHT;
        const startY = contentY;

        const visibleRows = floor((pH - (startY - pY) - L.BACK_BUTTON_MARGIN) / rowH);
        let totalRows = allItems.length;
        let scrollAreaH = visibleRows * rowH;
        this.upgradeScrollMax = max(0, totalRows - visibleRows);
        if (typeof this.upgradeScrollOffset !== "number") this.upgradeScrollOffset = 0;
        this.upgradeScrollOffset = constrain(this.upgradeScrollOffset, 0, this.upgradeScrollMax);

        // Draw visible upgrades
        let firstRow = this.upgradeScrollOffset;
        let lastRow = min(firstRow + visibleRows, totalRows);
        textSize(STATION_TEXT_SIZE.BODY);

        for (let i = firstRow; i < lastRow; i++) {
            let upg = allItems[i];
            let y = startY + (i - firstRow) * rowH;

            const isShipUpgrade = ['armor', 'engine', 'cargo', 'hardpoints', 'shield', 'cloak', 'booster'].includes(upg.type);

            // Check formatted affordability (and specific upgrade constraints if needed)
            let canAfford = player.credits >= upg.price;

            // Allow re-buying same level? Or strictly upgrades?
            // Simple check: if installed level >= this level, maybe grey out or show "Installed"?
            let isInstalled = false;
            if (isShipUpgrade && player.installedUpgrades) {
                const currentLevel = player.installedUpgrades[upg.type] || 0;
                if (currentLevel >= upg.level) isInstalled = true;
            }
            const isAlreadyOwned = isInstalled; // Track for passing to detail screen

            // Different colors for ship upgrades (green) vs weapons (purple/blue)
            // Draw row using standardized components
            const rowArea = UIComponents.drawListRow({
                x: pX + L.CONTENT_PADDING,
                y: y,
                w: pW - L.CONTENT_PADDING * 2,
                h: rowH,
                index: i,
                isCurrent: isInstalled,
                canAfford: canAfford && !isInstalled,
                isHighlighted: isShipUpgrade // Optional subtle distinction
            });

            let infoText = "";
            if (isShipUpgrade) {
                infoText = `Type: ${upg.type.charAt(0).toUpperCase() + upg.type.slice(1)} L${upg.level}`;
            } else {
                infoText = `Type: ${upg.type}  |  DPS: ${upg.damage}`;
            }

            const upgLeft = `${upg.name}  |  ${infoText}`;

            // Customize colors slightly for upgrades context
            let leftColor = null;
            if (isShipUpgrade) {
                leftColor = (canAfford || isInstalled) ? UIComponents.STATION_COLORS.TEXT_INSTALLED : [80, 120, 80];
            } else {
                leftColor = canAfford ? UIComponents.STATION_COLORS.TEXT_PRIMARY : UIComponents.STATION_COLORS.TEXT_DISABLED;
            }

            const rightText = isInstalled ? "INSTALLED" : `${upg.price} cr`;
            const rightColor = isInstalled ? UIComponents.STATION_COLORS.TEXT_INSTALLED : null;

            UIComponents.drawListRowText({
                leftText: upgLeft,
                rightText: rightText,
                rowX: rowArea.x,
                rowY: rowArea.y,
                rowW: rowArea.w,
                rowH: rowArea.h,
                leftColor,
                rightColor,
                isDisabled: !canAfford && !isInstalled
            });

            this.upgradeListAreas.push({
                x: pX + L.CONTENT_PADDING,
                y: y,
                w: pW - L.CONTENT_PADDING * 2,
                h: rowH - 6,
                upgrade: upg,
                canAfford: canAfford,
                isInstalled: isAlreadyOwned
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
        const L = STATION_LAYOUT; // Shorthand

        // Screen description
        const contentY = UIComponents.drawScreenDescription(
            "Hire professional security guards to protect you during your travels.",
            pX, pY, pW, headerHeight
        );

        // Show current bodyguard status
        const activeGuardsCount = player.getActiveGuardsCount ? player.getActiveGuardsCount() : 0;
        const bodyguardLimit = player.bodyguardLimit || 0;

        UIComponents.setTextStyle({ fill: [180, 220, 255], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
        text(`Active bodyguards: ${activeGuardsCount}/${bodyguardLimit}`, pX + pW / 2, contentY);

        let listY = contentY + STATION_TEXT_SIZE.BODY + L.SECTION_GAP;

        if (activeGuardsCount < bodyguardLimit) {
            // Section header
            UIComponents.setTextStyle({ fill: 230, size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
            text("Available Guards for Hire:", pX + L.CONTENT_PADDING, listY);
            listY += STATION_TEXT_SIZE.BODY + L.BTN_SPACING;

            const guardOptions = [
                { ship: "GladiusFighterGuard", name: "Gladius Security", cost: 8000, description: "Standard security escort" },
                { ship: "VultureGuard", name: "Vulture Protector", cost: 12000, description: "Heavy combat protection" },
                { ship: "WaspAssaultGuard", name: "Wasp Security", cost: 6000, description: "Fast response protection" },
                { ship: "ViperGuard", name: "Viper Guardian", cost: 10000, description: "Agile defender" }
            ];

            const affordableGuards = guardOptions.filter(guard => player.credits >= guard.cost);

            if (affordableGuards.length === 0) {
                UIComponents.setTextStyle({ fill: [255, 150, 150], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
                text("You don't have enough credits to hire any guards.", pX + pW / 2, listY);
            } else {
                const rowH = 60; // Guard card height

                affordableGuards.forEach((guard, i) => {
                    const rowX = pX + L.CONTENT_PADDING;
                    const rowY = listY + i * (rowH + L.BTN_SPACING);
                    const rowW = pW - L.CONTENT_PADDING * 2;

                    // Draw stylized row
                    const rowArea = UIComponents.drawListRow({
                        x: rowX,
                        y: rowY,
                        w: rowW,
                        h: rowH,
                        index: i,
                        isHighlighted: true // Always slightly highlighted as they are special cards
                    });

                    // Draw name, description and price using updated helper
                    UIComponents.drawListRowText({
                        leftText: guard.name,
                        subText: guard.description,
                        rightText: `${guard.cost.toLocaleString()} Cr`,
                        rowX: rowArea.x,
                        rowY: rowArea.y,
                        rowW: rowArea.w - 100, // Leave extra space for button
                        rowH: rowArea.h,
                        leftColor: [230, 230, 255],
                        rightColor: [150, 255, 150]
                    });

                    // Hire button
                    const hireBtn = UIComponents.drawButton(
                        rowX + rowW - 90, rowY + (rowH - L.BTN_HEIGHT_SMALL) / 2,
                        80, L.BTN_HEIGHT_SMALL,
                        "HIRE",
                        [50, 100, 50], [100, 200, 100],
                        3, { textSize: STATION_TEXT_SIZE.SMALL }
                    );

                    hireBtn.action = "HIRE_BODYGUARD";
                    hireBtn.shipType = guard.ship;
                    hireBtn.cost = guard.cost;
                    this.protectionServicesButtons.push(hireBtn);
                });
            }
        } else {
            UIComponents.setTextStyle({ fill: [255, 200, 100], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
            text("Maximum number of bodyguards hired.", pX + pW / 2, listY);
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
     * @param {boolean} [isSecretBase=false] - If true, use player.secretStorage instead of station.storage
     */
    drawStorageMenu(station, player, panelRect, headerHeight, isSecretBase = false) {
        if (!player) return;
        this.storageButtonAreas = [];
        this._isSecretBase = isSecretBase; // Store for click handler

        const activeStation = station || player?.currentSystem?.station || null;
        const { x: pX, y: pY, w: pW, h: pH } = panelRect;

        if (!activeStation) {
            UIComponents.setTextStyle({ fill: 220, size: STATION_TEXT_SIZE.BODY, align: [CENTER, CENTER] });
            text("No storage services are available in this location.", pX + pW / 2, pY + pH / 2 - 20);

            const backBtn = UIComponents.drawCenteredBackButton(pX, pY, pW, pH, { action: "BACK" });
            this.storageButtonAreas.push(backBtn);
            return;
        }

        // Select storage array based on secret base status
        const _sanitizeCargoList = list => (Array.isArray(list) ? list : []).filter(entry => {
            const nameOk = typeof entry?.name === 'string' && entry.name.trim().length > 0;
            const qtyOk = Number.isFinite(entry?.quantity) && entry.quantity > 0;
            return nameOk && qtyOk;
        });

        let storage;
        if (isSecretBase) {
            if (!Array.isArray(player.secretStorage)) {
                player.secretStorage = [];
            }
            player.secretStorage = _sanitizeCargoList(player.secretStorage);
            storage = player.secretStorage;
        } else {
            if (!Array.isArray(activeStation.storage)) {
                activeStation.storage = [];
            }
            activeStation.storage = _sanitizeCargoList(activeStation.storage);
            storage = activeStation.storage;
        }

        const playerCargo = _sanitizeCargoList(player.cargo);
        const L = STATION_LAYOUT; // Shorthand

        // Screen description
        const infoText = isSecretBase
            ? "Access your clandestine storage network from any secret base."
            : "Store cargo safely at this station.";
        const contentY = UIComponents.drawScreenDescription(infoText, pX, pY, pW, headerHeight);

        // Layout Calculations
        const listsEndY = pY + pH - L.BACK_BUTTON_MARGIN - 10;
        const totalListHeight = listsEndY - contentY;
        const sectionHeight = (totalListHeight / 2) - L.BTN_SPACING;

        const BUTTON_HEIGHT = L.BTN_HEIGHT_SMALL - 5;
        const ROW_HEIGHT = L.ROW_HEIGHT_COMPACT;

        // --- STATION STORAGE SECTION ---
        const storageLabelY = contentY;
        UIComponents.setTextStyle({ fill: [180, 200, 255], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
        const storageLabel = isSecretBase ? `Secret Storage (${storage.length} items):` : `Station Storage (${storage.length} items):`;
        text(storageLabel, pX + L.CONTENT_PADDING, storageLabelY);

        const storageListY = storageLabelY + 25;
        const storageVisibleRows = Math.floor(sectionHeight / ROW_HEIGHT);

        // Init scroll if needed
        if (typeof this.storageScrollOffset !== 'number') this.storageScrollOffset = 0;
        this.storageScrollMax = Math.max(0, storage.length - storageVisibleRows);
        this.storageScrollOffset = constrain(this.storageScrollOffset, 0, this.storageScrollMax);

        if (storage.length === 0) {
            UIComponents.setTextStyle({ fill: 180, size: STATION_TEXT_SIZE.SMALL, align: [CENTER, CENTER] });
            text("Storage is empty", pX + pW / 2, storageListY + sectionHeight / 2);
        } else {
            const firstRow = this.storageScrollOffset;
            const lastRow = Math.min(firstRow + storageVisibleRows, storage.length);

            for (let i = firstRow; i < lastRow; i++) {
                const item = storage[i];
                const displayIndex = i - firstRow;
                const itemY = storageListY + displayIndex * ROW_HEIGHT;

                // Check for mission match
                const isMissionItem = player.activeMission && player.activeMission.cargoType === item.name;

                // Draw standardized row
                const rowArea = UIComponents.drawListRow({
                    x: pX + L.CONTENT_PADDING + 10,
                    y: itemY,
                    w: pW - L.CONTENT_PADDING * 2 - 20,
                    h: ROW_HEIGHT,
                    index: displayIndex,
                    isHighlighted: isMissionItem
                });

                // Prepare text
                let labelText = `${item.name}: ${item.quantity}t`;
                if (isMissionItem) {
                    const req = player.activeMission.cargoQuantity || 0;
                    labelText += ` (Mission: ${req})`;
                }

                UIComponents.drawListRowText({
                    leftText: labelText,
                    rowX: rowArea.x,
                    rowY: rowArea.y,
                    rowW: rowArea.w,
                    rowH: rowArea.h,
                    leftColor: isMissionItem ? [255, 200, 100] : UIComponents.STATION_COLORS.TEXT_PRIMARY
                });

                const btnW = 80;
                const btnX = pX + pW - L.CONTENT_PADDING - btnW - 30;

                const retrieveBtn = UIComponents.drawButton(
                    btnX, itemY + 4, btnW, BUTTON_HEIGHT,
                    "Retrieve",
                    [0, 80, 0], [80, 160, 80],
                    3,
                    { textSize: STATION_TEXT_SIZE.SMALL }
                );

                retrieveBtn.action = "RETRIEVE_STORAGE";
                retrieveBtn.commodity = item.name;
                this.storageButtonAreas.push(retrieveBtn);
            }

            // Scrollbar for Storage
            this.storageScrollbarArea = UIComponents.drawScrollbar(
                pX + pW - L.BTN_SPACING, storageListY, sectionHeight,
                this.storageScrollOffset, this.storageScrollMax,
                storageVisibleRows, storage.length,
                [40, 40, 60], [100, 100, 140]
            );
        }

        // --- PLAYER CARGO SECTION ---
        const cargoLabelY = storageListY + sectionHeight + L.BTN_SPACING;
        UIComponents.setTextStyle({ fill: [180, 200, 255], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
        text(`Your Cargo (${player.getCargoAmount()}/${player.cargoCapacity}t):`, pX + L.CONTENT_PADDING, cargoLabelY);

        const cargoListY = cargoLabelY + 25;
        const cargoVisibleRows = Math.floor(sectionHeight / ROW_HEIGHT);

        // Init scroll if needed
        if (typeof this.cargoScrollOffset !== 'number') this.cargoScrollOffset = 0;
        this.cargoScrollMax = Math.max(0, playerCargo.length - cargoVisibleRows);
        this.cargoScrollOffset = constrain(this.cargoScrollOffset, 0, this.cargoScrollMax);

        if (playerCargo.length === 0) {
            UIComponents.setTextStyle({ fill: 180, size: STATION_TEXT_SIZE.SMALL, align: [CENTER, CENTER] });
            text("No cargo in hold", pX + pW / 2, cargoListY + sectionHeight / 2);
        } else {
            const firstRow = this.cargoScrollOffset;
            const lastRow = Math.min(firstRow + cargoVisibleRows, playerCargo.length);

            for (let i = firstRow; i < lastRow; i++) {
                const item = playerCargo[i];
                const displayIndex = i - firstRow;
                const itemY = cargoListY + displayIndex * ROW_HEIGHT;

                // Check for mission match
                const isMissionItem = player.activeMission && player.activeMission.cargoType === item.name;

                // Draw standardized row
                const rowArea = UIComponents.drawListRow({
                    x: pX + L.CONTENT_PADDING + 10,
                    y: itemY,
                    w: pW - L.CONTENT_PADDING * 2 - 20,
                    h: ROW_HEIGHT,
                    index: displayIndex,
                    isHighlighted: isMissionItem
                });

                UIComponents.drawListRowText({
                    leftText: `${item.name}: ${item.quantity}t`,
                    rowX: rowArea.x,
                    rowY: rowArea.y,
                    rowW: rowArea.w,
                    rowH: rowArea.h,
                    leftColor: isMissionItem ? [255, 200, 100] : UIComponents.STATION_COLORS.TEXT_PRIMARY
                });

                const btnW = 80;
                const btnX = pX + pW - L.CONTENT_PADDING - btnW - 30;

                const depositBtn = UIComponents.drawButton(
                    btnX, itemY + 4, btnW, BUTTON_HEIGHT,
                    "Deposit",
                    [80, 80, 0], [160, 160, 80],
                    3,
                    { textSize: STATION_TEXT_SIZE.SMALL }
                );
                depositBtn.action = "DEPOSIT_STORAGE";
                depositBtn.commodity = item.name;
                depositBtn.quantity = item.quantity;
                this.storageButtonAreas.push(depositBtn);
            }

            // Scrollbar for Cargo
            this.cargoScrollbarArea = UIComponents.drawScrollbar(
                pX + pW - L.BTN_SPACING, cargoListY, sectionHeight,
                this.cargoScrollOffset, this.cargoScrollMax,
                cargoVisibleRows, playerCargo.length,
                [40, 40, 60], [100, 100, 140]
            );
        }

        // Store scroll zones for mouse wheel handling (include label in hit area)
        this.storageScrollZones = {
            storage: { y: storageLabelY, h: sectionHeight + 35 }, // 35 for label+margin
            cargo: { y: cargoLabelY, h: sectionHeight + 35 }
        };

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
        const L = STATION_LAYOUT; // Shorthand
        const contentY = pY + headerHeight + L.CONTENT_START;
        const contentH = pH - headerHeight - L.BACK_BUTTON_MARGIN - 10;
        const lineHeight = STATION_TEXT_SIZE.BODY + 2;

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
        const rowH = 40; // Height per entry
        const visibleRows = Math.max(1, Math.floor((contentH - 40) / rowH)); // Subtract header/padding

        this.recordScrollMax = Math.max(0, totalEntries - visibleRows);

        if (typeof this.recordScrollOffset !== 'number' || !isFinite(this.recordScrollOffset)) {
            this.recordScrollOffset = 0;
        }
        this.recordScrollOffset = constrain(this.recordScrollOffset, 0, this.recordScrollMax);

        let currentY = contentY;
        UIComponents.setTextStyle({ fill: [255, 200, 200], size: STATION_TEXT_SIZE.HEADER, align: [LEFT, TOP] });
        text(`Personal Log: ${totalEntries} entries`, pX + 30, currentY);
        currentY += 35;

        if (totalEntries === 0) {
            UIComponents.setTextStyle({ fill: 180, size: STATION_TEXT_SIZE.BODY, align: [CENTER, CENTER] });
            text("No activity recorded yet.", pX + pW / 2, currentY + (contentH - 35) / 2);
        } else {
            const startIndex = this.recordScrollOffset;
            const endIndex = Math.min(startIndex + visibleRows, totalEntries);

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

            for (let i = startIndex; i < endIndex; i++) {
                const evt = events[i];
                const displayIndex = i - startIndex;
                const itemY = currentY + displayIndex * rowH;
                const col = typeColors[evt.type] || [200, 200, 200];
                const timeStr = formatLogTime(evt.timestamp);

                // Draw standardized row
                const rowArea = UIComponents.drawListRow({
                    x: pX + L.CONTENT_PADDING,
                    y: itemY,
                    w: pW - L.CONTENT_PADDING * 2,
                    h: rowH,
                    index: displayIndex,
                    isHighlighted: false
                });

                // Draw text
                UIComponents.drawListRowText({
                    leftText: `[${evt.type}] ${evt.description}`,
                    rightText: timeStr,
                    rowX: rowArea.x,
                    rowY: rowArea.y,
                    rowW: rowArea.w,
                    rowH: rowArea.h,
                    leftColor: col,
                    rightColor: UIComponents.STATION_COLORS.TEXT_SECONDARY
                });
            }

            // Draw scrollbar if needed
            const scrollAreaH = visibleRows * rowH;
            this.recordScrollbarArea = UIComponents.drawScrollbar(
                pX + pW, currentY, scrollAreaH,
                this.recordScrollOffset, this.recordScrollMax,
                visibleRows, totalEntries,
                [40, 40, 60], [120, 180, 255]
            );
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
     * Handles clicks on a scrollbar to jump to position.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Object} area - Scrollbar area object from UIComponents.drawScrollbar
     * @param {string} offsetKey - Property name for scroll offset
     * @param {string} maxKey - Property name for scroll max
     * @returns {boolean}
     */
    _handleScrollbarClick(mx, my, area, offsetKey, maxKey) {
        if (!area || !UIComponents.isClickInArea(mx, my, area)) return false;

        // Map click Y to scroll offset
        // We want the handle center to align with the mouse click if possible
        const trackRange = area.h - area.handleH;
        if (trackRange <= 0) return false;

        let relativeY = my - area.y - area.handleH / 2;
        let ratio = constrain(relativeY / trackRange, 0, 1);

        this[offsetKey] = Math.round(ratio * this[maxKey]);
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

        if (currentState === "VIEWING_STORAGE") {
            if (this.storageScrollZones) {
                const { storage, cargo } = this.storageScrollZones;
                // Use global mouseY
                if (storage && mouseY >= storage.y && mouseY <= storage.y + storage.h) {
                    return this.handleScroll("storageScrollOffset", "storageScrollMax", event.deltaY);
                }
                if (cargo && mouseY >= cargo.y && mouseY <= cargo.y + cargo.h) {
                    return this.handleScroll("cargoScrollOffset", "cargoScrollMax", event.deltaY);
                }
            }
            return false;
        }

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
        // Handle scrollbar clicks first
        if (this._handleScrollbarClick(mx, my, this.shipyardScrollbarArea, "shipyardScrollOffset", "shipyardScrollMax")) {
            return true;
        }

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
        const L = STATION_LAYOUT; // Shorthand
        const shipData = this.selectedShipForDetail;
        const shipDef = shipData.shipDef;

        if (!shipDef) {
            UIComponents.drawCenteredInfo("Ship data not available", pX + pW / 2, pY + pH / 2);
            this.shipDetailButtons = { back: UIComponents.drawCenteredBackButton(pX, pY, pW, pH) };
            return;
        }

        // Layout constants - using standardized values
        const LAYOUT = {
            leftWidthRatio: 0.5,
            rightWidthRatio: 0.5,
            leftPadding: L.CONTENT_PADDING,
            columnGap: L.SECTION_GAP * 2,
            topPadding: L.CONTENT_START,
            bottomPadding: L.BACK_BUTTON_MARGIN + 10,
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
        const btnY = pY + pH - L.BTN_HEIGHT - L.CONTENT_START;
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
        UIComponents.setTextStyle({ fill: [180, 220, 255], size: STATION_TEXT_SIZE.HEADER, align: [CENTER, TOP] });
        text(shipData.shipName, previewCenterX, contentY + STATION_LAYOUT.BTN_SPACING);

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
        textSize(STATION_TEXT_SIZE.BODY);
        textAlign(LEFT, TOP);

        // Calculate how many lines the description will need
        const descriptionText = shipDef.description || "No description available.";
        const maxDescWidth = rightW - 40; // Extra padding to prevent touching right edge

        // Use textLeading to get line spacing, default to textSize * 1.25 if not set
        const leading = textLeading() || STATION_TEXT_SIZE.BODY * 1.25;

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
        textSize(STATION_TEXT_SIZE.HEADER);
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
        textSize(STATION_TEXT_SIZE.BODY);
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
        textSize(STATION_TEXT_SIZE.HEADER);
        textAlign(LEFT, TOP);
        text("Armament:", specX, y);
        y += lineH * 0.8;

        // Weapon list
        textSize(STATION_TEXT_SIZE.BODY);
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
        textSize(STATION_TEXT_SIZE.BODY);
        textAlign(LEFT, TOP);
        text("Price (after trade-in):", x, y);

        // Price value with color coding
        textSize(STATION_TEXT_SIZE.HEADER);
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
            textSize(STATION_TEXT_SIZE.BODY);
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
            textSize(STATION_TEXT_SIZE.BODY);
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
            textSize(STATION_TEXT_SIZE.BODY);
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
                textSize(STATION_TEXT_SIZE.BODY);
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
                    const stationForStorage = player.currentSystem?.station;
                    player.offloadExcessCargoToStorage(stationForStorage, msg => addMessageFn(msg, [200, 230, 255]));
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
                const stationForStorage = player.currentSystem?.station;
                player.offloadExcessCargoToStorage(stationForStorage, msg => addMessageFn(msg, [200, 230, 255]));
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
        const L = STATION_LAYOUT; // Shorthand
        const weaponData = this.selectedWeaponForDetail;
        const weaponDef = weaponData.weaponDef;

        if (!weaponDef) {
            UIComponents.drawCenteredInfo("Weapon data not available", pX + pW / 2, pY + pH / 2);
            this.weaponDetailButtons = { back: UIComponents.drawCenteredBackButton(pX, pY, pW, pH) };
            return;
        }

        // Layout constants - using standardized values
        const LAYOUT = {
            leftWidthRatio: 0.5,
            rightWidthRatio: 0.45,
            leftPadding: L.CONTENT_PADDING,
            columnGap: L.SECTION_GAP * 2,
            topPadding: L.CONTENT_START,
            bottomPadding: L.BACK_BUTTON_MARGIN + 10,
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
        this.weaponDetailButtons = this._drawWeaponActionButtons(weaponData.canAfford, rightX, rightW, btnY, weaponData.isInstalled);

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
        textSize(STATION_TEXT_SIZE.HEADER);
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
        textSize(STATION_TEXT_SIZE.BODY);
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
        textSize(STATION_TEXT_SIZE.HEADER);
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
        textSize(STATION_TEXT_SIZE.BODY);
        textAlign(LEFT, TOP);
        fill(220);

        let y = specY;
        const type = weaponDef.type;

        // Check for Ship Upgrade types first
        if (['armor', 'engine', 'cargo', 'hardpoints', 'shield', 'cloak', 'booster'].includes(type) || weaponDef.hullBonus || weaponDef.speedMultiplier) {

            // Armor
            if (weaponDef.hullBonus) {
                text(`Hull Bonus: +${weaponDef.hullBonus}`, specX, y);
                y += lineH;
            }

            // Engine
            if (weaponDef.speedMultiplier) {
                const speedPct = Math.round((weaponDef.speedMultiplier - 1) * 100);
                text(`Speed Boost: +${speedPct}%`, specX, y);
                y += lineH;
            }
            if (weaponDef.thrustMultiplier) {
                const thrustPct = Math.round((weaponDef.thrustMultiplier - 1) * 100);
                text(`Thrust Boost: +${thrustPct}%`, specX, y);
                y += lineH;
            }

            // Cargo
            if (weaponDef.cargoBonus) {
                text(`Cargo Capacity: +${weaponDef.cargoBonus}`, specX, y);
                y += lineH;
            }

            // Hardpoints
            if (weaponDef.bonusSlots) {
                text(`Bonus Weapon Slots: +${weaponDef.bonusSlots}`, specX, y);
                y += lineH;
            }

            // Shield
            if (weaponDef.shieldBonus) {
                text(`Shield Bonus: +${weaponDef.shieldBonus}`, specX, y);
                y += lineH;
            }

            // Cloak
            if (weaponDef.cloakDuration) {
                text(`Cloak Duration: ${weaponDef.cloakDuration}s`, specX, y);
                y += lineH;
            }
            if (weaponDef.cloakCooldown) {
                text(`Cooldown: ${weaponDef.cloakCooldown}s`, specX, y);
                y += lineH;
            }

            // Booster
            if (weaponDef.boostMultiplier) {
                text(`Boost Multiplier: ${weaponDef.boostMultiplier}x`, specX, y);
                y += lineH;
            }
            if (weaponDef.boostDuration) {
                text(`Boost Duration: ${weaponDef.boostDuration}s`, specX, y);
                y += lineH;
            }
            if (weaponDef.boostCooldown) {
                text(`Boost Cooldown: ${weaponDef.boostCooldown}s`, specX, y);
                y += lineH;
            }

            return; // Done with ship upgrades
        }

        // Standard Weapon Stats

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
        textSize(STATION_TEXT_SIZE.BODY);
        textAlign(LEFT, TOP);
        text("Price:", x, y);

        // Price value with color coding
        textSize(STATION_TEXT_SIZE.HEADER);
        fill(canAfford ? [100, 255, 100] : [255, 150, 150]);
        text(`${price} cr`, x, y + 20);

        // Affordability warning
        if (!canAfford) {
            fill(255, 150, 150);
            textSize(STATION_TEXT_SIZE.BODY);
            textAlign(CENTER, TOP);
            const shortfall = price - player.credits;
            text(`Need ${shortfall} more cr`, x + rightW / 2, y + 22);
        }
    }

    /**
     * Draws weapon action buttons (Prev/Next/Buy/Back).
     * @private
     */
    _drawWeaponActionButtons(canAfford, columnX, columnW, y, isInstalled = false) {
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
            textSize(STATION_TEXT_SIZE.BODY);
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
            textSize(STATION_TEXT_SIZE.BODY);
            text("NEXT >", currentX + BTN_WIDTH / 2, y + BTN_HEIGHT / 2);
        }
        currentX += BTN_WIDTH + BTN_SPACING;

        // Buy button
        let buyBtn = null;
        if (isInstalled) {
            // Draw "OWNED" button for already-installed ship upgrades
            fill(40, 60, 40);
            stroke(100, 200, 100);
            strokeWeight(1);
            rect(currentX, y, BTN_WIDTH, BTN_HEIGHT, 5);
            fill(150, 255, 150);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(STATION_TEXT_SIZE.BODY);
            text("OWNED", currentX + BTN_WIDTH / 2, y + BTN_HEIGHT / 2);
        } else if (canAfford) {
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
            textSize(STATION_TEXT_SIZE.BODY);
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

        text("Select Weapon Slot", popupX + popupW / 2, popupY + 15);

        textSize(STATION_TEXT_SIZE.HELPER);
        // Get ship's weapon slots
        // Get ship's weapon slots (use player's actual maxWeapons to account for upgrades)
        const availableSlots = player.maxWeapons || 1;

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
            textSize(STATION_TEXT_SIZE.HELPER);
            text(`Slot ${i + 1}`, slotX + slotBtnW / 2, slotY + 8);

            // Current weapon name
            textSize(STATION_TEXT_SIZE.HELPER);
            fill(150, 170, 200);
            const weaponText = currentWeapon?.name || "Empty";
            text(weaponText, slotX + slotBtnW / 2, slotY + 40);


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
        // Handle scrollbar clicks first
        if (this._handleScrollbarClick(mx, my, this.upgradeScrollbarArea, "upgradeScrollOffset", "upgradeScrollMax")) {
            return true;
        }

        // Check upgrade list items
        for (let i = 0; i < this.upgradeListAreas.length; i++) {
            const area = this.upgradeListAreas[i];
            if (!UIComponents.isClickInArea(mx, my, area)) continue;

            // Build full navigation list from ALL filtered weapons (not just visible)
            // This ensures arrow key navigation goes through the complete list
            this.availableWeaponsList = this._fullFilteredWeapons.map(weapon => {
                const isShipUpgrade = ['armor', 'engine', 'cargo', 'hardpoints', 'shield', 'cloak', 'booster'].includes(weapon.type);
                let isInstalled = false;
                if (isShipUpgrade && player.installedUpgrades) {
                    const currentLevel = player.installedUpgrades[weapon.type] || 0;
                    if (currentLevel >= weapon.level) isInstalled = true;
                }
                return {
                    weaponDef: weapon,
                    price: weapon.price,
                    canAfford: player.credits >= weapon.price,
                    isInstalled: isInstalled
                };
            });

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
     * Handles clicks on the Weapon Detail screen (now also Upgrade Detail).
     */
    handleWeaponDetailClick(mx, my, player, addMessageFn) {
        if (!this.selectedWeaponForDetail) return false;

        const weaponData = this.selectedWeaponForDetail;
        const def = weaponData.weaponDef;
        const isShipUpgrade = ['armor', 'engine', 'cargo', 'hardpoints', 'shield', 'cloak', 'booster'].includes(def.type);

        if (this.weaponDetailButtons) {
            // Back
            if (this.weaponDetailButtons.back && UIComponents.isClickInArea(mx, my, this.weaponDetailButtons.back)) {
                if (typeof gameStateManager !== 'undefined') gameStateManager.setState('VIEWING_UPGRADES');
                return true;
            }

            // Buy/Install
            if (this.weaponDetailButtons.buy && UIComponents.isClickInArea(mx, my, this.weaponDetailButtons.buy)) {
                // Check if ship upgrade is already installed
                if (isShipUpgrade && player.installedUpgrades) {
                    const currentLevel = player.installedUpgrades[def.type] || 0;
                    if (currentLevel >= def.level) {
                        addMessageFn(`${def.name} is already installed!`, [255, 200, 100]);
                        if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                        return true;
                    }
                }
                if (player.credits >= def.price) {
                    if (isShipUpgrade) {
                        // INSTALL UPGRADE DIRECTLY
                        player.credits -= def.price;
                        player.applyUpgrade(def.type, def.level);
                        addMessageFn(`${def.name} installed!`, [100, 255, 100]);
                        if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                        if (typeof saveGame === 'function') saveGame();

                        // Go back to list
                        if (typeof gameStateManager !== 'undefined') gameStateManager.setState('VIEWING_UPGRADES');
                    } else {
                        // WEAPON PURCHASE - Show slot picker
                        this.showingSlotPicker = true;
                        this.pendingWeaponPurchase = def;
                    }
                    return true;
                } else {
                    addMessageFn("Insufficient credits!", [255, 100, 100]);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                    return true;
                }
            }
        }

        // Slot Picker Handling (Weapons Only)
        if (!isShipUpgrade && this.showingSlotPicker) {
            if (this.slotPickerButtons) {
                for (let btn of this.slotPickerButtons) {
                    if (UIComponents.isClickInArea(mx, my, btn)) {
                        if (btn.action === 'CANCEL') {
                            this.showingSlotPicker = false;
                            this.pendingWeaponPurchase = null;
                            if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                        } else if (typeof btn.slotIndex === 'number') {
                            // Install weapon to slot
                            const slotIdx = btn.slotIndex;
                            const weaponDef = this.pendingWeaponPurchase; // pendingWeaponPurchase is the def itself
                            const price = weaponDef.price;
                            const systemName = (typeof galaxy !== 'undefined' && galaxy?.getCurrentSystem()?.name) || 'Unknown';

                            player.spendCredits(price);
                            player.installWeaponToSlot(weaponDef, slotIdx);

                            player.recordWeaponUpgrade(
                                weaponDef.name,
                                weaponDef.type,
                                price,
                                slotIdx,
                                systemName
                            );

                            addMessageFn(`${weaponDef.name} installed in Slot ${slotIdx + 1}`, [100, 255, 100]);

                            this.showingSlotPicker = false;
                            this.pendingWeaponPurchase = null;
                            if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                            if (typeof saveGame === 'function') saveGame();
                            if (typeof gameStateManager !== 'undefined') gameStateManager.setState('VIEWING_UPGRADES');
                        }
                        return true;
                    }
                }
            }
        }

        return false;
    }

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
        const isSecretBase = this._isSecretBase || (stationForStorage && stationForStorage.isSecret);

        // Initialize storage arrays
        if (isSecretBase) {
            if (!Array.isArray(player.secretStorage)) {
                player.secretStorage = [];
            }
        } else if (stationForStorage && !Array.isArray(stationForStorage.storage)) {
            stationForStorage.storage = [];
        }

        const sanitizeCargoList = list => (Array.isArray(list) ? list : []).filter(entry => {
            const nameOk = typeof entry?.name === 'string' && entry.name.trim().length > 0;
            const qtyOk = Number.isFinite(entry?.quantity) && entry.quantity > 0;
            return nameOk && qtyOk;
        });

        // Get the correct storage reference
        let storageArray;
        if (isSecretBase) {
            player.secretStorage = sanitizeCargoList(player.secretStorage);
            storageArray = player.secretStorage;
        } else if (stationForStorage) {
            stationForStorage.storage = sanitizeCargoList(stationForStorage.storage);
            storageArray = stationForStorage.storage;
        } else {
            storageArray = [];
        }
        player.cargo = sanitizeCargoList(player.cargo);

        player.cargo = sanitizeCargoList(player.cargo);

        // Handle Scrollbar Clicks
        if (this._handleScrollbarClick(mx, my, this.storageScrollbarArea, "storageScrollOffset", "storageScrollMax")) return true;
        if (this._handleScrollbarClick(mx, my, this.cargoScrollbarArea, "cargoScrollOffset", "cargoScrollMax")) return true;

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
                    const storageItem = storageArray.find(s => s.name === btn.commodity);
                    if (storageItem) {
                        storageItem.quantity += item.quantity;
                    } else {
                        storageArray.push({ name: btn.commodity, quantity: item.quantity });
                    }
                    player.cargo = player.cargo.filter(c => c.name !== btn.commodity);
                    const storageType = isSecretBase ? "secret storage" : "storage";
                    addMessageFn(`Deposited ${item.quantity}t of ${btn.commodity} into ${storageType}.`, [100, 255, 100]);
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
                const storageItem = storageArray.find(s => s.name === btn.commodity);
                if (storageItem && storageItem.quantity > 0) {
                    const availableSpace = player.cargoCapacity - player.getCargoAmount();
                    const retrieveAmount = Math.min(storageItem.quantity, availableSpace);

                    if (retrieveAmount > 0) {
                        player.addCargo(btn.commodity, retrieveAmount);
                        storageItem.quantity -= retrieveAmount;
                        if (storageItem.quantity <= 0) {
                            // Remove empty item from the correct array
                            if (isSecretBase) {
                                player.secretStorage = player.secretStorage.filter(s => s.name !== btn.commodity);
                            } else {
                                stationForStorage.storage = stationForStorage.storage.filter(s => s.name !== btn.commodity);
                            }
                        }
                        const storageType = isSecretBase ? "secret storage" : "storage";
                        addMessageFn(`Retrieved ${retrieveAmount}t of ${btn.commodity} from ${storageType}.`, [100, 255, 100]);
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
    /**
     * Handles clicks on the news menu.
     */
    handleNewsClick(mx, my) {
        // Handle scrollbar clicks first
        if (this._handleScrollbarClick(mx, my, this.newsScrollbarArea, "newsScrollOffset", "newsScrollMax")) {
            return true;
        }

        if (!Array.isArray(this.newsButtonAreas)) return false;
        for (const btn of this.newsButtonAreas) {
            if (!UIComponents.isClickInArea(mx, my, btn)) continue;

            if (btn.action === "BACK") {
                if (typeof gameStateManager !== 'undefined') gameStateManager.setState("DOCKED");
                return true;
            }

            if (btn.action === "FILTER") {
                this.newsSourceFilter = btn.source;
                this.newsScrollOffset = 0; // Reset scroll on filter change
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
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
