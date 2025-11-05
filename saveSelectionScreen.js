// ****** saveSelectionScreen.js ******

const NUM_SAVE_SLOTS = 3;
const SAVE_KEY_PREFIX = "eliteP5_save_"; // Ensure this matches sketch.js
const LAST_ACTIVE_SLOT_KEY = "eliteP5_lastActiveSlot"; // Key for storing the last active slot

class SaveSelectionScreen {
    constructor() {
        this.selectedOption = 0; // Default selection
        // Attempt to load and set the last active slot as the selected option
        const lastActiveSlot = localStorage.getItem(LAST_ACTIVE_SLOT_KEY);
        if (lastActiveSlot !== null) {
            const lastActiveSlotIndex = parseInt(lastActiveSlot, 10);
            if (!isNaN(lastActiveSlotIndex) && lastActiveSlotIndex >= 0 && lastActiveSlotIndex < NUM_SAVE_SLOTS) {
                this.selectedOption = lastActiveSlotIndex;
            } else {
                // Clear invalid stored data
                localStorage.removeItem(LAST_ACTIVE_SLOT_KEY);
            }
        }

        // Only the three slots are focusable; per-slot "Start New" is a click target
        this.totalOptions = NUM_SAVE_SLOTS;
        this.animationOffset = 0;
        this.buttonHoverEffects = [];
        
        this.savedGamePreviews = new Array(NUM_SAVE_SLOTS).fill(null);
        this.loadAllSavePreviews();
        
        // Visual effects
        this.bgStars = [];
        this.initBackgroundStars();

        // Bind methods to ensure 'this' context is correct when called by GameStateManager or other external callers
        this.draw = this.draw.bind(this);
        this.update = this.update.bind(this);
        this.handleKeyPressed = this.handleKeyPressed.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.resize = this.resize.bind(this);
    }

    // Formats a timestamp (ms) into a compact date-time string for slot titles
    formatSavedAt(ts) {
        if (!ts) return "Unknown date";
        const d = new Date(ts);
        if (isNaN(d.getTime())) return "Unknown date";
        // Example: 27 Oct 2025, 14:05
        const opts = { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        return d.toLocaleString(undefined, opts);
    }

    // Returns the index of the most recent saved slot (by savedAt), or -1 if none
    getMostRecentSaveSlotIndex() {
        let bestIdx = -1;
        let bestTs = -Infinity;
        for (let i = 0; i < this.savedGamePreviews.length; i++) {
            const d = this.savedGamePreviews[i];
            const t = d?.savedAt;
            if (typeof t === 'number' && isFinite(t) && t > bestTs) {
                bestTs = t;
                bestIdx = i;
            }
        }
        return bestIdx;
    }
    
    /**
     * Computes Elite rank from kill count
     * This mirrors the logic in Player.getEliteRating()
     * @param {number} kills - Number of kills
     * @returns {string} The Elite rating
     */
    getRankFromKills(kills) {
        if (!kills || kills < 0) return "Harmless";
        if (kills >= 6400) return "Elite";
        if (kills >= 2560) return "Deadly";
        if (kills >= 512) return "Dangerous";
        if (kills >= 128) return "Competent";
        if (kills >= 64) return "Above Average";
        if (kills >= 32) return "Average";
        if (kills >= 16) return "Poor";
        if (kills >= 8) return "Mostly Harmless";
        return "Harmless";
    }
    
    initBackgroundStars() {
        // Create simple background stars for atmosphere
        this.bgStars = [];
        for (let i = 0; i < 100; i++) {
            this.bgStars.push({
                x: random(windowWidth || 800),
                y: random(windowHeight || 600),
                brightness: random(50, 255),
                size: random(1, 3),
                twinkle: random(0, TWO_PI)
            });
        }
    }
    
    loadAllSavePreviews() {
        const validatePreview = (obj) => {
            if (!obj) return false;
            if (!obj.playerData || !obj.galaxyData) return false;
            const cr = obj.playerData.credits;
            if (typeof cr !== 'number' || !isFinite(cr)) return false;
            if (obj.currentSystemIndex === undefined || obj.currentSystemIndex === null) return false;
            return true;
        };

        if (typeof(Storage) !== "undefined") {
            for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
                const primaryKey = SAVE_KEY_PREFIX + i;
                const backupKey = primaryKey + '_bak';
                const primaryStr = localStorage.getItem(primaryKey);
                const backupStr = localStorage.getItem(backupKey);
                let data = null;
                let recovered = false;

                if (primaryStr) {
                    try {
                        const parsed = JSON.parse(primaryStr);
                        if (validatePreview(parsed)) {
                            data = parsed;
                        }
                    } catch (e) {
                        // fall through to backup
                    }
                }

                if (!data && backupStr) {
                    try {
                        const parsedBak = JSON.parse(backupStr);
                        if (validatePreview(parsedBak)) {
                            data = parsedBak;
                            recovered = true;
                        }
                    } catch (e) {
                        // leave as null
                    }
                }

                if (data) {
                    // Tag the data so draw can render a subtle badge without changing call sites
                    data.__recovered = recovered;
                    this.savedGamePreviews[i] = data;
                    console.log(`SaveSelectionScreen: Loaded preview for slot ${i} (${recovered ? 'from backup' : 'primary'}).`);
                } else {
                    this.savedGamePreviews[i] = null;
                    console.log(`SaveSelectionScreen: No valid saved game found for slot ${i}`);
                }
            }
        } else {
            console.warn("SaveSelectionScreen: localStorage is not supported. Cannot load save previews.");
            this.savedGamePreviews = new Array(NUM_SAVE_SLOTS).fill(null);
        }
    }
    
    update(deltaTime) {
        // Update animation offset for subtle movement
        this.animationOffset += deltaTime * 0.001;
        
        // Update background star twinkling
        for (let star of this.bgStars) {
            star.twinkle += deltaTime * 0.002; // Consider using this.animationOffset for a more continuous effect if desired
        }
        
        // Update button hover effects
        this.buttonHoverEffects = this.buttonHoverEffects.filter(effect => {
            effect.life -= deltaTime * 0.003;
            effect.size += deltaTime * 0.05;
            return effect.life > 0;
        });
    }

    drawBackground() {
        // Dark space background
        background(5, 5, 15);
        
        // Draw twinkling stars
        push();
        noStroke();
        for (let star of this.bgStars) {
            // Use this.animationOffset in the twinkle calculation for continuous animation
            const twinkleAlpha = (sin(star.twinkle + this.animationOffset * 0.5) * 0.4 + 0.6); 
            fill(star.brightness * twinkleAlpha);
            ellipse(star.x, star.y, star.size);
        }
        pop();
        
        // Subtle gradient overlay from top
        push();
        for (let i = 0; i < height * 0.4; i++) { // Increased gradient height
            const alpha = map(i, 0, height * 0.4, 0, 35); // Slightly increased alpha
            stroke(10, 15, 30, alpha); // Darker, bluer gradient
            line(0, i, width, i);
        }
        pop();
    }

    drawTitle() {
        push();
        textAlign(CENTER, CENTER);
        
        if (typeof font !== 'undefined') {
            textFont(font);
        }
        
        // Main title
        textSize(48);
        fill(210, 200, 255); // Slightly brighter purple

        fill(210, 200, 255);
        text("COMMANDER", width/2, height * 0.15);
        
        // Subtitle
        textSize(24);
        fill(160, 160, 210); // Slightly brighter blue/purple
        // Shadow for subtitle

        fill(160, 160, 210);
        text("Select Save Game", width/2, height * 0.22);
        
        pop();
    }
    
    draw() {
        // Draw background
        this.drawBackground();
        
        // Draw title
        this.drawTitle();
        
        // Draw save slots with per-slot actions
        this.drawOptionsUI();
        
        // Draw instructions
        this.drawInstructions();
    }

    drawOptionsUI() {
        const slotHeight = 90;
        const slotWidth = width * 0.7;
        const spacing = 15;
        // Height for the 3 save slots
        const totalSlotsHeight = NUM_SAVE_SLOTS * slotHeight + (NUM_SAVE_SLOTS > 1 ? (NUM_SAVE_SLOTS - 1) * spacing : 0);
        // Total height for all UI elements (just the 3 slots)
        const totalUIHeight = totalSlotsHeight;

        let startY = (height - totalUIHeight) / 2 + 20;
        if (startY < height * 0.25) startY = height * 0.25; // Ensure it's not too high, adjusted margin

        // Draw the 3 save slots (each contains its own "Start New" button on the right)
        for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
            const currentSlotY = startY + i * (slotHeight + spacing);
            const slotData = this.savedGamePreviews[i];
            const title = slotData
                ? `${this.formatSavedAt(slotData.savedAt)}`
                : `EMPTY SLOT`;
            this.drawSlot(i, title, slotData, width/2 - slotWidth/2, currentSlotY, slotWidth, slotHeight, this.selectedOption === i);
        }
    }
    
    // drawSlot signature changes: add isSelected parameter
    drawSlot(slotIndex, title, data, x, y, w, h, isSelected) {
        push();
        
        // Use the game font if available
        if (font) {
            textFont(font);
        }
        
        // const isSelected = this.selectedSlot === slotIndex; // This line is replaced by the parameter
        const hoverOffset = isSelected ? sin(this.animationOffset * 2) * 3 : 0;
        
        // Slot background
        if (isSelected) {
            // Selected slot - glowing border
            stroke(100, 200, 255, 150);
            strokeWeight(1);
            fill(20, 40, 80, 100);
        } else {
            // Unselected slot
            stroke(80, 80, 120, 100);
            strokeWeight(1);
            fill(15, 25, 45, 80);
        }
        
        rect(x + hoverOffset, y, w, h, 8);
        
        // Slot content
        textAlign(LEFT, TOP);
        
        // Title
        textSize(18); // Slightly smaller for more slots
        fill(isSelected ? color(150, 200, 255) : color(120, 140, 180));
        text(title, x + 20 + hoverOffset, y + 10); // Adjusted y for title

        // Draw a star next to the title only for the most recently saved slot
        const isMostRecent = data && (slotIndex === this.getMostRecentSaveSlotIndex());
        if (isMostRecent) {
            push();
            fill(255, 223, 0); // Gold color for the star
            noStroke();
            beginShape();
            const starX = x + textWidth(title) + 30 + hoverOffset; // Position after the title
            const starY = y + 20; // Align with title
            const starSize = 7; // Slightly smaller
            for (let i = 0; i < 5; i++) {
                vertex(starX + cos(TWO_PI * i / 5 - HALF_PI) * starSize, starY + sin(TWO_PI * i / 5 - HALF_PI) * starSize);
                vertex(starX + cos(TWO_PI * (i + 0.5) / 5 - HALF_PI) * starSize / 2, starY + sin(TWO_PI * (i + 0.5) / 5 - HALF_PI) * starSize / 2);
            }
            endShape(CLOSE);
            pop();
        }
        
        // Compute 5-column layout within this slot; the last column hosts the Start New button
        const columns = this.computeSlotColumns(x + hoverOffset, y, w, h);
        // Precompute button rect (column 5 / index 4)
        const btnRect = this.getStartNewButtonRect(x + hoverOffset, y, w, h);

        if (data) {
            // Show saved game details
            textSize(20); // Adjusted for smaller slot
            fill(isSelected ? color(200, 220, 255) : color(100, 120, 150));
            
            const playerData = data.playerData;
            const galaxyData = data.galaxyData;
            
            const lineSpacing = 20;
            // Column mapping:
            // col 0: ship silhouette (graphic)
            // col 1: credits, ship
            // col 2: alliance, status
            // col 3: system, rank
            // col 4: Start New button (already computed)
            const col1Pad = 8;
            const col2Pad = 8;
            const col3Pad = 8;
            const col1X = columns[1].x + col1Pad;
            const col1Max = columns[1].w - 2 * col1Pad;
            const col2X = columns[2].x + col2Pad;
            const col2Max = columns[2].w - 2 * col2Pad;
            const col3X = columns[3].x + col3Pad;
            const col3Max = columns[3].w - 2 * col3Pad;
            let line1Y = y + 35;
            let line2Y = y + 35;
            let line3Y = y + 35;

            if (playerData) {
                noStroke();
                // Column 1 - Basic info
                text(this.truncateText(`Credits: ${playerData.credits?.toLocaleString() || '0'}`, col1Max), col1X, line1Y);
                line1Y += lineSpacing;
                
                text(this.truncateText(`Ship: ${playerData.shipTypeName || 'Unknown'}`, col1Max), col1X, line1Y);
                // line1Y += lineSpacing; // Increment if more items in col1

                // Column 2 - Alliance and Status
                // Alliance shows Police if the player is a police officer; otherwise show joined faction or None
                const allianceText = (playerData.isPolice ? 'POLICE' : (playerData.playerFaction || 'None'));
                text(this.truncateText(`Alliance: ${allianceText}`, col2Max), col2X, line2Y);
                line2Y += lineSpacing;

                // Wanted status with color coding (prefer system-level wanted status)
                push();
                const sysData = (galaxyData && Array.isArray(galaxyData.systems)) ? galaxyData.systems[data.currentSystemIndex] : null;
                // Prefer system-level wanted; fall back to player flag for backward compatibility
                const isWanted = (sysData && typeof sysData.playerWanted === 'boolean') ? sysData.playerWanted : (playerData.isWanted || false);
                const wantedLevel = (sysData && typeof sysData.playerWantedLevel === 'number') ? sysData.playerWantedLevel : 0;
                let wantedText = isWanted ? (wantedLevel > 0 ? `Wanted (Lv ${wantedLevel})` : "Wanted") : "Clean";
                let wantedColor = isWanted ? color(255, 100, 0) : color(0, 255, 0); // Orange for wanted, green for clean
                
                fill(isSelected ? wantedColor : color(red(wantedColor) * 0.7, green(wantedColor) * 0.7, blue(wantedColor) * 0.7));
                text(this.truncateText(`Status: ${wantedText}`, col2Max), col2X, line2Y);
                pop();
                // line2Y += lineSpacing; // Increment if more items in col2

                // Column 3 - Location and Rank
                let systemName = "Unknown System";
                if (galaxyData && galaxyData.systems && data.currentSystemIndex !== undefined) {
                    const currentSystem = galaxyData.systems[data.currentSystemIndex];
                    if (currentSystem && currentSystem.name) {
                        systemName = currentSystem.name;
                    }
                }
                text(this.truncateText(`System: ${systemName}`, col3Max), col3X, line3Y);
                line3Y += lineSpacing;

                const pilotRank = this.getRankFromKills(playerData.kills);
                text(this.truncateText(`Rank: ${pilotRank}`, col3Max), col3X, line3Y);
                // line3Y += lineSpacing; // Increment if more items in col3
            }
            // Ship silhouette in column 0 area (left cluster)
            const shipCenterX = columns[0].x + columns[0].w / 2;
            this.drawShipSilhouette(playerData?.shipTypeName || 'Sidewinder', shipCenterX, y + h/2, isSelected);

            // Subtle recovered badge when preview came from backup
            if (data.__recovered) {
                push();
                textAlign(RIGHT, TOP);
                textSize(10);
                fill(180, 160, 80);
                text("recovered", x + w - 10 + hoverOffset, y + 8);
                pop();
            }
        } else {
            // New game description
            textSize(20); // Adjusted for smaller slot
            fill(isSelected ? color(180, 200, 220) : color(100, 120, 140));
            let lineY = y + 35;
            const lineSpacing = 20;
            // Columned layout (ship/icon in col0, text across col1-col3)
            const columns = this.computeSlotColumns(x + hoverOffset, y, w, h);
            const textColX = columns[1].x + 8;
            const textColMax = columns[1].w - 16; // only one line here, so narrow is fine
            text(this.truncateText("Begin a new adventure.", textColMax), textColX, lineY);

            // Place the new game icon where the ship would be (col0)
            const shipCenterX = columns[0].x + columns[0].w / 2;
            this.drawNewGameIcon(shipCenterX, y + h/2, isSelected);
        }

        // Per-slot "Start New" button on the right side (5th column)
        const btn = btnRect; // already computed above
        const isMouseOverBtn = mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h;
        const hasSave = !!data;

        push();
        // Button background
        if (isMouseOverBtn) {
            stroke(120, 200, 255, 220);
            strokeWeight(2);
            fill(30, 60, 90, 180);
        } else {
            stroke(80, 120, 160, 160);
            strokeWeight(1);
            fill(20, 40, 70, 140);
        }
        rect(btn.x, btn.y, btn.w, btn.h, 6);
        // Button label
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(14);
        fill(isMouseOverBtn ? color(180, 230, 255) : color(150, 190, 220));
        const label = hasSave ? "Start New (Overwrite)" : "Start New";
        text(label, btn.x + btn.w/2, btn.y + btn.h/2);
        pop();
        
        pop();
    }

    // Compute the rect for the per-slot Start New button (placed within column 5)
    getStartNewButtonRect(x, y, w, h) {
        const cols = this.computeSlotColumns(x, y, w, h);
        const col = cols[4]; // last column
        const padding = 10;
        const btnW = min(180, col.w - padding * 2);
        const btnH = 32;
        const btnX = col.x + col.w - padding - btnW; // right-align within column
        const btnY = y + h/2 - btnH/2;
        return { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    // 5-column layout helper for a slot
    computeSlotColumns(x, y, w, h) {
        const paddingLeft = 16;
        const paddingRight = 16;
        const colGap = 12;
        const innerWidth = w - paddingLeft - paddingRight - colGap * 4;
        const colW = max(60, innerWidth / 5);
        const cols = [];
        let curX = x + paddingLeft;
        for (let i = 0; i < 5; i++) {
            cols.push({ x: curX, y, w: colW, h });
            curX += colW + colGap;
        }
        return cols;
    }

    // Truncate text to fit maxWidth, adding ellipsis if needed
    truncateText(str, maxWidth) {
        if (!str) return '';
        if (textWidth(str) <= maxWidth) return str;
        let s = str;
        while (s.length > 1 && textWidth(s + '…') > maxWidth) {
            s = s.slice(0, -1);
        }
        return s + '…';
    }
    
    drawShipSilhouette(shipType, x, y, isSelected) {
        //console.log(`drawShipSilhouette called for shipType: ${shipType} at x:${x}, y:${y}`);
        push();
        translate(x, y);
        
        const shipDef = SHIP_DEFINITIONS[shipType];
        if (shipDef && typeof shipDef.drawFunction === 'function') {
            //console.log(`Using shipDef for ${shipType}. Attempting to draw ACTUAL ship with size: ${shipDef.size}`);
            scale(0.8); // Reverted to previous scale
            fill(255, 0, 0); // Reverted to red fill for visibility
            noStroke();
            
            // Call the ship's draw function with its defined size
            if (typeof shipDef.size === 'number') {
                shipDef.drawFunction(shipDef.size); // Pass the base size
            } else {
                console.warn(`Ship type ${shipType} has no defined size. Drawing with default size 30.`);
                shipDef.drawFunction(30); // Fallback size
            }

        } else {
            console.log(`Using FALLBACK drawing for ${shipType}`); 
            scale(0.8); 
            fill(255, 0, 0); 
            noStroke();
            ellipseMode(CENTER);
            ellipse(0, 0, 30, 30); 
        }
        
        pop();
    }
    
    drawNewGameIcon(x, y, isSelected) {
        push();
        translate(x, y);
        
        const glowAlpha = isSelected ? (sin(this.animationOffset * 3) * 0.3 + 0.7) * 100 : 50;
        
        // Star icon for new game
        fill(isSelected ? color(255, 220, 100, glowAlpha) : color(150, 130, 80, 80));
        noStroke();
        
        // Draw star shape
        const spikes = 8;
        const outerRadius = 20;
        const innerRadius = 10;
        
        beginShape();
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i / (spikes * 2)) * TWO_PI;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x_pos = cos(angle) * radius;
            const y_pos = sin(angle) * radius;
            vertex(x_pos, y_pos);
        }
        endShape(CLOSE);
        
        pop();
    }
    
    drawRookieOption(x, y, w, h, isSelected) {
        push();
        if (font) textFont(font);

        const hoverOffset = isSelected ? sin(this.animationOffset * 2) * 3 : 0;

        if (isSelected) {
            stroke(100, 255, 100, 200); // Greenish glow for rookie
            strokeWeight(3);
            fill(20, 80, 40, 150);
        } else {
            stroke(80, 120, 80, 120);
            strokeWeight(1);
            fill(15, 45, 25, 100);
        }
        rect(x + hoverOffset, y, w, h, 8);

        textAlign(CENTER, CENTER);
        
        fill(isSelected ? color(180, 255, 180) : color(120, 180, 120));
        textSize(18);
        text("START NEW ROOKIE PILOT", x + w/2 + hoverOffset, y + h/2 - 5); // Adjusted for two lines

        textSize(12);
        fill(isSelected ? color(150, 200, 150) : color(100, 140, 100));
        text("Sidewinder, 1000 Credits, Fresh Start", x + w/2 + hoverOffset, y + h/2 + 15); // Second line (updated to 1000 credits)

        pop();
    }

    drawInstructions() {
        push();
        textAlign(CENTER, CENTER);
        
        // Use the game font if available
        if (font) {
            textFont(font);
        }
        
        textSize(16);
        fill(120, 140, 180);
        
        text("↑↓ Select slot   ENTER Continue   Click 'Start New' to overwrite   ESC Back", width/2, height * 0.85);
        
        pop();
    }
    
    handleKeyPressed(key, keyCode) {
        if (keyCode === UP_ARROW) {
            this.selectedOption = (this.selectedOption - 1 + this.totalOptions) % this.totalOptions;
            this.addHoverEffect();
        } else if (keyCode === DOWN_ARROW) {
            this.selectedOption = (this.selectedOption + 1) % this.totalOptions;
            this.addHoverEffect();
        } else if (keyCode === ENTER) {
            this.confirmSelection();
        } else if (keyCode === ESCAPE) {
            // Go back to title screen
            if (gameStateManager && typeof gameStateManager.setState === 'function') {
                gameStateManager.setState("TITLE_SCREEN");
            }
        }
    }
    
    handleClick(mouseX, mouseY) {
        const slotHeight = 90;
        const slotWidth = width * 0.7;
        const spacing = 15;
        const totalSlotsHeight = NUM_SAVE_SLOTS * slotHeight + (NUM_SAVE_SLOTS > 1 ? (NUM_SAVE_SLOTS - 1) * spacing : 0);
        const totalUIHeight = totalSlotsHeight;
        let startY = (height - totalUIHeight) / 2 + 20;
        if (startY < height * 0.25) startY = height * 0.25;
        
        const xPos = width/2 - slotWidth/2;

        // Check save slots (including per-slot Start New button)
        for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
            const currentSlotY = startY + i * (slotHeight + spacing);
            const isSelected = this.selectedOption === i;
            const hoverOffset = isSelected ? sin(this.animationOffset * 2) * 3 : 0;
            // First check the Start New button region (account for hover offset)
            const btn = this.getStartNewButtonRect(xPos + hoverOffset, currentSlotY, slotWidth, slotHeight);
            if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
                this.selectedOption = i; // Focus the slot
                // Explicitly start a new game in this slot (overwrites if present)
                this.startNewGame(i);
                return;
            }
            // Otherwise, clicking the slot continues existing game (or starts a new one if empty)
            if (mouseX >= xPos + hoverOffset && mouseX <= xPos + hoverOffset + slotWidth &&
                mouseY >= currentSlotY && mouseY <= currentSlotY + slotHeight) {
                this.selectedOption = i;
                this.confirmSelection();
                return;
            }
        }
    }

    addHoverEffect() {
        const slotHeight = 90;
        const spacing = 15;
        const totalSlotsHeight = NUM_SAVE_SLOTS * slotHeight + (NUM_SAVE_SLOTS > 1 ? (NUM_SAVE_SLOTS - 1) * spacing : 0);
        const totalUIHeight = totalSlotsHeight;
        let startY = (height - totalUIHeight) / 2 + 20;
        if (startY < height * 0.25) startY = height * 0.25;

        let effectY;
        // It's one of the save slots
        effectY = startY + this.selectedOption * (slotHeight + spacing) + slotHeight / 2;

        this.buttonHoverEffects.push({
            x: width/2,
            y: effectY,
            size: 0,
            life: 1.0
        });
    }
    
    confirmSelection() {
        if (this.selectedOption < NUM_SAVE_SLOTS) {
            const slotIndex = this.selectedOption;
            if (this.savedGamePreviews[slotIndex]) {
                // Load saved game
                console.log(`Loading saved game from slot ${slotIndex}...`);
                this.loadSavedGame(slotIndex);
            } else {
                // New Game
                console.log(`Starting new game in slot ${slotIndex}...`);
                this.startNewGame(slotIndex);
            }
        }
    }
    
    startNewGame(slotIndex) {
        // Reset game state for new game
        if (player) {
            // Reset player to default new game state
            player.credits = 1000;
            player.hull = player.maxHull;
            player.shield = player.maxShield;
            player.cargo = [];
            player.kills = 0;
            player.isWanted = false;
            player.activeMission = null;
            player.applyShipDefinition("Sidewinder");
        }
        
        if (galaxy) {
            // Generate new galaxy
            globalSessionSeed = millis();
            galaxy.initGalaxySystems(globalSessionSeed);
            
            // Position player near starting station
            const startingSystem = galaxy?.getCurrentSystem();
            if (startingSystem && startingSystem.station && startingSystem.station.pos) {
                player.pos.set(startingSystem.station.pos.x + startingSystem.station.size + 100, 
                             startingSystem.station.pos.y);
                player.angle = PI;
                player.currentSystem = startingSystem;
                startingSystem.player = player;
                startingSystem.enterSystem(player);
                
                if (eventManager) {
                    eventManager.initializeReferences(startingSystem, player, uiManager);
                }
            }
        }
        
        // Clear any existing save in this specific slot (both primary and backup)
        localStorage.removeItem(SAVE_KEY_PREFIX + slotIndex);
        localStorage.removeItem(SAVE_KEY_PREFIX + slotIndex + '_bak'); // Also remove backup to prevent promotion
        window.activeSaveSlotIndex = slotIndex; // Set active slot for saving
        localStorage.setItem(LAST_ACTIVE_SLOT_KEY, slotIndex.toString()); // Store as last active slot
        
        // Transition to game
        gameStateManager.setState("IN_FLIGHT");
    }
    
    loadSavedGame(slotIndex) {
        // Use existing global loadGame function, now expecting a slotIndex
        const success = loadGame(slotIndex); // loadGame in sketch.js should handle setting activeSaveSlotIndex
        if (success) {
            // window.activeSaveSlotIndex = slotIndex; // Already set by global loadGame
            // The global loadGame function should also set LAST_ACTIVE_SLOT_KEY
            gameStateManager.setState("IN_FLIGHT");
        } else {
            console.error(`Failed to load saved game from slot ${slotIndex}`);
            // Could show error message or fallback
            // For now, let's try to load previews again in case something was cleared
            this.loadAllSavePreviews(); // Ensure previews are up-to-date if load failed
        }
    }

    startNewRookieGame() {
        let chosenSlotIndex = -1;
        // Try to find an empty slot
        for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
            if (!this.savedGamePreviews[i]) {
                chosenSlotIndex = i;
                break;
            }
        }
        // If all slots are full, overwrite the first slot (index 0)
        if (chosenSlotIndex === -1) {
            chosenSlotIndex = 0;
            console.warn(`All save slots full. Rookie game will overwrite slot ${chosenSlotIndex + 1}.`);
        } else {
            console.log(`New rookie game will use empty slot ${chosenSlotIndex + 1}.`);
        }

        // Reset player for rookie game
        if (player) {
            player.credits = 1000; // Rookie credits (updated from 100 to 1000)
            player.hull = player.maxHull; 
            player.shield = player.maxShield; 
            player.cargo = [];
            player.kills = 0;
            player.isWanted = false;
            player.activeMission = null;
            if (typeof player.applyShipDefinition === 'function') {
                player.applyShipDefinition("Sidewinder"); 
            } else {
                console.error("player.applyShipDefinition is not a function. Cannot set ship for rookie.");
            }
            // Any other rookie-specific setup
        } else {
            console.error("Player object not found. Cannot start rookie game.");
            return;
        }

        if (galaxy) {
            globalSessionSeed = millis(); 
            galaxy.initGalaxySystems(globalSessionSeed);

            const startingSystem = galaxy.getCurrentSystem();
            if (startingSystem && startingSystem.station && startingSystem.station.pos) {
                player.pos.set(startingSystem.station.pos.x + startingSystem.station.size + 100,
                                 startingSystem.station.pos.y);
                player.angle = PI;
                player.currentSystem = startingSystem;
                startingSystem.player = player; // Link player to system
                if (typeof startingSystem.enterSystem === 'function') {
                    startingSystem.enterSystem(player);
                }


                if (eventManager && typeof eventManager.initializeReferences === 'function') {
                    eventManager.initializeReferences(startingSystem, player, uiManager);
                }
            } else {
                console.error("Failed to set up starting system for rookie game.");
                return; 
            }
        } else {
            console.error("Galaxy object not found. Cannot start rookie game.");
            return;
        }

        // Clear the chosen slot in localStorage (both primary and backup)
        localStorage.removeItem(SAVE_KEY_PREFIX + chosenSlotIndex);
        localStorage.removeItem(SAVE_KEY_PREFIX + chosenSlotIndex + '_bak'); // Also remove backup to prevent promotion
        window.activeSaveSlotIndex = chosenSlotIndex; // Associate this game with the chosen slot
        localStorage.setItem(LAST_ACTIVE_SLOT_KEY, chosenSlotIndex.toString()); // Store as last active slot

        this.loadAllSavePreviews(); // Refresh previews as one slot is now effectively new/empty
        
        if (gameStateManager && typeof gameStateManager.setState === 'function') {
            gameStateManager.setState("IN_FLIGHT");
        } else {
            console.error("GameStateManager not found. Cannot transition to in-flight state.");
        }
    }
    
    // Method to reinitialize stars when window is resized
    resize() {
        this.initBackgroundStars();
        // Potentially re-calculate slot positions if they depend on width/height directly
        // and are not recalculated in drawSaveSlots.
    }
}
