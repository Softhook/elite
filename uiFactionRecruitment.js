// ****** uiFactionRecruitment.js ******
// Faction recruitment menus: Imperial, Separatist, Military.
// This file must be loaded BEFORE uiManager.js

/**
 * Faction lore data containing descriptions, benefits, and recruitment info.
 */
const FACTION_LORE = {
    IMPERIAL: {
        title: "Imperial Navy",
        slogan: "Serve the Emperor and make the galaxy great again.",
        description: "For centuries, the Empire has maintained order across the stars. Our pilots are disciplined, our ships well-maintained, and our paperwork impeccable. Join us, and become part of a legacy that spans a thousand systems.",
        memberDescription: "Welcome back, pilot. Your service to the Empire continues to bring honor to the fleet. Keep hunting those Separatist dogs and the credits will keep flowing. The Emperor remembers those who serve faithfully.",
        benefits: [
            "2,000 cr bounty per Separatist vessel destroyed",
            "Access to special Imperial stations",
            "Access to Imperial Navy mission contracts"
        ],
        warning: "Separatist forces will treat you as hostile on sight."
    },
    SEPARATIST: {
        title: "Separatist Forces",
        slogan: "Fight for freedom and justice.",
        description: "When Imperial taxes grew unbearable and colonial voices went unheard, pilots rose to resist. We fight for every system's right to self-governance. The cause is just, the pay is decent, and nobody checks your papers.",
        memberDescription: "Good to see you, comrade. The Separatist cause grows stronger with every Imperial ship you turn to scrap. Remember—we're the ones fighting for a galaxy where everyone gets a fair shake. Keep up the good work.",
        benefits: [
            "2,000 cr bounty per Imperial vessel destroyed",
            "Access to special Separatist stations",
            "Access to black market equipment channels"
        ],
        warning: "Imperial forces will mark you as a traitor on sight."
    },
    MILITARY: {
        title: "Military Forces",
        slogan: "Honor, duty, excellence.",
        description: "We are the first line of defense against the alien threat. While factions squabble over politics, we defend humanity against alien incursions and pirate clans. We don't care about your past—only whether you can handle yourself in a fight.",
        memberDescription: "At ease, soldier. Your combat record speaks for itself. The aliens aren't going to stop themselves, and the pirates need reminding who keeps this sector safe. Stay sharp out there—we're counting on you.",
        benefits: [
            "4,000 cr bounty per Alien vessel destroyed",
            "1,000 cr bounty per Pirate vessel destroyed",
            "Access to military-grade equipment"
        ],
        warning: "You will be expected to engage high-threat targets."
    },
    POLICE: {
        title: "Police Force",
        slogan: "To serve and protect.",
        description: "The thin blue line between civilization and chaos. Police forces maintain order across settled space, hunting pirates and keeping trade routes safe. Sign up and you'll get a patrol craft, steady bounties, and the satisfaction of knowing you're making a difference.",
        memberDescription: "Officer on deck. Your patrol record is noted and appreciated. Pirates fear your callsign, and honest traders sleep easier knowing you're out there. Keep up the good work—and remember, we look after our own.",
        benefits: [
            "1,000 cr bounty per Pirate vessel destroyed",
            "1,000 cr bounty per Alien vessel destroyed",
            "Access to police equipment"
        ],
        warning: "Criminal activity will result in immediate dismissal."
    }
};

// Layout and sizing constants
const FACTION_UI_CONSTANTS = {
    NEWS_ITEM_HEIGHT: 58,
    MAX_DESC_LINES: 4,
    MAX_NEWS_LINES: 3,
    BTN_WIDTH: 180,
    BTN_HEIGHT: 35,
    PADDING: 15
};

/**
 * UIFactionRecruitment - Handles faction recruitment menu rendering.
 */
class UIFactionRecruitment {
    constructor() {
        // Button areas for click detection
        this.factionRecruitmentButtonAreas = [];
    }

    /**
 * Returns the fine amount for a faction based on security level.
 * @param {string} factionKey - Faction identifier
 * @param {string} securityLevel - System security level
 * @param {Player} [player] - Optional player to check hasBeenPolice for 3x multiplier
 * @returns {number} Fine amount in credits
 */
    getFactionFineAmount(factionKey, securityLevel, player = null) {
        const baseFines = {
            IMPERIAL: { base: 500, High: 1200, Medium: 800 },
            SEPARATIST: { base: 400, High: 1000, Medium: 650 },
            MILITARY: { base: 600, High: 1500, Medium: 900 },
            POLICE: { base: 300, High: 1000, Medium: 500 }
        };
        const fineData = baseFines[factionKey] || baseFines.POLICE;
        let amount = fineData[securityLevel] || fineData.base;

        // Former police officers pay triple fines
        if (player && player.hasBeenPolice) {
            amount *= 3;
        }

        return amount;
    }

    /**
     * Gets the cheapest faction ship for preview.
     * @param {string} factionKey - Faction identifier
     * @returns {Object|null} Ship definition or null
     * @private
     */
    _getFactionShipDef(factionKey) {
        if (typeof SHIP_DEFINITIONS === 'undefined') return null;

        let cheapestShip = null;
        let lowestPrice = Infinity;

        for (const [shipName, shipDef] of Object.entries(SHIP_DEFINITIONS)) {
            // Use faction property to identify faction ships
            const isFactionShip = shipDef.faction === factionKey;

            if (!isFactionShip) continue;

            if (shipDef.price && typeof shipDef.price === 'number' &&
                shipDef.price > 0 && shipDef.price < lowestPrice) {
                lowestPrice = shipDef.price;
                cheapestShip = { name: shipName, def: shipDef };
            }
        }

        return cheapestShip;
    }

    /**
     * Checks if the player is a member of the specified faction.
     * Handles POLICE specially via isPolice flag.
     * @param {Player} player
     * @param {string} factionKey
     * @returns {boolean}
     * @private
     */
    _isFactionMember(player, factionKey) {
        if (factionKey === 'POLICE') {
            return player.isPolice === true;
        }
        return player.playerFaction === factionKey;
    }

    /**
     * Draws the left panel content - ship preview for non-members, news for members.
     * @private
     */
    _drawLeftPanel(player, factionKey, themeColors, leftX, leftW, contentY, contentH) {
        const isMember = this._isFactionMember(player, factionKey);

        if (isMember) {
            // Member view: Show faction news
            this._drawMemberNewsSection(factionKey, themeColors, leftX, leftW, contentY, contentH);
        } else {
            // Non-member view: Show ship preview
            this._drawShipPreviewSection(factionKey, themeColors, leftX, leftW, contentY, contentH, player);
        }
    }

    /**
     * Draws ship preview for non-members.
     * @private
     */
    _drawShipPreviewSection(factionKey, themeColors, leftX, leftW, contentY, contentH, player) {
        const factionShip = this._getFactionShipDef(factionKey);
        const centerX = leftX + leftW / 2;
        const centerY = contentY + contentH * 0.45;
        const previewSize = Math.min(leftW, contentH) * 0.5;

        // Section title
        UIComponents.setTextStyle({ fill: themeColors[1], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
        text("Your Assigned Ship", centerX, contentY + 10);

        if (factionShip && factionShip.def) {
            // Draw rotating ship preview
            UIComponents.drawRotatingShip(factionShip.def, centerX, centerY, previewSize, 0.0008);

            // Ship name
            UIComponents.setTextStyle({ fill: [180, 220, 255], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
            text(factionShip.name, centerX, centerY + previewSize * 0.55);

            // Warning about losing current ship
            const warningY = contentY + contentH - 60;
            UIComponents.setTextStyle({ fill: [255, 180, 100], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
            text("⚠ WARNING", centerX, warningY);
            UIComponents.setTextStyle({ fill: [255, 150, 100], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
            text("Joining will replace your current ship.", centerX, warningY + 18);
            if (player.shipTypeName) {
                UIComponents.setTextStyle({ fill: [200, 150, 150], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
                text(`Your ${player.shipTypeName} will be lost.`, centerX, warningY + 34);
            }
        } else {
            // Fallback if no ship found
            UIComponents.setTextStyle({ fill: [150, 150, 150], size: STATION_TEXT_SIZE.SMALL, align: [CENTER, CENTER] });
            text("Ship preview unavailable", centerX, centerY);
        }
    }

    /**
     * Draws faction news for members.
     * @private
     */
    _drawMemberNewsSection(factionKey, themeColors, leftX, leftW, contentY, contentH) {
        const centerX = leftX + leftW / 2;
        const padding = 15;

        // Section title
        UIComponents.setTextStyle({ fill: themeColors[1], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
        text("Faction Intelligence", centerX, contentY + 10);

        // Determine which news source this faction sees
        const allowedSources = {
            IMPERIAL: ["The Core Echo"],
            MILITARY: ["The Core Echo"],
            POLICE: ["The Core Echo"],
            SEPARATIST: ["Freedom"]
        };
        const factionSources = allowedSources[factionKey] || ["The Core Echo"];

        // Get faction-relevant news filtered by source
        let newsItems = [];
        if (typeof GameGlobals !== 'undefined' && GameGlobals.newsManager) {
            const allNews = GameGlobals.newsManager.getNewsItems() || [];
            // Filter by allowed sources for this faction
            newsItems = allNews.filter(item => {
                const source = item.source || '';
                return factionSources.some(s => source.includes(s));
            }).slice(0, 5);
        }

        let newsY = contentY + 45;
        const newsItemHeight = FACTION_UI_CONSTANTS.NEWS_ITEM_HEIGHT;
        const newsWidth = leftW - padding * 2;

        if (newsItems.length === 0) {
            UIComponents.setTextStyle({ fill: [150, 150, 150], size: STATION_TEXT_SIZE.SMALL, align: [CENTER, CENTER] });
            text("No recent intelligence reports.", centerX, contentY + contentH / 2);
        } else {
            for (const item of newsItems.slice(0, 5)) {
                // News item background
                fill(30, 35, 50, 180);
                stroke(themeColors[0][0], themeColors[0][1], themeColors[0][2], 100);
                strokeWeight(1);
                rect(leftX + padding, newsY, newsWidth, newsItemHeight - 5, 3);
                noStroke();

                // Body text with wrapping to show more content
                UIComponents.setTextStyle({ fill: [200, 200, 220], size: STATION_TEXT_SIZE.SMALL, align: [LEFT, TOP] });
                const body = item.body || item.headline || 'No intel available';
                const maxLineWidth = newsWidth - 16;

                // Use shared word wrap utility
                const wrappedBody = this._wrapText(body, maxLineWidth, STATION_TEXT_SIZE.SMALL);
                const lines = wrappedBody.split('\n').slice(0, FACTION_UI_CONSTANTS.MAX_NEWS_LINES);

                // Draw lines
                let lineY = newsY + 8;
                for (const line of lines) {
                    text(line, leftX + padding + 8, lineY);
                    lineY += 16;
                }

                newsY += newsItemHeight;
            }
        }
    }


    /**
     * Draws the right panel content - faction info, benefits, and status.
     * @private
     */
    _drawRightPanel(player, factionKey, factionName, themeColors, rightX, rightW, contentY, contentH, system) {
        const lore = FACTION_LORE[factionKey] || FACTION_LORE.MILITARY;
        const isMember = this._isFactionMember(player, factionKey);
        const isWanted = system?.isPlayerWanted ? system.isPlayerWanted() : false;
        const canJoin = player.canJoinFaction ? player.canJoinFaction(factionKey) : false;
        const padding = 15;
        let yPos = contentY + 10;

        // Faction title
        UIComponents.setTextStyle({ fill: themeColors[1], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
        text(lore.title, rightX + padding, yPos);
        yPos += 26;

        // Slogan
        UIComponents.setTextStyle({ fill: [180, 180, 200], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
        text(lore.slogan, rightX + padding, yPos);
        yPos += 26;

        // Description (wrapped text) - use member description if applicable
        const descText = isMember && lore.memberDescription ? lore.memberDescription : lore.description;
        UIComponents.setTextStyle({ fill: [200, 200, 255], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
        const maxDescWidth = rightW - padding * 2;
        const wrappedDesc = this._wrapText(descText, maxDescWidth, 18);
        const descLines = wrappedDesc.split('\n').slice(0, FACTION_UI_CONSTANTS.MAX_DESC_LINES);
        for (const line of descLines) {
            text(line, rightX + padding, yPos);
            yPos += 22;
        }
        yPos += 10;

        // Divider
        stroke(themeColors[0][0], themeColors[0][1], themeColors[0][2], 150);
        strokeWeight(1);
        line(rightX + padding, yPos, rightX + rightW - padding, yPos);
        noStroke();
        yPos += 15;

        // Benefits section
        UIComponents.setTextStyle({ fill: themeColors[1], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
        text("BENEFITS", rightX + padding, yPos);
        yPos += 26;

        UIComponents.setTextStyle({ fill: [100, 255, 100], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
        for (const benefit of lore.benefits) {
            text("• " + benefit, rightX + padding, yPos);
            yPos += 22;
        }
        yPos += 10;

        // Warning (for non-members)
        if (!isMember && lore.warning) {
            UIComponents.setTextStyle({ fill: [255, 180, 100], size: STATION_TEXT_SIZE.SMALL, align: [LEFT, TOP] });
            text("⚠ " + lore.warning, rightX + padding, yPos);
            yPos += 25;
        }

        // Member status section
        if (isMember) {
            yPos += 5;
            stroke(themeColors[0][0], themeColors[0][1], themeColors[0][2], 150);
            strokeWeight(1);
            line(rightX + padding, yPos, rightX + rightW - padding, yPos);
            noStroke();
            yPos += 15;

            UIComponents.setTextStyle({ fill: themeColors[1], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
            text("YOUR STATUS", rightX + padding, yPos);
            yPos += 26;

            // Active member or wanted status first
            if (isWanted) {
                UIComponents.setTextStyle({ fill: [255, 80, 80], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
                text(`• ⚠ WANTED in ${system?.name || 'this system'}`, rightX + padding, yPos);
                yPos += 20;
            } else {
                UIComponents.setTextStyle({ fill: [100, 200, 100], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
                text("• ✓ Active Member", rightX + padding, yPos);
                yPos += 20;
            }

            // Member message
            UIComponents.setTextStyle({ fill: [100, 200, 255], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
            const memberMsg = this._getFactionMemberMessage(factionKey);
            text("• " + memberMsg, rightX + padding, yPos);
            yPos += 20;

            // Progress toward next rank (Prestige for Imperial/Separatist/Military, Kills for Police)
            try {
                const progress = player.getFactionKillsProgress && player.getFactionKillsProgress(factionKey);
                if (progress) {
                    UIComponents.setTextStyle({ fill: [180, 180, 200], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
                    const label = progress.usesPrestige ? 'Prestige' : 'Kills';
                    if (progress.nextThreshold) {
                        text(`• ${label}: ${progress.progress} (${progress.toNext} to ${progress.nextRank})`, rightX + padding, yPos);
                    } else {
                        text(`• ${label}: ${progress.progress} — Maximum Rank Achieved`, rightX + padding, yPos);
                    }
                    yPos += 20;
                }
            } catch (e) {
                if (typeof DEBUG_UI !== 'undefined' && DEBUG_UI) {
                    console.warn('getFactionKillsProgress failed:', e);
                }
            }

            // Secret base hint - only for factions that have secret bases (not Police)
            if (factionKey !== 'POLICE') {
                yPos += 5;
                UIComponents.setTextStyle({ fill: [180, 180, 200], size: STATION_TEXT_SIZE.BODY, align: [LEFT, TOP] });
                text("Press [B] while flying to find our secret base.", rightX + padding, yPos);
            }
        }

        // Buttons section - positioned at bottom
        this._drawActionButtons(player, factionKey, factionName, themeColors, rightX, rightW, contentY, contentH, isWanted, canJoin, isMember, system);
    }

    /**
     * Draws action buttons at the bottom of right panel.
     * @private
     */
    _drawActionButtons(player, factionKey, factionName, themeColors, rightX, rightW, contentY, contentH, isWanted, canJoin, isMember, system) {
        const btnW = FACTION_UI_CONSTANTS.BTN_WIDTH;
        const btnH = FACTION_UI_CONSTANTS.BTN_HEIGHT;
        const btnX = rightX + (rightW - btnW) / 2;
        const btnY = contentY + contentH - 55;

        // Fine payment button if wanted
        if (isWanted) {
            const fineAmount = this.getFactionFineAmount(factionKey, system?.securityLevel, player);
            // Show warning for former police
            if (player.hasBeenPolice && factionKey === 'POLICE') {
                UIComponents.setTextStyle({ fill: [255, 200, 100], size: STATION_TEXT_SIZE.SMALL, align: [CENTER, TOP] });
                text("Fines tripled for former police officer", btnX + btnW / 2, btnY - 65);
            }
            this.factionRecruitmentButtonAreas.push(
                UIComponents.drawButton(btnX, btnY - 45, btnW, btnH, `Pay Fine (${fineAmount} cr)`, [0, 120, 0], [100, 255, 100], 4, { action: 'pay_fine', amount: fineAmount, faction: factionKey })
            );
        }

        // Join faction button or status message
        if (canJoin && !isWanted) {
            this.factionRecruitmentButtonAreas.push(
                UIComponents.drawButton(btnX, btnY, btnW, btnH, `Enlist Now`, themeColors[0], themeColors[1], 4, { action: 'join_faction', faction: factionKey })
            );
        } else if (factionKey === 'POLICE' && player.hasBeenPolice && !isMember) {
            // Former police officers cannot rejoin - show official rejection
            UIComponents.setTextStyle({ fill: [255, 120, 120], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
            text("OFFICIAL NOTICE:", btnX + btnW / 2, btnY + 10);
            UIComponents.setTextStyle({ fill: [200, 180, 180], size: STATION_TEXT_SIZE.BODY, align: [CENTER, TOP] });
            text("As a former officer dismissed for criminal conduct,", btnX + btnW / 2, btnY + 32);
            text("you are permanently barred from police service.", btnX + btnW / 2, btnY + 52);
        } else if ((player.playerFaction && player.playerFaction !== factionKey) ||
            (player.isPolice && factionKey !== 'POLICE')) {
            // Button to leave current faction (including police)
            const rejectNames = {
                IMPERIAL: "Imperial Navy",
                SEPARATIST: "Separatist Cause",
                MILITARY: "Military Forces",
                POLICE: "Police Force"
            };
            const currentFaction = player.isPolice ? 'POLICE' : player.playerFaction;
            const rejectLabel = `Reject ${rejectNames[currentFaction] || 'Faction'}`;
            this.factionRecruitmentButtonAreas.push(
                UIComponents.drawButton(btnX, btnY, btnW, btnH, rejectLabel, [120, 40, 40], [255, 150, 150], 4, { action: 'leave_faction', faction: currentFaction })
            );
        } else if (isWanted) {
            UIComponents.setTextStyle({ fill: [255, 150, 150], size: STATION_TEXT_SIZE.BODY, align: [CENTER, CENTER] });
            text("Clear legal status", btnX + btnW / 2, btnY + btnH / 2);
        }
    }

    /**
     * Returns a faction-specific member message.
     * @private
     */
    _getFactionMemberMessage(factionKey) {
        const messages = {
            IMPERIAL: "You serve the Empire with honor",
            SEPARATIST: "You fight for freedom and independence",
            MILITARY: "You serve with honor and distinction",
            POLICE: "You protect the citizens of settled space"
        };
        return messages[factionKey] || "Active faction member";
    }

    /**
     * Simple text wrapping utility.
     * @private
     */
    _wrapText(str, maxWidth, fontSize) {
        const words = str.split(' ');
        let lines = [];
        let currentLine = '';

        textSize(fontSize || STATION_TEXT_SIZE.BODY);
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (textWidth(testLine) > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines.join('\n');
    }

    /**
     * Draws a faction recruitment menu with split layout.
     * @param {Player} player
     * @param {string} factionName - Display name of the faction
     * @param {string} factionKey - Faction key (IMPERIAL, SEPARATIST, MILITARY)
     * @param {Array} themeColors - [[dark], [light]] theme colors
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     * @param {StarSystem} system
     */
    drawFactionRecruitmentMenu(player, factionName, factionKey, themeColors, panelRect, headerHeight, system) {
        this.factionRecruitmentButtonAreas = [];
        if (!player) return;

        // Validate faction key
        if (!FACTION_LORE[factionKey]) {
            console.warn(`Unknown faction: ${factionKey}`);
            return;
        }

        const { x: pX, y: pY, w: pW, h: pH } = panelRect;

        // Layout constants (similar to ship detail screen)
        const LAYOUT = {
            leftWidthRatio: 0.45,
            rightWidthRatio: 0.55,
            leftPadding: 20,
            columnGap: 20,
            topPadding: 15,
            bottomPadding: 20
        };

        // Calculate layout dimensions
        const leftW = pW * LAYOUT.leftWidthRatio;
        const rightW = pW * LAYOUT.rightWidthRatio - LAYOUT.columnGap;
        const leftX = pX + LAYOUT.leftPadding;
        const rightX = pX + leftW + LAYOUT.columnGap;
        const contentY = pY + headerHeight + LAYOUT.topPadding;
        const contentH = pH - headerHeight - LAYOUT.bottomPadding - 50; // Reserve space for back button

        // Draw left panel (ship preview or news)
        this._drawLeftPanel(player, factionKey, themeColors, leftX, leftW, contentY, contentH);

        // Draw right panel (faction info, benefits, status)
        this._drawRightPanel(player, factionKey, factionName, themeColors, rightX, rightW, contentY, contentH, system);

        // Back button (centered at bottom)
        const backBtn = UIComponents.drawCenteredBackButton(pX, pY, pW, pH, { action: 'back' });
        this.factionRecruitmentButtonAreas.push(backBtn);
    }

    /**
     * Draws the Imperial Navy Recruitment Menu.
     * @param {Player} player
     * @param {Object} panelRect
     * @param {number} headerHeight
     * @param {StarSystem} system
     */
    drawImperialRecruitmentMenu(player, panelRect, headerHeight, system) {
        const baseColor = (typeof FACTION_COLORS !== 'undefined') ? FACTION_COLORS.IMPERIAL : [255, 235, 180];
        const darkColor = baseColor.map(c => Math.floor(c * 0.5));
        const lightColor = baseColor;

        this.drawFactionRecruitmentMenu(
            player,
            "Imperial Navy",
            "IMPERIAL",
            [darkColor, lightColor],
            panelRect,
            headerHeight,
            system
        );
    }

    /**
     * Draws the Separatist Forces Recruitment Menu.
     * @param {Player} player
     * @param {Object} panelRect
     * @param {number} headerHeight
     * @param {StarSystem} system
     */
    drawSeparatistRecruitmentMenu(player, panelRect, headerHeight, system) {
        const baseColor = (typeof FACTION_COLORS !== 'undefined') ? FACTION_COLORS.SEPARATIST : [128, 128, 0];
        const darkColor = baseColor.map(c => Math.floor(c * 0.5));
        const lightColor = baseColor;

        this.drawFactionRecruitmentMenu(
            player,
            "Separatist Forces",
            "SEPARATIST",
            [darkColor, lightColor],
            panelRect,
            headerHeight,
            system
        );
    }

    /**
     * Draws the Military Academy Recruitment Menu.
     * @param {Player} player
     * @param {Object} panelRect
     * @param {number} headerHeight
     * @param {StarSystem} system
     */
    drawMilitaryRecruitmentMenu(player, panelRect, headerHeight, system) {
        const baseColor = (typeof FACTION_COLORS !== 'undefined' && FACTION_COLORS.MILITARY)
            ? FACTION_COLORS.MILITARY
            : [100, 120, 140];
        const darkColor = baseColor.map(c => Math.floor(c * 0.5));
        const lightColor = baseColor;

        this.drawFactionRecruitmentMenu(
            player,
            "Military Forces",
            "MILITARY",
            [darkColor, lightColor],
            panelRect,
            headerHeight,
            system
        );
    }

    /**
     * Draws the Police Force Recruitment Menu.
     * @param {Player} player
     * @param {Object} panelRect
     * @param {number} headerHeight
     * @param {StarSystem} system
     */
    drawPoliceRecruitmentMenu(player, panelRect, headerHeight, system) {
        const baseColor = (typeof FACTION_COLORS !== 'undefined') ? FACTION_COLORS.POLICE : [30, 144, 255];
        const darkColor = baseColor.map(c => Math.floor(c * 0.5));
        const lightColor = baseColor;

        this.drawFactionRecruitmentMenu(
            player,
            "Police Force",
            "POLICE",
            [darkColor, lightColor],
            panelRect,
            headerHeight,
            system
        );
    }

    /**
     * Handles recruitment menu button clicks for all factions.
     * @param {number} mx
     * @param {number} my
     * @param {Player} player
     * @param {Function} addMessageFn - Function to add UI messages
     * @returns {Object|null} Action info or null
     */
    handleRecruitmentClicks(mx, my, player, addMessageFn) {
        if (!Array.isArray(this.factionRecruitmentButtonAreas)) return null;

        for (const area of this.factionRecruitmentButtonAreas) {
            if (!UIComponents.isClickInArea(mx, my, area)) continue;

            if (area.action === 'back') {
                return { action: 'back' };
            }

            if (area.action === 'pay_fine' && player) {
                return {
                    action: 'pay_fine',
                    amount: area.amount,
                    faction: area.faction
                };
            }

            if (area.action === 'join_faction' && player) {
                return {
                    action: 'join_faction',
                    faction: area.faction
                };
            }

            if (area.action === 'leave_faction' && player) {
                return {
                    action: 'leave_faction',
                    faction: area.faction
                };
            }
        }

        return null;
    }

    /**
     * Processes a fine payment.
     * @param {Player} player
     * @param {number} amount
     * @param {Function} addMessageFn
     * @returns {boolean} Success
     */
    processFinePayment(player, amount, addMessageFn) {
        if (!player || !player.currentSystem) return false;

        const success = player.spendCredits ? player.spendCredits(amount) : false;
        if (success) {
            player.currentSystem.playerWanted = false;
            player.currentSystem.policeAlertSent = false;
            if (typeof addMessageFn === 'function') {
                addMessageFn(`Fine paid. Legal status cleared in ${player.currentSystem.name}.`, [144, 238, 144]);
            }
            if (soundManager) soundManager.playSound('upgrade');
            if (typeof saveGame === 'function') saveGame();
            return true;
        } else {
            if (typeof addMessageFn === 'function') {
                addMessageFn('Not enough credits to pay fine.', [220, 20, 60]);
            }
            if (soundManager) soundManager.playSound('error');
            return false;
        }
    }

    /**
     * Processes joining a faction.
     * @param {Player} player
     * @param {string} factionKey
     * @param {Function} addMessageFn
     * @returns {boolean} Success
     */
    processJoinFaction(player, factionKey, addMessageFn) {
        if (!player) return false;

        const joined = player.joinFaction ? player.joinFaction(factionKey) : false;
        if (joined) {
            const msgByFaction = {
                IMPERIAL: {
                    text: () => `Welcome to the Imperial Navy! You have been assigned a ${player.factionShip}.`,
                    color: [173, 216, 230]
                },
                SEPARATIST: {
                    text: () => `Fight for freedom! You have been assigned a ${player.factionShip}.`,
                    color: [255, 165, 0]
                },
                MILITARY: {
                    text: () => `Serve with honor! You have been assigned a ${player.factionShip}.`,
                    color: [173, 216, 230]
                },
                POLICE: {
                    text: () => `Welcome to the Police Force! You have been assigned a ${player.factionShip}.`,
                    color: [30, 144, 255]
                }
            };
            const fx = msgByFaction[factionKey] || { text: () => 'Joined faction.', color: [173, 216, 230] };
            if (typeof addMessageFn === 'function') {
                addMessageFn(fx.text(), fx.color);
            }
            if (soundManager) soundManager.playSound('upgrade');
            if (typeof saveGame === 'function') saveGame();
            return true;
        } else {
            const failTextByFaction = {
                IMPERIAL: 'Failed to join Imperial Navy.',
                SEPARATIST: 'Failed to join Separatist Forces.',
                MILITARY: 'Failed to join Military Forces.',
                POLICE: 'Failed to join Police Force.'
            };
            if (typeof addMessageFn === 'function') {
                addMessageFn(failTextByFaction[factionKey] || 'Failed to join faction.', [220, 20, 60]);
            }
            if (soundManager) soundManager.playSound('error');
            return false;
        }
    }

    /**
     * Processes leaving a faction.
     * @param {Player} player
     * @param {string} factionKey
     * @param {Function} addMessageFn
     * @returns {boolean} Success
     */
    processLeaveFaction(player, factionKey, addMessageFn) {
        if (!player) return false;

        const left = player.leaveFaction ? player.leaveFaction() : false;
        if (left) {
            const msgByFaction = {
                IMPERIAL: 'You have left the Imperial Navy.',
                SEPARATIST: 'You have left the Separatist Forces.',
                MILITARY: 'You have left the Military Forces.',
                POLICE: 'You have left the Police Force.'
            };
            if (typeof addMessageFn === 'function') {
                addMessageFn(msgByFaction[factionKey] || 'You have left your faction.', [255, 180, 100]);
            }
            if (soundManager) soundManager.playSound('upgrade');
            if (typeof saveGame === 'function') saveGame();
            return true;
        } else {
            if (typeof addMessageFn === 'function') {
                addMessageFn('Failed to leave faction.', [220, 20, 60]);
            }
            if (soundManager) soundManager.playSound('error');
            return false;
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.UIFactionRecruitment = UIFactionRecruitment;
}
