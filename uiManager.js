// ****** uiManager.js ******

class UIManager {
    constructor() {
        // --- Areas for clickable UI elements ---
        this.marketButtonAreas = []; // { x, y, w, h, action, commodity }
        this.galaxyMapNodeAreas = [];// { x, y, radius, index }
        this.jumpButtonArea = {};    // { x, y, w, h }
        this.stationMenuButtonAreas = []; // { x, y, w, h, action, state, text }
        this.missionListButtonAreas = []; // { x, y, w, h, index }
        this.missionDetailButtonAreas = {};// { accept?, back?, complete?, abandon? } each holds { x, y, w, h }
        this.marketBackButtonArea = {}; // { x, y, w, h }
        this.shipyardListAreas = []; // Placeholder
        this.shipyardDetailButtons = {}; // Placeholder
        this.upgradeListAreas = []; // Placeholder
        this.upgradeDetailButtons = {}; // Placeholder

        // --- UI State ---
        this.selectedSystemIndex = -1; // Tracks selected system on Galaxy Map (-1 for none)

        // --- Minimap Properties ---
        this.minimapSize = 150; // Size of the square minimap in pixels
        this.minimapMargin = 15; // Margin from screen edges
        this.minimapX = 0; // Calculated in drawMinimap
        this.minimapY = 0; // Calculated in drawMinimap (now bottom right)
        this.minimapWorldViewRange = 5000; // World units shown across minimap width/height
        this.minimapScale = 1; // Calculated pixels per world unit

        // --- Shipyard Scroll Properties ---
        this.shipyardScrollOffset = 0;
        this.shipyardScrollMax = 0;

        this.setPanelDefaults();
    }

    /** Sets standardized panel geometry for all station menus */
    setPanelDefaults() {
        this.panelX = () => width * 0.1;
        this.panelY = () => height * 0.1;
        this.panelW = () => width * 0.8;
        this.panelH = () => height * 0.8;
    }

    /** Returns standardized panel geometry */
    getPanelRect() {
        return {
            x: this.panelX(),
            y: this.panelY(),
            w: this.panelW(),
            h: this.panelH()
        };
    }

    /** Draws a standardized panel background */
    drawPanelBG(fillCol, strokeCol) {
        const {x, y, w, h} = this.getPanelRect();
        fill(...fillCol); stroke(...strokeCol); rect(x, y, w, h, 10);
    }

    /** Draws the Heads-Up Display (HUD) during flight */
    drawHUD(player) {
        if (!player) { console.warn("drawHUD: Player object missing"); return; }
        const csName = player.currentSystem?.name || 'N/A'; const cargoAmt = player.getCargoAmount() ?? 0;
        const cargoCap = player.cargoCapacity ?? 0; const hull = player.hull ?? 0; const maxHull = player.maxHull || 1;
        const credits = player.credits ?? 0;
        push(); fill(0, 180, 0, 150); noStroke(); rect(0, 0, width, 40);
        fill(255); textSize(14); textAlign(LEFT, CENTER); text(`System: ${csName}`, 10, 20);
        textAlign(RIGHT, CENTER); text(`Hull: ${floor(hull)}/${maxHull}`, width-150, 20); text(`Credits: ${credits}`, width-280, 20); text(`Cargo: ${cargoAmt}/${cargoCap}`, width-10, 20);
        if (player.fireCooldown > 0 && player.fireRate > 0) { let c = constrain(map(player.fireCooldown,player.fireRate,0,0,1),0,1); fill(255,0,0,150); rect(width/2-50, 30, 100*c, 5); }
        // Display active mission title directly from player object
        if (player.activeMission?.title) {
             fill(255, 180, 0); textAlign(CENTER, CENTER); textSize(12);
             text(`Mission: ${player.activeMission.title}`, width / 2, 15);
        }
        if (player.currentWeapon) {
            fill(0, 180, 255); textAlign(LEFT, CENTER); textSize(12);
            text(`Weapon: ${player.currentWeapon.name}`, 10, 35);
        }
        pop();
    }

    /** Draws the Main Station Menu (when state is DOCKED) */
    drawStationMainMenu(station, player) {
        if (!station || !player) { console.warn("drawStationMainMenu missing station or player"); return; }
        this.stationMenuButtonAreas = [];
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([20,20,50,220], [100,100,255]);
        fill(255); textSize(24); textAlign(CENTER,TOP);
        text(`Welcome to ${station.name || 'Station'}`, pX+pW/2, pY+20);

        // System type and law level as before...
        let system = galaxy?.getCurrentSystem();
        let econ = system?.economyType || station.market.systemType || "Unknown";
        let law = system?.securityLevel || "Unknown";
        textSize(16); textAlign(CENTER,TOP);
        text(`System Type: ${econ}   |   Law Level: ${law}`, pX+pW/2, pY+55);

        let btnW=pW*0.6, btnH=45, btnX=pX+pW/2-btnW/2, btnSY=pY+80, btnSp=btnH+15;
        const menuOpts = [
            { text: "Commodity Market", state: "VIEWING_MARKET" },
            { text: "Mission Board", state: "VIEWING_MISSIONS" },
            { text: "Shipyard", state: "VIEWING_SHIPYARD" },           // NEW
            { text: "Upgrades", state: "VIEWING_UPGRADES" },           // NEW
            { text: "Undock", action: "UNDOCK" }
        ];
        menuOpts.forEach((opt, i) => {
            let btnY=btnSY+i*btnSp;
            fill(50,50,90); stroke(150,150,200); rect(btnX,btnY,btnW,btnH,5);
            fill(220); textSize(18); textAlign(CENTER,CENTER); noStroke();
            text(opt.text, btnX+btnW/2, btnY+btnH/2);
            let d={x:btnX,y:btnY,w:btnW,h:btnH,text:opt.text};
            if(opt.state) d.state=opt.state;
            if(opt.action) d.action=opt.action;
            this.stationMenuButtonAreas.push(d);
        });
        pop();
    } // --- End drawStationMainMenu ---

    /** Draws the Commodity Market screen (when state is VIEWING_MARKET) */
    drawMarketScreen(market, player) {
        if (!market || !player || typeof market.getPrices !== 'function') { /* Draw error */ return; }
        market.updatePlayerCargo(player.cargo); const commodities = market.getPrices();
        this.marketButtonAreas = []; this.marketBackButtonArea = {}; // Clear areas
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([50,20,20,220], [255,100,100]);
        fill(255); textSize(24); textAlign(CENTER,TOP); text(`Commodity Market - ${market.systemType || 'Unknown'}`, pX+pW/2, pY+20); // Title
        textSize(16); textAlign(LEFT,TOP); text(`Credits: ${player.credits}`, pX+30, pY+60); text(`Cargo: ${player.getCargoAmount()}/${player.cargoCapacity}`, pX+30, pY+85); // Player Info
        let sY=pY+130, tW=pW-60, cols=6, cW=tW/cols, sX=pX+30; textAlign(CENTER,CENTER); textSize(14); fill(200); // Headers
        text("Commodity", sX+cW*0.5, sY); text("Buy", sX+cW*1.5, sY); text("Sell", sX+cW*2.5, sY); text("Held", sX+cW*3.5, sY);
        sY+=30; const rowH=30, btnW=cW*0.8, btnH=rowH*0.8; // Rows
        (commodities || []).forEach((comm, i) => { if (!comm) return; let yP=sY+i*rowH, tY=yP+rowH/2; fill(255); textAlign(LEFT,CENTER); text(comm.name||'?', sX+10, tY, cW-15); textAlign(RIGHT,CENTER); text(comm.buyPrice??'?', sX+cW*2-10, tY); text(comm.sellPrice??'?', sX+cW*3-10, tY); text(comm.playerStock??'?', sX+cW*4-10, tY); let buyX=sX+cW*4.1, buyY=yP+(rowH-btnH)/2; fill(0,150,0); rect(buyX,buyY,btnW,btnH,3); fill(255); textAlign(CENTER,CENTER); textSize(12); text("Buy 1", buyX+btnW/2, buyY+btnH/2); this.marketButtonAreas.push({x:buyX,y:buyY,w:btnW,h:btnH,action:'buy',commodity:comm.name}); let sellX=sX+cW*5.1, sellY=yP+(rowH-btnH)/2; fill(150,0,0); rect(sellX,sellY,btnW,btnH,3); fill(255); textAlign(CENTER,CENTER); textSize(12); text("Sell 1", sellX+btnW/2, sellY+btnH/2); this.marketButtonAreas.push({x:sellX,y:sellY,w:btnW,h:btnH,action:'sell',commodity:comm.name}); });
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15; fill(180,180,0); stroke(220,220,100); rect(backX,backY,backW,backH,5); fill(0); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Back", backX+backW/2, backY+backH/2); this.marketBackButtonArea = {x:backX, y:backY, w:backW, h:backH}; // Back Button
        pop();
    } // --- End drawMarketScreen ---

    /** Draws the Mission Board screen (when state is VIEWING_MISSIONS) */
    drawMissionBoard(missions, selectedIndex, player) {
        //console.log("[MissionBoard] missions:", missions, "selectedIndex:", selectedIndex, "player.activeMission:", player?.activeMission);
         if (!player) { console.warn("drawMissionBoard missing player"); return; }
         this.missionListButtonAreas = []; this.missionDetailButtonAreas = {}; // Clear areas

         // --- Get Context ---
         const currentSystem = galaxy?.getCurrentSystem();
         const currentStation = currentSystem?.station;
         const activeMission = player.activeMission; // Get the active mission directly
         const selectedMissionFromList = (selectedIndex >= 0 && selectedIndex < missions?.length) ? missions[selectedIndex] : null;

         // Determine which mission's details to display in the right panel
         let missionToShowDetails = null;
         if (activeMission) {
             missionToShowDetails = activeMission; // Always prioritize showing the active mission
         } else if (selectedMissionFromList) {
             missionToShowDetails = selectedMissionFromList; // Show selected available mission if no active one
         }
         // --- End Context ---

         const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
         push(); // Isolate drawing
         this.drawPanelBG([20,50,20,220], [100,255,100]);
         fill(255); textSize(24); textAlign(CENTER,TOP); text("Station Mission Board", pX+pW/2, pY+20);
         // --- Layout ---
         let listW = pW*0.4, detailX = pX+listW+10, detailW = pW-listW-20; let cY = pY+60, cH = pH-110;
         let btnDetailW = 120; let btnDetailH = 30; let btnDetailY = pY + pH - btnDetailH - 15; // Button layout constants


         // --- List Section (always shows available missions) ---
         fill(0,0,0,100); noStroke(); rect(pX+5, cY, listW-10, cH); // List BG
         let listSY = cY+10, entryH=35, spacing=5;
         if (!Array.isArray(missions) || missions.length === 0) { /* Draw "No missions" */ fill(180); textSize(14); textAlign(CENTER,CENTER); text("No missions available.", pX+listW/2, cY+cH/2); }
         else {
             missions.forEach((m, i) => {
                 if (!m?.getSummary) return;
                 let mY=listSY+i*(entryH+spacing);
                 if(mY+entryH > cY+cH) return; // Don't draw off panel

                 // Highlight based on selectedIndex, REGARDLESS of what's in detail panel
                 if(i === selectedIndex) {
                      fill(80,100,80,200);stroke(150,255,150);strokeWeight(1);
                 } else {
                      fill(40,60,40,180); noStroke();
                 }
                 rect(pX+10, mY, listW-20, entryH, 3);

                 // Dim text if this mission is the active one (can't select it again)
                 if (activeMission && activeMission.id === m.id) {
                     fill(150); // Greyed out text
                 } else {
                     fill(220); // Normal text color
                 }
                 textSize(12); textAlign(LEFT,CENTER); noStroke();
                 text(m.getSummary(), pX+20, mY+entryH/2, listW-40);
                 // Store clickable area for list item (used for highlighting)
                 this.missionListButtonAreas.push({x:pX+10,y:mY,w:listW-20,h:entryH,index:i});
             });
         }
         // --- End List Section ---


         // --- Detail Section ---
         fill(0,0,0,100); noStroke(); rect(detailX, cY, detailW-5, cH); // Detail BG

         if (missionToShowDetails) { // If we determined a mission to show details for...
             // Draw the mission text details
             fill(230); textSize(14); textAlign(LEFT,TOP); textLeading(18); text(missionToShowDetails.getDetails() || "Error: No details.", detailX+15, cY+15, detailW-30);

             // --- Determine Detail Buttons ---
             let actionBtnX = detailX + detailW / 2 - btnDetailW - 10; // Position for Accept/Complete/Abandon
             let backBtnX = detailX + detailW / 2 + 10;                 // Position for Back
             this.missionDetailButtonAreas = { 'back': { x: backBtnX, y: btnDetailY, w: btnDetailW, h: btnDetailH }}; // Back button always available when details shown

             if (activeMission && missionToShowDetails.id === activeMission.id) {
                 // --- The mission shown IS the Player's ACTIVE Mission ---
                 let canCompleteHere = false;
                 // Check delivery completion conditions
                 if ((activeMission.type === MISSION_TYPE.DELIVERY_LEGAL || activeMission.type === MISSION_TYPE.DELIVERY_ILLEGAL) &&
                     currentSystem && currentStation && activeMission.destinationSystem === currentSystem.name &&
                     activeMission.destinationStation === currentStation.name &&
                     player.hasCargo(activeMission.cargoType, activeMission.cargoQuantity))
                 { canCompleteHere = true; }
                 // Add other station-based completion checks here (e.g., bounty turn-in if required)

                 // Show Complete or Abandon
                 if (canCompleteHere) {
                     fill(0, 200, 50); stroke(150, 255, 150); rect(actionBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
                     fill(255); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Complete", actionBtnX+btnDetailW/2, btnDetailY+btnDetailH/2);
                     this.missionDetailButtonAreas['complete'] = { x: actionBtnX, y: btnDetailY, w: btnDetailW, h: btnDetailH };
                 } else {
                     fill(200, 50, 50); stroke(255, 150, 150); rect(actionBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
                     fill(255); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Abandon", actionBtnX+btnDetailW/2, btnDetailY+btnDetailH/2);
                     this.missionDetailButtonAreas['abandon'] = { x: actionBtnX, y: btnDetailY, w: btnDetailW, h: btnDetailH };
                 }

             } else if (!activeMission && missionToShowDetails) {
                 // --- The mission shown is AVAILABLE (and player has no active mission) ---
                 fill(0, 180, 0); stroke(150, 255, 150); rect(actionBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
                 fill(255); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Accept", actionBtnX+btnDetailW/2, btnDetailY+btnDetailH/2);
                 this.missionDetailButtonAreas['accept'] = { x: actionBtnX, y: btnDetailY, w: btnDetailW, h: btnDetailH };
             } else {
                 // --- Catch-all / Edge case: Active mission exists, but we are showing details for a *different* mission (selected from list)
                 // Or, somehow missionToShowDetails is set but doesn't fit the above.
                 // In this scenario, we shouldn't allow accepting. Show "Unavailable".
                 fill(50, 100, 50); stroke(100, 150, 100); rect(actionBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
                 fill(150); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Unavailable", actionBtnX+btnDetailW/2, btnDetailY+btnDetailH/2);
                 this.missionDetailButtonAreas['accept'] = null; // Ensure accept is not clickable
                 this.missionDetailButtonAreas['complete'] = null;
                 this.missionDetailButtonAreas['abandon'] = null;
             }

             // Draw Back button (common if any details are shown)
             fill(180,0,0); stroke(255,150,150); rect(backBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
             fill(255); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Back", backBtnX + btnDetailW/2, btnDetailY + btnDetailH/2);
             // Area for 'back' button already stored

         } else { // No mission active AND none selected from the list
             fill(180); textSize(14); textAlign(CENTER, CENTER); text("Select a mission from the list for details.", detailX+(detailW-5)/2, cY+cH/2);
             // Only show a Back button, centered
             let backBtnX = pX + pW / 2 - btnDetailW / 2; // Center the single back button
             fill(180,0,0); stroke(255,150,150); rect(backBtnX, btnDetailY, btnDetailW, btnDetailH, 3);
             fill(255); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Back", backBtnX + btnDetailW/2, btnDetailY + btnDetailH/2);
             // Define button areas: only 'back' is active
             this.missionDetailButtonAreas = { 'back': { x: backBtnX, y: btnDetailY, w: btnDetailW, h: btnDetailH }, 'accept': null, 'complete': null, 'abandon': null };
         }
         // --- End Detail Section Logic ---


         // --- Active Mission Info Bar at the very bottom ---
         // This remains useful as a quick reminder, even if details are shown above
         if (player.activeMission?.title) { fill(0,0,0,180);stroke(255,150,0);strokeWeight(1); let ay=pY+pH+5, ah=30; rect(pX,ay,pW,ah); fill(255,180,0);noStroke();textSize(14);textAlign(LEFT,CENTER); text(`Active: ${player.activeMission.title}`, pX+15, ay+ah/2, pW-30); }

         pop(); // Restore drawing styles
    } // --- END drawMissionBoard ---

    /** Draws the Galaxy Map screen */
    drawGalaxyMap(galaxy, player) {
        if (!galaxy || !player) { console.warn("drawGalaxyMap missing galaxy or player"); return; }

        this.galaxyMapNodeAreas = []; // Clear clickable areas for nodes
        const systems = galaxy.getSystemDataForMap(); // Gets { name, x, y, type, visited, index }
        const currentIdx = galaxy.currentSystemIndex;
        const reachable = galaxy.getReachableSystems(); // Now gets indices based on actual connections

        push(); // Isolate map drawing
        background(10, 0, 20); // Dark space background

        // --- Draw Connections (Lines) ---
        stroke(100, 80, 150, 150); // Connection line color
        strokeWeight(1);
        // Iterate through each system to draw its connections
        for (let i = 0; i < galaxy.systems.length; i++) {
            const systemA = galaxy.systems[i];
            if (!systemA?.galaxyPos || !systemA.connectedSystemIndices) continue; // Skip if invalid

            // Draw lines to connected systems, ensuring each line is drawn only once
            systemA.connectedSystemIndices.forEach(j => {
                // Only draw if the target index 'j' is greater than the current index 'i'
                // This prevents drawing lines twice (A->B and B->A)
                if (j > i) {
                    const systemB = galaxy.systems[j];
                    if (systemB?.galaxyPos) { // Check if target system is valid
                        line(systemA.galaxyPos.x, systemA.galaxyPos.y, systemB.galaxyPos.x, systemB.galaxyPos.y);
                    }
                }
            });
        }
        // --- End Draw Connections ---


        // --- Draw System Nodes ---
        const nodeR = 15; // Radius for clickable area and drawing
        systems.forEach((sysData, i) => { // Use the data from getSystemDataForMap which includes index 'i'
            if (!sysData) return; // Skip if system data is invalid

            let isCurrent = (i === currentIdx);
            let isSelected = (i === this.selectedSystemIndex);
            let isReachable = reachable.includes(i); // Check if this system index is in the reachable list

            // Node Fill Color
            if (isCurrent) fill(0, 255, 0);      // Green for current
            else if (isSelected) fill(255, 255, 0); // Yellow for selected
            else if (sysData.visited) fill(150, 150, 200); // Light Blue/Grey for visited
            else fill(80, 80, 100);           // Dark Grey for unvisited

            // Node Stroke (Outline)
            if (isReachable && !isCurrent) { // Highlight reachable systems (that aren't the current one)
                stroke(200, 200, 0); // Yellow outline
                strokeWeight(2);
            } else {
                stroke(200);        // Default grey outline
                strokeWeight(1);
            }

            // Draw the ellipse
            ellipse(sysData.x, sysData.y, nodeR * 2, nodeR * 2);
            // Store clickable area
            this.galaxyMapNodeAreas.push({ x: sysData.x, y: sysData.y, radius: nodeR, index: i });

            // Draw Text Labels
            fill(255); noStroke(); textAlign(CENTER, TOP); textSize(12);
            text(sysData.name, sysData.x, sysData.y + nodeR + 5);
            textSize(10);
            if (sysData.visited || isCurrent) {
                text(`(${sysData.type})`, sysData.x, sysData.y + nodeR + 20);
                // --- Add security level below type ---
                const secLevel = galaxy.systems[i]?.securityLevel || "Unknown";
                fill(200, 200, 100); // Gold/yellow for visibility
                text(`Law: ${secLevel}`, sysData.x, sysData.y + nodeR + 32);
            } else {
                text(`(Unknown)`, sysData.x, sysData.y + nodeR + 20);
            }
        });
        // --- End Draw System Nodes ---


        // --- Draw Jump Button ---
        // Logic remains the same: Show if a reachable system (not current) is selected
        this.jumpButtonArea = { x: 0, y: 0, w: 0, h: 0 }; // Reset button area
        if (this.selectedSystemIndex !== -1 && this.selectedSystemIndex !== currentIdx && reachable.includes(this.selectedSystemIndex)) {
            let btnW = 150, btnH = 40, btnX = width / 2 - btnW / 2, btnY = height - btnH - 20;
            fill(0, 180, 255); // Blue jump button
            rect(btnX, btnY, btnW, btnH, 5);
            fill(0); textSize(18); textAlign(CENTER, CENTER); noStroke(); // Black text
            text(`Jump`, btnX + btnW / 2, btnY + btnH / 2);
            this.jumpButtonArea = { x: btnX, y: btnY, w: btnW, h: btnH }; // Define clickable area
        }
        // --- End Draw Jump Button ---

        // --- Instructions ---
        fill(200); textAlign(CENTER, BOTTOM); textSize(14);
        text("Click reachable system (yellow outline) to select, then click JUMP.", width / 2, height - 70);
        text("Press 'M' or 'ESC' to return to flight.", width / 2, height - 5);
        // ---

        pop(); // Restore drawing settings
    } // --- End drawGalaxyMap ---

    /** Draws the Game Over overlay screen */
    drawGameOverScreen() {
        push();
        fill(0, 0, 0, 220); // Semi-transparent black overlay
        rect(0, 0, width, height);

        fill(255, 60, 60);
        textAlign(CENTER, CENTER);
        textSize(48);
        text("GAME OVER", width / 2, height / 2 - 40);

        fill(255);
        textSize(22);
        text("Press F5 or reload to restart", width / 2, height / 2 + 20);

        pop();
    } // --- End drawGameOverScreen ---

    drawMinimap(player, system) {
        if (!player?.pos || !system) { return; } // Basic checks

        // --- Calculate Minimap Position and Scale ---
        this.minimapX = width - this.minimapSize - this.minimapMargin;
        this.minimapY = height - this.minimapSize - this.minimapMargin;
        this.minimapScale = this.minimapSize / this.minimapWorldViewRange;
        if (isNaN(this.minimapScale) || this.minimapScale <= 0 || !isFinite(this.minimapScale)) {
            this.minimapScale = 0.01; // Fallback scale
        }

        // --- Calculate Center and Boundaries ---
        let mapCenterX = this.minimapX + this.minimapSize / 2;
        let mapCenterY = this.minimapY + this.minimapSize / 2;
        let mapLeft = this.minimapX;
        let mapRight = this.minimapX + this.minimapSize;
        let mapTop = this.minimapY;
        let mapBottom = this.minimapY + this.minimapSize;
        // ---

        push(); // Isolate drawing settings for the minimap

        // --- Draw Background/Border ---
        try {
            fill(0, 0, 0, 180);
            stroke(0, 200, 0, 200);
            strokeWeight(1);
            rect(this.minimapX, this.minimapY, this.minimapSize, this.minimapSize);
        } catch (e) {
            console.error("Error drawing minimap rect:", e);
            pop(); // Clean up push()
            return; // Don't proceed if background fails
        }
        // ---

        // --- Draw Player (Always at Center) ---
        fill(255); // White
        noStroke();
        ellipse(mapCenterX, mapCenterY, 5, 5); // Small circle for player
        // ---

        // --- Helper function for strict boundary check ---
        // Checks if the *entire* icon, defined by its center (x,y)
        // and its half-width/half-height, fits within the map bounds.
        const isFullyWithinBounds = (x, y, halfWidth, halfHeight) => {
            return (
                x - halfWidth >= mapLeft &&
                x + halfWidth <= mapRight &&
                y - halfHeight >= mapTop &&
                y + halfHeight <= mapBottom
            );
        };
        // ---

        try { // Wrap drawing of other elements
            // --- Map and Draw Station ---
            if (system.station?.pos) {
                let objX = system.station.pos.x;
                let objY = system.station.pos.y;
                let relX = objX - player.pos.x;
                let relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                const iconHalfSize = 3; // Station is 6x6 rect

                // *** Strict Boundary Check ***
                if (isFullyWithinBounds(mapX, mapY, iconHalfSize, iconHalfSize)) {
                    fill(0, 0, 255); // Blue square for station
                    rect(mapX - iconHalfSize, mapY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
                }
            }
            // ---

            // --- Map and Draw Planets ---
            fill(150, 100, 50); // Brownish for planets
            (system.planets || []).forEach(planet => {
                if (!planet?.pos) return;
                let objX = planet.pos.x;
                let objY = planet.pos.y;
                let relX = objX - player.pos.x;
                let relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                const iconRadius = 2; // Planet is 4x4 ellipse

                // *** Strict Boundary Check ***
                if (isFullyWithinBounds(mapX, mapY, iconRadius, iconRadius)) {
                    ellipse(mapX, mapY, iconRadius * 2, iconRadius * 2); // Small dot for planet
                }
            });
            // ---

            // --- Map and Draw Enemies ---
            fill(255, 0, 0); // Red for enemies
            (system.enemies || []).forEach(enemy => {
                if (!enemy?.pos || enemy.isDestroyed()) return;
                let objX = enemy.pos.x;
                let objY = enemy.pos.y;
                let relX = objX - player.pos.x;
                let relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                // Approximate bounding box half-size for the triangle (max extent is ~3 pixels from center)
                const iconHalfExtent = 3;

                // *** Strict Boundary Check ***
                // Use the approximate half-extent for the check
                if (isFullyWithinBounds(mapX, mapY, iconHalfExtent, iconHalfExtent)) {
                    // Draw rotated triangle if fully within bounds
                    push();
                    translate(mapX, mapY);
                    rotate(degrees(enemy.angle) - 90);
                    triangle(0, -iconHalfExtent, -iconHalfExtent*0.8, iconHalfExtent*0.8, iconHalfExtent*0.8, iconHalfExtent*0.8); // Triangle scaled roughly by half-extent
                    pop();
                }
            });
            // ---

        } catch (e) {
            console.error("Error during minimap element drawing:", e);
        } finally {
            pop(); // Restore drawing state from before minimap drawing push()
        }
    } // End drawMinimap
    
    /** Handles mouse clicks for all UI states */
    handleMouseClicks(mx, my, currentState, player, market, galaxy) {
        const currentSystem = galaxy?.getCurrentSystem(); const currentStation = currentSystem?.station;

        // --- DOCKED State (Main Station Menu) ---
        if (currentState === "DOCKED") {
            for (const btn of this.stationMenuButtonAreas) {
                if (this.isClickInArea(mx, my, btn)) {
                    if (btn.action === "UNDOCK") {
                        if(gameStateManager)gameStateManager.setState("IN_FLIGHT");
                        return true;
                    } else if (btn.state === "VIEWING_MARKET" || btn.state === "VIEWING_MISSIONS" ||
                               btn.state === "VIEWING_SHIPYARD" || btn.state === "VIEWING_UPGRADES") {
                        if(gameStateManager)gameStateManager.setState(btn.state);
                        return true;
                    } else if (btn.state) {
                        console.warn(`State ${btn.state} not handled.`);
                        return true;
                    }
                }
            }
            return false;
        }
        // --- VIEWING_MARKET State ---
        else if (currentState === "VIEWING_MARKET") {
             if (this.isClickInArea(mx, my, this.marketBackButtonArea)) { if(gameStateManager)gameStateManager.setState("DOCKED"); return true; }
             for (const btn of this.marketButtonAreas) { if (this.isClickInArea(mx, my, btn)) { if (market&&player) { if(btn.action==='buy')market.buy(btn.commodity,1,player); else if(btn.action==='sell')market.sell(btn.commodity,1,player); } return true; } } return false;
        }
        // --- VIEWING_MISSIONS State ---
        else if (currentState === "VIEWING_MISSIONS") {
            let handled = false;
            const activeMission = player.activeMission; // Get active mission status

            // Handle Detail Buttons FIRST (Complete, Abandon, Accept, Back)
            // These depend on what was DRAWN by drawMissionBoard
            if (this.missionDetailButtonAreas['back'] && this.isClickInArea(mx, my, this.missionDetailButtonAreas['back'])) {
                if(gameStateManager) gameStateManager.setState("DOCKED");
                handled = true;
            }
            else if (this.missionDetailButtonAreas['accept'] && !activeMission && this.isClickInArea(mx, my, this.missionDetailButtonAreas['accept'])) {
                 // Accept logic: find the currently SELECTED mission from the list
                 if (gameStateManager?.selectedMissionIndex !== -1) {
                      let missionToAccept = gameStateManager.currentStationMissions[gameStateManager.selectedMissionIndex];
                      if(missionToAccept && player.acceptMission(missionToAccept)){
                           if(gameStateManager) gameStateManager.setState("DOCKED"); // Go back to main menu after accepting
                      } else {
                           // Accept failed (e.g., no cargo space) - stay on mission board
                      }
                 }
                 handled = true;
            }
            else if (this.missionDetailButtonAreas['complete'] && activeMission && this.isClickInArea(mx, my, this.missionDetailButtonAreas['complete'])) {
                 // Complete logic: attempt to complete the ACTIVE mission
                 if (player && currentSystem && currentStation && player.completeMission(currentSystem, currentStation)) {
                      if(gameStateManager){
                           gameStateManager.fetchStationMissions(player); // Refresh list
                           gameStateManager.selectedMissionIndex = -1; // Deselect list item
                           // Stay on the mission board to see the updated list (or go back to DOCKED?)
                           // Let's stay for now. User can click Back.
                      }
                 }
                 handled = true;
            }
            else if (this.missionDetailButtonAreas['abandon'] && activeMission && this.isClickInArea(mx, my, this.missionDetailButtonAreas['abandon'])) {
                 // Abandon logic: abandon the ACTIVE mission
                 if (confirm("Abandon current mission?")) { // Add confirmation
                      player.abandonMission();
                      if(gameStateManager){
                           gameStateManager.fetchStationMissions(player); // Refresh list
                           gameStateManager.selectedMissionIndex = -1; // Deselect list item
                      }
                 }
                 handled = true;
            }

            // Handle List Clicks (for highlighting) if no detail button was clicked
            if (!handled) {
                for (const btn of this.missionListButtonAreas) {
                    if (this.isClickInArea(mx, my, btn)) {
                        // Always update the selectedIndex for visual highlighting
                        if(gameStateManager) gameStateManager.selectedMissionIndex = btn.index;
                        // Clicking the list doesn't change the *detail view* if an active mission is present
                        // It just updates the highlight
                        handled = true;
                        break;
                    }
                }
            }
            return handled; // Return true if any mission board interaction occurred
        }
        // --- VIEWING_SHIPYARD State ---
        else if (currentState === "VIEWING_SHIPYARD") {
            for (const area of this.shipyardListAreas) {
                if (this.isClickInArea(mx, my, area)) {
                    if (player.credits >= area.price) {
                        player.spendCredits(area.price);
                        player.applyShipDefinition(area.shipTypeKey);
                        saveGame && saveGame();
                        alert(`You bought a ${area.shipName}!`)
                    } else {
                        alert("Not enough credits!");
                    }
                    return true;
                }
            }
            // Back button
            if (this.isClickInArea(mx, my, this.shipyardDetailButtons.back)) {
                gameStateManager.setState("DOCKED");
                return true;
            }
            return false;
        }
        // --- VIEWING_UPGRADES State ---
        else if (currentState === "VIEWING_UPGRADES") {
            for (const area of this.upgradeListAreas) {
                if (this.isClickInArea(mx, my, area)) {
                    if (player.credits >= area.upgrade.price) {
                        player.spendCredits(area.upgrade.price);
                        player.setWeaponByName(area.upgrade.name); // Equip the weapon
                        saveGame && saveGame();
                        alert(`You bought the ${area.upgrade.name}!`);
                    } else {
                        alert("Not enough credits!");
                    }
                    return true;
                }
            }
            // Back button
            if (this.isClickInArea(mx, my, this.upgradeDetailButtons.back)) {
                gameStateManager.setState("DOCKED");
                return true;
            }
            return false;
        }
        // --- GALAXY_MAP State ---
        else if (currentState === "GALAXY_MAP") { return this.handleGalaxyMapClicks(mx, my, galaxy); }
        // --- GAME_OVER State ---
        else if (currentState === "GAME_OVER") { window.location.reload(); return true; }

        return false; // Click not handled by any relevant UI state
    } // End handleMouseClicks

    /** Helper to check if mouse coords are within a button area object {x,y,w,h} */
    isClickInArea(mx, my, area) {
        return area && area.w > 0 && area.h > 0 && mx > area.x && mx < area.x + area.w && my > area.y && my < area.y + area.h;
    }

    /** Helper function specifically for handling clicks on the Galaxy Map */
    handleGalaxyMapClicks(mx, my, galaxy){
        if (!galaxy) return false;
        // Check Jump button first
        if (this.isClickInArea(mx, my, this.jumpButtonArea)) {
            if (this.selectedSystemIndex !== -1 && galaxy.getReachableSystems().includes(this.selectedSystemIndex)) { // Double check reachability
                if (gameStateManager) gameStateManager.startJump(this.selectedSystemIndex);
                this.selectedSystemIndex = -1; // Clear selection after initiating jump
            }
            return true; // Click was on the jump button area
        }
        // Check system nodes
        for (const node of this.galaxyMapNodeAreas) {
            if (!node) continue;
            if (dist(mx, my, node.x, node.y) < node.radius) {
                const reachableSystems = galaxy.getReachableSystems();
                const currentIdx = galaxy.currentSystemIndex;
                // Select if reachable and not current
                if (node.index !== currentIdx && reachableSystems.includes(node.index)) {
                    this.selectedSystemIndex = node.index;
                } else {
                    // Clicking current system or unreachable system clears selection
                    this.selectedSystemIndex = -1;
                }
                return true; // Click was on a node
            }
        }
        // Click was not on jump button or any node
        this.selectedSystemIndex = -1; // Clear selection if clicking empty space
        return false; // Allow click to pass through if needed elsewhere? For now, false.
    } // End handleGalaxyMapClicks

    /** Draws the Shipyard Menu (when state is VIEWING_SHIPYARD) */
    drawShipyardMenu(player) {
        if (!player) return;
        this.shipyardListAreas = [];
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([30,30,60,230], [100,200,255]);
        fill(255); textSize(24); textAlign(CENTER,TOP);
        text("Shipyard", pX+pW/2, pY+20);

        // List all ships from SHIP_DEFINITIONS
        let ships = Object.values(SHIP_DEFINITIONS);
        let rowH = 40, startY = pY+60, visibleRows = floor((pH-120)/rowH);
        let totalRows = ships.length;
        let scrollAreaH = visibleRows * rowH;
        this.shipyardScrollMax = max(0, totalRows - visibleRows);

        // Clamp scroll offset
        this.shipyardScrollOffset = constrain(this.shipyardScrollOffset, 0, this.shipyardScrollMax);

        // Draw visible ships
        let firstRow = this.shipyardScrollOffset;
        let lastRow = min(firstRow + visibleRows, totalRows);
        textSize(16);
        for (let i = firstRow; i < lastRow; i++) {
            let ship = ships[i];
            let y = startY + (i-firstRow)*rowH;
            fill(60,60,100); stroke(120,180,255); rect(pX+20, y, pW-40, rowH-6, 5);
            fill(255); noStroke(); textAlign(LEFT,CENTER);
            let price = ship.price || (ship.baseHull*20+ship.cargoCapacity*10+1000);
            text(`${ship.name}  |  Hull: ${ship.baseHull}  |  Cargo: ${ship.cargoCapacity}  |  Price: ${price}cr`, pX+30, y+rowH/2);
            this.shipyardListAreas.push({
                x: pX+20, y: y, w: pW-40, h: rowH-6,
                shipTypeKey: Object.keys(SHIP_DEFINITIONS)[i], // The actual key
                shipName: ship.name, // Display name
                price
            });
        }

        // Draw scrollbar if needed
        if (this.shipyardScrollMax > 0) {
            let barX = pX + pW - 18, barY = startY, barW = 12, barH = scrollAreaH;
            fill(60,60,100); stroke(120,180,255); rect(barX, barY, barW, barH, 6);
            let handleH = max(30, barH * (visibleRows / totalRows));
            let handleY = barY + (barH-handleH) * (this.shipyardScrollOffset / this.shipyardScrollMax);
            fill(180,180,220); noStroke(); rect(barX+1, handleY, barW-2, handleH, 6);
            // Store for click/drag
            this.shipyardScrollbarArea = {x:barX, y:barY, w:barW, h:barH, handleY, handleH};
        } else {
            this.shipyardScrollbarArea = null;
        }

        // Back button
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15;
        fill(180,180,0); stroke(220,220,100); rect(backX,backY,backW,backH,5);
        fill(0); textSize(16); textAlign(CENTER,CENTER); noStroke();
        text("Back", backX+backW/2, backY+backH/2);
        this.shipyardDetailButtons = {back: {x:backX, y:backY, w:backW, h:backH}};
        pop();
    }

    /** Draws the Upgrades Menu (when state is VIEWING_UPGRADES) */
    drawUpgradesMenu(player) {
        if (!player) return;
        this.upgradeListAreas = [];
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([40,30,60,230], [200,100,255]);
        fill(255); textSize(24); textAlign(CENTER,TOP);
        text("Upgrades", pX+pW/2, pY+20);

        // Use the global WEAPON_UPGRADES array
        const upgrades = WEAPON_UPGRADES;
        let rowH = 38, startY = pY+60;
        let visibleRows = floor((pH-120)/rowH);
        let totalRows = upgrades.length;
        let scrollAreaH = visibleRows * rowH;
        this.upgradeScrollMax = max(0, totalRows - visibleRows);

        // Clamp scroll offset
        if (typeof this.upgradeScrollOffset !== "number") this.upgradeScrollOffset = 0;
        this.upgradeScrollOffset = constrain(this.upgradeScrollOffset, 0, this.upgradeScrollMax);

        // Draw visible upgrades
        let firstRow = this.upgradeScrollOffset;
        let lastRow = min(firstRow + visibleRows, totalRows);
        textSize(15);
        for (let i = firstRow; i < lastRow; i++) {
            let upg = upgrades[i];
            let y = startY + (i-firstRow)*rowH;
            fill(80,60,120); stroke(180,100,255); rect(pX+20, y, pW-40, rowH-6, 5);
            fill(255); noStroke(); textAlign(LEFT,CENTER);
            text(
                `${upg.name}  |  Type: ${upg.type}  |  DPS: ${upg.damage}  |  Price: ${upg.price}cr  |  ${upg.desc}`,
                pX+30, y+rowH/2
            );
            this.upgradeListAreas.push({x:pX+20, y:y, w:pW-40, h:rowH-6, upgrade:upg});
        }

        // Draw scrollbar if needed
        if (this.upgradeScrollMax > 0) {
            let barX = pX + pW - 18, barY = startY, barW = 12, barH = scrollAreaH;
            fill(60,60,100); stroke(180,100,255); rect(barX, barY, barW, barH, 6);
            let handleH = max(30, barH * (visibleRows / totalRows));
            let handleY = barY + (barH-handleH) * (this.upgradeScrollOffset / this.upgradeScrollMax);
            fill(180,180,220); noStroke(); rect(barX+1, handleY, barW-2, handleH, 6);
            // Store for click/drag if you want to implement it
            this.upgradeScrollbarArea = {x:barX, y:barY, w:barW, h:barH, handleY, handleH};
        } else {
            this.upgradeScrollbarArea = null;
        }

        // Back button
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15;
        fill(180,180,0); stroke(220,220,100); rect(backX,backY,backW,backH,5);
        fill(0); textSize(16); textAlign(CENTER,CENTER); noStroke();
        text("Back", backX+backW/2, backY+backH/2);
        this.upgradeDetailButtons = {back: {x:backX, y:backY, w:backW, h:backH}};
        pop();
    }

    /** Handles mouse wheel events for scrolling */
    handleMouseWheel(event, currentState) {
        if (currentState === "VIEWING_SHIPYARD" && this.shipyardScrollMax > 0) {
            this.shipyardScrollOffset += event.deltaY > 0 ? 1 : -1;
            this.shipyardScrollOffset = constrain(this.shipyardScrollOffset, 0, this.shipyardScrollMax);
            return true;
        }
        if (currentState === "VIEWING_UPGRADES" && this.upgradeScrollMax > 0) {
            if (typeof this.upgradeScrollOffset !== "number") this.upgradeScrollOffset = 0;
            this.upgradeScrollOffset += event.deltaY > 0 ? 1 : -1;
            this.upgradeScrollOffset = constrain(this.upgradeScrollOffset, 0, this.upgradeScrollMax);
            return true;
        }
        return false;
    }

} // End of UIManager Class