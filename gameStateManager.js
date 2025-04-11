// ****** gameStateManager.js ******

class GameStateManager {
    constructor() {
        this.currentState = "LOADING";
        this.previousState = null;
        this.jumpTargetSystemIndex = -1;
        this.jumpChargeTimer = 0;
        this.jumpChargeDuration = 1.5; // Seconds
    }

    /**
     * Changes the current game state and handles specific transition logic.
     * @param {string} newState - The target state to transition to.
     */
    setState(newState) {
        this.previousState = this.currentState;
        if (this.currentState === newState) return; // No change needed

        console.log(`Changing state from ${this.previousState} to ${newState}`);
        this.currentState = newState;

        // --- State Transition Logic ---
        // Reset jump info if leaving jump/map states
        if (newState !== "JUMPING" && newState !== "GALAXY_MAP") {
            this.jumpTargetSystemIndex = -1; this.jumpChargeTimer = 0;
        }

        // Handle UNDOCKING (DOCKED -> IN_FLIGHT)
        if (newState === "IN_FLIGHT" && this.previousState === "DOCKED") {
            console.log("Just undocked! Applying position offset.");
            if (player) {
                const offsetMultiplier = 3.5; // Must be > dockingRadius / player.size
                const offsetDistance = player.size * offsetMultiplier;
                let undockOffset = createVector(0, -offsetDistance); // Simple 'up' offset
                // Option: calculate offset away from station center vector
                player.pos.add(undockOffset);
                player.vel.mult(0);
                console.log(`Player position offset applied (Dist: ${offsetDistance.toFixed(1)}). New Pos: (${player.pos.x.toFixed(1)}, ${player.pos.y.toFixed(1)})`);
            }
        }
        // Handle DOCKING (IN_FLIGHT -> DOCKED)
        // Only snap position when docking happens during gameplay, not on load
        else if (newState === "DOCKED" && this.previousState === "IN_FLIGHT") {
             console.log("Entering DOCKED state from IN_FLIGHT. Snapping player position.");
             if (player && galaxy && galaxy.getCurrentSystem() && galaxy.getCurrentSystem().station) {
                 const stationPos = galaxy.getCurrentSystem().station.pos;
                 player.pos = stationPos.copy(); player.vel.mult(0);
             } else { console.error("Could not snap player to station - required objects missing."); }
        }
    } // End setState


    /**
     * Updates game logic based on the current state.
     * @param {Player} player - Reference to the player object.
     */
    update(player) {
        const currentSystem = galaxy?.getCurrentSystem();

        switch (this.currentState) {
            case "IN_FLIGHT":
                if (!player || !currentSystem) { break; }
                player.handleInput();
                player.update();
                currentSystem.update(player); // Pass player ref
                const station = currentSystem.station;
                if (station && player.canDock(station)) {
                    this.setState("DOCKED");
                    saveGame();
                }
                break;
            case "DOCKED":
                if (player) { player.vel.mult(0); } // Ensure stopped
                break;
            case "GALAXY_MAP":
                // Handled by UI clicks
                break;
            case "JUMPING":
                if (!galaxy || this.jumpTargetSystemIndex < 0) { this.setState("IN_FLIGHT"); break; }
                this.jumpChargeTimer += deltaTime / 1000; // Update timer
                if (this.jumpChargeTimer >= this.jumpChargeDuration) {
                    galaxy.jumpToSystem(this.jumpTargetSystemIndex); // Perform jump
                    this.setState("IN_FLIGHT"); // Back to flight AFTER jump
                    saveGame();
                }
                break;
             case "GAME_OVER": break; // Passive state
            case "LOADING": break; // Passive state
            default: console.warn(`Unknown game state in update(): ${this.currentState}`); this.setState("IN_FLIGHT"); break;
        }
    } // End update


    /**
     * Draws game visuals based on the current state.
     * @param {Player} player - Reference to the player object.
     */
    draw(player) {
        const currentSystem = galaxy?.getCurrentSystem();

        switch (this.currentState) {
            case "IN_FLIGHT":
                if (currentSystem && player) { currentSystem.draw(player); } // Draw world centered on player
                else { /* Draw error state */ }
                if (uiManager && player) {
                    uiManager.drawHUD(player); // Draw HUD
                    if (currentSystem) uiManager.drawMinimap(player, currentSystem); // Draw Minimap
                }
                break;
            case "DOCKED":
                 if (currentSystem) { // Draw static background
                    push(); currentSystem.drawBackground(); if(currentSystem.station) currentSystem.station.draw(); pop();
                 } else { background(20,20,40); }
                 if (player) { player.draw(); } // Draw player at station
                 if (uiManager && currentSystem?.station && player) { uiManager.drawDockedScreen(currentSystem.station.getMarket(), player); } // Draw Docked UI
                break;
            case "GALAXY_MAP":
                 if (uiManager && galaxy && player) { uiManager.drawGalaxyMap(galaxy, player); } // Draw Map UI
                 else { /* Draw error state */ }
                break;
            // --- VERIFY JUMPING DRAWING ---
            case "JUMPING":
                 // Draw flight view as background
                 if (currentSystem && player) { currentSystem.draw(player); }
                 else { background(0); } // Fallback background

                 // Draw jump UI overlay
                 if (uiManager && player) {
                     // Draw jump charge indicator (Progress Bar)
                     fill(0, 150, 255, 150); noStroke();
                     let chargePercent = constrain(this.jumpChargeTimer / this.jumpChargeDuration, 0, 1);
                     rect(0, height - 20, width * chargePercent, 20); // Bar at bottom

                     // Draw Jump Status Text
                     fill(255); textAlign(CENTER, BOTTOM); textSize(14);
                     let targetName = "Unknown";
                     if (galaxy && this.jumpTargetSystemIndex >= 0 && this.jumpTargetSystemIndex < galaxy.systems.length) {
                          targetName = galaxy.systems[this.jumpTargetSystemIndex]?.name || "Invalid Target";
                     }
                     text(`Charging Hyperdrive... Target: ${targetName}`, width / 2, height - 5);

                     // Optional: Draw Minimap during jump?
                     // if (currentSystem) { uiManager.drawMinimap(player, currentSystem); }
                 }
                 break;
            // --- END JUMPING DRAWING ---
             case "GAME_OVER":
                 background(0, 150); // Dim overlay
                 if (uiManager) { uiManager.drawGameOverScreen(); } // Draw Game Over UI
                 break;
             case "LOADING":
                 background(0); fill(255); textAlign(CENTER, CENTER); textSize(32); text("Loading...", width / 2, height / 2);
                 break;
             default:
                 background(255,0,0); fill(0); textAlign(CENTER,CENTER); textSize(20); text(`Error: Unknown game state "${this.currentState}"`, width/2, height/2);
                 break;
        }
    } // End draw method


    /**
     * Initiates the jump sequence.
     * @param {number} targetIndex - Index of the target system.
     */
    startJump(targetIndex) {
        if (galaxy && targetIndex >= 0 && targetIndex < galaxy.systems.length && targetIndex !== galaxy.currentSystemIndex) {
            this.jumpTargetSystemIndex = targetIndex;
            this.jumpChargeTimer = 0;
            this.setState("JUMPING");
            console.log(`Jump initiated to system index: ${targetIndex} (${galaxy.systems[targetIndex]?.name})`);
        } else { console.log("Invalid jump target selected or already in target system."); }
    } // End startJump

} // End of GameStateManager Class