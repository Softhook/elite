// ****** gameStateManager.js ******

class GameStateManager {
    /**
     * Manages the overall game state and transitions.
     */
    constructor() {
        this.currentState = "LOADING"; // Initial state (e.g., "LOADING", "IN_FLIGHT", "DOCKED", "GALAXY_MAP", "JUMPING", "GAME_OVER")
        this.previousState = null;     // Keep track of the last state for transition logic
        this.jumpTargetSystemIndex = -1; // Index of the system targeted for jump
        this.jumpChargeTimer = 0;      // Timer for jump charge duration
        this.jumpChargeDuration = 1.5; // Time in seconds needed to charge jump drive
    }

    /**
     * Changes the current game state and handles specific transition logic.
     * @param {string} newState - The target state to transition to.
     */
    setState(newState) {
        // Store the current state before changing it
        this.previousState = this.currentState;

        // Prevent redundant state changes
        if (this.currentState === newState) {
            return; // Exit if the state isn't actually changing
        }

        // Log the state transition for debugging major changes
        console.log(`Changing state from ${this.previousState} to ${newState}`);
        this.currentState = newState; // Update the current state

        // --- Handle Logic Specific to State Transitions ---

        // Reset jump-related variables if we are moving OUT of a jump or map state
        if (newState !== "JUMPING" && newState !== "GALAXY_MAP") {
            this.jumpTargetSystemIndex = -1; // Clear jump target
            this.jumpChargeTimer = 0;      // Reset jump charge timer
        }

        // Handle UNDOCKING (Transition: DOCKED -> IN_FLIGHT)
        if (newState === "IN_FLIGHT" && this.previousState === "DOCKED") {
            // Apply positional nudge to prevent immediate re-docking
            console.log("Just undocked! Applying position offset."); // Keep this important log
            if (player) { // Ensure player object exists
                // Apply positional nudge to prevent immediate re-docking
                const offsetMultiplier = 3.5; // Must be > dockingRadius / player.size
                const offsetDistance = player.size * offsetMultiplier;
                let undockOffset = createVector(0, -offsetDistance); // Simple 'up' offset
                // Option: calculate offset away from station center vector
                player.pos.add(undockOffset);
                player.vel.mult(0); // Reset velocity after offset
                console.log(`Player position offset applied (Dist: ${offsetDistance.toFixed(1)}). New Pos: (${player.pos.x.toFixed(1)}, ${player.pos.y.toFixed(1)})`); // Can keep or remove
            } else { console.error("Player object missing during undock offset application!"); }
        }
        // Handle DOCKING (Transition: IN_FLIGHT -> DOCKED)
        // Only snap position when docking happens during gameplay, not necessarily on load
        else if (newState === "DOCKED" && this.previousState === "IN_FLIGHT") {
             console.log("Entering DOCKED state from IN_FLIGHT. Snapping player position."); // Keep important log
             if (player && galaxy && galaxy.getCurrentSystem()?.station?.pos) { // Use safe access
                 const stationPos = galaxy.getCurrentSystem().station.pos;
                 player.pos = stationPos.copy(); // Set player position exactly to station
                 player.vel.mult(0);             // Stop player velocity
             } else { console.error("Could not snap player to station - required objects missing."); }
        }
        // Add other transition logic here (e.g., resetting things when entering GAME_OVER)

    } // End of setState method


    /**
     * Updates game logic based on the current state. Called every frame.
     * @param {Player} player - Reference to the player object.
     */
    update(player) {
        // Get current system safely (might be null briefly during jump?)
        const currentSystem = galaxy?.getCurrentSystem();

        // Switch statement controls logic based on the current state
        switch (this.currentState) {
            case "IN_FLIGHT":
                // Run flight logic only if player and system exist
                if (!player || !currentSystem) {
                    // console.warn("IN_FLIGHT update skipped: Player or CurrentSystem missing."); // Optional warning
                    break; // Exit case if essential objects aren't ready
                }

                // --- Try/Catch block ensures errors in updates don't crash the whole loop ---
                try {
                    player.handleInput(); // Process player controls
                    player.update();      // Update player physics
                    currentSystem.update(player); // Update system contents (NPCs, asteroids, projectiles, spawns, despawns, collisions)

                    // Check for docking conditions
                    const station = currentSystem.station;
                    if (station && player.canDock(station)) {
                        // console.log("Player canDock() condition met."); // Can keep or remove
                        this.setState("DOCKED"); // Change state
                        saveGame(); // Auto-save when docking
                    }
                } catch (e) {
                    console.error(`ERROR during IN_FLIGHT update phase:`, e);
                    // Potentially set an error state or try to recover?
                    // For now, log the error. It might be caught by the main draw loop's try/catch too.
                }
                // --- End Try/Catch ---
                break; // End IN_FLIGHT case

            case "DOCKED":
                // Mostly passive state; UI interactions handled by UIManager
                if (player) { player.vel.mult(0); } // Ensure player stays stopped
                break;

            case "GALAXY_MAP":
                // UI interactions handled by UIManager
                break;

            case "JUMPING":
                // Handle hyperspace jump sequence
                if (!galaxy || this.jumpTargetSystemIndex < 0 || this.jumpTargetSystemIndex >= galaxy.systems.length) {
                     console.warn("JUMPING update skipped: Galaxy or valid jump target missing.");
                     this.setState("IN_FLIGHT"); // Fallback if jump state is invalid
                     break;
                }
                this.jumpChargeTimer += deltaTime / 1000; // Increment timer
                // Check if jump is complete
                if (this.jumpChargeTimer >= this.jumpChargeDuration) {
                    galaxy.jumpToSystem(this.jumpTargetSystemIndex); // Perform the jump
                    this.setState("IN_FLIGHT"); // Back to flight AFTER jump completes
                    saveGame(); // Auto-save after jump
                }
                break;

             case "GAME_OVER":
                // Game logic pauses. Wait for player interaction via UI.
                break;

            case "LOADING":
                // Typically only active during initial setup.
                break;

            default:
                 console.warn(`Unknown game state encountered in update(): ${this.currentState}`);
                 this.setState("IN_FLIGHT"); // Attempt to recover to a default state
                 break;
        } // End switch statement
    } // End of update method


    /**
     * Draws game visuals based on the current state. Called every frame.
     * @param {Player} player - Reference to the player object.
     */
    draw(player) {
        // Get current system safely
        const currentSystem = galaxy?.getCurrentSystem();

        // Switch statement controls drawing based on the current state
        switch (this.currentState) {
            case "IN_FLIGHT":
                // Draw the main game world view
                if (currentSystem && player) {
                    // StarSystem.draw handles world translation and drawing player + contents
                    try { currentSystem.draw(player); } catch(e) { console.error("ERROR in currentSystem.draw():", e); }
                } else {
                     // Draw fallback if system/player invalid
                     background(10,0,0); fill(255); textAlign(CENTER,CENTER); textSize(16); text("Error: System/Player invalid for drawing", width/2, height/2);
                }
                // Draw UI overlays on top (not affected by world translation)
                if (uiManager && player) {
                    try { uiManager.drawHUD(player); } catch(e) { console.error("ERROR in uiManager.drawHUD():", e); }
                    if (currentSystem) { // Only draw minimap if system exists
                        try { uiManager.drawMinimap(player, currentSystem); } catch(e) { console.error("ERROR in uiManager.drawMinimap():", e); }
                    }
                }
                break;

            case "DOCKED":
                 // Draw static background elements
                 if (currentSystem) {
                    push();
                    try { currentSystem.drawBackground(); } catch(e) { console.error("ERROR in drawBackground:", e); }
                    if(currentSystem.station) try { currentSystem.station.draw(); } catch(e) { console.error("ERROR in station.draw:", e); }
                    pop();
                 } else { background(20,20,40); } // Fallback background
                 // Draw player visually docked
                 if (player) { try { player.draw(); } catch(e) { console.error("ERROR in player.draw (Docked):", e); } }
                 // Draw docked UI on top
                 if (uiManager && currentSystem?.station && player) {
                    try { uiManager.drawDockedScreen(currentSystem.station.getMarket(), player); } catch(e) { console.error("ERROR in uiManager.drawDockedScreen:", e); }
                 }
                break;

            case "GALAXY_MAP":
                 // Galaxy map takes over the whole screen
                 if (uiManager && galaxy && player) {
                    try { uiManager.drawGalaxyMap(galaxy, player); } catch(e) { console.error("ERROR in uiManager.drawGalaxyMap:", e); }
                 } else {
                      background(10,0,20); fill(255); textAlign(CENTER,CENTER); textSize(16); text("Error displaying Galaxy Map - Data missing.", width/2, height/2);
                 }
                break;

            case "JUMPING":
                 // Draw flight view as background during jump charge
                 if (currentSystem && player) {
                     try { currentSystem.draw(player); } catch(e) { console.error("ERROR in currentSystem.draw (Jumping):", e); }
                 } else { background(0); } // Fallback background

                 // Draw jump UI overlay
                 if (uiManager && player) { // Check uiManager exists
                     try { // Wrap jump UI drawing
                         // Draw jump charge indicator (Progress Bar)
                         fill(0, 150, 255, 150); noStroke(); // Blue, semi-transparent bar
                         let chargePercent = constrain(this.jumpChargeTimer / this.jumpChargeDuration, 0, 1);
                         rect(0, height - 20, width * chargePercent, 20); // Bar grows from left at bottom

                         // Draw Jump Status Text
                         fill(255); textAlign(CENTER, BOTTOM); textSize(14); // Text style
                         // Safely get target system name
                         let targetName = "Unknown";
                         if (galaxy && this.jumpTargetSystemIndex >= 0 && this.jumpTargetSystemIndex < galaxy.systems.length) {
                              targetName = galaxy.systems[this.jumpTargetSystemIndex]?.name || "Invalid Target"; // Safe access
                         }
                         text(`Charging Hyperdrive... Target: ${targetName}`, width / 2, height - 5);
                         // Optionally draw minimap during jump:
                         // if (currentSystem) uiManager.drawMinimap(player, currentSystem);
                     } catch (e) { console.error("Error drawing jump UI:", e); }
                 }
                 break; // End JUMPING case

            case "GAME_OVER":
                 // Simple overlay - could draw dimmed previous state first if needed
                 background(0, 150); // Dark semi-transparent overlay
                 if (uiManager) { // Check uiManager exists
                     try { uiManager.drawGameOverScreen(); } catch(e) { console.error("ERROR in uiManager.drawGameOverScreen:", e); }
                 }
                 break;

            case "LOADING":
                 // Should only be visible briefly during initial setup
                 background(0); fill(255); textAlign(CENTER, CENTER); textSize(32);
                 text("Loading...", width / 2, height / 2);
                 break;

            default:
                 // Draw an error state if state is unknown
                 console.error(`Unknown game state encountered in draw(): ${this.currentState}`);
                 background(255,0,0); // Red background for error
                 fill(0); textAlign(CENTER,CENTER); textSize(20);
                 text(`Error: Unknown game state "${this.currentState}"`, width/2, height/2);
                 break;
        } // End switch statement
    } // End of draw method


    /**
     * Initiates the jump sequence by setting the target and changing state to JUMPING.
     * @param {number} targetIndex - The index of the target star system in the galaxy.systems array.
     */
    startJump(targetIndex) {
        // Validate target index and ensure it's not the current system
        if (galaxy && targetIndex >= 0 && targetIndex < galaxy.systems.length && targetIndex !== galaxy.currentSystemIndex) {
            this.jumpTargetSystemIndex = targetIndex; // Store target
            this.jumpChargeTimer = 0;              // Reset charge timer
            this.setState("JUMPING");              // Begin the JUMPING state
            console.log(`Jump initiated to system index: ${targetIndex} (${galaxy.systems[targetIndex]?.name})`); // Log jump start
        } else {
            // Log error if jump target is invalid
            console.warn(`Invalid jump target selected (${targetIndex}) or already in target system.`);
            // Stay on the galaxy map if selection fails, allowing user to choose again or exit
        }
    } // End of startJump method

} // End of GameStateManager Class