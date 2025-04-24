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
        this.repairsFullButtonArea = {}; // Placeholder
        this.repairsHalfButtonArea = {}; // Placeholder
        this.repairsBackButtonArea = {}; // Placeholder

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

        // FPS tracking properties
        this.fpsValues = [];          // Array to store recent FPS readings
        this.fpsMaxSamples = 30;      // Number of samples to average (half a second at 60fps)
        this.fpsUpdateInterval = 10;  // Update display every 10 frames
        this.fpsFrameCount = 0;       // Frame counter for updates
        this.fpsAverage = 0;          // Current average FPS value to display

        this.messages = [];
        this.messageDisplayTime = 4000; // ms
        this.maxMessagesToShow = 4;

        // Properties for market button holding
        this.marketButtonHeld = null;
        this.lastButtonAction = 0;
        this.buttonRepeatDelay = 150; // ms between repeated actions

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
        const csName = player.currentSystem?.name || 'N/A'; 
        const cargoAmt = player.getCargoAmount() ?? 0;
        const cargoCap = player.cargoCapacity ?? 0; 
        const hull = player.hull ?? 0; 
        const maxHull = player.maxHull || 1;
        const credits = player.credits ?? 0;
        const shipName = player.shipTypeName || "Unknown Ship";
        
        // Top HUD bar background
        push(); 
        fill(0, 180, 0, 150); 
        noStroke(); 
        rect(0, 0, width, 40);
        
        // Left side - System name with additional info
        fill(255); 
        textSize(14); 
        textAlign(LEFT, CENTER); 
        const systemType = player.currentSystem?.economyType || 'Unknown';
        const secLevel = player.currentSystem?.securityLevel || 'Unknown';
        text(`System: ${csName}            Economy: ${systemType}   Security: ${secLevel}`, 10, 20);
        
        // ALIGNED: Status elements at consistent vertical position
        const statusLineY = 20; // Central Y position for all status elements
        
        // Center - LEGAL status - aligned at statusLineY
        if (player.isWanted) {
            // Draw WANTED text
            fill(255,0,0);
            textAlign(CENTER, CENTER);
            textSize(14);
            text("WANTED", width/2, statusLineY);
        } else {
            // Show "LEGAL" status when not wanted
            fill(255);
            textAlign(CENTER, CENTER);
            textSize(14);
            text("LEGAL", width/2, statusLineY);
        }
        
        // Right side - Ship info - aligned with statusLineY
        fill(255);
        textAlign(RIGHT, CENTER);
        text(`Cargo: ${cargoAmt}/${cargoCap}   Credits: ${credits}`, width-300, statusLineY);
        
        // === Shield and Hull bars integration in top bar ===
        const barWidth = 140;
        const barHeight = 14;
        const barX = width - 150;
        const barMiddleY = 20;

        // Upper bar - Shield
        if (player.maxShield > 0) {
            // Shield background 
            fill(20, 20, 60);
            rect(barX, barMiddleY - barHeight - 2, barWidth, barHeight);
            
            // Shield level
            const shieldPercent = player.shield / player.maxShield;
            fill(50, 100, 255);
            rect(barX, barMiddleY - barHeight - 2, barWidth * shieldPercent, barHeight);
            
            // Shield border
            stroke(100, 150, 255);
            noFill();
            rect(barX, barMiddleY - barHeight - 2, barWidth, barHeight);
            
            // Shield text
            fill(255);
            noStroke();
            textAlign(LEFT, CENTER);
            textSize(12);
            text(`Shield: ${Math.floor(player.shield)}/${player.maxShield}`, barX - 85, barMiddleY - barHeight/2 - 2);
        }

        // Lower bar - Hull
        fill(60, 20, 20);
        rect(barX, barMiddleY + 2, barWidth, barHeight);

        // Hull level
        const hullPercent = player.hull / player.maxHull;
        fill(255, 50, 50);
        rect(barX, barMiddleY + 2, barWidth * hullPercent, barHeight);

        // Hull border
        stroke(255, 100, 100);
        noFill();
        rect(barX, barMiddleY + 2, barWidth, barHeight);

        // Hull text
        fill(255);
        noStroke();
        textAlign(LEFT, CENTER);
        textSize(12);
        text(`Hull: ${Math.floor(player.hull)}/${player.maxHull}`, barX - 85, barMiddleY + barHeight/2 + 2);
        
        // Weapon selector (with integrated cooldown bar)
        this.drawWeaponSelector(player);
        
        pop();
    }

    /** Draws the weapon selector UI */
    drawWeaponSelector(player) {
        if (!player?.weapons || player.weapons.length === 0) return;
        
        const weaponBarY = 45; // Position below main HUD bar
        const weaponBarH = 24;
        
        // Background for weapon bar
        push();
        fill(0, 50, 80, 150);
        noStroke();
        rect(0, weaponBarY, width, weaponBarH);
        
        // Display weapon slots
        textAlign(LEFT, CENTER);
        textSize(12);
        let xPos = 10;
        
        player.weapons.forEach((weapon, index) => {
            // Calculate width for this weapon slot
            const isSelected = (index === player.weaponIndex);
            const slotPadding = 10;
            const slotText = `${index+1}: ${weapon.name}`;
            const textW = textWidth(slotText);
            const slotW = textW + slotPadding * 2;
            
            // Draw slot background
            if (isSelected) {
                fill(0, 100, 180, 200); // Highlight selected weapon
            } else {
                fill(0, 80, 120, 120); // Normal background
            }
            rect(xPos, weaponBarY + 3, slotW, weaponBarH - 6, 5);
            
            // Draw weapon name with key number
            if (isSelected) {
                fill(255, 255, 100); // Bright text for selected
            } else {
                fill(200); // Regular text
            }
            text(slotText, xPos + slotPadding, weaponBarY + weaponBarH/2);
            
            // Draw cooldown bar for the selected weapon
            if (isSelected && player.fireCooldown > 0 && player.fireRate > 0) {
                let c = constrain(map(player.fireCooldown, player.fireRate, 0, 0, 1), 0, 1);
                fill(255, 50, 50, 200);
                noStroke();
                // Place cooldown bar at the bottom of this weapon slot
                rect(xPos, weaponBarY + weaponBarH - 3, slotW * c, 3);
            }
            
            // Move to next position
            xPos += slotW + 5;
        });
        
        // NEW: Draw active mission on the RIGHT side of the weapon bar
        if (player.activeMission?.title) {
            const missionText = `Mission: ${player.activeMission.title}`;
            
            // Create a background for the mission text
            const missionPadding = 10;
            textSize(13);
            const missionTextW = textWidth(missionText);
            const missionBoxW = missionTextW + missionPadding * 2;
            const missionBoxX = width - missionBoxW - 10; // 10px from right edge
            
            // Draw mission background
            fill(0, 80, 140, 200); // Slightly brighter blue than weapon bar
            stroke(0, 100, 180);
            strokeWeight(1);
            rect(missionBoxX, weaponBarY + 3, missionBoxW, weaponBarH - 6, 5);
            
            // Draw mission text
            fill(255, 180, 0); // Gold text for mission
            noStroke();
            textAlign(LEFT, CENTER);
            text(missionText, missionBoxX + missionPadding, weaponBarY + weaponBarH/2);
            
            // Optional: Add a small indicator icon
            fill(255, 200, 0);
            circle(missionBoxX + 6, weaponBarY + weaponBarH/2, 5);
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
            { text: "Shipyard", state: "VIEWING_SHIPYARD" },
            { text: "Upgrades", state: "VIEWING_UPGRADES" },
            { text: "Repairs", state: "VIEWING_REPAIRS" },
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

    /** Draws the Repairs Menu */
    drawRepairsMenu(player) {
        if (!player) return;
        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([60,30,30,230], [255,180,100]);
        fill(255); textSize(24); textAlign(CENTER,TOP);
        text("Ship Repairs", pX+pW/2, pY+20);

        // Show current hull and max hull
        fill(220); textSize(18); textAlign(CENTER,TOP);
        text(`Hull: ${floor(player.hull)} / ${player.maxHull}`, pX+pW/2, pY+60);
        text(`Credits: ${player.credits}`, pX+pW/2, pY+90);

        // Calculate repair costs
        let missing = player.maxHull - player.hull;
        let fullCost = missing * 10;
        let halfRepair = Math.min(missing, Math.ceil(player.maxHull / 2));
        let halfCost = halfRepair * 7;

        let btnW = pW*0.5, btnH = 45, btnX = pX+pW/2-btnW/2, btnY1 = pY+140, btnY2 = btnY1+btnH+20;

        // 100% Repair Button
        fill(0,180,0); stroke(100,255,100); rect(btnX, btnY1, btnW, btnH, 5);
        fill(255); textSize(18); textAlign(CENTER,CENTER); noStroke();
        text(`Full Repair (${fullCost} cr)`, btnX+btnW/2, btnY1+btnH/2);
        this.repairsFullButtonArea = {x:btnX, y:btnY1, w:btnW, h:btnH};

        // 50% Repair Button
        fill(180,180,0); stroke(220,220,100); rect(btnX, btnY2, btnW, btnH, 5);
        fill(0); textSize(18); textAlign(CENTER,CENTER); noStroke();
        text(`50% Repair (${halfCost} cr)`, btnX+btnW/2, btnY2+btnH/2);
        this.repairsHalfButtonArea = {x:btnX, y:btnY2, w:btnW, h:btnH};

        // Back button
        let backW=100, backH=30, backX=pX+pW/2-backW/2, backY=pY+pH-backH-15;
        fill(180,180,0); stroke(220,220,100); rect(backX,backY,backW,backH,5);
        fill(0); textSize(16); textAlign(CENTER,CENTER); noStroke();
        text("Back", backX+backW/2, backY+backH/2);
        this.repairsBackButtonArea = {x:backX, y:backY, w:backW, h:backH};
        pop();
    }

    /** Draws the Commodity Market screen (when state is VIEWING_MARKET) */
    drawMarketScreen(market, player) {
        if (!market || !player || typeof market.getPrices !== 'function') { /* Draw error */ return; }
        market.updatePlayerCargo(player.cargo);
        const commodities = market.getPrices();
        this.marketButtonAreas = [];
        this.marketBackButtonArea = {}; // Clear areas

        push();
        const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
        this.drawPanelBG([50,20,20,220], [255,100,100]);

        // Title and player info
        fill(255); textSize(24); textAlign(CENTER,TOP);
        text(`Commodity Market - ${market.systemType || 'Unknown'}`, pX+pW/2, pY+20);
        textSize(16); textAlign(LEFT,TOP);
        text(`Credits: ${Math.floor(player.credits)}`, pX+30, pY+60); // Ensure credits are integer
        text(`Cargo: ${player.getCargoAmount()}/${player.cargoCapacity}`, pX+30, pY+85);

        // Table setup
        let sY = pY+130, tW = pW-60, cols = 8, cW = tW/cols, sX = pX+30;
        textAlign(CENTER,CENTER); textSize(14); fill(200);

        // Column headers
        text("Commodity", sX+cW*0.5, sY);
        text("Buy", sX+cW*1.5, sY);
        text("Sell", sX+cW*2.5, sY);
        text("Held", sX+cW*3.5, sY);

        // Row setup
        sY += 30;
        const rowH = 30;
        const btnW = cW*0.65;
        const btnH = rowH*0.8;

        // --- Price Indicator Constants ---
        const indicatorW = 15; // Width of the indicator bar area
        const indicatorMaxH = rowH * 0.6; // Max height of the bar
        const indicatorYOffset = (rowH - indicatorMaxH) / 2; // Center vertically
        const maxDeviation = 0.5; // Max price deviation (e.g., 50%) for full bar height

        // Draw commodity rows
        (commodities || []).forEach((comm, i) => {
            if (!comm) return;
            let yP = sY+i*rowH;
            let tY = yP+rowH/2;

            // --- Alternating Row Background ---
            if (i % 2 === 0) {
                fill(0, 0, 0, 100); // Increased alpha
            } else {
                fill(80, 80, 80, 100); // Increased alpha and brightness difference
            }
            noStroke();
            rect(sX, yP, tW, rowH); // Draw background for the data part of the row
            // --- End Alternating Background ---

            // Commodity name and prices
            fill(255);
            textAlign(LEFT,CENTER);
            text(comm.name||'?', sX+10, tY, cW-15);
            textAlign(RIGHT,CENTER);
            text(comm.buyPrice??'?', sX+cW*2-10 - indicatorW, tY); // Shift price text left
            text(comm.sellPrice??'?', sX+cW*3-10 - indicatorW, tY); // Shift price text left
            text(comm.playerStock??'?', sX+cW*4-10, tY);

            // --- Price Indicators ---
            noStroke();
            // Buy Price Indicator
            if (comm.baseBuy > 0) {
                let buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                let indicatorH = constrain(abs(buyDeviation) / maxDeviation, 0, 1) * indicatorMaxH;
                let indicatorX = sX + cW*2 - indicatorW - 5; // Position indicator to the right of text
                let indicatorY = yP + indicatorYOffset + (indicatorMaxH - indicatorH); // Bar grows upwards

                if (buyDeviation > 0.05) { // Expensive (Red) - allow small tolerance
                    fill(255, 50, 50); // Red
                } else if (buyDeviation < -0.05) { // Cheap (Green)
                    fill(50, 255, 50); // Green
                } else { // Average (Neutral/No bar)
                    fill(120); // Grey or transparent
                    indicatorH = 1; // Minimal dot or line
                    indicatorY = yP + indicatorYOffset + indicatorMaxH - indicatorH;
                }
                 if (indicatorH > 0) { // Only draw if there's height
                    rect(indicatorX, indicatorY, 3, indicatorH); // Draw thin bar
                 }
            }
            // Sell Price Indicator
            if (comm.baseSell > 0) {
                let sellDeviation = (comm.sellPrice - comm.baseSell) / comm.baseSell;
                let indicatorH = constrain(abs(sellDeviation) / maxDeviation, 0, 1) * indicatorMaxH;
                let indicatorX = sX + cW*3 - indicatorW - 5; // Position indicator
                let indicatorY = yP + indicatorYOffset + (indicatorMaxH - indicatorH); // Bar grows upwards

                if (sellDeviation > 0.05) { // Good Sell Price (Green)
                    fill(50, 255, 50); // Green
                } else if (sellDeviation < -0.05) { // Bad Sell Price (Red)
                    fill(255, 50, 50); // Red
                } else { // Average (Neutral/No bar)
                    fill(120); // Grey or transparent
                    indicatorH = 1; // Minimal dot or line
                    indicatorY = yP + indicatorYOffset + indicatorMaxH - indicatorH;
                }
                 if (indicatorH > 0) { // Only draw if there's height
                    rect(indicatorX, indicatorY, 3, indicatorH); // Draw thin bar
                 }
            }
            // --- End Price Indicators ---


            // --- Buttons (Positioned slightly adjusted if needed, but seem okay) ---
            let btnStartX = sX + cW * 4.2; // Start position for buttons

            // Buy 1 button
            let buy1X = btnStartX;
            let buy1Y = yP+(rowH-btnH)/2;
            fill(0,150,0); stroke(0,200,0); strokeWeight(1);
            rect(buy1X, buy1Y, btnW, btnH, 3);
            fill(255); noStroke(); textAlign(CENTER,CENTER); textSize(12);
            text("Buy 1", buy1X+btnW/2, buy1Y+btnH/2);
            this.marketButtonAreas.push({ x: buy1X, y: buy1Y, w: btnW, h: btnH, action: 'buy', quantity: 1, commodity: comm.name });

            // Buy All button
            let buyAllX = buy1X + btnW + 5; // Position relative to previous button
            let buyAllY = buy1Y;
            fill(0,180,0); stroke(0,220,0); strokeWeight(1);
            rect(buyAllX, buyAllY, btnW, btnH, 3);
            fill(255); noStroke(); textAlign(CENTER,CENTER); textSize(12);
            text("Buy All", buyAllX+btnW/2, buyAllY+btnH/2);
            this.marketButtonAreas.push({ x: buyAllX, y: buyAllY, w: btnW, h: btnH, action: 'buyAll', commodity: comm.name });

            // Sell 1 button
            let sell1X = buyAllX + btnW + 10; // Add more space before sell buttons
            let sell1Y = buy1Y;
            fill(150,0,0); stroke(200,0,0); strokeWeight(1);
            rect(sell1X, sell1Y, btnW, btnH, 3);
            fill(255); noStroke(); textAlign(CENTER,CENTER); textSize(12);
            text("Sell 1", sell1X+btnW/2, sell1Y+btnH/2);
            this.marketButtonAreas.push({ x: sell1X, y: sell1Y, w: btnW, h: btnH, action: 'sell', quantity: 1, commodity: comm.name });

            // Sell All button
            let sellAllX = sell1X + btnW + 5; // Position relative to previous button
            let sellAllY = buy1Y;
            fill(180,0,0); stroke(220,0,0); strokeWeight(1);
            rect(sellAllX, sellAllY, btnW, btnH, 3);
            fill(255); noStroke(); textAlign(CENTER,CENTER); textSize(12);
            text("Sell All", sellAllX+btnW/2, sellAllY+btnH/2);
            this.marketButtonAreas.push({ x: sellAllX, y: sellAllY, w: btnW, h: btnH, action: 'sellAll', commodity: comm.name });
        });

        // Back button
        let backW = 100;
        let backH = 30;
        let backX = pX+pW/2-backW/2;
        let backY = pY+pH-backH-15;
        fill(180,180,0);
        stroke(220,220,100); strokeWeight(1);
        rect(backX, backY, backW, backH, 5);
        fill(0);
        textSize(16);
        textAlign(CENTER,CENTER);
        noStroke();
        text("Back", backX+backW/2, backY+backH/2);
        this.marketBackButtonArea = {x:backX, y:backY, w:backW, h:backH};

        pop();
    }

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

        const currentSystem = galaxy.getCurrentSystem();
        const canJump = isPlayerInJumpZone(player, currentSystem); // Use the helper function

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
        systems.forEach((sysData, i) => {
            if (!sysData) return;

            let isCurrent = (i === currentIdx);
            let isSelected = (i === this.selectedSystemIndex);
            // --- Determine reachability based on connections AND fuel (if galaxy.getReachableSystems considers fuel) ---
            // Assuming reachable already filters by fuel/connection
            let isReachable = reachable.includes(i);

            let nodeColor;
            let textColor = color(255);
            let nodeStrokeWeight = 1;
            let nodeStrokeColor = color(100, 80, 150); // Default dim connection color

            // --- Determine Base Color ---
            if (isCurrent) {
                nodeColor = color(0, 255, 0, 200); // Green for current
            } else if (sysData.visited) {
                nodeColor = color(255, 255, 0, 180); // Yellow fill for visited
            } else {
                nodeColor = color(0, 0, 255, 180); // Blue fill for unvisited
            }

            // --- Adjust Stroke/Text based on Jump Readiness and Reachability ---
            if (isCurrent) {
                 nodeStrokeColor = color(255); // Bright stroke for current
                 nodeStrokeWeight = 2;
            } else if (canJump && isReachable) {
                 // If player CAN jump and system IS reachable: Bright Yellow Outline
                 nodeStrokeColor = color(255, 255, 0);
                 nodeStrokeWeight = 2;
                 // Keep base fill color (blue or yellow based on visited)
            } else if (!canJump && isReachable) {
                 // If player CANNOT jump but system IS reachable: Dimmed appearance
                 nodeColor = color(100, 100, 150, 150); // Override fill to dim blue/grey
                 textColor = color(180);
                 nodeStrokeColor = color(150); // Dim stroke
                 nodeStrokeWeight = 1;
            } else {
                 // Not current, not reachable (or canJump is false and not reachable)
                 // Use default dim stroke color
                 nodeStrokeWeight = 1;
                 // Keep base fill color
            }

            // --- Highlight Selected System ---
            if (isSelected) {
                 nodeStrokeColor = color(255, 100, 255); // Magenta outline for selected
                 nodeStrokeWeight = 3;
            }
            // ---

            // Draw the ellipse
            strokeWeight(nodeStrokeWeight);
            stroke(nodeStrokeColor);
            fill(nodeColor);
            ellipse(sysData.x, sysData.y, nodeR * 2, nodeR * 2);
            // Store clickable area
            this.galaxyMapNodeAreas.push({ x: sysData.x, y: sysData.y, radius: nodeR, index: i });

            // Draw Text Labels
            fill(textColor); noStroke(); textAlign(CENTER, TOP); textSize(12);
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

        // --- Display Jump Zone Message ---
        if (!canJump) {
            push();
            fill(255, 80, 80, 220); // Reddish warning color
            textSize(18);
            textAlign(CENTER, BOTTOM);
            noStroke();
            text("Must be in designated Jump Zone to initiate hyperspace jump.", width / 2, height - 20);
            pop();
        }
        // ---

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

    /** Handles clicks on the galaxy map */
    handleGalaxyMapClicks(mouseX, mouseY, galaxy, player, gameStateManager) {
        if (!galaxy || !player) return false;

        const currentSystem = galaxy.getCurrentSystem();
        const canJump = isPlayerInJumpZone(player, currentSystem); // Check jump zone status
        const reachable = galaxy.getReachableSystems(); // Get reachable systems for click logic

        // --- Debug Logging ---
        console.log(`[handleGalaxyMapClicks] 'canJump' evaluated as: ${canJump}`);
        // ---

        // Check Jump button first
        if (this.isClickInArea(mouseX, mouseY, this.jumpButtonArea)) {
            console.log("  Jump button clicked.");
            // Ensure a system is selected and it's reachable
            if (this.selectedSystemIndex !== -1 && reachable.includes(this.selectedSystemIndex)) {
                if (canJump) { // Double-check canJump status for the button action
                    console.log("    Attempting jump via button...");
                    gameStateManager.startJump(this.selectedSystemIndex);
                    // Optional: Deselect after initiating jump? Or keep selected?
                    // this.selectedSystemIndex = -1;
                } else {
                    // This case should ideally not happen if the button is only drawn when canJump allows selection,
                    // but keep as a safeguard.
                    console.log("    Jump button ignored: Player not in Jump Zone (safeguard check).");
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
            } else {
                 console.log(`    Jump button ignored: No valid system selected (${this.selectedSystemIndex}) or not reachable.`);
            }
            return true; // Click was on the button area
        }

        // Check system nodes for SELECTION
        for (const area of this.galaxyMapNodeAreas) { // Use the pre-calculated areas
             let d = dist(mouseX, mouseY, area.x, area.y);
             if (d < area.radius) {
                 const clickedIndex = area.index;
                 const clickedSys = galaxy.systems[clickedIndex]; // Get system object
                 console.log(`  Node clicked: ${clickedSys?.name || 'N/A'} (Index: ${clickedIndex})`);

                 // Allow selection only if the system is reachable
                 if (reachable.includes(clickedIndex)) {
                     console.log(`    -> System is reachable. Selecting index: ${clickedIndex}`);
                     this.selectedSystemIndex = clickedIndex; // SELECT the system
                     if (typeof soundManager !== 'undefined') soundManager.playSound('click'); // Feedback for selection
                 } else if (clickedIndex === galaxy.currentSystemIndex) {
                     console.log(`    -> Clicked current system. Deselecting.`);
                     this.selectedSystemIndex = -1; // Clicking current system deselects
                 } else {
                     console.log(`    -> System is NOT reachable. Selection ignored.`);
                     // Optional: Add message "Cannot select: Route unavailable" or similar
                     if (typeof uiManager !== 'undefined') uiManager.addMessage("Route unavailable.", color(255, 150, 150));
                     if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                 }
                 return true; // Click was handled (either selected, deselected, or ignored with feedback)
             }
        }

        // If click wasn't on button or any node, deselect
        // console.log("Clicked empty space on map. Deselecting.");
        // this.selectedSystemIndex = -1; // Optional: Deselect on empty space click?
        return false; // Click not handled by map elements
    }

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

                // --- Station Clamping Logic ---
                let drawX = mapX;
                let drawY = mapY;
                let isStationOnScreen = isFullyWithinBounds(mapX, mapY, iconHalfSize, iconHalfSize);

                if (!isStationOnScreen) {
                    const inset = iconHalfSize + 1;
                    drawX = constrain(mapX, mapLeft + inset, mapRight - inset);
                    drawY = constrain(mapY, mapTop + inset, mapBottom - inset);

                    if (mapX < mapLeft || mapX > mapRight || mapY < mapTop || mapY > mapBottom) {
                         fill(0, 100, 255); // Clamped color
                         noStroke();
                         rect(drawX - iconHalfSize, drawY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
                    } else {
                         fill(0, 0, 255); // Normal color (near edge but inside)
                         noStroke();
                         rect(mapX - iconHalfSize, mapY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
                    }
                } else {
                    fill(0, 0, 255); // Normal color (fully inside)
                    noStroke();
                    rect(mapX - iconHalfSize, mapY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
                }
                // --- End Station Clamping Logic ---
            }
            // ---

            // --- Map and Draw Planets ---
            fill(150, 100, 50); // Brownish for planets
            noStroke();
            (system.planets || []).forEach(planet => {
                if (!planet?.pos) return;
                let objX = planet.pos.x;
                let objY = planet.pos.y;
                let relX = objX - player.pos.x;
                let relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                const iconRadius = 2;
                if (isFullyWithinBounds(mapX, mapY, iconRadius, iconRadius)) {
                    ellipse(mapX, mapY, iconRadius * 2, iconRadius * 2);
                }
            });
            // ---

            // --- Map and Draw Enemies ---
            fill(255, 0, 0); // Red for enemies
            noStroke();
            (system.enemies || []).forEach(enemy => {
                if (!enemy?.pos || enemy.isDestroyed()) return;
                let objX = enemy.pos.x;
                let objY = enemy.pos.y;
                let relX = objX - player.pos.x;
                let relY = objY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                const iconHalfExtent = 3;
                if (isFullyWithinBounds(mapX, mapY, iconHalfExtent, iconHalfExtent)) {
                    push();
                    translate(mapX, mapY);
                    rotate(enemy.angle - PI / 2);
                    triangle(0, -iconHalfExtent, -iconHalfExtent*0.8, iconHalfExtent*0.8, iconHalfExtent*0.8, iconHalfExtent*0.8);
                    pop();
                }
            });
            // ---

            // --- Map and Draw Jump Zone ---
            if (system.jumpZoneCenter && system.jumpZoneRadius > 0) {
                let jzX = system.jumpZoneCenter.x;
                let jzY = system.jumpZoneCenter.y;
                let jzRadius = system.jumpZoneRadius;

                let relX = jzX - player.pos.x;
                let relY = jzY - player.pos.y;
                let mapX = mapCenterX + relX * this.minimapScale;
                let mapY = mapCenterY + relY * this.minimapScale;
                let mapRadius = max(1, jzRadius * this.minimapScale);

                // --- Clamping Logic & Drawing ---
                const indicatorSize = 4; // Size of the small square/dot when clamped
                const inset = indicatorSize / 2 + 1; // Inset needed for the small marker

                // Check if the *center* is outside the boundary for the small marker
                let isClamped = (mapX < mapLeft + inset || mapX > mapRight - inset || mapY < mapTop + inset || mapY > mapBottom - inset);

                push();
                strokeWeight(1);

                if (isClamped) {
                    // --- Draw Clamped Marker ---
                    // Clamp the center position to the inset boundary
                    let drawX = constrain(mapX, mapLeft + inset, mapRight - inset);
                    let drawY = constrain(mapY, mapTop + inset, mapBottom - inset);

                    fill(255, 255, 0, 220); // Solid yellow fill for clamped marker
                    noStroke();
                    // Draw a small square (like the station)
                    rectMode(CENTER); // Draw rect from center
                    rect(drawX, drawY, indicatorSize, indicatorSize);
                    rectMode(CORNER); // Reset rectMode

                } else {
                    // --- Draw On-Screen Circle ---
                    // Check if the full circle is within bounds (optional, for visual consistency)
                    // let isCircleFullyVisible = isFullyWithinBounds(mapX, mapY, mapRadius, mapRadius);

                    noFill();
                    stroke(255, 255, 0, 200); // Yellow outline
                    // Draw the circle outline using the original map position and scaled radius
                    ellipse(mapX, mapY, mapRadius * 2);
                }
                pop();
                // --- End Clamping & Drawing ---
            }
            // --- End Jump Zone Drawing ---

        } catch (e) {
            console.error("Error during minimap element drawing:", e);
        } finally {
            pop(); // Restore drawing state from before minimap drawing push()
        }
    } // End drawMinimap
    
    /** Draws the current framerate in the bottom left corner with averaging */
    drawFramerate() {
        // Sample current framerate
        const currentFps = frameRate();
        
        // Store the sample
        this.fpsValues.push(currentFps);
        
        // Keep the samples array at desired length
        while (this.fpsValues.length > this.fpsMaxSamples) {
            this.fpsValues.shift(); // Remove oldest sample
        }
        
        // Only update the display periodically
        this.fpsFrameCount++;
        if (this.fpsFrameCount >= this.fpsUpdateInterval) {
            // Calculate average FPS
            const sum = this.fpsValues.reduce((total, fps) => total + fps, 0);
            this.fpsAverage = Math.round(sum / this.fpsValues.length);
            this.fpsFrameCount = 0; // Reset counter
        }
        
        // Draw the display
        push();
        // Set up text style
        noStroke();
        textAlign(LEFT, BOTTOM);
        textSize(12);
        
        // Draw text with semi-transparent background
        fill(0, 0, 0, 120);
        rect(5, height - 25, 65, 20, 3);
        
        // Color changes based on performance
        if (this.fpsAverage >= 50) {
            fill(0, 255, 0); // Green for good framerate
        } else if (this.fpsAverage >= 30) {
            fill(255, 255, 0); // Yellow for acceptable framerate
        } else {
            fill(255, 0, 0); // Red for poor framerate
        }
        
        text(`FPS: ${this.fpsAverage}`, 10, height - 10);
        pop();
    }
    
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
                               btn.state === "VIEWING_SHIPYARD" || btn.state === "VIEWING_UPGRADES" ||
                               btn.state === "VIEWING_REPAIRS") {
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
            if (this.isClickInArea(mx, my, this.marketBackButtonArea)) { 
                if(gameStateManager) gameStateManager.setState("DOCKED"); 
                return true; 
            }
            
            return this.handleMarketMousePress(mx, my, market, player);
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
                        uiManager.addMessage("You bought a " + area.shipName + "!");
                    } else {
                        uiManager.addMessage("Not enough credits!");
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
                        uiManager.addMessage("You bought the " + area.upgrade.name + "!");
                    } else {
                        uiManager.addMessage("Not enough credits!");
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
        // --- VIEWING_REPAIRS State ---
        else if (currentState === "VIEWING_REPAIRS") {
            // Full repair
            if (this.isClickInArea(mx, my, this.repairsFullButtonArea)) {
                let missing = player.maxHull - player.hull;
                let cost = missing * 10;
                if (missing <= 0) {
                    uiManager.addMessage("Your ship is already fully repaired!");
                } else if (player.credits >= cost) {
                    player.spendCredits(cost);
                    player.hull = player.maxHull;
                    uiManager.addMessage(`Ship fully repaired for ${cost} credits.`);
                } else {
                    uiManager.addMessage(`Not enough credits! Full repair costs ${cost} credits.`);
                }
                return true;
            }
            // 50% repair
            if (this.isClickInArea(mx, my, this.repairsHalfButtonArea)) {
                let missing = player.maxHull - player.hull;
                let repairAmt = Math.min(missing, Math.ceil(player.maxHull / 2));
                let cost = repairAmt * 7;
                if (missing <= 0) {
                    uiManager.addMessage("Your ship is already fully repaired!");
                } else if (player.credits >= cost) {
                    player.spendCredits(cost);
                    player.hull += repairAmt;
                    if (player.hull > player.maxHull) player.hull = player.maxHull;
                    uiManager.addMessage(`Ship repaired by ${repairAmt} hull for ${cost} credits.`);
                } else {
                    uiManager.addMessage(`Not enough credits! 50% repair costs ${cost} credits.`);
                }
                return true;
            }
            // Back button
            if (this.isClickInArea(mx, my, this.repairsBackButtonArea)) {
                gameStateManager.setState("DOCKED");
                return true;
            }
            return false;
        }
        // --- GALAXY_MAP State ---
        else if (currentState === "GALAXY_MAP") { return this.handleGalaxyMapClicks(mx, my, galaxy, player, gameStateManager); }
        // --- GAME_OVER State ---
        else if (currentState === "GAME_OVER") { window.location.reload(); return true; }

        return false; // Click not handled by any relevant UI state
    } // End handleMouseClicks

    /** Helper to check if mouse coords are within a button area object {x,y,w,h} */
    isClickInArea(mx, my, area) {
        return area && area.w > 0 && area.h > 0 && mx > area.x && mx < area.x + area.w && my > area.y && my < area.y + area.h;
    }

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
            let price = ship.price;
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

    // Add a message to the queue
    addMessage(msg) {
        this.messages.push({ text: msg, time: millis() });
        // Keep only the last 10 messages (optional)
        if (this.messages.length > 10) this.messages.shift();
    }

    // Draw messages at the bottom of the screen
    drawMessages() {
        const now = millis();
        // Only show recent messages
        const recent = this.messages.filter(m => now - m.time < this.messageDisplayTime);
        const toShow = recent.slice(-this.maxMessagesToShow);

        push();
        textAlign(CENTER, BOTTOM);
        textSize(12);
        fill(255);
        noStroke();
        for (let i = 0; i < toShow.length; i++) {
            text(
                toShow[i].text,
                width / 2,
                height - 10 - (toShow.length - 1 - i) * 22
            );
        }
        pop();
    }

    // Update this method to check the back button first
    handleMarketMousePress(mx, my, market, player) {
        // First check if clicking on the back button
        if (this.isClickInArea(mx, my, this.marketBackButtonArea)) { 
            if(gameStateManager) gameStateManager.setState("DOCKED"); 
            return true; 
        }
        
        // Check if clicking on a market button
        for (const btn of this.marketButtonAreas) {
            if (this.isClickInArea(mx, my, btn)) {
                this.marketButtonHeld = btn;
                this.performMarketAction(btn, market, player);
                this.lastButtonAction = millis();
                return true;
            }
        }
        return false;
    }

    // Add this new method to handle mouse release
    handleMarketMouseRelease() {
        this.marketButtonHeld = null;
        return false;
    }

    // Add this new method to check for held buttons
    checkMarketButtonHeld(market, player) {
        if (this.marketButtonHeld && millis() - this.lastButtonAction > this.buttonRepeatDelay) {
            this.performMarketAction(this.marketButtonHeld, market, player);
            this.lastButtonAction = millis();
        }
    }

    // Add this new method to perform the market action
    performMarketAction(btn, market, player) {
        if (!market || !player || !btn) return;
        
        switch(btn.action) {
            case 'buy':
                market.buy(btn.commodity, 1, player);
                break;
            case 'buyAll':
                // Calculate max possible purchase based on cargo space and credits
                const item = market.getPrices().find(c => c.name === btn.commodity);
                if (!item) return;
                
                const availableSpace = player.cargoCapacity - player.getCargoAmount();
                const maxAffordable = Math.floor(player.credits / item.buyPrice);
                const quantity = Math.min(availableSpace, maxAffordable);
                
                if (quantity > 0) {
                    market.buy(btn.commodity, quantity, player);
                }
                break;
            case 'sell':
                market.sell(btn.commodity, 1, player);
                break;
            case 'sellAll':
                const cargo = player.cargo.find(c => c.name === btn.commodity);
                if (cargo && cargo.quantity > 0) {
                    market.sell(btn.commodity, cargo.quantity, player);
                }
                break;
        }
    }

} // End of UIManager Class