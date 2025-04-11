// ****** uiManager.js ******

class UIManager {
    constructor() {
        // Areas for clickable UI elements, updated dynamically during drawing
        this.marketButtonAreas = []; // Stores { x, y, w, h, action, commodity } for market buttons
        this.undockButtonArea = { x: 0, y: 0, w: 0, h: 0 }; // Stores area for Undock button
        this.galaxyMapNodeAreas = []; // Stores { x, y, radius, index } for system nodes on map
        this.jumpButtonArea = { x: 0, y: 0, w: 0, h: 0 }; // Stores area for Jump button on map

        // State variable for UI
        this.selectedSystemIndex = -1; // Tracks which system node is selected on the map

        // --- Minimap Properties ---
        this.minimapSize = 150; // Size of the square minimap in pixels
        this.minimapMargin = 15; // Margin from the top-right corner
        this.minimapX = 0; // Calculated in drawMinimap based on width
        this.minimapY = this.minimapMargin; // Fixed Y position near top
        // How many world units the minimap width/height represents (adjust for zoom level)
        this.minimapWorldViewRange = 5000; // Example range
        this.minimapScale = 1; // Calculated in drawMinimap (pixels per world unit)
    }

    // Draws the Heads-Up Display (HUD) during flight
    drawHUD(player) {
        // Basic null checks for safety
        if (!player) return;
        const currentSystemName = player.currentSystem ? player.currentSystem.name : 'N/A';
        const cargoAmount = typeof player.getCargoAmount === 'function' ? player.getCargoAmount() : 0;
        const cargoCap = player.cargoCapacity !== undefined ? player.cargoCapacity : 0;
        const hull = player.hull !== undefined ? floor(player.hull) : 0;
        const maxHull = player.maxHull || 100;
        const credits = player.credits !== undefined ? player.credits : 0;

        push(); // Isolate HUD drawing styles
        // Draw HUD background bar
        fill(0, 180, 0, 150); noStroke();
        rect(0, 0, width, 40);

        // Draw Text elements
        fill(255); textSize(14);
        textAlign(LEFT, CENTER);
        text(`System: ${currentSystemName}`, 10, 20);

        textAlign(RIGHT, CENTER);
        text(`Hull: ${hull} / ${maxHull}`, width - 150, 20);
        text(`Credits: ${credits}`, width - 280, 20);
        text(`Cargo: ${cargoAmount} / ${cargoCap}`, width - 10, 20);

        // Draw weapon cooldown indicator (optional)
        if (player.fireCooldown > 0 && player.fireRate > 0) {
            let cooldownPercent = constrain(map(player.fireCooldown, player.fireRate, 0, 0, 1), 0, 1);
            fill(255, 0, 0, 150); // Red bar
            rect(width / 2 - 50, 30, 100 * cooldownPercent, 5);
        }
        pop(); // Restore previous drawing styles
    }

    // Draws the interface shown when docked at a station
    drawDockedScreen(market, player) {
        console.log("Attempting to draw Docked Screen..."); // Debug log

        // Validate input objects
        if (!market || !player) {
            console.error("UIManager.drawDockedScreen called without valid market or player object.");
            push(); fill(255,0,0); textSize(18); textAlign(CENTER,CENTER);
            text("Error rendering docked screen - Data missing.", width/2, height/2); pop();
            return;
        }
         if (typeof market.getPrices !== 'function' || typeof market.updatePlayerCargo !== 'function') {
             console.error("UIManager.drawDockedScreen: Invalid market object passed.", market);
             push(); fill(255,0,0); textSize(18); textAlign(CENTER,CENTER);
             text("Error rendering docked screen - Invalid market data.", width/2, height/2); pop();
             return;
         }

        // Wrap drawing logic in try-catch for robustness
        try {
            market.updatePlayerCargo(player.cargo); // Sync market view with player cargo
            let commodities = market.getPrices();
             if (!Array.isArray(commodities)) { commodities = []; } // Ensure commodities is an array

            this.marketButtonAreas = []; // Reset market button clickable areas

            push(); // Isolate docked screen styles

            // Draw main panel background
            fill(20, 20, 50, 220); stroke(100, 100, 255); strokeWeight(1);
            rect(width * 0.1, height * 0.1, width * 0.8, height * 0.8, 10); // Rounded rectangle

            // Draw Title
            fill(255); textSize(24); textAlign(CENTER, TOP);
            text(`Station Market - ${market.systemType || 'Unknown Type'}`, width / 2, height * 0.1 + 20);

            // Draw Player Info
            textSize(16); textAlign(LEFT, TOP);
            text(`Credits: ${player.credits}`, width * 0.1 + 30, height * 0.1 + 60);
            text(`Cargo: ${player.getCargoAmount()} / ${player.cargoCapacity}`, width * 0.1 + 30, height * 0.1 + 85);

            // Define Market Table Layout
            let startY = height * 0.1 + 130;
            let tableWidth = width * 0.8 - 60;
            let numCols = 6;
            let colWidth = tableWidth / numCols;
            let startX = width * 0.1 + 30;

            // Draw Market Table Headers
            textAlign(CENTER, CENTER); textSize(14); fill(200);
            text("Commodity", startX + colWidth * 0.5, startY);
            text("Buy Price", startX + colWidth * 1.5, startY);
            text("Sell Price", startX + colWidth * 2.5, startY);
            text("In Cargo", startX + colWidth * 3.5, startY);

            // Draw Market Table Rows & Buttons
            startY += 30;
            const rowHeight = 30; const btnWidth = colWidth * 0.8; const btnHeight = rowHeight * 0.8;

            commodities.forEach((comm, index) => {
                 if (!comm || typeof comm.name === 'undefined' /* ... other checks ... */) { return; } // Skip invalid data
                let yPos = startY + index * rowHeight; let textY = yPos + rowHeight / 2;
                // Draw Data
                fill(255); textAlign(LEFT, CENTER); text(comm.name, startX + 10, textY);
                textAlign(RIGHT, CENTER); text(comm.buyPrice, startX + colWidth * 2 - 10, textY);
                text(comm.sellPrice, startX + colWidth * 3 - 10, textY);
                text(comm.playerStock, startX + colWidth * 4 - 10, textY);
                // Draw/Define Buy Button
                let buyBtnX = startX + colWidth * 4.1; let buyBtnY = yPos + (rowHeight - btnHeight) / 2;
                fill(0, 150, 0); rect(buyBtnX, buyBtnY, btnWidth, btnHeight, 3);
                fill(255); textAlign(CENTER, CENTER); text("Buy 1", buyBtnX + btnWidth / 2, buyBtnY + btnHeight / 2);
                this.marketButtonAreas.push({ x: buyBtnX, y: buyBtnY, w: btnWidth, h: btnHeight, action: 'buy', commodity: comm.name });
                // Draw/Define Sell Button
                let sellBtnX = startX + colWidth * 5.1; let sellBtnY = yPos + (rowHeight - btnHeight) / 2;
                fill(150, 0, 0); rect(sellBtnX, sellBtnY, btnWidth, btnHeight, 3);
                fill(255); textAlign(CENTER, CENTER); text("Sell 1", sellBtnX + btnWidth / 2, sellBtnY + btnHeight / 2);
                this.marketButtonAreas.push({ x: sellBtnX, y: sellBtnY, w: btnWidth, h: btnHeight, action: 'sell', commodity: comm.name });
            });

            // Draw and Define UNDOCK Button
            let undockBtnW = 120; let undockBtnH = 40;
            let undockBtnX = width / 2 - undockBtnW / 2;
            let undockBtnY = height * 0.9 - undockBtnH - 20;
            fill(180, 180, 0); rect(undockBtnX, undockBtnY, undockBtnW, undockBtnH, 5);
            fill(0); textSize(18); textAlign(CENTER, CENTER); text("UNDOCK", undockBtnX + undockBtnW / 2, undockBtnY + undockBtnH / 2);
            this.undockButtonArea = { x: undockBtnX, y: undockBtnY, w: undockBtnW, h: undockBtnH }; // Store area

            pop(); // Restore drawing styles
            console.log("Finished drawing Docked Screen successfully."); // Log success

        } catch (error) {
            console.error("### ERROR occurred within drawDockedScreen ###", error);
            // Attempt to draw an error message on screen
             push(); fill(255,0,0); textSize(18); textAlign(CENTER,CENTER);
             text("Error drawing docked UI!\nCheck console.", width/2, height/2); pop();
             // Ensure pop() is called if push() succeeded
             if(typeof pop === 'function') pop(); // Basic check
        }
    } // ----- END drawDockedScreen -----

    // Draws the Galaxy Map screen
    drawGalaxyMap(galaxy, player) {
        console.log("Attempting to draw Galaxy Map..."); // Log entry

        // Validate input objects
        if (!galaxy || typeof galaxy.getSystemDataForMap !== 'function' || typeof galaxy.getReachableSystems !== 'function') {
             console.error("UIManager.drawGalaxyMap called without valid galaxy object.");
             push(); fill(255,0,0); textSize(18); textAlign(CENTER,CENTER);
             text("Error rendering galaxy map - Galaxy data missing.", width/2, height/2); pop();
             return;
         }
         if (!player || typeof player.pos === 'undefined') {
             console.error("UIManager.drawGalaxyMap called without valid player object.");
              push(); fill(255,0,0); textSize(18); textAlign(CENTER,CENTER);
             text("Error rendering galaxy map - Player data missing.", width/2, height/2); pop();
             return;
         }

        // Wrap drawing in try-catch
        try {
            this.galaxyMapNodeAreas = []; // Reset node clickable areas
            const systems = galaxy.getSystemDataForMap();
            const reachableIndices = galaxy.getReachableSystems();
            const currentSystemIndex = galaxy.currentSystemIndex;

             if (!Array.isArray(systems) || !Array.isArray(reachableIndices)) {
                 console.error("Invalid data from galaxy methods (systems or reachableIndices not arrays).");
                 return; // Stop drawing if data is bad
             }

            push(); // Isolate map drawing styles
            background(10, 0, 20); // Dark purple background

            // Draw connections
            stroke(100, 80, 150, 150); strokeWeight(1);
            for (let i = 0; i < systems.length; i++) {
                let currentSys = systems[i]; let nextIndex = (i + 1) % systems.length; let nextSys = systems[nextIndex];
                if (currentSys && nextSys && currentSys.x !== undefined && nextSys.x !== undefined) { // Check validity
                    line(currentSys.x, currentSys.y, nextSys.x, nextSys.y);
                }
            }

            // Draw System Nodes
            const nodeRadius = 15;
            systems.forEach((sys, index) => {
                 if (!sys || sys.x === undefined /* ... other checks ... */ ) { return; } // Skip invalid node data
                let isCurrent = (index === currentSystemIndex); let isSelected = (index === this.selectedSystemIndex); let isReachable = reachableIndices.includes(index);
                // Set Fill
                if (isCurrent) fill(0, 255, 0); else if (isSelected) fill(255, 255, 0); else if (sys.visited) fill(150, 150, 200); else fill(80, 80, 100);
                // Set Stroke
                if (isReachable && !isCurrent) { stroke(200, 200, 0); strokeWeight(2); } else { stroke(200); strokeWeight(1); }
                // Draw Node and store area
                ellipse(sys.x, sys.y, nodeRadius * 2, nodeRadius * 2);
                this.galaxyMapNodeAreas.push({ x: sys.x, y: sys.y, radius: nodeRadius, index: index });
                // Draw Labels
                fill(255); noStroke(); textAlign(CENTER, TOP); textSize(12); text(sys.name, sys.x, sys.y + nodeRadius + 5);
                textSize(10); if (sys.visited || isCurrent) text(`(${sys.type})`, sys.x, sys.y + nodeRadius + 20); else text(`(Unknown)`, sys.x, sys.y + nodeRadius + 20);
            });

            // Draw and Define JUMP Button
            if (this.selectedSystemIndex !== -1 && this.selectedSystemIndex !== currentSystemIndex && reachableIndices.includes(this.selectedSystemIndex)) {
                let jumpBtnW = 150; let jumpBtnH = 40; let jumpBtnX = width / 2 - jumpBtnW / 2; let jumpBtnY = height - jumpBtnH - 20;
                fill(0, 180, 255); rect(jumpBtnX, jumpBtnY, jumpBtnW, jumpBtnH, 5);
                fill(0); textSize(18); textAlign(CENTER, CENTER); text(`Jump to Selection`, jumpBtnX + jumpBtnW / 2, jumpBtnY + jumpBtnH / 2);
                this.jumpButtonArea = { x: jumpBtnX, y: jumpBtnY, w: jumpBtnW, h: jumpBtnH };
            } else { this.jumpButtonArea = { x: 0, y: 0, w: 0, h: 0 }; } // Reset inactive area

            // Draw Instruction Text
            fill(200); textAlign(CENTER, BOTTOM); textSize(14);
            text("Click a reachable system (yellow outline) to select, then click JUMP.", width / 2, height - 70);
            text("Press 'M' or 'ESC' to return to flight.", width / 2, height - 5);

            pop(); // Restore drawing styles
             console.log("Finished drawing Galaxy Map successfully."); // Log success

        } catch (error) {
            console.error("### ERROR occurred within drawGalaxyMap ###", error);
             push(); fill(255,0,0); textSize(18); textAlign(CENTER,CENTER);
             text("Error drawing galaxy map!\nCheck console.", width/2, height/2); pop();
              if(typeof pop === 'function') pop(); // Ensure pop if push happened
        }
    } // End drawGalaxyMap

    // Draws the Game Over overlay screen
    drawGameOverScreen() {
        push();
        fill(0, 0, 0, 150); rect(0, 0, width, height); // Dark overlay
        fill(255, 0, 0); textSize(48); textAlign(CENTER, CENTER); text("GAME OVER", width / 2, height / 2 - 30); // Red text
        fill(255); textSize(20); text("Click to Restart", width/2, height / 2 + 30); // White text
        pop();
    }

    // Draws the Minimap overlay
    drawMinimap(player, system) {
        // Safety checks
        if (!player || !player.pos || !system || !Array.isArray(system.planets)) {
            return;
        }

        // --- Calculate Minimap Position (Bottom Right) ---
        this.minimapX = width - this.minimapSize - this.minimapMargin;
        this.minimapY = height - this.minimapSize - this.minimapMargin; // Position based on height
        // -------------------------------------------------

        // Calculate scaling factor: pixels per world unit
        this.minimapScale = this.minimapSize / this.minimapWorldViewRange;

        // Center of the minimap rectangle on screen
        let mapCenterX = this.minimapX + this.minimapSize / 2;
        let mapCenterY = this.minimapY + this.minimapSize / 2;

        push(); // Isolate minimap drawing styles

        // Draw minimap background/border
        fill(0, 0, 0, 180); // Semi-transparent black background
        stroke(0, 200, 0, 200); // Green border
        strokeWeight(1);
        rect(this.minimapX, this.minimapY, this.minimapSize, this.minimapSize);

        // --- Map World Objects to Minimap Coordinates ---
        // Player is ALWAYS at the center of the minimap visual area
        fill(255); // White for player
        noStroke();
        ellipse(mapCenterX, mapCenterY, 5, 5); // Draw player dot

        // Map and draw the station
        if (system.station && system.station.pos) {
            let relX = system.station.pos.x - player.pos.x; // Station position relative to player
            let relY = system.station.pos.y - player.pos.y;
            // Convert relative world coords to minimap screen coords
            let mapX = mapCenterX + relX * this.minimapScale;
            let mapY = mapCenterY + relY * this.minimapScale;

            // Clamp coordinates to stay within minimap bounds (optional but cleaner)
            mapX = constrain(mapX, this.minimapX, this.minimapX + this.minimapSize);
            mapY = constrain(mapY, this.minimapY, this.minimapY + this.minimapSize);

            fill(0, 0, 255); // Blue for station
            rect(mapX - 3, mapY - 3, 6, 6); // Draw station square at mapped coords
        }

        // Map and draw planets
        fill(150, 100, 50); // Brownish for planets
        system.planets.forEach(planet => {
            if (!planet || !planet.pos) return; // Skip invalid planets
            let relX = planet.pos.x - player.pos.x;
            let relY = planet.pos.y - player.pos.y;
            let mapX = mapCenterX + relX * this.minimapScale;
            let mapY = mapCenterY + relY * this.minimapScale;

            // Only draw if within view range (or clamp like station)
            if (mapX >= this.minimapX && mapX <= this.minimapX + this.minimapSize &&
                mapY >= this.minimapY && mapY <= this.minimapY + this.minimapSize)
            {
                 ellipse(mapX, mapY, 4, 4); // Draw planet dot
            }
        });

         // Optional: Draw Enemies (can get cluttered)
         fill(255, 0, 0); // Red for enemies
         system.enemies.forEach(enemy => {
             if (!enemy || !enemy.pos) return;
             let relX = enemy.pos.x - player.pos.x;
             let relY = enemy.pos.y - player.pos.y;
             let mapX = mapCenterX + relX * this.minimapScale;
             let mapY = mapCenterY + relY * this.minimapScale;
             // Clamp or check bounds
             if (mapX >= this.minimapX + 2 && mapX <= this.minimapX + this.minimapSize - 2 &&
                 mapY >= this.minimapY + 2 && mapY <= this.minimapY + this.minimapSize - 2)
             {
                  triangle(mapX, mapY - 3, mapX - 2, mapY + 2, mapX + 2, mapY + 2); // Small triangle
             }
         });

        // Optional: Draw Asteroids (likely too much clutter)
        // fill(120); system.asteroids.forEach(a => { /* ... mapping & drawing ... */});


        pop(); // Restore drawing state
    } // End drawMinimap


    // Handles mouse clicks, checks against UI elements based on game state
    handleMouseClicks(mx, my, currentState, player, market, galaxy) {
        // Log entry point and state for debugging
        console.log(`handleMouseClicks called. State: ${currentState}, Click Coords: (${floor(mx)}, ${floor(my)})`);

        // --- DOCKED State Click Handling ---
        if (currentState === "DOCKED") {
            console.log("State is DOCKED. Checking buttons...");
            console.log("Checking Undock Button. Area:", this.undockButtonArea); // Log area
            // Check Undock Button
            if (mx > this.undockButtonArea.x && mx < this.undockButtonArea.x + this.undockButtonArea.w && my > this.undockButtonArea.y && my < this.undockButtonArea.y + this.undockButtonArea.h) {
                console.log(">>> Click IS inside Undock button area!");
                console.log("Attempting to set state to IN_FLIGHT...");
                if (gameStateManager) { gameStateManager.setState("IN_FLIGHT"); console.log("State change to IN_FLIGHT requested."); }
                else { console.error("CRITICAL: gameStateManager not accessible in UIManager!"); }
                return true; // Click handled
            } else { console.log("Click was OUTSIDE Undock button area."); }
            // Check Market Buttons
            for (const btn of this.marketButtonAreas) {
                if (mx > btn.x && mx < btn.x + btn.w && my > btn.y && my < btn.y + btn.h) {
                    console.log(`Market button clicked: ${btn.action} ${btn.commodity}`);
                    if (market && player) {
                        if (btn.action === 'buy') market.buy(btn.commodity, 1, player);
                        else if (btn.action === 'sell') market.sell(btn.commodity, 1, player);
                    } else { console.warn("Market or Player object not available for transaction."); }
                    return true; // Click handled
                }
            }
            console.log("Click in DOCKED state did not hit Undock or Market buttons.");
            return false; // Indicate click wasn't handled in this state if no button hit
        }
        // --- GALAXY_MAP State Click Handling ---
        else if (currentState === "GALAXY_MAP") {
            console.log(">>> Entered GALAXY_MAP click handling block <<<");
            // Check JUMP Button first
            if (this.jumpButtonArea.w > 0 && mx > this.jumpButtonArea.x && mx < this.jumpButtonArea.x + this.jumpButtonArea.w && my > this.jumpButtonArea.y && my < this.jumpButtonArea.y + this.jumpButtonArea.h) {
                console.log("Jump button clicked");
                if (this.selectedSystemIndex !== -1) {
                    if (gameStateManager) gameStateManager.startJump(this.selectedSystemIndex);
                    this.selectedSystemIndex = -1;
                }
                return true; // Click handled
            }
            // Check clicks on Star System Nodes
            console.log(`Checking ${this.galaxyMapNodeAreas.length} system nodes...`);
            for (const node of this.galaxyMapNodeAreas) {
                if (!node) continue;
                let d = dist(mx, my, node.x, node.y);
                console.log(`Node ${node.index}: Dist = ${d.toFixed(1)}, Radius = ${node.radius}`); // Log distance check
                if (d < node.radius) { // Check if click is within radius
                    console.log(`>>> Click IS inside node ${node.index} area! <<<`);
                    const reachable = galaxy ? galaxy.getReachableSystems() : [];
                    const currentIdx = galaxy ? galaxy.currentSystemIndex : -1;
                    if (node.index !== currentIdx && reachable.includes(node.index)) {
                        this.selectedSystemIndex = node.index;
                        console.log(`Selected target system index: ${node.index}`);
                    } else if (node.index === currentIdx) {
                         this.selectedSystemIndex = -1; console.log(`Clicked on current system, deselecting target.`);
                    } else { console.log(`System index ${node.index} is not reachable.`); }
                    return true; // Click handled by hitting a node
                }
            }
            console.log("Finished checking nodes, click was outside all node areas.");
            return false; // Click wasn't on jump button or a node
        }
        // --- GAME_OVER State Click Handling ---
        else if (currentState === "GAME_OVER") {
            console.log("Click detected in GAME_OVER state. Restarting game...");
            window.location.reload();
            return true; // Click handled
        }

        // Default: Click not handled by any specific state logic above
        // console.log(`Click at (${floor(mx)}, ${floor(my)}) was not processed by UI in state ${currentState}.`);
        return false; // Indicate click was not handled by this UI manager
    } // End handleMouseClicks

} // End of UIManager Class