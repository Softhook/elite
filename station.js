// ****** station.js ******

class Station {
    constructor(worldX, worldY, systemType, name = "Station") {
        this.pos = createVector(worldX, worldY);
        this.name = name;
        this.systemType = systemType;
        
        // Create market with the system's economy type
        this.market = new Market(systemType);
        this.market.systemName = name.replace(" Hub", "");
        
        // Doubled size but with better proportions
        this.size = 160; // Double the original size
        this.dockingRadius = this.size;
        this.color = color(180, 180, 200);
        this.angle = 0;
        this.rotationSpeed = 0.0015; // Much slower rotation
        
        // Add lighting effects
        this.lightTimer = 0;
    }

    getMarket() {
        return this.market;
    }

    // Draw method remains the same - it draws relative to its world position
    draw() {
        this.angle += this.rotationSpeed;
        this.lightTimer = (this.lightTimer + 0.03) % TWO_PI;
        
        push();
        translate(this.pos.x, this.pos.y);
        
        // Apply rotation to the ENTIRE station
        rotate(this.angle);
        
        // Draw the central hub - non-rotating part (visual effect only)
        fill(100, 100, 120);
        stroke(180, 180, 200);
        strokeWeight(2);
        ellipse(0, 0, this.size * 0.25, this.size * 0.25);
        
        // Hub details - make them look like docking ports/airlocks
        for (let i = 0; i < 8; i++) {
            push();
            rotate(i * PI / 4);
            fill(60, 60, 80);
            rect(-5, -this.size * 0.13, 10, 5, 2);
            pop();
        }
        
        // Draw the four main arms - thicker, more substantial
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
        
        // Draw the outer ring (wheel) - more substantial
        noFill();
        stroke(200, 200, 220);
        strokeWeight(3);
        ellipse(0, 0, this.size * 0.95, this.size * 0.95);
        
        // Inner ring structure
        strokeWeight(1);
        ellipse(0, 0, this.size * 0.9, this.size * 0.9);
        
        // Draw the habitation modules on the outer ring
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            
            // Module housing
            if (i % 4 === 0) {
                // Docking bays at cardinal points
                fill(80, 80, 100);
                stroke(100, 100, 120);
                rect(-this.size * 0.06, -this.size * 0.48, this.size * 0.12, this.size * 0.06, 3);
                
                // Docking bay lighting
                fill(sin(this.lightTimer*2 + i) > 0 ? color(0, 200, 0) : color(200, 0, 0));
                noStroke();
                rect(-this.size * 0.03, -this.size * 0.46, this.size * 0.06, this.size * 0.02, 2);
            } else {
                // Regular habitation modules
                fill(this.color);
                stroke(150, 150, 170);
                rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 2);
                
                // Windows
                fill(200, 200, 100, 150 + sin(this.lightTimer + i)*50);
                noStroke();
                for (let w = 0; w < 3; w++) {
                    rect(-this.size * 0.03 + w * this.size * 0.03, -this.size * 0.465, this.size * 0.02, this.size * 0.01, 1);
                }
            }
            pop();
        }
        
        // Draw solar panels extending from the hub
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
        
        // Add some subtle running lights around the station perimeter
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
        
        pop();
    }

    toJSON() {
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            name: this.name,
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

    static fromJSON(data) {
        const s = new Station(data.pos.x, data.pos.y, data.market?.type || "Unknown", data.name);
        s.size = data.size;
        s.dockingRadius = data.dockingRadius;
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

    purchaseShip(player, area) {
        if (player.credits >= area.price) {
            player.spendCredits(area.price);
            player.applyShipDefinition(area.shipType);
            saveGame && saveGame();
            alert(`You bought a ${area.shipType}!`);
        }
    }
}