// Title screen and instruction page for Elite

class TitleScreen {
    constructor() {
        // Ship display properties
        this.shipIndex = 0;
        this.shipTimer = 0;
        this.shipChangeInterval = 3000; // ms to display each ship
        this.shipScale = 3; // Scale factor for ship display
        
        // Animation properties
        this.fadeAlpha = 255;
        this.titleY = -100; // Start off-screen
        this.authorAlpha = 0;
        
        // Get all ship types for carousel display
        this.shipTypes = Object.keys(SHIP_DEFINITIONS).filter(
            ship => typeof SHIP_DEFINITIONS[ship].drawFunction === 'function'
        );
        
        // Instructions screen - fixed position instead of scrolling
        this.instructionScrollY = height * 0.1; // Set to final position directly
    }
    
    update(deltaTime) {
        if (gameStateManager.currentState === "TITLE_SCREEN") {
            // Update ship carousel
            this.shipTimer += deltaTime;
            if (this.shipTimer >= this.shipChangeInterval) {
                this.shipIndex = (this.shipIndex + 1) % this.shipTypes.length;
                this.shipTimer = 0;
            }
            
            // Animate title entrance
            if (this.titleY < height * 0.2) {
                this.titleY += deltaTime * 0.05;
            }
            
            // Fade in author credit after title appears
            if (this.titleY > height * 0.15 && this.authorAlpha < 255) {
                this.authorAlpha += deltaTime * 0.1;
            }
        }
        else if (gameStateManager.currentState === "INSTRUCTIONS") {
            // Remove this scrolling code - instructions will be static
            // if (this.instructionScrollY > height * 0.1) {
            //     this.instructionScrollY -= deltaTime * 0.05;
            // }
        }
    }
    
    drawTitleScreen() {
        background(0);
        
        // Draw starfield background
        this.drawStarfield();
        
        // Draw title
        push();
        textSize(72);
        textAlign(CENTER, CENTER);
        fill(0, 180, 255);
        stroke(0, 100, 200);
        strokeWeight(3);
        text("ELITE Redux", width/2, this.titleY);
        
        // Author credit
        textSize(24);
        fill(200, 200, 255, this.authorAlpha);
        noStroke();
        text("Christian Nold, Easter 2025", width/2, this.titleY + 80);
        pop();
        
        // Draw ship carousel
        this.drawShipCarousel();
        
        // Draw start prompt
        push();
        textAlign(CENTER, CENTER);
        textSize(24);
        const promptY = height * 0.85;
        
        // Pulse effect
        const pulse = sin(millis() / 300) * 50 + 200;
        fill(pulse, pulse, 255);
        
        text("Click to Continue", width/2, promptY);
        pop();
    }
    
    drawInstructionScreen() {
        background(0);
        this.drawStarfield();
        
        push();
        textAlign(CENTER, TOP);
        const startY = this.instructionScrollY;
        
        // Title
        textSize(42);
        fill(0, 180, 255);
        text("HOW TO PLAY", width/2, startY);
        
        // Game description
        textSize(18);
        fill(200, 200, 255);
        textAlign(LEFT, TOP);
        const textX = width * 0.1;
        let textY = startY + 80;
        const lineHeight = 30;
        
        // Introduction
        text("Space trading, combat, piracy, assasinations you know ...", textX, textY);
        textY += lineHeight * 2;
        
        // Controls section
        textSize(24);
        fill(0, 180, 255);
        text("CONTROLS:", textX, textY);
        textY += lineHeight;
        
        // Control instructions
        textSize(18);
        fill(200, 200, 255);
        text("W or UP ARROW - Thrust forward", textX, textY); textY += lineHeight;
        text("A or LEFT ARROW - Rotate left", textX, textY); textY += lineHeight;
        text("D or RIGHT ARROW - Rotate right", textX, textY); textY += lineHeight;
        text("HOLD SPACEBAR - Fire weapons", textX, textY); textY += lineHeight;
        text("1-9 - Switch weapons", textX, textY); textY += lineHeight;
        text("M - Galaxy map", textX, textY); textY += lineHeight;
        text("Mouse to target beam weapons", textX, textY); textY += lineHeight * 2;

        // Gameplay tips
        textSize(24);
        fill(0, 180, 255);
        text("GAMEPLAY:", textX, textY);
        textY += lineHeight;
        
        textSize(18);
        fill(200, 200, 255);
        text("• Dock with stations to trade, upgrade and take missions", textX, textY); textY += lineHeight;
        text("• Destroy enemies to collect bounties and cargo", textX, textY); textY += lineHeight;
        text("• Jump between star systems using the galaxy map", textX, textY); textY += lineHeight;
        text("• Upgrade your ship and weapons to become ELITE", textX, textY); textY += lineHeight * 2;
        
        // Start prompt
        textSize(24);
        textAlign(CENTER);
        const pulse = sin(millis() / 300) * 50 + 200;
        fill(pulse, pulse, 255);
        text("Press SPACE or CLICK to Begin", width/2, height * 0.85);
        
        pop();
    }
    
    drawShipCarousel() {
        const currentShipType = this.shipTypes[this.shipIndex];
        const shipDef = SHIP_DEFINITIONS[currentShipType];
        
        if (shipDef && typeof shipDef.drawFunction === 'function') {
            push();
            translate(width/2, height * 0.55);
            scale(this.shipScale);
            shipDef.drawFunction(shipDef.size);
            pop();
            
            // Ship name display
            push();
            textAlign(CENTER);
            textSize(24);
            fill(255);
            text(currentShipType, width/2, height * 0.7);
            pop();
        }
    }
    
    drawStarfield() {
        // Draw a scrolling starfield background
        push();
        noStroke();
        // Generate about 200 stars with varying brightness
        for (let i = 0; i < 200; i++) {
            const x = (noise(i * 10, millis() * 0.0001) * width * 1.5) - width * 0.25;
            const y = (noise(i * 20, millis() * 0.0001) * height * 1.5) - height * 0.25;
            const size = noise(i * 30) * 3 + 1;
            const brightness = noise(i * 40) * 200 + 55;
            
            fill(brightness);
            ellipse(x, y, size, size);
        }
        pop();
    }
    
    handleClick() {
        if (gameStateManager.currentState === "TITLE_SCREEN") {
            gameStateManager.setState("INSTRUCTIONS");
            // No need to reset position since it's static
            // this.instructionScrollY = height; 
        } else if (gameStateManager.currentState === "INSTRUCTIONS") {
            gameStateManager.setState("IN_FLIGHT");
        }
    }
    
    handleKeyPress(keyCode) {
        if (gameStateManager.currentState === "INSTRUCTIONS" && keyCode === 32) { // Space key
            gameStateManager.setState("IN_FLIGHT");
        }
    }
}