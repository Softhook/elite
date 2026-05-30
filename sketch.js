// ****** sketch.js ******
// Main entry point for Elite p5.js game

// --- Global Constants ---
const OFFSCREEN_VOLUME_REDUCTION_FACTOR = 0.1;
const SHIELD_RECHARGE_RATE_MULTIPLIER = 4.0;

/**
 * Returns true if the player is currently in a ship-control state
 * (flying in space or piloting on a planetary surface).
 * Replaces the repeated inline check pattern throughout the file.
 * @returns {boolean}
 */
function isShipControlState() {
    if (!gameStateManager) return false;
    const state = gameStateManager.currentState;
    if (state === 'IN_FLIGHT') return true;
    if (state === 'SURFACE_MODE' && surfaceMode && surfaceMode.controlMode === 'SHIP') return true;
    return false;
}

// --- Global Game State ---
const GameGlobals = {
    player: null,
    galaxy: null,
    uiManager: null,
    gameStateManager: null,
    soundManager: null,
    ambientSoundManager: null,
    stationMusicManager: null,
    titleScreen: null,
    saveSelectionScreen: null,
    inventoryScreen: null,
    inputManager: null,
    eventManager: null,
    communicationSystem: null,
    newsManager: null,
    font: null,
    loadGameWasSuccessful: false,
    globalSessionSeed: null
};

// Maintain backward compatibility with existing code
let player, galaxy, uiManager, gameStateManager, soundManager, ambientSoundManager,
    titleScreen, font, inventoryScreen, missionOverlay, eventManager, communicationSystem, saveSelectionScreen,
    stationMusicManager, spaceMusicManager, inputManager;
let loadGameWasSuccessful = false;
let globalSessionSeed;

window.activeSaveSlotIndex = 0;

// --- p5.js Preload Function ---
function preload() {
    try {
        font = loadFont('libraries/Frontier.ttf');
        GameGlobals.font = font;
    } catch (error) {
        console.error('Failed to load font:', error);
        font = null;
    }
}

// --- p5.js Setup Function ---
function setup() {
    try {
        initializeCanvas();
        initializeManagers();
        initializeWeaponSystem();
        validateShipDefinitions();
        initializeGameObjects();
        configurePlayerShip();
        setInitialGameState();
        setupAudioGestures();
        initializeGamepad();

        UI_LOG("--- Setup Complete ---");
    } catch (error) {
        handleCriticalSetupError(error);
    }
}

/**
 * Initialize the gamepad manager for controller support
 */
function initializeGamepad() {
    try {
        if (typeof initGamepad === 'function') {
            window._gamepadManager = initGamepad();
            if (typeof InputManager === 'function') {
                inputManager = new InputManager(window._gamepadManager);
                window._inputManager = inputManager;
                GameGlobals.inputManager = inputManager;
            }
            UI_LOG("Gamepad manager initialized");
        }
    } catch (e) {
        console.warn('Failed to initialize gamepad:', e);
    }
}

/**
 * Initialize the p5.js canvas and rendering settings
 */
function initializeCanvas() {
    pixelDensity(displayDensity());  // Use native pixel density for retina/high-DPI displays
    createCanvas(windowWidth, windowHeight);
    angleMode(RADIANS);
    textAlign(CENTER, CENTER);
    textSize(STATION_TEXT_SIZE.SMALL);
    frameRate(144); // Allow high refresh rate monitors to run at native speed (up to 144fps)
    UI_LOG("Setting up Elite MVP...");
}

/**
 * Initialize core game managers
 */
function initializeManagers() {
    soundManager = new SoundManager();
    ambientSoundManager = new AmbientSoundManager();
    stationMusicManager = new StationMusicManager();
    spaceMusicManager = new SpaceMusicManager();
    eventManager = new EventManager();

    Object.assign(GameGlobals, {
        soundManager,
        ambientSoundManager,
        stationMusicManager,
        spaceMusicManager,
        eventManager
    });
}

/**
 * Initialize weapon system pools
 */
function initializeWeaponSystem() {
    if (typeof WeaponSystem !== 'undefined' && typeof ObjectPool !== 'undefined') {
        UI_LOG("Initializing weapon system pool in p5.js setup()");
        WeaponSystem.init(100);
    } else {
        console.warn("WeaponSystem or ObjectPool not available during setup");
    }
}

/**
 * Validate that ship definitions loaded correctly
 * @throws {Error} If ship definitions are missing
 */
function validateShipDefinitions() {
    if (typeof SHIP_DEFINITIONS === 'undefined') {
        throw new Error("FATAL ERROR: SHIP_DEFINITIONS not loaded from ships.js! Check file inclusion order in index.html.");
    }
}

/**
 * Initialize main game objects
 */
function initializeGameObjects() {
    gameStateManager = new GameStateManager();
    galaxy = new Galaxy();
    player = new Player();
    uiManager = new UIManager();
    titleScreen = new TitleScreen();
    inventoryScreen = new InventoryScreen();
    missionOverlay = new MissionOverlay();
    saveSelectionScreen = new SaveSelectionScreen();
    communicationSystem = new CommunicationSystem();
    GameGlobals.newsManager = new NewsManager();

    // Initialize communication system with references
    communicationSystem.initialize({ uiManager, player });
    communicationSystem.initializeSpeech(); // Enable speech synthesis

    Object.assign(GameGlobals, {
        gameStateManager,
        galaxy,
        player,
        uiManager,
        titleScreen,
        inventoryScreen,
        missionOverlay,
        saveSelectionScreen,
        communicationSystem
    });
}

/**
 * Apply ship definition properties to player
 */
function configurePlayerShip() {
    if (player && typeof player.applyShipDefinition === 'function') {
        player.applyShipDefinition(player.shipTypeName);
    } else {
        throw new Error("FATAL ERROR: Player object or applyShipDefinition method missing!");
    }
}

/**
 * Set the initial game state
 */
function setInitialGameState() {
    loadGameWasSuccessful = false;
    GameGlobals.loadGameWasSuccessful = false;

    if (gameStateManager) {
        if (gameStateManager.currentState === "LOADING") {
            gameStateManager.setState("TITLE_SCREEN");
        }
        UI_LOG(`Setup complete, game state: ${gameStateManager.currentState}`);
    } else {
        throw new Error("Cannot set initial state - gameStateManager missing!");
    }
}

/**
 * Setup audio context resume on user gesture
 */
function setupAudioGestures() {
    try {
        window.addEventListener('pointerdown', function _resumeAudioOnce() {
            if (window._eliteAudioContext && typeof window._eliteAudioContext.resume === 'function') {
                window._eliteAudioContext.resume().then(() => {
                    console.log('User gesture: AudioContext resumed');
                    rebuildAmbientSounds();
                }).catch(e => console.warn('AudioContext.resume() failed on user gesture', e));
            }
        }, { once: true });
    } catch (e) {
        console.warn('Failed to setup audio gesture handler:', e);
    }
}

/**
 * Rebuild ambient sounds for current system
 */
function rebuildAmbientSounds() {
    try {
        const sys = galaxy?.getCurrentSystem?.();
        if (sys && typeof sys.rebuildAmbientSounds === 'function') {
            sys.rebuildAmbientSounds();
            console.log('Rebuilt ambient sounds for current system after audio unlock');
        }
    } catch (e) {
        console.warn('Error rebuilding ambient sounds after resume', e);
    }
}

/**
 * Handle critical setup errors
 * @param {Error} error - The error that occurred
 */
function handleCriticalSetupError(error) {
    console.error("Critical setup error:", error);
    background(0);
    fill(255, 0, 0);
    textSize(STATION_TEXT_SIZE.BODY);
    text("ERROR: Failed to load game!\nCheck console.", width / 2, height / 2);
    noLoop();
}


// --- p5.js Draw Function ---
function draw() {
    // Use starfield background color for consistency (fallback if config not available)
    const bg = (typeof STARFIELD_CONFIG !== 'undefined') ? STARFIELD_CONFIG.BACKGROUND_COLOR : { r: 10, g: 15, b: 40 };
    background(bg.r, bg.g, bg.b);

    // Clamp deltaTime to max of 100ms (10fps) to prevent physics explosions on lag spikes
    // This is crucial for high-FPS configurations to remain stable
    if (deltaTime > 100) {
        window.deltaTime = 100;
    }

    if (!validateGameState()) {
        return;
    }

    const currentState = gameStateManager.currentState;

    updateTitleScreens(currentState);
    updateGameState();
    handleGamepadContinuousInput();
    handleContinuousFiring();
    renderGameState();
    renderUI();
}

/**
 * Validate that core game objects exist
 * @returns {boolean} True if valid, false otherwise
 */
function validateGameState() {
    if (!gameStateManager || !player) {
        showCriticalError("Error: Game State Manager or Player missing!");
        console.error("CRITICAL ERROR: gameStateManager or Player missing in draw()!");
        noLoop();
        return false;
    }
    return true;
}

/**
 * Update title screen animations
 * @param {string} currentState - Current game state
 */
function updateTitleScreens(currentState) {
    if (currentState === "TITLE_SCREEN" || currentState === "INSTRUCTIONS") {
        titleScreen?.update(deltaTime);
    } else if (currentState === "SAVE_SELECTION") {
        saveSelectionScreen?.update(deltaTime);
    }
}

/**
 * Update game state logic
 */
function updateGameState() {
    try {
        gameStateManager.update(player);
        if (typeof spaceMusicManager !== 'undefined' && spaceMusicManager) {
            spaceMusicManager.update();
        }
        updateEventManager();
        performPeriodicTasks();
    } catch (e) {
        showCriticalError(`ERROR in Update/Draw Loop!\nCheck Console.\n${e.message}`);
        console.error("!!! ERROR during gameStateManager update/draw:", e);
        noLoop();
    }
}

/**
 * Update event manager for active game states
 */
function updateEventManager() {
    const currentState = gameStateManager.currentState;
    const activeGameStates = ["IN_FLIGHT", "DOCKED", "JUMPING", "GALAXY_MAP"];

    if (!activeGameStates.includes(currentState) || !eventManager) {
        return;
    }

    const currentSystem = galaxy?.getCurrentSystem();
    if (!currentSystem) return;

    // Initialize event manager references if needed
    if (eventManager.starSystem !== currentSystem || eventManager.player !== player) {
        eventManager.initializeReferences(currentSystem, player, uiManager);
    }

    // Update event manager only during active flight
    if (currentState === "IN_FLIGHT" && eventManager.starSystem) {
        eventManager.update();
    }
}

/**
 * Perform periodic background tasks
 */
let _lastCommunicationCleanup = 0;
let _lastFactionMessage = 0;
let _lastNewsUpdate = 0;

function performPeriodicTasks() {
    const now = millis();

    // Communication system cleanup every ~60 seconds
    if (now - _lastCommunicationCleanup > 60000 && communicationSystem) {
        communicationSystem.performPeriodicCleanup?.();
        _lastCommunicationCleanup = now;
    }

    // Faction motivation messages every ~2 minutes
    if (now - _lastFactionMessage > 120000 && communicationSystem) {
        communicationSystem.sendFactionMotivationMessage?.();
        _lastFactionMessage = now;
    }

    // Update news manager for galaxy-wide news generation (every ~30 seconds)
    if (now - _lastNewsUpdate > 30000 && GameGlobals.newsManager && galaxy) {
        GameGlobals.newsManager.update(galaxy);
        _lastNewsUpdate = now;
    }
}

function getActiveInputContext() {
    if (!inputManager || !gameStateManager) return null;
    const state = gameStateManager.currentState;
    const isSurfaceShipControl = state === 'SURFACE_MODE' && surfaceMode?.controlMode === 'SHIP';
    const isSurfaceAstronautControl = state === 'SURFACE_MODE' && surfaceMode?.controlMode === 'ASTRONAUT';
    return inputManager.resolveContext({
        gameState: state,
        showingMissionOverlay: !!gameStateManager.showingMissionOverlay,
        showingInventory: !!gameStateManager.showingInventory,
        isSurfaceShipControl,
        isSurfaceAstronautControl
    });
}

function executeInputAction(action, context) {
    switch (action) {
        case INPUT_ACTIONS.CONFIRM:
            if (context === INPUT_CONTEXTS.TITLE) {
                titleScreen?.handleClick();
                return true;
            }
            if (context === INPUT_CONTEXTS.INSTRUCTIONS) {
                gameStateManager.setState('SAVE_SELECTION');
                soundManager?.playSound('click');
                return true;
            }
            if (context === INPUT_CONTEXTS.SAVE_SELECTION) {
                saveSelectionScreen?.handleKeyPressed('\n', ENTER);
                return true;
            }
            if (context === INPUT_CONTEXTS.GAME_OVER) {
                if (typeof resetGame === 'function') resetGame();
                return true;
            }
            if (context === INPUT_CONTEXTS.GALAXY_MAP) {
                _handleGalaxyMapSelection();
                return true;
            }
            if (context === INPUT_CONTEXTS.STATION_MENU) {
                return dispatchStationMenuKeyboardAction(INPUT_ACTIONS.CONFIRM);
            }
            return false;
        case INPUT_ACTIONS.BACK:
            if (context === INPUT_CONTEXTS.INSTRUCTIONS) {
                gameStateManager.setState('TITLE_SCREEN');
                return true;
            }
            if (context === INPUT_CONTEXTS.SAVE_SELECTION) {
                saveSelectionScreen?.handleKeyPressed(null, ESCAPE);
                return true;
            }
            if (context === INPUT_CONTEXTS.MISSION_OVERLAY) {
                gameStateManager.toggleMissionOverlay();
                soundManager?.playSound('click');
                return true;
            }
            if (context === INPUT_CONTEXTS.INVENTORY) {
                return handleInventoryToggle();
            }
            if (context === INPUT_CONTEXTS.GALAXY_MAP) {
                const returnState = gameStateManager._previousState || 'IN_FLIGHT';
                gameStateManager.setState(returnState);
                gameStateManager._previousState = null;
                if (uiManager?.galaxyMap) uiManager.galaxyMap.gamepadSelectedIndex = -1;
                soundManager?.playSound('mapClose');
                return true;
            }
            if (context === INPUT_CONTEXTS.STATION_MENU) {
                return dispatchStationMenuKeyboardAction(INPUT_ACTIONS.BACK);
            }
            return false;
        case INPUT_ACTIONS.NAV_UP:
            if (context === INPUT_CONTEXTS.STATION_MENU) {
                return dispatchStationMenuKeyboardAction(INPUT_ACTIONS.NAV_UP);
            }
            if (context === INPUT_CONTEXTS.MISSION_OVERLAY && missionOverlay) {
                missionOverlay.scrollOffset = Math.max(0, missionOverlay.scrollOffset - 24);
                return true;
            }
            return false;
        case INPUT_ACTIONS.NAV_DOWN:
            if (context === INPUT_CONTEXTS.STATION_MENU) {
                return dispatchStationMenuKeyboardAction(INPUT_ACTIONS.NAV_DOWN);
            }
            if (context === INPUT_CONTEXTS.MISSION_OVERLAY && missionOverlay) {
                missionOverlay.scrollOffset = Math.min(
                    missionOverlay.maxScroll || 0,
                    missionOverlay.scrollOffset + 24
                );
                return true;
            }
            return false;
        case INPUT_ACTIONS.NAV_LEFT:
            if (context === INPUT_CONTEXTS.STATION_MENU) {
                return dispatchStationMenuKeyboardAction(INPUT_ACTIONS.NAV_LEFT);
            }
            return false;
        case INPUT_ACTIONS.NAV_RIGHT:
            if (context === INPUT_CONTEXTS.STATION_MENU) {
                return dispatchStationMenuKeyboardAction(INPUT_ACTIONS.NAV_RIGHT);
            }
            return false;
        case INPUT_ACTIONS.TOGGLE_INVENTORY: return handleInventoryToggle();
        case INPUT_ACTIONS.TOGGLE_MAP: return handleMapToggle();
        case INPUT_ACTIONS.TOGGLE_MISSION: return handleMissionOverlayToggle();
        case INPUT_ACTIONS.TOGGLE_SECRET_NAV: return handleSecretBaseNavigation();
        case INPUT_ACTIONS.TOGGLE_WANTED: return handleWantedToggle();
        case INPUT_ACTIONS.AUTOPILOT_PLANET: return handleAutopilot('h');
        case INPUT_ACTIONS.AUTOPILOT_SERVICE: return handleAutopilot('j');
        case INPUT_ACTIONS.MINIMAP_ZOOM_IN: return handleMinimapZoomIn();
        case INPUT_ACTIONS.MINIMAP_ZOOM_OUT: return handleMinimapZoomOut();
        case INPUT_ACTIONS.ACTIVATE_CLOAK: return handleCloakActivation();
        case INPUT_ACTIONS.SURFACE_DESCENT: return handleSurfaceDescent();
        case INPUT_ACTIONS.MAP_MARKET_TOGGLE:
            if (gameStateManager.currentState !== 'GALAXY_MAP') return false;
            const targetIdx = uiManager?.galaxyMap?.gamepadSelectedIndex ?? -1;
            if (targetIdx === -1) return false;
            const systems = galaxy?.getSystemDataForMap ? galaxy.getSystemDataForMap() : [];
            const sysData = systems[targetIdx];
            const isCurrent = (targetIdx === galaxy?.currentSystemIndex);
            if (sysData && (sysData.visited || isCurrent)) {
                if (uiManager.marketOverlaySystemIndex === targetIdx) {
                    uiManager.marketOverlaySystemIndex = -1;
                    soundManager?.playSound('click_off');
                } else {
                    uiManager.marketOverlaySystemIndex = targetIdx;
                    soundManager?.playSound('click');
                }
            } else {
                uiManager?.addMessage("Market data unavailable.", [255, 150, 150]);
                soundManager?.playSound('error');
            }
            return true;
        case INPUT_ACTIONS.FIRE_PRIMARY:
            player?.handleFireInput?.();
            return true;
        case INPUT_ACTIONS.LAUNCH_ESCAPE_CAPSULE:
            if (isShipControlState()) {
                handleEjectEscapePod();
                return true;
            }
            return false;
        case INPUT_ACTIONS.ACTIVATE_BURST:
            return handleSpeedBurstActivation();
        case INPUT_ACTIONS.WEAPON_SLOT_1:
        case INPUT_ACTIONS.WEAPON_SLOT_2:
        case INPUT_ACTIONS.WEAPON_SLOT_3:
        case INPUT_ACTIONS.WEAPON_SLOT_4:
        case INPUT_ACTIONS.WEAPON_SLOT_5:
        case INPUT_ACTIONS.WEAPON_SLOT_6:
        case INPUT_ACTIONS.WEAPON_SLOT_7:
        case INPUT_ACTIONS.WEAPON_SLOT_8:
        case INPUT_ACTIONS.WEAPON_SLOT_9:
            return handleWeaponSlotSelection(action);
        default:
            return false;
    }
}

function handleWeaponSlotSelection(action) {
    if (!isShipControlState() || !player) return false;

    const requestedSlot = parseInt(action.slice(-1), 10);
    if (isNaN(requestedSlot) || requestedSlot < 1 || requestedSlot > 9) return false;

    const weaponIndex = requestedSlot - 1;
    if (Array.isArray(player.weapons) && weaponIndex < player.weapons.length) {
        if (player.switchToWeapon(weaponIndex)) {
            WEAPON_LOG(`Switched to weapon: ${player.currentWeapon.name}`);
            soundManager?.playSound('click');
        }
    }
    return true;
}

/**
 * Create a gamepad proxy object from a keyboard action.
 * Used to unify keyboard and gamepad input into a single menu navigation handler.
 * @param {string} action - INPUT_ACTIONS enum value
 * @returns {Object} Proxy gamepad object with pressed() method
 */
function _createGamepadProxyFromAction(action) {
    return {
        state: { ls: { x: 0, y: 0 } },
        prevState: { ls: { x: 0, y: 0 } },
        pressed(inputName) {
            // Map action back to button name
            const actionToButton = {
                [INPUT_ACTIONS.CONFIRM]: 'a',
                [INPUT_ACTIONS.BACK]: 'b',
                [INPUT_ACTIONS.NAV_UP]: 'dpad.up',
                [INPUT_ACTIONS.NAV_DOWN]: 'dpad.down',
                [INPUT_ACTIONS.NAV_LEFT]: 'dpad.left',
                [INPUT_ACTIONS.NAV_RIGHT]: 'dpad.right'
            };
            return inputName === actionToButton[action];
        },
        released(inputName) {
            return false;
        }
    };
}

function dispatchStationMenuKeyboardAction(action) {
    if (typeof _handleGamepadStationMenus !== 'function' || !gameStateManager) return false;

    const proxy = _createGamepadProxyFromAction(action);
    _handleGamepadStationMenus(proxy, gameStateManager.currentState);
    return true;
}

/**
 * Handle continuous firing when space is held (keyboard or gamepad)
 */
function handleContinuousFiring() {
    const context = getActiveInputContext();
    const gpFiring = !!(inputManager && context && inputManager.isGamepadActionHeld(INPUT_ACTIONS.FIRE_PRIMARY, context));
    const isFiring = isShipControlState() && !player.destroyed && (keyIsDown(32) || gpFiring);

    // ── Twin-stick beam aiming update ──
    // Runs every frame to maintain smooth aim tracking and reticle fade.
    // Only activates the aim angle when actually firing a beam weapon.
    const hasBeam = !!(player?.currentWeapon?.type === WEAPON_TYPE.BEAM);
    const gpConnected = !!(window._gamepadManager?.connected);
    if (inputManager && gpConnected) {
        inputManager.updateBeamAim(isFiring && hasBeam && gpFiring, player, deltaTime || 16.67);
    }

    if (isFiring) {
        player.handleFireInput();
    }
}

/**
 * Handle gamepad continuous input (sticks & triggers → movement)
 * p5.js keyIsDown() doesn't see synthetic KeyboardEvents, so we must
 * directly inject movement by calling player methods from stick state.
 */
function handleGamepadContinuousInput() {
    const gp = window._gamepadManager;
    if (!gp || !gp.state || !player || !inputManager) return;

    const state = gameStateManager.currentState;
    if (player.destroyed && state !== 'GAME_OVER') return;
    const s = gp.state;
    const context = getActiveInputContext();

    if (context !== INPUT_CONTEXTS.STATION_MENU && inputManager.isGamepadActionPressed(INPUT_ACTIONS.CONFIRM, context)) {
        executeInputAction(INPUT_ACTIONS.CONFIRM, context);
    }
    if (context !== INPUT_CONTEXTS.STATION_MENU && inputManager.isGamepadActionPressed(INPUT_ACTIONS.BACK, context)) {
        executeInputAction(INPUT_ACTIONS.BACK, context);
    }

    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TOGGLE_MAP, context)) executeInputAction(INPUT_ACTIONS.TOGGLE_MAP, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TOGGLE_INVENTORY, context)) executeInputAction(INPUT_ACTIONS.TOGGLE_INVENTORY, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TOGGLE_MISSION, context)) executeInputAction(INPUT_ACTIONS.TOGGLE_MISSION, context);

    if (context === INPUT_CONTEXTS.SAVE_SELECTION) {
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_UP, context)) saveSelectionScreen?.handleKeyPressed(null, UP_ARROW);
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_DOWN, context)) saveSelectionScreen?.handleKeyPressed(null, DOWN_ARROW);
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_LEFT, context)) saveSelectionScreen?.handleKeyPressed(null, LEFT_ARROW);
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_RIGHT, context)) saveSelectionScreen?.handleKeyPressed(null, RIGHT_ARROW);
        return;
    }

    if (context === INPUT_CONTEXTS.STATION_MENU) {
        _handleGamepadStationMenus(gp, state);
        return;
    }

    if (context === INPUT_CONTEXTS.MISSION_OVERLAY) {
        if (missionOverlay) {
            const scrollSpeed = 8;
            if (Math.abs(s.rs.y) > 0.1) {
                missionOverlay.scrollOffset += s.rs.y * scrollSpeed;
            } else if (inputManager.isGamepadActionHeld(INPUT_ACTIONS.NAV_UP, context)) {
                missionOverlay.scrollOffset -= scrollSpeed;
            } else if (inputManager.isGamepadActionHeld(INPUT_ACTIONS.NAV_DOWN, context)) {
                missionOverlay.scrollOffset += scrollSpeed;
            }
            missionOverlay.scrollOffset = Math.min(
                Math.max(missionOverlay.scrollOffset, 0),
                missionOverlay.maxScroll || 0
            );
        }
        return;
    }

    if (context === INPUT_CONTEXTS.INVENTORY) {
        if (typeof _handleGamepadInventory === 'function') {
            _handleGamepadInventory(gp, player, inventoryScreen);
        }
        return;
    }

    if (context === INPUT_CONTEXTS.GALAXY_MAP) {
        if (uiManager?.galaxyMap && galaxy) {
            if (uiManager.galaxyMap.gamepadSelectedIndex === -1) {
                uiManager.galaxyMap.gamepadSelectedIndex = galaxy.currentSystemIndex;
            }
            if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.MAP_MARKET_TOGGLE, context)) {
                executeInputAction(INPUT_ACTIONS.MAP_MARKET_TOGGLE, context);
            }

            let dx = 0, dy = 0;
            if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_UP, context)) dy = -1;
            else if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_DOWN, context)) dy = 1;
            else if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_LEFT, context)) dx = -1;
            else if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_RIGHT, context)) dx = 1;

            if (dx === 0 && dy === 0) {
                const sPrev = gp.previousState;
                if (sPrev) {
                    if (s.ls.y < -0.5 && sPrev.ls.y >= -0.5) dy = -1;
                    else if (s.ls.y > 0.5 && sPrev.ls.y <= 0.5) dy = 1;
                    else if (s.ls.x < -0.5 && sPrev.ls.x >= -0.5) dx = -1;
                    else if (s.ls.x > 0.5 && sPrev.ls.x <= 0.5) dx = 1;
                }
            }

            if (dx !== 0 || dy !== 0) _handleGalaxyMapHopping(dx, dy);
        }
        return;
    }

    // ── In-flight / Surface ship control: analog sticks → movement ──
    if (!isShipControlState()) return;

    // Read analog values
    const shipControls = inputManager.getGamepadShipControls(context);
    const lsX = shipControls.strafeX;
    const lsY = shipControls.thrustY;
    const rsX = shipControls.rotateX;
    const rsY = shipControls.rotateY;
    const r2Val = shipControls.forwardThrottle;

    const rotTimeScale = (typeof deltaTime === 'number') ? deltaTime / 16.67 : 1;
    // Use the same thresholds as the actual control logic so autopilot disengages
    // exactly when control input becomes active — no earlier, no later.
    const rsMag = Math.sqrt(rsX * rsX + rsY * rsY);
    const lsMag = Math.sqrt(lsX * lsX + lsY * lsY);
    const hasGamepadInput = rsMag > 0.08 || lsMag > 0.05 || r2Val > 0.08;

    // Disable autopilot on gamepad input
    if (player.autopilotEnabled && hasGamepadInput) {
        player.disableAutopilot();
        uiManager?.addMessage('Autopilot disengaged: On manual control');
    }

    // Right stick: world-space aim — steer the ship toward the direction the stick points.
    // Pushing right → ship turns to face right; pushing up → turns to face up.
    // The angular error drives rotation each frame, capped at rotationSpeed so the ship
    // never snaps instantly. Stick magnitude scales the maximum turn authority so
    // gentle deflections give finer steering.
    if (rsMag > 0.08) {
        const targetAngle = Math.atan2(rsY, rsX);
        let err = targetAngle - player.angle;
        // Normalise to [-PI, PI] for shortest-arc rotation
        while (err > Math.PI) err -= 2 * Math.PI;
        while (err < -Math.PI) err += 2 * Math.PI;
        const maxTurn = player.rotationSpeed * rotTimeScale * rsMag;
        player.angle += Math.sign(err) * Math.min(Math.abs(err), maxTurn);
    }

    // Left stick: world-space (screen-space) omnidirectional movement.
    // Decompose the stick vector into ship-local axes so that pushing the stick
    // up always moves the ship toward the top of the screen regardless of heading.
    //   fwd   = dot((lsX, lsY), ship-facing (cos a, sin a))
    //   right = dot((lsX, lsY), ship-right  (-sin a, cos a))
    const isTargetSelectionMode = (state === 'IN_FLIGHT') && inputManager?.isTargetSelectionModeEnabled?.();
    let stickForwardAmount = 0, stickReverseAmount = 0;
    if (!isTargetSelectionMode && (Math.abs(lsX) > 0.05 || Math.abs(lsY) > 0.05)) {
        const cosA = cos(player.angle), sinA = sin(player.angle);
        const fwd   =  lsX * cosA + lsY * sinA;
        const right = -lsX * sinA + lsY * cosA;

        stickForwardAmount = Math.max(0,  fwd);
        stickReverseAmount = Math.max(0, -fwd);

        // Strafe from the perpendicular (world-right) component
        if (Math.abs(right) > 0.1) {
            const strafeStrength = Math.max(0.2, Math.abs(right)) * 0.4;
            if (right < 0) player.kiteLeft(strafeStrength);
            else player.kiteRight(strafeStrength);
            player.isStrafing = true;
        }
    }

    // Combine stick world-forward component with trigger forward
    const forwardAmount = Math.max(stickForwardAmount, r2Val);
    const reverseAmount = stickReverseAmount;

    if (forwardAmount > 0.08) {
        player.isThrusting = true;
        player.thrust(forwardAmount);
    } else if (reverseAmount > 0.08) {
        player.isThrusting = true;
        player.isReverseThrusting = true;
        player.reverseThrust(PLAYER_CONFIG.REVERSE_THRUST_MULTIPLIER * reverseAmount);
    }

    // Surface mode altitude from bumpers
    if (state === 'SURFACE_MODE' && surfaceMode) {
        if (inputManager.isGamepadActionHeld(INPUT_ACTIONS.ALTITUDE_UP, context)) surfaceMode.altitudeInput = 1;
        else if (inputManager.isGamepadActionHeld(INPUT_ACTIONS.ALTITUDE_DOWN, context)) surfaceMode.altitudeInput = -1;
        else if (!keyIsDown(90) && !keyIsDown(88)) { // Only reset if keyboard Z/X not held
            surfaceMode.altitudeInput = 0;
        }
    }

    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.ACTIVATE_CLOAK, context)) executeInputAction(INPUT_ACTIONS.ACTIVATE_CLOAK, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.MINIMAP_ZOOM_IN, context)) executeInputAction(INPUT_ACTIONS.MINIMAP_ZOOM_IN, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.MINIMAP_ZOOM_OUT, context)) executeInputAction(INPUT_ACTIONS.MINIMAP_ZOOM_OUT, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.ACTIVATE_BURST, context)) executeInputAction(INPUT_ACTIONS.ACTIVATE_BURST, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.LAUNCH_ESCAPE_CAPSULE, context)) executeInputAction(INPUT_ACTIONS.LAUNCH_ESCAPE_CAPSULE, context);

    // Weapon switching available in space and surface ship mode
    if (isShipControlState()) {
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.WEAPON_NEXT, context) && player.weapons && player.weapons.length > 1) {
            const nextIdx = (player.weaponIndex + 1) % player.weapons.length;
            if (player.switchToWeapon(nextIdx)) {
                soundManager?.playSound('click');
            }
        } else if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.WEAPON_PREV, context) && player.weapons && player.weapons.length > 1) {
            const prevIdx = (player.weaponIndex - 1 + player.weapons.length) % player.weapons.length;
            if (player.switchToWeapon(prevIdx)) {
                soundManager?.playSound('click');
            }
        }
    }

    // Flight-only shortcuts
    if (state === 'IN_FLIGHT') {
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TOGGLE_TARGET_SELECTION_MODE, context)) {
            const enabled = inputManager.toggleTargetSelectionMode();
            uiManager?.addMessage(
                enabled ? 'Target selection mode: Left Stick' : 'Target selection mode: OFF',
                enabled ? [120, 255, 160] : [200, 200, 200]
            );
            soundManager?.playSound('click');
        }

        if (inputManager.isTargetSelectionModeEnabled?.()) {
            const targetDirection = inputManager.consumeTargetSelectionStickDirection(lsX, lsY);
            if (targetDirection && typeof player.selectTargetByDirection === 'function') {
                player.selectTargetByDirection(targetDirection.x, targetDirection.y);
            }
        }

        // Target cycling with D-pad up/down is flight-only (surface D-pad up/down controls altitude).
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TARGET_NEXT, context)) {
            player.cycleTarget(1);
        } else if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TARGET_PREV, context)) {
            player.cycleTarget(-1);
        }

        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.SURFACE_DESCENT, context)) executeInputAction(INPUT_ACTIONS.SURFACE_DESCENT, context);
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.AUTOPILOT_PLANET, context)) executeInputAction(INPUT_ACTIONS.AUTOPILOT_PLANET, context);
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.AUTOPILOT_SERVICE, context)) executeInputAction(INPUT_ACTIONS.AUTOPILOT_SERVICE, context);
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TOGGLE_SECRET_NAV, context)) executeInputAction(INPUT_ACTIONS.TOGGLE_SECRET_NAV, context);
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TOGGLE_WANTED, context)) executeInputAction(INPUT_ACTIONS.TOGGLE_WANTED, context);
    }
}

/**
 * Handle gamepad input for station menus (docked states).
 * Uses indexed button selection: D-pad navigates, A confirms, B goes back.
 * The system reads the live button area arrays from uiManager to know what's clickable.
 */

// Gamepad station menu navigation is in gamepadMenuNavigation.js

/**
 * Render current game state visuals
 */
function renderGameState() {
    try {
        gameStateManager.draw(player);
    } catch (e) {
        console.error("Error rendering game state:", e);
    }
}

/**
 * Render UI elements
 */
function renderUI() {
    if (gameStateManager.currentState === "VIEWING_MARKET" && uiManager) {
        uiManager.checkMarketButtonHeld(player.currentSystem?.station?.getMarket(), player);
    }

    // Screen-space lighting effects (damage flash, etc.) drawn before HUD
    if (typeof LightingEffects !== 'undefined') {
        LightingEffects.drawScreenEffects();
    }

    uiManager?.drawFramerate();    // fps cap removed for frame-rate independence
    uiManager?.drawMessages();

    // Draw gamepad menu highlight if applicable (must be after game state renders UI)
    if (window._gamepadManager && window._gamepadManager.connected) {
        const state = gameStateManager.currentState;
        const isStationState = STATION_STATES && STATION_STATES.includes(state);
        if (isStationState) {
            let highlightBtn = null;
            if (state === 'VIEWING_MISSIONS') {
                if (_gpMissionPanel === 'list') {
                    const lb = uiManager?.missionListButtonAreas || [];
                    if (lb.length > 0) highlightBtn = lb[constrain(_gpMenuIndex, 0, lb.length - 1)];
                } else {
                    // Match the sorting used in _handleGamepadMissions: action buttons first, back last
                    const detailButtonsObj = uiManager?.missionDetailButtonAreas || {};
                    const db = Object.entries(detailButtonsObj)
                        .sort(([key]) => key === 'back' ? 1 : -1)
                        .map(([, btn]) => btn)
                        .filter(b => b && b.w > 0);
                    if (db.length > 0) highlightBtn = db[constrain(_gpMissionDetailIndex, 0, db.length - 1)];
                }
            } else {
                const buttons = _getButtonAreasForState(state);
                if (buttons && buttons.length > 0 && _gpMenuIndex < buttons.length) {
                    highlightBtn = buttons[_gpMenuIndex];
                }
            }
            if (highlightBtn) _drawGamepadMenuHighlight(highlightBtn);
        }
    }
}

/**
 * Displays a critical error message on the screen
 * @param {string} msg - The error message to display
 */
function showCriticalError(msg) {
    fill(255, 0, 0);
    textSize(STATION_TEXT_SIZE.BODY);
    textAlign(CENTER, CENTER);
    noStroke();
    text(msg, width / 2, height / 2);
}

// --- Input Handling Functions ---

/**
 * Main keyboard input handler
 */
function keyPressed() {
    // Handle surface mode keys first when in surface mode
    if (handleSurfaceModeKeys()) return false;

    const context = getActiveInputContext();
    const mappedAction = inputManager?.getKeyboardAction(key, keyCode, context);
    if (mappedAction) {
        if (mappedAction === INPUT_ACTIONS.NAV_UP || mappedAction === INPUT_ACTIONS.NAV_DOWN) {
            if (context === INPUT_CONTEXTS.SAVE_SELECTION) {
                saveSelectionScreen?.handleKeyPressed(null, mappedAction === INPUT_ACTIONS.NAV_UP ? UP_ARROW : DOWN_ARROW);
                return false;
            }
            if (context === INPUT_CONTEXTS.GALAXY_MAP) {
                _handleGalaxyMapHopping(0, mappedAction === INPUT_ACTIONS.NAV_UP ? -1 : 1);
                return false;
            }
        }

        if (mappedAction === INPUT_ACTIONS.NAV_LEFT || mappedAction === INPUT_ACTIONS.NAV_RIGHT) {
            if (context === INPUT_CONTEXTS.SAVE_SELECTION) {
                saveSelectionScreen?.handleKeyPressed(null, mappedAction === INPUT_ACTIONS.NAV_LEFT ? LEFT_ARROW : RIGHT_ARROW);
                return false;
            }
            if (context === INPUT_CONTEXTS.GALAXY_MAP) {
                _handleGalaxyMapHopping(mappedAction === INPUT_ACTIONS.NAV_LEFT ? -1 : 1, 0);
                return false;
            }
        }

        if (executeInputAction(mappedAction, context)) return false;
        return false;
    }

}

/**
 * Handle surface mode control keys
 * @returns {boolean} True if handled
 */
function handleSurfaceModeKeys() {
    if (!gameStateManager || gameStateManager.currentState !== "SURFACE_MODE") return false;
    if (!surfaceMode) return false;

    return surfaceMode.handleKeyDown(keyCode, key);
}

/**
 * Common logic for hopping between systems on the galaxy map
 */
function _handleGalaxyMapHopping(dx, dy) {
    if (!uiManager?.galaxyMap || !galaxy?.systems) return;

    const currentIndex = uiManager.galaxyMap.gamepadSelectedIndex;
    const currentSys = galaxy.systems[currentIndex];

    if (currentSys && currentSys.connectedSystemIndices && currentSys.galaxyPos) {
        let bestMatch = -1;
        let bestScore = Infinity;

        for (const connIdx of currentSys.connectedSystemIndices) {
            const connSys = galaxy.systems[connIdx];
            if (!connSys || !connSys.galaxyPos) continue;

            const vx = connSys.galaxyPos.x - currentSys.galaxyPos.x;
            const vy = connSys.galaxyPos.y - currentSys.galaxyPos.y;

            // Dot product tells us if it's in the direction pressed
            const dot = (vx * dx) + (vy * dy);

            if (dot > 0) {
                const distSq = vx * vx + vy * vy;
                const distance = Math.sqrt(distSq);
                const angle = Math.acos(constrain(dot / distance, -1, 1)); // radians deviation

                // Penalize angles heavily so it prefers straight lines in the pressed direction
                const score = distance * (1 + angle * 10);

                if (score < bestScore) {
                    bestScore = score;
                    bestMatch = connIdx;
                }
            }
        }

        if (bestMatch !== -1) {
            uiManager.galaxyMap.gamepadSelectedIndex = bestMatch;
            soundManager?.playSound('click');
        }
    }
}

/**
 * Common logic for selecting a galaxy map node (gamepad or keyboard)
 */
function _handleGalaxyMapSelection() {
    if (!uiManager?.galaxyMap || !galaxy) return;

    const targetIdx = uiManager.galaxyMap.gamepadSelectedIndex;
    if (targetIdx === -1) return;

    if (targetIdx === galaxy.currentSystemIndex) {
        uiManager.lockedDestinationIndex = -1;
        soundManager?.playSound('click_off');
    } else {
        const reachable = galaxy.getReachableSystems ? galaxy.getReachableSystems() : [];
        if (reachable.includes(targetIdx)) {
            uiManager.lockedDestinationIndex = targetIdx;
            soundManager?.playSound('click');
        } else {
            uiManager.addMessage("Route unavailable.", [255, 150, 150]);
            soundManager?.playSound('error');
        }
    }
}

/**
 * Toggle inventory screen
 */
function handleInventoryToggle() {
    const state = gameStateManager.currentState;
    if (state === "IN_FLIGHT" || state === "SURFACE_MODE") {
        const opening = !gameStateManager.showingInventory;
        gameStateManager.showingInventory = opening;
        soundManager?.playSound(opening ? 'mapOpen' : 'mapClose');
        return true;
    }
    return false;
}

/**
 * Toggle galaxy map
 */
function handleMapToggle() {
    const state = gameStateManager.currentState;
    if (state === "IN_FLIGHT" || state === "SURFACE_MODE") {
        // Store the previous state so we can return to it
        gameStateManager._previousState = state;
        gameStateManager.setState("GALAXY_MAP");
        soundManager?.playSound('mapOpen');
    } else if (state === "GALAXY_MAP") {
        // Return to the previous state (surface mode or in-flight)
        const returnState = gameStateManager._previousState || "IN_FLIGHT";
        gameStateManager.setState(returnState);
        gameStateManager._previousState = null;
        soundManager?.playSound('mapClose');
    }
    return true;
}

/**
 * Toggle mission overlay with 'N' key
 */
function handleMissionOverlayToggle() {
    const state = gameStateManager.currentState;
    if (state === "IN_FLIGHT" || state === "SURFACE_MODE") {
        if (gameStateManager.toggleMissionOverlay()) {
            soundManager?.playSound('click');
            return true;
        }
    }
    return false;
}

/**
 * Toggle secret base navigation
 * Only available for Imperial, Separatist, or Military faction members
 */
function handleSecretBaseNavigation() {
    if (gameStateManager.currentState !== "IN_FLIGHT" || !player) return false;

    // Only Imperial, Separatist, or Military faction members have access to secret bases
    const allowedFactions = ['IMPERIAL', 'SEPARATIST', 'MILITARY'];
    const playerFaction = player.playerFaction;
    if (!playerFaction || !allowedFactions.includes(playerFaction)) {
        return false;
    }

    const wasActive = player.showSecretBaseNavigation;
    player.showSecretBaseNavigation = !wasActive;

    if (player.showSecretBaseNavigation) {
        showSecretBaseStatus();
        soundManager?.playSound('click');
    } else {
        player._cachedNavigation = null;
        uiManager?.addMessage("Secret Base Navigation: DEACTIVATED", [150, 150, 150]);
        soundManager?.playSound('click');
    }
    return true;
}

/**
 * Show secret base detection status
 */
function showSecretBaseStatus() {
    if (!player.currentSystem?.secretStations?.length) {
        uiManager?.addMessage("No Secret Base detected in this system", [255, 100, 100]);
        player.showSecretBaseNavigation = false;
        return;
    }

    const anyDiscovered = player.currentSystem.secretStations.some(s => s.discovered);
    player._cachedNavigation = null;

    if (anyDiscovered) {
        uiManager?.addMessage("Secret Base Navigation: ACTIVATED", [0, 255, 255]);
    } else {
        uiManager?.addMessage("Secret Base Detector: ACTIVATED - Base detected but not yet discovered", [0, 200, 200]);
    }
}

/**
 * Toggle wanted status
 */
function handleWantedToggle() {
    if (!player?.currentSystem) return false;

    const currentSystem = player.currentSystem;
    const isCurrentlyWanted = currentSystem.playerWanted || false;
    const securityLevel = typeof currentSystem.securityLevel === 'string'
        ? currentSystem.securityLevel.toLowerCase()
        : '';

    if (!isCurrentlyWanted && securityLevel === 'anarchy') {
        uiManager?.addMessage(`No legal authority operates in ${currentSystem.name}.`, 'lightblue');
        GS_LOG(`Wanted status toggle skipped in ${currentSystem.name}: Anarchy system.`);
        return true;
    }

    currentSystem.playerWanted = !isCurrentlyWanted;
    currentSystem.policeAlertSent = !isCurrentlyWanted;
    GS_LOG(`Player wanted status in ${currentSystem.name}: ${!isCurrentlyWanted}`);

    if (!isCurrentlyWanted) {
        uiManager?.addMessage(`WANTED in ${currentSystem.name} system!`, 'crimson');
        GS_LOG(`ALERT: Police alert issued in ${currentSystem.name}!`);
    } else {
        uiManager?.addMessage(`Legal status cleared in ${currentSystem.name}`, 'lightgreen');
        GS_LOG(`NOTICE: Police alert cleared in ${currentSystem.name}.`);
    }
    return true;
}

/**
 * Handle autopilot key logic for 'h' (station) and 'j' (jump zone/cycle)
 * J key cycles through: station → jumpzone → secretbase (if discovered)
 * @param {string} autopilotKey - The pressed key, already lowercased
 */
function handleAutopilot(autopilotKey) {
    if (gameStateManager.currentState !== "IN_FLIGHT" || !player || player.destroyed) {
        return false;
    }

    if (autopilotKey === 'h') {
        UI_LOG("H key detected - cycle planets autopilot");
        if (typeof player.cycleAutopilotPlanet === 'function') {
            try { player.cycleAutopilotPlanet(); } catch (e) {
                console.error('cycleAutopilotPlanet error', e);
                uiManager?.addMessage("No planet autopilot available", [255, 150, 100]);
            }
        } else {
            uiManager?.addMessage("No planet autopilot available", [255, 150, 100]);
        }
    } else if (autopilotKey === 'j') {
        UI_LOG("J key detected - cycle system service targets");
        if (typeof player.cycleAutopilotService === 'function') {
            try { player.cycleAutopilotService(); } catch (e) {
                console.error('cycleAutopilotService error', e);
                uiManager?.addMessage("Autopilot error: Service data unavailable", [255, 150, 100]);
            }
        } else {
            uiManager?.addMessage("No service autopilot available", [255, 150, 100]);
        }
    }
    return true;
}

/**
 * Handle minimap zoom out (',' key)
 */
function handleMinimapZoomOut() {
    const state = gameStateManager.currentState;
    if ((state === "IN_FLIGHT" || state === "SURFACE_MODE") && uiManager) {
        uiManager.cycleOutMinimapZoom();
        return true;
    }
    return false;
}

/**
 * Handle minimap zoom in ('.' key)
 */
function handleMinimapZoomIn() {
    const state = gameStateManager.currentState;
    if ((state === "IN_FLIGHT" || state === "SURFACE_MODE") && uiManager) {
        uiManager.cycleInMinimapZoom();
        return true;
    }
    return false;
}

/**
 * Handle cloak activation ('C' key)
 */
function handleCloakActivation() {
    // Allow cloak in both IN_FLIGHT and SURFACE_MODE states
    const validStates = ["IN_FLIGHT", "SURFACE_MODE"];
    if (!validStates.includes(gameStateManager.currentState) || !player || player.destroyed) {
        return false;
    }

    // Don't allow cloak while docked
    if (player.isDockedAndInvulnerable) {
        return false;
    }

    if (typeof player.activateCloak === 'function') {
        player.activateCloak();
        return true;
    }
    return false;
}

/**
 * Handle speed burst activation ('R' key)
 */
function handleSpeedBurstActivation() {
    const validStates = ["IN_FLIGHT", "SURFACE_MODE"];
    if (!validStates.includes(gameStateManager.currentState) || !player || player.destroyed) {
        return false;
    }

    if (player.isDockedAndInvulnerable) {
        return false;
    }

    if (!player.installedUpgrades?.booster || player.boostMaxDuration <= 0) {
        uiManager?.addMessage("Speed Burst unavailable: booster upgrade not installed.", [255, 150, 100]);
        return true;
    }

    return !!player.trySpeedBurst?.();
}

/**
 * Handle surface descent ('F' key) - enter planetary surface mode
 * @returns {boolean} True if handled
 */
function handleSurfaceDescent() {
    if (gameStateManager.currentState !== "IN_FLIGHT" || !player) return false;
    if (!surfaceMode) return false;

    const currentSystem = galaxy?.getCurrentSystem();
    if (!currentSystem?.planets) return false;

    // Check for planet proximity and trigger descent
    for (const planet of currentSystem.planets) {
        if (surfaceMode.canEnter(player, planet)) {
            if (surfaceMode.enter(player, planet, currentSystem)) {
                uiManager?.addMessage(`Descending to ${planet.name} surface...`, [100, 200, 255]);
                soundManager?.playSound('uiTransition');
                return true;
            }
        }
    }

    // Not near any planet
    uiManager?.addMessage("No planet in range for surface descent", [255, 150, 100]);
    return false;
}

function keyReleased() {
    // Handle surface mode key releases
    if (gameStateManager?.currentState === "SURFACE_MODE" &&
        surfaceMode) {
        surfaceMode.handleKeyUp(keyCode, key);
    }
    return true;
}

// --- Mouse Input Handling ---

/**
 * Main mouse press handler
 */
function mousePressed() {
    if (handleGameOverClick()) return;
    if (handleTitleScreenClick()) return;
    if (handleSaveSelectionClick()) return;
    if (handleMarketButtonPress()) return;
    if (handleInventoryClick()) return;
    if (handleGeneralUIClick()) return;

    // Handle surface mode UI clicks (e.g. Befriend button)
    if (handleSurfaceModeClick()) return;

    if (handleInFlightTargeting()) return;
}

/**
 * Handle surface mode UI interactions
 * @returns {boolean} True if handled
 */
function handleSurfaceModeClick() {
    if (gameStateManager && gameStateManager.currentState === "SURFACE_MODE") {
        if (surfaceMode && surfaceMode.handleMousePressed) {
            if (surfaceMode.handleMousePressed()) return true;
        }
    }
    return false;
}

/**
 * Handle GAME_OVER click-to-reset
 * @returns {boolean} True if handled
 */
function handleGameOverClick() {
    if (gameStateManager?.currentState !== "GAME_OVER") return false;

    console.log("Game over screen clicked, resetting game...");
    // Always allow reset when in GAME_OVER state, regardless of player state
    if (typeof resetGame === 'function') {
        resetGame();
    } else {
        console.error("resetGame function not found, reloading page");
        window.location.reload();
    }
    return true;
}

/**
 * Handle title screen clicks
 * @returns {boolean} True if handled
 */
function handleTitleScreenClick() {
    const state = gameStateManager.currentState;
    if (state === "TITLE_SCREEN" || state === "INSTRUCTIONS") {
        titleScreen?.handleClick();
        return true;
    }
    return false;
}

/**
 * Handle save selection screen clicks
 * @returns {boolean} True if handled
 */
function handleSaveSelectionClick() {
    if (gameStateManager.currentState === "SAVE_SELECTION") {
        saveSelectionScreen?.handleClick(mouseX, mouseY);
        return true;
    }
    return false;
}

/**
 * Handle market button presses
 * @returns {boolean} True if handled
 */
function handleMarketButtonPress() {
    if (gameStateManager.currentState === "VIEWING_MARKET" && uiManager) {
        return uiManager.handleMarketMousePress(
            mouseX, mouseY,
            player.currentSystem?.station?.getMarket(),
            player
        );
    }
    return false;
}

/**
 * Handle inventory clicks
 * @returns {boolean} True if handled
 */
function handleInventoryClick() {
    const state = gameStateManager.currentState;
    if (!gameStateManager.showingInventory || (state !== "IN_FLIGHT" && state !== "SURFACE_MODE")) {
        return false;
    }

    const res = inventoryScreen.handleClick(mouseX, mouseY, player);
    if (res === 'close') {
        gameStateManager.showingInventory = false;
        soundManager?.playSound('mapClose');
        return true;
    }
    if (res === 'ejectPod') {
        handleEjectEscapePod();
        return true;
    }
    if (res?.action === 'jettison') {
        soundManager?.playSound('click');
        handleJettisonFromInventory(res.idx);
        return true;
    }
    return false;
}

/**
 * Handle general UI clicks (map, station services, etc.)
 * @returns {boolean} True if handled
 */
function handleGeneralUIClick() {
    if (!gameStateManager || !player || !uiManager || !galaxy) return false;

    return uiManager.handleMouseClicks(
        mouseX, mouseY,
        gameStateManager.currentState,
        player,
        player.currentSystem?.station?.getMarket(),
        galaxy
    );
}

/**
 * Handle in-flight targeting
 * @returns {boolean} True if handled
 */
function handleInFlightTargeting() {
    const state = gameStateManager.currentState;
    if (state === "IN_FLIGHT" || state === "SURFACE_MODE") {
        player?.handleMousePressedForTargeting();
        return true;
    }
    return false;
}

/**
 * Handles the logic for jettisoning an item from the inventory
 * @param {number} idx - The index of the item in the player's cargo
 */
function handleJettisonFromInventory(idx) {
    const item = player.cargo[idx];
    if (!item) return;

    if (player.removeCargo(item.name, 1)) {
        uiManager?.addMessage(`Jettisoned 1 ${item.name}`);

        const dir = p5.Vector.fromAngle(player.angle + PI);
        const pos = p5.Vector.add(player.pos, dir.copy().mult(player.size * 2.6));
        const cargo = new Cargo(pos.x, pos.y, item.name, 1);
        cargo.vel = dir.mult(1.5);
        player.currentSystem?.addCargo(cargo);
        soundManager?.playSound('click_off');
    } else {
        soundManager?.playSound('error');
    }
}

/**
 * Handles ejecting the player into an escape pod.
 * Closes the inventory, transforms the player's ship into an EscapeCapsule,
 * and fires it in the opposite direction of travel.
 */
function handleEjectEscapePod() {
    if (!player) return;

    // Close the inventory screen first
    if (gameStateManager) {
        gameStateManager.showingInventory = false;
    }

    // Clear gamepad eject highlight
    if (inventoryScreen) {
        inventoryScreen.gamepadEjectSelected = false;
    }

    soundManager?.playSound('explosion_medium');

    player.ejectEscapePod(player.currentSystem);
}

function mouseReleased() {
    if (gameStateManager.currentState === "VIEWING_MARKET" && uiManager) {
        uiManager.handleMarketMouseRelease();
    }
    return false;
}

function mouseWheel(event) {
    if (uiManager && gameStateManager) {
        if (uiManager.handleMouseWheel(event, gameStateManager.currentState)) {
            return false;
        }
    }
}

// Save/Load functionality is in saveLoadSystem.js

/**
 * Resets the entire game to a fresh state.
 * This function properly reinitializes all game objects and state.
 * Preserves fullscreen mode if active.
 */
function resetGame() {
    console.log("Resetting game to initial state...");

    // Store fullscreen state
    const wasFullscreen = fullscreen();

    // Clear any pending saves
    if (__saveDebounceTimer) {
        clearTimeout(__saveDebounceTimer);
        __saveDebounceTimer = null;
    }
    // Note: We no longer clear the active save slot on reset.
    // Saves are preserved because saving is blocked during GAME_OVER or dying,
    // and load validation rejects dead/destroyed states.

    // Stop all sounds
    if (soundManager && typeof soundManager.stopAllSounds === 'function') {
        soundManager.stopAllSounds();
    }

    // Clean up ambient sounds
    if (ambientSoundManager && typeof ambientSoundManager.cleanup === 'function') {
        ambientSoundManager.cleanup();
    }

    // Clean up station music
    if (stationMusicManager && typeof stationMusicManager.cleanup === 'function') {
        stationMusicManager.cleanup();
    }

    // Clean up space music
    if (spaceMusicManager && typeof spaceMusicManager.cleanup === 'function') {
        spaceMusicManager.cleanup();
    }

    // Reset global state
    loadGameWasSuccessful = false;
    window.activeSaveSlotIndex = 0;

    // Create new instances of all core game objects
    gameStateManager = new GameStateManager();
    galaxy = new Galaxy();
    player = new Player();
    uiManager = new UIManager();
    titleScreen = new TitleScreen();
    inventoryScreen = new InventoryScreen();
    missionOverlay = new MissionOverlay();
    saveSelectionScreen = new SaveSelectionScreen();
    eventManager = new EventManager();

    // Clean up old speech before creating new communication system
    if (communicationSystem && typeof communicationSystem.cleanupSpeech === 'function') {
        communicationSystem.cleanupSpeech();
    }
    communicationSystem = new CommunicationSystem();
    stationMusicManager = new StationMusicManager();
    spaceMusicManager = new SpaceMusicManager();
    GameGlobals.newsManager = new NewsManager();
    communicationSystem.initialize({ uiManager, player });
    communicationSystem.initializeSpeech(); // Enable speech synthesis for ship communications

    // Re-initialize surface mode for fresh state
    if (typeof initSurfaceMode === 'function') {
        initSurfaceMode();
    }
    // Reinitialize player ship definition
    if (typeof player.applyShipDefinition === 'function') {
        player.applyShipDefinition(player.shipTypeName);
    }

    // Reinitialize weapon system pools
    if (typeof WeaponSystem !== 'undefined' && typeof ObjectPool !== 'undefined') {
        console.log("Reinitializing weapon system pool after reset");
        WeaponSystem.init(100);
    }

    // Sync GameGlobals with freshly created instances
    Object.assign(GameGlobals, {
        gameStateManager,
        galaxy,
        player,
        uiManager,
        titleScreen,
        inventoryScreen,
        missionOverlay,
        saveSelectionScreen,
        communicationSystem,
        eventManager,
        soundManager,
        ambientSoundManager,
        stationMusicManager,
        spaceMusicManager,
        loadGameWasSuccessful: false
    });

    // Restore fullscreen if it was active
    if (wasFullscreen) {
        fullscreen(true);
    }

    // Set initial state to title screen
    gameStateManager.setState("TITLE_SCREEN");

    console.log("Game reset complete. Returning to title screen.");
}

// --- End Reset ---


// --- p5.js windowResized Function ---
// Called automatically by p5.js when the browser window is resized.
function windowResized() {
    pixelDensity(displayDensity());  // Maintain native pixel density after resize
    resizeCanvas(windowWidth, windowHeight); // Adjust canvas size
    // Resize save selection screen stars if it exists
    if (saveSelectionScreen && typeof saveSelectionScreen.resize === 'function') {
        saveSelectionScreen.resize();
    }
    // console.log("Window resized."); // Optional log
    // Note: UI elements using width/height might need repositioning logic here or in their draw methods.
}

// Attempt to flush any pending debounced save on page unload
try {
    window.addEventListener('beforeunload', () => {
        if (__saveDebounceTimer) {
            clearTimeout(__saveDebounceTimer);
            __saveDebounceTimer = null;
            const currentSlotIndex = (window.activeSaveSlotIndex !== undefined ? window.activeSaveSlotIndex : 0);
            __atomicStoreToSlot(currentSlotIndex);
        }
    });
} catch (e) {
    // Ignore environments where addEventListener is not available
}
