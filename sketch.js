// ****** sketch.js ******
// Main entry point for Elite p5.js game

// --- Global Constants ---
const OFFSCREEN_VOLUME_REDUCTION_FACTOR = 0.1;
const SHIELD_RECHARGE_RATE_MULTIPLIER = 4.0;

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
        setupFullscreenBehavior();
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
    const newsManager = new NewsManager();

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
        communicationSystem,
        newsManager
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
 * Setup fullscreen behavior on title/save selection screens
 * Note: Fullscreen is now handled by the TitleScreen class when user clicks START.
 * This function is kept for potential future use.
 */
function setupFullscreenBehavior() {
    // No automatic fullscreen attempts - let the title screen handle it on user interaction
    // This prevents "API can only be initiated by a user gesture" errors
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
    const beamWeaponActive = !!(player?.currentWeapon?.type === WEAPON_TYPE.BEAM);
    const beamTargetingRequested = !!(
        (window._gamepadManager?.held('a') || window._gamepadManager?.held('r1')) ||
        keyIsDown(32)
    );
    return inputManager.resolveContext({
        gameState: state,
        showingMissionOverlay: !!gameStateManager.showingMissionOverlay,
        showingInventory: !!gameStateManager.showingInventory,
        isSurfaceShipControl: state === 'SURFACE_MODE' && typeof surfaceMode !== 'undefined' && surfaceMode?.controlMode === 'SHIP',
        isSurfaceAstronautControl: state === 'SURFACE_MODE' && typeof surfaceMode !== 'undefined' && surfaceMode?.controlMode === 'ASTRONAUT',
        beamWeaponActive,
        beamTargetingRequested
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
            return false;
        case INPUT_ACTIONS.BACK:
            if (context === INPUT_CONTEXTS.MISSION_OVERLAY) {
                gameStateManager.toggleMissionOverlay();
                soundManager?.playSound('click');
                return true;
            }
            if (context === INPUT_CONTEXTS.INVENTORY) {
                gameStateManager.toggleInventory();
                soundManager?.playSound('mapClose');
                return true;
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
                _handleGamepadStationMenus(window._gamepadManager, gameStateManager.currentState);
                return true;
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
        default:
            return false;
    }
}

/**
 * Handle continuous firing when space is held (keyboard or gamepad)
 */
function handleContinuousFiring() {
    const isShipControl = gameStateManager.currentState === "IN_FLIGHT" ||
        (gameStateManager.currentState === "SURFACE_MODE" && typeof surfaceMode !== 'undefined' && surfaceMode.controlMode === 'SHIP');

    const context = getActiveInputContext();
    inputManager?.updateBeamTargetCursor(context);
    const gpFiring = !!(inputManager && context && inputManager.isGamepadActionHeld(INPUT_ACTIONS.FIRE_PRIMARY, context));

    if (isShipControl && !player.destroyed && (keyIsDown(32) || gpFiring)) {
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
    if (!gp || !gp.state || !player || player.destroyed || !inputManager) return;

    const state = gameStateManager.currentState;
    const s = gp.state;
    const context = getActiveInputContext();

    if (context !== INPUT_CONTEXTS.STATION_MENU && inputManager.isGamepadActionPressed(INPUT_ACTIONS.CONFIRM, context)) {
        executeInputAction(INPUT_ACTIONS.CONFIRM, context);
    }
    if (context !== INPUT_CONTEXTS.STATION_MENU && inputManager.isGamepadActionPressed(INPUT_ACTIONS.BACK, context)) {
        executeInputAction(INPUT_ACTIONS.BACK, context);
    }

    if (context === INPUT_CONTEXTS.SAVE_SELECTION) {
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_UP, context)) saveSelectionScreen?.handleKeyPressed(null, UP_ARROW);
        if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.NAV_DOWN, context)) saveSelectionScreen?.handleKeyPressed(null, DOWN_ARROW);
        return;
    }

    if (context === INPUT_CONTEXTS.STATION_MENU) {
        _handleGamepadStationMenus(gp, state);
        return;
    }

    if (context === INPUT_CONTEXTS.MISSION_OVERLAY) {
        if (uiManager?.missionOverlay) {
            const scrollSpeed = 8;
            if (Math.abs(s.rs.y) > 0.1) {
                uiManager.missionOverlay.scrollOffset += s.rs.y * scrollSpeed;
            } else if (s.dpad.up) {
                uiManager.missionOverlay.scrollOffset -= scrollSpeed;
            } else if (s.dpad.down) {
                uiManager.missionOverlay.scrollOffset += scrollSpeed;
            }
            uiManager.missionOverlay.scrollOffset = Math.min(
                Math.max(uiManager.missionOverlay.scrollOffset, 0),
                uiManager.missionOverlay.maxScroll || 0
            );
        }
        return;
    }

    if (context === INPUT_CONTEXTS.INVENTORY) {
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
    const isShipControl = state === 'IN_FLIGHT' ||
        (state === 'SURFACE_MODE' && typeof surfaceMode !== 'undefined' && surfaceMode.controlMode === 'SHIP');

    if (!isShipControl) return;

    // Read analog values
    const beamTargeting = context === INPUT_CONTEXTS.BEAM_TARGETING;
    const lsX = beamTargeting ? 0 : s.ls.x;   // Left stick X: strafe (reassigned in beam mode)
    const lsY = beamTargeting ? 0 : s.ls.y;   // Left stick Y: thrust/reverse (reassigned in beam mode)
    const rsX = s.rs.x;   // Right stick X: rotate
    const r2Val = s.r2;    // R2 trigger: thrust
    const l2Val = s.l2;    // L2 trigger: reverse

    const rotTimeScale = (typeof deltaTime === 'number') ? deltaTime / 16.67 : 1;
    const hasGamepadInput = Math.abs(lsX) > 0.1 || Math.abs(lsY) > 0.1 ||
                           Math.abs(rsX) > 0.1 || r2Val > 0.1 || l2Val > 0.1;

    // Disable autopilot on gamepad input
    if (player.autopilotEnabled && hasGamepadInput) {
        player.disableAutopilot();
        uiManager?.addMessage('Autopilot disengaged: On manual control');
    }

    // Rotation from right stick
    if (Math.abs(rsX) > 0.1) {
        player.angle += rsX * player.rotationSpeed * rotTimeScale;
    }

    // Strafe from left stick X
    if (Math.abs(lsX) > 0.3) {
        if (lsX < 0) player.kiteLeft();
        else player.kiteRight();
        player.isStrafing = true;
    }

    // Thrust from left stick Y (pushed forward = negative Y)
    if (!player.isStrafing) {
        if (lsY < -0.2 || r2Val > 0.1) {
            player.isThrusting = true;
            player.thrust();
        } else if (lsY > 0.2 || l2Val > 0.1) {
            player.isThrusting = true;
            player.isReverseThrusting = true;
            player.reverseThrust();
        }
    }

    // Surface mode altitude from bumpers
    if (state === 'SURFACE_MODE' && typeof surfaceMode !== 'undefined' && surfaceMode) {
        if (gp.held('l1')) surfaceMode.altitudeInput = 1;
        else if (gp.held('l4')) surfaceMode.altitudeInput = -1; // L4 = descend
        else if (!keyIsDown(90) && !keyIsDown(88)) { // Only reset if keyboard Z/X not held
            surfaceMode.altitudeInput = 0;
        }
    }

    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TOGGLE_MAP, context)) executeInputAction(INPUT_ACTIONS.TOGGLE_MAP, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TOGGLE_INVENTORY, context)) executeInputAction(INPUT_ACTIONS.TOGGLE_INVENTORY, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.TOGGLE_MISSION, context)) executeInputAction(INPUT_ACTIONS.TOGGLE_MISSION, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.ACTIVATE_CLOAK, context)) executeInputAction(INPUT_ACTIONS.ACTIVATE_CLOAK, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.MINIMAP_ZOOM_IN, context)) executeInputAction(INPUT_ACTIONS.MINIMAP_ZOOM_IN, context);
    if (inputManager.isGamepadActionPressed(INPUT_ACTIONS.MINIMAP_ZOOM_OUT, context)) executeInputAction(INPUT_ACTIONS.MINIMAP_ZOOM_OUT, context);

    // Weapon switching/targeting/autopilot actions only in flight
    if (state === 'IN_FLIGHT') {
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
        
        // Target cycling with D-pad up/down
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

// Gamepad menu navigation state (persists across frames)
let _gpMenuIndex = 0;
let _gpMenuState = '';  // tracks which state the index belongs to

function _handleGamepadStationMenus(gp, state) {
    // Reset selection index when entering a new menu state
    if (state !== _gpMenuState) {
        _gpMenuIndex = 0;
        _gpMenuState = state;
    }

    // Get the button areas for the current state
    const buttons = _getButtonAreasForState(state);

    // ── B button = go back / escape ──
    if (gp.pressed('b')) {
        _gpMenuIndex = 0;
        if (state === 'DOCKED' || state === 'DOCKED_SPACE_OBJECT') {
            gameStateManager.setState('IN_FLIGHT');
            soundManager?.playSound('click_off');
        } else if (state === 'VIEWING_SHIP_DETAIL') {
            gameStateManager.setState('VIEWING_SHIPYARD');
            soundManager?.playSound('click');
        } else if (state === 'VIEWING_WEAPON_DETAIL') {
            gameStateManager.setState('VIEWING_UPGRADES');
            soundManager?.playSound('click');
        } else {
            const isSpaceObj = state.startsWith('VIEWING_SPACE_OBJECT');
            gameStateManager.setState(isSpaceObj ? 'DOCKED_SPACE_OBJECT' : 'DOCKED');
            soundManager?.playSound('click');
        }
        return;
    }

    // ── D-pad up/down = navigate selection ──
    if (buttons && buttons.length > 0) {
        if (gp.pressed('dpad.up') || (gp.state.ls.y < -0.7 && gp.prevState && gp.prevState.ls.y >= -0.7)) {
            _gpMenuIndex = (_gpMenuIndex - 1 + buttons.length) % buttons.length;
            soundManager?.playSound('click');
        }
        if (gp.pressed('dpad.down') || (gp.state.ls.y > 0.7 && gp.prevState && gp.prevState.ls.y <= 0.7)) {
            _gpMenuIndex = (_gpMenuIndex + 1) % buttons.length;
            soundManager?.playSound('click');
        }

        // Clamp index to valid range
        _gpMenuIndex = constrain(_gpMenuIndex, 0, buttons.length - 1);
    }

    // ── D-pad left/right = scroll or horizontal nav in lists ──
    if (gp.pressed('dpad.left') || gp.pressed('dpad.right')) {
        const dir = gp.pressed('dpad.right') ? 1 : -1;
        _handleGamepadListScroll(state, dir);
    }

    // ── A button = click the selected button ──
    if (gp.pressed('a') && buttons && buttons.length > 0 && _gpMenuIndex < buttons.length) {
        const selectedBtn = buttons[_gpMenuIndex];
        if (selectedBtn && selectedBtn.w > 0 && selectedBtn.h > 0) {
            // Simulate a click at the center of the selected button
            const cx = selectedBtn.x + selectedBtn.w / 2;
            const cy = selectedBtn.y + selectedBtn.h / 2;

            if (uiManager) {
                uiManager.handleMouseClicks(
                    cx, cy, state, player,
                    player.currentSystem?.station?.getMarket?.() || galaxy?.getCurrentSystem()?.station?.getMarket?.(),
                    galaxy
                );
            }
        }
    }
}

/**
 * Get the relevant button area array for the current game state.
 * Each station screen stores its clickable areas in uiManager/stationMenus.
 */
function _getButtonAreasForState(state) {
    if (!uiManager) return [];

    switch (state) {
        case 'DOCKED':
            return uiManager.stationMenuButtonAreas || [];
        case 'DOCKED_SPACE_OBJECT':
            return uiManager.spaceObjectMenuButtonAreas || [];
        case 'VIEWING_MARKET':
            return uiManager.marketButtonAreas || [];
        case 'VIEWING_SPACE_OBJECT_MARKET':
            return uiManager.spaceObjectMarketButtonAreas || [];
        case 'VIEWING_MISSIONS':
            return _getMissionButtons();
        case 'VIEWING_SHIPYARD':
            return (uiManager.stationMenus?.shipyardListAreas || []).concat(
                _objectToButtons(uiManager.stationMenus?.shipyardDetailButtons)
            );
        case 'VIEWING_SHIP_DETAIL':
            return _objectToButtons(uiManager.stationMenus?.shipDetailButtons);
        case 'VIEWING_UPGRADES':
            return (uiManager.stationMenus?.upgradeListAreas || []).concat(
                _objectToButtons(uiManager.stationMenus?.upgradeDetailButtons)
            );
        case 'VIEWING_WEAPON_DETAIL':
            return _objectToButtons(uiManager.stationMenus?.weaponDetailButtons);
        case 'VIEWING_REPAIRS':
            return [
                uiManager.repairsFullButtonArea,
                uiManager.repairsHalfButtonArea,
                uiManager.repairsBodyguardsButtonArea,
                uiManager.repairsBackButtonArea
            ].filter(b => b && b.w > 0);
        case 'VIEWING_SPACE_OBJECT_REPAIRS':
            return [
                uiManager.spaceObjectRepairsFullButtonArea,
                uiManager.spaceObjectRepairsHalfButtonArea,
                uiManager.spaceObjectRepairsBodyguardsButtonArea,
                uiManager.spaceObjectRepairsBackButtonArea
            ].filter(b => b && b.w > 0);
        case 'VIEWING_PROTECTION':
            return uiManager.stationMenus?.protectionServicesButtons || [];
        case 'VIEWING_POLICE':
        case 'VIEWING_IMPERIAL_RECRUITMENT':
        case 'VIEWING_SEPARATIST_RECRUITMENT':
        case 'VIEWING_MILITARY_RECRUITMENT':
            return uiManager.factionRecruitmentButtonAreas || [];
        case 'VIEWING_STORAGE':
            return uiManager.stationMenus?.storageButtonAreas || uiManager.storageButtonAreas || [];
        case 'VIEWING_RECORD':
            return uiManager.stationMenus?.recordButtonAreas || uiManager.recordButtonAreas || [];
        case 'VIEWING_NEWS':
            return uiManager.stationMenus?.newsButtonAreas || uiManager.newsButtonAreas || [];
        case 'VIEWING_SERVICES':
            return [];
        case 'VIEWING_BASE':
            return [
                uiManager.baseRepairButtonArea,
                uiManager.stationMenus?.baseMiningStorageButtonArea,
                uiManager.baseBackButtonArea
            ].filter(b => b && b.w > 0);
        default:
            return [];
    }
}

/**
 * Get mission board buttons (list + detail action buttons)
 */
function _getMissionButtons() {
    const list = uiManager.missionListButtonAreas || [];
    const detail = uiManager.missionDetailButtonAreas || {};
    const detailBtns = _objectToButtons(detail);
    return list.concat(detailBtns);
}

/**
 * Convert a button-area object (keyed by action name) to an array
 */
function _objectToButtons(obj) {
    if (!obj || typeof obj !== 'object') return [];
    return Object.values(obj).filter(b => b && typeof b === 'object' && b.w > 0);
}

/**
 * Handle D-pad left/right for scrollable lists (market, shipyard, upgrades, news, record)
 */
function _handleGamepadListScroll(state, direction) {
    if (!uiManager) return;
    const sm = uiManager.stationMenus;

    switch (state) {
        case 'VIEWING_MARKET':
        case 'VIEWING_SPACE_OBJECT_MARKET':
            // Market scrolling handled by existing keyboard bridge
            break;
        case 'VIEWING_SHIPYARD':
            if (sm) {
                sm.shipyardScrollOffset = constrain(
                    (sm.shipyardScrollOffset || 0) + direction * 3,
                    0, sm.shipyardScrollMax || 0
                );
            }
            break;
        case 'VIEWING_UPGRADES':
            if (sm) {
                sm.upgradeScrollOffset = constrain(
                    (sm.upgradeScrollOffset || 0) + direction * 3,
                    0, sm.upgradeScrollMax || 0
                );
            }
            break;
        case 'VIEWING_NEWS':
            if (sm) {
                sm.newsScrollOffset = constrain(
                    (sm.newsScrollOffset || 0) + direction,
                    0, sm.newsScrollMax || 0
                );
            }
            break;
        case 'VIEWING_RECORD':
            if (sm) {
                sm.recordScrollOffset = constrain(
                    (sm.recordScrollOffset || 0) + direction,
                    0, sm.recordScrollMax || 0
                );
            }
            break;
        case 'VIEWING_SHIP_DETAIL':
            // Prev/next ship
            if (sm && sm.availableShipsList && sm.availableShipsList.length > 1) {
                const idx = sm.currentShipIndex + direction;
                if (idx >= 0 && idx < sm.availableShipsList.length) {
                    sm.currentShipIndex = idx;
                    sm.selectedShipForDetail = sm.availableShipsList[idx];
                    soundManager?.playSound('click');
                }
            }
            break;
        case 'VIEWING_WEAPON_DETAIL':
            // Prev/next weapon
            if (sm && sm.availableWeaponsList && sm.availableWeaponsList.length > 1) {
                const idx = sm.currentWeaponIndex + direction;
                if (idx >= 0 && idx < sm.availableWeaponsList.length) {
                    sm.currentWeaponIndex = idx;
                    sm.selectedWeaponForDetail = sm.availableWeaponsList[idx];
                    // Also reset the slot picker state so we don't carry it over
                    sm.showingSlotPicker = false;
                    sm.selectedSlotForUpgrade = -1;
                    soundManager?.playSound('click');
                }
            }
            break;
    }
}

/**
 * Draw a highlight rectangle around the gamepad-selected button.
 * Called at the end of each frame during station states.
 */
function _drawGamepadMenuHighlight(btn) {
    if (!btn || !btn.w || !btn.h) return;

    push();
    noFill();

    // Animated pulse for visibility
    const pulse = (Math.sin((typeof millis === 'function' ? millis() : 0) * 0.006) + 1) / 2;
    const alpha = 180 + pulse * 75;

    // Outer glow
    stroke(100, 200, 255, alpha * 0.4);
    strokeWeight(4);
    rect(btn.x - 3, btn.y - 3, btn.w + 6, btn.h + 6, 6);

    // Inner border
    stroke(100, 200, 255, alpha);
    strokeWeight(2);
    rect(btn.x - 1, btn.y - 1, btn.w + 2, btn.h + 2, 4);

    pop();
}

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

    uiManager?.drawFramerate();    // fps cap removed for frame-rate independence
    uiManager?.drawMessages();

    // Draw gamepad menu highlight if applicable (must be after game state renders UI)
    if (window._gamepadManager && window._gamepadManager.connected) {
        const state = gameStateManager.currentState;
        const isStationState = STATION_STATES && STATION_STATES.includes(state);
        if (isStationState) {
            const buttons = _getButtonAreasForState(state);
            if (buttons && buttons.length > 0 && _gpMenuIndex < buttons.length) {
                _drawGamepadMenuHighlight(buttons[_gpMenuIndex]);
            }
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
            if (handleMissionNavigation()) return false;
        }

        if (mappedAction === INPUT_ACTIONS.NAV_LEFT || mappedAction === INPUT_ACTIONS.NAV_RIGHT) {
            if (context === INPUT_CONTEXTS.GALAXY_MAP) {
                _handleGalaxyMapHopping(mappedAction === INPUT_ACTIONS.NAV_LEFT ? -1 : 1, 0);
                return false;
            }
            if (handleDetailScreenNavigation()) return false;
        }

        if (executeInputAction(mappedAction, context)) return false;
    }

    if (handleGameOverInput()) return false;
    if (handleInstructionsInput()) return false;
    if (handleSaveSelectionInput()) return false;
    if (handleSpacebarFiring()) return false;
    if (handleWeaponSwitching()) return false;
    if (handleSingleKeyActions()) return false;
    if (handleMissionNavigation()) return false;
    if (handleDetailScreenNavigation()) return false;
    if (handleGalaxyMapInput()) return false;
    if (handleEscapeKey()) return false;
}

/**
 * Handle surface mode control keys
 * @returns {boolean} True if handled
 */
function handleSurfaceModeKeys() {
    if (!gameStateManager || gameStateManager.currentState !== "SURFACE_MODE") return false;
    if (typeof surfaceMode === 'undefined' || !surfaceMode) return false;

    return surfaceMode.handleKeyDown(keyCode, key);
}

/**
 * Handle GAME_OVER state input
 * @returns {boolean} True if handled
 */
function handleGameOverInput() {
    if (gameStateManager?.currentState !== "GAME_OVER") return false;

    if (player && (player.destroyed || player.isDying || player.hull <= 0)) {
        // Verify player is actually dead before allowing reset
        if (typeof resetGame === 'function') {
            resetGame();
        } else {
            console.error("resetGame function not found, falling back to reload");
            window.location.reload();
        }
        return false; // Indicate input was handled, prevent default behavior
    }

    // Toggle inventory with “I”
    if (key === 'i' || key === 'I') {
        return handleInventoryToggle();
    }
    return false;
}

/**
 * Handle instructions screen input
 * @returns {boolean} True if handled
 */
function handleInstructionsInput() {
    if (gameStateManager.currentState === "INSTRUCTIONS") {
        titleScreen?.handleKeyPress(keyCode);
        return true;
    }
    return false;
}

/**
 * Handle save selection screen input
 * @returns {boolean} True if handled
 */
function handleSaveSelectionInput() {
    if (gameStateManager.currentState === "SAVE_SELECTION") {
        saveSelectionScreen?.handleKeyPressed(key, keyCode);
        return true;
    }
    return false;
}

/**
 * Handle spacebar firing
 * @returns {boolean} True if handled
 */
function handleSpacebarFiring() {
    const isShipControl = gameStateManager.currentState === "IN_FLIGHT" ||
        (gameStateManager.currentState === "SURFACE_MODE" && typeof surfaceMode !== 'undefined' && surfaceMode.controlMode === 'SHIP');

    if ((key === ' ' || keyCode === 32) && isShipControl && player) {
        player.handleFireInput();
        return true;
    }
    return false;
}

/**
 * Handle weapon switching with number keys (1-9)
 * @returns {boolean} True if handled
 */
function handleWeaponSwitching() {
    const state = gameStateManager.currentState;
    const isShipControl = state === "IN_FLIGHT" ||
        (state === "SURFACE_MODE" && typeof surfaceMode !== 'undefined' && surfaceMode.controlMode === 'SHIP');

    if (!isShipControl || !player) return false;

    const numKey = parseInt(key);
    if (isNaN(numKey) || numKey < 1 || numKey > 9) return false;

    const weaponIndex = numKey - 1;
    if (Array.isArray(player.weapons) && weaponIndex < player.weapons.length) {
        if (player.switchToWeapon(weaponIndex)) {
            WEAPON_LOG(`Switched to weapon: ${player.currentWeapon.name}`);
            soundManager?.playSound('click');
        }
    }
    return true;
}

/**
 * Handle single-key action shortcuts
 * @returns {boolean} True if handled
 */
function handleSingleKeyActions() {
    const keyLower = key.toLowerCase();

    switch (keyLower) {
        case 'i':
            return handleInventoryToggle();
        case 'm':
            return handleMapToggle();
        case 'n':
            return handleMissionOverlayToggle();
        case 'b':
            return handleSecretBaseNavigation();
        case 'l':
            return handleWantedToggle();
        case 'h':
        case 'j':
            return handleAutopilot(keyLower);
        case '.':
            return handleMinimapZoomIn();
        case ',':
            return handleMinimapZoomOut();
        case 'c':
            return handleCloakActivation();
        case 'x':
            return handleSurfaceDescent();
    }
    return false;
}

/**
 * Handle Galaxy Map input (selection with Space/Enter)
 * @returns {boolean} True if handled
 */
function handleGalaxyMapInput() {
    if (gameStateManager.currentState !== "GALAXY_MAP") return false;
    const keyLower = key.toLowerCase();

    if (keyCode === ENTER || keyCode === 32) { // 32 is Space
        _handleGalaxyMapSelection();
        return true;
    }

    if (keyLower === 'm') {
        const targetIdx = uiManager.galaxyMap.gamepadSelectedIndex;
        if (targetIdx !== -1) {
            const systems = galaxy.getSystemDataForMap ? galaxy.getSystemDataForMap() : [];
            const sysData = systems[targetIdx];
            const isCurrent = (targetIdx === galaxy.currentSystemIndex);
            
            if (sysData && (sysData.visited || isCurrent)) {
                if (uiManager.marketOverlaySystemIndex === targetIdx) {
                    uiManager.marketOverlaySystemIndex = -1;
                    soundManager?.playSound('click_off');
                } else {
                    uiManager.marketOverlaySystemIndex = targetIdx;
                    soundManager?.playSound('click');
                }
            } else {
                uiManager.addMessage("Market data unavailable.", [255, 150, 150]);
                soundManager?.playSound('error');
            }
        }
        return true;
    }

    // Keyboard hopping
    let dx = 0, dy = 0;
    if (keyCode === UP_ARROW || keyLower === 'w') dy = -1;
    else if (keyCode === DOWN_ARROW || keyLower === 's') dy = 1;
    else if (keyCode === LEFT_ARROW || keyLower === 'a') dx = -1;
    else if (keyCode === RIGHT_ARROW || keyLower === 'd') dx = 1;

    if (dx !== 0 || dy !== 0) {
        _handleGalaxyMapHopping(dx, dy);
        return true;
    }

    return false;
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
 * Handle mission list navigation with Up/Down arrows when viewing missions
 * @returns {boolean} True if handled
 */
function handleMissionNavigation() {
    if (!gameStateManager || gameStateManager.currentState !== "VIEWING_MISSIONS") return false;

    // Only react to Up/Down arrow keys
    if (!(keyCode === UP_ARROW || keyCode === DOWN_ARROW)) return false;

    const missions = gameStateManager.currentStationMissions || [];
    if (!Array.isArray(missions) || missions.length === 0) return false;

    let idx = (typeof gameStateManager.selectedMissionIndex === 'number') ? gameStateManager.selectedMissionIndex : -1;

    // If nothing selected, start at 0 on Down or last on Up
    if (idx === -1) {
        idx = (keyCode === DOWN_ARROW) ? 0 : (missions.length - 1);
    } else {
        if (keyCode === DOWN_ARROW) idx = Math.min(missions.length - 1, idx + 1);
        else if (keyCode === UP_ARROW) idx = Math.max(0, idx - 1);
    }

    gameStateManager.selectedMissionIndex = idx;
    soundManager?.playSound('click');
    return true;
}

/**
 * Handle ship/weapon detail screen navigation with left/right arrow keys
 * @returns {boolean} True if handled
 */
function handleDetailScreenNavigation() {
    if (!gameStateManager || !uiManager) return false;

    const state = gameStateManager.currentState;
    if (state !== "VIEWING_SHIP_DETAIL" && state !== "VIEWING_WEAPON_DETAIL") return false;

    // Only react to Left/Right arrow keys
    if (!(keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW)) return false;

    const stationMenus = uiManager.stationMenus;
    if (!stationMenus) return false;

    // Handle ship detail navigation
    if (state === "VIEWING_SHIP_DETAIL") {
        const shipList = stationMenus.availableShipsList;
        if (!Array.isArray(shipList) || shipList.length === 0) return false;

        let idx = stationMenus.currentShipIndex;

        if (keyCode === LEFT_ARROW && idx > 0) {
            stationMenus.currentShipIndex--;
            stationMenus.selectedShipForDetail = shipList[stationMenus.currentShipIndex];
            soundManager?.playSound('click');
            return true;
        } else if (keyCode === RIGHT_ARROW && idx < shipList.length - 1) {
            stationMenus.currentShipIndex++;
            stationMenus.selectedShipForDetail = shipList[stationMenus.currentShipIndex];
            soundManager?.playSound('click');
            return true;
        }
    }

    // Handle weapon detail navigation
    if (state === "VIEWING_WEAPON_DETAIL") {
        const weaponList = stationMenus.availableWeaponsList;
        if (!Array.isArray(weaponList) || weaponList.length === 0) return false;

        let idx = stationMenus.currentWeaponIndex;

        if (keyCode === LEFT_ARROW && idx > 0) {
            stationMenus.currentWeaponIndex--;
            stationMenus.selectedWeaponForDetail = weaponList[stationMenus.currentWeaponIndex];
            soundManager?.playSound('click');
            return true;
        } else if (keyCode === RIGHT_ARROW && idx < weaponList.length - 1) {
            stationMenus.currentWeaponIndex++;
            stationMenus.selectedWeaponForDetail = weaponList[stationMenus.currentWeaponIndex];
            soundManager?.playSound('click');
            return true;
        }
    }

    return false;
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
 * Handle surface descent ('F' key) - enter planetary surface mode
 * @returns {boolean} True if handled
 */
function handleSurfaceDescent() {
    if (gameStateManager.currentState !== "IN_FLIGHT" || !player) return false;
    if (typeof surfaceMode === 'undefined' || !surfaceMode) return false;

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

/**
 * Handle ESC key to exit map/docked state
 */
function handleEscapeKey() {
    if (keyCode !== ESCAPE) return false;

    if (gameStateManager.currentState === "GALAXY_MAP") {
        gameStateManager.setState("IN_FLIGHT");
        soundManager?.playSound('mapClose');
    } else if (gameStateManager.currentState === "DOCKED") {
        gameStateManager.setState("IN_FLIGHT");
        soundManager?.playSound('click_off');
    }
    return true;
}

function keyReleased() {
    // Handle surface mode key releases
    if (gameStateManager?.currentState === "SURFACE_MODE" &&
        typeof surfaceMode !== 'undefined' && surfaceMode) {
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
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.handleMousePressed) {
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

// --- Save/Load Functionality ---

/** Debounce timer for save operations */
let __saveDebounceTimer = null;

/**
 * Validates save payload structure and data integrity
 * @param {Object} payload - The save data payload to validate
 * @returns {{ok: boolean, reason?: string}} Validation result
 */
function __validatePayload(payload) {
    try {
        if (!payload) return { ok: false, reason: 'missing payload' };
        if (!payload.galaxyData) return { ok: false, reason: 'missing galaxyData' };
        if (payload.currentSystemIndex === undefined || payload.currentSystemIndex === null) return { ok: false, reason: 'missing currentSystemIndex' };
        if (!payload.playerData) return { ok: false, reason: 'missing playerData' };
        // Credits must be a finite number and non-negative
        const cr = payload.playerData.credits;
        if (typeof cr !== 'number' || !isFinite(cr) || cr < 0) return { ok: false, reason: 'invalid credits' };
        // Weapons array can be empty but should be defined if saved
        if (payload.playerData.weapons !== undefined && !Array.isArray(payload.playerData.weapons)) return { ok: false, reason: 'invalid weapons array' };
        return { ok: true };
    } catch (e) {
        return { ok: false, reason: 'exception during validation: ' + e?.message };
    }
}

function __buildSaveData() {
    // Build and soft-coerce critical fields to avoid aborting saves on transient state
    // Ensure planets have deterministic save-ready fields before serializing
    try {
        if (galaxy && Array.isArray(galaxy.systems)) {
            galaxy.systems.forEach(sys => {
                if (!sys || !Array.isArray(sys.planets)) return;
                sys.planets.forEach(pl => { try { if (pl && typeof pl.prepareForSave === 'function') pl.prepareForSave(); } catch (e) { /* ignore */ } });
            });
        }
    } catch (e) { /* ignore */ }

    const playerData = player.getSaveData();
    // Normalize credits
    if (!(typeof playerData.credits === 'number' && isFinite(playerData.credits) && playerData.credits >= 0)) {
        playerData.credits = 1000;
    } else {
        playerData.credits = Math.floor(playerData.credits);
    }

    // Capture a minimal docking snapshot so we can restore space-object/station dock state on load
    const dockingState = (() => {
        if (!gameStateManager) return { state: "IN_FLIGHT" };
        const state = gameStateManager.currentState || "IN_FLIGHT";

        // Persist docked space object id when in a space-object docked/menu state
        const isSpaceObjectState = state === "DOCKED_SPACE_OBJECT"
            || state === "VIEWING_SPACE_OBJECT_MARKET"
            || state === "VIEWING_SPACE_OBJECT_REPAIRS"
            || state === "VIEWING_SPACE_OBJECT_SHIPYARD"
            || state === "VIEWING_SPACE_OBJECT_UPGRADES";
        if (isSpaceObjectState && gameStateManager.currentDockedSpaceObject?.id) {
            return {
                state: "DOCKED_SPACE_OBJECT",
                spaceObjectId: gameStateManager.currentDockedSpaceObject.id
            };
        }

        // Persist station docking so we don't drop the player out of menus after reloads
        // Check if docked at a SECRET station (not the main one)
        if (state === "DOCKED") {
            const dockedStation = gameStateManager.currentDockedStation;
            const mainStation = player?.currentSystem?.station;
            const secretStations = player?.currentSystem?.secretStations || [];

            // Check if docked at a secret station
            const secretIndex = secretStations.findIndex(s => s === dockedStation);
            if (secretIndex >= 0 && dockedStation) {
                return {
                    state: "DOCKED",
                    isSecretStation: true,
                    secretStationIndex: secretIndex,
                    stationName: dockedStation.name || null
                };
            }

            // Docked at main station
            if (mainStation) {
                return {
                    state: "DOCKED",
                    isSecretStation: false,
                    stationName: mainStation.name || null
                };
            }
        }

        return { state: "IN_FLIGHT" };
    })();

    // Capture surface/save-at-base metadata when appropriate so loads resume on-planet
    const savedSurface = (() => {
        try {
            if (!gameStateManager) return null;
            const st = gameStateManager.currentState;
            // Check if we are logically on the surface (state is surface mode OR landed flag is true)
            // This is safer than relying only on the state string
            const isSurface = (st === 'SURFACE_MODE' || st === 'VIEWING_BASE') || (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isLanded);
            if (!isSurface) return null;
            if (typeof surfaceMode === 'undefined' || !surfaceMode || !surfaceMode.planet) return null;

            const planet = surfaceMode.planet;
            let planetIndex = -1;
            try {
                planetIndex = (player && player.currentSystem && Array.isArray(player.currentSystem.planets))
                    ? player.currentSystem.planets.indexOf(planet)
                    : -1;
            } catch (e) { planetIndex = -1; }

            const baseObj = (typeof uiManager !== 'undefined' && uiManager && uiManager.currentBaseObject) ? uiManager.currentBaseObject : null;

            return {
                state: st,
                planetIndex: planetIndex >= 0 ? planetIndex : null,
                baseId: baseObj ? (baseObj.id || null) : null,
                basePos: baseObj && baseObj.pos ? { x: baseObj.pos.x, y: baseObj.pos.y } : null,
                controlMode: surfaceMode.controlMode || 'SHIP',
                playerPos: player && player.pos ? { x: player.pos.x, y: player.pos.y } : null,
                astronautPos: (surfaceMode.astronaut && surfaceMode.astronaut.pos) ? { x: surfaceMode.astronaut.pos.x, y: surfaceMode.astronaut.pos.y } : null
            };
        } catch (e) {
            return null;
        }
    })();

    return {
        playerData,
        galaxyData: galaxy.getSaveData(),
        currentSystemIndex: galaxy.currentSystemIndex,
        globalSessionSeed: typeof globalSessionSeed !== 'undefined' ? globalSessionSeed : null,
        savedAt: Date.now(),
        version: 2,
        dockingState,
        savedSurface,
        newsManager: GameGlobals.newsManager ? GameGlobals.newsManager.toJSON() : null,
        eventManager: GameGlobals.eventManager ? GameGlobals.eventManager.toJSON() : null
    };
}

function __atomicStoreToSlot(slotIndex) {
    const saveKey = SAVE_KEY_PREFIX + slotIndex;
    const backupKey = saveKey + '_bak';

    const saveData = __buildSaveData();

    // Validate before saving
    const validation = __validatePayload(saveData);
    if (!validation.ok) {
        console.error('Save validation failed:', validation.reason);
        return false;
    }

    const dataString = JSON.stringify(saveData);

    // Backup the current save if it exists
    try {
        const previous = localStorage.getItem(saveKey);
        if (previous) {
            localStorage.setItem(backupKey, previous);
        }
    } catch (e) {
        console.warn('Failed to create backup for save key', saveKey, e);
    }

    // Write the new save
    try {
        localStorage.setItem(saveKey, dataString);
        return true;
    } catch (e) {
        console.error('Failed to write save:', e);
        return false;
    }
}

function saveGame() {
    try {
        // Prevent saves during GAME_OVER state
        if (gameStateManager && gameStateManager.currentState === "GAME_OVER") {
            console.warn("Save blocked: Cannot save during GAME_OVER state");
            return;
        }

        // Prevent saves if player is dead or dying
        if (player && (player.destroyed || player.isDying || player.hull <= 0)) {
            console.warn("Save blocked: Player is dead or dying");
            return;
        }

        if (typeof (Storage) === "undefined") {
            console.warn("localStorage is not supported. Game cannot be saved.");
            return;
        }

        // Clear any pending save and schedule a new one
        if (__saveDebounceTimer) {
            clearTimeout(__saveDebounceTimer);
        }

        __saveDebounceTimer = setTimeout(() => {
            __saveDebounceTimer = null;

            const currentSlotIndex = (window.activeSaveSlotIndex !== undefined ? window.activeSaveSlotIndex : 0);
            const ok = __atomicStoreToSlot(currentSlotIndex);

            if (!ok) {
                console.error('Save aborted: validation failed. Your last known-good backup was preserved.');
                return;
            }

            localStorage.setItem(LAST_ACTIVE_SLOT_KEY, String(currentSlotIndex));
            SAVE_LOG(`Game saved to slot ${currentSlotIndex + 1} (Key: ${SAVE_KEY_PREFIX + currentSlotIndex})`);

            // Refresh previews after a successful write
            if (typeof saveSelectionScreen !== 'undefined' && saveSelectionScreen && typeof saveSelectionScreen.loadAllSavePreviews === 'function') {
                saveSelectionScreen.loadAllSavePreviews();
            } else if (window.saveScreen && typeof window.saveScreen.loadAllSavePreviews === 'function') {
                window.saveScreen.loadAllSavePreviews();
            }
        }, 300); // Small debounce to batch rapid saves

    } catch (e) {
        console.error("Error scheduling save:", e);
    }
}

function loadGame(slotIndex) {
    if (typeof (Storage) !== "undefined") {
        if (slotIndex === undefined || slotIndex === null) {
            console.error("loadGame: slotIndex is undefined. Cannot load.");
            return false;
        }
        const loadKey = SAVE_KEY_PREFIX + slotIndex; // Define loadKey here

        const tryLoadFromKey = (key) => {
            const str = localStorage.getItem(key);
            if (!str) return { ok: false, reason: 'no data' };
            try {
                const obj = JSON.parse(str);
                // Validate schema
                const schema = __validatePayload(obj);
                if (!schema.ok) {
                    return { ok: false, reason: schema.reason };
                }
                return { ok: true, data: obj };
            } catch (e) {
                return { ok: false, reason: e?.message || 'parse error' };
            }
        };

        const savedDataString = localStorage.getItem(loadKey);
        const backupDataString = localStorage.getItem(loadKey + '_bak');

        if (savedDataString || backupDataString) {
            try {
                let savedData = null;
                // Prefer validated main; if invalid, try backup
                const primary = tryLoadFromKey(loadKey);
                if (!primary.ok) {
                    console.warn(`Primary save validation failed (${primary.reason}). Attempting backup...`);
                    const backup = tryLoadFromKey(loadKey + '_bak');
                    if (!backup.ok) {
                        console.error(`Backup save also invalid: ${backup.reason}`);
                        showCriticalError("Corrupt save: Both primary and backup invalid.");
                        return false;
                    }
                    // Promote backup to primary since primary is corrupt or missing
                    console.log('Promoting backup to primary save slot');
                    try {
                        const bakStr = localStorage.getItem(loadKey + '_bak');
                        if (bakStr) localStorage.setItem(loadKey, bakStr);
                    } catch (e) { /* ignore */ }
                    savedData = backup.data;
                } else {
                    savedData = primary.data;
                }

                // Clean up any existing ambient layers before rebuilding from save data
                if (ambientSoundManager && typeof ambientSoundManager.cleanup === 'function') {
                    ambientSoundManager.cleanup();
                }

                // 1. Restore Global Seed (Critical for correct procedural generation)
                if (savedData.globalSessionSeed !== undefined && savedData.globalSessionSeed !== null) {
                    globalSessionSeed = savedData.globalSessionSeed;
                } else {
                    // Fallback to avoid complete breakage, though positions will likely shift
                    if (typeof globalSessionSeed === 'undefined' || globalSessionSeed === null) {
                        globalSessionSeed = Math.floor(Math.random() * 999999);
                    }
                }

                // 2. Load Galaxy Data First
                if (savedData.galaxyData) {
                    galaxy.loadSaveData(savedData.galaxyData, globalSessionSeed); // This populates galaxy.systems
                } else {
                    console.error(`No galaxyData found in save file for slot ${slotIndex} (Key: ${loadKey})`);
                    showCriticalError("Corrupt save: Missing galaxy data.");
                    return false;
                }

                // 2. Restore Current System Index
                if (savedData.currentSystemIndex !== undefined) {
                    // Validate index against loaded systems
                    if (galaxy.systems && galaxy.systems.length > 0 &&
                        (savedData.currentSystemIndex < 0 || savedData.currentSystemIndex >= galaxy.systems.length)) {
                        console.error(`Invalid currentSystemIndex (${savedData.currentSystemIndex}) for loaded systems count (${galaxy.systems.length}) in slot ${slotIndex}.`);
                        showCriticalError("Corrupt save: Invalid system index.");
                        return false;
                    }
                    galaxy.currentSystemIndex = savedData.currentSystemIndex;
                } else {
                    // If galaxyData was supposed to provide systems, missing index is an error.
                    if (galaxy.systems && galaxy.systems.length > 0) {
                        console.error(`No currentSystemIndex found in save file for slot ${slotIndex}, but galaxy systems are present!`);
                        showCriticalError("Corrupt save: Missing system index.");
                        return false;
                    }
                    // If galaxy.systems is empty (e.g., galaxyData was empty/corrupt), this will be caught below.
                }

                // 3. Check if galaxy systems are populated BEFORE loading player
                if (!galaxy.systems || galaxy.systems.length === 0) {
                    showCriticalError("Galaxy systems array is empty AFTER attempting to load galaxy data!");
                    console.error(`Galaxy systems array is empty AFTER attempting to load galaxy data from slot ${slotIndex}.`);
                    return false;
                }

                // 5. Restore Player Data
                if (savedData.playerData) {
                    player.loadSaveData(savedData.playerData);
                } else {
                    console.error(`No playerData found in save file for slot ${slotIndex}.`);
                    showCriticalError("Corrupt save: Missing player data.");
                    return false;
                }


                // 5. Link Player to the (now loaded) Current System
                player.currentSystem = galaxy.getCurrentSystem();

                // 6. Extract docking state early for use in bodyguard spawning and state restoration
                const dockingState = savedData.dockingState;

                if (player.currentSystem) {
                    player.currentSystem.player = player; // Link player object to the system instance

                    // Fix for initial station positioning: 
                    if (player.currentSystem.station && player.currentSystem.station.pos) {
                        const distToStation = dist(player.pos.x, player.pos.y,
                            player.currentSystem.station.pos.x,
                            player.currentSystem.station.pos.y);

                        if (distToStation > 10000 || isNaN(player.pos.x) || isNaN(player.pos.y)) {
                            console.warn("Player position appears invalid or too far from station. Repositioning near station.");
                            player.pos.set(player.currentSystem.station.pos.x + player.currentSystem.station.size + 100,
                                player.currentSystem.station.pos.y);
                            player.vel.set(0, 0);
                        }
                    }

                    if (eventManager) {
                        eventManager.initializeReferences(player.currentSystem, player, uiManager);
                    }

                    // Pre-warm starfield tiles around player position on load
                    // This queues tiles for background generation to reduce initial stuttering
                    if (player.pos && typeof player.currentSystem.prewarmStarfieldTiles === 'function') {
                        player.currentSystem.prewarmStarfieldTiles(player.pos.x, player.pos.y);
                    }

                    // Respawn bodyguards ONLY if loading into IN_FLIGHT state
                    // If docked, undocking will handle spawning them properly
                    const willRestoreToDocked = dockingState && (
                        dockingState.state === "DOCKED" ||
                        dockingState.state === "DOCKED_SPACE_OBJECT"
                    );

                    if (!willRestoreToDocked && player.activeBodyguards && player.activeBodyguards.length > 0) {
                        console.log(`Respawning ${player.activeBodyguards.length} bodyguards after load (in-flight state)...`);
                        player.spawnBodyguards(player.currentSystem);
                    }
                } else {
                    showCriticalError("CRITICAL: Failed to link player to a valid currentSystem after load!");
                    console.error(`CRITICAL: Failed to link player to a valid currentSystem after load! Index: ${galaxy.currentSystemIndex}, Systems count: ${galaxy.systems ? galaxy.systems.length : 'N/A'}, Slot: ${slotIndex}`);
                    return false;
                }

                // 7. Restore docking state (stations and space objects) if present
                let restoredDockState = false;
                if (gameStateManager && dockingState && player.currentSystem) {
                    // Attempt to restore space-object docking first
                    if (dockingState.state === "DOCKED_SPACE_OBJECT" && dockingState.spaceObjectId) {
                        const so = player.currentSystem.spaceObjects?.find(o => o && !o.destroyed && o.id === dockingState.spaceObjectId);
                        if (so) {
                            gameStateManager.currentDockedSpaceObject = so;
                            gameStateManager.currentDockedStation = null;
                            if (player.vel?.set) player.vel.set(0, 0); else if (player.vel) { player.vel.x = 0; player.vel.y = 0; }
                            player.isDockedAndInvulnerable = true;
                            gameStateManager.setState("DOCKED_SPACE_OBJECT");
                            restoredDockState = true;
                        }
                    }

                    // Restore station docking if applicable and space-object restoration did not run
                    if (!restoredDockState && dockingState.state === "DOCKED") {
                        gameStateManager.currentDockedSpaceObject = null;

                        // Check if we were docked at a secret station
                        let dockedStation = null;
                        if (dockingState.isSecretStation && dockingState.secretStationIndex !== undefined) {
                            const secretStations = player.currentSystem.secretStations || [];
                            if (secretStations[dockingState.secretStationIndex]) {
                                dockedStation = secretStations[dockingState.secretStationIndex];
                                console.log("Restoring dock at SECRET station:", dockedStation.name);
                            }
                        }

                        // Fall back to main station if secret station not found
                        if (!dockedStation && player.currentSystem.station) {
                            dockedStation = player.currentSystem.station;
                            console.log("Restoring dock at MAIN station:", dockedStation.name);
                        }

                        if (dockedStation) {
                            gameStateManager.currentDockedStation = dockedStation;
                            // Position player at the correct station
                            if (dockedStation.pos) {
                                player.pos.set(dockedStation.pos.x, dockedStation.pos.y);
                            }
                            if (player.vel?.set) player.vel.set(0, 0); else if (player.vel) { player.vel.x = 0; player.vel.y = 0; }
                            player.isDockedAndInvulnerable = true;
                            gameStateManager.setState("DOCKED");
                            restoredDockState = true;
                        }
                    }
                }

                // Default to in-flight if no docking context was restored
                // But first, if the save recorded a surface/base marker, restore SURFACE_MODE
                let restoredSurface = false;
                try {
                    const savedSurface = savedData.savedSurface;

                    if (savedSurface && player.currentSystem && Array.isArray(player.currentSystem.planets) && savedSurface.planetIndex !== null && savedSurface.planetIndex !== undefined) {
                        const planet = player.currentSystem.planets[savedSurface.planetIndex];
                        if (planet) {
                            // If playerPos was saved, restore ship position first so surface.enter can reference it
                            if (savedSurface.playerPos && player && player.pos) {
                                try { player.pos.set(savedSurface.playerPos.x, savedSurface.playerPos.y); } catch (e) { /* ignore */ }
                            }

                            if (typeof surfaceMode !== 'undefined' && surfaceMode) {
                                try {
                                    // Ensure deterministic terrain/object generation by seeding
                                    // p5 random/noise from the planet's persisted featureRand or seed.
                                    try {
                                        const seedFromFeature = (typeof planet.featureRand === 'number') ? Math.floor(planet.featureRand * 1000000) : null;
                                        const useSeed = (seedFromFeature !== null) ? seedFromFeature : (typeof planet.seed === 'number' ? planet.seed : Math.floor(Math.random() * 1000000));
                                        if (typeof randomSeed === 'function') {
                                            try { randomSeed(useSeed); } catch (e) { /* ignore */ }
                                        }
                                        if (typeof noiseSeed === 'function') {
                                            try { noiseSeed(useSeed); } catch (e) { /* ignore */ }
                                        }
                                    } catch (e) { /* ignore seeding failures */ }

                                    surfaceMode.enter(player, planet, player.currentSystem, { force: true });

                                    // Place ship low to the surface so restores allow boarding.
                                    try {
                                        const groundH = (typeof surfaceMode._getTerrainHeightAt === 'function') ? surfaceMode._getTerrainHeightAt(player.pos.x, player.pos.y) : null;
                                        if (groundH !== null && typeof SURFACE_CONFIG !== 'undefined') {
                                            // Place at minimum allowed altitude (close to ground) so landing state can be detected
                                            surfaceMode.altitude = groundH + (SURFACE_CONFIG.MIN_ALTITUDE || 10);
                                            surfaceMode.player.altitude = surfaceMode.altitude;
                                            // Mark landed for immediate boarding availability
                                            surfaceMode.isLanded = true;
                                        }
                                    } catch (e) { /* ignore altitude restore failures */ }

                                    // Restore control mode (ASTRONAUT vs SHIP)
                                    if (savedSurface.controlMode === 'ASTRONAUT') {
                                        // Create astronaut first, then flip control mode to avoid
                                        // a transient state where controlMode === 'ASTRONAUT' but
                                        // surfaceMode.astronaut is null (which can cause update-time errors).
                                        if (savedSurface.astronautPos && typeof Astronaut !== 'undefined') {
                                            surfaceMode.astronaut = new Astronaut(createVector(savedSurface.astronautPos.x, savedSurface.astronautPos.y), { skipSpawnOffset: true });
                                            try { surfaceMode.astronaut.altitude = surfaceMode._getTerrainHeightAt(surfaceMode.astronaut.pos.x, surfaceMode.astronaut.pos.y); } catch (e) { /* ignore */ }
                                            surfaceMode.controlMode = 'ASTRONAUT';

                                            // Immediately set zoom for restored astronaut mode (no lerp on first frame)
                                            if (typeof SURFACE_CONFIG !== 'undefined' && SURFACE_CONFIG.EVA_ZOOM) {
                                                surfaceMode.viewZoom = SURFACE_CONFIG.EVA_ZOOM;
                                                surfaceMode.targetViewZoom = SURFACE_CONFIG.EVA_ZOOM;
                                            }
                                        } else {
                                            // Missing astronaut position in save — fallback to ship control
                                            surfaceMode.controlMode = 'SHIP';
                                            console.warn('Saved surface state requested ASTRONAUT control but astronautPos is missing. Defaulting to SHIP control.');
                                        }
                                    } else {
                                        surfaceMode.controlMode = 'SHIP';
                                    }

                                    // Attempt to re-link current base object for UI if base info saved
                                    if (typeof uiManager !== 'undefined' && uiManager && savedSurface.baseId) {
                                        // Search spawned surface objects for matching id or approximate position
                                        for (const obj of surfaceMode.surfaceObjects || []) {
                                            if (!obj) continue;
                                            if (savedSurface.baseId && obj.id && obj.id === savedSurface.baseId) {
                                                uiManager.currentBaseObject = obj; break;
                                            }
                                            if (savedSurface.basePos && obj.pos && Math.abs((obj.pos.x || 0) - savedSurface.basePos.x) < 2 && Math.abs((obj.pos.y || 0) - savedSurface.basePos.y) < 2) {
                                                uiManager.currentBaseObject = obj; break;
                                            }
                                        }
                                    }

                                    // If base object found and save indicated we were viewing it, open VIEWING_BASE
                                    if (uiManager && uiManager.currentBaseObject) {
                                        if (gameStateManager) {
                                            gameStateManager._returnFromBaseState = 'SURFACE_MODE';
                                            try { gameStateManager.setState('VIEWING_BASE'); } catch (e) { /* ignore */ }
                                        }
                                    }

                                    restoredSurface = true;
                                } catch (e) {
                                    console.warn('Failed to enter surface mode during load:', e);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Error while attempting to restore saved surface state:', e);
                }

                if (gameStateManager && !restoredDockState && !restoredSurface) {
                    gameStateManager.currentDockedSpaceObject = null;
                    gameStateManager.currentDockedStation = null;
                    player.isDockedAndInvulnerable = false;
                    gameStateManager.setState("IN_FLIGHT");
                }

                // 8. Restore News and Event Persistence
                if (savedData.newsManager && GameGlobals.newsManager) {
                    GameGlobals.newsManager.fromJSON(savedData.newsManager);
                }

                if (savedData.eventManager && GameGlobals.eventManager) {
                    GameGlobals.eventManager.fromJSON(savedData.eventManager);
                }

                // 9. Ensure economy types are synchronized after loading
                if (galaxy.systems) {
                    galaxy.systems.forEach(system => {
                        if (system && system.economyType) {
                            system.setEconomyType(system.economyType);
                        }
                    });
                }

                // 8. Restore current view and other relevant states
                if (savedData.currentView) {
                    Object.assign(uiManager.currentView, savedData.currentView);
                }

                // 9. Clear any locked jump destination to prevent stale jump targets
                if (uiManager) {
                    uiManager.lockedDestinationIndex = -1;
                }

                window.activeSaveSlotIndex = (slotIndex !== undefined ? slotIndex : 0);
                localStorage.setItem(LAST_ACTIVE_SLOT_KEY, slotIndex.toString()); // Store as last active slot
                // Mark the time of a successful load so we can suppress unintended immediate auto-saves
                try { if (typeof window !== 'undefined') { window.__lastLoadTime = Date.now(); } } catch (_) { }
                SAVE_LOG(`Game loaded successfully from slot ${slotIndex + 1} (Key: ${loadKey})`);
                return true;
            } catch (e) {
                console.error(`Error loading game from slot ${slotIndex + 1} (Key: ${loadKey}):`, e);
                localStorage.removeItem(loadKey); // Clear corrupted data
                return false;
            }
        } else {
            // Neither primary nor backup keys exist
            SAVE_LOG(`No saved game found in slot ${slotIndex + 1} (Key: ${loadKey})`);
            return false;
        }
    } else {
        console.warn("localStorage is not supported. Cannot load game.");
        return false;
    }
}

// --- End Save/Load ---

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
    saveSelectionScreen = new SaveSelectionScreen();
    eventManager = new EventManager();

    // Clean up old speech before creating new communication system
    if (communicationSystem && typeof communicationSystem.cleanupSpeech === 'function') {
        communicationSystem.cleanupSpeech();
    }
    communicationSystem = new CommunicationSystem();
    stationMusicManager = new StationMusicManager();
    spaceMusicManager = new SpaceMusicManager();
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
