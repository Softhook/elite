// ****** uiManager.js ******

class UIManager {
    constructor() {
        // --- Areas for clickable UI elements ---
        // These are updated dynamically when the relevant screen is drawn
        this.marketButtonAreas = []; // For commodity market buttons { x, y, w, h, action, commodity }
        this.undockButtonArea = {};  // Main Undock { x, y, w, h } (Set in drawStationMainMenu) - Not strictly needed if handled via menuButtons
        this.galaxyMapNodeAreas = [];// System nodes { x, y, radius, index }
        this.jumpButtonArea = {};    // Jump button { x, y, w, h }
        this.stationMenuButtonAreas = []; // Main station menu { x, y, w, h, action, state, text }
        this.missionListButtonAreas = []; // Mission list items { x, y, w, h, index }
        this.missionDetailButtonAreas = {};// Mission details { accept: {area}, back: {area} }
        this.marketBackButtonArea = {}; // Back button for market { x, y, w, h }
        // Shipyard areas needed later
        this.shipyardListAreas = [];
        this.shipyardDetailButtons = {};

        // --- UI State ---
        // selectedMissionIndex handled by GameStateManager now
        this.selectedSystemIndex = -1; // Tracks selected system on Galaxy Map

        // --- Minimap Properties ---
        this.minimapSize = 150; // Size of the square minimap in pixels
        this.minimapMargin = 15; // Margin from screen edges
        this.minimapX = 0; // Calculated in drawMinimap
        this.minimapY = 0; // Calculated in drawMinimap (now bottom right)
        this.minimapWorldViewRange = 5000; // World units shown across minimap width/height
        this.minimapScale = 1; // Calculated pixels per world unit
    }

    /** Draws the Heads-Up Display (HUD) during flight */
    drawHUD(player) {
        if (!player) return;
        // Safely access properties with defaults
        const csName = player.currentSystem?.name || 'N/A';
        const cargoAmt = player.getCargoAmount() ?? 0;
        const cargoCap = player.cargoCapacity ?? 0;
        const hull = player.hull ?? 0; const maxHull = player.maxHull || 1;
        const credits = player.credits ?? 0;

        push(); // Isolate HUD drawing styles
        // Draw background bar
        fill(0, 180, 0, 150); noStroke(); rect(0, 0, width, 40);
        // Draw text elements
        fill(255); textSize(14);
        textAlign(LEFT, CENTER); text(`System: ${csName}`, 10, 20);
        textAlign(RIGHT, CENTER); text(`Hull: ${floor(hull)}/${maxHull}`, width-150, 20); text(`Credits: ${credits}`, width-280, 20); text(`Cargo: ${cargoAmt}/${cargoCap}`, width-10, 20);
        // Draw weapon cooldown bar
        if (player.fireCooldown > 0 && player.fireRate > 0) { let c = constrain(map(player.fireCooldown,player.fireRate,0,0,1),0,1); fill(255,0,0,150); rect(width/2-50, 30, 100*c, 5); }
        // Draw active mission title if one exists
        if (player.activeMission?.title) { fill(255, 180, 0); textAlign(CENTER, CENTER); textSize(12); text(`Mission: ${player.activeMission.title}`, width / 2, 15); }
        pop(); // Restore previous drawing styles
    }

    /** Draws the Main Station Menu (when state is DOCKED) */
    drawStationMainMenu(station, player) {
         if (!station || !player) { console.warn("drawStationMainMenu missing station or player"); return; }
         this.stationMenuButtonAreas = []; // Clear old button definitions
         this.undockButtonArea = {}; // Clear undock button ref

         push();
         // Panel Background
         let pX = width*0.2, pY = height*0.2, pW = width*0.6, pH = height*0.6;
         fill(20, 20, 50, 220); stroke(100, 100, 255); rect(pX, pY, pW, pH, 10);
         // Title
         fill(255); textSize(24); textAlign(CENTER, TOP); text(`Welcome to ${station.name || 'Station'}`, pX + pW / 2, pY + 20);
         // --- Menu Buttons ---
         let btnW = pW * 0.6, btnH = 45, btnX = pX + pW / 2 - btnW / 2;
         let btnStartY = pY + 80, btnSpacing = btnH + 15;
         const menuOptions = [
             { text: "Commodity Market", state: "VIEWING_MARKET" }, // Link to market state
             { text: "Mission Board", state: "VIEWING_MISSIONS" },
             // { text: "Shipyard / Outfitting", state: "VIEWING_SHIPYARD" }, // Placeholder
             // { text: "Refuel / Repair", state: "VIEWING_SERVICES" }, // Placeholder
             { text: "Undock", action: "UNDOCK" } // Direct action
         ];
         menuOptions.forEach((opt, index) => {
             let btnY = btnStartY + index * btnSpacing;
             fill(50, 50, 90); stroke(150, 150, 200); rect(btnX, btnY, btnW, btnH, 5); // Draw button
             fill(220); textSize(18); textAlign(CENTER, CENTER); noStroke(); text(opt.text, btnX + btnW / 2, btnY + btnH / 2); // Draw text
             // Store area and associated action/state
             let btnData = { x: btnX, y: btnY, w: btnW, h: btnH, text: opt.text };
             if (opt.state) btnData.state = opt.state;
             if (opt.action) btnData.action = opt.action;
             this.stationMenuButtonAreas.push(btnData);
         });
         pop();
    } // --- End drawStationMainMenu ---

    /** Draws the Commodity Market screen (when state is VIEWING_MARKET) */
    drawMarketScreen(market, player) {
        if (!market || !player || typeof market.getPrices !== 'function') {
             console.error("drawMarketScreen missing valid market or player.");
             push(); fill(255,0,0); textSize(18); textAlign(CENTER,CENTER); text("Market Data Error!", width/2, height/2); pop();
             return;
        }
        market.updatePlayerCargo(player.cargo); const commodities = market.getPrices();
        this.marketButtonAreas = []; this.marketBackButtonArea = {}; // Clear interaction areas
        push();
        let pX=width*0.1, pY=height*0.1, pW=width*0.8, pH=height*0.8; fill(50,20,20,220); stroke(255,100,100); rect(pX,pY,pW,pH,10); // Panel
        fill(255); textSize(24); textAlign(CENTER,TOP); text(`Commodity Market - ${market.systemType || 'Unknown'}`, pX+pW/2, pY+20); // Title
        textSize(16); textAlign(LEFT,TOP); text(`Credits: ${player.credits}`, pX+30, pY+60); text(`Cargo: ${player.getCargoAmount()}/${player.cargoCapacity}`, pX+30, pY+85); // Player Info
        let sY=pY+130, tW=pW-60, cols=6, cW=tW/cols, sX=pX+30; textAlign(CENTER,CENTER); textSize(14); fill(200); // Headers
        text("Commodity", sX+cW*0.5, sY); text("Buy", sX+cW*1.5, sY); text("Sell", sX+cW*2.5, sY); text("Held", sX+cW*3.5, sY);
        sY+=30; const rowH=30, btnW=cW*0.8, btnH=rowH*0.8; // Rows
        (commodities || []).forEach((comm, index) => { if (!comm) return; let yP=sY+index*rowH, tY=yP+rowH/2; fill(255); textAlign(LEFT,CENTER); text(comm.name||'?', sX+10, tY); textAlign(RIGHT,CENTER); text(comm.buyPrice??'?', sX+cW*2-10, tY); text(comm.sellPrice??'?', sX+cW*3-10, tY); text(comm.playerStock??'?', sX+cW*4-10, tY); let buyX=sX+cW*4.1, buyY=yP+(rowH-btnH)/2; fill(0,150,0); rect(buyX,buyY,btnW,btnH,3); fill(255); textAlign(CENTER,CENTER); text("Buy 1", buyX+btnW/2, buyY+btnH/2); this.marketButtonAreas.push({x:buyX,y:buyY,w:btnW,h:btnH,action:'buy',commodity:comm.name}); let sellX=sX+cW*5.1, sellY=yP+(rowH-btnH)/2; fill(150,0,0); rect(sellX,sellY,btnW,btnH,3); fill(255); textAlign(CENTER,CENTER); text("Sell 1", sellX+btnW/2, sellY+btnH/2); this.marketButtonAreas.push({x:sellX,y:sellY,w:btnW,h:btnH,action:'sell',commodity:comm.name}); });
        // Back Button
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15; fill(180,180,0); stroke(220,220,100); rect(backX,backY,backW,backH,5); fill(0); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Back", backX+backW/2, backY+backH/2); this.marketBackButtonArea = {x:backX, y:backY, w:backW, h:backH};
        pop();
    } // --- End drawMarketScreen ---

    /** Draws the Mission Board screen (when state is VIEWING_MISSIONS) */
    drawMissionBoard(missions, selectedIndex, player) {
         if (!player) { console.warn("drawMissionBoard missing player"); return; }
         this.missionListButtonAreas = []; this.missionDetailButtonAreas = {}; // Clear areas
         push();
         let pX=width*0.1, pY=height*0.1, pW=width*0.8, pH=height*0.8; fill(20,50,20,220); stroke(100,255,100); rect(pX,pY,pW,pH,10); // Panel
         fill(255); textSize(24); textAlign(CENTER,TOP); text("Station Mission Board", pX+pW/2, pY+20); // Title
         let listW = pW*0.4, detailX = pX+listW+10, detailW = pW-listW-20; let cY = pY+60, cH = pH-110; // Layout
         fill(0,0,0,100); noStroke(); rect(pX+5, cY, listW-10, cH); // List BG
         let listSY = cY+10, entryH=35, spacing=5; // List items
         if (!Array.isArray(missions) || missions.length === 0) { fill(180); textSize(14); textAlign(CENTER,CENTER); text("No missions available.", pX+listW/2, cY+cH/2); }
         else { missions.forEach((m, i) => { if (!m?.getSummary) return; let mY=listSY+i*(entryH+spacing); if(mY+entryH > cY+cH) return; if(i===selectedIndex) {fill(80,100,80,200);stroke(150,255,150);strokeWeight(1);} else {fill(40,60,40,180); noStroke();} rect(pX+10, mY, listW-20, entryH, 3); fill(220); textSize(12); textAlign(LEFT,CENTER); noStroke(); text(m.getSummary(), pX+20, mY+entryH/2, listW-40); this.missionListButtonAreas.push({x:pX+10,y:mY,w:listW-20,h:entryH,index:i}); }); }
         fill(0,0,0,100); noStroke(); rect(detailX, cY, detailW-5, cH); // Detail BG
         const selectedMission = (selectedIndex >= 0 && selectedIndex < missions?.length) ? missions[selectedIndex] : null; // Details
         if (selectedMission?.getDetails) { fill(230); textSize(14); textAlign(LEFT,TOP); textLeading(18); text(selectedMission.getDetails(), detailX+15, cY+15, detailW-30); let btnW=100, btnH=30, btnY=pY+pH-btnH-15, acceptX=detailX+detailW/2-btnW-10, backX=detailX+detailW/2+10; if (!player.activeMission) { fill(0,180,0); stroke(150,255,150); rect(acceptX,btnY,btnW,btnH,3); fill(255); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Accept", acceptX+btnW/2, btnY+btnH/2); this.missionDetailButtonAreas['accept']={x:acceptX,y:btnY,w:btnW,h:btnH}; } else { fill(50,100,50); stroke(100,150,100); rect(acceptX,btnY,btnW,btnH,3); fill(150); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Unavailable", acceptX+btnW/2, btnY+btnH/2); this.missionDetailButtonAreas['accept']=null; } fill(180,0,0); stroke(255,150,150); rect(backX,btnY,btnW,btnH,3); fill(255); textSize(16); textAlign(CENTER,CENTER); noStroke(); text("Back", backX+btnW/2, btnY+btnH/2); this.missionDetailButtonAreas['back']={x:backX,y:btnY,w:btnW,h:btnH}; }
         else { fill(180); textSize(14); textAlign(CENTER,CENTER); text("Select mission for details.", detailX+(detailW-5)/2, cY+cH/2); let btnW=100,btnH=30,btnY=pY+pH-btnH-15,backX=pX+pW/2-btnW/2; fill(180,0,0);stroke(255,150,150);rect(backX,btnY,btnW,btnH,3);fill(255);textSize(16);textAlign(CENTER,CENTER);noStroke();text("Back",backX+btnW/2,btnY+btnH/2);this.missionDetailButtonAreas={'back':{x:backX,y:btnY,w:btnW,h:btnH},'accept':null}; }
         if (player.activeMission?.title) { fill(0,0,0,180);stroke(255,150,0);strokeWeight(1); let ay=pY+pH+5, ah=30; rect(pX,ay,pW,ah); fill(255,180,0);noStroke();textSize(14);textAlign(LEFT,CENTER); text(`Active: ${player.activeMission.title}`, pX+15, ay+ah/2, pW-30); }
         pop();
    } // --- END drawMissionBoard ---

    /** Draws the Galaxy Map screen */
    drawGalaxyMap(galaxy, player) {
        if (!galaxy || !player) { /* Draw error message */ return; }
        this.galaxyMapNodeAreas = []; // Clear old areas
        const systems = galaxy.getSystemDataForMap();
        const reachableIndices = galaxy.getReachableSystems();
        const currentSystemIndex = galaxy.currentSystemIndex;

        push(); // Isolate map drawing styles
        background(10, 0, 20); // Dark purple background

        // Draw connections
        stroke(100, 80, 150, 150); strokeWeight(1);
        for (let i = 0; i < systems.length; i++) { let cs=systems[i], ni=(i+1)%systems.length, ns=systems[ni]; if(cs?.x!==undefined && ns?.x!==undefined) line(cs.x,cs.y,ns.x,ns.y); }

        // Draw System Nodes
        const nodeRadius = 15;
        systems.forEach((sys, index) => {
             if (!sys) return;
            let isCurrent = (index === currentSystemIndex); let isSelected = (index === this.selectedSystemIndex); let isReachable = reachableIndices.includes(index);
            if (isCurrent) fill(0, 255, 0); else if (isSelected) fill(255, 255, 0); else if (sys.visited) fill(150, 150, 200); else fill(80, 80, 100); // Fill
            if (isReachable && !isCurrent) { stroke(200, 200, 0); strokeWeight(2); } else { stroke(200); strokeWeight(1); } // Stroke
            ellipse(sys.x, sys.y, nodeRadius * 2, nodeRadius * 2); // Draw node
            this.galaxyMapNodeAreas.push({ x: sys.x, y: sys.y, radius: nodeRadius, index: index }); // Store area
            fill(255); noStroke(); textAlign(CENTER, TOP); textSize(12); text(sys.name, sys.x, sys.y + nodeRadius + 5); // Label
            textSize(10); if (sys.visited || isCurrent) text(`(${sys.type})`, sys.x, sys.y + nodeRadius + 20); else text(`(Unknown)`, sys.x, sys.y + nodeRadius + 20);
        });

        // Draw Jump Button
        if (this.selectedSystemIndex !== -1 && this.selectedSystemIndex !== currentSystemIndex && reachableIndices.includes(this.selectedSystemIndex)) {
            let btnW=150, btnH=40, btnX=width/2-btnW/2, btnY=height-btnH-20; fill(0,180,255); rect(btnX,btnY,btnW,btnH,5); fill(0); textSize(18); textAlign(CENTER,CENTER); text(`Jump`, btnX+btnW/2, btnY+btnH/2); this.jumpButtonArea={x:btnX,y:btnY,w:btnW,h:btnH};
        } else { this.jumpButtonArea = { x: 0, y: 0, w: 0, h: 0 }; } // Reset inactive area

        // Draw Instructions
        fill(200); textAlign(CENTER, BOTTOM); textSize(14); text("Click reachable system (yellow outline) to select, then click JUMP.", width/2, height-70); text("Press 'M' or 'ESC' to return to flight.", width/2, height-5);
        pop(); // Restore previous drawing styles
    } // --- End drawGalaxyMap ---

    /** Draws the Game Over overlay screen */
    drawGameOverScreen() {
        push(); fill(0, 0, 0, 150); rect(0, 0, width, height); // Dark overlay
        fill(255, 0, 0); textSize(48); textAlign(CENTER, CENTER); text("GAME OVER", width / 2, height / 2 - 30); // Red text
        fill(255); textSize(20); text("Click to Restart", width/2, height / 2 + 30); // White text
        pop();
    } // --- End drawGameOverScreen ---

    /** Draws the Minimap overlay (bottom right) with debugging logs */
    drawMinimap(player, system) {
        // console.log(">>> drawMinimap START"); // Noisy log
        if (!player?.pos || !system) { /* console.warn("Minimap skip: player/system missing"); */ return; }

        // Calculate position and scale
        this.minimapX = width - this.minimapSize - this.minimapMargin;
        this.minimapY = height - this.minimapSize - this.minimapMargin;
        this.minimapScale = this.minimapSize / this.minimapWorldViewRange;
        if (isNaN(this.minimapScale) || this.minimapScale <= 0 || !isFinite(this.minimapScale)) { this.minimapScale = 0.01; } // Validate scale

        let mapCenterX = this.minimapX + this.minimapSize / 2;
        let mapCenterY = this.minimapY + this.minimapSize / 2;

        push(); // Isolate drawing

        // Draw background/border
        // console.log("   Drawing minimap background/border..."); // Noisy log
        try {
            fill(0, 0, 0, 180); stroke(0, 200, 0, 200); strokeWeight(1);
            rect(this.minimapX, this.minimapY, this.minimapSize, this.minimapSize);
        } catch (e) { console.error("Error drawing minimap rect:", e); pop(); return; }
        // console.log("   Minimap background/border drawn."); // Noisy log

        // Draw player (center)
        fill(255); noStroke(); ellipse(mapCenterX, mapCenterY, 5, 5);

        // console.log(`   Player World Pos: (${player.pos.x.toFixed(0)}, ${player.pos.y.toFixed(0)})`); // Noisy log

        try { // Wrap drawing of other elements
            // Map and draw station
            if (system.station?.pos) {
                let objX = system.station.pos.x, objY = system.station.pos.y;
                let relX = objX - player.pos.x, relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale, mapY = mapCenterY + relY * this.minimapScale;
                // --- Log Station Mapping ---
                // console.log(`   Station - World: (${objX.toFixed(0)}, ${objY.toFixed(0)}), Rel: (${relX.toFixed(0)}, ${relY.toFixed(0)}), Scale: ${this.minimapScale.toFixed(4)}, Map: (${mapX.toFixed(1)}, ${mapY.toFixed(1)})`);
                // ---
                fill(0, 0, 255); rect(mapX - 3, mapY - 3, 6, 6); // Draw station (no bounds check for debug)
            }

            // Map and draw planets
            fill(150, 100, 50);
            (system.planets || []).forEach((planet, index) => {
                if (!planet?.pos) return;
                let objX = planet.pos.x, objY = planet.pos.y;
                let relX = objX - player.pos.x, relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale, mapY = mapCenterY + relY * this.minimapScale;
                // --- Log FIRST Planet ---
                // if (index === 0) { console.log(`   Planet[0] - World: (${objX.toFixed(0)}, ${objY.toFixed(0)}), Rel: (${relX.toFixed(0)}, ${relY.toFixed(0)}), Map: (${mapX.toFixed(1)}, ${mapY.toFixed(1)})`); }
                // ---
                ellipse(mapX, mapY, 4, 4); // Draw planet dot (no bounds check for debug)
            });

            // Map and draw Enemies
             fill(255, 0, 0);
             (system.enemies || []).forEach((enemy, index) => {
                 if (!enemy?.pos) return;
                 let objX = enemy.pos.x, objY = enemy.pos.y;
                 let relX = objX - player.pos.x, relY = objY - player.pos.y;
                 let mapX = mapCenterX + relX * this.minimapScale, mapY = mapCenterY + relY * this.minimapScale;
                 // --- Log FIRST Enemy ---
                 // if (index === 0) { console.log(`   Enemy[0] - World: (${objX.toFixed(0)}, ${objY.toFixed(0)}), Rel: (${relX.toFixed(0)}, ${relY.toFixed(0)}), Map: (${mapX.toFixed(1)}, ${mapY.toFixed(1)})`); }
                 // ---
                 triangle(mapX, mapY - 3, mapX - 2, mapY + 2, mapX + 2, mapY + 2); // Draw enemy triangle (no bounds check)
             });

        } catch (e) { console.error("Error during minimap element mapping/drawing:", e); }
        finally { pop(); } // Restore drawing state
        // console.log("<<< drawMinimap END"); // Noisy log
    } // End drawMinimap

    /** Handles mouse clicks for all UI states */
    handleMouseClicks(mx, my, currentState, player, market, galaxy) {
        // console.log(`handleMouseClicks: State=${currentState}, Click=(${floor(mx)},${floor(my)})`); // Keep for debugging state issues

        // --- DOCKED State (Main Station Menu) ---
        if (currentState === "DOCKED") {
            for (const btn of this.stationMenuButtonAreas) { if (mx > btn.x && mx < btn.x + btn.w && my > btn.y && my < btn.y + btn.h) { console.log(`Station Menu clicked: ${btn.text || btn.action}`); if (btn.action === "UNDOCK") { gameStateManager.setState("IN_FLIGHT"); return true; } else if (btn.state === "VIEWING_MARKET") { gameStateManager.setState(btn.state); return true; } else if (btn.state === "VIEWING_MISSIONS") { if (gameStateManager.fetchStationMissions(player)) { gameStateManager.setState(btn.state); } return true; } else if (btn.state) { console.warn(`State ${btn.state} not handled yet.`); return true; } } } return false;
        }
        // --- VIEWING_MARKET State ---
        else if (currentState === "VIEWING_MARKET") {
             if (this.marketBackButtonArea?.w > 0 && mx > this.marketBackButtonArea.x && mx < this.marketBackButtonArea.x + this.marketBackButtonArea.w && my > this.marketBackButtonArea.y && my < this.marketBackButtonArea.y + this.marketBackButtonArea.h) { gameStateManager.setState("DOCKED"); return true; }
             for (const btn of this.marketButtonAreas) { if (mx > btn.x && mx < btn.x + btn.w && my > btn.y && my < btn.y + btn.h) { if (market && player) { if (btn.action === 'buy') market.buy(btn.commodity, 1, player); else if (btn.action === 'sell') market.sell(btn.commodity, 1, player); } return true; } } return false;
        }
        // --- VIEWING_MISSIONS State ---
        else if (currentState === "VIEWING_MISSIONS") {
             if (this.missionDetailButtonAreas['back']?.w > 0 && mx > this.missionDetailButtonAreas['back'].x && mx < this.missionDetailButtonAreas['back'].x + this.missionDetailButtonAreas['back'].w && my > this.missionDetailButtonAreas['back'].y && my < this.missionDetailButtonAreas['back'].y + this.missionDetailButtonAreas['back'].h) { gameStateManager.setState("DOCKED"); return true; }
             if (this.missionDetailButtonAreas['accept']?.w > 0 && !player.activeMission && mx > this.missionDetailButtonAreas['accept'].x && mx < this.missionDetailButtonAreas['accept'].x + this.missionDetailButtonAreas['accept'].w && my > this.missionDetailButtonAreas['accept'].y && my < this.missionDetailButtonAreas['accept'].y + this.missionDetailButtonAreas['accept'].h) { if (gameStateManager?.selectedMissionIndex !== -1) { let m=gameStateManager.currentStationMissions[gameStateManager.selectedMissionIndex]; if(m && player.acceptMission(m)){gameStateManager.setState("DOCKED");}} return true; }
             for (const btn of this.missionListButtonAreas) { if (mx > btn.x && mx < btn.x + btn.w && my > btn.y && my < btn.y + btn.h) { if(gameStateManager)gameStateManager.selectedMissionIndex=btn.index; return true; } } return false;
        }
        // --- GALAXY_MAP State ---
        else if (currentState === "GALAXY_MAP") { return this.handleGalaxyMapClicks(mx, my, galaxy); }
        // --- GAME_OVER State ---
        else if (currentState === "GAME_OVER") { window.location.reload(); return true; }

        // Default: Click not handled
        return false;
    } // End handleMouseClicks

    /** Helper function specifically for handling clicks on the Galaxy Map */
    handleGalaxyMapClicks(mx, my, galaxy){
        if (!galaxy) return false;
        if (this.jumpButtonArea?.w > 0 && mx > this.jumpButtonArea.x && mx < this.jumpButtonArea.x + this.jumpButtonArea.w && my > this.jumpButtonArea.y && my < this.jumpButtonArea.y + this.jumpButtonArea.h) { if (this.selectedSystemIndex !== -1) { if (gameStateManager) gameStateManager.startJump(this.selectedSystemIndex); this.selectedSystemIndex = -1; } return true; }
        for (const node of this.galaxyMapNodeAreas) { if (!node) continue; if (dist(mx, my, node.x, node.y) < node.radius) { const reachable=galaxy.getReachableSystems(); const currentIdx=galaxy.currentSystemIndex; if (node.index!==currentIdx && reachable.includes(node.index)) { this.selectedSystemIndex=node.index; } else if (node.index===currentIdx) { this.selectedSystemIndex = -1; } return true; } }
        return false;
    } // End handleGalaxyMapClicks

} // End of UIManager Class