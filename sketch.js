// ****** sketch.js ******

let player;
let galaxy;
let uiManager;
let gameStateManager;

const SAVE_KEY = 'eliteMVPSaveData';
let loadGameWasSuccessful = false; // Moved flag to global scope

function setup() {
    createCanvas(windowWidth, windowHeight);
    angleMode(DEGREES); // Use degrees for player rotation logic
    textAlign(CENTER, CENTER);
    textSize(14);
    console.log("Setting up Elite MVP...");

    // Instantiate core components
    gameStateManager = new GameStateManager();
    galaxy = new Galaxy();
    player = new Player(); // Create player BEFORE loadGame
    uiManager = new UIManager();

    // Initialize systems and link player
    galaxy.init(); // Create the systems
    loadGameWasSuccessful = loadGame(); // Attempt to load saved state AFTER objects are created

    // Ensure player has a current system reference after potential load
    // And ensure the system knows it's entered if loading failed
    const systemToStartIn = galaxy.getCurrentSystem();
    if (systemToStartIn) {
         player.currentSystem = systemToStartIn;
         if (!loadGameWasSuccessful) { // If no save loaded, explicitly run enterSystem logic
             console.log("No save found or load failed, initializing starting system.");
             systemToStartIn.enterSystem();
         }
         console.log(`Player starting in system: ${player.currentSystem.name}`);
    } else {
        console.error("Error: Could not assign a starting system to the player!");
        gameStateManager.setState("LOADING"); // Keep loading state on error
        return;
    }


    // Set initial state AFTER potential load and system setup
    if (gameStateManager.currentState === "LOADING") { // Only transition if still loading
        // Determine start state (maybe loaded docked state later?)
        // For now, always start in flight after load/init
        gameStateManager.setState("IN_FLIGHT");
    }

    console.log("Setup complete.");
}

function draw() {
    background(0); // Clear screen each frame

    // Let the GameStateManager handle updates and drawing based on state
    if (gameStateManager) { // Ensure manager exists
        gameStateManager.update();
        gameStateManager.draw();
    }


    // --- Add Firing Debug Line Here (when in flight) ---
    if (gameStateManager && gameStateManager.currentState === "IN_FLIGHT" && player) {
        push(); // Isolate debug drawing styles
        stroke(255, 255, 0, 150); // Yellow, semi-transparent line
        strokeWeight(1);
        // Draw line from player's center position to current mouse position
        line(player.pos.x, player.pos.y, mouseX, mouseY);
        pop(); // Restore previous styles
    }
    // --- End Debug Line ---

} // End draw()

function keyPressed() {
    if (!gameStateManager) return; // Safety check

    // --- Input handled based on State ---

    if (gameStateManager.currentState === "IN_FLIGHT") {
        // Player movement keys are handled by Player.handleInput using keyIsDown()
        // No specific actions needed here for continuous movement keys
    }

    // Toggle Galaxy Map (M key)
    if (key === 'm' || key === 'M') {
        if (gameStateManager.currentState === "IN_FLIGHT") {
            gameStateManager.setState("GALAXY_MAP");
            if (uiManager) uiManager.selectedSystemIndex = -1; // Clear selection when opening map
        } else if (gameStateManager.currentState === "GALAXY_MAP") {
            gameStateManager.setState("IN_FLIGHT");
        }
    }
    // Allow ESC to exit map/docked state
    if (keyCode === ESCAPE) {
        if (gameStateManager.currentState === "GALAXY_MAP") {
            gameStateManager.setState("IN_FLIGHT");
        } else if (gameStateManager.currentState === "DOCKED") {
            console.log("Undocking via ESC");
            gameStateManager.setState("IN_FLIGHT");
        }
    }

    // Prevent default browser behavior for arrow keys etc. if needed
    // return false;
}


function mousePressed() {
    if (!gameStateManager || !player || !uiManager || !galaxy) return; // Safety checks

    let clickHandledByUI = false;

    // Delegate click handling to UIManager first
    clickHandledByUI = uiManager.handleMouseClicks(
        mouseX, mouseY,
        gameStateManager.currentState,
        player,
        player.currentSystem?.station?.getMarket(), // Pass market only if valid
        galaxy
    );

    // If UI didn't handle it and we're in flight, trigger player fire
    if (!clickHandledByUI && gameStateManager.currentState === "IN_FLIGHT") {
        player.handleFireInput(); // This now checks cooldown and calls fire()
    }
}

// --- Save/Load Functionality ---
// (saveGame and loadGame functions remain the same as before)

function saveGame() {
    if (typeof(Storage) !== "undefined" && player && galaxy && gameStateManager) { // Add checks
        try {
            const saveData = {
                playerData: player.getSaveData(),
                galaxyData: galaxy.getSaveData(), // Save visited status
                // Optionally save gameState if needed (e.g., was player docked?)
                // gameState: gameStateManager.currentState
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            console.log("Game Saved.");
        } catch (e) {
            console.error("Error saving game:", e);
        }
    } else {
        console.warn("Could not save game. Local storage unsupported or core objects missing.");
    }
}

function loadGame() {
    // loadGameWasSuccessful is now global
    loadGameWasSuccessful = false; // Reset flag at start of load attempt
    if (typeof(Storage) !== "undefined" && player && galaxy && gameStateManager) { // Add checks
        const savedDataString = localStorage.getItem(SAVE_KEY);
        if (savedDataString) {
            try {
                const saveData = JSON.parse(savedDataString);
                console.log("Loading game data...");

                // Load player data first
                if (saveData.playerData) {
                    player.loadSaveData(saveData.playerData);
                } else {
                     console.warn("No player data found in save.");
                }

                 // Load galaxy data AFTER player data (as player load might affect system index)
                 // Set current system index from saved player data first
                 if (saveData.playerData && typeof saveData.playerData.currentSystemIndex !== 'undefined') {
                     galaxy.currentSystemIndex = saveData.playerData.currentSystemIndex;
                     // Ensure the player object also references the correct system object AFTER galaxy is init'd
                     player.currentSystem = galaxy.getCurrentSystem();
                      console.log(`Loaded player into system index: ${galaxy.currentSystemIndex}, Name: ${player.currentSystem?.name}`);
                 } else {
                      console.warn("No current system index found in player save data.");
                      // Default to system 0 if missing? Might be needed if save is partial
                      galaxy.currentSystemIndex = 0;
                      player.currentSystem = galaxy.getCurrentSystem();
                 }

                // Load galaxy system properties (e.g., visited status)
                if (saveData.galaxyData) {
                     galaxy.loadSaveData(saveData.galaxyData);
                } else {
                     console.warn("No galaxy data found in save.");
                }


                // TODO: Optionally restore gameState (e.g., if saved while docked)
                // if (saveData.gameState) {
                //     gameStateManager.setState(saveData.gameState); // Be careful with this!
                // }


                loadGameWasSuccessful = true; // Mark load as successful only if parsing worked
                console.log("Game Loaded Successfully.");


            } catch (e) {
                console.error("Error parsing saved game data:", e);
                localStorage.removeItem(SAVE_KEY); // Clear corrupted data
                loadGameWasSuccessful = false;
            }
        } else {
            console.log("No saved game found.");
            loadGameWasSuccessful = false;
        }
    } else {
        console.warn("Could not load game. Local storage unsupported or core objects missing.");
        loadGameWasSuccessful = false;
    }
    return loadGameWasSuccessful; // Return status
}


// Optional: Resize canvas dynamically
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // May need to recalculate UI element positions if they depend on width/height
     console.log("Window resized.");
}