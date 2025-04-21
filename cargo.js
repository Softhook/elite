/**
 * Cargo class for representing floating cargo containers in space
 * Can be collected by the player for profit
 */
class Cargo {
    constructor(x, y, type) {
        this.pos = createVector(x, y);
        this.vel = createVector(random(-0.5, 0.5), random(-0.5, 0.5));
        this.type = type || random(LEGAL_CARGO); // Default to random legal cargo
        this.size = 8; // Small container size
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.01, 0.01); // Was too subtle at -0.02 to 0.02
        this.collected = false;
        this.lifetime = 1800; // Exists for 30 seconds (60fps * 20)
        
        // Determine color based on cargo type
        this.color = this.determineColor();
    }
    
    determineColor() {
        // Illegal cargo has red tints
        if (ILLEGAL_CARGO.includes(this.type)) {
            return [200 + random(55), 20 + random(30), 20 + random(30)];
        }
        
        // Color coding based on cargo category
        if (["Food", "Textiles"].includes(this.type)) {
            return [30 + random(30), 150 + random(50), 30 + random(30)]; // Green
        }
        
        if (["Machinery", "Metals", "Minerals"].includes(this.type)) {
            return [150 + random(50), 150 + random(50), 150 + random(50)]; // Gray/Silver
        }
        
        if (["Chemicals", "Medicine"].includes(this.type)) {
            return [150 + random(50), 150 + random(50), 200 + random(55)]; // Blue
        }
        
        if (["Computers", "Adv Components"].includes(this.type)) {
            return [200 + random(55), 150 + random(50), 30 + random(30)]; // Gold/Yellow
        }
        
        if (["Luxury Goods"].includes(this.type)) {
            return [200 + random(55), 80 + random(40), 200 + random(55)]; // Purple
        }
        
        // Default
        return [200 + random(55), 200 + random(55), 200 + random(55)]; // White/Silver
    }
    
    update() {
        if (this.collected) return;
        
        // Update position
        this.pos.add(this.vel);
        
        // Apply drag
        this.vel.mult(0.98);
        
        // Update rotation
        this.rotation = (this.rotation + this.rotationSpeed) % TWO_PI;
        
        // Decrease lifetime
        this.lifetime--;
    }
    
    draw() {
        if (this.collected) return;
        
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.rotation); // Rotation is in radians, as required by p5.js rotate()
        
        // Draw container
        fill(this.color);
        stroke(min(255, this.color[0] * 0.7), min(255, this.color[1] * 0.7), min(255, this.color[2] * 0.7));
        strokeWeight(1);
        
        // Box with subtle perspective
        beginShape();
        vertex(-this.size/1.5, -this.size/1.5); // Top-left
        vertex(this.size/1.5, -this.size/1.5);  // Top-right
        vertex(this.size/1.5, this.size/1.5);   // Bottom-right
        vertex(-this.size/1.5, this.size/1.5);  // Bottom-left
        endShape(CLOSE);
        
        // Draw some details (packaging lines)
        stroke(min(255, this.color[0] * 0.6), min(255, this.color[1] * 0.6), min(255, this.color[2] * 0.6));
        line(-this.size/1.5, 0, this.size/1.5, 0);
        line(0, -this.size/1.5, 0, this.size/1.5);
        
        // Draw an asymmetrical mark to make rotation more visible
        fill(255, 255, 255, 120);
        noStroke();
        triangle(
            -this.size/2.5, -this.size/2.5,
            -this.size/1.8, -this.size/2.5,
            -this.size/2.5, -this.size/1.8
        );
        
        // Draw a small glint to indicate valuable content
        if (this.lifetime % 60 < 15) {
            fill(255, 255, 255, 180);
            noStroke();
            ellipse(this.size/3, -this.size/3, 2, 2);
        }
        
        pop();
        
        // Add a subtle fading effect when lifetime is low
        if (this.lifetime < 120) {
            const fadeOpacity = map(this.lifetime, 0, 120, 0, 255);
            stroke(255, fadeOpacity);
            strokeWeight(1);
            noFill();
            ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
        }
    }
    
    isExpired() {
        return this.lifetime <= 0;
    }
    
    checkCollision(player) {
        if (this.collected) return false;
        
        let d = dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y);
        return d < (player.size/2 + this.size);
    }
    
    getValue() {
        // Basic value for cargo depending on type
        const baseValues = {
            'Food': 8,
            'Textiles': 12,
            'Machinery': 95,
            'Metals': 45,
            'Minerals': 35,
            'Chemicals': 65,
            'Computers': 220,
            'Medicine': 140,
            'Adv Components': 350,
            'Luxury Goods': 400,
            'Narcotics': 300,
            'Weapons': 250,
            'Slaves': 350
        };
        
        // Add a small random variation
        const baseValue = baseValues[this.type] || 50;
        return Math.floor(baseValue * random(0.8, 1.2));
    }
}