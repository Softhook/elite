// ****** gameStateManager.js ******

/**
 * Checks if the player is within the designated jump zone of the given system.
 * Uses distance squared for performance optimization.
 * @param {Player} playerObj - The player object
 * @param {StarSystem} systemObj - The system object
 * @returns {boolean} True if the player is in the jump zone, false otherwise
 */
function isPlayerInJumpZone(playerObj, systemObj) {
    // --- DEBUG LOGGING for Quantum Gate Issue ---
    if (!playerObj?.pos) {
        console.warn("[isPlayerInJumpZone] Check failed: Invalid player position", playerObj);
        return false;
    }
    if (!systemObj) {
        console.warn("[isPlayerInJumpZone] Check failed: System object is undefined/null");
        return false;
    }
    if (!systemObj.jumpZoneCenter) {
        console.warn(`[isPlayerInJumpZone] Check failed: System '${systemObj.name}' has no jumpZoneCenter! Value:`, systemObj.jumpZoneCenter);
        return false;
    }
    if (!(systemObj.jumpZoneRadius > 0)) {
        console.warn(`[isPlayerInJumpZone] Check failed: Invalid radius in ${systemObj.name}: ${systemObj.jumpZoneRadius}`);
        return false;
    }

    const distanceSq = (playerObj.pos.x - systemObj.jumpZoneCenter.x) ** 2 +
        (playerObj.pos.y - systemObj.jumpZoneCenter.y) ** 2;
    const radiusSq = systemObj.jumpZoneRadius ** 2;

    const inZone = distanceSq <= radiusSq;

    // Optional: Log when CLOSE but not inside, to help debug "visual mismatch"
    if (!inZone && distanceSq <= radiusSq * 1.5 && (frameCount % 60 === 0)) {
        console.log(`[isPlayerInJumpZone] Player close to zone in ${systemObj.name}. Dist: ${Math.sqrt(distanceSq).toFixed(0)} / ${systemObj.jumpZoneRadius}`);
    }

    return inZone;
}

/**
 * Helper to apply the centralized starfield background color.
 * Uses STARFIELD_CONFIG if available, otherwise defaults to dark blue.
 */
function applyStarfieldBackground() {
    const bg = (typeof STARFIELD_CONFIG !== 'undefined')
        ? STARFIELD_CONFIG.BACKGROUND_COLOR
        : { r: 10, g: 15, b: 40 };
    background(bg.r, bg.g, bg.b);
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
    "VIEWING_SHIP_DETAIL",
    "VIEWING_UPGRADES",
    "VIEWING_WEAPON_DETAIL",
    "VIEWING_REPAIRS",
    "VIEWING_SERVICES",
    "VIEWING_PROTECTION",
    "VIEWING_POLICE",
    "VIEWING_IMPERIAL_RECRUITMENT",
    "VIEWING_SEPARATIST_RECRUITMENT",
    "VIEWING_MILITARY_RECRUITMENT",
    "VIEWING_STORAGE",
    "VIEWING_RECORD",
    "VIEWING_NEWS",
    "DOCKED_SPACE_OBJECT",
    "VIEWING_SPACE_OBJECT_MARKET",
    "VIEWING_SPACE_OBJECT_REPAIRS",
    "VIEWING_SPACE_OBJECT_SHIPYARD",
    "VIEWING_SPACE_OBJECT_UPGRADES",
    "VIEWING_BASE"
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

        // Quantum gate teleportation (uses same fade system as jumps)
        this.quantumGateTeleportPending = false;

        // UI flags
        this.showingInventory = false;
        this.showingMissionOverlay = false;

        // Post-load transition (used when waiting for planet buffers)
        this.postLoadFadeState = "NONE"; // NONE, FADE_OUT, FADE_IN
        this.postLoadFadeOpacity = 0;
        this.postLoadFadeTarget = null;
        this.postLoadFadeOutMs = 900; // fade-out duration in ms
        this.postLoadFadeInMs = 700;  // fade-in duration in ms
        this.pendingPostLoadState = null;

        // Docked entity tracking
        this.currentDockedStation = null;    // Tracks which station player is docked at (main or secret)
        this.currentDockedSpaceObject = null; // Tracks docked space object (already exists, ensure initialized)

        // Death zoom effect - dramatic zoom-in when player is destroyed
        this.deathZoomScale = 1.0;           // Current zoom level (1.0 = normal, higher = zoomed in)
        this.deathZoomTarget = 3;          // Target zoom level during death
        this.deathZoomSpeed = 0.012;         // How fast to zoom in per frame
        this.deathZoomActive = false;        // Whether the death zoom is currently active
        this.deathZoomStartTime = 0;         // When the death zoom started (millis)

        // Intro zoom effect - zoom out from close-up when first entering space
        this.introZoomScale = 40;           // Starting zoom level (zoomed in)
        this.introZoomTarget = 1.0;          // Target zoom level (normal view)
        this.introZoomActive = false;        // Whether intro zoom is currently active
        this.introZoomStartTime = 0;         // When intro zoom started
        this.introZoomDuration = 10000;       // Duration of intro zoom in ms
        this.introZoomTriggered = false;     // Whether intro zoom has been triggered this session
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
     * Gets station information for music theming
     * Handles both regular stations and dockable space objects
     * @returns {object} Station info with stationType, economyType, techLevel
     * @private
     */
    _getStationInfo() {
        const system = galaxy?.getCurrentSystem?.();

        // Check if docked at a space object first
        if (this.currentDockedSpaceObject) {
            const spaceObj = this.currentDockedSpaceObject;
            const objType = spaceObj.type?.toLowerCase() || '';

            // Map space object types to music themes
            let stationType = 'standard';
            if (objType.includes('prison')) stationType = 'separatist';
            else if (objType.includes('shipyard')) stationType = 'industrial';
            else if (objType.includes('mining')) stationType = 'mining';
            else if (objType.includes('research') || objType.includes('array')) stationType = 'post human';
            else if (objType.includes('monolith') || objType.includes('artifact')) stationType = 'alien';
            else if (objType.includes('market')) stationType = 'separatist';
            else if (objType.includes('fuel') || objType.includes('power')) stationType = 'industrial';

            return {
                stationType: stationType,
                economyType: system?.economyType || 'standard',
                techLevel: system?.techLevel || 5,
                securityLevel: system?.securityLevel || 'medium'
            };
        }

        // Otherwise use regular station
        const station = this.currentDockedStation || system?.station;
        return {
            stationType: station?.stationType || 'standard',
            economyType: system?.economyType || 'standard',
            techLevel: system?.techLevel || 5,
            securityLevel: system?.securityLevel || 'medium'
        };
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
                // Get station info for theming (handles both stations and space objects)
                const stationInfo = this._getStationInfo();
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
     * Updates space music state based on current game state
     * @param {string} newState - The new game state
     * @param {string} prevState - The previous game state
     * @private
     */
    _updateSpaceMusic(newState, prevState) {
        try {
            if (typeof spaceMusicManager === 'undefined' || !spaceMusicManager) {
                return;
            }

            const isInFlight = newState === "IN_FLIGHT";
            const isSurface = newState === "SURFACE_MODE";
            const wasInFlight = prevState === "IN_FLIGHT";
            const wasSurface = prevState === "SURFACE_MODE";

            // Both Flight and Surface modes are considered "Active" for music purposes
            // This grouping ensures we don't restart music when switching between them
            const isActiveState = isInFlight || isSurface;
            const wasActiveState = wasInFlight || wasSurface;

            const isStationState = STATION_STATES.includes(newState);
            const isGameOver = newState === "GAME_OVER";

            // Start space music ONLY when entering an Active state from a Non-Active state
            // (e.g. Loading -> Surface, or Docked -> Flight)
            // This explicitly prevents double-initiation when moving Surface <-> Flight
            if (isActiveState && !wasActiveState) {
                spaceMusicManager.start(3000); // 3s fade-in
            }
            // Stop space music when docking or game over (leaving Active state)
            else if ((isStationState || isGameOver) && wasActiveState) {
                spaceMusicManager.stop(2000); // 2s fade-out
            }
        } catch (e) {
            console.warn('Error updating space music state:', e);
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
            const isMenuState = (state) => ["VIEWING_MARKET", "VIEWING_MISSIONS", "VIEWING_SHIPYARD",
                "VIEWING_UPGRADES", "VIEWING_REPAIRS", "VIEWING_PROTECTION", "VIEWING_POLICE",
                "VIEWING_IMPERIAL_RECRUITMENT", "VIEWING_SEPARATIST_RECRUITMENT",
                "VIEWING_MILITARY_RECRUITMENT", "VIEWING_STORAGE", "VIEWING_RECORD",
                "VIEWING_SPACE_OBJECT_MARKET", "VIEWING_SPACE_OBJECT_REPAIRS",
                "VIEWING_SPACE_OBJECT_SHIPYARD", "VIEWING_SPACE_OBJECT_UPGRADES"].includes(state);

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
            }
            // Galaxy map
            else if (newState === "GALAXY_MAP" && prevState !== "GALAXY_MAP") {
                soundManager.playSound('mapOpen');
            } else if (prevState === "GALAXY_MAP" && newState !== "GALAXY_MAP") {
                soundManager.playSound('mapClose');
            }
            // Station menu navigation
            else if ((newState === "DOCKED" || newState === "DOCKED_SPACE_OBJECT") && isStationState(prevState)) {
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

        // Spawn any hired bodyguards when undocking
        if (player.activeBodyguards?.length > 0 && galaxy?.getCurrentSystem()) {
            console.log("Spawning bodyguards when undocking from space object");
            player.spawnBodyguards(galaxy.getCurrentSystem());
        }

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

        // Use the docked station that was already set in _checkDocking
        // This could be either the main station OR a secret station
        const dockStation = this.currentDockedStation || galaxy?.getCurrentSystem()?.station;

        if (player && dockStation?.pos) {
            player.pos = dockStation.pos.copy();
            player.vel.mult(0);
            // Mark player as docked and invulnerable so enemies stop targeting them
            player.isDockedAndInvulnerable = true;
            // Deactivate cloak when docking (silently, no cooldown)
            if (player.isCloaked) {
                player.isCloaked = false;
                player.cloakDurationTimer = 0;
            }
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
            // Deactivate cloak when docking (silently, no cooldown)
            if (player.isCloaked) {
                player.isCloaked = false;
                player.cloakDurationTimer = 0;
            }
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

        // Force close overlays on state change
        this.showingMissionOverlay = false;
        this.showingInventory = false;

        // Stop speech/propaganda on Game Over
        if (newState === "GAME_OVER") {
            if (typeof communicationSystem !== 'undefined' && communicationSystem && typeof communicationSystem.stopSpeech === 'function') {
                communicationSystem.stopSpeech();
            }
        }

        // Execute transition handlers
        this._updateAmbientSoundState(newState);
        this._updateStationMusic(newState, this.previousState);
        this._updateSpaceMusic(newState, this.previousState);
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
            if (typeof saveSelectionScreen.resetActionSelection === 'function') {
                saveSelectionScreen.resetActionSelection();
            } else {
                saveSelectionScreen.selectedActionColumn = 0;
            }
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

        // DO NOT clear missions when entering mission board - missions should persist
        // within the same docking session. They are only regenerated when:
        // 1. Player docks at a station (see handleDocking)
        // 2. Player undocks and docks again
        // 3. Player jumps to another system and returns

        // Reset market selection
        if (newState !== "VIEWING_MARKET" && this.previousState === "VIEWING_MARKET") {
            this.selectedMarketItemIndex = -1;
        }

        // Trigger intro zoom when first entering IN_FLIGHT (new game or after load)
        if (newState === "IN_FLIGHT" && !this.introZoomTriggered) {
            this.introZoomTriggered = true;
            this.introZoomActive = true;
            this.introZoomStartTime = millis();
            this.introZoomScale = 2.5; // Start zoomed in
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
        const isStationaryState = STATION_STATES.includes(newState);
        const isInMenu = ["VIEWING_MARKET", "VIEWING_MISSIONS"].includes(newState);

        if (isUndocking) {
            this._handleUndocking(prevState);
        } else if (isDocking) {
            this._handleDocking(prevState);
        } else if (isSpaceObjectDocking) {
            this._handleSpaceObjectDocking(prevState);
        } else if (isStationaryState) {
            // Ensure player is stopped and invulnerable in all station/base menu states
            if (player) {
                player.vel.set(0, 0);
                player.isDockedAndInvulnerable = true;

                // Deactivate cloak when stationary (silently)
                if (player.isCloaked) {
                    player.isCloaked = false;
                    player.cloakDurationTimer = 0;
                }
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
            "VIEWING_SHIPYARD", "VIEWING_SHIP_DETAIL", "VIEWING_UPGRADES", "VIEWING_WEAPON_DETAIL", "VIEWING_REPAIRS",
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

            case "SURFACE_MODE":
                // Update surface mode (terrain, player physics, projectiles)
                if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                    surfaceMode.update(deltaTime);
                }
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
            case "VIEWING_NEWS":
            case "VIEWING_BASE":
                if (!player) break;
                try {
                    // Keep player completely stationary while docked
                    player.vel.set(0, 0);

                    // Update surface mode logic if active (allows transitions to finish and terrain to update)
                    if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                        surfaceMode.update(deltaTime);
                    }

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
                            player.activeMission.update(currentSystem, player);
                        } catch (e) {
                            console.error('Error updating mission while docked:', e);
                        }
                    }
                } catch (e) {
                    console.error('Error in background simulation while docked:', e);
                }
                break;

            case "VIEWING_SHIPYARD":
            case "VIEWING_SHIP_DETAIL":
            case "VIEWING_UPGRADES":
            case "VIEWING_WEAPON_DETAIL":
            case "VIEWING_REPAIRS":
            case "GAME_OVER":
            case "LOADING":
                // Update station music for shop screens
                if ((this.currentState === "VIEWING_SHIPYARD" ||
                    this.currentState === "VIEWING_SHIP_DETAIL" ||
                    this.currentState === "VIEWING_UPGRADES" ||
                    this.currentState === "VIEWING_WEAPON_DETAIL" ||
                    this.currentState === "VIEWING_REPAIRS" ||
                    this.currentState === "VIEWING_BASE") &&
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

                // Activate death zoom effect on first dying frame
                if (!this.deathZoomActive && player.isDying) {
                    this.deathZoomActive = true;
                    this.deathZoomStartTime = millis();
                    this.deathZoomScale = 1.0;
                }

                // Smoothly zoom in during death animation
                if (this.deathZoomActive && this.deathZoomScale < this.deathZoomTarget) {
                    // Ease-out interpolation for smooth zoom that decelerates
                    const elapsed = millis() - this.deathZoomStartTime;
                    const duration = 2500; // 2.5 seconds to reach target zoom
                    const t = Math.min(1.0, elapsed / duration);
                    // Ease-out cubic for smooth deceleration
                    const easeOut = 1 - Math.pow(1 - t, 3);
                    this.deathZoomScale = 1.0 + (this.deathZoomTarget - 1.0) * easeOut;
                }
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

            // Update quantum gate fade effect if active (runs alongside normal flight)
            // Must continue updating fade even after quantumGateTeleportPending is cleared,
            // otherwise the fade gets stuck at WHITE_HOLD or FADE_IN and never completes
            if (this.jumpFadeState !== "NONE") {
                this._updateJumpFade();
            }

            // Update intro zoom effect (zoom out from close-up)
            if (this.introZoomActive) {
                const elapsed = millis() - this.introZoomStartTime;
                const t = Math.min(1.0, elapsed / this.introZoomDuration);
                // Ease-out cubic for smooth deceleration
                const easeOut = 1 - Math.pow(1 - t, 3);
                // Interpolate from starting zoom (2.5) down to target (1.0)
                this.introZoomScale = 2.5 - (2.5 - this.introZoomTarget) * easeOut;

                // Deactivate when complete
                if (t >= 1.0) {
                    this.introZoomActive = false;
                    this.introZoomScale = 1.0;
                }
            }
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

            // Track which station we're docking at (don't swap system.station)
            // This ensures NPCs still travel to the MAIN station
        }

        if (dockStation) {
            this.currentDockedStation = dockStation; // Track the actual docked station
            // Clear cached missions so the new station generates its own mission list
            this.currentStationMissions = null;
            this.selectedMissionIndex = -1;
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
                    // Clear cached missions so the new location generates its own mission list
                    this.currentStationMissions = null;
                    this.selectedMissionIndex = -1;
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
            try { saveGame(); } catch (_) { }
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

        // Ensure we check against the actual system passed in
        const inZone = isPlayerInJumpZone(player, currentSystem);
        if (!inZone) return;

        const lockedIdx = uiManager.lockedDestinationIndex;
        // Verify currentSystem is valid
        if (!currentSystem) {
            console.error("[_checkAutoJump] currentSystem is null!");
            return;
        }

        const reachable = currentSystem.connectedSystemIndices || [];

        console.log(`[_checkAutoJump] Attempting jump from ${currentSystem.name} to index ${lockedIdx}. Reachable: ${reachable.join(',')}`);

        if (reachable.includes(lockedIdx)) {
            GS_LOG(`Auto-jump triggered: Player in jump zone with locked destination ${lockedIdx}`);
            this.startJump(lockedIdx);
            uiManager.lockedDestinationIndex = -1; // Clear lock after initiating
        } else {
            GS_LOG(`Auto-jump aborted: Locked destination ${lockedIdx} not reachable from ${currentSystem.name}. Clearing.`);
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
     * Starts the quantum gate teleportation fade effect.
     * Uses the same white fade mechanism as hyperdrive jumps.
     */
    startQuantumGateFade() {
        if (this.jumpFadeState !== "NONE") {
            console.log("Quantum gate fade blocked: already fading");
            return false;
        }

        // Prevent quantum jump if hyperdrive is already charging
        if (this.isJumpCharging) {
            console.log("Quantum gate fade blocked: hyperdrive charging");
            return false;
        }

        console.log("Starting quantum gate teleportation fade");
        this.quantumGateTeleportPending = true;
        this.jumpFadeState = "FADE_OUT";
        this.jumpFadeOpacity = 0;
        this.jumpWhiteHoldTimer = 0;

        // Show activation message
        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage('QUANTUM GATE ACTIVATED!', [200, 100, 255]);
        }

        // Play teleportation/jump sound
        if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
            soundManager.playSound('jump');
        }

        return true;
    }

    /**
     * Updates jump fade state machine
     * Handles both regular hyperdrive jumps and quantum gate teleportation
     * @private
     */
    _updateJumpFade() {
        if (this.jumpFadeState === "FADE_OUT") {
            this.jumpFadeOpacity += 0.03;
            if (this.jumpFadeOpacity >= 1) {
                // Execute either quantum gate teleport or regular jump during full white
                if (this.quantumGateTeleportPending) {
                    // Quantum gate teleportation
                    if (typeof galaxy !== 'undefined' && galaxy && typeof galaxy.teleportToRandomSystem === 'function') {
                        galaxy.teleportToRandomSystem();
                    }
                    player.currentSystem = galaxy?.getCurrentSystem();
                    player.vel.mult(0.3);
                    this.quantumGateTeleportPending = false;
                    this.isJumpCharging = false; // Fix: Ensure jump charge is cleared

                    // CRITICAL FIX: Ensure state data is reset even though we don't switch states
                    // This prevents stale data from interfering with subsequent jumps
                    this._resetStateSpecificData("IN_FLIGHT");

                    GS_LOG("Quantum gate teleport executed");
                } else {
                    // Regular hyperdrive jump
                    galaxy.jumpToSystem(this.jumpTargetSystemIndex);
                    player.currentSystem = galaxy?.getCurrentSystem();
                    player.vel.mult(0.3);
                    this.jumpChargeTimer = 0;
                    this.isJumpCharging = false;
                }

                // Clear player target on jump transition
                if (player) {
                    player.target = null;
                }

                // Change music chords during the white-out transition (mid-jump)
                if (typeof spaceMusicManager !== 'undefined') {
                    spaceMusicManager.advanceChordProgression();
                }

                this.jumpFadeState = "WHITE_HOLD";

                // Clear event markers on jump/teleport
                if (typeof uiManager !== 'undefined') {
                    uiManager.clearEventMarkers();
                }
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

                // Only call setState if we actually need to change state or force a refresh
                if (this.currentState !== "IN_FLIGHT") {
                    this.setState("IN_FLIGHT");
                } else {
                    // Start intro zoom or other post-jump effects if needed?
                    // Usually setState handles this, but since we stayed IN_FLIGHT for Quantum Gate...
                    // We might want to manually trigger 'introZoomTriggered' logic if desired, 
                    // but usually that's for new games.
                }

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

        // No longer need to restore swapped station - we now track docked station explicitly
        // in this.currentDockedStation without modifying currentSystem.station

        this._drawStateVisuals(player, currentSystem);
        this._drawInventoryOverlay(player);
        this._drawMissionOverlay(player);
        this._drawPostLoadFade();
        this._drawPlanetBufferProgress();
    }

    // NOTE: _restoreSecretStation removed - we no longer swap stations.
    // Instead we track the docked station explicitly in this.currentDockedStation.

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
            case "VIEWING_SHIP_DETAIL":
            case "VIEWING_UPGRADES":
            case "VIEWING_WEAPON_DETAIL":
            case "VIEWING_REPAIRS":
            case "VIEWING_PROTECTION":
            case "VIEWING_POLICE":
            case "VIEWING_IMPERIAL_RECRUITMENT":
            case "VIEWING_SEPARATIST_RECRUITMENT":
            case "VIEWING_MILITARY_RECRUITMENT":
            case "VIEWING_STORAGE":
            case "VIEWING_RECORD":
            case "VIEWING_NEWS":
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
                if (uiManager) {
                    try { uiManager.drawGameOverScreen(); } catch (e) { }
                }
                break;

            case "LOADING":
                this._drawLoading();
                break;

            case "SAVE_SELECTION":
                if (saveSelectionScreen) saveSelectionScreen.draw();
                break;

            case "SURFACE_MODE":
                // Draw surface mode (terrain, player ship, HUD)
                if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                    surfaceMode.draw();
                }
                // Draw mission overlay on top of surface mode (must be after surfaceMode.draw())
                if (this.showingMissionOverlay && typeof uiManager !== 'undefined' && uiManager) {
                    uiManager.drawMissionOverlay(player);
                }
                break;

            case "VIEWING_BASE":
                // Draw surface mode behind the base menu so the world remains visible
                if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                    surfaceMode.draw();
                }
                // Draw Base Services menu via UIManager
                if (uiManager && player) {
                    try {
                        uiManager.drawBaseMenu(player, uiManager.currentBaseObject);
                    } catch (e) {
                        console.error("Error drawing base menu:", e);
                    }
                }
                break;

            default:
                console.error(`Unknown game state in draw(): ${this.currentState}`);
                background(255, 0, 0);
                fill(0);
                textAlign(CENTER, CENTER);
                textSize(STATION_TEXT_SIZE.BODY);
                text(`Error: Unknown game state "${this.currentState}"`, width / 2, height / 2);
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
        applyStarfieldBackground();

        if (currentSystem) {
            try {
                push();
                if (currentSystem.station) currentSystem.station.draw();
                pop();
            } catch (e) {
                console.error("Error drawing station background:", e);
            }
        }

        if (player) {
            try {
                player.draw();
            } catch (e) { }
        }
    }

    /**
     * Draws IN_FLIGHT state
     * @private
     */
    _drawInFlight(player, currentSystem) {
        // Check if death zoom is active
        const isDeathZooming = this.deathZoomActive && this.deathZoomScale > 1.0;

        // Determine zoom scale - death zoom takes priority, then intro zoom
        let zoomScale = 1.0;
        if (isDeathZooming) {
            zoomScale = this.deathZoomScale;
        } else if (this.introZoomActive && this.introZoomScale > 1.0) {
            zoomScale = this.introZoomScale;
        }

        if (currentSystem && player) {
            try {
                // Pass zoom scale to system draw - it handles the zoom transform internally
                currentSystem.draw(zoomScale);
            } catch (e) {
                console.error("Error drawing system:", e);
            }
        }

        // Draw quantum gate fade overlay if active
        if (this.jumpFadeState !== "NONE" && this.jumpFadeOpacity > 0) {
            push();
            fill(255, 255, 255, this.jumpFadeOpacity * 255);
            noStroke();
            rect(0, 0, width, height);
            pop();
        }

        // Draw surface mode exit fade overlay if active
        // This creates a smooth white fade-in when returning from planet surface
        if (typeof surfaceMode !== 'undefined' && surfaceMode) {
            const isFading = surfaceMode.updateAndDrawExitFade();

            // If exiting surface mode, the above call draws a white overlay over everything.
            // We must re-draw the player ship on top of this overlay so it stays visible 
            // during the transition back to space view.
            if (isFading && player && typeof player.draw === 'function') {
                push();
                // Apply the same camera transform used in currentSystem.draw()
                translate(width / 2 - player.pos.x, height / 2 - player.pos.y);

                // [ZOOM REMOVED] Do not apply death/intro zoom during exit transition
                // to maintain visual consistency with the surface mode scale.

                player.draw();
                pop();
            }
        }

        // [HUD FIX] Draw HUD LAST so it stays on top of even the transition/fade overlays
        // Hide HUD only during death zoom (not intro zoom)
        if (uiManager && player) {
            try {
                if (!isDeathZooming) {
                    uiManager.drawHUD(player);
                    if (currentSystem) {
                        uiManager.drawMinimap(player, currentSystem);
                    }
                }
            } catch (e) { }
        }
    }

    /**
     * Draws DOCKED state
     * @private
     */
    _drawDocked(player, currentSystem) {
        this._drawStationBackground(player, currentSystem);

        // Use the tracked docked station (could be main station or secret station)
        const dockedStation = this.currentDockedStation || currentSystem?.station;
        if (uiManager && dockedStation && player) {
            try {
                uiManager.drawStationMainMenu(dockedStation, player);
            } catch (e) {
                console.error("Error drawing station main menu:", e);
            }
        }
    }

    /**
     * Draws DOCKED_SPACE_OBJECT state
     * @private
     */
    _drawDockedSpaceObject(player, currentSystem) {
        applyStarfieldBackground();

        if (currentSystem) {
            try {
                push();
                if (this.currentDockedSpaceObject &&
                    typeof this.currentDockedSpaceObject.draw === 'function') {
                    this.currentDockedSpaceObject.draw();
                }
                pop();
            } catch (e) {
                console.error("Error drawing space object:", e);
            }
        }

        if (player) {
            try { player.draw(); } catch (e) { }
        }

        if (uiManager && this.currentDockedSpaceObject && player) {
            try {
                uiManager.drawSpaceObjectDockMenu(this.currentDockedSpaceObject, player);
            } catch (e) {
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
            } catch (e) {
                console.error("Error drawing space object background:", e);
            }
        } else {
            applyStarfieldBackground();
        }

        if (player) {
            try { player.draw(); } catch (e) { }
        }

        if (uiManager && this.currentDockedSpaceObject && player) {
            try {
                uiManager.drawSpaceObjectMarket(this.currentDockedSpaceObject, player);
            } catch (e) {
                console.error("Error drawing space object market:", e);
            }
        } else {
            background(10, 0, 0);
            fill(255);
            text("Error: Space object not found", width / 2, height / 2);
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
            } catch (e) {
                console.error("Error drawing space object background:", e);
            }
        } else {
            applyStarfieldBackground();
        }

        if (player) {
            try { player.draw(); } catch (e) { }
        }

        if (uiManager && this.currentDockedSpaceObject && player) {
            try {
                uiManager.drawSpaceObjectRepairsMenu(this.currentDockedSpaceObject, player);
            } catch (e) {
                console.error("Error drawing space object repairs:", e);
            }
        } else {
            background(10, 0, 0);
            fill(255);
            text("Error: Space object not found", width / 2, height / 2);
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
            } catch (e) {
                console.error("Error drawing space object background:", e);
            }
        } else {
            applyStarfieldBackground();
        }

        if (player) {
            try { player.draw(); } catch (e) { }
        }

        if (uiManager && player) {
            try {
                uiManager.drawShipyardMenu(player);
            } catch (e) {
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
            } catch (e) {
                console.error("Error drawing space object background:", e);
            }
        } else {
            applyStarfieldBackground();
        }

        if (player) {
            try { player.draw(); } catch (e) { }
        }

        if (uiManager && player) {
            try {
                uiManager.drawUpgradesMenu(player);
            } catch (e) {
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
            } catch (e) {
                console.error("Error drawing market screen:", e);
            }
        } else {
            background(10, 0, 0);
            fill(255);
            text("Error: Market data unavailable", width / 2, height / 2);
        }
    }

    /**
     * Draws VIEWING_MISSIONS state
     * @private
     */
    _drawMissions(player, currentSystem) {
        // Use the docked station (could be main OR secret station)
        const dockedStation = this.currentDockedStation || currentSystem?.station;

        // Fetch missions if not already fetched
        if (!this.currentStationMissions || this.currentStationMissions.length === 0) {
            // Use MissionGenerator directly with the docked station
            if (typeof MissionGenerator?.generateMissions === 'function' && dockedStation) {
                this.currentStationMissions = MissionGenerator.generateMissions(
                    currentSystem, dockedStation, galaxy, player
                );
            } else {
                this.currentStationMissions = [];
            }
            // Clear inactive mission IDs when new missions are generated
            // This ensures fresh missions aren't incorrectly marked as inactive
            if (uiManager && uiManager.inactiveMissionIds) {
                uiManager.inactiveMissionIds.clear();
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
                case "VIEWING_SHIP_DETAIL":
                    uiManager.drawShipDetailMenu(player);
                    break;
                case "VIEWING_UPGRADES":
                    uiManager.drawUpgradesMenu(player);
                    break;
                case "VIEWING_WEAPON_DETAIL":
                    uiManager.drawWeaponDetailMenu(player);
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
                case "VIEWING_NEWS":
                    uiManager.drawNewsMenu(player);
                    break;
                case "VIEWING_BASE":
                    uiManager.drawBaseMenu(player, uiManager.currentBaseObject);
                    break;
            }
        } catch (e) {
            console.error(`Error drawing ${this.currentState} menu:`, e);
        }
    }

    /**
     * Draws GALAXY_MAP state
     * @private
     */
    _drawGalaxyMapView(player, currentSystem) {
        // Draw background based on where player came from
        if (this._previousState === "SURFACE_MODE" && typeof surfaceMode !== 'undefined' && surfaceMode) {
            // Draw surface mode view as background when opened from surface
            try {
                surfaceMode.draw();
            } catch (e) {
                console.error("Error drawing surface mode behind galaxy map:", e);
            }
        } else if (currentSystem && player) {
            // Draw regular space view behind the map
            try {
                currentSystem.draw(player);
            } catch (e) {
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
            } catch (e) {
                console.error("Error drawing galaxy map:", e);
            }
        }

        // Draw HUD on top
        if (uiManager && player) {
            try {
                uiManager.drawHUD(player, currentSystem, true);
            } catch (e) {
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
            } catch (e) {
                console.error("ERROR in currentSystem.draw (Jumping):", e);
            }
        } else {
            applyStarfieldBackground();
        }

        // Draw jump charge UI (only if fade hasn't started)
        if (this.jumpFadeState === "NONE" && uiManager && player) {
            try {
                // Progress bar
                fill(0, 150, 255, 150);
                noStroke();
                const chargePercent = constrain(this.jumpChargeTimer / this.jumpChargeDuration, 0, 1);
                rect(0, height - 35, width * chargePercent, 35);

                // Jump charge shimmer: pulsing blue-white halo around the player ship
                if (player.pos && chargePercent > 0) {
                    const tx = width / 2 - player.pos.x;
                    const ty = height / 2 - player.pos.y;
                    const pulse = (sin(millis() * 0.012) + 1) * 0.5;  // ~1.9 Hz oscillation → 0..1
                    const haloR = player.size * (1.5 + chargePercent * 2.5 + pulse * 0.8);
                    const haloA = chargePercent * (60 + pulse * 60);

                    push();
                    translate(player.pos.x + tx, player.pos.y + ty);
                    blendMode(ADD);
                    noStroke();
                    // Outer shimmer ring
                    fill(80, 160, 255, haloA * 0.5);
                    ellipse(0, 0, haloR * 2.2, haloR * 2.2);
                    // Inner bright core
                    fill(160, 220, 255, haloA);
                    ellipse(0, 0, haloR * 1.2, haloR * 1.2);
                    // Sparkling white dot at full charge
                    if (chargePercent > 0.85) {
                        fill(255, 255, 255, (chargePercent - 0.85) / 0.15 * 180 * pulse);
                        ellipse(0, 0, haloR * 0.5, haloR * 0.5);
                    }
                    pop();
                }

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
                textSize(STATION_TEXT_SIZE.BODY);
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
        const state = this.currentState;
        if ((state === "IN_FLIGHT" || state === "SURFACE_MODE") && this.showingInventory) {
            inventoryScreen.draw(player);
        }
    }

    /**
     * Draws mission overlay if showing
     * @private
     */
    _drawMissionOverlay(player) {
        // Draw mission overlay in both flight and surface modes if active
        // Logic check simplified to prevent potential strict-mode scoping issues
        if ((this.currentState === "IN_FLIGHT" || this.currentState === "SURFACE_MODE") && this.showingMissionOverlay) {
            if (uiManager) uiManager.drawMissionOverlay(player);
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
            // Skip during jump/teleport - the white fade overlay covers loading
            if (typeof window === 'undefined' ||
                !window._planetBufferCreationTotal ||
                (window._planetBufferCreationCompleted || 0) >= window._planetBufferCreationTotal ||
                this.currentState === "JUMPING" ||
                this.jumpFadeState !== "NONE") {
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
                    fill(5, 5, 15);
                    rect(0, 0, width, height);
                    pop();
                }
            } catch (e) {
                push();
                noStroke();
                fill(5, 5, 15);
                rect(0, 0, width, height);
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
                textSize(STATION_TEXT_SIZE.BODY);
                const welcomeY = py + panelH * 0.26;
                text(`${systemName}   ${economy}   Tech: ${tech}   Security: ${security}`,
                    px + panelW * 0.5, welcomeY - 20);
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
            textSize(STATION_TEXT_SIZE.BODY);
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
        if (this.currentState === "JUMPING" || this.isJumpCharging || this.quantumGateTeleportPending) {
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
        this.quantumGateTeleportPending = false; // Fix: Clear any pending quantum teleport
        this.setState("JUMPING");
        if (typeof soundManager !== 'undefined') soundManager.playSound('jump'); // Start charging sound (use existing 'jump' definition)
    }

    /** Fetches missions for the current station and stores them for display. */
    fetchStationMissions(player) {
        const currentSystem = galaxy?.getCurrentSystem();
        // Use the tracked docked station (which could be main or secret station)
        const dockedStation = this.currentDockedStation || currentSystem?.station;
        if (dockedStation && galaxy && player) {
            MISSION_LOG("[GameStateManager] Fetching missions for", currentSystem?.name, dockedStation?.name);
            try {
                // Use MissionGenerator directly with the docked station
                if (typeof MissionGenerator?.generateMissions === 'function') {
                    this.currentStationMissions = MissionGenerator.generateMissions(currentSystem, dockedStation, galaxy, player);
                } else {
                    this.currentStationMissions = [];
                }
                MISSION_LOG("[GameStateManager] Missions fetched:", this.currentStationMissions);
                this.selectedMissionIndex = -1; return true;
            } catch (e) { console.error("Error during Mission generation:", e); this.currentStationMissions = []; return false; }
        }
        // console.warn("Cannot fetch missions - missing required objects/generator."); // Optional log
        this.currentStationMissions = []; return false;
    } // End fetchStationMissions

    /**
     * Legacy compatibility shim.
     * Delegate to saveLoadSystem.js so all callers use the current multi-slot format.
     */
    saveGame(slotIndex = globalThis.window.activeSaveSlotIndex) {
        const globalSaveGame = globalThis.saveGame;
        if (typeof globalSaveGame === 'function') {
            globalThis.window.activeSaveSlotIndex = slotIndex;
            globalSaveGame();
            return true;
        }
        return false;
    }

    /**
     * Legacy compatibility shim.
     * Delegate to saveLoadSystem.js so all callers use the current multi-slot format.
     */
    loadGame(slotIndex = globalThis.window.activeSaveSlotIndex) {
        const globalLoadGame = globalThis.loadGame;
        if (typeof globalLoadGame === 'function') {
            return !!globalLoadGame(slotIndex);
        }
        return false;
    }

    // Add a method to toggle the inventory screen
    toggleInventory() {
        if (this.currentState === "IN_FLIGHT") {
            this.showingInventory = !this.showingInventory;
            if (this.showingInventory) this.showingMissionOverlay = false; // Close mission overlay if opening inventory
            return true;
        }
        return false;
    }

    // Add a method to toggle the mission overlay screen
    toggleMissionOverlay() {
        if (this.currentState === "IN_FLIGHT" || this.currentState === "SURFACE_MODE") {
            this.showingMissionOverlay = !this.showingMissionOverlay;
            if (this.showingMissionOverlay) this.showingInventory = false; // Close inventory if opening mission overlay
            return true;
        }
        return false;
    }

} // End of GameStateManager Class
if (typeof module !== 'undefined') {
    module.exports = { GameStateManager };
}
