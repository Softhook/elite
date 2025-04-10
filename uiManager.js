// ****** uiManager.js ******

class UIManager {
    constructor() {
        // Define areas for buttons (simple rectangles for now)
        // These are dynamically updated when the relevant screen is drawn
        this.marketButtonAreas = []; // { x, y, w, h, action: 'buy'/'sell', commodity: 'name' }
        this.undockButtonArea = { x: 0, y: 0, w: 0, h: 0 }; // Initialize area for Undock button
        this.galaxyMapNodeAreas = []; // { x, y, radius, index: systemIndex }
        this.jumpButtonArea = { x: 0, y: 0, w: 0, h: 0 }; // Initialize area for Jump button
        this.selectedSystemIndex = -1; // Tracks selected system in Galaxy Map
    }

    // Draws the Heads-Up Display (HUD) during flight
    drawHUD(player) {
        // Ensure player and system data are available
        if (!player) return;
        const currentSystemName = player.currentSystem ? player.currentSystem.name : 'N/A';
        const cargoAmount = player.getCargoAmount ? player.getCargoAmount() : 0; // Add checks if methods might not exist
        const cargoCap = player.cargoCapacity !== undefined ? player.cargoCapacity : 0;
        const hull = player.hull !== undefined ? floor(player.hull) : 0;
        const maxHull = player.maxHull || 100; // Default if not defined
        const credits = player.credits !== undefined ? player.credits : 0;

        push(); // Isolate HUD drawing styles
        // Semi-transparent background bar at the top
        fill(0, 180, 0, 150);
        noStroke();
        rect(0, 0, width, 40);

        // Display game info text
        fill(255); // White text
        textSize(14);
        textAlign(LEFT, CENTER);
        text(`System: ${currentSystemName}`, 10, 20);

        textAlign(RIGHT, CENTER);
        // Use template literals for cleaner string construction
        text(`Hull: ${hull} / ${maxHull}`, width - 150, 20);
        text(`Credits: ${credits}`, width - 280, 20);
        text(`Cargo: ${cargoAmount} / ${cargoCap}`, width - 10, 20);

        // Optional: Visual indicator for weapon cooldown
        if (player.fireCooldown > 0 && player.fireRate > 0) {
            let cooldownPercent = map(player.fireCooldown, player.fireRate, 0, 0, 1);
            cooldownPercent = constrain(cooldownPercent, 0, 1); // Ensure value is between 0 and 1
            fill(255, 0, 0, 150); // Red cooldown bar
            rect(width / 2 - 50, 30, 100 * cooldownPercent, 5); // Draw bar based on remaining cooldown
        }

        pop(); // Restore previous drawing styles
    }

    // Draws the interface shown when docked at a station
    drawDockedScreen(market, player) {
        // Ensure required objects are passed
        if (!market || !player) {
            console.error("UIManager.drawDockedScreen called without market or player.");
             // Optional: Draw an error message on screen
             push();
             fill(255,0,0); textSize(20); textAlign(CENTER,CENTER);
             text("Error displaying docked screen - Missing data.", width/2, height/2);
             pop();
            return;
        }

        // Update market's view of player cargo before drawing prices/stock
        market.updatePlayerCargo(player.cargo);
        const commodities = market.getPrices(); // Get current market data

        // Clear previous button definitions for this screen redraw
        this.marketButtonAreas = [];

        push(); // Isolate docked screen drawing styles

        // Draw main background panel
        fill(20, 20, 50, 220); // Dark semi-transparent blue
        stroke(100, 100, 255); // Light blue outline
        strokeWeight(1);
        rect(width * 0.1, height * 0.1, width * 0.8, height * 0.8, 10); // Rounded corners

        // Draw Screen Title
        fill(255); // White text
        textSize(24);
        textAlign(CENTER, TOP);
        text(`Station Market - ${market.systemType}`, width / 2, height * 0.1 + 20);

        // Draw Player Status section
        textSize(16);
        textAlign(LEFT, TOP);
        text(`Credits: ${player.credits}`, width * 0.1 + 30, height * 0.1 + 60);
        text(`Cargo: ${player.getCargoAmount()} / ${player.cargoCapacity}`, width * 0.1 + 30, height * 0.1 + 85);

        // Define layout parameters for the market table
        let startY = height * 0.1 + 130;
        let tableWidth = width * 0.8 - 60; // Total width for the table content
        let numCols = 6; // Commodity, Buy Price, Sell Price, In Cargo, Buy Button, Sell Button
        let colWidth = tableWidth / numCols;
        let startX = width * 0.1 + 30; // Starting X position for the table

        // Draw Market Table Headers
        textAlign(CENTER, CENTER);
        textSize(14);
        fill(200); // Header text color
        text("Commodity", startX + colWidth * 0.5, startY);
        text("Buy Price", startX + colWidth * 1.5, startY);
        text("Sell Price", startX + colWidth * 2.5, startY);
        text("In Cargo", startX + colWidth * 3.5, startY);
        // Columns 5 & 6 are for buttons, no header text needed

        // Draw Market Table Rows (Iterate through commodities)
        startY += 30; // Move down for the first row
        const rowHeight = 30;
        const btnWidth = colWidth * 0.8; // Button width relative to column width
        const btnHeight = rowHeight * 0.8; // Button height relative to row height

        commodities.forEach((comm, index) => {
            let yPos = startY + index * rowHeight; // Y position for the current row
            let textY = yPos + rowHeight / 2; // Center text vertically in the row

            // Draw commodity data
            fill(255); // White text for data
            textAlign(LEFT, CENTER);
            text(comm.name, startX + 10, textY); // Commodity Name

            textAlign(RIGHT, CENTER);
            text(comm.buyPrice, startX + colWidth * 2 - 10, textY); // Buy Price
            text(comm.sellPrice, startX + colWidth * 3 - 10, textY); // Sell Price
            text(comm.playerStock, startX + colWidth * 4 - 10, textY); // Quantity in Player Cargo

            // --- Draw and Define BUY Button ---
            let buyBtnX = startX + colWidth * 4.1; // Position Buy button in 5th column area
            let buyBtnY = yPos + (rowHeight - btnHeight) / 2; // Center button vertically
            fill(0, 150, 0); // Green button background
            rect(buyBtnX, buyBtnY, btnWidth, btnHeight, 3); // Draw button rectangle
            fill(255); // White button text
            textAlign(CENTER, CENTER);
            text("Buy 1", buyBtnX + btnWidth / 2, buyBtnY + btnHeight / 2);
            // Store this button's clickable area and associated action/data
            this.marketButtonAreas.push({ x: buyBtnX, y: buyBtnY, w: btnWidth, h: btnHeight, action: 'buy', commodity: comm.name });

            // --- Draw and Define SELL Button ---
            let sellBtnX = startX + colWidth * 5.1; // Position Sell button in 6th column area
            let sellBtnY = yPos + (rowHeight - btnHeight) / 2; // Center button vertically
            fill(150, 0, 0); // Red button background
            rect(sellBtnX, sellBtnY, btnWidth, btnHeight, 3); // Draw button rectangle
            fill(255); // White button text
            textAlign(CENTER, CENTER);
            text("Sell 1", sellBtnX + btnWidth / 2, sellBtnY + btnHeight / 2);
            // Store this button's clickable area and associated action/data
            this.marketButtonAreas.push({ x: sellBtnX, y: sellBtnY, w: btnWidth, h: btnHeight, action: 'sell', commodity: comm.name });
        });

        // --- Draw and Define UNDOCK Button ---
        // Recalculate button position and size every frame it's drawn
        let undockBtnW = 120;
        let undockBtnH = 40;
        let undockBtnX = width / 2 - undockBtnW / 2; // Centered horizontally
        let undockBtnY = height * 0.9 - undockBtnH - 20; // Positioned near the bottom edge of the panel
        
        // Draw the visual button
        fill(180, 180, 0); // Yellowish button background
        rect(undockBtnX, undockBtnY, undockBtnW, undockBtnH, 5); // Draw button rectangle
        
        // Draw the button text
        fill(0); // Black text
        textSize(18);
        textAlign(CENTER, CENTER);
        text("UNDOCK", undockBtnX + undockBtnW / 2, undockBtnY + undockBtnH / 2);
        
        // *** Store the calculated area for click detection ***
        this.undockButtonArea = { x: undockBtnX, y: undockBtnY, w: undockBtnW, h: undockBtnH };

        pop(); // Restore previous drawing styles
    }

    // Draws the Galaxy Map screen
    drawGalaxyMap(galaxy, player) {
         if (!galaxy || !player) {
             console.error("UIManager.drawGalaxyMap called without galaxy or player.");
             // Optional: Draw error message
             push(); fill(255,0,0); textSize(20); textAlign(CENTER,CENTER);
             text("Error displaying galaxy map - Missing data.", width/2, height/2); pop();
             return;
         }

        // Clear previous button/node area definitions
        this.galaxyMapNodeAreas = [];
        const systems = galaxy.getSystemDataForMap(); // Get data for all systems
        const reachableIndices = galaxy.getReachableSystems(); // Get systems reachable from current
        const currentSystemIndex = galaxy.currentSystemIndex;

        push(); // Isolate map drawing styles
        background(10, 0, 20); // Dark purple background

        // Draw connections between systems (simple lines for MVP)
        stroke(100, 80, 150, 150); // Faint purple lines
        strokeWeight(1);
        // Example connection logic: Connect systems in sequence for simplicity
        for (let i = 0; i < systems.length; i++) {
            let currentSys = systems[i];
            let nextIndex = (i + 1) % systems.length; // Connect to next, wrapping around
            let nextSys = systems[nextIndex];
            if (currentSys && nextSys) { // Ensure both systems exist
                line(currentSys.x, currentSys.y, nextSys.x, nextSys.y);
            }
        }
        // Future: Could draw connections based on jump range or defined routes

        // Draw each Star System node
        const nodeRadius = 15; // Visual size of the system node circle
        systems.forEach((sys, index) => {
             if (!sys) return; // Skip if system data is somehow invalid

            let isCurrent = (index === currentSystemIndex);
            let isSelected = (index === this.selectedSystemIndex);
            let isReachable = reachableIndices.includes(index);

            // Determine fill color based on system state
            if (isCurrent) {
                fill(0, 255, 0); // Bright Green: Current location
            } else if (isSelected) {
                fill(255, 255, 0); // Yellow: Selected jump target
            } else if (sys.visited) {
                fill(150, 150, 200); // Light Blue/Grey: Visited but not current/selected
            } else {
                fill(80, 80, 100); // Dark Grey: Unvisited
            }

            // Determine stroke (outline) based on state
            if (isReachable && !isCurrent) {
                 stroke(200, 200, 0); // Yellow outline: Reachable jump target
                 strokeWeight(2);
            } else {
                 stroke(200); // Default outline
                 strokeWeight(1);
            }

            // Draw the node circle
            ellipse(sys.x, sys.y, nodeRadius * 2, nodeRadius * 2);
            // Store the node's area for click detection
            this.galaxyMapNodeAreas.push({ x: sys.x, y: sys.y, radius: nodeRadius, index: index });

            // Draw Labels below the node
            fill(255); // White text
            noStroke();
            textAlign(CENTER, TOP);
            textSize(12);
            text(sys.name, sys.x, sys.y + nodeRadius + 5); // System name

            // Display system type if known (visited or current)
            textSize(10);
            if (sys.visited || isCurrent) {
                text(`(${sys.type})`, sys.x, sys.y + nodeRadius + 20);
            } else {
                text(`(Unknown)`, sys.x, sys.y + nodeRadius + 20); // Hide type if unvisited
            }
        });

        // --- Draw and Define JUMP Button ---
        // Button appears only if a valid, reachable, non-current system is selected
        if (this.selectedSystemIndex !== -1 &&
            this.selectedSystemIndex !== currentSystemIndex &&
            reachableIndices.includes(this.selectedSystemIndex))
        {
            let jumpBtnW = 150;
            let jumpBtnH = 40;
            let jumpBtnX = width / 2 - jumpBtnW / 2; // Centered horizontally
            let jumpBtnY = height - jumpBtnH - 20; // Near bottom of screen

            // Draw button visual
            fill(0, 180, 255); // Cyan button background
            rect(jumpBtnX, jumpBtnY, jumpBtnW, jumpBtnH, 5); // Draw rectangle

            // Draw button text
            fill(0); // Black text
            textSize(18);
            textAlign(CENTER, CENTER);
            text(`Jump to Selection`, jumpBtnX + jumpBtnW / 2, jumpBtnY + jumpBtnH / 2);

            // Store button area for click detection
            this.jumpButtonArea = { x: jumpBtnX, y: jumpBtnY, w: jumpBtnW, h: jumpBtnH };
        } else {
            // If no valid target selected, deactivate button area
            this.jumpButtonArea = { x: 0, y: 0, w: 0, h: 0 };
        }

        // Draw Instructional Text at the bottom
        fill(200); // Light grey text
        textAlign(CENTER, BOTTOM);
        textSize(14);
        text("Click a reachable system (yellow outline) to select, then click JUMP.", width / 2, height - 70);
        text("Press 'M' or 'ESC' to return to flight.", width / 2, height - 5);

        pop(); // Restore previous drawing styles
    }

    // Draws the Game Over overlay screen
    drawGameOverScreen() {
        push(); // Isolate game over screen styles
        // Semi-transparent dark overlay covering the whole screen
        fill(0, 0, 0, 150);
        rect(0, 0, width, height);

        // Draw "GAME OVER" text
        fill(255, 0, 0); // Red text
        textSize(48);
        textAlign(CENTER, CENTER);
        text("GAME OVER", width / 2, height / 2 - 30);

        // Draw instruction to restart
        fill(255); // White text
        textSize(20);
        text("Click to Restart", width/2, height / 2 + 30);
        pop(); // Restore previous drawing styles
    }


    // Handles mouse clicks, checks against UI elements based on game state
    handleMouseClicks(mx, my, currentState, player, market, galaxy) {
        // Log entry point and state for debugging
        console.log(`handleMouseClicks called. State: ${currentState}, Click Coords: (${floor(mx)}, ${floor(my)})`);

        // Actions depend on the current game state
        if (currentState === "DOCKED") {
            console.log("State is DOCKED. Checking buttons...");

            // --- Debug Undock Button Check ---
            // Log the currently stored button area just before checking
            console.log("Checking Undock Button. Area:", this.undockButtonArea);

            // Check if the click coordinates (mx, my) are within the stored undock button area
            if (mx > this.undockButtonArea.x && mx < this.undockButtonArea.x + this.undockButtonArea.w &&
                my > this.undockButtonArea.y && my < this.undockButtonArea.y + this.undockButtonArea.h)
            {
                // This block executes if the click is within the button's bounds
                console.log(">>> Click IS inside Undock button area!");
                console.log("Attempting to set state to IN_FLIGHT...");

                // Access the global gameStateManager to change the state
                if (gameStateManager) { // Ensure manager exists
                    gameStateManager.setState("IN_FLIGHT");
                    console.log("State change to IN_FLIGHT requested.");
                } else {
                    // This indicates a serious problem if the manager isn't available
                    console.error("CRITICAL: gameStateManager not accessible in UIManager!");
                }
                return true; // Indicate that the click was handled by this UI element
            } else {
                // Log if the click was outside the calculated button area
                 console.log("Click was OUTSIDE Undock button area.");
            }
            // --- End Undock Button Check ---


            // Check Market Buttons (if click wasn't on Undock)
            for (const btn of this.marketButtonAreas) {
                // Check if click is within this market button's area
                if (mx > btn.x && mx < btn.x + btn.w && my > btn.y && my < btn.y + btn.h) {
                    console.log(`Market button clicked: ${btn.action} ${btn.commodity}`);
                    // Perform action only if market and player objects are valid
                    if (market && player) {
                        if (btn.action === 'buy') {
                            market.buy(btn.commodity, 1, player); // Attempt to buy 1 unit
                        } else if (btn.action === 'sell') {
                            market.sell(btn.commodity, 1, player); // Attempt to sell 1 unit
                        }
                    } else {
                         console.warn("Market or Player object not available for transaction.");
                    }
                    return true; // Indicate click was handled by a market button
                }
            }
            // If click occurred in DOCKED state but didn't hit any recognized button
             console.log("Click in DOCKED state did not hit Undock or Market buttons.");

        } else if (currentState === "GALAXY_MAP") {
            console.log("State is GALAXY_MAP. Checking buttons/nodes...");

            // Check JUMP Button first (usually drawn on top)
            // Check if button is active (width > 0) and click is within its area
            if (this.jumpButtonArea.w > 0 &&
                mx > this.jumpButtonArea.x && mx < this.jumpButtonArea.x + this.jumpButtonArea.w &&
                my > this.jumpButtonArea.y && my < this.jumpButtonArea.y + this.jumpButtonArea.h)
            {
                console.log("Jump button clicked");
                // Proceed only if a valid system index is selected
                if (this.selectedSystemIndex !== -1) {
                    if (gameStateManager) { // Ensure manager exists
                        gameStateManager.startJump(this.selectedSystemIndex); // Initiate jump sequence
                    } else {
                         console.error("CRITICAL: gameStateManager not accessible in UIManager!");
                    }
                    this.selectedSystemIndex = -1; // Reset selection after initiating jump
                } else {
                     console.log("Jump clicked, but no valid system selected.");
                }
                return true; // Indicate click was handled by Jump button
            }

            // Check clicks on Star System Nodes
            for (const node of this.galaxyMapNodeAreas) {
                 // Use dist() to check if click is within the circular node area
                if (dist(mx, my, node.x, node.y) < node.radius) {
                    console.log(`Clicked on system node: Index ${node.index}`);
                     // Ensure galaxy object exists to get reachable systems
                     const reachable = galaxy ? galaxy.getReachableSystems() : [];
                     const currentIdx = galaxy ? galaxy.currentSystemIndex : -1;

                     // Allow selection only if the system is reachable and not the current one
                     if (node.index !== currentIdx && reachable.includes(node.index)) {
                         this.selectedSystemIndex = node.index; // Update selected target
                         console.log(`Selected target system index: ${node.index}`);
                     } else if (node.index === currentIdx) {
                         this.selectedSystemIndex = -1; // Deselect if clicking the current system
                          console.log(`Clicked on current system, deselecting target.`);
                     } else {
                          // Clicked on a node that's not reachable
                          console.log(`System index ${node.index} is not reachable.`);
                     }
                    return true; // Indicate click was handled (even if selection didn't change)
                }
            }
            // If click occurred in GALAXY_MAP state but didn't hit Jump button or a node
             console.log("Click in GALAXY_MAP state did not hit Jump button or a system node.");


        } else if (currentState === "GAME_OVER") {
            // In GAME_OVER state, any click restarts the game
            console.log("Click detected in GAME_OVER state. Restarting game...");
            window.location.reload(); // Easiest way to restart the whole sketch/game
            return true; // Indicate click was handled
        }

        // Default: If the click wasn't handled by any UI element in the active state
        console.log(`Click at (${floor(mx)}, ${floor(my)}) was not processed by UI in state ${currentState}.`);
        return false; // Indicate click was not handled by this UI manager
    }
} // End of UIManager Class