// ****** gameStateManager.js ******

class GameStateManager {
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
        // Store previous state BEFORE changing
        this.previousState = this.currentState;

        // Check if state is actually changing
        if (this.currentState === newState) {
            return; // Do nothing if state is the same
        }

        console.log(`Changing state from ${this.previousState} to ${newState}`);
        this.currentState = newState;

        // --- Handle specific transitions ---
        // ... (reset jump state logic) ...

        // If just UNDOCKED (transitioned from DOCKED to IN_FLIGHT)
        if (newState === "IN_FLIGHT" && this.previousState === "DOCKED") {
            console.log("Just undocked! Applying position offset.");
            if (player) {
                // --- INCREASE THE OFFSET DISTANCE ---
                // The Docking Radius is 60. We need an offset LARGER than that.
                // Let's try slightly more than the radius, e.g., 65 or 70.
                // player.size is 20. We need offset > 60. So multiplier > 3.
                const offsetMultiplier = 3.5; // Example: 3.5 * 20 = 70 offset distance
                const offsetDistance = player.size * offsetMultiplier;

                // Option 1: Simple offset (e.g., move slightly 'up' screen)
                let undockOffset = createVector(0, -offsetDistance); // Nudge by the calculated distance

                // Option 2: Nudge directly away from station center (more robust)
                /*
                const currentSystem = galaxy?.getCurrentSystem();
                const station = currentSystem?.station;
                if (station) {
                    let directionAway = p5.Vector.sub(player.pos, station.pos);
                    if (directionAway.magSq() < 1) {
                         directionAway = createVector(0,-1); // Default direction: Up
                    }
                    // Set magnitude using the calculated offsetDistance
                    directionAway.setMag(offsetDistance);
                    undockOffset = directionAway;
                } else {
                     undockOffset = createVector(0, -offsetDistance); // Default offset
                     console.warn("Could not find station data for undock offset calculation.");
                }
                */

                player.pos.add(undockOffset); // Apply the offset immediately
                player.vel.mult(0); // Ensure velocity starts at 0 after offset
                console.log(`Player position offset applied (Dist: ${offsetDistance}). New Pos: (${player.pos.x.toFixed(1)}, ${player.pos.y.toFixed(1)})`);
            } else {
                 console.error("Player object missing during undock offset application!");
            }
        }
        // Handle DOCKING (Transition: Any -> DOCKED)
        else if (newState === "DOCKED") {
            // ... (snapping logic remains the same) ...
             console.log("Entering DOCKED state. Snapping player position.");
             if (player && galaxy && galaxy.getCurrentSystem() && galaxy.getCurrentSystem().station) {
                 const stationPos = galaxy.getCurrentSystem().station.pos;
                 player.pos = stationPos.copy();
                 player.vel.mult(0);
             } else {
                  console.error("Could not snap player to station - required objects missing.");
             }
        }
    }


    /**
     * Updates the game logic based on the current state. Called every frame from sketch.js draw().
     */
    update() {
        // Get current system safely using optional chaining
        const currentSystem = galaxy?.getCurrentSystem();

        // Switch statement controls logic based on the current state
        switch (this.currentState) {
            case "IN_FLIGHT":
                // Run flight logic only if player and system exist
                if (!player || !currentSystem) {
                    console.warn("IN_FLIGHT update skipped: Player or CurrentSystem missing.");
                    break; // Exit case if essential objects aren't ready
                }

                // Handle player input for movement and actions
                player.handleInput();
                // Update player physics (position, velocity, etc.)
                player.update();
                // Update elements within the current system (enemies, projectiles, etc.)
                currentSystem.update();

                // --- Check for Docking Conditions ---
                const station = currentSystem.station; // We know currentSystem exists here
                // Check if player meets conditions to dock with the station
                // This check should now fail immediately after undocking due to the position offset applied in setState
                if (station && player.canDock(station)) {
                    console.log("Player canDock() condition met."); // Log for debugging
                    this.setState("DOCKED"); // Change state to DOCKED
                    saveGame(); // Auto-save progress when docking
                }
                break;

            case "DOCKED":
                // When docked, primarily handle UI interactions (buttons) via mousePressed in UIManager
                // Ensure player remains visually snapped and stopped (handled mostly in setState on entry)
                if (player) {
                     player.vel.mult(0); // Continuously ensure velocity is zero while docked
                }
                // Could add passive actions here (e.g., slow shield recharge if implemented later)
                break;

            case "GALAXY_MAP":
                // Most interactions (selecting systems, clicking jump) are handled by UIManager.handleMouseClicks
                // No active updates typically needed here in the manager itself
                break;

            case "JUMPING":
                // Logic for the hyperspace jump sequence
                if (!galaxy || this.jumpTargetSystemIndex < 0) {
                     console.warn("JUMPING update skipped: Galaxy or valid jump target missing.");
                     this.setState("IN_FLIGHT"); // Fallback if jump state is invalid
                     break;
                }

                // Increment the jump charge timer based on elapsed frame time
                this.jumpChargeTimer += deltaTime / 1000; // deltaTime is in milliseconds

                // Check if the jump drive has finished charging
                if (this.jumpChargeTimer >= this.jumpChargeDuration) {
                    // Perform the actual jump to the target system
                    galaxy.jumpToSystem(this.jumpTargetSystemIndex);
                    // Change state to IN_FLIGHT *after* the jump completes
                    this.setState("IN_FLIGHT");
                    saveGame(); // Auto-save progress after a successful jump
                }
                // Could update visual jump effects here based on jumpChargeTimer
                break;

             case "GAME_OVER":
                // Game logic stops. Wait for player interaction (handled by UIManager click check)
                // Could potentially play game over animations or sounds here
                break;

            case "LOADING":
                // Placeholder state - could display a loading indicator if needed
                // Transition out of this state happens in sketch.js setup() once assets/data are loaded
                break;

            default:
                 console.warn(`Unknown game state encountered in update(): ${this.currentState}`);
                 this.setState("IN_FLIGHT"); // Attempt to recover to a default state
                 break;

        } // End switch statement
    } // End of update method


    /**
     * Draws the game visuals based on the current state. Called every frame from sketch.js draw().
     */
    draw() {
        // Get current system safely
        const currentSystem = galaxy?.getCurrentSystem();

        // Switch statement controls drawing based on the current state
        switch (this.currentState) {
            case "IN_FLIGHT":
                 // Draw system background, station, enemies, projectiles first
                if (currentSystem) {
                     currentSystem.draw(); // Let the system draw its contents
                 } else {
                      // Draw a fallback background if system is missing?
                      background(10,10,10);
                      fill(255); textAlign(CENTER,CENTER); textSize(16);
                      text("Error: Current system not found.", width/2, height/2);
                 }
                 // Draw player ship on top
                 if (player) {
                     player.draw();
                 }
                 // Draw the HUD overlay
                 if (uiManager && player) {
                     uiManager.drawHUD(player);
                 }
                break;

            case "DOCKED":
                // Draw a dimmed or static view of the system/station as background
                if (currentSystem) {
                    push();
                    // tint(255, 150); // Optional: Make background semi-transparent
                    currentSystem.drawBackground(); // Draw stars, etc.
                    if(currentSystem.station) currentSystem.station.draw(); // Draw station
                    pop();
                 } else {
                     background(20,20,40); // Simple background if no system
                 }
                 // Draw player ship visually snapped to station (position handled by setState)
                 if (player) {
                     player.draw();
                 }
                 // Draw the main docked interface (market, buttons) over everything
                 if (uiManager && currentSystem?.station && player) {
                    uiManager.drawDockedScreen(currentSystem.station.getMarket(), player);
                 }
                break;

            case "GALAXY_MAP":
                 // Galaxy map takes over the whole screen
                 if (uiManager && galaxy && player) {
                    uiManager.drawGalaxyMap(galaxy, player);
                 } else {
                      background(10,0,20);
                      fill(255); textAlign(CENTER,CENTER); textSize(16);
                      text("Error displaying Galaxy Map - Missing data.", width/2, height/2);
                 }
                break;

            case "JUMPING":
                // Draw the regular flight view as background during jump charge
                if (currentSystem) {
                    currentSystem.draw();
                }
                if (player) {
                     player.draw();
                }
                if (uiManager && player) {
                     uiManager.drawHUD(player);
                }

                // Draw jump charge indicator / visual effect overlay
                // Simple progress bar at the bottom
                fill(0, 150, 255, 150); // Blue, semi-transparent
                noStroke();
                let chargePercent = constrain(this.jumpChargeTimer / this.jumpChargeDuration, 0, 1);
                rect(0, height - 20, width * chargePercent, 20); // Bar grows from left

                // Text indicating jump status
                fill(255);
                textAlign(CENTER, BOTTOM);
                textSize(14);
                let targetName = (galaxy && this.jumpTargetSystemIndex >= 0) ? galaxy.systems[this.jumpTargetSystemIndex]?.name : "Unknown";
                text(`Charging Hyperdrive... Target: ${targetName}`, width / 2, height - 5);

                // Could add more visual effects like star streaks here later
                break;

            case "GAME_OVER":
                // Draw the underlying scene dimmed? Or just the overlay?
                // For simplicity, draw the last valid state (usually IN_FLIGHT) dimmed
                 if (this.previousState === "IN_FLIGHT" || this.previousState === "JUMPING") {
                     push();
                     tint(255, 80); // Dim the background significantly
                     if (currentSystem) currentSystem.draw();
                     if (player) player.draw(); // Draw destroyed player? Or hide?
                     if (uiManager && player) uiManager.drawHUD(player); // Dimmed HUD
                     pop();
                 } else {
                     // Fallback if previous state was weird
                     background(0);
                 }
                 // Draw the Game Over screen overlay on top
                 if (uiManager) {
                    uiManager.drawGameOverScreen();
                 }
                break;

            case "LOADING":
                // Simple text indicator while loading
                background(0);
                fill(255);
                textAlign(CENTER, CENTER);
                textSize(32);
                text("Loading...", width / 2, height / 2);
                break;

            default:
                // Draw an error state if state is unknown
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
            console.log(`Jump initiated to system index: ${targetIndex} (${galaxy.systems[targetIndex]?.name})`);
        } else {
            // Log error if jump target is invalid
            console.log("Invalid jump target selected or already in target system.");
            // Stay on the galaxy map if selection fails, allowing user to choose again or exit
            // Optionally, could provide UI feedback here (e.g., flash selected system red)
        }
    } // End of startJump method

} // End of GameStateManager Class