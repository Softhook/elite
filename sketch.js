// ****** sketch.js ******

// --- Ship Definitions and Drawing Functions are loaded from ships.js ---
// Ensure ships.js is included BEFORE this file in index.html

// --- Global Variables ---
let player;                 // The player object
let galaxy;                 // The galaxy object containing star systems
let uiManager;              // Handles drawing UI elements (HUD, menus, map)
let gameStateManager;       // Controls the overall game state (flight, docked, map etc.)
const SAVE_KEY = 'eliteMVPSaveData'; // Key used for saving/loading game data in localStorage
let loadGameWasSuccessful = false;     // Flag to track if a saved game was successfully loaded
let soundManager;
let titleScreen;            // Handles title screen and instructions screen
// --- End Global Variables ---

// --- p5.js Setup Function ---
// Runs once at the beginning when the sketch starts.
function setup() {

    soundManager = new SoundManager(); // Create the manager
    // Create the canvas to fill the browser window
    createCanvas(windowWidth, windowHeight);
    // Set angle mode to RADIANS for p5.js rotation functions (like rotate())
    // Note: Internal angle calculations in classes mostly use RADIANS now.
    angleMode(RADIANS);
    // Default text alignment and size
    textAlign(CENTER, CENTER);
    textSize(14);
    console.log("Setting up Elite MVP..."); // Log startup

    // --- Check if Ship Definitions Loaded ---
    if (typeof SHIP_DEFINITIONS === 'undefined') {
        console.error("FATAL ERROR: SHIP_DEFINITIONS not loaded from ships.js! Check file inclusion order in index.html.");
        // Display error on screen and stop execution
        background(0); fill(255,0,0); textSize(20);
        text("ERROR: Failed to load ship definitions!\nCheck index.html", width/2, height/2);
        noLoop(); // Stop the draw loop
        return;
    }
    // console.log("SHIP_DEFINITIONS loaded successfully."); // Verbose log

    // --- Instantiate Core Game Objects ---
    // Create managers and the galaxy first
    // console.log("Creating GameStateManager..."); // Verbose log
    gameStateManager = new GameStateManager();
    // console.log("Creating Galaxy (empty systems)..."); // Verbose log
    galaxy = new Galaxy(); // Creates Galaxy object (systems array is initially empty)
    // Create player (defaults to Sidewinder, constructor stores degrees)
    // console.log("Creating Player..."); // Verbose log
    player = new Player();
    // console.log("Creating UIManager..."); // Verbose log
    uiManager = new UIManager();
    titleScreen = new TitleScreen();

    // --- Initialize Galaxy Systems (Populate galaxy.systems array) ---
    // This step calls StarSystem constructors which rely on p5 functions
    // console.log("Calling galaxy.initGalaxySystems()..."); // Verbose log
    if (galaxy && typeof galaxy.initGalaxySystems === 'function') {
        galaxy.initGalaxySystems();
    } else {
        console.error("FATAL ERROR: Galaxy object or initGalaxySystems method missing!");
        noLoop(); return;
    }
    // console.log("Finished galaxy.initGalaxySystems()."); // Verbose log

    // --- Calculate Player Radian Properties ---
    // Now that p5 is ready, calculate radian speed based on degree definition
    // console.log("Applying Player ship definition (calculates radians)..."); // Verbose log
    if (player && typeof player.applyShipDefinition === 'function') {
        player.applyShipDefinition(player.shipTypeName);
    } else {
         console.error("FATAL ERROR: Player object or applyShipDefinition method missing!");
         noLoop(); return;
    }
    // console.log("Finished applying Player definition."); // Verbose log

    // --- Load Saved Game Data (if exists) ---
    // console.log("About to load game data..."); // Verbose log
    loadGameWasSuccessful = loadGame(); // Attempt to load save data
    // console.log(`loadGame completed, success=${loadGameWasSuccessful}.`); // Verbose log

    // --- Link Player to Current System & Run Initial Entry Logic ---
    // console.log("Getting current system..."); // Verbose log
    const systemToStartIn = galaxy.getCurrentSystem(); // Get system based on load or default index
    // console.log("Current system:", systemToStartIn ? systemToStartIn.name : "NULL"); // Verbose log

    if (systemToStartIn) {
        player.currentSystem = systemToStartIn; // Set player's current system reference
        systemToStartIn.player = player; // Assign the player to the system
        // If no save game was loaded, the starting system needs its initial setup
        if (!loadGameWasSuccessful) {
            console.log("No save game found, running initial enterSystem for starting system..."); // Keep important log
            if (typeof systemToStartIn.enterSystem === 'function') {
                systemToStartIn.enterSystem(player); // Spawn initial NPCs/Asteroids etc.
            } else {
                console.error("ERROR: systemToStartIn object missing enterSystem method!");
            }
            // console.log("Finished calling enterSystem."); // Verbose log
        } else {
             console.log(`Player starting/loaded in system: ${player.currentSystem.name}`); // Log loaded system
        }
    } else {
        // This is a critical failure if no starting system can be assigned
        console.error("CRITICAL Error: Could not assign a starting system to the player after initialization!");
        if(gameStateManager) gameStateManager.setState("LOADING"); // Stay in loading state to indicate error
        else console.error("GameStateManager missing, cannot set error state.");
        // Optionally draw error message directly here as setup failed
        background(0); fill(255,0,0); textSize(20); text("ERROR: Failed to initialize starting system!", width/2, height/2);
        noLoop(); // Stop
        return; // Stop setup function
    }

    // --- Set Initial Game State ---
    // If everything above succeeded and state is still LOADING, transition to IN_FLIGHT
    if (gameStateManager && gameStateManager.currentState === "LOADING") {
         // console.log("Setup complete, setting initial state to IN_FLIGHT."); // Verbose log
         gameStateManager.setState("IN_FLIGHT");
    } else if (gameStateManager) {
         // This might happen if loadGame somehow set a different state (e.g., DOCKED)
         console.log(`Setup complete, game state already set to: ${gameStateManager.currentState}.`);
    } else {
         console.error("Cannot set initial state - gameStateManager missing!");
         // Draw error as setup failed
         background(0); fill(255,0,0); textSize(20); text("ERROR: GameStateManager missing!", width/2, height/2);
         noLoop(); return;
    }

    console.log("--- Setup Complete ---"); // Keep this final confirmation log

} // --- End setup() ---


// --- p5.js Draw Function ---
// Runs continuously after setup() completes.
function draw() {
    background(0); // Clear the canvas each frame

    // Update title screen animations if in title or instructions screen
    if (gameStateManager.currentState === "TITLE_SCREEN" || 
        gameStateManager.currentState === "INSTRUCTIONS") {
        titleScreen.update(deltaTime);
    }

    // --- Game State Update and Draw ---
    if (gameStateManager && player) {
        try {
            // Update game logic based on current state
            gameStateManager.update(player);
            
            // Continuous firing logic - using direct keyIsDown check
            if (gameStateManager.currentState === "IN_FLIGHT" && !player.destroyed && keyIsDown(32)) {
                player.handleFireInput();
            }
            
            // Draw visuals based on current state
            gameStateManager.draw(player);
            
        } catch (e) {
            // Catch any unexpected errors during the main loop
            console.error("!!! ERROR during gameStateManager update/draw:", e);
            // Display error on screen and stop the loop
            fill(255, 0, 0); textSize(16); textAlign(CENTER, CENTER); noStroke();
            text(`ERROR in Update/Draw Loop!\nCheck Console.\n${e.message}`, width / 2, height / 2);
            noLoop(); // Stop the loop on critical error
        }
    } else {
         // Handle case where critical objects are missing during draw
         console.error("CRITICAL ERROR: gameStateManager or Player missing in draw()!");
         fill(255,0,0); textSize(20); textAlign(CENTER,CENTER); noStroke();
         text("Error: Game State Manager or Player missing!", width/2, height/2);
         noLoop(); // Stop if fundamental objects missing
         return;
    }

    // Draw framerate display (always visible in all game states)
    uiManager.drawFramerate();
    uiManager.drawMessages();

    // Optional Debug Line (Screen Coords)
    // if (gameStateManager?.currentState === "IN_FLIGHT" && player) {
    //     push(); stroke(255, 255, 0, 100); strokeWeight(1);
    //     line(width / 2, height / 2, mouseX, mouseY); pop(); // Line from screen center to mouse
    // }

} // --- End draw() ---


// --- Input Handling Functions ---

function keyPressed() {
    // Handle instructions screen keyboard input
    if (gameStateManager.currentState === "INSTRUCTIONS") {
        titleScreen.handleKeyPress(keyCode);
        return;
    }

    // For spacebar - just trigger initial shot
    if (key === ' ' || keyCode === 32) {
        if (gameStateManager.currentState === "IN_FLIGHT" && player) {
            player.handleFireInput();
        }
        return false;
    }

    if (!gameStateManager) return; // Don't process keys if game not ready

    // WEAPON SWITCHING - Number keys 1-9
    if (gameStateManager.currentState === "IN_FLIGHT" && player) {
        // Check for number keys 1-9
        const numKey = parseInt(key);
        if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
            // Convert to 0-based index for array access
            const weaponIndex = numKey - 1;
            if (player.switchToWeapon(weaponIndex)) {
                console.log(`Switched to weapon: ${player.currentWeapon.name}`);
            }
            return false; // Prevent default browser behavior
        }
    }

    // Toggle Galaxy Map (M key)
    if (key === 'm' || key === 'M') {
        if (gameStateManager.currentState === "IN_FLIGHT") gameStateManager.setState("GALAXY_MAP");
        else if (gameStateManager.currentState === "GALAXY_MAP") gameStateManager.setState("IN_FLIGHT");
    }
    // Allow ESC to exit map/docked state back to flight
    if (keyCode === ESCAPE) {
        if (gameStateManager.currentState === "GALAXY_MAP" || gameStateManager.currentState === "DOCKED") {
            gameStateManager.setState("IN_FLIGHT");
        }
    }
    // DEBUG: Toggle Player Wanted Status (L key)
    if (key === 'l' || key === 'L') {
        if (player) { player.isWanted = !player.isWanted; console.log("Player Wanted Status Toggled:", player.isWanted); }
    }
    // DEBUG: Clear Save Data (Shift + C key)
    // if (key === 'c' || key === 'C') {
    //     if (keyIsDown(SHIFT)) {
    //         if (confirm("Clear saved game data and reload?")) {
    //             console.log("Clearing saved game data...");
    //             try { localStorage.removeItem(SAVE_KEY); console.log("Save data cleared."); alert("Save data cleared. Reloading now..."); window.location.reload(); }
    //             catch (e) { console.error("Error clearing saved data:", e); alert("Error clearing save data."); }
    //         }
    //     }
    // }

    // return false; // Uncomment to prevent default browser key actions (like scrolling with arrows)
}

function keyReleased() {
    // We'll leave this empty or handle other keys
    return true; // Allow default for other keys
}

function mousePressed() {
    // Handle title screen clicks
    if (gameStateManager.currentState === "TITLE_SCREEN" || 
        gameStateManager.currentState === "INSTRUCTIONS") {
        titleScreen.handleClick();
        return;
    }

    // --- Fullscreen ON only once, on first click inside canvas ---
    if (!fullscreen() && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        fullscreen(true);
        // Optionally return here if you want to prevent other click actions on the first click
        // return;
    }

    // Existing input handling...
    if (!gameStateManager || !player || !uiManager || !galaxy) { return; }
    let clickHandledByUI = uiManager.handleMouseClicks(
        mouseX, mouseY, gameStateManager.currentState, player, player.currentSystem?.station?.getMarket(), galaxy
    );
    if (!clickHandledByUI && gameStateManager.currentState === "IN_FLIGHT") {
        player.handleFireInput();
    }
}

function mouseWheel(event) {
    if (uiManager && gameStateManager) {
        if (uiManager.handleMouseWheel(event, gameStateManager.currentState)) {
            return false; // prevent default
        }
    }
}
// --- End Input Handling ---


// --- Save/Load Functionality ---
function saveGame() {
    // Check if localStorage is supported and core objects exist
    if (typeof(Storage) !== "undefined" && player && galaxy && gameStateManager) {
        try {
            // console.log("Saving game state..."); // Optional log
            const saveData = {
                playerData: player.getSaveData(), // Includes shipType, pos, vel, angle, hull, credits, cargo, isWanted
                galaxyData: galaxy.getSaveData(), // Includes visited status for systems
                currentSystemIndex: galaxy.currentSystemIndex // Save current location
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            // console.log("Game Saved."); // Optional log
        } catch (e) { console.error("Error saving game:", e); }
    } else { console.warn("Could not save game (LocalStorage missing or objects not ready)."); }
}

function loadGame() {
    loadGameWasSuccessful = false; // Reset flag at start of load attempt
    // Check if localStorage is supported and core objects exist
    if (typeof(Storage) !== "undefined" && player && galaxy && gameStateManager) {
        const savedDataString = localStorage.getItem(SAVE_KEY); // Get saved data string
        if (savedDataString) { // Check if data exists
            try {
                const saveData = JSON.parse(savedDataString); // Parse the JSON data
                console.log("Loading game data...");

                // Load galaxy state first (current system index, visited status)
                galaxy.currentSystemIndex = saveData.currentSystemIndex ?? 0; // Load index or default to 0
                if (saveData.galaxyData) { galaxy.loadSaveData(saveData.galaxyData); } // Load visited flags

                // Load player data (loadSaveData handles ship type, stats, pos, angle, etc.)
                if (saveData.playerData) {
                    player.loadSaveData(saveData.playerData);
                } else { // If no player data in save, initialize default player state
                    console.warn("No player data found in save, applying defaults.");
                    player.applyShipDefinition("Sidewinder"); // Ensure default ship defs applied
                    player.isWanted = false; // Ensure default wanted status
                    // Keep default pos/vel/etc. from constructor
                }

                // Link player object to the loaded system object (crucial)
                player.currentSystem = galaxy.getCurrentSystem();
                if (player.currentSystem) {
                    player.currentSystem.player = player; // Assign the player to the system
                } else {
                    console.error("CRITICAL: Failed to link player to a valid currentSystem after load!");
                }

                loadGameWasSuccessful = true; // Mark load as successful
                console.log("Game Loaded Successfully.");

            } catch (e) { // Catch errors during parsing or loading
                console.error("Error parsing or applying saved game data:", e);
                localStorage.removeItem(SAVE_KEY); // Clear corrupted data to prevent future errors
                loadGameWasSuccessful = false;
            }
        } else {
            console.log("No saved game found."); // Log if no save key exists
            loadGameWasSuccessful = false;
        }
    } else {
        console.warn("Could not load game (LocalStorage missing or objects not ready).");
        loadGameWasSuccessful = false;
    }
    return loadGameWasSuccessful; // Return status
}
// --- End Save/Load ---


// --- p5.js windowResized Function ---
// Called automatically by p5.js when the browser window is resized.
function windowResized() {
    resizeCanvas(windowWidth, windowHeight); // Adjust canvas size
    // console.log("Window resized."); // Optional log
    // Note: UI elements using width/height might need repositioning logic here or in their draw methods.
}