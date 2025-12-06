// ****** gameStateManager.js ******

/**
 * Checks if the player is within the designated jump zone of the given system.
 * Uses distance squared for performance optimization.
 * @param {Player} playerObj - The player object
 * @param {StarSystem} systemObj - The system object
 * @returns {boolean} True if the player is in the jump zone, false otherwise
 */
function isPlayerInJumpZone(playerObj, systemObj) {
    if (!playerObj?.pos) {
        console.log("Jump zone check failed: Invalid player position");
        return false;
    }
    if (!systemObj?.jumpZoneCenter) {
        console.log("Jump zone check failed: Invalid jump zone center");
        return false;
    }
    if (!(systemObj.jumpZoneRadius > 0)) {
        console.log(`Jump zone check failed: Invalid radius: ${systemObj.jumpZoneRadius}`);
        return false;
    }

    const distanceSq = (playerObj.pos.x - systemObj.jumpZoneCenter.x) ** 2 + 
                       (playerObj.pos.y - systemObj.jumpZoneCenter.y) ** 2;
    const radiusSq = systemObj.jumpZoneRadius ** 2;
    
    return distanceSq <= radiusSq;
}

/**
 * List of game states where the player is at a station or in station menus.
 * Used for transition logic and state validation.
 * @constant {string[]}
 */
const STATION_STATES = [
    "DOCKED", 
    "VIEWING_MARKET", 
    "VIEWING_MISSIONS", 
    "VIEWING_SHIPYARD", 
    "VIEWING_UPGRADES", 
    "VIEWING_REPAIRS", 
    "VIEWING_SERVICES", 
    "VIEWING_PROTECTION", 
    "VIEWING_POLICE", 
    "VIEWING_IMPERIAL_RECRUITMENT", 
    "VIEWING_SEPARATIST_RECRUITMENT", 
    "VIEWING_MILITARY_RECRUITMENT", 
    "VIEWING_STORAGE", 
    "VIEWING_RECORD", 
    "DOCKED_SPACE_OBJECT", 
    "VIEWING_SPACE_OBJECT_MARKET", 
    "VIEWING_SPACE_OBJECT_REPAIRS",
    "VIEWING_SPACE_OBJECT_SHIPYARD",
    "VIEWING_SPACE_OBJECT_UPGRADES"
];

class GameStateManager {
    /**
     * Manages the overall game state and transitions.
     * Handles fetching/caching missions for the UI.
     */
    constructor() {
        // State tracking
        this.currentState = "TITLE_SCREEN"; 
        this.previousState = null;
        
        // Jump mechanics
        this.jumpTargetSystemIndex = -1;
        this.jumpChargeDuration = 4.0; // seconds (increased from 1.5 for better gameplay)
        this.jumpChargeTimer = 0;
        this.isJumpCharging = false;
        this.jumpFadeState = "NONE"; // NONE, FADE_OUT, WHITE_HOLD, FADE_IN
        this.jumpFadeOpacity = 0;
        this.jumpWhiteHoldTime = 1.0; // seconds
        this.jumpJustCompleted = false;
        
        // UI flags
        this.showingInventory = false;
        
        // Post-load transition (used when waiting for planet buffers)
        this.postLoadFadeState = "NONE"; // NONE, FADE_OUT, FADE_IN
        this.postLoadFadeOpacity = 0;
        this.postLoadFadeTarget = null;
        this.postLoadFadeOutMs = 900; // fade-out duration in ms
        this.postLoadFadeInMs = 700;  // fade-in duration in ms
        this.pendingPostLoadState = null;
    }
    
    /**
     * Updates ambient sound manager docked state based on current game state
     * @param {string} newState - The new game state
     * @private
     */
    _updateAmbientSoundState(newState) {
        try {
            const isDocked = STATION_STATES.includes(newState);

            if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
                ambientSoundManager.setDockedState(isDocked);
            }

            if (typeof soundManager !== 'undefined' && soundManager?.setDockedState) {
                soundManager.setDockedState(isDocked);
            }
        } catch (e) {
            console.warn('Error updating ambient sound docked state:', e);
        }
    }
    
    /**
     * Updates station music state based on current game state
     * @param {string} newState - The new game state
     * @param {string} prevState - The previous game state
     * @private
     */
    _updateStationMusic(newState, prevState) {
        try {
            if (typeof stationMusicManager === 'undefined' || !stationMusicManager) {
                return;
            }
            
            const isStationState = STATION_STATES.includes(newState);
            const wasStationState = STATION_STATES.includes(prevState);
            
            // Start music when entering a station state from non-station state
            if (isStationState && !wasStationState) {
                // Get station info for theming
                const system = galaxy?.getCurrentSystem?.();
                const station = system?.station;
                const stationInfo = {
                    stationType: station?.stationType || 'standard',
                    economyType: system?.economyType || 'standard',
                    techLevel: system?.techLevel || 5,
                    securityLevel: system?.securityLevel || 'medium'
                };
                stationMusicManager.start(stationInfo);
            }
            // Stop music when leaving station states
            else if (!isStationState && wasStationState) {
                // If we're specifically undocking back into IN_FLIGHT, use a slower fade
                if (newState === "IN_FLIGHT") {
                    try {
                        stationMusicManager.stop(3000); // 3s gentle fade after undock
                    } catch (e) {
                        // Fallback to default stop
                        stationMusicManager.stop();
                    }
                } else {
                    stationMusicManager.stop();
                }
            }
        } catch (e) {
            console.warn('Error updating station music state:', e);
        }
    }
    
    /**
     * Plays transition-specific sound effects when changing states
     * @param {string} newState - The new game state
     * @param {string} prevState - The previous game state
     * @private
     */
    _playTransitionSound(newState, prevState) {
        try {
            if (typeof soundManager === 'undefined' || typeof soundManager.playSound !== 'function') {
                return;
            }
            
            const isStationState = (state) => STATION_STATES.includes(state);
            const isMenuState = (state) => ["VIEWING_MARKET","VIEWING_MISSIONS","VIEWING_SHIPYARD",
                "VIEWING_UPGRADES","VIEWING_REPAIRS","VIEWING_PROTECTION","VIEWING_POLICE",
                "VIEWING_IMPERIAL_RECRUITMENT","VIEWING_SEPARATIST_RECRUITMENT",
                "VIEWING_MILITARY_RECRUITMENT","VIEWING_STORAGE","VIEWING_RECORD",
                "VIEWING_SPACE_OBJECT_MARKET","VIEWING_SPACE_OBJECT_REPAIRS",
                "VIEWING_SPACE_OBJECT_SHIPYARD","VIEWING_SPACE_OBJECT_UPGRADES"].includes(state);
            
            // Docking transitions
            if (newState === "DOCKED" && prevState === "IN_FLIGHT") {
                soundManager.playSound('dockSuccess');
            } else if (newState === "DOCKED_SPACE_OBJECT" && prevState === "IN_FLIGHT") {
                soundManager.playSound('dockSuccess');
            }
            // Undocking transitions
            else if (newState === "IN_FLIGHT" && isStationState(prevState)) {
                soundManager.playSound('undock');
            }
            // Menu navigation
            else if (isMenuState(newState)) {
                soundManager.playSound('uiTransition');
            }
            // Galaxy map
            else if (newState === "GALAXY_MAP" && prevState !== "GALAXY_MAP") {
                soundManager.playSound('mapOpen');
            } else if (prevState === "GALAXY_MAP" && newState !== "GALAXY_MAP") {
                soundManager.playSound('mapClose');
            }
            // Station menu navigation
            else if ((newState === "DOCKED" || newState === "DOCKED_SPACE_OBJECT") && isStationState(prevState)) {
                soundManager.playSound('uiTransition');
            }
            // Game over
            else if (newState === "GAME_OVER") {
                soundManager.playSound('gameOver');
            }
        } catch (e) {
            // Ignore audio errors - non-critical
        }
    }
    
    /**
     * Handles undocking position offset and related cleanup
     * @param {string} prevState - The previous game state
     * @private
     */
    _handleUndocking(prevState) {
        GS_LOG("Undocking! Applying position offset.");
        
        if (!player) {
            console.error("Player object missing during undock offset!");
            return;
        }
        
        // Clear docked invulnerability - player can be targeted again
        player.isDockedAndInvulnerable = false;
        
        // Check if undocking from a space object
        if (prevState === "DOCKED_SPACE_OBJECT" && this.currentDockedSpaceObject) {
            this._undockFromSpaceObject();
        } else {
            this._undockFromStation();
        }
        
        // Clear session trade tracking when undocking
        if (typeof player.clearSessionTradeTracking === 'function') {
            player.clearSessionTradeTracking();
        }
    }
    
    /**
     * Handles undocking from a space object
     * @private
     */
    _undockFromSpaceObject() {
        const spaceObj = this.currentDockedSpaceObject;
        const dockRadius = spaceObj.dockingRadius ?? spaceObj.size ?? 80;
        const margin = Math.max(10, player.size * 1.5);
        const offsetDistance = dockRadius + margin;
        
        if (spaceObj.pos) {
            player.pos = spaceObj.pos.copy 
                ? spaceObj.pos.copy().add(createVector(0, -offsetDistance)) 
                : createVector(spaceObj.pos.x, spaceObj.pos.y - offsetDistance);
        } else {
            player.pos.add(createVector(0, -offsetDistance));
        }
        
        player.vel.mult(0);
        this.currentDockedSpaceObject = null;
    }
    
    /**
     * Handles undocking from a station
     * @private
     */
    _undockFromStation() {
        const dockedStation = this.currentDockedStation || galaxy?.getCurrentSystem()?.station;
        const dockRadius = dockedStation?.dockingRadius ?? dockedStation?.size ?? 160;
        const margin = Math.max(10, player.size * 1.5);
        const offsetDistance = dockRadius + margin;
        
        // Use docked station position as origin
        if (dockedStation && dockedStation.pos) {
            player.pos = dockedStation.pos.copy().add(createVector(0, -offsetDistance));
        } else {
            // Fallback: relative offset from current player.pos
            player.pos.add(createVector(0, -offsetDistance));
        }
        
        player.vel.mult(0);
        
        // Spawn any hired bodyguards when undocking
        if (player.activeBodyguards?.length > 0 && galaxy?.getCurrentSystem()) {
            console.log("Spawning bodyguards when undocking from station");
            player.spawnBodyguards(galaxy.getCurrentSystem());
        }
        
        // Clear recorded docked station after undocking
        this.currentDockedStation = null;
    }
    
    /**
     * Handles docking at a station
     * @param {string} prevState - The previous game state
     * @private
     */
    _handleDocking(prevState) {
        if (prevState !== "IN_FLIGHT") return;
        
        GS_LOG("Entering DOCKED state from IN_FLIGHT. Snapping player position.");
        const dockStation = galaxy?.getCurrentSystem()?.station;
        this.currentDockedStation = dockStation || null;
        
        if (player && dockStation?.pos) {
            player.pos = dockStation.pos.copy() || player.pos;
            player.vel.mult(0);
            // Mark player as docked and invulnerable so enemies stop targeting them
            player.isDockedAndInvulnerable = true;
        } else {
            console.error("Could not snap player to station - required objects missing.");
        }
        
        // Force all enemies in the system to drop the player as target
        try {
            const sys = galaxy?.getCurrentSystem();
            if (sys && Array.isArray(sys.enemies)) {
                for (const enemy of sys.enemies) {
                    if (enemy && enemy.target === player) {
                        enemy.target = null;
                        // Reset to default idle/patrol state
                        if (typeof enemy.changeState === 'function') {
                            const defaultState = (typeof enemy._getDefaultStateForRole === 'function') 
                                ? enemy._getDefaultStateForRole() 
                                : (typeof AI_STATE !== 'undefined' ? AI_STATE.IDLE : 'IDLE');
                            enemy.changeState(defaultState);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Error clearing enemy targets on dock:', e);
        }
    }
    
    /**
     * Handles docking at a space object
     * @param {string} prevState - The previous game state
     * @private
     */
    _handleSpaceObjectDocking(prevState) {
        if (prevState !== "IN_FLIGHT") return;
        
        GS_LOG("Entering DOCKED_SPACE_OBJECT state from IN_FLIGHT.");
        if (player && this.currentDockedSpaceObject?.pos) {
            player.vel.mult(0);
            // Mark player as docked and invulnerable
            player.isDockedAndInvulnerable = true;
            // Save game when docking at space object
            if (typeof saveGame === 'function') {
                try { 
                    saveGame(); 
                } catch (e) { 
                    console.warn("Failed to save on space object dock:", e); 
                }
            }
        }
        
        // Force all enemies to drop the player as target
        try {
            const sys = galaxy?.getCurrentSystem();
            if (sys && Array.isArray(sys.enemies)) {
                for (const enemy of sys.enemies) {
                    if (enemy && enemy.target === player) {
                        enemy.target = null;
                        if (typeof enemy.changeState === 'function') {
                            const defaultState = (typeof enemy._getDefaultStateForRole === 'function') 
                                ? enemy._getDefaultStateForRole() 
                                : (typeof AI_STATE !== 'undefined' ? AI_STATE.IDLE : 'IDLE');
                            enemy.changeState(defaultState);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Error clearing enemy targets on space object dock:', e);
        }
    }

    /**
     * Changes the current game state and handles specific transition logic.
     * @param {string} newState - The target state to transition to
     */
    setState(newState) {
        this.previousState = this.currentState;
        if (this.currentState === newState) return;

        // Check if planet buffers need to load before transitioning
        if (this._shouldDelayForPlanetBuffers(newState)) {
            return;
        }

        GS_LOG(`Changing state from ${this.previousState} to ${newState}`);
        this.currentState = newState;

        // Execute transition handlers
        this._updateAmbientSoundState(newState);
        this._updateStationMusic(newState, this.previousState);
        this._playTransitionSound(newState, this.previousState);
        this._handleSaveSelectionTransition(newState);
        this._resetStateSpecificData(newState);
        this._handlePositionTransitions(newState, this.previousState);
    }
    
    /**
     * Checks if state transition should be delayed for planet buffer loading
     * @param {string} newState - The target state
     * @returns {boolean} True if transition was delayed
     * @private
     */
    _shouldDelayForPlanetBuffers(newState) {
        try {
            if ((newState === "IN_FLIGHT" || newState === "DOCKED") && typeof window !== 'undefined') {
                const queuePending = Array.isArray(window._planetBufferCreationQueue) && 
                                   window._planetBufferCreationQueue.length > 0;
                const totalPending = window._planetBufferCreationTotal && 
                                   ((window._planetBufferCreationCompleted || 0) < window._planetBufferCreationTotal);
                                   
                if (queuePending || totalPending) {
                    GS_LOG(`Delaying transition to ${newState} until planet buffers finish`);
                    this.pendingPostLoadState = newState;
                    this.currentState = "LOADING";
                    return true;
                }
            }
        } catch (e) { /* non-fatal */ }
        return false;
    }
    
    /**
     * Handles save selection screen transitions
     * @param {string} newState - The new game state
     * @private
     */
    _handleSaveSelectionTransition(newState) {
        if (newState !== "SAVE_SELECTION") return;
        
        if (saveSelectionScreen && typeof saveSelectionScreen.loadSavedGamePreview === 'function') {
            saveSelectionScreen.loadSavedGamePreview();
            // Reset to "New Game" if save data is gone
            if (saveSelectionScreen.savedGameData === null && saveSelectionScreen.selectedSlot === 1) {
                saveSelectionScreen.selectedSlot = 0;
            }
        }
    }
    
    /**
     * Resets state-specific data during transitions
     * @param {string} newState - The new game state
     * @private
     */
    _resetStateSpecificData(newState) {
        // Reset jump state when leaving jump/map states
        if (newState !== "JUMPING" && newState !== "GALAXY_MAP") {
            this.jumpTargetSystemIndex = -1;
            this.jumpChargeTimer = 0;
        }
        
        // Reset mission board selection
        if (newState !== "VIEWING_MISSIONS" && this.previousState === "VIEWING_MISSIONS") {
            this.selectedMissionIndex = -1;
        }
        
        // Reset market selection
        if (newState !== "VIEWING_MARKET" && this.previousState === "VIEWING_MARKET") {
            this.selectedMarketItemIndex = -1;
        }
    }
    
    /**
     * Handles player position changes during state transitions
     * @param {string} newState - The new game state
     * @param {string} prevState - The previous game state
     * @private
     */
    _handlePositionTransitions(newState, prevState) {
        const isUndocking = newState === "IN_FLIGHT" && STATION_STATES.includes(prevState);
        const isDocking = newState === "DOCKED" && prevState === "IN_FLIGHT";
        const isSpaceObjectDocking = newState === "DOCKED_SPACE_OBJECT" && prevState === "IN_FLIGHT";
        const isInStation = newState === "DOCKED" || newState === "DOCKED_SPACE_OBJECT";
        const isInMenu = ["VIEWING_MARKET", "VIEWING_MISSIONS"].includes(newState);
        
        if (isUndocking) {
            this._handleUndocking(prevState);
        } else if (isDocking) {
            this._handleDocking(prevState);
        } else if (isSpaceObjectDocking) {
            this._handleSpaceObjectDocking(prevState);
        } else if (isInStation || isInMenu) {
            // Ensure player is stopped in these states
            if (player) {
                player.vel.set(0, 0);
            }
        }
    }


    /**
     * Updates game logic based on the current state. Called every frame.
     * @param {Player} player - Reference to the player object
     */
    update(player) {
        const currentSystem = this._getCurrentSystemIfNeeded();
        
        this._processPlanetBufferQueue();
        this._handlePendingPostLoadState();
        this._updatePostLoadFade();
        
        this._updateStateLogic(player, currentSystem);
    }
    
    /**
     * Gets current system only if the current state requires it
     * @returns {StarSystem|null} The current system or null
     * @private
     */
    _getCurrentSystemIfNeeded() {
        const statesExpectingSystem = [
            "IN_FLIGHT", "DOCKED", "VIEWING_MARKET", "VIEWING_MISSIONS", 
            "VIEWING_SHIPYARD", "VIEWING_UPGRADES", "VIEWING_REPAIRS", 
            "VIEWING_PROTECTION", "VIEWING_POLICE", "GALAXY_MAP", "JUMPING",
            "VIEWING_IMPERIAL_RECRUITMENT", "VIEWING_SEPARATIST_RECRUITMENT", 
            "VIEWING_MILITARY_RECRUITMENT", "DOCKED_SPACE_OBJECT", 
            "VIEWING_SPACE_OBJECT_MARKET", "VIEWING_SPACE_OBJECT_REPAIRS",
            "VIEWING_SPACE_OBJECT_SHIPYARD", "VIEWING_SPACE_OBJECT_UPGRADES"
        ];
        
        return statesExpectingSystem.includes(this.currentState) 
            ? galaxy?.getCurrentSystem() 
            : null;
    }
    
    /**
     * Processes deferred planet buffer creation queue
     * @private
     */
    _processPlanetBufferQueue() {
        try {
            if (typeof window === 'undefined' || 
                !Array.isArray(window._planetBufferCreationQueue) || 
                window._planetBufferCreationQueue.length === 0) {
                return;
            }
            
            const BATCH_PER_FRAME = 1; // Load one planet buffer per frame
            for (let i = 0; i < BATCH_PER_FRAME && window._planetBufferCreationQueue.length > 0; i++) {
                const task = window._planetBufferCreationQueue.shift();
                try {
                    if (task?.planet && 
                        typeof task.planet.createBuffers === 'function' && 
                        !task.planet.buffersCreated) {
                        task.planet.createBuffers();
                    }
                } catch (e) {
                    console.warn('Deferred planet.createBuffers error', e);
                }
                window._planetBufferCreationCompleted = (window._planetBufferCreationCompleted || 0) + 1;
            }
            
            if (window._planetBufferCreationQueue.length === 0) {
                console.log('Planet buffer creation queue finished');
            }
        } catch (e) {
            console.warn('Error processing planet buffer queue:', e);
        }
    }
    
    /**
     * Handles pending post-load state transitions
     * @private
     */
    _handlePendingPostLoadState() {
        try {
            if (!this.pendingPostLoadState || typeof window === 'undefined') return;
            
            const loadingComplete = (
                (!window._planetBufferCreationQueue || window._planetBufferCreationQueue.length === 0) &&
                (!window._planetBufferCreationTotal || 
                 (window._planetBufferCreationCompleted || 0) >= window._planetBufferCreationTotal)
            );
            
            if (loadingComplete) {
                const nextState = this.pendingPostLoadState;
                this.pendingPostLoadState = null;
                GS_LOG(`Planet buffers finished — initiating post-load transition to ${nextState}`);
                this.postLoadFadeTarget = nextState;
                this.postLoadFadeState = "FADE_OUT";
                this.postLoadFadeOpacity = 0;
            }
        } catch (e) { /* non-fatal */ }
    }
    
    /**
     * Updates post-load fade transition effects
     * @private
     */
    _updatePostLoadFade() {
        try {
            if (!this.postLoadFadeState || this.postLoadFadeState === "NONE") return;
            
            if (this.postLoadFadeState === "FADE_OUT") {
                const inc = (deltaTime || 16) / Math.max(1, this.postLoadFadeOutMs);
                this.postLoadFadeOpacity = Math.min(1, this.postLoadFadeOpacity + inc);
                
                if (this.postLoadFadeOpacity >= 1) {
                    this.postLoadFadeOpacity = 1;
                    const target = this.postLoadFadeTarget;
                    this.postLoadFadeTarget = null;
                    GS_LOG(`Post-load transition: FADE_OUT -> setState(${target})`);
                    this.setState(target);
                    this.postLoadFadeState = "FADE_IN";
                }
            } else if (this.postLoadFadeState === "FADE_IN") {
                const dec = (deltaTime || 16) / Math.max(1, this.postLoadFadeInMs);
                this.postLoadFadeOpacity = Math.max(0, this.postLoadFadeOpacity - dec);
                
                if (this.postLoadFadeOpacity <= 0) {
                    this.postLoadFadeOpacity = 0;
                    this.postLoadFadeState = "NONE";
                    GS_LOG("Post-load transition complete");
                }
            }
        } catch (e) { /* non-fatal */ }
    }
    
    /**
     * Dispatches update logic based on current state
     * @param {Player} player - The player object
     * @param {StarSystem} currentSystem - The current star system
     * @private
     */
    _updateStateLogic(player, currentSystem) {
        switch (this.currentState) {
            case "TITLE_SCREEN":
            case "INSTRUCTIONS":
                if (titleScreen) titleScreen.update(deltaTime);
                break;
                
            case "IN_FLIGHT":
                this._updateInFlight(player, currentSystem);
                break;
                
            case "GALAXY_MAP":
                this._updateGalaxyMap(player, currentSystem);
                break;
                
            case "JUMPING":
                this._updateJumping(player, currentSystem);
                break;
                
            case "SAVE_SELECTION":
                if (saveSelectionScreen) saveSelectionScreen.update(deltaTime);
                break;
                
            case "DOCKED":
            case "DOCKED_SPACE_OBJECT":
            case "VIEWING_SPACE_OBJECT_MARKET":
            case "VIEWING_SPACE_OBJECT_REPAIRS":
            case "VIEWING_SPACE_OBJECT_SHIPYARD":
            case "VIEWING_SPACE_OBJECT_UPGRADES":
            case "VIEWING_MARKET":
            case "VIEWING_MISSIONS":
            case "VIEWING_PROTECTION":
            case "VIEWING_POLICE":
            case "VIEWING_IMPERIAL_RECRUITMENT":
            case "VIEWING_SEPARATIST_RECRUITMENT":
            case "VIEWING_MILITARY_RECRUITMENT":
            case "VIEWING_STORAGE":
            case "VIEWING_RECORD":
                if (!player) break;
                try {
                    // Keep player completely stationary while docked
                    player.vel.set(0, 0);
                    
                    // Update station music
                    if (typeof stationMusicManager !== 'undefined' && stationMusicManager) {
                        stationMusicManager.update();
                    }
                    
                    // Run safe background simulation: NPCs move, spawn timers advance,
                    // but player takes NO damage and is not targeted.
                    // This uses updateWhileDocked() which skips player collision checks.
                    if (currentSystem && typeof currentSystem.updateWhileDocked === 'function') {
                        currentSystem.updateWhileDocked();
                    }
                    
                    // Update mission tracking (assassination target monitoring, etc.)
                    // but do NOT run full player.update() which could process damage/death
                    if (player.activeMission && typeof player.activeMission.update === 'function') {
                        try {
                            player.activeMission.update(currentSystem);
                        } catch (e) {
                            console.error('Error updating mission while docked:', e);
                        }
                    }
                } catch (e) {
                    console.error('Error in background simulation while docked:', e);
                }
                break;
                
            case "VIEWING_SHIPYARD":
            case "VIEWING_UPGRADES":
            case "VIEWING_REPAIRS":
            case "GAME_OVER":
            case "LOADING":
                // Update station music for shop screens
                if ((this.currentState === "VIEWING_SHIPYARD" || 
                     this.currentState === "VIEWING_UPGRADES" || 
                     this.currentState === "VIEWING_REPAIRS") && 
                    typeof stationMusicManager !== 'undefined' && stationMusicManager) {
                    stationMusicManager.update();
                }
                break;
                
            default:
                console.warn(`Unknown game state in update(): ${this.currentState}`);
                this.setState("IN_FLIGHT");
                break;
        }
    }
    
    /**
     * Updates IN_FLIGHT state logic
     * @param {Player} player - The player object
     * @param {StarSystem} currentSystem - The current star system
     * @private
     */
    _updateInFlight(player, currentSystem) {
        if (!player || !currentSystem) return;
        
        // If player is dying/destroyed: keep world updating but block player interactions
        if (player.isDying || player.destroyed) {
            try {
                player.update();
                currentSystem.update(player);
            } catch (e) {
                console.error("ERROR during IN_FLIGHT update (dying):", e);
            }
            return;
        }
        
        try {
            player.handleInput();
            player.update();
            currentSystem.update(player);
            
            this._checkDocking(player, currentSystem);
            this._checkAutoJump(player, currentSystem);
            this._checkJumpCompletion();
        } catch (e) {
            console.error(`ERROR during IN_FLIGHT update:`, e);
        }
    }
    
    /**
     * Checks for docking opportunities
     * @param {Player} player - The player object
     * @param {StarSystem} currentSystem - The current star system
     * @private
     */
    _checkDocking(player, currentSystem) {
        const station = currentSystem.station;
        let dockStation = null;
        
        // Check primary station
        if (station && player.canDock(station)) {
            dockStation = station;
        } 
        // Check secret stations
        else if (currentSystem.secretStations?.length > 0) {
            for (const s of currentSystem.secretStations) {
                if (!s || !s.discovered) continue;
                try {
                    if (player.canDock(s)) {
                        dockStation = s;
                        break;
                    }
                } catch (e) { /* ignore malformed station */ }
            }
            
            // Temporarily replace system.station with secret station
            if (dockStation && dockStation !== currentSystem.station) {
                currentSystem._previousStation = currentSystem.station;
                currentSystem.station = dockStation;
            }
        }
        
        if (dockStation) {
            this.setState("DOCKED");
            this._savegameOnDocking();
            return;
        }
        
        // Check dockable space objects
        if (Array.isArray(currentSystem.spaceObjects)) {
            for (const spaceObj of currentSystem.spaceObjects) {
                if (!spaceObj || spaceObj.destroyed) continue;
                if (spaceObj.isDockable && 
                    typeof spaceObj.canPlayerDock === 'function' && 
                    spaceObj.canPlayerDock(player)) {
                    this.currentDockedSpaceObject = spaceObj;
                    this.setState("DOCKED_SPACE_OBJECT");
                    // Save on space-object docking (e.g., underground market) just like stations
                    this._savegameOnDocking();
                    break;
                }
            }
        }
    }
    
    /**
     * Handles save game on docking with load suppression
     * @private
     */
    _savegameOnDocking() {
        try {
            const suppressWindowMs = 2000; // 2s window after load
            const lastLoad = (typeof window !== 'undefined') ? (window.__lastLoadTime || 0) : 0;
            const justLoaded = lastLoad && (Date.now() - lastLoad < suppressWindowMs);
            
            if (!justLoaded) {
                saveGame();
            } else {
                // Clear marker so subsequent saves aren't blocked
                if (typeof window !== 'undefined') window.__lastLoadTime = 0;
            }
        } catch (e) {
            // Fall back to saving on error
            try { saveGame(); } catch(_) {}
        }
    }
    
    /**
     * Checks for auto-jump trigger conditions
     * @param {Player} player - The player object
     * @param {StarSystem} currentSystem - The current star system
     * @private
     */
    _checkAutoJump(player, currentSystem) {
        if (!uiManager || uiManager.lockedDestinationIndex === -1) return;
        if (!isPlayerInJumpZone(player, currentSystem)) return;
        
        const lockedIdx = uiManager.lockedDestinationIndex;
        const reachable = currentSystem.connectedSystemIndices || [];
        
        if (reachable.includes(lockedIdx)) {
            GS_LOG(`Auto-jump triggered: Player in jump zone with locked destination ${lockedIdx}`);
            this.startJump(lockedIdx);
            uiManager.lockedDestinationIndex = -1;
        } else {
            GS_LOG(`Auto-jump aborted: Locked destination ${lockedIdx} not reachable. Clearing.`);
            uiManager.addMessage("Locked destination is not reachable. Cleared.", [255, 200, 100]);
            uiManager.lockedDestinationIndex = -1;
        }
    }
    
    /**
     * Shows jump completion message if flag is set
     * @private
     */
    _checkJumpCompletion() {
        if (!this.jumpJustCompleted) return;
        
        this.jumpJustCompleted = false;
        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage(`Jump complete. Welcome to ${player.currentSystem.name}`, [0, 200, 255]);
        }
    }
    
    /**
     * Updates GALAXY_MAP state logic
     * @param {Player} player - The player object
     * @param {StarSystem} currentSystem - The current star system
     * @private
     */
    _updateGalaxyMap(player, currentSystem) {
        if (!player || !currentSystem) return;
        
        try {
            player.update(); // Update position without input
            currentSystem.update(player); // Keep world updating
        } catch (e) {
            console.error("Error updating game during galaxy map view:", e);
        }
    }
    
    /**
     * Updates JUMPING state logic
     * @param {Player} player - The player object
     * @param {StarSystem} currentSystem - The current star system
     * @private
     */
    _updateJumping(player, currentSystem) {
        if (!galaxy || 
            this.jumpTargetSystemIndex < 0 || 
            this.jumpTargetSystemIndex >= galaxy.systems.length) {
            this.setState("IN_FLIGHT");
            return;
        }
        
        // Update jump charge timer
        this.jumpChargeTimer += deltaTime / 1000;
        
        // Continue updating player and system during jump charge
        if (player && currentSystem) {
            player.handleInput();
            player.update();
            currentSystem.update(player);
        }
        
        // Start fade sequence when charge completes
        if (this.jumpChargeTimer >= this.jumpChargeDuration && this.jumpFadeState === "NONE") {
            this.jumpFadeState = "FADE_OUT";
        }
        
        this._updateJumpFade();
    }
    
    /**
     * Updates jump fade state machine
     * @private
     */
    _updateJumpFade() {
        if (this.jumpFadeState === "FADE_OUT") {
            this.jumpFadeOpacity += 0.03;
            if (this.jumpFadeOpacity >= 1) {
                // Execute jump during full white
                galaxy.jumpToSystem(this.jumpTargetSystemIndex);
                player.currentSystem = galaxy?.getCurrentSystem();
                player.vel.mult(0.3);
                this.jumpChargeTimer = 0;
                this.isJumpCharging = false;
                this.jumpFadeState = "WHITE_HOLD";
            }
        } 
        else if (this.jumpFadeState === "WHITE_HOLD") {
            if (!this.jumpWhiteHoldTimer) this.jumpWhiteHoldTimer = 0;
            this.jumpWhiteHoldTimer += deltaTime / 1000;
            
            const loadingComplete = (
                typeof window !== 'undefined' && 
                (!window._planetBufferCreationQueue || window._planetBufferCreationQueue.length === 0) &&
                (!window._planetBufferCreationTotal || 
                 (window._planetBufferCreationCompleted || 0) >= window._planetBufferCreationTotal)
            );
            
            if (loadingComplete) {
                this.jumpFadeState = "FADE_IN";
                GS_LOG("Jump transition: WHITE_HOLD → FADE_IN");
            }
        } 
        else if (this.jumpFadeState === "FADE_IN") {
            this.jumpFadeOpacity -= 0.02 * (deltaTime / 16);
            
            if (this.jumpFadeOpacity <= 0) {
                this.jumpFadeOpacity = 0;
                this.jumpFadeState = "NONE";
                this.setState("IN_FLIGHT");
                this.jumpJustCompleted = true;
                GS_LOG("Jump transition complete: FADE_IN → IN_FLIGHT");
            }
        }
    }


    /**
     * Draws game visuals based on the current state. Called every frame.
     * @param {Player} player - Reference to the player object.
     */
    /**
     * Draws game visuals based on the current state. Called every frame.
     * @param {Player} player - Reference to the player object
     */
    draw(player) {
        const currentSystem = this._getCurrentSystemIfNeeded();
        
        // Restore temporarily swapped secret station
        this._restoreSecretStation();
        
        this._drawStateVisuals(player, currentSystem);
        this._drawInventoryOverlay(player);
        this._drawPostLoadFade();
        this._drawPlanetBufferProgress();
    }
    
    /**
     * Restores temporarily swapped secret station
     * @private
     */
    _restoreSecretStation() {
        try {
            const sys = galaxy?.getCurrentSystem();
            if (sys?._previousStation) {
                sys.station = sys._previousStation;
                delete sys._previousStation;
            }
        } catch (e) { /* ignore restore errors */ }
    }
    
    /**
     * Dispatches draw logic based on current state
     * @param {Player} player - The player object
     * @param {StarSystem} currentSystem - The current star system
     * @private
     */
    _drawStateVisuals(player, currentSystem) {
        switch (this.currentState) {
            case "IN_FLIGHT":
                this._drawInFlight(player, currentSystem);
                break;
                
            case "DOCKED":
                this._drawDocked(player, currentSystem);
                break;
                
            case "DOCKED_SPACE_OBJECT":
                this._drawDockedSpaceObject(player, currentSystem);
                break;
                
            case "VIEWING_SPACE_OBJECT_MARKET":
                this._drawSpaceObjectMarket(player, currentSystem);
                break;
                
            case "VIEWING_SPACE_OBJECT_REPAIRS":
                this._drawSpaceObjectRepairs(player, currentSystem);
                break;
                
            case "VIEWING_SPACE_OBJECT_SHIPYARD":
                this._drawSpaceObjectShipyard(player, currentSystem);
                break;
                
            case "VIEWING_SPACE_OBJECT_UPGRADES":
                this._drawSpaceObjectUpgrades(player, currentSystem);
                break;
                
            case "VIEWING_MARKET":
                this._drawMarket(player, currentSystem);
                break;
                
            case "VIEWING_MISSIONS":
                this._drawMissions(player, currentSystem);
                break;
                
            case "VIEWING_SHIPYARD":
            case "VIEWING_UPGRADES":
            case "VIEWING_REPAIRS":
            case "VIEWING_PROTECTION":
            case "VIEWING_POLICE":
            case "VIEWING_IMPERIAL_RECRUITMENT":
            case "VIEWING_SEPARATIST_RECRUITMENT":
            case "VIEWING_MILITARY_RECRUITMENT":
            case "VIEWING_STORAGE":
            case "VIEWING_RECORD":
                this._drawStationMenu(player, currentSystem);
                break;
                
            case "GALAXY_MAP":
                this._drawGalaxyMapView(player, currentSystem);
                break;
                
            case "JUMPING":
                this._drawJumping(player, currentSystem);
                break;
                
            case "TITLE_SCREEN":
                if (titleScreen) titleScreen.drawTitleScreen();
                break;
                
            case "INSTRUCTIONS":
                if (titleScreen) titleScreen.drawInstructionScreen();
                break;
                
            case "GAME_OVER":
                background(0, 150);
                if (uiManager) {
                    try { uiManager.drawGameOverScreen(); } catch(e) {}
                }
                break;
                
            case "LOADING":
                this._drawLoading();
                break;
                
            case "SAVE_SELECTION":
                if (saveSelectionScreen) saveSelectionScreen.draw();
                break;
                
            default:
                console.error(`Unknown game state in draw(): ${this.currentState}`);
                background(255,0,0);
                fill(0);
                textAlign(CENTER,CENTER);
                textSize(20);
                text(`Error: Unknown game state "${this.currentState}"`, width/2, height/2);
                break;
        }
    }
    
    /**
     * Draws background and entities for station-based states
     * @param {Player} player - The player object
     * @param {StarSystem} currentSystem - The current star system
     * @private
     */
    _drawStationBackground(player, currentSystem) {
        // Use the simple shared starfield to avoid progressive tile flicker while docked
        if (sharedStarfield?.draw) {
            try {
                sharedStarfield.draw();
            } catch(e) {
                console.error("Error drawing shared starfield for station background:", e);
            }
        } else if (currentSystem) {
            try {
                push();
                currentSystem.drawBackground();
                pop();
            } catch(e) {
                console.error("Error drawing station fallback background:", e);
            }
        } else {
            background(0);
        }

        if (currentSystem) {
            try {
                push();
                if (currentSystem.station) currentSystem.station.draw();
                pop();
            } catch(e) {
                console.error("Error drawing station background:", e);
            }
        }
        
        if (player) {
            try {
                player.draw();
            } catch(e) {}
        }
    }
    
    /**
     * Draws IN_FLIGHT state
     * @private
     */
    _drawInFlight(player, currentSystem) {
        if (currentSystem && player) {
            try {
                currentSystem.draw(player);
            } catch(e) {
                console.error("Error drawing system:", e);
            }
        }
        
        if (uiManager && player) {
            try {
                uiManager.drawHUD(player);
                if (currentSystem) {
                    uiManager.drawMinimap(player, currentSystem);
                }
            } catch(e) {}
        }
    }
    
    /**
     * Draws DOCKED state
     * @private
     */
    _drawDocked(player, currentSystem) {
        this._drawStationBackground(player, currentSystem);
        
        if (uiManager && currentSystem?.station && player) {
            try {
                uiManager.drawStationMainMenu(currentSystem.station, player);
            } catch(e) {
                console.error("Error drawing station main menu:", e);
            }
        }
    }
    
    /**
     * Draws DOCKED_SPACE_OBJECT state
     * @private
     */
    _drawDockedSpaceObject(player, currentSystem) {
        if (currentSystem) {
            try {
                push();
                currentSystem.drawBackground();
                if (this.currentDockedSpaceObject && 
                    typeof this.currentDockedSpaceObject.draw === 'function') {
                    this.currentDockedSpaceObject.draw();
                }
                pop();
            } catch(e) {
                console.error("Error drawing space object background:", e);
            }
        } else {
            background(0);
        }
        
        if (player) {
            try { player.draw(); } catch(e) {}
        }
        
        if (uiManager && this.currentDockedSpaceObject && player) {
            try {
                uiManager.drawSpaceObjectDockMenu(this.currentDockedSpaceObject, player);
            } catch(e) {
                console.error("Error drawing space object dock menu:", e);
            }
        }
    }
    
    /**
     * Draws VIEWING_SPACE_OBJECT_MARKET state
     * @private
     */
    _drawSpaceObjectMarket(player, currentSystem) {
        if (currentSystem) {
            try {
                push();
                currentSystem.drawBackground();
                if (currentSystem.station) currentSystem.station.draw();
                if (this.currentDockedSpaceObject && 
                    typeof this.currentDockedSpaceObject.draw === 'function') {
                    this.currentDockedSpaceObject.draw();
                }
                pop();
            } catch(e) {
                console.error("Error drawing space object background:", e);
            }
        } else {
            background(0);
        }
        
        if (player) {
            try { player.draw(); } catch(e) {}
        }
        
        if (uiManager && this.currentDockedSpaceObject && player) {
            try {
                uiManager.drawSpaceObjectMarket(this.currentDockedSpaceObject, player);
            } catch(e) {
                console.error("Error drawing space object market:", e);
            }
        } else {
            background(10,0,0);
            fill(255);
            text("Error: Space object not found", width/2, height/2);
        }
    }
    
    /**
     * Draws VIEWING_SPACE_OBJECT_REPAIRS state
     * @private
     */
    _drawSpaceObjectRepairs(player, currentSystem) {
        if (currentSystem) {
            try {
                push();
                currentSystem.drawBackground();
                if (currentSystem.station) currentSystem.station.draw();
                if (this.currentDockedSpaceObject && 
                    typeof this.currentDockedSpaceObject.draw === 'function') {
                    this.currentDockedSpaceObject.draw();
                }
                pop();
            } catch(e) {
                console.error("Error drawing space object background:", e);
            }
        } else {
            background(0);
        }
        
        if (player) {
            try { player.draw(); } catch(e) {}
        }
        
        if (uiManager && this.currentDockedSpaceObject && player) {
            try {
                uiManager.drawSpaceObjectRepairsMenu(this.currentDockedSpaceObject, player);
            } catch(e) {
                console.error("Error drawing space object repairs:", e);
            }
        } else {
            background(10,0,0);
            fill(255);
            text("Error: Space object not found", width/2, height/2);
        }
    }
    
    /**
     * Draws VIEWING_SPACE_OBJECT_SHIPYARD state
     * @private
     */
    _drawSpaceObjectShipyard(player, currentSystem) {
        if (currentSystem) {
            try {
                push();
                currentSystem.drawBackground();
                if (currentSystem.station) currentSystem.station.draw();
                if (this.currentDockedSpaceObject && 
                    typeof this.currentDockedSpaceObject.draw === 'function') {
                    this.currentDockedSpaceObject.draw();
                }
                pop();
            } catch(e) {
                console.error("Error drawing space object background:", e);
            }
        } else {
            background(0);
        }
        
        if (player) {
            try { player.draw(); } catch(e) {}
        }
        
        if (uiManager && player) {
            try {
                uiManager.drawShipyardMenu(player);
            } catch(e) {
                console.error("Error drawing space object shipyard:", e);
            }
        }
    }
    
    /**
     * Draws VIEWING_SPACE_OBJECT_UPGRADES state
     * @private
     */
    _drawSpaceObjectUpgrades(player, currentSystem) {
        if (currentSystem) {
            try {
                push();
                currentSystem.drawBackground();
                if (currentSystem.station) currentSystem.station.draw();
                if (this.currentDockedSpaceObject && 
                    typeof this.currentDockedSpaceObject.draw === 'function') {
                    this.currentDockedSpaceObject.draw();
                }
                pop();
            } catch(e) {
                console.error("Error drawing space object background:", e);
            }
        } else {
            background(0);
        }
        
        if (player) {
            try { player.draw(); } catch(e) {}
        }
        
        if (uiManager && player) {
            try {
                uiManager.drawUpgradesMenu(player);
            } catch(e) {
                console.error("Error drawing space object upgrades:", e);
            }
        }
    }
    
    /**
     * Draws VIEWING_MARKET state
     * @private
     */
    _drawMarket(player, currentSystem) {
        this._drawStationBackground(player, currentSystem);
        
        if (uiManager && currentSystem?.station?.market && player) {
            try {
                uiManager.drawMarketScreen(currentSystem.station.getMarket(), player);
            } catch(e) {
                console.error("Error drawing market screen:", e);
            }
        } else {
            background(10,0,0);
            fill(255);
            text("Error: Market data unavailable", width/2, height/2);
        }
    }
    
    /**
     * Draws VIEWING_MISSIONS state
     * @private
     */
    _drawMissions(player, currentSystem) {
        // Fetch missions if not already fetched
        if (!this.currentStationMissions || this.currentStationMissions.length === 0) {
            const currentStation = currentSystem?.station;
            if (currentSystem && typeof currentSystem.getAvailableMissions === 'function') {
                this.currentStationMissions = currentSystem.getAvailableMissions(galaxy, player) || [];
            } else {
                this.currentStationMissions = MissionGenerator.generateMissions(
                    currentSystem, currentStation, galaxy, player
                );
            }
        }
        
        this._drawStationBackground(player, currentSystem);
        
        if (uiManager && currentSystem?.station && player) {
            uiManager.drawMissionBoard(
                this.currentStationMissions, 
                this.selectedMissionIndex, 
                player
            );
        }
    }
    
    /**
     * Draws station menu states (shipyard, upgrades, repairs, protection, etc.)
     * @private
     */
    _drawStationMenu(player, currentSystem) {
        this._drawStationBackground(player, currentSystem);
        
        if (!uiManager || !player) return;
        
        try {
            switch (this.currentState) {
                case "VIEWING_SHIPYARD":
                    uiManager.drawShipyardMenu(player);
                    break;
                case "VIEWING_UPGRADES":
                    uiManager.drawUpgradesMenu(player);
                    break;
                case "VIEWING_REPAIRS":
                    uiManager.drawRepairsMenu(player);
                    break;
                case "VIEWING_PROTECTION":
                    uiManager.drawProtectionServicesMenu(player);
                    break;
                case "VIEWING_POLICE":
                    uiManager.drawPoliceMenu(player);
                    break;
                case "VIEWING_IMPERIAL_RECRUITMENT":
                    uiManager.drawImperialRecruitmentMenu(player);
                    break;
                case "VIEWING_SEPARATIST_RECRUITMENT":
                    uiManager.drawSeparatistRecruitmentMenu(player);
                    break;
                case "VIEWING_MILITARY_RECRUITMENT":
                    uiManager.drawMilitaryRecruitmentMenu(player);
                    break;
                case "VIEWING_STORAGE":
                    uiManager.drawStorageMenu(currentSystem?.station || null, player);
                    break;
                case "VIEWING_RECORD":
                    uiManager.drawPersonalRecordMenu(player);
                    break;
            }
        } catch(e) {
            console.error(`Error drawing ${this.currentState} menu:`, e);
        }
    }
    
    /**
     * Draws GALAXY_MAP state
     * @private
     */
    _drawGalaxyMapView(player, currentSystem) {
        // Draw regular game view behind the map
        if (currentSystem && player) {
            try {
                currentSystem.draw(player);
            } catch(e) {
                console.error("Error drawing system behind galaxy map:", e);
            }
        }
        
        // Draw semi-transparent overlay
        push();
        fill(10, 0, 20, 180);
        noStroke();
        rect(0, 0, width, height);
        pop();
        
        // Draw galaxy map UI
        if (uiManager && galaxy && player) {
            try {
                uiManager.drawGalaxyMap(galaxy, player);
            } catch(e) {
                console.error("Error drawing galaxy map:", e);
            }
        }
        
        // Draw HUD on top
        if (uiManager && player) {
            try {
                uiManager.drawHUD(player, currentSystem, true);
            } catch(e) {
                console.error("Error drawing HUD during galaxy map:", e);
            }
        }
    }
    
    /**
     * Draws JUMPING state
     * @private
     */
    _drawJumping(player, currentSystem) {
        // Draw flight view as background
        if (currentSystem && player) {
            try {
                currentSystem.draw(player);
            } catch(e) {
                console.error("ERROR in currentSystem.draw (Jumping):", e);
            }
        } else {
            background(0);
        }
        
        // Draw jump charge UI (only if fade hasn't started)
        if (this.jumpFadeState === "NONE" && uiManager && player) {
            try {
                // Progress bar
                fill(0, 150, 255, 150);
                noStroke();
                const chargePercent = constrain(this.jumpChargeTimer / this.jumpChargeDuration, 0, 1);
                rect(0, height-35, width * chargePercent, 35);
                
                // Determine target name
                let targetName = "Unknown";
                if (galaxy && 
                    this.jumpTargetSystemIndex >= 0 && 
                    this.jumpTargetSystemIndex < galaxy.systems.length && 
                    galaxy.systems[this.jumpTargetSystemIndex]) {
                    targetName = galaxy.systems[this.jumpTargetSystemIndex].name || "Invalid Target";
                }
                
                // Jump status text
                textFont(font);
                fill(255);
                textAlign(LEFT, BOTTOM);
                textSize(20);
                text(`Charging Hyperdrive... Target: ${targetName}`, 50, height - 5);
            } catch (e) {
                console.error("Error drawing jump UI:", e);
            }
        }
        
        // Draw fade overlay
        if (this.jumpFadeState !== "NONE") {
            push();
            fill(255, 255, 255, this.jumpFadeOpacity * 255);
            noStroke();
            rect(0, 0, width, height);
            pop();
        }
    }
    
    /**
     * Draws LOADING state
     * @private
     */
    _drawLoading() {
        if (sharedStarfield?.draw) {
            sharedStarfield.draw();
        }
        push();
        fill(255);
        if (typeof font !== 'undefined') textFont(font);
        textAlign(CENTER, CENTER);
        pop();
    }
    
    /**
     * Draws inventory overlay if showing
     * @private
     */
    _drawInventoryOverlay(player) {
        if (this.currentState === "IN_FLIGHT" && this.showingInventory) {
            inventoryScreen.draw(player);
        }
    }
    
    /**
     * Draws post-load fade overlay
     * @private
     */
    _drawPostLoadFade() {
        try {
            if (!this.postLoadFadeState || this.postLoadFadeState === "NONE") return;
            
            push();
            fill(0, 0, 0, this.postLoadFadeOpacity * 255);
            rect(0, 0, width, height);
            pop();
        } catch (e) { /* non-fatal */ }
    }
    
    /**
     * Draws planet buffer creation progress overlay
     * @private
     */
    _drawPlanetBufferProgress() {
        try {
            if (typeof window === 'undefined' || 
                !window._planetBufferCreationTotal || 
                (window._planetBufferCreationCompleted || 0) >= window._planetBufferCreationTotal ||
                this.currentState === "JUMPING") {
                return;
            }
            
            const total = window._planetBufferCreationTotal || 1;
            const done = window._planetBufferCreationCompleted || 0;
            const pct = constrain(done / total, 0, 1);
            
            // Draw background
            try {
                if (typeof saveSelectionScreen !== 'undefined' && 
                    saveSelectionScreen && 
                    typeof saveSelectionScreen.drawBackground === 'function') {
                    saveSelectionScreen.drawBackground();
                } else {
                    push();
                    noStroke();
                    fill(5,5,15);
                    rect(0,0,width,height);
                    pop();
                }
            } catch (e) {
                push();
                noStroke();
                fill(5,5,15);
                rect(0,0,width,height);
                pop();
            }
            
            push();
            noStroke();
            
            // Panel
            const panelW = Math.min(900, width * 0.8);
            const panelH = 150;
            const px = (width - panelW) * 0.5;
            const py = (height - panelH) * 0.5;
            
            stroke(80, 80, 120, 100);
            strokeWeight(1);
            fill(15, 25, 45, 180);
            rect(px, py, panelW, panelH, 8);
            noStroke();
            
            // System info
            try {
                const sys = galaxy?.getCurrentSystem();
                const systemName = sys?.name || 'Unknown System';
                let economy = sys?.economyType || sys?.economy || 'Unknown';
                let tech = sys?.techLevel ?? sys?.tech ?? 'N/A';
                let security = sys?.securityLevel || 'Unknown';
                
                push();
                if (typeof font !== 'undefined') textFont(font);
                textAlign(CENTER, CENTER);
                fill(255);
                textSize(18);
                const welcomeY = py + panelH * 0.26;
                text(`${systemName}   ${economy}   Tech: ${tech}   Security: ${security}`, 
                     px + panelW * 0.5, welcomeY-20);
                pop();
            } catch (e) { /* skip welcome text */ }
            
            // Progress bar
            const barW = panelW * 0.75;
            const barH = 18;
            const bx = px + (panelW - barW) * 0.5;
            const by = py + panelH * 0.6 - barH * 0.5;
            
            fill(45);
            rect(bx, by, barW, barH, 6);
            fill(0, 200, 255);
            rect(bx, by, barW * pct, barH, 6);
            
            // Progress text
            if (typeof font !== 'undefined') textFont(font);
            fill(255);
            textAlign(CENTER, CENTER);
            textSize(18);
            text(`Creating the System: ${Math.round(pct * 100)}% (${done}/${total})`, 
                 width * 0.5, py + panelH * 0.32);
            
            pop();
        } catch (e) { /* non-fatal */ }
    }


    /**
     * Initiates the jump sequence to a target system index.
     * Checks if the player is in the jump zone first.
     * @param {number} targetIndex - The index of the target system in the galaxy
     */
    startJump(targetIndex) {
        // Prevent interrupting an ongoing jump sequence
        if (this.currentState === "JUMPING" || this.isJumpCharging) {
            GS_LOG("[startJump] Jump already in progress. Ignoring new jump request.");
            return;
        }
        
        GS_LOG(`[startJump] Attempting jump to system index: ${targetIndex}`);
        const currentSystem = galaxy?.getCurrentSystem();
        const targetSystem = galaxy.getSystemByIndex(targetIndex);

        // --- ADDED: Log state right before the check ---
        //console.log(`[startJump] Checking jump zone status...`);
        const isInZone = isPlayerInJumpZone(player, currentSystem);
        //console.log(`[startJump] Result of isPlayerInJumpZone: ${isInZone}`);
        // ---

        // --- Jump Zone Restriction Check ---
        if (!isInZone) {
            GS_LOG("[startJump] Jump aborted: Player not in Jump Zone.");
            // Use uiManager and soundManager if they are accessible here
            // Assuming they are global or passed to GameStateManager
            if (typeof uiManager !== 'undefined' && typeof uiManager.addMessage === 'function') {
                uiManager.addMessage("Cannot initiate jump: Must be in designated Jump Zone.", color(255, 100, 100));
            }
            if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
                soundManager.playSound('error'); // Or a specific 'cannot jump' sound
            }
            // Important: Abort the jump process
            return;
        }
        // --- End Jump Zone Check ---

        // --- Basic Target Validation ---
        if (targetIndex === null || targetIndex === undefined || targetIndex < 0 || targetIndex >= galaxy.systems.length) {
            console.error("[startJump] Invalid target system index:", targetIndex);
            if (typeof uiManager !== 'undefined') uiManager.addMessage("Error: Invalid jump target selected.", color(255, 0, 0));
            return;
        }

        if (targetIndex === galaxy.currentSystemIndex) {
            GS_LOG("[startJump] Cannot jump to the current system.");
            if (typeof uiManager !== 'undefined') uiManager.addMessage("Cannot jump to the current system.", color(255, 200, 0));
            return;
        }
        // --- End Basic Target Validation ---

        // --- Connection Check ---
        if (!currentSystem || !currentSystem.connectedSystemIndices.includes(targetIndex)) {
             GS_LOG(`[startJump] Jump failed: No connection from ${currentSystem?.name} to system index ${targetIndex}.`);
             if (typeof uiManager !== 'undefined') uiManager.addMessage("Cannot jump: No direct route to that system.", color(255, 100, 100));
             return;
        }
        // --- End Connection Check ---

        GS_LOG(`[startJump] Jump initiated to ${targetSystem.name} (Index: ${targetIndex})`);
        this.jumpTargetSystemIndex = targetIndex;
        this.jumpChargeTimer = 0; // Reset timer
        this.jumpFadeState = "NONE"; // Ensure fade state starts fresh
        this.jumpFadeOpacity = 0; // Ensure opacity starts at 0
        this.isJumpCharging = true; // Set the flag
        this.jumpJustCompleted = false; // Reset completion flag
        this.setState("JUMPING");
        if (typeof soundManager !== 'undefined') soundManager.playSound('jump'); // Start charging sound (use existing 'jump' definition)
    }

    /** Fetches missions for the current station and stores them for display. */
    fetchStationMissions(player) {
         const currentSystem = galaxy?.getCurrentSystem();
         if (currentSystem?.station && galaxy && player) {
              MISSION_LOG("[GameStateManager] Fetching missions for", currentSystem?.name, currentSystem?.station?.name);
              try {
                  if (typeof currentSystem.getAvailableMissions === 'function') {
                      this.currentStationMissions = currentSystem.getAvailableMissions(galaxy, player) || [];
                  } else if (typeof MissionGenerator?.generateMissions === 'function') {
                      this.currentStationMissions = MissionGenerator.generateMissions(currentSystem, currentSystem.station, galaxy, player);
                  } else {
                      this.currentStationMissions = [];
                  }
                  MISSION_LOG("[GameStateManager] Missions fetched:", this.currentStationMissions);
                  this.selectedMissionIndex = -1; return true;
              } catch(e) { console.error("Error during Mission generation:", e); this.currentStationMissions = []; return false; }
         }
         // console.warn("Cannot fetch missions - missing required objects/generator."); // Optional log
         this.currentStationMissions = []; return false;
    } // End fetchStationMissions

    /** Saves the current game state to local storage. */
    saveGame() {
        const saveData = {
            player: player.getSaveData(),
            galaxy: galaxy.getSaveData(),
            // ...other data as needed...
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    }

    /** Loads the game state from local storage. */
    loadGame() {
        const saveStr = localStorage.getItem(SAVE_KEY);
        if (!saveStr) return false;
        const saveData = JSON.parse(saveStr);
        if (saveData.player) player.loadSaveData(saveData.player);
        if (saveData.galaxy) galaxy.loadSaveData(saveData.galaxy);
        // ...other data as needed...
        return true;
    }

    // Add a method to toggle the inventory screen
toggleInventory() {
    if (this.currentState === "IN_FLIGHT") {
        this.showingInventory = !this.showingInventory;
        return true;
    }
    return false;
}

} // End of GameStateManager Class