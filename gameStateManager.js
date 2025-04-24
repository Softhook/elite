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
    console.log(`[isPlayerInJumpZone called by ${funcCaller}]`);
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

    // --- Debug Logging ---
    console.log(`  Player Pos: (${pX.toFixed(1)}, ${pY.toFixed(1)})`);
    console.log(`  Zone Center: (${zX.toFixed(1)}, ${zY.toFixed(1)})`);
    console.log(`  Zone Radius: ${radius.toFixed(1)}`);
    console.log(`  DistanceSq: ${distanceSq.toFixed(1)}, RadiusSq: ${radiusSq.toFixed(1)}`);
    console.log(`  Result: ${isInZone}`);
    // ---

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
        this.jumpChargeTimer = 0;
        this.jumpChargeDuration = 1.5; // seconds
        // Mission Board state variables
        this.currentStationMissions = []; // Cache missions currently shown on board
        this.selectedMissionIndex = -1; // Index of the highlighted mission in the list (-1 for none)
        // Market state variables (optional - for highlighting items etc.)
        this.selectedMarketItemIndex = -1;
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

        // Reset jump state
        if (newState !== "JUMPING" && newState !== "GALAXY_MAP") { this.jumpTargetSystemIndex = -1; this.jumpChargeTimer = 0; }
        // Reset mission board selection
        if (newState !== "VIEWING_MISSIONS" && this.previousState === "VIEWING_MISSIONS") { this.selectedMissionIndex = -1; }
        // Reset market selection (if added later)
        if (newState !== "VIEWING_MARKET" && this.previousState === "VIEWING_MARKET") { this.selectedMarketItemIndex = -1; }

        // Apply Undock Offset - Check if transitioning TO flight FROM ANY docked/station menu state
        const stationStates = ["DOCKED", "VIEWING_MARKET", "VIEWING_MISSIONS", "VIEWING_SHIPYARD", "VIEWING_SERVICES"]; // Add other station states here later
        if (newState === "IN_FLIGHT" && stationStates.includes(this.previousState)) {
            console.log("Undocking! Applying position offset.");
            if (player) {
                const offsetMultiplier = 3.5; const offsetDistance = player.size * offsetMultiplier;
                let undockOffset = createVector(0, -offsetDistance); // Simple 'up' offset
                player.pos.add(undockOffset); player.vel.mult(0);
                // console.log(`Player position offset applied. New Pos: (${player.pos.x.toFixed(1)}, ${player.pos.y.toFixed(1)})`); // Optional log
            } else { console.error("Player object missing during undock offset!"); }
        }
        // Snap position ONLY when docking occurs FROM IN_FLIGHT
        else if (newState === "DOCKED" && this.previousState === "IN_FLIGHT") {
             console.log("Entering DOCKED state from IN_FLIGHT. Snapping player position.");
             if (player && galaxy?.getCurrentSystem()?.station?.pos) { // Safe access
                 player.pos = galaxy.getCurrentSystem().station.pos.copy(); player.vel.mult(0);
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
        const currentSystem = galaxy?.getCurrentSystem(); // Safely get current system

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

            case "GALAXY_MAP":
                break;

            case "JUMPING":
                if (!galaxy || this.jumpTargetSystemIndex < 0 || this.jumpTargetSystemIndex >= galaxy.systems.length) { this.setState("IN_FLIGHT"); break; } // Validate jump state
                this.jumpChargeTimer += deltaTime / 1000; // Increment timer
                if (this.jumpChargeTimer >= this.jumpChargeDuration) { // Check if jump complete
                    galaxy.jumpToSystem(this.jumpTargetSystemIndex); this.setState("IN_FLIGHT"); saveGame();
                }
                break;

             case "GAME_OVER":
             case "LOADING":
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
        const currentSystem = galaxy?.getCurrentSystem(); // Safely get current system

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

            // TODO: Add drawing cases for VIEWING_SERVICES later

            case "GALAXY_MAP":
                 if (uiManager && galaxy && player) { try { uiManager.drawGalaxyMap(galaxy, player); } catch(e) { console.error("Error drawing galaxy map:", e); } }
                 else { /* Draw error */ }
                break;

            // --- CORRECTED JUMPING DRAWING CASE ---
            case "JUMPING":
                 // Draw flight view as background
                 if (currentSystem && player) {
                     try { currentSystem.draw(player); } catch(e) { console.error("ERROR in currentSystem.draw (Jumping):", e); }
                 } else { background(0); } // Fallback background

                 // Draw jump UI overlay
                 if (uiManager && player) { // Check uiManager exists
                     try { // Wrap jump UI drawing
                         // Draw jump charge indicator (Progress Bar)
                         fill(0, 150, 255, 150); // Set fill before drawing
                         noStroke();             // No outline for bar
                         let chargePercent = constrain(this.jumpChargeTimer / this.jumpChargeDuration, 0, 1); // Calculate percentage 0-1
                         rect(0, height - 20, width * chargePercent, 20); // Draw the bar

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
                         fill(255);                  // White text
                         textAlign(CENTER, BOTTOM); // Align text
                         textSize(14);              // Set size
                         // Ensure text function call has correct parentheses
                         text(`Charging Hyperdrive... Target: ${targetName}`, width / 2, height - 5);

                         // Optionally draw minimap during jump:
                         // if (currentSystem) uiManager.drawMinimap(player, currentSystem);

                     } catch (e) {
                         console.error("Error drawing jump UI:", e);
                     }
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
             default:
                 console.error(`Unknown game state encountered in draw(): ${this.currentState}`);
                 background(255,0,0); fill(0); textAlign(CENTER,CENTER); textSize(20); text(`Error: Unknown game state "${this.currentState}"`, width/2, height/2);
                 break;
        }
    } // End of draw method


    /**
     * Initiates the jump sequence to a target system index.
     * Now checks if the player is in the jump zone first.
     * @param {number} targetIndex - The index of the target system in the galaxy.
     */
    startJump(targetIndex) {
        console.log(`[startJump] Attempting jump to system index: ${targetIndex}`);
        const currentSystem = galaxy.getCurrentSystem();
        const targetSystem = galaxy.getSystemByIndex(targetIndex);

        // --- ADDED: Log state right before the check ---
        console.log(`[startJump] Checking jump zone status...`);
        const isInZone = isPlayerInJumpZone(player, currentSystem);
        console.log(`[startJump] Result of isPlayerInJumpZone: ${isInZone}`);
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

        // --- REMOVED Fuel Check ---
        // const jumpDistance = dist(currentSystem.galaxyPos.x, currentSystem.galaxyPos.y, targetSystem.galaxyPos.x, targetSystem.galaxyPos.y);
        // const fuelNeeded = player.calculateFuelNeeded(jumpDistance); // Assuming Player has this method
        //
        // if (player.fuel < fuelNeeded) {
        //     console.log(`[startJump] Jump failed: Insufficient fuel. Needed ${fuelNeeded.toFixed(1)}, Have ${player.fuel.toFixed(1)}`);
        //     if (typeof uiManager !== 'undefined') uiManager.addMessage(`Insufficient fuel: Need ${fuelNeeded.toFixed(1)} units.`, color(255, 100, 100));
        //      if (typeof soundManager !== 'undefined') soundManager.playSound('error');
        //     return;
        // }
        // --- End REMOVED Fuel Check ---

        console.log(`[startJump] Jump initiated to ${targetSystem.name} (Index: ${targetIndex})`);
        this.jumpTargetSystemIndex = targetIndex;
        this.jumpChargeTimer = 0; // Reset timer
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

} // End of GameStateManager Class