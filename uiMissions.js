// ****** uiMissions.js ******
// Mission board rendering and mission management UI.
// This file must be loaded BEFORE uiManager.js

/**
 * UIMissions - Handles mission board rendering and mission details display.
 */
class UIMissions {
    constructor() {
        // Mission list button areas
        this.missionListButtonAreas = [];
        
        // Mission detail button areas
        this.missionDetailButtonAreas = {};
        
        // Track inactive mission IDs (completed or expired)
        this.inactiveMissionIds = new Set();
    }

    /**
     * Clears inactive mission IDs.
     */
    clearInactiveMissions() {
        this.inactiveMissionIds.clear();
    }

    /**
     * Marks a mission as inactive.
     * @param {string} missionId
     */
    markMissionInactive(missionId) {
        if (missionId) {
            this.inactiveMissionIds.add(missionId);
        }
    }

    /**
     * Draws a single mission button in the list.
     * @param {Object} config - Button configuration
     * @returns {Object|null} Button area for click detection
     */
    _drawMissionButton(config) {
        const { x, y, w, h, isInactive, isSelected, isActive, missionType, label } = config;
        
        push();
        
        // Determine background color based on state
        let bgColor, strokeColor, textColor;
        
        if (isInactive) {
            bgColor = [40, 40, 40];
            strokeColor = [80, 80, 80];
            textColor = [100, 100, 100];
        } else if (isActive) {
            bgColor = [60, 100, 60];
            strokeColor = [100, 200, 100];
            textColor = [255, 255, 200];
        } else if (isSelected) {
            bgColor = [60, 80, 120];
            strokeColor = [100, 150, 255];
            textColor = [255, 255, 255];
        } else {
            bgColor = [50, 60, 80];
            strokeColor = [100, 120, 160];
            textColor = [220, 220, 220];
        }
        
        // Draw button background
        fill(...bgColor);
        stroke(...strokeColor);
        strokeWeight(1);
        rect(x, y, w, h, 4);
        
        // Draw mission type indicator
        let typeColor;
        if (typeof MISSION_TYPE !== 'undefined') {
            switch (missionType) {
                // Normal legal deliveries -> blue
                case MISSION_TYPE.DELIVERY_LEGAL:
                    typeColor = [100, 150, 255];
                    break;
                // Smuggling / illegal deliveries -> grey
                case MISSION_TYPE.DELIVERY_ILLEGAL:
                    typeColor = [160, 160, 160];
                    break;
                // Bounties: keep pirate/police as orange, aliens explicit green
                case MISSION_TYPE.BOUNTY_PIRATE:
                case MISSION_TYPE.BOUNTY_POLICE:
                    typeColor = [255, 200, 100];
                    break;
                case MISSION_TYPE.BOUNTY_ALIEN:
                    typeColor = [100, 200, 100];
                    break;
                // Assassination -> red
                case MISSION_TYPE.ASSASSINATION:
                    typeColor = [220, 60, 60];
                    break;
                // Sabotage -> yellow
                case MISSION_TYPE.SABOTAGE:
                    typeColor = [255, 255, 100];
                    break;
                case MISSION_TYPE.PATROL:
                    typeColor = [100, 150, 255];
                    break;
                default:
                    typeColor = [180, 180, 180];
            }
        } else {
            typeColor = [180, 180, 180];
        }
        
        // Draw small type indicator bar on left
        noStroke();
        fill(...typeColor);
        rect(x + 3, y + 5, 4, h - 10, 2);
        
        // Draw mission text
        UIComponents.setTextStyle({ fill: textColor, size: 16, align: [LEFT, CENTER] });
        text(label, x + 15, y + h / 2, w - 25);
        
        pop();
        
        // Return clickable area only if not inactive
        if (!isInactive) {
            return { x, y, w, h };
        }
        return null;
    }

    /**
     * Draws the Mission Board screen.
     * @param {Array} missions - Available missions
     * @param {number} selectedIndex - Currently selected mission index
     * @param {Player} player
     * @param {Object} panelRect - {x, y, w, h}
     * @param {number} headerHeight
     * @param {StarSystem} currentSystem
     * @param {Station} currentStation
     */
    drawMissionBoard(missions, selectedIndex, player, panelRect, headerHeight, currentSystem, currentStation) {
        if (!player) return;
        
        this.missionListButtonAreas = [];
        this.missionDetailButtonAreas = {};
        
        const {x: pX, y: pY, w: pW, h: pH} = panelRect;
        
        // Get context
        const activeMission = player.activeMission;
        const selectedMissionFromList = (selectedIndex >= 0 && selectedIndex < missions?.length) ? missions[selectedIndex] : null;
        
        // Determine which mission's details to display
        let missionToShowDetails = null;
        if (activeMission) {
            missionToShowDetails = activeMission;
        } else if (selectedMissionFromList) {
            missionToShowDetails = selectedMissionFromList;
        }
        
        // Layout
        let listW = pW * 0.4, detailX = pX + listW + 10, detailW = pW - listW - 20;
        let cY = pY + headerHeight, cH = pH - headerHeight - 50;
        let btnDetailW = 120, btnDetailH = 30, btnDetailY = pY + pH - btnDetailH - 15;
        
        // List Section background
        UIComponents.drawSectionBG(pX + 5, cY, listW - 10, cH, [30, 40, 50, 200], 5);
        stroke(80, 100, 120);
        strokeWeight(1);
        noFill();
        rect(pX + 5, cY, listW - 10, cH, 5);
        
        if (!Array.isArray(missions) || missions.length === 0) {
            UIComponents.setTextStyle({ fill: [180], size: 18, align: [CENTER, CENTER] });
            text("No missions available.", pX + listW / 2, cY + cH / 2);
        } else {
            let currentY = cY + 10;
            const spacing = 5;
            
            for (let i = 0; i < missions.length; i++) {
                const m = missions[i];
                const isInactive = this.inactiveMissionIds.has(m.id) || 
                                   m.status === 'Completed' || 
                                   m.status === 'Failed';
                
                // Calculate button height based on text
                const missionText = m.getSummary ? m.getSummary() : 'Unknown mission';
                textSize(16);
                const availableWidth = listW - 40;
                const minHeight = 35;
                const heightPerLine = 18;
                // Measure actual wrapped lines using p5 `textWidth` for accurate height
                let textLines = 1;
                try {
                    const words = missionText.split(/\s+/);
                    let cur = '';
                    textLines = 0;
                    for (let w of words) {
                        const test = cur ? (cur + ' ' + w) : w;
                        if (textWidth(test) > availableWidth) {
                            if (cur === '') {
                                // single long word exceeds width; count as one line and reset
                                textLines++;
                                cur = '';
                            } else {
                                // commit current line, start new with the word
                                textLines++;
                                cur = w;
                            }
                        } else {
                            cur = test;
                        }
                    }
                    if (cur) textLines++;
                } catch (e) {
                    // Fallback to rough estimate if textWidth is unavailable
                    const approxCharsPerLine = 30;
                    textLines = Math.ceil(missionText.length / approxCharsPerLine);
                }
                const buttonHeight = Math.max(minHeight, textLines * heightPerLine);
                
                // Skip if would extend beyond panel
                if (currentY + buttonHeight > cY + cH) break;
                
                const buttonArea = this._drawMissionButton({
                    x: pX + 10,
                    y: currentY,
                    w: listW - 20,
                    h: buttonHeight,
                    isInactive: isInactive,
                    isSelected: i === selectedIndex,
                    isActive: activeMission && activeMission.id === m.id,
                    missionType: m.type,
                    label: missionText
                });
                
                if (buttonArea) {
                    this.missionListButtonAreas.push({ ...buttonArea, index: i });
                }
                
                currentY += buttonHeight + spacing;
            }
        }
        
        // Detail Section background
        UIComponents.drawSectionBG(detailX, cY, detailW - 5, cH, [30, 40, 50, 200], 5);
        stroke(80, 100, 120);
        strokeWeight(1);
        noFill();
        rect(detailX, cY, detailW - 5, cH, 5);
        
        if (missionToShowDetails) {
            // Draw mission details
            UIComponents.setTextStyle({ fill: [230], size: 18, align: [LEFT, TOP] });
            textLeading(24);
            const details = missionToShowDetails.getDetails ? missionToShowDetails.getDetails() : "No details available.";
            text(details, detailX + 15, cY + 15, detailW - 30);
            
            // Determine buttons
            let actionBtnX = detailX + detailW / 2 - btnDetailW - 10;
            let backBtnX = detailX + detailW / 2 + 10;
            
            // Back button always available
            this.missionDetailButtonAreas['back'] = UIComponents.drawButton(
                backBtnX, btnDetailY, btnDetailW, btnDetailH,
                "Back", [0, 80, 180], [100, 150, 255], 3
            );
            
            if (activeMission && missionToShowDetails.id === activeMission.id) {
                // Active mission - show Complete or Abandon
                let canCompleteHere = false;
                
                // Check delivery completion conditions
                if (typeof MISSION_TYPE !== 'undefined' &&
                    (activeMission.type === MISSION_TYPE.DELIVERY_LEGAL || activeMission.type === MISSION_TYPE.DELIVERY_ILLEGAL) &&
                    currentSystem && currentStation && 
                    activeMission.destinationSystem === currentSystem.name &&
                    activeMission.destinationStation === currentStation.name &&
                    player.hasCargo && player.hasCargo(activeMission.cargoType, activeMission.cargoQuantity)) {
                    canCompleteHere = true;
                }
                
                // Check bounty mission completion (can complete anywhere once target count met)
                if (typeof MISSION_TYPE !== 'undefined' &&
                    (activeMission.type === MISSION_TYPE.BOUNTY_PIRATE || 
                     activeMission.type === MISSION_TYPE.BOUNTY_POLICE ||
                     activeMission.type === MISSION_TYPE.BOUNTY_ALIEN) &&
                    activeMission.progressCount >= activeMission.targetCount) {
                    canCompleteHere = true;
                }
                
                // Check assassination mission completion (can complete anywhere once target eliminated)
                if (typeof MISSION_TYPE !== 'undefined' &&
                    activeMission.type === MISSION_TYPE.ASSASSINATION &&
                    (activeMission.progressCount >= 1 || activeMission.status === 'Completable')) {
                    canCompleteHere = true;
                }
                
                // Check sabotage mission completion (can complete anywhere once target destroyed)
                if (typeof MISSION_TYPE !== 'undefined' &&
                    activeMission.type === MISSION_TYPE.SABOTAGE &&
                    (activeMission.progressCount >= 1 || activeMission.status === 'Completable')) {
                    canCompleteHere = true;
                }
                
                if (canCompleteHere) {
                    this.missionDetailButtonAreas['complete'] = UIComponents.drawButton(
                        actionBtnX, btnDetailY, btnDetailW, btnDetailH,
                        "Complete", [0, 200, 50], [150, 255, 150], 3
                    );
                } else {
                    this.missionDetailButtonAreas['abandon'] = UIComponents.drawButton(
                        actionBtnX, btnDetailY, btnDetailW, btnDetailH,
                        "Abandon", [200, 50, 50], [255, 150, 150], 3
                    );
                }
            } else if (!activeMission && missionToShowDetails) {
                // Available mission - show Accept
                this.missionDetailButtonAreas['accept'] = UIComponents.drawButton(
                    actionBtnX, btnDetailY, btnDetailW, btnDetailH,
                    "Accept", [0, 180, 0], [150, 255, 150], 3
                );
            } else {
                // Edge case: active mission exists but showing different mission details
                fill(50, 100, 50);
                stroke(100, 150, 100);
                strokeWeight(2);
                rect(actionBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
                UIComponents.setTextStyle({ fill: [150], size: 16, align: [CENTER, CENTER] });
                text("Unavailable", actionBtnX + btnDetailW/2, btnDetailY + btnDetailH/2);
            }
        } else {
            // No mission selected
            UIComponents.setTextStyle({ fill: [180], size: 18, align: [CENTER, CENTER] });
            text("Select a mission from the list for details.", detailX + (detailW - 5) / 2, cY + cH / 2);
            
            // Only show Back button centered
            let backBtnX = pX + pW / 2 - btnDetailW / 2;
            this.missionDetailButtonAreas = {
                'back': UIComponents.drawButton(backBtnX, btnDetailY, btnDetailW, btnDetailH, "Back", [0, 80, 180], [100, 150, 255], 3),
                'accept': null,
                'complete': null,
                'abandon': null
            };
        }
        
        // Active mission info bar at bottom
        if (player.activeMission?.title) {
            fill(0, 0, 0, 180);
            stroke(255, 150, 0);
            strokeWeight(1);
            const ay = pY + pH + 5, ah = 30;
            rect(pX, ay, pW, ah);
            UIComponents.setTextStyle({ fill: [255, 180, 0], size: 14, align: [LEFT, CENTER] });
            text(`Active: ${player.activeMission.title}`, pX + 15, ay + ah / 2, pW - 30);
        }
    }

    /**
     * Handles click on mission list.
     * @param {number} mx
     * @param {number} my
     * @returns {number|null} Index of clicked mission or null
     */
    handleMissionListClick(mx, my) {
        for (const btn of this.missionListButtonAreas) {
            if (UIComponents.isClickInArea(mx, my, btn)) {
                return btn.index;
            }
        }
        return null;
    }

    /**
     * Handles click on mission detail buttons.
     * @param {number} mx
     * @param {number} my
     * @returns {string|null} Action name or null
     */
    handleMissionDetailClick(mx, my) {
        for (const [action, area] of Object.entries(this.missionDetailButtonAreas)) {
            if (area && UIComponents.isClickInArea(mx, my, area)) {
                return action;
            }
        }
        return null;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.UIMissions = UIMissions;
}
