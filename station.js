// ****** station.js ******

class Station {
    // Add 'name' parameter
    constructor(worldX, worldY, systemType, name = "Station") { // Default name if not provided
        this.pos = createVector(worldX, worldY); // Store world position
        this.name = name; // <<< STORE THE NAME
        this.size = 40; // Diameter
        this.dockingRadius = this.size * 1.5; // Docking trigger radius
        // Use systemType for market, not name
        this.market = new Market(systemType);
        this.color = color(180, 180, 200); // Visual color
        this.angle = 0; // Optional rotation angle
        this.rotationSpeed = 0.1; // Optional rotation speed
    }

    getMarket() {
        return this.market;
    }

    // Draw method remains the same - it draws relative to its world position
    draw() {
        this.angle += this.rotationSpeed; // Optional slow rotation
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle);
        fill(this.color); stroke(255); strokeWeight(1);
        ellipse(0, 0, this.size, this.size); // Main body
        // Details
        strokeWeight(2); point(0,0); line(-this.size*0.3, 0, this.size*0.3, 0); line(0, -this.size*0.3, 0, this.size*0.3);
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