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

        this.totalOptions = NUM_SAVE_SLOTS + 1;
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
        if (typeof(Storage) !== "undefined") {
            for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
                const savedDataString = localStorage.getItem(SAVE_KEY_PREFIX + i);
                if (savedDataString) {
                    try {
                        this.savedGamePreviews[i] = JSON.parse(savedDataString);
                        console.log(`SaveSelectionScreen: Loaded preview for slot ${i} - data found.`);
                    } catch (e) {
                        console.error(`SaveSelectionScreen: Error parsing JSON for slot ${i} (Key: ${SAVE_KEY_PREFIX + i}). Treating as empty. Error:`, e);
                        this.savedGamePreviews[i] = null; // Only this slot is null
                        // Optional: localStorage.removeItem(SAVE_KEY_PREFIX + i); // to clear out bad data
                    }
                } else {
                    this.savedGamePreviews[i] = null;
                    console.log(`SaveSelectionScreen: No saved game found for slot ${i}`);
                }
            }
        } else {
            console.warn("SaveSelectionScreen: localStorage is not supported. Cannot load save previews.");
            // If localStorage is not supported at all, all previews will be null.
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
        
        // Draw save slots and rookie option
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
        const rookieOptionHeight = 60; 
        // Total height for all UI elements (3 slots + 1 rookie option + spacing between groups)
        const totalUIHeight = totalSlotsHeight + spacing + rookieOptionHeight;

        let startY = (height - totalUIHeight) / 2 + 20; 
        if (startY < height * 0.25) startY = height * 0.25; // Ensure it's not too high, adjusted margin

        // Draw the 3 save slots
        for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
            const currentSlotY = startY + i * (slotHeight + spacing);
            const slotData = this.savedGamePreviews[i];
            const title = slotData ? `CONTINUE (Slot ${i + 1})` : `NEW GAME (Slot ${i + 1})`;
            this.drawSlot(i, title, slotData, width/2 - slotWidth/2, currentSlotY, slotWidth, slotHeight, this.selectedOption === i);
        }

        // Draw the "Start New Rookie Pilot" option
        const rookieY = startY + NUM_SAVE_SLOTS * slotHeight + (NUM_SAVE_SLOTS > 0 ? NUM_SAVE_SLOTS * spacing : 0) ; // Position after all slots and their spacing
        this.drawRookieOption(width/2 - slotWidth/2, rookieY, slotWidth, rookieOptionHeight, this.selectedOption === NUM_SAVE_SLOTS);
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

        // Draw a star next to "CONTINUE" if it's a saved game slot
        if (data && title.startsWith("CONTINUE")) {
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
        
        if (data) {
            // Show saved game details
            textSize(20); // Adjusted for smaller slot
            fill(isSelected ? color(200, 220, 255) : color(100, 120, 150));
            
            const playerData = data.playerData;
            const galaxyData = data.galaxyData;
            
            const lineSpacing = 20; // Reverted to 18, or adjust as needed for three columns
            const col1X = x + 20 + hoverOffset;
            const col2X = x + w / 3 + hoverOffset; // First third for column 1
            const col3X = x + (w * 2/3) + hoverOffset; // Last third for column 3
            let line1Y = y + 35; // Initial Y for the first line in col1
            let line2Y = y + 35; // Initial Y for the first line in col2
            let line3Y = y + 35; // Initial Y for the first line in col3

            if (playerData) {
                noStroke();
                // Column 1 - Basic info
                text(`Credits: ${playerData.credits?.toLocaleString() || '0'}`, col1X, line1Y);
                line1Y += lineSpacing;
                
                text(`Ship: ${playerData.shipTypeName || 'Unknown'}`, col1X, line1Y);
                // line1Y += lineSpacing; // Increment if more items in col1

                // Column 2 - Alliance and Status
                text(`Alliance: ${playerData.playerFaction || 'None'}`, col2X, line2Y);
                line2Y += lineSpacing;

                // Wanted status with color coding
                push();
                const isWanted = playerData.isWanted || false;
                let wantedText = isWanted ? "Wanted" : "Clean";
                let wantedColor = isWanted ? color(255, 100, 0) : color(0, 255, 0); // Orange for wanted, green for clean
                
                fill(isSelected ? wantedColor : color(red(wantedColor) * 0.7, green(wantedColor) * 0.7, blue(wantedColor) * 0.7));
                text(`Status: ${wantedText}`, col2X, line2Y);
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
                text(`System: ${systemName}`, col3X, line3Y);
                line3Y += lineSpacing;

                text(`Rank: ${playerData.rank || 'Harmless'}`, col3X, line3Y);
                // line3Y += lineSpacing; // Increment if more items in col3
            }
            
            this.drawShipSilhouette(playerData?.shipTypeName || 'Sidewinder', 
                                  x + w - 70 + hoverOffset, y + h/2, isSelected); // Adjusted x offset
        } else if (title.startsWith("NEW GAME")) {
            // New game description
            textSize(20); // Adjusted for smaller slot
            fill(isSelected ? color(180, 200, 220) : color(100, 120, 140));
            let lineY = y + 35;
            const lineSpacing = 20;
            text("Begin a new adventure.", x + 20 + hoverOffset, lineY);
 
            this.drawNewGameIcon(x + w - 50 + hoverOffset, y + h/2, isSelected); // Adjusted x offset
        }
        
        pop();
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
        text("Sidewinder, 100 Credits, Fresh Start", x + w/2 + hoverOffset, y + h/2 + 15); // Second line

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
        
        text("↑↓ Select   ENTER Confirm   ESC Back", width/2, height * 0.85);
        
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
        const rookieOptionHeight = 60;
        const totalSlotsHeight = NUM_SAVE_SLOTS * slotHeight + (NUM_SAVE_SLOTS > 1 ? (NUM_SAVE_SLOTS - 1) * spacing : 0);
        const totalUIHeight = totalSlotsHeight + spacing + rookieOptionHeight;
        let startY = (height - totalUIHeight) / 2 + 20;
        if (startY < height * 0.25) startY = height * 0.25;
        
        const xPos = width/2 - slotWidth/2;

        // Check save slots
        for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
            const currentSlotY = startY + i * (slotHeight + spacing);
            if (mouseX >= xPos && mouseX <= xPos + slotWidth &&
                mouseY >= currentSlotY && mouseY <= currentSlotY + slotHeight) {
                this.selectedOption = i;
                this.confirmSelection();
                return;
            }
        }

        // Check rookie pilot option
        const rookieY = startY + NUM_SAVE_SLOTS * slotHeight + (NUM_SAVE_SLOTS > 0 ? NUM_SAVE_SLOTS * spacing : 0);
        if (mouseX >= xPos && mouseX <= xPos + slotWidth &&
            mouseY >= rookieY && mouseY <= rookieY + rookieOptionHeight) {
            this.selectedOption = NUM_SAVE_SLOTS;
            this.confirmSelection();
            return;
        }
    }

    addHoverEffect() {
        const slotHeight = 90;
        const spacing = 15;
        const rookieOptionHeight = 60;
        const totalSlotsHeight = NUM_SAVE_SLOTS * slotHeight + (NUM_SAVE_SLOTS > 1 ? (NUM_SAVE_SLOTS - 1) * spacing : 0);
        const totalUIHeight = totalSlotsHeight + spacing + rookieOptionHeight;
        let startY = (height - totalUIHeight) / 2 + 20;
        if (startY < height * 0.25) startY = height * 0.25;

        let effectY;
        if (this.selectedOption < NUM_SAVE_SLOTS) {
            // It's one of the save slots
            effectY = startY + this.selectedOption * (slotHeight + spacing) + slotHeight / 2;
        } else {
            // It's the rookie pilot option
            const rookieY = startY + NUM_SAVE_SLOTS * slotHeight + (NUM_SAVE_SLOTS > 0 ? NUM_SAVE_SLOTS * spacing : 0);
            effectY = rookieY + rookieOptionHeight / 2;
        }

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
        } else if (this.selectedOption === NUM_SAVE_SLOTS) {
            // Start New Rookie Pilot game
            console.log("Attempting to start new rookie pilot game...");
            this.startNewRookieGame();
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
        
        // Clear any existing save in this specific slot
        localStorage.removeItem(SAVE_KEY_PREFIX + slotIndex);
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
            player.credits = 100; // Rookie credits
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

        // Clear the chosen slot in localStorage
        localStorage.removeItem(SAVE_KEY_PREFIX + chosenSlotIndex);
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
