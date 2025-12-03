// ****** uiManager.js ******

// Constants for space object trading prices - relative to station prices
// Space objects sell produced goods CHEAPER than station buy price (profitable to buy here, sell at station)
const SPACE_OBJECT_PRODUCE_DISCOUNT = 0.60;  // 60% of station buy price
// Space objects buy demanded goods at HIGHER price than station sell price (profitable to buy at station, sell here)
const SPACE_OBJECT_DEMAND_PREMIUM = 1.50;  // 150% of station sell price

// Note: STANDARD_PANEL_BG is now defined in uiComponents.js

class UIManager {
    constructor() {
        // --- Instantiate UI Modules ---
        this.hud = new UIHUD();
        this.minimap = new UIMinimap();
        this.market = new UIMarket();
        this.stationMenus = new UIStationMenus();
        this.missions = new UIMissions();
        this.galaxyMap = new UIGalaxyMap();
        this.factionRecruitment = new UIFactionRecruitment();
        
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
        UIComponents.setTextStyle(options);
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

    /**
     * Draws a semi-transparent section background box - delegates to UIComponents.
     * @private
     */
    _drawSectionBG(x, y, w, h, fillColor = [0, 0, 0, 100], radius = 0) {
        UIComponents.drawSectionBG(x, y, w, h, fillColor, radius);
    }

    /**
     * Draws centered informational text - delegates to UIComponents.
     * @private
     */
    _drawCenteredInfo(message, x, y, style = {}) {
        UIComponents.drawCenteredInfo(message, x, y, style);
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
        UIComponents.drawPanelBG(x, y, w, h, fillCol, strokeCol);
        
        // Draw docked station or space object in the background
        const system = galaxy?.getCurrentSystem();
        UIComponents.drawDockedObjectBackground(x, y, w, h, {
            station: system?.station,
            spaceObject: gameStateManager?.currentDockedSpaceObject,
            currentState: gameStateManager?.currentState,
            returnFromRecordState: gameStateManager?._returnFromRecordState
        });
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
        return UIComponents.drawMenuButtonList(options, startY, pX, pW, btnW, btnH, btnSpacing, fillCol, strokeCol);
    }

    /**
     * Tracks a combat sound event that might be off-screen.
     * Called by SoundManager.
     * @param {number} x - World X coordinate of the sound event.
     * @param {number} y - World Y coordinate of the sound event.
     * @param {string} soundType - The type/name of the sound (e.g., "laser", "explosion").
     */
    trackCombatSound(x, y, soundType) {
        this.hud.trackCombatSound(x, y, soundType);
    }

    /**
     * Removes battle indicators that have exceeded their duration.
     */
    cleanupBattleIndicators() {
        this.hud.cleanupBattleIndicators();
    }

    /**
     * Draws battle indicators for off-screen events.
     * These appear as white lines at the screen edge.
     * @param {Player} player - The player object, needed for their position.
     */
    drawBattleIndicators(player) {
        this.hud.drawBattleIndicators(player);
    }



    /** Draws the Heads-Up Display (HUD) during flight - delegates to HUD module */
    drawHUD(player) {
        this.hud.drawHUD(player);
    }

    /** Draws the weapon selector UI - delegates to HUD module */
    drawWeaponSelector(player) {
        this.hud.drawWeaponSelector(player);
    }

    /** Draws an information overlay for the currently targeted ship - delegates to HUD module */
    drawTargetOverlay(player) {
        this.hud.drawTargetOverlay(player);
    }

    /** Draws the Main Station Menu (when state is DOCKED) */
    drawStationMainMenu(station, player) {
        this._initButtonAreas(['stationMenuButtonAreas']);
        if (!station || !player) { console.warn("drawStationMainMenu missing station or player"); return; }
        
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [100, 100, 255]);
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
     * Draws the Space Object Market screen - delegated to market module
     * @param {SpaceObject} spaceObject - The space object the player is trading with
     * @param {Player} player - The player object
     */
    drawSpaceObjectMarket(spaceObject, player) {
        this.market.drawSpaceObjectMarket(spaceObject, player, this);
    }

    /** Draws the Repairs Menu - delegated to stationMenus module */
    drawRepairsMenu(player) {
        this.stationMenus.drawRepairsMenu(player, this);
    }

    /** 
     * Draws the Space Object Repairs Menu - delegated to stationMenus module
     * @param {SpaceObject} spaceObject - The space object the player is docked at
     * @param {Player} player - The player object
     */
    drawSpaceObjectRepairsMenu(spaceObject, player) {
        this.stationMenus.drawSpaceObjectRepairsMenu(spaceObject, player, this);
    }

    /** Draws the Police Menu - delegated to stationMenus module */
    drawPoliceMenu(player) {
        this.stationMenus.drawPoliceMenu(player, this);
    }

    /** Draws the Commodity Market screen - delegated to market module */
    drawMarketScreen(market, player) {
        this.market.drawStationMarket(market, player, this);
    }

    /** Draws the Mission Board screen - delegated to missions module */
    drawMissionBoard(missions, selectedIndex, player) {
        if (!player) { console.warn("drawMissionBoard missing player"); return; }
        
        const currentSystem = galaxy?.getCurrentSystem();
        const currentStation = currentSystem?.station;
        const panelRect = this.getPanelRect();
        
        push();
        this.drawPanelBG(STANDARD_PANEL_BG, [100, 255, 100]);
        const headerHeight = this.drawStationHeader("Mission Board", currentStation, player, currentSystem);
        
        // Sync inactive mission IDs to the missions module
        this.missions.inactiveMissionIds = this.inactiveMissionIds;
        
        // Delegate rendering
        this.missions.drawMissionBoard(missions, selectedIndex, player, panelRect, headerHeight, currentSystem, currentStation);
        
        // Sync button areas back from the module
        this.missionListButtonAreas = this.missions.missionListButtonAreas;
        this.missionDetailButtonAreas = this.missions.missionDetailButtonAreas;
        pop();
    }

    /** Draws the Galaxy Map screen - delegated to galaxyMap module */
    drawGalaxyMap(galaxy, player) {
        if (!galaxy || !player) { console.warn("drawGalaxyMap missing galaxy or player"); return; }
        
        // Sync locked destination to the module
        this.galaxyMap.lockedDestinationIndex = this.lockedDestinationIndex;
        this.galaxyMap.marketOverlaySystemIndex = this.marketOverlaySystemIndex;
        
        // Delegate rendering
        this.galaxyMap.drawGalaxyMap(galaxy, player, isPlayerInJumpZone);
        
        // Sync state back from the module
        this.galaxyMapNodeAreas = this.galaxyMap.galaxyMapNodeAreas;
        this.galaxyMapMarketButtonAreas = this.galaxyMap.galaxyMapMarketButtonAreas;
        this.lockedDestinationIndex = this.galaxyMap.lockedDestinationIndex;
        this.marketOverlaySystemIndex = this.galaxyMap.marketOverlaySystemIndex;
        this.marketOverlayArea = this.galaxyMap.marketOverlayArea;
    }

    /** Handles clicks on the galaxy map - delegates to galaxyMap module */
    handleGalaxyMapClicks(mouseX, mouseY, galaxy, player, gameStateManager) {
        if (!galaxy || !player) return false;
        
        // Sync state to module
        this.galaxyMap.lockedDestinationIndex = this.lockedDestinationIndex;
        this.galaxyMap.marketOverlaySystemIndex = this.marketOverlaySystemIndex;
        this.galaxyMap.galaxyMapNodeAreas = this.galaxyMapNodeAreas;
        this.galaxyMap.galaxyMapMarketButtonAreas = this.galaxyMapMarketButtonAreas;
        this.galaxyMap.marketOverlayArea = this.marketOverlayArea;
        
        // Delegate click handling
        const handled = this.galaxyMap.handleGalaxyMapClicks(
            mouseX, mouseY, galaxy, player,
            (msg, col) => this.addMessage(msg, color(...col))
        );
        
        // Sync state back from module
        this.lockedDestinationIndex = this.galaxyMap.lockedDestinationIndex;
        this.marketOverlaySystemIndex = this.galaxyMap.marketOverlaySystemIndex;
        
        return handled;
    }

    /** Draws the Game Over overlay screen - delegates to HUD module */
    drawGameOverScreen() {
        this.hud.drawGameOverScreen();
    }

    /** Draws the minimap - delegates to minimap module */
    drawMinimap(player, system) {
        this.minimap.draw(player, system, this);
    }
    
    /** Draws the current framerate in the bottom left corner with averaging - delegates to HUD module */
    drawFramerate() {
        // Update FPS tracking
        const currentFps = frameRate();
        this.fpsValues.push(currentFps);
        while (this.fpsValues.length > this.fpsMaxSamples) {
            this.fpsValues.shift();
        }
        this.fpsFrameCount++;
        if (this.fpsFrameCount >= this.fpsUpdateInterval) {
            const sum = this.fpsValues.reduce((total, fps) => total + fps, 0);
            this.fpsAverage = Math.round(sum / this.fpsValues.length);
            this.fpsFrameCount = 0;
        }
        
        this.hud.drawFramerate(this.fpsAverage);
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
                
                // Delegate to market module for space object trading
                return this.market.handleSpaceObjectTrade(btn, player, {
                    locationName: displayName,
                    systemName: systemName
                }, this.hud);
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
            return this.stationMenus.handleShipyardClick(mx, my, player, (msg, col) => this.addMessage(msg, col));
        }
        // --- VIEWING_UPGRADES State ---
        else if (currentState === "VIEWING_UPGRADES") {
            const result = this.stationMenus.handleUpgradesClick(mx, my, player, (msg, col) => this.addMessage(msg, col));
            // Sync selectedWeaponSlot back from module
            this.selectedWeaponSlot = this.stationMenus.selectedWeaponSlot;
            return result;
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
            return this.stationMenus.handlePoliceClick(
                mx, my, player,
                (msg, col) => this.addMessage(msg, col),
                (p, amt) => this._processFinePayment(p, amt)
            );
        }

        // --- VIEWING_PROTECTION State ---
        else if (currentState === "VIEWING_PROTECTION") {
            return this.stationMenus.handleProtectionClick(mx, my, player, (msg, col) => this.addMessage(msg, col));
        }

        // --- VIEWING_IMPERIAL_RECRUITMENT, VIEWING_SEPARATIST_RECRUITMENT, VIEWING_MILITARY_RECRUITMENT States ---
        else if (currentState === "VIEWING_IMPERIAL_RECRUITMENT" ||
                 currentState === "VIEWING_SEPARATIST_RECRUITMENT" ||
                 currentState === "VIEWING_MILITARY_RECRUITMENT") {
            return this._handleRecruitmentClicks(mx, my, player, gameStateManager);
        }
        
        // --- VIEWING_STORAGE State ---
        else if (currentState === "VIEWING_STORAGE") {
            return this.stationMenus.handleStorageClick(mx, my, player, currentStation, (msg, col) => this.addMessage(msg, col));
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
     * Shared helper for handling repair button clicks - delegates to stationMenus module.
     * @param {number} mx - Mouse X coordinate
     * @param {number} my - Mouse Y coordinate
     * @param {Player} player - The player object
     * @param {Object} fullButtonArea - Button area for full repair
     * @param {Object} halfButtonArea - Button area for 50% repair
     * @param {Object} bodyguardsButtonArea - Button area for bodyguard repairs
     * @returns {boolean} - True if a repair action was handled
     */
    _handleRepairClick(mx, my, player, fullButtonArea, halfButtonArea, bodyguardsButtonArea) {
        return this.stationMenus.handleRepairClick(mx, my, player, fullButtonArea, halfButtonArea, bodyguardsButtonArea, (msg, color) => this.addMessage(msg, color));
    }

    /** Draws the Shipyard Menu - delegated to stationMenus module */
    drawShipyardMenu(player) {
        if (!player) return;
        
        push();
        const panelRect = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [220, 190, 90]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Shipyard", station, player, system);
        
        // Sync scroll state to module
        this.stationMenus.shipyardScrollOffset = this.shipyardScrollOffset;
        
        // Delegate rendering
        this.stationMenus.drawShipyardMenu(player, panelRect, headerHeight, system);
        
        // Sync state back from module
        this.shipyardListAreas = this.stationMenus.shipyardListAreas;
        this.shipyardDetailButtons = this.stationMenus.shipyardDetailButtons;
        this.shipyardScrollMax = this.stationMenus.shipyardScrollMax;
        this.shipyardScrollOffset = this.stationMenus.shipyardScrollOffset;
        this.shipyardScrollbarArea = this.stationMenus.shipyardScrollbarArea;
        pop();
    }

    /** Draws the Upgrades Menu - delegated to stationMenus module */
    drawUpgradesMenu(player) {
        if (!player) return;
        
        push();
        const panelRect = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [200, 100, 255]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Upgrades", station, player, system);
        
        // Sync scroll state to module
        this.stationMenus.upgradeScrollOffset = this.upgradeScrollOffset;
        this.stationMenus.selectedWeaponSlot = this.selectedWeaponSlot;
        
        // Delegate rendering
        this.stationMenus.drawUpgradesMenu(player, panelRect, headerHeight, system);
        
        // Sync state back from module
        this.upgradeListAreas = this.stationMenus.upgradeListAreas;
        this.upgradeDetailButtons = this.stationMenus.upgradeDetailButtons;
        this.upgradeScrollMax = this.stationMenus.upgradeScrollMax;
        this.upgradeScrollOffset = this.stationMenus.upgradeScrollOffset;
        this.upgradeScrollbarArea = this.stationMenus.upgradeScrollbarArea;
        this.weaponSlotButtons = this.stationMenus.weaponSlotButtons;
        this.selectedWeaponSlot = this.stationMenus.selectedWeaponSlot;
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

    // Add a message to the queue - delegates to HUD module
    addMessage(msg, color = [200, 200, 200], duration = this.messageDisplayTime) {
        this.hud.addMessage(msg, color, duration);
    }

    addCommunicationMessage(msg, color = [255, 190, 140], duration = this.communicationDisplayTime) {
        this.hud.addCommunicationMessage(msg, color, duration);
    }

    // Draw messages at the bottom of the screen - delegates to HUD module
    drawMessages() {
        this.hud.drawMessages();
    }

    /** Handles market mouse press - delegates to market module */
    handleMarketMousePress(mx, my, market, player) {
        return this.market.handleMousePress(mx, my, market, player);
    }

    /** Handles market mouse release - delegates to market module */
    handleMarketMouseRelease() {
        return this.market.handleMouseRelease();
    }

    /** Checks for held market buttons - delegates to market module */
    checkMarketButtonHeld(market, player) {
        this.market.checkButtonHeld(market, player);
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
        return UIComponents.drawButton(x, y, w, h, label, fillCol, strokeCol, radius, extra);
    }

    /**
     * Helper to setup common menu screen structure: push, panelRect, panelBG, system refs
     * @param {Object} config - Configuration object
     * @param {Array} config.borderColor - RGB array for panel border
     * @param {string} [config.headerTitle] - Optional header title
     * @param {Object} [config.station] - Optional station for header
     * @param {Object} [config.spaceObject] - Optional space object for header
     * @param {Object} config.player - Player object for header
     * @returns {Object} {pX, pY, pW, pH, system, headerHeight}
     */
    _setupStandardMenu(config) {
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, config.borderColor);
        const system = galaxy?.getCurrentSystem();
        
        let headerHeight = 0;
        if (config.headerTitle && config.station) {
            headerHeight = this.drawStationHeader(config.headerTitle, config.station, config.player, system);
        } else if (config.headerTitle && config.spaceObject) {
            headerHeight = this.drawSpaceObjectHeader(config.headerTitle, config.spaceObject, config.player, system);
        }
        
        return {pX, pY, pW, pH, system, headerHeight};
    }

    /**
     * Draws alternating row background for table-like displays - delegates to UIComponents.
     */
    _drawAlternatingRow(index, x, y, w, h) {
        UIComponents.drawAlternatingRow(index, x, y, w, h);
    }

    /**
     * Draws button label text with standard centered styling - delegates to UIComponents.
     */
    _drawButtonLabel(label, x, y, w, h, fillColor = 255, size = 20) {
        UIComponents.drawButtonLabel(label, x, y, w, h, fillColor, size);
    }

    /**
     * Gets the fill color for stock quantity based on availability - delegates to UIComponents.
     */
    _getStockColor(stockQty, outOfStock = false) {
        return UIComponents.getStockColor(stockQty, outOfStock);
    }

    /**
     * Draws a standard centered back button at the bottom of a panel.
     * Uses standard back button styling (blue background) - delegates to UIComponents.
     * @param {Object} [extra={}] - Extra properties to attach to the area object
     * @returns {Object} Area object for the back button
     */
    _drawCenteredBackButton(extra = {}) {
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        return UIComponents.drawCenteredBackButton(pX, pY, pW, pH, extra);
    }

    /**
     * Returns the appropriate fill color for a price deviation - delegates to UIComponents.
     */
    _getPriceDeviationColor(deviation, isSellPrice = false) {
        return UIComponents.getPriceDeviationColor(deviation, isSellPrice);
    }

    /**
     * Draws a price indicator bar for market displays - delegates to UIComponents.
     */
    _drawPriceIndicator(x, y, rowH, deviation, isSellPrice = false, maxDeviation = 0.8) {
        UIComponents.drawPriceIndicator(x, y, rowH, deviation, isSellPrice, maxDeviation);
    }

    /**
     * Draws a single commodity row for market screens - delegates to UIComponents.
     * @param {Object} config - Row configuration (see UIComponents.drawMarketRow)
     * @returns {Array} Array of button area objects for this row
     */
    _drawMarketRow(config) {
        return UIComponents.drawMarketRow(config);
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
        return UIComponents.drawStandardHeader({
            title, locationName, systemName, economyType, techLevel, securityLevel, player,
            panelX: pX, panelY: pY, panelW: pW
        });
    }

    /**
     * Draws a market button (Buy/Sell) with proper styling - delegates to UIComponents.
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
        return UIComponents.drawMarketButton(x, y, w, h, label, enabled, isBuy, disabledReason);
    }

    /**
     * Draws a scrollbar - delegates to UIComponents.
     * @param {number} x - X position of panel right edge
     * @param {number} y - Y position
     * @param {number} h - Height
     * @param {number} scrollOffset - Current scroll offset
     * @param {number} scrollMax - Maximum scroll offset
     * @param {number} visibleItems - Number of visible items
     * @param {number} totalItems - Total number of items
     * @param {Array} [bgColor] - Background color
     * @param {Array} [strokeColor] - Border color
     * @returns {Object|null} Area object or null
     */
    _drawScrollbar(x, y, h, scrollOffset, scrollMax, visibleItems, totalItems, bgColor = [60, 60, 100], strokeColor = [150, 150, 200]) {
        return UIComponents.drawScrollbar(x, y, h, scrollOffset, scrollMax, visibleItems, totalItems, bgColor, strokeColor);
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

    /** Draws the Protection Services menu - delegated to stationMenus module */
    drawProtectionServicesMenu(player) {
        if (!player) return;
        
        push();
        const panelRect = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [80, 120, 180]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Protection Services", station, player, system);
        
        // Delegate rendering
        this.stationMenus.drawProtectionServicesMenu(player, panelRect, headerHeight);
        
        // Sync button areas back
        this.protectionServicesButtons = this.stationMenus.protectionServicesButtons;
        pop();
    }

    /** Draws the Storage Locker menu - delegated to stationMenus module */
    drawStorageMenu(station, player) {
        if (!player) return;
        
        const activeStation = station || player?.currentSystem?.station || null;
        
        push();
        const panelRect = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [100, 150, 255]);
        
        if (!activeStation) {
            textFont(font);
            fill(220);
            textSize(22);
            textAlign(CENTER, CENTER);
            text("No storage services are available in this location.", panelRect.x + panelRect.w/2, panelRect.y + panelRect.h/2 - 20);
            const backBtn = this._drawCenteredBackButton();
            backBtn.action = "BACK";
            this.storageButtonAreas = [backBtn];
            pop();
            return;
        }
        
        // Ensure storage array exists
        if (!Array.isArray(activeStation.storage)) {
            activeStation.storage = [];
        }
        
        const system = galaxy?.getCurrentSystem();
        const headerHeight = this.drawStationHeader("Storage Locker", activeStation, player, system);
        
        // Delegate rendering
        this.stationMenus.drawStorageMenu(activeStation, player, panelRect, headerHeight);
        
        // Sync button areas back
        this.storageButtonAreas = this.stationMenus.storageButtonAreas;
        pop();
    }

    /** Draws the Personal Record menu - delegated to stationMenus module */
    drawPersonalRecordMenu(player) {
        if (!player) return;
        
        push();
        const panelRect = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [100, 150, 255]);
        
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        
        // Use appropriate header based on dock state
        let headerHeight;
        if (gameStateManager?._returnFromRecordState === "DOCKED_SPACE_OBJECT" && gameStateManager?.currentDockedSpaceObject) {
            headerHeight = this.drawSpaceObjectHeader("Personal Record", gameStateManager.currentDockedSpaceObject, player, system);
        } else {
            headerHeight = this.drawStationHeader("Personal Record", station, player, system);
        }
        
        // Sync scroll state to module
        this.stationMenus.recordScrollOffset = this.recordScrollOffset;
        
        // Delegate rendering
        this.stationMenus.drawPersonalRecordMenu(player, panelRect, headerHeight, galaxy);
        
        // Sync state back
        this.recordButtonAreas = this.stationMenus.recordButtonAreas;
        this.recordScrollMax = this.stationMenus.recordScrollMax;
        this.recordScrollOffset = this.stationMenus.recordScrollOffset;
        pop();
    }

    /** Draws the Imperial Navy Recruitment Menu - delegated to factionRecruitment module */
    drawImperialRecruitmentMenu(player) {
        push();
        const panelRect = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [120, 100, 50]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Imperial Navy", station, player, system);
        
        this.factionRecruitment.drawImperialRecruitmentMenu(player, panelRect, headerHeight, system, this);
        
        // Sync button areas - factionRecruitmentButtonAreas is the common array for all factions
        this.factionRecruitmentButtonAreas = this.factionRecruitment.factionRecruitmentButtonAreas;
        pop();
    }

    /** Draws the Separatist Forces Recruitment Menu - delegated to factionRecruitment module */
    drawSeparatistRecruitmentMenu(player) {
        push();
        const panelRect = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [100, 50, 0]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Separatist Forces", station, player, system);
        
        this.factionRecruitment.drawSeparatistRecruitmentMenu(player, panelRect, headerHeight, system, this);
        
        // Sync button areas - factionRecruitmentButtonAreas is the common array for all factions
        this.factionRecruitmentButtonAreas = this.factionRecruitment.factionRecruitmentButtonAreas;
        pop();
    }

    /** Draws the Military Academy Recruitment Menu - delegated to factionRecruitment module */
    drawMilitaryRecruitmentMenu(player) {
        push();
        const panelRect = this.getPanelRect();
        this.drawPanelBG(STANDARD_PANEL_BG, [50, 60, 70]);
        const system = galaxy?.getCurrentSystem();
        const station = system?.station;
        const headerHeight = this.drawStationHeader("Military Forces", station, player, system);
        
        this.factionRecruitment.drawMilitaryRecruitmentMenu(player, panelRect, headerHeight, system, this);
        
        // Sync button areas - factionRecruitmentButtonAreas is the common array for all factions
        this.factionRecruitmentButtonAreas = this.factionRecruitment.factionRecruitmentButtonAreas;
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

    /**
     * Cycles the minimap zoom level - delegates to minimap module.
     * @param {number} direction - 1 for zoom out, -1 for zoom in
     */
    _cycleMinimapZoom(direction) {
        this.minimap.cycleZoom(direction);
        // Sync back to UIManager for backward compatibility
        this.minimapZoomIndex = this.minimap.zoomIndex;
        this.minimapWorldViewRange = this.minimap.worldViewRange;
        this.minimapScale = this.minimapSize / this.minimapWorldViewRange;
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
     * Handles minimap click for target locking - delegates to minimap module.
     * @param {number} mx - Mouse X position in screen coordinates
     * @param {number} my - Mouse Y position in screen coordinates
     * @param {Player} player - The player object
     * @param {StarSystem} system - The current star system
     * @returns {boolean} True if an entity was found and targeted, false otherwise
     */
    handleMinimapClick(mx, my, player, system) {
        return this.minimap.handleClick(mx, my, player, system, this.hud);
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