// ****** sketch.js ******

// --- Ship Definitions and Drawing Functions are loaded from ships.js ---
// Ensure ships.js is included BEFORE this file in index.html

// --- Global Constants ---
const OFFSCREEN_VOLUME_REDUCTION_FACTOR = 0.1; // Volume multiplier for off-screen sounds
const SHIELD_RECHARGE_RATE_MULTIPLIER = 4.0; // Global multiplier for shield recharge speed

// --- Global Variables ---
let player, galaxy, uiManager, gameStateManager, soundManager, titleScreen, font, inventoryScreen, eventManager, saveSelectionScreen;
let loadGameWasSuccessful = false;
window.activeSaveSlotIndex = 0; // Default to slot 0, will be updated by SaveSelectionScreen
let globalSessionSeed; // Declaration for the session seed
// --- End Global Variables ---

// --- p5.js Setup Function ---
// Runs once at the beginning when the sketch starts.
function setup() {

    font = loadFont('libraries/Frontier.ttf');

    soundManager = new SoundManager(); // Create the manager

    // Initialize EventManager - references will be set in newGame/loadGame
    eventManager = new EventManager(); 

    // Create the canvas to fill the browser window
    createCanvas(windowWidth, windowHeight);
    // Set angle mode to RADIANS for p5.js rotation functions (like rotate())
    // Note: Internal angle calculations in classes mostly use RADIANS now.
    angleMode(RADIANS);
    // Default text alignment and size
    textAlign(CENTER, CENTER);
    textSize(14);
    console.log("Setting up Elite MVP..."); // Log startup

    // Initialize object pools after p5.js is ready
    if (typeof WeaponSystem !== 'undefined' && typeof ObjectPool !== 'undefined') {
        console.log("Initializing weapon system pool in p5.js setup()");
        WeaponSystem.init(100);
    }

    // --- Check if Ship Definitions Loaded ---
    if (typeof SHIP_DEFINITIONS === 'undefined') {
        console.error("FATAL ERROR: SHIP_DEFINITIONS not loaded from ships.js! Check file inclusion order in index.html.");
        // Display error on screen and stop execution
        background(0); fill(255,0,0); textSize(20);
        text("ERROR: Failed to load ship definitions!\nCheck index.html", width/2, height/2);
        noLoop(); // Stop the draw loop
        return;
    }

    // --- Instantiate Core Game Objects ---
    // Create managers and the galaxy first
    gameStateManager = new GameStateManager();
    galaxy = new Galaxy(); // Creates Galaxy object (systems array is initially empty)
    player = new Player();
    uiManager = new UIManager();
    titleScreen = new TitleScreen();
    inventoryScreen = new InventoryScreen();
    saveSelectionScreen = new SaveSelectionScreen();

    // --- Calculate Player Radian Properties ---
    // Now that p5 is ready, calculate radian speed based on degree definition
    if (player && typeof player.applyShipDefinition === 'function') {
        player.applyShipDefinition(player.shipTypeName);
    } else {
         console.error("FATAL ERROR: Player object or applyShipDefinition method missing!");
         noLoop(); return;
    }

    // --- Don't auto-load game data - let save selection screen handle it ---
    console.log("Game initialization complete. Waiting for user save selection...");
    loadGameWasSuccessful = false; // We'll handle loading in the save selection screen

    // --- Don't initialize Galaxy Systems automatically ---
    // The save selection screen will handle new game or load game logic

    // --- System linking will be handled by save selection screen ---
    // We don't link the player to a system yet since no galaxy is initialized

    // --- Set Initial Game State ---
    // If everything above succeeded and state is still LOADING, transition to IN_FLIGHT
    if (gameStateManager && gameStateManager.currentState === "LOADING") {
         gameStateManager.setState("TITLE_SCREEN"); // Changed to start on title screen
    } else if (gameStateManager) {
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
    const currentState = gameStateManager?.currentState;

    // Title/instructions/save selection screen animation
    if (currentState === "TITLE_SCREEN" || currentState === "INSTRUCTIONS") {
        titleScreen.update(deltaTime);
    } else if (currentState === "SAVE_SELECTION") {
        saveSelectionScreen.update(deltaTime);
    }

    // Main game state update and draw
    if (gameStateManager && player) {
        try {
            gameStateManager.update(player); // This calls update methods of current screen/state

            // EventManager logic - only if in relevant game states
            const activeGameStatesForEventManager = ["IN_FLIGHT", "DOCKED", "JUMPING", "GALAXY_MAP"];
            if (activeGameStatesForEventManager.includes(currentState)) {
                const currentSystemForEventManager = galaxy?.getCurrentSystem(); // Call is now conditional

                if (currentSystemForEventManager) { // Only proceed if a system actually exists
                    if (eventManager && player && uiManager) {
                        // Initialize/Re-initialize EventManager if system/player changed or if it's not pointing to the current one.
                        // Assuming EventManager has 'starSystem' and 'player' properties to check against.
                        // And that initializeReferences is safe to call.
                        if (typeof eventManager.initializeReferences === 'function' && 
                            (eventManager.starSystem !== currentSystemForEventManager || eventManager.player !== player /* || add other relevant checks if EventManager stores them */)) {
                            eventManager.initializeReferences(currentSystemForEventManager, player, uiManager);
                        }

                        // Update EventManager only when IN_FLIGHT and if it seems initialized (has a starSystem reference)
                        if (currentState === "IN_FLIGHT" && eventManager.starSystem && typeof eventManager.update === 'function') {
                            eventManager.update();
                        }
                    }
                }
            }

            // Continuous firing logic
            if (currentState === "IN_FLIGHT" && !player.destroyed && keyIsDown(32)) {
                player.handleFireInput();
            }
            // Draw visuals based on current state
            gameStateManager.draw(player);
            // Check for held market buttons
            if (currentState === "VIEWING_MARKET" && uiManager) {
                uiManager.checkMarketButtonHeld(player.currentSystem?.station?.getMarket(), player);
            }
        } catch (e) {
            // Catch any unexpected errors during the main loop
            showCriticalError(`ERROR in Update/Draw Loop!\nCheck Console.\n${e.message}`);
            console.error("!!! ERROR during gameStateManager update/draw:", e);
            noLoop();
        }
    } else {
        showCriticalError("Error: Game State Manager or Player missing!");
        console.error("CRITICAL ERROR: gameStateManager or Player missing in draw()!");
        noLoop();
        return;
    }
    // --- UI Drawing ---
    uiManager.drawFramerate();
    uiManager.drawMessages();

    // Optional Debug Line (Screen Coords)
    // if (gameStateManager?.currentState === "IN_FLIGHT" && player) {
    //     push(); stroke(255, 255, 0, 100); strokeWeight(1);
    //     line(width / 2, height / 2, mouseX, mouseY); pop(); // Line from screen center to mouse
    // }

}

/**
 * Displays a critical error message on the screen in red and large font.
 * @param {string} msg - The error message to display.
 */
function showCriticalError(msg) {
    fill(255, 0, 0); textSize(20); textAlign(CENTER, CENTER); noStroke();
    text(msg, width / 2, height / 2);
}


// --- Input Handling Functions ---

function keyPressed() {
    // Toggle inventory with “I”
    if ((key === 'i' || key === 'I') && gameStateManager.currentState === "IN_FLIGHT") {
        gameStateManager.showingInventory = !gameStateManager.showingInventory;
        return false;
    }
    // Instructions screen keyboard input
    if (gameStateManager.currentState === "INSTRUCTIONS") {
        titleScreen.handleKeyPress(keyCode);
        return;
    }
    // Save Selection screen keyboard input
    if (gameStateManager.currentState === "SAVE_SELECTION") {
        if (saveSelectionScreen && typeof saveSelectionScreen.handleKeyPressed === 'function') {
            saveSelectionScreen.handleKeyPressed(key, keyCode);
        }
        return; // Explicitly return to prevent further processing in this state
    }
    // Spacebar triggers initial shot
    if ((key === ' ' || keyCode === 32) && gameStateManager.currentState === "IN_FLIGHT" && player) {
        player.handleFireInput();
        return false;
    }
    if (!gameStateManager) return;
    // Weapon switching 1-9
    if (gameStateManager.currentState === "IN_FLIGHT" && player) {
        const numKey = parseInt(key);
        if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
            const weaponIndex = numKey - 1;
            if (player.switchToWeapon(weaponIndex)) {
                console.log(`Switched to weapon: ${player.currentWeapon.name}`);
            }
            return false;
        }
    }
    // Single-key actions (map, wanted, autopilot, etc.)
    switch (key.toLowerCase()) {
        case 'm':
            if (gameStateManager.currentState === "IN_FLIGHT") gameStateManager.setState("GALAXY_MAP");
            else if (gameStateManager.currentState === "GALAXY_MAP") gameStateManager.setState("IN_FLIGHT");
            return;
        case 'b':
            // Toggle secret base navigation when in flight
            if (gameStateManager.currentState === "IN_FLIGHT" && player) {
                const wasActive = player.showSecretBaseNavigation;
                player.showSecretBaseNavigation = !wasActive;
                
                if (player.showSecretBaseNavigation) {
                    // Only show message if there's actually a secret base in the system
                    if (player.currentSystem && player.currentSystem.secretStations && 
                        player.currentSystem.secretStations.length > 0) {
                        
                        // Find closest secret station and determine if it's discovered
                        let anyDiscovered = false;
                        for (const station of player.currentSystem.secretStations) {
                            if (station.discovered) {
                                anyDiscovered = true;
                                break;
                            }
                        }
                        
                        // Initialize cache immediately to avoid delay
                        player._cachedNavigation = null; // Clear any old cache
                        
                        if (anyDiscovered) {
                            uiManager.addMessage("Secret Base Navigation: ACTIVATED", [0, 255, 255]);
                        } else {
                            uiManager.addMessage("Secret Base Detector: ACTIVATED - Base detected but not yet discovered", [0, 200, 200]);
                        }
                    } else {
                        uiManager.addMessage("No Secret Base detected in this system", [255, 100, 100]);
                        // Turn off if there's no secret base
                        player.showSecretBaseNavigation = false;
                    }
                } else {
                    // Clear cache when deactivating to free memory
                    player._cachedNavigation = null;
                    uiManager.addMessage("Secret Base Navigation: DEACTIVATED", [150, 150, 150]);
                }
                return false;
            }
            break;
        case 'l':
            if (player && player.currentSystem) {
                const currentSystem = player.currentSystem;
                const isCurrentlyWanted = currentSystem.playerWanted || false;
                currentSystem.playerWanted = !isCurrentlyWanted;
                currentSystem.policeAlertSent = !isCurrentlyWanted;
                console.log(`Player wanted status in ${currentSystem.name}: ${!isCurrentlyWanted}`);
                if (!isCurrentlyWanted) {
                    uiManager.addMessage(`WANTED in ${currentSystem.name} system!`, 'crimson');
                    console.log(`ALERT: Police alert issued in ${currentSystem.name}!`);
                } else {
                    uiManager.addMessage(`Legal status cleared in ${currentSystem.name}`, 'lightgreen');
                    console.log(`NOTICE: Police alert cleared in ${currentSystem.name}.`);
                }
                return false;
            }
            break;
        case 'h':
        case 'j':
            if (gameStateManager.currentState === "IN_FLIGHT" && player && !player.destroyed) {
                handleAutopilotKey(key.toLowerCase());
                return false;
            }
            break;
    }
    // ESC to exit map/docked state back to flight
    if (keyCode === ESCAPE) {
        if (gameStateManager.currentState === "GALAXY_MAP" || gameStateManager.currentState === "DOCKED") {
            gameStateManager.setState("IN_FLIGHT");
        }
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

/**
 * Handles autopilot key logic for 'h' (station) and 'j' (jump zone).
 * @param {string} autopilotKey - The pressed key, already lowercased.
 */
function handleAutopilotKey(autopilotKey) {
    if (autopilotKey === 'h') {
        console.log("H key detected - toggling station autopilot");
        player.toggleAutopilot('station');
    } else if (autopilotKey === 'j') {
        console.log("J key detected - toggling jump zone autopilot");
        player.toggleAutopilot('jumpzone');
    }
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

    // Handle Save Selection screen clicks
    if (gameStateManager.currentState === "SAVE_SELECTION") {
        if (saveSelectionScreen && typeof saveSelectionScreen.handleClick === 'function') {
            saveSelectionScreen.handleClick(mouseX, mouseY);
        }
        return; // Explicitly return to prevent further processing in this state
    }

    // --- Fullscreen ON only once, on first click inside canvas ---
    if (!fullscreen() && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        fullscreen(true);
    }

    // Handle market button presses specifically 
    if (gameStateManager.currentState === "VIEWING_MARKET" && uiManager) {
        if (uiManager.handleMarketMousePress(
            mouseX, mouseY, 
            player.currentSystem?.station?.getMarket(), 
            player
        )) return; // Click was handled by market UI
    }

    // Handle inventory clicks
    if (gameStateManager.showingInventory && gameStateManager.currentState === "IN_FLIGHT") {
        const res = inventoryScreen.handleClick(mouseX, mouseY, player);
        if (res === 'close') {
            gameStateManager.showingInventory = false;
            return;
        }
        if (res?.action === 'jettison') {
            handleJettisonFromInventory(res.idx);
            return;
        }
    }

    // Defensive: Ensure all core objects exist
    if (!gameStateManager || !player || !uiManager || !galaxy) return;

    // Check if general UI handled the click (e.g., map, station services)
    if (uiManager.handleMouseClicks(
        mouseX, mouseY, gameStateManager.currentState, player, player.currentSystem?.station?.getMarket(), galaxy
    )) return;

    // If UI did NOT handle the click AND we are in flight:
    if (gameStateManager.currentState === "IN_FLIGHT") {
        player.handleMousePressedForTargeting();
    }
}

/**
 * Handles the logic for jettisoning an item from the inventory.
 * Extracted for clarity and maintainability.
 * @param {number} idx - The index of the item in the player's cargo.
 */
function handleJettisonFromInventory(idx) {
    const item = player.cargo[idx];
    if (item && player.removeCargo(item.name, 1)) {
        uiManager.addMessage(`Jettisoned 1 ${item.name}`);
        const dir = p5.Vector.fromAngle(player.angle + PI);
        const pos = p5.Vector.add(player.pos, dir.copy().mult(player.size * 2.6));
        const cargo = new Cargo(pos.x, pos.y, item.name, 1);
        cargo.vel = dir.mult(1.5);
        player.currentSystem.addCargo(cargo);
    }
}
  

function mouseReleased() {
  // Handle market button releases
  if (gameStateManager.currentState === "VIEWING_MARKET" && uiManager) {
      uiManager.handleMarketMouseRelease();
  }
  return false;
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
    try {
        if (typeof(Storage) !== "undefined") {
            const currentSlotIndex = window.activeSaveSlotIndex !== undefined ? window.activeSaveSlotIndex : 0;
            const saveKey = SAVE_KEY_PREFIX + currentSlotIndex;

            const saveData = {
                playerData: player.getSaveData(),
                galaxyData: galaxy.getSaveData(),
                currentSystemIndex: galaxy.currentSystemIndex
                // currentView: { ...uiManager.currentView } // Consider what to save from currentView
            };
            localStorage.setItem(saveKey, JSON.stringify(saveData));
            console.log(`Game saved to slot ${currentSlotIndex} (Key: ${saveKey})`);
            
            // Refresh save previews in SaveSelectionScreen
            // Check if saveSelectionScreen instance exists and has the method
            if (typeof saveSelectionScreen !== 'undefined' && saveSelectionScreen && typeof saveSelectionScreen.loadAllSavePreviews === 'function') {
                saveSelectionScreen.loadAllSavePreviews(); 
            } else if (window.saveScreen && typeof window.saveScreen.loadAllSavePreviews === 'function') {
                 // Fallback for older potential global reference, though direct reference is better
                window.saveScreen.loadAllSavePreviews();
            }

        } else {
            console.warn("localStorage is not supported. Game cannot be saved.");
        }
    } catch (e) {
        console.error("Error saving game:", e);
    }
}

function loadGame(slotIndex) {
    try {
        if (typeof(Storage) !== "undefined") {
            const keyToLoad = SAVE_KEY_PREFIX + (slotIndex !== undefined ? slotIndex : 0);
            const savedDataString = localStorage.getItem(keyToLoad);
            if (savedDataString) {
                const savedData = JSON.parse(savedDataString);
                
                // 1. Restore Galaxy Data
                if (savedData.galaxyData) {
                    galaxy.loadSaveData(savedData.galaxyData); // This populates galaxy.systems
                } else {
                    console.error(`No galaxyData found in save file for slot ${slotIndex} (Key: ${keyToLoad})`);
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
                
                window.activeSaveSlotIndex = (slotIndex !== undefined ? slotIndex : 0);
                console.log(`Game loaded from slot ${window.activeSaveSlotIndex} (Key: ${keyToLoad})`);
                return true; // Indicate success
            } else {
                console.warn(`No saved game found in slot ${slotIndex !== undefined ? slotIndex : 0} (Key: ${keyToLoad})`);
                return false; // Indicate failure
            }
        } else {
            console.warn("localStorage is not supported. Game cannot be loaded.");
            return false; // Indicate failure
        }
    } catch (e) {
        console.error(`Error loading game from slot ${slotIndex}:`, e);
        showCriticalError(`Error loading game. Check console.\\n${e.message}`);
        return false; // Indicate failure
    }
}

// --- End Save/Load ---


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