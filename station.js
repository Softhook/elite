class Station {
    constructor(x, y, systemType) {
        this.pos = createVector(x, y);
        this.size = 40; // Diameter
        this.dockingRadius = this.size * 1.5; // Slightly larger area for docking trigger
        this.market = new Market(systemType);
        this.color = color(180, 180, 200);
    }

    getMarket() {
        return this.market;
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        fill(this.color);
        stroke(255);
        strokeWeight(1);
        ellipse(0, 0, this.size, this.size);
        // Add some detail
        strokeWeight(2);
        point(0,0);
        line(-this.size*0.3, 0, this.size*0.3, 0);
        line(0, -this.size*0.3, 0, this.size*0.3);

        // Draw docking radius (optional debug)
        // noFill();
        // stroke(0, 255, 0, 100);
        // ellipse(0, 0, this.dockingRadius * 2, this.dockingRadius * 2);
        pop();
    }
}