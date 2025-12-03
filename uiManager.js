// ****** uiManager.js ******

// Constants for space object trading prices - relative to station prices
// Space objects sell produced goods CHEAPER than station buy price (profitable to buy here, sell at station)
const SPACE_OBJECT_PRODUCE_DISCOUNT = 0.60;  // 60% of station buy price
// Space objects buy demanded goods at HIGHER price than station sell price (profitable to buy at station, sell here)
const SPACE_OBJECT_DEMAND_PREMIUM = 1.50;  // 150% of station sell price

// Standard panel background color - used for all menus to ensure consistent appearance
// The starfield background shows through uniformly regardless of which menu is open
const STANDARD_PANEL_BG = [20, 20, 40, 220];  // Dark blue-grey, semi-transparent

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
        // Space object dock/market button areas
        this.spaceObjectMenuButtonAreas = [];
        this.spaceObjectMarketButtonAreas = [];
        this.spaceObjectMarketBackButtonArea = {};
        this.spaceObjectRepairsFullButtonArea = {};
        this.spaceObjectRepairsHalfButtonArea = {};
        this.spaceObjectRepairsBackButtonArea = {};
        this.spaceObjectRepairsBodyguardsButtonArea = {};
        // Protection services button areas
        this.protectionServicesButtons = [];
        // Faction recruitment button areas
        this.factionRecruitmentButtonAreas = [];
        // Market overlay tracking
        this.marketOverlayArea = null;
        this._marketOverlayCacheIndex = -1;
        this._marketOverlayDescText = '';
        this._marketOverlayDescSize = 16;
        this._marketOverlayDescPadding = 12;
        this._marketOverlayDescHeight = 110;
    }

    _initMinimap() {
        // Sizes: keep minimap always the large size; clicks change zoom level (world view range)
        this.minimapDefaultSize = 200;              // legacy/default (kept)
        this.minimapExpandedSize = 360;             // always use this size for rendering
        this.minimapSize = this.minimapExpandedSize; // start always large

        // Zoom levels (world view ranges) - clicking cycles these
        this.minimapWorldViewRanges = [5000, 10000, 20000, 50000];
        this.minimapZoomIndex = 2; // start at the widest view (index into minimapWorldViewRanges)

        this.minimapMargin = 15;
        this.minimapX = 0;
        this.minimapY = 0;
        this.minimapScale = 1;
        this.minimapHazardsBuffer = null;
        this._minimapHazardsBufferSize = 0;

        // Keep flag for compatibility but treat the minimap as always "expanded"
        this.minimapExpanded = true;
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

    /**
     * Initializes button area arrays/objects to empty state.
     * @param {Array<string>} areaKeys - Array of property names to initialize
     * @param {boolean} [asArray=true] - If true, initialize as [], otherwise as {}
     * @private
     */
    _initButtonAreas(areaKeys, asArray = true) {
        for (const key of areaKeys) {
            this[key] = asArray ? [] : {};
        }
    }

    /**
     * Sets common text styling properties in one call.
     * @param {Object} options - Styling options
     * @param {Array|number} [options.fill] - Fill color (array or single value)
     * @param {number} [options.size] - Text size
     * @param {string} [options.alignH] - Horizontal alignment (LEFT, CENTER, RIGHT)
     * @param {string} [options.alignV] - Vertical alignment (TOP, CENTER, BOTTOM)
     * @param {boolean} [options.noStroke=false] - If true, disable stroke
     * @private
     */
    _setTextStyle(options = {}) {
        if (options.fill !== undefined) {
            if (Array.isArray(options.fill)) {
                fill(...options.fill);
            } else {
                fill(options.fill);
            }
        }
        if (options.size !== undefined) {
            textSize(options.size);
        }
        if (options.alignH !== undefined || options.alignV !== undefined) {
            const h = options.alignH || LEFT;
            const v = options.alignV || TOP;
            textAlign(h, v);
        }
        if (options.noStroke) {
            noStroke();
        }
    }

    /**
     * Draws a commodity action button (buy or sell) with consistent styling.
     * @param {Object} config - Button configuration
     * @param {number} config.x - X position
     * @param {number} config.y - Y position
     * @param {number} config.w - Width
     * @param {number} config.h - Height
     * @param {string} config.label - Button label
     * @param {boolean} config.enabled - Whether button is enabled
     * @param {boolean} config.available - Whether commodity is available
     * @param {string} [config.action] - Action name (e.g., 'BUY_COMMODITY')
     * @param {Object} [config.data] - Additional data to attach to button area
     * @returns {Object|null} Button area object if enabled, null otherwise
     * @private
     */
    _drawCommodityButton(config) {
        const { x, y, w, h, label, enabled, available, action, data = {} } = config;
        
        if (!available) {
            // Not available - grayed out
            fill(40);
            noStroke();
            rect(x, y, w, h, 3);
            this._setTextStyle({ fill: 60, size: 20, alignH: CENTER, alignV: CENTER });
            text(label, x + w / 2, y + h / 2);
            return null;
        }
        
        if (enabled) {
            // Enabled button - use brighter colors
            const isBuyAll = label.includes('All');
            const baseGreen = isBuyAll ? 180 : 150;
            const strokeGreen = isBuyAll ? 220 : 200;
            fill(0, baseGreen, 0);
            stroke(0, strokeGreen, 0);
            strokeWeight(1);
            rect(x, y, w, h, 3);
            this._setTextStyle({ fill: 255, size: 20, alignH: CENTER, alignV: CENTER, noStroke: true });
            text(label, x + w / 2, y + h / 2);
            return { x, y, w, h, action, ...data };
        } else {
            // Disabled button
            fill(60);
            stroke(80);
            strokeWeight(1);
            rect(x, y, w, h, 3);
            this._setTextStyle({ fill: 100, size: 20, alignH: CENTER, alignV: CENTER, noStroke: true });
            text(label, x + w / 2, y + h / 2);
            return null;
        }
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
        
        // Draw docked station or space object in the background
        this._drawDockedObjectBackground(x, y, w, h);
    }

    /**
     * Draws the currently docked station or space object as a large background element.
     * The object is drawn scaled up and centered in the panel with low opacity.
     * @param {number} panelX - Panel X position
     * @param {number} panelY - Panel Y position  
     * @param {number} panelW - Panel width
     * @param {number} panelH - Panel height
     * @private
     */
    _drawDockedObjectBackground(panelX, panelY, panelW, panelH) {
        // Determine what we're docked at
        const currentState = gameStateManager?.currentState;
        if (!currentState) return;
        
        // Only draw for docked states
        const dockedStates = [
            'DOCKED', 'VIEWING_MARKET', 'VIEWING_MISSIONS', 'VIEWING_SHIPYARD',
            'VIEWING_UPGRADES', 'VIEWING_REPAIRS', 'VIEWING_PROTECTION', 'VIEWING_POLICE',
            'VIEWING_IMPERIAL_RECRUITMENT', 'VIEWING_SEPARATIST_RECRUITMENT', 'VIEWING_MILITARY_RECRUITMENT',
            'VIEWING_STORAGE', 'VIEWING_RECORD',
            'DOCKED_SPACE_OBJECT', 'VIEWING_SPACE_OBJECT_MARKET', 'VIEWING_SPACE_OBJECT_REPAIRS'
        ];
        
        if (!dockedStates.includes(currentState)) return;
        
        const centerX = panelX + panelW / 2;
        const centerY = panelY + panelH / 2;
        
        push();
        // Clip to panel area
        const ctx = drawingContext;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 10);
        ctx.clip();
        
        // Set low opacity for background effect
        drawingContext.globalAlpha = 0.15;
        
        // Determine if we should show space object or station
        // Check for space object states, OR if VIEWING_RECORD was accessed from space object dock
        const isSpaceObjectState = currentState.includes('SPACE_OBJECT') || 
            currentState === 'DOCKED_SPACE_OBJECT' ||
            (currentState === 'VIEWING_RECORD' && gameStateManager?._returnFromRecordState === 'DOCKED_SPACE_OBJECT');
        
        if (isSpaceObjectState && gameStateManager?.currentDockedSpaceObject) {
            const spaceObject = gameStateManager.currentDockedSpaceObject;
            if (spaceObject && typeof spaceObject.draw === 'function') {
                // Save space object state to prevent background draw from affecting game animation
                const origX = spaceObject.pos.x;
                const origY = spaceObject.pos.y;
                const origAngle = spaceObject.angle;
                const origBobPhase = spaceObject.bobPhase;
                
                // Draw space object scaled large with consistent slow rotation
                push();
                translate(centerX, centerY);
                // Scale up significantly so it's visible
                const targetSize = Math.min(panelW, panelH) * 0.7;
                const currentSize = spaceObject.size || 48;
                const scaleFactor = targetSize / currentSize;
                scale(scaleFactor);
                
                // Use consistent, slow rotation for background display (based on millis)
                // This ensures all screens rotate at the same speed regardless of frame rate
                const backgroundRotation = (typeof millis === 'function' ? millis() : 0) * 0.0001;
                rotate(backgroundRotation);
                
                // Temporarily set object to origin for drawing
                spaceObject.pos.x = 0;
                spaceObject.pos.y = 0;
                spaceObject.angle = 0; // Reset angle since we applied our own rotation
                
                spaceObject.draw();
                
                // Restore original state
                spaceObject.pos.x = origX;
                spaceObject.pos.y = origY;
                spaceObject.angle = origAngle;
                spaceObject.bobPhase = origBobPhase;
                pop();
            }
        } else {
            // Docked at station
            const system = galaxy?.getCurrentSystem();
            const station = system?.station;
            if (station && typeof station.draw === 'function') {
                // Save station state to prevent background draw from affecting game animation
                const origX = station.pos.x;
                const origY = station.pos.y;
                const origAngle = station.angle;
                const origLightTimer = station.lightTimer;
                
                // Draw station scaled large with consistent slow rotation
                push();
                translate(centerX, centerY);
                const extraScale = 1.5;
                const targetSize = Math.min(panelW, panelH) * 0.85 * extraScale;
                const currentSize = station.size || 600;
                const scaleFactor = targetSize / currentSize;
                scale(scaleFactor);
                
                // Use consistent, slow rotation for background display (based on millis)
                // This ensures all screens rotate at the same speed regardless of frame rate
                const backgroundRotation = (typeof millis === 'function' ? millis() : 0) * 0.0001;
                rotate(backgroundRotation);
                
                // Temporarily set station to origin and reset rotation state
                station.pos.x = 0;
                station.pos.y = 0;
                station.angle = 0; // Reset angle since we applied our own rotation
                
                station.draw();
                
                // Restore original state
                station.pos.x = origX;
                station.pos.y = origY;
                station.angle = origAngle;
                station.lightTimer = origLightTimer;
                pop();
            }
        }
        
        drawingContext.globalAlpha = 1.0;
        ctx.restore();
        pop();
    }

    /**
     * Initializes a menu panel with background and optional header.
     * Clears specified button area arrays and returns panel dimensions.
     * @param {Array} fillCol - Background fill color [r,g,b,a]
     * @param {Array} strokeCol - Border stroke color [r,g,b]
     * @param {Array<string>} [buttonAreaKeys=[]] - Property names of button area arrays to clear
     * @returns {Object} { pX, pY, pW, pH } panel dimensions
     */
    _initMenuPanel(fillCol, strokeCol, buttonAreaKeys = []) {
        // Clear button areas
        for (const key of buttonAreaKeys) {
            if (Array.isArray(this[key])) {
                this[key] = [];
            } else {
                this[key] = {};
            }
        }
        
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(fillCol, strokeCol);
        textFont(font);
        
        return { pX, pY, pW, pH };
    }

    /**
     * Draws a vertical list of menu buttons and returns button areas.
     * @param {Array} options - Array of { text, state?, action? } objects
     * @param {number} startY - Y position to start drawing
     * @param {number} btnW - Button width
     * @param {number} btnH - Button height
     * @param {number} btnSpacing - Spacing between buttons
     * @param {Array} fillCol - Button fill color [r,g,b]
     * @param {Array} strokeCol - Button stroke color [r,g,b]
     * @returns {Array} Array of button area objects with {x, y, w, h, state?, action?}
     */
    _drawMenuButtonList(options, startY, btnW, btnH, btnSpacing, fillCol, strokeCol) {
        const {x: pX, w: pW} = this.getPanelRect();
        const btnX = pX + pW / 2 - btnW / 2;
        const areas = [];
        
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const btnY = startY + i * btnSpacing;
            const area = this._drawButton(btnX, btnY, btnW, btnH, opt.text, fillCol, strokeCol);
            if (opt.state) area.state = opt.state;
            if (opt.action) area.action = opt.action;
            areas.push(area);
        }
        
        return areas;
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
        fill(255);
        textAlign(CENTER, CENTER);
        
        // Determine faction display
        let factionDisplay = "";
        let factionRank = "";
        
        if (player.isPolice) {
            factionDisplay = "POLICE";
            factionRank = player.getFactionRank("POLICE");
        } else if (player.playerFaction === "MILITARY") {
            factionDisplay = "MILITARY";
            factionRank = player.getFactionRank("MILITARY");
        } else if (player.playerFaction === "IMPERIAL") {
            factionDisplay = "IMPERIAL";
            factionRank = player.getFactionRank("IMPERIAL");
        } else if (player.playerFaction === "SEPARATIST") {
            factionDisplay = "SEPARATIST";
            factionRank = player.getFactionRank("SEPARATIST");
        } else {
            factionDisplay = "LEGAL";
        }
        
        // Build the status text
        let statusText = `${eliteRating} - ${factionDisplay}`;
        if (factionRank) {
            statusText += ` (${factionRank})`;
        }
        
        // Add wanted status if applicable
        if (player.currentSystem?.isPlayerWanted()) {
            statusText += " - Wanted";
            fill(255, 0, 0); // Red text for wanted status
        }
        
        text(statusText, width/2, statusLineY);
        
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
                    // Determine human-friendly target string
                    let targetLabel = 'Unknown';
                    let hint = '';
                    try {
                        if (player.autopilotTarget === 'station') {
                            targetLabel = 'Station';
                            hint = '[J to toggle jump/station | H to cycle planets]';
                        } else if (player.autopilotTarget === 'jumpzone') {
                            targetLabel = 'Jump Zone';
                            hint = '[J to toggle jump/station | H to cycle planets]';
                        } else if (player.autopilotTarget && typeof player.autopilotTarget === 'object' && player.autopilotTarget.type === 'planet') {
                            const idx = Number.isFinite(player.autopilotTarget.index) ? player.autopilotTarget.index : player.autopilotPlanetIndex;
                            const planet = player.currentSystem?.planets?.[idx];
                            const pname = planet?.name || (`Planet ${idx + 1}`);
                            targetLabel = `Planet: ${pname}`;
                            hint = '[H to cycle planets | J to toggle station/jump]';
                        } else if (typeof player.autopilotTarget === 'object' && player.autopilotTarget?.type) {
                            targetLabel = String(player.autopilotTarget.type);
                        }
                    } catch (e) {
                        targetLabel = 'Unknown';
                    }

                    const autopilotY = 45 + 24 + 5; // Position below weapon bar
                    // Draw autopilot indicator background
                    fill(40, 80, 120, 200);
                    noStroke();
                    rect(0, autopilotY, width, 20);

                    // Draw autopilot text
                    textAlign(CENTER, CENTER);
                    textSize(18);
                    fill(255, 255, 100);
                    text(`Autopilot Engaged: ${targetLabel} ${hint}`, width/2, autopilotY + 10);
                }
                
        
        pop();
    }

    /** Draws an information overlay for the currently targeted ship */
    drawTargetOverlay(player) {
        const target = player?.target;
        if (!target || target === player) { return; }
        if (typeof target.isDestroyed === 'function' && target.isDestroyed()) { return; }

        const hasShipIdentity = typeof target.shipTypeName === 'string' || typeof target.shipDefinition === 'object';

        // Allow overlay for non-ship targets (Asteroid / SpaceObject)
        const isAsteroid = target && (target.constructor && target.constructor.name === 'Asteroid');
        const isSpaceObject = target && (target.constructor && target.constructor.name === 'SpaceObject');

        if (!hasShipIdentity && !isAsteroid && !isSpaceObject) { return; }

        const panelWidth = Math.min(280, Math.max(200, width * 0.2));
        const padding = 12;
        const lineHeight = 20;
        const sectionSpacing = 8;
        const autopilotOffset = player?.autopilotEnabled ? 35 : 0;
        const panelX = width - panelWidth - 20;
        const panelY = 80 + autopilotOffset;
        const minimapTop = height - this.minimapSize - this.minimapMargin;
        const maxPanelHeight = Math.max(150, minimapTop - panelY - 10);

        let pilotName = this._getTargetPilotName(target);
        // For non-ship targets show the object type/name instead of an "Unidentified Pilot"
        if (isAsteroid) {
            pilotName = 'Asteroid';
        } else if (isSpaceObject) {
            pilotName = (typeof target.getDisplayName === 'function') ? target.getDisplayName() : 'Space Object';
        }
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
        // Only ships have weapons
        const weaponsList = hasShipIdentity ? this._getTargetWeapons(target) : [];

        const infoLines = [];
        // For ships show the ship name in the info lines. For asteroids/space objects
        // we already print the object type/name at the top (pilotName), so avoid
        // repeating it here; only include additional info like range.
        if (hasShipIdentity) {
            infoLines.push(`${shipName}${roleLabel ? ` (${roleLabel})` : ''}`);
        }
        if (rangeLine) {
            infoLines.push(rangeLine);
        }

        // Only compute cargo manifest for ships. Asteroids and generic space objects
        // should not show a cargo manifest.
        const cargoEntries = hasShipIdentity ? this._getCargoEntries(target) : [];
        let cargoLines = cargoEntries.length > 0
            ? cargoEntries.map(entry => `${entry.name}: ${entry.quantity}`)
            : [];

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

        // Draw appropriate stat bars
        if (hasShipIdentity) {
            this._drawStatBar(cursorX, cursorY, panelWidth - padding * 2, 'Shield', target.shield, target.maxShield, shieldPercent);
            cursorY += lineHeight + 4;
            this._drawStatBar(cursorX, cursorY, panelWidth - padding * 2, 'Hull', target.hull, target.maxHull, hullPercent);
            cursorY += lineHeight;
        } else {
            // For asteroids / space objects: show Health if available
            const hp = (typeof target.health === 'number') ? target.health : (typeof target.hull === 'number' ? target.hull : 0);
            const hpMax = (typeof target.maxHealth === 'number') ? target.maxHealth : (typeof target.maxHull === 'number' ? target.maxHull : 0);
            const hpPercent = this._getStatPercent(hp, hpMax);
            this._drawStatBar(cursorX, cursorY, panelWidth - padding * 2, 'Health', hp, hpMax, hpPercent);
            cursorY += lineHeight;
        }

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

        // Show buy/sell commodities for dockable space objects
        if (isSpaceObject && target.isDockable) {
            const tradable = (typeof target.getTradableCommodities === 'function') 
                ? target.getTradableCommodities() 
                : { produces: [], buys: [] };
            
            // Show what the space object sells (produces)
            if (tradable.produces && tradable.produces.length > 0) {
                cursorY += sectionSpacing;
                fill(100, 255, 100);
                text('Sells:', cursorX, cursorY);
                cursorY += lineHeight;
                fill(210);
                text(tradable.produces.join(', '), cursorX, cursorY);
                cursorY += lineHeight;
            }
            
            // Show what the space object buys
            if (tradable.buys && tradable.buys.length > 0) {
                cursorY += sectionSpacing;
                fill(255, 200, 100);
                text('Buys:', cursorX, cursorY);
                cursorY += lineHeight;
                fill(210);
                text(tradable.buys.join(', '), cursorX, cursorY);
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

    /**
     * Draws the ship-style target reticle (circle + corner brackets) at the current
     * local coordinate origin. Intended to be called while already translated to
     * the entity's position (and rotated if desired).
     * @param {number} baseSize - The entity's base size (diameter) to scale the reticle.
     */
    _drawShipStyleReticle(baseSize) {
        if (!Number.isFinite(baseSize)) baseSize = 50;
        push();
        noFill();
        stroke(0, 255, 0, 200);
        strokeWeight(2);

        // Circle slightly larger than entity (matches enemy drawing)
        ellipse(0, 0, baseSize * 1.6, baseSize * 1.6);

        // Corner brackets
        const bracketSize = baseSize * 0.3;
        const offset = baseSize * 0.7;

        // Top-left
        line(-offset, -offset, -offset + bracketSize, -offset);
        line(-offset, -offset, -offset, -offset + bracketSize);
        // Top-right
        line(offset, -offset, offset - bracketSize, -offset);
        line(offset, -offset, offset, -offset + bracketSize);
        // Bottom-left
        line(-offset, offset, -offset + bracketSize, offset);
        line(-offset, offset, -offset, offset - bracketSize);
        // Bottom-right
        line(offset, offset, offset - bracketSize, offset);
        line(offset, offset, offset, offset - bracketSize);

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
        this._initButtonAreas(['stationMenuButtonAreas']);
        if (!station || !player) { console.warn("drawStationMainMenu missing station or player"); return; }
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [100,100,255]);
        const system = galaxy?.getCurrentSystem();
        const headerHeight = this.drawStationHeader("Station Services", station, player, system);
        textFont(font);
        
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
        
        const btnW = pW * 0.6, btnH = 45, btnSpacing = btnH + 15;
        this.stationMenuButtonAreas = this._drawMenuButtonList(
            menuOpts, pY + headerHeight, btnW, btnH, btnSpacing, [50, 50, 90], [150, 150, 200]
        );
        pop();
    } // --- End drawStationMainMenu ---

    /**
     * Draws the Space Object Dock Menu (when state is DOCKED_SPACE_OBJECT)
     * This is a simplified menu compared to the station menu, allowing only limited trading
     * and viewing of personal log.
     * @param {SpaceObject} spaceObject - The space object the player is docked at
     * @param {Player} player - The player object
     */
    drawSpaceObjectDockMenu(spaceObject, player) {
        this._initButtonAreas(['spaceObjectMenuButtonAreas']);
        if (!spaceObject || !player) { 
            console.warn("drawSpaceObjectDockMenu missing spaceObject or player"); 
            return; 
        }
        
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [100, 100, 255]);
        
        const system = galaxy?.getCurrentSystem();
        const displayName = (typeof spaceObject.getDisplayName === 'function') 
            ? spaceObject.getDisplayName() 
            : (spaceObject.type || 'Space Object');
        const headerHeight = this.drawSpaceObjectHeader(displayName + " Services", spaceObject, player, system);
        
        textFont(font);
        
        const menuOpts = [
            { text: "Commodity Market", state: "VIEWING_SPACE_OBJECT_MARKET" },
            { text: "Repairs", state: "VIEWING_SPACE_OBJECT_REPAIRS" },
            { text: "Personal Record", state: "VIEWING_RECORD" },
            { text: "Undock", action: "UNDOCK" }
        ];
        
        const btnW = pW * 0.6, btnH = 45, btnSpacing = btnH + 15;
        this.spaceObjectMenuButtonAreas = this._drawMenuButtonList(
            menuOpts, pY + headerHeight, btnW, btnH, btnSpacing, [50, 50, 90], [150, 150, 200]
        );
        pop();
    }

    /**
     * Draws the header for space object screens
     * @param {string} title - The screen title
     * @param {SpaceObject} spaceObject - The space object
     * @param {Player} player - The player object
     * @param {StarSystem} system - The current star system
     * @returns {number} Height of the header
     */
    drawSpaceObjectHeader(title, spaceObject, player, system) {
        if (!spaceObject || !player) return 0;
        
        const displayName = (typeof spaceObject.getDisplayName === 'function') 
            ? spaceObject.getDisplayName() 
            : (spaceObject.type || 'Space Object');
        
        return this._drawGenericHeader(
            title,
            displayName,
            system?.name || "Unknown System",
            system?.economyType || "Unknown",
            system?.techLevel || "?",
            system?.securityLevel || "Unknown",
            player
        );
    }

    /**
     * Draws the Space Object Market screen (when state is VIEWING_SPACE_OBJECT_MARKET)
     * @param {SpaceObject} spaceObject - The space object the player is trading with
     * @param {Player} player - The player object
     */
    drawSpaceObjectMarket(spaceObject, player) {
        if (!spaceObject || !player) { 
            console.warn("drawSpaceObjectMarket missing spaceObject or player"); 
            return; 
        }
        
        this._initButtonAreas(['spaceObjectMarketButtonAreas']);
        this._initButtonAreas(['spaceObjectMarketBackButtonArea'], false);
        
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [255, 100, 100]);
        
        const system = galaxy?.getCurrentSystem();
        const headerHeight = this.drawSpaceObjectHeader("Commodity Market", spaceObject, player, system);
        
        // Get tradable commodities for this space object
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
        
        // Row setup - match station market
        const rowH = 30;
        const btnW = 100; // Match station market button width
        const btnH = rowH * 0.8;
        
        // Define column widths - match station market layout
        const numDataColumns = 4; // Commodity, Buy, Sell, Cargo (no Stock for space objects)
        const btnSpacing = 5;
        const totalBtnWidth = (btnW * 4) + (btnSpacing * 3); // 4 buttons with 3 gaps
        const remainingWidth = tW - totalBtnWidth;
        const colWidth = Math.floor(remainingWidth / numDataColumns);
        const colCommodity = colWidth;
        const colBuy = colWidth;
        const colSell = colWidth;
        const colCargo = colWidth;
        const colButtons = totalBtnWidth;
        
        // Price Indicator Constants (match station market)
        const indicatorW = 15;
        const indicatorMaxH = rowH * 0.6;
        const indicatorYOffset = (rowH - indicatorMaxH) / 2;
        const maxDeviation = 0.8; // Max price deviation for full bar height (prices can swing -50% to +80%)
        
        // Draw column headers
        let headerY = sY - 20;
        fill(255);
        textAlign(LEFT, CENTER);
        text("Commodity", sX + 10, headerY);
        textAlign(CENTER, CENTER);
        text("Buy", sX + colCommodity + colBuy / 2, headerY);
        text("Sell", sX + colCommodity + colBuy + colSell / 2, headerY);
        text("Cargo Hold", sX + colCommodity + colBuy + colSell + colCargo / 2, headerY);
        
        // Get all commodities from station market or use default list
        const allCommodities = stationMarket ? stationMarket.getPrices() : this._getDefaultCommodityList();
        
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
            if (i % 2 === 0) {
                fill(0, 0, 0, 100);
            } else {
                fill(80, 80, 80, 100);
            }
            noStroke();
            rect(sX, yP, tW, rowH);
            
            // Get player cargo for this commodity
            const playerItem = player.cargo.find(item => item && item.name === commodityName);
            const playerQty = playerItem ? playerItem.quantity : 0;
            
            // Calculate prices based on station prices
            let buyPrice = 0;  // Price to buy FROM space object
            let sellPrice = 0; // Price to sell TO space object
            let baseBuy = 0;   // For price deviation indicators
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
                const basePrice = this._getCommodityBasePrice(commodityName);
                if (isProduced) {
                    buyPrice = Math.floor(basePrice * 0.8);
                    baseBuy = basePrice;
                }
                if (isBought) {
                    sellPrice = Math.floor(basePrice * 1.2);
                    baseSell = basePrice;
                }
            }
            
            // Commodity name (grayed out if not available)
            textAlign(LEFT, CENTER);
            fill(isAvailable ? 255 : 100);
            text(commodityName || '?', sX + 10, tY, colCommodity - 15);
            
            // Buy price with color coding
            textAlign(CENTER, CENTER);
            if (isProduced && buyPrice > 0) {
                if (baseBuy > 0) {
                    let buyDeviation = (buyPrice - baseBuy) / baseBuy;
                    if (buyDeviation < -0.05) {
                        fill(50, 255, 50); // Cheap (Green)
                    } else if (buyDeviation > 0.05) {
                        fill(255, 50, 50); // Expensive (Red)
                    } else {
                        fill(255); // Average (White)
                    }
                } else {
                    fill(255);
                }
                text(buyPrice, sX + colCommodity + colBuy / 2, tY);
            } else {
                fill(80);
                text("-", sX + colCommodity + colBuy / 2, tY);
            }
            
            // Sell price with color coding
            if (isBought && sellPrice > 0) {
                if (baseSell > 0) {
                    let sellDeviation = (sellPrice - baseSell) / baseSell;
                    if (sellDeviation > 0.05) {
                        fill(50, 255, 50); // Good Sell Price (Green)
                    } else if (sellDeviation < -0.05) {
                        fill(255, 50, 50); // Bad Sell Price (Red)
                    } else {
                        fill(255); // Average (White)
                    }
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
            
            // Price Indicators
            if (isProduced && baseBuy > 0 && buyPrice > 0) {
                const buyDeviation = (buyPrice - baseBuy) / baseBuy;
                this._drawPriceIndicator(sX + colCommodity + colBuy + 5, yP, rowH, buyDeviation, false, maxDeviation);
            }
            if (isBought && baseSell > 0 && sellPrice > 0) {
                const sellDeviation = (sellPrice - baseSell) / baseSell;
                this._drawPriceIndicator(sX + colCommodity + colBuy + colSell + 5, yP, rowH, sellDeviation, true, maxDeviation);
            }
            
            // Buttons (match station market layout)
            const rightEdge = sX + tW;
            const totalBtnWidth = (btnW * 4) + (btnSpacing * 3);
            let btnStartX = rightEdge - totalBtnWidth;
            
            // Check if this commodity is needed for the active mission
            const isMissionCargo = player.activeMission?.cargoType === commodityName;
            
            // Buy 1 button
            let buy1X = btnStartX;
            let buy1Y = yP + (rowH - btnH) / 2;
            
            if (!isProduced) {
                // Not available - grayed out
                fill(40); noStroke();
                rect(buy1X, buy1Y, btnW, btnH, 3);
                fill(60); textAlign(CENTER, CENTER); textSize(20);
                text("Buy 1", buy1X + btnW / 2, buy1Y + btnH / 2);
            } else {
                const canBuy = buyPrice > 0 && player.credits >= buyPrice && player.getCargoAmount() < player.cargoCapacity;
                if (canBuy) {
                    fill(0, 150, 0); stroke(0, 200, 0); strokeWeight(1);
                    rect(buy1X, buy1Y, btnW, btnH, 3);
                    fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(20);
                    text("Buy 1", buy1X + btnW / 2, buy1Y + btnH / 2);
                    this.spaceObjectMarketButtonAreas.push({
                        x: buy1X, y: buy1Y, w: btnW, h: btnH,
                        action: "BUY_COMMODITY", quantity: 1, commodity: commodityName, price: buyPrice
                    });
                } else {
                    fill(60); stroke(80); strokeWeight(1);
                    rect(buy1X, buy1Y, btnW, btnH, 3);
                    fill(100); noStroke(); textAlign(CENTER, CENTER); textSize(20);
                    text("Buy 1", buy1X + btnW / 2, buy1Y + btnH / 2);
                }
            }
            
            // Buy All button
            let buyAllX = buy1X + btnW + btnSpacing;
            let buyAllY = buy1Y;
            
            if (!isProduced) {
                fill(40); noStroke();
                rect(buyAllX, buyAllY, btnW, btnH, 3);
                fill(60); textAlign(CENTER, CENTER); textSize(20);
                text("Buy All", buyAllX + btnW / 2, buyAllY + btnH / 2);
            } else {
                const canBuy = buyPrice > 0 && player.credits >= buyPrice && player.getCargoAmount() < player.cargoCapacity;
                if (canBuy) {
                    fill(0, 180, 0); stroke(0, 220, 0); strokeWeight(1);
                    rect(buyAllX, buyAllY, btnW, btnH, 3);
                    fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(20);
                    text("Buy All", buyAllX + btnW / 2, buyAllY + btnH / 2);
                    this.spaceObjectMarketButtonAreas.push({
                        x: buyAllX, y: buyAllY, w: btnW, h: btnH,
                        action: "BUY_ALL_COMMODITY", commodity: commodityName, price: buyPrice
                    });
                } else {
                    fill(60); stroke(80); strokeWeight(1);
                    rect(buyAllX, buyAllY, btnW, btnH, 3);
                    fill(100); noStroke(); textAlign(CENTER, CENTER); textSize(20);
                    text("Buy All", buyAllX + btnW / 2, buyAllY + btnH / 2);
                }
            }
            
            // Sell 1 button
            let sell1X = buyAllX + btnW + 10; // Extra spacing before sell buttons
            let sell1Y = buy1Y;
            
            if (!isBought || isMissionCargo) {
                fill(isMissionCargo ? 100 : 40);
                stroke(isMissionCargo ? 120 : 0);
                if (isMissionCargo) strokeWeight(1); else noStroke();
                rect(sell1X, sell1Y, btnW, btnH, 3);
                fill(isMissionCargo ? 180 : 60);
                noStroke(); textAlign(CENTER, CENTER); textSize(20);
                text("Sell 1", sell1X + btnW / 2, sell1Y + btnH / 2);
            } else {
                const canSell = sellPrice > 0 && playerQty > 0;
                if (canSell) {
                    fill(150, 0, 0); stroke(200, 0, 0); strokeWeight(1);
                    rect(sell1X, sell1Y, btnW, btnH, 3);
                    fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(20);
                    text("Sell 1", sell1X + btnW / 2, sell1Y + btnH / 2);
                    this.spaceObjectMarketButtonAreas.push({
                        x: sell1X, y: sell1Y, w: btnW, h: btnH,
                        action: "SELL_COMMODITY", quantity: 1, commodity: commodityName, price: sellPrice
                    });
                } else {
                    fill(60); stroke(80); strokeWeight(1);
                    rect(sell1X, sell1Y, btnW, btnH, 3);
                    fill(100); noStroke(); textAlign(CENTER, CENTER); textSize(20);
                    text("Sell 1", sell1X + btnW / 2, sell1Y + btnH / 2);
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
                fill(isMissionCargo ? 180 : 60);
                noStroke(); textAlign(CENTER, CENTER); textSize(20);
                text("Sell All", sellAllX + btnW / 2, sellAllY + btnH / 2);
            } else {
                const canSell = sellPrice > 0 && playerQty > 0;
                if (canSell) {
                    fill(180, 0, 0); stroke(220, 0, 0); strokeWeight(1);
                    rect(sellAllX, sellAllY, btnW, btnH, 3);
                    fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(20);
                    text("Sell All", sellAllX + btnW / 2, sellAllY + btnH / 2);
                    this.spaceObjectMarketButtonAreas.push({
                        x: sellAllX, y: sellAllY, w: btnW, h: btnH,
                        action: "SELL_ALL_COMMODITY", commodity: commodityName, price: sellPrice
                    });
                } else {
                    fill(60); stroke(80); strokeWeight(1);
                    rect(sellAllX, sellAllY, btnW, btnH, 3);
                    fill(100); noStroke(); textAlign(CENTER, CENTER); textSize(20);
                    text("Sell All", sellAllX + btnW / 2, sellAllY + btnH / 2);
                }
            }
        }
        
        // Back button
        this.spaceObjectMarketBackButtonArea = this._drawCenteredBackButton();
        pop();
    }
    
    /**
     * Returns a default list of commodities when station market is not available.
     * @returns {Array} Array of commodity objects with name property
     */
    _getDefaultCommodityList() {
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
     * Helper function to get base price for a commodity.
     * @param {string} commodityName - The name of the commodity
     * @returns {number} The base price
     */
    _getCommodityBasePrice(commodityName) {
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
     * Shared helper for drawing repair menu content (used by both station and space object repairs)
     * @param {Player} player - The player object
     * @param {number} headerHeight - Height of the header section
     * @returns {Object} - Button areas: { full, half, bodyguards, back }
     */
    _drawRepairsContent(player, headerHeight) {
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        
        // Player ship repair section
        this._setTextStyle({ fill: 220, size: 20, alignH: CENTER, alignV: TOP });
        text(`Hull: ${floor(player.hull)} / ${player.maxHull}`, pX + pW / 2, pY + headerHeight + 10);
        
        let missing = player.maxHull - player.hull;
        let fullCost = Math.floor(missing * 10);
        let halfRepair = Math.min(missing, Math.ceil(player.maxHull / 2));
        let halfCost = Math.floor(halfRepair * 7);
        let btnW = pW * 0.5, btnH = 45, btnX = pX + pW / 2 - btnW / 2;
        let btnY1 = pY + headerHeight + 60, btnY2 = btnY1 + btnH + 20;
        
        const fullButtonArea = this._drawButton(btnX, btnY1, btnW, btnH, `Full Repair (${fullCost} cr)`, [0, 180, 0], [100, 255, 100]);
        const halfButtonArea = this._drawButton(btnX, btnY2, btnW, btnH, `50% Repair (${halfCost} cr)`, [180, 180, 0], [220, 220, 100]);
        
        // Bodyguard repair section
        const bodyguardInfo = player.getDamagedBodyguardsInfo();
        let btnY3 = btnY2 + btnH + 40;
        let bodyguardsButtonArea = {};
        
        if (bodyguardInfo.count > 0) {
            // Draw separator
            strokeWeight(1);
            stroke(255, 180, 100);
            line(pX + 50, btnY2 + btnH + 20, pX + pW - 50, btnY2 + btnH + 20);
            
            this._setTextStyle({ fill: 220, size: 20, alignH: CENTER, alignV: TOP, noStroke: true });
            
            bodyguardsButtonArea = this._drawButton(
                btnX, btnY3, btnW, btnH, 
                `Repair All Guards (${bodyguardInfo.totalCost} cr)`, 
                [0, 120, 180], [100, 200, 255]
            );
        }
        
        const backButtonArea = this._drawCenteredBackButton();
        
        return { full: fullButtonArea, half: halfButtonArea, bodyguards: bodyguardsButtonArea, back: backButtonArea };
    }

    /** Draws the Repairs Menu */
    drawRepairsMenu(player) {
        this._initButtonAreas(['repairsFullButtonArea', 'repairsHalfButtonArea', 'repairsBackButtonArea', 'repairsBodyguardsButtonArea'], false);
        
        if (!player) return;
        push();
        this.drawPanelBG(STANDARD_PANEL_BG, [255, 180, 100]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Ship Repairs", station, player, system);
        
        const buttons = this._drawRepairsContent(player, headerHeight);
        this.repairsFullButtonArea = buttons.full;
        this.repairsHalfButtonArea = buttons.half;
        this.repairsBodyguardsButtonArea = buttons.bodyguards;
        this.repairsBackButtonArea = buttons.back;
        pop();
    }

    /** 
     * Draws the Space Object Repairs Menu (when state is VIEWING_SPACE_OBJECT_REPAIRS)
     * @param {SpaceObject} spaceObject - The space object the player is docked at
     * @param {Player} player - The player object
     */
    drawSpaceObjectRepairsMenu(spaceObject, player) {
        this._initButtonAreas(['spaceObjectRepairsFullButtonArea', 'spaceObjectRepairsHalfButtonArea', 'spaceObjectRepairsBackButtonArea', 'spaceObjectRepairsBodyguardsButtonArea'], false);
        
        if (!spaceObject || !player) return;
        
        push();
        this.drawPanelBG(STANDARD_PANEL_BG, [255, 180, 100]);
        
        const system = galaxy?.getCurrentSystem();
        const displayName = (typeof spaceObject.getDisplayName === 'function') 
            ? spaceObject.getDisplayName() 
            : (spaceObject.type || 'Space Object');
        const headerHeight = this.drawSpaceObjectHeader(displayName + " Repairs", spaceObject, player, system);
        
        const buttons = this._drawRepairsContent(player, headerHeight);
        this.spaceObjectRepairsFullButtonArea = buttons.full;
        this.spaceObjectRepairsHalfButtonArea = buttons.half;
        this.spaceObjectRepairsBodyguardsButtonArea = buttons.bodyguards;
        this.spaceObjectRepairsBackButtonArea = buttons.back;
        pop();
    }

    /** Draws the Police Menu */
    drawPoliceMenu(player) {
        this._initButtonAreas(['policeButtonAreas']);
        if (!player) return;
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [100,100,255]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const isAnarchySystem = typeof system?.securityLevel === 'string' && system.securityLevel.toLowerCase() === 'anarchy';

        if (isAnarchySystem) {
            const headerHeight = this.drawStationHeader("No Local Authority", station, player, system);
            textFont(font);
            this._setTextStyle({ fill: 220, size: 22, alignH: CENTER, alignV: TOP });
            const messageY = pY + headerHeight + 20;
            text("This anarchy system has no formal police presence.", pX + pW/2, messageY);
            fill(180, 200, 255);
            textSize(18);
            text("Local disputes are settled without official intervention.", pX + pW/2, messageY + 35);

            this.policeButtonAreas.push(this._drawCenteredBackButton({action:'back'}));
            pop();
            return;
        }

        const headerHeight = this.drawStationHeader("Police Station", station, player, system);
        this._setTextStyle({ fill: 255, size: 20, alignH: CENTER, alignV: TOP });
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
            text("Active Bounty: 1,000 cr per Pirate or Alien killed", pX+pW/2, contentY+65);
        }
        // Show police faction kill progress
        try {
            const pk = player.getFactionKillsProgress && player.getFactionKillsProgress('POLICE');
            if (pk) {
                fill(200);
                textSize(16);
                textAlign(CENTER, TOP);
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
        this.policeButtonAreas.push(this._drawCenteredBackButton({action:'back'}));
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
        this.drawPanelBG(STANDARD_PANEL_BG, [255,100,100]);
        
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
        const maxDeviation = 0.8; // Max price deviation for full bar height (prices can swing -50% to +80%)

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

            // --- Price Indicators ---
            if (comm.baseBuy > 0) {
                const buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                this._drawPriceIndicator(sX + colCommodity + colBuy + 5, yP, rowH, buyDeviation, false, maxDeviation);
            }
            if (comm.baseSell > 0) {
                const sellDeviation = (comm.sellPrice - comm.baseSell) / comm.baseSell;
                this._drawPriceIndicator(sX + colCommodity + colBuy + colSell + 5, yP, rowH, sellDeviation, true, maxDeviation);
            }
            // --- End Price Indicators ---


            // --- Buttons (Positioned at the right edge) ---
            // Position buttons from the right edge of the panel
            const rightEdge = sX + tW;
            const btnSpacing = 5;
            const totalBtnWidth = (btnW * 4) + (btnSpacing * 3); // 4 buttons with 3 gaps
            let btnStartX = rightEdge - totalBtnWidth;

            // Check if this commodity is needed for the active mission
            const isMissionCargo = player.activeMission?.cargoType === comm.name;
            const btnY = yP + (rowH - btnH) / 2;

            // Buy 1 button
            let buy1X = btnStartX;
            const buy1Enabled = !isIllegalInSystem && !outOfStock;
            const buy1Area = this._drawMarketButton(buy1X, btnY, btnW, btnH, "Buy 1", buy1Enabled, true, outOfStock ? "Out" : null);
            if (buy1Area) this.marketButtonAreas.push({ ...buy1Area, action: 'buy', quantity: 1, commodity: comm.name });

            // Buy All button
            let buyAllX = buy1X + btnW + 5;
            const buyAllArea = this._drawMarketButton(buyAllX, btnY, btnW, btnH, "Buy All", buy1Enabled, true, outOfStock ? "Out" : null);
            if (buyAllArea) this.marketButtonAreas.push({ ...buyAllArea, action: 'buyAll', commodity: comm.name });

            // Sell 1 button
            let sell1X = buyAllX + btnW + 10;
            const sellEnabled = !isIllegalInSystem && !isMissionCargo;
            const sell1Area = this._drawMarketButton(sell1X, btnY, btnW, btnH, "Sell 1", sellEnabled, false);
            if (sell1Area) this.marketButtonAreas.push({ ...sell1Area, action: 'sell', quantity: 1, commodity: comm.name });

            // Sell All button
            let sellAllX = sell1X + btnW + 5;
            const sellAllArea = this._drawMarketButton(sellAllX, btnY, btnW, btnH, "Sell All", sellEnabled, false);
            if (sellAllArea) this.marketButtonAreas.push({ ...sellAllArea, action: 'sellAll', commodity: comm.name });
        }

        // Back button
        this.marketBackButtonArea = this._drawCenteredBackButton();
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
        this.drawPanelBG(STANDARD_PANEL_BG, [100,255,100]);
        
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
                } else if (m && m.type === MISSION_TYPE.ASSASSINATION) {
                    fill(255, 0, 0); // Red for assassination missions
                } else if (m && m.type === MISSION_TYPE.SABOTAGE) {
                    fill(255, 200, 50); // Goldish for high-value sabotage
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
                    this.missionDetailButtonAreas['complete'] = this._drawButton(actionBtnX, btnDetailY, btnDetailW, btnDetailH, "Complete", [0, 200, 50], [150, 255, 150], 3);
                } else {
                    this.missionDetailButtonAreas['abandon'] = this._drawButton(actionBtnX, btnDetailY, btnDetailW, btnDetailH, "Abandon", [200, 50, 50], [255, 150, 150], 3);
                }

            } else if (!activeMission && missionToShowDetails) {
                // --- The mission shown is AVAILABLE (and player has no active mission) ---
                this.missionDetailButtonAreas['accept'] = this._drawButton(actionBtnX, btnDetailY, btnDetailW, btnDetailH, "Accept", [0, 180, 0], [150, 255, 150], 3);
            } else {
                // --- Catch-all / Edge case: Active mission exists, but we are showing details for a *different* mission
                fill(50, 100, 50); stroke(100, 150, 100); strokeWeight(2);
                rect(actionBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
                fill(150); noStroke(); textAlign(CENTER, CENTER); textSize(22);
                text("Unavailable", actionBtnX + btnDetailW/2, btnDetailY + btnDetailH/2);
                this.missionDetailButtonAreas['accept'] = null;
                this.missionDetailButtonAreas['complete'] = null;
                this.missionDetailButtonAreas['abandon'] = null;
            }

            // Draw Back button (common if any details are shown)
            this._drawButton(backBtnX, btnDetailY, btnDetailW, btnDetailH, "Back", [180, 0, 0], [255, 150, 150], 3);

        } else { // No mission active AND none selected from the list
            fill(180); textSize(20); textAlign(CENTER, CENTER); 
            text("Select a mission from the list for details.", detailX + (detailW - 5) / 2, cY + cH / 2);
            // Only show a Back button, centered
            let backBtnX = pX + pW / 2 - btnDetailW / 2;
            const backBtn = this._drawButton(backBtnX, btnDetailY, btnDetailW, btnDetailH, "Back", [180, 0, 0], [255, 150, 150], 3);
            this.missionDetailButtonAreas = { 'back': backBtn, 'accept': null, 'complete': null, 'abandon': null };
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

        // --- Dynamic description sizing (compute once per opened overlay) ---
        if (this._marketOverlayCacheIndex !== systemIndex) {
            this._marketOverlayCacheIndex = systemIndex;
            // Compute and cache description text & measurement so it remains static while overlay is open
            const descText = (typeof generateSystemDescription === 'function') ? generateSystemDescription(system, { galaxy: galaxy, player: (typeof player !== 'undefined' ? player : null) }) : '';
            const descSize = 15; // increased text size for description
            const descPadding = 12;
            const descW = 360 - 24; // overlayW (360) minus side padding used below

            // Measure wrapped lines using textWidth to estimate height (safe in draw context)
            let descHeight = 0;
            if (descText && typeof textWidth === 'function') {
                push();
                textFont(font);
                textSize(descSize);
                const paras = descText.split('\n');
                const leading = descSize * 1.35;
                for (let p of paras) {
                    if (!p) { descHeight += leading; continue; }
                    const w = textWidth(p);
                    const lines = Math.max(1, Math.ceil(w / descW));
                    descHeight += lines * leading;
                }
                pop();
                descHeight += descPadding * 2; // inner padding
            } else {
                // Fallback fixed size
                descHeight = 110;
            }

            this._marketOverlayDescText = descText;
            this._marketOverlayDescSize = descSize;
            this._marketOverlayDescPadding = descPadding;
            this._marketOverlayDescHeight = descHeight;
        }

        const overlayH = headerHeight + (commodities.length * rowHeight) + closeButtonPadding + (this._marketOverlayDescHeight || 110);
        
        // Overlay dimensions
        const overlayW = 360;
        const overlayX = width - overlayW - 20; // Position on right side
        const autopilotOffset = (typeof player !== 'undefined' && player?.autopilotEnabled) ? 35 : 0;
        const overlayY = 80 + autopilotOffset; // Same as target overlay
        
        push();
        
        // Background
        fill(20, 30, 50, 240);
        stroke(100, 150, 255);
        strokeWeight(1);
        rect(overlayX, overlayY, overlayW, overlayH, 8);
        
        // Header
        fill(255);
        noStroke();
        textFont(font);
        textSize(22);
        textAlign(CENTER, TOP);
        text(`${system.name}`, overlayX + overlayW / 2, overlayY + 10);
        
        // Column headers
        const tableY = overlayY + 45;
        const col1X = overlayX + 15; // Commodity name
        const col2X = overlayX + 160; // Buy price
        const col3X = overlayX + 240; // Sell price
        const col4X = overlayX + 320; // Stock
        
        fill(180, 200, 255);
        textSize(15);
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

        // --- System description / backstory box ---
        const cachedDesc = this._marketOverlayDescText || '';
        const cachedDescSize = this._marketOverlayDescSize || 16;
        const cachedDescPadding = this._marketOverlayDescPadding || 12;
        const cachedDescHeight = this._marketOverlayDescHeight || 110;

        if (cachedDesc) {
            const descX = overlayX + 12;
            const descBoxW = overlayW - 24;
            const descY = yPos + 12; // place below commodities table

            // Description box removed — draw text directly onto the overlay

            // Draw wrapped description text with larger size
            noStroke();
            fill(220);
            textFont(font);
            textSize(cachedDescSize);
            textLeading(cachedDescSize * 1.35);
            textAlign(LEFT, TOP);
            text(cachedDesc, descX, descY, descBoxW);
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
                 const clickedSys = galaxy.systems[clickedIndex];

                 if (clickedIndex === galaxy.currentSystemIndex) {
                     // Always allow clicking the current system to deselect
                     this.lockedDestinationIndex = -1;
                     if (typeof soundManager !== 'undefined') soundManager.playSound('click_off');
                     return true;
                 }
                 // --- Selection Logic ---
                 if (reachable.includes(clickedIndex)) {
                     // If system is reachable, allow selection/locking as destination
                     this.lockedDestinationIndex = clickedIndex;
                     if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                 } else {
                     // If system is NOT reachable, show error
                     if (typeof uiManager !== 'undefined') this.addMessage("Route unavailable.", color(255, 150, 150));
                     if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                 }
                 return true; // Click was handled
             }
        }

        // If click wasn't on button or any node, deselect
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

        // Always render at the large (expanded) size. The world-range (zoom) is controlled
        // by the zoom index; clicking the minimap cycles the range.
        this.minimapSize = this.minimapExpandedSize;
        this.minimapWorldViewRange = this.minimapWorldViewRanges[this.minimapZoomIndex];

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

                // Planet marker fill - use planet's textured surface color if available
                noStroke();
                let planetColor = planet.baseColor; // fallback
                if (planet.palette && planet.palette.length > 1) {
                    // Use featureColor1 (index 1) which is typically the main surface color
                    planetColor = planet.palette[1];
                }
                if (planetColor) {
                    // Extract RGB from p5.Color object and use with reduced saturation for minimap
                    const r = red(planetColor);
                    const g = green(planetColor);
                    const b = blue(planetColor);
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

            // --- Map and Draw Space Objects ---
            const spaceObjects = system.spaceObjects || [];
            for (let i = 0, len = spaceObjects.length; i < len; i++) {
                const obj = spaceObjects[i];
                if (!obj?.pos) continue;
                let objX = obj.pos.x;
                let objY = obj.pos.y;
                let relX = objX - player.pos.x;
                let relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                if (isFullyWithinBounds(mapX, mapY, 2, 2)) {
                    noStroke();
                    fill(255); // White dots
                    ellipse(mapX, mapY, 2, 2);
                }
            }
            // ---

            // --- Map and Draw Floating Cargo Containers ---
            // Draw small colored squares for floating cargo present in the system
            const cargos = Array.isArray(system.cargo) ? system.cargo : [];
            for (let i = 0, len = cargos.length; i < len; i++) {
                const c = cargos[i];
                if (!c || !c.pos || c.collected) continue;
                const objX = c.pos.x;
                const objY = c.pos.y;
                const relX = objX - player.pos.x;
                const relY = objY - player.pos.y;
                const mapX = mapCenterX + relX * this.minimapScale;
                const mapY = mapCenterY + relY * this.minimapScale;

                // Quick reject if completely outside minimap bounds
                if (mapX < mapLeft || mapX > mapRight || mapY < mapTop || mapY > mapBottom) continue;

                // Draw cargo marker (small square) using cargo color if available
                push();
                noStroke();
                let col = c.color || [220, 200, 80];
                if (Array.isArray(col)) fill(col[0], col[1], col[2], 220);
                else fill(col);
                const size = 2; // pixel size on minimap
                rect(mapX - size/2, mapY - size/2, size, size, 1);
                pop();
            }

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

            // --- Draw Player Detection/Spawn Radius (visible white ring, clamped to minimap) ---
            try {
                // Use the system spawn distance calculation used when spawning NPCs:
                // `_getDiagonalDistance()` + buffer (matches trySpawnNPC's random offset).
                // Fall back to `despawnRadius` or a sensible default if unavailable.
                const spawnRadius = (typeof system._getDiagonalDistance === 'function')
                    ? (system._getDiagonalDistance() + 400) // max random offset used in trySpawnNPC
                    : ((typeof system.despawnRadius === 'number' && system.despawnRadius > 0) ? system.despawnRadius : 5000);

                if (spawnRadius > 0) {
                    const mapRadius = max(1, spawnRadius * this.minimapScale);
                    const maxVisibleRadius = this.minimapSize / 2 - 4; // ensure circle fits inside minimap

                    if (mapRadius <= maxVisibleRadius) {
                        // Draw a dashed, very thin white ring clipped to minimap at 50% opacity
                        const ctx = drawingContext;
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(this.minimapX, this.minimapY, this.minimapSize, this.minimapSize);
                        ctx.clip();

                        noFill();
                        stroke(255, 255, 255, 50); // 50% opacity
                        strokeWeight(0.5); // very thin
                        const dashCount = 30;
                        const dashFrac = 0.55; // fraction of arc to draw per dash
                        for (let i = 0; i < dashCount; i++) {
                            const a1 = (TWO_PI / dashCount) * i;
                            const a2 = a1 + (TWO_PI / dashCount) * dashFrac;
                            arc(mapCenterX, mapCenterY, mapRadius * 2, mapRadius * 2, a1, a2);
                        }

                        ctx.restore();
                    } else {
                        // Radius too large to display in full — draw dashed ring at the minimap edge
                        const halfMap = maxVisibleRadius;
                        noFill();
                        stroke(255, 255, 255, 128); // 50% opacity
                        strokeWeight(1);
                        const dashCount = 48;
                        const dashFrac = 0.55;
                        for (let i = 0; i < dashCount; i++) {
                            const a1 = (TWO_PI / dashCount) * i;
                            const a2 = a1 + (TWO_PI / dashCount) * dashFrac;
                            arc(mapCenterX, mapCenterY, halfMap * 2, halfMap * 2, a1, a2);
                        }
                        // Keep the player dot visible (already drawn)
                    }
                }
            } catch (e) {
                // Keep minimap robust: ignore drawing errors for optional overlay
            }
            // --- End Detection Radius ---

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
            "GALAXY_MAP","JUMPING","DOCKED_SPACE_OBJECT","VIEWING_SPACE_OBJECT_MARKET","VIEWING_SPACE_OBJECT_REPAIRS"
        ];
        if (!statesExpectingSystem.includes(currentState)) {
            return false;
        }

        const currentSystem = galaxy?.getCurrentSystem(); const currentStation = currentSystem?.station;

        // --- Minimap click: target locking (zoom cycling moved to '.' key) ---
        // Always use the expanded size for click region (minimap is always large).
        const curMinimapSize = this.minimapExpandedSize;
        const curMinimapX = width - curMinimapSize - this.minimapMargin;
        const curMinimapY = height - curMinimapSize - this.minimapMargin;
        if (mx >= curMinimapX && mx <= curMinimapX + curMinimapSize && my >= curMinimapY && my <= curMinimapY + curMinimapSize) {
            // Try to lock target on entity at click position
            if (currentState === "IN_FLIGHT" && this.handleMinimapClick(mx, my, player, currentSystem)) {
                return true;
            }
            // If no entity found, click does nothing (zoom cycling is now on '.' key)
            return true; // Still consume the click to prevent other actions
        }

        // --- DOCKED_SPACE_OBJECT State (Space Object Main Menu) ---
        if (currentState === "DOCKED_SPACE_OBJECT") {
            const btn = this._findClickedButton(mx, my, this.spaceObjectMenuButtonAreas);
            if (btn) {
                return this._handleStandardMenuClick(btn, { 
                    backState: 'IN_FLIGHT', 
                    recordReturnState: 'DOCKED_SPACE_OBJECT' 
                });
            }
            return false;
        }

        // --- VIEWING_SPACE_OBJECT_MARKET State ---
        if (currentState === "VIEWING_SPACE_OBJECT_MARKET") {
            // Handle back button
            if (this.spaceObjectMarketBackButtonArea && this.isClickInArea(mx, my, this.spaceObjectMarketBackButtonArea)) {
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                if (gameStateManager) gameStateManager.setState("DOCKED_SPACE_OBJECT");
                return true;
            }
            
            // Handle commodity buttons
            const btn = this._findClickedButton(mx, my, this.spaceObjectMarketButtonAreas);
            if (btn) {
                const spaceObject = gameStateManager?.currentDockedSpaceObject;
                const displayName = (spaceObject && typeof spaceObject.getDisplayName === 'function') 
                    ? spaceObject.getDisplayName() 
                    : (spaceObject?.type || 'Space Object');
                const systemName = galaxy?.getCurrentSystem()?.name || 'Unknown System';
                
                return this._handleMarketTradeClick(btn, player, null, {
                    locationName: displayName,
                    systemName: systemName
                });
            }
            return false;
        }

        // --- VIEWING_SPACE_OBJECT_REPAIRS State ---
        if (currentState === "VIEWING_SPACE_OBJECT_REPAIRS") {
            // Reuse repair click handling with space object button areas
            if (this._handleRepairClick(mx, my, player, 
                this.spaceObjectRepairsFullButtonArea, 
                this.spaceObjectRepairsHalfButtonArea, 
                this.spaceObjectRepairsBodyguardsButtonArea)) {
                return true;
            }
            // Back button
            if (this.spaceObjectRepairsBackButtonArea && this.isClickInArea(mx, my, this.spaceObjectRepairsBackButtonArea)) {
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                if (gameStateManager) gameStateManager.setState("DOCKED_SPACE_OBJECT");
                return true;
            }
            return false;
        }

        // --- DOCKED State (Main Station Menu) ---
        if (currentState === "DOCKED") {
            const btn = this._findClickedButton(mx, my, this.stationMenuButtonAreas);
            if (btn) {
                return this._handleStandardMenuClick(btn, { backState: 'IN_FLIGHT' });
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
            // Reuse repair click handling with station button areas
            if (this._handleRepairClick(mx, my, player, 
                this.repairsFullButtonArea, 
                this.repairsHalfButtonArea, 
                this.repairsBodyguardsButtonArea)) {
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
                        player.recordFactionJoin("POLICE"); // Record in personal record
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

        // --- VIEWING_IMPERIAL_RECRUITMENT, VIEWING_SEPARATIST_RECRUITMENT, VIEWING_MILITARY_RECRUITMENT States ---
        else if (currentState === "VIEWING_IMPERIAL_RECRUITMENT" ||
                 currentState === "VIEWING_SEPARATIST_RECRUITMENT" ||
                 currentState === "VIEWING_MILITARY_RECRUITMENT") {
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
                        // Check if we should return to space object dock instead of station
                        const returnState = gameStateManager._returnFromRecordState || "DOCKED";
                        gameStateManager._returnFromRecordState = null; // Clear it
                        gameStateManager.setState(returnState);
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

    /**
     * Finds the first clicked button in an array and returns it.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Array} buttonAreas - Array of button area objects
     * @returns {Object|null} The clicked button area or null
     */
    _findClickedButton(mx, my, buttonAreas) {
        if (!Array.isArray(buttonAreas)) return null;
        for (const btn of buttonAreas) {
            if (this.isClickInArea(mx, my, btn)) {
                return btn;
            }
        }
        return null;
    }

    /**
     * Handles standard menu button click patterns (state transitions, undock, back).
     * @param {Object} btn - The clicked button area object
     * @param {Object} options - Configuration options
     * @param {string} options.backState - State to return to for "back" action
     * @param {string} options.recordReturnState - State to set for _returnFromRecordState when going to VIEWING_RECORD
     * @returns {boolean} True if the click was handled
     */
    _handleStandardMenuClick(btn, options = {}) {
        if (!btn) return false;
        
        const { backState = 'DOCKED', recordReturnState = null } = options;
        
        if (btn.action === 'UNDOCK') {
            if (typeof soundManager !== 'undefined') soundManager.playSound('click');
            if (gameStateManager) gameStateManager.setState('IN_FLIGHT');
            return true;
        }
        
        if (btn.action === 'back' || btn.action === 'BACK') {
            if (typeof soundManager !== 'undefined') soundManager.playSound('click');
            if (gameStateManager) gameStateManager.setState(backState);
            return true;
        }
        
        if (btn.state) {
            if (typeof soundManager !== 'undefined') soundManager.playSound('click');
            if (gameStateManager) {
                // Set return state for record screen if applicable
                if (btn.state === 'VIEWING_RECORD' && recordReturnState) {
                    gameStateManager._returnFromRecordState = recordReturnState;
                }
                gameStateManager.setState(btn.state);
            }
            return true;
        }
        
        return false;
    }

    /**
     * Handles commodity buy/sell click for both station and space object markets.
     * @param {Object} btn - The clicked button area with action, commodity, price/quantity
     * @param {Player} player - The player object
     * @param {Object} market - Optional market object (for station trading)
     * @param {Object} tradeInfo - Info for logging: { locationName, systemName }
     * @returns {boolean} True if the click was handled
     */
    _handleMarketTradeClick(btn, player, market, tradeInfo = {}) {
        if (!btn || !player) return false;
        
        const { locationName = 'Unknown', systemName = 'Unknown' } = tradeInfo;
        
        // If we have a market object (station), use its buy/sell methods
        if (market && typeof market.buy === 'function') {
            switch (btn.action) {
                case 'buy':
                    market.buy(btn.commodity, 1, player);
                    return true;
                case 'buyAll': {
                    const item = market.getPrices()?.find(c => c.name === btn.commodity);
                    if (!item) return true;
                    const space = player.cargoCapacity - player.getCargoAmount();
                    const afford = Math.floor(player.credits / item.buyPrice);
                    const stock = Number.isFinite(item.stock) ? Math.max(0, Math.floor(item.stock)) : Infinity;
                    const qty = Math.min(space, afford, stock);
                    if (qty > 0) market.buy(btn.commodity, qty, player);
                    return true;
                }
                case 'sell':
                    market.sell(btn.commodity, 1, player);
                    return true;
                case 'sellAll': {
                    const cargo = player.cargo.find(c => c.name === btn.commodity);
                    if (cargo?.quantity > 0) market.sell(btn.commodity, cargo.quantity, player);
                    return true;
                }
            }
        }
        
        // Direct buy/sell for space objects (no market object)
        const logTrade = () => {
            if (typeof player.recordStationTrade === 'function') {
                player.recordStationTrade(locationName, systemName);
            }
            if (typeof saveGame === 'function') saveGame();
        };
        
        switch (btn.action) {
            case 'BUY_COMMODITY':
            case 'buy': {
                const price = btn.price || 0;
                if (player.credits >= price && player.getCargoAmount() < player.cargoCapacity) {
                    player.spendCredits(price);
                    player.addCargo(btn.commodity, 1);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('buyConfirm');
                    this.addMessage(`Bought 1 ${btn.commodity} for ${price} credits`, [100, 200, 255]);
                    logTrade();
                } else {
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                    this.addMessage(player.credits < price ? "Not enough credits" : "Cargo hold is full", [255, 100, 100]);
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
                    this.addMessage(`Bought ${qty} ${btn.commodity} for ${totalCost} credits`, [100, 200, 255]);
                    logTrade();
                } else {
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                    this.addMessage(player.credits < price ? "Not enough credits" : "Cargo hold is full", [255, 100, 100]);
                }
                return true;
            }
            case 'SELL_COMMODITY':
            case 'sell': {
                const price = btn.price || 0;
                const cargo = player.cargo.find(c => c.name === btn.commodity);
                if (cargo?.quantity > 0) {
                    player.addCredits(price);
                    player.removeCargo(btn.commodity, 1);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('sellConfirm');
                    this.addMessage(`Sold 1 ${btn.commodity} for ${price} credits`, [100, 255, 100]);
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
                    this.addMessage(`Sold ${qty} ${btn.commodity} for ${total} credits`, [100, 255, 100]);
                    logTrade();
                } else {
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
                return true;
            }
        }
        
        return false;
    }

    /**
     * Shared helper for handling repair button clicks (used by both station and space object repairs)
     * @param {number} mx - Mouse X coordinate
     * @param {number} my - Mouse Y coordinate
     * @param {Player} player - The player object
     * @param {Object} fullButtonArea - Button area for full repair
     * @param {Object} halfButtonArea - Button area for 50% repair
     * @param {Object} bodyguardsButtonArea - Button area for bodyguard repairs
     * @returns {boolean} - True if a repair action was handled
     */
    _handleRepairClick(mx, my, player, fullButtonArea, halfButtonArea, bodyguardsButtonArea) {
        // Full repair
        if (fullButtonArea && this.isClickInArea(mx, my, fullButtonArea)) {
            let missing = player.maxHull - player.hull;
            let cost = Math.floor(missing * 10);
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
        if (halfButtonArea && this.isClickInArea(mx, my, halfButtonArea)) {
            let missing = player.maxHull - player.hull;
            let repairAmt = Math.min(missing, Math.ceil(player.maxHull / 2));
            let cost = Math.floor(repairAmt * 7);
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
        if (bodyguardsButtonArea && this.isClickInArea(mx, my, bodyguardsButtonArea)) {
            const bodyguardInfo = player.getDamagedBodyguardsInfo();
            if (bodyguardInfo.count <= 0) {
                this.addMessage("No damaged bodyguards to repair.");
                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            } else if (player.credits >= bodyguardInfo.totalCost) {
                if (player.repairBodyguards(bodyguardInfo.totalCost)) {
                    this.addMessage(`${bodyguardInfo.count} bodyguard${bodyguardInfo.count > 1 ? 's' : ''} repaired for ${bodyguardInfo.totalCost} credits.`);
                    if (typeof soundManager !== 'undefined') soundManager.playSound('upgrade');
                    if (typeof saveGame === 'function') saveGame();
                }
            } else {
                this.addMessage(`Not enough credits! Bodyguard repairs cost ${bodyguardInfo.totalCost} credits.`);
                if (typeof soundManager !== 'undefined') soundManager.playSound('error');
            }
            return true;
        }
        return false;
    }

    /** Draws the Shipyard Menu (when state is VIEWING_SHIPYARD) */
    drawShipyardMenu(player) {
        if (!player) return;
        this.shipyardListAreas = [];
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [220,190,90]); // Imperial gold border
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
            // Ship definition not found - this shouldn't happen in normal gameplay
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
            pX + pW, startY, scrollAreaH,
            this.shipyardScrollOffset, this.shipyardScrollMax,
            visibleRows, totalRows,
            [60, 60, 100], [120, 180, 255]
        );
    
        // Back button
        this.shipyardDetailButtons = {back: this._drawCenteredBackButton()};
        pop();
    }




    /** Draws the Upgrades Menu (when state is VIEWING_UPGRADES) */
    drawUpgradesMenu(player) {
        if (!player) return;
        this.upgradeListAreas = [];
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [200,100,255]);
        
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
            pX + pW, startY, scrollAreaH,
            this.upgradeScrollOffset, this.upgradeScrollMax,
            visibleRows, totalRows,
            [60, 60, 100], [180, 100, 255]
        );
    
        // Back button
        this.upgradeDetailButtons = {back: this._drawCenteredBackButton()};
        pop();
    }

    /**
     * Handles scroll input for a specific scroll offset/max pair.
     * @param {string} offsetKey - Property name for scroll offset
     * @param {string} maxKey - Property name for scroll max
     * @param {number} delta - Scroll direction (positive = down, negative = up)
     * @returns {boolean} Whether scroll was handled
     */
    _handleScroll(offsetKey, maxKey, delta) {
        if (this[maxKey] <= 0) return false;
        if (typeof this[offsetKey] !== "number") this[offsetKey] = 0;
        this[offsetKey] += delta > 0 ? 1 : -1;
        this[offsetKey] = constrain(this[offsetKey], 0, this[maxKey]);
        return true;
    }

    /** Handles mouse wheel events for scrolling */
    handleMouseWheel(event, currentState) {
        const scrollConfigs = {
            "VIEWING_SHIPYARD": ["shipyardScrollOffset", "shipyardScrollMax"],
            "VIEWING_UPGRADES": ["upgradeScrollOffset", "upgradeScrollMax"],
            "VIEWING_RECORD": ["recordScrollOffset", "recordScrollMax"]
        };
        
        const config = scrollConfigs[currentState];
        if (config) {
            return this._handleScroll(config[0], config[1], event.deltaY);
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
        const boxWidth = Math.min(360, Math.max(300, width - 40));
        const baseX = 20; // left margin
        const autopilotOffset = (typeof player !== 'undefined' && player?.autopilotEnabled) ? 35 : 0;
        const baseY = 80 + autopilotOffset; // align with target/market overlay Y

        push();
        textAlign(LEFT, TOP);
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
            text(msg.text, baseX + boxPadding, textY);
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
        
        return this._drawGenericHeader(
            title,
            station.name || "Unknown Station",
            system?.name || "Unknown System",
            system?.economyType || "Unknown",
            system?.techLevel || "?",
            system?.securityLevel || "Unknown",
            player
        );
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
        // If this is a back button, force a consistent blue background
        if (typeof label === 'string' && label.trim().toLowerCase() === 'back') {
            fillCol = [0, 80, 180];
            strokeCol = [100, 150, 255];
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

    /**
     * Draws a standard centered back button at the bottom of a panel.
     * Uses standard back button styling (blue background).
     * @param {Object} [extra={}] - Extra properties to attach to the area object
     * @returns {Object} Area object for the back button
     */
    _drawCenteredBackButton(extra = {}) {
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        const backW = 100, backH = 30;
        const backX = pX + pW / 2 - backW / 2;
        const backY = pY + pH - backH - 15;
        return this._drawButton(backX, backY, backW, backH, "Back", [0, 80, 180], [100, 150, 255], 5, extra);
    }

    /**
     * Returns the appropriate fill color for a price deviation.
     * Positive deviation = red (expensive), negative = green (cheap), neutral = white.
     * @param {number} deviation - The price deviation ratio (e.g., 0.1 for 10% above base)
     * @param {boolean} isSellPrice - If true, inverts logic (positive = good for selling)
     * @returns {Array} RGB color array [r, g, b]
     */
    _getPriceDeviationColor(deviation, isSellPrice = false) {
        const threshold = 0.05;
        if (isSellPrice) {
            // For sell prices: positive deviation is good (green), negative is bad (red)
            if (deviation > threshold) return [50, 255, 50];
            if (deviation < -threshold) return [255, 50, 50];
        } else {
            // For buy prices: negative deviation is good (green), positive is bad (red)
            if (deviation < -threshold) return [50, 255, 50];
            if (deviation > threshold) return [255, 50, 50];
        }
        return [255, 255, 255]; // Neutral
    }

    /**
     * Draws a price indicator bar for market displays.
     * @param {number} x - X position
     * @param {number} y - Y position (top of row)
     * @param {number} rowH - Row height
     * @param {number} deviation - Price deviation ratio
     * @param {boolean} isSellPrice - Whether this is a sell price indicator
     * @param {number} maxDeviation - Maximum deviation for full bar height (default 0.5)
     */
    _drawPriceIndicator(x, y, rowH, deviation, isSellPrice = false, maxDeviation = 0.8) {
        const indicatorMaxH = rowH * 0.6;
        const indicatorYOffset = (rowH - indicatorMaxH) / 2;
        const threshold = 0.05;
        
        let indicatorH = constrain(abs(deviation) / maxDeviation, 0, 1) * indicatorMaxH;
        let indicatorY = y + indicatorYOffset + (indicatorMaxH - indicatorH);
        
        const col = this._getPriceDeviationColor(deviation, isSellPrice);
        
        // For near-neutral prices, show minimal indicator
        if (abs(deviation) <= threshold) {
            fill(120);
            indicatorH = 1;
            indicatorY = y + indicatorYOffset + indicatorMaxH - indicatorH;
        } else {
            fill(col[0], col[1], col[2]);
        }
        
        if (indicatorH > 0) {
            noStroke();
            rect(x, indicatorY, 3, indicatorH);
        }
    }

    /**
     * Draws a single commodity row for market screens (station or space object).
     * @param {Object} config - Row configuration
     * @param {string} config.name - Commodity name
     * @param {number} config.buyPrice - Price to buy (0 if not available)
     * @param {number} config.sellPrice - Price to sell (0 if not available)
     * @param {number} config.baseBuy - Base buy price for deviation calculation
     * @param {number} config.baseSell - Base sell price for deviation calculation
     * @param {number} config.stock - Available stock (-1 for unlimited/hidden)
     * @param {number} config.playerQty - Quantity in player cargo
     * @param {boolean} config.isAvailable - Whether commodity is tradeable here
     * @param {boolean} config.isMissionCargo - Whether this is mission cargo (can't sell)
     * @param {number} config.rowIndex - Row index for alternating colors
     * @param {number} config.x - X position
     * @param {number} config.y - Y position
     * @param {number} config.rowH - Row height
     * @param {Object} config.columns - Column positions { commodity, buy, sell, stock, cargo, buttonsStart }
     * @param {number} config.btnW - Button width
     * @param {number} config.btnH - Button height
     * @param {boolean} [config.showStock=true] - Whether to show stock column
     * @param {number} [config.maxDeviation=0.8] - Max deviation for price indicators
     * @returns {Array} Array of button area objects for this row
     */
    _drawMarketRow(config) {
        const { name, buyPrice, sellPrice, baseBuy, baseSell, stock, playerQty, 
                isAvailable, isMissionCargo, rowIndex, x, y, rowH, columns, btnW, btnH,
                showStock = true, maxDeviation = 0.8 } = config;
        
        const buttonAreas = [];
        const tY = y + rowH / 2;
        const btnY = y + (rowH - btnH) / 2;
        const btnSpacing = 5;
        
        // Alternating row background
        fill(rowIndex % 2 === 0 ? color(0, 0, 0, 100) : color(80, 80, 80, 100));
        noStroke();
        rect(x, y, columns.totalWidth, rowH);
        
        // Commodity name
        textAlign(LEFT, CENTER);
        fill(isAvailable ? 255 : 100);
        text(name || '?', x + 10, tY);
        
        // Buy price with color coding
        textAlign(CENTER, CENTER);
        if (buyPrice > 0) {
            fill(this._getPriceDeviationColor((buyPrice - baseBuy) / baseBuy, false));
            text(buyPrice, columns.buy, tY);
        } else {
            fill(80);
            text("-", columns.buy, tY);
        }
        
        // Sell price with color coding  
        if (sellPrice > 0) {
            fill(this._getPriceDeviationColor((sellPrice - baseSell) / baseSell, true));
            text(sellPrice, columns.sell, tY);
        } else {
            fill(80);
            text("-", columns.sell, tY);
        }
        
        // Stock column (optional)
        if (showStock && stock >= 0) {
            if (stock <= 0) {
                fill(255, 120, 120);
            } else if (stock < 50) {
                fill(255, 180, 120);
            } else if (stock > 200) {
                fill(120, 200, 255);
            } else {
                fill(220);
            }
            text(Math.floor(stock), columns.stock, tY);
        }
        
        // Cargo amount
        fill(playerQty > 0 ? 255 : 80);
        text(playerQty, columns.cargo, tY);
        
        // Price indicators
        if (baseBuy > 0 && buyPrice > 0) {
            const buyDeviation = (buyPrice - baseBuy) / baseBuy;
            this._drawPriceIndicator(columns.buy + 40, y, rowH, buyDeviation, false, maxDeviation);
        }
        if (baseSell > 0 && sellPrice > 0) {
            const sellDeviation = (sellPrice - baseSell) / baseSell;
            this._drawPriceIndicator(columns.sell + 40, y, rowH, sellDeviation, true, maxDeviation);
        }
        
        // Buttons
        let btnX = columns.buttonsStart;
        
        // Buy 1
        const canBuy = buyPrice > 0 && isAvailable;
        const buy1Area = this._drawMarketButton(btnX, btnY, btnW, btnH, "Buy 1", canBuy, true, !canBuy && stock === 0 ? "Out" : null);
        if (buy1Area) buttonAreas.push({ ...buy1Area, action: 'buy', quantity: 1, commodity: name });
        btnX += btnW + btnSpacing;
        
        // Buy All
        const buyAllArea = this._drawMarketButton(btnX, btnY, btnW, btnH, "Buy All", canBuy, true, !canBuy && stock === 0 ? "Out" : null);
        if (buyAllArea) buttonAreas.push({ ...buyAllArea, action: 'buyAll', commodity: name });
        btnX += btnW + 10; // Extra spacing before sell
        
        // Sell 1
        const canSell = sellPrice > 0 && isAvailable && !isMissionCargo;
        const sell1Area = this._drawMarketButton(btnX, btnY, btnW, btnH, "Sell 1", canSell, false);
        if (sell1Area) buttonAreas.push({ ...sell1Area, action: 'sell', quantity: 1, commodity: name });
        btnX += btnW + btnSpacing;
        
        // Sell All
        const sellAllArea = this._drawMarketButton(btnX, btnY, btnW, btnH, "Sell All", canSell, false);
        if (sellAllArea) buttonAreas.push({ ...sellAllArea, action: 'sellAll', commodity: name });
        
        return buttonAreas;
    }

    /**
     * Draws a standardized header for both station and space object screens.
     * @param {string} title - Screen title
     * @param {string} locationName - Station or space object name
     * @param {string} systemName - System name
     * @param {string} economyType - Economy type
     * @param {number} techLevel - Tech level
     * @param {string} securityLevel - Security level
     * @param {Player} player - Player object for credits/cargo display
     * @returns {number} Height of the header
     */
    _drawGenericHeader(title, locationName, systemName, economyType, techLevel, securityLevel, player) {
        const {x: pX, y: pY, w: pW} = this.getPanelRect();
        const headerHeight = 100;
        
        // Title (centered)
        fill(255);
        noStroke();
        textFont(font);
        textSize(30);
        textAlign(CENTER, TOP);
        text(title, pX + pW / 2, pY + 20);
        
        // Location and system (left aligned)
        textSize(20);
        textAlign(LEFT, TOP);
        text(`${locationName} - ${systemName}`, pX + 20, pY + 20);
        
        // Economy, tech, security (left aligned)
        text(`${economyType}   |   Tech: ${techLevel}   |   Security: ${securityLevel}`, pX + 20, pY + 45);
        
        // Credits and cargo (right aligned)
        if (player) {
            textAlign(RIGHT, TOP);
            text(`Credits: ${Math.floor(player.credits)}`, pX + pW - 30, pY + 20);
            text(`Cargo: ${Math.floor(player.getCargoAmount())}/${player.cargoCapacity}`, pX + pW - 30, pY + 45);
        }
        
        return headerHeight;
    }

    /**
     * Draws a market button (Buy/Sell) with proper styling.
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} label - Button text
     * @param {boolean} enabled - Whether button is clickable
     * @param {boolean} isBuy - True for buy buttons, false for sell
     * @param {string} [disabledReason] - Reason shown if disabled (e.g., "Out")
     * @returns {Object|null} Button area object if enabled, null if disabled
     */
    _drawMarketButton(x, y, w, h, label, enabled, isBuy, disabledReason = null) {
        if (!enabled) {
            fill(disabledReason ? 100 : 40);
            stroke(disabledReason ? 120 : 0);
            if (disabledReason) strokeWeight(1); else noStroke();
            rect(x, y, w, h, 3);
            fill(disabledReason ? (isBuy ? [255, 150, 150] : 180) : 60);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(20);
            text(disabledReason || label, x + w / 2, y + h / 2);
            return null;
        }
        
        // Enabled button
        if (isBuy) {
            fill(label.includes('All') ? 0 : 0, label.includes('All') ? 180 : 150, 0);
            stroke(0, label.includes('All') ? 220 : 200, 0);
        } else {
            fill(label.includes('All') ? 180 : 150, 0, 0);
            stroke(label.includes('All') ? 220 : 200, 0, 0);
        }
        strokeWeight(1);
        rect(x, y, w, h, 3);
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(20);
        text(label, x + w / 2, y + h / 2);
        
        return { x, y, w, h };
    }

    /**
     * Draws a scrollbar and returns the area object for click detection.
     * @param {number} x - X position of panel right edge (scrollbar positioned relative to this)
     * @param {number} y - Y position (top of scroll area)
     * @param {number} h - Height of scroll area
     * @param {number} scrollOffset - Current scroll offset
     * @param {number} scrollMax - Maximum scroll offset
     * @param {number} visibleItems - Number of visible items
     * @param {number} totalItems - Total number of items
     * @param {Array} [bgColor=[60,60,100]] - Background color
     * @param {Array} [strokeColor=[150,150,200]] - Border color
     * @returns {Object|null} Area object with x, y, w, h, handleY, handleH or null if no scrolling needed
     */
    _drawScrollbar(x, y, h, scrollOffset, scrollMax, visibleItems, totalItems, bgColor = [60, 60, 100], strokeColor = [150, 150, 200]) {
        if (scrollMax <= 0) return null;
        
        const barW = 12;
        const barX = x - 18;
        
        fill(...bgColor);
        stroke(...strokeColor);
        rect(barX, y, barW, h, 6);
        
        const handleH = max(30, h * (visibleItems / totalItems));
        const handleY = y + (h - handleH) * (scrollOffset / scrollMax);
        
        fill(180, 180, 220);
        noStroke();
        rect(barX + 1, handleY, barW - 2, handleH, 6);
        
        return { x: barX, y, w: barW, h, handleY, handleH };
    }

    /**
     * Computes scroll parameters for a list and clamps the offset.
     * @param {string} scrollOffsetKey - Property name for scroll offset on this object
     * @param {string} scrollMaxKey - Property name for scroll max on this object  
     * @param {number} totalItems - Total number of items in the list
     * @param {number} visibleItems - Number of items that fit in view
     * @returns {Object} { firstRow, lastRow, scrollOffset, scrollMax }
     */
    _computeScrollParams(scrollOffsetKey, scrollMaxKey, totalItems, visibleItems) {
        const scrollMax = Math.max(0, totalItems - visibleItems);
        this[scrollMaxKey] = scrollMax;
        
        if (typeof this[scrollOffsetKey] !== 'number') this[scrollOffsetKey] = 0;
        this[scrollOffsetKey] = constrain(this[scrollOffsetKey], 0, scrollMax);
        
        const firstRow = this[scrollOffsetKey];
        const lastRow = Math.min(firstRow + visibleItems, totalItems);
        
        return { firstRow, lastRow, scrollOffset: this[scrollOffsetKey], scrollMax };
    }

    /**
     * Draws a scrollable list panel with consistent styling.
     * @param {Object} config - Configuration object
     * @param {number} config.startY - Y position to start drawing rows
     * @param {number} config.rowHeight - Height of each row
     * @param {number} config.availableHeight - Total height available for rows
     * @param {Array} config.items - Array of items to display
     * @param {Function} config.renderRow - Function(item, index, y, rowH, pX, pW) to render each row
     * @param {string} config.scrollOffsetKey - Property name for scroll offset
     * @param {string} config.scrollMaxKey - Property name for scroll max
     * @param {Array} [config.scrollbarColors] - [bgColor, strokeColor] for scrollbar
     * @returns {Object} { firstRow, lastRow, scrollbarArea }
     */
    _drawScrollableList(config) {
        const { startY, rowHeight, availableHeight, items, renderRow, scrollOffsetKey, scrollMaxKey } = config;
        const scrollbarColors = config.scrollbarColors || [[60, 60, 100], [150, 150, 200]];
        const {x: pX, w: pW} = this.getPanelRect();
        
        const visibleRows = Math.floor(availableHeight / rowHeight);
        const { firstRow, lastRow, scrollOffset, scrollMax } = this._computeScrollParams(
            scrollOffsetKey, scrollMaxKey, items.length, visibleRows
        );
        
        // Render visible rows
        for (let i = firstRow; i < lastRow; i++) {
            const y = startY + (i - firstRow) * rowHeight;
            renderRow(items[i], i, y, rowHeight, pX, pW);
        }
        
        // Draw scrollbar if needed
        const scrollAreaH = visibleRows * rowHeight;
        const scrollbarArea = this._drawScrollbar(
            pX + pW, startY, scrollAreaH,
            scrollOffset, scrollMax,
            visibleRows, items.length,
            scrollbarColors[0], scrollbarColors[1]
        );
        
        return { firstRow, lastRow, scrollbarArea };
    }

    /**
     * Draws a faction recruitment menu with consistent styling.
     * @param {Player} player - The player object
     * @param {string} factionName - Display name of the faction
     * @param {string} factionKey - Key used for faction logic (e.g., 'IMPERIAL')
     * @param {Array} themeColors - [fillColor, strokeColor] for panel
     * @param {string} tagline - Faction tagline/slogan
     * @param {string} bountyDescription - Description of faction bounties
     */
    _drawFactionRecruitmentMenu(player, factionName, factionKey, themeColors, tagline, bountyDescription) {
        this._initButtonAreas(['factionRecruitmentButtonAreas']);
        if (!player) return;
        
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, themeColors[1]);
        
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader(`${factionName} Recruitment`, station, player, system);
        
        fill(255);
        textSize(20);
        textAlign(CENTER, TOP);
        const contentY = pY + headerHeight + 10;
        
        const isWanted = system?.isPlayerWanted();
        const canJoin = player.canJoinFaction(factionKey);
        
        // Display faction info
        fill(themeColors[1]);
        textSize(24);
        text(`${factionName} Recruitment Office`, pX + pW / 2, contentY);
        
        fill(255);
        textSize(18);
        text(tagline, pX + pW / 2, contentY + 40);
        
        // Show legal status
        fill(255);
        textSize(20);
        text(`Legal Status in ${system?.name || 'Unknown'} System: `, pX + pW / 2, contentY + 80);
        const statusText = isWanted ? "WANTED" : "CLEAN";
        const statusColor = isWanted ? [255, 50, 50] : [50, 255, 50];
        fill(statusColor);
        textSize(24);
        text(statusText, pX + pW / 2, contentY + 110);
        
        // Show current faction status
        if (player.playerFaction) {
            fill(255, 200, 100);
            textSize(18);
            text(`Current Faction: ${player.playerFaction}`, pX + pW / 2, contentY + 140);
        }
        
        // Display bounty information if member
        if (player.playerFaction === factionKey) {
            fill(100, 255, 100);
            textSize(18);
            text(bountyDescription, pX + pW / 2, contentY + (player.playerFaction ? 170 : 150));
        }
        
        // Show faction kill progress
        try {
            const progress = player.getFactionKillsProgress && player.getFactionKillsProgress(factionKey);
            if (progress) {
                fill(themeColors[1][0] * 0.9, themeColors[1][1] * 0.9, themeColors[1][2] * 0.9);
                textSize(16);
                textAlign(CENTER, TOP);
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
            let fineAmount = this._getFactionFineAmount(factionKey, system?.securityLevel);
            this.factionRecruitmentButtonAreas.push(
                this._drawButton(btnX, btnY1, btnW, btnH, `Pay Fine (${fineAmount} cr)`, [0, 180, 0], [100, 255, 100], 5, {action: 'pay_fine', amount: fineAmount, faction: factionKey})
            );
            btnY1 += btnH + 20;
        }
        
        // Join faction button or status message
        if (canJoin && !isWanted) {
            this.factionRecruitmentButtonAreas.push(
                this._drawButton(btnX, btnY1, btnW, btnH, `Join ${factionName}`, themeColors[0], themeColors[1], 5, {action: 'join_faction', faction: factionKey})
            );
        } else if (player.playerFaction === factionKey) {
            fill(255);
            textSize(18);
            textAlign(CENTER, CENTER);
            text(this._getFactionMemberMessage(factionKey), pX + pW / 2, btnY1 + btnH / 2);
        } else if (player.playerFaction && player.playerFaction !== factionKey) {
            fill(255, 150, 150);
            textSize(16);
            textAlign(CENTER, CENTER);
            text("You must leave your current faction first", pX + pW / 2, btnY1 + btnH / 2);
        } else if (isWanted) {
            fill(255, 150, 150);
            textSize(16);
            textAlign(CENTER, CENTER);
            text("Clear your legal status to join", pX + pW / 2, btnY1 + btnH / 2);
        }
        
        // Back button
        this.factionRecruitmentButtonAreas.push(this._drawCenteredBackButton({action: 'back'}));
        pop();
    }

    /**
     * Returns the fine amount for a faction based on security level.
     * @param {string} factionKey - Faction identifier
     * @param {string} securityLevel - System security level
     * @returns {number} Fine amount in credits
     */
    _getFactionFineAmount(factionKey, securityLevel) {
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
    _getFactionMemberMessage(factionKey) {
        const messages = {
            IMPERIAL: "You serve the Empire with honor",
            SEPARATIST: "You fight for freedom and independence",
            MILITARY: "You serve with honor and distinction",
            POLICE: "You are a member of the Police Force"
        };
        return messages[factionKey] || "You are a faction member";
    }

    /** Draws the Protection Services menu (when state is VIEWING_PROTECTION) */
    drawProtectionServicesMenu(player) {
        if (!player) return;
        this._initButtonAreas(['protectionServicesButtons']);
        
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        
        // Draw panel background
        this.drawPanelBG(STANDARD_PANEL_BG, [80, 120, 180]);
        
        // Draw header
        const system = galaxy?.getCurrentSystem();
        const station = system?.station; // Direct property access instead of getStation() method
        const headerHeight = this.drawStationHeader("Protection Services", station, player, system);
        
        // Draw description
        textFont(font);
        this._setTextStyle({ fill: 220, size: 24, alignH: CENTER, alignV: TOP });
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
        this._initButtonAreas(['storageButtonAreas']);

        const activeStation = station || player?.currentSystem?.station || null;

        push();

        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [100, 150, 255]);
        textFont(font);

        if (!activeStation) {
            fill(220);
            textSize(22);
            textAlign(CENTER, CENTER);
            text("No storage services are available in this location.", pX + pW/2, pY + pH/2 - 20);

            const backBtn = this._drawCenteredBackButton();
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

        // Back button - use the standardized centered back button
        const backBtn = this._drawCenteredBackButton();
        backBtn.action = "BACK";
        this.storageButtonAreas.push(backBtn);

        pop();
    }

    /** Draws the Personal Record menu (when state is VIEWING_RECORD) */
    drawPersonalRecordMenu(player) {
        if (!player) return;
        this._initButtonAreas(['recordButtonAreas']);
        
        push();
        
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [100, 150, 255]);
        
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        
        // Use appropriate header based on whether player is docked at station or space object
        // Check _returnFromRecordState to determine if we came from a space object
        let headerHeight;
        if (gameStateManager?._returnFromRecordState === "DOCKED_SPACE_OBJECT" && gameStateManager?.currentDockedSpaceObject) {
            headerHeight = this.drawSpaceObjectHeader("Personal Record", gameStateManager.currentDockedSpaceObject, player, system);
        } else {
            headerHeight = this.drawStationHeader("Personal Record", station, player, system);
        }
        
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
            this._drawScrollbar(
                pX + pW, contentY + 35, contentH - 35,
                this.recordScrollOffset, this.recordScrollMax,
                visibleLines, totalEntries
            );
        }

        // Back button - use the standardized centered back button
        const backBtn = this._drawCenteredBackButton();
        backBtn.action = "BACK";
        this.recordButtonAreas.push(backBtn);
        
        pop();
    }

    /** Draws the Imperial Navy Recruitment Menu */
    drawImperialRecruitmentMenu(player) {
        this._drawFactionRecruitmentMenu(
            player,
            "Imperial Navy",
            "IMPERIAL",
            [[120, 100, 50], [220, 190, 90]],
            "Serve the Empire. Restore order to the galaxy.",
            "Active Bounty: 2,000 cr per Separatist killed"
        );
    }

    /** Draws the Separatist Forces Recruitment Menu */
    drawSeparatistRecruitmentMenu(player) {
        this._drawFactionRecruitmentMenu(
            player,
            "Separatist Forces",
            "SEPARATIST",
            [[100, 50, 0], [200, 100, 0]],
            "Fight for freedom. Break the chains of tyranny.",
            "Active Bounty: 2,000 cr per Imperial killed"
        );
    }

    /** Draws the Military Academy Recruitment Menu */
    drawMilitaryRecruitmentMenu(player) {
        this._drawFactionRecruitmentMenu(
            player,
            "Military Forces",
            "MILITARY",
            [[50, 60, 70], [100, 120, 140]],
            "Honor, duty, excellence. Defend the frontier.",
            "Active Bounty: 4,000 cr per Alien killed, 1,000 cr per Pirate killed"
        );
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

    /**
     * Cycles the minimap zoom level.
     * @param {number} direction - 1 for zoom out, -1 for zoom in
     */
    _cycleMinimapZoom(direction) {
        const delta = direction > 0 ? 1 : -1;
        this.minimapZoomIndex = (this.minimapZoomIndex + delta + this.minimapWorldViewRanges.length) % this.minimapWorldViewRanges.length;
        this.minimapWorldViewRange = this.minimapWorldViewRanges[this.minimapZoomIndex];
        this.minimapScale = this.minimapSize / this.minimapWorldViewRange;
        soundManager.playSound('click');
    }

    /**
     * Cycles the minimap zoom level through available world view ranges.
     * Called by '.' keyboard shortcut.
     */
    cycleOutMinimapZoom() {
        this._cycleMinimapZoom(1);
    }

    /**
     * Cycles the minimap zoom level through available world view ranges.
     * Called by ',' keyboard shortcut.
     */
    cycleInMinimapZoom() {
        this._cycleMinimapZoom(-1);
    }


    /**
     * Handles minimap click for target locking.
     * Converts minimap screen coordinates to world coordinates and checks for entities.
     * @param {number} mx - Mouse X position in screen coordinates
     * @param {number} my - Mouse Y position in screen coordinates
     * @param {Player} player - The player object
     * @param {StarSystem} system - The current star system
     * @returns {boolean} True if an entity was found and targeted, false otherwise
     */
    handleMinimapClick(mx, my, player, system) {
        if (!player || !player.pos || !system) return false;

        // Calculate minimap boundaries
        const curMinimapSize = this.minimapExpandedSize;
        const curMinimapX = width - curMinimapSize - this.minimapMargin;
        const curMinimapY = height - curMinimapSize - this.minimapMargin;
        const mapCenterX = curMinimapX + curMinimapSize / 2;
        const mapCenterY = curMinimapY + curMinimapSize / 2;

        // Get current world view range and scale
        const worldViewRange = this.minimapWorldViewRanges[this.minimapZoomIndex];
        const scale = curMinimapSize / worldViewRange;

        // Convert click position from minimap coordinates to world coordinates
        const relativeX = (mx - mapCenterX) / scale;
        const relativeY = (my - mapCenterY) / scale;
        const worldX = player.pos.x + relativeX;
        const worldY = player.pos.y + relativeY;

        // Find the closest entity to the click position within a reasonable range
        // The click radius scales inversely with zoom (tighter at high zoom, looser at low zoom)
        const baseClickRadius = 15; // Base radius in minimap pixels
        const worldClickRadius = baseClickRadius / scale;

        let closestEntity = null;
        let closestDistSq = worldClickRadius * worldClickRadius;

        // Helper to check entity list
        const checkEntities = (entities) => {
            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (!entity || !entity.pos || entity.destroyed) continue;
                const dx = entity.pos.x - worldX;
                const dy = entity.pos.y - worldY;
                const distSq = dx * dx + dy * dy;
                if (distSq < closestDistSq) {
                    closestDistSq = distSq;
                    closestEntity = entity;
                }
            }
        };

        // Check enemies and space objects
        checkEntities(system.enemies || []);
        checkEntities(system.spaceObjects || []);

        // If an entity was found, handle target locking
        if (closestEntity) {
            if (player.target === closestEntity) {
                // Clicking the same target unlocks it
                player.target = null;
                this.addMessage('Target unlocked.', [255, 255, 0]);
                if (typeof soundManager !== 'undefined' && soundManager.playSound) {
                    soundManager.playSound('click');
                }
            } else {
                // Lock onto new target
                player.target = closestEntity;
                const label = this._getEntityLabel(closestEntity);
                this.addMessage(`Target locked: ${label}`, [0, 255, 0]);
                if (typeof soundManager !== 'undefined' && soundManager.playSound) {
                    soundManager.playSound('click');
                }
            }
            return true;
        }

        return false;
    }

    /**
     * Gets a display label for an entity (for targeting messages)
     * @param {Object} entity - The entity to get a label for
     * @returns {string} Display label
     */
    _getEntityLabel(entity) {
        if (!entity) return 'Target';
        if (entity.shipTypeName) return entity.shipTypeName;
        if (typeof entity.getDisplayName === 'function') return entity.getDisplayName();
        if (entity.maxRadius !== undefined) return 'Asteroid';
        return 'Target';
    }
} // End of UIManager Class