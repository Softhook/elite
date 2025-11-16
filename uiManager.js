// ****** uiManager.js ******

class UIManager {
    constructor() {
        // --- UI Areas ---
        this._initUIAreas();
        // --- UI State ---
        this.lockedDestinationIndex = -1; // Tracks locked destination on Galaxy Map (-1 for none)
        // --- Minimap ---
        this._initMinimap();
        // --- Shipyard/Upgrade/Repairs ---
        this._initShopAreas();
        // --- FPS Tracking ---
        this._initFPSTracking();
        // --- Message System ---
        this._initMessages();
        // --- Weapon/Combat ---
        this.selectedWeaponSlot = 0;
        this.weaponSlotButtons = [];
        this._initBattleIndicators();
        // --- Panel Defaults ---
        this.setPanelDefaults();
        // --- Minimap Color Mapping ---
        this.roleMinimapColors = {};
        this.roleMinimapColors[AI_ROLE.POLICE] = [0, 120, 255];    // Blue for police
        this.roleMinimapColors[AI_ROLE.TRANSPORT] = [255, 140, 0]; // Orange for transporters
        this.roleMinimapColors[AI_ROLE.HAULER] = [255, 200, 0];    // Yellow for haulers
        this.roleMinimapColors[AI_ROLE.GUARD] = this.roleMinimapColors[AI_ROLE.HAULER]; // Guards same as haulers
        this.roleMinimapColors[AI_ROLE.PIRATE] = [255, 0, 0];      // Red for pirates
        this.roleMinimapColors[AI_ROLE.ALIEN] = [0, 200, 0];       // Green for aliens
        this.roleMinimapColors[AI_ROLE.COMBAT] = [128, 0, 128];    // Purple for combat ships
    }

    // --- Initialization Helpers ---
    _initUIAreas() {
        this.marketButtonAreas = [];
        this.galaxyMapNodeAreas = [];
        this.galaxyMapMarketButtonAreas = []; // Market info buttons on galaxy map
        this.jumpButtonArea = {};
        this.stationMenuButtonAreas = [];
        this.missionListButtonAreas = [];
        this.missionDetailButtonAreas = {};
        this.policeButtonAreas = [];
        this.inactiveMissionIds = new Set();
        this.marketBackButtonArea = {};
        this.marketOverlaySystemIndex = -1; // Track which system's market is being displayed
        this.storageButtonAreas = [];
        this.recordButtonAreas = [];
        this.recordScrollOffset = 0;
        this.recordScrollMax = 0;
    }

    _initMinimap() {
        this.minimapSize = 200;
        this.minimapMargin = 15;
        this.minimapX = 0;
        this.minimapY = 0;
        this.minimapWorldViewRange = 5000;
        this.minimapScale = 1;
        this.minimapHazardsBuffer = null;
        this._minimapHazardsBufferSize = 0;
    }

    _initShopAreas() {
        this.shipyardListAreas = [];
        this.shipyardDetailButtons = {};
        this.upgradeListAreas = [];
        this.upgradeDetailButtons = {};
        this.repairsFullButtonArea = {};
        this.repairsHalfButtonArea = {};
        this.repairsBackButtonArea = {};
        this.shipyardScrollOffset = 0;
        this.shipyardScrollMax = 0;
    }

    _initFPSTracking() {
        this.fpsValues = [];
        this.fpsMaxSamples = 30;
        this.fpsUpdateInterval = 10;
        this.fpsFrameCount = 0;
        this.fpsAverage = 0;
    }

    _initMessages() {
        this.messages = [];
        this.messageDisplayTime = 4000;
        this.maxMessagesToShow = 4;
        this.communicationMessages = [];
        this.communicationDisplayTime = 15000;
        this.maxCommunicationMessagesToShow = 5;
        this.communicationQueueLimit = 12;
        this.marketButtonHeld = null;
        this.lastButtonAction = 0;
        this.buttonRepeatDelay = 150;
        this._lastMessageBlockHeight = 0;
    }

    _initBattleIndicators() {
        this.battleIndicators = [];
        this.battleIndicatorDuration = 1200;
        this.battleIndicatorLineLength = 25;
        this.battleIndicatorEdgeBuffer = 10;
        // Pre-calculated screen values (updated in drawBattleIndicators)
        this._cachedScreenCenterX = 0;
        this._cachedScreenCenterY = 0;
    }

    /** Sets standardized panel geometry for all station menus */
    setPanelDefaults() {
        this.panelX = () => width * 0.1;
        this.panelY = () => height * 0.1;
        this.panelW = () => width * 0.8;
        this.panelH = () => height * 0.8;
    }

    /** Returns standardized panel geometry */
    getPanelRect() {
        return {
            x: this.panelX(),
            y: this.panelY(),
            w: this.panelW(),
            h: this.panelH()
        };
    }

    /** Draws a standardized panel background */
    drawPanelBG(fillCol, strokeCol) {
        const {x, y, w, h} = this.getPanelRect();
        fill(...fillCol); stroke(...strokeCol); rect(x, y, w, h, 10);
    }

    /**
     * Tracks a combat sound event that might be off-screen.
     * Called by SoundManager.
     * @param {number} x - World X coordinate of the sound event.
     * @param {number} y - World Y coordinate of the sound event.
     * @param {string} soundType - The type/name of the sound (e.g., "laser", "explosion").
     */
    trackCombatSound(x, y, soundType) {

        // Optional: Filter for specific combat-related sound types if needed
        const combatSounds = ['laser', 'explosion', 'hit', 'shield', 'missileLaunch', 'beam', 'turret'];
        if (!combatSounds.includes(soundType)) {
            // console.log(`UIManager: Sound '${soundType}' is not in combatSounds list for indicator.`); // DEBUG if filter active
            // return; // Uncomment if you only want specific sounds to trigger indicators
        }

        this.battleIndicators.push({
            x: x, // World X
            y: y, // World Y
            timestamp: millis(),
            type: soundType
        });
        //console.log(`UIManager: Indicator pushed. Total indicators: ${this.battleIndicators.length}`); // DEBUG

        this.cleanupBattleIndicators();
    }

    /**
     * Removes battle indicators that have exceeded their duration.
     */
    cleanupBattleIndicators() {
        const now = millis();
        this.battleIndicators = this.battleIndicators.filter(indicator =>
            now - indicator.timestamp < this.battleIndicatorDuration
        );
    }

    /**
     * Draws battle indicators for off-screen events.
     * These appear as white lines at the screen edge.
     * @param {Player} player - The player object, needed for their position.
     */
    drawBattleIndicators(player) {
        if (!player || !player.pos || this.battleIndicators.length === 0) {
            return;
        }

        // It's good practice to also call cleanup here in case trackCombatSound isn't called frequently
        this.cleanupBattleIndicators();
        if (this.battleIndicators.length === 0) return;


        push();
        const screenCenterX = width / 2;
        const screenCenterY = height / 2;
        const edgeBuffer = this.battleIndicatorEdgeBuffer;

        // Calculate screen boundaries in world coordinates
        const viewRect = {
            left: player.pos.x - screenCenterX,
            right: player.pos.x + screenCenterX,
            top: player.pos.y - screenCenterY,
            bottom: player.pos.y + screenCenterY
        };

        for (let i = 0, len = this.battleIndicators.length; i < len; i++) {
            const indicator = this.battleIndicators[i];
            // Check if the indicator's world position is off-screen
            const isOffScreen = (
                indicator.x < viewRect.left ||
                indicator.x > viewRect.right ||
                indicator.y < viewRect.top ||
                indicator.y > viewRect.bottom
            );

            if (!isOffScreen) {
                continue;
            }

            // Calculate direction vector from player to the sound event
            const dx = indicator.x - player.pos.x;
            const dy = indicator.y - player.pos.y;
            const angleToEvent = atan2(dy, dx); // Angle in world space

            let edgeX, edgeY; // These will be screen coordinates

            // Determine the point on the screen border in the direction of the event
            // This logic finds an intersection point with a boundary slightly inset from the screen edge
            const h = height - 2 * edgeBuffer; // Effective height for intersection
            const w = width - 2 * edgeBuffer;  // Effective width for intersection

            // Calculate intersection with vertical edges (left/right of screen)
            // Relative distances from screen center to edge
            let tVert = Infinity;
            if (abs(cos(angleToEvent)) > 1e-6) { // Avoid division by zero
                tVert = (cos(angleToEvent) > 0 ? w / 2 : -w / 2) / cos(angleToEvent);
            }
            const yAtScreenVertEdge = screenCenterY + sin(angleToEvent) * tVert;

            // Calculate intersection with horizontal edges (top/bottom of screen)
            let tHoriz = Infinity;
            if (abs(sin(angleToEvent)) > 1e-6) { // Avoid division by zero
                tHoriz = (sin(angleToEvent) > 0 ? h / 2 : -h / 2) / sin(angleToEvent);
            }
            const xAtScreenHorizEdge = screenCenterX + cos(angleToEvent) * tHoriz;

            // Choose the closer valid intersection point on the screen border
            if (abs(yAtScreenVertEdge - screenCenterY) <= h / 2 && tVert < tHoriz) {
                edgeX = (cos(angleToEvent) > 0 ? width - edgeBuffer : edgeBuffer);
                edgeY = constrain(yAtScreenVertEdge, edgeBuffer, height - edgeBuffer);
            } else if (abs(xAtScreenHorizEdge - screenCenterX) <= w / 2) {
                edgeY = (sin(angleToEvent) > 0 ? height - edgeBuffer : edgeBuffer);
                edgeX = constrain(xAtScreenHorizEdge, edgeBuffer, width - edgeBuffer);
            } else {
                // Fallback for corner cases: attempt to place based on dominant angle component
                if (abs(cos(angleToEvent)) > abs(sin(angleToEvent))) {
                    edgeX = (cos(angleToEvent) > 0 ? width - edgeBuffer : edgeBuffer);
                    edgeY = constrain(screenCenterY + tan(angleToEvent) * (edgeX - screenCenterX), edgeBuffer, height - edgeBuffer);
                } else {
                    edgeY = (sin(angleToEvent) > 0 ? height - edgeBuffer : edgeBuffer);
                    edgeX = constrain(screenCenterX + (edgeY - screenCenterY) / tan(angleToEvent), edgeBuffer, width - edgeBuffer);
                }
            }
            
            // Final clamp to ensure it's on the visible border area
            edgeX = constrain(edgeX, edgeBuffer, width - edgeBuffer);
            edgeY = constrain(edgeY, edgeBuffer, height - edgeBuffer);

            // Calculate opacity based on age for fade-out effect
            const age = millis() - indicator.timestamp;
            const opacity = map(age, 0, this.battleIndicatorDuration, 220, 0); // Max opacity 220

            if (opacity <= 0) continue;

            strokeWeight(2);
            stroke(255, 255, 255, opacity); // White, fading line

            const lineHalfLength = this.battleIndicatorLineLength / 2;

            // Draw line "alongside" the edge
            if (edgeX <= edgeBuffer + 1 || edgeX >= width - edgeBuffer - 1) { // On left or right edge (allow for float precision)
                // Draw a vertical line
                line(edgeX, edgeY - lineHalfLength, edgeX, edgeY + lineHalfLength);
            } else if (edgeY <= edgeBuffer + 1 || edgeY >= height - edgeBuffer - 1) { // On top or bottom edge
                // Draw a horizontal line
                line(edgeX - lineHalfLength, edgeY, edgeX + lineHalfLength, edgeY);
            }
        }
        pop();
    }



    /** Draws the Heads-Up Display (HUD) during flight */
    drawHUD(player) {
        if (!player) { console.warn("drawHUD: Player object missing"); return; }
        const csName = player.currentSystem?.name || 'N/A'; 
        const cargoAmt = player.getCargoAmount() ?? 0;
        const cargoCap = player.cargoCapacity ?? 0; 
        const hull = player.hull ?? 0; 
        const maxHull = player.maxHull || 1;
        const credits = player.credits ?? 0;
        const shipName = player.shipTypeName || "Unknown Ship";
        const eliteRating = player.getEliteRating(); // Get elite rating
    
        this.drawBattleIndicators(player); 

        // Top HUD bar background
        push(); 
        fill(0, 180, 0, 150); 
        noStroke(); 
        rect(0, 0, width, 40);
        
        // Left side - System name with additional info
        fill(255); 
        textFont(font);
        textSize(20); 
        textAlign(LEFT, CENTER); 
        const systemType = player.currentSystem?.economyType || 'Unknown';
        const secLevel = player.currentSystem?.securityLevel || 'Unknown';
        const techLevel = player.currentSystem?.techLevel || '?';
        text(`${csName}            ${systemType}   Tech: ${techLevel}   Security: ${secLevel}`, 10, 20);
        
        // ALIGNED: Status elements at consistent vertical position
        const statusLineY = 20; // Central Y position for all status elements
        
        // Center - LEGAL status - aligned at statusLineY
        if (player.currentSystem?.isPlayerWanted()) {
            fill(255, 0, 0);
            text(`${eliteRating} - Wanted`, width/2, statusLineY);
        } else {
            fill(255);
            textAlign(CENTER, CENTER);
            
            // Add Elite rating to status display
            text(`${eliteRating} - ` + (player.isPolice ? "POLICE" : "LEGAL"), width/2, statusLineY);
        }
        
        // Right side - Ship info - aligned with statusLineY
        fill(255);
        textAlign(RIGHT, CENTER);
        text(`Cargo: ${cargoAmt}/${cargoCap}   Credits: ${credits}`, width-300, statusLineY);
        
        // === Shield and Hull bars integration in top bar ===
        const barWidth = 140;
        const barHeight = 14;
        const barX = width - 150;
        const barMiddleY = 20;

        // Upper bar - Shield
        if (player.maxShield > 0) {
            // Shield background 
            fill(20, 20, 60);
            rect(barX, barMiddleY - barHeight - 2, barWidth, barHeight);
            
            // Shield level
            const shieldPercent = player.shield / player.maxShield;
            fill(50, 100, 255);
            rect(barX, barMiddleY - barHeight - 2, barWidth * shieldPercent, barHeight);
            
            // Shield border
            stroke(100, 150, 255);
            noFill();
            rect(barX, barMiddleY - barHeight - 2, barWidth, barHeight);
            
            // Shield text
            fill(255);
            noStroke();
            textFont(font);
            textAlign(RIGHT, CENTER);
            textSize(20);
            text(`Shield: ${Math.floor(player.shield)}/${player.maxShield}`, barX - 10, barMiddleY - barHeight/2 - 2);
        }

        // Lower bar - Hull
        fill(60, 20, 20);
        rect(barX, barMiddleY + 2, barWidth, barHeight);

        // Hull level
        const hullPercent = player.hull / player.maxHull;
        fill(255, 50, 50);
        rect(barX, barMiddleY + 2, barWidth * hullPercent, barHeight);

        // Hull border
        stroke(255, 100, 100);
        noFill();
        rect(barX, barMiddleY + 2, barWidth, barHeight);

        // Hull text
        fill(255);
        noStroke();
        textAlign(RIGHT, CENTER);
        textSize(20);
        text(`Hull: ${Math.floor(player.hull)}/${player.maxHull}`, barX - 10, barMiddleY + barHeight/2 + 2);
        
        // Weapon selector (with integrated cooldown bar)
        this.drawWeaponSelector(player);
        
        pop();
        if (gameStateManager?.currentState !== "GALAXY_MAP") {
            this.drawTargetOverlay(player);
        }
    }

    /** Draws the weapon selector UI */
    drawWeaponSelector(player) {
        if (!player?.weapons || player.weapons.length === 0) return;
        
        const weaponBarY = 45; // Position below main HUD bar
        const weaponBarH = 24;
        
        // Background for weapon bar
        push();
        fill(0, 50, 80, 150);
        noStroke();
        rect(0, weaponBarY, width, weaponBarH);
        
        // Display weapon slots
        textAlign(LEFT, CENTER);
        textSize(20);
        let xPos = 10;
        
        const weaponIdx = player.weaponIndex;
        for (let index = 0, len = player.weapons.length; index < len; index++) {
            const weapon = player.weapons[index];
            // Calculate width for this weapon slot
            const isSelected = (index === weaponIdx);
            const slotPadding = 10;
            const slotText = `${index+1}: ${weapon.name}`;
            const textW = textWidth(slotText);
            const slotW = textW + slotPadding * 2;
            
            // Draw slot background
            if (isSelected) {
                fill(0, 100, 180, 200); // Highlight selected weapon
            } else {
                fill(0, 80, 120, 120); // Normal background
            }
            rect(xPos, weaponBarY + 3, slotW, weaponBarH - 6, 5);
            
            // Draw weapon name with key number
            if (isSelected) {
                fill(255, 255, 100); // Bright text for selected
            } else {
                fill(200); // Regular text
            }
            text(slotText, xPos + slotPadding, weaponBarY + weaponBarH/2);
            
            // Draw cooldown or heat bar for the selected weapon
            if (isSelected) {
                let indicatorRatio = 0;
                let indicatorColor = [255, 50, 50, 200];

                if (weapon.type === WEAPON_TYPE.BEAM && typeof WeaponSystem !== 'undefined') {
                    indicatorRatio = WeaponSystem.getHeatRatio(player, weapon);
                    if (indicatorRatio > 0) {
                        indicatorColor = WeaponSystem.isBeamOverheated(player, weapon)
                            ? [255, 120, 40, 230]
                            : [255, 200, 80, 200];
                    }
                } else if (player.fireCooldown > 0 && player.fireRate > 0) {
                    indicatorRatio = constrain(map(player.fireCooldown, player.fireRate, 0, 0, 1), 0, 1);
                }

                if (indicatorRatio > 0) {
                    fill(indicatorColor[0], indicatorColor[1], indicatorColor[2], indicatorColor[3]);
                    noStroke();
                    rect(xPos, weaponBarY + weaponBarH - 3, slotW * indicatorRatio, 3);
                }
            }
            
            // Move to next position
            xPos += slotW + 5;
        }
        
        // NEW: Draw active mission on the RIGHT side of the weapon bar
        if (player.activeMission?.title) {
            const missionText = `Mission: ${player.activeMission.title}`;
            
            // Create a background for the mission text
            const missionPadding = 10;
            textSize(20);
            const missionTextW = textWidth(missionText);
            const missionBoxW = missionTextW + missionPadding * 2;
            const missionBoxX = width - missionBoxW - 10; // 10px from right edge
            
            // Draw mission background
            fill(0, 80, 140, 200); // Slightly brighter blue than weapon bar
            stroke(0, 100, 180);
            strokeWeight(1);
            rect(missionBoxX, weaponBarY + 3, missionBoxW, weaponBarH - 6, 5);
            
            // Draw mission text
            fill(255, 180, 0); // Gold text for mission
            noStroke();
            textAlign(LEFT, CENTER);
            text(missionText, missionBoxX + missionPadding, weaponBarY + weaponBarH/2);
            
            // Optional: Add a small indicator icon
            fill(255, 200, 0);
            circle(missionBoxX + 6, weaponBarY + weaponBarH/2, 5);
        }

                // Add Autopilot status indicator below weapon bar
                if (player.autopilotEnabled) {
                    const target = player.autopilotTarget === 'station' ? 'Station' : 'Jump Zone';
                    const autopilotY = 45 + 24 + 5; // Position below weapon bar
                    
                    // Draw autopilot indicator background
                    fill(40, 80, 120, 200);
                    noStroke();
                    rect(0, autopilotY, width, 20);
                    
                    // Draw autopilot text
                    textAlign(CENTER, CENTER);
                    textSize(20);
                    fill(255, 255, 100);
                    text(`Autopilot Engaged: ${target} — [${player.autopilotTarget === 'station' ? 'H' : 'J'} to disable]`, width/2, autopilotY + 10);
                }
                
        
        pop();
    }

    /** Draws an information overlay for the currently targeted ship */
    drawTargetOverlay(player) {
        const target = player?.target;
        if (!target || target === player) { return; }
        if (typeof target.isDestroyed === 'function' && target.isDestroyed()) { return; }

        const hasShipIdentity = typeof target.shipTypeName === 'string' || typeof target.shipDefinition === 'object';
        if (!hasShipIdentity) { return; }

        const panelWidth = Math.min(280, Math.max(200, width * 0.2));
        const padding = 12;
        const lineHeight = 20;
        const sectionSpacing = 8;
        const autopilotOffset = player?.autopilotEnabled ? 35 : 0;
        const panelX = width - panelWidth - 20;
        const panelY = 80 + autopilotOffset;
        const minimapTop = height - this.minimapSize - this.minimapMargin;
        const maxPanelHeight = Math.max(150, minimapTop - panelY - 10);

        const pilotName = this._getTargetPilotName(target);
        const shipName = this._getTargetShipName(target);
        const roleLabel = this._formatRoleLabel(target.role);
        const wantedLabel = (typeof target.isWanted === 'boolean') ? (target.isWanted ? 'Wanted' : null) : null;
        const hullPercent = this._getStatPercent(target.hull, target.maxHull);
        const shieldPercent = this._getStatPercent(target.shield, target.maxShield);
        const shipDef = (typeof SHIP_DEFINITIONS !== 'undefined') ? SHIP_DEFINITIONS[target.shipTypeName] : null;
        const cargoCapacity = Number.isFinite(target?.cargoCapacity) ? target.cargoCapacity : shipDef?.cargoCapacity;
        const cargoAmount = (typeof target.getCargoAmount === 'function')
            ? target.getCargoAmount()
            : this._computeCargoAmount(target.cargoHold);
        const rangeLine = this._formatRangeLine(player, target);
        const weaponsList = this._getTargetWeapons(target);

        const infoLines = [];
        infoLines.push(`${shipName}${roleLabel ? ` (${roleLabel})` : ''}`);
        if (rangeLine) {
            infoLines.push(rangeLine);
        }

        const cargoEntries = this._getCargoEntries(target);
        let cargoLines = cargoEntries.length > 0
            ? cargoEntries.map(entry => `${entry.name}: ${entry.quantity}`)
            : ['No cargo detected'];

        // Calculate heights for new sections
        const statBarsHeight = (lineHeight + 4) * 2; // Two stat bars with spacing
        const weaponsHeight = (weaponsList && weaponsList.length > 0) 
            ? (sectionSpacing + lineHeight + weaponsList.length * lineHeight + sectionSpacing)
            : 0;

        const baseHeightWithoutCargo = padding * 2 + lineHeight + lineHeight + sectionSpacing + statBarsHeight + sectionSpacing + weaponsHeight + infoLines.length * lineHeight;
        let showCargoSection = cargoLines.length > 0;
        let renderedCargoLines = cargoLines.slice();
        const cargoHeadingHeight = lineHeight;

        if (showCargoSection) {
            let spaceAfterBase = maxPanelHeight - baseHeightWithoutCargo;
            const minimumBlockHeight = sectionSpacing + cargoHeadingHeight + lineHeight;
            if (spaceAfterBase < minimumBlockHeight) {
                showCargoSection = false;
            } else {
                spaceAfterBase -= sectionSpacing + cargoHeadingHeight;
                const maxCargoLines = Math.floor(spaceAfterBase / lineHeight);
                if (maxCargoLines < renderedCargoLines.length) {
                    if (maxCargoLines < 1) {
                        showCargoSection = false;
                        renderedCargoLines = [];
                    } else {
                        renderedCargoLines = renderedCargoLines.slice(0, maxCargoLines);
                        const remaining = cargoLines.length - maxCargoLines;
                        if (remaining > 0) {
                            const lastIndex = renderedCargoLines.length - 1;
                            renderedCargoLines[lastIndex] = `${renderedCargoLines[lastIndex]} (+${remaining} more)`;
                        }
                    }
                }
            }
        }

        let panelHeight = baseHeightWithoutCargo;
        if (showCargoSection && renderedCargoLines.length > 0) {
            panelHeight += sectionSpacing + cargoHeadingHeight + renderedCargoLines.length * lineHeight;
        }
        panelHeight = Math.min(panelHeight, maxPanelHeight);

        push();
        rectMode(CORNER);
        textAlign(LEFT, TOP);
        textFont(font);

        fill(20, 30, 50, 240);
        stroke(100, 150, 255, 180);
        strokeWeight(2);
        rect(panelX, panelY, panelWidth, panelHeight, 8);
        noStroke()
        const ctx = drawingContext;
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX, panelY, panelWidth, panelHeight);
        ctx.clip();

        let cursorX = panelX + padding;
        let cursorY = panelY + padding;

        fill(255);
        textSize(18);
        text(pilotName, cursorX, cursorY);
        if (wantedLabel) {
            fill(255, 0, 0);
            text(` (${wantedLabel})`, cursorX + textWidth(pilotName), cursorY);
            fill(255);
        }
        cursorY += lineHeight;

        cursorY += sectionSpacing;

        // Draw Hull and Shield status bars with color coding
        this._drawStatBar(cursorX, cursorY, panelWidth - padding * 2, 'Shield', target.shield, target.maxShield, shieldPercent);
        cursorY += lineHeight + 4;
        this._drawStatBar(cursorX, cursorY, panelWidth - padding * 2, 'Hull', target.hull, target.maxHull, hullPercent);
        cursorY += lineHeight;

        cursorY += sectionSpacing;

        fill(210);
        textSize(18);
        for (let i = 0; i < infoLines.length; i++) {
            text(infoLines[i], cursorX, cursorY);
            cursorY += lineHeight;
        }

        cursorY += sectionSpacing;

        // Draw weapons if available
        if (weaponsList && weaponsList.length > 0) {
            fill(190, 220, 255);
            text('Weapons', cursorX, cursorY);
            cursorY += lineHeight;
            fill(210);
            for (let i = 0; i < weaponsList.length; i++) {
                if (weaponsList[i] === target.currentWeapon?.name) {
                    fill(255, 255, 0); // Highlight current weapon in yellow
                } else {
                    fill(210);
                }
                text(weaponsList[i], cursorX, cursorY);
                cursorY += lineHeight;
            }
            fill(210); // Reset fill for subsequent text
            cursorY += sectionSpacing;
        }

        if (showCargoSection && renderedCargoLines.length > 0) {
            cursorY += sectionSpacing;
            fill(190, 220, 255);
            text('Cargo Manifest', cursorX, cursorY);
            cursorY += lineHeight;
            fill(210);
            for (let i = 0; i < renderedCargoLines.length; i++) {
                text(renderedCargoLines[i], cursorX, cursorY);
                cursorY += lineHeight;
            }
        }

        ctx.restore();
        pop();
    }

    _getTargetPilotName(target) {
        if (!target) { return 'Unknown Pilot'; }
        if (typeof target.displayName === 'string' && target.displayName.trim().length > 0) {
            return target.displayName;
        }
        if (target.role === AI_ROLE?.ALIEN) { return 'Unknown Lifeform'; }
        if (typeof target.captainName === 'string' && target.captainName.trim().length > 0) {
            return target.captainName;
        }
        return 'Unidentified Pilot';
    }

    _getTargetShipName(target) {
        if (!target) { return 'Unknown Ship'; }
        const def = (typeof SHIP_DEFINITIONS !== 'undefined') ? SHIP_DEFINITIONS[target.shipTypeName] : null;
        if (def?.name) { return def.name; }
        if (typeof target.shipTypeName === 'string') { return target.shipTypeName; }
        return 'Unknown Ship';
    }

    _formatRoleLabel(role) {
        if (!role) { return ''; }
        if (role === AI_ROLE?.BOUNTY_HUNTER) { return 'Bounty Hunter'; }
        if (typeof role === 'string') { return role.replace(/_/g, ' '); }
        return '';
    }

    _formatStatLine(label, current, max) {
        if (!Number.isFinite(current)) { return null; }
        const safeCurrent = Math.max(0, current);
        if (Number.isFinite(max) && max > 0) {
            const percent = constrain(Math.round((safeCurrent / max) * 100), 0, 999);
            return `${label}: ${Math.round(safeCurrent)}/${Math.round(max)} (${percent}%)`;
        }
        return `${label}: ${Math.round(safeCurrent)}`;
    }

    _formatRangeLine(player, target) {
        if (!player?.pos || !target?.pos) { return null; }
        const distance = dist(player.pos.x, player.pos.y, target.pos.x, target.pos.y);
        if (!Number.isFinite(distance)) { return null; }
        return `Range: ${Math.round(distance)} m`;
    }

    _formatSpeedLine(target) {
        if (!target?.vel || typeof target.vel.mag !== 'function') { return null; }
        const speed = target.vel.mag();
        if (!Number.isFinite(speed)) { return null; }
        return `Speed: ${speed.toFixed(1)} m/s`;
    }

    _getStatPercent(current, max) {
        if (!Number.isFinite(current)) { return 0; }
        const safeCurrent = Math.max(0, current);
        if (Number.isFinite(max) && max > 0) {
            return constrain((safeCurrent / max) * 100, 0, 100);
        }
        return 0;
    }

    _drawStatBar(x, y, width, label, current, max, percent) {
        const barHeight = 14;
        const barWidth = width * 0.7;
        const labelWidth = width * 0.3;
        
        // Draw label
        push();
        textAlign(LEFT, TOP);
        fill(210);
        text(`${label}:`, x, y);
        
        // Draw background bar
        const barX = x + labelWidth;
        fill(40, 40, 60, 200);
        noStroke();
        rect(barX, y, barWidth, barHeight, 2);
        
        // Draw filled portion with color based on percentage
        const fillWidth = (percent / 100) * barWidth;
        let barColor;
        if (label === 'Shield') {
            // Shield colors: cyan to blue to dark
            if (percent > 66) {
                barColor = [0, 200, 255]; // Cyan
            } else if (percent > 33) {
                barColor = [80, 150, 220]; // Blue
            } else {
                barColor = [60, 100, 180]; // Dark blue
            }
        } else {
            // Hull colors: green to yellow to red
            if (percent > 66) {
                barColor = [80, 255, 80]; // Green
            } else if (percent > 33) {
                barColor = [255, 220, 0]; // Yellow
            } else {
                barColor = [255, 80, 80]; // Red
            }
        }
        
        fill(barColor[0], barColor[1], barColor[2]);
        rect(barX, y, fillWidth, barHeight, 2);
        pop();
    }

    _getTargetWeapons(target) {
        if (!target) { return []; }
        
        // Check if target has weapons array
        if (!Array.isArray(target.weapons) || target.weapons.length === 0) {
            return [];
        }
        
        // Extract weapon names, filtering out null/undefined
        const weaponNames = target.weapons
            .filter(weapon => weapon && weapon.name)
            .map(weapon => weapon.name);
        
        return weaponNames.length > 0 ? weaponNames : [];
    }

    _getCargoEntries(target) {
        if (!target) { return []; }
        const hold = Array.isArray(target.cargoHold) ? target.cargoHold : null;
        if (!hold || hold.length === 0) { return []; }
        const entries = hold
            .filter(entry => entry && entry.quantity > 0)
            .map(entry => ({ name: entry.name || 'Unknown', quantity: entry.quantity }));
        entries.sort((a, b) => b.quantity - a.quantity);
        return entries;
    }

    _computeCargoAmount(cargoHold) {
        if (!Array.isArray(cargoHold)) { return NaN; }
        return cargoHold.reduce((sum, entry) => sum + (entry?.quantity || 0), 0);
    }

    /** Draws the Main Station Menu (when state is DOCKED) */
    drawStationMainMenu(station, player) {
        this.stationMenuButtonAreas = [];
        if (!station || !player) { console.warn("drawStationMainMenu missing station or player"); return; }
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([20,20,50,220], [100,100,255]);
        const system = galaxy?.getCurrentSystem();
        const headerHeight = this.drawStationHeader("Station Services", station, player, system);
        textFont(font);
        let btnW=pW*0.6, btnH=45, btnX=pX+pW/2-btnW/2, btnSY=pY+headerHeight, btnSp=btnH+15;
        // Determine faction recruitment option based on system economy type
        const isAnarchySystem = typeof system?.securityLevel === 'string' && system.securityLevel.toLowerCase() === 'anarchy';
        let factionOption = null;
        if (!isAnarchySystem) {
            if (system?.economyType === "Imperial") {
                factionOption = { text: "Imperial Navy Recruitment", state: "VIEWING_IMPERIAL_RECRUITMENT" };
            } else if (system?.economyType === "Separatist") {
                factionOption = { text: "Separatist Forces Recruitment", state: "VIEWING_SEPARATIST_RECRUITMENT" };
            } else if (system?.economyType === "Military") {
                factionOption = { text: "Military Academy Recruitment", state: "VIEWING_MILITARY_RECRUITMENT" };
            } else {
                factionOption = { text: "Police Station", state: "VIEWING_POLICE" };
            }
        }

        const menuOpts = [
            { text: "Commodity Market", state: "VIEWING_MARKET" },
            { text: "Mission Board", state: "VIEWING_MISSIONS" },
            { text: "Shipyard", state: "VIEWING_SHIPYARD" },
            { text: "Upgrades", state: "VIEWING_UPGRADES" },
            { text: "Repairs", state: "VIEWING_REPAIRS" },
            { text: "Protection Services", state: "VIEWING_PROTECTION" },
            { text: "Storage Locker", state: "VIEWING_STORAGE" },
            { text: "Personal Record", state: "VIEWING_RECORD" }
        ];
        if (factionOption) {
            menuOpts.push(factionOption);
        }
        menuOpts.push({ text: "Undock", action: "UNDOCK" });
        for (let i = 0, len = menuOpts.length; i < len; i++) {
            const opt = menuOpts[i];
            let btnY=btnSY+i*btnSp;
            let area = this._drawButton(btnX, btnY, btnW, btnH, opt.text, [50,50,90], [150,150,200]);
            if(opt.state) area.state=opt.state;
            if(opt.action) area.action=opt.action;
            this.stationMenuButtonAreas.push(area);
        }
        pop();
    } // --- End drawStationMainMenu ---

    /** Draws the Repairs Menu */
    drawRepairsMenu(player) {
        this.repairsFullButtonArea = {};
        this.repairsHalfButtonArea = {};
        this.repairsBackButtonArea = {};
        this.repairsBodyguardsButtonArea = {}; // New button area for bodyguard repairs
        
        if (!player) return;
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([60,30,30,230], [255,180,100]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Ship Repairs", station, player, system);
        
        // Player ship repair section
        fill(220); textSize(20); textAlign(CENTER,TOP);
        text(`Hull: ${floor(player.hull)} / ${player.maxHull}`, pX+pW/2, pY+headerHeight+10);
        let missing = player.maxHull - player.hull;
        let fullCost = Math.floor(missing * 10);
        let halfRepair = Math.min(missing, Math.ceil(player.maxHull / 2));
        let halfCost = Math.floor(halfRepair * 7);
        let btnW = pW*0.5, btnH = 45, btnX = pX+pW/2-btnW/2, btnY1 = pY+headerHeight+60, btnY2 = btnY1+btnH+20;
        
        this.repairsFullButtonArea = this._drawButton(btnX, btnY1, btnW, btnH, `Full Repair (${fullCost} cr)`, [0,180,0], [100,255,100]);
        this.repairsHalfButtonArea = this._drawButton(btnX, btnY2, btnW, btnH, `50% Repair (${halfCost} cr)`, [180,180,0], [220,220,100]);
        
        // Bodyguard repair section
        const bodyguardInfo = player.getDamagedBodyguardsInfo();
        let btnY3 = btnY2 + btnH + 40; // Extra spacing between sections
        
        if (bodyguardInfo.count > 0) {
            // Draw separator
            strokeWeight(1);
            stroke(255, 180, 100);
            line(pX + 50, btnY2 + btnH + 20, pX + pW - 50, btnY2 + btnH + 20);
            
            // Draw bodyguard repair section header
            noStroke();
            fill(220);
            textSize(20);
            textAlign(CENTER, TOP);
            
            // Draw bodyguard repair button
            this.repairsBodyguardsButtonArea = this._drawButton(
                btnX, btnY3, btnW, btnH, 
                `Repair All Guards (${bodyguardInfo.totalCost} cr)`, 
                [0,120,180], [100,200,255]
            );
        }
        
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15;
        this.repairsBackButtonArea = this._drawButton(backX, backY, backW, backH, "Back", [180,180,0], [220,220,100]);
        pop();
    }

    /** Draws the Police Menu */
    drawPoliceMenu(player) {
        this.policeButtonAreas = [];
        if (!player) return;
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([30,30,60,230], [100,100,255]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const isAnarchySystem = typeof system?.securityLevel === 'string' && system.securityLevel.toLowerCase() === 'anarchy';

        if (isAnarchySystem) {
            const headerHeight = this.drawStationHeader("No Local Authority", station, player, system);
            textFont(font);
            fill(220);
            textSize(22);
            textAlign(CENTER, TOP);
            const messageY = pY + headerHeight + 20;
            text("This anarchy system has no formal police presence.", pX + pW/2, messageY);
            fill(180, 200, 255);
            textSize(18);
            text("Local disputes are settled without official intervention.", pX + pW/2, messageY + 35);

            const backW = 100, backH = 30, backX = pX + pW/2 - backW/2, backY = pY + pH - backH - 15;
            this.policeButtonAreas.push(
                this._drawButton(backX, backY, backW, backH, "Back", [180,180,0], [220,220,100], 5, {action:'back'})
            );
            pop();
            return;
        }

        const headerHeight = this.drawStationHeader("Police Station", station, player, system);
        fill(255); 
        textSize(20); 
        textAlign(CENTER, TOP);
        const isWanted = system?.isPlayerWanted();
        const statusText = isWanted ? "WANTED" : "CLEAN";
        const statusColor = isWanted ? [255, 50, 50] : [50, 255, 50];
        const contentY = pY + headerHeight + 10;
        text(`Legal Status in ${system?.name || 'Unknown'} System: `, pX+pW/2, contentY);
        fill(statusColor);
        textSize(24);
        text(statusText, pX+pW/2, contentY+30);
        
        // Display police bounty information
        if (player.isPolice) {
            fill(100, 255, 100);
            textSize(18);
            text("Active Bounty: 1,000 cr per pirate killed", pX+pW/2, contentY+65);
        }
        
        let fineAmount = 300;
        if (system?.securityLevel === 'High') fineAmount = 1000;
        else if (system?.securityLevel === 'Medium') fineAmount = 500;
        if (player.hasBeenPolice) {
            fineAmount *= 3;
            fill(255, 200, 100);
            textSize(16);
            text("Fines tripled for former police officer", pX + pW/2, contentY + 95);
        }
        let btnW = pW*0.5, btnH = 45;
        let btnX = pX+pW/2-btnW/2;
        let btnY1 = contentY + (player.isPolice ? 100 : (player.hasBeenPolice ? 125 : 90));
        if (isWanted) {
            this.policeButtonAreas.push(
                this._drawButton(btnX, btnY1, btnW, btnH, `Pay Fine (${fineAmount} cr)`, [0,180,0], [100,255,100], 5, {action:'pay_fine', amount:fineAmount})
            );
        }
        const btnY2 = btnY1 + btnH + 20;
        if (!player.isPolice) {
            this.policeButtonAreas.push(
                this._drawButton(btnX, btnY2, btnW, btnH, "Join Police Force", [50,50,180], [100,100,255], 5, {action:'join_police'})
            );
        } else {
            fill(255);
            textSize(18);
            textAlign(CENTER,CENTER);
            text("You are a member of the Police Force", pX+pW/2, btnY2+btnH/2);
        }
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15;
        this.policeButtonAreas.push(
            this._drawButton(backX, backY, backW, backH, "Back", [180,180,0], [220,220,100], 5, {action:'back'})
        );
        pop();
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
        let sY = pY+headerHeight+40, tW = pW-60, sX = pX+30;
        
        // Row setup - define button dimensions first
        const rowH = 30;
        const btnW = 100; // Fixed button width same as before
        const btnH = rowH*0.8;
        
        // Define column widths - evenly distributed across the screen, accounting for buttons
        const numDataColumns = 5; // Commodity, Buy, Sell, Stock, Cargo
        const btnSpacing = 5;
        const totalBtnWidth = (btnW * 4) + (btnSpacing * 3); // 4 buttons with 3 gaps
        const remainingWidth = tW - totalBtnWidth;
        const colWidth = Math.floor(remainingWidth / numDataColumns);
        const colCommodity = colWidth;
        const colBuy = colWidth;
        const colSell = colWidth;
        const colStock = colWidth;
        const colCargo = colWidth;
        const colButtons = totalBtnWidth;

        // --- Price Indicator Constants ---
        const indicatorW = 15; // Width of the indicator bar area
        const indicatorMaxH = rowH * 0.6; // Max height of the bar
        const indicatorYOffset = (rowH - indicatorMaxH) / 2; // Center vertically
        const maxDeviation = 0.5; // Max price deviation (e.g., 50%) for full bar height

        // Draw column headers
        let headerY = sY - 20;
        fill(255);
        textAlign(LEFT, CENTER);
        text("Commodity", sX+10, headerY);
        textAlign(CENTER, CENTER);
        text("Buy", sX+colCommodity+colBuy/2, headerY);
        text("Sell", sX+colCommodity+colBuy+colSell/2, headerY);
        text("Stock", sX+colCommodity+colBuy+colSell+colStock/2, headerY);
        text("Cargo Hold", sX+colCommodity+colBuy+colSell+colStock+colCargo/2, headerY);

        // Draw commodity rows
        const commoditiesLen = commodities ? commodities.length : 0;
        for (let i = 0; i < commoditiesLen; i++) {
            const comm = commodities[i];
            if (!comm) continue;
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
            const stockQty = Math.max(0, Math.floor(comm.stock ?? 0));
            const outOfStock = stockQty <= 0;
            
            // Commodity name and prices - grayed out if illegal goods in non-Anarchy system
            if (isIllegalInSystem) {
                fill(120); // Gray color for illegal goods
            } else {
                fill(255); // Normal white color
            }
            
            textAlign(LEFT, CENTER);
            text(comm.name||'?', sX+10, tY, colCommodity-15);
            
            // Add "ILLEGAL" indicator for illegal goods
            if (!comm.isLegal) {
                if (isIllegalInSystem) {
                    textAlign(LEFT, CENTER);
                    fill(255, 0, 0);
                    text("ILLEGAL", sX+10+textWidth(comm.name||'?')+15, tY);
                } 
            }
            
            textAlign(CENTER, CENTER);
            
            // Buy price with color coding
            if (comm.baseBuy > 0) {
                let buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                if (buyDeviation < -0.05) { // Cheap (Green)
                    fill(50, 255, 50);
                } else if (buyDeviation > 0.05) { // Expensive (Red)
                    fill(255, 50, 50);
                } else { // Average (White)
                    fill(255);
                }
            } else {
                fill(255);
            }
            text(comm.buyPrice??'?', sX+colCommodity+colBuy/2, tY);
            
            // Sell price with color coding
            if (comm.baseSell > 0) {
                let sellDeviation = (comm.sellPrice - comm.baseSell) / comm.baseSell;
                if (sellDeviation > 0.05) { // Good Sell Price (Green)
                    fill(50, 255, 50);
                } else if (sellDeviation < -0.05) { // Bad Sell Price (Red)
                    fill(255, 50, 50);
                } else { // Average (White)
                    fill(255);
                }
            } else {
                fill(255);
            }
            text(comm.sellPrice??'?', sX+colCommodity+colBuy+colSell/2, tY);

            // Stock display - single number with color coding
            if (outOfStock) {
                fill(255, 120, 120);
            } else if (stockQty < 50) {
                fill(255, 180, 120);
            } else if (stockQty > 200) {
                fill(120, 200, 255);
            } else {
                fill(220);
            }
            text(stockQty, sX+colCommodity+colBuy+colSell+colStock/2, tY);

            fill(255);
            text(comm.playerStock??'?', sX+colCommodity+colBuy+colSell+colStock+colCargo/2, tY);

            // Commodity name and prices (drawn above with legal/illegal styling)

            // --- Price Indicators ---
            noStroke();
            // Buy Price Indicator
            if (comm.baseBuy > 0) {
                let buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                let indicatorH = constrain(abs(buyDeviation) / maxDeviation, 0, 1) * indicatorMaxH;
                let indicatorX = sX + colCommodity + colBuy + 5; // Position indicator to the right of buy price
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
                let indicatorX = sX + colCommodity + colBuy + colSell + 5; // Position indicator to the right of sell price
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


            // --- Buttons (Positioned at the right edge) ---
            // Position buttons from the right edge of the panel
            const rightEdge = sX + tW;
            const btnSpacing = 5;
            const totalBtnWidth = (btnW * 4) + (btnSpacing * 3); // 4 buttons with 3 gaps
            let btnStartX = rightEdge - totalBtnWidth;

 // Buy 1 button
let buy1X = btnStartX;
let buy1Y = yP+(rowH-btnH)/2;

if (isIllegalInSystem || outOfStock) {
    // Gray out button - not clickable for illegal goods or empty stock
    fill(100); stroke(120); strokeWeight(1);
    rect(buy1X, buy1Y, btnW, btnH, 3);
    if (outOfStock) { fill(255, 150, 150); } else { fill(180); }
    noStroke(); textAlign(CENTER, CENTER); textSize(20);
    text(outOfStock ? "Out" : "Buy 1", buy1X+btnW/2, buy1Y+btnH/2);
    // No marketButtonAreas.push here - button can't be clicked
} else {
    // Normal button - clickable
    fill(0,150,0); stroke(0,200,0); strokeWeight(1);
    rect(buy1X, buy1Y, btnW, btnH, 3);
    fill(255); noStroke(); textAlign(CENTER,CENTER); textSize(20);
    text("Buy 1", buy1X+btnW/2, buy1Y+btnH/2);
    this.marketButtonAreas.push({ x: buy1X, y: buy1Y, w: btnW, h: btnH, action: 'buy', quantity: 1, commodity: comm.name });
}

// Buy All button
let buyAllX = buy1X + btnW + 5; // Position relative to previous button
let buyAllY = buy1Y;

if (isIllegalInSystem || outOfStock) {
    // Gray out button - not clickable for illegal goods or empty stock
    fill(100); stroke(120); strokeWeight(1);
    rect(buyAllX, buyAllY, btnW, btnH, 3);
    if (outOfStock) { fill(255, 150, 150); } else { fill(180); }
    noStroke(); textAlign(CENTER, CENTER); textSize(20);
    text(outOfStock ? "Out" : "Buy All", buyAllX+btnW/2, buyAllY+btnH/2);
    // No marketButtonAreas.push here - button can't be clicked
} else {
    // Normal button - clickable
    fill(0,180,0); stroke(0,220,0); strokeWeight(1);
    rect(buyAllX, buyAllY, btnW, btnH, 3);
    fill(255); noStroke(); textAlign(CENTER,CENTER); textSize(20);
    text("Buy All", buyAllX+btnW/2, buyAllY+btnH/2);
    this.marketButtonAreas.push({ x: buyAllX, y: buyAllY, w: btnW, h: btnH, action: 'buyAll', commodity: comm.name });
}

// Sell 1 button
let sell1X = buyAllX + btnW + 10; // Add space before sell buttons
let sell1Y = buy1Y;

// Check if this commodity is needed for the active mission
const isMissionCargo = player.activeMission?.cargoType === comm.name;

if (isIllegalInSystem || isMissionCargo) {
    // Gray out button - not clickable for illegal goods in non-Anarchy or mission cargo
    fill(100); stroke(120); strokeWeight(1);
    rect(sell1X, sell1Y, btnW, btnH, 3);
    fill(180); noStroke(); textAlign(CENTER, CENTER); textSize(20);
    text("Sell 1", sell1X+btnW/2, sell1Y+btnH/2);
    // No marketButtonAreas.push here - button can't be clicked
} else {
    // Normal button - clickable
    fill(150,0,0); stroke(200,0,0); strokeWeight(1);
    rect(sell1X, sell1Y, btnW, btnH, 3);
    fill(255); noStroke(); textAlign(CENTER,CENTER); textSize(20);
    text("Sell 1", sell1X+btnW/2, sell1Y+btnH/2);
    this.marketButtonAreas.push({ 
        x: sell1X, y: sell1Y, w: btnW, h: btnH, 
        action: 'sell', quantity: 1, commodity: comm.name 
    });
}

// Sell All button
let sellAllX = sell1X + btnW + 5; // Position relative to previous button
let sellAllY = buy1Y;

if (isIllegalInSystem || isMissionCargo) {
    // Gray out button - not clickable for illegal goods in non-Anarchy or mission cargo
    fill(100); stroke(120); strokeWeight(1);
    rect(sellAllX, sellAllY, btnW, btnH, 3);
    fill(180); noStroke(); textAlign(CENTER, CENTER); textSize(20);
    text("Sell All", sellAllX+btnW/2, sellAllY+btnH/2);
    // No marketButtonAreas.push here - button can't be clicked
} else {
    // Normal button - clickable
    fill(180,0,0); stroke(220,0,0); strokeWeight(1);
    rect(sellAllX, sellAllY, btnW, btnH, 3);
    fill(255); noStroke(); textAlign(CENTER,CENTER); textSize(20);
    text("Sell All", sellAllX+btnW/2, sellAllY+btnH/2);
    this.marketButtonAreas.push({ 
        x: sellAllX, y: sellAllY, w: btnW, h: btnH, 
        action: 'sellAll', commodity: comm.name 
    });
}
        }

        // Back button
        let backW = 100;
        let backH = 30;
        let backX = pX+pW/2-backW/2;
        let backY = pY+pH-backH-15;
        this.marketBackButtonArea = this._drawButton(backX, backY, backW, backH, "Back", [180,180,0], [220,220,100]);
        pop();
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
        this.galaxyMapMarketButtonAreas = []; // Clear market button areas
        const systems = galaxy.getSystemDataForMap(); // Gets { name, x, y, type, visited, index }
        const currentIdx = galaxy.currentSystemIndex;
        const reachable = galaxy.getReachableSystems(); // Now gets indices based on actual connections

        const currentSystem = galaxy?.getCurrentSystem();
        const canJump = isPlayerInJumpZone(player, currentSystem); // Use the helper function

        push(); // Isolate map drawing
       // background(10, 0, 20); // Dark space background

        // --- Compute bounding box and transformation ---
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let sys of systems) {
            minX = min(minX, sys.x);
            maxX = max(maxX, sys.x);
            minY = min(minY, sys.y);
            maxY = max(maxY, sys.y);
        }
        const margin = 100;
        const mapWidth = maxX - minX;
        const mapHeight = maxY - minY;
        if (mapWidth === 0 || mapHeight === 0) return; // avoid division by zero
        const scaleX = (width - 2 * margin) / mapWidth;
        const scaleY = (height - 2 * margin) / mapHeight;
        const scale = min(scaleX, scaleY);
        const offsetX = width / 2 - (minX + mapWidth / 2) * scale;
        const offsetY = height / 2 - (minY + mapHeight / 2) * scale;
        // --- End compute transformation ---

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
                        let x1 = systemA.galaxyPos.x * scale + offsetX;
                        let y1 = systemA.galaxyPos.y * scale + offsetY;
                        let x2 = systemB.galaxyPos.x * scale + offsetX;
                        let y2 = systemB.galaxyPos.y * scale + offsetY;

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
        for (let i = 0, len = systems.length; i < len; i++) {
            const sysData = systems[i];
            if (!sysData) continue;

            let isCurrent = (i === currentIdx);
            let isSelected = (i === this.lockedDestinationIndex);
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

            // Compute transformed position
            const drawX = sysData.x * scale + offsetX;
            const drawY = sysData.y * scale + offsetY;

            // Draw the ellipse
            strokeWeight(nodeStrokeWeight);
            stroke(nodeStrokeColor);
            fill(nodeColor);
            ellipse(drawX, drawY, nodeR * 2, nodeR * 2);
            // Store clickable area
            this.galaxyMapNodeAreas.push({ x: drawX, y: drawY, radius: nodeR, index: i });

            // Draw Text Labels
            textFont(font);
            
            fill(textColor); noStroke(); textAlign(CENTER, TOP); textSize(20);
            text(sysData.name, drawX, drawY + nodeR + 5);

            // Show type/security only if visited or current
            if (sysData.visited || isCurrent) {
                // Get the system object to access tech level
                const system = galaxy.systems[i];
                const techLevel = system?.techLevel || "?";
                
                // Display economy type with tech level
                text(`(${sysData.type} - Tech ${techLevel})`, drawX, drawY + nodeR + 25);
                
                // Security level (unchanged)
                const secLevel = system?.securityLevel || "Unknown";
                fill(180, 200, 255); // Blue for visibility, matching market overlay
                text(`Security: ${secLevel}`, drawX, drawY + nodeR + 45);
                
                // Wanted status (unchanged)
                if (system && system.playerWanted) {
                    fill(255, 0, 0); // Red for wanted
                    text("Wanted", drawX, drawY + nodeR + 65);
                }
                
                // Add small market info button for visited systems
                const btnSize = 20;
                const btnX = drawX + nodeR + 5; // Position to the right of the node
                const btnY = drawY - btnSize / 2; // Center vertically with node
                
                // Button background
                fill(40, 100, 180, 200);
                stroke(100, 150, 255);
                strokeWeight(1);
                rect(btnX, btnY, btnSize, btnSize, 3);
                
                // "M" for Market
                fill(255);
                noStroke();
                textAlign(CENTER, CENTER);
                textSize(14);
                text("M", btnX + btnSize / 2, btnY + btnSize / 2);
                
                // Store button area for click detection
                this.galaxyMapMarketButtonAreas.push({ 
                    x: btnX, 
                    y: btnY, 
                    w: btnSize, 
                    h: btnSize, 
                    systemIndex: i 
                });
            }
        }
        // --- End Draw System Nodes ---



        // --- Instructions ---
        fill(255); textAlign(CENTER, BOTTOM); textSize(18);
        // Adjust instruction text based on whether a destination is locked
        if (this.lockedDestinationIndex !== -1) {
            text("Destination locked. Enter jump zone to auto-jump.", width / 2, height - 70);
        } else {
            text("Click reachable system to lock as destination.", width / 2, height - 70);
        }

        // --- Draw Market Overlay if a system is selected ---
        if (this.marketOverlaySystemIndex !== -1 && this.marketOverlaySystemIndex < galaxy.systems.length) {
            this.drawMarketOverlay(galaxy, this.marketOverlaySystemIndex);
        }
        // --- End Market Overlay ---

        pop(); // Restore drawing settings
    } // --- End drawGalaxyMap ---

    /** Draws a compact market overlay showing commodity prices for a system */
    drawMarketOverlay(galaxy, systemIndex) {
        const system = galaxy.systems[systemIndex];
        if (!system || !system.station || !system.station.market) {
            return; // No market data available
        }

        const market = system.station.market;
        const commodities = market.getPrices();
        
        // Calculate dynamic height based on content
        const headerHeight = 45;
        const rowHeight = 28;
        const closeButtonPadding = 40;
        const overlayH = headerHeight + (commodities.length * rowHeight) + closeButtonPadding;
        
        // Overlay dimensions
        const overlayW = 360;
        const overlayX = width - overlayW - 20; // Position on right side
        const autopilotOffset = (typeof player !== 'undefined' && player?.autopilotEnabled) ? 35 : 0;
        const overlayY = 80 + autopilotOffset; // Same as target overlay
        
        push();
        
        // Background
        fill(20, 30, 50, 240);
        stroke(100, 150, 255);
        strokeWeight(2);
        rect(overlayX, overlayY, overlayW, overlayH, 8);
        
        // Header
        fill(255);
        noStroke();
        textFont(font);
        textSize(22);
        textAlign(CENTER, TOP);
        text(`${system.name} Market`, overlayX + overlayW / 2, overlayY + 10);
        
        // Column headers
        const tableY = overlayY + 45;
        const col1X = overlayX + 15; // Commodity name
        const col2X = overlayX + 160; // Buy price
        const col3X = overlayX + 240; // Sell price
        const col4X = overlayX + 320; // Stock
        
        fill(180, 200, 255);
        textSize(16);
        textAlign(LEFT, TOP);
        text("Commodity", col1X, tableY);
        textAlign(CENTER, TOP);
        text("Buy", col2X, tableY);
        text("Sell", col3X, tableY);
        text("Stock", col4X, tableY);
        
        // Draw commodities
        let yPos = tableY + 25;
        
        for (let i = 0; i < commodities.length; i++) {
            const comm = commodities[i];
            if (!comm) continue;
            
            // Alternate row background
            if (i % 2 === 0) {
                fill(0, 0, 0, 60);
                noStroke();
                rect(overlayX + 5, yPos - 2, overlayW - 10, rowHeight - 2);
            }
            
            // Commodity name
            fill(255);
            textSize(15);
            textAlign(LEFT, TOP);
            text(comm.name, col1X, yPos);
            
            // Buy price with color coding
            textAlign(CENTER, TOP);
            if (comm.baseBuy > 0) {
                let buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                if (buyDeviation < -0.05) {
                    fill(100, 255, 100); // Cheap - green
                } else if (buyDeviation > 0.05) {
                    fill(255, 100, 100); // Expensive - red
                } else {
                    fill(255); // Average - white
                }
            } else {
                fill(255);
            }
            text(comm.buyPrice, col2X, yPos);
            
            // Sell price with color coding
            if (comm.baseSell > 0) {
                let sellDeviation = (comm.sellPrice - comm.baseSell) / comm.baseSell;
                if (sellDeviation > 0.05) {
                    fill(100, 255, 100); // Good sell - green
                } else if (sellDeviation < -0.05) {
                    fill(255, 100, 100); // Bad sell - red
                } else {
                    fill(255); // Average - white
                }
            } else {
                fill(255);
            }
            text(comm.sellPrice, col3X, yPos);
            
            // Stock level
            fill(255);
            text(Math.floor(comm.stock || 0), col4X, yPos);
            
            yPos += rowHeight;
        }
        
        // Store overlay area for click detection
        this.marketOverlayArea = { 
            x: overlayX, 
            y: overlayY, 
            w: overlayW, 
            h: overlayH 
        };
        
        pop();
    }

    /** Handles clicks on the galaxy map */
    handleGalaxyMapClicks(mouseX, mouseY, galaxy, player, gameStateManager) {
        if (!galaxy || !player) return false;

        const currentSystem = galaxy?.getCurrentSystem();
        const canJump = isPlayerInJumpZone(player, currentSystem); // Check jump zone status
        const reachable = galaxy.getReachableSystems(); // Get reachable systems for click logic

        // --- Debug Logging ---
        console.log(`[handleGalaxyMapClicks] 'canJump' evaluated as: ${canJump}`);
        // ---

        // Check if any market button is clicked
        for (const btn of this.galaxyMapMarketButtonAreas) {
            if (this.isClickInArea(mouseX, mouseY, btn)) {
                // Toggle market overlay for this system
                if (this.marketOverlaySystemIndex === btn.systemIndex) {
                    this.marketOverlaySystemIndex = -1; // Close if already open
                } else {
                    this.marketOverlaySystemIndex = btn.systemIndex; // Open for this system
                }
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                return true;
            }
        }

        // If market overlay is open and click is inside it but not on a button, close it
        if (this.marketOverlaySystemIndex !== -1 && this.marketOverlayArea && this.isClickInArea(mouseX, mouseY, this.marketOverlayArea)) {
            this.marketOverlaySystemIndex = -1;
            if (typeof soundManager !== 'undefined') soundManager.playSound('click_off');
            return true;
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
                     this.lockedDestinationIndex = -1;
                     if (typeof soundManager !== 'undefined') soundManager.playSound('click_off'); // Different sound?
                     return true;
                 }
                 // --- Selection Logic ---
                 if (reachable.includes(clickedIndex)) {
                     // If system is reachable, allow selection/locking as destination
                     console.log(`    -> System is reachable. Locking as destination: ${clickedIndex}`);
                     this.lockedDestinationIndex = clickedIndex; // LOCK the system as destination
                     if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                 } else {
                     // If system is NOT reachable, show error
                     console.log(`    -> System is NOT reachable. Selection ignored.`);
                    if (typeof uiManager !== 'undefined') this.addMessage("Route unavailable.", color(255, 150, 150));
                     if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                 }
                 return true; // Click was handled
             }
        }

        // If click wasn't on button or any node, deselect
        // console.log("Clicked empty space on map. Deselecting.");
        // this.lockedDestinationIndex = -1; // Optional: Deselect on empty space click?
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
        text("GAME OVER", width / 2, height / 2 - 80);

        fill(255);
        textSize(30);
        text("Click anywhere or press any key to start again", width / 2, height / 2 + 20);

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

        // We'll draw hazards first (in a buffer), then redraw player on top.

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
            // --- Hazards buffer (Nebulae + Storms) with simple additive overlap ---
            if (!this.minimapHazardsBuffer || this._minimapHazardsBufferSize !== this.minimapSize) {
                this.minimapHazardsBuffer = createGraphics(this.minimapSize, this.minimapSize);
                this._minimapHazardsBufferSize = this.minimapSize;
            }
            const hbuf = this.minimapHazardsBuffer;
            hbuf.clear();
            
            // Reset all buffer state completely
            hbuf.push();
            hbuf.colorMode(RGB, 255);
            hbuf.noFill();
            hbuf.noStroke();

            const bufCenter = this.minimapSize / 2;

            // Helper color pickers to ensure type-specific colors
            const nebulaStrokeColor = (neb) => {
                const t = (neb?.type || '').toString().toLowerCase().trim();
                switch (t) {
                    case 'ion': return [100, 150, 255];
                    case 'radiation': return [150, 255, 100];
                    case 'emp': return [180, 100, 255];
                    default: return [150, 150, 255];
                }
            };
            const stormStrokeColor = (st) => {
                const t = (st?.type || '').toString().toLowerCase().trim();
                switch (t) {
                    case 'electromagnetic': return [80, 100, 255];
                    case 'radiation': return [100, 255, 50];
                    case 'gravitational': return [255, 200, 50];
                    default: return [100, 150, 255];
                }
            };

            // Draw nebulae as simple outline rings
            if (Array.isArray(system.nebulae) && system.nebulae.length > 0) {
                for (let i = 0, len = system.nebulae.length; i < len; i++) {
                    const neb = system.nebulae[i];
                    if (!neb || !neb.pos || !neb.radius) continue;
                    const relX = neb.pos.x - player.pos.x;
                    const relY = neb.pos.y - player.pos.y;
                    const bx = bufCenter + relX * this.minimapScale;
                    const by = bufCenter + relY * this.minimapScale;
                    const br = Math.max(1, neb.radius * this.minimapScale);
                    const col = nebulaStrokeColor(neb);
                    
                    hbuf.push();
                    hbuf.noFill();
                    hbuf.stroke(col[0], col[1], col[2], 150);
                    hbuf.strokeWeight(1);
                    hbuf.ellipse(bx, by, br * 2, br * 2);
                    hbuf.pop();
                }
            }

            // Draw storms as simple outline rings
            if (Array.isArray(system.cosmicStorms) && system.cosmicStorms.length > 0) {
                for (let i = 0, len = system.cosmicStorms.length; i < len; i++) {
                    const st = system.cosmicStorms[i];
                    if (!st || !st.pos || !st.radius) continue;
                    const relX = st.pos.x - player.pos.x;
                    const relY = st.pos.y - player.pos.y;
                    const bx = bufCenter + relX * this.minimapScale;
                    const by = bufCenter + relY * this.minimapScale;
                    const br = Math.max(1, st.radius * this.minimapScale);
                    const col = stormStrokeColor(st);
                    
                    hbuf.push();
                    hbuf.noFill();
                    hbuf.stroke(col[0], col[1], col[2], 180);
                    hbuf.strokeWeight(1);
                    hbuf.ellipse(bx, by, br * 2, br * 2);
                    hbuf.pop();
                }
            }

            hbuf.pop();

            // Blit hazards buffer into the minimap area (buffer naturally clips)
            image(hbuf, this.minimapX, this.minimapY);

            // --- Map and Draw Station ---
            if (system.station?.pos) {
                push();
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

                noStroke();
                if (!isStationOnScreen) {
                    const inset = iconHalfSize + 1;
                    drawX = constrain(mapX, mapLeft + inset, mapRight - inset);
                    drawY = constrain(mapY, mapTop + inset, mapBottom - inset);

                    if (mapX < mapLeft || mapX > mapRight || mapY < mapTop || mapY > mapBottom) {
                         fill(0, 100, 255); // Clamped color
                         rect(drawX - iconHalfSize, drawY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
                    } else {
                         fill(0, 0, 255); // Normal color (near edge but inside)
                         rect(mapX - iconHalfSize, mapY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
                    }
                } else {
                    fill(0, 0, 255); // Normal color (fully inside)
                    rect(mapX - iconHalfSize, mapY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
                }
                pop();
                // --- End Station Clamping Logic ---
            }
            // ---

            // --- Map and Draw Planets ---
            const planets = system.planets || [];
            for (let i = 0, len = planets.length; i < len; i++) {
                const planet = planets[i];
                if (!planet?.pos) continue;
                const objX = planet.pos.x;
                const objY = planet.pos.y;
                const relX = objX - player.pos.x;
                const relY = objY - player.pos.y;
                const mapX = mapCenterX + relX * this.minimapScale;
                const mapY = mapCenterY + relY * this.minimapScale;
                const worldRadius = planet.radius || planet.size * 0.5 || 0;
                const mapRadius = max(1, worldRadius * this.minimapScale);

                // Quick reject if completely outside minimap bounds
                if (
                    mapX + mapRadius < mapLeft ||
                    mapX - mapRadius > mapRight ||
                    mapY + mapRadius < mapTop ||
                    mapY - mapRadius > mapBottom
                ) continue;

                // Clip drawing to minimap rect so large planets don't overhang visually
                push();
                const ctx = drawingContext;
                ctx.save();
                ctx.beginPath();
                ctx.rect(this.minimapX, this.minimapY, this.minimapSize, this.minimapSize);
                ctx.clip();

                // Planet marker fill - use planet's base color if available
                noStroke();
                if (planet.baseColor) {
                    // Extract RGB from p5.Color object and use with reduced saturation for minimap
                    const r = red(planet.baseColor);
                    const g = green(planet.baseColor);
                    const b = blue(planet.baseColor);
                    fill(r, g, b, 200);
                } else {
                    fill(150, 100, 50); // Fallback color
                }
                ellipse(mapX, mapY, mapRadius * 2, mapRadius * 2);

                ctx.restore();
                pop();
            }
            // ---

            // --- Map and Draw Enemies (color-coded by AI role) ---
            const enemies = system.enemies || [];

            for (let i = 0, len = enemies.length; i < len; i++) {
                const enemy = enemies[i];
                if (!enemy?.pos || enemy.isDestroyed()) continue;
                let objX = enemy.pos.x;
                let objY = enemy.pos.y;
                let relX = objX - player.pos.x;
                let relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                const iconHalfExtent = 3;

                if (isFullyWithinBounds(mapX, mapY, iconHalfExtent, iconHalfExtent)) {
                    // Determine color by role (fall back to red)
                    const roleKey = enemy.role || enemy.aiRole || (enemy.shipTypeName && SHIP_DEFINITIONS[enemy.shipTypeName]?.aiRoles?.[0]);
                    const colArr = this.roleMinimapColors[roleKey] || [255, 0, 0];
                    push();
                    noStroke();
                    translate(mapX, mapY);
                    // Flip orientation so the pointy end faces movement
                    rotate((typeof enemy.angle === 'number' ? enemy.angle : 0) + PI / 2);
                    fill(...colArr);
                    triangle(0, -iconHalfExtent, -iconHalfExtent * 0.8, iconHalfExtent * 0.8, iconHalfExtent * 0.8, iconHalfExtent * 0.8);
                    pop();
                }
            }
            // ---

            // --- Map and Draw Locked Target Indicator (Reticle) ---
            if (player.target && !player.target.isDestroyed?.() && player.target.pos) {
                const tgt = player.target;
                const tRelX = tgt.pos.x - player.pos.x;
                const tRelY = tgt.pos.y - player.pos.y;
                let tMapX = mapCenterX + tRelX * this.minimapScale;
                let tMapY = mapCenterY + tRelY * this.minimapScale;

                const reticleSize = 4; // Size of the reticle arms

                // If fully within bounds, draw a reticle directly at the position
                if (isFullyWithinBounds(tMapX, tMapY, reticleSize, reticleSize)) {
                    stroke(255); // White reticle
                    strokeWeight(1);
                    noFill();
                    // Draw crosshair: horizontal and vertical lines
                    line(tMapX - reticleSize, tMapY, tMapX + reticleSize, tMapY);
                    line(tMapX, tMapY - reticleSize, tMapX, tMapY + reticleSize);
                } else {
                    // Clamp to edge so the player always has a directional cue
                    const inset = reticleSize + 1;
                    const cX = constrain(tMapX, mapLeft + inset, mapRight - inset);
                    const cY = constrain(tMapY, mapTop + inset, mapBottom - inset);
                    stroke(255); // White reticle
                    strokeWeight(1);
                    noFill();
                    // Draw crosshair at clamped position
                    line(cX - reticleSize, cY, cX + reticleSize, cY);
                    line(cX, cY - reticleSize, cX, cY + reticleSize);
                }
            }
            // --- End Locked Target Indicator ---

            // --- Draw Player (Always at Center), on top of all hazards and enemies ---
            push();
            fill(255); // White
            noStroke();
            ellipse(mapCenterX, mapCenterY, 5, 5);
            pop();
            // ---

            // Hazards are now drawn via buffer above; remove per-item drawing

            // --- Map and Draw Jump Zone ---
            if (system.jumpZoneCenter && system.jumpZoneRadius > 0) {
                const jzX = system.jumpZoneCenter.x;
                const jzY = system.jumpZoneCenter.y;
                const jzRadius = system.jumpZoneRadius;

                const relX = jzX - player.pos.x;
                const relY = jzY - player.pos.y;
                const mapX = mapCenterX + relX * this.minimapScale;
                const mapY = mapCenterY + relY * this.minimapScale;
                const mapRadius = max(1, jzRadius * this.minimapScale);

                const fullyOutside = (
                    mapX + mapRadius < mapLeft ||
                    mapX - mapRadius > mapRight ||
                    mapY + mapRadius < mapTop ||
                    mapY - mapRadius > mapBottom
                );

                if (!fullyOutside) {
                    const ctx = drawingContext;
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(this.minimapX, this.minimapY, this.minimapSize, this.minimapSize);
                    ctx.clip();

                    noFill();
                    stroke(255, 255, 0, 200); // Yellow outline
                    strokeWeight(1);
                    ellipse(mapX, mapY, mapRadius * 2);

                    // Draw crosshair at center
                    stroke(255, 255, 0, 200);
                    strokeWeight(1);
                    const crossSize = 3;
                    line(mapX - crossSize, mapY, mapX + crossSize, mapY);
                    line(mapX, mapY - crossSize, mapX, mapY + crossSize);

                    ctx.restore();
                } else {
                    // Draw a clamped indicator at the minimap edge
                    const indicatorSize = 4;
                    const inset = indicatorSize / 2 + 1;
                    const cX = constrain(mapX, mapLeft + inset, mapRight - inset);
                    const cY = constrain(mapY, mapTop + inset, mapBottom - inset);
                    noStroke();
                    fill(255, 255, 0, 220);
                    rectMode(CENTER);
                    rect(cX, cY, indicatorSize, indicatorSize);
                    rectMode(CORNER);
                }
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
        while (this.fpsValues.length > this.fpsMaxSamples) {
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
        // Only access galaxy/system in states where it's expected to exist
        const statesExpectingSystem = [
            "IN_FLIGHT","DOCKED","VIEWING_MARKET","VIEWING_MISSIONS","VIEWING_SHIPYARD",
            "VIEWING_UPGRADES","VIEWING_REPAIRS","VIEWING_PROTECTION","VIEWING_POLICE",
            "VIEWING_IMPERIAL_RECRUITMENT","VIEWING_SEPARATIST_RECRUITMENT","VIEWING_MILITARY_RECRUITMENT",
            "VIEWING_STORAGE","VIEWING_RECORD",
            "GALAXY_MAP","JUMPING"
        ];
        if (!statesExpectingSystem.includes(currentState)) {
            return false;
        }

        const currentSystem = galaxy?.getCurrentSystem(); const currentStation = currentSystem?.station;

        // --- DOCKED State (Main Station Menu) ---
        if (currentState === "DOCKED") {
            for (const btn of this.stationMenuButtonAreas) {
                if (this.isClickInArea(mx, my, btn)) {
                    if (btn.action === "UNDOCK") {
                        // Audio: click feedback, undock sound is handled by GameStateManager during transition
                        if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                        if(gameStateManager)gameStateManager.setState("IN_FLIGHT");
                        return true;
                    } else if (btn.state === "VIEWING_MARKET" || btn.state === "VIEWING_MISSIONS" ||
                               btn.state === "VIEWING_SHIPYARD" || btn.state === "VIEWING_UPGRADES" ||
                               btn.state === "VIEWING_REPAIRS" || btn.state === "VIEWING_POLICE" ||
                               btn.state === "VIEWING_PROTECTION" || btn.state === "VIEWING_IMPERIAL_RECRUITMENT" ||
                               btn.state === "VIEWING_SEPARATIST_RECRUITMENT" || btn.state === "VIEWING_MILITARY_RECRUITMENT" ||
                               btn.state === "VIEWING_STORAGE" || btn.state === "VIEWING_RECORD") {
                        // Audio: click feedback when opening a station submenu (transition sound handled in GameStateManager)
                        if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                        if(gameStateManager)gameStateManager.setState(btn.state);
                        return true;
                    } else if (btn.state) {
                        console.warn(`State ${btn.state} not handled.`);
                        if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                        return true;
                    }
                }
            }
            return false;
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
                if (typeof soundManager !== 'undefined') soundManager.playSound('click_off');
                if (typeof saveGame === 'function') saveGame();
                return true;
            }

            // Handle List Clicks (for highlighting) if no detail button was clicked
            for (const btn of this.missionListButtonAreas) {
                if (this.isClickInArea(mx, my, btn)) {
                    // Always update the selectedIndex for visual highlighting
                    if(gameStateManager) gameStateManager.selectedMissionIndex = btn.index;
                    if (typeof soundManager !== 'undefined') soundManager.playSound('click');
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
                        // Player needs to pay
                        if (player.credits >= finalPrice) {
                            player.spendCredits(finalPrice);
                            player.applyShipDefinition(area.shipTypeKey);
                            
                            // Record ship purchase in player record
                            const systemName = galaxy?.getCurrentSystem()?.name || 'Unknown';
                            player.recordShipPurchase(area.shipName, finalPrice, systemName);
                            
                            if (typeof saveGame === 'function') saveGame();
                            this.addMessage("You bought a " + area.shipName + "!");
                            if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                        } else {
                            this.addMessage("Not enough credits!");
                            if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                        }
                    } else {
                        // Player gets a refund or even swap
                        player.addCredits(-finalPrice); // Convert negative to positive for refund
                        player.applyShipDefinition(area.shipTypeKey);
                        
                        // Record ship purchase in player record
                        const systemName = galaxy?.getCurrentSystem()?.name || 'Unknown';
                        player.recordShipPurchase(area.shipName, finalPrice, systemName);
                        
                        if (typeof saveGame === 'function') saveGame();
                        
                        if (finalPrice < 0) {
                            this.addMessage(`You bought a ${area.shipName} and received ${-finalPrice} credits back!`);
                        } else {
                            this.addMessage(`You swapped to a ${area.shipName} at no additional cost.`);
                        }
                        if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
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
                            this.addMessage("Your ship doesn't have that weapon slot!", [255, 100, 100]);
                            if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                            return true;
                        }
                        
                        // Spend credits
                        player.spendCredits(area.upgrade.price);
                        
                        // Install weapon to selected slot (instead of setWeaponByName)
                        player.installWeaponToSlot(area.upgrade, this.selectedWeaponSlot);
                        
                        // Record weapon upgrade in player record
                        const systemName = galaxy?.getCurrentSystem()?.name || 'Unknown';
                        player.recordWeaponUpgrade(
                            area.upgrade.name,
                            area.upgrade.type,
                            area.upgrade.price,
                            this.selectedWeaponSlot,
                            systemName
                        );
                        
                        // Play purchase sound if available
                        if (typeof soundManager !== 'undefined') {
                            soundManager.playSound('upgrade');
                        }
                        
                        this.addMessage("You bought the " + area.upgrade.name + "!");
                        
                        // Auto-save if possible
                        if (typeof saveGame === 'function') {
                            if (typeof saveGame === 'function') saveGame();
                        }
                    } else {
                        this.addMessage("Not enough credits!");
                        if (typeof soundManager !== 'undefined') soundManager.playSound('error');
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
                    this.addMessage("Your ship is already fully repaired!");
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                } else if (player.credits >= cost) {
                    player.spendCredits(cost);
                    player.hull = player.maxHull;
                    this.addMessage(`Ship fully repaired for ${cost} credits.`);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                    if (typeof saveGame === 'function') saveGame();
                } else {
                    this.addMessage(`Not enough credits! Full repair costs ${cost} credits.`);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
                return true;
            }
            // 50% repair
            if (this.isClickInArea(mx, my, this.repairsHalfButtonArea)) {
                let missing = player.maxHull - player.hull;
                let repairAmt = Math.min(missing, Math.ceil(player.maxHull / 2));
                let cost = repairAmt * 7;
                if (missing <= 0) {
                    this.addMessage("Your ship is already fully repaired!");
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                } else if (player.credits >= cost) {
                    player.spendCredits(cost);
                    player.hull += repairAmt;
                    if (player.hull > player.maxHull) player.hull = player.maxHull;
                    this.addMessage(`Ship repaired by ${repairAmt} hull for ${cost} credits.`);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                    if (typeof saveGame === 'function') saveGame();
                } else {
                    this.addMessage(`Not enough credits! 50% repair costs ${cost} credits.`);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
                return true;
            }
            // Bodyguard repairs
            if (this.isClickInArea(mx, my, this.repairsBodyguardsButtonArea)) {
                const bodyguardInfo = player.getDamagedBodyguardsInfo();
                if (bodyguardInfo.count <= 0) {
                    this.addMessage("No damaged bodyguards to repair.");
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                } else if (player.credits >= bodyguardInfo.totalCost) {
                    // Use the new repair method
                    if (player.repairBodyguards(bodyguardInfo.totalCost)) {
                        this.addMessage(`${bodyguardInfo.count} bodyguard${bodyguardInfo.count > 1 ? 's' : ''} repaired for ${bodyguardInfo.totalCost} credits.`);
                        
                        // Play repair sound if available
                        if (typeof soundManager !== 'undefined') {
                            soundManager.playSound('upgrade');
                        }
                        if (typeof saveGame === 'function') saveGame();
                    }
                } else {
                    this.addMessage(`Not enough credits! Bodyguard repairs cost ${bodyguardInfo.totalCost} credits.`);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
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
                        // Pay fine to clear wanted status (centralized handler)
                        this._processFinePayment(player, area.amount);
                        return true;
                    }
                    else if (area.action === 'join_police' && player) {
                        // Change ship to ACAB
                        player.applyShipDefinition('ACAB');
                        this.addMessage("You have joined the Police Force!", 'lightblue');
                        player.isPolice = true; // Set police status flag
                        if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                        
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
                            if (typeof saveGame === 'function') saveGame();
                            // If we reached max bodyguards, refresh the UI
                            if (player.activeBodyguards.length >= player.bodyguardLimit) {
                                if (gameStateManager) {
                                    gameStateManager.setState("VIEWING_PROTECTION"); // Refresh UI
                                }
                            }
                        } else {
                            this.addMessage("Failed to hire bodyguard.", [255, 100, 100]);
                            if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                        }
                        return true;
                    }
                    else if (btn.action === "DISMISS_BODYGUARDS") {
                        player.dismissBodyguards();
                        this.addMessage("All bodyguards have been dismissed.", [255, 180, 100]);
                        if (typeof soundManager !== 'undefined') soundManager.playSound('click_off');
                        if (typeof saveGame === 'function') saveGame();
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

        // --- VIEWING_IMPERIAL_RECRUITMENT State ---
        else if (currentState === "VIEWING_IMPERIAL_RECRUITMENT") {
            return this._handleRecruitmentClicks(mx, my, player, gameStateManager);
        }

        // --- VIEWING_SEPARATIST_RECRUITMENT State ---
        else if (currentState === "VIEWING_SEPARATIST_RECRUITMENT") {
            return this._handleRecruitmentClicks(mx, my, player, gameStateManager);
        }

        // --- VIEWING_MILITARY_RECRUITMENT State ---
        else if (currentState === "VIEWING_MILITARY_RECRUITMENT") {
            return this._handleRecruitmentClicks(mx, my, player, gameStateManager);
        }
        
        // --- VIEWING_STORAGE State ---
        else if (currentState === "VIEWING_STORAGE") {
            if (!Array.isArray(this.storageButtonAreas)) {
                this.storageButtonAreas = [];
            }

            const stationForStorage = currentStation || player?.currentSystem?.station || null;
            if (stationForStorage && !Array.isArray(stationForStorage.storage)) {
                stationForStorage.storage = [];
            }

            for (const btn of this.storageButtonAreas) {
                if (this.isClickInArea(mx, my, btn)) {
                    if (btn.action === "BACK") {
                        gameStateManager.setState("DOCKED");
                        return true;
                    }
                    else if (btn.action === "DEPOSIT_STORAGE") {
                        // Deposit cargo into station storage
                        if (!stationForStorage) {
                            this.addMessage("No storage available here.", [255, 180, 120]);
                            if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                            return true;
                        }

                        const item = player.cargo.find(c => c.name === btn.commodity);
                        if (item && item.quantity > 0) {
                            // Add to station storage
                            const storageItem = stationForStorage.storage.find(s => s.name === btn.commodity);
                            if (storageItem) {
                                storageItem.quantity += item.quantity;
                            } else {
                                stationForStorage.storage.push({name: btn.commodity, quantity: item.quantity});
                            }
                            // Remove from player cargo
                            player.cargo = player.cargo.filter(c => c.name !== btn.commodity);
                            this.addMessage(`Deposited ${item.quantity}t of ${btn.commodity} into storage.`, [100, 255, 100]);
                            if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                            saveGame();
                        }
                        return true;
                    }
                    else if (btn.action === "RETRIEVE_STORAGE") {
                        // Retrieve cargo from station storage
                        if (!stationForStorage) {
                            this.addMessage("No storage available here.", [255, 180, 120]);
                            if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                            return true;
                        }

                        const storageItem = stationForStorage.storage.find(s => s.name === btn.commodity);
                        if (storageItem && storageItem.quantity > 0) {
                            const availableSpace = player.cargoCapacity - player.getCargoAmount();
                            const retrieveAmount = Math.min(storageItem.quantity, availableSpace);
                            
                            if (retrieveAmount > 0) {
                                // Add to player cargo
                                player.addCargo(btn.commodity, retrieveAmount);
                                // Remove from station storage
                                storageItem.quantity -= retrieveAmount;
                                if (storageItem.quantity <= 0) {
                                    stationForStorage.storage = stationForStorage.storage.filter(s => s.name !== btn.commodity);
                                }
                                this.addMessage(`Retrieved ${retrieveAmount}t of ${btn.commodity} from storage.`, [100, 255, 100]);
                                if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                                if (typeof saveGame === 'function') saveGame();
                            } else {
                                this.addMessage("Not enough cargo space!", [255, 100, 100]);
                                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                            }
                        }
                        return true;
                    }
                }
            }
            return false;
        }
        
        // --- VIEWING_RECORD State ---
        else if (currentState === "VIEWING_RECORD") {
            for (const btn of this.recordButtonAreas) {
                if (this.isClickInArea(mx, my, btn)) {
                    if (btn.action === "BACK") {
                        gameStateManager.setState("DOCKED");
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
        else if (currentState === "GAME_OVER") { 
            // Call global resetGame function to restart the game
            if (typeof resetGame === 'function') {
                resetGame();
            } else {
                console.error("resetGame function not found, falling back to reload");
                window.location.reload();
            }
            return true; 
        }

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
        this.drawPanelBG([30,30,60,230], [220,190,90]); // Imperial gold theme
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
        if (this.shipyardScrollMax > 0) {
            let barX = pX + pW - 18, barY = startY, barW = 12, barH = scrollAreaH;
            fill(60,60,100); stroke(120,180,255); rect(barX, barY, barW, barH, 6);
            let handleH = max(30, barH * (visibleRows /totalRows));
            let handleY = barY + (barH-handleH) * (this.shipyardScrollOffset / this.shipyardScrollMax);
            fill(180,180,220); noStroke(); rect(barX+1, handleY, barW-2, handleH, 6);
            this.shipyardScrollbarArea = {x:barX, y:barY, w:barW, h:barH, handleY, handleH};
        } else {
            this.shipyardScrollbarArea = null;
        }
    
        // Back button
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15;
        this.shipyardDetailButtons = {back: this._drawButton(backX, backY, backW, backH, "Back", [180,180,0], [220,220,100])};
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
        if (this.upgradeScrollMax > 0) {
            let barX = pX + pW - 18, barY = startY, barW = 12, barH = scrollAreaH;
            fill(60,60,100); stroke(180,100,255); rect(barX, barY, barW, barH, 6);
            let handleH = max(30, barH * (visibleRows / totalRows));
            let handleY = barY + (barH-handleH) * (this.upgradeScrollOffset / this.upgradeScrollMax);
            fill(180,180,220); noStroke(); rect(barX+1, handleY, barW-2, handleH, 6);
            // Store for click/drag if you want to implement it
            this.upgradeScrollbarArea = {x:barX, y:barY, w:barW, h:barH, handleY, handleH};
        } else {
            this.upgradeScrollbarArea = null;
        }
    
        // Back button
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15;
        this.upgradeDetailButtons = {back: this._drawButton(backX, backY, backW, backH, "Back", [180,180,0], [220,220,100])};
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
        if (currentState === "VIEWING_RECORD" && this.recordScrollMax > 0) {
            if (typeof this.recordScrollOffset !== "number") this.recordScrollOffset = 0;
            this.recordScrollOffset += event.deltaY > 0 ? 1 : -1;
            if (this.recordScrollOffset < 0) this.recordScrollOffset = 0;
            if (this.recordScrollOffset > this.recordScrollMax) this.recordScrollOffset = this.recordScrollMax;
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

    addCommunicationMessage(msg, color = [255, 190, 140], duration = this.communicationDisplayTime) {
        this.communicationMessages.push({
            text: msg,
            time: millis(),
            color: color,
            duration: duration
        });
        if (this.communicationMessages.length > this.communicationQueueLimit) {
            this.communicationMessages.shift();
        }
    }

    // Draw messages at the bottom of the screen
    drawMessages() {
        const now = millis();
        // Filter messages based on their individual duration
        const recent = this.messages.filter(m => now - m.time < (m.duration || this.messageDisplayTime));
        const toShow = recent.slice(-this.maxMessagesToShow);
        this._lastMessageBlockHeight = 0;

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

        if (toShow.length > 0) {
            this._lastMessageBlockHeight = toShow.length * 22 + 20; // include margin offset and text baseline
        }

        this._drawCommunicationMessages();
    }

    _drawCommunicationMessages() {
        if (!this.communicationMessages || this.communicationMessages.length === 0) {
            return;
        }

        const now = millis();
        const recent = this.communicationMessages.filter(m => now - m.time < (m.duration || this.communicationDisplayTime));
        const toShow = recent.slice(-this.maxCommunicationMessagesToShow);

        if (toShow.length === 0) {
            this.communicationMessages = recent; // prune expired entries
            return;
        }

        const boxPadding = 6;
        const lineHeight = 26;
        const boxWidth = Math.max(width - 80, 300);
        const baseX = (width - boxWidth) / 2;
        const baseY = height - 180; // Fixed position above info messages

        push();
        textAlign(CENTER, TOP);
        textFont(font);
        textSize(18);

        for (let i = 0; i < toShow.length; i++) {
            const msg = toShow[i];
            const age = now - msg.time;
            const effectiveDuration = msg.duration || this.communicationDisplayTime;
            const fade = constrain(age / effectiveDuration, 0, 1);
            const easedFade = Math.pow(fade, 1.5);
            const alpha = 255 - (easedFade * 210); // slow, eased fade preserves legibility

            this._applyMessageFill(msg.color, alpha, [255, 190, 140, 255]);

            const textY = baseY + boxPadding + i * lineHeight;
            text(msg.text, width / 2, textY);
        }
        pop();

        this.communicationMessages = recent; // remove expired entries
    }

    _applyMessageFill(colorValue, alpha, fallback) {
        let applied = false;
        const targetAlpha = constrain(alpha, 0, 255);
        if (typeof colorValue === 'string') {
            try {
                const c = color(colorValue);
                fill(red(c), green(c), blue(c), Math.min(alpha(c), targetAlpha));
                applied = true;
            } catch (_) { /* ignore */ }
        } else if (Array.isArray(colorValue)) {
            const [r = 200, g = 200, b = 200, a = 255] = colorValue;
            fill(r, g, b, Math.min(a, targetAlpha));
            applied = true;
        } else if (colorValue && typeof colorValue === 'object' && typeof colorValue.levels !== 'undefined') {
            const levels = colorValue.levels;
            if (Array.isArray(levels) && levels.length >= 3) {
                const existingAlpha = levels.length > 3 ? levels[3] : 255;
                fill(levels[0], levels[1], levels[2], Math.min(existingAlpha, targetAlpha));
                applied = true;
            }
        }

        if (!applied) {
            const [r = 200, g = 200, b = 200, a = 255] = fallback || [];
            fill(r, g, b, Math.min(a, targetAlpha));
        }
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
        text(`${econType}   |   Tech: ${tech}   |   Security:  ${econ}`, pX +20, pY + 45);
        
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

    /** Draws the Storage Locker menu (when state is VIEWING_STORAGE) */
    drawStorageMenu(station, player) {
        if (!player) return;

        const activeStation = station || player?.currentSystem?.station || null;

        push();
        this.storageButtonAreas = [];

        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([30, 40, 60, 220], [120, 140, 180]);
        textFont(font);

        if (!activeStation) {
            fill(220);
            textSize(22);
            textAlign(CENTER, CENTER);
            text("No storage services are available in this location.", pX + pW/2, pY + pH/2 - 20);

            const backW = 100, backH = 30;
            const backX = pX + pW/2 - backW/2;
            const backY = pY + pH - backH - 15;
            const backBtn = this._drawButton(backX, backY, backW, backH, "Back", [180, 0, 0], [220, 100, 100]);
            backBtn.action = "BACK";
            this.storageButtonAreas.push(backBtn);
            pop();
            return;
        }

        // Ensure the station exposes a mutable storage array
        if (!Array.isArray(activeStation.storage)) {
            activeStation.storage = [];
        }

        const system = galaxy?.getCurrentSystem();
        const headerHeight = this.drawStationHeader("Storage Locker", activeStation, player, system);

        fill(220);
        textSize(20);
        textAlign(CENTER, TOP);
        const infoY = pY + headerHeight + 10;
        text("Store cargo safely at this station. Stored goods stay here until retrieved.", pX + pW/2, infoY);

        // Station storage contents
        fill(180, 200, 255);
        textSize(22);
        textAlign(LEFT, TOP);
        text("Station Storage:", pX + 40, infoY + 40);

        const storage = activeStation.storage;
        let storageY = infoY + 70;

        if (storage.length === 0) {
            fill(180);
            textSize(18);
            textAlign(CENTER, TOP);
            text("Storage is empty", pX + pW/2, storageY);
        } else {
            textAlign(LEFT, TOP);
            textSize(20);
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

                const retrieveBtn = this._drawButton(
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
        fill(180, 200, 255);
        textSize(22);
        textAlign(LEFT, TOP);
        text("Your Cargo (Tap to deposit):", pX + 40, cargoSectionY);

        const playerCargo = Array.isArray(player.cargo) ? player.cargo : [];
        let cargoY = cargoSectionY + 35;

        if (playerCargo.length === 0) {
            fill(180);
            textSize(18);
            textAlign(CENTER, TOP);
            text("No cargo in hold", pX + pW/2, cargoY);
        } else {
            textAlign(LEFT, TOP);
            textSize(20);
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

                const depositBtn = this._drawButton(
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
        const backW = 100, backH = 30;
        const backX = pX + pW/2 - backW/2;
        const backY = pY + pH - backH - 15;
        const backBtn = this._drawButton(backX, backY, backW, backH, "Back", [180, 0, 0], [220, 100, 100]);
        backBtn.action = "BACK";
        this.storageButtonAreas.push(backBtn);

        pop();
    }

    /** Draws the Personal Record menu (when state is VIEWING_RECORD) */
    drawPersonalRecordMenu(player) {
        if (!player) return;
        
        push();
        this.recordButtonAreas = [];
        
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([30, 30, 50, 220], [150, 150, 200]);
        
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Personal Record", station, player, system);
        
        textFont(font);
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

        const firstVisit = systemsVisited.length > 0 ? systemsVisited[0] : null;
        const fallbackSystem = player.currentSystem || locateSystemByName(firstVisit?.systemName);
        const startName = firstVisit?.systemName || fallbackSystem?.name || null;
        let startEventInfo = null;
        if (startName) {
            const startSystem = locateSystemByName(startName) || fallbackSystem;
            const startType = startSystem?.economyType || startSystem?.systemType || 'Unknown';
            const startSecurity = startSystem?.securityLevel || 'Unknown';
            const baseTimestamp = Number.isFinite(firstVisit?.timestamp) ? firstVisit.timestamp : Date.now();
            
            // Use stored details from first visit if available, otherwise use current system data
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

        for (let i = 0; i < systemsVisited.length; i++) {
            const rec = systemsVisited[i];
            let visitDesc = `Visited ${rec.systemName}`;
            // Add economy and security info if available
            if (rec.economyType || rec.securityLevel) {
                const details = [];
                if (rec.economyType && rec.economyType !== 'Unknown') {
                    details.push(rec.economyType);
                }
                if (rec.securityLevel && rec.securityLevel !== 'Unknown') {
                    details.push(rec.securityLevel + ' Security');
                }
                if (details.length > 0) {
                    visitDesc += ` (${details.join(', ')})`;
                }
            }
            appendEvent(rec.timestamp, 'Travel', visitDesc);
        }

        for (let i = 0; i < shipsDestroyed.length; i++) {
            const rec = shipsDestroyed[i];
            let roleText = rec.role || "Unknown";
            // Convert AI_ROLE enum values to human-readable text
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
            if (rec.faction) {
                description += ` - ${rec.faction} faction`;
            }
            appendEvent(rec.timestamp, 'Combat', description);
        }

        for (let i = 0; i < stationsTraded.length; i++) {
            const rec = stationsTraded[i];
            appendEvent(rec.timestamp, 'Trade', `Traded at ${rec.stationName} (${rec.systemName})`);
        }
        
        for (let i = 0; i < factionsJoined.length; i++) {
            const rec = factionsJoined[i];
            appendEvent(rec.timestamp, 'Faction', `Joined ${rec.factionName} faction`);
        }
        
        for (let i = 0; i < eliteStatusChanges.length; i++) {
            const rec = eliteStatusChanges[i];
            appendEvent(rec.timestamp, 'Elite', `Combat Rating: ${rec.oldRating} → ${rec.newRating} (${rec.kills} kills)`);
        }
        
        for (let i = 0; i < missionsCompleted.length; i++) {
            const rec = missionsCompleted[i];
            appendEvent(rec.timestamp, 'Mission', `Completed: ${rec.title} (${rec.type}) - ${rec.reward}cr`);
        }
        
        for (let i = 0; i < wantedStatusChanges.length; i++) {
            const rec = wantedStatusChanges[i];
            const statusText = rec.isWanted ? "WANTED" : "CLEAN";
            appendEvent(rec.timestamp, 'Legal', `Status changed to ${statusText} in ${rec.systemName}`);
        }
        
        for (let i = 0; i < shipsPurchased.length; i++) {
            const rec = shipsPurchased[i];
            appendEvent(rec.timestamp, 'Ship', `Purchased ${rec.shipType} for ${rec.price}cr in ${rec.systemName}`);
        }
        
        for (let i = 0; i < weaponsUpgraded.length; i++) {
            const rec = weaponsUpgraded[i];
            const slotText = rec.slotIndex >= 0 ? ` (Slot ${rec.slotIndex + 1})` : '';
            appendEvent(rec.timestamp, 'Weapon', `Upgraded to ${rec.weaponName} (${rec.weaponType})${slotText} for ${rec.price}cr in ${rec.systemName}`);
        }

        if (startEventInfo) {
            let startTimestamp = Number.isFinite(startEventInfo.baseTimestamp) ? startEventInfo.baseTimestamp : Infinity;
            for (let i = 0; i < events.length; i++) {
                const candidateTs = events[i]?.timestamp;
                if (Number.isFinite(candidateTs)) {
                    startTimestamp = Math.min(startTimestamp, candidateTs);
                }
            }
            if (!Number.isFinite(startTimestamp)) {
                startTimestamp = Date.now();
            } else {
                startTimestamp -= 1;
            }
            appendEvent(startTimestamp, 'Start', startEventInfo.description);
        }

        events.sort((a, b) => {
            const aTs = Number.isFinite(a.timestamp) ? a.timestamp : Infinity;
            const bTs = Number.isFinite(b.timestamp) ? b.timestamp : Infinity;
            if (aTs === bTs) {
                return a.description.localeCompare(b.description);
            }
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
            if (this.recordScrollOffset < 0) this.recordScrollOffset = 0;
            if (this.recordScrollOffset > this.recordScrollMax) this.recordScrollOffset = this.recordScrollMax;
        }

        let currentY = contentY;
        fill(255, 200, 200);
        textSize(24);
        textAlign(LEFT, TOP);
        text(`Personal Log: ${totalEntries} entries`, pX + 30, currentY);
        currentY += 35;

        const drawInfoText = () => {
            fill(180);
            textSize(16);
            textAlign(CENTER, CENTER);
            text("No activity recorded yet.", pX + pW/2, currentY + (contentH - 35) / 2);
        };

        if (totalEntries === 0) {
            drawInfoText();
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
                fill(160);
                textSize(14);
                textAlign(LEFT, TOP);
                text("↑ Earlier entries", pX + 50, currentY);
                currentY += lineHeight;
                rowsRemaining--;
            }

            const availableEntries = totalEntries - startIndex;
            let hasLater = availableEntries > rowsRemaining;
            if (hasLater && rowsRemaining > 0) {
                rowsRemaining--; // Reserve space for the footer indicator
            }

            const endIndex = Math.min(startIndex + rowsRemaining, totalEntries);

            textSize(16);
            textAlign(LEFT, TOP);

            for (let i = startIndex; i < endIndex; i++) {
                const event = events[i];
                const label = event.type || 'Log';
                const col = typeColors[label] || [220, 220, 255];
                fill(col[0], col[1], col[2]);
                const tsText = formatLogTime(event.timestamp);
                text(`[${tsText}] [${label}] ${event.description}`, pX + 50, currentY, pW - 100);
                currentY += lineHeight;
            }

            if (hasLater && currentY <= contentY + contentH - lineHeight) {
                fill(160);
                textSize(14);
                textAlign(LEFT, TOP);
                text("↓ Later entries", pX + 50, currentY);
            }
            
            // Draw scrollbar if needed
            if (this.recordScrollMax > 0) {
                const scrollAreaH = contentH - 35; // Adjust for header
                const barX = pX + pW - 18;
                const barY = contentY + 35;
                const barW = 12;
                const barH = scrollAreaH;
                
                fill(60, 60, 100);
                stroke(150, 150, 200);
                rect(barX, barY, barW, barH, 6);
                
                const handleH = max(30, barH * (visibleLines / totalEntries));
                const handleY = barY + (barH - handleH) * (this.recordScrollOffset / this.recordScrollMax);
                
                fill(180, 180, 220);
                noStroke();
                rect(barX + 1, handleY, barW - 2, handleH, 6);
            }
        }

        // Back button
        const backW = 100, backH = 30;
        const backX = pX + pW/2 - backW/2;
        const backY = pY + pH - backH - 15;
        const backBtn = this._drawButton(backX, backY, backW, backH, "Back", [180, 0, 0], [220, 100, 100]);
        backBtn.action = "BACK";
        this.recordButtonAreas.push(backBtn);
        
        pop();
    }

    /** Draws the Imperial Navy Recruitment Menu */
    drawImperialRecruitmentMenu(player) {
        this.factionRecruitmentButtonAreas = [];
        if (!player) return;
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([30,30,60,230], [220,190,90]); // Imperial gold theme
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Imperial Navy Recruitment", station, player, system);
        
        fill(255); 
        textSize(20); 
        textAlign(CENTER, TOP);
        const contentY = pY + headerHeight + 10;
        
        // Check current faction status
        const isWanted = system?.isPlayerWanted();
        const canJoin = player.canJoinFaction("IMPERIAL");
        
        // Display faction info
        fill(220, 190, 90);
        textSize(24);
        text("Imperial Navy Recruitment Office", pX+pW/2, contentY);
        
        fill(255);
        textSize(18);
        text("Serve the Empire. Restore order to the galaxy.", pX+pW/2, contentY + 40);
        
        // Show legal status
        fill(255);
        textSize(20);
        text(`Legal Status in ${system?.name || 'Unknown'} System: `, pX+pW/2, contentY + 80);
        const statusText = isWanted ? "WANTED" : "CLEAN";
        const statusColor = isWanted ? [255, 50, 50] : [50, 255, 50];
        fill(statusColor);
        textSize(24);
        text(statusText, pX+pW/2, contentY + 110);
        
        // Show current faction status
        if (player.playerFaction) {
            fill(255, 200, 100);
            textSize(18);
            text(`Current Faction: ${player.playerFaction}`, pX + pW/2, contentY + 140);
        }
        
        // Display Imperial bounty information
        if (player.playerFaction === 'IMPERIAL') {
            fill(100, 255, 100);
            textSize(18);
            text("Active Bounty: 2,000 cr per Separatist killed", pX+pW/2, contentY + (player.playerFaction ? 170 : 150));
        }
        
        let btnW = pW*0.5, btnH = 45;
        let btnX = pX+pW/2-btnW/2;
        let btnY1 = contentY + (player.playerFaction === 'IMPERIAL' ? 200 : (player.playerFaction ? 170 : 150));
        
        // Fine payment if wanted
        if (isWanted) {
            let fineAmount = 500;
            if (system?.securityLevel === 'High') fineAmount = 1200;
            else if (system?.securityLevel === 'Medium') fineAmount = 800;
            
            this.factionRecruitmentButtonAreas.push(
                this._drawButton(btnX, btnY1, btnW, btnH, `Pay Fine (${fineAmount} cr)`, [0,180,0], [100,255,100], 5, {action:'pay_fine', amount:fineAmount, faction:'IMPERIAL'})
            );
            btnY1 += btnH + 20;
        }
        
        // Join faction button
        if (canJoin && !isWanted) {
            this.factionRecruitmentButtonAreas.push(
                this._drawButton(btnX, btnY1, btnW, btnH, "Join Imperial Navy", [120,100,50], [220,190,90], 5, {action:'join_faction', faction:'IMPERIAL'})
            );
        } else if (player.playerFaction === 'IMPERIAL') {
            fill(255);
            textSize(18);
            textAlign(CENTER,CENTER);
            text("You serve the Empire with honor", pX+pW/2, btnY1+btnH/2);
        } else if (player.playerFaction && player.playerFaction !== 'IMPERIAL') {
            fill(255, 150, 150);
            textSize(16);
            textAlign(CENTER,CENTER);
            text("You must leave your current faction first", pX+pW/2, btnY1+btnH/2);
        } else if (isWanted) {
            fill(255, 150, 150);
            textSize(16);
            textAlign(CENTER,CENTER);
            text("Clear your legal status to join", pX+pW/2, btnY1+btnH/2);
        }
        
        // Back button
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15;
        this.factionRecruitmentButtonAreas.push(
            this._drawButton(backX, backY, backW, backH, "Back", [180,180,0], [220,220,100], 5, {action:'back'})
        );
        pop();
    }

    /** Draws the Separatist Forces Recruitment Menu */
    drawSeparatistRecruitmentMenu(player) {
        this.factionRecruitmentButtonAreas = [];
        if (!player) return;
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([30,30,60,230], [200,100,0]); // Separatist orange theme
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Separatist Forces Recruitment", station, player, system);
        
        fill(255); 
        textSize(20); 
        textAlign(CENTER, TOP);
        const contentY = pY + headerHeight + 10;
        
        // Check current faction status
        const isWanted = system?.isPlayerWanted();
        const canJoin = player.canJoinFaction("SEPARATIST");
        
        // Display faction info
        fill(200, 100, 0);
        textSize(24);
        text("Separatist Forces Recruitment", pX+pW/2, contentY);
        
        fill(255);
        textSize(18);
        text("Fight for freedom. Break the chains of tyranny.", pX+pW/2, contentY + 40);
        
        // Show legal status
        fill(255);
        textSize(20);
        text(`Legal Status in ${system?.name || 'Unknown'} System: `, pX+pW/2, contentY + 80);
        const statusText = isWanted ? "WANTED" : "CLEAN";
        const statusColor = isWanted ? [255, 50, 50] : [50, 255, 50];
        fill(statusColor);
        textSize(24);
        text(statusText, pX+pW/2, contentY + 110);
        
        // Show current faction status
        if (player.playerFaction) {
            fill(255, 200, 100);
            textSize(18);
            text(`Current Faction: ${player.playerFaction}`, pX + pW/2, contentY + 140);
        }
        
        // Display Separatist bounty information
        if (player.playerFaction === 'SEPARATIST') {
            fill(100, 255, 100);
            textSize(18);
            text("Active Bounty: 2,000 cr per Imperial killed", pX+pW/2, contentY + (player.playerFaction ? 170 : 150));
        }
        
        let btnW = pW*0.5, btnH = 45;
        let btnX = pX+pW/2-btnW/2;
        let btnY1 = contentY + (player.playerFaction === 'SEPARATIST' ? 200 : (player.playerFaction ? 170 : 150));
        
        // Fine payment if wanted
        if (isWanted) {
            let fineAmount = 400; // Separatists are more lenient
            if (system?.securityLevel === 'High') fineAmount = 1000;
            else if (system?.securityLevel === 'Medium') fineAmount = 650;
            
            this.factionRecruitmentButtonAreas.push(
                this._drawButton(btnX, btnY1, btnW, btnH, `Pay Fine (${fineAmount} cr)`, [0,180,0], [100,255,100], 5, {action:'pay_fine', amount:fineAmount, faction:'SEPARATIST'})
            );
            btnY1 += btnH + 20;
        }
        
        // Join faction button
        if (canJoin && !isWanted) {
            this.factionRecruitmentButtonAreas.push(
                this._drawButton(btnX, btnY1, btnW, btnH, "Join Separatist Forces", [100,50,0], [200,100,0], 5, {action:'join_faction', faction:'SEPARATIST'})
            );
        } else if (player.playerFaction === 'SEPARATIST') {
            fill(255);
            textSize(18);
            textAlign(CENTER,CENTER);
            text("You fight for freedom and independence", pX+pW/2, btnY1+btnH/2);
        } else if (player.playerFaction && player.playerFaction !== 'SEPARATIST') {
            fill(255, 150, 150);
            textSize(16);
            textAlign(CENTER,CENTER);
            text("You must leave your current faction first", pX+pW/2, btnY1+btnH/2);
        } else if (isWanted) {
            fill(255, 150, 150);
            textSize(16);
            textAlign(CENTER,CENTER);
            text("Clear your legal status to join", pX+pW/2, btnY1+btnH/2);
        }
        
        // Back button
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15;
        this.factionRecruitmentButtonAreas.push(
            this._drawButton(backX, backY, backW, backH, "Back", [180,180,0], [220,220,100], 5, {action:'back'})
        );
        pop();
    }

    /** Draws the Military Academy Recruitment Menu */
    drawMilitaryRecruitmentMenu(player) {
        this.factionRecruitmentButtonAreas = [];
        if (!player) return;
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([30,30,60,230], [100,120,140]); // Military grey-blue theme
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Military Academy Recruitment", station, player, system);
        
        fill(255); 
        textSize(20); 
        textAlign(CENTER, TOP);
        const contentY = pY + headerHeight + 10;
        
        // Check current faction status
        const isWanted = system?.isPlayerWanted();
        const canJoin = player.canJoinFaction("MILITARY");
        
        // Display faction info
        fill(100, 120, 140);
        textSize(24);
        text("Military Academy Recruitment", pX+pW/2, contentY);
        
        fill(255);
        textSize(18);
        text("Honor, duty, excellence. Defend the frontier.", pX+pW/2, contentY + 40);
        
        // Show legal status
        fill(255);
        textSize(20);
        text(`Legal Status in ${system?.name || 'Unknown'} System: `, pX+pW/2, contentY + 80);
        const statusText = isWanted ? "WANTED" : "CLEAN";
        const statusColor = isWanted ? [255, 50, 50] : [50, 255, 50];
        fill(statusColor);
        textSize(24);
        text(statusText, pX+pW/2, contentY + 110);
        
        // Show current faction status
        if (player.playerFaction) {
            fill(255, 200, 100);
            textSize(18);
            text(`Current Faction: ${player.playerFaction}`, pX + pW/2, contentY + 140);
        }
        
        // Display Military bounty information
        if (player.playerFaction === 'MILITARY') {
            fill(100, 255, 100);
            textSize(18);
            text("Active Bounty: 4,000 cr per Alien killed", pX+pW/2, contentY + (player.playerFaction ? 170 : 150));
        }
        
        let btnW = pW*0.5, btnH = 45;
        let btnX = pX+pW/2-btnW/2;
        let btnY1 = contentY + (player.playerFaction === 'MILITARY' ? 200 : (player.playerFaction ? 170 : 150));
        
        // Fine payment if wanted
        if (isWanted) {
            let fineAmount = 600; // Military is strict but fair
            if (system?.securityLevel === 'High') fineAmount = 1500;
            else if (system?.securityLevel === 'Medium') fineAmount = 900;
            
            this.factionRecruitmentButtonAreas.push(
                this._drawButton(btnX, btnY1, btnW, btnH, `Pay Fine (${fineAmount} cr)`, [0,180,0], [100,255,100], 5, {action:'pay_fine', amount:fineAmount, faction:'MILITARY'})
            );
            btnY1 += btnH + 20;
        }
        
        // Join faction button
        if (canJoin && !isWanted) {
            this.factionRecruitmentButtonAreas.push(
                this._drawButton(btnX, btnY1, btnW, btnH, "Join Military Forces", [50,60,70], [100,120,140], 5, {action:'join_faction', faction:'MILITARY'})
            );
        } else if (player.playerFaction === 'MILITARY') {
            fill(255);
            textSize(18);
            textAlign(CENTER,CENTER);
            text("You serve with honor and distinction", pX+pW/2, btnY1+btnH/2);
        } else if (player.playerFaction && player.playerFaction !== 'MILITARY') {
            fill(255, 150, 150);
            textSize(16);
            textAlign(CENTER,CENTER);
            text("You must leave your current faction first", pX+pW/2, btnY1+btnH/2);
        } else if (isWanted) {
            fill(255, 150, 150);
            textSize(16);
            textAlign(CENTER,CENTER);
            text("Clear your legal status to join", pX+pW/2, btnY1+btnH/2);
        }
        
        // Back button
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15;
        this.factionRecruitmentButtonAreas.push(
            this._drawButton(backX, backY, backW, backH, "Back", [180,180,0], [220,220,100], 5, {action:'back'})
        );
        pop();
    }
    
    /** Centralized fine payment handling used by Police and Recruitment screens */
    _processFinePayment(player, amount) {
        if (!player || !player.currentSystem) return false;
        const success = player.spendCredits(amount);
        if (success) {
            player.currentSystem.playerWanted = false;
            player.currentSystem.policeAlertSent = false;
            this.addMessage(`Fine paid. Legal status cleared in ${player.currentSystem.name}.`, 'lightgreen');
            if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
            if (typeof saveGame === 'function') saveGame();
            return true;
        } else {
            this.addMessage('Not enough credits to pay fine.', 'crimson');
            if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            return false;
        }
    }

    /** Handles recruitment menu button clicks for all factions */
    _handleRecruitmentClicks(mx, my, player, gameStateManager) {
        if (!Array.isArray(this.factionRecruitmentButtonAreas)) return false;
        for (const area of this.factionRecruitmentButtonAreas) {
            if (!this.isClickInArea(mx, my, area)) continue;
            if (area.action === 'back') {
                gameStateManager?.setState('DOCKED');
                return true;
            }
            if (area.action === 'pay_fine' && player) {
                this._processFinePayment(player, area.amount);
                return true;
            }
            if (area.action === 'join_faction' && player) {
                const joined = player.joinFaction(area.faction);
                if (joined) {
                    // Message variations by faction
                    const msgByFaction = {
                        IMPERIAL: {
                            text: () => `Welcome to the Imperial Navy! You have been assigned a ${player.factionShip}.`,
                            color: 'lightblue'
                        },
                        SEPARATIST: {
                            text: () => `Fight for freedom! You have been assigned a ${player.factionShip}.`,
                            color: 'orange'
                        },
                        MILITARY: {
                            text: () => `Serve with honor! You have been assigned a ${player.factionShip}.`,
                            color: 'lightblue'
                        }
                    };
                    const fx = msgByFaction[area.faction] || { text: () => 'Joined faction.', color: 'lightblue' };
                    this.addMessage(fx.text(), fx.color);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                    if (typeof saveGame === 'function') saveGame();
                } else {
                    const failTextByFaction = {
                        IMPERIAL: 'Failed to join Imperial Navy.',
                        SEPARATIST: 'Failed to join Separatist Forces.',
                        MILITARY: 'Failed to join Military Forces.'
                    };
                    this.addMessage(failTextByFaction[area.faction] || 'Failed to join faction.', 'crimson');
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
                return true;
            }
        }
        return false;
    }
} // End of UIManager Class