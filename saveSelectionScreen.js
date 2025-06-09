// ****** saveSelectionScreen.js ******

class SaveSelectionScreen {
    constructor() {
        this.selectedSlot = 0; // 0 = New Game, 1 = Saved Game (if exists)
        this.maxSlots = 2; // New Game + 1 save slot for now
        this.animationOffset = 0;
        this.buttonHoverEffects = [];
        
        // Load saved game data for preview
        this.savedGameData = null;
        this.loadSavedGamePreview();

        // If a saved game exists, make it the default selection
        if (this.savedGameData) {
            this.selectedSlot = 1;
        }
        
        // Visual effects
        this.bgStars = [];
        this.initBackgroundStars();
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
    
    loadSavedGamePreview() {
        try {
            if (typeof(Storage) !== "undefined") {
                const savedDataString = localStorage.getItem(SAVE_KEY);
                if (savedDataString) {
                    this.savedGameData = JSON.parse(savedDataString);
                    console.log("SaveSelectionScreen: Loaded save preview data");
                } else {
                    this.savedGameData = null;
                    console.log("SaveSelectionScreen: No saved game found");
                }
            }
        } catch (e) {
            console.error("SaveSelectionScreen: Error loading save preview:", e);
            this.savedGameData = null;
        }
    }
    
    update(deltaTime) {
        // Update animation offset for subtle movement
        this.animationOffset += deltaTime * 0.001;
        
        // Update background star twinkling
        for (let star of this.bgStars) {
            star.twinkle += deltaTime * 0.002;
        }
        
        // Update button hover effects
        this.buttonHoverEffects = this.buttonHoverEffects.filter(effect => {
            effect.life -= deltaTime * 0.003;
            effect.size += deltaTime * 0.05;
            return effect.life > 0;
        });
    }
    
    draw() {
        // Draw background
        this.drawBackground();
        
        // Draw title
        this.drawTitle();
        
        // Draw save slots
        this.drawSaveSlots();
        
        // Draw instructions
        this.drawInstructions();
    }
    
    drawBackground() {
        // Dark space background
        background(5, 5, 15);
        
        // Draw twinkling stars
        push();
        noStroke();
        for (let star of this.bgStars) {
            const twinkleAlpha = (sin(star.twinkle) * 0.3 + 0.7);
            fill(star.brightness * twinkleAlpha);
            ellipse(star.x, star.y, star.size);
        }
        pop();
        
        // Subtle gradient overlay
        push();
        for (let i = 0; i < height * 0.3; i++) {
            const alpha = map(i, 0, height * 0.3, 0, 30);
            stroke(10, 20, 40, alpha);
            line(0, i, width, i);
        }
        pop();
    }
    
    drawTitle() {
        push();
        textAlign(CENTER, CENTER);
        
        // Use the game font if available
        if (font) {
            textFont(font);
        }
        
        // Main title
        textSize(48);
        fill(200, 180, 255);
        text("COMMANDER", width/2, height * 0.15);
        
        // Subtitle
        textSize(24);
        fill(150, 150, 200);
        text("Select Your Destiny", width/2, height * 0.22);
        
        pop();
    }
    
    drawSaveSlots() {
        const slotHeight = 120;
        const slotWidth = width * 0.6;
        const startY = height * 0.35;
        const spacing = slotHeight + 20;
        
        // Draw New Game slot
        this.drawSlot(0, "NEW GAME", null, width/2 - slotWidth/2, startY, slotWidth, slotHeight);
        
        // Draw saved game slot if it exists
        if (this.savedGameData) {
            this.drawSlot(1, "CONTINUE", this.savedGameData, width/2 - slotWidth/2, startY + spacing, slotWidth, slotHeight);
        } else {
            this.drawEmptySlot(1, width/2 - slotWidth/2, startY + spacing, slotWidth, slotHeight);
        }
    }
    
    drawSlot(slotIndex, title, data, x, y, w, h) {
        push();
        
        // Use the game font if available
        if (font) {
            textFont(font);
        }
        
        const isSelected = this.selectedSlot === slotIndex;
        const hoverOffset = isSelected ? sin(this.animationOffset * 2) * 3 : 0;
        
        // Slot background
        if (isSelected) {
            // Selected slot - glowing border
            stroke(100, 200, 255, 150);
            strokeWeight(3);
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
        textSize(20);
        fill(isSelected ? color(150, 200, 255) : color(120, 140, 180));
        text(title, x + 20 + hoverOffset, y + 15);

        // Draw a star next to "CONTINUE" if it's a saved game slot
        if (data && title === "CONTINUE") {
            push();
            fill(255, 223, 0); // Gold color for the star
            noStroke();
            beginShape();
            const starX = x + textWidth(title) + 30 + hoverOffset; // Position after the title
            const starY = y + 25; // Align with title
            const starSize = 8;
            for (let i = 0; i < 5; i++) {
                vertex(starX + cos(TWO_PI * i / 5 - HALF_PI) * starSize, starY + sin(TWO_PI * i / 5 - HALF_PI) * starSize);
                vertex(starX + cos(TWO_PI * (i + 0.5) / 5 - HALF_PI) * starSize / 2, starY + sin(TWO_PI * (i + 0.5) / 5 - HALF_PI) * starSize / 2);
            }
            endShape(CLOSE);
            pop();
        }
        
        if (data) {
            // Show saved game details
            textSize(14);
            fill(isSelected ? color(200, 220, 255) : color(100, 120, 150));
            
            const playerData = data.playerData;
            const galaxyData = data.galaxyData;
            
            if (playerData) {
                // Credits
                text(`Credits: ${playerData.credits?.toLocaleString() || '0'}`, x + 20 + hoverOffset, y + 45);
                
                // Ship
                text(`Ship: ${playerData.shipTypeName || 'Unknown'}`, x + 20 + hoverOffset, y + 65);
                
                // Current system (try to get from galaxy data)
                let systemName = "Unknown System";
                if (galaxyData && galaxyData.systems && data.currentSystemIndex !== undefined) {
                    const currentSystem = galaxyData.systems[data.currentSystemIndex];
                    if (currentSystem && currentSystem.name) {
                        systemName = currentSystem.name;
                    }
                }
                text(`System: ${systemName}`, x + 20 + hoverOffset, y + 85);
            }
            
            // Ship silhouette on the right
            this.drawShipSilhouette(playerData?.shipTypeName || 'Sidewinder', 
                                  x + w - 80 + hoverOffset, y + h/2, isSelected);
        } else if (title === "NEW GAME") {
            // New game description
            textSize(14);
            fill(isSelected ? color(180, 200, 220) : color(100, 120, 140));
            text("Begin a new adventure as a rookie pilot", x + 20 + hoverOffset, y + 45);
            text("with a Sidewinder in a random system", x + 20 + hoverOffset, y + 65);
            text("and 1000 credits", x + 20 + hoverOffset, y + 85);
            
            // New game icon
            this.drawNewGameIcon(x + w - 60 + hoverOffset, y + h/2, isSelected);
        }
        
        pop();
    }
    
    drawEmptySlot(slotIndex, x, y, w, h) {
        push();
        
        // Use the game font if available
        if (font) {
            textFont(font);
        }
        
        const isSelected = this.selectedSlot === slotIndex;
        
        // Empty slot appearance
        stroke(40, 40, 60, 80);
        strokeWeight(1);
        fill(10, 15, 25, 50);
        rect(x, y, w, h, 8);
        
        // Empty slot text
        textAlign(CENTER, CENTER);
        textSize(16);
        fill(60, 70, 90);
        text("No Saved Game", x + w/2, y + h/2 - 10);
        text("(Game will be saved when you visit stations)", x + w/2, y + h/2 + 10);
        
        pop();
    }
    
    drawShipSilhouette(shipType, x, y, isSelected) {
        push();
        translate(x, y);
        
        const shipDef = SHIP_DEFINITIONS[shipType];
        if (shipDef && typeof shipDef.drawFunction === 'function') {
            scale(0.3); // Small silhouette
            fill(isSelected ? color(120, 180, 255, 150) : color(80, 100, 120, 100));
            noStroke();
            
            // Draw simplified ship shape
            shipDef.drawFunction();
        } else {
            // Fallback generic ship shape
            fill(isSelected ? color(120, 180, 255, 150) : color(80, 100, 120, 100));
            noStroke();
            triangle(-10, 8, 10, 0, -10, -8);
            rect(-8, -2, 6, 4);
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
            this.selectedSlot = Math.max(0, this.selectedSlot - 1);
            this.addHoverEffect();
        } else if (keyCode === DOWN_ARROW) {
            // Only allow selection of slot 1 if saved game exists
            // If no saved game, maxSlot is 0 (only "New Game" can be selected)
            // If saved game exists, maxSlot is 1 ("New Game" or "Continue")
            const maxSlot = this.savedGameData ? 1 : 0;
            this.selectedSlot = Math.min(maxSlot, this.selectedSlot + 1);
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
        const slotHeight = 120;
        const slotWidth = width * 0.6;
        const startY = height * 0.35;
        const spacing = slotHeight + 20;
        const xPos = width/2 - slotWidth/2;

        // Check click on New Game slot
        if (mouseX >= xPos && mouseX <= xPos + slotWidth &&
            mouseY >= startY && mouseY <= startY + slotHeight) {
            this.selectedSlot = 0;
            this.confirmSelection();
            return;
        }

        // Check click on Continue slot (if it exists)
        if (this.savedGameData) {
            const continueY = startY + spacing;
            if (mouseX >= xPos && mouseX <= xPos + slotWidth &&
                mouseY >= continueY && mouseY <= continueY + slotHeight) {
                this.selectedSlot = 1;
                this.confirmSelection();
                return;
            }
        }
    }

    addHoverEffect() {
        // Add visual effect when selection changes
        this.buttonHoverEffects.push({
            x: width/2,
            y: height * 0.35 + this.selectedSlot * 140,
            size: 0,
            life: 1.0
        });
    }
    
    confirmSelection() {
        if (this.selectedSlot === 0) {
            // New Game
            console.log("Starting new game...");
            this.startNewGame();
        } else if (this.selectedSlot === 1 && this.savedGameData) {
            // Load saved game
            console.log("Loading saved game...");
            this.loadSavedGame();
        }
    }
    
    startNewGame() {
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
        
        // Clear any existing save
        localStorage.removeItem(SAVE_KEY);
        
        // Transition to game
        gameStateManager.setState("IN_FLIGHT");
    }
    
    loadSavedGame() {
        // Use existing loadGame function
        const success = loadGame();
        if (success) {
            gameStateManager.setState("IN_FLIGHT");
        } else {
            console.error("Failed to load saved game");
            // Could show error message or fallback to new game
        }
    }
    
    // Method to reinitialize stars when window is resized
    resize() {
        this.initBackgroundStars();
    }
}
