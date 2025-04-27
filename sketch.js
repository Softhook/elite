// ****** sketch.js ******

// --- Ship Definitions and Drawing Functions are loaded from ships.js ---
// Ensure ships.js is included BEFORE this file in index.html

const OFFSCREEN_VOLUME_REDUCTION_FACTOR = 0.1; // Volume multiplier for off-screen sounds
const SHIELD_RECHARGE_RATE_MULTIPLIER = 4.0; // Global multiplier for shield recharge speed

// --- Global Variables ---
let player;                 // The player object
let galaxy;                 // The galaxy object containing star systems
let uiManager;              // Handles drawing UI elements (HUD, menus, map)
let gameStateManager;       // Controls the overall game state (flight, docked, map etc.)
const SAVE_KEY = 'eliteMVPSaveData'; // Key used for saving/loading game data in localStorage
let loadGameWasSuccessful = false;     // Flag to track if a saved game was successfully loaded
let soundManager;
let titleScreen;            // Handles title screen and instructions screen
let font;
let inventoryScreen;
// --- End Global Variables ---

// --- p5.js Setup Function ---
// Runs once at the beginning when the sketch starts.
function setup() {

    font = loadFont('libraries/Frontier.ttf');

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

    // --- Instantiate Core Game Objects ---
    // Create managers and the galaxy first
    gameStateManager = new GameStateManager();
    galaxy = new Galaxy(); // Creates Galaxy object (systems array is initially empty)
    player = new Player();
    uiManager = new UIManager();
    titleScreen = new TitleScreen();
    inventoryScreen = new InventoryScreen();

    // --- Calculate Player Radian Properties ---
    // Now that p5 is ready, calculate radian speed based on degree definition
    if (player && typeof player.applyShipDefinition === 'function') {
        player.applyShipDefinition(player.shipTypeName);
    } else {
         console.error("FATAL ERROR: Player object or applyShipDefinition method missing!");
         noLoop(); return;
    }

    // --- Load Saved Game Data (if exists) ---
    console.log("Attempting to load game data...");
    loadGameWasSuccessful = loadGame(); // Attempt to load save data

    // --- Initialize Galaxy Systems ONLY if no save data was loaded ---
    if (!loadGameWasSuccessful) {
        console.log("No save game found, generating procedural galaxy...");
        if (galaxy && typeof galaxy.initGalaxySystems === 'function') {
            galaxy.initGalaxySystems();
        } else {
            console.error("FATAL ERROR: Galaxy object or initGalaxySystems method missing!");
            noLoop(); return;
        }
    } else {
        console.log("Save game loaded successfully, using saved galaxy data.");
    }

    // --- Link Player to Current System & Run Initial Entry Logic ---
    const systemToStartIn = galaxy.getCurrentSystem(); // Get system based on load or default index

    if (systemToStartIn) {
        player.currentSystem = systemToStartIn; // Set player's current system reference
        systemToStartIn.player = player; // Assign the player to the system
        // If no save game was loaded, the starting system needs its initial setup
        if (!loadGameWasSuccessful) {
            console.log("Running initial enterSystem for starting system..."); 
            if (typeof systemToStartIn.enterSystem === 'function') {
                systemToStartIn.enterSystem(player); // Spawn initial NPCs/Asteroids etc.
            } else {
                console.error("ERROR: systemToStartIn object missing enterSystem method!");
            }
        } else {
             console.log(`Player starting/loaded in system: ${player.currentSystem.name}`);
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
            
            // Check for held market buttons
            if (gameStateManager.currentState === "VIEWING_MARKET" && uiManager) {
                uiManager.checkMarketButtonHeld(
                    player.currentSystem?.station?.getMarket(), 
                    player
                );
            }
            
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
  // toggle inventory with “I”
  if ((key === 'i' || key === 'I') 
      && gameStateManager.currentState === "IN_FLIGHT") {
    gameStateManager.showingInventory = !gameStateManager.showingInventory;
    return false;
  }

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
      if (player) { 
          player.isWanted = !player.isWanted; 
          console.log("Player Wanted Status Toggled:", player.isWanted);
          
          // CRITICAL FIX: Update the current system's police alert flag
          if (player.currentSystem) {
              if (player.isWanted) {
                  player.currentSystem.policeAlertSent = true;
                  console.log(`ALERT: System-wide police alert issued in ${player.currentSystem.name}!`);
              } else {
                  player.currentSystem.policeAlertSent = false;
                  console.log(`NOTICE: Police alert cleared in ${player.currentSystem.name}.`);
              }
          }
      }
  }

      // Autopilot controls - with improved debugging
      if (gameStateManager && gameStateManager.currentState === "IN_FLIGHT" && player && !player.destroyed) {
          // H key - autopilot to station
          if (key.toLowerCase() === 'h') {
              console.log("H key detected - toggling station autopilot");
              player.toggleAutopilot('station');
              return false; // Prevent default browser behavior
          }
          
          // J key - autopilot to jump zone
          if (key.toLowerCase() === 'j') {
              console.log("J key detected - toggling jump zone autopilot");
              player.toggleAutopilot('jumpzone');
              return false; // Prevent default browser behavior
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
  }

  // Handle market button presses specifically 
  if (gameStateManager.currentState === "VIEWING_MARKET" && uiManager) {
      return uiManager.handleMarketMousePress(
          mouseX, mouseY, 
          player.currentSystem?.station?.getMarket(), 
          player
      );
  }

  // This is where your code goes - inside mousePressed()
  if (gameStateManager.showingInventory && gameStateManager.currentState === "IN_FLIGHT") {
    const res = inventoryScreen.handleClick(mouseX, mouseY, player);
    if (res === 'close') {
      gameStateManager.showingInventory = false;
      return false;
    } 
    else if (res?.action === 'jettison') {
      const item = player.cargo[res.idx];
      if (item && player.removeCargo(item.name, 1)) {
        uiManager.addMessage(`Jettisoned 1 ${item.name}`);
        
        // Create cargo behind player
        const dir = p5.Vector.fromAngle(player.angle + PI);
        const pos = p5.Vector.add(
            player.pos, 
            dir.copy().mult(player.size * 2.6)
        );
        
        // Add some debug to check what's happening
        console.log("Creating jettisoned cargo:", item.name);
        
        // Create cargo with velocity away from player
        const cargo = new Cargo(pos.x, pos.y, item.name, 1);
        cargo.vel = dir.mult(1.5);
        
        // Add to system's cargo array
        console.log("Adding to system cargo array", player.currentSystem);
        player.currentSystem.addCargo(cargo);
      }
      return false;
    }
  }

  if (!gameStateManager || !player || !uiManager || !galaxy) { return; }
  let clickHandledByUI = uiManager.handleMouseClicks(
      mouseX, mouseY, gameStateManager.currentState, player, player.currentSystem?.station?.getMarket(), galaxy
  );
  if (!clickHandledByUI && gameStateManager.currentState === "IN_FLIGHT") {
      player.handleFireInput();
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
              const saveData = JSON.parse(savedDataString);
              console.log("Loading game data...");
              
              // Load galaxy first
              if (saveData.galaxyData) {
                  galaxy.loadSaveData(saveData.galaxyData);
              }
              
              // Add this code right here - after galaxy load but before player load
              // Ensure economy types are synchronized after loading
              console.log("Ensuring economy types are synchronized...");
              if (galaxy.systems) {
                  galaxy.systems.forEach(system => {
                      // Use the setter method to properly update both system and market
                      if (system && system.economyType) {
                          system.setEconomyType(system.economyType);
                          console.log(`Synchronized economy for ${system.name}: ${system.economyType}`);
                      }
                  });
              }
              
              // Then load player data as you did before
              if (saveData.playerData) {
                  player.loadSaveData(saveData.playerData);
              }
              
              // Rest of your existing loadGame function...
              // Verify systems were actually loaded
              if (!galaxy.systems || galaxy.systems.length === 0) {
                  console.error("Galaxy systems array is empty after loading save!");
                  return false;
              }

              // Link player object to the loaded system object
              player.currentSystem = galaxy.getCurrentSystem();
              if (player.currentSystem) {
                  player.currentSystem.player = player;
              } else {
                  console.error("CRITICAL: Failed to link player to a valid currentSystem after load!");
                  return false;
              }

              loadGameWasSuccessful = true;
              console.log("Game Loaded Successfully.");
              return true;

          } catch (e) { 
              console.error("Error parsing or applying saved game data:", e);
              return false;
          }
      } else {
          console.log("No saved game found.");
          return false;
      }
  } else {
      console.warn("Could not load game (LocalStorage missing or objects not ready).");
      return false;
  }
}
// --- End Save/Load ---


// --- p5.js windowResized Function ---
// Called automatically by p5.js when the browser window is resized.
function windowResized() {
    resizeCanvas(windowWidth, windowHeight); // Adjust canvas size
    // console.log("Window resized."); // Optional log
    // Note: UI elements using width/height might need repositioning logic here or in their draw methods.
}