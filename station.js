// ****** station.js ******

class Station {
    // Constructor now takes absolute world coordinates x, y
    constructor(worldX, worldY, systemType) {
        this.pos = createVector(worldX, worldY); // Store world position
        this.size = 40; // Diameter
        // Docking radius should be relative to size, not screen
        this.dockingRadius = this.size * 1.5;
        this.market = new Market(systemType);
        this.color = color(180, 180, 200);
        this.angle = 0; // Optional: for rotation
        this.rotationSpeed = 0.1; // Optional: slow rotation speed
    }

    getMarket() {
        return this.market;
    }

    // Draw method remains the same - it draws relative to its world position
    draw() {
        // Optional: Add slow rotation
        this.angle += this.rotationSpeed;

        push();
        translate(this.pos.x, this.pos.y); // Move to station's world position
        rotate(this.angle); // Apply rotation

        fill(this.color);
        stroke(255);
        strokeWeight(1);
        ellipse(0, 0, this.size, this.size); // Draw main body

        // Add some static detail relative to the station center
        strokeWeight(2);
        point(0,0);
        line(-this.size*0.3, 0, this.size*0.3, 0);
        line(0, -this.size*0.3, 0, this.size*0.3);

        // Optional Debug: Draw docking radius (will be translated correctly)
        // noFill();
        // stroke(0, 255, 0, 100); // Green, semi-transparent
        // ellipse(0, 0, this.dockingRadius * 2, this.dockingRadius * 2);
        pop();
    }
}