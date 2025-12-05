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
    titleScreen: null,
    saveSelectionScreen: null,
    inventoryScreen: null,
    eventManager: null,
    communicationSystem: null,
    font: null,
    loadGameWasSuccessful: false,
    globalSessionSeed: null
};

// Maintain backward compatibility with existing code
let player, galaxy, uiManager, gameStateManager, soundManager, ambientSoundManager, 
    titleScreen, font, inventoryScreen, eventManager, communicationSystem, saveSelectionScreen;
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
        
        UI_LOG("--- Setup Complete ---");
    } catch (error) {
        handleCriticalSetupError(error);
    }
}

/**
 * Initialize the p5.js canvas and rendering settings
 */
function initializeCanvas() {
    createCanvas(windowWidth, windowHeight);
    angleMode(RADIANS);
    textAlign(CENTER, CENTER);
    textSize(14);
    UI_LOG("Setting up Elite MVP...");
}

/**
 * Initialize core game managers
 */
function initializeManagers() {
    soundManager = new SoundManager();
    ambientSoundManager = new AmbientSoundManager();
    eventManager = new EventManager();
    
    Object.assign(GameGlobals, {
        soundManager,
        ambientSoundManager,
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
    saveSelectionScreen = new SaveSelectionScreen();
    communicationSystem = new CommunicationSystem();
    communicationSystem.initialize({ uiManager, player });
    
    Object.assign(GameGlobals, {
        gameStateManager,
        galaxy,
        player,
        uiManager,
        titleScreen,
        inventoryScreen,
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
    textSize(20);
    text("ERROR: Failed to load game!\nCheck console.", width / 2, height / 2);
    noLoop();
}


// --- p5.js Draw Function ---
function draw() {
    background(0);
    
    if (!validateGameState()) {
        return;
    }
    
    const currentState = gameStateManager.currentState;
    
    updateTitleScreens(currentState);
    updateGameState();
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
function performPeriodicTasks() {
    // Communication system cleanup every ~60 seconds
    if (frameCount % 3600 === 0 && communicationSystem) {
        communicationSystem.performPeriodicCleanup?.();
    }
    
    // Faction motivation messages every ~2 minutes
    if (frameCount % 7200 === 0 && communicationSystem) {
        communicationSystem.sendFactionMotivationMessage?.();
    }
}

/**
 * Handle continuous firing when space is held
 */
function handleContinuousFiring() {
    if (gameStateManager.currentState === "IN_FLIGHT" && 
        !player.destroyed && 
        keyIsDown(32)) {
        player.handleFireInput();
    }
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
    
    uiManager?.drawFramerate();
    uiManager?.drawMessages();
}

/**
 * Displays a critical error message on the screen
 * @param {string} msg - The error message to display
 */
function showCriticalError(msg) {
    fill(255, 0, 0);
    textSize(20);
    textAlign(CENTER, CENTER);
    noStroke();
    text(msg, width / 2, height / 2);
}

// --- Input Handling Functions ---

/**
 * Main keyboard input handler
 */
function keyPressed() {
    if (handleGameOverInput()) return false;
    if (handleInstructionsInput()) return;
    if (handleSaveSelectionInput()) return;
    if (handleSpacebarFiring()) return false;
    if (handleWeaponSwitching()) return false;
    if (handleSingleKeyActions()) return;
    if (handleMissionNavigation()) return;
    if (handleEscapeKey()) return;
}

/**
 * Handle GAME_OVER state input
 * @returns {boolean} True if handled
 */
function handleGameOverInput() {
    if (gameStateManager?.currentState !== "GAME_OVER") return false;
    
    if (player && (player.destroyed || player.isDying || player.hull <= 0)) {
        // Verify player is actually dead before allowing reset
        if (player && (player.destroyed || player.isDying || player.hull <= 0)) {
            if (typeof resetGame === 'function') {
                resetGame();
            } else {
                console.error("resetGame function not found, falling back to reload");
                window.location.reload();
            }
        } else {
            console.warn("Reset blocked: Player is not actually dead");
        }
        return false;
    }
    
    // Toggle inventory with “I”
    if ((key === 'i' || key === 'I') && gameStateManager.currentState === "IN_FLIGHT") {
        const opening = !gameStateManager.showingInventory;
        gameStateManager.showingInventory = opening;
        soundManager?.playSound(opening ? 'mapOpen' : 'mapClose');
        return true;
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
    if ((key === ' ' || keyCode === 32) && 
        gameStateManager.currentState === "IN_FLIGHT" && player) {
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
    if (gameStateManager.currentState !== "IN_FLIGHT" || !player) return false;
    
    const numKey = parseInt(key);
    if (isNaN(numKey) || numKey < 1 || numKey > 9) return false;
    
    const weaponIndex = numKey - 1;
    if (Array.isArray(player.weapons) && weaponIndex < player.weapons.length) {
        if (player.switchToWeapon(weaponIndex)) {
            WEAPON_LOG(`Switched to weapon: ${player.currentWeapon.name}`);
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
    }
    return false;
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
    if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
        soundManager.playSound('click');
    }
    return true;
}

/**
 * Toggle inventory screen
 */
function handleInventoryToggle() {
    if (gameStateManager.currentState === "IN_FLIGHT") {
        const opening = !gameStateManager.showingInventory;
        gameStateManager.showingInventory = opening;
        soundManager?.playSound(opening ? 'mapOpen' : 'mapClose');
        return true;
    }
    return false;
}

/**
 * Toggle inventory screen
 */
function handleInventoryToggle() {
    if (gameStateManager.currentState === "IN_FLIGHT") {
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
    if (gameStateManager.currentState === "IN_FLIGHT") {
        gameStateManager.setState("GALAXY_MAP");
    } else if (gameStateManager.currentState === "GALAXY_MAP") {
        gameStateManager.setState("IN_FLIGHT");
    }
    return true;
}

/**
 * Toggle secret base navigation
 */
function handleSecretBaseNavigation() {
    if (gameStateManager.currentState !== "IN_FLIGHT" || !player) return false;
    
    const wasActive = player.showSecretBaseNavigation;
    player.showSecretBaseNavigation = !wasActive;
    
    if (player.showSecretBaseNavigation) {
        showSecretBaseStatus();
    } else {
        player._cachedNavigation = null;
        uiManager?.addMessage("Secret Base Navigation: DEACTIVATED", [150, 150, 150]);
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
 * Handle autopilot key logic for 'h' (station) and 'j' (jump zone)
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
                uiManager?.addMessage("No planet autopilot available", [255,150,100]);
            }
        } else {
            uiManager?.addMessage("No planet autopilot available", [255,150,100]);
        }
    } else if (autopilotKey === 'j') {
        UI_LOG("J key detected - toggle station/jumpzone autopilot");
        try {
            if (!player.autopilotEnabled) {
                player.toggleAutopilot('jumpzone');
            } else if (player.autopilotTarget === 'station') {
                player.toggleAutopilot('jumpzone');
            } else if (player.autopilotTarget === 'jumpzone') {
                player.toggleAutopilot('station');
            } else {
                player.toggleAutopilot('station');
            }
        } catch (e) {
            console.error('Autopilot toggle error:', e);
        }
    }
    return true;
}

/**
 * Handle minimap zoom out (',' key)
 */
function handleMinimapZoomOut() {
    if (gameStateManager.currentState === "IN_FLIGHT" && uiManager) {
        uiManager.cycleOutMinimapZoom();
        return true;
    }
    return false;
}

/**
 * Handle minimap zoom in ('.' key)
 */
function handleMinimapZoomIn() {
    if (gameStateManager.currentState === "IN_FLIGHT" && uiManager) {
        uiManager.cycleInMinimapZoom();
        return true;
    }
    return false;
}

/**
 * Handle ESC key to exit map/docked state
 */
function handleEscapeKey() {
    if (keyCode !== ESCAPE) return false;
    
    if (gameStateManager.currentState === "GALAXY_MAP" || 
        gameStateManager.currentState === "DOCKED") {
        gameStateManager.setState("IN_FLIGHT");
    }
    return true;
}

function keyReleased() {
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
    if (handleInFlightTargeting()) return;
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
    if (!gameStateManager.showingInventory || gameStateManager.currentState !== "IN_FLIGHT") {
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
    if (gameStateManager.currentState === "IN_FLIGHT") {
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
        // Credits must be a finite number
        const cr = payload.playerData.credits;
        if (typeof cr !== 'number' || !isFinite(cr)) return { ok: false, reason: 'invalid credits' };
        // Weapons array can be empty but should be defined if saved
        if (payload.playerData.weapons !== undefined && !Array.isArray(payload.playerData.weapons)) return { ok: false, reason: 'invalid weapons array' };
        return { ok: true };
    } catch (e) {
        return { ok: false, reason: 'exception during validation: ' + e?.message };
    }
}

function __buildSaveData() {
    // Build and soft-coerce critical fields to avoid aborting saves on transient state
    const playerData = player.getSaveData();
    // Normalize credits
    if (!(typeof playerData.credits === 'number' && isFinite(playerData.credits) && playerData.credits >= 0)) {
        playerData.credits = 1000;
    } else {
        playerData.credits = Math.floor(playerData.credits);
    }
    return {
        playerData,
        galaxyData: galaxy.getSaveData(),
        currentSystemIndex: galaxy.currentSystemIndex,
        savedAt: Date.now(),
        version: 2
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
        
        if (typeof(Storage) === "undefined") {
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
    if (typeof(Storage) !== "undefined") {
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

                // 1. Load Galaxy Data First
                if (savedData.galaxyData) {
                    galaxy.loadSaveData(savedData.galaxyData); // This populates galaxy.systems
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
                
                // 4. Restore Player Data
                if (savedData.playerData) {
                    player.loadSaveData(savedData.playerData);
                } else {
                    console.error(`No playerData found in save file for slot ${slotIndex}.`);
                    showCriticalError("Corrupt save: Missing player data.");
                    return false;
                }

                // 5. Link Player to the (now loaded) Current System
                player.currentSystem = galaxy.getCurrentSystem(); 

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
                } else {
                    showCriticalError("CRITICAL: Failed to link player to a valid currentSystem after load!");
                    console.error(`CRITICAL: Failed to link player to a valid currentSystem after load! Index: ${galaxy.currentSystemIndex}, Systems count: ${galaxy.systems ? galaxy.systems.length : 'N/A'}, Slot: ${slotIndex}`);
                    return false;
                }

                // 6. Ensure economy types are synchronized after loading
                if (galaxy.systems) {
                    galaxy.systems.forEach(system => {
                        if (system && system.economyType) {
                            system.setEconomyType(system.economyType);
                        }
                    });
                }
                
                // 7. Restore current view and other relevant states
                if (savedData.currentView) {
                    Object.assign(uiManager.currentView, savedData.currentView);
                }
                
                // 8. Clear any locked jump destination to prevent stale jump targets
                if (uiManager) {
                    uiManager.lockedDestinationIndex = -1;
                }
                
                window.activeSaveSlotIndex = (slotIndex !== undefined ? slotIndex : 0);
                localStorage.setItem(LAST_ACTIVE_SLOT_KEY, slotIndex.toString()); // Store as last active slot
                // Mark the time of a successful load so we can suppress unintended immediate auto-saves
                try { if (typeof window !== 'undefined') { window.__lastLoadTime = Date.now(); } } catch(_) {}
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
    communicationSystem = new CommunicationSystem();
    communicationSystem.initialize({ uiManager, player });
    
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