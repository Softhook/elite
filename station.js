// ****** station.js ******

/**
 * Represents a space station in the game.
 * Handles rendering, market interactions, and ship purchasing.
 */
class Station {
    /**
     * Creates a new station instance.
     * @param {number} worldX - The X coordinate in world space
     * @param {number} worldY - The Y coordinate in world space
     * @param {string} systemType - The economy type of the system
     * @param {string} name - The name of the station (defaults to "Station")
     */
    constructor(worldX, worldY, systemType, name = "Station") {
        this.pos = createVector(worldX, worldY);
        this.name = name;
        this.systemType = systemType;
        
        // Create market with the system's economy type
        this.market = new Market(systemType);
        this.market.systemName = name.replace(" Hub", "");
        
        // Station physical properties
        this.size = 160; // Base size for station dimensions
        this.dockingRadius = this.size;
        
        // Set station appearance based on system type
        this._setStationAppearance();
        
        this.angle = 0;
        this.rotationSpeed = 0.0015;
        
        // Lighting effects
        this.lightTimer = 0;
    }
    
    /**
     * Configures the station's appearance based on the system type.
     * @private
     */
    _setStationAppearance() {
        switch (this.systemType) {
            case "Military":
                this.color = color(100, 120, 140); // Military grey-blue
                this.stationType = "military";
                break;
            case "Alien":
                this.color = color(80, 220, 170); // Alien teal
                this.stationType = "alien";
                this.rotationSpeed = 0.002; // Slightly faster rotation
                this.size = 180; // Slightly larger
                break;
            case "Agricultural":
                this.color = color(120, 180, 100); // Agricultural green
                this.stationType = "agricultural";
                this.rotationSpeed = 0.0012; // Slightly slower rotation
                break;
            case "Industrial":
                this.color = color(160, 140, 120); // Industrial bronze-brown
                this.stationType = "industrial";
                break;
            case "Mining":
                this.color = color(160, 130, 90); // Mining rust/copper
                this.stationType = "mining";
                this.size = 170; // Slightly larger
                break;
            case "Tourism":
                this.color = color(200, 160, 220); // Tourism lavender
                this.stationType = "tourism";
                break;
            case "Refinery":
                this.color = color(200, 80, 50); // Refinery orange-red
                this.stationType = "refinery";
                break;
            case "Post Human":
                this.color = color(100, 180, 230); // Post Human light blue
                this.stationType = "posthuman";
                break;
            case "Imperial":
                this.color = color(220, 190, 90); // Imperial gold
                this.stationType = "imperial";
                this.rotationSpeed = 0.001; // Slower, more stately rotation
                break;
            case "Separatist":
                this.color = color(200, 100, 0); // Separatist orange
                this.stationType = "separatist";
                break;
            default:
                this.color = color(180, 180, 200); // Standard silver-grey
                this.stationType = "standard";
                break;
        }
    }

    /**
     * Returns the market associated with this station.
     * @returns {Market} The station's market
     */
    getMarket() {
        return this.market;
    }

    /**
     * Main draw method for the station. Calls helper methods to draw individual components.
     * Draws the station relative to its world position.
     */
    draw() {
        // Update animation values
        this.angle += this.rotationSpeed;
        this.lightTimer = (this.lightTimer + 0.03) % TWO_PI;
        
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle); // Apply rotation to the entire station
        
        // Select the appropriate drawing method based on station type
        switch (this.stationType) {
            case "military":
                this._drawMilitaryStation();
                break;
            case "alien":
                this._drawAlienStation();
                break;
            case "agricultural":
                this._drawAgriculturalStation();
                break;
            case "industrial":
                this._drawIndustrialStation();
                break;
            case "mining":
                this._drawMiningStation();
                break;
            case "tourism":
                this._drawTourismStation();
                break;
            case "refinery":
                this._drawRefineryStation();
                break;
            case "posthuman":
                this._drawPostHumanStation();
                break;
            case "imperial":
                this._drawImperialStation();
                break;
            case "separatist":
                this._drawSeparatistStation();
                break;
            default:
                this._drawStandardStation();
                break;
        }
        
        pop();
    }
    
    /**
     * Draws the standard station type.
     * @private
     */
    _drawStandardStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        this._drawHabitationModules();
        this._drawSolarPanels();
        this._drawRunningLights();
    }

    /**
     * Draws the central hub of the station.
     * @private
     */
    _drawCentralHub() {
        // Main hub structure
        fill(100, 100, 120);
        stroke(180, 180, 200);
        strokeWeight(2);
        ellipse(0, 0, this.size * 0.25, this.size * 0.25);
        
        // Hub details - airlock/docking ports
        for (let i = 0; i < 8; i++) {
            push();
            rotate(i * PI / 4);
            fill(60, 60, 80);
            rect(-5, -this.size * 0.13, 10, 5, 2);
            pop();
        }
    }

    /**
     * Draws the four main arms connecting the hub to the outer ring.
     * @private
     */
    _drawMainArms() {
        strokeWeight(1);
        for (let i = 0; i < 4; i++) {
            push();
            rotate(i * PI / 2);
            
            // Main arm structure
            fill(150, 150, 170);
            stroke(180, 180, 200);
            beginShape();
            vertex(-this.size * 0.08, 0);
            vertex(-this.size * 0.04, -this.size * 0.45);
            vertex(this.size * 0.04, -this.size * 0.45);
            vertex(this.size * 0.08, 0);
            endShape(CLOSE);
            
            // Structural reinforcements along arm
            stroke(100, 100, 120);
            for (let j = 1; j < 5; j++) {
                let y = -j * this.size * 0.09;
                line(-this.size * 0.07 + j*0.005, y, this.size * 0.07 - j*0.005, y);
            }
            
            // Connection to outer ring
            fill(120, 120, 140);
            rect(-this.size * 0.06, -this.size * 0.47, this.size * 0.12, this.size * 0.04, 3);
            pop();
        }
    }

    /**
     * Draws the inner and outer rings of the station.
     * @private
     */
    _drawRings() {
        // Outer ring (wheel)
        noFill();
        stroke(200, 200, 220);
        strokeWeight(3);
        ellipse(0, 0, this.size * 0.95, this.size * 0.95);
        
        // Inner ring structure
        strokeWeight(1);
        ellipse(0, 0, this.size * 0.9, this.size * 0.9);
    }

    /**
     * Draws the habitation modules positioned around the outer ring.
     * @private
     */
    _drawHabitationModules() {
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            
            if (i % 4 === 0) {
                this._drawDockingBay(i);
            } else {
                this._drawResidentialModule(i);
            }
            pop();
        }
    }

    /**
     * Draws a docking bay module with status lights.
     * @param {number} index - Module index for animation timing
     * @private
     */
    _drawDockingBay(index) {
        // Docking bays at cardinal points
        fill(80, 80, 100);
        stroke(100, 100, 120);
        rect(-this.size * 0.06, -this.size * 0.48, this.size * 0.12, this.size * 0.06, 2);
        
        // Docking bay lighting (alternating red/green)
        fill(sin(this.lightTimer*2 + index) > 0 ? color(0, 200, 0) : color(200, 0, 0));
        noStroke();
        rect(-this.size * 0.03, -this.size * 0.46, this.size * 0.06, this.size * 0.02, 2);
    }

    /**
     * Draws a residential module with animated windows.
     * @param {number} index - Module index for animation timing
     * @private
     */
    _drawResidentialModule(index) {
        // Regular habitation modules
        fill(this.color);
        stroke(150, 150, 170);
        rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 2);
        
        // Windows with subtle animation
        fill(200, 200, 100, 150 + sin(this.lightTimer + index)*50);
        noStroke();
        for (let w = 0; w < 3; w++) {
            rect(-this.size * 0.03 + w * this.size * 0.03, -this.size * 0.465, this.size * 0.02, this.size * 0.01, 1);
        }
    }

    /**
     * Draws solar panels extending from the hub.
     * @private
     */
    _drawSolarPanels() {
        for (let i = 0; i < 2; i++) {
            push();
            rotate(i * PI + PI/4);
            
            // Panel mount
            fill(120, 120, 140);
            rect(-this.size * 0.02, this.size * 0.12, this.size * 0.04, this.size * 0.04);
            
            // Panel
            fill(20, 30, 100);
            stroke(150, 150, 170);
            rect(-this.size * 0.15, this.size * 0.16, this.size * 0.3, this.size * 0.1);
            
            // Panel grid lines
            stroke(180, 180, 200, 100);
            strokeWeight(1);
            for (let j = 0; j < 5; j++) {
                let x = -this.size * 0.15 + j * this.size * 0.075;
                line(x, this.size * 0.16, x, this.size * 0.26);
            }
            for (let j = 0; j < 3; j++) {
                let y = this.size * 0.16 + j * this.size * 0.05;
                line(-this.size * 0.15, y, this.size * 0.15, y);
            }
            pop();
        }
    }

    /**
     * Draws animated running lights around the station's perimeter.
     * @private
     */
    _drawRunningLights() {
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            
            // Alternate light colors
            if (i % 8 === 0) {
                fill(255, 30, 30, 100 + sin(this.lightTimer*3 + i) * 100); // Red
            } else if (i % 8 === 4) {
                fill(30, 30, 255, 100 + sin(this.lightTimer*3 + i + PI) * 100); // Blue 
            } else if (i % 2 === 0) {
                fill(255, 255, 100, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Yellow
            }
            
            // Only draw if the fill is defined (skip some positions)
            if (fill) {
                ellipse(0, -this.size * 0.475, 3, 3);
            }
            pop();
        }
    }
    
    /**
     * Draws a military station with defensive structures and armored design.
     * @private
     */
    _drawMilitaryStation() {
        // Draw the modified central hub
        this._drawMilitaryCentralHub();
        // Draw modified main arms
        this._drawMilitaryArms();
        // Draw rings with defense systems
        this._drawRings();
        // Draw military modules
        this._drawMilitaryModules();
        // Draw weapon turrets instead of solar panels
        this._drawWeaponTurrets();
        // Draw military running lights
        this._drawMilitaryLights();
    }
    
    /**
     * Draws a fortified central hub for the military station.
     * @private
     */
    _drawMilitaryCentralHub() {
        // Main hub structure - armored
        fill(80, 90, 100);
        stroke(120, 130, 150);
        strokeWeight(2);
        ellipse(0, 0, this.size * 0.28, this.size * 0.28);
        
        // Additional armor plates
        for (let i = 0; i < 8; i++) {
            push();
            rotate(i * PI / 4);
            fill(60, 70, 80);
            stroke(100, 110, 130);
            strokeWeight(1);
            beginShape();
            vertex(-this.size * 0.09, -this.size * 0.06);
            vertex(-this.size * 0.04, -this.size * 0.14);
            vertex(this.size * 0.04, -this.size * 0.14);
            vertex(this.size * 0.09, -this.size * 0.06);
            endShape(CLOSE);
            pop();
        }
        
        // Command center
        fill(50, 60, 70);
        stroke(100, 110, 130);
        strokeWeight(1);
        ellipse(0, 0, this.size * 0.15, this.size * 0.15);
    }
    
    /**
     * Draws military-style arms with defensive capabilities.
     * @private
     */
    _drawMilitaryArms() {
        strokeWeight(1);
        for (let i = 0; i < 4; i++) {
            push();
            rotate(i * PI / 2);
            
            // Main arm structure - more angular, armored look
            fill(100, 110, 130);
            stroke(130, 140, 160);
            beginShape();
            vertex(-this.size * 0.09, 0);
            vertex(-this.size * 0.06, -this.size * 0.15);
            vertex(-this.size * 0.05, -this.size * 0.45);
            vertex(this.size * 0.05, -this.size * 0.45);
            vertex(this.size * 0.06, -this.size * 0.15);
            vertex(this.size * 0.09, 0);
            endShape(CLOSE);
            
            // Defense turrets along arm
            for (let j = 1; j < 4; j++) {
                let y = -j * this.size * 0.12;
                
                // Turret base
                fill(70, 80, 100);
                stroke(90, 100, 120);
                ellipse(0, y, this.size * 0.05, this.size * 0.05);
                
                // Turret gun
                fill(40, 50, 70);
                rect(-this.size * 0.01, y - this.size * 0.04, this.size * 0.02, this.size * 0.04);
            }
            
            // Connection to outer ring - reinforced
            fill(90, 100, 120);
            stroke(120, 130, 150);
            rect(-this.size * 0.07, -this.size * 0.47, this.size * 0.14, this.size * 0.05, 2);
            pop();
        }
    }
    
    /**
     * Draws military station modules with weapons and defensive structures.
     * @private
     */
    _drawMilitaryModules() {
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            
            if (i % 4 === 0) {
                // Launch bays at cardinal points
                fill(60, 70, 90);
                stroke(80, 90, 110);
                rect(-this.size * 0.06, -this.size * 0.48, this.size * 0.12, this.size * 0.06, 2);
                
                // Warning lights
                fill(sin(this.lightTimer*3 + i) > 0 ? color(255, 50, 0) : color(255, 200, 0));
                noStroke();
                rect(-this.size * 0.04, -this.size * 0.46, this.size * 0.08, this.size * 0.02, 1);
            } else if (i % 2 === 0) {
                // Weapon modules
                fill(70, 80, 100);
                stroke(100, 110, 130);
                rect(-this.size * 0.05, -this.size * 0.47, this.size * 0.1, this.size * 0.04, 2);
                
                // Weapon barrel
                fill(50, 60, 80);
                rect(-this.size * 0.01, -this.size * 0.49, this.size * 0.02, this.size * 0.06, 1);
            } else {
                // Standard modules
                fill(this.color);
                stroke(120, 130, 150);
                rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 1);
                
                // Armored windows
                fill(100, 150, 200, 150 + sin(this.lightTimer + i)*50);
                noStroke();
                for (let w = 0; w < 2; w++) {
                    rect(-this.size * 0.025 + w * this.size * 0.03, -this.size * 0.465, this.size * 0.015, this.size * 0.01, 1);
                }
            }
            pop();
        }
    }
    
    /**
     * Draws weapon turrets for military stations.
     * @private
     */
    _drawWeaponTurrets() {
        for (let i = 0; i < 4; i++) {
            push();
            rotate(i * PI / 2 + PI / 6);
            
            // Turret mount
            fill(80, 90, 110);
            stroke(100, 110, 130);
            rect(-this.size * 0.03, this.size * 0.12, this.size * 0.06, this.size * 0.06);
            
            // Main cannon
            fill(60, 70, 90);
            stroke(100, 110, 130);
            rect(-this.size * 0.02, this.size * 0.12, this.size * 0.04, this.size * 0.14, 1);
            
            // Cannon details
            stroke(120, 130, 150, 150);
            strokeWeight(1);
            for (let j = 0; j < 3; j++) {
                let y = this.size * 0.14 + j * this.size * 0.03;
                line(-this.size * 0.02, y, this.size * 0.02, y);
            }
            pop();
        }
    }
    
    /**
     * Draws military station running lights.
     * @private
     */
    _drawMilitaryLights() {
        noStroke();
        for (let i = 0; i < 32; i++) {
            push();
            rotate(i * TWO_PI / 32);
            
            // Military uses more red and white lights
            if (i % 8 === 0) {
                fill(255, 50, 50, 120 + sin(this.lightTimer*2 + i) * 100); // Bright red
            } else if (i % 4 === 0) {
                fill(255, 255, 255, 120 + sin(this.lightTimer*2.5 + i) * 100); // White
            } else if (i % 2 === 0) {
                fill(100, 100, 200, 80 + sin(this.lightTimer*3 + i*0.5) * 80); // Blue
            }
            
            // Only draw if the fill is defined
            if (fill) {
                ellipse(0, -this.size * 0.475, 2.5, 2.5);
            }
            pop();
        }
    }
    
    /**
     * Draws an alien station with organic, non-standard design.
     * @private
     */
    _drawAlienStation() {
        this._drawAlienCore();
        this._drawAlienStructures();
        this._drawAlienRings();
        this._drawAlienModules();
        this._drawEnergyFields();
        this._drawAlienLights();
    }
    
    /**
     * Draws the alien station's central core.
     * @private
     */
    _drawAlienCore() {
        // Main core - non-circular, more organic
        push();
        fill(40, 180, 140);
        stroke(60, 220, 180);
        strokeWeight(2);
        
        // Slightly pulsating core
        let pulseSize = this.size * (0.3 + sin(this.lightTimer) * 0.02);
        
        // Draw an irregular, somewhat octagonal shape
        beginShape();
        for (let i = 0; i < 8; i++) {
            let angle = i * TWO_PI / 8;
            let radius = pulseSize * (1 + (i % 2 === 0 ? 0.1 : -0.1));
            vertex(cos(angle) * radius, sin(angle) * radius);
        }
        endShape(CLOSE);
        
        // Inner energy pattern
        noFill();
        stroke(120, 255, 200, 150 + sin(this.lightTimer * 2) * 100);
        strokeWeight(1.5);
        beginShape();
        for (let i = 0; i < 12; i++) {
            let angle = i * TWO_PI / 12 + this.lightTimer;
            let radius = pulseSize * 0.6 * (1 + sin(i + this.lightTimer * 3) * 0.2);
            vertex(cos(angle) * radius, sin(angle) * radius);
        }
        endShape(CLOSE);
        pop();
    }
    
    /**
     * Draws alien structural extensions.
     * @private
     */
    _drawAlienStructures() {
        strokeWeight(1.5);
        // Draw 5 asymmetric arms instead of 4 symmetric ones
        for (let i = 0; i < 5; i++) {
            push();
            // Non-uniform rotation
            rotate(i * TWO_PI / 5 + sin(i) * 0.2);
            
            // Curved, organic arm structure
            fill(60, 200, 160, 220);
            stroke(100, 240, 200);
            beginShape();
            vertex(-this.size * 0.05, 0);
            bezierVertex(
                -this.size * 0.08, -this.size * 0.2,
                -this.size * 0.03, -this.size * 0.35,
                -this.size * 0.05, -this.size * 0.45
            );
            vertex(this.size * 0.05, -this.size * 0.45);
            bezierVertex(
                this.size * 0.03, -this.size * 0.35,
                this.size * 0.08, -this.size * 0.2,
                this.size * 0.05, 0
            );
            endShape(CLOSE);
            
            // Organic nodules along arm
            fill(30, 160, 120);
            stroke(80, 220, 180);
            for (let j = 1; j < 4; j++) {
                let y = -j * this.size * 0.11;
                let size = this.size * 0.04 * (1 + sin(this.lightTimer * 2 + j) * 0.2);
                ellipse(0, y, size, size);
            }
            
            // Connection to outer zone - organic shape
            fill(50, 190, 150);
            stroke(90, 230, 190);
            beginShape();
            vertex(-this.size * 0.05, -this.size * 0.45);
            vertex(-this.size * 0.07, -this.size * 0.48);
            vertex(this.size * 0.07, -this.size * 0.48);
            vertex(this.size * 0.05, -this.size * 0.45);
            endShape(CLOSE);
            pop();
        }
    }
    
    /**
     * Draws alien ring structures.
     * @private
     */
    _drawAlienRings() {
        // Outer ring - not a perfect circle, slightly undulating
        push();
        noFill();
        stroke(100, 240, 200);
        strokeWeight(2.5);
        
        beginShape();
        for (let i = 0; i < 60; i++) {
            let angle = i * TWO_PI / 60;
            let radius = this.size * (0.48 + sin(angle * 5 + this.lightTimer) * 0.02);
            vertex(cos(angle) * radius, sin(angle) * radius);
        }
        endShape(CLOSE);
        
        // Inner energy field
        stroke(60, 220, 180, 100);
        strokeWeight(4);
        beginShape();
        for (let i = 0; i < 40; i++) {
            let angle = i * TWO_PI / 40 - this.lightTimer * 0.5;
            let radius = this.size * (0.4 + sin(angle * 4 + this.lightTimer * 2) * 0.02);
            vertex(cos(angle) * radius, sin(angle) * radius);
        }
        endShape(CLOSE);
        pop();
    }
    
    /**
     * Draws alien modules with organic appearances.
     * @private
     */
    _drawAlienModules() {
        for (let i = 0; i < 15; i++) {
            push();
            // Non-uniform spacing
            rotate(i * TWO_PI / 15 + sin(i * 0.5) * 0.1);
            
            if (i % 5 === 0) {
                // Transport portals at specific points
                fill(20, 120, 100);
                stroke(60, 200, 160);
                ellipse(0, -this.size * 0.48, this.size * 0.08, this.size * 0.08);
                
                // Portal energy
                fill(100, 255, 200, 150 + sin(this.lightTimer * 3 + i) * 100);
                noStroke();
                ellipse(0, -this.size * 0.48, this.size * 0.05 * (1 + sin(this.lightTimer * 2) * 0.2), this.size * 0.05 * (1 + sin(this.lightTimer * 2) * 0.2));
            } else {
                // Organic pods
                fill(50, 180, 140);
                stroke(80, 220, 170);
                beginShape();
                for (let j = 0; j < 8; j++) {
                    let angle = j * TWO_PI / 8;
                    let rx = this.size * 0.04 * (1 + (j % 2 === 0 ? 0.2 : -0.1));
                    let ry = this.size * 0.035 * (1 + (j % 2 === 0 ? -0.1 : 0.2));
                    vertex(cos(angle) * rx, sin(angle) * ry - this.size * 0.48);
                }
                endShape(CLOSE);
                
                // Bioluminescent spots
                fill(120, 255, 220, 180 + sin(this.lightTimer + i*2) * 75);
                noStroke();
                for (let w = 0; w < 2; w++) {
                    let x = (w - 0.5) * this.size * 0.02;
                    let y = -this.size * 0.48;
                    let size = this.size * 0.01 * (1 + sin(this.lightTimer * 3 + i + w) * 0.3);
                    ellipse(x, y, size, size);
                }
            }
            pop();
        }
    }
    
    /**
     * Draws alien energy fields that replace solar panels.
     * @private
     */
    _drawEnergyFields() {
        for (let i = 0; i < 3; i++) {
            push();
            rotate(i * TWO_PI / 3 + PI/6);
            
            // Energy field generator
            fill(40, 170, 130);
            stroke(90, 230, 190);
            ellipse(0, this.size * 0.15, this.size * 0.06, this.size * 0.06);
            
            // Energy field - pulsating
            fill(100, 255, 200, 40 + sin(this.lightTimer * 2) * 30);
            stroke(120, 255, 220, 100 + sin(this.lightTimer) * 50);
            beginShape();
            for (let j = 0; j < 24; j++) {
                let angle = j * TWO_PI / 24 + this.lightTimer;
                let radius = this.size * (0.15 + sin(j * 3 + this.lightTimer * 4) * 0.03);
                vertex(cos(angle) * radius, sin(angle) * radius + this.size * 0.15);
            }
            endShape(CLOSE);
            
            // Energy tendrils
            stroke(80, 220, 180, 150);
            strokeWeight(1);
            for (let j = 0; j < 8; j++) {
                let angle = j * TWO_PI / 8 + this.lightTimer * 0.5;
                let x1 = cos(angle) * this.size * 0.05;
                let y1 = sin(angle) * this.size * 0.05 + this.size * 0.15;
                let x2 = cos(angle) * this.size * 0.14;
                let y2 = sin(angle) * this.size * 0.14 + this.size * 0.15;
                line(x1, y1, x2, y2);
            }
            pop();
        }
    }
    
    /**
     * Draws alien station lights with unique patterns and colors.
     * @private
     */
    _drawAlienLights() {
        noStroke();
        for (let i = 0; i < 30; i++) {
            push();
            rotate(i * TWO_PI / 30 + sin(i * 0.2) * 0.1);
            
            // Alien uses teal, purple and green lights
            if (i % 5 === 0) {
                fill(0, 255, 200, 80 + sin(this.lightTimer*2.5 + i) * 120); // Teal
            } else if (i % 3 === 0) {
                fill(180, 100, 255, 80 + sin(this.lightTimer*3 + i*0.7) * 120); // Purple
            } else if (i % 2 === 0) {
                fill(100, 255, 150, 80 + sin(this.lightTimer*1.5 + i*0.4) * 120); // Green
            }
            
            // Pulsating light size
            if (fill) {
                let size = 2 + sin(this.lightTimer * 3 + i) * 1;
                ellipse(0, -this.size * 0.49, size, size);
            }
            pop();
        }
    }

    /**
     * Serializes the station to a JSON object for saving.
     * @returns {Object} JSON representation of the station
     */
    toJSON() {
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            name: this.name,
            systemType: this.systemType,
            stationType: this.stationType,
            size: this.size,
            dockingRadius: this.dockingRadius,
            color: this.color ? this.color.toString() : null, // p5.Color to string
            angle: this.angle,
            rotationSpeed: this.rotationSpeed,
            market: this.market && typeof this.market.toJSON === 'function'
                ? this.market.toJSON()
                : null
        };
    }

    /**
     * Creates a station instance from a saved JSON object.
     * @param {Object} data - The serialized station data
     * @returns {Station} A new station instance
     * @static
     */
    static fromJSON(data) {
        const s = new Station(data.pos.x, data.pos.y, data.systemType || data.market?.type || "Unknown", data.name);
        s.size = data.size;
        s.dockingRadius = data.dockingRadius;
        
        // Restore station type if available, otherwise _setStationAppearance will handle it based on systemType
        if (data.stationType) {
            s.stationType = data.stationType;
        }
        
        // Color restoration (optional, simple fallback)
        if (data.color && typeof color === "function") {
            try { s.color = color(data.color); } catch {}
        }
        
        s.angle = data.angle;
        s.rotationSpeed = data.rotationSpeed;
        
        // Restore market if possible
        if (data.market && typeof Market?.fromJSON === "function") {
            s.market = Market.fromJSON(data.market);
        }
        
        return s;
    }

    /**
     * Handles ship purchase transactions.
     * @param {Object} player - The player making the purchase
     * @param {Object} area - Information about the ship being purchased
     */
    purchaseShip(player, area) {
        if (player.credits >= area.price) {
            player.spendCredits(area.price);
            player.applyShipDefinition(area.shipType);
            saveGame && saveGame();
            alert(`You bought a ${area.shipType}!`);
        }
    }

    /**
     * Draws an agricultural station with greenhouses and domes.
     * @private
     */
    _drawAgriculturalStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Greenhouse domes on modules
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            if (i % 4 === 0) {
                // Large greenhouse domes at cardinal points
                fill(120, 200, 120, 180);
                stroke(80, 160, 80);
                ellipse(0, -this.size * 0.48, this.size * 0.13, this.size * 0.08);
                fill(180, 255, 180, 80 + 40 * sin(this.lightTimer + i));
                ellipse(0, -this.size * 0.48, this.size * 0.09, this.size * 0.05);
            } else {
                // Standard modules with green windows
                fill(this.color);
                stroke(100, 180, 100);
                rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 2);
                fill(180, 255, 180, 120 + 40 * sin(this.lightTimer + i));
                noStroke();
                rect(-this.size * 0.02, -this.size * 0.465, this.size * 0.04, this.size * 0.015, 1);
            }
            pop();
        }
        this._drawSolarPanels();
        // Yellow/green running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(180, 255, 100, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Green-yellow
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws an industrial station with smokestacks and extra modules.
     * @private
     */
    _drawIndustrialStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Industrial modules with smokestacks
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            fill(this.color);
            stroke(120, 100, 80);
            rect(-this.size * 0.045, -this.size * 0.47, this.size * 0.09, this.size * 0.045, 2);
            // Smokestack
            if (i % 4 === 0) {
                fill(80, 80, 80);
                rect(-this.size * 0.01, -this.size * 0.51, this.size * 0.02, this.size * 0.04, 1);
                fill(180, 180, 180, 80 + 40 * sin(this.lightTimer + i));
                ellipse(0, -this.size * 0.53, this.size * 0.03, this.size * 0.01);
            }
            pop();
        }
        this._drawSolarPanels();
        // Orange/white running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(255, 180, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Orange
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws a mining station with ore containers and rugged modules.
     * @private
     */
    _drawMiningStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Mining containers and rugged modules
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            if (i % 4 === 0) {
                // Large ore container
                fill(180, 140, 80);
                stroke(120, 80, 40);
                rect(-this.size * 0.06, -this.size * 0.48, this.size * 0.12, this.size * 0.07, 2);
            } else {
                // Rugged module
                fill(this.color);
                stroke(120, 100, 80);
                rect(-this.size * 0.045, -this.size * 0.47, this.size * 0.09, this.size * 0.045, 2);
            }
            pop();
        }
        // No solar panels, instead draw mining cranes
        for (let i = 0; i < 2; i++) {
            push();
            rotate(i * PI + PI/4);
            stroke(120, 100, 80);
            strokeWeight(3);
            line(0, this.size * 0.12, 0, this.size * 0.28);
            strokeWeight(1);
            line(0, this.size * 0.28, this.size * 0.08, this.size * 0.32);
            pop();
        }
        // Red/yellow running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(255, 180, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Orange
            if (i % 3 === 0) fill(255, 80, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Red
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws a tourism station with domes and purple lights.
     * @private
     */
    _drawTourismStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Domes and windows
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            if (i % 4 === 0) {
                fill(220, 180, 255, 180);
                stroke(180, 120, 220);
                ellipse(0, -this.size * 0.48, this.size * 0.13, this.size * 0.08);
            } else {
                fill(this.color);
                stroke(180, 120, 220);
                rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 2);
                fill(255, 200, 255, 120 + 40 * sin(this.lightTimer + i));
                noStroke();
                rect(-this.size * 0.02, -this.size * 0.465, this.size * 0.04, this.size * 0.015, 1);
            }
            pop();
        }
        this._drawSolarPanels();
        // Purple/white running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(200, 160, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Purple
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws a refinery station with tanks and red lights.
     * @private
     */
    _drawRefineryStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Tanks and pipes
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            fill(this.color);
            stroke(180, 80, 50);
            rect(-this.size * 0.045, -this.size * 0.47, this.size * 0.09, this.size * 0.045, 2);
            if (i % 4 === 0) {
                fill(200, 80, 50);
                ellipse(0, -this.size * 0.51, this.size * 0.06, this.size * 0.06);
                stroke(180, 80, 50);
                line(0, -this.size * 0.51, 0, -this.size * 0.47);
            }
            pop();
        }
        this._drawSolarPanels();
        // Red/orange running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(255, 80, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Red
            if (i % 3 === 0) fill(255, 180, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Orange
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws a posthuman station with blue/white lights and sleek modules.
     * @private
     */
    _drawPostHumanStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Sleek modules
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            fill(this.color);
            stroke(100, 180, 230);
            rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 6);
            fill(200, 255, 255, 120 + 40 * sin(this.lightTimer + i));
            noStroke();
            rect(-this.size * 0.02, -this.size * 0.465, this.size * 0.04, this.size * 0.015, 3);
            pop();
        }
        this._drawSolarPanels();
        // Blue/white running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(100, 200, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Blue
            if (i % 3 === 0) fill(255, 255, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // White
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws an imperial station with gold and stately features.
     * @private
     */
    _drawImperialStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Gold modules and banners
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            fill(this.color);
            stroke(180, 160, 60);
            rect(-this.size * 0.045, -this.size * 0.47, this.size * 0.09, this.size * 0.045, 4);
            if (i % 4 === 0) {
                fill(255, 220, 100);
                rect(-this.size * 0.01, -this.size * 0.51, this.size * 0.02, this.size * 0.06, 2);
            }
            pop();
        }
        this._drawSolarPanels();
        // Gold/white running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(255, 220, 100, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Gold
            if (i % 3 === 0) fill(255, 255, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // White
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }
    
    /**
     * Draws a separatist station with extra solar panels and unique features.
     * @private
     */
    _drawSeparatistStation() {
        // Draw the standard station components
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        this._drawHabitationModules();
        this._drawSolarPanels();
        this._drawRunningLights();
        // Add two extra solar panels at 135° and 315°
        for (let i = 0; i < 2; i++) {
            let angle = PI * (3/4 + i); // 135° and 315°
            push();
            rotate(angle);
            // Panel mount
            fill(120, 120, 140);
            rect(-this.size * 0.02, this.size * 0.12, this.size * 0.04, this.size * 0.04);
            // Panel
            fill(20, 30, 100);
            stroke(150, 150, 170);
            rect(-this.size * 0.15, this.size * 0.16, this.size * 0.3, this.size * 0.1);
            // Panel grid lines
            stroke(180, 180, 200, 100);
            strokeWeight(1);
            for (let j = 0; j < 5; j++) {
                let x = -this.size * 0.15 + j * this.size * 0.075;
                line(x, this.size * 0.16, x, this.size * 0.26);
            }
            for (let j = 0; j < 3; j++) {
                let y = this.size * 0.16 + j * this.size * 0.05;
                line(-this.size * 0.15, y, this.size * 0.15, y);
            }
            pop();
        }
    }
}