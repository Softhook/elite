// ****** sketch.js ******

let player;
let galaxy;
let uiManager;
let gameStateManager;

const SAVE_KEY = 'eliteMVPSaveData';
let loadGameWasSuccessful = false; // Flag for load status

function setup() {
    createCanvas(windowWidth, windowHeight);
    angleMode(DEGREES); // IMPORTANT: Set angle mode for rotation logic
    textAlign(CENTER, CENTER);
    textSize(14);
    console.log("Setting up Elite MVP (Scrolling View)...");

    // Instantiate core components
    gameStateManager = new GameStateManager();
    galaxy = new Galaxy();
    player = new Player(); // Player created, starts at world (0,0) by default
    uiManager = new UIManager();

    // Initialize galaxy systems
    galaxy.init();
    // Attempt to load saved state AFTER objects are created
    loadGameWasSuccessful = loadGame(); // loadGame now returns true/false

    // Link player to the current system (determined by load or default)
    const systemToStartIn = galaxy.getCurrentSystem();
    if (systemToStartIn) {
        player.currentSystem = systemToStartIn;
        // If no save loaded, explicitly run enterSystem logic for the starting system
        if (!loadGameWasSuccessful) {
            console.log("No save found or load failed, initializing starting system.");
            systemToStartIn.enterSystem(); // Spawn initial enemies etc.
        }
        console.log(`Player starting/loaded in system: ${player.currentSystem.name}`);
        // Player position is handled by loadSaveData or defaults to (0,0)
    } else {
        console.error("CRITICAL Error: Could not assign a starting system to the player!");
        gameStateManager.setState("LOADING"); // Keep loading state on critical error
        return; // Stop setup if system assignment failed
    }

    // Set initial game state AFTER loading and system setup
    // The game state string itself isn't loaded anymore. Determine state based on context.
    // For now, default to IN_FLIGHT. A more robust system might check if loaded position is dockable.
    if (gameStateManager.currentState === "LOADING") {
         console.log("Setup complete, setting initial state to IN_FLIGHT.");
         gameStateManager.setState("IN_FLIGHT");
         // Potential future enhancement: Check if player loaded inside docking radius -> setState("DOCKED")?
    }

    console.log("Setup complete.");
}

function draw() {
    background(0); // Clear screen each frame

    // --- Game State Update and Draw ---
    if (gameStateManager) {
        // Pass player reference to manager methods
        gameStateManager.update(player); // Pass player for update logic
        gameStateManager.draw(player); // Pass player for drawing logic (translation)
    } else {
         // Handle case where manager failed to initialize
         fill(255,0,0); textSize(20); textAlign(CENTER,CENTER);
         text("Error: Game State Manager not initialized.", width/2, height/2);
         return;
    }

    // --- Player Aiming Debug Line (Screen Coordinates) ---
    // Optional: Keep for debugging aiming issues
    // if (gameStateManager && gameStateManager.currentState === "IN_FLIGHT" && player) {
    //     push();
    //     stroke(255, 255, 0, 100); // Yellow, semi-transparent
    //     strokeWeight(1);
    //     line(width / 2, height / 2, mouseX, mouseY); // Line from screen center to mouse
    //     pop();
    // }
    // --- End Debug Line ---

} // End draw()


// --- Input Handling ---

function keyPressed() {
    if (!gameStateManager) return; // Safety check

    // Keyboard input for movement is handled by Player.handleInput using keyIsDown()
    // Only handle state change keys here

    // Toggle Galaxy Map (M key)
    if (key === 'm' || key === 'M') {
        if (gameStateManager.currentState === "IN_FLIGHT") {
            gameStateManager.setState("GALAXY_MAP");
            if (uiManager) uiManager.selectedSystemIndex = -1; // Clear map selection
        } else if (gameStateManager.currentState === "GALAXY_MAP") {
            gameStateManager.setState("IN_FLIGHT");
        }
    }
    // Allow ESC to exit map/docked state
    if (keyCode === ESCAPE) {
        if (gameStateManager.currentState === "GALAXY_MAP" || gameStateManager.currentState === "DOCKED") {
            gameStateManager.setState("IN_FLIGHT"); // Go back to flight
        }
    }
    // return false; // Prevent default browser actions if needed
}


function mousePressed() {
    // Ensure core objects exist before handling clicks
    if (!gameStateManager || !player || !uiManager || !galaxy) {
        console.warn("Mouse press ignored: Core objects not ready.");
        return;
    }

    let clickHandledByUI = false;

    // 1. Let UIManager try to handle the click based on current state
    clickHandledByUI = uiManager.handleMouseClicks(
        mouseX, mouseY,
        gameStateManager.currentState,
        player,
        player.currentSystem?.station?.getMarket(), // Safely access market
        galaxy
    );

    // 2. If UI didn't handle it AND we're in flight, assume it's a firing attempt
    if (!clickHandledByUI && gameStateManager.currentState === "IN_FLIGHT") {
        player.handleFireInput(); // Player class handles cooldown check
    }
}

// --- Save/Load Functionality ---

function saveGame() {
    // Ensure critical objects exist before trying to save
    if (typeof(Storage) !== "undefined" && player && galaxy && gameStateManager) {
        try {
            console.log("Saving game state...");
            const saveData = {
                // SAVE player data (includes world pos, vel, angle, stats, cargo)
                playerData: player.getSaveData(),
                // SAVE galaxy data (visited status)
                galaxyData: galaxy.getSaveData(),
                // SAVE current system index explicitly
                currentSystemIndex: galaxy.currentSystemIndex,
                // --- DO NOT SAVE gameState string ---
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
    loadGameWasSuccessful = false; // Reset flag at start of load attempt
    // Ensure critical objects exist before trying to load into them
    if (typeof(Storage) !== "undefined" && player && galaxy && gameStateManager) {
        const savedDataString = localStorage.getItem(SAVE_KEY);
        if (savedDataString) {
            try {
                const saveData = JSON.parse(savedDataString);
                console.log("Loading game data...");

                // Load galaxy state first (needs to know current system BEFORE player load)
                if (saveData.currentSystemIndex !== undefined) {
                    galaxy.currentSystemIndex = saveData.currentSystemIndex;
                    console.log(`Loaded current system index: ${galaxy.currentSystemIndex}`);
                } else {
                     console.warn("No current system index found in save data. Defaulting to 0.");
                     galaxy.currentSystemIndex = 0; // Default to first system if missing
                }
                // Load visited status
                 if (saveData.galaxyData) {
                     galaxy.loadSaveData(saveData.galaxyData);
                 } else {
                      console.warn("No galaxy visited data found in save.");
                 }

                 // Load player data (pos, vel, stats, cargo etc.)
                if (saveData.playerData) {
                    player.loadSaveData(saveData.playerData); // This loads position etc.
                } else {
                    console.warn("No player data found in save.");
                    // If no player data, player keeps its default constructor values (e.g., pos 0,0)
                }

                // Link player to the loaded system object AFTER galaxy index is set
                player.currentSystem = galaxy.getCurrentSystem();
                if (!player.currentSystem) {
                    console.error("CRITICAL: Failed to link player to a valid currentSystem after load!");
                } else {
                     console.log(`Player linked to loaded system: ${player.currentSystem.name}`);
                }

                // --- State Determination happens in setup() ---
                // We don't load the state string directly anymore.

                loadGameWasSuccessful = true;
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
    console.log("Window resized.");
    // UI element positions might need recalculation if based on width/height
}