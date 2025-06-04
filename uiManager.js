// ===== UI MANAGER =====
class UIManager {
    constructor() {
        this._initializeState();
        this._initializeConfig();
        this.setPanelDefaults();
    }

    // === INITIALIZATION ===
    _initializeState() {
        // Core UI state
        this.selectedSystemIndex = -1;
        this.selectedWeaponSlot = 0;
        this.weaponSlotButtons = [];
        this.inactiveMissionIds = new Set();
        
        // Button areas
        this.marketButtonAreas = [];
        this.galaxyMapNodeAreas = [];
        this.jumpButtonArea = {};
        this.stationMenuButtonAreas = [];
        this.missionListButtonAreas = [];
        this.missionDetailButtonAreas = {};
        this.policeButtonAreas = [];
        this.marketBackButtonArea = {};
        this.shipyardListAreas = [];
        this.shipyardDetailButtons = {};
        this.upgradeListAreas = [];
        this.upgradeDetailButtons = {};
        this.repairsFullButtonArea = {};
        this.repairsHalfButtonArea = {};
        this.repairsBackButtonArea = {};
        this.repairsBodyguardsButtonArea = {};
        this.protectionServicesButtons = [];
        this.shipyardScrollbarArea = null;
        this.upgradeScrollbarArea = null;
    }

    _initializeConfig() {
        // Minimap config
        Object.assign(this, {
            minimapSize: 200, minimapMargin: 15, minimapX: 0, minimapY: 0,
            minimapWorldViewRange: 5000, minimapScale: 1
        });
        
        // Shop config
        this.shipyardScrollOffset = 0;
        this.shipyardScrollMax = 0;
        this.upgradeScrollOffset = 0;
        this.upgradeScrollMax = 0;
        
        // FPS tracking
        Object.assign(this, {
            fpsValues: [], fpsMaxSamples: 30, fpsUpdateInterval: 10,
            fpsFrameCount: 0, fpsAverage: 0
        });
        
        // Message system
        Object.assign(this, {
            messages: [], messageDisplayTime: 4000, maxMessagesToShow: 4,
            marketButtonHeld: null, lastButtonAction: 0, buttonRepeatDelay: 150
        });
        
        // Battle indicators
        Object.assign(this, {
            battleIndicators: [], battleIndicatorDuration: 1200,
            battleIndicatorLineLength: 25, battleIndicatorEdgeBuffer: 10
        });
    }

    // === CORE UI UTILITIES ===
    setPanelDefaults() {
        this.panelX = () => width * 0.1;
        this.panelY = () => height * 0.1;
        this.panelW = () => width * 0.8;
        this.panelH = () => height * 0.8;
    }

    getPanelRect() {
        return { x: this.panelX(), y: this.panelY(), w: this.panelW(), h: this.panelH() };
    }

    drawPanelBG(fillCol, strokeCol) {
        const {x, y, w, h} = this.getPanelRect();
        fill(...fillCol); stroke(...strokeCol); rect(x, y, w, h, 10);
    }

    drawStationHeader(title, station, player, system) {
        if (!station || !player) return 0;
        const {x: pX, y: pY, w: pW} = this.getPanelRect();
        const headerHeight = 100;
        
        fill(255); noStroke(); textFont(font);
        textSize(30); textAlign(CENTER, TOP);
        text(title, pX + pW/2, pY + 20);
        
        textSize(20); textAlign(LEFT, TOP);
        const stationName = station.name || "Unknown Station";
        const systemName = system?.name || "Unknown System";
        text(`${stationName} - ${systemName}`, pX+20, pY + 20);
        
        const econ = system?.securityLevel || "Unknown";
        const tech = system?.techLevel || "?";
        const econType = system?.economyType || "Unknown";
        text(`${econ}   |   Tech: ${tech}   |   ${econType}`, pX +20, pY + 45);
        
        textAlign(RIGHT, TOP);
        text(`Credits: ${Math.floor(player.credits)}`, pX + pW - 30, pY + 20);
        text(`Cargo: ${Math.floor(player.getCargoAmount())}/${player.cargoCapacity}`, pX + pW - 30, pY + 45);

        return headerHeight;
    }

    _drawButton(x, y, w, h, label, fillCol, strokeCol, radius = 5, extra = {}) {
        if (typeof label === 'string' && label.trim().toLowerCase() === 'back') {
            fillCol = [180, 0, 0]; strokeCol = [255, 150, 150];
        }
        fill(...fillCol); stroke(...strokeCol); strokeWeight(2);
        rect(x, y, w, h, radius);
        fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(22);
        text(label, x + w / 2, y + h / 2);
        return Object.assign({ x, y, w, h }, extra);
    }

    isClickInArea(mx, my, area) {
        return area && area.w > 0 && area.h > 0 && mx > area.x && mx < area.x + area.w && my > area.y && my < area.y + area.h;
    }

    /** 
     * Consolidated button action handler to reduce repetitive click handling patterns
     * @param {number} mx - Mouse X coordinate
     * @param {number} my - Mouse Y coordinate  
     * @param {Array} buttonAreas - Array of button area objects
     * @param {Object} handlers - Object mapping actions/states to handler functions
     * @returns {boolean} - True if a button was clicked and handled
     */
    _handleButtonAreaClicks(mx, my, buttonAreas, handlers) {
        for (const btn of buttonAreas) {
            if (this.isClickInArea(mx, my, btn)) {
                const actionKey = btn.action || btn.state;
                const handler = handlers[actionKey];
                
                if (handler && typeof handler === 'function') {
                    return handler(btn);
                }
                
                console.warn(`UIManager: No handler for action/state: ${actionKey}`);
                return true; // Still consumed the click
            }
        }
        return false;
    }

    /**
     * Standardized transaction handler for purchases/payments
     * @param {number} cost - Cost of the transaction
     * @param {Function} onSuccess - Function to call on successful payment
     * @param {Object} options - Additional options (player, messages, sounds, etc.)
     * @returns {boolean} - True if transaction was successful
     */
    _performTransaction(cost, onSuccess, options = {}) {
        const {
            player,
            successMessage,
            failureMessage = "Not enough credits!",
            successColor = [150, 255, 150],
            failureColor = [255, 100, 100],
            soundEffect = 'upgrade',
            autoSave = true
        } = options;

        if (!player) {
            console.warn("UIManager: No player provided for transaction");
            return false;
        }

        if (player.credits >= cost) {
            player.spendCredits(cost);
            
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess();
            }
            
            if (successMessage) {
                this.addMessage(successMessage, successColor);
            }
            
            if (typeof soundManager !== 'undefined') {
                soundManager.playSound(soundEffect);
            }
            
            if (autoSave && typeof saveGame === 'function') {
                saveGame();
            }
            
            return true;
        } else {
            this.addMessage(failureMessage, failureColor);
            if (typeof soundManager !== 'undefined') {
                soundManager.playSound('error');
            }
            return false;
        }
    }

    /**
     * Draws standardized back button with consistent positioning and styling
     * @param {number} customY - Optional custom Y position
     * @returns {Object} - Button area object for click detection
     */
    _drawStandardBackButton(customY = null) {
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        const backW = 100, backH = 30;
        const backX = pX + pW/2 - backW/2;
        const backY = customY || (pY + pH - backH - 15);
        
        return this._drawButton(backX, backY, backW, backH, "Back", [180,0,0], [255,150,150]);
    }

    /** Helper method to draw a scrollbar with consistent styling */
    _drawScrollbar(barX, barY, barW, barH, scrollOffset, scrollMax, visibleRows, totalRows, strokeColor = [120, 180, 255]) {
        if (scrollMax <= 0) return null;
        
        // Draw scrollbar track
        fill(60, 60, 100);
        stroke(strokeColor[0], strokeColor[1], strokeColor[2]);
        rect(barX, barY, barW, barH, 6);
        
        // Draw scrollbar handle
        let handleH = max(30, barH * (visibleRows / totalRows));
        let handleY = barY + (barH - handleH) * (scrollOffset / scrollMax);
        fill(180, 180, 220);
        noStroke();
        rect(barX + 1, handleY, barW - 2, handleH, 6);
        
        // Return scrollbar area for interaction handling
        return {
            x: barX,
            y: barY,
            w: barW,
            h: barH,
            handleY: handleY,
            handleH: handleH
        };
    }

    // === BATTLE INDICATORS ===
    trackCombatSound(x, y, soundType) {
        const combatSounds = ['laser', 'explosion', 'hit', 'shield', 'missileLaunch', 'beam', 'turret'];
        if (!combatSounds.includes(soundType)) return;

        this.battleIndicators.push({
            x: x, y: y,
            timestamp: millis(),
            type: soundType
        });
        this.cleanupBattleIndicators();
    }

    cleanupBattleIndicators() {
        const now = millis();
        this.battleIndicators = this.battleIndicators.filter(indicator =>
            now - indicator.timestamp < this.battleIndicatorDuration
        );
    }

    drawBattleIndicators(player) {
        if (!player?.pos || this.battleIndicators.length === 0) return;

        this.cleanupBattleIndicators();
        if (this.battleIndicators.length === 0) return;

        push();
        const screenCenterX = width / 2;
        const screenCenterY = height / 2;
        const edgeBuffer = this.battleIndicatorEdgeBuffer;

        const viewRect = {
            left: player.pos.x - screenCenterX,
            right: player.pos.x + screenCenterX,
            top: player.pos.y - screenCenterY,
            bottom: player.pos.y + screenCenterY
        };

        for (const indicator of this.battleIndicators) {
            const isOffScreen = (
                indicator.x < viewRect.left || indicator.x > viewRect.right ||
                indicator.y < viewRect.top || indicator.y > viewRect.bottom
            );

            if (!isOffScreen) continue;

            const dx = indicator.x - player.pos.x;
            const dy = indicator.y - player.pos.y;
            const angleToEvent = atan2(dy, dx);

            let edgeX, edgeY;
            const h = height - 2 * edgeBuffer;
            const w = width - 2 * edgeBuffer;

            // Calculate intersection with screen edges
            let tVert = Infinity;
            if (abs(cos(angleToEvent)) > 1e-6) {
                tVert = (cos(angleToEvent) > 0 ? w / 2 : -w / 2) / cos(angleToEvent);
            }
            const yAtScreenVertEdge = screenCenterY + sin(angleToEvent) * tVert;

            let tHoriz = Infinity;
            if (abs(sin(angleToEvent)) > 1e-6) {
                tHoriz = (sin(angleToEvent) > 0 ? h / 2 : -h / 2) / sin(angleToEvent);
            }
            const xAtScreenHorizEdge = screenCenterX + cos(angleToEvent) * tHoriz;

            // Choose the closer intersection point
            if (abs(yAtScreenVertEdge - screenCenterY) <= h / 2 && tVert < tHoriz) {
                edgeX = (cos(angleToEvent) > 0 ? width - edgeBuffer : edgeBuffer);
                edgeY = constrain(yAtScreenVertEdge, edgeBuffer, height - edgeBuffer);
            } else if (abs(xAtScreenHorizEdge - screenCenterX) <= w / 2) {
                edgeY = (sin(angleToEvent) > 0 ? height - edgeBuffer : edgeBuffer);
                edgeX = constrain(xAtScreenHorizEdge, edgeBuffer, width - edgeBuffer);
            } else {
                if (abs(cos(angleToEvent)) > abs(sin(angleToEvent))) {
                    edgeX = (cos(angleToEvent) > 0 ? width - edgeBuffer : edgeBuffer);
                    edgeY = constrain(screenCenterY + tan(angleToEvent) * (edgeX - screenCenterX), edgeBuffer, height - edgeBuffer);
                } else {
                    edgeY = (sin(angleToEvent) > 0 ? height - edgeBuffer : edgeBuffer);
                    edgeX = constrain(screenCenterX + (edgeY - screenCenterY) / tan(angleToEvent), edgeBuffer, width - edgeBuffer);
                }
            }
            
            edgeX = constrain(edgeX, edgeBuffer, width - edgeBuffer);
            edgeY = constrain(edgeY, edgeBuffer, height - edgeBuffer);

            // Draw indicator with fade-out
            const age = millis() - indicator.timestamp;
            const opacity = map(age, 0, this.battleIndicatorDuration, 220, 0);
            if (opacity <= 0) continue;

            strokeWeight(2);
            stroke(255, 255, 255, opacity);
            const lineHalfLength = this.battleIndicatorLineLength / 2;

            if (edgeX <= edgeBuffer + 1 || edgeX >= width - edgeBuffer - 1) {
                line(edgeX, edgeY - lineHalfLength, edgeX, edgeY + lineHalfLength);
            } else if (edgeY <= edgeBuffer + 1 || edgeY >= height - edgeBuffer - 1) {
                line(edgeX - lineHalfLength, edgeY, edgeX + lineHalfLength, edgeY);
            }
        }
        pop();
    }


    // === HUD DRAWING ===
    drawHUD(player) {
        if (!player) { console.warn("drawHUD: Player object missing"); return; }
        
        this.drawBattleIndicators(player);
        const hudData = this._getHUDData(player);
        
        push();
        this._drawMainHUDBar(hudData);
        this._drawStatusBars(player);
        this._drawWeaponSelector(player);
        pop();
    }

    _getHUDData(player) {
        const sys = player.currentSystem;
        return {
            systemName: sys?.name || 'N/A',
            systemType: sys?.economyType || 'Unknown',
            secLevel: sys?.securityLevel || 'Unknown',
            techLevel: sys?.techLevel || '?',
            cargoAmt: player.getCargoAmount() ?? 0,
            cargoCap: player.cargoCapacity ?? 0,
            credits: player.credits ?? 0,
            eliteRating: player.getEliteRating(),
            isWanted: sys?.isPlayerWanted(),
            isPolice: player.isPolice
        };
    }

    _drawMainHUDBar(data) {
        fill(0, 180, 0, 150); noStroke(); rect(0, 0, width, 40);
        
        // System info (left)
        fill(255); textFont(font); textSize(20); textAlign(LEFT, CENTER);
        text(`${data.systemName}            ${data.systemType}   Tech: ${data.techLevel}   ${data.secLevel}`, 10, 20);
        
        // Status (center)
        textAlign(CENTER, CENTER);
        fill(data.isWanted ? [255, 0, 0] : [255]);
        const status = data.isWanted ? "Wanted" : (data.isPolice ? "POLICE" : "LEGAL");
        text(`${data.eliteRating} - ${status}`, width/2, 20);
        
        // Credits and cargo (right)
        fill(255); textAlign(RIGHT, CENTER);
        text(`Cargo: ${data.cargoAmt}/${data.cargoCap}   Credits: ${data.credits}`, width-300, 20);
    }

    _drawStatusBars(player) {
        const config = { barWidth: 140, barHeight: 14, barX: width - 150, barMiddleY: 20 };
        
        if (player.maxShield > 0) {
            this._drawStatusBar('Shield', player.shield, player.maxShield, 
                config.barX, config.barMiddleY - config.barHeight - 2, config.barWidth, config.barHeight,
                [20, 20, 60], [50, 100, 255], [100, 150, 255]);
        }
        
        this._drawStatusBar('Hull', player.hull, player.maxHull,
            config.barX, config.barMiddleY + 2, config.barWidth, config.barHeight,
            [60, 20, 20], [255, 50, 50], [255, 100, 100]);
    }

    _drawStatusBar(label, current, max, x, y, w, h, bgColor, fillColor, strokeColor) {
        // Background
        fill(...bgColor); rect(x, y, w, h);
        
        // Fill bar
        const percent = current / max;
        fill(...fillColor); rect(x, y, w * percent, h);
        
        // Border
        stroke(...strokeColor); noFill(); rect(x, y, w, h);
        
        // Text label
        fill(255); noStroke(); textFont(font); textAlign(RIGHT, CENTER); textSize(20);
        text(`${label}: ${Math.floor(current)}/${max}`, x - 10, y + h/2);
    }

    _drawWeaponSelector(player) {
        if (!player?.weapons || player.weapons.length === 0) return;
        
        const weaponBarY = 45;
        const weaponBarH = 24;
        
        push();
        fill(0, 50, 80, 150); noStroke();
        rect(0, weaponBarY, width, weaponBarH);
        
        textAlign(LEFT, CENTER); textSize(20);
        let xPos = 10;
        
        player.weapons.forEach((weapon, index) => {
            const isSelected = (index === player.weaponIndex);
            const slotPadding = 10;
            const slotText = `${index+1}: ${weapon.name}`;
            const textW = textWidth(slotText);
            const slotW = textW + slotPadding * 2;
            
            fill(isSelected ? 0 : 0, isSelected ? 100 : 80, isSelected ? 180 : 120, isSelected ? 200 : 120);
            rect(xPos, weaponBarY + 3, slotW, weaponBarH - 6, 5);
            
            fill(isSelected ? 255 : 200, isSelected ? 255 : 200, isSelected ? 100 : 200);
            text(slotText, xPos + slotPadding, weaponBarY + weaponBarH/2);
            
            // Cooldown bar
            if (isSelected && player.fireCooldown > 0 && player.fireRate > 0) {
                let c = constrain(map(player.fireCooldown, player.fireRate, 0, 0, 1), 0, 1);
                fill(255, 50, 50, 200); noStroke();
                rect(xPos, weaponBarY + weaponBarH - 3, slotW * c, 3);
            }
            
            xPos += slotW + 5;
        });
        
        // Active mission display
        if (player.activeMission?.title) {
            const missionText = `Mission: ${player.activeMission.title}`;
            const missionPadding = 10;
            textSize(20);
            const missionTextW = textWidth(missionText);
            const missionBoxW = missionTextW + missionPadding * 2;
            const missionBoxX = width - missionBoxW - 10;
            
            fill(0, 80, 140, 200); stroke(0, 100, 180); strokeWeight(1);
            rect(missionBoxX, weaponBarY + 3, missionBoxW, weaponBarH - 6, 5);
            
            fill(255, 180, 0); noStroke(); textAlign(LEFT, CENTER);
            text(missionText, missionBoxX + missionPadding, weaponBarY + weaponBarH/2);
            
            fill(255, 200, 0);
            circle(missionBoxX + 6, weaponBarY + weaponBarH/2, 5);
        }

        // Autopilot indicator
        if (player.autopilotEnabled) {
            const target = player.autopilotTarget === 'station' ? 'Station' : 'Jump Zone';
            const autopilotY = 45 + 24 + 5;
            
            fill(40, 80, 120, 200); noStroke();
            rect(0, autopilotY, width, 20);
            
            textAlign(CENTER, CENTER); textSize(20); fill(255, 255, 100);
            text(`Autopilot Engaged: ${target} — [${player.autopilotTarget === 'station' ? 'H' : 'J'} to disable]`, width/2, autopilotY + 10);
        }
        
        pop();
    }

    // === STATION MENUS ===
    drawStationMainMenu(station, player) {
        this.stationMenuButtonAreas = [];
        if (!station || !player) { console.warn("drawStationMainMenu missing station or player"); return; }
        
        const menuOptions = [
            { text: "Commodity Market", state: "VIEWING_MARKET" },
            { text: "Mission Board", state: "VIEWING_MISSIONS" },
            { text: "Shipyard", state: "VIEWING_SHIPYARD" },
            { text: "Upgrades", state: "VIEWING_UPGRADES" },
            { text: "Repairs", state: "VIEWING_REPAIRS" },
            { text: "Protection Services", state: "VIEWING_PROTECTION" },
            { text: "Police Station", state: "VIEWING_POLICE" },
            { text: "Undock", action: "UNDOCK" }
        ];
        
        this._drawStationMenu("Station Services", [20,20,50,220], [100,100,255], 
            menuOptions, this.stationMenuButtonAreas, station, player);
    }

    _drawStationMenu(title, bgColor, borderColor, menuOptions, buttonArray, station, player) {
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(bgColor, borderColor);
        const system = galaxy?.getCurrentSystem();
        const headerHeight = this.drawStationHeader(title, station, player, system);
        
        textFont(font);
        const btnW = pW * 0.6, btnH = 45;
        const btnX = pX + pW/2 - btnW/2;
        const btnSY = pY + headerHeight;
        const btnSp = btnH + 15;
        
        menuOptions.forEach((opt, i) => {
            const btnY = btnSY + i * btnSp;
            const area = this._drawButton(btnX, btnY, btnW, btnH, opt.text, [50,50,90], [150,150,200]);
            if (opt.state) area.state = opt.state;
            if (opt.action) area.action = opt.action;
            buttonArray.push(area);
        });
        pop();
    }

    drawRepairsMenu(player) {
        this.repairsFullButtonArea = {};
        this.repairsHalfButtonArea = {};
        this.repairsBackButtonArea = {};
        this.repairsBodyguardsButtonArea = {};
        
        if (!player) return;
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([60,30,30,230], [255,180,100]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Ship Repairs", station, player, system);
        
        // Ship repair info and buttons
        const repairData = this._getRepairData(player);
        const btnConfig = { w: pW*0.5, h: 45, x: pX+pW/2-pW*0.25 };
        
        fill(220); textSize(20); textAlign(CENTER,TOP);
        text(`Hull: ${floor(player.hull)} / ${player.maxHull}`, pX+pW/2, pY+headerHeight+10);
        
        const btnY1 = pY+headerHeight+60;
        this.repairsFullButtonArea = this._drawButton(btnConfig.x, btnY1, btnConfig.w, btnConfig.h, 
            `Full Repair (${repairData.fullCost} cr)`, [0,180,0], [100,255,100]);
        this.repairsHalfButtonArea = this._drawButton(btnConfig.x, btnY1+btnConfig.h+20, btnConfig.w, btnConfig.h, 
            `50% Repair (${repairData.halfCost} cr)`, [180,180,0], [220,220,100]);
        
        // Bodyguard repairs
        this._drawBodyguardRepairs(player, btnConfig, btnY1+btnConfig.h*2+40);
        
        // Back button using standardized helper
        this.repairsBackButtonArea = this._drawStandardBackButton();
        pop();
    }

    _getRepairData(player) {
        const missing = player.maxHull - player.hull;
        const halfRepair = Math.min(missing, Math.ceil(player.maxHull / 2));
        return {
            fullCost: Math.floor(missing * 10),
            halfCost: Math.floor(halfRepair * 7)
        };
    }

    _drawBodyguardRepairs(player, btnConfig, startY) {
        const bodyguardInfo = player.getDamagedBodyguardsInfo();
        if (bodyguardInfo.count > 0) {
            const {x: pX, w: pW} = this.getPanelRect();
            
            // Divider line
            strokeWeight(1); stroke(255, 180, 100);
            line(pX + 50, startY - 20, pX + pW - 50, startY - 20);
            
            noStroke(); fill(220); textSize(20); textAlign(CENTER, TOP);
            this.repairsBodyguardsButtonArea = this._drawButton(
                btnConfig.x, startY, btnConfig.w, btnConfig.h, 
                `Repair All Guards (${bodyguardInfo.totalCost} cr)`, 
                [0,120,180], [100,200,255]
            );
        }
    }

    drawPoliceMenu(player) {
        this.policeButtonAreas = [];
        if (!player) return;
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([30,30,60,230], [100,100,255]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Police Station", station, player, system);
        
        const policeData = this._getPoliceData(player, system);
        const contentY = pY + headerHeight + 10;
        
        // Status display
        fill(255); textSize(20); textAlign(CENTER, TOP);
        text(`Legal Status in ${system?.name || 'Unknown'} System: `, pX+pW/2, contentY);
        fill(...policeData.statusColor); textSize(24);
        text(policeData.statusText, pX+pW/2, contentY+30);
        
        if (player.hasBeenPolice) {
            fill(255, 200, 100); textSize(16);
            text("Fines trippled for former police officer", pX + pW/2, contentY + 60);
        }
        
        // Buttons
        const btnConfig = { w: pW*0.5, h: 45, x: pX+pW/2-pW*0.25 };
        const btnY1 = contentY + (player.hasBeenPolice ? 90 : 70);
        
        if (policeData.isWanted) {
            this.policeButtonAreas.push(
                this._drawButton(btnConfig.x, btnY1, btnConfig.w, btnConfig.h, 
                    `Pay Fine (${policeData.fineAmount} cr)`, [0,180,0], [100,255,100], 5, 
                    {action:'pay_fine', amount:policeData.fineAmount})
            );
        }
        
        const btnY2 = btnY1 + btnConfig.h + 20;
        if (!player.isPolice) {
            this.policeButtonAreas.push(
                this._drawButton(btnConfig.x, btnY2, btnConfig.w, btnConfig.h, 
                    "Join Police Force", [50,50,180], [100,100,255], 5, {action:'join_police'})
            );
        } else {
            fill(255); textSize(18); textAlign(CENTER,CENTER);
            text("You are a member of the Police Force", pX+pW/2, btnY2+btnConfig.h/2);
        }
        
        // Back button
        const backConfig = { w: 100, h: 30 };
        this.policeButtonAreas.push(
            this._drawButton(pX+pW/2-backConfig.w/2, pY+pH-backConfig.h-15, 
                backConfig.w, backConfig.h, "Back", [180,180,0], [220,220,100], 5, {action:'back'})
        );
        pop();
    }

    _getPoliceData(player, system) {
        const isWanted = system?.isPlayerWanted();
        let fineAmount = 300;
        if (system?.securityLevel === 'High') fineAmount = 1000;
        else if (system?.securityLevel === 'Medium') fineAmount = 500;
        if (player.hasBeenPolice) fineAmount *= 3;
        
        return {
            isWanted,
            statusText: isWanted ? "WANTED" : "CLEAN",
            statusColor: isWanted ? [255, 50, 50] : [50, 255, 50],
            fineAmount
        };
    }

    /** Draws the Commodity Market screen (when state is VIEWING_MARKET) */
    drawMarketScreen(market, player) {
        if (!market || !player || typeof market.getPrices !== 'function') { /* Draw error */ return; }
        market.updatePlayerCargo(player.cargo);
        const commodities = market.getPrices();
        this.marketButtonAreas = [];
        this.marketBackButtonArea = {}; // Clear areas

        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([50,20,20,220], [255,100,100]);
        
        // Use the standardized header
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Commodity Market", station, player, system);
        
        // Table setup - adjusted Y position
        let sY = pY+headerHeight+40, tW = pW-60, cols = 8, cW = tW/cols, sX = pX+30;
        
        textAlign(CENTER,CENTER); textSize(20); fill(200);
     
        // Column headers
        text("Commodity", sX+cW*0.3, sY);
        text("Buy", sX+cW*1.8, sY);
        text("Sell", sX+cW*2.8, sY);
        text("Cargo Hold", sX+cW*3.8, sY);

        // Row setup
        sY += 30;
        const rowH = 30;
        const btnW = cW*0.65;
        const btnH = rowH*0.8;

        // --- Price Indicator Constants ---
        const indicatorW = 15; // Width of the indicator bar area
        const indicatorMaxH = rowH * 0.6; // Max height of the bar
        const indicatorYOffset = (rowH - indicatorMaxH) / 2; // Center vertically
        const maxDeviation = 0.5; // Max price deviation (e.g., 50%) for full bar height

        // Draw commodity rows
        (commodities || []).forEach((comm, i) => {
            if (!comm) return;
            let yP = sY+i*rowH;
            let tY = yP+rowH/2;

            // --- Alternating Row Background ---
            if (i % 2 === 0) {
                fill(0, 0, 0, 100); // Increased alpha
            } else {
                fill(80, 80, 80, 100); // Increased alpha and brightness difference
            }
            noStroke();
            rect(sX, yP, tW, rowH); // Draw background for the data part of the row
            // --- End Alternating Background ---

            // Check if this is an illegal good in a non-Anarchy system
            const isIllegalInSystem = !comm.isLegal && system?.securityLevel !== 'Anarchy';
            
            // Commodity name and prices - grayed out if illegal goods in non-Anarchy system
            if (isIllegalInSystem) {
                fill(120); // Gray color for illegal goods
            } else {
                fill(255); // Normal white color
            }
            
            textAlign(LEFT, CENTER);
            text(comm.name||'?', sX+10, tY, cW-15);
            
            // Add "ILLEGAL" indicator for illegal goods
            if (!comm.isLegal) {
                if (isIllegalInSystem) {
                    textAlign(LEFT, CENTER);
                    fill(255, 0, 0);
                    text("ILLEGAL", sX+10+textWidth(comm.name||'?')+15, tY);
                } 
            }
            
            textAlign(RIGHT, CENTER);
            text(comm.buyPrice??'?', sX+cW*2-10-indicatorW, tY);
            text(comm.sellPrice??'?', sX+cW*3-10-indicatorW, tY);
            text(comm.playerStock??'?', sX+cW*4-10, tY);

            // --- Price Indicators ---
            noStroke();
            // Buy Price Indicator
            if (comm.baseBuy > 0) {
                let buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                let indicatorH = constrain(abs(buyDeviation) / maxDeviation, 0, 1) * indicatorMaxH;
                let indicatorX = sX + cW*2 - indicatorW - 5; // Position indicator to the right of text
                let indicatorY = yP + indicatorYOffset + (indicatorMaxH - indicatorH); // Bar grows upwards

                if (buyDeviation > 0.05) { // Expensive (Red) - allow small tolerance
                    fill(255, 50, 50); // Red
                } else if (buyDeviation < -0.05) { // Cheap (Green)
                    fill(50, 255, 50); // Green
                } else { // Average (Neutral/No bar)
                    fill(120); // Grey or transparent
                    indicatorH = 1; // Minimal dot or line
                    indicatorY = yP + indicatorYOffset + indicatorMaxH - indicatorH;
                }
                 if (indicatorH > 0) { // Only draw if there's height
                    rect(indicatorX, indicatorY, 3, indicatorH); // Draw thin bar
                 }
            }
            // Sell Price Indicator
            if (comm.baseSell > 0) {
                let sellDeviation = (comm.sellPrice - comm.baseSell) / comm.baseSell;
                let indicatorH = constrain(abs(sellDeviation) / maxDeviation, 0, 1) * indicatorMaxH;
                let indicatorX = sX + cW*3 - indicatorW - 5; // Position indicator
                let indicatorY = yP + indicatorYOffset + (indicatorMaxH - indicatorH); // Bar grows upwards

                if (sellDeviation > 0.05) { // Good Sell Price (Green)
                    fill(50, 255, 50); // Green
                } else if (sellDeviation < -0.05) { // Bad Sell Price (Red)
                    fill(255, 50, 50); // Red
                } else { // Average (Neutral/No bar)
                    fill(120); // Grey or transparent
                    indicatorH = 1; // Minimal dot or line
                    indicatorY = yP + indicatorYOffset + indicatorMaxH - indicatorH;
                }
                 if (indicatorH > 0) { // Only draw if there's height
                    rect(indicatorX, indicatorY, 3, indicatorH); // Draw thin bar
                 }
            }
            // --- End Price Indicators ---


            // --- Buttons ---
            const btnStartX = sX + cW * 4.2;
            const btnY = yP + (rowH - btnH) / 2;
            const isMissionCargo = player.activeMission?.cargoType === comm.name;
            const isDisabled = isIllegalInSystem || isMissionCargo;
            
            this._drawMarketButtons(comm, btnStartX, btnY, btnW, btnH, isDisabled);
        });

        // Back button using standardized helper
        this.marketBackButtonArea = this._drawStandardBackButton();
        pop();
    }

    _drawMarketButtons(comm, startX, y, btnW, btnH, isDisabled) {
        const buttons = [
            { label: "Buy 1", action: 'buy', quantity: 1, colors: [[0,150,0], [0,200,0]], offset: 0 },
            { label: "Buy All", action: 'buyAll', colors: [[0,180,0], [0,220,0]], offset: btnW + 5 },
            { label: "Sell 1", action: 'sell', quantity: 1, colors: [[150,0,0], [200,0,0]], offset: 2*btnW + 15 },
            { label: "Sell All", action: 'sellAll', colors: [[180,0,0], [220,0,0]], offset: 3*btnW + 20 }
        ];
        
        buttons.forEach(btn => {
            const x = startX + btn.offset;
            if (isDisabled) {
                this._drawDisabledButton(x, y, btnW, btnH, btn.label);
            } else {
                this._drawActiveMarketButton(x, y, btnW, btnH, btn.label, btn.colors, btn.action, comm.name, btn.quantity);
            }
        });
    }

    _drawDisabledButton(x, y, w, h, label) {
        fill(100); stroke(120); strokeWeight(1);
        rect(x, y, w, h, 3);
        fill(180); noStroke(); textAlign(CENTER, CENTER); textSize(20);
        text(label, x + w/2, y + h/2);
    }

    _drawActiveMarketButton(x, y, w, h, label, colors, action, commodity, quantity) {
        fill(...colors[0]); stroke(...colors[1]); strokeWeight(1);
        rect(x, y, w, h, 3);
        fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(20);
        text(label, x + w/2, y + h/2);
        
        const buttonData = { x, y, w, h, action, commodity };
        if (quantity) buttonData.quantity = quantity;
        this.marketButtonAreas.push(buttonData);
    }

    /** Draws the Mission Board screen (when state is VIEWING_MISSIONS) */
    drawMissionBoard(missions, selectedIndex, player) {
        if (!player) { console.warn("drawMissionBoard missing player"); return; }
        this.missionListButtonAreas = []; 
        this.missionDetailButtonAreas = {}; // Clear areas

        // --- Get Context ---
        const currentSystem = galaxy?.getCurrentSystem();
        const currentStation = currentSystem?.station;
        const activeMission = player.activeMission; // Get the active mission directly
        const selectedMissionFromList = (selectedIndex >= 0 && selectedIndex < missions?.length) ? missions[selectedIndex] : null;

        // Determine which mission's details to display in the right panel
        let missionToShowDetails = null;
        if (activeMission) {
            missionToShowDetails = activeMission; // Always prioritize showing the active mission
        } else if (selectedMissionFromList) {
            missionToShowDetails = selectedMissionFromList; // Show selected available mission if no active one
        }
        // --- End Context ---

        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        push(); // Isolate drawing
        this.drawPanelBG([20,50,20,220], [100,255,100]);
        
        // Use the standardized header
        const headerHeight = this.drawStationHeader("Mission Board", currentStation, player, currentSystem);
        
        // --- Layout with adjusted Y position ---
        let listW = pW*0.4, detailX = pX+listW+10, detailW = pW-listW-20; 
        let cY = pY+headerHeight, cH = pH-headerHeight-50;
        let btnDetailW = 120; let btnDetailH = 30; let btnDetailY = pY + pH - btnDetailH - 15; // Button layout constants


        // --- List Section (always shows available missions) ---
        fill(0,0,0,100); noStroke(); rect(pX+5, cY, listW-10, cH); // List BG

        if (!Array.isArray(missions) || missions.length === 0) {
            fill(180); textSize(20); textAlign(CENTER,CENTER); 
            text("No missions available.", pX+listW/2, cY+cH/2);
        } else {
            this.missionListButtonAreas = []; // Reset clickable areas
            let currentY = cY + 10; // Starting Y position
            const spacing = 5;

            // Process each mission
            for (let i = 0; i < missions.length; i++) {
                const m = missions[i];
                // Check mission status directly rather than relying only on inactiveMissionIds
                const isInactive = this.inactiveMissionIds.has(m.id) || 
                                m.status === 'Completed' || 
                                m.status === 'Failed';

                // Get mission text and calculate its space requirements
                const missionText = m.getSummary();
                textSize(20);
                const availableWidth = listW - 40;
                const approxCharsPerLine = 30; // Rough estimate
                const textLines = Math.ceil(missionText.length / approxCharsPerLine);
                const minHeight = 35;
                const heightPerLine = 20;
                const buttonHeight = Math.max(minHeight, textLines * heightPerLine);
                
                // Skip if would extend beyond panel
                if (currentY + buttonHeight > cY + cH) break;
                
                // Background
                if (isInactive) {
                    fill(60,60,60,180); noStroke();
                } else if (i === selectedIndex) {
                    fill(80,100,80,200); stroke(150,255,150); strokeWeight(1);
                } else {
                    fill(40,60,40,180); noStroke();
                }
                rect(pX+10, currentY, listW-20, buttonHeight, 3);
                
                // Text
                if (isInactive) {
                    fill(120); // greyed out
                } else if (activeMission && activeMission.id === m.id) {
                    fill(255,0,0);
                } else {
                    fill(220);
                }
                textSize(20); textAlign(LEFT, CENTER); noStroke();
                text(m.getSummary(), pX+20, currentY + buttonHeight/2, listW-40);
                
                // only allow clicking active entries
                if (!isInactive) {
                    this.missionListButtonAreas.push({
                        x: pX+10,
                        y: currentY,
                        w: listW-20,
                        h: buttonHeight,
                        index: i
                    });
                }
                // Move to next position
                currentY += buttonHeight + spacing;
            }
        }
        // --- End List Section ---


        // --- Detail Section ---
        fill(0,0,0,100); noStroke(); rect(detailX, cY, detailW-5, cH); // Detail BG

        if (missionToShowDetails) { // If we determined a mission to show details for...
            // Draw the mission text details
            fill(230); textSize(20); textAlign(LEFT,TOP); textLeading(24); // Increased leading for readability
            text(missionToShowDetails.getDetails() || "Error: No details.", detailX+15, cY+15, detailW-30);

            // --- Determine Detail Buttons ---
            let actionBtnX = detailX + detailW / 2 - btnDetailW - 10; // Position for Accept/Complete/Abandon
            let backBtnX = detailX + detailW / 2 + 10;                 // Position for Back
            this.missionDetailButtonAreas = { 'back': { x: backBtnX, y: btnDetailY, w: btnDetailW, h: btnDetailH }}; // Back button always available when details shown

            if (activeMission && missionToShowDetails.id === activeMission.id) {
                // --- The mission shown IS the Player's ACTIVE Mission ---
                let canCompleteHere = false;
                // Check delivery completion conditions
                if ((activeMission.type === MISSION_TYPE.DELIVERY_LEGAL || activeMission.type === MISSION_TYPE.DELIVERY_ILLEGAL) &&
                    currentSystem && currentStation && activeMission.destinationSystem === currentSystem.name &&
                    activeMission.destinationStation === currentStation.name &&
                    player.hasCargo(activeMission.cargoType, activeMission.cargoQuantity))
                { canCompleteHere = true; }
                // Add other station-based completion checks here (e.g., bounty turn-in if required)

                // Show Complete or Abandon
                if (canCompleteHere) {
                    fill(0, 200, 50); stroke(150, 255, 150); rect(actionBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
                    fill(255); textSize(20); textAlign(CENTER,CENTER); noStroke(); text("Complete", actionBtnX+btnDetailW/2, btnDetailY+btnDetailH/2);
                    this.missionDetailButtonAreas['complete'] = { x: actionBtnX, y: btnDetailY, w: btnDetailW, h: btnDetailH };
                } else {
                    fill(200, 50, 50); stroke(255, 150, 150); rect(actionBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
                    fill(255); textSize(20); textAlign(CENTER,CENTER); noStroke(); text("Abandon", actionBtnX+btnDetailW/2, btnDetailY+btnDetailH/2);
                    this.missionDetailButtonAreas['abandon'] = { x: actionBtnX, y: btnDetailY, w: btnDetailW, h: btnDetailH };
                }

            } else if (!activeMission && missionToShowDetails) {
                // --- The mission shown is AVAILABLE (and player has no active mission) ---
                fill(0, 180, 0); stroke(150, 255, 150); rect(actionBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
                fill(255); textSize(20); textAlign(CENTER,CENTER); noStroke(); text("Accept", actionBtnX+btnDetailW/2, btnDetailY+btnDetailH/2);
                this.missionDetailButtonAreas['accept'] = { x: actionBtnX, y: btnDetailY, w: btnDetailW, h: btnDetailH };
            } else {
                // --- Catch-all / Edge case: Active mission exists, but we are showing details for a *different* mission (selected from list)
                // Or, somehow missionToShowDetails is set but doesn't fit the above.
                // In this scenario, we shouldn't allow accepting. Show "Unavailable".
                fill(50, 100, 50); stroke(100, 150, 100); rect(actionBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
                fill(150); textSize(20); textAlign(CENTER,CENTER); noStroke(); text("Unavailable", actionBtnX+btnDetailW/2, btnDetailY+btnDetailH/2);
                this.missionDetailButtonAreas['accept'] = null; // Ensure accept is not clickable
                this.missionDetailButtonAreas['complete'] = null;
                this.missionDetailButtonAreas['abandon'] = null;
            }

            // Draw Back button (common if any details are shown)
            fill(180,0,0); stroke(255,150,150); rect(backBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
            fill(255); textSize(20); textAlign(CENTER,CENTER); noStroke(); text("Back", backBtnX + btnDetailW/2, btnDetailY + btnDetailH/2);
            // Area for 'back' button already stored

        } else { // No mission active AND none selected from the list
            fill(180); textSize(20); textAlign(CENTER, CENTER); text("Select a mission from the list for details.", detailX+(detailW-5)/2, cY+cH/2);
            // Only show a Back button, centered
            let backBtnX = pX + pW / 2 - btnDetailW / 2; // Center the single back button
            fill(180,0,0); stroke(255,150,150); rect(backBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
            fill(255); textSize(20); textAlign(CENTER,CENTER); noStroke(); text("Back", backBtnX + btnDetailW/2, btnDetailY + btnDetailH/2);
            // Define button areas: only 'back' is active
            this.missionDetailButtonAreas = { 'back': { x: backBtnX, y: btnDetailY, w: btnDetailW, h: btnDetailH }, 'accept': null, 'complete': null, 'abandon': null };
        }
        // --- End Detail Section Logic ---


        // --- Active Mission Info Bar at the very bottom ---
        // This remains useful as a quick reminder, even if details are shown above
        if (player.activeMission?.title) { fill(0,0,0,180);stroke(255,150,0);strokeWeight(1); let ay=pY+pH+5, ah=30; rect(pX,ay,pW,ah); fill(255,180,0);noStroke();textSize(14);textAlign(LEFT,CENTER); text(`Active: ${player.activeMission.title}`, pX+15, ay+ah/2, pW-30); }

        pop(); // Restore drawing styles
    } // --- END drawMissionBoard ---

    /** Draws the Galaxy Map screen */
    drawGalaxyMap(galaxy, player) {
        if (!galaxy || !player) { console.warn("drawGalaxyMap missing galaxy or player"); return; }

        this.galaxyMapNodeAreas = []; // Clear clickable areas for nodes
        const systems = galaxy.getSystemDataForMap(); // Gets { name, x, y, type, visited, index }
        const currentIdx = galaxy.currentSystemIndex;
        const reachable = galaxy.getReachableSystems(); // Now gets indices based on actual connections

        const currentSystem = galaxy.getCurrentSystem();
        const canJump = isPlayerInJumpZone(player, currentSystem); // Use the helper function

        push(); // Isolate map drawing
       // background(10, 0, 20); // Dark space background

        // --- Draw Connections (Lines) ---
        stroke(150, 150, 200, 200); // Brighter connection line color
        strokeWeight(1);
        // Iterate through each system to draw its connections
        for (let i = 0; i < galaxy.systems.length; i++) {
            const systemA = galaxy.systems[i];
            if (!systemA?.galaxyPos || !systemA.connectedSystemIndices) continue; // Skip if invalid

            // Draw lines to connected systems, ensuring each line is drawn only once
            systemA.connectedSystemIndices.forEach(j => {
                // Only draw if the target index 'j' is greater than the current index 'i'
                // This prevents drawing lines twice (A->B and B->A)
                if (j > i) {
                    const systemB = galaxy.systems[j];
                    if (systemB?.galaxyPos) { // Check if target system is valid
                        let x1 = systemA.galaxyPos.x;
                        let y1 = systemA.galaxyPos.y;
                        let x2 = systemB.galaxyPos.x;
                        let y2 = systemB.galaxyPos.y;

                        // When drawing connection lines, verify against the actual connections
                        if (galaxy.systems[i].connectedSystemIndices.includes(j)) {
                            // Draw connection only if it exists in the data structure
                            line(x1, y1, x2, y2);
                        }
                    }
                }
            });
        }
        // --- End Draw Connections ---

        // --- Draw System Nodes ---
        const nodeR = 15; // Radius for clickable area and drawing
        systems.forEach((sysData, i) => {
            if (!sysData) return;

            let isCurrent = (i === currentIdx);
            let isSelected = (i === this.selectedSystemIndex);
            let isReachable = reachable.includes(i);

            let nodeColor; // This will be a p5.Color object
            let textColor = color(255);
            let nodeStrokeWeight = 1;
            // Initialize with the default dim stroke color
            let nodeStrokeColor = color(100, 80, 150);

            // --- Determine Base Fill Color using Galaxy.getEconomyColor ---
            if (isCurrent) {
                // Current system: Use its economy color, but ensure text is bright white
                const colorArray = Galaxy.getEconomyColor(sysData.type);
                const opaqueColorArray = [...colorArray];
                opaqueColorArray[3] = 230; // Use same opacity as other visited systems
                nodeColor = color(...opaqueColorArray);
                textColor = color(255); // Ensure text is bright white
            } else if (!sysData.visited) {
                nodeColor = color(80, 80, 80, 230); // Dark Grey for unvisited/undiscovered (More Opaque)
                textColor = color(160); // Dimmer text for unvisited
            } else {
                // Visited (but not current): Use its economy color
                const colorArray = Galaxy.getEconomyColor(sysData.type);
                const opaqueColorArray = [...colorArray];
                opaqueColorArray[3] = 230; // Set alpha to 230 (More Opaque)
                nodeColor = color(...opaqueColorArray);
            }
            // --- End Base Fill Color ---

            // --- Adjust Stroke/Text based on Jump Readiness and Reachability ---
            if (isCurrent) {
                 // Current system: Thick White Outline (Stroke only)
                 nodeStrokeColor = color(255); // White stroke
                 nodeStrokeWeight = 3;         // Make it thick
                 // Fill color and text color are already set above
            } else if (canJump && isReachable) {
                 // If player CAN jump and system IS reachable: White Outline (slightly thicker)
                 nodeStrokeColor = color(255); // White outline
                 nodeStrokeWeight = 1;         // Slightly thicker outline
                 if (sysData.visited) textColor = color(255); // Bright text if visited
            } else if (!canJump && isReachable) {
                 // If player CANNOT jump but system IS reachable: Dimmed appearance
                 //nodeColor = color(100, 100, 150, 150); // Override fill to dim blue/grey (alpha 150)
                 //textColor = color(180); // Dim text
                 nodeStrokeColor = color(150); // Dim stroke
                 nodeStrokeWeight = 1;
            } else {
                 // Not current, not reachable: Use default dim stroke color set earlier
                 nodeStrokeColor = color(100, 80, 150); // Explicitly set default dim stroke
                 nodeStrokeWeight = 1;
            }

            // --- Highlight Selected System ---
            // Apply thick yellow highlight if selected (and not current)
            // This OVERRIDES previous stroke settings for the selected system.
            if (isSelected && !isCurrent) {
                 nodeStrokeColor = color(255, 255, 0); // Yellow outline for selected
                 nodeStrokeWeight = 4;                 // Make it thick
            }
            // ---

            // Draw the ellipse
            strokeWeight(nodeStrokeWeight);
            stroke(nodeStrokeColor);
            fill(nodeColor);
            ellipse(sysData.x, sysData.y, nodeR * 2, nodeR * 2);
            // Store clickable area
            this.galaxyMapNodeAreas.push({ x: sysData.x, y: sysData.y, radius: nodeR, index: i });

            // Draw Text Labels
            textFont(font);
            
            fill(textColor); noStroke(); textAlign(CENTER, TOP); textSize(20);
            text(sysData.name, sysData.x, sysData.y + nodeR + 5);

            // Show type/security only if visited or current
            if (sysData.visited || isCurrent) {
                // Get the system object to access tech level
                const system = galaxy.systems[i];
                const techLevel = system?.techLevel || "?";
                
                // Display economy type with tech level
                text(`(${sysData.type} - Tech ${techLevel})`, sysData.x, sysData.y + nodeR + 25);
                
                // Security level (unchanged)
                const secLevel = system?.securityLevel || "Unknown";
                fill(200, 200, 100); // Gold/yellow for visibility
                text(`Security: ${secLevel}`, sysData.x, sysData.y + nodeR + 45);
                
                // Wanted status (unchanged)
                if (system && system.playerWanted) {
                    fill(255, 0, 0); // Red for wanted
                    text("Wanted", sysData.x, sysData.y + nodeR + 65);
                }
            }
        });
        // --- End Draw System Nodes ---



        // --- Draw Jump Button ---
        // Show only if a reachable system (not current) is selected AND player is in the jump zone
        this.jumpButtonArea = { x: 0, y: 0, w: 0, h: 0 }; // Reset button area
        if (canJump &&
            this.selectedSystemIndex !== -1 &&
            this.selectedSystemIndex !== currentIdx &&
            reachable.includes(this.selectedSystemIndex))
        {
            let btnW = 150, btnH = 40, btnX = width / 2 - btnW / 2, btnY = height - btnH - 20;
            // Use a brighter blue when jump is possible
            fill(0, 200, 255); stroke(150, 255, 255); strokeWeight(1);
            rect(btnX, btnY, btnW, btnH, 5);
            fill(0); textSize(18); textAlign(CENTER, CENTER); noStroke(); // Black text
            text(`Jump`, btnX + btnW / 2, btnY + btnH / 2);
            this.jumpButtonArea = { x: btnX, y: btnY, w: btnW, h: btnH }; // Define clickable area
        }
        // --- End Draw Jump Button ---

        // --- Instructions ---
        fill(200); textAlign(CENTER, BOTTOM); textSize(14);
        // Adjust instruction text slightly based on canJump status
        if (canJump) {
            text("Click reachable system.", width / 2, height - 70);
        }


        pop(); // Restore drawing settings
    } // --- End drawGalaxyMap ---

    /** Handles clicks on the galaxy map */
    handleGalaxyMapClicks(mouseX, mouseY, galaxy, player, gameStateManager) {
        if (!galaxy || !player) return false;

        const currentSystem = galaxy.getCurrentSystem();
        const canJump = isPlayerInJumpZone(player, currentSystem); // Check jump zone status
        const reachable = galaxy.getReachableSystems(); // Get reachable systems for click logic

        // --- Debug Logging ---
        console.log(`[handleGalaxyMapClicks] 'canJump' evaluated as: ${canJump}`);
        // ---

        // Check Jump button first
        if (this.isClickInArea(mouseX, mouseY, this.jumpButtonArea)) {
            console.log("  Jump button clicked.");
            // Ensure a system is selected and it's reachable
            if (this.selectedSystemIndex !== -1 && reachable.includes(this.selectedSystemIndex)) {
                if (canJump) { // Double-check canJump status for the button action
                    console.log("    Attempting jump via button...");
                    gameStateManager.startJump(this.selectedSystemIndex);
                    // Optional: Deselect after initiating jump? Or keep selected?
                    // this.selectedSystemIndex = -1;
                } else {
                    // This case should ideally not happen if the button is only drawn when canJump allows selection,
                    // but keep as a safeguard.
                    console.log("    Jump button ignored: Player not in Jump Zone (safeguard check).");
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
            } else {
                 console.log(`    Jump button ignored: No valid system selected (${this.selectedSystemIndex}) or not reachable.`);
            }
            return true; // Click was on the button area
        }

        // Check system nodes for SELECTION
        for (const area of this.galaxyMapNodeAreas) { // Use the pre-calculated areas
             let d = dist(mouseX, mouseY, area.x, area.y);
             if (d < area.radius) {
                 const clickedIndex = area.index;
                 const clickedSys = galaxy.systems[clickedIndex]; // Get system object
                 console.log(`  Node clicked: ${clickedSys?.name || 'N/A'} (Index: ${clickedIndex})`);

                 if (clickedIndex === galaxy.currentSystemIndex) {
                     // Always allow clicking the current system to deselect
                     console.log(`    -> Clicked current system. Deselecting.`);
                     this.selectedSystemIndex = -1;
                     if (typeof soundManager !== 'undefined') soundManager.playSound('click_off'); // Different sound?
                     return true;
                 }
                 // --- Selection Restriction ---
                 else if (!canJump) {
                     // If NOT in jump zone, ignore clicks on other systems
                     console.log(`    -> Click ignored: Must be in Jump Zone to select target.`);
                     return true; // Click handled (by ignoring)
                 }
                 // --- End Selection Restriction ---
                 else if (reachable.includes(clickedIndex)) {
                     // If IN jump zone and system is reachable, allow selection
                     console.log(`    -> System is reachable. Selecting index: ${clickedIndex}`);
                     this.selectedSystemIndex = clickedIndex; // SELECT the system
                     if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                 } else {
                     // If IN jump zone but system is NOT reachable
                     console.log(`    -> System is NOT reachable. Selection ignored.`);
                     if (typeof uiManager !== 'undefined') uiManager.addMessage("Route unavailable.", color(255, 150, 150));
                     if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                 }
                 return true; // Click was handled
             }
        }

        // If click wasn't on button or any node, deselect
        // console.log("Clicked empty space on map. Deselecting.");
        // this.selectedSystemIndex = -1; // Optional: Deselect on empty space click?
        return false; // Click not handled by map elements
    }

    /** Draws the Game Over overlay screen */
    drawGameOverScreen() {
        push();
        fill(0, 0, 0, 220); // Semi-transparent black overlay
        rect(0, 0, width, height);

        fill(255, 60, 60);
        textAlign(CENTER, CENTER);
        textFont(font);
        textSize(100);
        text("GAME OVER", width / 2, height / 2 - 40);

        fill(255);
        textSize(30);
        text("Press F5 or reload to restart from last Save", width / 2, height / 2 + 20);

        pop();
    } // --- End drawGameOverScreen ---

    drawMinimap(player, system) {
        if (!player?.pos || !system) { return; } // Basic checks

        // --- Calculate Minimap Position and Scale ---
        this.minimapX = width - this.minimapSize - this.minimapMargin;
        this.minimapY = height - this.minimapSize - this.minimapMargin;
        this.minimapScale = this.minimapSize / this.minimapWorldViewRange;
        if (isNaN(this.minimapScale) || this.minimapScale <= 0 || !isFinite(this.minimapScale)) {
            this.minimapScale = 0.01; // Fallback scale
        }

        // --- Calculate Center and Boundaries ---
        let mapCenterX = this.minimapX + this.minimapSize / 2;
        let mapCenterY = this.minimapY + this.minimapSize / 2;
        let mapLeft = this.minimapX;
        let mapRight = this.minimapX + this.minimapSize;
        let mapTop = this.minimapY;
        let mapBottom = this.minimapY + this.minimapSize;
        // ---

        push(); // Isolate drawing settings for the minimap

        // --- Draw Background/Border ---
        try {
            fill(0, 0, 0, 180);
            stroke(0, 200, 0, 200);
            strokeWeight(1);
            rect(this.minimapX, this.minimapY, this.minimapSize, this.minimapSize);
        } catch (e) {
            console.error("Error drawing minimap rect:", e);
            pop(); // Clean up push()
            return; // Don't proceed if background fails
        }
        // ---

        // --- Draw Player (Always at Center) ---
        fill(255); // White
        noStroke();
        ellipse(mapCenterX, mapCenterY, 5, 5); // Small circle for player
        // ---

        // --- Helper function for strict boundary check ---
        const isFullyWithinBounds = (x, y, halfWidth, halfHeight) => {
            return (
                x - halfWidth >= mapLeft &&
                x + halfWidth <= mapRight &&
                y - halfHeight >= mapTop &&
                y + halfHeight <= mapBottom
            );
        };
        // ---

        try { // Wrap drawing of other elements
            // --- Map and Draw Station ---
            if (system.station?.pos) {
                let objX = system.station.pos.x;
                let objY = system.station.pos.y;
                let relX = objX - player.pos.x;
                let relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                const iconHalfSize = 3; // Station is 6x6 rect

                // --- Station Clamping Logic ---
                let drawX = mapX;
                let drawY = mapY;
                let isStationOnScreen = isFullyWithinBounds(mapX, mapY, iconHalfSize, iconHalfSize);

                if (!isStationOnScreen) {
                    const inset = iconHalfSize + 1;
                    drawX = constrain(mapX, mapLeft + inset, mapRight - inset);
                    drawY = constrain(mapY, mapTop + inset, mapBottom - inset);

                    if (mapX < mapLeft || mapX > mapRight || mapY < mapTop || mapY > mapBottom) {
                         fill(0, 100, 255); // Clamped color
                         noStroke();
                         rect(drawX - iconHalfSize, drawY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
                    } else {
                         fill(0, 0, 255); // Normal color (near edge but inside)
                         noStroke();
                         rect(mapX - iconHalfSize, mapY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
                    }
                } else {
                    fill(0, 0, 255); // Normal color (fully inside)
                    noStroke();
                    rect(mapX - iconHalfSize, mapY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
                }
                // --- End Station Clamping Logic ---
            }
            // ---

            // --- Map and Draw Planets ---
            fill(150, 100, 50); // Brownish for planets
            noStroke();
            (system.planets || []).forEach(planet => {
                if (!planet?.pos) return;
                let objX = planet.pos.x;
                let objY = planet.pos.y;
                let relX = objX - player.pos.x;
                let relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                const iconRadius = 2;
                if (isFullyWithinBounds(mapX, mapY, iconRadius, iconRadius)) {
                    ellipse(mapX, mapY, iconRadius * 2, iconRadius * 2);
                }
            });
            // ---

            // --- Map and Draw Enemies ---
            fill(255, 0, 0); // Red for enemies
            noStroke();
            (system.enemies || []).forEach(enemy => {
                if (!enemy?.pos || enemy.isDestroyed()) return;
                let objX = enemy.pos.x;
                let objY = enemy.pos.y;
                let relX = objX - player.pos.x;
                let relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                const iconHalfExtent = 3;
                if (isFullyWithinBounds(mapX, mapY, iconHalfExtent, iconHalfExtent)) {
                    push();
                    translate(mapX, mapY);
                    rotate(enemy.angle - PI / 2);
                    triangle(0, -iconHalfExtent, -iconHalfExtent*0.8, iconHalfExtent*0.8, iconHalfExtent*0.8, iconHalfExtent*0.8);
                    pop();
                }
            });
            // ---

            // --- Map and Draw Jump Zone ---
            if (system.jumpZoneCenter && system.jumpZoneRadius > 0) {
                let jzX = system.jumpZoneCenter.x;
                let jzY = system.jumpZoneCenter.y;
                let jzRadius = system.jumpZoneRadius;

                let relX = jzX - player.pos.x;
                let relY = jzY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                let mapRadius = max(1, jzRadius * this.minimapScale);

                // --- Clamping Logic & Drawing ---
                const indicatorSize = 4; // Size of the small square/dot when clamped
                const inset = indicatorSize / 2 + 1; // Inset needed for the small marker

                // Check if the *center* is outside the boundary for the small marker
                let isClamped = (mapX < mapLeft + inset || mapX > mapRight - inset || mapY < mapTop + inset || mapY > mapBottom - inset);

                push();
                strokeWeight(1);

                if (isClamped) {
                    // --- Draw Clamped Marker ---
                    // Clamp the center position to the inset boundary
                    let drawX = constrain(mapX, mapLeft + inset, mapRight - inset);
                    let drawY = constrain(mapY, mapTop + inset, mapBottom - inset);

                    fill(255, 255, 0, 220); // Solid yellow fill for clamped marker
                    noStroke();
                    // Draw a small square (like the station)
                    rectMode(CENTER); // Draw rect from center
                    rect(drawX, drawY, indicatorSize, indicatorSize);
                    rectMode(CORNER); // Reset rectMode

                } else {
                    // --- Draw On-Screen Circle ---
                    // Check if the full circle is within bounds (optional, for visual consistency)
                    // let isCircleFullyVisible = isFullyWithinBounds(mapX, mapY, mapRadius, mapRadius);

                    noFill();
                    stroke(255, 255, 0, 200); // Yellow outline
                    // Draw the circle outline using the original map position and scaled radius
                    ellipse(mapX, mapY, mapRadius * 2);
                }
                pop();
                // --- End Clamping & Drawing ---
            }
            // --- End Jump Zone Drawing ---

        } catch (e) {
            console.error("Error during minimap element drawing:", e);
        } finally {
            pop(); // Restore drawing state from before minimap drawing push()
        }
    } // End drawMinimap
    
    /** Draws the current framerate in the bottom left corner with averaging */
    drawFramerate() {
        // Sample current framerate
        const currentFps = frameRate();
        
        // Store the sample
        this.fpsValues.push(currentFps);
        
        // Keep the samples array at desired length
        while (this.fpsValues.length > 10) {
            this.fpsValues.shift(); // Remove oldest sample
        }
        
        // Only update the display periodically
        this.fpsFrameCount++;
        if (this.fpsFrameCount >= this.fpsUpdateInterval) {
            // Calculate average FPS
            const sum = this.fpsValues.reduce((total, fps) => total + fps, 0);
            this.fpsAverage = Math.round(sum / this.fpsValues.length);
            this.fpsFrameCount = 0; // Reset counter
        }
        
        // Draw the display
        push();
        // Set up text style
        noStroke();
        textAlign(LEFT, BOTTOM);
        textFont(font);
        textSize(10);
        
        // Color changes based on performance
        if (this.fpsAverage >= 50) {
            fill(0, 255, 0); // Green for good framerate
        } else if (this.fpsAverage >= 30) {
            fill(255, 255, 0); // Yellow for acceptable framerate
        } else {
            fill(255, 0, 0); // Red for poor framerate
        }
        
        text(`FPS: ${this.fpsAverage}`, 10, height - 10);
        pop();
    }
    
    /** Handles mouse clicks for all UI states */
    handleMouseClicks(mx, my, currentState, player, market, galaxy) {
        const currentSystem = galaxy?.getCurrentSystem(); const currentStation = currentSystem?.station;

        // --- DOCKED State (Main Station Menu) ---
        if (currentState === "DOCKED") {
            const dockedHandlers = {
                "UNDOCK": () => {
                    if(gameStateManager) gameStateManager.setState("IN_FLIGHT");
                    return true;
                },
                "VIEWING_MARKET": () => {
                    if(gameStateManager) gameStateManager.setState("VIEWING_MARKET");
                    return true;
                },
                "VIEWING_MISSIONS": () => {
                    if(gameStateManager) gameStateManager.setState("VIEWING_MISSIONS");
                    return true;
                },
                "VIEWING_SHIPYARD": () => {
                    if(gameStateManager) gameStateManager.setState("VIEWING_SHIPYARD");
                    return true;
                },
                "VIEWING_UPGRADES": () => {
                    if(gameStateManager) gameStateManager.setState("VIEWING_UPGRADES");
                    return true;
                },
                "VIEWING_REPAIRS": () => {
                    if(gameStateManager) gameStateManager.setState("VIEWING_REPAIRS");
                    return true;
                },
                "VIEWING_POLICE": () => {
                    if(gameStateManager) gameStateManager.setState("VIEWING_POLICE");
                    return true;
                },
                "VIEWING_PROTECTION": () => {
                    if(gameStateManager) gameStateManager.setState("VIEWING_PROTECTION");
                    return true;
                }
            };
            
            return this._handleButtonAreaClicks(mx, my, this.stationMenuButtonAreas, dockedHandlers);
        }
        // --- VIEWING_MARKET State ---
        else if (currentState === "VIEWING_MARKET") {
            return this.handleMarketMousePress(mx, my, market, player);
        }
        // --- VIEWING_MISSIONS State ---
        else if (currentState === "VIEWING_MISSIONS") {
            const activeMission = player.activeMission;

            // Handle Detail Buttons FIRST (Complete, Abandon, Accept, Back)
            // These depend on what was DRAWN by drawMissionBoard
            if (this.missionDetailButtonAreas['back'] && this.isClickInArea(mx, my, this.missionDetailButtonAreas['back'])) {
                if(gameStateManager) gameStateManager.setState("DOCKED");
                return true;
            }
            else if (this.missionDetailButtonAreas['accept'] && !activeMission && this.isClickInArea(mx, my, this.missionDetailButtonAreas['accept'])) {
                 // Accept logic: find the currently SELECTED mission from the list
                 if (gameStateManager?.selectedMissionIndex !== -1) {
                      let missionToAccept = gameStateManager.currentStationMissions[gameStateManager.selectedMissionIndex];
                      if(missionToAccept && player.acceptMission(missionToAccept)){
                           if(gameStateManager) gameStateManager.setState("DOCKED"); // Go back to main menu after accepting
                      } else {
                           // Accept failed (e.g., no cargo space) - stay on mission board
                      }
                 }
                 return true;
            }
            else if (this.missionDetailButtonAreas['complete']
                     && activeMission
                     && this.isClickInArea(mx, my, this.missionDetailButtonAreas['complete'])) {
                if (player.completeMission(currentSystem, currentStation)) {
                    // mark it inactive and keep list intact
                    this.inactiveMissionIds.add(activeMission.id);
                }
                return true;
            }
            else if (this.missionDetailButtonAreas['abandon']
                     && activeMission
                     && this.isClickInArea(mx, my, this.missionDetailButtonAreas['abandon'])) {
                player.abandonMission();
                // grey out this mission
                this.inactiveMissionIds.add(activeMission.id);
                return true;
            }

            // Handle List Clicks (for highlighting) if no detail button was clicked
            for (const btn of this.missionListButtonAreas) {
                if (this.isClickInArea(mx, my, btn)) {
                    // Always update the selectedIndex for visual highlighting
                    if(gameStateManager) gameStateManager.selectedMissionIndex = btn.index;
                    // Clicking the list doesn't change the *detail view* if an active mission is present
                    // It just updates the highlight
                    return true;
                }
            }
            return false; // Return false if no mission list button was clicked
        }

        // --- VIEWING_SHIPYARD State ---
        else if (currentState === "VIEWING_SHIPYARD") {
            for (const area of this.shipyardListAreas) {
                if (this.isClickInArea(mx, my, area)) {
                    const finalPrice = area.price; // Can be negative for refunds
                    
                    if (finalPrice > 0) {
                        // Player needs to pay - use consolidated transaction handler
                        this._performTransaction(finalPrice, () => {
                            player.applyShipDefinition(area.shipTypeKey);
                        }, {
                            player,
                            successMessage: `You bought a ${area.shipName}!`,
                            soundEffect: 'upgrade'
                        });
                    } else {
                        // Player gets a refund or even swap
                        player.addCredits(-finalPrice); // Convert negative to positive for refund
                        player.applyShipDefinition(area.shipTypeKey);
                        saveGame && saveGame();
                        
                        if (finalPrice < 0) {
                            this.addMessage(`You bought a ${area.shipName} and received ${-finalPrice} credits back!`);
                        } else {
                            this.addMessage(`You swapped to a ${area.shipName} at no additional cost.`);
                        }
                    }
                    return true;
                }
            }
            
            // Back button
            if (this.isClickInArea(mx, my, this.shipyardDetailButtons.back)) {
                gameStateManager.setState("DOCKED");
                return true;
            }
            return false;
        }
        // --- VIEWING_UPGRADES State ---
        else if (currentState === "VIEWING_UPGRADES") {
            // First check if clicking on a weapon slot button
            if (this.weaponSlotButtons && this.weaponSlotButtons.length > 0) {
                for (const btn of this.weaponSlotButtons) {
                    if (this.isClickInArea(mx, my, btn)) {
                        this.selectedWeaponSlot = btn.slotIndex;
                        
                        // Play click sound if available
                        if (typeof soundManager !== 'undefined') {
                            soundManager.playSound('click');
                        }
                        
                        return true; // Handled click
                    }
                }
            }
            
            // Then check upgrade item buttons
            for (const area of this.upgradeListAreas) {
                if (this.isClickInArea(mx, my, area)) {
                    if (player.credits >= area.upgrade.price) {
                        // Check if ship has enough weapon slots
                        const shipDef = SHIP_DEFINITIONS[player.shipTypeName];
                        const availableSlots = shipDef?.armament?.length || 1;
                        
                        if (this.selectedWeaponSlot >= availableSlots) {
                            uiManager.addMessage("Your ship doesn't have that weapon slot!", [255, 100, 100]);
                            return true;
                        }
                        
                        // Spend credits
                        player.spendCredits(area.upgrade.price);
                        
                        // Install weapon to selected slot (instead of setWeaponByName)
                        player.installWeaponToSlot(area.upgrade, this.selectedWeaponSlot);
                        
                        // Play purchase sound if available
                        if (typeof soundManager !== 'undefined') {
                            soundManager.playSound('upgrade');
                        }
                        
                        uiManager.addMessage("You bought the " + area.upgrade.name + "!");
                        
                        // Auto-save if possible
                        if (typeof saveGame === 'function') {
                            saveGame();
                        }
                    } else {
                        uiManager.addMessage("Not enough credits!");
                    }
                    return true;
                }
            }
            
            // Back button (unchanged)
            if (this.isClickInArea(mx, my, this.upgradeDetailButtons.back)) {
                gameStateManager.setState("DOCKED");
                return true;
            }
            return false;
        }

        // --- VIEWING_REPAIRS State ---
        else if (currentState === "VIEWING_REPAIRS") {
            // Full repair
            if (this.isClickInArea(mx, my, this.repairsFullButtonArea)) {
                let missing = player.maxHull - player.hull;
                let cost = missing * 10;
                if (missing <= 0) {
                    uiManager.addMessage("Your ship is already fully repaired!");
                } else if (player.credits >= cost) {
                    player.spendCredits(cost);
                    player.hull = player.maxHull;
                    uiManager.addMessage(`Ship fully repaired for ${cost} credits.`);
                } else {
                    uiManager.addMessage(`Not enough credits! Full repair costs ${cost} credits.`);
                }
                return true;
            }
            // 50% repair
            if (this.isClickInArea(mx, my, this.repairsHalfButtonArea)) {
                let missing = player.maxHull - player.hull;
                let repairAmt = Math.min(missing, Math.ceil(player.maxHull / 2));
                let cost = repairAmt * 7;
                if (missing <= 0) {
                    uiManager.addMessage("Your ship is already fully repaired!");
                } else if (player.credits >= cost) {
                    player.spendCredits(cost);
                    player.hull += repairAmt;
                    if (player.hull > player.maxHull) player.hull = player.maxHull;
                    uiManager.addMessage(`Ship repaired by ${repairAmt} hull for ${cost} credits.`);
                } else {
                    uiManager.addMessage(`Not enough credits! 50% repair costs ${cost} credits.`);
                }
                return true;
            }
            // Bodyguard repairs
            if (this.isClickInArea(mx, my, this.repairsBodyguardsButtonArea)) {
                const bodyguardInfo = player.getDamagedBodyguardsInfo();
                if (bodyguardInfo.count <= 0) {
                    uiManager.addMessage("No damaged bodyguards to repair.");
                } else if (player.credits >= bodyguardInfo.totalCost) {
                    // Use the new repair method
                    if (player.repairBodyguards(bodyguardInfo.totalCost)) {
                        uiManager.addMessage(`${bodyguardInfo.count} bodyguard${bodyguardInfo.count > 1 ? 's' : ''} repaired for ${bodyguardInfo.totalCost} credits.`);
                        
                        // Play repair sound if available
                        if (typeof soundManager !== 'undefined') {
                            soundManager.playSound('upgrade');
                        }
                    }
                } else {
                    uiManager.addMessage(`Not enough credits! Bodyguard repairs cost ${bodyguardInfo.totalCost} credits.`);
                }
                return true;
            }
            // Back button
            if (this.isClickInArea(mx, my, this.repairsBackButtonArea)) {
                gameStateManager.setState("DOCKED");
                return true;
            }
            return false;
        }
        // --- VIEWING_POLICE State ---
        else if (currentState === "VIEWING_POLICE") {
            // Handle Police menu button clicks
            for (const area of this.policeButtonAreas) {
                if (this.isClickInArea(mx, my, area)) {
                    if (area.action === 'back') {
                        gameStateManager.setState("DOCKED");
                        return true;
                    } 
                    else if (area.action === 'pay_fine' && player) {
                        // Pay fine to clear wanted status
                        const success = player.spendCredits(area.amount);
                        if (success) {
                            // Clear wanted status in current system
                            player.currentSystem.playerWanted = false;
                            player.currentSystem.policeAlertSent = false;
                            this.addMessage(`Fine paid. Legal status cleared in ${player.currentSystem.name}.`, 'lightgreen');
                            
                            // Save game after payment
                            if (typeof saveGame === 'function') {
                                saveGame();
                            }
                        } else {
                            this.addMessage("Not enough credits to pay fine.", 'crimson');
                        }
                        return true;
                    }
                    else if (area.action === 'join_police' && player) {
                        // Change ship to ACAB
                        player.applyShipDefinition('ACAB');
                        this.addMessage("You have joined the Police Force!", 'lightblue');
                        player.isPolice = true; // Set police status flag
                        
                        // Clear wanted status as a bonus
                        if (player.currentSystem) {
                            player.currentSystem.playerWanted = false;
                            player.currentSystem.policeAlertSent = false;
                        }

                        // Save game after joining
                        if (typeof saveGame === 'function') {
                            saveGame();
                        }
                        return true;
                    }
                }
            }
            return false;
        }

        // --- VIEWING_PROTECTION State ---
        else if (currentState === "VIEWING_PROTECTION") {
            for (const btn of this.protectionServicesButtons) {
                if (this.isClickInArea(mx, my, btn)) {
                    if (btn.action === "HIRE_BODYGUARD") {
                        // Try to hire the bodyguard
                        const hired = player.hireBodyguard(btn.shipType, btn.cost);
                        if (hired) {
                            this.addMessage(`Hired ${btn.shipType} bodyguard for ${btn.cost} credits.`, [150, 255, 150]);
                            // Play purchase sound if available
                            if (typeof soundManager !== 'undefined') {
                                soundManager.playSound('upgrade');
                            }
                            // If we reached max bodyguards, refresh the UI
                            if (player.activeBodyguards.length >= player.bodyguardLimit) {
                                if (gameStateManager) {
                                    gameStateManager.setState("VIEWING_PROTECTION"); // Refresh UI
                                }
                            }
                        } else {
                            this.addMessage("Failed to hire bodyguard.", [255, 100, 100]);
                        }
                        return true;
                    }
                    else if (btn.action === "DISMISS_BODYGUARDS") {
                        player.dismissBodyguards();
                        this.addMessage("All bodyguards have been dismissed.", [255, 180, 100]);
                        if (gameStateManager) {
                            gameStateManager.setState("VIEWING_PROTECTION"); // Refresh UI
                        }
                        return true;
                    }
                    else if (btn.state === "DOCKED") {
                        if (gameStateManager) gameStateManager.setState("DOCKED");
                        return true;
                    }
                }
            }
            return false;
        }

        // --- GALAXY_MAP State ---
        else if (currentState === "GALAXY_MAP") { 
            return this.handleGalaxyMapClicks(mx, my, galaxy, player, gameStateManager); 
        }
        // --- GAME_OVER State ---
        else if (currentState === "GAME_OVER") { window.location.reload(); return true; }

        return false; // Click not handled by any relevant UI state
    } // End handleMouseClicks

    /** Helper to check if mouse coords are within a button area object {x,y,w,h} */
    isClickInArea(mx, my, area) {
        return area && area.w > 0 && area.h > 0 && mx > area.x && mx < area.x + area.w && my > area.y && my < area.y + area.h;
    }

    /** Draws the Shipyard Menu (when state is VIEWING_SHIPYARD) */
    drawShipyardMenu(player) {
        if (!player) return;
        this.shipyardListAreas = [];
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([30,30,60,230], [100,200,255]);
        
        // Use the standardized header
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Shipyard", station, player, system);
        
        // Calculate trade-in value (70% of current ship's value)
        const currentShipType = player.shipTypeName || "Vulture"; // This could be name or key
        //console.log(`Looking up ship: "${currentShipType}"`);
    
        // IMPROVED LOOKUP LOGIC - Try multiple methods to find the ship
        let currentShipDef = null;
        
        // Method 1: Try direct lookup by object key
        if (SHIP_DEFINITIONS[currentShipType]) {
            currentShipDef = SHIP_DEFINITIONS[currentShipType];
            //console.log(`Found ship by direct key lookup: ${currentShipDef.name}`);
        } 
        // Method 2: Try lookup by display name
        else {
            currentShipDef = Object.values(SHIP_DEFINITIONS).find(ship => 
                ship.name === currentShipType
            );
            
            // Method 3: Try case-insensitive lookup
            if (!currentShipDef) {
                currentShipDef = Object.values(SHIP_DEFINITIONS).find(ship => 
                    ship.name.toLowerCase() === currentShipType.toLowerCase()
                );
            }
        }
    
        // Debug logging 
        if (currentShipDef) {
            //console.log(`Found ship: ${currentShipDef.name}, price: ${currentShipDef.price}`);
        } else {
            console.log(`Ship not found: "${currentShipType}"`);
            //console.log("Available ships:", Object.values(SHIP_DEFINITIONS).map(s => s.name));
        }
    
        const currentShipValue = currentShipDef ? Math.floor(currentShipDef.price * 0.7) : 0;
        
        // Show trade-in info at top of shipyard
        fill(180, 220, 255);
        textSize(20);
        textAlign(LEFT, TOP);
        text(`Your current ship: ${currentShipType} (Trade-in value: ${currentShipValue} credits)`, pX+20, pY+headerHeight);
        

        // FILTER SHIPS based on system properties
        const systemTechLevel = system?.techLevel || 1;
        const isMillitarySystem = system?.economyType === "Military";
        
        const availableShips = Object.entries(SHIP_DEFINITIONS).filter(([shipKey, shipData]) => {
            // Never show alien ships
            if (shipData.aiRoles && shipData.aiRoles.includes("ALIEN")) {
                return false;
            }
            
            // Only show military ships in military systems
            if (shipData.aiRoles && shipData.aiRoles.includes("MILITARY")) {
                return isMillitarySystem;
            }
            
            // Tech level filtering - estimate tech level from price if not explicitly defined
            const shipTechLevel = shipData.techLevel || Math.min(5, Math.ceil(shipData.price / 40000));
            return shipTechLevel <= systemTechLevel;
        });



            // List ships with adjusted Y position
        let rowH = 40, startY = pY+headerHeight+30, visibleRows = floor((pH-headerHeight-90)/rowH);
        let totalRows = availableShips.length;  // Use filtered count
        let scrollAreaH = visibleRows * rowH;
        this.shipyardScrollMax = max(0, totalRows - visibleRows);

        // Clamp scroll offset
        this.shipyardScrollOffset = constrain(this.shipyardScrollOffset, 0, this.shipyardScrollMax);

        // Draw visible ships
        let firstRow = this.shipyardScrollOffset;
        let lastRow = min(firstRow + visibleRows, totalRows);
        textSize(20);
        for (let i = firstRow; i < lastRow; i++) {
             let [shipKey, ship] = availableShips[i]; // 'shipKey' is the correct key for the current ship
            let y = startY + (i-firstRow)*rowH;
            
            const isCurrentShip = ship.name === currentShipType || 
                                (currentShipDef && ship.name === currentShipDef.name);
            
            if (isCurrentShip) {
                fill(40, 40, 80); 
            } else {
                fill(60, 60, 100);
            }
            
            stroke(120, 180, 255);
            rect(pX+20, y, pW-40, rowH-6, 5);
            
            fill(255);
            noStroke();
            textAlign(LEFT, CENTER);
            
            const originalPrice = ship.price;
            const finalPrice = originalPrice - currentShipValue;
            
            if (isCurrentShip) {
                text(`${ship.name}  |  Hull: ${ship.baseHull}  |  Cargo: ${ship.cargoCapacity}     CURRENT SHIP`, pX+30, y+rowH/2);
            } else {
                textAlign(LEFT, CENTER);
                text(`${ship.name}  |  Hull: ${ship.baseHull}  |  Cargo: ${ship.cargoCapacity}    Price: ${originalPrice}cr`, pX+30, y+rowH/2);
                
                textAlign(RIGHT, CENTER);
                
                if (finalPrice > 0) {
                    fill(255, 220, 100); 
                    text(`Final Cost: ${finalPrice}cr`, pX+pW-40, y+rowH/2);
                } else if (finalPrice < 0) {
                    fill(100, 255, 150); 
                    text(`Refund: ${-finalPrice}cr`, pX+pW-40, y+rowH/2);
                } else {
                    fill(255, 255, 255); 
                    text(`Even Swap`, pX+pW-40, y+rowH/2);
                }
                
                fill(255);
                
                this.shipyardListAreas.push({
                    x: pX+20, y: y, w: pW-40, h: rowH-6,
                    shipTypeKey: shipKey, // <<< USE THE CORRECT shipKey HERE
                    shipName: ship.name,
                    price: finalPrice, 
                    originalPrice: originalPrice
                });
            }
        }

    
        // Draw scrollbar if needed
        this.shipyardScrollbarArea = this._drawScrollbar(
            pX + pW - 18, 
            startY, 
            12, 
            scrollAreaH, 
            this.shipyardScrollOffset, 
            this.shipyardScrollMax, 
            visibleRows, 
            totalRows
        );
    
        // Back button using standardized helper
        this.shipyardDetailButtons = {back: this._drawStandardBackButton()};
        pop();
    }




    /** Draws the Upgrades Menu (when state is VIEWING_UPGRADES) */
    drawUpgradesMenu(player) {
        if (!player) return;
        this.upgradeListAreas = [];
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([40,30,60,230], [200,100,255]);
        
        // Use the standardized header
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Upgrades", station, player, system);
        
        // ===== NEW CODE: Add weapon slot selection UI at the top =====
        const slotPanelY = pY + headerHeight + 15;
        const slotPanelH = 80;
        
        fill(40, 40, 70);
        rect(pX + 10, slotPanelY, pW - 20, slotPanelH, 5);
        
        fill(255);
        textAlign(CENTER, TOP);
        textSize(16);
        text("Select Weapon Slot", pX + pW/2, slotPanelY + 5);
        
        // Get available slots from ship's armament array
        const shipDef = SHIP_DEFINITIONS[player.shipTypeName];
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
            
            // Draw slot button
            fill(isSelected ? 100 : 60, isSelected ? 100 : 60, isSelected ? 150 : 90);
            stroke(isSelected ? 150 : 100, isSelected ? 150 : 100, isSelected ? 255 : 150);
            strokeWeight(1);
            rect(slotX, slotY, slotBtnW, slotBtnH, 4);
            
            // Draw slot info
            noStroke();
            textSize(20);
            fill(230);
            textAlign(CENTER, CENTER);
            text(`Slot ${i+1}`, slotX + slotBtnW/2, slotY + 10);
            textSize(12);
            text((i < player.weapons.length) ? player.weapons[i]?.name : "Empty", slotX + slotBtnW/2, slotY + 25);
            
            // Store button area
            this.weaponSlotButtons.push({
                x: slotX, y: slotY, w: slotBtnW, h: slotBtnH, 
                slotIndex: i
            });
        }
        
        // FILTER UPGRADES based on system tech level
        const systemTechLevel = system?.techLevel || 1;
        
        // Filter weapons based on tech level
        const availableWeapons = WEAPON_UPGRADES.filter(weapon => {
            // Determine weapon tech level - either explicitly defined or estimated from damage and price
            const weaponTechLevel = weapon.techLevel || 
                Math.min(5, Math.ceil((weapon.damage * weapon.price) / 5000));
                
            return weaponTechLevel <= systemTechLevel;
        });
    
    

        // ===== END NEW CODE =====
             
        // Continue with existing upgrade menu drawing (adjust startY)
        let rowH = 40, startY = slotPanelY + slotPanelH + 10;

        // Use the filtered weapons array consistently
        let visibleRows = floor((pH - startY - 60) / rowH);
        let totalRows = availableWeapons.length; // <-- CHANGED: Use filtered array length
        let scrollAreaH = visibleRows * rowH;
        this.upgradeScrollMax = max(0, totalRows - visibleRows);
        // Clamp scroll offset
        if (typeof this.upgradeScrollOffset !== "number") this.upgradeScrollOffset = 0;
        this.upgradeScrollOffset = constrain(this.upgradeScrollOffset, 0, this.upgradeScrollMax);
    
        // Draw visible upgrades
        let firstRow = this.upgradeScrollOffset;
        let lastRow = min(firstRow + visibleRows, totalRows);
        textSize(20);
        for (let i = firstRow; i < lastRow; i++) {
            let upg = availableWeapons[i];
            let y = startY + (i-firstRow)*rowH;
            fill(80,60,120); stroke(180,100,255); rect(pX+20, y, pW-40, rowH-6, 5);
            fill(255); noStroke(); textAlign(LEFT,CENTER);
            text(
                `${upg.name}  |  Type: ${upg.type}  |  DPS: ${upg.damage}  |  Price: ${upg.price}cr       ${upg.desc}`,
                pX+30, y+rowH/2
            );
            this.upgradeListAreas.push({x:pX+20, y:y, w:pW-40, h:rowH-6, upgrade:upg});
        }
    
        // Draw scrollbar if needed
        this.upgradeScrollbarArea = this._drawScrollbar(
            pX + pW - 18, 
            startY, 
            12, 
            scrollAreaH, 
            this.upgradeScrollOffset, 
            this.upgradeScrollMax, 
            visibleRows, 
            totalRows,
            [180, 100, 255]
        );
    
        // Back button
        // Back button using standardized helper
        this.upgradeDetailButtons = {back: this._drawStandardBackButton()};
        pop();
    }

    /** Handles mouse wheel events for scrolling */
    handleMouseWheel(event, currentState) {
        if (currentState === "VIEWING_SHIPYARD" && this.shipyardScrollMax > 0) {
            this.shipyardScrollOffset += event.deltaY > 0 ? 1 : -1;
            this.shipyardScrollOffset = constrain(this.shipyardScrollOffset, 0, this.shipyardScrollMax);
            return true;
        }
        if (currentState === "VIEWING_UPGRADES" && this.upgradeScrollMax > 0) {
            if (typeof this.upgradeScrollOffset !== "number") this.upgradeScrollOffset = 0;
            this.upgradeScrollOffset += event.deltaY > 0 ? 1 : -1;
            this.upgradeScrollOffset = constrain(this.upgradeScrollOffset, 0, this.upgradeScrollMax);
            return true;
        }
        return false;
    }

    // Add a message to the queue
    addMessage(msg, color = [200, 200, 200], duration = this.messageDisplayTime) { // Added color and duration parameters with defaults
        this.messages.push({ 
            text: msg, 
            time: millis(),
            color: color,      // Store the color
            duration: duration // Store the duration
        });
        // Keep only the last 10 messages (optional)
        if (this.messages.length > 10) this.messages.shift();
    }

    // Draw messages at the bottom of the screen
    drawMessages() {
        const now = millis();
        // Filter messages based on their individual duration
        const recent = this.messages.filter(m => now - m.time < (m.duration || this.messageDisplayTime));
        const toShow = recent.slice(-this.maxMessagesToShow);

        push();
        textAlign(CENTER, BOTTOM);
        textFont(font);
        textSize(20);
        noStroke();
        for (let i = 0; i < toShow.length; i++) {
            const messageItem = toShow[i];
            // Use the message's specific color, or default if not set
            const messageColor = messageItem.color || [200, 200, 200]; 
            
            // Convert color string (like "orange") to array if needed, or handle p5.color object
            if (typeof messageColor === 'string') {
                // Basic string to p5.color conversion (can be expanded)
                try {
                    fill(color(messageColor)); // p5.js color() function
                } catch (e) {
                    fill(200, 200, 200); // Fallback if string is not a valid color
                    console.warn(`UIManager: Invalid color string '${messageColor}' for message. Using default.`);
                }
            } else if (Array.isArray(messageColor)) {
                fill(...messageColor); // Spread array for fill(r,g,b,a)
            } else {
                 fill(messageColor); // Assume it's a p5.Color object or similar
            }

            text(
                messageItem.text,
                width / 2,
                height - 10 - (toShow.length - 1 - i) * 22
            );
        }
        pop();
    }

    // Update this method to check the back button first
    handleMarketMousePress(mx, my, market, player) {
        // First check if clicking on the back button
        if (this.isClickInArea(mx, my, this.marketBackButtonArea)) { 
            if(gameStateManager) gameStateManager.setState("DOCKED"); 
            return true; 
        }
        
        // Check if clicking on a market button
        for (const btn of this.marketButtonAreas) {
            if (this.isClickInArea(mx, my, btn)) {
                this.marketButtonHeld = btn;
                this.performMarketAction(btn, market, player);
                this.lastButtonAction = millis();
                return true;
            }
        }
        return false;
    }

    // Add this new method to handle mouse release
    handleMarketMouseRelease() {
        this.marketButtonHeld = null;
        return false;
    }

    // Add this new method to check for held buttons
    checkMarketButtonHeld(market, player) {
        if (this.marketButtonHeld && millis() - this.lastButtonAction > this.buttonRepeatDelay) {
            this.performMarketAction(this.marketButtonHeld, market, player);
            this.lastButtonAction = millis();
        }
    }

    // Add this new method to perform the market action
    performMarketAction(btn, market, player) {
        if (!market || !player || !btn) return;
        
        switch(btn.action) {
            case 'buy':
                market.buy(btn.commodity, 1, player);
                break;
            case 'buyAll':
                // Calculate max possible purchase based on cargo space and credits
                const item = market.getPrices().find(c => c.name === btn.commodity);
                if (!item) return;
                
                const availableSpace = player.cargoCapacity - player.getCargoAmount();
                const maxAffordable = Math.floor(player.credits / item.buyPrice);
                const quantity = Math.min(availableSpace, maxAffordable);
                
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

    /** Draws a standardized header for all station UI screens */
    drawStationHeader(title, station, player, system) {
        if (!station || !player) return 0;
        
        const {x: pX, y: pY, w: pW} = this.getPanelRect();
        const headerHeight = 100; // Standard header height
        
        // Title (specific to each screen)
        fill(255); 
        noStroke();
        textFont(font);
        textSize(30); 
        textAlign(CENTER, TOP);
        text(title, pX + pW/2, pY + 20);
        
        // Station name, economy type and security level (left aligned)
        textSize(20); 
        textAlign(LEFT, TOP);
        const stationName = station.name || "Unknown Station";
        const systemName = system?.name || "Unknown System";
        text(`${stationName} - ${systemName}`, pX+20, pY + 20);
        
        // Economy, Security, and Tech Level (left aligned)
        const econ = system?.securityLevel || "Unknown";
        const tech = system?.techLevel || "?"; // Get tech level
        const econType = system?.economyType || "Unknown"; // Economy type
        textSize(20);
        text(`${econ}   |   Tech: ${tech}   |   ${econType}`, pX +20, pY + 45);
        
        // Credits (right-aligned)
        textAlign(RIGHT, TOP);
        text(`Credits: ${Math.floor(player.credits)}`, pX + pW - 30, pY + 20);
        text(`Cargo: ${Math.floor(player.getCargoAmount())}/${player.cargoCapacity}`, pX + pW - 30, pY + 45);

        return headerHeight; // Return the height used by header
    }

    /**
     * Draws a standardized button and returns its clickable area object.
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} label - Button text
     * @param {Array} fillCol - Fill color [r,g,b]
     * @param {Array} strokeCol - Stroke color [r,g,b]
     * @param {number} [radius=5] - Corner radius
     * @param {Object} [extra={}] - Extra properties to attach to the area object
     * @returns {Object} Area object with x, y, w, h, and any extra properties
     */
    _drawButton(x, y, w, h, label, fillCol, strokeCol, radius = 5, extra = {}) {
        // If this is a back button, force a consistent red background
        if (typeof label === 'string' && label.trim().toLowerCase() === 'back') {
            fillCol = [180, 0, 0];
            strokeCol = [255, 150, 150];
        }
        fill(...fillCol);
        stroke(...strokeCol);
        strokeWeight(2);
        rect(x, y, w, h, radius);
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(22);
        text(label, x + w / 2, y + h / 2);
        return Object.assign({ x, y, w, h }, extra);
    }

    /** Draws the Protection Services menu (when state is VIEWING_PROTECTION) */
    drawProtectionServicesMenu(player) {
        if (!player) return;
        push();
        
        // Initialize button areas
        this.protectionServicesButtons = [];
        
        // Get panel dimensions
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        
        // Draw panel background
        this.drawPanelBG([20, 30, 60, 220], [80, 120, 180]);
        
        // Draw header
        const system = galaxy?.getCurrentSystem();
        const station = system?.station; // Direct property access instead of getStation() method
        const headerHeight = this.drawStationHeader("Protection Services", station, player, system);
        
        // Draw description
        textFont(font);
        fill(220);
        textSize(24);
        textAlign(CENTER, TOP);
        let descY = pY + headerHeight + 20;
        text("Hire professional security guards to protect you during your travels.", pX + pW/2, descY);
        
        // Show current bodyguard status
        textSize(20);
        fill(180, 220, 255);
        let statusY = descY + 40;
        
        // Display active bodyguards
        const activeGuardsCount = player.getActiveGuardsCount();
        text(`Active bodyguards: ${activeGuardsCount}/${player.bodyguardLimit}`, pX + pW/2, statusY);
        
        // Only show guard options if player has space for more
        if (activeGuardsCount < player.bodyguardLimit) {
            // Available guards section
            fill(230);
            textSize(22);
            textAlign(LEFT, TOP);
            text("Available Guards for Hire:", pX + 40, statusY + 40);
            
            // Define guard ship types to offer
            // Using ships that have the GUARD role from the GUARD_SHIPS array
            const guardOptions = [
                { ship: "GladiusFighter", name: "Gladius Security", cost: 8000, description: "Standard security escort" },
                { ship: "Vulture", name: "Vulture Protector", cost: 12000, description: "Heavy combat protection" },
                { ship: "WaspAssault", name: "Wasp Security", cost: 6000, description: "Fast response protection" },
                { ship: "Viper", name: "Viper Guardian", cost: 10000, description: "Agile defender" }
            ];
            
            // Filter to only show ships the player can afford
            const affordableGuards = guardOptions.filter(guard => player.credits >= guard.cost);
            
            if (affordableGuards.length === 0) {
                textSize(20);
                fill(255, 150, 150);
                textAlign(CENTER, TOP);
                text("You don't have enough credits to hire any guards.", pX + pW/2, statusY + 80);
            } else {
                // Draw available guards
                let guardY = statusY + 80;
                textAlign(LEFT, TOP);
                
                affordableGuards.forEach((guard, i) => {
                    const btnX = pX + 40;
                    const btnY = guardY + i * 80;
                    const btnW = pW - 80;
                    const btnH = 70;
                    
                    // Draw guard option background
                    fill(40, 60, 100);
                    stroke(100, 140, 200);
                    strokeWeight(1);
                    rect(btnX, btnY, btnW, btnH, 5);
                    
                    // Draw guard information
                    noStroke();
                    textSize(20);
                    fill(230);
                    textAlign(LEFT, CENTER);
                    text(`Slot ${i+1}: ${guard.name} (${guard.ship})`, btnX + 15, btnY + 15);
                    
                    textSize(16);
                    text(guard.description, btnX + 15, btnY + 40);
                    
                    // Draw cost and hire button
                    textAlign(RIGHT, TOP);
                    fill(150, 230, 150);
                    text(`${guard.cost.toLocaleString()} Cr`, btnX + btnW - 100, btnY + 15);
                    
                    // Draw hire button
                    const hireBtn = this._drawButton(
                        btnX + btnW - 90, 
                        btnY + 10, 
                        80, 
                        30, 
                        "HIRE", 
                        [50, 100, 50], 
                        [100, 200, 100]
                    );
                    
                    // Add ship info to button
                    hireBtn.action = "HIRE_BODYGUARD";
                    hireBtn.shipType = guard.ship;
                    hireBtn.cost = guard.cost;
                    
                    this.protectionServicesButtons.push(hireBtn);
                    
                    // Reset alignment
                    textAlign(LEFT, TOP);
                });
            }
        } else {
            // Max bodyguards reached
            textSize(20);
            fill(255, 200, 100);
            textAlign(CENTER, TOP);
            text("Maximum number of bodyguards hired.", pX + pW/2, statusY + 80);
        }
        
        // Position the back button consistently with other screens
        const backY = pY + pH - 30 - 15; // Standard positioning: pY + pH - backH - 15
        
        // Position dismiss button above the back button
        const dismissBtnY = backY - 50;
        
        // Draw dismiss all button if player has active bodyguards
        if (activeGuardsCount > 0) {
            // Center the dismiss button properly
            const dismissBtn = this._drawButton(
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
        
        // Draw back button with standard positioning
        const backButton = this._drawButton(
            pX + pW/2 - 60, 
            backY, 
            120, 
            40, 
            "BACK", 
            [60, 60, 100], 
            [120, 120, 180]
        );
        backButton.state = "DOCKED";
        this.protectionServicesButtons.push(backButton);
        
        pop();
    }
} // End of UIManager Class