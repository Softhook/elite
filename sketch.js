// ****** sketch.js ******

// --- Ship Defs loaded from ships.js ---
// --- Global Vars ---
let player; let galaxy; let uiManager; let gameStateManager; const SAVE_KEY = 'eliteMVPSaveData'; let loadGameWasSuccessful = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    angleMode(DEGREES); // Set angle mode FIRST
    textAlign(CENTER, CENTER); textSize(14);
    console.log("Setting up Elite MVP (Calling Deferred Galaxy Init)..."); // Updated log message

    // Check SHIP_DEFINITIONS loaded
    if (typeof SHIP_DEFINITIONS === 'undefined') { console.error("FATAL: SHIP_DEFINITIONS not loaded!"); noLoop(); return; }
    console.log("SHIP_DEFINITIONS loaded successfully.");

    // Instantiate core components
    console.log("Creating GameStateManager..."); gameStateManager = new GameStateManager();
    console.log("Creating Galaxy (empty systems)..."); galaxy = new Galaxy(); // Creates Galaxy with empty systems array
    console.log("Creating Player..."); player = new Player(); // Stores degrees
    console.log("Creating UIManager..."); uiManager = new UIManager();

    // --- Initialize Galaxy Systems NOW (p5 functions are ready) ---
    console.log("Calling galaxy.initGalaxySystems()...");
    // !!! ADD THIS CALL !!!
    galaxy.initGalaxySystems(); // Populate galaxy.systems array
    // !!! END ADDED CALL !!!
    console.log("Finished galaxy.initGalaxySystems().");
    // ---

    // --- Calculate Player Radians ---
    console.log("Applying Player ship definition (calculates radians)...");
    // --- UNCOMMENT THIS CALL NOW ---
    player.applyShipDefinition(player.shipTypeName); // Calculate radians for player
    // --- END UNCOMMENT ---
    console.log("Finished applying Player definition.");
    // ---

    console.log("About to load game data...");
    loadGameWasSuccessful = loadGame(); // Load save state

    console.log(`loadGame completed, success=${loadGameWasSuccessful}.`);

    // Link player to the current system
    console.log("Getting current system...");
    const systemToStartIn = galaxy.getCurrentSystem(); // Should now find system 0
    console.log("Current system:", systemToStartIn ? systemToStartIn.name : "NULL");

    if (systemToStartIn) {
        player.currentSystem = systemToStartIn;
        if (!loadGameWasSuccessful) {
            console.log("No save game, calling initial enterSystem...");
            // enterSystem calls trySpawnNPC -> new Enemy -> calculateRadianProperties
            systemToStartIn.enterSystem(player);
            console.log("Finished calling enterSystem.");
        } else { console.log(`Player starting/loaded in system: ${player.currentSystem.name}`); }
    } else {
        console.error("CRITICAL Error: Could not assign a starting system!");
        if(gameStateManager) gameStateManager.setState("LOADING"); return;
    }

    // Set initial game state
    if (gameStateManager && gameStateManager.currentState === "LOADING") {
         console.log("Setup complete, setting initial state to IN_FLIGHT.");
         gameStateManager.setState("IN_FLIGHT");
    } else if (gameStateManager) {
         console.log(`Setup complete, state is already ${gameStateManager.currentState}.`);
    } else { console.error("Cannot set initial state - gameStateManager missing!"); }

    console.log("--- End of setup() ---"); // This should now appear!

} // --- End setup() ---

function draw() {
    // console.log("Draw loop start..."); // Keep commented unless desperate
    background(0); // Clear screen - THIS should execute

    console.log("--- Top of Draw Loop ---"); // ADD THIS LOG

    // --- Game State Update and Draw ---
    if (gameStateManager && player) {
        try {
            console.log("   Calling gameStateManager.update()..."); // ADD LOG
            gameStateManager.update(player);
            console.log("   Finished gameStateManager.update()."); // ADD LOG

            console.log("   Calling gameStateManager.draw()..."); // ADD LOG
            gameStateManager.draw(player);
            console.log("   Finished gameStateManager.draw()."); // ADD LOG

        } catch (e) {
            console.error("!!! ERROR during gameStateManager update/draw:", e);
            // Draw error message ON SCREEN
            fill(255, 0, 0); textSize(16); textAlign(CENTER, CENTER); noStroke();
            text(`ERROR in Update/Draw Loop!\nCheck Console.\n${e.message}`, width / 2, height / 2);
            noLoop(); // Stop the loop on major error
        }
    } else {
         console.error("CRITICAL ERROR: gameStateManager or Player missing in draw()!");
         fill(255,0,0); textSize(20); textAlign(CENTER,CENTER); noStroke();
         text("Error: Game State Manager or Player missing!", width/2, height/2);
         noLoop();
         return;
    }
    // console.log("Draw loop end."); // Keep commented
}

// --- Input Handling ---
function keyPressed() {
    if (!gameStateManager) return;
    if (key === 'm' || key === 'M') { if (gameStateManager.currentState === "IN_FLIGHT") gameStateManager.setState("GALAXY_MAP"); else if (gameStateManager.currentState === "GALAXY_MAP") gameStateManager.setState("IN_FLIGHT"); }
    if (keyCode === ESCAPE) { if (gameStateManager.currentState === "GALAXY_MAP" || gameStateManager.currentState === "DOCKED") gameStateManager.setState("IN_FLIGHT"); }
    if (key === 'l' || key === 'L') { if (player) { player.isWanted = !player.isWanted; console.log("Player Wanted Status:", player.isWanted); } }
}
function mousePressed() {
    if (!gameStateManager || !player || !uiManager || !galaxy) return;
    let clickHandledByUI = uiManager.handleMouseClicks(mouseX, mouseY, gameStateManager.currentState, player, player.currentSystem?.station?.getMarket(), galaxy);
    if (!clickHandledByUI && gameStateManager.currentState === "IN_FLIGHT") { player.handleFireInput(); }
}
// --- End Input Handling ---

// --- Save/Load Functionality ---
function saveGame() {
    if (typeof(Storage) !== "undefined" && player && galaxy && gameStateManager) {
        try {
            console.log("Saving game state...");
            const saveData = { playerData: player.getSaveData(), galaxyData: galaxy.getSaveData(), currentSystemIndex: galaxy.currentSystemIndex, };
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); console.log("Game Saved.");
        } catch (e) { console.error("Error saving game:", e); }
    } else { console.warn("Could not save game..."); }
}
function loadGame() {
    loadGameWasSuccessful = false;
    if (typeof(Storage) !== "undefined" && player && galaxy && gameStateManager) {
        const savedDataString = localStorage.getItem(SAVE_KEY);
        if (savedDataString) {
            try {
                const saveData = JSON.parse(savedDataString); console.log("Loading game data...");
                galaxy.currentSystemIndex = saveData.currentSystemIndex !== undefined ? saveData.currentSystemIndex : 0;
                if (saveData.galaxyData) { galaxy.loadSaveData(saveData.galaxyData); }
                if (saveData.playerData) { player.loadSaveData(saveData.playerData); } else { player.applyShipDefinition("Sidewinder"); player.isWanted = false; }
                player.currentSystem = galaxy.getCurrentSystem(); if (!player.currentSystem) { console.error("CRITICAL: Failed to link player to loaded system!"); }
                loadGameWasSuccessful = true; console.log("Game Loaded Successfully.");
            } catch (e) { console.error("Error parsing saved game data:", e); localStorage.removeItem(SAVE_KEY); }
        } else { console.log("No saved game found."); }
    } else { console.warn("Could not load game..."); }
    return loadGameWasSuccessful;
}
// --- End Save/Load ---

// --- windowResized ---
function windowResized() { resizeCanvas(windowWidth, windowHeight); console.log("Window resized."); }