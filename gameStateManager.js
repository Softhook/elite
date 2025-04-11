// ****** gameStateManager.js ******

class GameStateManager {
    constructor() {
        this.currentState = "LOADING";
        this.previousState = null;
        this.jumpTargetSystemIndex = -1;
        this.jumpChargeTimer = 0;
        this.jumpChargeDuration = 1.5;
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

        console.log(`Changing state from ${this.previousState} to ${newState}`);
        this.currentState = newState; // Update the current state

        // --- Handle Logic Specific to State Transitions ---

        // Reset jump-related variables if we are moving OUT of a jump or map state
        if (newState !== "JUMPING" && newState !== "GALAXY_MAP") {
            this.jumpTargetSystemIndex = -1; // Clear jump target
            this.jumpChargeTimer = 0;      // Reset jump charge timer
        }

        // --- Specific Transition Handling ---

        // Handle UNDOCKING (Transition: DOCKED -> IN_FLIGHT)
        if (newState === "IN_FLIGHT" && this.previousState === "DOCKED") {
            console.log("Just undocked! Applying position offset.");
            if (player) { // Ensure player object exists
                // Apply positional nudge to prevent immediate re-docking
                const offsetMultiplier = 3.5; // Ensures offset > default docking radius (60)
                const offsetDistance = player.size * offsetMultiplier;
                let undockOffset = createVector(0, -offsetDistance); // Simple 'up' offset
                // Could use directionAway logic here for more robust offset
                player.pos.add(undockOffset);
                player.vel.mult(0); // Reset velocity after offset
                console.log(`Player position offset applied (Dist: ${offsetDistance.toFixed(1)}). New Pos: (${player.pos.x.toFixed(1)}, ${player.pos.y.toFixed(1)})`);
            } else {
                 console.error("Player object missing during undock offset application!");
            }
        }
        // Handle DOCKING (Transition: IN_FLIGHT -> DOCKED)
        // This logic triggers ONLY when docking happens during gameplay via canDock() check
        else if (newState === "DOCKED" && this.previousState === "IN_FLIGHT") {
             console.log("Entering DOCKED state from IN_FLIGHT. Snapping player position.");
             // Snap player to station position when docking occurs naturally
             if (player && galaxy && galaxy.getCurrentSystem() && galaxy.getCurrentSystem().station) {
                 const stationPos = galaxy.getCurrentSystem().station.pos;
                 player.pos = stationPos.copy(); // Set player position exactly to station
                 player.vel.mult(0);             // Stop player velocity
             } else {
                  console.error("Could not snap player to station - required objects missing.");
             }
        }
        // Note: If game state were loaded directly as "DOCKED", this snapping wouldn't run.
        // Player position would rely purely on the loaded save data in that case.

    } // End of setState method


    /**
     * Updates the game logic based on the current state. Called every frame from sketch.js draw().
     * Needs player reference passed in.
     */
    update(player) { // Added player parameter
        const currentSystem = galaxy?.getCurrentSystem();

        switch (this.currentState) {
            case "IN_FLIGHT":
                if (!player || !currentSystem) {
                    console.warn("IN_FLIGHT update skipped: Player or CurrentSystem missing.");
                    break;
                }
                player.handleInput();
                player.update();
                currentSystem.update(player); // Pass player for despawn/spawn checks

                const station = currentSystem.station;
                if (station && player.canDock(station)) {
                    // Transitioning to DOCKED state via this check WILL trigger snapping logic in setState
                    this.setState("DOCKED");
                    saveGame(); // Auto-save when docking
                }
                break;

            case "DOCKED":
                // Mostly passive state; player interaction handled by UIManager
                if (player) { player.vel.mult(0); } // Ensure player stays stopped
                break;

            case "GALAXY_MAP":
                // UI interactions handled by UIManager
                break;

            case "JUMPING":
                if (!galaxy || this.jumpTargetSystemIndex < 0) {
                     console.warn("JUMPING update skipped: Galaxy or valid jump target missing.");
                     this.setState("IN_FLIGHT"); // Fallback state
                     break;
                }
                this.jumpChargeTimer += deltaTime / 1000;
                if (this.jumpChargeTimer >= this.jumpChargeDuration) {
                    galaxy.jumpToSystem(this.jumpTargetSystemIndex); // Perform jump
                    this.setState("IN_FLIGHT"); // Change state AFTER jump completes
                    saveGame(); // Auto-save after jump
                }
                break;

             case "GAME_OVER":
                // Wait for UI interaction to restart
                break;

            case "LOADING":
                // Usually handled during setup
                break;

            default:
                 console.warn(`Unknown game state encountered in update(): ${this.currentState}`);
                 this.setState("IN_FLIGHT"); // Recover to default state
                 break;
        }
    } // End of update method


    /**
     * Draws the game visuals based on the current state. Called every frame from sketch.js draw().
     * Needs player reference passed in.
     */
    draw(player) { // Added player parameter
        const currentSystem = galaxy?.getCurrentSystem();

        switch (this.currentState) {
            case "IN_FLIGHT":
                if (currentSystem && player) {
                    // StarSystem.draw handles world translation and drawing player
                    currentSystem.draw(player);
                } else { /* Optional: Draw error message */
                     background(10,10,10); fill(255); textAlign(CENTER,CENTER); textSize(16);
                     text("Error: Cannot draw IN_FLIGHT state.", width/2, height/2);
                }
                // Draw HUD overlay (not affected by world translation)
                if (uiManager && player) {
                    uiManager.drawHUD(player);
                }
                break;

            case "DOCKED":
                 // Draw static background elements
                 if (currentSystem) {
                    push();
                    currentSystem.drawBackground(); // Stars etc.
                    if(currentSystem.station) currentSystem.station.draw(); // Station visual
                    pop();
                 } else { background(20,20,40); } // Fallback background

                 // Draw player visually docked (position set by setState or load)
                 if (player) {
                     player.draw();
                 }
                 // Draw docked UI on top
                 if (uiManager && currentSystem?.station && player) {
                    uiManager.drawDockedScreen(currentSystem.station.getMarket(), player);
                 } else { /* Optional: Error message */ }
                break;

            case "GALAXY_MAP":
                 if (uiManager && galaxy && player) {
                    uiManager.drawGalaxyMap(galaxy, player);
                 } else { /* Optional: Error message */ }
                break;

            case "JUMPING":
                 // Draw flight view as background
                 if (currentSystem && player) {
                     currentSystem.draw(player);
                 }
                 // Draw jump UI overlay
                 if (uiManager && player) {
                     // Draw jump charge indicator
                     fill(0, 150, 255, 150); noStroke();
                     let chargePercent = constrain(this.jumpChargeTimer / this.jumpChargeDuration, 0, 1);
                     rect(0, height - 20, width * chargePercent, 20);
                     fill(255); textAlign(CENTER, BOTTOM); textSize(14);
                     let targetName = (galaxy && this.jumpTargetSystemIndex >= 0) ? galaxy.systems[this.jumpTargetSystemIndex]?.name : "Unknown";
                     text(`Charging Hyperdrive... Target: ${targetName}`, width / 2, height - 5);
                     // Can also draw HUD during jump if desired: uiManager.drawHUD(player);
                 }
                 break;

            case "GAME_OVER":
                 background(0, 150); // Simple dark overlay
                 if (uiManager) {
                    uiManager.drawGameOverScreen();
                 }
                 break;

            case "LOADING":
                 background(0); fill(255); textAlign(CENTER, CENTER); textSize(32);
                 text("Loading...", width / 2, height / 2);
                 break;

            default:
                 background(255,0,0); fill(0); textAlign(CENTER,CENTER); textSize(20);
                 text(`Error: Unknown game state "${this.currentState}"`, width/2, height/2);
                 break;
        }
    } // End of draw method


    /**
     * Initiates the jump sequence by setting the target and changing state to JUMPING.
     * @param {number} targetIndex - The index of the target star system in the galaxy.systems array.
     */
    startJump(targetIndex) {
        if (galaxy && targetIndex >= 0 && targetIndex < galaxy.systems.length && targetIndex !== galaxy.currentSystemIndex) {
            this.jumpTargetSystemIndex = targetIndex;
            this.jumpChargeTimer = 0;
            this.setState("JUMPING");
            console.log(`Jump initiated to system index: ${targetIndex} (${galaxy.systems[targetIndex]?.name})`);
        } else {
            console.log("Invalid jump target selected or already in target system.");
        }
    } // End of startJump method

} // End of GameStateManager Class