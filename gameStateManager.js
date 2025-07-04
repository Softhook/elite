// ****** gameStateManager.js ******

// ... (Import statements or existing global variables like uiManager, soundManager, player, galaxy) ...

/**
 * Checks if the player is within the designated jump zone of the given system.
 * @param {Player} playerObj - The player object.
 * @param {StarSystem} systemObj - The system object.
 * @returns {boolean} True if the player is in the jump zone, false otherwise.
 */
function isPlayerInJumpZone(playerObj, systemObj) {
    // --- Debug Logging ---
    const funcCaller = (new Error()).stack.split('\n')[2].trim().split(' ')[1]; // Get caller function name
    //console.log(`[isPlayerInJumpZone called by ${funcCaller}]`);
    // ---

    if (!playerObj?.pos) {
        console.log("  Check Failed: Invalid playerObj.pos");
        return false;
    }
    if (!systemObj?.jumpZoneCenter) {
        console.log("  Check Failed: Invalid systemObj.jumpZoneCenter");
        return false;
    }
    if (!(systemObj.jumpZoneRadius > 0)) { // Check radius is positive number
        console.log(`  Check Failed: Invalid systemObj.jumpZoneRadius: ${systemObj.jumpZoneRadius}`);
        return false;
    }

    const pX = playerObj.pos.x;
    const pY = playerObj.pos.y;
    const zX = systemObj.jumpZoneCenter.x;
    const zY = systemObj.jumpZoneCenter.y;
    const radius = systemObj.jumpZoneRadius;

    const distanceSq = (pX - zX) ** 2 + (pY - zY) ** 2;
    const radiusSq = radius ** 2;
    const isInZone = distanceSq <= radiusSq;

    return isInZone;
}

class GameStateManager {
    /**
     * Manages the overall game state and transitions.
     * Handles fetching/caching missions for the UI.
     */
    constructor() {
        // Start with title screen instead of LOADING
        this.currentState = "TITLE_SCREEN"; 
        this.previousState = null;     // Track previous state for transition logic
        // Jump state variables
        this.jumpTargetSystemIndex = -1;
        
        // Modify jump charge duration (increase from 1.5 seconds to 4 seconds)
        this.jumpChargeDuration = 4.0; // seconds (was 1.5)
        this.jumpChargeTimer = 0;
        
        // Add property to track jumping animation
        this.isJumpCharging = false;

        // Add to constructor
this.jumpFadeState = "NONE"; // NONE, FADE_OUT, WHITE_HOLD, FADE_IN
this.jumpFadeOpacity = 0;
this.jumpWhiteHoldTime = 1.0; // seconds

// Add an overlay flag for the inventory screen
this.showingInventory = false;
    }

    /**
     * Changes the current game state and handles specific transition logic.
     * @param {string} newState - The target state to transition to (e.g., "IN_FLIGHT", "DOCKED", "VIEWING_MISSIONS").
     */
    setState(newState) {
        this.previousState = this.currentState;
        if (this.currentState === newState) return; // No change needed

        console.log(`Changing state from ${this.previousState} to ${newState}`);
        this.currentState = newState; // Update the current state

        // --- Handle Logic Specific to State Transitions ---

        // Refresh save game preview when entering save selection screen
        if (newState === "SAVE_SELECTION") {
            if (saveSelectionScreen && typeof saveSelectionScreen.loadSavedGamePreview === 'function') {
                saveSelectionScreen.loadSavedGamePreview();
                // If "Continue" was selected but save data is now gone, reset to "New Game"
                if (saveSelectionScreen.savedGameData === null && saveSelectionScreen.selectedSlot === 1) {
                    saveSelectionScreen.selectedSlot = 0;
                }
            }
        }

        // Reset jump state
        if (newState !== "JUMPING" && newState !== "GALAXY_MAP") { this.jumpTargetSystemIndex = -1; this.jumpChargeTimer = 0; }
        // Reset mission board selection
        if (newState !== "VIEWING_MISSIONS" && this.previousState === "VIEWING_MISSIONS") { this.selectedMissionIndex = -1; }
        // Reset market selection (if added later)
        if (newState !== "VIEWING_MARKET" && this.previousState === "VIEWING_MARKET") { this.selectedMarketItemIndex = -1; }

        // Apply Undock Offset - Check if transitioning TO flight FROM ANY docked/station menu state
        const stationStates = ["DOCKED", "VIEWING_MARKET", "VIEWING_MISSIONS", "VIEWING_SHIPYARD", "VIEWING_SERVICES", "VIEWING_PROTECTION", "VIEWING_POLICE", "VIEWING_IMPERIAL_RECRUITMENT", "VIEWING_SEPARATIST_RECRUITMENT", "VIEWING_MILITARY_RECRUITMENT"]; // Add other station states here later
        if (newState === "IN_FLIGHT" && stationStates.includes(this.previousState)) {
            console.log("Undocking! Applying position offset.");
            if (player) {
                const offsetMultiplier = 10; const offsetDistance = player.size * offsetMultiplier;
                let undockOffset = createVector(0, -offsetDistance); // Simple 'up' offset
                player.pos.add(undockOffset); player.vel.mult(0);
                
                // Spawn any hired bodyguards when undocking
                if (player.activeBodyguards && player.activeBodyguards.length > 0 && galaxy?.getCurrentSystem()) {
                    console.log("Spawning bodyguards when undocking from station");
                    player.spawnBodyguards(galaxy?.getCurrentSystem());
                }
                
                // console.log(`Player position offset applied. New Pos: (${player.pos.x.toFixed(1)}, ${player.pos.y.toFixed(1)})`); // Optional log
            } else { console.error("Player object missing during undock offset!"); }
        }
        // Snap position ONLY when docking occurs FROM IN_FLIGHT
        else if (newState === "DOCKED" && this.previousState === "IN_FLIGHT") {
             console.log("Entering DOCKED state from IN_FLIGHT. Snapping player position.");
             if (player && galaxy?.getCurrentSystem()?.station?.pos) { // Safe access
                 player.pos = galaxy?.getCurrentSystem()?.station?.pos?.copy() || player.pos; player.vel.mult(0);
             } else { console.error("Could not snap player to station - required objects missing."); }
        }
        // Ensure player stopped when entering DOCKED from sub-menus or other states
        else if (newState === "DOCKED") { if (player) { player.vel.set(0, 0); } }
        // Ensure player stopped when entering station sub-menus
        else if (newState === "VIEWING_MARKET" || newState === "VIEWING_MISSIONS") { if (player) { player.vel.set(0, 0); } }

    } // End of setState method


    /**
     * Updates game logic based on the current state. Called every frame.
     * @param {Player} player - Reference to the player object.
     */
    update(player) {
        // const currentSystem = galaxy?.getCurrentSystem(); // Safely get current system // MOVED
        let currentSystem = null; // Initialize to null

        // Only get currentSystem if in a state where it's expected to exist
        const statesExpectingSystem = ["IN_FLIGHT", "DOCKED", "VIEWING_MARKET", "VIEWING_MISSIONS", "VIEWING_SHIPYARD", "VIEWING_UPGRADES", "VIEWING_REPAIRS", "VIEWING_PROTECTION", "VIEWING_POLICE", "GALAXY_MAP", "JUMPING", "VIEWING_IMPERIAL_RECRUITMENT", "VIEWING_SEPARATIST_RECRUITMENT", "VIEWING_MILITARY_RECRUITMENT"];
        if (statesExpectingSystem.includes(this.currentState)) {
            currentSystem = galaxy?.getCurrentSystem();
        }

        switch (this.currentState) {
            case "TITLE_SCREEN":
                // Title screen doesn't need game updates, just UI rendering
                if (titleScreen) {
                    titleScreen.update(deltaTime);
                }
                break;

            case "INSTRUCTIONS":
                // Instructions screen also just needs UI updates
                if (titleScreen) {
                    titleScreen.update(deltaTime);
                }
                break;

            case "IN_FLIGHT":
                if (!player || !currentSystem) { break; } // Need player and system
                try { // Wrap core updates
                    player.handleInput(); player.update(); currentSystem.update(player); // Update everything
                    const station = currentSystem.station; // Check docking
                    if (station && player.canDock(station)) { this.setState("DOCKED"); saveGame(); }
                } catch (e) { console.error(`ERROR during IN_FLIGHT update:`, e); }
                break;

            case "DOCKED":
                if (player) { player.vel.set(0, 0); } break;

            case "VIEWING_MARKET":
                if (!currentSystem?.station) { this.setState("DOCKED"); break; } if (player) { player.vel.set(0, 0); } break;

            case "VIEWING_MISSIONS":
                if (!currentSystem?.station) { this.setState("DOCKED"); break; } if (player) { player.vel.set(0, 0); } break;

            case "VIEWING_SHIPYARD":
            case "VIEWING_UPGRADES":
                // No update logic needed, just wait for UI clicks
                break;

            case "VIEWING_REPAIRS":
                // No update logic needed for repairs menu
                break;
                
            case "VIEWING_PROTECTION":
                // No update logic needed for protection services menu
                if (player) { player.vel.set(0, 0); }
                break;

            case "VIEWING_POLICE":
                if (currentSystem) { 
                    try { 
                        push(); 
                        currentSystem.drawBackground(); 
                        if(currentSystem.station) currentSystem.station.draw(); 
                        pop(); 
                    } catch(e) {}
                } else { 
                    background(20,20,40); 
                }
                
                if (player) { 
                    try {
                        player.draw();
                    } catch(e) {}
                }
                
                if (uiManager && player) {
                    try {
                        uiManager.drawPoliceMenu(player);
                    } catch(e) { 
                        console.error("Error drawing police menu:", e); 
                    }
                }
                break;


            // In GameStateManager.draw(), modify the GALAXY_MAP case:

            case "GALAXY_MAP":
                // Continue updating game world while viewing galaxy map
                if (player && currentSystem) {
                    try {
                        // Update player position (but without input processing)
                        player.update();
                        
                        // Update system - keeps enemies moving, projectiles flying, etc.
                        currentSystem.update(player);
                    } catch (e) {
                        console.error("Error updating game during galaxy map view:", e);
                    }
                }
                break;

            case "JUMPING":
                if (!galaxy || this.jumpTargetSystemIndex < 0 || this.jumpTargetSystemIndex >= galaxy.systems.length) {
                    this.setState("IN_FLIGHT");
                    return;
                }
                
                // Update jump charge timer
                this.jumpChargeTimer += deltaTime / 1000;
                
                // KEY CHANGE: Continue updating the player and system during jump charge
                if (player && currentSystem) {
                    // Let the player still control the ship while charging
                    player.handleInput();
                    player.update();
                    
                    // Update system entities but prevent new spawns during jump
                    currentSystem.update(player);
                }
                
                // Complete jump when timer reaches duration
                if (this.jumpChargeTimer >= this.jumpChargeDuration) {
                    this.jumpFadeState = "FADE_OUT"; // Begin transition
                    // Don't actually jump yet - wait for white screen
                }

                // Add fade state handling
                if (this.jumpFadeState === "FADE_OUT") {
                    this.jumpFadeOpacity += 0.03;
                    if (this.jumpFadeOpacity >= 1) {
                        // Execute jump during full white
                        galaxy.jumpToSystem(this.jumpTargetSystemIndex);
                        player.currentSystem = galaxy?.getCurrentSystem();
                        player.vel.mult(0.3); // Reduce velocity after jump
                        this.jumpChargeTimer = 0;
                        this.isJumpCharging = false;
                        this.jumpFadeState = "WHITE_HOLD";
                        // Notify player of jump completion
                        if (typeof uiManager !== 'undefined') {
                            uiManager.addMessage(`Jump complete. Welcome to ${player.currentSystem.name}`, [0, 200, 255]);
                        }
                    }
                }
                // Add WHITE_HOLD and FADE_IN states...
                // Handle the WHITE_HOLD state - maintain full white screen for a moment
                else if (this.jumpFadeState === "WHITE_HOLD") {
                    // Track time in the white hold state
                    if (!this.jumpWhiteHoldTimer) {
                        this.jumpWhiteHoldTimer = 0;
                    }
                    this.jumpWhiteHoldTimer += deltaTime / 1000;
                    
                    // Transition to fade-in after holding for the specified duration
                    if (this.jumpWhiteHoldTimer >= this.jumpWhiteHoldTime) {
                        this.jumpFadeState = "FADE_IN";
                        console.log("Jump transition: WHITE_HOLD → FADE_IN");
                    }
                }
                // Handle the FADE_IN state - gradually decrease opacity back to normal
                else if (this.jumpFadeState === "FADE_IN") {
                    // Gradually decrease opacity (fade back from white)
                    this.jumpFadeOpacity -= 0.02 * (deltaTime / 16);
                    
                    // Transition back to normal gameplay when fully faded in
                    if (this.jumpFadeOpacity <= 0) {
                        this.jumpFadeOpacity = 0;
                        this.jumpFadeState = "NONE";
                        this.setState("IN_FLIGHT");
                        console.log("Jump transition complete: FADE_IN → IN_FLIGHT");
                    }
                }

                break;

            case "VIEWING_IMPERIAL_RECRUITMENT":
                // No update logic needed for Imperial recruitment menu
                if (player) { player.vel.set(0, 0); }
                break;

            case "VIEWING_SEPARATIST_RECRUITMENT":
                // No update logic needed for Separatist recruitment menu
                if (player) { player.vel.set(0, 0); }
                break;

            case "VIEWING_MILITARY_RECRUITMENT":
                // No update logic needed for Military recruitment menu
                if (player) { player.vel.set(0, 0); }
                break;

             case "GAME_OVER":
             case "LOADING":
                break;

            case "SAVE_SELECTION":
                // Save selection screen updates
                if (saveSelectionScreen) {
                    saveSelectionScreen.update(deltaTime);
                }
                break;

            default:
                console.warn(`Unknown game state in update(): ${this.currentState}`);
                this.setState("IN_FLIGHT");
                break;
        }
    } // End of update method


    /**
     * Draws game visuals based on the current state. Called every frame.
     * @param {Player} player - Reference to the player object.
     */
    draw(player) {
        // const currentSystem = galaxy?.getCurrentSystem(); // Safely get current system // MOVED
        let currentSystem = null; // Initialize to null

        // Only get currentSystem if in a state where it's expected to exist
        const statesExpectingSystem = ["IN_FLIGHT", "DOCKED", "VIEWING_MARKET", "VIEWING_MISSIONS", "VIEWING_SHIPYARD", "VIEWING_UPGRADES", "VIEWING_REPAIRS", "VIEWING_PROTECTION", "VIEWING_POLICE", "GALAXY_MAP", "JUMPING", "VIEWING_IMPERIAL_RECRUITMENT", "VIEWING_SEPARATIST_RECRUITMENT", "VIEWING_MILITARY_RECRUITMENT"];
        if (statesExpectingSystem.includes(this.currentState)) {
            currentSystem = galaxy?.getCurrentSystem();
        }

        switch (this.currentState) {
            case "IN_FLIGHT":
                if (currentSystem && player) { try { currentSystem.draw(player); } catch(e) {console.error("Err drawing system:", e)} } else { /* Draw error bg */ }
                if (uiManager && player) { try { uiManager.drawHUD(player); } catch(e) {} if (currentSystem) { try { uiManager.drawMinimap(player, currentSystem); } catch(e) {} } }
                break;

            case "DOCKED": // Draws the main station menu
                if (currentSystem) { try { push(); currentSystem.drawBackground(); if(currentSystem.station) currentSystem.station.draw(); pop(); } catch(e) {}} else { background(20,20,40); }
                if (player) { try {player.draw();} catch(e) {}}
                if (uiManager && currentSystem?.station && player) { try { uiManager.drawStationMainMenu(currentSystem.station, player); } catch(e) { console.error("Error drawing station main menu:", e); } }
                break;

             case "VIEWING_MARKET": // Draws the Market screen
                 if (currentSystem) { try { push(); currentSystem.drawBackground(); if(currentSystem.station) currentSystem.station.draw(); pop(); } catch(e) {}} else { background(20,20,40); }
                 if (player) { try {player.draw();} catch(e) {}}
                 if (uiManager && currentSystem?.station?.market && player) { try { uiManager.drawMarketScreen(currentSystem.station.getMarket(), player); } catch(e) { console.error("Error drawing market screen:", e); } }
                 else { /* Draw error if market missing */ background(10,0,0); fill(255); text("Error: Market data unavailable", width/2, height/2); }
                 break;

             case "VIEWING_MISSIONS":
                 // Fetch missions if not already fetched
                 if (!this.currentStationMissions || this.currentStationMissions.length === 0) {
                     const currentSystem = galaxy?.getCurrentSystem();
                     const currentStation = currentSystem?.station;
                     this.currentStationMissions = MissionGenerator.generateMissions(currentSystem, currentStation, galaxy, player);
                 }
                 if (uiManager && currentSystem?.station && player) {
                     uiManager.drawMissionBoard(this.currentStationMissions, this.selectedMissionIndex, player);
                 }
                 break;

            case "VIEWING_SHIPYARD":
                if (uiManager && player) uiManager.drawShipyardMenu(player);
                break;

            case "VIEWING_UPGRADES":
                if (uiManager && player) uiManager.drawUpgradesMenu(player);
                break;

            case "VIEWING_REPAIRS":
                if (uiManager && player) uiManager.drawRepairsMenu(player);
                break;
                
            case "VIEWING_PROTECTION":
                if (currentSystem) { 
                    try { 
                        push(); 
                        currentSystem.drawBackground(); 
                        if(currentSystem.station) currentSystem.station.draw(); 
                        pop(); 
                    } catch(e) {}
                } else { 
                    background(20,20,40); 
                }
                
                if (player) { 
                    try {
                        player.draw();
                    } catch(e) {}
                }
                
                if (uiManager && player) {
                    try {
                        uiManager.drawProtectionServicesMenu(player);
                    } catch(e) { 
                        console.error("Error drawing protection services menu:", e); 
                    }
                }
                break;

            case "VIEWING_POLICE":
                if (currentSystem) { 
                    try { 
                        push(); 
                        currentSystem.drawBackground(); 
                        if(currentSystem.station) currentSystem.station.draw(); 
                        pop(); 
                    } catch(e) {}
                } else { 
                    background(20,20,40); 
                }
                
                if (player) { 
                    try {
                        player.draw();
                    } catch(e) {}
                }
                
                if (uiManager && player) {
                    try {
                        uiManager.drawPoliceMenu(player);
                    } catch(e) { 
                        console.error("Error drawing police menu:", e); 
                    }
                }
                break;

            case "VIEWING_IMPERIAL_RECRUITMENT":
                background(20,20,40); 
                
                if (player) { 
                    try {
                        player.draw();
                    } catch(e) {}
                }
                
                if (uiManager && player) {
                    try {
                        uiManager.drawImperialRecruitmentMenu(player);
                    } catch(e) { 
                        console.error("Error drawing Imperial recruitment menu:", e); 
                    }
                }
                break;

            case "VIEWING_SEPARATIST_RECRUITMENT":
                background(20,20,40); 
                
                if (player) { 
                    try {
                        player.draw();
                    } catch(e) {}
                }
                
                if (uiManager && player) {
                    try {
                        uiManager.drawSeparatistRecruitmentMenu(player);
                    } catch(e) { 
                        console.error("Error drawing Separatist recruitment menu:", e); 
                    }
                }
                break;

            case "VIEWING_MILITARY_RECRUITMENT":
                background(20,20,40); 
                
                if (player) { 
                    try {
                        player.draw();
                    } catch(e) {}
                }
                
                if (uiManager && player) {
                    try {
                        uiManager.drawMilitaryRecruitmentMenu(player);
                    } catch(e) { 
                        console.error("Error drawing Military recruitment menu:", e); 
                    }
                }
                break;

            case "GALAXY_MAP":
                // First draw the regular game view behind the map
                if (currentSystem && player) {
                    try { 
                        currentSystem.draw(player); 
                    } catch(e) { 
                        console.error("Error drawing system behind galaxy map:", e); 
                    }
                }
                
                // Draw semi-transparent overlay
                push();
                fill(10, 0, 20, 180); // Dark space background with 180/255 opacity
                noStroke();
                rect(0, 0, width, height);
                pop();
                
                // Then draw the galaxy map UI elements
                if (uiManager && galaxy && player) {
                    try { 
                        uiManager.drawGalaxyMap(galaxy, player); 
                    } catch(e) { 
                        console.error("Error drawing galaxy map:", e); 
                    }
                }
                
                // Draw HUD on top
                if (uiManager && player) {
                    try {
                        uiManager.drawHUD(player, currentSystem, true);
                    } catch(e) {
                        console.error("Error drawing HUD during galaxy map:", e);
                    }
                }
                break; 

            // --- CORRECTED JUMPING DRAWING CASE ---
            case "JUMPING":
                 // Draw flight view as background
                 if (currentSystem && player) {
                     try { currentSystem.draw(player); } catch(e) { console.error("ERROR in currentSystem.draw (Jumping):", e); }
                 } else { background(0); } // Fallback background

                 // --- MODIFICATION: Only draw charge UI if fade hasn't started ---
                 if (this.jumpFadeState === "NONE" && uiManager && player) {
                 // --- END MODIFICATION ---
                     try { // Wrap jump UI drawing
                         // Draw jump charge indicator (Progress Bar)
                         fill(0, 150, 255, 150); // Set fill before drawing
                         noStroke();             // No outline for bar
                         let chargePercent = constrain(this.jumpChargeTimer / this.jumpChargeDuration, 0, 1); // Calculate percentage 0-1
                         rect(0, height-35, width * chargePercent, 35); // Draw the bar

                         // Determine Target Name Safely
                         let targetName = "Unknown"; // Default value
                         if (galaxy &&                              // Check galaxy exists
                             this.jumpTargetSystemIndex >= 0 &&     // Check index is valid lower bound
                             this.jumpTargetSystemIndex < galaxy.systems.length && // Check index is valid upper bound
                             galaxy.systems[this.jumpTargetSystemIndex] // Check system object itself exists at index
                            ) {
                              // If all checks pass, try to get the name, otherwise use "Invalid Target"
                              targetName = galaxy.systems[this.jumpTargetSystemIndex].name || "Invalid Target";
                         }

                         // Draw Jump Status Text
                         textFont(font);             // Use the global font
                         fill(255);
                         textAlign(LEFT, BOTTOM);    // Align text to the LEFT
                         textSize(20);              // Set size
                         // Ensure text function call has correct parentheses
                         text(`Charging Hyperdrive... Target: ${targetName}`, 50, height - 5);

                         // Optionally draw minimap during jump:
                         // if (currentSystem) uiManager.drawMinimap(player, currentSystem);

                     } catch (e) {
                         console.error("Error drawing jump UI:", e);
                     }
                 // --- MODIFICATION: Close the conditional block ---
                 }
                 // --- END MODIFICATION ---


                 // Draw fade overlay (This should still happen during fades)
                 if (this.jumpFadeState !== "NONE") {
                     push();
                     fill(255, 255, 255, this.jumpFadeOpacity * 255);
                     noStroke();
                     rect(0, 0, width, height);
                     pop();
                 }
                 break; // End JUMPING case
            // --- END CORRECTION ---

            case "TITLE_SCREEN":
                if (titleScreen) {
                    titleScreen.drawTitleScreen();
                }
                break;

            case "INSTRUCTIONS":
                if (titleScreen) {
                    titleScreen.drawInstructionScreen();
                }
                break;

             case "GAME_OVER":
                 background(0, 150); if (uiManager) { try { uiManager.drawGameOverScreen(); } catch(e) {} }
                 break;
             case "LOADING":
                 background(0); fill(255); textAlign(CENTER, CENTER); textSize(32); text("Loading...", width / 2, height / 2);
                 break;
             case "SAVE_SELECTION":
                if (saveSelectionScreen) {
                    saveSelectionScreen.draw();
                }
                break;

             default:
                 console.error(`Unknown game state encountered in draw(): ${this.currentState}`);
                 background(255,0,0); fill(0); textAlign(CENTER,CENTER); textSize(20); text(`Error: Unknown game state "${this.currentState}"`, width/2, height/2);
                 break;
        }

        // Draw inventory screen on top if it's showing (during IN_FLIGHT)
        if (this.currentState==="IN_FLIGHT" && this.showingInventory) {
  inventoryScreen.draw(player);
}
    } // End of draw method


    /**
     * Initiates the jump sequence to a target system index.
     * Now checks if the player is in the jump zone first.
     * @param {number} targetIndex - The index of the target system in the galaxy.
     */
    startJump(targetIndex) {
        console.log(`[startJump] Attempting jump to system index: ${targetIndex}`);
        const currentSystem = galaxy?.getCurrentSystem();
        const targetSystem = galaxy.getSystemByIndex(targetIndex);

        // --- ADDED: Log state right before the check ---
        //console.log(`[startJump] Checking jump zone status...`);
        const isInZone = isPlayerInJumpZone(player, currentSystem);
        //console.log(`[startJump] Result of isPlayerInJumpZone: ${isInZone}`);
        // ---

        // --- Jump Zone Restriction Check ---
        if (!isInZone) {
            console.log("[startJump] Jump aborted: Player not in Jump Zone.");
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
            console.log("[startJump] Cannot jump to the current system.");
            if (typeof uiManager !== 'undefined') uiManager.addMessage("Cannot jump to the current system.", color(255, 200, 0));
            return;
        }
        // --- End Basic Target Validation ---

        // --- Connection Check ---
        if (!currentSystem || !currentSystem.connectedSystemIndices.includes(targetIndex)) {
             console.log(`[startJump] Jump failed: No connection from ${currentSystem?.name} to system index ${targetIndex}.`);
             if (typeof uiManager !== 'undefined') uiManager.addMessage("Cannot jump: No direct route to that system.", color(255, 100, 100));
             return;
        }
        // --- End Connection Check ---

        console.log(`[startJump] Jump initiated to ${targetSystem.name} (Index: ${targetIndex})`);
        this.jumpTargetSystemIndex = targetIndex;
        this.jumpChargeTimer = 0; // Reset timer
        this.isJumpCharging = true; // Set the flag
        this.setState("JUMPING");
        if (typeof soundManager !== 'undefined') soundManager.playSound('jump_charge'); // Start charging sound
    }

    /** Fetches missions for the current station and stores them for display. */
    fetchStationMissions(player) {
         const currentSystem = galaxy?.getCurrentSystem();
         if (currentSystem?.station && galaxy && player && typeof MissionGenerator?.generateMissions === 'function') {
              console.log("[GameStateManager] Fetching missions for", currentSystem?.name, currentSystem?.station?.name);
              try {
                  this.currentStationMissions = MissionGenerator.generateMissions(currentSystem, currentSystem.station, galaxy, player);
                  console.log("[GameStateManager] Missions fetched:", this.currentStationMissions);
                  this.selectedMissionIndex = -1; return true;
              } catch(e) { console.error("Error during MissionGenerator.generateMissions:", e); this.currentStationMissions = []; return false; }
         }
         // console.warn("Cannot fetch missions - missing required objects/generator."); // Optional log
         this.currentStationMissions = []; return false;
    } // End fetchStationMissions

    /** Saves the current game state to local storage. */
    saveGame() {
        const saveData = {
            player: player.getSaveData(),
            galaxy: galaxy.getSaveData(),
            // ...other data as needed...
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    }

    /** Loads the game state from local storage. */
    loadGame() {
        const saveStr = localStorage.getItem(SAVE_KEY);
        if (!saveStr) return false;
        const saveData = JSON.parse(saveStr);
        if (saveData.player) player.loadSaveData(saveData.player);
        if (saveData.galaxy) galaxy.loadSaveData(saveData.galaxy);
        // ...other data as needed...
        return true;
    }

    // Add a method to toggle the inventory screen
toggleInventory() {
    if (this.currentState === "IN_FLIGHT") {
        this.showingInventory = !this.showingInventory;
        return true;
    }
    return false;
}

} // End of GameStateManager Class