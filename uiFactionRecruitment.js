// ****** uiFactionRecruitment.js ******
// Faction recruitment menus: Imperial, Separatist, Military.
// This file must be loaded BEFORE uiManager.js

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
     * @returns {number} Fine amount in credits
     */
    getFactionFineAmount(factionKey, securityLevel) {
        const baseFines = {
            IMPERIAL: { base: 500, High: 1200, Medium: 800 },
            SEPARATIST: { base: 400, High: 1000, Medium: 650 },
            MILITARY: { base: 600, High: 1500, Medium: 900 },
            POLICE: { base: 300, High: 1000, Medium: 500 }
        };
        const fineData = baseFines[factionKey] || baseFines.POLICE;
        return fineData[securityLevel] || fineData.base;
    }

    /**
     * Returns a faction-specific "you are a member" message.
     * @param {string} factionKey - Faction identifier
     * @returns {string} Member status message
     */
    getFactionMemberMessage(factionKey) {
        const messages = {
            IMPERIAL: "You serve the Empire with honor",
            SEPARATIST: "You fight for freedom and independence",
            MILITARY: "You serve with honor and distinction",
            POLICE: "You are a member of the Police Force"
        };
        return messages[factionKey] || "You are a faction member";
    }

    /**
     * Draws a faction recruitment menu.
     * @param {Player} player
     * @param {string} factionName - Display name of the faction
     * @param {string} factionKey - Faction key (IMPERIAL, SEPARATIST, MILITARY)
     * @param {Array} themeColors - [[dark], [light]] theme colors
     * @param {string} tagline - Faction tagline
     * @param {string} bountyDescription - Description of faction bounties
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     * @param {StarSystem} system
     */
    drawFactionRecruitmentMenu(player, factionName, factionKey, themeColors, tagline, bountyDescription, panelRect, headerHeight, system) {
        this.factionRecruitmentButtonAreas = [];
        if (!player) return;
        
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        const contentY = pY + headerHeight + 10;
        
        const isWanted = system?.isPlayerWanted ? system.isPlayerWanted() : false;
        const canJoin = player.canJoinFaction ? player.canJoinFaction(factionKey) : false;
        
        // Display faction info
        UIComponents.setTextStyle({ fill: themeColors[1], size: 24, align: [CENTER, TOP] });
        text(`${factionName} Recruitment Office`, pX + pW / 2, contentY);
        
        UIComponents.setTextStyle({ fill: 255, size: 18 });
        text(tagline, pX + pW / 2, contentY + 40);
        
        // Show legal status
        UIComponents.setTextStyle({ fill: 255, size: 20 });
        text(`Legal Status in ${system?.name || 'Unknown'} System: `, pX + pW / 2, contentY + 80);
        const statusText = isWanted ? "WANTED" : "CLEAN";
        const statusColor = isWanted ? [255, 50, 50] : [50, 255, 50];
        UIComponents.setTextStyle({ fill: statusColor, size: 24 });
        text(statusText, pX + pW / 2, contentY + 110);
        
        // Show current faction status
        if (player.playerFaction) {
            UIComponents.setTextStyle({ fill: [255, 200, 100], size: 18 });
            text(`Current Faction: ${player.playerFaction}`, pX + pW / 2, contentY + 140);
        }
        
        // Display bounty information if member
        if (player.playerFaction === factionKey) {
            UIComponents.setTextStyle({ fill: [100, 255, 100], size: 18 });
            text(bountyDescription, pX + pW / 2, contentY + (player.playerFaction ? 170 : 150));
        }
        
        // Show faction kill progress
        try {
            const progress = player.getFactionKillsProgress && player.getFactionKillsProgress(factionKey);
            if (progress) {
                UIComponents.setTextStyle({ 
                    fill: [themeColors[1][0] * 0.9, themeColors[1][1] * 0.9, themeColors[1][2] * 0.9], 
                    size: 16, 
                    align: [CENTER, TOP] 
                });
                if (progress.nextThreshold) {
                    text(`${factionKey} Kills: ${progress.kills} — ${progress.killsToNext} to ${progress.nextRank}`, pX + pW / 2, contentY + 240);
                } else {
                    text(`${factionKey} Kills: ${progress.kills} — Max Rank`, pX + pW / 2, contentY + 240);
                }
            }
        } catch (e) { /* fail silently */ }
        
        let btnW = pW * 0.5, btnH = 45;
        let btnX = pX + pW / 2 - btnW / 2;
        let btnY1 = contentY + (player.playerFaction === factionKey ? 200 : (player.playerFaction ? 170 : 150));
        
        // Fine payment if wanted
        if (isWanted) {
            let fineAmount = this.getFactionFineAmount(factionKey, system?.securityLevel);
            this.factionRecruitmentButtonAreas.push(
                UIComponents.drawButton(btnX, btnY1, btnW, btnH, `Pay Fine (${fineAmount} cr)`, [0, 180, 0], [100, 255, 100], 5, {action: 'pay_fine', amount: fineAmount, faction: factionKey})
            );
            btnY1 += btnH + 20;
        }
        
        // Join faction button or status message
        if (canJoin && !isWanted) {
            this.factionRecruitmentButtonAreas.push(
                UIComponents.drawButton(btnX, btnY1, btnW, btnH, `Join ${factionName}`, themeColors[0], themeColors[1], 5, {action: 'join_faction', faction: factionKey})
            );
        } else if (player.playerFaction === factionKey) {
            UIComponents.setTextStyle({ fill: 255, size: 18, align: [CENTER, CENTER] });
            text(this.getFactionMemberMessage(factionKey), pX + pW / 2, btnY1 + btnH / 2);
        } else if (player.playerFaction && player.playerFaction !== factionKey) {
            UIComponents.setTextStyle({ fill: [255, 150, 150], size: 16, align: [CENTER, CENTER] });
            text("You must leave your current faction first", pX + pW / 2, btnY1 + btnH / 2);
        } else if (isWanted) {
            UIComponents.setTextStyle({ fill: [255, 150, 150], size: 16, align: [CENTER, CENTER] });
            text("Clear your legal status to join", pX + pW / 2, btnY1 + btnH / 2);
        }
        
        // Back button
        const backW = 100, backH = 30;
        const backX = pX + pW / 2 - backW / 2;
        const backY = pY + pH - backH - 15;
        const backBtn = UIComponents.drawButton(backX, backY, backW, backH, "Back", [180, 0, 0], [255, 150, 150], 5, {action: 'back'});
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
        this.drawFactionRecruitmentMenu(
            player,
            "Imperial Navy",
            "IMPERIAL",
            [[120, 100, 50], [220, 190, 90]],
            "Serve the Empire. Restore order to the galaxy.",
            "Active Bounty: 2,000 cr per Separatist killed",
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
        this.drawFactionRecruitmentMenu(
            player,
            "Separatist Forces",
            "SEPARATIST",
            [[100, 50, 0], [200, 100, 0]],
            "Fight for freedom. Break the chains of tyranny.",
            "Active Bounty: 2,000 cr per Imperial killed",
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
        this.drawFactionRecruitmentMenu(
            player,
            "Military Forces",
            "MILITARY",
            [[50, 60, 70], [100, 120, 140]],
            "Honor, duty, excellence. Defend the frontier.",
            "Active Bounty: 4,000 cr per Alien killed, 1,000 cr per Pirate killed",
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
            if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
            if (typeof saveGame === 'function') saveGame();
            return true;
        } else {
            if (typeof addMessageFn === 'function') {
                addMessageFn('Not enough credits to pay fine.', [220, 20, 60]);
            }
            if (typeof soundManager !== 'undefined') soundManager.playSound('error');
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
                }
            };
            const fx = msgByFaction[factionKey] || { text: () => 'Joined faction.', color: [173, 216, 230] };
            if (typeof addMessageFn === 'function') {
                addMessageFn(fx.text(), fx.color);
            }
            if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
            if (typeof saveGame === 'function') saveGame();
            return true;
        } else {
            const failTextByFaction = {
                IMPERIAL: 'Failed to join Imperial Navy.',
                SEPARATIST: 'Failed to join Separatist Forces.',
                MILITARY: 'Failed to join Military Forces.'
            };
            if (typeof addMessageFn === 'function') {
                addMessageFn(failTextByFaction[factionKey] || 'Failed to join faction.', [220, 20, 60]);
            }
            if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            return false;
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.UIFactionRecruitment = UIFactionRecruitment;
}
